
    // Recording: commit one frame per genuinely new acquisition (deduped via appParam_bufferUpdated).
    // processWaveforms() has just returned, so both candidate arrays are final: the acquired one was
    // captured inside it, and CH1rawPoints/CH2rawPoints are now this frame's fully processed result.
    if (appParam_isRecording && appParam_bufferUpdated) {
        if (recCaptureMode === 'displayed') {
            recPendingCH1 = CH1rawPoints.slice();
            recPendingCH2 = (appParam_CH2Enabled == 'ON' && CH2rawPoints.length) ? CH2rawPoints.slice() : null;
        } else {
            recPendingCH1 = recPendingCH1Acquired;
            recPendingCH2 = recPendingCH2Acquired;
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
