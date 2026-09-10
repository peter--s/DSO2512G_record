# Acceptance procedure (hardware)

The automated tests pin the conversion arithmetic. What they cannot do is prove the app
reads the *right* settings off the instrument — that `appParam_currVPD_CH1` really is CH1's
V/div, that `appParam_CH1Offset` really is where ground sits. Only a known signal through a
real scope shows that.

Much of this was done against app **beta10** and the captures are committed as fixtures with
automatic assertions. **Those fixtures pin the .sr format, not the beta42 conversion**: beta42
moved the zero reference to `offsetDC = Coupling == 'DC' ? 32 : 128` and added per-range
`appCalib_*` correction tables, so the volts conversion has to be re-verified on hardware
before any beta42 capture is trusted. That is the first item at the end.

## What the built-in generator can and cannot do

| | |
|---|---|
| Output | two **mini banana** terminals (no BNC) |
| Waveforms | sine, square, ramp, symmetric ramp, half sine, absolute sine, sinc, pseudo-noise |
| Frequency | numeric entry, Hz/kHz/MHz, to 2 MHz (10 MHz sine) |
| Duty cycle | numeric entry |
| Amplitude | **fixed at 2.5 V** — not adjustable |
| Offset | **none**, and there is no DC output |

Two consequences shape every test below.

**No DC and no offset control**, so the vertical-position term cannot be checked against a
known DC level. The signal's own baseline stands in: the output is **unipolar, 0 V to
+2.5 V** (measured on a square at 500 mV/div: min 0.000 V, max 2.480 V). A square wave's low
level is therefore a known 0.000 V and must land there no matter where the channel sits on
screen. It is the only absolute voltage reference this instrument can produce, and it
happens to be the one needed.

**Amplitude is fixed**, which helps rather than hinders: 2.5 Vpp is a constant no setting
can drift, so it pins the scale factor outright instead of only relatively.

Wiring: both probe tips to the signal terminal, both probe grounds to the ground terminal,
so one signal reaches both channels. Same probe attenuation on both, CH menu set to match.

**The generator's settings are not readable over the serial link** — the app only sees the
on/off flag at PRM byte 250 — so write down what you dial in. The file cannot confirm it.

After each SAVE:

```bash
DSO2512G_SR=~/Downloads/<file>.sr /usr/bin/python3 -m unittest discover -s tests
python3 tests/srlib.py ~/Downloads/<file>.sr
```

## The shape of the argument

Every test is one idea: **put one signal through two differently-configured channels, or
through one channel whose configuration changes**, and require the same volts out. Each bug
breaks that in its own identifiable way.

| If this is broken | The channels disagree by |
|---|---|
| V/div not applied | the ratio of the two V/div settings |
| Vertical position not applied | the difference between the two ground offsets |
| Per-frame settings not tracked | nothing — until a setting changes mid-recording |

---

## Test 1 — scale and ground reference ✅ *done, twice*

Two captures in deliberately different regimes, so a coincidence cannot pass both.
Fixtures with assertions in `TestAcceptanceCapture` and `TestFastTimebaseCapture`.

| | **1a** sinc | **1b** square |
|---|---|---|
| fixture | `…20260831T230631.sr` | `…20260901T002729.sr` |
| generator | sinc, 100.00 Hz | square, 1.99 MHz, 72.9% duty |
| timebase | 5.00 ms/div, 40 kSa/s | 200 ns/div, **100 MSa/s** |
| CH1 | 500 mV/div, −2.26 div | 500 mV/div, −2.58 div |
| CH2 | **2.00 V/div** (4×), 0.00 div | **1.00 V/div** (2×), −1.13 div |
| timeline | `realtime`, 8 frames | `concatenated` (guard fired), 16 frames |

**Results.** 1a: the channels agree to **0.091 V rms** against a combined quantisation floor
of 0.082 V — the residual is quantisation, not scale error. CH1 pk-pk 2.480 V against the
generator's 2.5 V, within one ADC code; CH1 mean 0.5989 V against the scope's own
`Mean:599.28mV`. 1b: CH1's low level lands on **0.000 V exactly** from a channel positioned
2.58 divisions below centre — without the position term it would read −10.3 V. Recorded
`vpos` matched the screenshots' ground markers to 0.017 div in both.

