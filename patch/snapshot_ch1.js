

        // Recording: snapshot CH1 for this frame, from the array as it is right here - after the
        // trim to the visible window, but before waveformAveraging() and before applyOffset()
        // adds the vertical position. These are acquired ADC samples; interpolation is forced off
        // while an 'acquired' recording runs, so the array is 1:1 with what the instrument sent.
        // A 'displayed' capture wants the fully processed CH1rawPoints instead and is taken later,
        // in doIteration(), because CH1rawPoints is not assigned until further down this function.
        if (appParam_isRecording && appParam_bufferUpdated) {
            recPendingCH1Acquired = currentCH1DataArray.slice();
            recPendingCH2Acquired = null; // CH2 follows below, if it is enabled at all
        }
