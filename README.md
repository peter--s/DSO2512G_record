# DSO2512G Web App — Sample Recording (PulseView `.sr` export)

This project adds a **RECORD / SAVE** feature to Hi-Ban's DSO2512G browser app: while the
oscilloscope is streaming, you can capture the acquired samples and download them as a
**sigrok `.sr`** session file that imports directly into **PulseView**.

The feature is delivered as a **patch** that can be applied either to the single
self‑contained `app_clean.html` (or to its extracted `app_clean_extracted.js` /
`app_clean_extracted.html` pair).

---

## The RECORD feature

### Using it
1. Open the patched app (`app_record.html`, or `app_record_extracted.html`) in Chrome/Edge (Web Serial).
2. **CONNECT** → pick the serial port and confirm.
3. **START** — acquisition begins; the **RECORD** button becomes enabled.
4. Click **RECORD** to begin capturing frames; the button lights up and changes to **SAVE**.
5. Adjust the scope as needed; every newly acquired frame is captured.
6. Click **SAVE** — a `DSO2512G_recording_<timestamp>.sr` file is downloaded. If the
   samplerate changed while recording you get one `…_seg<k>.sr` per run instead, and past
   8 of those a single `…_segments.zip` holding them all.
7. Open the `.sr` in PulseView, extracting the `.zip` first if you got one.

### What is recorded
- **Values:** calibrated volts. The acquired samples are raw screen positions, so the
  channel's V/div and vertical position are applied at export:

  ```
  volts = (raw − vertical_position) × 8 × volts_per_div
  ```

  There is no unit field in the `.sr` format to say otherwise — libsigrok's session reader
  hard‑codes `SR_MQ_VOLTAGE` / `SR_UNIT_VOLT`, so these floats *are* volts to anything that
  opens them. Both terms are taken **per frame**, so adjusting the scope mid‑recording does
  not corrupt the frames that follow, and the result is the same across all three signal
  paths, and records which of the two capture modes produced the samples.
  routes.
- **A frame carrying `NaN` among real readings is reported.** In single-channel mode
  `DataBuffer2` interleaves CH2's and CH1's samples to double the rate, indexing both by
  CH1's count, so a shorter CH2 leaves `NaN` in its half of the tail. Since `NaN` means
  "no acquisition here" in this format, such a frame would otherwise pass as dead time.
- **Frames with no usable samples are dropped.** Switching the signal source mid‑recording
  can yield one: the `WAV` path reads a second sample per point at a fixed offset, so a
  buffer shorter than that offset produces `NaN` for every point. Since `NaN` means "no data
  here" in the export, keeping such a frame would make it indistinguishable from dead time.
  The count is logged.
- **Channels:** CH1 always; CH2 whenever any captured frame has CH2 samples (decided at
  SAVE, so enabling CH2 part‑way through a recording keeps it).
- **One frame per real acquisition:** capture is gated by the app's existing new‑frame
  detector (`trackBufferChangeTime` → `appParam_bufferUpdated`), so duplicate render ticks
  and backup‑fallback redraws are not recorded. Samples are taken before filtering,
  averaging and interpolation, but after the demo‑mode override.
- **Real elapsed time**, with the dead time between acquisitions left as NaN. The gaps are
  the frame boundaries, so there is no marker channel — see *How time is represented* below
  for why one is not needed.

### `.sr` file layout (sigrok v2, matches libsigrok `srzip`)
```
version                   -> "2"
metadata                  -> INI: [global] sigrok version ; [device 1] samplerate,
                             total analog=1|2, analog1=CH1, analog2=CH2
analog-1-1-<n>            -> CH1 samples in volts, little-endian float32
analog-1-2-<n>            -> CH2 samples in volts (only when CH2 was recorded)
dso2512g-recording.json   -> settings sidecar (ignored by libsigrok/PulseView)
```
Chunks `<n>` run contiguously from 1 and alternate between gaps and frames; the reader
stops at the first missing chunk, so the numbering must have no holes.

