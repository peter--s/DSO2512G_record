#!/usr/bin/env python3
"""srlib — read a sigrok v2 session archive (.sr) without libsigrok.

Everything is derived from the archive's own `metadata`, never hard-coded, so the
same reader handles both the FRAME-marker layout (`total probes=1`, CH1/CH2 at
`analog-1-2`/`analog-1-3`) and the purely-analog layout (`analog-1-1`/`analog-1-2`).

Channel numbering follows libsigrok: analog channels are created after the logic
channels, so the metadata key `analogN` and the entry base `analog-1-N` share the
same N (session_file.c:326, session_driver.c:118).

Usage as a CLI:
    python3 tests/srlib.py FILE.sr [FILE.sr ...]
"""
import configparser
import io
import json
import math
import os
import re
import struct
import zipfile

SIDECAR_NAME = "dso2512g-recording.json"

_SI = {"": 1, "k": 10 ** 3, "m": 10 ** 6, "g": 10 ** 9}


def parse_samplerate(text):
    """'20 kHz' / '200 MHz' / '92 Hz' / '20000' -> int Hz (as libsigrok parses it)."""
    m = re.match(r"\s*([0-9]*\.?[0-9]+)\s*([kKmMgG]?)\s*(?:Hz)?\s*$", str(text))
    if not m:
        raise ValueError("unparseable samplerate: %r" % (text,))
    return int(float(m.group(1)) * _SI[m.group(2).lower()])


class SrFile(object):
    def __init__(self, path):
        self.path = path
        self.zip = zipfile.ZipFile(path)
        self.names = set(self.zip.namelist())
        if "metadata" not in self.names:
            raise ValueError("%s: no 'metadata' entry" % path)
        self.metadata_text = self.zip.read("metadata").decode("utf-8")
        cp = configparser.ConfigParser()
        cp.read_string(self.metadata_text)
        self._cp = cp
        self._dev = next((s for s in cp.sections() if s.startswith("device ")), None)
        if self._dev is None:
            raise ValueError("%s: no [device N] section" % path)

    # -- header ----------------------------------------------------------------
    @property
    def version(self):
        return self.zip.read("version").decode("ascii").strip() if "version" in self.names else None

    def _get(self, key, default=None):
        return self._cp.get(self._dev, key, fallback=default)

    @property
    def samplerate(self):
        return parse_samplerate(self._get("samplerate"))

    @property
    def capturefile(self):
        return self._get("capturefile")

    @property
    def unitsize(self):
        v = self._get("unitsize")
        return int(v) if v is not None else None

    @property
    def num_logic(self):
        return int(self._get("total probes", 0) or 0)

    @property
    def total_analog(self):
        return int(self._get("total analog", 0) or 0)

    # -- channels --------------------------------------------------------------
    @property
    def logic_channels(self):
        """[(name, probe_number)] from probeN= keys, in numeric order."""
        out = []
        for k, v in self._cp.items(self._dev):
            m = re.fullmatch(r"probe(\d+)", k)
            if m:
                out.append((v, int(m.group(1))))
        return sorted(out, key=lambda t: t[1])

    @property
    def analog_channels(self):
        """[(name, entry_base)] from analogN= keys, in numeric order."""
        out = []
        for k, v in self._cp.items(self._dev):
            m = re.fullmatch(r"analog(\d+)", k)
            if m:
                n = int(m.group(1))
                out.append((v, "analog-1-%d" % n, n))
        out.sort(key=lambda t: t[2])
        return [(name, base) for name, base, _ in out]

    def _base_for(self, channel):
        for name, base in self.analog_channels:
            if name == channel:
                return base
        raise KeyError("no analog channel named %r in %s" % (channel, self.path))

    # -- data ------------------------------------------------------------------
    def chunk_names(self, base):
        """Chunks in the order libsigrok streams them: base-1, base-2, ... until missing."""
        out, n = [], 1
        while "%s-%d" % (base, n) in self.names:
            out.append("%s-%d" % (base, n))
            n += 1
        return out

    def orphan_chunks(self, base):
        """Chunks present in the archive that the contiguous-from-1 walk would never reach."""
        pat = re.compile(re.escape(base) + r"-(\d+)$")
        present = {int(pat.match(n).group(1)) for n in self.names if pat.match(n)}
        reached = set(range(1, len(self.chunk_names(base)) + 1))
        return sorted(present - reached)

    def chunk_sizes(self, channel):
        return [self.zip.getinfo(n).file_size for n in self.chunk_names(self._base_for(channel))]

    def samples(self, channel):
        """All float32 samples of an analog channel, chunks concatenated in order."""
        out = []
        for name in self.chunk_names(self._base_for(channel)):
            blob = self.zip.read(name)
            if len(blob) % 4:
                raise ValueError("%s: %s is %d bytes, not a multiple of 4"
                                 % (self.path, name, len(blob)))
            out.extend(struct.unpack("<%df" % (len(blob) // 4), blob))
        return out

    def logic_bytes(self):
        cf = self.capturefile
        if not cf:
            return b""
        return b"".join(self.zip.read(n) for n in self.chunk_names(cf))

    def sidecar(self):
        if SIDECAR_NAME not in self.names:
            return None
        return json.loads(self.zip.read(SIDECAR_NAME).decode("utf-8"))

    # -- convenience -----------------------------------------------------------
    def summary(self):
        buf = io.StringIO()
        w = buf.write
        w("%s\n" % os.path.basename(self.path))
        w("  version=%s  samplerate=%d Hz  total analog=%d  total probes=%d\n"
          % (self.version, self.samplerate, self.total_analog, self.num_logic))
        if self.capturefile:
            w("  capturefile=%s  unitsize=%s  logic=%s\n"
              % (self.capturefile, self.unitsize, [n for n, _ in self.logic_channels]))
        for name, base in self.analog_channels:
            s = self.samples(name)
            fin = [v for v in s if not math.isnan(v)]
            nan = len(s) - len(fin)
            w("  %-5s %-12s chunks=%-4d samples=%-9d NaN=%-8d" %
              (name, base, len(self.chunk_names(base)), len(s), nan))
            if fin:
                w(" min=%9.3f max=%9.3f mean=%9.3f" %
                  (min(fin), max(fin), sum(fin) / len(fin)))
            w("\n")
        sc = self.sidecar()
        if sc:
            tl = sc.get("timeline", {})
            w("  sidecar: format=%s frames=%s timeline=%s\n"
              % (sc.get("format"), sc.get("frame_count"), tl.get("mode")))
        return buf.getvalue()


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    for path in argv[1:]:
        print(SrFile(path).summary())
    return 0


if __name__ == "__main__":
    import sys
    raise SystemExit(main(sys.argv))
