

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

// Number of logic channels in the export. Analog channels are created after the logic ones
// (session_file.c), and the reader builds entry names as analog-1-<num_logic + n>
// (session_driver.c), so this one value drives both the metadata keys and the file names.
function recordNumLogicChannels() {
    return recordEmitTriggerChannel ? 1 : 0;
}

// Zip entry base for an analog channel: 1 = CH1, 2 = CH2.
function recordAnalogBase(nth) {
    return "analog-1-" + (recordNumLogicChannels() + nth);
}

// Builds the sigrok v2 'metadata' INI file contents.
// Key order matters: libsigrok walks the keys in file order and counts logic channels
// before numbering the analog ones, so "total probes" must precede "total analog".
function buildRecordingMetadata(sampleRate, ch2Enabled) {
    let m = "";
    m += "[global]\n";
    m += "sigrok version=0.5.0\n";
    m += "\n";
    m += "[device 1]\n";
    m += "samplerate=" + formatSamplerate(sampleRate) + "\n";
    if (recordEmitTriggerChannel) {
        m += "capturefile=logic-1\n";
        m += "total probes=1\n";
        m += "probe1=TRIG\n";
        m += "unitsize=1\n";
    }
    m += "total analog=" + (ch2Enabled ? 2 : 1) + "\n";
    m += "analog" + (recordNumLogicChannels() + 1) + "=CH1\n";
    if (ch2Enabled) m += "analog" + (recordNumLogicChannels() + 2) + "=CH2\n";
    return m;
}

// Builds an ArrayBuffer of `count` little-endian float32 NaNs - the dead time between two
// acquisitions. NaN rather than 0 because 0 is a real voltage; NaN is skipped by PulseView's
// min/max accumulation and renders as absent data. Long NaN runs compress to almost nothing.
function nanRunToLEBytes(count) {
    const buf = new ArrayBuffer(count * 4);
    const dv = new DataView(buf);
    for (let i = 0; i < count; i++) dv.setFloat32(i * 4, NaN, true);
    return buf;
}

// Places each captured frame at its true wall-clock offset and returns the layout.
//
// An oscilloscope does not produce a continuous sample stream: each frame is a separate
// triggered acquisition, and gluing them back to back invents a timeline that never existed.
// Frames carry the performance.now() at which they were detected, so they can be laid out at
// their real offsets with the dead time left empty.
//
// Two honest limitations, both reported back to the caller:
//   - the timestamp is arrival time, so placement is good to about one acquisition interval;
//   - a frame spans 12 * TPD of signal but arrives every few hundred ms, so at slow timebases
//     frames overlap in wall-clock and the layout necessarily collapses to back to back.
function planRecordingTimeline(frames, sampleRate) {
    const t0 = (frames.length && frames[0].s) ? frames[0].s.t : 0;
    const plan = [];
    let cursor = 0, clamped = 0;
    for (let i = 0; i < frames.length; i++) {
        const len = (frames[i].ch1 || []).length;
        const t = frames[i].s ? frames[i].s.t : 0;
        let start = Math.round(((t - t0) / 1000) * sampleRate);
        if (!isFinite(start) || start < cursor) {
            if (isFinite(start) && start < cursor) clamped++;
            start = cursor; // frames cannot overlap
        }
        plan.push({ frame: frames[i], start: start, gap: start - cursor, len: len });
        cursor = start + len;
    }

    // The budget is on uncompressed samples: a NaN run costs nothing on disk but is fully
    // materialised here, in the browser, and again in whatever opens the file.
    let mode = "realtime";
    if (cursor > recordMaxTimelineSamples) {
        cursor = 0;
        for (let i = 0; i < plan.length; i++) {
            plan[i].gap = 0;
            plan[i].start = cursor;
            cursor += plan[i].len;
        }
        mode = "concatenated";
    }
    return { plan: plan, total: cursor, mode: mode, clamped: clamped, t0: t0 };
}

// Compact local timestamp YYYYMMDDThhmmss for the export filename.
function recordingTimestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "T" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

