
    // Recording: commit one frame per genuinely new acquisition (deduped via appParam_bufferUpdated).
    if (appParam_isRecording && appParam_bufferUpdated) {
        recordedFrames.push({ ch1: recPendingCH1, ch2: recPendingCH2, s: recPendingSettings });
        appParam_bufferUpdated = false;
    }
