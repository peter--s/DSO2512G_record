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
6. Click **SAVE** — a `DSO2512G_recording_<timestamp>.sr` file is downloaded.
7. Open the `.sr` in PulseView.

### What is recorded
- **Values:** calibrated volts. The acquired samples are raw screen positions, so the
  channel's V/div and vertical position are applied at export:

  ```
  volts = (raw − vertical_position) × 8 × volts_per_div
  ```

  There is no unit field in the `.sr` format to say otherwise — libsigrok's session reader
  hard‑codes `SR_MQ_VOLTAGE` / `SR_UNIT_VOLT`, so these floats *are* volts to anything that
  opens them. Both terms are taken **per frame**, so adjusting the scope mid‑recording does
  not corrupt the frames that follow.
- **Channels:** CH1 always; CH2 whenever any captured frame has CH2 samples (decided at
  SAVE, so enabling CH2 part‑way through a recording keeps it).
- **One frame per real acquisition:** capture is gated by the app's existing new‑frame
  detector (`trackBufferChangeTime` → `appParam_bufferUpdated`), so duplicate render ticks
  and backup‑fallback redraws are not recorded. Samples are taken before filtering,
  averaging and interpolation, but after the demo‑mode override.
- **Real elapsed time.** An oscilloscope does not produce a continuous sample stream: each
  frame is a separate triggered acquisition. Frames are placed at their true wall‑clock
  offsets and the dead time between them is filled with NaN, which PulseView shows as
  absent data. The gaps are the frame boundaries, so there is no marker channel.

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

### Limitations
- **Frame placement is accurate to about one acquisition interval.** The timestamp is when
  the frame was *received*, not when it was triggered. The export reconstructs *when* frames
  happened; it is not a continuous record of the signal.
- **At 200 ms/div and slower, frames overlap and the timeline collapses.** Up to 100 ms/div
  a frame arrives every `12 × time/div` plus a fixed transfer overhead of roughly
  100–350 ms, so there is always dead time to show. From 200 ms/div the scope rolls —
  it streams a continuously updating buffer instead of waiting for a full acquisition — so
  frames keep arriving every ~200 ms while each still shows 12 × time/div of *history*.
  Consecutive frames then overlap in signal content rather than being separate acquisitions.
  They are laid back to back, which duplicates signal; the count is logged and recorded in
  the sidecar as `clamped_frames`. Measured intervals:

  | time/div | frame span | interval | acquired |
  |---|---|---|---|
  | 10 ns – 500 ns | ≤ 6 µs | ~100 ms | ~0% |
  | 1 µs – 500 µs | ≤ 6 ms | ~200 ms | — |
  | 1 ms | 12 ms | 200 ms | 7% |
  | 5 ms | 60 ms | 200–300 ms | 28% |
  | 10 ms | 120 ms | ~400 ms | — |
  | 20 ms | 240 ms | ~500 ms | — |
  | 50 ms | 600 ms | 725 ms | 84% |
  | 100 ms | 1200 ms | 1400 ms | 88% |
  | **200 ms – 5 s** | **2.4–60 s** | **~208 ms (rolling)** | **100%, overlapping** |
  | 10 s | 120 s | ~400 ms (rolling) | overlapping |

  Values without a measured "acquired" figure are read from the app's frame-interval
  counter; the rest are computed from recorded captures.

  In the rolling regime the **reported samplerate is also unreliable**. A screen at
  200 ms/div spans 2.4 s, so a complete frame cannot exist until 2.4 s have passed, and a
  read before then returns whatever has accumulated. The rate is derived from the frame
  length, so a partial read describes how full the buffer was rather than how fast it was
  sampled — a 42-sample read reports 17 Hz. Since each differing length is a differing
  samplerate, such a recording also fragments into many single-frame files.

  **Beyond 8 segments the export delivers one `.zip` instead of many downloads.** Browsers
  cap how many files a single user gesture may save and drop the rest without saying so — a
  thirty-way split was observed delivering ten files and losing twenty silently. The `.sr`
  files inside open normally once extracted.
- **Very long or very fast recordings drop the gaps.** Gap filling is budgeted on
  uncompressed samples; beyond the budget the frames are concatenated, the sidecar reports
  `"mode": "concatenated"`, and the app says so on screen.
- **`.sr` carries a single samplerate**, so a rate change mid‑recording splits the export
  into one `…_seg<k>.sr` per run — `srzip` cannot store segments and one file cannot
  describe two rates correctly. The rate is derived from the acquired frame length
  (`(length − 1) / 12 / time-per-div`), so the **time/div is not the only thing that moves
  it**: switching CH2 off doubles the frame length, because single-channel mode interleaves
  both ADCs into CH1 (measured: 2401 samples at 200 kHz becomes 4801 at 400 kHz, at a fixed
  1 ms/div), and demo mode substitutes a generated array of its own size. Both split a
  recording with the time/div untouched. Returning to an earlier
  rate starts a further segment rather than rejoining the first, since the frames in between
  belong elsewhere on the timeline.
- **Bit‑identical frames are deduplicated.** New frames are detected by comparing the raw
  buffer, so a perfectly static signal with no noise can look like a gap that should not be
  there.

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
volts conversion against two real captures showing the same ~312 V bus at 50 V/div and at
100 V/div. Where a JavaScript engine is available (`jsc` on macOS, otherwise `node` or
`d8`) it also parses the generated app and exercises the export helpers directly; without
one those tests skip. Tests needing `app_clean.html` skip too, since it is not in the repo.

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
| `DSO2512G-APP-beta10.html` + **`oscilloscope_custom.ttf`** | Hi‑Ban's app ([EEVblog thread](https://www.eevblog.com/forum/testgear/new-2ch-pocket-dsosg-sigpeak-dso2512g/msg5897308/#msg5897308)); copy the HTML to `app.html`. The `.ttf` provides the custom on‑screen symbols. |
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
cp DSO2512G-APP-beta10.html app.html

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
```

Notes:
- **Runtime assets:** keep `oscilloscope_custom.ttf` and `favicon.ico` next to the HTML.
  For the extracted pair, also keep `app_record_extracted.js` and `jszip.min.js` alongside
  `app_record_extracted.html`.
- The JS insertions are matched by **unique code anchors**, which are identical in the inline
  `<script>` of `app_clean.html` and in `app_clean_extracted.js`, so the same patch applies
  to both. The RECORD button is inserted after `#button-power` with matching indentation.
- Inputs are never modified — the feature is written to `app_record*.` outputs; re-running
  simply rebuilds them (backing up any existing output to `<file>.bak`).
- Idempotent guard: the script aborts if the *input* already contains the feature.
- **JSZip:** inlined for `single` (keeps the app self‑contained/offline); referenced as a
  sibling file for `extracted`.
