

        // Recording: snapshot the raw acquired frame (pre-filter, pre-averaging, pre-interpolation).
        // Anchored after the demo-mode override and after appParam_sampleRate has been recomputed,
        // so demo waveforms are captured too and the rate belongs to this frame.
        recPendingCH2 = null;
        if (appParam_isRecording && appParam_bufferUpdated) {
            recPendingCH1 = CH1rawPoints.slice();
            recPendingSettings = recSnapshotSettings(); // V/div and vertical position as of THIS frame
        }
