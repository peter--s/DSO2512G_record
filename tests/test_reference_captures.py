#!/usr/bin/env python3
"""Pins the volts conversion against real captures.

The fixtures are pre-fix recordings, so their samples are still raw normalised
screen positions. That is exactly what makes them useful: the conversion is applied
here offline and must reproduce the numbers the instrument put on its own screen.
This pins the formula independently of the browser, with no scope attached.

    volts = (raw - vertical_position) * 8 * volts_per_div

Both fixtures show the same ~312 V rectified DC bus on CH1, but at *different*
V/div (50 V and 100 V). Only a conversion that actually applies V/div reproduces
both, which no single fixture could establish.

Settings below were read off the matching front-panel screenshots. Vertical
positions come from the on-screen ground-marker pixel positions (grid centre at
y=636, 117 px/division, 8 divisions = 936 px over the full scale).
"""
import math
import os
import re
import shutil
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # sibling imports under -m and discover

from srlib import SrFile

FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


def to_volts(samples, volts_per_div, vpos_norm):
    """The conversion under test. Mirrors recToVolts() in patch/functions.js."""
    k = 8.0 * volts_per_div
    return [(s - vpos_norm) * k for s in samples]


def finite(values):
    return [v for v in values if not math.isnan(v)]


def mean(values):
    return sum(values) / len(values)


class Capture(object):
    """A fixture plus the front-panel settings and readouts that go with it."""

    def __init__(self, name, screenshot, ch1, ch2, readouts):
        self.name, self.screenshot = name, screenshot
        self.ch1, self.ch2, self.readouts = ch1, ch2, readouts

    def volts(self, channel):
        sr = SrFile(os.path.join(FIX, self.name))
        cfg = self.ch1 if channel == "CH1" else self.ch2
        return to_volts(sr.samples(channel), cfg["vpd"], cfg["vpos"])

    def lsb(self, channel):
        """One ADC code, in volts: 25 codes per division."""
        return (self.ch1 if channel == "CH1" else self.ch2)["vpd"] / 25.0


# S1.png / S2.png: STOP, 10.0ms/div, 20.00kSa/s, CH1 50.0V 10x DC, CH2 100V 10x DC,
# trigger CH2 falling at -8.00V.
S1 = Capture(
    "DSO2512G_recording_20260801T003153.sr", "S1.png",
    ch1={"vpd": 50.0, "vpos": -0.410},    # ground marker 3.28 div below centre
    ch2={"vpd": 100.0, "vpos": 0.01015},  # ground marker ~0.08 div above centre
    readouts={"ch1_mean": 312.10, "ch2_pkpk": 320.00, "ch2_amp": 315.20,
              "trigger_level": -8.00},
)

# autoset.png: AUTO, 5.00ms/div, 40.00kSa/s, CH1 100V 10x DC, CH2 50.0V 10x DC.
# Note the V/div values are swapped relative to S1.
AUTOSET = Capture(
    "DSO2512G_recording_20260801T021336.sr", "autoset.png",
    ch1={"vpd": 100.0, "vpos": 0.0005},   # ground marker on the centre line
    ch2={"vpd": 50.0, "vpos": -0.1293},   # ground marker 1.03 div below centre
    readouts={"ch1_mean": 311.99},
)


class TestVoltsConversion(unittest.TestCase):
    """Each assertion is a quantity that is stable across frames.

    The screenshots are single frames while the recordings span 21 and 41 frames of
    a duty-cycled signal, so per-frame quantities on a varying waveform are not
    usable as ground truth. A rectified DC bus level and a hard-limited square's
    peak-to-peak are; those are what is asserted.
    """

    def test_ch1_dc_bus_at_50v_per_div(self):
        """S1: CH1 sits on the ~312 V rectified bus."""
        got = mean(finite(S1.volts("CH1")))
        self.assertAlmostEqual(got, S1.readouts["ch1_mean"], delta=S1.lsb("CH1"),
                               msg="CH1 mean %.2f V != %.2f V" % (got, S1.readouts["ch1_mean"]))

    def test_ch1_dc_bus_at_100v_per_div(self):
        """autoset: the same bus at twice the V/div must still read ~312 V.

        Paired with the test above, this is what proves the V/div term is applied:
        the two fixtures differ by a factor of two in scale and agree in volts.
        """
        got = mean(finite(AUTOSET.volts("CH1")))
        self.assertAlmostEqual(got, AUTOSET.readouts["ch1_mean"], delta=AUTOSET.lsb("CH1"),
                               msg="CH1 mean %.2f V != %.2f V" % (got, AUTOSET.readouts["ch1_mean"]))

    def test_ch2_peak_to_peak(self):
        """S1: CH2 is a hard-limited square, so its pk-pk is stable across frames."""
        v = finite(S1.volts("CH2"))
        got = max(v) - min(v)
        self.assertAlmostEqual(got, S1.readouts["ch2_pkpk"], delta=S1.lsb("CH2"),
                               msg="CH2 pk-pk %.2f V != %.2f V" % (got, S1.readouts["ch2_pkpk"]))

    def test_ch2_low_level_sits_at_ground(self):
        """S1: CH2's low plateau is the ground reference, near the -8.00 V trigger level.

        This is the assertion that fails if the vertical-position term is dropped:
        without it the whole channel floats by its ground-marker offset.
        """
        low = min(finite(S1.volts("CH2")))
        self.assertAlmostEqual(low, S1.readouts["trigger_level"], delta=S1.lsb("CH2"),
                               msg="CH2 low level %.2f V is not at ground" % low)

    def test_dropping_the_offset_term_is_caught(self):
        """Guards the specific regression this PR exists to fix.

        Scaling by V/div but forgetting the ground reference is the plausible
        half-fix, and on S1 it puts CH1 at 148 V instead of 312 V. Assert that the
        broken form is wrong by a wide margin, so a future refactor that quietly
        drops the term cannot pass.
        """
        sr = SrFile(os.path.join(FIX, S1.name))
        no_offset = mean([s * 8 * S1.ch1["vpd"] for s in sr.samples("CH1")])
        self.assertGreater(abs(no_offset - S1.readouts["ch1_mean"]), 150.0,
                           "offset-free conversion should be grossly wrong, got %.2f V" % no_offset)


