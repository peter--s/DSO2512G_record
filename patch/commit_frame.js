
    // Recording: commit one frame per genuinely new acquisition (deduped via appParam_bufferUpdated).
    if (appParam_isRecording && appParam_bufferUpdated) {
        // Switching the signal source mid-recording occasionally yields a frame with no usable
        // samples: the WAV path reads a second sample per point at a fixed offset, so a buffer
        // shorter than that offset gives parseInt("") -> NaN for every point. Such a frame is
        // not an acquisition, and NaN means "no data here" in the export, so keeping it would
        // make a corrupt frame indistinguishable from dead time - and its odd length would
        // spawn a segment of its own.
        if (recFrameHasSamples(recPendingCH1) || recFrameHasSamples(recPendingCH2)) {
            recordedFrames.push({ ch1: recPendingCH1, ch2: recPendingCH2, s: recPendingSettings });
        } else {
            recDroppedFrames++;
        }
        appParam_bufferUpdated = false;
    }
