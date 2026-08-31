# Acceptance procedure (hardware)

The automated tests pin the conversion arithmetic. What they cannot do is prove the app
reads the *right* settings off the instrument — that `appParam_currVPD_CH1` really is CH1's
V/div, that `param_CH1trueVerticalPos` really is where ground sits. Only a known signal
through a real scope shows that.

Most of this has now been done, and the captures are committed as fixtures with automatic
assertions. What remains is listed at the end.

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

## Test 2 — vertical position changed mid-recording ⬜ *not done*

The sharpest remaining test of per-frame settings, and one the fixed-amplitude generator
makes easy: nothing about the signal changes, only where it sits on screen.

Square, ~1 kHz, channels as in Test 1a. Start recording, then **move CH1's vertical position
by 2–3 divisions** part-way through, and again near the end. Keep the time/div fixed.

**Expect:** exported CH1 unchanged throughout — the trace jumps on screen, the volts do not,
and its low level stays at 0.000 V in every frame. `ch1.vpos` differs between early and late
frames in the sidecar while CH1's exported mean and pk-pk stay put.

**Before the fix** the volts would follow the knob, since position was never subtracted.

## Test 3 — V/div changed mid-recording ⬜ *not done*

Set up as Test 1a. Start recording, then change **CH1 from 500 mV/div to 2.00 V/div**
part-way through. Both fit on screen: 2.5 V spans 5 divisions at 500 mV/div, 1.25 at 2 V/div.
Keep the time/div fixed, so this does not split the file.

**Expect:** exported CH1 pk-pk stays 2.5 V across the change and still matches CH2;
`ch1.vpd` changes between frames in the sidecar.

**Before the fix** every frame after the change was wrong by 4×, since V/div was read once
at RECORD start.

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

⬜ **Still to do:** record for a **stopwatch-timed 10 s** at 5 ms/div and confirm PulseView's
total duration matches. That pins the absolute scale of the timeline rather than its spacing.

## Test 6 — frame interval and the rolling-acquisition limit ⬜ *partly done*

Frames arrive every `12 × time/div` plus 100–350 ms of transfer overhead, so **below
200 ms/div there is always dead time** and `clamped_frames` should stay 0. Measured from the
app's bottom-right counter:

| time/div | frame span | interval |
|---|---|---|
| 10 ns – 500 ns | ≤ 6 µs | ~100 ms (capture 1b: 100.0 ms) |
| 1 µs – 500 µs | ≤ 6 ms | ~200 ms |
| 1 ms – 5 ms | 12–60 ms | 200–300 ms (capture 1a: 200.6 ms) |
| 10 ms | 120 ms | ~400 ms |
| 20 ms | 240 ms | ~500 ms |
| 50 ms | 600 ms | 800–1000 ms |
| 100 ms | 1200 ms | 1500–1600 ms |
| 200 ms – 5 s | 2.4–60 s | ~200 ms (rolling) |
| 10 s | 120 s | ~400 ms (rolling) |

At **200 ms/div and slower** the scope rolls: it streams a continuously updating buffer
instead of waiting for a full acquisition, so frames keep arriving every ~200 ms while each
still shows 2.4 s or more of history.

⬜ **To do:** record at 200 ms/div and confirm `clamped_frames` > 0 with a note in the log.

**This is a real limitation, not a display artefact.** In that regime consecutive frames are
re-reads of one rolling acquisition, so they overlap in signal content and the export
duplicates data. Worth knowing before trusting a slow-timebase recording.

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

## Remaining

| | |
|---|---|
| **Test 2** | vertical position moved mid-recording, time/div fixed |
| **Test 3** | V/div changed mid-recording, time/div fixed |
| **Test 5** | stopwatch-timed 10 s at 5 ms/div, to pin absolute duration |
| **Test 6** | one recording at 200 ms/div, to see `clamped_frames` > 0 |

Tests 2 and 3 are the substantive ones — they are the only checks of per-frame settings
that the samplerate-split path does not already cover.