# The first capture produced by the fixed exporter, and the acceptance measurement itself.
#
# The scope's built-in generator (sinc, 100.00 Hz, fixed 2.5 Vpp — it has no offset control
# and no DC output) was fed to *both* inputs, with the channels deliberately set four scales
# apart and to different vertical positions. One signal, two very different front-panel
# configurations: a correct export has to produce the same volts from both.
#
# Front panel, from the matching screenshot (2026-08-31 23:31):
#   AUTO, 5.00 ms/div, 40.00 kSa/s, trigger CH1 rising at 1.20 V
#   CH1  500 mV/div  10x  DC   ground marker 2.26 div below centre
#   CH2  2.00 V/div  10x  DC   ground marker on the centre line
#   CH1 Freq:100.00Hz PKPK:2.48V Mean:599.28mV
#   CH2 Freq:100.00Hz PKPK:2.56V Mean:513.07mV
SINC = "DSO2512G_recording_20260831T230631.sr"

SINC_FREQ_HZ = 100.0      # the generator's setting, confirmed by both channels' readouts
AWG_VPP = 2.5             # fixed by the instrument; the manual gives no way to change it


def lsb(volts_per_div):
    """One ADC code in volts: the screen is 8 divisions of 25 codes each."""
    return volts_per_div / 25.0


class TestAcceptanceCapture(unittest.TestCase):
    """One signal through two differently-configured channels.

    This is the check no offline test can make: that the app reads the *right* settings
    off the instrument. The arithmetic could be perfect and still produce nonsense if
    appParam_currVPD_CH1 were not really CH1's V/div.
    """

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, SINC))
        self.sc = self.sr.sidecar()
        self.ch1 = finite(self.sr.samples("CH1"))
        self.ch2 = finite(self.sr.samples("CH2"))

    def test_front_panel_settings_were_captured(self):
        """The sidecar must agree with what the front panel actually showed."""
        f = self.sc["frames"][0]
        self.assertEqual(f["ch1"]["vpd"], 0.5)
        self.assertEqual(f["ch2"]["vpd"], 2.0)
        # Ground markers measured off the screenshot: -2.26 div and -0.01 div.
        self.assertAlmostEqual(f["ch1"]["vpos"] * 8, -2.26, delta=0.1)
        self.assertAlmostEqual(f["ch2"]["vpos"] * 8, 0.0, delta=0.1)
        self.assertEqual((f["ch1"]["probe"], f["ch2"]["probe"]), ("10x", "10x"))
        self.assertEqual(f["trigger"]["source"], "CH1")
        self.assertEqual(f["trigger"]["edge"], "rising")
        self.assertAlmostEqual(f["trigger"]["level_v"], 1.20, delta=lsb(0.5))

    def test_both_channels_report_the_same_signal(self):
        """Four times apart in V/div, 2.26 divisions apart on screen, same volts out.

        The tolerance is the combined quantisation of the two channels, not a fudge
        factor: CH2 at 2 V/div resolves the signal in 80 mV steps, so agreement closer
        than that is not physically available.
        """
        pairs = [(a, b) for a, b in zip(self.sr.samples("CH1"), self.sr.samples("CH2"))
                 if not (math.isnan(a) or math.isnan(b))]
        self.assertTrue(pairs)
        floor = math.sqrt(lsb(0.5) ** 2 + lsb(2.0) ** 2)
        rms = math.sqrt(sum((a - b) ** 2 for a, b in pairs) / len(pairs))
        self.assertLess(rms, 1.5 * floor,
                        "channels disagree by %.3f V rms, quantisation floor is %.3f V"
                        % (rms, floor))

    def test_amplitude_matches_the_generator(self):
        """Absolute check against the instrument's fixed 2.5 Vpp output.

        Relative agreement between channels would survive a wrong global scale factor;
        this would not.
        """
        ptp = max(self.ch1) - min(self.ch1)
        self.assertAlmostEqual(ptp, AWG_VPP, delta=lsb(0.5),
                               msg="CH1 pk-pk %.3f V != %.1f V from the generator" % (ptp, AWG_VPP))

    def test_matches_the_scopes_own_readouts(self):
        for name, samples, vpd, expected in (("CH1", self.ch1, 0.5, 0.59928),
                                             ("CH2", self.ch2, 2.0, 0.51307)):
            got = mean(samples)
            self.assertAlmostEqual(got, expected, delta=lsb(vpd),
                                   msg="%s mean %.4f V != %.4f V" % (name, got, expected))

    def test_frame_spacing_is_a_whole_number_of_signal_periods(self):
        """Independent confirmation that the wall-clock timeline is real.

        The generator free-runs and every frame triggers at the same point on the
        waveform, so however far apart two frames truly are, it must be a whole number
        of signal periods. Frame placement here comes from arrival timestamps, which
        know nothing about the signal — so if the two agree, the placement is sound.
        """
        period = self.sc["samplerate"] / SINC_FREQ_HZ    # samples per period
        starts = [f["start_sample"] for f in self.sc["frames"]]
        worst_ms = 0.0
        for a, b in zip(starts, starts[1:]):
            delta = b - a
            residual = delta - round(delta / period) * period
            worst_ms = max(worst_ms, abs(residual) / self.sc["samplerate"] * 1000)
        # A quarter period of slack: beyond that the nearest-period rounding is ambiguous.
        self.assertLess(worst_ms, 1000 / SINC_FREQ_HZ / 4,
                        "frame spacing is %.2f ms away from a whole number of periods" % worst_ms)

    def test_gaps_are_real_dead_time_not_padding(self):
        """Most of this file is dead time, which is the point: 8 frames of 60 ms
        acquisition spread across 1.56 s of wall clock."""
        acquired = sum(f["length"] for f in self.sc["frames"])
        self.assertLess(acquired, self.sc["sample_count"] / 2)
        self.assertEqual(self.sc["timeline"]["mode"], "realtime")
        self.assertEqual(self.sc["timeline"]["clamped_frames"], 0)


