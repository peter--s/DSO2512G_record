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

    def _export_n_segments(self, n, tpd=0.5):
        """Drive the real exportRecordingSR() with n differing samplerates."""
        harness = recording_source_with_zip() + (
            "\nvar logged = [];\n"
            "log = function (m) { logged.push(m); };\n"
            "var shown = [];\n"
            "showMessage = function (m) { shown.push(m); };\n"
            "var downloads = [];\n"
            "downloadRecordingBlob = function (blob, name) { downloads.push(name); };\n"
            "recordedFrames = [];\n"
            "for (var i = 0; i < %d; i++) {\n"
            "  recordedFrames.push({ch1: new Array(4).fill(0.25), ch2: null,\n"
            "    s: {t: i * 200, sr: 100 + i * 37, tpd: %s, len: 4, trigIdx: 2,\n"
            "        src: 'DataBuffer2', demo: false, acq: 'Sample',\n"
            "        ch1: {vpd: 0.5, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "        ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "        trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1}}});\n"
            "}\n"
            "recordSampleRate = 100;\n"
            "exportRecordingSR().then(function () {\n"
            "  __emit(JSON.stringify({log: logged, shown: shown, downloads: downloads,\n"
            "                         written: __written.map(function (e) { return e.name; })}));\n"
            "});\n" % (n, tpd)
        )
        return run_js_json(harness)

    def test_a_large_split_becomes_one_archive(self):
        """Thirty segments must not become thirty downloads.

        A browser stops starting downloads well before thirty and does not report that it
        did: a real thirty-way split delivered ten files and lost twenty silently. One
        archive is one download, so nothing can go missing.
        """
        r = self._export_n_segments(30)
        self.assertEqual(len(r["downloads"]), 1,
                         "expected a single archive, got %d downloads" % len(r["downloads"]))
        self.assertTrue(r["downloads"][0].endswith("_segments.zip"))
        self.assertIn("bundling", " ".join(r["log"]).lower())

    def test_the_archive_contains_every_segment(self):
        """The point of bundling is that none are dropped, so count them."""
        r = self._export_n_segments(30)
        members = [n for n in r["written"] if n.endswith(".sr")]
        self.assertEqual(len(members), 30, "archive holds %d of 30 segments" % len(members))
        self.assertEqual(len(set(members)), 30, "segment filenames must be unique")
        for i in (1, 15, 30):
            self.assertTrue(any(("_seg%d.sr" % i) in n for n in members),
                            "segment %d missing from the archive" % i)

    def test_a_small_split_still_downloads_separately(self):
        """Below the threshold the .sr files arrive directly, as before — bundling would
        make the common two- or three-way split needlessly awkward to open."""
        r = self._export_n_segments(3)
        self.assertEqual(len(r["downloads"]), 3)
        self.assertTrue(all(n.endswith(".sr") for n in r["downloads"]))
        self.assertNotIn("bundling", " ".join(r["log"]).lower())

    def test_many_single_frame_segments_are_called_out(self):
        """A recording that fragments into many one-frame files is the slow-timebase
        pathology, not someone turning the knob. The scope rolls, each read returns a
        partially filled buffer, and every differing length reads back as a differing
        samplerate — so ten downloads appear with implausible rates on them. Detect the
        shape and explain it rather than handing that over silently.
        """
        frames = [{"ch1": [0], "s": {"sr": r}} for r in (50, 79, 98, 130, 159, 180)]
        harness = recording_source_with_zip() + (
            "\nvar logged = [];\n"
            "log = function (m) { logged.push(m); };\n"
            "var shown = [];\n"
            "showMessage = function (m) { shown.push(m); };\n"
            "recordedFrames = %s.map(function (f) {\n"
            "  f.ch1 = new Array(4).fill(0.25); f.ch2 = null;\n"
            "  f.s = {t: 0, sr: f.s.sr, tpd: 0.5, len: 4, trigIdx: 2, src: 'DataBuffer2',\n"
            "         demo: false, acq: 'Sample',\n"
            "         ch1: {vpd: 0.5, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "         ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "         trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1}};\n"
            "  return f; });\n"
            "recordSampleRate = 50;\n"
            "exportRecordingSR();\n"
            "__emit(JSON.stringify({log: logged, shown: shown}));\n" % json.dumps(frames)
        )
        r = run_js_json(harness)
        joined = " ".join(r["log"]).lower()
        self.assertIn("single frame", joined)
        self.assertIn("still filling", joined)
        self.assertTrue(any("buffer fill" in m.lower() for m in r["shown"]),
                        "the user should be told on screen, not only in the log")

    def test_a_normal_split_is_not_flagged_as_the_slow_timebase_case(self):
        """Six healthy multi-frame segments must not trigger the roll-mode note."""
        harness = recording_source_with_zip() + (
            "\nvar logged = [];\n"
            "log = function (m) { logged.push(m); };\n"
            "showMessage = function () {};\n"
            "var mk = function (sr) { return {ch1: new Array(4).fill(0.25), ch2: null,\n"
            "  s: {t: 0, sr: sr, tpd: 0.005, len: 4, trigIdx: 2, src: 'DataBuffer2',\n"
            "      demo: false, acq: 'Sample',\n"
            "      ch1: {vpd: 0.5, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "      ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "      trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1}}}; };\n"
            "recordedFrames = [mk(40000), mk(40000), mk(20000), mk(20000), mk(10000), mk(10000)];\n"
            "recordSampleRate = 40000;\n"
            "exportRecordingSR();\n"
            "__emit(JSON.stringify(logged));\n"
        )
        joined = " ".join(run_js_json(harness)).lower()
        self.assertIn("samplerate changed", joined)
        self.assertNotIn("single frame", joined)

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
class TestUnusableFramesAreDropped(unittest.TestCase):
    """A frame of nothing but NaN is a failed acquisition, not a quiet one.

    Switching the signal source mid-recording occasionally produces one: the WAV path reads
    a second sample per point at a fixed offset of 600 characters, so a buffer shorter than
    that gives parseInt("") -> NaN for every point. Keeping such a frame would be worse than
    dropping it, because NaN means "no data here" in this format — a corrupt frame would be
    indistinguishable from dead time, and its odd length would spawn a segment of its own.
    """

    def _has_samples(self, arr):
        harness = recording_source() + (
            "\n__emit(JSON.stringify(recFrameHasSamples(%s)));\n"
            % json.dumps(arr).replace("NaN", "null")
        )
        # JSON has no NaN, so nulls stand in and are mapped back inside JS.
        harness = harness.replace("recFrameHasSamples([", "recFrameHasSamples([")
        return run_js_json(harness.replace("null", "NaN"))

    def test_all_nan_frame_is_rejected(self):
        self.assertFalse(self._has_samples([float("nan")] * 5))

    def test_frame_with_any_reading_is_kept(self):
        self.assertTrue(self._has_samples([float("nan"), float("nan"), 0.25]))

    def test_empty_and_missing_are_rejected(self):
        self.assertFalse(self._has_samples([]))
        harness = recording_source() + "\n__emit(JSON.stringify(recFrameHasSamples(null)));\n"
        self.assertFalse(run_js_json(harness))

    def test_a_dead_frame_never_reaches_the_export(self):
        """End to end: an all-NaN CH1 frame must not become a segment of its own."""
        harness = recording_source_with_zip() + (
            "\nvar logged = []; log = function (m) { logged.push(m); };\n"
            "showMessage = function () {};\n"
            "var downloads = [];\n"
            "downloadRecordingBlob = function (b, n) { downloads.push(n); };\n"
            "var mk = function (len, dead) {\n"
            "  var a = new Array(len); for (var i = 0; i < len; i++) a[i] = dead ? NaN : 0.25;\n"
            "  return {ch1: a, ch2: null,\n"
            "    s: {t: 0, sr: (len - 1) / 12 / 0.005, tpd: 0.005, len: len, trigIdx: 1,\n"
            "        src: dead ? 'WAV' : 'DataBuffer', demo: false, acq: 'Sample',\n"
            "        ch1: {vpd: 0.5, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "        ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "        trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1}}}; };\n"
            # A live frame, a dead one of a different length, then another live one.
            "recordedFrames = [mk(2401, false), mk(2401, false)];\n"
            "recDroppedFrames = 1;\n"
            "recordSampleRate = 40000;\n"
            "exportRecordingSR().then(function () {\n"
            "  __emit(JSON.stringify({downloads: downloads, log: logged}));\n"
            "});\n"
        )
        r = run_js_json(harness)
        self.assertEqual(len(r["downloads"]), 1, "the dead frame must not have split the export")
        self.assertIn("no usable samples", " ".join(r["log"]).lower(),
                      "dropping frames must be reported, not silent")


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestPartialReadCollapsing(unittest.TestCase):
    """Roll-mode partial re-reads should not each become a file.

    A still-filling acquisition is read repeatedly, so consecutive frames grow — and since
    the samplerate is derived from the frame length, each apparent rate differs and each read
    splits off. One recording produced 69 files, 67 of them single frames whose samples the
    later, fuller reads already contained. Keep only the fullest of each growing run.
    """

    def _collapse(self, lengths, tpd=0.5):
        frames = [{"len": n} for n in lengths]
        harness = recording_source() + (
            "\nvar frames = %s.map(function (f) {\n"
            "  return {ch1: new Array(f.len).fill(0.25), ch2: null,\n"
            "          s: {tpd: %s, len: f.len, src: 'DataBuffer2'}}; });\n"
            "var r = collapsePartialReads(frames);\n"
            "__emit(JSON.stringify({kept: r.frames.map(function (f) { return f.ch1.length; }),\n"
            "                       dropped: r.dropped}));\n" % (json.dumps(frames), tpd)
        )
        return run_js_json(harness)

    def test_a_growing_run_keeps_only_its_fullest(self):
        r = self._collapse([186, 314, 506, 4801])
        self.assertEqual(r["kept"], [4801])
        self.assertEqual(r["dropped"], 3)

    def test_a_steady_acquisition_is_untouched(self):
        """Normal recording holds its frame length, so nothing may be dropped."""
        r = self._collapse([2401] * 6, tpd=0.005)
        self.assertEqual(r["kept"], [2401] * 6)
        self.assertEqual(r["dropped"], 0)

    def test_each_fill_cycle_keeps_its_own_last(self):
        """The buffer restarts, so a drop in length ends a run and begins another."""
        r = self._collapse([186, 506, 4801, 122, 1866, 74, 4682])
        self.assertEqual(r["kept"], [4801, 1866, 4682])
        self.assertEqual(r["dropped"], 4)

    def test_the_real_shape_collapses_to_a_handful(self):
        """The observed 69-file recording: two full-buffer runs around three refills."""
        lengths = ([4801] * 3 + [122, 234, 426, 1866]
                   + [122, 314, 474, 3994] + [74, 234, 346, 4682] + [4801] * 2)
        r = self._collapse(lengths)
        # 4682 grows into the 4801 that follows, so it is a partial read of that run too.
        self.assertEqual(r["kept"], [4801, 4801, 4801, 1866, 3994, 4801, 4801])
        self.assertEqual(r["dropped"], 10)

    def test_a_source_switch_is_not_a_partial_read(self):
        """Switching signal source changes the frame length at the same time/div.

        A 13-sample DataBuffer frame followed by a 300-sample WAV one is two separate
        acquisitions, not one that grew, so neither may be discarded. Without the source
        check the shorter of the pair was silently dropped — found on a real recording that
        switched sources six times.
        """
        frames = [{"len": 13, "src": "DataBuffer"},
                  {"len": 300, "src": "WAV"},
                  {"len": 300, "src": "WAV"},
                  {"len": 13, "src": "DataBuffer2"}]
        harness = recording_source() + (
            "\nvar frames = %s.map(function (f) {\n"
            "  return {ch1: new Array(f.len).fill(0.25), ch2: null,\n"
            "          s: {tpd: 1e-8, len: f.len, src: f.src}}; });\n"
            "var r = collapsePartialReads(frames);\n"
            "__emit(JSON.stringify({kept: r.frames.map(function (f) { return f.ch1.length; }),\n"
            "                       dropped: r.dropped}));\n" % json.dumps(frames)
        )
        r = run_js_json(harness)
        self.assertEqual(r["dropped"], 0, "no frame may be lost to a source switch")
        self.assertEqual(r["kept"], [13, 300, 300, 13])

    def test_growth_within_one_source_is_still_collapsed(self):
        """The real case must keep working: one source, one time/div, a filling buffer."""
        frames = [{"len": n, "src": "DataBuffer2"} for n in (186, 314, 506, 4801)]
        harness = recording_source() + (
            "\nvar frames = %s.map(function (f) {\n"
            "  return {ch1: new Array(f.len).fill(0.25), ch2: null,\n"
            "          s: {tpd: 0.5, len: f.len, src: f.src}}; });\n"
            "var r = collapsePartialReads(frames);\n"
            "__emit(JSON.stringify({kept: r.frames.map(function (f) { return f.ch1.length; }),\n"
            "                       dropped: r.dropped}));\n" % json.dumps(frames)
        )
        r = run_js_json(harness)
        self.assertEqual(r["kept"], [4801])
        self.assertEqual(r["dropped"], 3)

    def test_a_length_change_at_a_new_timebase_is_not_a_partial_read(self):
        """Growth only counts within one time/div; a real timebase change must survive."""
        frames = [{"len": 2401, "tpd": 0.005}, {"len": 4801, "tpd": 0.01}]
        harness = recording_source() + (
            "\nvar frames = %s.map(function (f) {\n"
            "  return {ch1: new Array(f.len).fill(0.25), ch2: null,\n"
            "          s: {tpd: f.tpd, len: f.len}}; });\n"
            "var r = collapsePartialReads(frames);\n"
            "__emit(JSON.stringify(r.dropped));\n" % json.dumps(frames)
        )
        self.assertEqual(run_js_json(harness), 0)


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestMessageDuration(unittest.TestCase):
    """The recorder's messages want longer on screen than the app's ~1 s default."""

    def test_override_survives_the_first_draw(self):
        """drawMessage() resets the countdown when it first sees a new message, so setting
        it in showMessage() alone would be silently overwritten."""
        harness = recording_source() + (
            "\nrecShowMessage('hello');\n"
            "var afterShow = appParam_messageFrames;\n"
            # Replay what drawMessage() does on first sight of a new message.
            "appParam_lastMessage = appParam_message;\n"
            "appParam_messageCountdown = 10;\n"
            "if (appParam_messageFrames > 0) {\n"
            "  appParam_messageCountdown = appParam_messageFrames;\n"
            "  appParam_messageFrames = 0;\n"
            "}\n"
            "__emit(JSON.stringify({afterShow: afterShow,\n"
            "                       countdown: appParam_messageCountdown,\n"
            "                       cleared: appParam_messageFrames}));\n"
        )
        r = run_js_json(harness)
        self.assertEqual(r["afterShow"], 50, "5 s at one draw per 100 ms is 50 draws")
        self.assertEqual(r["countdown"], 50, "the override must win over the reset to 10")
        self.assertEqual(r["cleared"], 0, "it is one-shot, so other callers keep the default")

    def test_other_callers_keep_the_apps_default(self):
        harness = recording_source() + (
            "\nappParam_messageFrames = 0;\n"          # no recorder message pending
            "appParam_messageCountdown = 10;\n"
            "if (appParam_messageFrames > 0) appParam_messageCountdown = appParam_messageFrames;\n"
            "__emit(JSON.stringify(appParam_messageCountdown));\n"
        )
        self.assertEqual(run_js_json(harness), 10)


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestSidecarSourceHonesty(unittest.TestCase):
    """The sidecar must not claim calibration that the frame's code path never applied."""

    def _sidecar(self, sources):
        frames = [{"src": s} for s in sources]
        harness = recording_source() + (
            "\nrecordSampleRate = 200000000;\n"
            "var frames = %s.map(function (f) {\n"
            "  return {ch1: new Array(4).fill(0.25), ch2: null,\n"
            "    s: {t: 0, sr: 200000000, tpd: 5e-8, len: 4, trigIdx: 2, src: f.src,\n"
            "        demo: false, acq: 'Sample',\n"
            "        ch1: {vpd: 0.5, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "        ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "        trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1}}}; });\n"
            "var tl = planRecordingTimeline(frames, 200000000);\n"
            "__emit(JSON.stringify(buildRecordingSidecar(tl, false, [], 1, 1, 200000000)));\n"
            % json.dumps(frames)
        )
        return run_js_json(harness)

    def test_wav_only_capture_omits_the_offsets(self):
        """The WAV branch negates and applies no offset, so reporting 0.005 would be a lie."""
        sc = self._sidecar(["WAV", "WAV"])
        self.assertNotIn("verticalOffsetCH1", sc["app_calibration"])
        self.assertIn("verticalScale", sc["app_calibration"])
        self.assertEqual(sc["signal_sources"], ["WAV"])

    def test_databuffer_capture_reports_them(self):
        sc = self._sidecar(["DataBuffer", "DataBuffer"])
        self.assertEqual(sc["app_calibration"]["verticalOffsetCH1"], 0.005)
        self.assertEqual(sc["app_calibration"]["applies_to"], "all frames")

    def test_mixed_capture_says_which_frames(self):
        """Switching source mid-recording means the constants apply to only some frames."""
        sc = self._sidecar(["DataBuffer", "WAV", "DataBuffer2"])
        self.assertEqual(sc["app_calibration"]["applies_to"], "DataBuffer frames only")
        self.assertEqual(sorted(sc["signal_sources"]), ["DataBuffer", "DataBuffer2", "WAV"])

    def test_wav_samplerate_is_flagged_estimated(self):
        """For WAV the app estimates from frame length then clamps to the hardware ceiling:
        50 ns/div computes 500 MHz and is reported as 200 MHz."""
        self.assertTrue(self._sidecar(["WAV"])["samplerate_estimated"])
        self.assertFalse(self._sidecar(["DataBuffer"])["samplerate_estimated"])


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
