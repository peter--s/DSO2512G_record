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
import unittest

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
