
            // Recording: the CH2 half of the acquired snapshot, at the matching point in the
            // CH2 branch - after its low-pass filter, before averaging/smoothing and invertY.
            // See snapshot_ch1 for why this point rather than the trim.
            if (appParam_isRecording && appParam_bufferUpdated) {
                recPendingCH2Acquired = currentCH2DataArray.slice();
            }