# The second acceptance capture, in a completely different regime: 200 ns/div at
# 100 MSa/s instead of 5 ms/div at 40 kSa/s. Square wave near the generator's 2 MHz
# ceiling, so the acquisition is 2.4 us long while frames still arrive every 100 ms -
# 99.998% dead time, which is what makes the size guard fire.
#
# Front panel, from the matching screenshot (2026-09-01 00:28):
#   AUTO, 200 ns/div, 100.00 MSa/s, trigger CH1 rising at 1.38 V, "97 ms" frame interval
#   CH1  500 mV/div  10x  DC   ground marker 2.58 div below centre
#   CH2  1.00 V/div  10x  DC   ground marker 1.13 div below centre
#   CH1 Freq:1.99MHz Duty:72.9% PKPK:2.44V Mean:1.75V
#   CH2 Freq:1.99MHz Duty:73.3% PKPK:2.48V Mean:1.69V
SQUARE = "DSO2512G_recording_20260901T002729.sr"


class TestFastTimebaseCapture(unittest.TestCase):
    """Square wave at 1.99 MHz, both channels off-centre, two scales apart.

    A square is the clearest test of the ground reference: the generator's output is
    unipolar, so the low level is a known 0 V that must land on zero regardless of where
    the channel sits on screen. It has no offset control and no DC output, so this is the
    only absolute voltage reference the instrument can produce.
    """

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, SQUARE))
        self.sc = self.sr.sidecar()

    def test_front_panel_settings_were_captured(self):
        f = self.sc["frames"][0]
        self.assertEqual((f["ch1"]["vpd"], f["ch2"]["vpd"]), (0.5, 1.0))
        # Ground markers measured off the screenshot: -2.58 div and -1.13 div.
        self.assertAlmostEqual(f["ch1"]["vpos"] * 8, -2.58, delta=0.1)
        self.assertAlmostEqual(f["ch2"]["vpos"] * 8, -1.13, delta=0.1)
        self.assertAlmostEqual(f["trigger"]["level_v"], 1.38, delta=lsb(0.5))
        self.assertEqual(self.sr.samplerate, 100000000)

    def test_unipolar_baseline_lands_on_zero(self):
        """The square's low level is the generator's 0 V, on a channel positioned
        2.58 divisions below centre. Without the vertical-position term it would sit
        at -2.58 x 8 x 0.5 = -10.3 V instead."""
        low = min(finite(self.sr.samples("CH1")))
        self.assertAlmostEqual(low, 0.0, delta=lsb(0.5),
                               msg="CH1 low level is %.3f V, not ground" % low)

    def test_amplitude_matches_the_generator(self):
        ch1 = finite(self.sr.samples("CH1"))
        ptp = max(ch1) - min(ch1)
        self.assertAlmostEqual(ptp, AWG_VPP, delta=2 * lsb(0.5),
                               msg="CH1 pk-pk %.3f V != %.1f V" % (ptp, AWG_VPP))

    def test_matches_the_scopes_own_readouts(self):
        for name, vpd, expected in (("CH1", 0.5, 1.75), ("CH2", 1.0, 1.69)):
            got = mean(finite(self.sr.samples(name)))
            self.assertAlmostEqual(got, expected, delta=2 * lsb(vpd),
                                   msg="%s mean %.3f V != %.2f V" % (name, got, expected))

    def test_size_guard_engaged(self):
        """16 frames spanning 1.5 s at 100 MSa/s would be 150M samples per channel.

        That is ~1.2 GB materialised in the browser and again in PulseView, for 4800
        samples of actual signal. Dropping the gaps is the only way this file opens.
        """
        self.assertEqual(self.sc["timeline"]["mode"], "concatenated")
        self.assertTrue(self.sc["warnings"], "concatenating must be reported, not silent")
        span_s = (self.sc["frames"][-1]["t_ms"] - self.sc["frames"][0]["t_ms"]) / 1000.0
        would_need = span_s * self.sc["samplerate"]
        self.assertGreater(would_need, self.sc["timeline"]["max_samples"])
        self.assertEqual(self.sc["sample_count"],
                         sum(f["length"] for f in self.sc["frames"]),
                         "concatenated mode must leave no gaps at all")

    def test_no_nan_when_gaps_are_dropped(self):
        """Concatenated mode has no dead time to mark, so nothing should be NaN."""
        for name, _ in self.sr.analog_channels:
            self.assertFalse([v for v in self.sr.samples(name) if math.isnan(v)],
                             "%s has NaN despite concatenated mode" % name)

    def test_megasample_rate_survives_the_metadata_round_trip(self):
        self.assertEqual(self.sc["samplerate_string"], "100 MHz")
        self.assertEqual(self.sc["samplerate"], self.sr.samplerate)


# One recording carried through six time/div settings, exported as six files.
# The rates go 40k -> 20k -> 10k -> 20k -> 40k -> 100k, so two of them are revisited:
# proof on hardware that runs are consecutive rather than grouped by rate.
SPLIT = ["DSO2512G_recording_20260901T004410_seg%d.sr" % n for n in range(1, 7)]

# A recording made entirely in demo mode, with the scope connected but not driving the
# capture. Before the demo-mode fix the recorder snapshotted the hardware buffer instead
# of the generated waveform, so this file could not have contained a signal at all.
DEMO = "DSO2512G_recording_20260901T004940.sr"


