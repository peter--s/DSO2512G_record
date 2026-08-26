

// Variables for recording acquired samples into a sigrok .sr file (for PulseView import)
let appParam_isRecording = false; // true while a recording is active (RECORD pressed, showing SAVE)
let appParam_bufferUpdated = false; // raised by trackBufferChangeTime() on each genuinely new frame, consumed by the recorder
let recPendingCH1 = null; // pre-interpolation calibrated-volts snapshot of the current new frame (CH1)
let recPendingCH2 = null; // pre-interpolation calibrated-volts snapshot of the current new frame (CH2, or null)
let recordedFrames = []; // array of captured frames: { ch1: number[], ch2: number[]|null }
let recordSampleRate = 1; // samplerate captured at RECORD start (Sa/s); .sr carries a single samplerate
let recordCH2Enabled = false; // whether CH2 was enabled at RECORD start (fixes the recorded channel set)