// Builds the companion settings file carried inside the .sr.
//
// The sigrok session format has room for a samplerate, channel names and nothing else - no
// V/div, no coupling, no probe factor, no trigger, no per-frame anything. libsigrok looks its
// zip entries up by name and never enumerates the archive, so an extra entry is ignored by
// PulseView while still travelling with the capture. Everything the format cannot express,
// and everything needed to check the conversion after the fact, goes here.
function buildRecordingSidecar(timeline, ch2Enabled, warnings, segIndex, segCount) {
    const chan = (nth, name) => ({ name: name, entry_base: recordAnalogBase(nth), unit: "V" });
    const chanSettings = (cfg) => ({
        vpd: cfg.vpd, vpos: cfg.vpos, probe: cfg.probe, coupling: cfg.coupling, bwlimit: cfg.bw
    });

    const frames = timeline.plan.map((p, i) => {
        const s = p.frame.s || {};
        const out = {
            n: i + 1,
            start_sample: p.start,
            length: p.len,
            gap_before: p.gap,
            t_ms: s.t !== undefined ? (s.t - timeline.t0) : null,
            trigger_sample: s.trigIdx !== undefined ? s.trigIdx : null,
            samplerate: s.sr, tpd: s.tpd,
            signal_source: s.src, demo: s.demo, acquisition_mode: s.acq
        };
        if (s.ch1) out.ch1 = chanSettings(s.ch1);
        if (s.ch2) {
            out.ch2 = chanSettings(s.ch2);
            out.ch2.present = !!(p.frame.ch2 && p.frame.ch2.length > 0);
        }
        if (s.trig) {
            out.trigger = { source: s.trig.src, mode: s.trig.mode, edge: s.trig.edge, level_v: s.trig.level };
        }
        return out;
    });

    const channels = [chan(1, "CH1")];
    if (ch2Enabled) channels.push(chan(2, "CH2"));

    return {
        format: "dso2512g-recording/1",
        generator: "DSO2512G web app - RECORD/SAVE",
        created: new Date().toISOString(),
        segment: { index: segIndex, count: segCount },

        // .sr stores the samplerate as an integer number of Hz, so a rate like 92.593 Hz is
        // written as "92 Hz". Keep the unrounded value for anyone reconstructing timing.
        samplerate: Math.round(recordSampleRate),
        samplerate_exact: recordSampleRate,
        samplerate_string: formatSamplerate(recordSampleRate),

        sample_count: timeline.total,
        frame_count: frames.length,

        timeline: {
            mode: timeline.mode,
            gap_fill: "NaN",
            clamped_frames: timeline.clamped,
            max_samples: recordMaxTimelineSamples,
            note: "Frame times are arrival timestamps, so placement is accurate to about one acquisition interval."
        },

        // Baked into every sample by convertToWaveArray(); recorded so downstream analysis can
        // account for them. They are what makes the export agree with the scope's own readouts,
        // so they are deliberately not removed.
        app_calibration: {
            verticalScale: verticalScale,
            verticalOffsetCH1: verticalOffsetCH1,
            verticalOffsetCH2: verticalOffsetCH2
        },
        volts_formula: "volts = (raw - vpos) * 8 * vpd",

        channels: channels,
        frames: frames,
        warnings: warnings || []
    };
}

