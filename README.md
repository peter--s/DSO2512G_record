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
1. Open the app (`app_record.html`, or a patched `app_clean.html`) in Chrome/Edge (Web Serial).
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

## Files

| File | Role |
|------|------|
| `DSO2512G-APP-beta10.html` and **`oscilloscope_custom.ttf`** | **Hi-Ban's amazing app** (available at https://www.eevblog.com/forum/testgear/new-2ch-pocket-dsosg-sigpeak-dso2512g/msg5897308/#msg5897308 ). |
| `html_cleaner.py` and `js_analyzer.py` | Cleans/pretty‑prints `app.html` → `app_clean.html` and analyses `app_clean.html`; with `-e` splits it into the extracted pair, both available at https://github.com/peter--s/js_tools/ ). |
| `app_clean.html` | **Pristine** cleaned app (no recording feature). |
| `app_clean_extracted.js` / `app_clean_extracted.html` | Extracted JS + HTML shell (no recording feature). |
| `README.txt` | Structural report produced by `js_analyzer.py`. |
| **`app_record.html`** | The app **with** the recording feature already applied. |
| **`jszip.min.js`** | Stuart Knightley's JSZip 3.10.1 — used to build the `.sr` ZIP in‑browser (available at https://github.com/Stuk/jszip/tree/main/dist). |
| `record_feature.patch.json` | The patch definition (byte‑exact insertions). |
| `apply_record_feature.py` | Applies the patch to `app_clean.html` or the extracted pair. |
| **`favicon.ico`** | DSO icon created with piskelapp.com and xsukax-Favicon-Generator. Helps finding the right tab when you opened too many.|

---

### Generating the baseline using js_tools

The scripts need `beautifulsoup4` + `jsbeautifier` (`html_cleaner.py`) and
`beautifulsoup4` + `esprima` (`js_analyzer.py`).

```bash
# (optional) create & activate a virtual environment so the deps stay isolated
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# (optional) install the dependencies into the active environment
pip install beautifulsoup4 jsbeautifier esprima

# regenerate:
python3 html_cleaner.py DSO2512G-APP-beta10/DSO2512G-APP-beta10.html           # app.html            -> app_clean.html (pristine)
python3 js_analyzer.py app_clean.html -n -g -u -e > README.txt  # app_clean.html -> app_clean_extracted.js/.html + report

# (optional) leave the virtual environment when done
deactivate
```

---

## The patching script

`apply_record_feature.py` reads `record_feature.patch.json` and applies the feature to one
of two targets. **Each file is copied to `<file>.bak` before it is modified.** An icon is added to the html header unless `-n` or `--noicon` is passed.

```bash
# Patch the single self-contained file (JS + button + JSZip inlined):
python3 apply_record_feature.py single

# Patch the extracted pair:
#   - JS changes go into app_clean_extracted.js
#   - RECORD button goes into app_clean_extracted.html
#   - JSZip is referenced via <script src="jszip.min.js"> (keep jszip.min.js alongside)
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
- **Idempotent:** the script aborts (changing nothing) if the target already contains the
  feature.
- **JSZip:** inlined for `single` (keeps the app self‑contained/offline); referenced as a
  sibling file for `extracted`.
