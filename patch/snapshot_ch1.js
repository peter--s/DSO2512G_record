

        // Recording: snapshot the raw acquired (pre-interpolation) calibrated volts before further processing overwrites CH1rawPoints.
        recPendingCH2 = null;
        if (appParam_isRecording && appParam_bufferUpdated) recPendingCH1 = CH1rawPoints.slice();
