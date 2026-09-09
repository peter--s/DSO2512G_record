

            // Recording: the CH2 half of the acquired snapshot, at the matching point in the
            // CH2 branch. Only reached when CH2 is enabled; otherwise the null set above stands.
            if (appParam_isRecording && appParam_bufferUpdated) {
                recPendingCH2Acquired = currentCH2DataArray.slice();
            }
