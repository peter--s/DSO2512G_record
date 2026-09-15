
    // Recording: commit one frame per genuinely new acquisition (deduped via appParam_bufferUpdated).
    // processWaveforms() has just returned, so both candidate arrays are final: the acquired one was
    // captured inside it, and CH1rawPoints/CH2rawPoints are now this frame's fully processed result.
    if (appParam_isRecording && appParam_bufferUpdated) {
        if (recCaptureMode === 'displayed') {
            recPendingCH1 = CH1rawPoints.slice();
            recPendingCH2 = (appParam_CH2Enabled == 'ON' && CH2rawPoints.length) ? CH2rawPoints.slice() : null;
        } else {
            // The acquired snapshot is taken before the trim (so that it is also before
            // averaging/smoothing, which beta46 moved upstream of it), so apply the app's own
            // trim now rather than reimplementing its roll-mode, dual-channel and
            // stabilisation rules. Doing it here rather than at the snapshot means this
            // frame's appParam_stabilizationOffset is final, so the window matches the one
            // the app drew. 'acquired' forces interpolation off, so appParam_interpScale is 1
            // and the trim's interpolated widths collapse to the plain sample counts.
            recPendingCH1 = recPendingCH1Acquired ? trimWaveArray(recPendingCH1Acquired, 'CH1') : null;
            recPendingCH2 = recPendingCH2Acquired ? trimWaveArray(recPendingCH2Acquired, 'CH2') : null;
        }
        recPendingSettings = recSnapshotSettings(recPendingCH1 ? recPendingCH1.length : 0);

        // A frame with no usable samples is not an acquisition, and NaN means "no data here" in
        // the export - so keeping it would make a corrupt frame indistinguishable from dead time,
        // and its odd length would spawn a segment of its own.
        if (recFrameHasSamples(recPendingCH1) || recFrameHasSamples(recPendingCH2)) {
            recordedFrames.push({ ch1: recPendingCH1, ch2: recPendingCH2, s: recPendingSettings });
        } else {
            recDroppedFrames++;
        }
        recPendingCH1Acquired = null;
        recPendingCH2Acquired = null;
        appParam_bufferUpdated = false;
    }