class TestSegmentSplit(unittest.TestCase):
    """A .sr carries one samplerate, so a rate change has to become separate files."""

    def setUp(self):
        self.segs = [SrFile(os.path.join(FIX, n)) for n in SPLIT]
        self.scs = [s.sidecar() for s in self.segs]

    def test_segments_are_numbered_and_complete(self):
        self.assertEqual([sc["segment"]["index"] for sc in self.scs], [1, 2, 3, 4, 5, 6])
        self.assertTrue(all(sc["segment"]["count"] == 6 for sc in self.scs))

    def test_each_segment_carries_one_rate_matching_its_timebase(self):
        """samplerate = (frame length - 1) / 12 divisions / seconds-per-division.

        If a segment held two rates, one of them would be misdescribed - which is the
        whole reason for splitting.
        """
        for sr, sc in zip(self.segs, self.scs):
            tpds = {f["tpd"] for f in sc["frames"]}
            lengths = {f["length"] for f in sc["frames"]}
            self.assertEqual(len(tpds), 1, "segment holds more than one timebase")
            self.assertEqual(len(lengths), 1)
            expected = (lengths.pop() - 1) / 12 / tpds.pop()
            self.assertAlmostEqual(sc["samplerate_exact"], expected, delta=1)
            self.assertEqual(sr.samplerate, sc["samplerate"])

    def test_a_revisited_rate_starts_a_new_segment(self):
        """40k, 20k and 40k again must be three files, not two.

        Grouping by rate would merge frames that are far apart on the timeline and
        recreate exactly the problem splitting exists to avoid.
        """
        rates = [sc["samplerate"] for sc in self.scs]
        self.assertEqual(rates, [40000, 20000, 10000, 20000, 40000, 100000])
        self.assertGreater(len(rates), len(set(rates)), "expected a revisited rate here")
        for a, b in zip(rates, rates[1:]):
            self.assertNotEqual(a, b, "adjacent segments must differ in rate")

    def test_every_segment_says_it_is_one_of_several(self):
        """A split file must carry the reason it exists, so it is not mistaken for a
        complete recording. The exact wording is pinned in test_js_functions.py; these
        fixtures predate the current phrasing, so only the substance is checked here."""
        for sc in self.scs:
            self.assertTrue(sc["warnings"], "a split segment must record why it was split")
            self.assertTrue(any("segment" in w.lower() for w in sc["warnings"]))

    def test_volts_are_unaffected_by_the_rate_changes(self):
        """The signal never changed, only how fast it was sampled."""
        for sr, sc in zip(self.segs, self.scs):
            ch1 = finite(sr.samples("CH1"))
            ptp = max(ch1) - min(ch1)
            self.assertAlmostEqual(ptp, AWG_VPP, delta=2 * lsb(0.5),
                                   msg="segment %d pk-pk %.3f V" % (sc["segment"]["index"], ptp))


class TestDemoModeCapture(unittest.TestCase):
    """Recorded with demo mode on, which the recorder used to miss entirely."""

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, DEMO))
        self.sc = self.sr.sidecar()

    def test_frames_are_marked_as_generated(self):
        self.assertTrue(all(f["demo"] for f in self.sc["frames"]))

    def test_generated_waveform_actually_reached_the_file(self):
        """The regression this guards: the snapshot used to be taken before the
        demo-mode override, so these frames held the stale hardware buffer instead."""
        ch1 = finite(self.sr.samples("CH1"))
        self.assertTrue(ch1)
        self.assertGreater(max(ch1) - min(ch1), 1.0,
                           "demo waveform is flat - the override was not captured")


# A ten-second recording — 46 frames, 45 intervals — used to pin the timeline's absolute
# scale rather than just its local spacing. Same 100 Hz signal and 5 ms/div as capture 1a.
LONG = "DSO2512G_recording_20260901T004715.sr"

# The per-frame settings test. One recording in which CH2's vertical position was moved
# twice and its V/div then halved, while CH1 was left alone as a control. Same 100 Hz
# signal throughout, so every exported number should stay put across all four blocks.
CHANGES = "DSO2512G_recording_20260901T004159.sr"


class TestTimelineScale(unittest.TestCase):
    """Does an exported second equal a real second?

    The periodicity argument again, but over ten seconds instead of one and a half: the
    generator free-runs while every frame triggers at the same point on the waveform, so
    every frame-to-frame spacing must be a whole number of signal periods. Frame placement
    comes from arrival timestamps, which know nothing about the signal, so agreement across
    45 consecutive intervals bounds any cumulative scale error.

    This is what a stopwatch check was meant to establish, and does it about a hundred
    times more tightly — a hand-timed ten seconds is good to a couple of percent.
    """

    PERIOD_MS = 10.0    # 100 Hz, confirmed by autocorrelating the first frame

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, LONG))
        self.sc = self.sr.sidecar()
        self.period = self.sc["samplerate"] * self.PERIOD_MS / 1000.0   # samples

    def _residuals_ms(self):
        starts = [f["start_sample"] for f in self.sc["frames"]]
        out = []
        for a, b in zip(starts, starts[1:]):
            delta = b - a
            resid = delta - round(delta / self.period) * self.period
            out.append(abs(resid) / self.sc["samplerate"] * 1000)
        return out

    def test_recording_really_is_about_ten_seconds(self):
        seconds = self.sc["sample_count"] / self.sc["samplerate"]
        self.assertAlmostEqual(seconds, 9.76, delta=0.05)
        self.assertEqual(self.sc["timeline"]["mode"], "realtime")
        self.assertEqual(self.sc["timeline"]["clamped_frames"], 0)

    def test_every_interval_is_a_whole_number_of_periods(self):
        resid = self._residuals_ms()
        self.assertGreaterEqual(len(resid), 40, "need a long run for this to mean anything")
        ambiguous = [r for r in resid if r >= self.PERIOD_MS / 4]
        self.assertEqual(ambiguous, [],
                         "%d of %d intervals are not near a whole number of periods"
                         % (len(ambiguous), len(resid)))

    def test_no_scale_error_accumulates(self):
        span_s = (self.sc["frames"][-1]["t_ms"] - self.sc["frames"][0]["t_ms"]) / 1000.0
        ppm = max(self._residuals_ms()) / 1000.0 / span_s * 1e6
        self.assertLess(ppm, 1000, "timeline scale error %.0f ppm over %.1f s" % (ppm, span_s))

    def test_most_of_the_recording_is_dead_time(self):
        """28% acquisition, 72% gap — the honest picture the old export hid."""
        acquired = sum(f["length"] for f in self.sc["frames"])
        self.assertLess(acquired / self.sc["sample_count"], 0.5)


