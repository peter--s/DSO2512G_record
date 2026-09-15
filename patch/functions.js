

//--------------------- RECORDING (PulseView .sr export) --------------------------------------------------------------------------------------------------------------------//

// Toggles recording of acquired samples. REC (start) -> SAVE (finish, builds and downloads the .sr file).
// Starting asks what the samples should mean, unless that was settled earlier in this session.
function toggleRecording() {
    if (!appParam_isRecording) {
        if (!isPlotting) return; // button is disabled unless plotting, but guard anyway
        if (recSkipCaptureDialog) {
            recStartRecording();
        } else {
            recShowCaptureDialog();
        }
    } else {
        recStopRecording();
    }
}

// The app's own setting is restored when the recording ends, so forcing it here is not sticky.
function recStartRecording() {
    const btn = document.getElementById('button-record');
    recSavedInterpolation = null;
    if (recCaptureMode === 'acquired' && appParam_Interpolation !== 'OFF') {
        // Interpolation runs upstream of the snapshot point, so an 'acquired' capture would
        // otherwise contain synthetic points. The app recomputes appParam_interpScale from this
        // on the next processParams(), which happens before any frame can be committed.
        recSavedInterpolation = appParam_Interpolation;
        appParam_Interpolation = 'OFF';
        recShowMessage("INTERPOLATION OFF WHILE RECORDING");
    }
    recordedFrames = [];
    appParam_bufferUpdated = false; // start capturing from the next genuinely new frame
    recPendingCH1 = null;
    recPendingCH2 = null;
    recPendingCH1Acquired = null;
    recPendingCH2Acquired = null;
    recPendingSettings = null;
    recDroppedFrames = 0;
    recordSampleRate = appParam_sampleRate; // .sr carries a single samplerate; capture it now
    appParam_isRecording = true;
    btn.textContent = "SAVE";
    btn.classList.add('button-lit');
    log("Recording started (" + recCaptureMode + ")...");
}

function recStopRecording() {
    const btn = document.getElementById('button-record');
    appParam_isRecording = false;
    btn.textContent = "REC";
    btn.classList.remove('button-lit');
    if (recSavedInterpolation !== null) {
        appParam_Interpolation = recSavedInterpolation;
        recSavedInterpolation = null;
    }
    if (recordedFrames.length > 0) {
        exportRecordingSR();
    } else {
        log("Recording stopped: no frames were captured.");
    }
    if (!isPlotting) btn.disabled = true; // plotting already stopped -> re-disable RECORD
}

// The chosen mode persists across sessions; the "don't ask again" suppression deliberately does
// not, so reloading the page always restores the question. localStorage can throw outright in a
// private window, so every access is guarded.
function recLoadCaptureMode() {
    try {
        const v = localStorage.getItem('recCaptureMode');
        if (v === 'displayed' || v === 'acquired') recCaptureMode = v;
    } catch (e) { /* keep the default */ }
}

function recSaveCaptureMode() {
    try { localStorage.setItem('recCaptureMode', recCaptureMode); } catch (e) { /* ignore */ }
}

// Builds the dialog once and reuses it. Styles are inline so the patch needs no CSS op, and the
// option explanations live in title tooltips to keep the dialog itself short.
function recShowCaptureDialog() {
    recLoadCaptureMode();
    let el = document.getElementById('record-capture-dialog');
    if (!el) {
        el = document.createElement('div');
        el.id = 'record-capture-dialog';
        el.style.cssText = "position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.55); " +
            "display:flex; align-items:center; justify-content:center; font-family:Arial; font-size:13px;";
        el.innerHTML =
            '<div style="background:#333; color:#ddd; border-radius:8px; padding:20px 22px; width:430px; ' +
            'box-shadow:0 6px 24px rgba(0,0,0,0.6);">' +
            '<div style="font-size:15px; margin-bottom:14px;">Record which samples?</div>' +
            '<label style="display:block; margin-bottom:9px; cursor:pointer;" ' +
            'title="Fully processed data, exactly as drawn: includes the low-pass filter, ' +
            'interpolation and averaging if those are selected in the GUI.">' +
            '<input type="radio" name="rec-capture-mode" value="displayed"> Record as displayed</label>' +
            '<label style="display:block; margin-bottom:14px; cursor:pointer;" ' +
            'title="Post-trim data, before averaging and before the vertical offset. Forces ' +
            'interpolation off for the duration of the recording even if it is selected in the GUI.">' +
            '<input type="radio" name="rec-capture-mode" value="acquired"> Record as acquired</label>' +
            '<label style="display:block; margin-bottom:16px; color:#aaa; cursor:pointer;" ' +
            'title="Use this choice for the rest of this session. Reload the page to be asked again.">' +
            '<input type="checkbox" id="rec-capture-skip"> Don\'t ask again this session</label>' +
            '<div style="text-align:right;">' +
            '<button id="rec-capture-cancel" style="margin-right:8px; padding:5px 14px;">Cancel</button>' +
            '<button id="rec-capture-start" style="padding:5px 14px;">Start</button>' +
            '</div></div>';
        document.body.appendChild(el);
        document.getElementById('rec-capture-cancel').onclick = function () { el.style.display = 'none'; };
        document.getElementById('rec-capture-start').onclick = function () {
            const picked = el.querySelector('input[name="rec-capture-mode"]:checked');
            recCaptureMode = picked ? picked.value : 'displayed';
            recSkipCaptureDialog = document.getElementById('rec-capture-skip').checked;
            recSaveCaptureMode();
            el.style.display = 'none';
            recStartRecording();
        };
    }
    // Pre-set to the remembered choice every time it opens.
    const radios = el.querySelectorAll('input[name="rec-capture-mode"]');
    for (let i = 0; i < radios.length; i++) radios[i].checked = (radios[i].value === recCaptureMode);
    document.getElementById('rec-capture-skip').checked = false;
    el.style.display = 'flex';
}