// Builds the .sr ZIP (via JSZip) from recordedFrames and triggers a download.
//
// Frames are laid out at their real wall-clock offsets with the dead time between acquisitions
// filled with NaN, so the gaps are the frame boundaries and no marker channel is needed. Chunks
// must be numbered contiguously from 1 per channel: the reader walks base-1, base-2, ... and
// stops at the first one missing, so a hole would silently truncate the capture.
function exportRecordingSR() {
    if (typeof JSZip === 'undefined') {
        log("ERROR: JSZip library not loaded; cannot build the .sr file.");
        return;
    }
    // The channel set is decided here rather than at RECORD start: every frame is already
    // buffered, so enabling CH2 part-way through a recording no longer loses it.
    const recAnyCH2 = recordedFrames.some((f) => f.ch2 && f.ch2.length > 0);
    const timeline = planRecordingTimeline(recordedFrames, recordSampleRate);

    const zip = new JSZip();
    zip.file("version", "2");
    zip.file("metadata", buildRecordingMetadata(recordSampleRate, recAnyCH2));

    const baseCH1 = recordAnalogBase(1);
    const baseCH2 = recordAnalogBase(2);
    let chunkNo = 0;

    // Emits one chunk across every channel at once, keeping their numbering in lockstep.
    // trigAt is the sample index of the trigger within this chunk, or -1 for none.
    const emitChunk = (ch1Bytes, ch2Bytes, count, trigAt) => {
        chunkNo++;
        zip.file(baseCH1 + "-" + chunkNo, ch1Bytes);
        if (recAnyCH2) zip.file(baseCH2 + "-" + chunkNo, ch2Bytes);
        if (recordEmitTriggerChannel) {
            const logicBytes = new Uint8Array(count);
            if (trigAt >= 0 && trigAt < count) logicBytes[trigAt] = 0x01;
            zip.file("logic-1-" + chunkNo, logicBytes);
        }
    };

    for (let i = 0; i < timeline.plan.length; i++) {
        const p = timeline.plan[i];
        const s = p.frame.s;
        const ch1 = p.frame.ch1 || [];

        // Dead time before this frame, split so no single chunk gets unwieldy.
        let remaining = p.gap;
        while (remaining > 0) {
            const count = Math.min(remaining, recordGapChunkSamples);
            emitChunk(nanRunToLEBytes(count), nanRunToLEBytes(count), count, -1);
            remaining -= count;
        }

        // CH1 analog samples in volts (little-endian float32), using the settings of THIS frame so a
        // mid-recording V/div or vertical-position change does not corrupt everything after it.
        const ch1Bytes = floatArrayToLEBytes(recToVolts(ch1, s.ch1.vpd, s.ch1.vpos));

        // CH2 analog samples, aligned to CH1's length so both channels span the same timeline
        // (libsigrok streams channels sequentially, so only the totals have to match).
        // Short or absent frames pad with NaN, never 0: after the volts fix a 0 is a real 0 V
        // reading that PulseView's autoscale would honour, whereas NaN is skipped.
        let ch2Bytes = null;
        if (recAnyCH2) {
            const ch2src = recToVolts(p.frame.ch2 || [], s.ch2.vpd, s.ch2.vpos);
            const ch2 = new Array(p.len);
            for (let j = 0; j < p.len; j++) ch2[j] = (j < ch2src.length) ? ch2src[j] : NaN;
            ch2Bytes = floatArrayToLEBytes(ch2);
        }
        emitChunk(ch1Bytes, ch2Bytes, p.len, s.trigIdx);
    }

    const warnings = [];
    if (timeline.mode === "concatenated") {
        warnings.push("Timeline exceeded " + recordMaxTimelineSamples + " samples/channel; gaps dropped and frames concatenated.");
        log("WARNING: " + warnings[warnings.length - 1]);
        showMessage("Recording too long for a real timeline - frames concatenated", "ALL");
    } else if (timeline.clamped > 0) {
        warnings.push(timeline.clamped + " frame(s) overlapped in wall-clock time and were placed back to back.");
        log("NOTE: " + warnings[warnings.length - 1] + " A frame spans 12 x time/div of signal, " +
            "which at slow timebases exceeds the interval between acquisitions.");
    }
    zip.file("dso2512g-recording.json",
        JSON.stringify(buildRecordingSidecar(timeline, recAnyCH2, warnings, 1, 1), null, 2));

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
        log("Saved " + recordedFrames.length + " frame(s), " + timeline.total + " samples/channel (" + timeline.mode + ") to " + filename);
    }).catch((err) => {
        log("ERROR building .sr file: " + err.message);
    });
}
