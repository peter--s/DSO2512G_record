

// Variables for recording acquired samples into a sigrok .sr file (for PulseView import)
let appParam_isRecording = false; // true while a recording is active (RECORD pressed, showing SAVE)
let appParam_bufferUpdated = false; // raised by trackBufferChangeTime() on each genuinely new frame, consumed by the recorder
let recPendingCH1 = null; // raw normalised (grid-centre referenced) snapshot of the current new frame (CH1)
let recPendingCH2 = null; // ditto CH2, or null when CH2 was off for this frame
let recPendingSettings = null; // acquisition settings in force for the frame being snapshotted (see recSnapshotSettings)
let recPendingTime = 0; // performance.now() when the current new frame was detected
let recordedFrames = []; // array of captured frames: { ch1: number[], ch2: number[]|null, s: settings }
let recordSampleRate = 1; // samplerate captured at RECORD start (Sa/s); .sr carries a single samplerate
let recordCH2Enabled = false; // whether CH2 was enabled at RECORD start (fixes the recorded channel set)
