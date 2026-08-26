

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
        recPendingSettings = null;
        recordSampleRate = appParam_sampleRate; // .sr carries a single samplerate; capture it now
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

// Captures the acquisition settings in force for the frame currently being snapshotted.
// processParams() runs before processWaveforms() in doIteration(), and PRM/CH1/CH2 arrive in the
// same #WAV2 response, so these values belong to THIS frame's samples rather than a neighbour's.
function recSnapshotSettings() {
    const len = CH1rawPoints.length;
    return {
        t: recPendingTime,                  // performance.now() when the frame was detected
        sr: appParam_sampleRate,            // Sa/s for this frame
        tpd: appParam_currTPD,              // s/div
        len: len,
        trigIdx: Math.max(0, Math.min(len - 1, Math.round(appParam_timeOffset * (len - 1)))),
        src: appParam_GeneralSignalSource,
        demo: (appParam_demoMode_Enabled == 'ON'),
        acq: appParam_acquisitionMode,
        ch1: { vpd: appParam_currVPD_CH1, vpos: param_CH1trueVerticalPos / 200, probe: appParam_CH1Probe, coupling: appParam_CH1Coupling, bw: appParam_CH1BWLimit },
        ch2: { on: (param_CH2enabled === 1), vpd: appParam_currVPD_CH2, vpos: param_CH2trueVerticalPos / 200, probe: appParam_CH2Probe, coupling: appParam_CH2Coupling, bw: appParam_CH2BWLimit },
        trig: {
            src: (param_triggerCH1CH2 == 0 ? 'CH1' : 'CH2'),
            mode: appParam_triggerMode,
            edge: (param_triggerEdge == 0 ? 'rising' : 'falling'),
            level: findTriggerVolts(param_triggerCH1CH2 == 0 ? appParam_currVPD_CH1 : appParam_currVPD_CH2)
        }
    };
}

// Converts screen-normalised samples into calibrated volts.
// convertToWaveArray() yields (code - 128) / 200, i.e. a position relative to the grid CENTRE where
// 1.0 spans the full 8 vertical divisions. The channel's 0 V sits at vPosNorm in those same units, so
// subtracting it re-references the samples to ground before scaling. Mirrors the app's own
// calcMeas() ("scaleFactor = 8 * voltsPerDivision") and findTriggerVolts() ("value * 8 * voltsPerDivision").
//
// vPosNorm comes from param_CHntrueVerticalPos, not param_CHnverticalPos: the latter is clamped to
// [29, 227] so the on-screen ground arrow stays inside the grid, which is wrong past +/-4 divisions.
//
// No applyOffset() correction is needed here. Its RUN-mode delta is
// (param_CH1trueVerticalPos - last_param_CH1trueVerticalPos), and trackBufferChangeTime() assigns
// last_param_CH1trueVerticalPos = param_CH1trueVerticalPos in the very block that raises
// appParam_bufferUpdated - so on exactly the frames we record that delta is zero. applyOffset only
// drags a stale frame to follow the position knob between acquisitions.
function recToVolts(samples, voltsPerDiv, vPosNorm) {
    const vpd = (typeof voltsPerDiv === 'number' && isFinite(voltsPerDiv)) ? voltsPerDiv : 1; // getVoltsDiv() returns undefined out of range
    const pos = isFinite(vPosNorm) ? vPosNorm : 0;
    const k = 8 * vpd; // 8 vertical divisions per full scale
    const out = new Array(samples.length);
    for (let i = 0; i < samples.length; i++) out[i] = (samples[i] - pos) * k;
    return out;
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
    // The channel set is decided here rather than at RECORD start: every frame is already
    // buffered, so enabling CH2 part-way through a recording no longer loses it.
    const recAnyCH2 = recordedFrames.some((f) => f.ch2 && f.ch2.length > 0);

    const zip = new JSZip();
    zip.file("version", "2");
    zip.file("metadata", buildRecordingMetadata(recordSampleRate, recAnyCH2));

    for (let i = 0; i < recordedFrames.length; i++) {
        const n = i + 1;
        const frame = recordedFrames[i];
        const s = frame.s;
        const ch1 = frame.ch1 || [];
        const len = ch1.length;

        // Frame-marker logic channel: 1 byte per sample, 0x01 at the frame's first sample, 0x00 elsewhere.
        const logicBytes = new Uint8Array(len);
        if (len > 0) logicBytes[0] = 0x01;
        zip.file("logic-1-" + n, logicBytes);

        // CH1 analog samples in volts (little-endian float32), using the settings of THIS frame so a
        // mid-recording V/div or vertical-position change does not corrupt everything after it.
        zip.file("analog-1-2-" + n, floatArrayToLEBytes(recToVolts(ch1, s.ch1.vpd, s.ch1.vpos)));

        // CH2 analog samples, aligned to CH1's length so both channels span the same timeline
        // (libsigrok streams channels sequentially, so only the totals have to match).
        // Short or absent frames pad with NaN, never 0: after the volts fix a 0 is a real 0 V
        // reading that PulseView's autoscale would honour, whereas NaN is skipped.
        if (recAnyCH2) {
            const ch2src = recToVolts(frame.ch2 || [], s.ch2.vpd, s.ch2.vpos);
            const ch2 = new Array(len);
            for (let j = 0; j < len; j++) ch2[j] = (j < ch2src.length) ? ch2src[j] : NaN;
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