// True when an array holds at least one usable reading. A frame of nothing but NaN is a
// failed acquisition rather than a quiet one.
function recFrameHasSamples(arr) {
    if (!arr) return false;
    for (let i = 0; i < arr.length; i++) {
        if (isFinite(arr[i])) return true;
    }
    return false;
}

// Shows one of the recorder's own messages, which want longer on screen than the app's
// default. drawMessage() runs once per doIteration(), so seconds convert at the iteration
// interval; the override is consumed by the first draw and leaves other callers alone.
function recShowMessage(text) {
    appParam_messageFrames = Math.max(1, Math.round(recordMessageSeconds * 1000 / 100));
    showMessage(text, "ALL");
}

// Samples per second for one frame, using the app's own rule.
//
// The app now agrees: appParam_sampleRate is
//     (table_timeZoomSamples[lvl] / dualChanDiv) / 12 / currTPD
// which is algebraically this same rule, so a complete frame occupies exactly its twelve
// divisions. (It was derived from the array's own length in older app versions, and clamped,
// which is what this function was written to work around.)
//
// The count that matters is still the INTENDED one, not the array's length. In roll mode the
// app draws a partly-filled acquisition into the right-hand part of the grid rather than
// stretching it across the whole width - processForPlotting() left-pads it -
// so its pixels-per-sample works out to width / intendedSamples whatever the fill level.
// Time per sample is therefore constant while the buffer fills, which is why the display
// stays correct. Using the array length instead made one 100 Hz signal read as 16, 20 and
// 22 Hz across three consecutive partial reads of the same acquisition.
function recFrameSampleRate(s, length) {
    const tpd = (s && isFinite(s.tpd) && s.tpd > 0) ? s.tpd : 1;
    const full = (s && isFinite(s.full) && s.full >= 2) ? s.full : length;
    return (Math.max(2, full) - 1) / (12 * tpd);
}

// Captures the acquisition settings in force for the frame currently being committed.
// processParams() runs before processWaveforms() in doIteration(), and CH1/CH2 arrive in the same
// FPGA read, so these values belong to THIS frame's samples rather than a neighbour's.
function recSnapshotSettings(len) {
    // Interpolation inserts synthetic points before the trim, so a 'displayed' frame is
    // interpScale times longer than the acquisition and its samples arrive interpScale times
    // faster. 'acquired' frames are captured with interpolation forced off, so the factor is 1.
    const interp = (recCaptureMode === 'displayed' && isFinite(appParam_interpScale)) ? appParam_interpScale : 1;
    return {
        t: recPendingTime,                  // performance.now() when the frame was detected
        sr: appParam_sampleRate * interp,   // Sa/s for this frame, as captured
        tpd: appParam_currTPD,              // s/div
        len: len,
        trigIdx: Math.max(0, Math.min(len - 1, Math.round(appParam_timeOffset * (len - 1)))),
        // What the samples mean, and the grouping key: changing it mid-recording changes the
        // meaning of the numbers, so it must split a segment exactly as a rate change does.
        src: recCaptureMode,
        intended: appParam_intendedSamples,
        // How many samples a COMPLETE frame holds - the denominator of the rate - so that a
        // partial read still gets its acquisition's rate rather than one derived from its own
        // truncated length.
        //
        // Interpolation scales the INTERVALS, not the count: n samples span n-1 intervals, so
        // the interpolated count is (n-1)*interp + 1, which is exactly the app's own
        // appParam_intendedSamplesInterpolated. Multiplying the count instead added one whole
        // sample per interpolation step and made the rate 4.2% high at 2x and 6.25% at 4x -
        // a captured 10 ns/div frame reported 208,333,333 Sa/s where 200,000,000 was right,
        // stretching the timeline by the same fraction.
        full: Math.round((appParam_intendedSamples - 1) * interp) + 1,
        interpScale: interp,
        acq: appParam_acquisitionMode,
        // Display processing that was active. None of it applies to an 'acquired' capture
        // except the low-pass filter, which runs upstream of the snapshot point either way.
        proc: {
            interpolation: appParam_Interpolation,
            ch1_lpf: appParam_CH1_LPF, ch2_lpf: appParam_CH2_LPF,
            stabilize: appParam_triggerStabilize
        },
        // vpos is where this channel's 0 V sits in the captured array, which depends on WHERE the
        // capture was taken. applyOffset() adds appParam_CHnOffset absolutely, and it runs after
        // the snapshot point but before CH1rawPoints is final - so a 'displayed' frame carries the
        // vertical position and must have it subtracted back out, while an 'acquired' frame never
        // received it and is already referenced to ground.
        ch1: { vpd: appParam_currVPD_CH1, vpos: (recCaptureMode === 'displayed' ? appParam_CH1Offset : 0), probe: appParam_CH1Probe, coupling: appParam_CH1Coupling, lpf: appParam_CH1_LPF },
        ch2: { on: (appParam_CH2Enabled == 'ON'), vpd: appParam_currVPD_CH2, vpos: (recCaptureMode === 'displayed' ? appParam_CH2Offset : 0), probe: appParam_CH2Probe, coupling: appParam_CH2Coupling, lpf: appParam_CH2_LPF },
        trig: {
            src: (appParam_triggerSource == 0 ? 'CH1' : 'CH2'),
            mode: appParam_triggerMode,
            edge: (appParam_triggerEdge == 0 ? 'rising' : 'falling'),
            level: findTriggerVolts(appParam_triggerSource == 0 ? appParam_currVPD_CH1 : appParam_currVPD_CH2)
        }
    };
}

