

//--------------------- RECORDING (PulseView .sr export) --------------------------------------------------------------------------------------------------------------------//

// Toggles recording of acquired samples. RECORD (start) -> SAVE (finish, builds and downloads the .sr file).
function toggleRecording() {
    const btn = document.getElementById('button-record');
    if (!appParam_isRecording) {
        // Start recording. Only possible after START (button is disabled otherwise, but guard anyway).
        if (!isPlotting) return;
        recordedFrames = [];
        appParam_bufferUpdated = false; // start capturing from the next genuinely new frame
        recPendingCH1 = null;
        recPendingCH2 = null;
        recordSampleRate = appParam_sampleRate; // .sr carries a single samplerate; capture it now
        recordCH2Enabled = (param_CH2enabled === 1); // fix the recorded channel set at start
        appParam_isRecording = true;
        btn.textContent = "SAVE";
        btn.classList.add('button-lit');
        log("Recording started...");
    } else {
        // Finish recording and export the .sr file.
        appParam_isRecording = false;
        btn.textContent = "RECORD";
        btn.classList.remove('button-lit');
        if (recordedFrames.length > 0) {
            exportRecordingSR();
        } else {
            log("Recording stopped: no frames were captured.");
        }
        if (!isPlotting) btn.disabled = true; // plotting already stopped -> re-disable RECORD
    }
}

// Converts an array of numbers into an ArrayBuffer of little-endian IEEE-754 float32 (sigrok analog format).
function floatArrayToLEBytes(arr) {
    const buf = new ArrayBuffer(arr.length * 4);
    const dv = new DataView(buf);
    for (let i = 0; i < arr.length; i++) {
        dv.setFloat32(i * 4, arr[i], true); // true = little-endian
    }
    return buf;
}

// Formats a samplerate (Hz) as a sigrok-style string (e.g. "200 MHz"), mirroring sr_samplerate_string.
function formatSamplerate(hz) {
    hz = Math.round(hz);
    if (hz <= 0) hz = 1;
    if (hz % 1000000000 === 0) return (hz / 1000000000) + " GHz";
    if (hz % 1000000 === 0) return (hz / 1000000) + " MHz";
    if (hz % 1000 === 0) return (hz / 1000) + " kHz";
    return hz + " Hz";
}

// Builds the sigrok v2 'metadata' INI file contents.
function buildRecordingMetadata(sampleRate, ch2Enabled) {
    let m = "";
    m += "[global]\n";
    m += "sigrok version=0.5.0\n";
    m += "\n";
    m += "[device 1]\n";
    m += "samplerate=" + formatSamplerate(sampleRate) + "\n";
    m += "capturefile=logic-1\n";
    m += "total probes=1\n";
    m += "probe1=FRAME\n";
    m += "unitsize=1\n";
    m += "total analog=" + (ch2Enabled ? 2 : 1) + "\n";
    m += "analog2=CH1\n";
    if (ch2Enabled) m += "analog3=CH2\n";
    return m;
}

// Compact local timestamp YYYYMMDDThhmmss for the export filename.
function recordingTimestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "T" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

// Builds the .sr ZIP (via JSZip) from recordedFrames and triggers a download.
// Each acquired frame becomes its own chunk (analog-1-<ch>-<n>, logic-1-<n>); a FRAME logic channel
// pulses at each frame's first sample so boundaries are visible in PulseView.
function exportRecordingSR() {
    if (typeof JSZip === 'undefined') {
        log("ERROR: JSZip library not loaded; cannot build the .sr file.");
        return;
    }
    const zip = new JSZip();
    zip.file("version", "2");
    zip.file("metadata", buildRecordingMetadata(recordSampleRate, recordCH2Enabled));

    for (let i = 0; i < recordedFrames.length; i++) {
        const n = i + 1;
        const frame = recordedFrames[i];
        const ch1 = frame.ch1 || [];
        const len = ch1.length;

        // Frame-marker logic channel: 1 byte per sample, 0x01 at the frame's first sample, 0x00 elsewhere.
        const logicBytes = new Uint8Array(len);
        if (len > 0) logicBytes[0] = 0x01;
        zip.file("logic-1-" + n, logicBytes);

        // CH1 analog samples (little-endian float32).
        zip.file("analog-1-2-" + n, floatArrayToLEBytes(ch1));

        // CH2 analog samples, aligned to CH1 length (pad with 0 / truncate) so all channels share one timeline.
        if (recordCH2Enabled) {
            const ch2src = frame.ch2 || [];
            const ch2 = new Array(len);
            for (let j = 0; j < len; j++) ch2[j] = (j < ch2src.length) ? ch2src[j] : 0;
            zip.file("analog-1-3-" + n, floatArrayToLEBytes(ch2));
        }
    }

    const filename = "DSO2512G_recording_" + recordingTimestamp() + ".sr";
    zip.generateAsync({ type: "blob", compression: "DEFLATE" }).then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        log("Saved " + recordedFrames.length + " frame(s) to " + filename);
    }).catch((err) => {
        log("ERROR building .sr file: " + err.message);
    });
}