class TestMidRecordingSettingChanges(unittest.TestCase):
    """CH2's V/div and vertical position changed while recording; CH1 did not.

    Freezing the settings at RECORD start was half of defect D, and it is invisible in
    any capture where nothing is touched. Here the signal is constant while the front
    panel moves underneath it, so the exported volts must not move — and CH1, left alone,
    proves the signal itself was stable rather than conveniently compensating.
    """

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, CHANGES))
        self.sc = self.sr.sidecar()
        self.blocks = []
        for f in self.sc["frames"]:
            key = (f["ch2"]["vpd"], round(f["ch2"]["vpos"] * 8, 2))
            if not self.blocks or self.blocks[-1][0] != key:
                self.blocks.append((key, []))
            self.blocks[-1][1].append(f)

    def _span(self, channel, frames):
        samples = self.sr.samples(channel)
        v = []
        for f in frames:
            v += finite(samples[f["start_sample"]:f["start_sample"] + f["length"]])
        return max(v) - min(v), mean(v)

    def test_the_capture_actually_contains_changes(self):
        """Guards the test itself: without real changes everything below passes vacuously."""
        vpds = {k[0] for k, _ in self.blocks}
        vposs = {k[1] for k, _ in self.blocks}
        self.assertEqual(vpds, {1.0, 2.0}, "expected a V/div change on CH2")
        self.assertGreaterEqual(len(vposs), 3, "expected the position to move twice")
        self.assertGreaterEqual(max(vposs) - min(vposs), 0.5, "position moves too small to see")

    def test_volts_survive_a_vertical_position_move(self):
        """The position moved 0.68 div at 2 V/div. If the ground reference were not
        subtracted per frame, the exported level would jump by 0.68 x 2 = 1.36 V."""
        at_same_vpd = [(k, fr) for k, fr in self.blocks if k[0] == 2.0]
        means = [self._span("CH2", fr)[1] for _, fr in at_same_vpd]
        observed = max(means) - min(means)
        self.assertLess(observed, 0.5 * lsb(2.0),
                        "CH2 level moved %.3f V with the position knob" % observed)
        self.assertLess(observed, 1.36 / 10, "nowhere near the 1.36 V a dropped term would give")

    def test_volts_survive_a_volts_per_div_change(self):
        """2 V/div to 1 V/div. Reading V/div once at RECORD start would leave every
        later frame a factor of two out."""
        last_two = self.blocks[-2:]
        (vpd_a, _), frames_a = last_two[0]
        (vpd_b, _), frames_b = last_two[1]
        self.assertEqual((vpd_a, vpd_b), (2.0, 1.0), "expected the V/div step here")
        mean_a, mean_b = self._span("CH2", frames_a)[1], self._span("CH2", frames_b)[1]
        self.assertAlmostEqual(mean_b, mean_a, delta=lsb(2.0),
                               msg="CH2 mean moved %.3f V across the V/div change"
                                   % abs(mean_b - mean_a))
        self.assertGreater(abs(mean_b - mean_a * 2), 0.5,
                           "result is suspiciously close to the doubled, unfixed value")

    def test_peak_to_peak_is_stable_across_every_block(self):
        ptps = [self._span("CH2", fr)[0] for _, fr in self.blocks]
        self.assertLess(max(ptps) - min(ptps), 3 * lsb(2.0),
                        "CH2 pk-pk spread %.3f V across settings blocks" % (max(ptps) - min(ptps)))

    def test_the_untouched_channel_is_the_control(self):
        """CH1 was left alone, so it shows the signal itself did not drift."""
        ptps = [self._span("CH1", fr)[0] for _, fr in self.blocks]
        means = [self._span("CH1", fr)[1] for _, fr in self.blocks]
        self.assertLess(max(ptps) - min(ptps), lsb(0.5))
        self.assertLess(max(means) - min(means), lsb(0.5))


# A ten-second recording — 46 frames, 45 intervals — used to pin the timeline's absolute
# scale rather than just its local spacing. Same 100 Hz signal and 5 ms/div as capture 1a.
LONG = "DSO2512G_recording_20260901T004715.sr"

# The per-frame settings test. CH2's vertical position was moved twice and its V/div then
# halved, while CH1 was left alone as a control. Same signal throughout, 5 ms/div fixed.
CHANGES = "DSO2512G_recording_20260901T004159.sr"

# 200 ms/div, where the scope stops waiting for a full acquisition and rolls. Each frame
# still shows 2.4 s of history but they arrive every ~208 ms, so they overlap and cannot
# be placed apart. The one regime where the timeline genuinely cannot be reconstructed.
ROLLING = "DSO2512G_recording_20260901T011033.sr"


