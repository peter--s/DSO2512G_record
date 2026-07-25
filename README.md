# DSO2512G Web App — Sample Recording (PulseView `.sr` export)

This project adds a **RECORD / SAVE** feature to Hi-Ban's DSO2512G browser app: while the
oscilloscope is streaming, you can capture the acquired samples and download them as a
**sigrok `.sr`** session file that imports directly into **PulseView**.

The feature is delivered as a **patch** that can be applied either to the single
self‑contained `app_clean.html` or to its extracted `app_clean_extracted.js` /
`app_clean_extracted.html` pair.

---

## The RECORD feature

### Using it
1. Open the app (`app_record.html`, or the patched `app_record_extracted.html`) in Chrome/Edge (Web Serial).
2. **CONNECT** → pick the serial port and confirm.
3. **START** — acquisition begins; the **RECORD** button becomes enabled.
4. Click **RECORD** (it changes to **SAVE** and lights up) to begin capturing frames.
5. Adjust the scope as needed; every newly acquired frame is captured.
6. Click **SAVE** — a `DSO2512G_recording_<timestamp>.sr` file is downloaded.
7. Open the `.sr` in PulseView.

### What is recorded
- **Values:** calibrated voltage (V) — the `convertToWaveArray()` output, taken *before*
  interpolation (the raw acquired samples, matching the app's computed sample rate).
- **Channels:** CH1 always; CH2 additionally when it is enabled at RECORD start.
- **One frame per real acquisition:** capture is gated by the app's existing new‑frame
  detector (`trackBufferChangeTime` → `appParam_bufferUpdated`), so duplicate render ticks
  and backup‑fallback redraws are not recorded.

### `.sr` file layout (sigrok v2, matches libsigrok `srzip`)
```
version                 -> "2"
metadata                -> INI: [global] sigrok version ; [device 1] samplerate,
                           capturefile=logic-1, total probes=1, probe1=FRAME, unitsize=1,
                           total analog=1|2, analog2=CH1, analog3=CH2
logic-1-<n>             -> FRAME marker channel (1 byte/sample; 0x01 on each frame's first sample)
analog-1-2-<n>          -> CH1 samples, little-endian float32
analog-1-3-<n>          -> CH2 samples (only when CH2 recorded), little-endian float32
```
Each acquired frame is its own chunk `<n>`; PulseView concatenates them on one timeline,
and the **FRAME** logic channel pulses at each frame boundary.

### Limitations
- `.sr` carries a **single** samplerate, captured at RECORD start — changing the time/div
  mid‑recording is not reflected in the exported samplerate.
- Frames are independently triggered (~100 ms apart in wall‑clock time); they are presented
  as one contiguous timeline with the FRAME markers indicating boundaries.
- The recorded channel set (CH1, or CH1+CH2) is fixed at RECORD start.

### How it works (code)
- New globals (`appParam_isRecording`, `appParam_bufferUpdated`, `recPendingCH1/CH2`,
  `recordedFrames`, `recordSampleRate`, `recordCH2Enabled`).
- `trackBufferChangeTime()` raises `appParam_bufferUpdated` on each genuinely new frame.
- `processWaveforms()` snapshots the pre‑interpolation CH1/CH2 volts.
- `doIteration()` commits one frame after `processWaveforms()` and clears the flag.
- `toggleRecording()` / `exportRecordingSR()` build and download the `.sr` via JSZip.
- The RECORD button is enabled/disabled in `startPlotting()` / `stopPlotting()`.

---

## Needed Files

| File | Role |
|------|------|
| `DSO2512G-APP-beta10.html` + `oscilloscope_custom.ttf` | Hi‑Ban's app ([EEVblog thread](https://www.eevblog.com/forum/testgear/new-2ch-pocket-dsosg-sigpeak-dso2512g/msg5897308/#msg5897308)); copy the HTML to `app.html`. The `.ttf` provides the custom on‑screen symbols. |
| `js_analyzer.py` | Cleans/pretty‑prints (`--clean`), analyses, and (`-e`) splits `app.html` into separate JS/HTML — from [peter--s/js_tools](https://github.com/peter--s/js_tools/). |
| `app_clean.html` | **Pristine** cleaned app (no recording feature); produced by `js_analyzer.py --clean`. |
| `app_clean_extracted.js` / `app_clean_extracted.html` | Extracted JS + HTML shell (no recording feature); produced by `js_analyzer.py -e`. |
| `README.txt` | Structural report (classes, functions, variables, scope leaks, mutations) produced by `js_analyzer.py`. |
| **`app_record.html`** | The app **with** the recording feature applied (self‑contained). Produced by `apply_record_feature.py single`. |
| **`app_record_extracted.js` / `app_record_extracted.html`** | The extracted app with the feature applied. Produced by `apply_record_feature.py extracted`. |
| **`jszip.min.js`** | Stuart Knightley's JSZip 3.10.1 — builds the `.sr` ZIP in‑browser ([dist](https://github.com/Stuk/jszip/tree/main/dist)). |
| **`record_feature.patch.json`** | The patch definition (byte‑exact insertions). |
| **`apply_record_feature.py`** | Applies the patch, writing the `app_record*` outputs (inputs untouched). |
| **`favicon.ico`** | DSO icon created with piskelapp.com and xsukax‑Favicon‑Generator. Helps finding the right tab when you opened too many. |

### Generating the baseline using js_tools

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
#   report  -> README.txt

deactivate                           # (optional) leave the venv
```

With `--clean`, cleaning runs **first** and every later step uses `app_clean.html` as its input, so the
extracted files are named `app_clean_extracted.*`. The title repair — restoring the `&nbsp;` padding
that `prettify()` strips — is applied to both the cleaned HTML and the extracted HTML.

---

## The patching script

`apply_record_feature.py` reads `record_feature.patch.json` and builds the feature version as
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
- The JS insertions are matched by **unique code anchors**, which are identical in the inline
  `<script>` of `app_clean.html` and in `app_clean_extracted.js`, so the same patch applies
  to both. The RECORD button is inserted after `#button-power` with matching indentation.
- **Inputs are never modified** — the feature is written to `app_record*.` outputs; re-running
  simply rebuilds them (backing up any existing output to `<file>.bak`).
- **Idempotent guard:** the script aborts if the *input* already contains the feature.
- **JSZip:** inlined for `single` (keeps the app self‑contained/offline); referenced as a
  sibling file for `extracted`.
- **Runtime assets:** keep `oscilloscope_custom.ttf` (custom on‑screen symbols) and `favicon.ico`
  next to the HTML. For the extracted pair, also keep `app_record_extracted.js` and `jszip.min.js`
  alongside `app_record_extracted.html`.
