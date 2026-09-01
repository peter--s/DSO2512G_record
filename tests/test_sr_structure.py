#!/usr/bin/env python3
"""Structural invariants every exported .sr must satisfy.

Runs against the committed fixtures, and against any file you point it at - which
is how a manually produced export gets checked after a demo-mode or hardware run:

    DSO2512G_SR=~/Downloads/DSO2512G_recording_20260826T101500.sr \\
        /usr/bin/python3 -m unittest discover -s tests

Separate paths with os.pathsep. Every invariant here is one that libsigrok or
PulseView depends on, so a violation means a file that loads wrong or truncates
silently rather than failing.
"""
import glob
import math
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # sibling imports under -m and discover

from srlib import SIDECAR_NAME, SrFile

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, "fixtures")


def captures():
    paths = sorted(glob.glob(os.path.join(FIX, "*.sr")))
    extra = os.environ.get("DSO2512G_SR", "")
    paths += [os.path.expanduser(p) for p in extra.split(os.pathsep) if p.strip()]
    return paths


class TestStructure(unittest.TestCase):
    def setUp(self):
        self.paths = captures()
        if not self.paths:
            self.skipTest("no .sr files to check")

    def each(self):
        for path in self.paths:
            with self.subTest(capture=os.path.basename(path)):
                yield path, SrFile(path)

    def test_header(self):
        for _, sr in self.each():
            self.assertEqual(sr.version, "2")
            self.assertGreater(sr.samplerate, 0)
            self.assertGreaterEqual(sr.total_analog, 1)

    def test_declared_channels_match_metadata_keys(self):
        for _, sr in self.each():
            self.assertEqual(len(sr.analog_channels), sr.total_analog,
                             "'total analog' disagrees with the analogN= keys")

    def test_chunks_are_contiguous_from_one(self):
        """The reader walks base-1, base-2, ... and stops at the first missing chunk,
        so a hole in the numbering silently truncates the capture."""
        for _, sr in self.each():
            for name, base in sr.analog_channels:
                self.assertTrue(sr.chunk_names(base), "%s has no chunks" % name)
                self.assertEqual(sr.orphan_chunks(base), [],
                                 "%s has chunks stranded past a gap in the numbering" % name)

    def test_chunk_sizes_are_whole_float32_samples(self):
        for _, sr in self.each():
            for name, _ in sr.analog_channels:
                for size in sr.chunk_sizes(name):
                    self.assertEqual(size % 4, 0, "%s chunk is not a whole number of floats" % name)

    def test_channels_share_one_timeline(self):
        """libsigrok streams all of one channel's chunks before the next and aligns
        them by total sample count, so the totals must match exactly."""
        for _, sr in self.each():
            lengths = {n: len(sr.samples(n)) for n, _ in sr.analog_channels}
            self.assertEqual(len(set(lengths.values())), 1, "channel lengths differ: %s" % lengths)

    def test_logic_channel_declaration_is_self_consistent(self):
        """Either a logic channel is fully declared, or it is absent entirely."""
        for _, sr in self.each():
            if sr.capturefile:
                self.assertGreaterEqual(sr.num_logic, 1)
                self.assertEqual(sr.unitsize, 1)
                self.assertEqual(len(sr.logic_channels), sr.num_logic)
                self.assertEqual(len(sr.logic_bytes()), len(sr.samples(sr.analog_channels[0][0])))
            else:
                self.assertEqual(sr.num_logic, 0)
                self.assertIsNone(sr.unitsize)

    def test_analog_entry_numbering_follows_the_logic_count(self):
        """Analog channels are created after the logic ones, so CH1's entry base is
        analog-1-<num_logic + 1>. Getting this wrong swaps or loses channels."""
        for _, sr in self.each():
            for i, (name, base) in enumerate(sr.analog_channels):
                self.assertEqual(base, "analog-1-%d" % (sr.num_logic + 1 + i),
                                 "%s is at %s but the logic count implies otherwise" % (name, base))

    def test_capture_is_not_degenerate(self):
        """At least one channel carries a real, varying signal."""
        for _, sr in self.each():
            spans = []
            for name, _ in sr.analog_channels:
                finite = [v for v in sr.samples(name) if not math.isnan(v)]
                self.assertTrue(finite, "%s is entirely NaN" % name)
                spans.append(max(finite) - min(finite))
            self.assertGreater(max(spans), 0, "every channel is flat")


class TestSidecar(unittest.TestCase):
    """Only applies to exports that carry one; the pre-fix fixtures do not."""

    def setUp(self):
        self.with_sidecar = [(p, SrFile(p)) for p in captures()
                             if SIDECAR_NAME in SrFile(p).names]
        if not self.with_sidecar:
            self.skipTest("no capture carries %s" % SIDECAR_NAME)

    def each(self):
        for path, sr in self.with_sidecar:
            with self.subTest(capture=os.path.basename(path)):
                yield sr, sr.sidecar()

    def test_frames_tile_the_timeline(self):
        for sr, sc in self.each():
            total = sum(f["length"] + f["gap_before"] for f in sc["frames"])
            self.assertEqual(total, sc["sample_count"])
            self.assertEqual(sc["sample_count"], len(sr.samples(sr.analog_channels[0][0])))

    def test_frames_are_ordered_and_do_not_overlap(self):
        for _, sc in self.each():
            for prev, nxt in zip(sc["frames"], sc["frames"][1:]):
                self.assertGreaterEqual(nxt["start_sample"], prev["start_sample"] + prev["length"])

    def test_trigger_index_is_inside_its_frame(self):
        for _, sc in self.each():
            for f in sc["frames"]:
                if f.get("trigger_sample") is not None:
                    self.assertGreaterEqual(f["trigger_sample"], 0)
                    self.assertLess(f["trigger_sample"], f["length"])

    def test_nan_appears_only_where_the_sidecar_says_it_should(self):
        """NaN means "no acquisition here". Inside a recorded frame, on a channel the
        sidecar reports as present, every sample must be a real reading."""
        for sr, sc in self.each():
            present = {c["name"]: c["entry_base"] for c in sc["channels"]}
            for name in present:
                samples = sr.samples(name)
                key = "ch1" if name == "CH1" else "ch2"
                for f in sc["frames"]:
                    cfg = f.get(key) or {}
                    if cfg.get("present") is False:
                        continue
                    window = samples[f["start_sample"]:f["start_sample"] + f["length"]]
                    bad = [i for i, v in enumerate(window) if math.isnan(v)]
                    self.assertEqual(bad, [], "%s frame %d has NaN inside the acquisition"
                                     % (name, f["n"]))

    def test_gaps_are_nan(self):
        for sr, sc in self.each():
            name = sr.analog_channels[0][0]
            samples = sr.samples(name)
            for f in sc["frames"]:
                if f["gap_before"] <= 0:
                    continue
                gap = samples[f["start_sample"] - f["gap_before"]:f["start_sample"]]
                self.assertTrue(all(math.isnan(v) for v in gap),
                                "gap before frame %d is not NaN-filled" % f["n"])

    def test_declared_channels_exist(self):
        for sr, sc in self.each():
            actual = dict(sr.analog_channels)
            for c in sc["channels"]:
                self.assertIn(c["name"], actual)
                self.assertEqual(actual[c["name"]], c["entry_base"])

    def test_samplerate_agrees_with_metadata(self):
        for sr, sc in self.each():
            self.assertEqual(sc["samplerate"], sr.samplerate)


if __name__ == "__main__":
    unittest.main()