class TestTimelineScale(unittest.TestCase):
    """Does an exported second equal a real second?

    The periodicity argument again, but over ten seconds instead of one and a half: the
    generator free-runs while every frame triggers at the same point on the waveform, so
    every frame-to-frame spacing must be a whole number of signal periods. Frame placement
    comes from arrival timestamps, which know nothing about the signal, so agreement across
    45 consecutive intervals bounds any cumulative scale error.

    This is what a stopwatch check was meant to establish, and does it about a hundred
    times more tightly — a hand-timed ten seconds is good to a couple of percent.
    """

    PERIOD_MS = 10.0    # 100 Hz, confirmed by autocorrelating the first frame

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, LONG))
        self.sc = self.sr.sidecar()
        self.period = self.sc["samplerate"] * self.PERIOD_MS / 1000.0   # samples

    def _residuals_ms(self):
        starts = [f["start_sample"] for f in self.sc["frames"]]
        out = []
        for a, b in zip(starts, starts[1:]):
            delta = b - a
            resid = delta - round(delta / self.period) * self.period
            out.append(abs(resid) / self.sc["samplerate"] * 1000)
        return out

    def test_recording_really_is_about_ten_seconds(self):
        seconds = self.sc["sample_count"] / self.sc["samplerate"]
        self.assertAlmostEqual(seconds, 9.76, delta=0.05)
        self.assertEqual(self.sc["timeline"]["mode"], "realtime")
        self.assertEqual(self.sc["timeline"]["clamped_frames"], 0)

    def test_every_interval_is_a_whole_number_of_periods(self):
        resid = self._residuals_ms()
        self.assertGreaterEqual(len(resid), 40, "need a long run for this to mean anything")
        ambiguous = [r for r in resid if r >= self.PERIOD_MS / 4]
        self.assertEqual(ambiguous, [],
                         "%d of %d intervals are not near a whole number of periods"
                         % (len(ambiguous), len(resid)))

    def test_no_scale_error_accumulates(self):
        span_s = (self.sc["frames"][-1]["t_ms"] - self.sc["frames"][0]["t_ms"]) / 1000.0
        ppm = max(self._residuals_ms()) / 1000.0 / span_s * 1e6
        self.assertLess(ppm, 1000, "timeline scale error %.0f ppm over %.1f s" % (ppm, span_s))

    def test_most_of_the_recording_is_dead_time(self):
        """28% acquisition, 72% gap — the honest picture the old export hid."""
        acquired = sum(f["length"] for f in self.sc["frames"])
        self.assertLess(acquired / self.sc["sample_count"], 0.5)


class TestMidRecordingSettingChanges(unittest.TestCase):
    """CH2's V/div and vertical position changed while recording; CH1 did not.

    Freezing the settings at RECORD start was half of defect D, and it is invisible in any
    capture where nothing is touched. Here the signal is constant while the front panel
    moves underneath it, so the exported volts must not move — and CH1, left alone, proves
    the signal itself was stable rather than conveniently compensating.
    """

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, CHANGES))
        self.sc = self.sr.sidecar()
        self.blocks = []
        for f in self.sc["frames"]:
            key = (f["ch2"]["vpd"], round(f["ch2"]["vpos"] * 8, 2))
            if not self.blocks or self.blocks[-1][0] != key:
                self.blocks.append((key, []))
            self.blocks[-1][1].append(f)

    def _span(self, channel, frames):
        samples = self.sr.samples(channel)
        v = []
        for f in frames:
            v += finite(samples[f["start_sample"]:f["start_sample"] + f["length"]])
        return max(v) - min(v), mean(v)

    def test_the_capture_actually_contains_changes(self):
        """Guards the test itself: without real changes everything below passes vacuously."""
        vpds = {k[0] for k, _ in self.blocks}
        vposs = {k[1] for k, _ in self.blocks}
        self.assertEqual(vpds, {1.0, 2.0}, "expected a V/div change on CH2")
        self.assertGreaterEqual(len(vposs), 3, "expected the position to move twice")
        self.assertGreaterEqual(max(vposs) - min(vposs), 0.5, "position moves too small to see")

    def test_volts_survive_a_vertical_position_move(self):
        """The position moved 0.68 div at 2 V/div. If the ground reference were not
        subtracted per frame, the exported level would jump by 0.68 x 2 = 1.36 V."""
        at_same_vpd = [(k, fr) for k, fr in self.blocks if k[0] == 2.0]
        means = [self._span("CH2", fr)[1] for _, fr in at_same_vpd]
        observed = max(means) - min(means)
        self.assertLess(observed, 0.5 * lsb(2.0),
                        "CH2 level moved %.3f V with the position knob" % observed)
        self.assertLess(observed, 1.36 / 10, "nowhere near the 1.36 V a dropped term would give")

    def test_volts_survive_a_volts_per_div_change(self):
        """2 V/div to 1 V/div. Reading V/div once at RECORD start would leave every later
        frame a factor of two out."""
        (vpd_a, _), frames_a = self.blocks[-2]
        (vpd_b, _), frames_b = self.blocks[-1]
        self.assertEqual((vpd_a, vpd_b), (2.0, 1.0), "expected the V/div step here")
        mean_a, mean_b = self._span("CH2", frames_a)[1], self._span("CH2", frames_b)[1]
        self.assertAlmostEqual(mean_b, mean_a, delta=lsb(2.0),
                               msg="CH2 mean moved %.3f V across the V/div change"
                                   % abs(mean_b - mean_a))
        self.assertGreater(abs(mean_b - mean_a * 2), 0.5,
                           "result is suspiciously close to the doubled, unfixed value")

    def test_peak_to_peak_is_stable_across_every_block(self):
        ptps = [self._span("CH2", fr)[0] for _, fr in self.blocks]
        self.assertLess(max(ptps) - min(ptps), 3 * lsb(2.0),
                        "CH2 pk-pk spread %.3f V across settings blocks" % (max(ptps) - min(ptps)))

    def test_the_untouched_channel_is_the_control(self):
        """CH1 was left alone, so it shows the signal itself did not drift."""
        ptps = [self._span("CH1", fr)[0] for _, fr in self.blocks]
        means = [self._span("CH1", fr)[1] for _, fr in self.blocks]
        self.assertLess(max(ptps) - min(ptps), lsb(0.5))
        self.assertLess(max(means) - min(means), lsb(0.5))


