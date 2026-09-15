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

import jsengine
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

    def test_an_oversize_timeline_is_flagged_not_squashed(self):
        """Beyond the budget the plan is reported as oversize and the caller writes one file
        per frame. The gaps are left intact rather than being silently removed, because a
        squashed timeline is wrong where a missing one is merely absent."""
        r = self._plan([0.0, 100000000.0], length=100)   # an absurd gap at 20 kSa/s
        self.assertTrue(r["oversize"])
        self.assertEqual(r["mode"], "realtime")
        self.assertGreater(r["plan"][1]["gap"], 0, "gaps must not be quietly dropped")

    def test_a_normal_recording_is_not_oversize(self):
        self.assertFalse(self._plan([0.0, 500.0, 1000.0])["oversize"])

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
    """A .sr holds one samplerate, so a rate change has to become separate files.

    The rate of a frame is the app's own rule, (length - 1) / (12 * time-per-div), so these
    build frames by length rather than by asserting a rate.
    """

    @staticmethod
    def _len_for(rate, tpd=0.005):
        return int(round(rate * 12 * tpd)) + 1

    def _split(self, rates, tpd=0.005):
        lens = [self._len_for(r, tpd) for r in rates]
        harness = recording_source() + (
            "\nvar frames = %s.map(function (n) {\n"
            "  return {ch1: new Array(n).fill(0.25), ch2: null,\n"
            "          s: {t: 0, tpd: %s, len: n, src: 'DataBuffer'}}; });\n"
            "var runs = splitRecordingBySamplerate(frames);\n"
            "__emit(JSON.stringify(runs.map(function (r) {\n"
            "  return {rate: Math.round(r.sampleRate), n: r.frames.length}; })));\n"
            % (json.dumps(lens), tpd)
        )
        return run_js_json(harness)

    def test_constant_rate_stays_one_file(self):
        self.assertEqual(self._split([40000] * 5), [{"rate": 40000, "n": 5}])

    def test_rate_change_splits(self):
        self.assertEqual(self._split([40000, 40000, 20000, 20000, 20000]),
                         [{"rate": 40000, "n": 2}, {"rate": 20000, "n": 3}])

    def test_returning_to_an_earlier_rate_is_a_new_run(self):
        """Runs are consecutive, not grouped: going back starts a third file, because the
        frames in between belong elsewhere on the timeline."""
        self.assertEqual(self._split([40000, 20000, 40000]),
                         [{"rate": 40000, "n": 1}, {"rate": 20000, "n": 1},
                          {"rate": 40000, "n": 1}])

    def test_every_frame_is_kept(self):
        rates = [40000, 40000, 20000, 40000, 10000, 10000]
        self.assertEqual(sum(r["n"] for r in self._split(rates)), len(rates))

    def test_wav_and_databuffer_do_not_share_a_rate(self):
        """The bug this rule fixes. At 20 ns/div a WAV frame is a fixed 300 display points
        and a DataBuffer frame is 25 real samples, both spanning 12 divisions. The app's
        clamped readout called both 100 MHz, which stretched the WAV frames 12.5x."""
        harness = recording_source() + (
            "\nvar frames = [{ch1: new Array(300).fill(0.25), ch2: null,\n"
            "                s: {t: 0, tpd: 2e-8, len: 300, src: 'WAV'}},\n"
            "               {ch1: new Array(25).fill(0.25), ch2: null,\n"
            "                s: {t: 0, tpd: 2e-8, len: 25, src: 'DataBuffer'}}];\n"
            "var runs = splitRecordingBySamplerate(frames);\n"
            "__emit(JSON.stringify(runs.map(function (r) { return Math.round(r.sampleRate); })));\n"
        )
        rates = run_js_json(harness)
        self.assertEqual(len(rates), 2, "WAV and DataBuffer must not share a segment")
        self.assertAlmostEqual(rates[1], 100000000, delta=1)     # 24 / 240 ns
        self.assertGreater(rates[0], rates[1] * 10, "the WAV frame is far denser in points")

    def test_a_frame_always_spans_twelve_divisions(self):
        """The property the whole rule exists for: whatever the length, a frame occupies
        exactly 12 x time/div once written at its own rate."""
        harness = recording_source() + (
            "\nvar out = [300, 25, 2401, 4801].map(function (n) {\n"
            "  var r = recFrameSampleRate({tpd: 2e-8}, n);\n"
            "  return (n - 1) / r; });\n"
            "__emit(JSON.stringify(out));\n"
        )
        for span in run_js_json(harness):
            self.assertAlmostEqual(span, 12 * 2e-8, places=12)


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestRollingStitch(unittest.TestCase):
    """A rolling acquisition read repeatedly is one stream, not many frames.

    Measured on hardware: at 200 ms/div frame N+1 is frame N shifted by exactly the arrival
    interval, to a mean difference of 0.0000 V. Writing them separately duplicates most of
    the samples onto a timeline that cannot hold them.
    """

    def _stitch(self, offsets, length=400, rate=1000, tpd=0.5, src="DataBuffer2", jitter=0):
        """Windows onto one underlying ramp, at the given sample offsets."""
        frames = [{"off": o, "t": o / rate * 1000 + (jitter if i else 0)}
                  for i, o in enumerate(offsets)]
        harness = recording_source() + (
            "\nvar base = []; for (var i = 0; i < 20000; i++) base.push(Math.sin(i / 13));\n"
            "var frames = %s.map(function (f) {\n"
            "  return {ch1: base.slice(f.off, f.off + %d), ch2: null,\n"
            "          s: {t: f.t, tpd: %s, len: %d, src: '%s'}}; });\n"
            "var r = stitchRollingFrames(frames, %d);\n"
            "__emit(JSON.stringify({lens: r.frames.map(function (f) { return f.ch1.length; }),\n"
            "                       stitched: r.stitched, dropped: r.dropped,\n"
            "                       ok: r.frames.length === 1 &&\n"
            "                           r.frames[0].ch1.every(function (v, i) {\n"
            "                             return Math.abs(v - base[i]) < 1e-9; })}));\n"
            % (json.dumps(frames), length, tpd, length, src, rate)
        )
        return run_js_json(harness)

    def test_a_sliding_window_becomes_one_stream(self):
        r = self._stitch([0, 200, 400, 600])
        self.assertEqual(r["stitched"], 3)
        self.assertEqual(r["lens"], [400 + 3 * 200])
        self.assertTrue(r["ok"], "the stitched stream must equal the underlying signal")

    def test_the_result_contains_no_duplicated_samples(self):
        """Four 400-sample reads sliding by 200 hold 1000 distinct samples, not 1600."""
        r = self._stitch([0, 200, 400, 600])
        self.assertEqual(r["lens"][0], 1000)

    def test_a_timestamp_that_is_slightly_off_still_aligns(self):
        """The shift is confirmed against the samples, so jitter in the arrival time is
        recovered rather than trusted."""
        r = self._stitch([0, 200, 400], jitter=3.0)
        self.assertEqual(r["stitched"], 2)
        self.assertTrue(r["ok"])

    def test_unrelated_frames_are_left_alone(self):
        """No overlap means no stitch: the frames must survive untouched."""
        r = self._stitch([0, 4000, 8000])
        self.assertEqual(r["stitched"], 0)
        self.assertEqual(r["lens"], [400, 400, 400])

    def test_a_still_filling_acquisition_keeps_only_the_fullest(self):
        """Before the window starts sliding, a shorter frame is a prefix of the next."""
        harness = recording_source() + (
            "\nvar base = []; for (var i = 0; i < 5000; i++) base.push(Math.sin(i / 13));\n"
            "var frames = [186, 506, 4801].map(function (n) {\n"
            "  return {ch1: base.slice(0, n), ch2: null,\n"
            "          s: {t: 0, tpd: 0.5, len: n, src: 'DataBuffer2'}}; });\n"
            "var r = stitchRollingFrames(frames, 1000);\n"
            "__emit(JSON.stringify({lens: r.frames.map(function (f) { return f.ch1.length; }),\n"
            "                       dropped: r.dropped, stitched: r.stitched}));\n"
        )
        r = run_js_json(harness)
        self.assertEqual(r["lens"], [4801])
        self.assertEqual(r["dropped"], 2)

    def test_a_source_switch_is_never_stitched(self):
        harness = recording_source() + (
            "\nvar base = []; for (var i = 0; i < 5000; i++) base.push(Math.sin(i / 13));\n"
            "var frames = [{ch1: base.slice(0, 400), ch2: null,\n"
            "               s: {t: 0, tpd: 0.5, len: 400, src: 'DataBuffer'}},\n"
            "              {ch1: base.slice(200, 600), ch2: null,\n"
            "               s: {t: 200, tpd: 0.5, len: 400, src: 'WAV'}}];\n"
            "var r = stitchRollingFrames(frames, 1000);\n"
            "__emit(JSON.stringify({n: r.frames.length, stitched: r.stitched}));\n"
        )
        r = run_js_json(harness)
        self.assertEqual(r["n"], 2)
        self.assertEqual(r["stitched"], 0)


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
class TestSidecarCaptureMode(unittest.TestCase):
    """The sidecar must say which kind of samples it holds.

    'displayed' frames can carry interpolated points, so their rate counts display points per
    second rather than ADC samples; 'acquired' frames never can. Reporting this wrongly would
    make a synthetic trace look like a measurement.
    """

    def _sidecar(self, modes, interp=1):
        frames = [{"src": m} for m in modes]
        harness = recording_source() + (
            "\nrecordSampleRate = 200000000;\n"
            "var frames = %s.map(function (f) {\n"
            "  return {ch1: new Array(4).fill(0.25), ch2: null,\n"
            "    s: {t: 0, sr: 200000000, tpd: 5e-8, len: 4, trigIdx: 2, src: f.src,\n"
            "        acq: 'Sample', interpScale: %d,\n"
            "        proc: {interpolation: 'OFF', ch1_lpf: 'OFF', ch2_lpf: 'OFF', stabilize: 'ON'},\n"
            "        ch1: {vpd: 0.5, vpos: 0, probe: '10x', coupling: 'DC', lpf: 'OFF'},\n"
            "        ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', lpf: 'OFF'},\n"
            "        trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1}}}; });\n"
            "var tl = planRecordingTimeline(frames, 200000000);\n"
            "__emit(JSON.stringify(buildRecordingSidecar(tl, false, [], 1, 1, 200000000)));\n"
            % (json.dumps(frames), interp)
        )
        return run_js_json(harness)

    def test_acquired_capture_is_not_display_points(self):
        sc = self._sidecar(["acquired", "acquired"])
        self.assertFalse(sc["samplerate_is_display_points"])
        self.assertEqual(sc["capture_modes"], ["acquired"])

    def test_displayed_capture_is_flagged(self):
        """Whatever was drawn is what was recorded, so the rate may count synthetic points."""
        sc = self._sidecar(["displayed", "displayed"], interp=4)
        self.assertTrue(sc["samplerate_is_display_points"])
        self.assertEqual(sc["capture_modes"], ["displayed"])

    def test_mixed_capture_lists_both(self):
        """The mode is a grouping key, so this should not normally happen - but if it does,
        the sidecar has to say so rather than describe the file as one kind."""
        sc = self._sidecar(["acquired", "displayed"])
        self.assertEqual(sorted(sc["capture_modes"]), ["acquired", "displayed"])
        self.assertTrue(sc["samplerate_is_display_points"])

    def test_calibration_constants_always_reported(self):
        """beta42 has one data path, so the app's constants apply to every frame."""
        sc = self._sidecar(["acquired"])
        self.assertEqual(sc["app_calibration"]["verticalOffsetCH1"], 0.005)
        self.assertEqual(sc["app_calibration"]["applies_to"], "all frames")

    def test_samplerate_is_never_estimated(self):
        """The app now computes the rate from the timebase table, so nothing is guessed."""
        self.assertFalse(self._sidecar(["displayed"])["samplerate_estimated"])
        self.assertFalse(self._sidecar(["acquired"])["samplerate_estimated"])


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


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestStitchBeforeSplit(unittest.TestCase):
    """Stitching must happen before the samplerate split, not after.

    Partial reads of a filling buffer differ in length and therefore in rate. Splitting
    first put every one of them in a run of its own, so the stitcher never saw a pair and
    was inert exactly where it was designed to work — a real recording produced 259
    single-frame files because of it.
    """

    # The fill ramps observed at 0.5 s/div and 1 s/div in DSO2512G_recording_20260901T101757.
    RAMP_HALF = [75, 155, 219, 315, 395, 459, 555, 635, 699, 795, 875, 939, 1035, 1115,
                 1179, 1275, 1355, 1419, 1515, 1595, 1659, 1755, 1835, 1899, 1995, 2075,
                 2139, 2235, 2315, 2379, 2401, 3817]
    RAMP_ONE = [35, 67, 115, 155, 187, 235, 275, 307, 355, 395, 427, 475, 515, 547, 595,
                635, 667, 715, 755, 787, 835, 875, 2401]

    def _run(self):
        harness = recording_source() + (
            "\nvar base = []; for (var i = 0; i < 8000; i++) base.push(Math.sin(i / 41));\n"
            "function build(lens, tpd, t0) {\n"
            "  return lens.map(function (n, i) {\n"
            "    return {ch1: base.slice(0, n), ch2: null,\n"
            "            s: {t: t0 + i * 200, tpd: tpd, len: n, src: 'DataBuffer2'}}; });\n"
            "}\n"
            "var frames = build(%s, 0.5, 0).concat(build(%s, 1, 20000));\n"
            "var out = [], dropped = 0;\n"
            "groupByAcquisition(frames).forEach(function (g) {\n"
            "  var r = stitchRollingFrames(g.frames, recGroupSampleRate(g.frames));\n"
            "  dropped += r.dropped; out = out.concat(r.frames);\n"
            "});\n"
            "__emit(JSON.stringify({inn: frames.length, out: out.length, dropped: dropped,\n"
            "  files: splitRecordingBySamplerate(out).length,\n"
            "  lens: out.map(function (f) { return f.ch1.length; })}));\n"
            % (json.dumps(self.RAMP_HALF), json.dumps(self.RAMP_ONE))
        )
        return run_js_json(harness)

    def test_two_fill_ramps_become_two_files(self):
        r = self._run()
        self.assertEqual(r["inn"], 55)
        self.assertEqual(r["files"], 2, "each fill ramp is one acquisition, so one file")
        self.assertEqual(r["lens"], [3817, 2401], "only the fullest read of each survives")
        self.assertEqual(r["dropped"], 53)

    def test_grouping_ignores_the_rate(self):
        """Two frames of different length at one time/div belong together, even though
        their rates differ — which is the whole point of grouping before splitting."""
        harness = recording_source() + (
            "\nvar frames = [{ch1: new Array(100).fill(0), ch2: null,\n"
            "               s: {t: 0, tpd: 0.5, len: 100, src: 'DataBuffer2'}},\n"
            "              {ch1: new Array(4801).fill(0), ch2: null,\n"
            "               s: {t: 200, tpd: 0.5, len: 4801, src: 'DataBuffer2'}}];\n"
            "__emit(JSON.stringify({groups: groupByAcquisition(frames).length,\n"
            "  rates: splitRecordingBySamplerate(frames).length}));\n"
        )
        r = run_js_json(harness)
        self.assertEqual(r["groups"], 1, "one time/div and source is one acquisition")
        self.assertEqual(r["rates"], 2, "...even though the rate split would see two")

    def test_a_sub_hz_rate_is_reported(self):
        """A .sr samplerate is a whole number of Hz, so anything below 1 Sa/s cannot be
        written. Say so rather than flooring to 1 and stretching the timeline silently."""
        harness = recording_source_with_zip() + (
            "\nvar logged = []; log = function (m) { logged.push(m); };\n"
            "showMessage = function () {};\n"
            "downloadRecordingBlob = function () {};\n"
            "var built = buildRecordingSegment([{ch1: new Array(11).fill(0.25), ch2: null,\n"
            "  s: {t: 0, sr: 1, tpd: 10, len: 11, trigIdx: 1, src: 'DataBuffer2',\n"
            "      demo: false, acq: 'Sample',\n"
            "      ch1: {vpd: 0.5, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "      ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "      trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1}}}],\n"
            "  10 / 120, 1, 1, 'STAMP');\n"
            "var sc = JSON.parse(__written.filter(function (e) {\n"
            "  return e.name === 'dso2512g-recording.json'; })[0].text);\n"
            "__emit(JSON.stringify(sc.warnings));\n"
        )
        warnings = run_js_json(harness)
        self.assertTrue(any("below 1 Sa/s" in w for w in warnings),
                        "a sub-Hz rate must be reported, got %r" % (warnings,))


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestPartialReadSampleRate(unittest.TestCase):
    """A partly-filled acquisition keeps the acquisition's rate, not its own length's.

    In roll mode the app draws an incomplete waveform into the right-hand part of the grid
    instead of stretching it across the width — processForPlotting() left-pads by
    width - (length / intendedDrawnSamples) * width, so pixels per sample come out as
    width / intendedSamples however full the buffer is. Time per sample is constant while it
    fills, which is why the screen stays right.

    Deriving the rate from the array length instead made one 100 Hz signal read as 16, 20 and
    22 Hz across three consecutive reads of the same acquisition.
    """

    # Real reads at 500 ms/div from DSO2512G_recording_20260901T012911, where a complete
    # acquisition is 4801 samples and the generator was set to 100 Hz.
    READS = [778, 954, 1082, 4801]
    FULL = 4801
    TPD = 0.5
    PERIOD_SAMPLES = 8          # measured: 6 high + 2 low

    def _rates(self, intended):
        harness = recording_source() + (
            "\n__emit(JSON.stringify(%s.map(function (n) {\n"
            "  return recFrameSampleRate({tpd: %s, full: %s}, n); })));\n"
            % (json.dumps(self.READS), self.TPD, json.dumps(intended))
        )
        return run_js_json(harness)

    def test_every_read_of_one_acquisition_shares_its_rate(self):
        rates = self._rates(self.FULL)
        self.assertEqual(len(set(rates)), 1, "partial reads disagreed on the rate: %s" % rates)
        self.assertAlmostEqual(rates[0], (self.FULL - 1) / (12 * self.TPD), places=6)

    def test_the_signal_reads_the_same_frequency_in_every_read(self):
        """The measurement that exposed this: the generator never changed."""
        for rate in self._rates(self.FULL):
            self.assertAlmostEqual(rate / self.PERIOD_SAMPLES, 100.0, delta=0.5)

    def test_using_the_array_length_would_be_wrong(self):
        """Guards the regression directly — without `intended` the rates diverge."""
        rates = self._rates(None)
        self.assertGreater(len(set(rates)), 1, "expected the broken form to disagree")
        freqs = [r / self.PERIOD_SAMPLES for r in rates]
        self.assertLess(min(freqs), 20.0, "the broken form under-reports badly: %s" % freqs)

    def test_a_complete_frame_is_unaffected(self):
        """Outside roll mode length equals intended, so the rule is unchanged."""
        harness = recording_source() + (
            "\n__emit(JSON.stringify([\n"
            "  recFrameSampleRate({tpd: 0.005, full: 2401}, 2401),\n"
            "  recFrameSampleRate({tpd: 0.005}, 2401)]));\n"
        )
        with_intended, without = run_js_json(harness)
        self.assertAlmostEqual(with_intended, without, places=6)
        self.assertAlmostEqual(with_intended, 40000.0, places=3)

    def test_partial_reads_no_longer_fragment_the_export(self):
        """Sharing a rate means sharing a segment, which removes the fragmentation at its
        source rather than compensating for it afterwards."""
        harness = recording_source() + (
            "\nvar frames = %s.map(function (n) {\n"
            "  return {ch1: new Array(n).fill(0.25), ch2: null,\n"
            "          s: {t: 0, tpd: %s, len: n, full: %d, src: 'DataBuffer2'}}; });\n"
            "__emit(JSON.stringify(splitRecordingBySamplerate(frames).length));\n"
            % (json.dumps(self.READS), self.TPD, self.FULL)
        )
        self.assertEqual(run_js_json(harness), 1,
                         "reads of one acquisition must not split into separate files")


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestUnsettledTail(unittest.TestCase):
    """The last samples of a partial read are revised by the next one.

    While a slow acquisition fills, the scope reports slightly more samples than have
    settled. Measured over one 500 ms/div fill cycle, the last ~20 samples of a read are
    contradicted by the next, on every read whose count grew by 160 or 192 and on none that
    grew by 128. Those samples hold plausible voltages with transitions missing, which merges
    two pulses into one wide one — the visible symptom that started this.
    """

    @staticmethod
    def _cycle_js(lengths, frontier, period=8, high=6):
        """A filling buffer whose reads carry `frontier` unsettled samples at the end."""
        return (
            "\nvar truth = [];\n"
            "for (var i = 0; i < 6000; i++) truth.push((i %% %d) < %d ? 2.44 : 0.0);\n"
            "var frames = %s.map(function (n, idx) {\n"
            "  var a = truth.slice(0, n);\n"
            "  for (var j = Math.max(0, n - %d); j < n; j++) a[j] = 2.44;  // unsettled: flat\n"
            "  return {ch1: a, ch2: null,\n"
            "          s: {t: idx * 200, tpd: 0.5, len: n, full: 4801, src: 'DataBuffer2'}};\n"
            "});\n" % (period, high, json.dumps(lengths), frontier)
        )

    def _run(self, lengths, frontier):
        harness = recording_source() + self._cycle_js(lengths, frontier) + (
            "var r = stitchRollingFrames(frames, recGroupSampleRate(frames));\n"
            "var f = r.frames[r.frames.length - 1].ch1;\n"
            "var runs = [], cur = null, n = 0;\n"
            "for (var i = 0; i < f.length; i++) {\n"
            "  var hi = f[i] > 1.2;\n"
            "  if (cur === null) { cur = hi; n = 1; }\n"
            "  else if (hi === cur) { n++; }\n"
            "  else { runs.push(n); cur = hi; n = 1; }\n"
            "}\n"
            "runs.push(n);\n"
            "__emit(JSON.stringify({frames: r.frames.length, len: f.length,\n"
            "  trimmed: r.trimmed, merged: r.dropped + r.stitched,\n"
            "  widest: Math.max.apply(null, runs)}));\n"
        )
        return run_js_json(harness)

    def test_a_fill_cycle_collapses_to_one_frame(self):
        r = self._run([186, 314, 506, 666, 794, 986, 1146], 20)
        self.assertEqual(r["frames"], 1, "reads of one acquisition are one frame")
        self.assertEqual(r["merged"], 6, "every later read should fold into the first")

    def test_the_unsettled_tail_is_trimmed(self):
        """The last read has no successor, so its own tail was never corrected."""
        r = self._run([186, 314, 506, 666, 794, 986, 1146], 20)
        self.assertGreaterEqual(r["trimmed"], 20,
                                "expected the measured frontier to be trimmed")
        self.assertLess(r["len"], 1146, "the final read should end short of its full length")

    def test_no_merged_pulse_survives(self):
        """The symptom: a flat unsettled tail merges pulses into one wide run."""
        r = self._run([186, 314, 506, 666, 794, 986, 1146], 20)
        self.assertLessEqual(r["widest"], 6,
                             "a run wider than the signal's own pulse survived: %d" % r["widest"])

    def test_a_clean_cycle_loses_nothing(self):
        """With no unsettled tail there is nothing to measure, so nothing is trimmed."""
        r = self._run([186, 314, 506, 666, 794, 986, 1146], 0)
        self.assertEqual(r["frames"], 1)
        self.assertEqual(r["trimmed"], 0)
        self.assertEqual(r["len"], 1146, "a clean read must be kept in full")

    def test_a_padded_read_still_matches_its_neighbours(self):
        """trimWaveArray() prepends a duplicate of sample 0 when a read's length is exactly
        1200, 601, 600, 481 or 480, to make the count odd so the trigger lands on the centre
        sample. A filling buffer sweeps through those lengths and gets the pad spuriously,
        offsetting one read by a sample; it must still be recognised as the same acquisition.
        """
        harness = recording_source() + (
            "\nvar truth = []; for (var i = 0; i < 3000; i++) truth.push((i % 8) < 6 ? 2.44 : 0.0);\n"
            "var frames = [320, 480, 640].map(function (n, idx) {\n"
            "  var a = truth.slice(0, n);\n"
            "  if (n === 480) a = [a[0]].concat(a);      // the spurious centring pad\n"
            "  return {ch1: a, ch2: null,\n"
            "          s: {t: idx * 200, tpd: 0.5, len: a.length, full: 4801, src: 'DataBuffer2'}};\n"
            "});\n"
            "var r = stitchRollingFrames(frames, recGroupSampleRate(frames));\n"
            "__emit(JSON.stringify({frames: r.frames.length}));\n"
        )
        r = run_js_json(harness)
        self.assertEqual(r["frames"], 1, "a one-sample pad must not break the match")

    def test_a_complete_acquisition_is_untouched(self):
        """Complete reads never carry an unsettled tail, so nothing may be trimmed."""
        harness = recording_source() + (
            "\nvar truth = []; for (var i = 0; i < 5000; i++) truth.push((i % 8) < 6 ? 2.44 : 0.0);\n"
            "var frames = [0, 1].map(function (idx) {\n"
            "  return {ch1: truth.slice(0, 2401), ch2: null,\n"
            "          s: {t: idx * 200, tpd: 0.005, len: 2401, full: 2401, src: 'DataBuffer'}};\n"
            "});\n"
            "var r = stitchRollingFrames(frames, recGroupSampleRate(frames));\n"
            "__emit(JSON.stringify({trimmed: r.trimmed,\n"
            "  lens: r.frames.map(function (f) { return f.ch1.length; })}));\n"
        )
        r = run_js_json(harness)
        self.assertEqual(r["trimmed"], 0)
        self.assertTrue(all(n == 2401 for n in r["lens"]),
                        "a complete acquisition must keep every sample: %s" % r["lens"])


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestHoledFrameWarning(unittest.TestCase):
    """NaN among real readings is missing data, not dead time.

    In single-channel mode `DataBuffer2` interleaves CH2's and CH1's samples to double the
    rate, indexing both by CH1's count. A shorter CH2 makes `parseInt('', 16)` return NaN for
    the CH2-derived positions of the tail. The app guards the case where CH2 is absent
    entirely, but not this one, so the frame reaches the export looking like absent data.
    """

    def _warnings(self, ch1_js):
        harness = recording_source_with_zip() + (
            "\nvar logged = []; log = function (m) { logged.push(m); };\n"
            "showMessage = function () {}; downloadRecordingBlob = function () {};\n"
            "buildRecordingSegment([{ch1: %s, ch2: null,\n"
            "  s: {t: 0, sr: 40000, tpd: 0.005, len: 8, trigIdx: 4, src: 'DataBuffer2',\n"
            "      full: 8, demo: false, acq: 'Sample',\n"
            "      ch1: {vpd: 0.5, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "      ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "      trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1}}}],\n"
            "  40000, 1, 1, 'STAMP');\n"
            "var sc = JSON.parse(__written.filter(function (e) {\n"
            "  return e.name === 'dso2512g-recording.json'; })[0].text);\n"
            "__emit(JSON.stringify(sc.warnings));\n" % ch1_js
        )
        return run_js_json(harness)

    def test_interleaved_gaps_are_reported(self):
        """NaN in alternate positions of the tail — the shape a short CH2 produces."""
        w = self._warnings("[0.2, 0.3, 0.2, 0.3, NaN, 0.3, NaN, 0.3]")
        self.assertTrue(any("mismatched" in x for x in w),
                        "a holed frame must be reported, got %r" % (w,))

    def test_a_clean_frame_is_not_reported(self):
        w = self._warnings("[0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3]")
        self.assertFalse(any("mismatched" in x for x in w), "clean frame wrongly flagged")

    def test_dead_time_is_not_confused_with_a_hole(self):
        """A gap between frames is all-NaN and carries no readings, so it is not a hole."""
        harness = recording_source_with_zip() + (
            "\nlog = function () {}; showMessage = function () {};\n"
            "downloadRecordingBlob = function () {};\n"
            "var mk = function (t) { return {ch1: [0.2, 0.3, 0.2, 0.3, 0.2, 0.3, 0.2, 0.3],\n"
            "  ch2: null, s: {t: t, sr: 40000, tpd: 0.005, len: 8, trigIdx: 4,\n"
            "    src: 'DataBuffer2', full: 8, demo: false, acq: 'Sample',\n"
            "    ch1: {vpd: 0.5, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "    ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', bw: 'OFF'},\n"
            "    trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 1}}}; };\n"
            "buildRecordingSegment([mk(0), mk(500)], 40000, 1, 1, 'STAMP');\n"
            "var sc = JSON.parse(__written.filter(function (e) {\n"
            "  return e.name === 'dso2512g-recording.json'; })[0].text);\n"
            "__emit(JSON.stringify({w: sc.warnings, gap: sc.frames[1].gap_before}));\n"
        )
        r = run_js_json(harness)
        self.assertGreater(r["gap"], 0, "the two frames should be separated by dead time")
        self.assertFalse(any("mismatched" in x for x in r["w"]))


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestRateDenominatorIsSourceAware(unittest.TestCase):
    """A frame's rate divides by what a COMPLETE frame from *that source* holds.

    For a raw source that is the acquisition length, so a partial read still carries its
    acquisition's rate. A `WAV` frame is the instrument's rendered screen — a fixed 300
    points at every timebase, never partial — so its own length is the right count.
    `appParam_intendedSamples` counts raw samples a WAV frame never contains, and using it
    made WAV frames up to sixteen times too fast, compressing them to a fraction of the
    twelve divisions they actually span.
    """

    def _span(self, length, full, tpd):
        harness = recording_source() + (
            "\nvar r = recFrameSampleRate({tpd: %s, full: %s}, %d);\n"
            "__emit(JSON.stringify({rate: r, span: (%d - 1) / r}));\n"
            % (tpd, json.dumps(full), length, length)
        )
        return run_js_json(harness)

    def test_a_wav_frame_spans_twelve_divisions(self):
        """300 rendered points across the screen, whatever the timebase."""
        for tpd in (2e-8, 5e-6, 0.5):
            r = self._span(300, 300, tpd)
            self.assertAlmostEqual(r["span"], 12 * tpd, delta=12 * tpd * 0.01,
                                   msg="WAV frame at %s s/div spans %.3g s, want %.3g s"
                                       % (tpd, r["span"], 12 * tpd))

    def test_the_raw_acquisition_count_would_break_wav(self):
        """Guards the regression directly: 300 points over a 2401-sample denominator."""
        wrong = self._span(300, 2401, 2e-8)
        right = self._span(300, 300, 2e-8)
        self.assertGreater(right["span"] / wrong["span"], 5,
                           "the wrong denominator should be badly off, not marginally")
        self.assertAlmostEqual(right["span"], 12 * 2e-8, delta=1e-10)

    def test_a_partial_raw_read_still_uses_its_acquisition(self):
        """The other half of the rule, unchanged: a partial read is not its own yardstick."""
        for length in (778, 954, 1082, 4801):
            r = self._span(length, 4801, 0.5)
            self.assertAlmostEqual(r["rate"], 800.0, delta=0.5)

    def test_wav_and_raw_frames_of_one_screen_agree_in_duration(self):
        """Both describe the same twelve divisions, so both must span the same time even
        though one holds 300 points and the other 25."""
        wav = self._span(300, 300, 2e-8)
        raw = self._span(25, 25, 2e-8)
        self.assertAlmostEqual(wav["span"], raw["span"], delta=1e-10)