A **square** makes the 0 V baseline and the 2.5 V top easiest to read by eye in PulseView.

## Tests 2 and 3 — settings changed mid-recording ✅ *done*

Fixture `…20260901T004159.sr`, assertions in `TestMidRecordingSettingChanges`. One
recording in which CH2's position was moved twice and its V/div then halved, with CH1 left
alone as a control. Same 100 Hz signal throughout and 5 ms/div fixed, so the file does not
split and only the front panel moves.

| frames | CH2 V/div | CH2 position | CH2 pk-pk | CH2 mean | CH1 pk-pk | CH1 mean |
|---|---|---|---|---|---|---|
| 0–10 | 2.00 V | +0.04 div | 2.720 | 1.726 | 2.500 | 1.829 |
| 11–12 | 2.00 V | +0.12 div | 2.560 | 1.720 | 2.500 | 1.830 |
| 13–31 | 2.00 V | **+0.72 div** | 2.640 | 1.741 | 2.500 | 1.829 |
| 32–52 | **1.00 V** | +0.72 div | 2.560 | 1.795 | 2.500 | 1.829 |

**Result.** The 0.68-division move would shift CH2 by **1.36 V** if the ground reference
were not subtracted per frame; the observed shift is **0.015 V**. The 2 V → 1 V change would
leave every later frame **a factor of two out** if V/div were read once at RECORD start; the
observed difference is **0.054 V**, under one ADC code. CH1's untouched settings confirm the
signal itself was stable rather than conveniently compensating.

Together with Test 4 this closes defect D from both directions: a rate change there, and
V/div and position at a fixed rate here. Either channel works; CH2 is simply the one that
happened to be adjusted.

## Test 4 — samplerate changed mid-recording ✅ *done*

Fixtures `…20260901T004410_seg1…seg6.sr`, assertions in `TestSegmentSplit`.

One recording carried through six time/div settings produced six files at
**40k → 20k → 10k → 20k → 40k → 100k**. Each segment's rate matches its own timebase by
`(frame length − 1) / 12 / time-per-div`, each carries `segment: {index, count}` and a
warning, and the exported volts stayed at 2.50–2.52 V pk-pk across all six.

Two things this proved that the offline tests could not:

- **A revisited rate starts a new segment.** 40k appears as both segment 1 and segment 5
  rather than being merged — correct, because the frames in between belong elsewhere on the
  timeline.
- **The time/div is not the only thing that changes the samplerate.** In
  `…20260901T004955` the rate halved from 40 kHz to 20 kHz with the timebase untouched,
  because demo mode was switched on and substituted a 1201-sample array for the hardware's
  2401. Enabling CH2 does the same by halving the acquired frame length. The warning text
  used to blame the time/div; this measurement is what corrected it.

## Test 5 — timeline realism ✅ *partly done*

Confirmed on capture 1a using the fact that the generator free-runs while every frame
triggers at the same point on the waveform: whatever the true spacing between two frames, it
must be a whole number of signal periods. Frame placement comes from arrival timestamps,
which know nothing about the signal — so agreement between the two is independent evidence
that the placement is real.

**Result:** every frame-to-frame spacing landed within **1.3 ms of a whole number of 10 ms
periods** — 20 periods apart for six gaps, 30 for one. Placement is good to about ±1.3 ms,
far better than the ±one-acquisition-interval the README claims as its limit.

> **Pick the frequency for this deliberately.** The check only resolves if timestamp jitter
> is well under half a period. At ±1.3 ms observed, the period wants to be ≥ 5 ms, so **stay
> at or below ~200 Hz** — 100 Hz worked well. It cannot work at 1.99 MHz as in capture 1b,
> where a 502 ns period is swamped by millisecond jitter.

**Absolute scale, done too.** Fixture `…20260901T004715.sr` is a 9.758 s recording, and all
**45 of its 45** intervals land within a quarter period — bounding cumulative timeline scale
error to **under 217 ppm** over ten seconds. A stopwatch would have settled this to a couple
of percent, so the periodicity check supersedes it by about a hundredfold. Asserted in
`TestTimelineScale`.

