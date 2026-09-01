

            // Recording: snapshot the raw acquired CH2 frame, anchored after the demo-mode
            // override for the same reason as CH1.
            if (appParam_isRecording && appParam_bufferUpdated) recPendingCH2 = CH2rawPoints.slice();