class TestFirmwareVersionFix(unittest.TestCase):
    """The opt-in `fw_version` payload: accept the listed minimum 'or newer'.

    The stock app tests the reply with exact string equality against a single version, so any
    newer modded firmware is rejected and the app calls stopPlotting(). These cases run the
    shipped payload inside a reproduction of the app's own check.
    """

    def decide(self, version_data):
        if jsengine.find_engine() is None:
            self.skipTest(jsengine.NO_ENGINE)
        return jsengine.run_js_json(jsengine.firmware_check_source(version_data))["valid"]

    def test_listed_version_still_accepted(self):
        self.assertEqual(self.decide("V1.3.0C MOD V9B5"), 1)

    def test_newer_firmware_accepted(self):
        """The case the fix exists for - V9B6 is rejected by the stock exact-match check."""
        for v in ("V1.3.0C MOD V9B6", "V1.3.0C MOD V9B7", "V1.3.0C MOD V9B10"):
            self.assertEqual(self.decide(v), 1, v)

    def test_untrimmed_reply_accepted(self):
        """versionData is response.slice(4) with no trim; a trailing CR alone used to fail."""
        for v in ("V1.3.0C MOD V9B6\r", "V1.3.0C MOD V9B6 ", " V1.3.0C MOD V9B6"):
            self.assertEqual(self.decide(v), 1, repr(v))

    def test_case_insensitive(self):
        self.assertEqual(self.decide("V1.3.0c mod v9b6"), 1)

    def test_unknown_revision_format_accepted_on_prefix(self):
        """parseResponseBuffer() only resolves on a 'V1.3.0C' prefix, so this is a real reply."""
        self.assertEqual(self.decide("V1.3.0C MOD SOMETHING"), 1)

    def test_older_firmware_still_rejected(self):
        """The gate is loosened, not removed: beta42 needs V9B5 for USB-serial boot mode."""
        for v in ("V1.3.0C MOD V9B3", "V1.3.0C MOD V9B4"):
            self.assertEqual(self.decide(v), 0, v)

    def test_non_version_replies_rejected(self):
        for v in ("GARBAGE", "", "V2.0.0 MOD V9B6"):
            self.assertEqual(self.decide(v), 0, repr(v))


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestCaptureModeEquivalence(unittest.TestCase):
    """Neither capture mode may be affected by the channel position knob.

    applyOffset() adds appParam_CHnOffset absolutely and runs AFTER the snapshot point, so a
    'displayed' frame carries the knob and must have it subtracted back out, while an 'acquired'
    frame never received it. Get that wrong and every recording is offset by wherever the knob
    happened to sit - silently, because the trace still looks right on screen.
    """

    def volts(self, mode, knob):
        harness = recording_source() + (
            "\nfunction applyOffset(a, off) { return a.map(function (v) { return v + off; }); }\n"
            "appParam_CH1Offset = %r;\n"
            "recCaptureMode = %s;\n"
            "var acquired = [0.0, 0.125, -0.25];\n"   # 0 V, +1 div, -2 div
            "var captured = (recCaptureMode === 'displayed')\n"
            "    ? applyOffset(acquired, appParam_CH1Offset) : acquired.slice();\n"
            "var s = recSnapshotSettings(captured.length);\n"
            "__emit(JSON.stringify(recToVolts(captured, s.ch1.vpd, s.ch1.vpos)));\n"
            % (knob, json.dumps(mode))
        )
        return run_js_json(harness)

    def test_modes_agree_and_ignore_the_knob(self):
        for knob in (0.0, 0.25, -0.4, 0.9):
            d = self.volts("displayed", knob)
            a = self.volts("acquired", knob)
            for i, (x, y) in enumerate(zip(d, a)):
                self.assertAlmostEqual(x, y, places=9,
                                       msg="modes disagree at knob=%s sample %d" % (knob, i))
            # 1 V/div: 0 V, +1 div, -2 div  ->  0, 1, -2 volts, whatever the knob does
            for got, want in zip(a, (0.0, 1.0, -2.0)):
                self.assertAlmostEqual(got, want, places=9, msg="knob=%s leaked into volts" % knob)

    def test_displayed_subtracts_the_offset_acquired_does_not(self):
        """The two modes must ask for different vpos, or the cancellation above is luck."""
        src = recording_source() + (
            "\nappParam_CH1Offset = 0.3;\n"
            "recCaptureMode = 'displayed'; var d = recSnapshotSettings(3).ch1.vpos;\n"
            "recCaptureMode = 'acquired';  var a = recSnapshotSettings(3).ch1.vpos;\n"
            "__emit(JSON.stringify({displayed: d, acquired: a}));\n"
        )
        got = run_js_json(src)
        self.assertAlmostEqual(got["displayed"], 0.3)
        self.assertEqual(got["acquired"], 0)


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestCaptureModeRate(unittest.TestCase):
    """Interpolation inflates a 'displayed' frame, so its rate has to be scaled to match."""

    def rate(self, mode, interp_scale):
        src = recording_source() + (
            "\nappParam_sampleRate = 800; appParam_interpScale = %d;\n"
            "appParam_intendedSamples = 4801;\n"
            "recCaptureMode = %s;\n"
            "var s = recSnapshotSettings(10);\n"
            "__emit(JSON.stringify({sr: s.sr, full: s.full, interp: s.interpScale}));\n"
            % (interp_scale, json.dumps(mode))
        )
        return run_js_json(src)

    def test_displayed_scales_rate_and_full_together(self):
        got = self.rate("displayed", 4)
        self.assertEqual(got["interp"], 4)
        self.assertEqual(got["sr"], 3200)
        # (n-1)*interp + 1, not n*interp: interpolation subdivides the INTERVALS between
        # samples, so 4801 samples (4800 intervals) become 19201, not 19204. This assertion
        # previously encoded the wrong formula and so hid the bug it was meant to catch.
        self.assertEqual(got["full"], (4801 - 1) * 4 + 1)

    def test_acquired_ignores_interpolation(self):
        """'acquired' forces interpolation off, so a stale interpScale must not leak in."""
        got = self.rate("acquired", 4)
        self.assertEqual(got["interp"], 1)
        self.assertEqual(got["sr"], 800)
        self.assertEqual(got["full"], 4801)


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestFramesTimelineMode(unittest.TestCase):
    """Back-to-back placement, for when realtime placement would be mostly NaN.

    At a fast time/div a frame covers 12 x TPD but arrives every ~100 ms, so an honest
    realtime timeline is ~99.98% padding. Measured: a 12 s capture at 100 MS/s needs
    1.21e9 samples/channel - only 9.9 MB on disk, but 6.6 minutes for libsigrok to read,
    against 0.1 s for the same frames packed. The padding is cheap to store and expensive
    to consume, which is what the budget is really guarding.
    """

    def plan(self, mode, gap_ms, n=4, length=100, rate=1000, base=None):
        frames = [{"t": i * gap_ms} for i in range(n)]
        src = recording_source() + (
            "\nvar frames = %s.map(function (f) {\n"
            "  return {ch1: new Array(%d).fill(0.1), ch2: null, s: {t: f.t}}; });\n"
            "var tl = planRecordingTimeline(frames, %d, %s, %s);\n"
            "__emit(JSON.stringify({mode: tl.mode, total: tl.total, oversize: tl.oversize,\n"
            "  t0: tl.t0, starts: tl.plan.map(function (p) { return p.start; }),\n"
            "  gaps: tl.plan.map(function (p) { return p.gap; })}));\n"
            % (json.dumps(frames), length, rate, json.dumps(mode), json.dumps(base))
        )
        return run_js_json(src)

    def test_frames_mode_packs_back_to_back(self):
        got = self.plan("frames", gap_ms=1000)
        self.assertEqual(got["mode"], "frames")
        self.assertEqual(got["starts"], [0, 100, 200, 300])
        self.assertEqual(got["gaps"], [0, 0, 0, 0])
        self.assertEqual(got["total"], 400)

    def test_realtime_mode_still_spaces_frames(self):
        """The default must be unchanged: 1 s apart at 1 kHz is 1000 samples apart."""
        got = self.plan("realtime", gap_ms=1000)
        self.assertEqual(got["mode"], "realtime")
        self.assertEqual(got["starts"], [0, 1000, 2000, 3000])

    def test_frames_mode_is_never_oversize(self):
        """Packed frames total the captured samples, so the budget cannot be exceeded."""
        got = self.plan("frames", gap_ms=10_000_000)
        self.assertFalse(got["oversize"])
        self.assertEqual(got["total"], 400)

    def test_realtime_flags_oversize_on_a_sparse_recording(self):
        """9 gaps of 10 Ms each is 90 M samples, past the 50 M budget."""
        got = self.plan("realtime", gap_ms=10_000_000, n=10)
        self.assertTrue(got["oversize"])
        self.assertGreater(got["total"], 50_000_000)

    def test_explicit_t0_is_honoured(self):
        """A recording-wide t0 keeps t_ms comparable across the files of a split recording.

        Without it each segment used its own first frame, so every single-frame file
        reported t_ms: 0 while its own warning claimed the offset was preserved.
        """
        got = self.plan("frames", gap_ms=1000, base=0)
        self.assertEqual(got["t0"], 0)
        shifted = self.plan("frames", gap_ms=1000, base=-5000)
        self.assertEqual(shifted["t0"], -5000)

    def test_default_t0_is_the_first_frame(self):
        got = self.plan("realtime", gap_ms=1000)
        self.assertEqual(got["t0"], 0)


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestFramesTimelineSidecar(unittest.TestCase):
    """t_ms must survive packing: it is the only record of when a frame actually arrived."""

    def sidecar(self, mode, gap_ms, base):
        n = 3
        frames = [{"t": base + i * gap_ms} for i in range(n)]
        src = recording_source() + (
            "\nvar frames = %s.map(function (f) {\n"
            "  return {ch1: new Array(10).fill(0.1), ch2: null,\n"
            "    s: {t: f.t, sr: 1000, tpd: 1, len: 10, trigIdx: 5, src: 'acquired',\n"
            "        acq: 'Sample', interpScale: 1,\n"
            "        proc: {interpolation: 'OFF', ch1_lpf: 'OFF', ch2_lpf: 'OFF', stabilize: 'ON'},\n"
            "        ch1: {vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', lpf: 'OFF'},\n"
            "        ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', lpf: 'OFF'},\n"
            "        trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 0}}}; });\n"
            "var tl = planRecordingTimeline(frames, 1000, %s, %s);\n"
            "__emit(JSON.stringify(buildRecordingSidecar(tl, false, [], 1, 1, 1000)));\n"
            % (json.dumps(frames), json.dumps(mode), json.dumps(base))
        )
        return run_js_json(src)

    def test_t_ms_survives_packing(self):
        """Frames sit back to back in the file but still report when they arrived."""
        sc = self.sidecar("frames", gap_ms=250, base=1000)
        self.assertEqual([f["t_ms"] for f in sc["frames"]], [0, 250, 500])
        self.assertEqual([f["start_sample"] for f in sc["frames"]], [0, 10, 20])
        self.assertEqual(sc["timeline"]["mode"], "frames")

    def test_t_ms_is_relative_to_the_recording_not_the_segment(self):
        """A segment whose frames start 5 s in must not restart its clock at zero.

        The frames sit at t = 5000..5500 while the RECORDING began at t = 0, so their
        offsets are 5000..5500 - not 0, which is what a per-segment t0 produced.
        """
        n = 3
        frames = [{"t": 5000 + i * 250} for i in range(n)]
        src = recording_source() + (
            "\nvar frames = %s.map(function (f) {\n"
            "  return {ch1: new Array(10).fill(0.1), ch2: null,\n"
            "    s: {t: f.t, sr: 1000, tpd: 1, len: 10, trigIdx: 5, src: 'acquired',\n"
            "        acq: 'Sample', interpScale: 1,\n"
            "        proc: {interpolation: 'OFF', ch1_lpf: 'OFF', ch2_lpf: 'OFF', stabilize: 'ON'},\n"
            "        ch1: {vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', lpf: 'OFF'},\n"
            "        ch2: {on: false, vpd: 1, vpos: 0, probe: '10x', coupling: 'DC', lpf: 'OFF'},\n"
            "        trig: {src: 'CH1', mode: 'Auto', edge: 'rising', level: 0}}}; });\n"
            "var tl = planRecordingTimeline(frames, 1000, 'frames', 0);\n"   # recording t0 = 0
            "__emit(JSON.stringify(buildRecordingSidecar(tl, false, [], 2, 3, 1000)));\n"
            % json.dumps(frames)
        )
        sc = run_js_json(src)
        self.assertEqual([f["t_ms"] for f in sc["frames"]], [5000, 5250, 5500])
        self.assertEqual([f["start_sample"] for f in sc["frames"]], [0, 10, 20])


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestZeroGrowthReads(unittest.TestCase):
    """A poll landing inside one sample period returns the same array again.

    At 10 s/div the rate is 20 Sa/s - one sample every 50 ms - while polls were measured as
    close as 39 ms apart, so a read can bring no new samples at all. Neither the shift search
    (which skips k <= 0) nor the filling branch (which needs growth) matched such a pair, so
    the chain broke and each break started a new output frame: 2755 reads became 157 frames
    with 137 of 156 pairs still prefixes of their successor.
    """

    def stitch(self, arrays, tpd=10, rate=20, dt=40):
        frames = [{"ch1": a, "t": i * dt} for i, a in enumerate(arrays)]
        src = recording_source() + (
            "\nvar raw = %s;\n"
            "var frames = raw.map(function (f) {\n"
            "  return {ch1: f.ch1, ch2: null, s: {t: f.t, tpd: %r, src: 'acquired', full: 2401}}; });\n"
            "var r = stitchRollingFrames(frames, %d);\n"
            "__emit(JSON.stringify({out: r.frames.length, stitched: r.stitched, dropped: r.dropped,\n"
            "  lens: r.frames.map(function (f) { return f.ch1.length; })}));\n"
            % (json.dumps(frames), tpd, rate)
        )
        return run_js_json(src)

    def ramp(self, n):
        return [round(0.001 * i, 6) for i in range(n)]

    def test_identical_repeat_is_dropped(self):
        """The same window read twice must collapse to one frame, not two."""
        a = self.ramp(74)
        got = self.stitch([a, list(a)])
        self.assertEqual(got["out"], 1)
        self.assertEqual(got["lens"], [74])

    def test_repeat_with_a_revised_frontier_is_dropped(self):
        """The newer read revises the last sample or two; that must not break the chain."""
        a = self.ramp(74)
        b = list(a)
        b[-1] += 0.02
        b[-2] += 0.02
        got = self.stitch([a, b])
        self.assertEqual(got["out"], 1)

    def test_the_newer_read_wins(self):
        """Equal length means the same window, so the later read supersedes the earlier."""
        a = self.ramp(50)
        b = list(a)
        b[-1] = 9.0
        got = self.stitch([a, b])
        self.assertEqual(got["out"], 1)

    def test_a_genuinely_different_frame_is_not_merged(self):
        """Same length but unrelated content is a new acquisition, and must stay separate."""
        a = self.ramp(60)
        b = [round(5.0 - 0.001 * i, 6) for i in range(60)]
        got = self.stitch([a, b])
        self.assertEqual(got["out"], 2)

    def test_the_10s_signature_collapses(self):
        """The real pattern: a filling buffer where some polls bring nothing."""
        seq = [self.ramp(n) for n in (74, 74, 107, 119, 139, 151, 151, 178, 192)]
        got = self.stitch(seq)
        self.assertEqual(got["out"], 1, "zero-growth reads still break the chain")
        self.assertEqual(got["lens"], [192])

    def test_growth_still_works(self):
        """The 500 ms/div case that already worked must not regress."""
        seq = [self.ramp(n) for n in (100, 370, 640, 910)]
        got = self.stitch(seq, tpd=0.5, rate=400, dt=680)
        self.assertEqual(got["out"], 1)
        self.assertEqual(got["lens"], [910])


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestClampedLayoutIsLabelled(unittest.TestCase):
    """Frames that all overlap in wall-clock are packed in fact, so the file must say so.

    One 137 s capture at 10 s/div reported 226,955 samples at 20 Sa/s - 11,348 s, 83x its
    true span - while calling itself a realtime timeline.
    """

    def plan(self, gaps_ms, length=2401, rate=20):
        frames, t = [], 0
        for g in gaps_ms:
            frames.append({"t": t}); t += g
        src = recording_source() + (
            "\nvar raw = %s;\n"
            "var frames = raw.map(function (f) {\n"
            "  return {ch1: new Array(%d).fill(0.1), ch2: null, s: {t: f.t}}; });\n"
            "var tl = planRecordingTimeline(frames, %d);\n"
            "__emit(JSON.stringify({mode: tl.mode, clamped: tl.clamped, total: tl.total}));\n"
            % (json.dumps(frames), length, rate)
        )
        return run_js_json(src)

    def test_overlapping_frames_are_labelled_frames(self):
        """2401 samples at 20 Sa/s is 120 s of signal arriving every 0.7 s: all overlap."""
        got = self.plan([700] * 6)
        self.assertEqual(got["clamped"], 5)  # the first frame has nothing before it to overlap
        self.assertEqual(got["mode"], "frames")

    def test_well_spaced_frames_stay_realtime(self):
        """Short frames arriving far apart place honestly and must keep their gaps."""
        got = self.plan([10000] * 6, length=10)
        self.assertEqual(got["clamped"], 0)
        self.assertEqual(got["mode"], "realtime")
        self.assertGreater(got["total"], 6 * 10)


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestZeroGrowthWhilePrevAccumulates(unittest.TestCase):
    """The sliding-phase form of a poll landing inside one sample period.

    Once the screen is full the accumulated `prev` grows with every merge while each fresh
    read stays exactly appParam_intendedSamples long, so a zero-advance read arrives SHORTER
    than prev rather than equal to it. The instrumented capture showed cur=2401 every time
    against prev=2403..2508 at dt=32-42ms with expect=1 - a shift of 0 that
    recFindOverlapShift() cannot return (it skips k <= 0) and neither length branch matched.
    """

    def stitch(self, arrays, rate=20, dt=40):
        frames = [{"ch1": a, "t": i * dt} for i, a in enumerate(arrays)]
        src = recording_source() + (
            "\nvar raw = %s;\n"
            "var frames = raw.map(function (f) {\n"
            "  return {ch1: f.ch1, ch2: null, s: {t: f.t, tpd: 10, src: 'acquired', full: 2401}}; });\n"
            "var r = stitchRollingFrames(frames, %d);\n"
            "__emit(JSON.stringify({out: r.frames.length, stitched: r.stitched,\n"
            "  dropped: r.dropped, lens: r.frames.map(function (f) { return f.ch1.length; })}));\n"
            % (json.dumps(frames), rate)
        )
        return run_js_json(src)

    def wave(self, n, off=0):
        return [round(0.001 * ((i + off) % 400), 6) for i in range(n)]

    def test_shorter_reread_of_an_accumulated_stream_merges(self):
        """prev=2417, cur=2401 with the window unmoved: cur is prev's last 2401 samples."""
        prev = self.wave(2417)
        cur = list(prev[16:])                      # the same window, no advance
        got = self.stitch([prev, cur])
        self.assertEqual(got["out"], 1, "shift 0 against a longer prev was not matched")
        self.assertEqual(got["lens"], [2417], "prev must keep its length, tail replaced")

    def test_the_captured_signature(self):
        """The real sliding pattern: each read is the LATEST 2401-sample window.

        Some polls land inside a sample period and the window has not moved, so the read
        repeats - which is the cur=2401 against a longer prev that the DIAG line showed.
        The whole run is one acquisition and must come back as one frame.
        """
        source = self.wave(3000)
        positions = [0, 0, 16, 16, 34, 34, 50, 68, 68, 85]   # zero advance where repeated
        seq = [list(source[p:p + 2401]) for p in positions]
        got = self.stitch(seq)
        self.assertEqual(got["out"], 1, "the chain still breaks on zero-advance re-reads")
        # one window plus everything it advanced by
        self.assertEqual(got["lens"], [2401 + positions[-1]])

    def test_a_shorter_unrelated_frame_is_not_swallowed(self):
        """Shorter than prev but different content must stay a separate frame."""
        prev = self.wave(2417)
        cur = [round(5.0 - 0.001 * i, 6) for i in range(2401)]
        got = self.stitch([prev, cur])
        self.assertEqual(got["out"], 2)

    def test_equal_length_case_still_works(self):
        """The filling-phase form must not regress."""
        a = self.wave(74)
        got = self.stitch([a, list(a)])
        self.assertEqual(got["out"], 1)


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestDisjointAcquisitions(unittest.TestCase):
    """Frames too far apart in time to overlap are not stitch failures.

    At 10 ns/div the rate is 100 MS/s, so a 2401-sample frame covers 24 us while the app
    still polls every ~80 ms: consecutive reads are separate triggered acquisitions 3300x
    further apart than they are long. A real capture reported expect=7980000 for a frame of
    2401 samples on every pair, which filled the diagnostic with correct non-matches.
    """

    def run_stitch(self, n_frames, dt_ms, rate, length=2401, same=False):
        frames = []
        for i in range(n_frames):
            off = 0 if same else i * 37
            frames.append({"ch1": [round(0.001 * ((j + off) % 400), 6) for j in range(length)],
                           "t": i * dt_ms})
        src = recording_source() + (
            "\nvar raw = %s;\n"
            "var frames = raw.map(function (f) {\n"
            "  return {ch1: f.ch1, ch2: null, s: {t: f.t, tpd: 1e-8, src: 'acquired', full: 2401}}; });\n"
            "var r = stitchRollingFrames(frames, %d);\n"
            "__emit(JSON.stringify({out: r.frames.length, stitched: r.stitched, dropped: r.dropped,\n"
            "  failures: (typeof recStitchFailures === 'undefined') ? -1 : recStitchFailures.length}));\n"
            % (json.dumps(frames), rate)
        )
        return run_js_json(src)

    def test_fast_timebase_frames_stay_separate(self):
        """46 acquisitions 80 ms apart at 100 MS/s must come out as 46 frames."""
        got = self.run_stitch(6, 80, 100_000_000)
        self.assertEqual(got["out"], 6)
        self.assertEqual(got["stitched"], 0)

    def test_disjoint_pairs_are_not_reported_as_failures(self):
        """The diagnostic must name pairs that ought to have matched, not these."""
        got = self.run_stitch(6, 80, 100_000_000)
        self.assertEqual(got["failures"], 0,
                         "provably disjoint acquisitions were logged as stitch failures")

    def test_identical_content_is_still_not_merged_when_far_apart(self):
        """Even byte-identical frames are separate events if the clock says so.

        A repeating signal at a fast timebase produces near-identical acquisitions; merging
        them would invent one continuous capture out of many discrete ones.
        """
        got = self.run_stitch(4, 80, 100_000_000, same=True)
        self.assertEqual(got["out"], 4)

    def test_a_close_pair_is_still_examined(self):
        """The short-circuit must not swallow reads that genuinely could overlap."""
        got = self.run_stitch(4, 80, 20, same=True)   # 80 ms at 20 Sa/s = 1.6 samples apart
        self.assertEqual(got["out"], 1, "overlapping reads were skipped as disjoint")