class TestRollingAcquisition(unittest.TestCase):
    """200 ms/div, where the timeline genuinely cannot be reconstructed.

    Below 200 ms/div a frame arrives every 12 x time/div plus transfer overhead, so there
    is always dead time to show. Here the scope rolls: frames keep arriving every ~208 ms
    while each still displays 2.4 s of history, so consecutive frames overlap in signal
    content rather than being separate acquisitions.

    The export cannot represent that, and the point of these assertions is that it does not
    pretend to — it clamps, counts, and says so.
    """

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, ROLLING))
        self.sc = self.sr.sidecar()

    def test_this_is_the_rolling_regime(self):
        frames = self.sc["frames"]
        tpd = {f["tpd"] for f in frames}
        self.assertEqual(tpd, {0.2}, "expected 200 ms/div")
        span_ms = 12 * 0.2 * 1000
        intervals = [b["t_ms"] - a["t_ms"] for a, b in zip(frames, frames[1:])]
        self.assertLess(max(intervals), span_ms,
                        "frames must arrive faster than they span for this to be rolling")

    def test_overlap_is_counted_and_reported(self):
        self.assertGreater(self.sc["timeline"]["clamped_frames"], 0)
        self.assertEqual(self.sc["timeline"]["clamped_frames"], self.sc["frame_count"] - 1,
                         "at this timebase every interval should overlap")
        self.assertTrue(any("overlap" in w.lower() for w in self.sc["warnings"]),
                        "clamping must be reported, not silent")

    def test_clamped_frames_are_laid_back_to_back(self):
        """Clamping means no gaps at all, so the file is pure acquisition — which is also
        why it duplicates signal: those frames really did overlap in time."""
        self.assertEqual(sum(f["gap_before"] for f in self.sc["frames"]), 0)
        self.assertEqual(sum(f["length"] for f in self.sc["frames"]), self.sc["sample_count"])
        for name, _ in self.sr.analog_channels:
            self.assertFalse([v for v in self.sr.samples(name) if math.isnan(v)],
                             "%s should have no NaN when there are no gaps" % name)

    def test_volts_are_still_correct_in_this_regime(self):
        """The timeline is unreliable here; the voltages are not."""
        ch1 = finite(self.sr.samples("CH1"))
        self.assertAlmostEqual(max(ch1) - min(ch1), AWG_VPP, delta=2 * lsb(0.5))


# CH2 switched off part-way through, at a fixed 1 ms/div. In single-channel mode the app
# interleaves both ADCs into CH1, so the frame length and the samplerate both double - which
# splits the recording even though the time/div never moved.
CH2_ON = "DSO2512G_recording_20260901T012418_seg1.sr"    # CH2 on,  2401 samples, 200 kHz
CH2_OFF = "DSO2512G_recording_20260901T012418_seg2.sr"   # CH2 off, 4801 samples, 400 kHz

# A partial read in the rolling regime: 1626 of the 4801 samples a full frame would hold.
ROLL_PARTIAL = "DSO2512G_recording_20260901T012418_seg13.sr"


class TestSingleChannelExport(unittest.TestCase):
    """The CH1-only path, and what toggling CH2 does to the samplerate.

    Everything else recorded here has both channels on, so this is the only hardware
    evidence for the single-channel metadata layout - and for the claim in the README that
    the time/div is not the only thing that moves the samplerate.
    """

    def setUp(self):
        self.on = SrFile(os.path.join(FIX, CH2_ON))
        self.off = SrFile(os.path.join(FIX, CH2_OFF))

    def test_single_channel_layout(self):
        """One analog channel means CH1 is the only entry, and no CH2 files exist."""
        self.assertEqual(self.off.total_analog, 1)
        self.assertEqual(self.off.analog_channels, [("CH1", "analog-1-1")])
        self.assertEqual([n for n in self.off.names if n.startswith("analog-1-2")], [])
        self.assertIn("total analog=1", self.off.metadata_text)
        self.assertNotIn("CH2", self.off.metadata_text)

    def test_single_channel_file_still_has_samples(self):
        samples = finite(self.off.samples("CH1"))
        self.assertTrue(samples)
        self.assertAlmostEqual(max(samples) - min(samples), AWG_VPP, delta=2 * lsb(0.5))

    def test_disabling_ch2_doubles_the_frame_length(self):
        """Confirms by measurement what the source only implied.

        convertToWaveArray() interleaves CH1 and CH2 into one array when CH2 is off, so a
        single-channel frame holds twice the samples over the same 12 divisions. Both
        segments are at the same 1 ms/div, so the time/div cannot account for it.
        """
        on, off = self.on.sidecar(), self.off.sidecar()
        self.assertEqual({f["tpd"] for f in on["frames"]},
                         {f["tpd"] for f in off["frames"]},
                         "the two segments must share a time/div for this to mean anything")
        len_on = on["frames"][0]["length"]
        len_off = off["frames"][0]["length"]
        self.assertEqual(len_off, 2 * len_on - 1, "expected the interleaved double length")
        self.assertAlmostEqual(off["samplerate"], 2 * on["samplerate"], delta=1)

    def test_the_channel_change_split_the_recording(self):
        """A rate change forces separate files, and this one had nothing to do with the
        time/div - which is why the warning no longer blames it."""
        on, off = self.on.sidecar(), self.off.sidecar()
        self.assertEqual(on["segment"]["index"], 1)
        self.assertEqual(off["segment"]["index"], 2)
        self.assertEqual(on["segment"]["count"], off["segment"]["count"])
        self.assertNotEqual(on["samplerate"], off["samplerate"])


