
        // Recording: snapshot CH1 for an 'acquired' capture, taken HERE - after the low-pass
        // filter, but before averaging/smoothing, interpolation, the trim, and applyOffset.
        //
        // beta46 moved averaging and smoothing UPSTREAM of trimWaveArray(); in beta42 they ran
        // after it, so snapshotting at the trim used to exclude them. The anchor still matched
        // after the version bump, so the port silently started recording smoothed samples: a
        // Smoothing capture showed 65 distinct values spaced 0.000308 V where the raw ADC grid
        // is 0.004 V, i.e. values the instrument never sampled.
        //
        // The low-pass filter is deliberately kept: it is a measurement choice about the
        // signal, whereas averaging and smoothing combine separate acquisitions. The array is
        // untrimmed at this point, so commit_frame runs the app's own trimWaveArray() on it -
        // by then this frame's appParam_stabilizationOffset is final.
        if (appParam_isRecording && appParam_bufferUpdated) {
            recPendingCH1Acquired = currentCH1DataArray.slice();
            recPendingCH2Acquired = null; // CH2 follows below, if it is enabled at all
        }