@unittest.skipUnless(HAVE_ENGINE, NO_ENGINE)
class TestInterpolatedSampleRate(unittest.TestCase):
    """Interpolation scales intervals, not sample counts.

    n samples span n-1 intervals, so an interpolated frame holds (n-1)*interp + 1 - the app's
    own appParam_intendedSamplesInterpolated. Multiplying the count added a whole sample per
    step: a real 10 ns/div capture at 2x reported 208,333,333 Sa/s where 200,000,000 was
    right, stretching its timeline by 4.17%.
    """

    def rate_for(self, interp, intended=13, tpd=1e-8, base=100_000_000):
        src = recording_source() + (
            "\nappParam_intendedSamples = %d;\n"
            "appParam_interpScale = %d;\n"
            "appParam_Interpolation = %s;\n"
            "appParam_currTPD = %r;\n"
            "appParam_sampleRate = %d;\n"
            "recCaptureMode = 'displayed';\n"
            "var s = recSnapshotSettings(100);\n"
            "__emit(JSON.stringify({full: s.full, sr: s.sr,\n"
            "  rate: recFrameSampleRate(s, 100), interp: s.interpScale}));\n"
            % (intended, interp, json.dumps("OFF" if interp == 1 else "ON"), tpd, base)
        )
        return run_js_json(src)

    def test_no_interpolation_is_unchanged(self):
        got = self.rate_for(1)
        self.assertEqual(got["full"], 13)
        self.assertAlmostEqual(got["rate"], 100_000_000, delta=1)

    def test_2x_interpolation_doubles_the_rate_exactly(self):
        got = self.rate_for(2)
        self.assertEqual(got["full"], 25, "should be (13-1)*2+1, not 13*2")
        self.assertAlmostEqual(got["rate"], 200_000_000, delta=1)

    def test_4x_interpolation_quadruples_the_rate_exactly(self):
        got = self.rate_for(4)
        self.assertEqual(got["full"], 49, "should be (13-1)*4+1, not 13*4")
        self.assertAlmostEqual(got["rate"], 400_000_000, delta=1)

    def test_the_frame_rate_and_the_derived_rate_agree(self):
        """s.sr and recFrameSampleRate() must not disagree: one drives the sidecar, the
        other the .sr header, and a mismatch is invisible until someone measures."""
        for interp in (1, 2, 4):
            got = self.rate_for(interp)
            self.assertAlmostEqual(got["sr"], got["rate"], delta=1,
                                   msg="sr and recFrameSampleRate disagree at %dx" % interp)
