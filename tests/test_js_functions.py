#!/usr/bin/env python3
"""Runs the recording feature's JS through a real engine.

Two things are checked that nothing else can: that the generated app actually
parses (a syntax error blanks the whole page rather than failing loudly), and that
the pure export helpers compute what they are supposed to.
"""
import json
import math
import os
import re
import struct
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # sibling imports under -m and discover

from jsengine import (NO_ENGINE, find_engine, recording_source,
                      recording_source_with_zip, run_js_json)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACT = os.path.join(REPO, "app_record.html")

HAVE_ENGINE = find_engine() is not None


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestGeneratedAppParses(unittest.TestCase):
    def test_app_script_parses(self):
        """The app's inline script must parse. new Function() parses without executing,
        which is the point: executing would immediately fail on the missing DOM."""
        with open(ARTIFACT, encoding="utf-8") as f:
            html = f.read()
        # The app's own script is the last <script> block; the earlier one is JSZip.
        blocks = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script>", html, re.DOTALL)
        self.assertGreaterEqual(len(blocks), 2, "expected inlined JSZip plus the app script")
        app_js = blocks[-1]
        self.assertIn("exportRecordingSR", app_js, "picked the wrong <script> block")

        harness = (
            "var src = %s;\n"
            "try { new Function(src); __emit(JSON.stringify({ok: true})); }\n"
            "catch (e) { __emit(JSON.stringify({ok: false, err: String(e)})); }\n"
        ) % json.dumps(app_js)
        result = run_js_json(harness)
        self.assertTrue(result["ok"], "app script does not parse: %s" % result.get("err"))

    def test_payloads_parse_standalone(self):
        """The payloads on their own, with the app's globals stubbed out."""
        harness = recording_source() + "\n__emit(JSON.stringify({ok: true}));\n"
        self.assertTrue(run_js_json(harness)["ok"])


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestVoltsConversionInJS(unittest.TestCase):
    """recToVolts() is the fix; run the real implementation, not a Python port."""

    def _volts(self, samples, vpd, vpos):
        harness = recording_source() + (
            "\n__emit(JSON.stringify(recToVolts(%s, %s, %s)));\n"
            % (json.dumps(samples), json.dumps(vpd), json.dumps(vpos))
        )
        return run_js_json(harness)

    def test_reference_capture_value(self):
        """The number this whole PR is about: 0.370 raw at 50 V/div, ground 3.28 div low."""
        self.assertAlmostEqual(self._volts([0.370], 50.0, -0.410)[0], 312.0, places=4)

    def test_same_signal_at_different_scales_agrees(self):
        """A signal 1.5 divisions above ground reads the same volts at any V/div.

        This is the property the AWG acceptance test checks on real hardware: one
        input teed to two channels set to different scales must produce one number.
        """
        for vpd in (0.5, 1.0, 50.0, 100.0):
            raw = 0.1875 * 1 + 0.25          # 1.5 div above a ground sitting 2 div high
            got = self._volts([raw], vpd, 0.25)[0]
            self.assertAlmostEqual(got, 1.5 * vpd, places=4, msg="V/div %s" % vpd)

    def test_ground_reference_is_subtracted(self):
        """A sample sitting exactly on the channel's ground marker is 0 V, wherever that is."""
        for vpos in (-0.4, -0.05, 0.0, 0.3):
            self.assertAlmostEqual(self._volts([vpos], 50.0, vpos)[0], 0.0, places=6)

    def test_undefined_volts_per_div_does_not_produce_nan(self):
        """getVoltsDiv() returns undefined out of range; a frame must not become NaN."""
        got = self._volts([0.25], None, 0.0)[0]
        self.assertFalse(math.isnan(got))


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestTimelinePlanning(unittest.TestCase):
    def _plan(self, times_ms, length=100, samplerate=20000, source_extra=""):
        frames = [{"ch1": [0] * length, "s": {"t": t}} for t in times_ms]
        harness = recording_source() + source_extra + (
            "\nvar frames = %s.map(function (f) { f.ch1 = new Array(f.ch1.length).fill(0); return f; });\n"
            "__emit(JSON.stringify(planRecordingTimeline(frames, %d)));\n"
            % (json.dumps(frames), samplerate)
        )
        return run_js_json(harness)

    def test_gaps_reflect_real_elapsed_time(self):
        """Frames 500 ms apart at 20 kSa/s, 100 samples each -> 9900-sample gaps."""
        r = self._plan([0.0, 500.0, 1000.0])
        self.assertEqual(r["mode"], "realtime")
        self.assertEqual([p["gap"] for p in r["plan"]], [0, 9900, 9900])
        self.assertEqual([p["start"] for p in r["plan"]], [0, 10000, 20000])
        self.assertEqual(r["total"], 20100)
        self.assertEqual(r["clamped"], 0)

    def test_overlapping_frames_collapse_to_back_to_back(self):
        """A frame spans more signal than the interval between acquisitions at slow
        timebases; those frames cannot overlap, so they degrade and are counted."""
        r = self._plan([0.0, 1.0, 2.0], length=1000)  # 1 ms apart but 50 ms long each
        self.assertEqual([p["gap"] for p in r["plan"]], [0, 0, 0])
        self.assertEqual(r["clamped"], 2)
        self.assertEqual(r["total"], 3000)

    def test_first_frame_anchors_the_timeline(self):
        """t0 is the first frame, so a recording never starts with leading dead time."""
        r = self._plan([9000.0, 9500.0])
        self.assertEqual(r["plan"][0]["start"], 0)
        self.assertEqual(r["plan"][0]["gap"], 0)

    def test_size_guard_drops_gaps(self):
        """Beyond the budget the gaps are abandoned rather than materialising GBs of NaN."""
        r = self._plan([0.0, 1000000.0], length=100)  # a 1000 s gap at 20 kSa/s
        self.assertEqual(r["mode"], "concatenated")
        self.assertEqual([p["gap"] for p in r["plan"]], [0, 0])
        self.assertEqual(r["total"], 200)

    def test_missing_timestamps_do_not_break_layout(self):
        """Frames recorded before the timestamp existed still lay out back to back."""
        harness = recording_source() + (
            "\nvar frames = [{ch1: new Array(10).fill(0), s: null},"
            "               {ch1: new Array(10).fill(0), s: null}];\n"
            "__emit(JSON.stringify(planRecordingTimeline(frames, 20000)));\n"
        )
        r = run_js_json(harness)
        self.assertEqual(r["total"], 20)
        self.assertEqual([p["gap"] for p in r["plan"]], [0, 0])


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestMetadataLayout(unittest.TestCase):
    def _meta(self, ch2, trig_channel):
        harness = recording_source(emit_trigger_channel=trig_channel) + (
            "\n__emit(JSON.stringify({meta: buildRecordingMetadata(20000, %s),"
            " ch1: recordAnalogBase(1), ch2: recordAnalogBase(2)}));\n"
            % ("true" if ch2 else "false")
        )
        return run_js_json(harness)

    def test_purely_analog_layout(self):
        """No logic channel: CH1/CH2 move down to analog-1-1 / analog-1-2."""
        r = self._meta(ch2=True, trig_channel=False)
        self.assertIn("analog1=CH1", r["meta"])
        self.assertIn("analog2=CH2", r["meta"])
        self.assertNotIn("capturefile", r["meta"])
        self.assertNotIn("total probes", r["meta"])
        self.assertNotIn("unitsize", r["meta"])
        self.assertEqual((r["ch1"], r["ch2"]), ("analog-1-1", "analog-1-2"))

    def test_trigger_channel_layout_shifts_analog_indices(self):
        """With the fallback flag on, the old numbering comes back intact."""
        r = self._meta(ch2=True, trig_channel=True)
        self.assertIn("capturefile=logic-1", r["meta"])
        self.assertIn("probe1=TRIG", r["meta"])
        self.assertIn("analog2=CH1", r["meta"])
        self.assertIn("analog3=CH2", r["meta"])
        self.assertEqual((r["ch1"], r["ch2"]), ("analog-1-2", "analog-1-3"))

    def test_total_probes_precedes_total_analog(self):
        """libsigrok counts logic channels before numbering analog ones, walking the
        keys in file order, so the order in the file is load-bearing."""
        meta = self._meta(ch2=True, trig_channel=True)["meta"]
        self.assertLess(meta.index("total probes"), meta.index("total analog"))

    def test_single_channel_omits_ch2(self):
        r = self._meta(ch2=False, trig_channel=False)
        self.assertIn("total analog=1", r["meta"])
        self.assertNotIn("CH2", r["meta"])

    def test_samplerate_formatting(self):
        harness = recording_source() + (
            "\n__emit(JSON.stringify([20000, 40000, 200000000, 92, 1].map(formatSamplerate)));\n")
        self.assertEqual(run_js_json(harness),
                         ["20 kHz", "40 kHz", "200 MHz", "92 Hz", "1 Hz"])


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestSidecar(unittest.TestCase):
    """The sidecar carries everything .sr has no room for, so its shape is worth pinning."""

    def _sidecar(self):
        harness = recording_source() + (
            "\nvar mk = function (t, vpd1, vpos1) {\n"
            "  return {ch1: new Array(4).fill(0.25), ch2: new Array(4).fill(0.1),\n"
            "          s: {t: t, sr: 20000, tpd: 0.001, len: 4, trigIdx: 2, src: 'DataBuffer',\n"
            "              demo: false, acq: 'Normal',\n"
            "              ch1: {vpd: vpd1, vpos: vpos1, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "              ch2: {on: true, vpd: 100, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "              trig: {src: 'CH2', mode: 'Auto', edge: 'falling', level: -8}}};\n"
            "};\n"
            "var frames = [mk(1000, 50, -0.41), mk(1500, 100, 0.25)];\n"
            "recordSampleRate = 20000;\n"
            "var tl = planRecordingTimeline(frames, 20000);\n"
            "__emit(JSON.stringify(buildRecordingSidecar(tl, true, [], 1, 1, 20000)));\n"
        )
        return run_js_json(harness)

    def test_channels_point_at_the_real_entry_names(self):
        """Whoever reads the sidecar must be able to find the samples it describes."""
        sc = self._sidecar()
        self.assertEqual([c["entry_base"] for c in sc["channels"]],
                         ["analog-1-1", "analog-1-2"])
        self.assertEqual([c["unit"] for c in sc["channels"]], ["V", "V"])

    def test_frame_offsets_account_for_every_sample(self):
        """Frame lengths plus gaps must tile the timeline exactly, with no overlap."""
        sc = self._sidecar()
        total = sum(f["length"] + f["gap_before"] for f in sc["frames"])
        self.assertEqual(total, sc["sample_count"])
        for prev, nxt in zip(sc["frames"], sc["frames"][1:]):
            self.assertEqual(nxt["start_sample"],
                             prev["start_sample"] + prev["length"] + nxt["gap_before"])

    def test_per_frame_settings_are_recorded_independently(self):
        """A mid-recording V/div or position change must be visible frame by frame."""
        sc = self._sidecar()
        self.assertEqual([f["ch1"]["vpd"] for f in sc["frames"]], [50, 100])
        self.assertEqual([f["ch1"]["vpos"] for f in sc["frames"]], [-0.41, 0.25])

    def test_exact_samplerate_survives_the_integer_hz_format(self):
        """metadata rounds to whole Hz; the sidecar keeps what was measured."""
        harness = recording_source() + (
            "\nrecordSampleRate = 92.593;\n"
            "var tl = planRecordingTimeline([], 92.593);\n"
            "var sc = buildRecordingSidecar(tl, false, [], 1, 1, 92.593);\n"
            "__emit(JSON.stringify({exact: sc.samplerate_exact, rounded: sc.samplerate,"
            " str: sc.samplerate_string, meta: buildRecordingMetadata(92.593, false)}));\n"
        )
        r = run_js_json(harness)
        self.assertAlmostEqual(r["exact"], 92.593, places=6)
        self.assertEqual(r["rounded"], 93)
        self.assertIn("samplerate=93 Hz", r["meta"])

    def test_calibration_constants_are_disclosed(self):
        """They stay baked into every sample, so say so rather than hiding it."""
        sc = self._sidecar()
        self.assertEqual(sc["app_calibration"]["verticalOffsetCH1"], 0.005)
        self.assertEqual(sc["app_calibration"]["verticalOffsetCH2"], 0.008)
        self.assertIn("volts", sc["volts_formula"])


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestSamplerateSplitting(unittest.TestCase):
    """A .sr holds one samplerate and srzip has no segments, so a time/div change
    mid-recording has to become separate files rather than a misdescribed one."""

    def _split(self, rates):
        frames = [{"ch1": [0], "s": {"sr": r}} for r in rates]
        harness = recording_source() + (
            "\nvar runs = splitRecordingBySamplerate(%s);\n"
            "__emit(JSON.stringify(runs.map(function (r) {"
            " return {rate: r.sampleRate, n: r.frames.length}; })));\n" % json.dumps(frames)
        )
        return run_js_json(harness)

    def test_constant_rate_stays_one_file(self):
        self.assertEqual(self._split([20000] * 5), [{"rate": 20000, "n": 5}])

    def test_rate_change_splits(self):
        self.assertEqual(self._split([20000, 20000, 50000, 50000, 50000]),
                         [{"rate": 20000, "n": 2}, {"rate": 50000, "n": 3}])

    def test_returning_to_an_earlier_rate_is_a_new_run(self):
        """Runs are consecutive, not grouped: going back to 20 kHz starts a third file,
        because the frames in between belong elsewhere on the timeline."""
        self.assertEqual(self._split([20000, 50000, 20000]),
                         [{"rate": 20000, "n": 1}, {"rate": 50000, "n": 1},
                          {"rate": 20000, "n": 1}])

    def test_every_frame_is_kept(self):
        rates = [20000, 20000, 40000, 20000, 80000, 80000]
        self.assertEqual(sum(r["n"] for r in self._split(rates)), len(rates))

    def test_split_warning_does_not_blame_the_timebase(self):
        """The samplerate is derived from the acquired frame length, so the time/div is
        only one of the things that moves it. Enabling CH2 halves the length, and demo
        mode substitutes a generated array of its own size - both split a recording with
        the time/div untouched, which is how this wording was found to be wrong.
        """
        harness = recording_source_with_zip() + (
            "\nrecordSampleRate = 40000;\n"
            "var frames = [{ch1: new Array(4).fill(0.25), ch2: null,\n"
            "  s: {t: 0, sr: 20000, tpd: 0.005, len: 4, trigIdx: 2, src: 'DataBuffer2',\n"
            "      demo: true, acq: 'Sample',\n"
            "      ch1: {vpd: 0.5, vpos: -0.28, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "      ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "      trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1.18}}}];\n"
            "exportRecordingSegment(frames, 20000, 2, 2, 'STAMP');\n"
            "var sc = JSON.parse(__written.filter(function (e) {"
            "  return e.name === 'dso2512g-recording.json'; })[0].text);\n"
            "__emit(JSON.stringify(sc.warnings));\n"
        )
        warnings = run_js_json(harness)
        self.assertTrue(warnings)
        text = " ".join(warnings).lower()
        self.assertIn("samplerate changed", text)
        self.assertIn("segment 2 of 2", text)
        self.assertNotIn("the time/div changed", text)


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestNaNGapEncoding(unittest.TestCase):
    def test_gap_bytes_are_float32_nan(self):
        """Gap runs must be real IEEE-754 NaN, little-endian, 4 bytes per sample."""
        harness = recording_source() + (
            "\nvar b = new Uint8Array(nanRunToLEBytes(3));\n"
            "__emit(JSON.stringify(Array.prototype.slice.call(b)));\n")
        raw = bytes(run_js_json(harness))
        self.assertEqual(len(raw), 12)
        for value in struct.unpack("<3f", raw):
            self.assertTrue(math.isnan(value))


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestExportEmitsAWellFormedArchive(unittest.TestCase):
    """Runs the real export loop against a JSZip stub.

    This is the part with no second chance: libsigrok walks base-1, base-2, ... and
    stops at the first missing chunk, and it aligns channels by total sample count.
    Get either wrong and the capture truncates or the channels slide apart, both
    silently.
    """

    def _export(self, gaps_ms, length=4, samplerate=20000, ch2=True, trig_channel=False):
        mk = ("function mk(t) { return {"
              "ch1: new Array(%d).fill(0.25), ch2: %s,"
              "s: {t: t, sr: %d, tpd: 0.001, len: %d, trigIdx: 1, src: 'DataBuffer',"
              "    demo: false, acq: 'Normal',"
              "    ch1: {vpd: 50, vpos: -0.41, probe: '10x', coupling: 'DC', bw: 'OFF'},"
              "    ch2: {on: true, vpd: 100, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},"
              "    trig: {src: 'CH2', mode: 'Auto', edge: 'falling', level: -8}}}; }\n"
              % (length, ("new Array(%d).fill(0.1)" % length) if ch2 else "null", samplerate, length))
        harness = recording_source_with_zip(emit_trigger_channel=trig_channel) + mk + (
            "recordSampleRate = %d;\n"
            "var frames = %s.map(mk);\n"
            "exportRecordingSegment(frames, %d, 1, 1, 'STAMP');\n"
            "__emit(JSON.stringify(__written));\n" % (samplerate, json.dumps(gaps_ms), samplerate)
        )
        return run_js_json(harness)

    @staticmethod
    def _chunks(written, base):
        out = {}
        for entry in written:
            if entry["name"].startswith(base + "-"):
                out[int(entry["name"].rsplit("-", 1)[1])] = entry["size"]
        return out

    def test_chunk_numbers_are_contiguous_from_one(self):
        written = self._export([0.0, 500.0, 1000.0])
        nums = sorted(self._chunks(written, "analog-1-1"))
        self.assertEqual(nums, list(range(1, len(nums) + 1)))

    def test_channels_stay_in_lockstep(self):
        """Same chunk count and same byte count per chunk, so the totals cannot drift."""
        written = self._export([0.0, 500.0, 1000.0])
        ch1 = self._chunks(written, "analog-1-1")
        ch2 = self._chunks(written, "analog-1-2")
        self.assertEqual(sorted(ch1), sorted(ch2))
        self.assertEqual(ch1, ch2)
        self.assertEqual(sum(ch1.values()), sum(ch2.values()))

    def test_total_samples_match_the_planned_timeline(self):
        """Frames 500 ms apart at 20 kSa/s: 4 samples each, 9996-sample gaps between."""
        written = self._export([0.0, 500.0, 1000.0])
        total_bytes = sum(self._chunks(written, "analog-1-1").values())
        self.assertEqual(total_bytes // 4, 4 + 9996 + 4 + 9996 + 4)

    def test_long_gaps_are_split_into_bounded_chunks(self):
        """A gap wider than the chunk limit becomes several chunks, still contiguous."""
        written = self._export([0.0, 200000.0])  # 200 s at 20 kSa/s = 4M samples, under the budget
        chunks = self._chunks(written, "analog-1-1")
        self.assertEqual(sorted(chunks), list(range(1, len(chunks) + 1)))
        for size in chunks.values():
            self.assertLessEqual(size // 4, 1048576)
        self.assertGreater(len(chunks), 4, "a 4M-sample gap should span several chunks")

    def test_purely_analog_export_writes_no_logic_entries(self):
        written = self._export([0.0, 500.0])
        names = [e["name"] for e in written]
        self.assertFalse([n for n in names if n.startswith("logic-")])
        self.assertIn("version", names)
        self.assertIn("metadata", names)
        self.assertIn("dso2512g-recording.json", names)

    def test_trigger_channel_variant_matches_analog_chunking(self):
        """With the fallback flag on, the logic channel must be chunked identically."""
        written = self._export([0.0, 500.0], trig_channel=True)
        logic = self._chunks(written, "logic-1")
        ch1 = self._chunks(written, "analog-1-2")
        self.assertEqual(sorted(logic), sorted(ch1))
        # 1 byte per sample against 4, so the logic channel spans the same samples.
        self.assertEqual(sum(logic.values()), sum(ch1.values()) // 4)

    def test_single_channel_export_omits_ch2_entries(self):
        written = self._export([0.0, 500.0], ch2=False)
        self.assertFalse(self._chunks(written, "analog-1-2"))
        self.assertTrue(self._chunks(written, "analog-1-1"))

    def test_sidecar_describes_what_was_written(self):
        written = self._export([0.0, 500.0])
        sidecar = json.loads(next(e["text"] for e in written
                                  if e["name"] == "dso2512g-recording.json"))
        total_bytes = sum(self._chunks(written, "analog-1-1").values())
        self.assertEqual(sidecar["sample_count"], total_bytes // 4)
        self.assertEqual(sidecar["frame_count"], 2)


if __name__ == "__main__":
    unittest.main()