## Test 6 — frame interval and the rolling-acquisition limit ✅ *done*

Fixture `…20260901T011033.sr`, assertions in `TestRollingAcquisition`. Frames arrive every
`12 × time/div` plus 100–350 ms of transfer overhead, so below 200 ms/div there is always
dead time. Measured from recorded captures:

| time/div | frame span | interval | acquired | clamped |
|---|---|---|---|---|
| 200 ns | 2.4 µs | 100 ms | ~0% | 0 |
| 1 ms | 12 ms | 200 ms | 7% | 0 |
| 5 ms | 60 ms | 200–300 ms | 28% | 0 |
| 50 ms | 600 ms | 725 ms | 84% | 0 |
| 100 ms | 1200 ms | 1400 ms | 88% | 0 |
| **200 ms** | **2400 ms** | **208 ms** | **100%** | **12 of 12** |

The crossover sits between 100 and 200 ms/div, exactly where the arithmetic predicts: at
100 ms/div the interval still exceeds the frame span by 200 ms, and at 200 ms/div it falls
an order of magnitude short.

At 200 ms/div the scope rolls — it streams a continuously updating buffer instead of waiting
for a full acquisition — so frames keep arriving every ~208 ms while each still shows 2.4 s
of history. **Every** interval overlapped, all 12 were clamped, and the export contains no
gaps at all.

**This is a real limitation, not a display artefact.** In that regime consecutive frames are
re-reads of one rolling acquisition, so they overlap in signal content and the export
duplicates data. The voltages remain correct; only the time axis is untrustworthy. Worth
knowing before relying on a slow-timebase recording.

## Test 7 — size guard ✅ *done*

Capture 1b triggered it without being aimed at it: 200 ns/div puts the samplerate at
100 MSa/s while frames still arrive every 100 ms, so 16 frames spanning 1.5 s would need
**150M samples per channel** — about 1.2 GB materialised in the browser and again in
PulseView, to carry 4800 samples of actual signal.

**Result:** `timeline.mode: "concatenated"`, the reason recorded in `warnings`, no NaN
anywhere (no dead time left to mark), and a 14 kB file that opens instantly.

The guard is what makes fast timebases usable at all — every capture below about 1 µs/div
will hit it.

## Test 8 — demo mode ✅ *done*

Fixture `…20260901T004940.sr`, assertions in `TestDemoModeCapture`. Recorded entirely in
demo mode: all frames flagged `demo: true`, carrying a 2.600 V pk-pk generated waveform.

Before the fix the snapshot was taken *before* the demo-mode override, so the recorder
captured the stale hardware buffer and this file could not have contained a signal at all.

Worth re-running after any change to the recording code, since it needs no scope and also
serves as the end-to-end syntax check: a JS error blanks the whole app, so if the page
renders and RECORD works, the payloads parsed.

---

## Test 9 — single-channel export ✅ *done*

Fixtures `…20260901T012418_seg1.sr` and `_seg2.sr`, assertions in
`TestSingleChannelExport`. CH2 was switched off part-way through a recording at a fixed
1 ms/div, which split the file:

| | seg1 | seg2 |
|---|---|---|
| CH2 | on | **off** |
| `total analog` | 2 | **1** |
| entries | `analog-1-1`, `analog-1-2` | `analog-1-1` only |
| frame length | 2401 | **4801** |
| samplerate | 200 kHz | **400 kHz** |

Two results. The CH1-only metadata layout is now produced by hardware rather than only by
a unit test. And the README's claim that the channel mode moves the samplerate is confirmed
by measurement rather than inferred from the source: single-channel mode interleaves both
ADCs into CH1, so the frame length and the rate both double with the time/div untouched.

## Test 10 — partial frames in roll mode ✅ *done*

Fixture `…20260901T012418_seg13.sr`, assertions in `TestRollingPartialFrame`.

The same recording ended with five single-frame segments at 200 ms/div holding 42, 426,
842, 1146 and 1626 samples, reporting 17, 177, 350, 477 and 677 Hz. A screen at 200 ms/div
spans 2.4 s, so a complete frame cannot exist until 2.4 s have elapsed; reading earlier
returns whatever has accumulated. Since the app derives the samplerate from the frame
length, a partial read reports the **fill level rather than the sampling rate** — 42 samples
is 0.9% of a full frame, hence 17 Hz.

