

        appParam_bufferUpdated = true; // Signal a genuinely new acquisition frame (consumed by the recorder after processWaveforms)
        recPendingTime = now; // arrival time of this frame, used to place it on a real wall-clock timeline