The **sidecar** carries everything `.sr` has no room for — per frame: start offset, length,
preceding gap, trigger sample index, timebase, and both channels' V/div, vertical position,
probe factor, coupling and bandwidth limit, plus the trigger source, slope and level. It
also records `samplerate_exact` (metadata rounds to whole Hz) and the app's
`verticalOffsetCH1/CH2` calibration constants, which stay baked into every sample because
they are what makes the export agree with the scope's own on‑screen readouts.

Those constants are reported for every frame: beta42 has a single data path, so they always
apply. The sidecar says which capture mode produced the samples rather than claiming
something untrue, and a mixed capture says which frames they apply to. `signal_sources`
lists the paths used, and `samplerate_estimated` marks a rate the app could only infer from
the frame length and then clamp to the hardware ceiling — 50 ns/div computes 500 MHz and is
reported as 200 MHz.

### How time is represented

An oscilloscope does not produce a continuous sample stream. Each frame is a separate
triggered acquisition, with dead time in between, and `.sr` has no way to say so — its
metadata is `samplerate`, `capturefile`, `total probes`, `total analog` and channel names,
nothing more. The sigrok v3 format solves this properly, with a per-frame packet carrying
*"the time during acquisition at which this frame began"*, but it is
[explicitly unimplemented](https://sigrok.org/wiki/File_format:Sigrok/v3). So the timeline
has to be built out of samples, and these are the rules used.

**A frame's samplerate is `(intended samples − 1) / (12 × time-per-div)`.** This is the app's own rule —
everywhere it converts a sample index to a time it computes `totalTime = 12 × tpd` and
divides by `n − 1`, and it draws by stretching the array across the grid. `appParam_sampleRate`
is only the top-bar readout, and for `WAV` it is clamped to the hardware ceiling to keep that
readout sane. Using it stretched WAV frames by 12.5×, because a `WAV` frame is the
instrument's *rendered screen trace* — a fixed 300 points at any time/div, "already processed
and interpolated" — while a `DataBuffer` frame at the same setting held 25 real samples. Both
span 12 divisions, so both must be written at their own rate, in their own segment.

For `WAV` the resulting figure counts **display points per second, not ADC samples**: it is
what makes the frame span its true duration, and it can exceed what the instrument can
sample. The sidecar flags this as `samplerate_is_display_points`, and each frame records
`intended_samples`, the real acquisition length. Record from `DataBuffer` if you want samples
rather than the scope's rendering of them.

The count is what a **complete frame from that source** holds, not the array's length. For a
raw source that is the acquisition length; for `WAV` it is the frame's own 300 points, since
a WAV frame is the rendered screen and is never partial. In roll mode the
app draws a partly-filled acquisition into the right-hand part of the grid rather than
stretching it across the width — `processForPlotting()` left-pads by
`width − (length / intendedDrawnSamples) × width`, so pixels per sample come out as
`width / intendedSamples` however full the buffer is. Time per sample is therefore constant
while the buffer fills, which is why the display stays correct throughout. Using the array
length instead made one 100 Hz signal read as 16, 20 and 22 Hz across three consecutive
reads of the same acquisition, and gave each read a rate of its own — which is what split
such recordings into dozens of files.

**Dead time between frames is NaN.** PulseView shows it as absent data, and a NaN run
deflates about 1000:1, so it costs nothing on disk. Frames are placed at their true
wall-clock offsets, taken from the arrival timestamp, which is accurate to roughly one
acquisition interval.

**A rolling acquisition is reassembled, not repeated.** At 200 ms/div and slower the scope
keeps one acquisition running and the app re-reads it every ~200 ms, so consecutive frames
are one stream seen through a sliding window — measured on hardware, frame N+1 equals frame N
shifted by exactly the arrival interval, to a mean difference of 0.0000 V. The shift is
predicted from the timestamps and then confirmed against the samples, and only a near-exact
match is stitched. One test recording went from 13 frames of 31,213 mostly duplicate samples
to 4,801 genuine ones on a correct timeline.

Stitching happens **before** the samplerate split, grouped by time/div and signal source.
Partial reads differ in length and therefore in rate, so splitting first would put each one
in a run of its own and the stitcher would never see a pair — which is exactly what made one
real recording produce 259 single-frame files.

**The unsettled tail of a partial read is trimmed.** While a slow acquisition fills, the
scope reports slightly more samples than have settled: measured over one 500 ms/div fill
cycle, the last ~20 samples of a read are contradicted by the next, on every read whose
count grew by 160 or 192 and on none that grew by 128. They hold plausible voltages with
transitions missing, which merges two pulses into one wide one. Every consecutive pair
reveals its own frontier, so the size is measured from the recording rather than assumed,
and the newer read supersedes the older wherever they overlap. Only the last read of a cycle
has no successor to correct it, so only that one is trimmed — by the largest frontier that
cycle actually showed, or not at all if none was seen.

A read whose length is exactly 1200, 601, 600, 481 or 480 also carries a duplicated first
sample: `trimWaveArray()` adds it so the count is odd and the trigger lands on the centre
sample, which is right for a complete acquisition but spurious for a filling buffer that
happens to pass through those lengths. The comparison tolerates that one-sample offset.

**Over budget, each frame becomes its own file.** A `.sr` carries one uniform samplerate, so
showing 1.5 s at 100 MSa/s costs 150 M samples even when 4,800 of them carry signal. The file
stays small, but every consumer materialises the whole array. Past
`recordMaxTimelineSamples` per channel the frames are written separately instead — a squashed
timeline is *wrong*, whereas separate frames merely have *no* timeline, and each sidecar's
`t_ms` still records where its frame belongs. The budget is about consumer memory, not file
size; gap buffers are shared, so the browser's cost does not grow with the dead time.

If that produces an unwieldy number of files, the recording is asking for more than the
format can express: record at a slower time/div, or for less time.

**A samplerate below 1 Sa/s cannot be written at all** — `.sr` stores whole Hz — so such a
file says 1 Hz and its timeline is stretched by however far off that is. It only arises from
a very slow time/div read before the acquisition filled, which stitching normally absorbs;
where it survives, the sidecar says so rather than leaving the stretch silent.

### Limitations
- **Frame placement is accurate to about one acquisition interval.** The timestamp is when
  the frame was *received*, not when it was triggered. The export reconstructs *when* frames
  happened; it is not a continuous record of the signal.
- **Frames arrive every `12 × time/div` plus 100–350 ms of transfer overhead.** Measured:

  | time/div | frame span | interval | acquired |
  |---|---|---|---|
  | 10 ns – 500 ns | ≤ 6 µs | ~100 ms | ~0% |
  | 1 ms | 12 ms | 200 ms | 7% |
  | 5 ms | 60 ms | 200–300 ms | 28% |
  | 50 ms | 600 ms | 725 ms | 84% |
  | 100 ms | 1200 ms | 1400 ms | 88% |
  | 200 ms – 5 s | 2.4–60 s | ~200 ms (rolling) | reassembled |

- **`.sr` carries a single samplerate**, so a rate change mid-recording splits the export into
  one `…_seg<k>.sr` per run. The rate follows the acquired frame length, so the time/div is
  not the only thing that moves it: switching CH2 off doubles the length (single-channel mode
  interleaves both ADCs into CH1 — measured, 2401 samples at 200 kHz becoming 4801 at
  400 kHz), demo mode substitutes a generated array, and a source switch changes it too.
  Returning to an earlier rate starts a further segment, since the frames in between belong
  elsewhere on the timeline.
- **Beyond 8 files the export delivers one `.zip`.** Browsers cap how many files a single
  gesture may save and drop the rest silently — a thirty-way split was observed delivering ten
  files and losing twenty.
- **Frames with no usable samples are dropped.** Switching the signal source can yield one:
  the `WAV` path reads a second sample per point at a fixed offset, so a buffer shorter than
  that offset produces `NaN` for every point. Since `NaN` means "no data here", keeping such a
  frame would make it indistinguishable from dead time. The count is logged.
- **Bit-identical frames are deduplicated** by the app's own new-frame detector, so a
  perfectly static noiseless signal can look like a gap that should not be there.

> **Changed in this version:** samples are now volts rather than normalised screen positions,
> and dropping the FRAME channel moved CH1/CH2 from `analog-1-2`/`analog-1-3` down to
> `analog-1-1`/`analog-1-2`. Tooling that reads the entries by name needs updating; the
> sidecar's `channels[].entry_base` gives the names for a given file, and its `format` key
> distinguishes new exports from old ones.

### How it works (code)
- New globals (`appParam_isRecording`, `appParam_bufferUpdated`, `recPendingCH1/CH2`,
  `recPendingSettings`, `recPendingTime`, `recordedFrames`, `recordSampleRate`).
- `trackBufferChangeTime()` raises `appParam_bufferUpdated` and timestamps the frame.
- `processWaveforms()` snapshots the raw pre‑interpolation samples together with
  `recSnapshotSettings()` — the V/div, vertical position and trigger state of that frame.
- `doIteration()` commits one frame after `processWaveforms()` and clears the flag.
- `toggleRecording()` → `exportRecordingSR()` → `exportRecordingSegment()` build and
  download the `.sr` via JSZip; `recToVolts()` does the conversion and
  `planRecordingTimeline()` decides where each frame sits.
- The RECORD button is enabled/disabled in `startPlotting()` / `stopPlotting()`.

### Tests

```bash
/usr/bin/python3 -m unittest discover -s tests -v
```

Standard library only — no npm, no pip. The suite pins `app_record.html` against the patch
(byte for byte), checks the `.sr` structural invariants libsigrok depends on, and pins the
volts conversion against recorded captures. Where a JavaScript engine is available (`jsc` on
macOS, otherwise `node` or `d8`) it also parses the generated app and exercises the export
path directly; without one those tests skip. Tests needing `app_clean.html` skip too, since
it is not in the repo.

The fixtures in `tests/fixtures/` are real hardware captures spanning 200 ns/div to
500 ms/div, both timeline modes, one and two channels, demo and live acquisition, and
splits of 2, 6, 13, 30 and 31 segments. Between them they establish the conversion against
the instrument's own readouts — one generator output through two channels four scales and
two divisions apart agrees to 0.091 V rms against a 0.082 V quantisation floor, and a
square's unipolar baseline lands on 0.000 V from a channel sitting 2.58 divisions off
centre. The two pre-fix captures are kept deliberately: applying the conversion to them
offline reproduces the scope's on-screen `Mean` and `PKPK` figures, which is what pins the
formula independently of the browser.

To check an export you produced yourself:

```bash
DSO2512G_SR=~/Downloads/DSO2512G_recording_20260826T101500.sr \
    /usr/bin/python3 -m unittest discover -s tests
```

`tests/ACCEPTANCE.md` has the hardware procedure using the scope's built‑in generator.
`tests/srlib.py` doubles as a CLI for inspecting a file: `python3 tests/srlib.py FILE.sr`.

---

## Involved Files 
(Needed: **`app_record.html`**, **`oscilloscope_custom.ttf`**, **`favicon.ico`**)

| File | Role |
|------|------|
| `DSO2512G-APP-beta42.html` + **`oscilloscope_custom.ttf`** | Hi‑Ban's app ([EEVblog thread](https://www.eevblog.com/forum/testgear/new-2ch-pocket-dsosg-sigpeak-dso2512g/msg5897308/#msg5897308)); copy the HTML to `app.html`. The `.ttf` provides the custom on‑screen symbols. |
| `js_analyzer.py` | Cleans/pretty‑prints (`--clean`), analyses, and (`-e`) splits `app.html` into separate JS/HTML — from [peter--s/js_tools](https://github.com/peter--s/js_tools/). |
| `app_clean.html` | Pristine cleaned app (no recording feature); produced by `js_analyzer.py --clean`. |
| `app_clean_extracted.js` / `app_clean_extracted.html` | Extracted JS + HTML shell (no recording feature); produced by `js_analyzer.py -e`. |
| `README.txt` | Structural report (classes, functions, variables, scope leaks, mutations) produced by `js_analyzer.py`. |
| **`app_record.html`** | The app with the recording feature applied (self‑contained). Produced by `apply_record_feature.py single`. |
| `app_record_extracted.js` / `app_record_extracted.html` | The extracted app with the recording feature applied. Produced by `apply_record_feature.py extracted`. |
| `jszip.min.js` | Stuart Knightley's JSZip 3.10.1 — builds the `.sr` ZIP in‑browser ([dist](https://github.com/Stuk/jszip/tree/main/dist)). |
| `record_feature.patch.json` | The patch definition (byte‑exact insertions). |
| `apply_record_feature.py` | Applies the patch, writing the `app_record*` outputs (inputs untouched). |
| **`favicon.ico`** | DSO icon created with piskelapp.com and xsukax‑Favicon‑Generator. Helps finding the right tab when you opened too many. |

---

## Generating the baseline using js_tools

`js_analyzer.py` needs `beautifulsoup4` + `esprima` (plus `jsbeautifier` for `--clean`).

```bash
# (optional) isolate the dependencies
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install beautifulsoup4 esprima jsbeautifier

# pristine working copy
cp DSO2512G-APP-beta42.html app.html

# clean + extract + report in one step:
python3 js_analyzer.py app.html --clean -e -n -g -u > README.txt
#   --clean -> app_clean.html                            (pretty-printed, title-bar layout repaired)
#   then -e -> app_clean_extracted.js / .html            (extracted from the cleaned file)
#   report  -> README.txt                                (functions, variables, classes, scope leaks, global mutations)

deactivate                           # (optional) leave the venv
```

With `--clean`, cleaning runs **first** and every later step uses `app_clean.html` as its input, so the
extracted files are named `app_clean_extracted.*`. The title repair — restoring the `&nbsp;` padding
that `prettify()` strips — is applied to both the cleaned HTML and the extracted HTML.

---

## What gets recorded: displayed or acquired

beta42 processes the samples on their way to the screen — a low-pass filter, optional
interpolation (×4 synthetic points), optional averaging, then the vertical position offset. So
"the samples" is ambiguous, and pressing **REC** asks which you want:

| | taken from | includes |
|---|---|---|
| **as displayed** | `CH1rawPoints`, at the end of `processWaveforms()` | filter, interpolation, averaging, vertical offset — exactly what is drawn |
| **as acquired** | the array just after `trimWaveArray()` | filter only. Forces interpolation off for the recording and restores your setting afterwards |

The choice is remembered across sessions in `localStorage`. The dialog also offers *don't ask
again this session*, which is deliberately **not** persisted — reloading the page always
restores the question, so changing your mind costs a refresh.

Both modes are independent of the channel position knob. `applyOffset()` adds it absolutely and
runs after the acquired snapshot point, so a displayed frame carries it and has it subtracted
back out, while an acquired frame never received it; `vpos` in the sidecar follows the mode.
With the processing off the two are equal sample for sample.

The mode is also a **grouping key**: changing it mid-recording changes what the numbers mean,
so it starts a new segment rather than mixing them, exactly as a samplerate change does. The
sidecar reports `capture_mode` per frame, `capture_modes` for the file, and the display
processing that was active.

## The patching script

`apply_record_feature.py` reads `record_feature.patch.json` and builds the recording feature version as
**new output files, never modifying the pristine inputs** (an existing output is copied to
`<file>.bak` before it is overwritten). An icon is added to the html header unless `-n` or
`--noicon` is passed.

```bash
# single:   app_clean.html  ->  app_record.html   (JS + button + JSZip inlined)
python3 apply_record_feature.py single

# extracted: app_clean_extracted.js   -> app_record_extracted.js
#            app_clean_extracted.html  -> app_record_extracted.html
#   - JSZip is referenced via <script src="jszip.min.js"> (keep jszip.min.js alongside)
#   - the output HTML is re-pointed to app_record_extracted.js
python3 apply_record_feature.py extracted

# Optional: operate on a different project directory
python3 apply_record_feature.py single --dir /path/to/project

# Optional: skip adding favicon.ico to the html header
python3 apply_record_feature.py single --noicon

# Optional: replace the app's own icon instead of leaving it alone
# (newer app versions ship an inline favicon; the default is to keep it)
python3 apply_record_feature.py single --favicon replace

# Optional: also apply fixes to the app itself (see --help for the numbered list)
python3 apply_record_feature.py single --with-app-fixes
python3 apply_record_feature.py single --with-app-fixes=fw_version   # or =1
```

### App fixes (optional, off by default)

Separate from the recorder, `record_feature.patch.json` carries an `app_fix_ops` list of fixes
to defects in the app itself. They are **not applied unless asked for**, so the default build is
the recorder and nothing else — which keeps it reviewable, and proposable upstream, on its own.
`--help` lists them numbered; `--with-app-fixes` takes either the bare flag (all of them) or a
comma-separated list of numbers and/or names. Any subset is valid.

| # | name | fix |
|---|---|---|
| 1 | `fw_version` | The firmware reply is tested with **exact string equality**, so any *newer* modded firmware is rejected — and the app then calls `stopPlotting()`, refusing to run at all — even though its own message says "or newer". Accepts `V1.3.0C MOD V9Bn` for n ≥ 5, tolerates the untrimmed reply, and logs the version. **Needed for firmware V9B6 and above.** |
| 2 | `label_pointer_events` | The 40px push‑to‑50% glyph overlaps the lower half of the rotated trigger LEVEL arrow and, being later in the DOM with no `z-index`, paints on top and swallows its clicks. `.labelTextSymbol` gets `pointer-events: none`; no such glyph has a handler. |
| 3 | `trigger_50pct` | The 50% button set the level to the channel's **zero reference**, which on a DC-offset signal lands off the waveform so the scope stops triggering — the case the button exists to rescue. Uses 50% of the *signal* (the midpoint between the measured peaks), as Tektronix/Rigol/Siglent do. |
| 4 | `trigger_state` | The top bar showed the trigger **mode**, printing a green `AUTO` whether or not anything was triggering, so a locked trace and a free‑running one looked identical. Now reports acquisition **state**: `STOP` / `WAIT` / `ROLL` / `TRIG'D` / `AUTO` / `READY`, from a flag latched off the FPGA wait that the app already computed and discarded. The field moves to the right of the top bar with the other trigger items. |
| 5 | `trigger_hysteresis` | The FPGA trigger hysteresis was hard-coded to 10 codes = **0.4 divisions**, and the band sits entirely on one side of the level, so a rising edge cannot arm near the signal's minimum and a falling edge near its maximum. Exposed on the Trigger menu as a multipurpose‑wheel item, default 5 (0.2 div), 0–20, persisted. |
| 6 | `trigger_rounding` | `triggerY` is a float and `<< 8` coerces via `ToInt32`, which truncates — so the level was systematically up to one code (0.04 div) low. Rounds first. |
| 7 | `trigger_clamp` | `triggerY1`/`triggerY2` were clamped to `[8, 250]` **independently**, so near the rails the hysteresis band narrowed and then vanished, silently turning the trigger into a single-level comparator that multi-triggers on noise. Shifts the pair together instead, preserving the band. |
| 8 | `multi_arrows` | The multipurpose wheel was the only knob without click arrows for single stepping. Adds them, copying the trigger knob's layout. |
| 9 | `multi_unit_buttons` | The two buttons below the wheel did nothing unless cursors were on, while the unit of the wheel‑adjustable value (CH1/CH2 LP filter frequency, FFT impedance) was reachable only through its own menu slot and only forwards. They now step it in both directions. |

The nine ops together reproduce a hand-verified reference build byte for byte, which is what
pins the extraction; `tests/test_patch_apply.py` also checks each one applies on its own.

Notes:
- **Runtime assets:** keep `oscilloscope_custom.ttf` and `favicon.ico` next to the HTML.
  For the extracted pair, also keep `app_record_extracted.js` and `jszip.min.js` alongside
  `app_record_extracted.html`.
- The insertions are matched by **unique code anchors**, which are identical in the inline
  `<script>` of `app_clean.html` and in `app_clean_extracted.js`, so the same patch applies
  to both. An anchor that is missing *or* duplicated aborts the build rather than guessing.
- Ops are insertions by default — the payload lands after the anchor and the anchor survives.
  An op marked `"replace": true` substitutes the payload *for* the anchor instead, which is
  what fixes to existing app code need. Ops carrying `"target": "html"` apply to the HTML
  rather than the JS, which only matters in `extracted` mode where they are two files.
- Inputs are never modified — the feature is written to `app_record*.` outputs; re-running
  simply rebuilds them (backing up any existing output to `<file>.bak`).
- Idempotent guard: the script aborts if the *input* already contains the feature.
- **JSZip:** inlined for `single` (keeps the app self‑contained/offline); referenced as a
  sibling file for `extracted`.
