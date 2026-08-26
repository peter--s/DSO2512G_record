

            // Recording: snapshot the raw acquired (pre-interpolation) CH2 volts before further processing.
            if (appParam_isRecording && appParam_bufferUpdated) recPendingCH2 = CH2rawPoints.slice();