Nothing in the export is wrong here, and the files remain internally consistent, but two
things follow that are worth knowing:

- the recorded samplerate is not trustworthy at 200 ms/div and slower;
- because every differing length is a differing rate, such a recording fragments into many
  single-frame files.

The voltages are unaffected in this regime — only the time axis is.

## Test 11 — the download cap ✅ *done*

Fixture `…20260901T014856_segments.zip`, assertions in `TestBundledSegments`.

Roll-mode fragmentation exposed a defect the splitting itself introduced. A 500 ms/div
recording split **thirty** ways, and only segments 1–10 reached the disk: the browser stopped
starting downloads and reported nothing. The sidecars still said "segment 1 of 30", so the
loss was visible only by counting files. Before this PR you would have got one misdescribed
file; after it, two thirds of a recording vanished silently.

Fixed by delivering a single `.zip` once a split exceeds `recordMaxSeparateDownloads` (8).
One download cannot be truncated. Smaller splits still arrive as loose `.sr` files, so the
common two- or three-way case is unchanged.

**Confirmed on hardware.** The same situation minutes later split **31 ways and all 31
arrived**, contiguous and individually readable. That archive also captures the complete
buffer-fill ramp, and its last segment settles the true rate:

| seg | length | reported rate | frames |
|---|---|---|---|
| 1 | 186 | 31 Hz | 1 |
| 30 | 4794 | 799 Hz | 1 |
| **31** | **4801 (full)** | **800 Hz** | **3** |

A full frame at 500 ms/div is 4801 samples over 6 s, so 800 Hz — exactly what the buffer
reports once complete, while every partial read before it under-reports in proportion to its
fill. CH1 pk-pk is **2.480 V in all 31 segments**: the reported samplerate is meaningless in
this regime and the voltages do not care, because the conversion depends on V/div and
vertical position, not on timing.


## Remaining

Nothing. Every test in this document is covered by a committed fixture with automatic
assertions, across 13 hardware captures spanning 200 ns/div to 200 ms/div, both timeline
modes, both channel counts, demo and live acquisition, and splits of 2, 6 and 13 segments.

The one thing no capture can establish is long-term stability, so the checks worth repeating
after any change to the recording code are Test 8 (demo mode, needs no scope) and Test 1
(one signal, two channels, different scales and positions).

---

## Outstanding for app beta42

1. **Re-verify the volts conversion on hardware.** beta42 changed the zero reference
   (`offsetDC` is 32 for DC coupling, 128 for AC) and applies per-range `appCalib_*` tables to
   the raw codes. `recToVolts()` is unchanged and its arithmetic is pinned by tests, but
   nothing proves the *reference* is still right. Feed a known DC level and a known amplitude
   on each coupling and compare with the instrument's own readout. If the DC reference is
   wrong, every DC recording is offset by about 3.84 divisions.
2. **Both capture modes, same signal.** Record the same generator output as `displayed` and as
   `acquired` with interpolation, the low-pass filter and averaging all off. The two `.sr`
   files should agree sample for sample; they are proven equivalent in the unit tests only
   against the app's own `applyOffset`, not against the instrument.
3. **Roll mode at 40 ms.** `ITERATION_INTERVAL` has a turbo setting that halves the poll
   period, so the per-read growth the frontier trim measures halves too. The trim measures
   from the recording itself and should adapt, but it has never been run at 40 ms.
4. **STOP-mode capture.** `scaleVoltsAtoB()` rescales the displayed array between the snapshot
   point and `applyOffset()`. The recorder should never commit a frame in STOP (no new data
   arrives), but that path has not been shown to be unreachable.

### Making this repeatable with the app's own generator

beta42 can drive the instrument's signal generator (SIG‑GEN), and the hidden test panel — click
the version label in the title bar — has a **Batch File** input that replays a list of commands
(`sendCommandsFromFile()`). Committing one command file per scenario turns the checks above
from a hand-tuned session into a repeatable one, which matters because they will need redoing
at every app version bump.
