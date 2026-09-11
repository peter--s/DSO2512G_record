

// Variables for recording acquired samples into a sigrok .sr file (for PulseView import)
let appParam_isRecording = false; // true while a recording is active (RECORD pressed, showing SAVE)
let appParam_bufferUpdated = false; // raised by trackBufferChangeTime() on each genuinely new frame, consumed by the recorder
let recPendingCH1 = null; // raw normalised (grid-centre referenced) snapshot of the current new frame (CH1)
let recPendingCH2 = null; // ditto CH2, or null when CH2 was off for this frame
let recPendingSettings = null; // acquisition settings in force for the frame being snapshotted (see recSnapshotSettings)
let recPendingTime = 0; // performance.now() when the current new frame was detected
let recordedFrames = []; // array of captured frames: { ch1: number[], ch2: number[]|null, s: settings }
let recordSampleRate = 1; // samplerate captured at RECORD start (Sa/s); .sr carries a single samplerate
const recordEmitTriggerChannel = false; // true -> also emit a TRIG logic channel (shifts CH1/CH2 to analog-1-2/3)
const recordMaxTimelineSamples = 50000000; // per channel; above this each frame becomes its own file (see README)
const recordGapChunkSamples = 1048576; // gap runs are split into chunks of this many samples (libsigrok's CHUNKSIZE)
let recNanChunk = null; // one shared all-NaN chunk, reused for every full-size gap
const recordMaxSeparateDownloads = 8; // beyond this many segments, deliver one .zip instead (browsers drop excess downloads silently)
const recordStitchRollingFrames = true; // reassemble a rolling acquisition read repeatedly into one continuous stream
const recordMessageSeconds = 5; // how long the recorder's own on-screen messages stay up
let appParam_messageFrames = 0; // one-shot override for the next message's countdown (0 = the app's own default)
let recDroppedFrames = 0; // frames discarded because they held no usable samples
let recStitchFailures = []; // geometry of the first few pairs the stitcher could not match
// What the samples in the export mean. 'acquired' = the post-trim array, before averaging and
// before the vertical offset - real ADC samples. 'displayed' = CH1rawPoints, i.e. what is drawn,
// including the low-pass filter, interpolation and averaging. Chosen per recording; also the
// grouping key, so switching it mid-recording starts a new segment rather than mixing meanings.
let recCaptureMode = 'displayed';
let recSkipCaptureDialog = false; // "don't ask again this session"; deliberately NOT persisted
let recSavedInterpolation = null; // the app's own setting, restored when an 'acquired' recording ends
let recPendingCH1Acquired = null; // post-trim CH1 for this frame, captured before averaging/offset
let recPendingCH2Acquired = null; // ditto CH2