// Converts screen-normalised samples into calibrated volts.
// convertToWaveArray() yields (code - 128) / 200, i.e. a position relative to the grid CENTRE where
// 1.0 spans the full 8 vertical divisions. The channel's 0 V sits at vPosNorm in those same units, so
// subtracting it re-references the samples to ground before scaling. Mirrors the app's own
// calcMeas() ("scaleFactor = 8 * voltsPerDivision") and findTriggerVolts() ("value * 8 * voltsPerDivision").
//
// vPosNorm comes from appParam_CHnOffset, not appParam_CHnVerticalPos: the latter is clamped to
// +/-0.495 so the on-screen ground arrow stays inside the grid, which is wrong past +/-4 divisions.
// recSnapshotSettings() passes 0 for an 'acquired' capture, which is taken before applyOffset()
// and is therefore already referenced to ground; see the note there.
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
    // Every full-size gap chunk is byte-identical, so build one and hand the same buffer to
    // each entry. JSZip reads them at generateAsync() and never mutates them, which turns
    // the memory cost of dead time from O(gap length) into O(1) - the reason the budget can
    // now be generous. On disk a NaN run deflates about 1000:1 either way.
    const shared = (count === recordGapChunkSamples);
    if (shared && recNanChunk) return recNanChunk;
    const buf = new ArrayBuffer(count * 4);
    const dv = new DataView(buf);
    for (let i = 0; i < count; i++) dv.setFloat32(i * 4, NaN, true);
    if (shared) recNanChunk = buf;
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
function planRecordingTimeline(frames, sampleRate, mode, baseT0) {
    // t0 is the whole RECORDING's first frame, not this segment's, so t_ms stays comparable
    // across the files of a split recording. Passing the segment's own first frame instead is
    // what made every single-frame file report t_ms: 0 while claiming to carry its true offset.
    const t0 = (baseT0 !== undefined && baseT0 !== null) ? baseT0
             : ((frames.length && frames[0].s) ? frames[0].s.t : 0);
    const packed = (mode === "frames");
    const plan = [];
    let cursor = 0, clamped = 0;
    for (let i = 0; i < frames.length; i++) {
        const len = (frames[i].ch1 || []).length;
        const t = frames[i].s ? frames[i].s.t : 0;
        let start;
        if (packed) {
            start = cursor; // back to back: the dead time between acquisitions is not represented
        } else {
            start = Math.round(((t - t0) / 1000) * sampleRate);
            if (!isFinite(start) || start < cursor) {
                if (isFinite(start) && start < cursor) clamped++;
                start = cursor; // frames cannot overlap
            }
        }
        plan.push({ frame: frames[i], start: start, gap: start - cursor, len: len });
        cursor = start + len;
    }

    // The budget is not about file size - a NaN run deflates about 1000:1, and a 12 s recording
    // at 100 MS/s came to under 10 MB on disk. It is about the samples every consumer has to
    // walk: that same file took libsigrok 6.6 minutes to read, against 0.1 s for the same
    // frames packed back to back. Over the budget the caller re-plans in "frames" mode.
    // When most frames had to be clamped they are already back to back, so the layout IS
    // packed - calling it "realtime" makes the sample count read as a duration it never had.
    // One 137 s capture at 10 s/div reported 226,955 samples at 20 Sa/s: 11,348 s, 83x too long.
    const clampedLayout = !packed && plan.length > 1 && clamped >= plan.length / 2;
    return {
        plan: plan, total: cursor, mode: (packed || clampedLayout) ? "frames" : "realtime",
        clamped: clamped, t0: t0,
        oversize: !packed && cursor > recordMaxTimelineSamples
    };
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
function buildRecordingSidecar(timeline, ch2Enabled, warnings, segIndex, segCount, sampleRate) {
    const chan = (nth, name) => ({ name: name, entry_base: recordAnalogBase(nth), unit: "V" });
    const chanSettings = (cfg) => ({
        vpd: cfg.vpd, vpos: cfg.vpos, probe: cfg.probe, coupling: cfg.coupling, lpf: cfg.lpf
    });

    // Which capture modes appear here. Normally one: the mode is fixed when RECORD is pressed
    // and is a grouping key, so a change starts a new segment rather than mixing meanings.
    const modes = [];
    timeline.plan.forEach((p) => {
        const m = (p.frame.s || {}).src;
        if (m && modes.indexOf(m) === -1) modes.push(m);
    });
    const anyDisplayed = modes.indexOf("displayed") !== -1;

    const frames = timeline.plan.map((p, i) => {
        const s = p.frame.s || {};
        const out = {
            n: i + 1,
            start_sample: p.start,
            length: p.len,
            gap_before: p.gap,
            t_ms: s.t !== undefined ? (s.t - timeline.t0) : null,
            trigger_sample: s.trigIdx !== undefined ? s.trigIdx : null,
            samplerate: s.sr, tpd: s.tpd, intended_samples: s.intended,
            capture_mode: s.src, acquisition_mode: s.acq,
            interp_scale: s.interpScale, display_processing: s.proc
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
        samplerate: Math.round(sampleRate),
        samplerate_exact: sampleRate,
        samplerate_string: formatSamplerate(sampleRate),
        // A 'displayed' capture is what the app draws, so if interpolation was on it carries
        // synthetic points between the acquired ones and the rate counts display points per
        // second rather than ADC samples. intended_samples on each frame gives the real
        // acquisition length, and interp_scale the factor between them.
        samplerate_is_display_points: anyDisplayed,
        samplerate_estimated: false,

        sample_count: timeline.total,
        frame_count: frames.length,

        timeline: {
            mode: timeline.mode,
            gap_fill: "NaN",
            clamped_frames: timeline.clamped,
            max_samples: recordMaxTimelineSamples,
            note: "Frame times are arrival timestamps, so placement is accurate to about one acquisition interval."
        },

        // Baked into every sample by convertToWaveArray(). Deliberately not removed - they are
        // what makes the export agree with the scope's own readouts.
        app_calibration: {
            verticalScale: verticalScale,
            verticalOffsetCH1: verticalOffsetCH1,
            verticalOffsetCH2: verticalOffsetCH2,
            applies_to: "all frames"
        },
        capture_modes: modes,
        volts_formula: "volts = (raw - vpos) * 8 * vpd",

        channels: channels,
        frames: frames,
        warnings: warnings || []
    };
}

// Reassembles a rolling acquisition that was read repeatedly into one continuous stream.
//
// At 200 ms/div and slower the scope rolls: it keeps one acquisition running and the app
// re-reads it every ~200 ms. Consecutive frames are therefore one acquisition seen through a
// sliding window - measured on hardware, frame N+1 equals frame N shifted by exactly the
// arrival interval, to a mean difference of 0.0000 V. Writing them as separate frames
// duplicates most of the samples onto a timeline that cannot hold them.
//
// How many samples at the end of `prev` the following read contradicts.
//
// While a slow acquisition fills, the scope reports slightly more samples than have settled:
// measured over one 500 ms/div fill cycle the last ~20 samples of a read are revised by the
// next one, on every read whose sample count grew by 160 or 192 and on none that grew by
// 128. Those samples hold plausible voltages with transitions missing, which merges two
// pulses into one wide one - the visible symptom.
//
// Returns the count, so it can be excluded from comparisons and trimmed from the final read
// of a cycle, which has no successor to correct it. Nothing here assumes a size; it is
// measured from the recording, and so belongs to that instrument and timebase.
function recFrontierSize(prev, next, shift) {
    const overlap = next.length - shift;
    const base = prev.length - overlap;
    if (overlap <= 0 || base < 0) return 0;
    // The unsettled samples are scattered, not contiguous - in one measured pair only 6 of
    // the last 20 actually differ - so the frontier is everything from the FIRST disagreement
    // to the end. Counting back from the last one instead would report a handful of samples
    // and leave the merged pulses in place.
    for (let i = 0; i < overlap; i++) {
        const a = prev[base + i], b = next[i];
        const same = (isNaN(a) && isNaN(b)) || (!isNaN(a) && !isNaN(b) && Math.abs(a - b) <= 1e-6);
        if (!same) return overlap - i;
    }
    return 0;
}

// True when `next` is `prev` advanced by `shift` samples: the tail of prev must equal the
// head of next. A still-filling acquisition is the same test with shift = next.length -
// prev.length, which compares prev against next's head - so one rule covers both.
//
// `slack` samples at the end of prev are excluded, because a read's unsettled tail is
// revised by the very read being compared against. `startSkip` ignores that many samples at
// the head: trimWaveArray() prepends a duplicate of sample 0 whenever a read's length is
// exactly 1200, 601, 600, 481 or 480, to make the count odd so the trigger lands on the
// centre sample. That is right for a complete acquisition, but a filling buffer sweeps
// through those lengths and gets the pad spuriously, offsetting one read by a sample.
function recOverlapMatches(prev, next, shift, slack, startSkip) {
    slack = slack || 0;
    startSkip = startSkip || 0;
    const overlap = next.length - shift - slack;
    const base = prev.length - (next.length - shift);
    if (overlap - startSkip < 32 || base < 0) return false;
    const step = Math.max(1, Math.floor((overlap - startSkip) / 256));
    for (let i = startSkip; i < overlap; i += step) {
        const a = prev[base + i], b = next[i];
        if (isNaN(a) !== isNaN(b)) return false;
        if (!isNaN(a) && Math.abs(a - b) > 1e-6) return false;
    }
    return true;
}

// Searches outward from the shift the timestamps predict; the first match wins. A timestamp
// cannot be trusted to the sample, and a periodic signal cannot be aligned by content alone,
// so neither is used without the other.
//
// An exact match is tried before any tolerance, so a clean pair is recognised as clean and
// no allowance is spent that the data does not call for. Only when that fails are the two
// known hazards allowed: an unsettled tail of up to `maxSlack`, and the one-sample offset
// trimWaveArray() can introduce. The allowance is capped against the overlap so short reads
// keep enough to compare.
function recFindOverlapShift(prev, next, expected, maxSlack) {
    // The shift that makes prev a prefix of next is tried alongside the timestamp's guess.
    // While the screen fills, the count grows by a varying amount either side of the average
    // - 128, 192, 160 repeating in one measured cycle - so a narrow window around the
    // average misses two reads in every three.
    const prefixShift = next.length - prev.length;
    const span = Math.max(64, Math.round(next.length * 0.05));
    const slack = Math.min(maxSlack || 0, Math.floor(next.length / 8));
    const attempts = [[0, 0], [0, 1]];
    if (slack > 0) attempts.push([slack, 0], [slack, 1]);
    for (let t = 0; t < attempts.length; t++) {
        const seeds = (prefixShift > 0 && prefixShift !== expected)
            ? [expected, prefixShift] : [expected];
        for (let sdx = 0; sdx < seeds.length; sdx++) {
            for (let d = 0; d <= span; d++) {
                const candidates = (d === 0) ? [seeds[sdx]] : [seeds[sdx] - d, seeds[sdx] + d];
                for (let c = 0; c < candidates.length; c++) {
                    const k = candidates[c];
                    if (k <= 0 || k > next.length) continue;
                    if (recOverlapMatches(prev, next, k, attempts[t][0], attempts[t][1])) return k;
                }
            }
        }
    }
    return -1;
}

function stitchRollingFrames(frames, sampleRate) {
    if (!recordStitchRollingFrames || frames.length < 2) {
        return { frames: frames, stitched: 0, dropped: 0, trimmed: 0 };
    }
    const out = [];
    let stitched = 0, dropped = 0, worstFrontier = 0;
    for (let i = 0; i < frames.length; i++) {
        const cur = frames[i];
        const prev = out.length ? out[out.length - 1] : null;
        const sameRun = prev && prev.s && cur.s &&
            prev.s.tpd === cur.s.tpd && prev.s.src === cur.s.src;
        if (!sameRun) {
            out.push({ ch1: cur.ch1, ch2: cur.ch2, s: cur.s, tLast: cur.s ? cur.s.t : 0 });
            continue;
        }
        const a = prev.ch1 || [], b = cur.ch1 || [];

        // Acquisitions that CANNOT overlap are not a failed match. At a fast time/div a frame
        // covers 12 x tpd of signal - 24 us at 10 ns/div - but still arrives only every ~80 ms,
        // so consecutive reads are separate triggered acquisitions thousands of times further
        // apart in time than they are long. No shift could align them: the search would reject
        // every candidate as k > next.length and the zero-advance test would reject the content.
        // Skipping them here saves that futile work and, more importantly, keeps the diagnostic
        // below meaningful - it should name pairs that ought to have matched, not every frame of
        // a fast-timebase capture.
        const dtSamples = Math.round(((cur.s.t || 0) - (prev.tLast || 0)) / 1000 * sampleRate);
        if (isFinite(dtSamples) && dtSamples - Math.max(64, Math.round(b.length * 0.05)) > b.length) {
            out.push({ ch1: cur.ch1, ch2: cur.ch2, s: cur.s, tLast: cur.s ? cur.s.t : 0 });
            continue;
        }
        // Start from what this cycle has already shown, with a modest ceiling until it has
        // shown anything. An exact match is always attempted first, so this is only spent
        // on pairs that genuinely need it.
        const slack = Math.max(worstFrontier, 32);
        const dtMs = (cur.s.t || 0) - (prev.tLast || 0);
        let shift = recFindOverlapShift(a, b, Math.round(dtMs / 1000 * sampleRate), slack);
        if (shift < 0 && b.length > a.length) {
            const k = b.length - a.length;
            const cap = Math.min(slack, Math.floor(b.length / 8));
            if (recOverlapMatches(a, b, k, 0, 0) || recOverlapMatches(a, b, k, 0, 1) ||
                (cap > 0 && (recOverlapMatches(a, b, k, cap, 0) || recOverlapMatches(a, b, k, cap, 1)))) {
                shift = k;
            }
        }
        // A poll landing inside one sample period brings no new samples, so the window has not
        // advanced and the read is the same data again: the shift is 0. That happens where the
        // sample period is comparable to the poll interval - at 10 s/div the rate is 20 Sa/s,
        // one sample every 50 ms, against turbo polls measured at 32-42 ms - so it appears at
        // the slowest timebase and nowhere faster.
        //
        // Nothing above covers shift 0: recFindOverlapShift() skips k <= 0, and the filling
        // branch needs b.length > a.length. The length test here is <=, not ===, because once
        // the screen is full `prev` is the ACCUMULATED stream and grows with every merge while
        // each fresh read stays exactly appParam_intendedSamples long. The instrumented capture
        // showed precisely that: cur=2401 every time against prev=2403..2508, dt=32-42ms,
        // expect=1. Requiring equal lengths caught only the filling phase and left the sliding
        // phase breaking once per ~75 reads, each break costing a whole frame.
        if (shift < 0 && a.length > 0 && b.length <= a.length) {
            const cap = Math.min(slack, Math.floor(b.length / 8));
            if (recOverlapMatches(a, b, 0, 0, 0) ||
                (cap > 0 && recOverlapMatches(a, b, 0, cap, 0))) {
                shift = 0; // same window: the newer read supersedes the older one wholesale
            }
        }
        if (shift >= 0) {
            const f = recFrontierSize(a, b, shift);
            if (f > worstFrontier && f < a.length / 4) worstFrontier = f;
            const overlapLen = b.length - shift;
            const subsumed = (a.length <= overlapLen);
            // The newer read is authoritative wherever the two overlap - it is the one that
            // corrected the older read's unsettled tail - so keep only what precedes the
            // overlap and take the rest from it.
            prev.ch1 = a.slice(0, Math.max(0, a.length - overlapLen)).concat(b);
            if (prev.ch2 && cur.ch2) {
                const ov2 = cur.ch2.length - shift;
                prev.ch2 = prev.ch2.slice(0, Math.max(0, prev.ch2.length - ov2)).concat(cur.ch2);
            }
            prev.tLast = cur.s.t;
            if (subsumed) dropped++; else stitched++;
            continue;
        }
        // Why the chain broke. Each break costs a whole extra frame, so a 1% failure rate
        // fragments a recording badly - and offline replay of the exported frames has twice
        // failed to reproduce a live break, which means the geometry at the moment of failure
        // is the thing to capture rather than infer.
        if (recStitchFailures.length < 12) {
            recStitchFailures.push({
                i: i, lenPrev: a.length, lenCur: b.length, grew: b.length - a.length,
                dtMs: Math.round(dtMs), expect: Math.round(dtMs / 1000 * sampleRate),
                slack: slack, worst: worstFrontier
            });
        }
        out.push({ ch1: cur.ch1, ch2: cur.ch2, s: cur.s, tLast: cur.s ? cur.s.t : 0 });
    }

    // The last read of a cycle has no successor, so its own tail was never corrected. Trim it
    // by the largest frontier this cycle actually showed; if none was seen, leave it alone and
    // let the sidecar say the tail is unverified.
    let trimmed = 0;
    if (worstFrontier > 0 && out.length) {
        const last = out[out.length - 1];
        if (last.ch1 && last.ch1.length > worstFrontier * 4) {
            last.ch1 = last.ch1.slice(0, last.ch1.length - worstFrontier);
            if (last.ch2 && last.ch2.length > worstFrontier) {
                last.ch2 = last.ch2.slice(0, last.ch2.length - worstFrontier);
            }
            trimmed = worstFrontier;
        }
    }
    return { frames: out, stitched: stitched, dropped: dropped, trimmed: trimmed };
}

// Groups consecutive frames by acquisition setting rather than by samplerate.
//
// Stitching has to happen before the rate split, not after: partial reads of a filling
// buffer differ in length and therefore in rate, so splitting first puts every one of them
// in a run of its own and the stitcher never sees a pair to join.
function groupByAcquisition(frames) {
    const runs = [];
    for (let i = 0; i < frames.length; i++) {
        const s = frames[i].s;
        const key = s ? (s.src + "@" + s.tpd) : "?";
        if (!runs.length || runs[runs.length - 1].key !== key) runs.push({ key: key, frames: [] });
        runs[runs.length - 1].frames.push(frames[i]);
    }
    return runs;
}

// The rate of the underlying acquisition for a group, taken from its fullest read - during
// the filling phase a frame is short only because the buffer has not caught up yet.
function recGroupSampleRate(frames) {
    let longest = 0, s = null;
    for (let i = 0; i < frames.length; i++) {
        const n = (frames[i].ch1 || []).length;
        if (n > longest) { longest = n; s = frames[i].s; }
    }
    return recFrameSampleRate(s, longest);
}

// Splits the captured frames into runs of constant samplerate.
//
// A .sr carries exactly one samplerate, and srzip has no notion of segments, so a recording
// that spans a time/div change cannot be one file without misrepresenting part of it. A change
// also invalidates the gap arithmetic, which converts milliseconds to samples. Splitting is the
// honest option: each run becomes its own correctly-described file.
function splitRecordingBySamplerate(frames) {
    const runs = [];
    for (let i = 0; i < frames.length; i++) {
        const rate = recFrameSampleRate(frames[i].s, (frames[i].ch1 || []).length);
        if (!runs.length || runs[runs.length - 1].sampleRate !== rate) {
            runs.push({ sampleRate: rate, frames: [] });
        }
        runs[runs.length - 1].frames.push(frames[i]);
    }
    return runs;
}

// Builds one .sr ZIP (via JSZip) for a run of frames and triggers a download.
//
// Frames are laid out at their real wall-clock offsets with the dead time between acquisitions
// filled with NaN, so the gaps are the frame boundaries and no marker channel is needed. Chunks
// must be numbered contiguously from 1 per channel: the reader walks base-1, base-2, ... and
// stops at the first one missing, so a hole would silently truncate the capture.
function buildRecordingSegment(frames, sampleRate, segIndex, segCount, stamp, mode, baseT0) {
    // The channel set is decided here rather than at RECORD start: every frame is already
    // buffered, so enabling CH2 part-way through a recording no longer loses it.
    const recAnyCH2 = frames.some((f) => f.ch2 && f.ch2.length > 0);
    const timeline = planRecordingTimeline(frames, sampleRate, mode, baseT0);

    const zip = new JSZip();
    zip.file("version", "2");
    zip.file("metadata", buildRecordingMetadata(sampleRate, recAnyCH2));

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
    if (timeline.clamped > 0) {
        warnings.push(timeline.clamped + " frame(s) overlapped in wall-clock time and were placed back to back.");
        log("NOTE: " + warnings[warnings.length - 1] + " A frame spans 12 x time/div of signal, " +
            "which at slow timebases can exceed the interval between acquisitions.");
    }
    // A frame carrying NaN among real readings is a mismatched channel pair, not dead time.
    // In single-channel mode DataBuffer2 interleaves CH2's and CH1's samples to double the
    // rate, indexing both by CH1's count; if CH2's data is shorter, parseInt('', 16) yields
    // NaN for the CH2-derived positions of the tail. The app guards the case where CH2 is
    // entirely absent but not this one, so such a frame reaches the export looking like
    // absent data. NaN means "no acquisition here" in this file, so say otherwise here.
    let holed = 0;
    timeline.plan.forEach((p) => {
        const src = p.frame.ch1 || [];
        let seenValue = false, seenGap = false;
        for (let i = 0; i < src.length; i++) {
            if (isNaN(src[i])) seenGap = true; else seenValue = true;
        }
        if (seenValue && seenGap) holed++;
    });
    if (holed > 0) {
        warnings.push(holed + " frame(s) contain NaN among real readings. That is a mismatched " +
            "CH1/CH2 pair rather than dead time - in single-channel mode the two are interleaved " +
            "and a short CH2 leaves gaps in its half of the tail - so those samples are missing " +
            "data, not an interval when nothing was acquired.");
        log("WARNING: " + warnings[warnings.length - 1]);
    }
    if (sampleRate < 1) {
        warnings.push("The frames here work out below 1 Sa/s (" + sampleRate.toFixed(4) + "), " +
            "which a .sr cannot express - its samplerate is a whole number of Hz - so the file " +
            "says 1 Hz and its timeline is stretched by that much. A very slow time/div read " +
            "before the acquisition filled produces this.");
        log("WARNING: " + warnings[warnings.length - 1]);
    }
    if (timeline.mode === "frames") {
        warnings.push("Frames are packed back to back, NOT at their true times: placing them at " +
            "their real offsets would have needed more than " + recordMaxTimelineSamples +
            " samples per channel, nearly all of it empty. Every acquired sample is here and each " +
            "frame's intra-frame timebase is correct, but the dead time between acquisitions is " +
            "not represented. Each frame's t_ms gives its true offset within the recording.");
    }
    if (segCount > 1) {
        warnings.push("This is segment " + segIndex + " of " + segCount + ". A .sr carries a single " +
            "samplerate and one meaning of 'sample', so a recording is split whenever either " +
            "changes. t_ms is an offset into the whole recording, not into this file.");
    }
    zip.file("dso2512g-recording.json",
        JSON.stringify(buildRecordingSidecar(timeline, recAnyCH2, warnings, segIndex, segCount, sampleRate), null, 2));

    const filename = "DSO2512G_recording_" + stamp +
        (segCount > 1 ? "_seg" + segIndex : "") + ".sr";
    return { zip: zip, filename: filename, frames: frames.length, timeline: timeline };
}

// Hands one blob to the browser as a download.
function downloadRecordingBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Builds one segment and downloads it on its own.
function exportRecordingSegment(frames, sampleRate, segIndex, segCount, stamp, mode, baseT0) {
    const built = buildRecordingSegment(frames, sampleRate, segIndex, segCount, stamp, mode, baseT0);
    return built.zip.generateAsync({ type: "blob", compression: "DEFLATE" }).then((blob) => {
        downloadRecordingBlob(blob, built.filename);
        log("Saved " + built.frames + " frame(s), " + built.timeline.total +
            " samples/channel (" + built.timeline.mode + ") to " + built.filename);
    }).catch((err) => {
        log("ERROR building " + built.filename + ": " + err.message);
    });
}

// Builds every segment and delivers them as one .zip.
//
// Browsers cap how many downloads a single user gesture may start, and they do it by
// silently dropping the rest: a recording that split thirty ways delivered ten files and
// said nothing. One archive is one download, so nothing can go missing. The .sr files
// inside still open in PulseView once extracted.
function exportRecordingBundle(segments, stamp, mode, baseT0) {
    const outer = new JSZip();
    const filename = "DSO2512G_recording_" + stamp + "_segments.zip";
    let chain = Promise.resolve();
    let total = 0;
    segments.forEach((seg, i) => {
        chain = chain.then(() => {
            const built = buildRecordingSegment(seg.frames, seg.sampleRate, i + 1,
                                                segments.length, stamp, mode, baseT0);
            total += built.frames;
            // Already-deflated members; storing them again would only cost time.
            return built.zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
                .then((bytes) => { outer.file(built.filename, bytes); });
        });
    });
    return chain
        .then(() => outer.generateAsync({ type: "blob", compression: "STORE" }))
        .then((blob) => {
            downloadRecordingBlob(blob, filename);
            log("Saved " + segments.length + " segments (" + total + " frame(s)) to " +
                filename + ". Extract it to get the .sr files.");
            recShowMessage("Saved " + segments.length + " segments in one .zip");
        })
        .catch((err) => {
            log("ERROR building " + filename + ": " + err.message);
        });
}

// Exports the recording, as one .sr or as one per samplerate run.
function exportRecordingSR() {
    if (typeof JSZip === 'undefined') {
        log("ERROR: JSZip library not loaded; cannot build the .sr file.");
        return;
    }
    if (recDroppedFrames > 0) {
        log("Skipped " + recDroppedFrames + " frame(s) that held no usable samples. Switching the " +
            "signal source mid-recording can yield one of these.");
    }

    // Stitch per acquisition setting, before any rate split - see groupByAcquisition().
    let frames = [];
    let stitched = 0, prefixes = 0;
    recStitchFailures = []; // once for the whole recording, not once per group
    groupByAcquisition(recordedFrames).forEach((run) => {
        const r = stitchRollingFrames(run.frames, recGroupSampleRate(run.frames));
        stitched += r.stitched; prefixes += r.dropped;
        frames = frames.concat(r.frames);
    });
    if (stitched > 0) {
        log("Reassembled " + (stitched + 1) + " reads of a rolling acquisition into one continuous " +
            "stream; the overlap between them was identical, so only the new samples were kept.");
    }
    if (prefixes > 0) {
        log("Dropped " + prefixes + " partial read(s) of an acquisition that was still filling; " +
            "each was a prefix of the read that followed.");
    }
    if (recStitchFailures.length > 0) {
        log("STITCH DIAG: " + recStitchFailures.map(function (f) {
            return "#" + f.i + " prev=" + f.lenPrev + " cur=" + f.lenCur + " grew=" + f.grew +
                   " dt=" + f.dtMs + "ms expect=" + f.expect + " slack=" + f.slack +
                   " worst=" + f.worst;
        }).join(" | "));
    }

    let segments = splitRecordingBySamplerate(frames);

    // t0 for the whole recording, so every file's t_ms is an offset into the same recording
    // rather than into its own segment.
    const baseT0 = (frames.length && frames[0].s) ? frames[0].s.t : 0;

    // Over budget, pack the frames back to back instead. An oscilloscope frame covers
    // 12 x time/div of signal but arrives every ~100 ms, so at a fast time/div realtime
    // placement is almost entirely NaN: measured on a 12 s capture at 100 MS/s, one honest
    // timeline came to 1.21e9 samples/channel - only 9.9 MB on disk, since a NaN run deflates
    // about 1000:1, but 6.6 MINUTES for libsigrok to read. The same frames packed back to back
    // are 293k samples, 152 kB, and load in 0.1 s. What is lost is the spacing between
    // acquisitions, which at that duty cycle conveys almost nothing and is preserved exactly
    // in each frame's t_ms anyway.
    let timelineMode = "realtime";
    if (segments.some((seg) => planRecordingTimeline(seg.frames, seg.sampleRate, "realtime", baseT0).oversize)) {
        timelineMode = "frames";
        const realtimeTotal = segments.reduce((n, seg) =>
            n + planRecordingTimeline(seg.frames, seg.sampleRate, "realtime", baseT0).total, 0);
        log("Placing these frames at their true times would need " + realtimeTotal +
            " samples/channel, past the " + recordMaxTimelineSamples + " budget - almost all of it " +
            "empty, because each frame covers 12 x time/div but arrives every ~100 ms. Writing them " +
            "back to back instead: every acquired sample is kept and each frame's t_ms still gives " +
            "its true offset, but the dead time between acquisitions is not represented. Record at a " +
            "slower time/div for a real timeline.");
        recShowMessage("Frames packed back to back - see the log");
    }

    const stamp = recordingTimestamp();
    if (segments.length > 1) {
        // Say what actually differs. Segments are split by samplerate and by capture mode, and
        // claiming a rate change when every segment shares a rate sends people looking for a
        // fault that is not there.
        const rates = [];
        const modes = [];
        segments.forEach((s) => {
            if (rates.indexOf(s.sampleRate) === -1) rates.push(s.sampleRate);
            const m = (s.frames[0] && s.frames[0].s) ? s.frames[0].s.src : null;
            if (m && modes.indexOf(m) === -1) modes.push(m);
        });
        let why;
        if (rates.length > 1 && modes.length > 1) {
            why = "the samplerate and the capture mode both changed";
        } else if (rates.length > 1) {
            why = "the samplerate changed (it follows the time/div and the channel mode)";
        } else if (modes.length > 1) {
            why = "the capture mode changed";
        } else {
            why = "the frames could not share one timeline";
        }
        log("Writing " + segments.length + " files because " + why +
            "; a .sr carries a single samplerate and one meaning of 'sample'.");
        recShowMessage(segments.length + " files - " + why);
    }
    // A recording that fragments into many one-frame files is almost always a slow timebase
    // rather than someone turning the knob repeatedly. At 200 ms/div and slower the scope
    // rolls, and a screen cannot be complete until 12 x time/div has elapsed, so each read
    // returns a partially filled buffer. Every differing length reads back as a differing
    // samplerate, so each becomes its own segment. Say so, because ten downloads with
    // implausible rates on them is otherwise a baffling thing to be handed.
    if (segments.length > 4 && segments.every((s) => s.frames.length === 1)) {
        log("NOTE: every one of these " + segments.length + " files holds a single frame, which " +
            "means each read reported a different samplerate. At a slow time/div the acquisition " +
            "is read while it is still filling, so the frame length grows with each read and the " +
            "rate describes how full the buffer was rather than how fast it was sampled.");
        recShowMessage("Slow time/div - samplerates describe buffer fill, not sampling rate");
    }
    // Past a handful, deliver one archive instead of many downloads. A browser will stop
    // starting downloads well before thirty and will not say that it did.
    if (segments.length > recordMaxSeparateDownloads) {
        log("That is more files than a browser will reliably download; bundling them into " +
            "one .zip instead so none are dropped.");
        return exportRecordingBundle(segments, stamp, timelineMode, baseT0);
    }
    // Sequential rather than concurrent: browsers throttle bursts of programmatic downloads.
    let chain = Promise.resolve();
    segments.forEach((seg, i) => {
        chain = chain.then(() => exportRecordingSegment(
            seg.frames, seg.sampleRate, i + 1, segments.length, stamp, timelineMode, baseT0));
    });
    return chain;
}
