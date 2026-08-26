# Acceptance procedure (hardware)

The automated tests pin the conversion arithmetic against captures that already exist.
What they cannot do is prove the app reads the *right* settings off the instrument — that
`appParam_currVPD_CH1` really is CH1's V/div, that `param_CH1trueVerticalPos` really is
where ground sits. Only a known signal through a real scope shows that.

The design of this procedure is what makes it decisive: one signal, teed to both channels,
with the two channels deliberately set to **different V/div and different vertical
positions**. A correct export gives one number twice. The bugs this PR fixes each break
that in their own way:

| If this is broken | The two channels disagree by |
|---|---|
| V/div not applied | the ratio of the two V/div settings |
| Vertical position not applied | the difference between the two ground offsets |
| Per-frame settings not tracked | nothing at first — only after you change a setting mid-recording |

The scope's generator settings are not readable over the serial link (the app only sees the
on/off flag at PRM byte 250), so **write down what you dial in** — the numbers below are
the reference, not something the file can confirm for you.

## Setup

Built-in AWG output → BNC T → both inputs. Use the same probe attenuation on both channels
and set the CH menu to match it.

After each SAVE, check the file with:

```bash
DSO2512G_SR=~/Downloads/<file>.sr /usr/bin/python3 -m unittest discover -s tests
python3 tests/srlib.py ~/Downloads/<file>.sr        # quick look
```

---

## Test 1 — DC ground reference

The sharpest test of the vertical-position term, because a DC level is nothing *but* offset.

| | CH1 | CH2 |
|---|---|---|
| V/div | 500 mV | 1.00 V |
| vertical position | **−2.0 div** (below centre) | **+1.5 div** (above centre) |
| coupling | DC | DC |

AWG: DC, **+1.000 V**, no AC. Timebase 1 ms/div, trigger CH1, Auto. Record ~5 s.

**Expect:** both traces flat at **+1.00 V ± 0.05 V**, lying exactly on top of each other in
PulseView despite 2× different V/div and 3.5 divisions of separation on screen.

In the sidecar, frame 1 should read `ch1.vpd 0.5`, `ch1.vpos −0.25`, `ch2.vpd 1.0`,
`ch2.vpos 0.1875` (position in divisions ÷ 8).

**Before the fix** the two traces sit 3.5 divisions apart in volts and neither is at 1 V.

## Test 2 — AC amplitude across different scales

| | CH1 | CH2 |
|---|---|---|
| V/div | 500 mV (4 div p-p) | 1.00 V (2 div p-p) |
| vertical position | −1.0 div | +1.5 div |

AWG: sine, **1 kHz**, **2.000 Vpp**, 0 V offset. Timebase 500 µs/div.

**Expect:** both channels **2.00 Vpp ± 2 %**, mean **0.00 ± 0.02 V**, and the two traces
agreeing sample by sample to within 40 mV (one CH1 ADC code).

**Before the fix** CH1 reads `2.0/(8 × 0.5)` and CH2 `2.0/(8 × 1.0)` — a factor of two apart,
and neither in volts.

## Test 3 — settings changed mid-recording

Repeat Test 1, and part-way through the recording change CH1 to **1 V/div** and move CH1's
vertical position by **2 divisions**.

**Expect:** exported CH1 stays flat at +1.00 V straight through the change — the trace on
screen jumps, the volts do not. The sidecar shows `ch1.vpd` and `ch1.vpos` differing between
early and late frames.

## Test 4 — timebase changed mid-recording

Repeat Test 2 and change the timebase from 500 µs/div to 200 µs/div while recording.

**Expect:** two files, `…_seg1.sr` and `…_seg2.sr`, each with its own correct samplerate in
`metadata`, each sidecar carrying `segment: {index, count}` and a warning, and an on-screen
message when SAVE runs.

## Test 5 — timeline realism

Record Test 2's signal for a wall-clock-timed **10 seconds** (use a stopwatch).

**Expect:** PulseView's total duration is ≈10 s, not `frames × 6 ms`. Gaps are visible
between frames. Sidecar says `timeline.mode: "realtime"` and `clamped_frames: 0`.

Then repeat at **100 ms/div**. Now a frame spans 1.2 s of signal but arrives every few
hundred ms, so the frames cannot be placed apart: expect `clamped_frames` > 0 and a note in
the log. That is the documented limit, not a failure.

## Test 6 — size guard

Set **1 µs/div** (200 MSa/s) and record ~3 s.

**Expect:** `timeline.mode: "concatenated"`, a warning in the sidecar, an on-screen message,
and a file that opens without hanging the tab. This is the guard working — at that rate a
100 ms gap would be 20 million NaN samples per frame.

## Test 7 — demo mode (no hardware)

Worth running after any change to the recording code, since it needs no scope.

Demo mode ON, CH1 sine, CH2 square → START → RECORD → wait a few seconds → SAVE.

**Expect:** a non-empty `.sr` with varying data on both channels, and the structural tests
passing on it. Before this PR the recorder captured the hardware buffer rather than the
generated waveform, so this produced an empty or stale file.

This also serves as the end-to-end syntax check: a JS error in the recording code blanks the
whole app, so if the page renders and RECORD works, the payloads parsed.
