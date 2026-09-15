
            // Recording: the CH2 half of the acquired snapshot, at the matching point in the
            // CH2 branch - after its low-pass filter, before averaging/smoothing.
            if (appParam_isRecording && appParam_bufferUpdated) {
                recPendingCH2Acquired = currentCH2DataArray.slice();
            }