class TestRollingPartialFrame(unittest.TestCase):
    """In roll mode a frame can be read before the acquisition has filled.

    At 200 ms/div a screen spans 12 x 0.2 = 2.4 s, so a complete frame cannot exist until
    2.4 s have passed. Reading earlier returns whatever has accumulated, and the app derives
    the samplerate from the frame length - so a partial read reports a rate that describes
    how full the buffer was, not how fast it was sampled.

    Nothing here is wrong with the export; the point of pinning it is that the recorded
    samplerate is not trustworthy in this regime, and the file says enough to tell.
    """

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, ROLL_PARTIAL))
        self.sc = self.sr.sidecar()

    def test_it_is_a_partial_read_at_a_slow_timebase(self):
        f = self.sc["frames"][0]
        self.assertEqual(f["tpd"], 0.2)
        self.assertLess(f["length"], 4801 / 2, "expected a partially filled buffer")

    def test_reported_samplerate_reflects_the_fill_not_the_rate(self):
        """A full frame at 200 ms/div would be about 2 kHz; this reports far less."""
        self.assertLess(self.sc["samplerate"], 1000)
        self.assertGreater(self.sc["samplerate"], 0)

    def test_the_file_is_still_internally_consistent(self):
        """Whatever the rate means, the export must still describe itself correctly."""
        self.assertEqual(self.sc["sample_count"],
                         sum(f["length"] + f["gap_before"] for f in self.sc["frames"]))
        self.assertEqual(self.sc["samplerate"], self.sr.samplerate)
        for name, _ in self.sr.analog_channels:
            self.assertEqual(len(self.sr.samples(name)), self.sc["sample_count"])

    def test_voltages_are_unaffected(self):
        """The time axis is unreliable here; the volts are not."""
        samples = finite(self.sr.samples("CH1"))
        self.assertAlmostEqual(max(samples) - min(samples), AWG_VPP, delta=2 * lsb(0.5))


# Recorded before frames without usable samples were dropped, and kept for exactly that
# reason: it is the only capture holding one. All three signal sources in one recording,
# both channels, 10 ns/div - and at frame 79 a 26-sample WAV frame that is entirely NaN.
#
# It lives in fixtures/known-bad/ because it violates an invariant on purpose, so the
# structural sweep skips it and asserts against it here instead.
SOURCES = os.path.join("known-bad", "DSO2512G_recording_20260901T023815.sr")


class TestSignalSourceIndependence(unittest.TestCase):
    """One signal, three different acquisition paths, and they must agree.

    The three sources are not cosmetic variations. WAV negates the sample, averages two
    interleaved records, and applies no calibration offset; DataBuffer adds
    verticalOffsetCH1; DataBuffer2 differs again in how it fills the array. If recToVolts()
    depended on any of that, this capture would show it as three different amplitudes.
    """

    def setUp(self):
        self.sr = SrFile(os.path.join(FIX, SOURCES))
        self.sc = self.sr.sidecar()
        self.by_source = {}
        for fr in self.sc["frames"]:
            self.by_source.setdefault(fr["signal_source"], []).append(fr)

    def _stats(self, channel, frames):
        samples = self.sr.samples(channel)
        v = []
        for fr in frames:
            v += finite(samples[fr["start_sample"]:fr["start_sample"] + fr["length"]])
        return (max(v) - min(v), mean(v)) if v else (None, None)

    def test_all_three_sources_are_present(self):
        """Guards the test: without a source switch everything below passes vacuously."""
        self.assertEqual(sorted(self.by_source), ["DataBuffer", "DataBuffer2", "WAV"])

    def test_amplitude_agrees_across_sources(self):
        for channel, vpd in (("CH1", 0.5), ("CH2", 1.0)):
            ptps = [self._stats(channel, frs)[0] for frs in self.by_source.values()]
            ptps = [p for p in ptps if p is not None]
            self.assertEqual(len(ptps), 3)
            self.assertLess(max(ptps) - min(ptps), 2 * lsb(vpd),
                            "%s pk-pk spread %.3f V across signal sources"
                            % (channel, max(ptps) - min(ptps)))

    def test_switching_source_did_not_split_the_recording(self):
        """All three shared a samplerate here, so one file was correct."""
        self.assertEqual(self.sc["segment"], {"index": 1, "count": 1})

    def test_it_still_contains_the_corrupt_frame(self):
        """The reason this fixture is kept. A WAV buffer shorter than the fixed 600-character
        offset of the second sample gives parseInt("") -> NaN for every point.

        If this stops holding, the fixture has been replaced by a newer capture and the
        drop-empty-frames work has lost its real-world example.
        """
        samples = self.sr.samples("CH1")
        dead = [fr for fr in self.sc["frames"]
                if all(math.isnan(v) for v in
                       samples[fr["start_sample"]:fr["start_sample"] + fr["length"]])]
        self.assertEqual(len(dead), 1, "expected exactly one all-NaN frame")
        self.assertLess(dead[0]["length"], 300, "the corrupt frame is a short WAV read")
        self.assertEqual(dead[0]["signal_source"], "WAV")

    def test_the_corrupt_frame_is_what_the_fix_now_removes(self):
        """Every other frame has usable samples, so dropping the dead one loses nothing."""
        samples = self.sr.samples("CH1")
        alive = [fr for fr in self.sc["frames"]
                 if any(not math.isnan(v) for v in
                        samples[fr["start_sample"]:fr["start_sample"] + fr["length"]])]
        self.assertEqual(len(alive), self.sc["frame_count"] - 1)


class TestReaderHandlesBothLayouts(unittest.TestCase):
    def test_reads_frame_marker_layout(self):
        """The fixtures predate the purely-analog layout: logic channel, CH1 at analog-1-2."""
        sr = SrFile(os.path.join(FIX, S1.name))
        self.assertEqual(sr.capturefile, "logic-1")
        self.assertEqual([n for n, _ in sr.logic_channels], ["FRAME"])
        self.assertEqual(sr.analog_channels, [("CH1", "analog-1-2"), ("CH2", "analog-1-3")])
        self.assertEqual(sr.samplerate, 20000)

    def test_channels_are_length_aligned(self):
        """libsigrok streams channels sequentially, so only the totals have to match."""
        for cap in (S1, AUTOSET):
            sr = SrFile(os.path.join(FIX, cap.name))
            lengths = {n: len(sr.samples(n)) for n, _ in sr.analog_channels}
            self.assertEqual(len(set(lengths.values())), 1,
                             "%s: channel lengths differ: %s" % (cap.name, lengths))


if __name__ == "__main__":
    unittest.main()
