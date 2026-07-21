/* --- SCRIPT BLOCK BOUNDARY 1 --- */
//---------------------------- GLOBAL VARIABLES-------------------------------------------------------------------------------------------------------------------------------------------//

// APP CALIBRATION VALUES: Adjust these so everything looks fine in the app
const verticalScale = 1; // Adjust vertical scaling to calibrate the waveform amplitude. Should not be necessary, but it's there just in case.
const verticalOffsetCH1 = 0.005; // Adjust the CH1 offset, so the waveforms are properly centered in the grid. (accepts values from -1 to 1) Only for the DataBuffer waveforms.
const verticalOffsetCH2 = 0.008; // Adjust the CH2 offset, so the waveforms are properly centered in the grid. (accepts values from -1 to 1) Only for the DataBuffer waveforms.

const workingWaveformRes = 1201; // Adjust the working resolution for interpolated waveforms in the app. WARNING! high numbers will translate in poor performance! default: 1201

// Demo mode variables
let appParam_demoMode_Enabled = 'OFF';
let appParam_demoMode_CH1shape = 'sine';
let appParam_demoMode_CH1noise = 0.0;
let appParam_demoMode_CH1cycles = 6;
let appParam_demoMode_CH1amplitude = 1.3;
let appParam_demoMode_CH1phase = 0;
let appParam_demoMode_CH1samples = 1201;
let appParam_demoMode_CH2shape = 'sine';
let appParam_demoMode_CH2noise = 0.0;
let appParam_demoMode_CH2cycles = 6;
let appParam_demoMode_CH2amplitude = 1.3;
let appParam_demoMode_CH2phase = 0;
let appParam_demoMode_CH2samples = 1201;

// Global variables used for serial communication
let port, reader, writer;
let reconnecting = false;
let reconnectTimeout = null;
let commandsToSend = [];
let responseBuffer = '';
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

let dataResolver; // New promise resolver for new WAV2 data format
let versionResolver;
let buttonCommandQueue = []; // Queue for button commands to prevent interference with data acquisition
let isDataAcquisitionInProgress = false; // Flag to indicate when PRM, CH1, CH2 data acquisition is in progress
let isPlotting = false;
let plotInterval = null;
let logEntries = [];

let iterateInterval = null; // main iteration delay

let currentPRMData = ''; // buffer for parameter data
let currentCH1Data = ''; // buffer for CH1 data
let currentCH2Data = ''; // buffer for CH2 data

let backupPRMData = ''; // backup data for parameters
let backupCH1Data = ''; // backup data for CH1
let backupCH2Data = ''; // backup data for CH2

// Waveform channel arrays
let CH1rawPoints = [];
let CH2rawPoints = [];
let FFTrawPoints = [];
let MATH1rawPoints = [];
let REFrawPoints = [];

//Global variables for the grid margins
let gridLeftMargin = 25;
let gridRightMargin = 25;
let gridTopMargin = 30;
let gridBottomMargin = 66;
let gridInterMargin = 15;
// Grid bounds array used by the "drawGrid" function to store the grid bounds data
let gridBoundsArray = [];

// Object to store intervals for repeated commands
const buttonIntervals = {};

// Variables for tracking buffer change time
let previousPlotBuffer1 = ''; // Store the previous plotBuffer for comparison
let timeLastChange = null; // Timestamp of the last buffer change
let elapsedTimeText = '0 ms'; // Text to display elapsed time between buffer changes

// Variables for recording acquired samples into a sigrok .sr file (for PulseView import)
let appParam_isRecording = false; // true while a recording is active (RECORD pressed, showing SAVE)
let appParam_bufferUpdated = false; // raised by trackBufferChangeTime() on each genuinely new frame, consumed by the recorder
let recPendingCH1 = null; // pre-interpolation calibrated-volts snapshot of the current new frame (CH1)
let recPendingCH2 = null; // pre-interpolation calibrated-volts snapshot of the current new frame (CH2, or null)
let recordedFrames = []; // array of captured frames: { ch1: number[], ch2: number[]|null }
let recordSampleRate = 1; // samplerate captured at RECORD start (Sa/s); .sr carries a single samplerate
let recordCH2Enabled = false; // whether CH2 was enabled at RECORD start (fixes the recorded channel set)

// Lookup table for intended number of samples at a given time zoom level (DataBuffer2). For 1-Channel mode and 2-Channel mode.
const table_timeZoomSamples = [
    [0, 0, 12, 24, 48, 120, 240, 480, 1200, 2400, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800, 4800],
    [0, 0, 0, 12, 24, 60, 120, 240, 600, 1200, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400, 2400]
];

// Lookup table for Time-Per-Division values (2-30)
const table_TPD = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    ["", "", "5.00ns", "10.0ns", "20.0ns", "50.0ns", "100ns", "200ns", "500ns", "1.00µs", "2.00µs", "5.00µs", "10.0µs", "20.0µs", "50.0µs", "100µs", "200µs", "500µs", "1.00ms", "2.00ms", "5.00ms", "10.0ms", "20.0ms", "50.0ms", "100ms", "200ms", "500ms", "1.00s", "2.00s", "5.00s", "10.0s"],
    [0, 0, 0.000000005, 0.000000010, 0.000000020, 0.000000050, 0.000000100, 0.000000200, 0.000000500, 0.000001, 0.000002, 0.000005, 0.000010, 0.000020, 0.000050, 0.000100, 0.000200, 0.000500, 0.001, 0.002, 0.005, 0.010, 0.020, 0.050, 0.100, 0.200, 0.500, 1.00, 2.00, 5.00, 10.0]
];

// Lookup table for Volts-Per-Division values (4-19)
const table_VPD = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    ["500µV", "1.00mV", "2.00mV", "5.00mV", "10.0mV", "20.0mV", "50.0mV", "100mV", "200mV", "500mV", "1.00V", "2.00V", "5.00V", "10.0V", "20.0V", "50.0V", "100V", "200V", "500V", "1.00KV"],
    [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1.00, 2.00, 5.00, 10.0, 20.0, 50.0, 100, 200, 500, 1000]
];

// Lookup table for Watts-Per-Division values (0-18)
const table_WPD = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    ["1.00mW", "2.00mW", "5.00mW", "10.0mW", "20.0mW", "50.0mW", "100mW", "200mW", "500mW", "1.00W", "2.00W", "5.00W", "10.0W", "20.0W", "50.0W", "100W", "200W", "500W", "1.00KW"],
    [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.10, 0.20, 0.50, 1.00, 2.00, 5.00, 10.0, 20.0, 50.0, 100, 200, 500, 1000]
];

// Lookup table for dB-Per-Division values (0-5)
const table_dBPD = [
    [0, 1, 2, 3, 4, 5],
    ["1dB", "2dB", "5dB", "10dB", "20dB", "50dB"],
    [1.00, 2.00, 5.00, 10.0, 20.0, 50.0]
];

// Global variables used by the "waveformAveraging" function for storing previous waveform captures to do averaging
let avgStep01 = null,
    avgStep02 = null,
    avgStep03 = null,
    avgStep04 = null,
    avgStep05 = null,
    avgStep06 = null,
    avgStep07 = null,
    avgStep08 = null,
    avgStep09 = null,
    avgStep10 = null,
    avgStep11 = null,
    avgStep12 = null,
    avgStep13 = null,
    avgStep14 = null,
    avgStep15 = null,
    avgStep16 = null,
    avgStep17 = null,
    avgStep18 = null,
    avgStep19 = null,
    avgStep20 = null,
    avgStep21 = null,
    avgStep22 = null,
    avgStep23 = null,
    avgStep24 = null,
    avgStep25 = null,
    avgStep26 = null,
    avgStep27 = null,
    avgStep28 = null,
    avgStep29 = null,
    avgStep30 = null,
    avgStep31 = null,
    avgStep32 = null;
let avgStep01b = null,
    avgStep02b = null,
    avgStep03b = null,
    avgStep04b = null,
    avgStep05b = null,
    avgStep06b = null,
    avgStep07b = null,
    avgStep08b = null,
    avgStep09b = null,
    avgStep10b = null,
    avgStep11b = null,
    avgStep12b = null,
    avgStep13b = null,
    avgStep14b = null,
    avgStep15b = null,
    avgStep16b = null,
    avgStep17b = null,
    avgStep18b = null,
    avgStep19b = null,
    avgStep20b = null,
    avgStep21b = null,
    avgStep22b = null,
    avgStep23b = null,
    avgStep24b = null,
    avgStep25b = null,
    avgStep26b = null,
    avgStep27b = null,
    avgStep28b = null,
    avgStep29b = null,
    avgStep30b = null,
    avgStep31b = null,
    avgStep32b = null;

// Global variables used by the "getMeasurements" function for storing waveform measurements
let meas_frequency = '';
let meas_period = '';
let meas_periodPlus = '';
let meas_periodMinus = '';
let meas_dutyCycle = '';
let meas_dutyCycleMinus = '';
let meas_vMin = '';
let meas_vMax = '';
let meas_peakToPeak = '';
let meas_vBase = '';
let meas_vTop = '';
let meas_amplitude = '';
let meas_vMid = '';
let meas_overShoot = '';
let meas_preShoot = '';
let meas_rms = '';
let meas_mean = '';

// Global variables used by the Message function. 
let appParam_message = '';
let appParam_messageChannel = 'CH1';
let appParam_lastMessage = '';
let appParam_messageCountdown = 0;

// oscilloscope parameter values (sent by the oscilloscope)
let param_stopRun = 0; //byte   0 - STOP(0) RUN(1) SINGLE SHOT WAIT (2)
let param_CH2enabled = 0; //byte   2 - CH2 OFF(0) ON(1)
let param_timeZoomLvl = 0; //byte  20 - Time zoom level (2-30) (5ns=2 10s=30)    
let param_triggerCH1CH2 = 0; //byte  64 - Trigger CH1 (0) CH2 (1)
let param_triggerMode = 0; //byte  65 - Trigger Mode AUTO (0) NORMAL (1)
let param_triggerEdge = 0; //byte  66 - Trigger up (0) down (1)
let param_triggerLvlAutoManual = 0; //byte  67 - AUTO(0) MANUAL(1)
let param_triggerlevel = 128; //byte  72 - trigger level current channel (0-255) center (128) ????
let param_CH1voltsZoom = 0; //byte  74 - CH1 volts zoom level (4-13) (base values: 10mV=4 10v=13) must be multiplied by its channel's x1/x10/x100!!!
let param_CH1verticalPos = 128; //bytes 80/81 - CH1 vertical position (processed to scale it to the same value range as param_triggerlevel, for simplicity)
let param_CH1DCAC = 0; //byte 116 - CH1 DC(0) AC(1)
let param_CH1x1x10x100 = 0; //byte 117 - CH1 1x(0) 10x(1) 100x(2)
let param_CH2voltsZoom = 0; //byte 140 - CH2 volts zoom level (4-13) (base values: 10mV=4 10v=13) must be multiplied by its channel's x1/x10/x100!!!
let param_CH2verticalPos = 128; //bytes 148/149 - CH2 vertical position (processed to scale it to the same value range as param_triggerlevel, for simplicity)
let param_CH2DCAC = 0; //byte 180 - CH2 DC(0) AC(1)
let param_CH2x1x10x100 = 0; //byte 181 - CH2 1x(0) 10x(1) 100x(2)
let param_XYModeEnabled = 0; //byte 249 - XY mode disabled (0) enabled (1)
let param_sigGenEnabled = 0; //byte 250 - signal generator disabled (0) enabled (1)
let param_selectedChannel = 0; //byte 284 - current selected channel CH1(0) CH2(1)
let param_trigger_edit = 0; //byte 286 - trigger edit mode disabled (0)  enabled (1) ????
let param_oscMenuPage = 0; //byte 287 - oscilloscope menu flags: no menu (0), normal menu (1), waveform generator menu (4), 50% menu (8)

// Global variables used to track horizontal positions and limits
let appParam_previous_CH2enabled = 0;
let appParam_previous_stopRun = 0;
let appParam_previous_timeZoomLvl = 0;
let appParam_horizontalCurrentPos = 0;
let appParam_horizontalWindowWidth = 0;
let appParam_horizontalTriggerPoint = 0;
let appParam_horizontalSnapshotPointOffset = 0;
let appParam_horizontalSnapshotPoint = 0;
let appParam_horizontalLimitLeft = 0;
let appParam_horizontalLimitRight = 0;
let appParam_horizontalLimitLeftSnapshot = 0;
let appParam_horizontalLimitRightSnapshot = 0;
let appParam_horizontalSnapshotZoomLvl = 0;
let appParam_timeArrowPosition = 0.5; // position of the time arrow in the grid
let appParam_timeOffset = 0.5; // Time offset value, to calculate grid marking values

//global variables used to track last updated parameters
let last_param_timeZoomLvl = 0;
let last_param_CH1trueVerticalPos = 128;
let last_param_CH1voltsZoom = 0;
let last_param_CH2trueVerticalPos = 128;
let last_param_CH2voltsZoom = 0;

let appParam_CH1SnapshotVerticalPos = 128;
let appParam_CH2SnapshotVerticalPos = 128;

// App parameters, set from the app itself
let appParam_GeneralSignalSourceMode = 'Auto';
let appParam_GeneralSignalSource = 'DataBuffer';
let appParam_CommandDelay = 100;
let appParam_previousGridMode = 'none'; //Global variable to track grid changes
let appParam_previousGridRightMargin = 25; //Global variable to track grid changes
let appParam_gridsToDraw = 1; //Global variable to track grid changes
let appParam_previousGridsToDraw = 0; //Global variable to track grid changes
let appParam_menuForceDraw = 0; // Global variable to force redraw the menu into the canvas
let appParam_menuForceDelete = 0; // Global variable to force delete the menu from the canvas
let appParam_REFEnabled = 0; // Global variable to track the state of the REF waveform
let appParam_REFTPD = 1; // Global variable to track the time-per-division state when the REF snapshot was taken
let appParam_REFVPD = 1; // Global variable to track the volts-per-division state when the REF snapshot was taken
let appParam_REFForceUpdate = 0; // Global variable to force redraw the REF waveform
let appParam_currTPD = 0.001; // current time-per-division (real value, in seconds)
let appParam_currVPD_CH1 = 0.5; // current CH1 volts-per-division (real value, in volts)
let appParam_currVPD_CH2 = 0.5; // current CH2 volts-per-division (real value, in volts)
let appParam_mathVerticalPos = 0; // position of the MATH1 channel arrow
let appParam_sampleRate = 1; // Calculated sample rate
let appParam_selectedChannel = 'NONE'; // used by the app to set which channel is the "selected" one
let appParam_force50percent = 0; // Used as a workaround to make the 50% button work
let appParam_isFirmwareVersionValid = 0;
let appParam_XYmode = 'OFF';
let appParam_intendedSamples = 4801;
let appParam_intendedDrawnSamples = 4801;
let appParam_intendedDrawnSamplesInterpolated = 4801;


// Trigger variables
let appParam_triggerMode = 0;
let appParam_triggerLvlAutoManual = 0;
let appParam_force50percentTrigger = 0;
// Variables for the trigger line
let appParam_lastTriggerPos = 0;
let appParam_triggerLineCountdown = 0;

// Menu page variable
let appParam_menuPage = 0; //Global variable for current Menu page
// 1 Display variables
let appParam_gridMode = 'Lines'; // Possible values: 'Lines', 'Dots'
let appParam_displayMode = 'Overlay'; // Possible values: 'Overlay', 'Stacked'
let appParam_lineThickness = '1px';
// 2 FFT variables
let appParam_FFTEnabled = 'OFF';
let appParam_FFTSource = 'CH1';
let table_FFTSource = ["CH1", "CH2", "MATH1", "REF"];
let appParam_FFTWindow = 'Rectangle';
let table_FFTWindow = ["Rectangle", "Hann", "Hamming", "Blackman", "Nuttall", "Bkmn-Nuttall", "Bkmn-Harris", "Flattop", "Kaiser", "Bartlett", "Gaussian"];
let appParam_FFTZoom = '1x';
let table_FFTZoom = ["1x", "2x", "4x", "8x", "16x", "32x"];
let appParam_FFTZoomPos = 0;
let appParam_FFTFindPeaks = 3;
let appParam_FFTPeakUnits = 'Frequency';
let appParam_FFTScale = 'V(Peak)';
let table_FFTScale = [
    ["V(Peak)", "V(RMS)", "W(Power)", "dB", "dBV", "dBm", "dBW", "Phase"],
    ["V", "V", "W", "dB", "dBV", "dBm", "dBW", "°"]
];
let appParam_FFTUnits = 'V'; // possible values: None, V, W, dB..
let appParam_FFT_VPD = 10;
let appParam_FFT_WPD = 3;
let appParam_FFT_dBPD = 4;
let appParam_FFTImpedance = [1, 'MΩ', 1000000, '001 MΩ'];
let appParam_FFTOffset = 0;
let appParam_FFTVerticalPos = 0;
let appParam_FFTStandard = 'RF';
let appParam_FFTAnalysis = null;
let appParam_FFTMeasurements = null;
// 3 Acquisition variables
let appParam_acquisitionMode = 'Sample';
let appParam_acquisitionModeSteps = 2;
let table_acquisitionModeSteps = [2, 4, 8, 16, 32];
let appParam_Interpolation = 'Linear';
let table_Interpolation = ["OFF", "Linear", "PCHIP", "Makima", "Cubic", "Lanczos", "Sinc"];
// 4 CH1 variables
let appParam_CH1Coupling = 'AC';
let appParam_CH1Probe = '10x';
let appParam_CH1BWLimit = 'OFF';
let appParam_CH1BWLimitValue = [20, 'MHz', 20000000, '020 MHz'];
// 5 CH2 variables
let appParam_CH2Enabled = 'OFF';
let appParam_forceSelectCH2 = 0;
let appParam_CH2Coupling = 'AC';
let appParam_CH2Probe = '10x';
let appParam_CH2BWLimit = 'OFF';
let appParam_CH2BWLimitValue = [20, 'MHz', 20000000, '020 MHz'];
// 6 Math variables
let appParam_mathEnabled = 'OFF';
let appParam_mathSelected = 0;
let appParam_mathOperation = 'A+B';
let table_mathOperation = ["A+B", "A-B", "A*B", "A/B", "Intg(A)"];
let appParam_mathSourceA = 'CH1';
let appParam_mathSourceB = 'CH2';
let table_mathSource = ["CH1", "CH2", "REF"];
let appParam_mathVoltsZoom = 10;
let appParam_mathOffset = 0;
// 7 Cursor variables
let appParam_cursorMode = 'OFF';
let table_cursorMode = ["OFF", "Manual", "Track"];
let appParam_cursorSource = 'CH1';
let table_cursorSource = ["CH1", "CH2", "MATH1", "FFT"];
let appParam_cursorSelected = 'X1';
let table_cursorSelected = ["X1", "X2", "X1+X2", "Y1", "Y2", "Y1+Y2"];
let table_cursorSelectedTrack = ["X1", "X2", "X1+X2"];
let appParam_cursorX1Pos = 0.167; // total range: 0-1
let appParam_cursorX2Pos = 0.833;
let appParam_cursorY1Pos = 128 - 49.5; //total range: 29-227
let appParam_cursorY2Pos = 128 + 49.5;
let appParam_cursorX1Val = 0;
let appParam_cursorX2Val = 0;
let appParam_cursorY1Val = 0;
let appParam_cursorY2Val = 0;
let appParam_cursorDX = 0;
let appParam_cursorDY = 0;
let appParam_cursor1divDX = 0;
let appParam_cursorRefLvl = 'Middle'; // Middle or Offset

// 8 Measurement variables
let appParam_Meas = ["", "Frequency", "Period", "DutyCycle", "PKPK", "Amplitude", "RMS", "Mean", "RiseTime"]; // Enabled measurements
let table_Meas = [ // List of all available measurements
    ["None", "Frequency", "Period", "Period+", "Period-", "DutyCycle", "DutyCycle-", "Min", "Max", "PKPK", "Base", "Mid", "Top", "Amplitude", "RMS", "PeriodRMS", "Mean", "PeriodMean", "RiseTime", "FallTime", "Overshoot+", "Overshoot-", "ROvershoot", "FOvershoot", "RPreshoot", "FPreshoot", "(2CH)FRR", "(2CH)FFF", "(2CH)FRF", "(2CH)FFR", "(2CH)LRR", "(2CH)LRF", "(2CH)LFR", "(2CH)LFF", "(2CH)Phase"], // Measurement name as seen in the menu
    ["", "Freq:", "T:", "T+:", "T-:", "Duty:", "Duty-:", "Min:", "Max:", "PKPK:", "Base:", "Mid:", "Top:", "Amp:", "RMS:", "pRMS:", "Mean:", "pMean:", "Rise:", "Fall:", "Ovr+:", "Ovr-:", "ROvr:", "FOvr:", "RPre:", "FPre:", "FRR:", "FFF:", "FRF:", "FFR:", "LRR:", "LRF:", "LFR:", "LFF:", "Phase:"], // Measurement name as seen in display
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""] // Measurement value (gets updated when "getMeasurements" is called)
];

// Multipurpose wheel variables
let appParam_wheelFunction = 'MathScale'; // used for several stuff. Cursors take priority over other uses.
// Multipurpose wheel symbols: Ď = Enabled, ď = disabled.

// Array for the menu Labels
let labels_Menu = [
    ["Not used"],
    ["Display", "Grid Type", "Display Mode", "Line Thickness", "", "", "", "", ""], // 1 
    ["FFT", "Enable", "Source", "Ď Impedance  ", "Mode", "Window", "Find Peaks", "Peak Value", ""], // 2
    ["Acquisition", "Mode", "Avg Steps", "Interpolation", "", "", "", "", ""], // 3
    ["Channel 1", "Coupling", "Probe", "LP Filter", "Ď Filter Freq  ", "", "", "", ""], // 4
    ["Channel 2", "Enable", "Coupling", "Probe", "LP Filter", "Ď Filter Freq  ", "", "", ""], // 5
    ["Math", "Enable", "Operation", "Source A", "Source B", "", "", "", ""], // 6
    ["Cursor", "Mode", "Source", "Ref Lvl", "Cursor", "", "", "", ""], // 7
    ["Measure", "Meas 1", "Meas 2", "Meas 3", "Meas 4", "Meas 5", "Meas 6", "Meas 7", "Meas 8"] // 8
]; // Ď and ď = big and small wheel symbols
let labels_MenuOptionValues = ["Placeholder0", "Placeholder1", "Placeholder2", "Placeholder3", "Placeholder4", "Placeholder5", "Placeholder6", "Placeholder7", "Placeholder8"]; // the menu uses the values on this array to display the current selected values for the different options


//-------------------- LOG RELATED FUNCTIONS -----------------------------------------------------------------------------------

function log(message) {
    const logMode = document.getElementById('logMode').value;
    if (logMode === 'responses' && !message.startsWith('Received:')) return;

    logEntries.push(message);
    if (logEntries.length > 100) logEntries.shift();
    const logDiv = document.getElementById('log');
    logDiv.textContent = logEntries.join('\n');
    logDiv.scrollTop = logDiv.scrollHeight;
}

function clearLog() {
    logEntries = [];
    document.getElementById('log').textContent = '';
}

//---------------------------- SERIAL COMMUNICATION RELATED FUNCTIONS --------------------------------------------------------------------------------------------------------------------//

// Connects to the oscilloscope and starts listening
async function connectSerial(reconnect = false) {
    try {
        if (reconnect) {
            const ports = await navigator.serial.getPorts();
            if (ports.length > 0) port = ports[0];
            else throw new Error("No previously selected ports available");
        } else if (!port) {
            port = await navigator.serial.requestPort({});
        }
        const baudRate = 115200;
        await port.open({
            baudRate: baudRate,
            bufferSize: 512000
        });
        log(`Connected to serial port at ${baudRate} baud${reconnect ? " (reconnected)" : ""}`);
        reader = port.readable.getReader();
        writer = port.writable.getWriter();
        document.getElementById('toggleConnectBtn').textContent = "DISCONNECT";
        document.getElementById('toggleConnectBtn').classList.add("button-connect-lit");
        document.getElementById('commandInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('sendTxtBtn').disabled = false;
        document.getElementById('button-power').disabled = false;
        document.querySelectorAll('.control-button').forEach(button => {
            button.disabled = false;
        });
        reconnecting = false;
        responseBuffer = '';
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        readSerial();
    } catch (error) {
        if (reconnect && !reconnectTimeout) {
            log(`Reconnect failed: ${error.message}, retrying in 1s...`);
            reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                connectSerial(true);
            }, 1000);
        } else if (!reconnect) {
            log(`Error connecting: ${error.message}`);
            port = null;
            document.getElementById('toggleConnectBtn').textContent = "CONNECT";
            document.getElementById('toggleConnectBtn').classList.remove("button-connect-lit");
        }
    }
}

// Disconnects from the oscilloscope
async function disconnectSerial() {
    try {
        reconnecting = false;
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        if (reader) {
            await reader.cancel().catch(() => {});
            reader.releaseLock();
            reader = null;
        }
        if (writer) {
            await writer.close().catch(() => {});
            writer.releaseLock();
            writer = null;
        }
        if (port) {
            await port.close().catch(() => {});
            port = null;
        }
        log("Disconnected from serial port");
        document.getElementById('toggleConnectBtn').textContent = "CONNECT";
        document.getElementById('toggleConnectBtn').classList.remove("button-connect-lit");
        document.getElementById('commandInput').disabled = true;
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('sendTxtBtn').disabled = true;
        document.getElementById('button-power').disabled = true;
        document.querySelectorAll('.control-button').forEach(button => {
            button.disabled = true;
        });
        stopPlotting();
        commandsToSend = [];
        responseBuffer = '';
    } catch (error) {
        log(`Error disconnecting: ${error.message}`);
    }
}

// Toggles between connect and disconnect
async function toggleConnection() {
    if (port && (reader || writer)) {
        await disconnectSerial();
    } else {
        await connectSerial();
    }
}

// Modified readSerial with promise-based response handling
async function readSerial() {
    while (port && port.readable) {
        try {
            const {
                value,
                done
            } = await reader.read();
            if (done) {
                log("Reader stream closed");
                break;
            }
            responseBuffer += textDecoder.decode(value);
            // Parse responses with delimiters and resolve promises as data arrives
            await parseResponseBuffer();
        } catch (error) {
            log(`Error reading: ${error.message} - Device may have disconnected`);
            if (reader) {
                await reader.cancel().catch(() => {});
                reader.releaseLock();
                reader = null;
            }
            if (writer) {
                await writer.close().catch(() => {});
                writer.releaseLock();
                writer = null;
            }
            if (port) {
                await port.close().catch(() => {});
                port = null;
            }
            document.getElementById('toggleConnectBtn').textContent = "CONNECT";
            document.getElementById('toggleConnectBtn').classList.remove("button-connect-lit");
            document.getElementById('commandInput').disabled = true;
            document.getElementById('sendBtn').disabled = true;
            document.getElementById('sendTxtBtn').disabled = true;
            document.getElementById('button-power').disabled = true;
            if (!reconnecting) {
                reconnecting = true;
                log("Attempting to reconnect...");
                connectSerial(true);
            }
            break;
        }
    }
}

// Function to parse response buffer and resolve promises for oscilloscope data
async function parseResponseBuffer() {
    while (true) {
        // oscilloscope data parsing
        const dataStartIndex = responseBuffer.indexOf('#OK,');
        const dataEndIndex = responseBuffer.indexOf('\n', dataStartIndex + 4);
        if (dataStartIndex !== -1 && dataEndIndex !== -1 && (dataEndIndex - dataStartIndex > 640)) {
            const dataResponse = responseBuffer.substring(dataStartIndex + 4, dataEndIndex).trim();
            //console.log(`DATA Response: ${dataResponse.substring(0, 20)}... (length: ${dataResponse.length})`);
            if (dataResponse && dataResponse.length > 640) {
                param_CH2enabled = parseInt(dataResponse.substring(4, 6), 16); // update param_timeZoomLvl as soon as possible to correctly parse CH1/CH2 data. TO-DO: find a better way???
                param_timeZoomLvl = parseInt(dataResponse.substring(40, 42), 16); // update param_timeZoomLvl as soon as possible to correctly parse CH1/CH2 data
                if (dataResolver) {
                    dataResolver(dataResponse);
                    dataResolver = null;
                }
            }
            responseBuffer = responseBuffer.substring(dataEndIndex + 2);
            continue;
        }
        // version data parsing
        if (dataStartIndex !== -1 && dataEndIndex !== -1 && (dataEndIndex - dataStartIndex > 13) && (dataEndIndex - dataStartIndex < 25)) {
            const verResponse = responseBuffer.substring(dataStartIndex + 4, dataEndIndex).trim();
            if (verResponse && verResponse.startsWith('V1.3.0C')) {
                if (versionResolver) {
                    versionResolver(verResponse);
                    versionResolver = null;
                }
            }
            responseBuffer = responseBuffer.substring(dataEndIndex + 2);
            continue;
        }
        break; // Exit if no complete response is found
    }
}

// Function to determine the expected CH1/CH2 data length (code is outdated, so currently NOT USED).
function determineExpectedDataLength(channelName) {
    if (appParam_GeneralSignalSource == "WAV") { // if data source is WAV, then return 600
        return 600;
    }
    if (param_CH2enabled == 0) { // only CH1 enabled
        if (param_timeZoomLvl > 24) { // roll mode
            return -1;
        }
        if (channelName == 'CH1') { // check just in case
            switch (param_timeZoomLvl) {
                case 7:
                    return 960;
                    break;
                case 6:
                    return 862;
                    break;
                case 5:
                    return 462;
                    break;
                case 4:
                    return 222;
                    break;
                case 3:
                    return 142;
                    break;
                case 2:
                    return 102;
                    break;
                default:
                    return 2400;
                    break;
            }
        }
    } else { // both CH1 and CH2 enabled
        if (param_timeZoomLvl > 24) { // roll mode
            return -1;
        }
        if (channelName == 'CH1') { //requested expected data length for CH1
            switch (param_timeZoomLvl) {
                case 8:
                    return 1200;
                    break;
                case 7:
                    return 862;
                    break;
                case 6:
                    return 462;
                    break;
                case 5:
                    return 262;
                    break;
                case 4:
                    return 142;
                    break;
                case 3:
                    return 102;
                    break;
                default:
                    return 2400;
                    break;
            }
        } else { //requested expected data length for CH2
            switch (param_timeZoomLvl) {
                case 8:
                    return 1200;
                    break;
                case 7:
                    return 862;
                    break;
                case 6:
                    return 462;
                    break;
                case 5:
                    return 262;
                    break;
                case 4:
                    return 142;
                    break;
                case 3:
                    return 102;
                    break;
                default:
                    return 2400;
                    break;
            }
        }
    }
}

// Helper function to extract hex data from response between delimiters
function extractHexData(response) {
    if (response.length > 0 && /^[0-9A-Fa-f]+$/.test(response)) { // Ensure data is valid hex
        return response;
    } else if (response.length > 0) {
        log("InvalidHexData:" + response);
        invalidHexCounter++;
        return null; // Return null if no valid hex data is found
    } else {
        return null; // Return null if no data is found
    }
}

async function checkFirmwareCompatible() { // CHECK IF FIRMWARE VERSION IS COMPATIBLE
    appParam_isFirmwareVersionValid = 0;
    isDataAcquisitionInProgress = true;

    await sendCommand("#VER", true);

    let versionData = await new Promise((resolve) => {
        versionResolver = resolve;
    });
    isDataAcquisitionInProgress = false;
    if (versionData) {
        const validVersions = ["V1.3.0C MOD V9B3", "V1.3.0C MOD V9B4"];
        for (var i = 0; i < validVersions.length; i++) {
            if (versionData == validVersions[i]) {
                appParam_isFirmwareVersionValid = 1;
            }
        }
        if (appParam_isFirmwareVersionValid == 0) {
            clearInterval(iterateInterval);
            iterateInterval = null;
            stopPlotting();
            log("Your oscilloscope firmware is not compatible. Please upgrade to firmware " + validVersions[0] + " or newer at https://www.schuerewegen.tk/dso2512g.");
            console.log("Your oscilloscope firmware is not compatible. Please upgrade to firmware " + validVersions[0] + " or newer at https://www.schuerewegen.tk/dso2512g");
            drawText(document.getElementById('gridCanvas').getContext('2d'), "Your oscilloscope firmware is not compatible.", 640, 320, 28, 'yellow', 0, 1, 0, 0);
            drawText(document.getElementById('gridCanvas').getContext('2d'), "Please upgrade to firmware " + validVersions[0] + " or newer at:", 640, 360, 28, 'yellow', 0, 1, 0, 0);
            let timLink = document.getElementById('tim-link');
            timLink.style.display = "inline";
        }
    } else {
        log("failed retrieving firmware version data");
    }
}

// Modified sendCommand function to handle queuing during data acquisition
async function sendCommand(command, fromQueue = false) {
    if (isPlotting) {
        if (!writer) return;
        // Queue only if explicitly not from queue and acquisition is in progress
        if (!fromQueue && isDataAcquisitionInProgress) {
            buttonCommandQueue.push(command);
            //console.log(`Queued button command: ${command}`);
            return;
        }
        try {
            const data = textEncoder.encode(command + '\n');
            await writer.write(data);
            //console.log(`Sent: ${command}`);
        } catch (error) {
            //console.log(`Error sending: ${error.message}`);
        }
    }
}

// Function to process queued button commands after data acquisition
async function processButtonCommandQueue() {
    // Process each command in the queue sequentially
    while (buttonCommandQueue.length > 0) {
        const command = buttonCommandQueue.shift(); // Remove and get the first command
        await sendCommand(command, true); // Send it with fromQueue flag set to true
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to avoid overwhelming the oscilloscope
    }
}

// Sends a list of commands loaded from a text file
async function sendCommandsFromFile() {
    if (!writer || commandsToSend.length === 0) {
        console.log("No commands to send or not connected to a port");
        return;
    }
    const delayMs = appParam_CommandDelay;
    document.getElementById('sendTxtBtn').disabled = true;
    for (const command of commandsToSend) {
        if (!writer) break;
        try {
            const data = textEncoder.encode(command + '\n');
            await writer.write(data);
            console.log(`Sent from file: ${command}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        } catch (error) {
            console.log(`Error sending from file: ${error.message}`);
            break;
        }
    }
    document.getElementById('sendTxtBtn').disabled = false;
    commandsToSend = [];
    console.log("Finished sending commands from file");
}

// Loads a list of commands from a text file
function loadCommandsFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        commandsToSend = text.split('\n').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
        console.log(`Loaded ${commandsToSend.length} commands from ${file.name}`);
    };
    reader.onerror = function() {
        console.log("Error reading file!");
    };
    reader.readAsText(file);
}

//---------------------------- WAVEFORM DATA OPERATING FUNCTIONS -------------------------------------------------------------------------------------------------------------------------//

// generates a test waveform (an array composed of Y-magnitudes for the waveform)
function generateWaveformData(waveformShape, noiseAmount = 0, numCycles = 6, amplitude = 1.3, phase = 0, numSamples = 1201) {
    // Hardcoded values
    amplitude = amplitude / 4;

    // Validate waveformShape
    const validShapes = ['sine', 'square', 'sawtooth', 'triangle', 'noise', 'pulse', 'chirp', 'impulse', 'exponential', 'randomwalk'];
    if (!validShapes.includes(waveformShape)) {
        throw new Error(`Invalid waveformShape. Must be one of: ${validShapes.join(', ')}`);
    }

    // Validate noiseAmount
    if (typeof noiseAmount !== 'number' || noiseAmount < 0 || noiseAmount > 1) {
        throw new Error('noiseAmount must be a number between 0 and 1');
    }

    // Validate phase
    if (typeof phase !== 'number' || phase < -180 || phase > 180) {
        throw new Error('phase must be a number between -180 and 180 degrees');
    }

    // Convert phase to radians and fraction of a cycle
    const phaseRadians = phase * (Math.PI / 180);
    const phaseFraction = phase / 360; // 360 degrees = 1 cycle, so 180 degrees = 0.5 cycles

    let waveformData = new Array(numSamples);

    // Generate the clean waveform
    for (let n = 0; n < numSamples; n++) {
        // Compute phase and cycle position directly from sample index and numCycles
        const normalizedPosition = n / numSamples; // 0 to 1 over the waveform
        const basePhase = 2 * Math.PI * numCycles * normalizedPosition; // Angular phase for numCycles cycles
        const phaseWithShift = basePhase - phaseRadians; // Subtract phase to shift right for positive phase
        const baseCyclePosition = (numCycles * normalizedPosition) % 1; // Position within one cycle (0 to 1)
        const cyclePosition = (baseCyclePosition - phaseFraction + 1) % 1; // Subtract phaseFraction to shift right

        switch (waveformShape) {
            case 'sine':
                waveformData[n] = amplitude * Math.sin(phaseWithShift);
                break;

            case 'square':
                waveformData[n] = Math.sin(phaseWithShift) >= 0 ? amplitude : -amplitude;
                break;

            case 'sawtooth':
                waveformData[n] = amplitude * (2 * cyclePosition - 1);
                break;

            case 'triangle':
                waveformData[n] = amplitude * (2 * Math.abs(2 * cyclePosition - 1) - 1);
                break;

            case 'noise':
                waveformData[n] = amplitude * (2 * Math.random() - 1);
                break;

            case 'pulse':
                waveformData[n] = (cyclePosition < 0.1) ? amplitude : 0; // 10% duty cycle
                break;

            case 'chirp':
                // Single sweep from 500 Hz to 5000 Hz over the entire 4801 samples
                const sweepPosition = n / numSamples; // 0 to 1 over the entire waveform
                const startCycles = 500 * (numSamples / 200000); // Virtual cycles at 500 Hz
                const endCycles = 15000 * (numSamples / 200000); // Virtual cycles at 5000 Hz
                const cycleRange = endCycles - startCycles; // Range of cycles over the sweep
                const chirpPhase = 2 * Math.PI * (startCycles * sweepPosition + (cycleRange / 2) * sweepPosition * sweepPosition) - phaseRadians;
                waveformData[n] = amplitude * Math.sin(chirpPhase);
                break;

            case 'impulse':
                // Impulse with smoother 3-sample quadratic rise and reset decay at new impulse
                const samplesPerCycle = Math.floor(numSamples / numCycles);
                const adjustedSample = (n - phaseFraction * samplesPerCycle + numSamples) % numSamples; // Subtract phaseFraction to shift right
                const currentImpulseIndex = Math.floor(adjustedSample / samplesPerCycle);
                const currentImpulseSample = currentImpulseIndex * samplesPerCycle;
                const samplesSinceImpulse = adjustedSample - currentImpulseSample;
                const decayConstant = 10.86;

                let value = 0;
                if (samplesSinceImpulse >= 0 && samplesSinceImpulse < samplesPerCycle) {
                    if (samplesSinceImpulse < 1) {
                        value = amplitude / 6; // rise
                    } else if (samplesSinceImpulse < 2) {
                        value = amplitude; // Peak of the impulse
                    } else {
                        const decayTime = samplesSinceImpulse - 2; // Decay starts after the rise
                        value = amplitude * Math.exp(-decayTime / decayConstant);
                    }
                }

                waveformData[n] = value;
                break;

            case 'exponential':
                // Waveform with single exponential rise and fall per cycle
                let envelope;
                if (cyclePosition < 0.5) {
                    // Exponential rise over the first half of the cycle
                    envelope = 1 - Math.exp(-10 * (cyclePosition / 0.5)); // Rise from 0 to 1
                } else {
                    // Exponential fall over the second half of the cycle
                    envelope = Math.exp(-10 * ((cyclePosition - 0.5) / 0.5)); // Fall from 1 to 0
                }
                waveformData[n] = ((amplitude * envelope) * 2) - 0.325; // No square wave modulation
                break;

            case 'randomwalk':
                if (n === 0) waveformData[n] = 0;
                else waveformData[n] = waveformData[n - 1] + amplitude * (0.001 * numCycles) * (2 * Math.random() - 1);
                break;

            default:
                waveformData[n] = 0; // Should never reach here due to validation
        }
    }

    // Add noise (except if the waveformShape is already 'noise')
    if (waveformShape !== 'noise' && noiseAmount > 0) {
        const noiseAmplitude = amplitude * noiseAmount;
        for (let n = 0; n < numSamples; n++) {
            const noise = noiseAmplitude * (2 * Math.random() - 1);
            waveformData[n] += noise;
        }
    }

    return waveformData;
}

// Helper function to obtain a value required to correctly pan a trigger-centered waveform
function distancePastMultiple(refNum, myNumber) {
    // Ensure refNum is positive and non-zero
    if (refNum <= 0) {
        return 0;
    }
    // Compute the distance past the last multiple using adjusted modulo
    const distance = ((myNumber % refNum) + refNum) % refNum;
    return distance;
}

// locates the trigger point to correctly center a bouncing waveform (currently NOT USED, as it is not exactly working as intended and causes other issues)
function locateTriggerPoint(waveArray, triggerLevel, triggerSlope, leftOffset = 0, rightOffset = 0, trigXOffset = 0, rangePrcnt = 0) {
    // Validate triggerSlope
    if (triggerSlope !== 0 && triggerSlope !== 1) {
        throw new Error("triggerSlope must be 0 (upward) or 1 (downward)");
    }

    // Handle edge cases: array too short
    if (waveArray.length < 2) {
        return {
            triggerIndex: 0,
            avgCrossingSep: 0
        };
    }

    // Compute middle index
    const middleIndex = Math.floor(waveArray.length / 2);

    // Find all crossing indices
    const crossingIndices = [];
    for (let i = 0; i < waveArray.length - 1; i++) {
        const current = waveArray[i];
        const next = waveArray[i + 1];

        if (triggerSlope === 0) {
            // Upward crossing
            if (current < triggerLevel && next >= triggerLevel) {
                crossingIndices.push(i);
            }
        } else {
            // Downward crossing
            if (current >= triggerLevel && next < triggerLevel) {
                crossingIndices.push(i);
            }
        }
    }

    // Handle case with no crossings
    if (crossingIndices.length === 0) {
        log("waveform has zero crossings. returning default index");
        return {
            triggerIndex: leftOffset,
            avgCrossingSep: 0
        };
    }

    // Compute the rounded average of indices between crossings
    let avgCrossingSep = 0;
    if (crossingIndices.length >= 2) {
        let totalDifference = 0;
        for (let i = 0; i < crossingIndices.length - 1; i++) {
            const difference = crossingIndices[i + 1] - crossingIndices[i];
            totalDifference += difference;
        }
        const numPairs = crossingIndices.length - 1;
        avgCrossingSep = Math.round(totalDifference / numPairs);
    }

    const extraOffset = distancePastMultiple(avgCrossingSep, Math.ceil(trigXOffset * (leftOffset + rightOffset)));

    // Compute the left boundary
    const leftBoundary = leftOffset + extraOffset;

    // Compute the right boundary
    const rightBoundary = waveArray.length - rightOffset - 1 + extraOffset;

    // Compute the target index based on rangePrcnt
    const targetIndex = Math.round(leftBoundary + (rangePrcnt / 100) * (rightBoundary - leftBoundary));

    // Collect all crossings within [leftBoundary, rightBoundary]
    const crossingsInRange = [];
    for (let i = 0; i < crossingIndices.length; i++) {
        const currentIndex = crossingIndices[i];
        if (currentIndex >= leftBoundary && currentIndex <= rightBoundary) {
            crossingsInRange.push(currentIndex);
        }
    }

    // Handle case with no crossings in range
    if (crossingsInRange.length === 0) {
        log("no crossings found within boundaries. Returning default index");
        return {
            triggerIndex: leftOffset,
            avgCrossingSep: avgCrossingSep
        };
    }

    // Find the first crossing >= targetIndex, or the last crossing before targetIndex
    let selectedIndex = null;
    let lastCrossingBeforeTarget = null;

    for (let i = 0; i < crossingIndices.length; i++) {
        const currentIndex = crossingIndices[i];
        if (currentIndex >= leftBoundary && currentIndex <= rightBoundary) {
            if (currentIndex >= targetIndex) {
                selectedIndex = currentIndex;
                break;
            }
            lastCrossingBeforeTarget = currentIndex; // Keep track of the last crossing before targetIndex
        }
    }

    // If no crossing is found >= targetIndex, use the last crossing before targetIndex
    if (selectedIndex === null) {
        selectedIndex = lastCrossingBeforeTarget;
        log("no crossing found at or after target index. Using last crossing before target: " + selectedIndex);
    } else {
        log("found index:" + selectedIndex);
    }

    return {
        triggerIndex: selectedIndex - extraOffset,
        avgCrossingSep: avgCrossingSep
    };
}

// Manage edge cases on Databuffer/Databuffer2 data, trim the array to retrieve the exact number of samples required and try to center them to be the closest to WAV.
function trimWaveArray(waveArray) {
    // in specific cases, add extra sample at the start of the array to complete the intended length
    let inputDataLength = waveArray.length;
    let missingSample = [];
    missingSample.push(waveArray[0]);
    switch (inputDataLength) {
        case 1200:
        case 601:
        case 600:
        case 481:
        case 480:
            waveArray = missingSample.concat(waveArray);
            break;
        default:
            break;
    }
    // adjust the general offsets for RUN mode
    let trimOffset = 0;
    if (param_CH2enabled == 0) {
        switch (appParam_intendedSamples) {
            case 4801:
                trimOffset = 0;
                break;
            case 2401:
                trimOffset = 0;
                break;
            case 1921:
                trimOffset = 0;
                break;
            case 1201:
                trimOffset = 0;
                break;
            case 961:
                trimOffset = 0;
                break;
            case 601:
                trimOffset = 0;
                break;
            case 481:
                trimOffset = 0;
                break;
            case 241:
                trimOffset = appParam_GeneralSignalSource == "DataBuffer" ? 92 : 93;
                break; // Databuffer and Databuffer2 can have slightly different offsets
            case 193:
                trimOffset = 78;
                break;
            case 121:
                trimOffset = appParam_GeneralSignalSource == "DataBuffer" ? 53 : 54;
                break;
            case 97:
                trimOffset = 46;
                break;
            case 61:
                trimOffset = 33;
                break;
            case 49:
                trimOffset = appParam_GeneralSignalSource == "DataBuffer" ? 30 : 31;
                break;
            case 25:
                trimOffset = appParam_GeneralSignalSource == "DataBuffer" ? 21 : 22;
                break;
            case 20:
                trimOffset = 1;
                break;
            case 13:
                trimOffset = appParam_GeneralSignalSource == "DataBuffer" ? 17 : 18;
                break;
            default:
                break;
        }
    } else {
        switch (appParam_intendedSamples) {
            case 4801:
                trimOffset = 0;
                break;
            case 2401:
                trimOffset = 0;
                break;
            case 1921:
                trimOffset = 0;
                break;
            case 1201:
                trimOffset = 0;
                break;
            case 961:
                trimOffset = 0;
                break;
            case 601:
                trimOffset = 0;
                break;
            case 481:
                trimOffset = 0;
                break;
            case 241:
                trimOffset = 92;
                break;
            case 193:
                trimOffset = 78;
                break;
            case 121:
                trimOffset = 54;
                break;
            case 97:
                trimOffset = 46;
                break;
            case 61:
                trimOffset = 34;
                break;
            case 49:
                trimOffset = 30;
                break;
            case 25:
                trimOffset = 22;
                break;
            case 20:
                trimOffset = 1;
                break;
            case 13:
                trimOffset = 18;
                break;
            default:
                break;
        }
    }
    // Handle edge cases for STOP mode, depending on the zoom level in which STOP was activated. TO-DO: correctly set the appropiate values for all cases higher than ZoomLvl 12
    if (appParam_horizontalSnapshotZoomLvl == 23) { // 50ms
        switch (appParam_intendedSamples) {
            case 481:
                trimOffset = trimOffset + 1;
                break;
            case 241:
                trimOffset = trimOffset + 2;
                break;
            case 193:
                trimOffset = trimOffset + 1;
                break;
            case 97:
                trimOffset = trimOffset + 1;
                break;
            case 49:
                trimOffset = trimOffset + 1;
                break;
            case 25:
                trimOffset = trimOffset + 2;
                break;
            case 20:
                trimOffset = trimOffset - 1;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 22) { // 20ms
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + 2;
                break;
            case 121:
                trimOffset = trimOffset + 2;
                break;
            case 61:
                trimOffset = trimOffset + 2;
                break;
            case 49:
                trimOffset = trimOffset + 2;
                break;
            case 25:
                trimOffset = trimOffset + 2;
                break;
            case 13:
                trimOffset = trimOffset + 2;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 21) { // 10ms
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 4 : 3);
                break;
            case 121:
                trimOffset = trimOffset + 1;
                break;
            case 97:
                trimOffset = trimOffset + 2;
                break;
            case 49:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 2 : 1);
                break;
            case 25:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 3 : 2);
                break;
            case 13:
                trimOffset = trimOffset + 1;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 20) { // 5ms
        switch (appParam_intendedSamples) {
            case 481:
                trimOffset = trimOffset + 1;
                break;
            case 241:
                trimOffset = trimOffset + 2;
                break;
            case 193:
                trimOffset = trimOffset + 1;
                break;
            case 97:
                trimOffset = trimOffset + 1;
                break;
            case 49:
                trimOffset = trimOffset + 1;
                break;
            case 25:
                trimOffset = trimOffset + 2;
                break;
            case 20:
                trimOffset = trimOffset - 1;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 19) { // 2ms
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + 2;
                break;
            case 121:
                trimOffset = trimOffset + 2;
                break;
            case 61:
                trimOffset = trimOffset + 2;
                break;
            case 49:
                trimOffset = trimOffset + 2;
                break;
            case 25:
                trimOffset = trimOffset + 2;
                break;
            case 13:
                trimOffset = trimOffset + 2;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 18) { // 1ms
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 4 : 3);
                break;
            case 121:
                trimOffset = trimOffset + 1;
                break;
            case 97:
                trimOffset = trimOffset + 2;
                break;
            case 49:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 2 : 1);
                break;
            case 25:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 3 : 2);
                break;
            case 13:
                trimOffset = trimOffset + 1;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 17) { // 500us
        switch (appParam_intendedSamples) {
            case 481:
                trimOffset = trimOffset + 1;
                break;
            case 241:
                trimOffset = trimOffset + 2;
                break;
            case 193:
                trimOffset = trimOffset + 1;
                break;
            case 97:
                trimOffset = trimOffset + 1;
                break;
            case 49:
                trimOffset = trimOffset + 1;
                break;
            case 25:
                trimOffset = trimOffset + 2;
                break;
            case 20:
                trimOffset = trimOffset - 1;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 16) { // 200us
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + 2;
                break;
            case 121:
                trimOffset = trimOffset + 2;
                break;
            case 61:
                trimOffset = trimOffset + 2;
                break;
            case 49:
                trimOffset = trimOffset + 2;
                break;
            case 25:
                trimOffset = trimOffset + 2;
                break;
            case 13:
                trimOffset = trimOffset + 2;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 15) { // 100us
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 4 : 3);
                break;
            case 121:
                trimOffset = trimOffset + 1;
                break;
            case 97:
                trimOffset = trimOffset + 2;
                break;
            case 49:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 2 : 1);
                break;
            case 25:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 3 : 2);
                break;
            case 13:
                trimOffset = trimOffset + 1;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 14) { // 50us
        switch (appParam_intendedSamples) {
            case 481:
                trimOffset = trimOffset + 1;
                break;
            case 241:
                trimOffset = trimOffset + 2;
                break;
            case 193:
                trimOffset = trimOffset + 1;
                break;
            case 97:
                trimOffset = trimOffset + 1;
                break;
            case 49:
                trimOffset = trimOffset + 1;
                break;
            case 25:
                trimOffset = trimOffset + 2;
                break;
            case 20:
                trimOffset = trimOffset - 1;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 13) { // 20us
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + 2;
                break;
            case 121:
                trimOffset = trimOffset + 2;
                break;
            case 61:
                trimOffset = trimOffset + 2;
                break;
            case 49:
                trimOffset = trimOffset + 2;
                break;
            case 25:
                trimOffset = trimOffset + 2;
                break;
            case 13:
                trimOffset = trimOffset + 2;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 12) { // 10us
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 4 : 3) + (param_CH2enabled == 0 ? 0 : 1);
                break;
            case 121:
                trimOffset = trimOffset + 1;
                break;
            case 97:
                trimOffset = trimOffset + 2;
                break;
            case 49:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 2 : 1);
                break;
            case 25:
                trimOffset = trimOffset + (appParam_GeneralSignalSource == "DataBuffer" ? 3 : 2) + (param_CH2enabled == 0 ? 0 : -1);
                break;
            case 13:
                trimOffset = trimOffset + 1;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl == 11) { // 5us
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + 2;
                break;
            case 193:
                trimOffset = trimOffset + 1;
                break;
            case 97:
                trimOffset = trimOffset + 0;
                break;
            case 49:
                trimOffset = trimOffset + 0;
                break;
            case 25:
                trimOffset = trimOffset + 0;
                break;
            case 20:
                trimOffset = trimOffset - 1;
                break;
            default:
                break;
        }
    } else if (appParam_horizontalSnapshotZoomLvl <= 10) { // 2us or less
        switch (appParam_intendedSamples) {
            case 241:
                trimOffset = trimOffset + 0;
                break;
            case 121:
                trimOffset = trimOffset - 1;
                break;
            case 61:
                trimOffset = trimOffset - 1;
                break;
            case 49:
                trimOffset = trimOffset - 2;
                break;
            case 25:
                trimOffset = trimOffset - 1;
                break;
            case 13:
                trimOffset = trimOffset - 1;
                break;
            default:
                break;
        }
    }
    waveArray = waveArray.slice(trimOffset, trimOffset + appParam_intendedSamples);
    return waveArray;
}

// Converts the raw hex data from the DSO2512G oscilloscope into a waveform Array with magnitudes (-1/+1) This function is specific for Channel 1
function convertToWaveArray(hexData) {
    let waveArray = [];
    let dataBuffer = '';
    let inputSamplesLength = (hexData.length / 2); // for logging
    if (appParam_GeneralSignalSource == "WAV") { // if input data is WAV, get the separate Y1/Y2 data and average it.
        dataBuffer = hexData;
        const numSamples = Math.floor(dataBuffer.length / 2);
        for (let i = 0; i < numSamples / 2; i++) { // Convert the string of data characters to an array of normalized values (+1/-1)
            const value = parseInt(dataBuffer.substring(i * 2, i * 2 + 2), 16);
            const y = ((value - 128) / 200) * verticalScale * (-1); // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
            const valueb = parseInt(dataBuffer.substring(i * 2 + 600, i * 2 + 602), 16);
            const yb = ((valueb - 128) / 200) * verticalScale * (-1); // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
            const avgVal = (y + yb) / 2;
            waveArray.push(avgVal);
        }
    } else if (appParam_GeneralSignalSource == "DataBuffer2") { // if input data is DataBuffer2
        if (param_CH2enabled == 0) { // if Single Channel mode, interleave the data from both channels to feed CH1.
            dataBuffer = hexData;
            let dataBuffer2 = currentCH2Data;
            const numSamples = Math.floor(dataBuffer.length / 2);
            if (dataBuffer2.length > 0) { // if dataBuffer2 has data, interleave CH1/CH2
                inputSamplesLength = (dataBuffer.length + dataBuffer2.length) / 2; // for logging
                for (let i = 0; i < numSamples; i++) { // Convert the string of data characters to an array of normalized values (+1/-1)
                    const value = parseInt(dataBuffer2.substring(i * 2, i * 2 + 2), 16); // CH2 data first
                    const y = ((value - 128) / 200) * verticalScale + verticalOffsetCH1; // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
                    waveArray.push(y);
                    const valueb = parseInt(dataBuffer.substring(i * 2, i * 2 + 2), 16); // CH1 data later
                    const yb = ((valueb - 128) / 200) * verticalScale + verticalOffsetCH1; // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
                    waveArray.push(yb);
                }
            } else { // if dataBuffer2 is empty (typically first frame after changing source) just use CH1 data
                for (let i = 0; i < numSamples; i++) { // Convert the string of data characters to an array of normalized values (+1/-1)
                    const value = parseInt(dataBuffer.substring(i * 2, i * 2 + 2), 16); // CH1 data
                    const y = ((value - 128) / 200) * verticalScale + verticalOffsetCH1; // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
                    waveArray.push(y);
                }
            }
        } else { // if Dual Channel mode, just take data from CH1
            dataBuffer = hexData;
            const numSamples = Math.floor(dataBuffer.length / 2);
            for (let i = 0; i < numSamples; i++) { // Convert the string of data characters to an array of normalized values (+1/-1)
                const value = parseInt(dataBuffer.substring(i * 2, i * 2 + 2), 16); // CH1 data
                const y = ((value - 128) / 200) * verticalScale + verticalOffsetCH1; // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
                waveArray.push(y);
            }
        }
        waveArray = trimWaveArray(waveArray);
    } else if (appParam_GeneralSignalSource == "DataBuffer") { // if input data is DataBuffer
        dataBuffer = hexData;
        const numSamples = Math.floor(dataBuffer.length / 2);
        for (let i = 0; i < numSamples; i++) { // Convert the string of data characters to an array of normalized values (+1/-1)
            const value = parseInt(dataBuffer.substring(i * 2, i * 2 + 2), 16); // CH1 data
            const y = ((value - 128) / 200) * verticalScale + verticalOffsetCH1; // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
            waveArray.push(y);
        }
        waveArray = trimWaveArray(waveArray);
    }
    log("\n" +
        "SignalSource:" + appParam_GeneralSignalSource + "\n" +
        "CH2enabled:" + param_CH2enabled + "\n" +
        "SnapshotZoomLvl:" + appParam_horizontalSnapshotZoomLvl + "\n" +
        "IntendedSamples:" + appParam_intendedSamples + "\n" +
        "InputDataLength:" + inputSamplesLength + "\n" +
        "TrimmedDataLength:" + waveArray.length
    );
    return waveArray;
}


// Converts the raw hex data from the DSO2512G oscilloscope into a waveform Array with magnitudes (-1/+1) This function is specific for Channel 2
function convertToWaveArrayCH2(hexData) {
    let waveArray = [];
    let dataBuffer = '';
    if (appParam_GeneralSignalSource == "WAV") { // if input data is WAV, get the separate Y1/Y2 data and average it.
        dataBuffer = hexData;
        const numSamples = Math.floor(dataBuffer.length / 2);
        for (let i = 0; i < numSamples / 2; i++) { // Convert the string of data characters to an array of normalized values (+1/-1)
            const value = parseInt(dataBuffer.substring(i * 2, i * 2 + 2), 16);
            const y = ((value - 128) / 200) * verticalScale * (-1); // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
            const valueb = parseInt(dataBuffer.substring(i * 2 + 600, i * 2 + 602), 16);
            const yb = ((valueb - 128) / 200) * verticalScale * (-1); // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
            const avgVal = (y + yb) / 2;
            waveArray.push(avgVal);
        }
    } else if (appParam_GeneralSignalSource == "DataBuffer" || appParam_GeneralSignalSource == "DataBuffer2") { // if input data is either Databuffer or DataBuffer2
        dataBuffer = hexData;
        const numSamples = Math.floor(dataBuffer.length / 2);
        for (let i = 0; i < numSamples; i++) { // Convert the string of data characters to an array of normalized values (+1/-1)
            const value = parseInt(dataBuffer.substring(i * 2, i * 2 + 2), 16); // CH1 data
            const y = ((value - 128) / 200) * verticalScale + verticalOffsetCH2; // Normalize the waveform magnitudes to (+1/-1) and apply the calibration value.
            waveArray.push(y);
        }
        waveArray = trimWaveArray(waveArray);
    }
    return waveArray;
}

// Performs waveform averaging of a waveArray up to 32 steps either using the bank A (0) or the bank B (1)
function waveformAveraging(waveArray, numSteps = 16, bank) {
    if (bank == 0) {
        // Shift steps backward
        if (waveArray != avgStep01) {
            avgStep32 = avgStep31;
            avgStep31 = avgStep30;
            avgStep30 = avgStep29;
            avgStep29 = avgStep28;
            avgStep28 = avgStep27;
            avgStep27 = avgStep26;
            avgStep26 = avgStep25;
            avgStep25 = avgStep24;
            avgStep24 = avgStep23;
            avgStep23 = avgStep22;
            avgStep22 = avgStep21;
            avgStep21 = avgStep20;
            avgStep20 = avgStep19;
            avgStep19 = avgStep18;
            avgStep18 = avgStep17;
            avgStep17 = avgStep16;
            avgStep16 = avgStep15;
            avgStep15 = avgStep14;
            avgStep14 = avgStep13;
            avgStep13 = avgStep12;
            avgStep12 = avgStep11;
            avgStep11 = avgStep10;
            avgStep10 = avgStep09;
            avgStep09 = avgStep08;
            avgStep08 = avgStep07;
            avgStep07 = avgStep06;
            avgStep06 = avgStep05;
            avgStep05 = avgStep04;
            avgStep04 = avgStep03;
            avgStep03 = avgStep02;
            avgStep02 = avgStep01;
            avgStep01 = waveArray.slice(); // Fresh data into step 01
        }
        // Compute average
        const avgSteps = [
            avgStep01, avgStep02, avgStep03, avgStep04,
            avgStep05, avgStep06, avgStep07, avgStep08,
            avgStep09, avgStep10, avgStep11, avgStep12,
            avgStep13, avgStep14, avgStep15, avgStep16,
            avgStep17, avgStep18, avgStep19, avgStep20,
            avgStep21, avgStep22, avgStep23, avgStep24,
            avgStep25, avgStep26, avgStep27, avgStep28,
            avgStep29, avgStep30, avgStep31, avgStep32
        ].slice(0, numSteps).filter(step => step !== null); // Use only non-null steps up to limit
        if (avgSteps.length > 0) {
            const avgArray = waveArray.map((_, i) => {
                const sum = avgSteps.reduce((acc, step) => acc + (step[i] || 0), 0);
                return sum / avgSteps.length;
            });
            return avgArray;
        }
    } else {
        // Shift steps backward
        if (waveArray != avgStep01b) {
            avgStep32b = avgStep31b;
            avgStep31b = avgStep30b;
            avgStep30b = avgStep29b;
            avgStep29b = avgStep28b;
            avgStep28b = avgStep27b;
            avgStep27b = avgStep26b;
            avgStep26b = avgStep25b;
            avgStep25b = avgStep24b;
            avgStep24b = avgStep23b;
            avgStep23b = avgStep22b;
            avgStep22b = avgStep21b;
            avgStep21b = avgStep20b;
            avgStep20b = avgStep19b;
            avgStep19b = avgStep18b;
            avgStep18b = avgStep17b;
            avgStep17b = avgStep16b;
            avgStep16b = avgStep15b;
            avgStep15b = avgStep14b;
            avgStep14b = avgStep13b;
            avgStep13b = avgStep12b;
            avgStep12b = avgStep11b;
            avgStep11b = avgStep10b;
            avgStep10b = avgStep09b;
            avgStep09b = avgStep08b;
            avgStep08b = avgStep07b;
            avgStep07b = avgStep06b;
            avgStep06b = avgStep05b;
            avgStep05b = avgStep04b;
            avgStep04b = avgStep03b;
            avgStep03b = avgStep02b;
            avgStep02b = avgStep01b;
            avgStep01b = waveArray.slice(); // Fresh data into step 01
        }
        // Compute average
        const avgSteps = [
            avgStep01b, avgStep02b, avgStep03b, avgStep04b,
            avgStep05b, avgStep06b, avgStep07b, avgStep08b,
            avgStep09b, avgStep10b, avgStep11b, avgStep12b,
            avgStep13b, avgStep14b, avgStep15b, avgStep16b,
            avgStep17b, avgStep18b, avgStep19b, avgStep20b,
            avgStep21b, avgStep22b, avgStep23b, avgStep24b,
            avgStep25b, avgStep26b, avgStep27b, avgStep28b,
            avgStep29b, avgStep30b, avgStep31b, avgStep32b
        ].slice(0, numSteps).filter(step => step !== null); // Use only non-null steps up to limit
        if (avgSteps.length > 0) {
            const avgArray = waveArray.map((_, i) => {
                const sum = avgSteps.reduce((acc, step) => acc + (step[i] || 0), 0);
                return sum / avgSteps.length;
            });
            return avgArray;
        }
    }
}

// Applies a low pass filter to "waveArray", set at "cutoffFreq" frequency (in Hz)
function filterLowPass(waveArray, cutoffFreq, timePerDivision) {
    // Step 1: Input validation
    if (!Array.isArray(waveArray) || waveArray.length < 3) {
        //console.log("Input array is too short or invalid. Returning original array.");
        return waveArray.slice();
    }
    if (typeof cutoffFreq !== 'number' || cutoffFreq <= 0) {
        //console.log("Cutoff frequency must be a positive number (in Hz). Returning original array.");
        return waveArray.slice();
    }
    const n = waveArray.length;
    // Step 2: Compute the sampling rate
    const totalTime = timePerDivision * 12;
    const timePerSample = totalTime / (n - 1);
    const samplingRate = 1 / timePerSample;
    // Step 3: Check Nyquist criterion
    if (samplingRate < 2 * cutoffFreq) {
        //console.log(`Sampling rate (${samplingRate.toFixed(2)} Hz) is too low for a ${cutoffFreq} Hz cutoff (Nyquist rate: ${(2 * cutoffFreq).toFixed(2)} Hz). Returning original array.`);
        return waveArray.slice();
    }
    // Step 4: Compute the normalized cutoff frequency
    const normalizedCutoff = cutoffFreq / samplingRate;
    // Step 5: Design a 2nd-order Butterworth low-pass filter
    const theta = Math.PI / 4;
    const poleReal = -Math.sin(theta);
    const poleImag = Math.cos(theta);
    // Bilinear transform
    const T = 1 / samplingRate;
    const K = 2 / T;
    const warpedCutoff = (2 / T) * Math.tan(Math.PI * normalizedCutoff);
    const sReal = poleReal * warpedCutoff;
    const sImag = poleImag * warpedCutoff;
    const denomReal = 1 - sReal / K;
    const denomImag = -sImag / K;
    const denomMag = denomReal * denomReal + denomImag * denomImag;
    const zReal = (1 + sReal / K) / denomMag * denomReal + (sImag / K) / denomMag * denomImag;
    const zImag = (sImag / K) / denomMag * denomReal - (1 + sReal / K) / denomMag * denomImag;
    // Denominator coefficients (a coefficients)
    const a0 = 1;
    const a1 = -2 * zReal;
    const a2 = zReal * zReal + zImag * zImag;
    // Numerator coefficients (b coefficients) before normalization
    const gain = (warpedCutoff / K) * (warpedCutoff / K);
    const b0 = gain;
    const b1 = 2 * gain;
    const b2 = gain;
    // Step 6: Normalize the filter gain to have unity gain at DC (z = 1)
    const bSum = b0 + b1 + b2;
    const aSum = 1 + a1 + a2; // a0 = 1
    const G = aSum / bSum; // Scaling factor to make H(1) = 1
    // Apply the scaling to the b coefficients
    const b = [b0 * G, b1 * G, b2 * G];
    const a = [1, a1, a2]; // a0 is already 1
    // Step 7: Apply the filter
    const filteredArray = new Array(n).fill(0);
    filteredArray[0] = waveArray[0];
    filteredArray[1] = waveArray[1];
    for (let i = 2; i < n; i++) {
        filteredArray[i] =
            b[0] * waveArray[i] +
            b[1] * waveArray[i - 1] +
            b[2] * waveArray[i - 2] -
            a[1] * filteredArray[i - 1] -
            a[2] * filteredArray[i - 2];
    }
    return filteredArray;
}

// Cubic Interpolation
function cubicInterpolate(p0, p1, p2, p3, t) {
    const t2 = t * t,
        t3 = t2 * t;
    return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
}

// Lanczos Interpolation
function lanczosInterpolate(points, t, a = 3) {
    let sum = 0;
    const start = Math.max(0, Math.floor(t - a));
    const end = Math.min(points.length - 1, Math.ceil(t + a));
    for (let i = start; i <= end; i++) {
        const x = i - t;
        sum += points[i] * lanczosKernel(x, a);
    }
    return sum;
}

function lanczosKernel(x, a) {
    if (x === 0) return 1;
    if (Math.abs(x) >= a) return 0;
    return a * Math.sin(Math.PI * x) * Math.sin(Math.PI * x / a) / (Math.PI * Math.PI * x * x);
}

// Sinc Interpolation with Lanczos window
function sincInterpolate(points, t, a = 6) {
    let sum = 0;
    const start = Math.max(0, Math.floor(t - a));
    const end = Math.min(points.length - 1, Math.ceil(t + a));

    for (let i = start; i <= end; i++) {
        const x = i - t;
        // Apply Sinc kernel with Lanczos window
        const sincValue = sincKernel(x);
        const windowValue = lanczosWindow(x, a);
        sum += points[i] * sincValue * windowValue;
    }
    return sum;
}

function sincKernel(x) {
    if (x === 0) return 1;
    return Math.sin(Math.PI * x) / (Math.PI * x);
}

function lanczosWindow(x, a) {
    if (Math.abs(x) >= a) return 0;
    return sincKernel(x / a); // Sinc function scaled by the window size
}

// PCHIP Interpolation
function pchipInterpolate(points, i, t) {
    const x0 = i - 1 < 0 ? points[0] : points[i - 1];
    const x1 = points[i];
    const x2 = i + 1 >= points.length ? points[points.length - 1] : points[i + 1];
    const x3 = i + 2 >= points.length ? points[points.length - 1] : points[i + 2];
    // Compute slopes
    const h0 = 1; // Assuming unit spacing for simplicity
    const h1 = 1;
    const d0 = (x1 - x0) / h0;
    const d1 = (x2 - x1) / h1;
    // PCHIP derivative estimation (harmonic mean for monotonicity)
    let m0, m1;
    if (d0 * d1 <= 0) {
        m0 = m1 = 0; // Set slopes to zero if sign changes
    } else {
        m0 = (d0 * d1 > 0) ? (2 * h0 * h1 / (h0 + h1)) * (1 / d0 + 1 / d1) ** -1 : 0;
        m1 = (d0 * d1 > 0) ? (2 * h0 * h1 / (h0 + h1)) * (1 / d0 + 1 / d1) ** -1 : 0;
    }
    // Hermite cubic polynomial
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * x1 + h10 * h1 * m0 + h01 * x2 + h11 * h1 * m1;
}

// Makima Interpolation
function makimaInterpolate(points, i, t) {
    const x = [];
    x[0] = i - 2 < 0 ? points[0] : points[i - 2];
    x[1] = i - 1 < 0 ? points[0] : points[i - 1];
    x[2] = points[i];
    x[3] = i + 1 >= points.length ? points[points.length - 1] : points[i + 1];
    x[4] = i + 2 >= points.length ? points[points.length - 1] : points[i + 2];
    // Compute slopes
    const m = [];
    for (let j = 0; j < 4; j++) {
        m[j] = (x[j + 1] - x[j]) / 1; // Unit spacing
    }
    // Makima weights
    const w = [];
    w[1] = Math.abs(m[3] - m[2]) + Math.abs(m[3] + m[2]) / 2;
    w[2] = Math.abs(m[1] - m[0]) + Math.abs(m[1] + m[0]) / 2;
    // Derivative estimates
    const d1 = (w[1] * m[1] + w[2] * m[2]) / (w[1] + w[2] || 1);
    const d0 = (w[1] * m[0] + w[2] * m[1]) / (w[1] + w[2] || 1);
    // Hermite cubic polynomial
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * x[2] + h10 * 1 * d0 + h01 * x[3] + h11 * 1 * d1;
}

function doInterpolationFixedLength(waveArray, method, desiredLength) {
    if (waveArray.length < 2 || method === 'OFF' || waveArray.length >= desiredLength) {
        appParam_intendedDrawnSamplesInterpolated = appParam_intendedDrawnSamples;
        return waveArray; // Return original array if no interpolation
    }

    // update appParam_intendedDrawnSamplesInterpolated to account for the increase of samples caused by interpolation. (this is used for correctly plotting waveforms which don't span across the entire grid width)
    const interpScale = desiredLength / waveArray.length;
    appParam_intendedDrawnSamplesInterpolated = Math.round(appParam_intendedDrawnSamples * interpScale);

    const desiredTotalPoints = desiredLength;
    const numPoints = waveArray.length;
    const interpolated = [];

    // Map the original points to a normalized range [0, 1]
    // Then map the desired number of points back to that range
    for (let i = 0; i < desiredTotalPoints; i++) {
        // tGlobal is the normalized position in the original array
        const tGlobal = (i / (desiredTotalPoints - 1)) * (numPoints - 1);
        const idx = Math.floor(tGlobal);
        const t = tGlobal - idx; // Fractional part for interpolation

        // Ensure we don't go out of bounds
        const y0 = waveArray[idx];
        const y1 = waveArray[Math.min(idx + 1, numPoints - 1)];
        const yPrev = idx > 0 ? waveArray[idx - 1] : y0;
        const yNext = idx < numPoints - 2 ? waveArray[idx + 2] : y1;

        let y;
        if (method === 'Linear') {
            y = y0 + (y1 - y0) * t;
        } else if (method === 'Cubic') {
            y = cubicInterpolate(yPrev, y0, y1, yNext, t);
        } else if (method === 'Lanczos') {
            y = lanczosInterpolate(waveArray, tGlobal);
        } else if (method === 'Sinc') {
            y = sincInterpolate(waveArray, tGlobal);
        } else if (method === 'PCHIP') {
            y = pchipInterpolate(waveArray, idx, t);
        } else if (method === 'Makima') {
            y = makimaInterpolate(waveArray, idx, t);
        } else {
            y = y0;
        }

        interpolated.push(y);
    }
    return interpolated;
}

// Function to perform interpolation and return Y-points array (currently NOT USED. doInterpolationFixedLength is used instead)
function doInterpolation(waveArray, method) {
    if (waveArray.length < 2 || method === 'OFF') {
        return waveArray.slice(); // Return a copy of the original array
    }

    const interpolated = [];
    const numPoints = waveArray.length;
    const pixelStep = 1202 / (numPoints - 1);

    for (let i = 0; i < numPoints - 1; i++) {
        const y0 = waveArray[i];
        const y1 = waveArray[i + 1];
        const yPrev = i > 0 ? waveArray[i - 1] : y0;
        const yNext = i < numPoints - 2 ? waveArray[i + 2] : y1;
        const steps = Math.ceil(pixelStep);
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            let y;
            if (method === 'Linear') {
                y = y0 + (y1 - y0) * t;
            } else if (method === 'Cubic') {
                y = cubicInterpolate(yPrev, y0, y1, yNext, t);
            } else if (method === 'Lanczos') {
                const tGlobal = i + t;
                y = lanczosInterpolate(waveArray, tGlobal);
            } else if (method === 'Sinc') {
                const tGlobal = i + t;
                y = sincInterpolate(waveArray, tGlobal);
            } else if (method === 'PCHIP') {
                y = pchipInterpolate(waveArray, i, t);
            } else if (method === 'Makima') {
                y = makimaInterpolate(waveArray, i, t);
            } else {
                y = y0;
            }
            interpolated.push(y);
        }
    }
    return interpolated;
}


// Function to convert Y-points array into {x, y} objects for plotting. This function should account for incomplete waveforms (which don't span across the entire grid width) TO-DO: Insert full padding code here!!!
function processForPlotting(waveArray, width, method) {
    // Calculate padding values
    let leftPad = 0;
    let rightPad = 0;
    if (param_timeZoomLvl > 24) { // Calculate padding for roll mode incomplete waveforms
        leftPad = width - ((waveArray.length / appParam_intendedDrawnSamplesInterpolated) * width);
    }

    // calculate real waveform width (minus left/right pad values)
    const trimmedWidth = width - (leftPad + rightPad);

    // Spread points across real width based on array length, taking padding spaces into account
    const numInterpolatedPoints = waveArray.length;
    const pixelStep = trimmedWidth / (numInterpolatedPoints - 1);
    return waveArray.map((y, i) => ({
        x: (i * pixelStep) + leftPad,
        y
    }));
}

// Function to convert Y-points array into {x, y} objects for plotting. This function assumes the waveform will always span across the entire grid width.
function processForPlottingFFT(waveArray, width, method) {
    if (waveArray.length < 2) {
        return waveArray.map((y, i) => ({
            x: (i / (waveArray.length - 1 || 1)) * width,
            y
        }));
    }
    // Spread points across full width based on array length
    const numInterpolatedPoints = waveArray.length;
    const pixelStep = width / (numInterpolatedPoints - 1);
    return waveArray.map((y, i) => ({
        x: i * pixelStep,
        y
    }));
}

// maps 2 wavearrays into X-Y coordinates for XY mode.
function mapForXY(waveArrayA, waveArrayB) {
    let waveXY = [];
    for (let i = 0; i < waveArrayA.length; i++) {
        waveXY[i] = ({
            x: CH1rawPoints[i],
            y: CH2rawPoints[i]
        });
    }
    return waveXY;
}

// Hann Window
function applyHannWindow(data) {
    const N = data.length;
    const windowedData = new Array(N);
    for (let i = 0; i < N; i++) {
        const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Hamming Window
function applyHammingWindow(data) {
    const N = data.length;
    const windowedData = new Array(N);
    for (let i = 0; i < N; i++) {
        const windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1));
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Blackman Window
function applyBlackmanWindow(data) {
    const N = data.length;
    const windowedData = new Array(N);
    for (let i = 0; i < N; i++) {
        const windowValue = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)) +
            0.08 * Math.cos(4 * Math.PI * i / (N - 1));
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Nuttall Window
function applyNuttallWindow(data) {
    const N = data.length;
    const windowedData = new Array(N);
    for (let i = 0; i < N; i++) {
        const windowValue = 0.355768 - 0.487396 * Math.cos(2 * Math.PI * i / (N - 1)) +
            0.144232 * Math.cos(4 * Math.PI * i / (N - 1)) -
            0.012604 * Math.cos(6 * Math.PI * i / (N - 1));
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Blackman-Nuttall Window
function applyBlackmanNuttallWindow(data) {
    const N = data.length;
    const windowedData = new Array(N);
    for (let i = 0; i < N; i++) {
        const windowValue = 0.3635819 - 0.4891775 * Math.cos(2 * Math.PI * i / (N - 1)) +
            0.1365995 * Math.cos(4 * Math.PI * i / (N - 1)) -
            0.0106411 * Math.cos(6 * Math.PI * i / (N - 1));
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Blackman-Harris Window
function applyBlackmanHarrisWindow(data) {
    const N = data.length;
    const windowedData = new Array(N);
    for (let i = 0; i < N; i++) {
        const windowValue = 0.35875 - 0.48829 * Math.cos(2 * Math.PI * i / (N - 1)) +
            0.14128 * Math.cos(4 * Math.PI * i / (N - 1)) -
            0.01168 * Math.cos(6 * Math.PI * i / (N - 1));
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Flattop Window
function applyFlattopWindow(data) {
    const N = data.length;
    const windowedData = new Array(N);
    for (let i = 0; i < N; i++) {
        const windowValue = 0.21557895 - 0.41663158 * Math.cos(2 * Math.PI * i / (N - 1)) +
            0.277263158 * Math.cos(4 * Math.PI * i / (N - 1)) -
            0.083578947 * Math.cos(6 * Math.PI * i / (N - 1)) +
            0.006947368 * Math.cos(8 * Math.PI * i / (N - 1));
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Kaiser Window
function applyKaiserWindow(data, beta = 3.0) {
    const N = data.length;
    const windowedData = new Array(N);
    // Bessel function I0 (zeroth-order modified Bessel function of the first kind)
    function besselI0(x) {
        let sum = 1.0;
        let term = 1.0;
        for (let k = 1; k < 20; k++) { // Approximate with 20 terms
            term *= (x * x) / (4 * k * k);
            sum += term;
            if (term < 1e-10) break; // Stop if terms become negligible
        }
        return sum;
    }
    const I0beta = besselI0(beta);
    for (let i = 0; i < N; i++) {
        const n = i - (N - 1) / 2;
        const windowValue = besselI0(beta * Math.sqrt(1 - (2 * n / (N - 1)) ** 2)) / I0beta;
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Bartlett Window
function applyBartlettWindow(data) {
    const N = data.length;
    const windowedData = new Array(N);
    for (let i = 0; i < N; i++) {
        const windowValue = 1 - Math.abs((2 * i - (N - 1)) / (N - 1));
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Gaussian Window
function applyGaussianWindow(data, sigma = 0.4) {
    const N = data.length;
    const windowedData = new Array(N);
    for (let i = 0; i < N; i++) {
        const n = i - (N - 1) / 2;
        const windowValue = Math.exp(-0.5 * Math.pow(n / (sigma * (N - 1) / 2), 2));
        windowedData[i] = data[i] * windowValue;
    }
    return windowedData;
}

// Main function for FFT
function createFFT(data, window, zoom, scale = 'volts', unitsPerDiv = 10, offsetUnits = 0, impedance = 50) {
    let N = data.length;
    const originalN = N;
    let inputData = data.slice();

    const totalDivisions = 8;
    const graticuleRange = 0.5 - (-0.5);
    const voltsPerUnit = getVPDfromChannel(appParam_FFTSource) * totalDivisions / graticuleRange;
    const trueVoltsData = inputData.map(v => v * voltsPerUnit);

    switch (window) {
        case 'Hann':
            inputData = applyHannWindow(trueVoltsData);
            break;
        case 'Hamming':
            inputData = applyHammingWindow(trueVoltsData);
            break;
        case 'Blackman':
            inputData = applyBlackmanWindow(trueVoltsData);
            break;
        case 'Nuttall':
            inputData = applyNuttallWindow(trueVoltsData);
            break;
        case 'Bkmn-Nuttall':
            inputData = applyBlackmanNuttallWindow(trueVoltsData);
            break;
        case 'Bkmn-Harris':
            inputData = applyBlackmanHarrisWindow(trueVoltsData);
            break;
        case 'Flattop':
            inputData = applyFlattopWindow(trueVoltsData);
            break;
        case 'Kaiser':
            inputData = applyKaiserWindow(trueVoltsData, 8.0);
            break;
        case 'Bartlett':
            inputData = applyBartlettWindow(trueVoltsData);
            break;
        case 'Gaussian':
            inputData = applyGaussianWindow(trueVoltsData, 0.4);
            break;
        case 'Rectangle':
        default:
            inputData = trueVoltsData;
            break;
    }

    if (zoom != '1x') {
        const multiplier = getIntFromString(zoom);
        const newLength = N * multiplier;
        const tempData = new Array(newLength).fill(0);
        for (let i = 0; i < N; i++) tempData[i] = inputData[i];
        inputData = tempData;
        N = newLength;
    }
    if (N <= 1) {
        return inputData;
    }

    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(N)));
    const paddedData = new Array(nextPowerOf2).fill({
        re: 0,
        im: 0
    });
    for (let i = 0; i < N; i++) paddedData[i] = {
        re: inputData[i],
        im: 0
    };

    for (let i = 0; i < nextPowerOf2; i++) {
        let rev = 0;
        for (let j = 0; j < Math.log2(nextPowerOf2); j++) {
            if (i & (1 << j)) rev |= 1 << (Math.log2(nextPowerOf2) - 1 - j);
        }
        if (i < rev)[paddedData[i], paddedData[rev]] = [paddedData[rev], paddedData[i]];
    }

    for (let len = 2; len <= nextPowerOf2; len *= 2) {
        const angle = -2 * Math.PI / len;
        const wlen = {
            re: Math.cos(angle),
            im: Math.sin(angle)
        };
        for (let i = 0; i < nextPowerOf2; i += len) {
            let w = {
                re: 1,
                im: 0
            };
            for (let j = 0; j < len / 2; j++) {
                const u = paddedData[i + j];
                const v = paddedData[i + j + len / 2];
                const t = {
                    re: v.re * w.re - v.im * w.im,
                    im: v.re * w.im + v.im * w.re
                };
                paddedData[i + j] = {
                    re: u.re + t.re,
                    im: u.im + t.im
                };
                paddedData[i + j + len / 2] = {
                    re: u.re - t.re,
                    im: u.im - t.im
                };
                const newW = {
                    re: w.re * wlen.re - w.im * wlen.im,
                    im: w.re * wlen.im + w.im * wlen.re
                };
                w = newW;
            }
        }
    }

    let windowGain = 1.0;
    switch (window) {
        case 'Hann':
            windowGain = 0.4978;
            break;
        case 'Hamming':
            windowGain = 0.5378;
            break;
        case 'Blackman':
            windowGain = 0.4188;
            break;
        case 'Nuttall':
            windowGain = 0.3548;
            break;
        case 'Bkmn-Nuttall':
            windowGain = 0.3633;
            break;
        case 'Bkmn-Harris':
            windowGain = 0.3579;
            break;
        case 'Flattop':
            windowGain = 0.2148;
            break;
        case 'Kaiser':
            windowGain = 0.4354;
            break;
        case 'Bartlett':
            windowGain = 0.4985;
            break;
        case 'Gaussian':
            windowGain = 0.4939;
            break;
        case 'Rectangle':
        default:
            windowGain = 1.0;
            break;
    }
    const windowCorrection = 1 / windowGain;

    const nyquistBin = nextPowerOf2 / 2;
    const fullMagnitudes = new Array(nyquistBin + 1);
    const fullPhases = new Array(nyquistBin + 1);
    for (let i = 0; i <= nyquistBin; i++) {
        const mag = Math.sqrt(paddedData[i].re * paddedData[i].re + paddedData[i].im * paddedData[i].im);
        const normalizedMag = mag / originalN;
        const correctedMag = normalizedMag * windowCorrection;
        if (i === 0 || i === nyquistBin) {
            fullMagnitudes[i] = correctedMag;
        } else {
            fullMagnitudes[i] = 2 * correctedMag;
        }
        fullPhases[i] = Math.atan2(paddedData[i].im, paddedData[i].re) * 180 / Math.PI;
        if (isNaN(fullMagnitudes[i])) fullMagnitudes[i] = 0;
        if (isNaN(fullPhases[i])) fullPhases[i] = 0;
    }

    // Original output
    const output = new Array(fullMagnitudes.length);
    const scaleFactor = graticuleRange / (unitsPerDiv * totalDivisions);

    if (scale === "Linear") {
        const maxMag = Math.max(...fullMagnitudes.filter(m => m > 0));
        for (let i = 0; i < fullMagnitudes.length; i++) {
            const norm = fullMagnitudes[i] > 0 ? fullMagnitudes[i] / maxMag : 0;
            output[i] = (norm * 0.625) - 0.3125;
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    } else if (scale === "V(Peak)") {
        for (let i = 0; i < fullMagnitudes.length; i++) {
            output[i] = (fullMagnitudes[i] - offsetUnits) * scaleFactor;
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    } else if (scale === "V(RMS)") {
        for (let i = 0; i < fullMagnitudes.length; i++) {
            const vrms = fullMagnitudes[i] / Math.sqrt(2);
            output[i] = (vrms - offsetUnits) * scaleFactor;
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    } else if (scale === 'dBV') {
        for (let i = 0; i < fullMagnitudes.length; i++) {
            const dBV = fullMagnitudes[i] > 0 ? 20 * Math.log10(fullMagnitudes[i] / Math.sqrt(2)) : -100;
            output[i] = (dBV - offsetUnits) * scaleFactor;
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    } else if (scale === 'dBm') {
        for (let i = 0; i < fullMagnitudes.length; i++) {
            const dBm = fullMagnitudes[i] > 0 ? 20 * Math.log10(fullMagnitudes[i]) + 10 * Math.log10(1000 / impedance) : -100;
            output[i] = (dBm - offsetUnits) * scaleFactor;
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    } else if (scale === 'dB') {
        const maxMag = Math.max(...fullMagnitudes.filter(m => m > 0));
        for (let i = 0; i < fullMagnitudes.length; i++) {
            const dB = fullMagnitudes[i] > 0 ? 20 * Math.log10(fullMagnitudes[i] / maxMag) : -100;
            output[i] = (dB - offsetUnits) * scaleFactor;
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    } else if (scale === 'dBFS') {
        const fullScale = unitsPerDiv * totalDivisions;
        for (let i = 0; i < fullMagnitudes.length; i++) {
            const dBFS = fullMagnitudes[i] > 0 ? 20 * Math.log10(fullMagnitudes[i] / fullScale) : -100;
            output[i] = (dBFS - offsetUnits) * scaleFactor;
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    } else if (scale === 'dBW') {
        for (let i = 0; i < fullMagnitudes.length; i++) {
            const dBW = fullMagnitudes[i] > 0 ? 20 * Math.log10(fullMagnitudes[i] / Math.sqrt(2)) + 10 * Math.log10(1 / impedance) : -100;
            output[i] = (dBW - offsetUnits) * scaleFactor;
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    } else if (scale === "W(Power)") {
        for (let i = 0; i < fullMagnitudes.length; i++) {
            const power = (fullMagnitudes[i] / Math.sqrt(2)) ** 2 / impedance;
            output[i] = (power - offsetUnits) * scaleFactor;
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    } else if (scale === "Phase") {
        for (let i = 0; i < fullPhases.length; i++) {
            output[i] = fullPhases[i] / 480; // 60 degrees/div
            output[i] = Math.max(-1, Math.min(1, output[i]));
        }
    }

    // truncate to 1024 and return
    const outputSize = 1024;
    const truncatedOutput = output.slice(appParam_FFTZoomPos, outputSize + appParam_FFTZoomPos);
    return truncatedOutput;
}

// performs the specified math operation using the provided wavearray operands
function mathOperation(waveArrayA, waveArrayB, mathOperation) {
    let resultArray = new Array(waveArrayA.length);
    if (mathOperation == 'A+B') {
        for (let i = 0; i < waveArrayA.length; i++) {
            resultArray[i] = waveArrayA[i] + waveArrayB[i];
        }
    } else if (mathOperation == 'A-B') {
        for (let i = 0; i < waveArrayA.length; i++) {
            resultArray[i] = waveArrayA[i] - waveArrayB[i];
        }
    } else if (mathOperation == 'A*B') {
        for (let i = 0; i < waveArrayA.length; i++) {
            resultArray[i] = waveArrayA[i] * waveArrayB[i];
        }
    } else if (mathOperation == 'A/B') {
        for (let i = 0; i < waveArrayA.length; i++) {
            resultArray[i] = waveArrayA[i] / waveArrayB[i];
        }
    } else if (mathOperation === 'Intg(A)') {
        //console.log(`Sample Rate: ${appParam_sampleRate}`);
        //console.log(`First 10 samples of waveArrayA: ${waveArrayA.slice(0, 10)}`);

        const dt = 1 / appParam_sampleRate; // 0.0000001
        //console.log(`dt: ${dt}`);
        resultArray[0] = 0;
        for (let i = 0; i < waveArrayA.length - 1; i++) {
            resultArray[i + 1] = resultArray[i] + waveArrayA[i] * dt;
            if (i % 50 === 49) {
                //console.log(`After ${i + 1} samples: ${resultArray[i + 1]}`);
            }
        }

        //console.log(`Final result after 1200 samples: ${resultArray[1199]}`); // Should be ~0.009
    }
    return resultArray;
}

//---------------------------- CANVAS DRAWING RELATED FUNCTIONS -------------------------------------------------------------------------------------------------------------------------//

// Draws one or more grids, according to the supplied parameters
function drawGrid(ctx, numOfGrids, leftMargin, rightMargin, topMargin, bottomMargin, interMargin, gridMode) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // Calculate total available height for grids, accounting for margins and inter-grid spacing
    const totalMarginHeight = topMargin + bottomMargin + (numOfGrids - 1) * interMargin;
    const availableHeight = canvasHeight - totalMarginHeight;
    const gridHeight = availableHeight / numOfGrids; // Each grid has equal height

    // Grid properties
    const gridRows = 8;
    const gridCols = 12;

    const horizontalScale = 1; // Matches original scaling
    const cellWidth = (canvasWidth - leftMargin - rightMargin) * horizontalScale / gridCols;
    const cellHeight = gridHeight / gridRows;
    const tickPositions = [0.2, 0.4, 0.6, 0.8];
    const tickLength = (numOfGrids > 1) ? (0.008 * gridHeight) : 3; // Fixed for overlay mode, scaled to grid height for stacked mode
    const dotRadius = 0.7; // Fixed pixel size for dots 
    const darkGrey = '#303030';
    const lightGrey = '#808080';

    // Reset shadow properties to ensure no glow on the grid
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    const boundsArray = [];
    // Loop to draw each grid and store its bounds
    for (let gridIndex = 0; gridIndex < numOfGrids; gridIndex++) {
        const yOffset = topMargin + gridIndex * (gridHeight + interMargin);
        const xOffset = leftMargin;
        const gridWidth = cellWidth * gridCols;

        // Store bounds for this grid
        boundsArray.push({
            yMin: yOffset,
            yMax: yOffset + gridHeight,
            xMin: xOffset,
            xMax: xOffset + gridWidth,
            width: gridWidth,
            height: gridHeight
        });
        // Draw vertical lines or dots
        for (let col = 0; col <= gridCols; col++) {
            const x = xOffset + col * cellWidth;
            const isCentral = col === gridCols / 2;
            const isPerimetral = col === 0 || col === gridCols;
            if (gridMode === 'Lines' || isPerimetral || isCentral) {
                ctx.strokeStyle = isPerimetral || isCentral ? lightGrey : darkGrey;
                ctx.lineWidth = (isPerimetral) ? 2 : (isCentral ? ((numOfGrids == 1) ? 2 : (0.004 * gridHeight)) : 1); // draws the lines thicker or thinner depending on the specific case
                ctx.beginPath();
                ctx.moveTo(x, yOffset);
                ctx.lineTo(x, yOffset + gridHeight);
                ctx.stroke();
            }
        }
        // Draw horizontal lines or dots
        for (let row = 0; row <= gridRows; row++) {
            const y = yOffset + row * cellHeight;
            const isCentral = row === gridRows / 2;
            const isPerimetral = row === 0 || row === gridRows;
            let isOuterPerimetral = row === 0 || row === gridRows;
            if (gridIndex == 0 && numOfGrids == 1) { // single grid
                isOuterPerimetral = row === 0 || row === gridRows;
            } else if (gridIndex == 0 && numOfGrids > 1) { //first grid of a group
                isOuterPerimetral = row === 0;
            } else if (gridIndex == (numOfGrids - 1) && numOfGrids > 1) { //last grid of a group
                isOuterPerimetral = row === gridRows;
            } else { // middle grids
                isOuterPerimetral = false;
            }
            if (gridMode === 'Lines' || isPerimetral || isCentral) {
                ctx.strokeStyle = isPerimetral || isCentral ? lightGrey : darkGrey;
                ctx.lineWidth = (isPerimetral) ? (isOuterPerimetral ? 2 : (0.004 * gridHeight)) : (isCentral ? ((numOfGrids == 1) ? 2 : (0.004 * gridHeight)) : 1); // draws the lines thicker or thinner depending on the specific case
                ctx.beginPath();
                ctx.moveTo(xOffset, y);
                ctx.lineTo(xOffset + gridWidth, y);
                ctx.stroke();
            }
        }
        // Draw ticks or dots
        for (let row = 0; row <= gridRows; row++) {
            const y = yOffset + row * cellHeight;
            const isCentralRow = row === gridRows / 2;
            const isPerimetralRow = row === 0 || row === gridRows;
            for (let col = 0; col < gridCols; col++) {
                const xStart = xOffset + col * cellWidth;
                const xEnd = xOffset + (col + 1) * cellWidth;
                tickPositions.forEach(pos => {
                    const x = xStart + pos * (xEnd - xStart);
                    ctx.strokeStyle = isCentralRow || isPerimetralRow ? lightGrey : darkGrey;
                    ctx.lineWidth = 1;
                    if (isCentralRow || isPerimetralRow) {
                        if (row > 0) {
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x, y - tickLength);
                            ctx.stroke();
                        }
                        if (row < gridRows) {
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x, y + tickLength);
                            ctx.stroke();
                        }
                    } else if (gridMode === 'Dots') {
                        ctx.fillStyle = lightGrey;
                        ctx.beginPath();
                        ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
                        ctx.fill();
                    } else {
                        if (row > 0) {
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x, y - tickLength);
                            ctx.stroke();
                        }
                        if (row < gridRows) {
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x, y + tickLength);
                            ctx.stroke();
                        }
                    }
                });
            }
        }
        for (let col = 0; col <= gridCols; col++) {
            const x = xOffset + col * cellWidth;
            const isCentralCol = col === gridCols / 2;
            const isPerimetralCol = col === 0 || col === gridCols;
            for (let row = 0; row < gridRows; row++) {
                const yStart = yOffset + row * cellHeight;
                const yEnd = yOffset + (row + 1) * cellHeight;
                tickPositions.forEach(pos => {
                    const y = yStart + pos * (yEnd - yStart);
                    ctx.strokeStyle = isCentralCol || isPerimetralCol ? lightGrey : darkGrey;
                    ctx.lineWidth = 1;
                    if (isCentralCol || isPerimetralCol) {
                        if (col > 0) {
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x - tickLength, y);
                            ctx.stroke();
                        }
                        if (col < gridCols) {
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x + tickLength, y);
                            ctx.stroke();
                        }
                    } else if (gridMode === 'Dots') {
                        ctx.fillStyle = lightGrey;
                        ctx.beginPath();
                        ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
                        ctx.fill();
                    } else {
                        if (col > 0) {
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x - tickLength, y);
                            ctx.stroke();
                        }
                        if (col < gridCols) {
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(x + tickLength, y);
                            ctx.stroke();
                        }
                    }
                });
            }
        }
        // Draw additional dots at intersections in Dots mode
        if (gridMode === 'Dots') {
            for (let row = 0; row <= gridRows; row++) {
                const y = yOffset + row * cellHeight;
                const isCentralRow = row === gridRows / 2;
                const isPerimetralRow = row === 0 || row === gridRows;
                for (let col = 0; col <= gridCols; col++) {
                    const x = xOffset + col * cellWidth;
                    const isCentralCol = col === gridCols / 2;
                    const isPerimetralCol = col === 0 || col === gridCols;
                    if (!(isCentralRow || isPerimetralRow || isCentralCol || isPerimetralCol)) {
                        ctx.fillStyle = lightGrey;
                        ctx.beginPath();
                        ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
        }
        // Draw central and border ticks
        const centralRow = gridRows / 2;
        const centralCol = gridCols / 2;
        const yCentral = yOffset + centralRow * cellHeight;
        const xCentral = xOffset + centralCol * cellWidth;
        for (let col = 0; col <= gridCols; col++) {
            const x = xOffset + col * cellWidth;
            ctx.strokeStyle = lightGrey;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, yCentral);
            ctx.lineTo(x, yCentral - tickLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, yCentral);
            ctx.lineTo(x, yCentral + tickLength);
            ctx.stroke();
        }
        for (let row = 0; row <= gridRows; row++) {
            const y = yOffset + row * cellHeight;
            ctx.strokeStyle = lightGrey;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(xCentral, y);
            ctx.lineTo(xCentral - tickLength, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(xCentral, y);
            ctx.lineTo(xCentral + tickLength, y);
            ctx.stroke();
        }
        const yTop = yOffset;
        const yBottom = yOffset + gridHeight;
        for (let col = 0; col <= gridCols; col++) {
            const x = xOffset + col * cellWidth;
            ctx.strokeStyle = lightGrey;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, yTop);
            ctx.lineTo(x, yTop + tickLength);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, yBottom);
            ctx.lineTo(x, yBottom - tickLength);
            ctx.stroke();
        }
        const xLeft = xOffset;
        const xRight = xOffset + gridWidth;
        for (let row = 0; row <= gridRows; row++) {
            const y = yOffset + row * cellHeight;
            ctx.strokeStyle = lightGrey;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(xLeft, y);
            ctx.lineTo(xLeft + tickLength, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(xRight, y);
            ctx.lineTo(xRight - tickLength, y);
            ctx.stroke();
        }
    }
    gridBoundsArray = boundsArray; // Return bounds for all grids
}

// Function to ensure the oscilloscope waveforms aren't drawn outside of the grids
function clipLine(x0, y0, x1, y1, xMin, xMax, yMin, yMax) {
    const INSIDE = 0;
    const LEFT = 1;
    const RIGHT = 2;
    const TOP = 4;
    const BOTTOM = 8;

    function computeOutcode(x, y) {
        let code = INSIDE;
        if (x < xMin) code |= LEFT;
        else if (x > xMax) code |= RIGHT;
        if (y < yMin) code |= TOP;
        else if (y > yMax) code |= BOTTOM;
        return code;
    }
    let outcode0 = computeOutcode(x0, y0);
    let outcode1 = computeOutcode(x1, y1);
    let accept = false;
    let x0Clip = x0,
        y0Clip = y0,
        x1Clip = x1,
        y1Clip = y1;
    while (true) {
        if (!(outcode0 | outcode1)) {
            accept = true;
            break;
        } else if (outcode0 & outcode1) {
            break;
        } else {
            let outcodeOut = outcode0 ? outcode0 : outcode1;
            let x, y;
            if (outcodeOut & TOP) {
                x = x0Clip + (x1Clip - x0Clip) * (yMin - y0Clip) / (y1Clip - y0Clip);
                y = yMin;
            } else if (outcodeOut & BOTTOM) {
                x = x0Clip + (x1Clip - x0Clip) * (yMax - y0Clip) / (y1Clip - y0Clip);
                y = yMax;
            } else if (outcodeOut & LEFT) {
                y = y0Clip + (y1Clip - y0Clip) * (xMin - x0Clip) / (x1Clip - x0Clip);
                x = xMin;
            } else if (outcodeOut & RIGHT) {
                y = y0Clip + (y1Clip - y0Clip) * (xMax - x0Clip) / (x1Clip - x0Clip);
                x = xMax;
            }
            if (outcodeOut === outcode0) {
                x0Clip = x;
                y0Clip = y;
                outcode0 = computeOutcode(x0Clip, y0Clip);
            } else {
                x1Clip = x;
                y1Clip = y;
                outcode1 = computeOutcode(x1Clip, y1Clip);
            }
        }
    }
    if (accept) {
        return {
            x0: x0Clip,
            y0: y0Clip,
            x1: x1Clip,
            y1: y1Clip,
            visible: true
        };
    } else {
        return {
            visible: false
        };
    }
}

// Draws a waveform from the supplied data (points) and parameters
function drawWaveform(ctx, points, gridBounds, color, interpMethod, lineThickness) {
    // Default display settings
    ctx.shadowBlur = 0; //15;
    ctx.shadowColor = 'transparent'; // color;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = getIntFromString(lineThickness);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    if (interpMethod == 'OFF') {
        // Draw dots
        points.forEach(p => {
            const x = p.x;
            const y = p.y;
            const outcode = computeOutcode(x, y, gridBounds.xMin, gridBounds.xMax, gridBounds.yMin, gridBounds.yMax);
            if (outcode === 0) { // INSIDE
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, 2 * Math.PI); // Dot size remains 1px radius
                ctx.fill();
            }
        });
    } else {
        // Draw lines
        ctx.beginPath();
        let firstVisible = true;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const x0 = p0.x;
            const y0 = p0.y;
            const x1 = p1.x;
            const y1 = p1.y;
            const clipped = clipLine(x0, y0, x1, y1, gridBounds.xMin, gridBounds.xMax, gridBounds.yMin, gridBounds.yMax);
            if (clipped.visible) {
                if (firstVisible) {
                    ctx.moveTo(clipped.x0, clipped.y0);
                    firstVisible = false;
                } else {
                    ctx.lineTo(clipped.x0, clipped.y0);
                }
                ctx.lineTo(clipped.x1, clipped.y1);
            } else {
                firstVisible = true;
            }
        }
        ctx.stroke();
    }
    // Reset shadow properties after drawing the waveform
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
}

// Helper function for outcode computation in drawWaveform
function computeOutcode(x, y, xMin, xMax, yMin, yMax) {
    const INSIDE = 0;
    const LEFT = 1;
    const RIGHT = 2;
    const TOP = 4;
    const BOTTOM = 8;
    let code = INSIDE;
    if (x < xMin) code |= LEFT;
    else if (x > xMax) code |= RIGHT;
    if (y < yMin) code |= TOP;
    else if (y > yMax) code |= BOTTOM;
    return code;
}

// Draws the trigger line, with a timer of 10 frames to disappear
function drawTriggerLine(ctx, gridIndex) {
    let gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
    let gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
    if (appParam_lastTriggerPos == ((param_triggerCH1CH2 == 0 ? param_CH1verticalPos : param_CH2verticalPos) - param_triggerlevel)) {
        if (appParam_triggerLineCountdown >= 0) {
            appParam_triggerLineCountdown--;
            drawHorizontalLine(ctx, (gridCenterY - ((param_triggerlevel - 128) / 200) * gridHeight), gridBoundsArray[gridIndex], 'white', 5, 1);
        } else {
            return;
        }
    } else {
        appParam_lastTriggerPos = ((param_triggerCH1CH2 == 0 ? param_CH1verticalPos : param_CH2verticalPos) - param_triggerlevel);
        appParam_triggerLineCountdown = 10;
        drawHorizontalLine(ctx, (gridCenterY - ((param_triggerlevel - 128) / 200) * gridHeight), gridBoundsArray[gridIndex], 'white', 5, 1);
    }
}

// Draws a dashed horizontal line from side to side of the grid
function drawHorizontalLine(ctx, Yoffset, gridBounds, color, dashLength, lineThickness) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    ctx.save();
    const lineStart = gridBounds.xMin;
    const lineEnd = gridBounds.xMax;
    // Dashed line
    ctx.lineWidth = lineThickness;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.setLineDash([dashLength, 3]);
    ctx.moveTo(lineStart, Yoffset);
    ctx.lineTo(lineEnd, Yoffset);
    ctx.stroke();

    ctx.restore();
}

// Draws a dashed vertical line from side to side of the grid
function drawVerticalLine(ctx, Xoffset, gridBounds, color, dashLength, lineThickness) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    ctx.save();
    const lineStart = gridBounds.yMin;
    const lineEnd = gridBounds.yMax;
    // Dashed line
    ctx.lineWidth = lineThickness;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.setLineDash([dashLength, 3]);
    ctx.moveTo(Xoffset, lineStart);
    ctx.lineTo(Xoffset, lineEnd);
    ctx.stroke();

    ctx.restore();
}

// Draws text on the canvas with an invert option: 0 for normal text, 1 for inverted text (black text on colored rectangle)
function drawText(ctx, text, xPosition, yPosition, fontSize, color, invert = 0, isCentered = 0, leftLimit = 0, rightLimit = 0) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    let x = xPosition;
    let y = yPosition;
    const boundLeft = leftLimit;
    const boundRight = canvasWidth - rightLimit;
    let rectX = 0;
    ctx.shadowBlur = 0; // 15;
    ctx.shadowColor = 'transparent'; //color;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = `${fontSize}px 'oscilloscope_custom', monospace`; // Specify the font!!!
    if (isCentered == 0) {
        ctx.textAlign = 'left';
    } else if (isCentered == 1) {
        ctx.textAlign = 'center';
    } else {
        ctx.textAlign = 'right';
    }
    ctx.textBaseline = 'middle';
    // Measure the text to determine the background rectangle size
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize; // Approximate height based on font size
    if (isCentered == 1) { // if text is centered and a left or right limit is set, adjust the text position accordingly
        if (leftLimit > 0) {
            if ((x - textWidth / 2) < boundLeft) {
                x = x + (boundLeft - (x - textWidth / 2));
            }
        }
        if (rightLimit > 0) {
            if ((x + textWidth / 2) > boundRight) {
                x = x - ((x + textWidth / 2) - boundRight);
            }
        }
    }
    const padding_top = fontSize * 0.2; // Add some padding around the text
    const padding_bottom = fontSize * 0.2; // Add some padding around the text
    const padding_left = fontSize * 0.3; // Add some padding around the text
    const padding_right = fontSize * 0.2; // Add some padding around the text
    if (isCentered == 1) {
        rectX = x - textWidth / 2 - padding_left;
    } else {
        rectX = x - padding_left;
    }

    const rectY = y - textHeight / 2 - padding_top;
    const rectWidth = textWidth + padding_left + padding_right;
    const rectHeight = textHeight + padding_top + padding_bottom;
    if (invert === 1) {
        // Save the current canvas state
        ctx.save();
        // Draw the colored background rectangle
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(rectX), Math.round(rectY), Math.round(rectWidth), Math.round(rectHeight));
        // Write black text on top
        ctx.fillStyle = 'black';
        ctx.fillText(text, Math.round(x), Math.round(y));
    } else {
        // Normal text rendering
        ctx.fillStyle = color;
        ctx.fillText(text, Math.round(x), Math.round(y));
    }
    // Restore the canvas state
    ctx.restore();
}

// call this function to show a popup message on screen, with a timer of 10 frames to disappear. channelName determines the color and the placement of the message. "ALL" shows message in white at center of the screen
function showMessage(text, channelName = "ALL") {
    appParam_message = text;
    appParam_lastMessage = '';
    appParam_messageChannel = channelName;
    appParam_messageCountdown = 10;
}

// function to draw the popup messages
function drawMessage() {
    canvas = document.getElementById('plotCanvas');
    context = canvas.getContext('2d');
    const canvasWidth = context.canvas.width;
    const canvasHeight = context.canvas.height;
    let gridIndex = 0;
    let messageColor = '';
    let gridCenterX = (((canvasWidth - gridLeftMargin - gridRightMargin) / 2) + gridLeftMargin);
    let gridCenterY = canvasWidth / 2;

    function drawMessageNow(context, gridCenterX, gridCenterY, messageColor) { // function inside a function, it's fine
        if (appParam_lastMessage == appParam_message) {
            if (appParam_messageCountdown >= 0) {
                appParam_messageCountdown--;
                drawText(context, appParam_message, gridCenterX, gridCenterY, 23, messageColor, 1, 1);
            } else {
                return;
            }
        } else {
            appParam_lastMessage = appParam_message;
            appParam_messageCountdown = 10;
            drawText(context, appParam_message, gridCenterX, gridCenterY, 23, messageColor, 1, 1);
        }
    }
    if (appParam_messageChannel == 'ALL') {
        gridCenterY = (((canvasHeight - gridTopMargin - gridBottomMargin) / 2) + gridTopMargin);
        messageColor = 'white';
        drawMessageNow(context, gridCenterX, gridCenterY, messageColor);
        return;
    }
    if (appParam_messageChannel == 'CH1') {
        gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        messageColor = 'yellow';
        drawMessageNow(context, gridCenterX, gridCenterY, messageColor);
        return;
    }
    if (param_CH2enabled === 1) {
        gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
        gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        if (appParam_messageChannel == 'CH2') {
            messageColor = '#00E020';
            drawMessageNow(context, gridCenterX, gridCenterY, messageColor);
            return;
        }
    }
    if (appParam_mathEnabled == 'ON') {
        gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
        gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        if (appParam_messageChannel == 'MATH1') {
            messageColor = 'dodgerblue';
            drawMessageNow(context, gridCenterX, gridCenterY, messageColor);
            return;
        }
    }
    if (appParam_FFTEnabled == 'ON') {
        gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
        gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        if (appParam_messageChannel == 'FFT') {
            messageColor = 'red';
            drawMessageNow(context, gridCenterX, gridCenterY, messageColor);
            return;
        }
    }
}

// write channel measurements on the screen
function writeMeasurements(ctx, channelName, yPosition) {
    let measColor = '';
    let textChan = '';
    let offset = 47;
    let offsetIndex = 0;

    function giveName(index) {
        for (let i = 0; i < table_Meas[0].length; i++) {
            if (appParam_Meas[index] == table_Meas[0][i]) {
                return table_Meas[1][i];
            }
        }
        return '';
    }

    function giveValue(index) {
        for (let i = 0; i < table_Meas[0].length; i++) {
            if (appParam_Meas[index] == table_Meas[0][i]) {
                return table_Meas[2][i];
            }
        }
        return '';
    }
    if (channelName == 'CH1') {
        measColor = 'yellow';
        drawText(ctx, 'CH1', (gridLeftMargin + 9), yPosition, 15, measColor, 1, 0);
        getMeasurements(removeExistingOffset(CH1rawPoints, 'CH1'), appParam_currVPD_CH1, appParam_currTPD);
    } else if (channelName == 'CH2') {
        measColor = '#00E020';
        drawText(ctx, 'CH2', (gridLeftMargin + 9), yPosition, 15, measColor, 1, 0);
        getMeasurements(removeExistingOffset(CH2rawPoints, 'CH2'), appParam_currVPD_CH2, appParam_currTPD);
    } else if (channelName == 'FFT') {
        measColor = 'red';
        drawText(ctx, 'FFT', (gridLeftMargin + 9), yPosition, 15, measColor, 1, 0);
    } else if (channelName == 'MATH1') {
        measColor = 'dodgerblue';
        drawText(ctx, 'MAT', (gridLeftMargin + 9), yPosition, 15, measColor, 1, 0);
        getMeasurements(removeExistingOffset(MATH1rawPoints, 'MATH1'), table_VPD[2][appParam_mathVoltsZoom], appParam_currTPD);
    }
    if (channelName != 'FFT' && channelName != 'CURSORS') {
        for (let i = 1; i < appParam_Meas.length; i++) {
            if (appParam_Meas[i] != 'None') {
                if (appParam_menuPage == 0) {
                    drawText(ctx, giveName(i) + giveValue(i), (gridLeftMargin + offset) + (135 * offsetIndex), yPosition, 15, measColor, 0, 0);
                } else if (i != (appParam_Meas.length - 1)) {
                    drawText(ctx, giveName(i) + giveValue(i), (gridLeftMargin + offset) + (135 * offsetIndex), yPosition, 15, measColor, 0, 0);
                }
                offsetIndex++;
            }
        }
    }

    if (channelName == 'FFT') {
        let fftMeas = [
            "not used",
            "SNR:" + autoUnit(appParam_FFTMeasurements.snrDB, 2, "dB"),
            "SINAD:" + autoUnit(appParam_FFTMeasurements.sinadDB, 2, "dB"),
            "THD:" + appParam_FFTMeasurements.thdPercentage.toFixed(2) + "%",
            "THD+N:" + appParam_FFTMeasurements.thdnPercentage.toFixed(2) + "%",
            "SFDR:" + autoUnit(appParam_FFTMeasurements.sfdrDBc, 2, "dBc"),
            "ENOB:" + appParam_FFTMeasurements.enobBits.toFixed(2) + "Bit"
        ];
        drawText(ctx, "Src:" + appParam_FFTSource + " (" + appParam_FFTZoom + ")", (gridLeftMargin + offset) + (135 * offsetIndex), yPosition, 15, measColor, 0, 0);
        for (let i = 1; i < fftMeas.length; i++) {
            if (appParam_menuPage == 0) {
                drawText(ctx, fftMeas[i], (gridLeftMargin + offset) + (135 * (offsetIndex + 1)), yPosition, 15, measColor, 0, 0);
            } else if (i != (appParam_Meas.length - 1)) {
                drawText(ctx, fftMeas[i], (gridLeftMargin + offset) + (135 * (offsetIndex + 1)), yPosition, 15, measColor, 0, 0);
            }
            offsetIndex++;
        }
    }

    if (channelName == 'CURSORS') {
        let unitX = "s";
        let unitY = "V"
        const lighterGrey = '#AAAAAA';
        let fftMeasColor = [lighterGrey, lighterGrey, lighterGrey, lighterGrey, lighterGrey, lighterGrey, lighterGrey];

        switch (appParam_cursorSelected) {
            case 'X1':
                fftMeasColor[0] = 'white';
                break;
            case 'X2':
                fftMeasColor[1] = 'white';
                break;
            case 'X1+X2':
                fftMeasColor[0] = 'white';
                fftMeasColor[1] = 'white';
                break;
            case 'Y1':
                fftMeasColor[2] = 'white';
                break;
            case 'Y2':
                fftMeasColor[3] = 'white';
                break;
            case 'Y1+Y2':
                fftMeasColor[2] = 'white';
                fftMeasColor[3] = 'white';
                break;
            default:
                break;
        }

        if (appParam_cursorSource == 'FFT') {
            unitX = "Hz";
            if (appParam_FFTUnits != 'None') {
                unitY = appParam_FFTUnits;
            }
        }
        if (appParam_cursorSource == 'FFT') {
            drawText(ctx, 'CUR', (gridLeftMargin + 9), yPosition, 15, 'white', 1, 0);
            drawText(ctx, "X1:" + autoUnit(appParam_cursorX1Val, 2, unitX), (gridLeftMargin + offset) + (135 * 0), yPosition, 15, fftMeasColor[0], 0, 0);
            drawText(ctx, "X2:" + autoUnit(appParam_cursorX2Val, 2, unitX), (gridLeftMargin + offset) + (135 * 1), yPosition, 15, fftMeasColor[1], 0, 0);
            if (appParam_FFTScale == 'Linear') {
                drawText(ctx, "ΔX:" + autoUnit(appParam_cursorDX, 2, unitX), (gridLeftMargin + offset) + (135 * 2), yPosition, 15, lighterGrey, 0, 0);
            } else if (appParam_FFTScale == 'Phase') {
                drawText(ctx, "Y1:" + appParam_cursorY1Val.toFixed(2) + unitY, (gridLeftMargin + offset) + (135 * 2), yPosition, 15, fftMeasColor[2], 0, 0);
                drawText(ctx, "Y2:" + appParam_cursorY2Val.toFixed(2) + unitY, (gridLeftMargin + offset) + (135 * 3), yPosition, 15, fftMeasColor[3], 0, 0);
                drawText(ctx, "ΔX:" + autoUnit(appParam_cursorDX, 2, unitX), (gridLeftMargin + offset) + (135 * 4), yPosition, 15, lighterGrey, 0, 0);
                drawText(ctx, "ΔY:" + appParam_cursorDY.toFixed(2) + unitY, (gridLeftMargin + offset) + (135 * 5), yPosition, 15, lighterGrey, 0, 0);
            } else {
                drawText(ctx, "Y1:" + autoUnit(appParam_cursorY1Val, 2, unitY), (gridLeftMargin + offset) + (135 * 2), yPosition, 15, fftMeasColor[2], 0, 0);
                drawText(ctx, "Y2:" + autoUnit(appParam_cursorY2Val, 2, unitY), (gridLeftMargin + offset) + (135 * 3), yPosition, 15, fftMeasColor[3], 0, 0);
                drawText(ctx, "ΔX:" + autoUnit(appParam_cursorDX, 2, unitX), (gridLeftMargin + offset) + (135 * 4), yPosition, 15, lighterGrey, 0, 0);
                drawText(ctx, "ΔY:" + autoUnit(appParam_cursorDY, 2, unitY), (gridLeftMargin + offset) + (135 * 5), yPosition, 15, lighterGrey, 0, 0);
            }

        } else {
            drawText(ctx, 'CUR', (gridLeftMargin + 9), yPosition, 15, 'white', 1, 0);
            drawText(ctx, "X1:" + autoUnit(appParam_cursorX1Val, 2, unitX), (gridLeftMargin + offset) + (135 * 0), yPosition, 15, fftMeasColor[0], 0, 0);
            drawText(ctx, "X2:" + autoUnit(appParam_cursorX2Val, 2, unitX), (gridLeftMargin + offset) + (135 * 1), yPosition, 15, fftMeasColor[1], 0, 0);
            drawText(ctx, "Y1:" + autoUnit(appParam_cursorY1Val, 2, unitY), (gridLeftMargin + offset) + (135 * 2), yPosition, 15, fftMeasColor[2], 0, 0);
            drawText(ctx, "Y2:" + autoUnit(appParam_cursorY2Val, 2, unitY), (gridLeftMargin + offset) + (135 * 3), yPosition, 15, fftMeasColor[3], 0, 0);
            drawText(ctx, "ΔX:" + autoUnit(appParam_cursorDX, 2, unitX), (gridLeftMargin + offset) + (135 * 4), yPosition, 15, lighterGrey, 0, 0);
            drawText(ctx, "1/ΔX:" + autoUnit(appParam_cursor1divDX, 2, "Hz"), (gridLeftMargin + offset) + (135 * 5), yPosition, 15, lighterGrey, 0, 0);
            drawText(ctx, "ΔY:" + autoUnit(appParam_cursorDY, 2, unitY), (gridLeftMargin + offset) + (135 * 6), yPosition, 15, lighterGrey, 0, 0);
        }
    }
}

// self-explanatory
function clearAllCanvas() {
    let canvas = document.getElementById('gridCanvas');
    let context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    canvas = document.getElementById('refCanvas');
    context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    canvas = document.getElementById('plotCanvas');
    context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    canvas = document.getElementById('menuCanvas');
    context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
}

// unlits all the oscilloscope buttons
function turnOffAllDOM() {
    let lights = document.getElementsByClassName("button-lit");
    while (lights.length) {
        lights[0].classList.remove("button-lit");
    }
    lights = document.getElementsByClassName("led-lit");
    while (lights.length) {
        lights[0].classList.remove("led-lit");
    }
}

//---------------------------- MISC FUNCTIONS -------------------------------------------------------------------------------------------------------------------------//

// converts between different unit magnitudes
function autoUnit(value, decimals, baseUnit = 'V') {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return `NaN${baseUnit}`;
    }
    // Define unit prefixes and their scaling factors (SI units)
    const prefixes = [{
            prefix: 'p',
            factor: 1e-12
        }, // pico
        {
            prefix: 'n',
            factor: 1e-9
        }, // nano
        {
            prefix: 'µ',
            factor: 1e-6
        }, // micro
        {
            prefix: 'm',
            factor: 1e-3
        }, // milli
        {
            prefix: '',
            factor: 1
        }, // base unit (no prefix)
        {
            prefix: 'k',
            factor: 1e3
        }, // kilo
        {
            prefix: 'M',
            factor: 1e6
        }, // mega
        {
            prefix: 'G',
            factor: 1e9
        } // giga
    ];
    const absValue = Math.abs(value); // Handle negative values
    let selectedPrefix = prefixes[4]; // Default to base unit
    let scaledValue = value;
    // Find the appropriate prefix
    for (let i = 0; i < prefixes.length; i++) {
        const {
            factor,
            prefix
        } = prefixes[i];
        const candidate = absValue / factor;
        if (candidate == 0) {
            selectedPrefix = prefixes[4];
            break;
        } else if (candidate >= 1 && candidate < 1000) {
            selectedPrefix = prefixes[i];
            scaledValue = value / factor;
            break;
        } else if (candidate < 1 && i === 0) {
            selectedPrefix = prefixes[0];
            scaledValue = value / prefixes[0].factor;
            break;
        } else if (candidate >= 1000 && i === prefixes.length - 1) {
            selectedPrefix = prefixes[prefixes.length - 1];
            scaledValue = value / prefixes[prefixes.length - 1].factor;
            break;
        }
    }
    // Round to the specified decimal places and format as string
    const formattedValue = scaledValue.toFixed(decimals);
    // if final rounded value is zero, select base unit (no prefix).
    if (formattedValue == 0) {
        selectedPrefix = prefixes[4];
    }
    return `${formattedValue}${selectedPrefix.prefix}${baseUnit}`;
}

// Function to return an int number from a string
function getIntFromString(str) {
    var num = str.replace(/[^0-9]/g, '');
    return parseInt(num, 10);
}

function decimalToHex(decNumber) {
    return decNumber.toString(16).toUpperCase();
}

function hexToDecimal(hexNumber) {
    return parseInt(hexNumber, 16);
}

// Function to track and display total time between plotBuffer changes
function trackBufferChangeTime(currentBuffer, ctx) {
    const now = performance.now(); // High-resolution timestamp in milliseconds

    if (previousPlotBuffer1 !== currentBuffer) {
        // Buffer has changed
        if (timeLastChange !== null) {
            const elapsed = now - timeLastChange;
            elapsedTimeText = `${elapsed.toFixed(0)} ms`; // Update with time between changes
            //console.log(`Time between buffer changes: ${elapsed.toFixed(0)} ms`);
        }
        timeLastChange = now; // Reset the timestamp for the next change
        previousPlotBuffer1 = currentBuffer; // Update the previous buffer

        appParam_bufferUpdated = true; // Signal a genuinely new acquisition frame (consumed by the recorder after processWaveforms)

        // Backup useful channel data
        last_param_timeZoomLvl = param_timeZoomLvl;
        last_param_CH1trueVerticalPos = param_CH1trueVerticalPos;
        last_param_CH1voltsZoom = param_CH1voltsZoom;
        last_param_CH2trueVerticalPos = param_CH2trueVerticalPos;
        last_param_CH2voltsZoom = param_CH2voltsZoom;
    }
}


//---------------------------- OSCILLOSCOPE APP RELATED FUNCTIONS -------------------------------------------------------------------------------------------------------------------------//

// translates the volts/div value from the oscilloscope parameters into the appropiate text (0) or number (1) value
function getVoltsDiv(voltsDivValue, x1x10Value, textOrNum) {
    //values 4-13
    for (let i = 0; i < table_VPD[0].length; i++) {
        if (table_VPD[0][i] == (voltsDivValue + (x1x10Value * 3))) {
            return textOrNum == 0 ? table_VPD[1][i] : table_VPD[2][i];
        }
    }
}

// translates the time/div value from the oscilloscope parameters into the appropiate text (0) or number (1) value
function getTimeDiv(timeDivValue, textOrNum) {
    //values 2-30
    for (let i = 0; i < table_TPD[0].length; i++) {
        if (table_TPD[0][i] == timeDivValue) {
            return textOrNum == 0 ? table_TPD[1][i] : table_TPD[2][i];
        }
    }
}

// gets the units used by the scaling mode
function getFFTUnits() {
    //values 4-13
    for (let i = 0; i < table_FFTScale[0].length; i++) {
        if (table_FFTScale[0][i] == appParam_FFTScale) {
            return table_FFTScale[1][i];
        }
    }
}

function getVPDfromChannel(channelName) {
    if (channelName == 'CH1') {
        return appParam_currVPD_CH1;
    } else if (channelName == 'CH2') {
        return appParam_currVPD_CH2;
    } else if (channelName == 'MATH1') {
        return table_VPD[2][appParam_mathVoltsZoom];
    } else if (channelName == 'FFT') {
        return 1;
    } else if (channelName == 'REF') {
        return appParam_REFVPD;
    } else {
        return 1;
    }
}

// returns true if channel is available/enabled, false if it's not
function isAvailable(channelName) {
    if (channelName == 'CH1') {
        return true;
    } else if (channelName == 'CH2') {
        return param_CH2enabled == 1 ? true : false;
    } else if (channelName == 'MATH1') {
        return appParam_mathEnabled == 'ON' ? true : false;
    } else if (channelName == 'FFT') {
        return appParam_FFTEnabled == 'ON' ? true : false;
    } else if (channelName == 'REF') {
        return appParam_REFEnabled > 0 ? true : false;
    } else {
        return false;
    }
}

// removes existing offset of a single value from a channel. Used for cursor measurements
function removeExistingOffsetSingle(singleValue, chan) {
    if (chan == 'CH1') {
        const offsetValue = ((param_CH1verticalPos - 128) / 200);
        return singleValue - offsetValue;
    } else if (chan == 'CH2') {
        const offsetValue = ((param_CH2verticalPos - 128) / 200);
        return singleValue - offsetValue;
    } else if (chan == 'MATH1') {
        return singleValue - appParam_mathOffset;
    } else if (chan == 'FFT') {
        return singleValue - appParam_FFTOffset;
    } else {
        return singleValue;
    }
}

// removes existing offset if a waveform is CH1 or CH2. Used to normalize the operands in waveform Math operations
function removeExistingOffset(waveArray, chan) {
    if (chan == 'CH1') {
        const offsetValue = ((param_CH1verticalPos - 128) / 200);
        return waveArray.map(value => value - offsetValue);
    } else if (chan == 'CH2') {
        const offsetValue = ((param_CH2verticalPos - 128) / 200);
        return waveArray.map(value => value - offsetValue);
    } else if (chan == 'MATH1') {
        return waveArray.map(value => value - appParam_mathOffset);
    } else if (chan == 'FFT') {
        return waveArray.map(value => value - appParam_FFTOffset);
    } else {
        return waveArray;
    }
}

// applies vpdB scaling to a waveform array which has vpdA scaling
function scaleVoltsAtoB(waveArrayA, vpdA, vpdB) {
    // Avoid division by zero
    if (vpdB === 0) {
        throw new Error("vpdB cannot be zero");
    }
    // Calculate the scaling factor
    const scaleFactor = vpdA / vpdB;
    // Scale the array
    return waveArrayA.map(value => value * scaleFactor);
}

// applies an offset to a waveform array
function applyOffset(waveArrayA, offsetValue) {
    // Apply the offset
    return waveArrayA.map(value => value + offsetValue);
}

// Analyse the FFT, obtain the FFT bandwidth, detect the dominant frequencies and their amplitude values.
function analyzeFFT(fftArray, zoom, waveArray, timePerDivision, numOfPeaks = 0) {
    const outputLength = fftArray.length; // Now fixed at 1024
    const originalDataLength = waveArray.length;
    const totalTime = timePerDivision * 12;
    const originalSampleRate = originalDataLength / totalTime;
    // Calculate padded FFT length
    const N = originalDataLength * getIntFromString(zoom);
    const paddedLength = Math.pow(2, Math.ceil(Math.log2(N)));
    const nyquistBin = paddedLength / 2;
    // Bandwidth covered by the 1024 samples
    const fullNyquistFreq = originalSampleRate / 2;
    const displayedBandwidth = fullNyquistFreq * (outputLength / (nyquistBin + 1)); // Portion of Nyquist
    const freqResolution = displayedBandwidth / (outputLength - 1);
    const startFrequency = freqResolution * appParam_FFTZoomPos;
    // Find dominant frequencies
    const numPeaks = numOfPeaks;
    const peaks = [];
    const maxMagnitude = Math.max(...fftArray);
    const peakThreshold = -1000; // ensures to find the peaks even if the FFT representation is shifted downwards of the zero line
    for (let i = 2; i < fftArray.length - 1; i++) {
        if (fftArray[i] > fftArray[i - 1] && fftArray[i] > fftArray[i + 1] && fftArray[i] > peakThreshold) {
            const freq = (i * freqResolution) + startFrequency;
            peaks.push({
                freq: freq,
                index: i,
                magnitude: fftArray[i]
            });
        }
    }
    peaks.sort((a, b) => b.magnitude - a.magnitude);
    const topPeaks = peaks.slice(0, numPeaks);
    const dominantFrequencies = topPeaks.map(peak => peak.freq);
    return {
        totalBandwidth: displayedBandwidth, // Bandwidth covered by 1024 samples
        dominantFrequencies: dominantFrequencies,
        peaks: topPeaks,
        startFreq: startFrequency
    };
}

// Calculates THD+N (and more related measurements) of a waveArray
function calculateTHDPlusN(waveArray, sampleRate, standard = 'RF') {
    // Validate the standard parameter
    const supportedStandards = ['Audio', 'RF'];
    if (!supportedStandards.includes(standard)) {
        throw new Error(`Unsupported standard: ${standard}. Supported standards are ${supportedStandards.join(', ')}.`);
    }

    // Step 1: Downsample to the nearest lower power-of-2 number of samples
    let N = waveArray.length;
    //const previousPowerOf2 = Math.pow(2, Math.floor(Math.log2(N)));
    const targetLength = 1024;
    let inputData;
    if (N !== targetLength) {
        const downsampledData = new Array(targetLength);
        const ratio = (N - 1) / (targetLength - 1);
        for (let k = 0; k < targetLength; k++) {
            const t = k * ratio;
            const i = Math.floor(t);
            const frac = t - i;
            const iNext = Math.min(i + 1, N - 1);
            downsampledData[k] = waveArray[i] + (waveArray[iNext] - waveArray[i]) * frac;
        }
        inputData = downsampledData;
        N = targetLength;
    } else {
        inputData = waveArray.slice();
    }

    // Step 2: Apply window (Blackman-Harris window, which is the recommended window for these measurements)
    const windowGain = 0.3579;
    const exclusionMargin = 8;
    inputData = applyBlackmanHarrisWindow(inputData);


    // Step 3: Compute FFT (radix-2, size 2048)
    const fftSize = 2048; // previously 1024;
    const paddedData = new Array(fftSize).fill({
        re: 0,
        im: 0
    });
    for (let i = 0; i < N; i++) paddedData[i] = {
        re: inputData[i],
        im: 0
    };

    for (let i = 0; i < fftSize; i++) {
        let rev = 0;
        for (let j = 0; j < Math.log2(fftSize); j++) {
            if (i & (1 << j)) rev |= 1 << (Math.log2(fftSize) - 1 - j);
        }
        if (i < rev)[paddedData[i], paddedData[rev]] = [paddedData[rev], paddedData[i]];
    }

    for (let len = 2; len <= fftSize; len *= 2) {
        const angle = -2 * Math.PI / len;
        const wlen = {
            re: Math.cos(angle),
            im: Math.sin(angle)
        };
        for (let i = 0; i < fftSize; i += len) {
            let w = {
                re: 1,
                im: 0
            };
            for (let j = 0; j < len / 2; j++) {
                const u = paddedData[i + j];
                const v = paddedData[i + j + len / 2];
                const t = {
                    re: v.re * w.re - v.im * w.im,
                    im: v.re * w.im + v.im * w.re
                };
                paddedData[i + j] = {
                    re: u.re + t.re,
                    im: u.im + t.im
                };
                paddedData[i + j + len / 2] = {
                    re: u.re - t.re,
                    im: u.im - t.im
                };
                const newW = {
                    re: w.re * wlen.re - w.im * wlen.im,
                    im: w.re * wlen.im + w.im * wlen.re
                };
                w = newW;
            }
        }
    }

    // Step 4: Compute magnitudes with window correction
    const windowCorrection = 1 / windowGain;
    const nyquistBin = fftSize / 2;
    const fullMagnitudes = new Array(nyquistBin + 1);
    for (let i = 0; i <= nyquistBin; i++) {
        const mag = Math.sqrt(paddedData[i].re * paddedData[i].re + paddedData[i].im * paddedData[i].im);
        const normalizedMag = mag / N;
        const correctedMag = normalizedMag * windowCorrection;
        if (i === 0 || i === nyquistBin) {
            fullMagnitudes[i] = correctedMag;
        } else {
            fullMagnitudes[i] = 2 * correctedMag;
        }
        if (isNaN(fullMagnitudes[i])) fullMagnitudes[i] = 0;
    }

    //MATH1rawPoints = fullMagnitudes.slice(0, Math.ceil((1024 / getIntFromString(appParam_FFTZoom)) * 1.1728515625)); // (half the FFT) TEST FOR VISUALIZATION!!!!!

    // Step 5: THD+N Calculation (using bin indices)
    const thd_totalSamples = fftSize / 2;
    const thd_nyquistFreq = sampleRate / 2;
    const thd_freqPerSample = thd_nyquistFreq / thd_totalSamples;
    const thd_normalBinWidth = sampleRate / N;
    const thd_numBins = Math.floor(thd_nyquistFreq / thd_normalBinWidth);
    const thd_samplesPerBin = thd_totalSamples / thd_numBins;

    // Define frequency limits based on the standard
    let minFundamentalFreq, maxFundamentalFreq, maxHarmonicFreq, noiseMinFreq, noiseMaxFreq;
    if (standard === 'Audio') {
        minFundamentalFreq = 100; // 100 Hz
        maxFundamentalFreq = thd_nyquistFreq; // Up to Nyquist
        maxHarmonicFreq = 20000; // 20,000 Hz
        noiseMinFreq = 20; // 20 Hz
        noiseMaxFreq = 20000; // 20,000 Hz
    } else if (standard === 'RF') {
        minFundamentalFreq = thd_freqPerSample; // Start at bin 1 (exclude DC)
        maxFundamentalFreq = thd_nyquistFreq; // Up to Nyquist
        maxHarmonicFreq = thd_nyquistFreq; // Up to Nyquist
        noiseMinFreq = thd_freqPerSample; // Start at bin 1 (exclude DC)
        noiseMaxFreq = thd_nyquistFreq; // Up to Nyquist
    }

    // Define bin limits
    const thd_minFundamentalBin = Math.floor(minFundamentalFreq / thd_freqPerSample);
    const thd_maxFundamentalBin = Math.floor(maxFundamentalFreq / thd_freqPerSample);
    const thd_maxHarmonicBin = Math.floor(maxHarmonicFreq / thd_freqPerSample);
    const thd_noiseMinBin = Math.floor(noiseMinFreq / thd_freqPerSample);
    const thd_noiseMaxBin = Math.floor(noiseMaxFreq / thd_freqPerSample);

    // Compute thd_noiseAverage from bins between 3/4 Nyquist and Nyquist
    const startNoiseBin = Math.floor((3 / 4) * nyquistBin); // 3/4 of Nyquist bin = 768
    let noiseSum = 0;
    let noiseBinCount = 0;
    for (let i = startNoiseBin; i <= nyquistBin; i++) {
        noiseSum += fullMagnitudes[i];
        noiseBinCount++;
    }
    const thd_noiseAverage = noiseBinCount > 0 ? noiseSum / noiseBinCount : 0;

    /*// Compute thd_noiseAverage using the median of bins between 3/4 Nyquist and Nyquist
    const startNoiseBin = Math.floor((3/4) * nyquistBin); // 3/4 of Nyquist bin = 768
    const noiseMagnitudes = [];
    for (let i = startNoiseBin; i <= nyquistBin; i++) {
        noiseMagnitudes.push(fullMagnitudes[i]);
    }
    // Sort the magnitudes to find the median
    noiseMagnitudes.sort((a, b) => a - b);
    const midIndex = Math.floor(noiseMagnitudes.length / 2);
    const thd_noiseAverage = noiseMagnitudes.length % 2 === 0
        ? (noiseMagnitudes[midIndex - 1] + noiseMagnitudes[midIndex]) / 2 // Average of two middle values for even length
        : noiseMagnitudes[midIndex]; // Middle value for odd length*/

    // Find fundamental bin
    let thd_fundamentalMag = 0;
    let thd_fundamentalBin = 0;
    for (let i = thd_minFundamentalBin; i <= thd_maxFundamentalBin; i++) {
        const mag = fullMagnitudes[i];
        if (mag > thd_fundamentalMag) {
            thd_fundamentalMag = mag;
            thd_fundamentalBin = i;
        }
    }

    // Find harmonics using bin indices
    const thd_harmonics = [];
    if (thd_fundamentalBin > 0) {
        const maxHarmonicOrder = Math.floor(thd_maxHarmonicBin / thd_fundamentalBin);
        for (let harmonicOrder = 2; harmonicOrder <= maxHarmonicOrder; harmonicOrder++) {
            const harmonicBin = Math.round(thd_fundamentalBin * harmonicOrder);
            if (harmonicBin < fullMagnitudes.length) {
                const mag = fullMagnitudes[harmonicBin];
                thd_harmonics.push({
                    order: harmonicOrder,
                    bin: harmonicBin,
                    mag: mag
                });
            }
        }
    }

    // Calculate excluded bins for noise computation
    const thd_excludedBins = new Set();
    const thd_harmonicBins = new Set();

    // Calculate fundamental power with noise compensation, allowing negative contributions
    let thd_fundamentalPower = 0;
    if (thd_fundamentalBin > 0) {
        const fundamentalStartBin = Math.max(0, thd_fundamentalBin - exclusionMargin);
        const fundamentalEndBin = Math.min(thd_totalSamples - 1, thd_fundamentalBin + exclusionMargin);
        for (let i = fundamentalStartBin; i <= fundamentalEndBin; i++) {
            const adjustedMag = fullMagnitudes[i] - thd_noiseAverage;
            let power = adjustedMag ** 2; // Square the magnitude (always positive)
            if (adjustedMag < 0) {
                power = -power; // Reintroduce the negative sign
            }
            thd_fundamentalPower += power;
            thd_excludedBins.add(i);
        }
    }
    // Ensure fundamental power is non-negative to avoid issues in ratio calculations
    thd_fundamentalPower = Math.max(thd_fundamentalPower, 0);

    // Calculate harmonic power with noise compensation, allowing negative contributions
    let thd_harmonicPower = 0;
    const usedHarmonicBins = new Set();
    for (const harmonic of thd_harmonics) {
        const harmonicBin = harmonic.bin;
        thd_harmonicBins.add(harmonicBin);
        const harmonicStartBin = Math.max(0, harmonicBin - exclusionMargin);
        const harmonicEndBin = Math.min(thd_totalSamples - 1, harmonicBin + exclusionMargin);
        let harmonicPower = 0;
        for (let i = harmonicStartBin; i <= harmonicEndBin; i++) {
            if (!thd_excludedBins.has(i) && !usedHarmonicBins.has(i)) {
                const adjustedMag = fullMagnitudes[i] - thd_noiseAverage;
                let power = adjustedMag ** 2; // Square the magnitude (always positive)
                if (adjustedMag < 0) {
                    power = -power; // Reintroduce the negative sign
                }
                harmonicPower += power;
                usedHarmonicBins.add(i);
                thd_excludedBins.add(i);
            }
        }
        thd_harmonicPower += harmonicPower;
    }
    // Ensure harmonic power is non-negative to avoid issues in ratio calculations
    thd_harmonicPower = Math.max(thd_harmonicPower, 0);

    // Calculate noise power, including contribution from excluded bins
    let thd_noisePower = 0;
    // Part 1: Noise power from non-excluded bins
    for (let i = thd_noiseMinBin; i <= thd_noiseMaxBin; i++) {
        if (!thd_excludedBins.has(i)) {
            const power = fullMagnitudes[i] ** 2;
            thd_noisePower += power;
        }
    }
    // Part 2: Noise power from excluded bins using thd_noiseAverage
    const excludedBinCount = thd_excludedBins.size;
    const excludedNoisePower = excludedBinCount * (thd_noiseAverage ** 2);
    thd_noisePower += excludedNoisePower;

    // Calculate THD, THD+N, SINAD, SNR, SFDR, ENOB
    const thdRatio = Math.sqrt(thd_harmonicPower / thd_fundamentalPower);
    const thdPlusNRatio = Math.sqrt((thd_harmonicPower + thd_noisePower) / thd_fundamentalPower);
    const sinadRatio = Math.sqrt(thd_fundamentalPower / (thd_harmonicPower + thd_noisePower));
    const snrRatio = Math.sqrt(thd_fundamentalPower / thd_noisePower);

    // Calculate SFDR based on the standard
    let maxSpuriousMag = 0;
    let sfdrUpperLimit;
    if (standard === 'Audio') {
        sfdrUpperLimit = thd_noiseMaxBin; // 20,000 Hz for Audio
    } else if (standard === 'RF') {
        sfdrUpperLimit = nyquistBin; // Full range up to Nyquist
    }
    for (let i = 1; i <= sfdrUpperLimit; i++) { // Start at bin 1 to exclude DC
        if (!thd_excludedBins.has(i)) {
            const mag = fullMagnitudes[i];
            if (mag > maxSpuriousMag) {
                maxSpuriousMag = mag;
            }
        }
    }
    let sfdrDBc;
    if (maxSpuriousMag > 0) {
        const sfdrRatio = thd_fundamentalMag / maxSpuriousMag;
        sfdrDBc = 20 * Math.log10(sfdrRatio);
    } else {
        sfdrDBc = 120; // No spurious tones found, set to a high value (e.g., 120 dB)
    }

    // Compute the specified metrics
    const thdnPercentage = thdPlusNRatio * 100;
    const thdndB = 20 * Math.log10(thdPlusNRatio);
    const thdPercentage = thdRatio * 100;
    const thddB = 20 * Math.log10(thdRatio);
    const sinadDB = 20 * Math.log10(sinadRatio);
    const snrDB = 20 * Math.log10(snrRatio);
    const enobBits = (sinadDB - 1.76) / 6.02;

    return {
        thdnPercentage: thdnPercentage,
        thdndB: thdndB,
        thdPercentage: thdPercentage,
        thddB: thddB,
        sinadDB: sinadDB,
        snrDB: snrDB,
        sfdrDBc: sfdrDBc,
        enobBits: enobBits,
        fundamentalBin: thd_fundamentalBin
    };
}

// Returns plenty of waveform measurements
function calcMeas(waveArray, voltsPerDivision, timePerDivision) {
    // Initialize result variables
    let vMinVolts = 0,
        vMaxVolts = 0,
        vPtPVolts = 0,
        vBaseVolts = 0,
        vTopVolts = 0,
        vAmpVolts = 0;
    let vMidVolts = 0,
        overshootPlus = 0,
        overshootMinus = 0;
    let frequency = 0,
        period = 0,
        periodPlus = 0,
        periodMinus = 0,
        dutyCycle = 0,
        dutyCycleMinus = 0;
    let periodRMS = 0,
        riseTime = 0,
        fallTime = 0,
        periodAvg = 0;
    let average = 0,
        rms = 0;
    let fallingOvershoot = 0,
        risingPreshoot = 0,
        risingOvershoot = 0,
        fallingPreshoot = 0;
    const scaleFactor = 8 * voltsPerDivision;

    // --- Start of findAmplitude Logic ---
    // calculates the Min, Max, PeakToPeak, Base, Top, and Amplitude values of a waveArray
    if (waveArray.length === 0) {
        // Results are already initialized to 0
    } else {
        // Step 1: Find the range and middle point
        const minVal = Math.min(...waveArray);
        const maxVal = Math.max(...waveArray);
        const middlePoint = (minVal + maxVal) / 2;
        // Step 2: Set up histogram parameters
        const numBins = 100; // Number of bins per half-range (adjustable)
        const rangeLower = middlePoint - minVal; // Range for lower half
        const rangeUpper = maxVal - middlePoint; // Range for upper half
        const binWidthLower = rangeLower / numBins;
        const binWidthUpper = rangeUpper / numBins;
        // Initialize histograms
        const histLower = new Array(numBins).fill(0); // For values <= middlePoint
        const histUpper = new Array(numBins).fill(0); // For values > middlePoint
        // Step 3: Build histograms
        for (let i = 0; i < waveArray.length; i++) {
            const val = waveArray[i];
            if (val <= middlePoint) {
                // Lower half: map value to a bin between 0 and numBins-1
                const binIndex = Math.min(
                    numBins - 1,
                    Math.max(0, Math.floor((val - minVal) / binWidthLower))
                );
                histLower[binIndex]++;
            } else {
                // Upper half: map value to a bin between 0 and numBins-1
                const binIndex = Math.min(
                    numBins - 1,
                    Math.max(0, Math.floor((val - middlePoint) / binWidthUpper))
                );
                histUpper[binIndex]++;
            }
        }
        // Step 4: Find the peak bins
        let maxLowerCount = 0;
        let maxLowerBin = 0;
        for (let i = 0; i < numBins; i++) {
            if (histLower[i] > maxLowerCount) {
                maxLowerCount = histLower[i];
                maxLowerBin = i;
            }
        }
        let maxUpperCount = 0;
        let maxUpperBin = 0;
        for (let i = 0; i < numBins; i++) {
            if (histUpper[i] > maxUpperCount) {
                maxUpperCount = histUpper[i];
                maxUpperBin = i;
            }
        }
        // Step 5: Calculate Vbase and Vtop as the center of the peak bins
        const vBase = minVal + (maxLowerBin + 0.5) * binWidthLower;
        const vTop = middlePoint + (maxUpperBin + 0.5) * binWidthUpper;
        // Step 6: Calculate amplitude
        const vAmp = (vTop - vBase);
        // Step 7: Convert to volts
        vBaseVolts = vBase * scaleFactor;
        vTopVolts = vTop * scaleFactor;
        vAmpVolts = vAmp * scaleFactor;
        vMinVolts = minVal * scaleFactor;
        vMaxVolts = maxVal * scaleFactor;
        vPtPVolts = (maxVal - minVal) * scaleFactor;
        // Step 8: Calculate additional measurements
        vMidVolts = (vBaseVolts + vTopVolts) / 2;
        overshootMinus = vAmpVolts !== 0 ? ((vBaseVolts - vMinVolts) / vAmpVolts) * 100 : 0; // Negative overshoot (below Vbase)
        overshootPlus = vAmpVolts !== 0 ? ((vMaxVolts - vTopVolts) / vAmpVolts) * 100 : 0; // Positive overshoot (above Vtop)
    }

    // Convert vBaseVolts and vTopVolts to normalized units for riseTime, fallTime, fallingOvershoot, and risingPreshoot
    const vBaseNormalized = vBaseVolts / scaleFactor;
    const vTopNormalized = vTopVolts / scaleFactor;

    // --- Start of findFreq Logic ---
    // Calculates frequency, period, periodPlus, periodMinus, dutyCycle, dutyCycleMinus, and additional edge-specific measurements
    if (!Array.isArray(waveArray) || waveArray.length < 3) {
        // Not enough data to calculate frequency
        // Results are already initialized to 0, except for duty cycles
        let highSamples = 0;
        const crossingLine = (Math.max(...waveArray) + Math.min(...waveArray)) / 2;
        for (let i = 0; i < waveArray.length; i++) {
            if (waveArray[i] > crossingLine) {
                highSamples++;
            }
        }
        dutyCycle = (highSamples / waveArray.length) * 100;
        dutyCycleMinus = 100 - dutyCycle;
    } else {
        const n = waveArray.length;
        // Step 1: Compute the peak-to-peak middle point for the crossing line
        const maxVal = Math.max(...waveArray);
        const minVal = Math.min(...waveArray);
        const crossingLine = (maxVal + minVal) / 2; // Middle point between peak and trough
        // Step 2: Detect all crossings (upward and downward) using sample indices
        const crossings = [];
        for (let i = 0; i < n - 1; i++) {
            const currentValue = waveArray[i] - crossingLine; // Adjust for the new crossing line
            const nextValue = waveArray[i + 1] - crossingLine;
            if (currentValue <= 0 && nextValue > 0) {
                crossings.push({
                    index: i,
                    direction: 'up'
                });
            } else if (currentValue > 0 && nextValue <= 0) {
                crossings.push({
                    index: i,
                    direction: 'down'
                });
            }
        }
        if (crossings.length < 3) {
            //console.log("Not enough crossings to determine frequency. Assuming DC signal");
            // Calculate duty cycle even with fewer than 3 crossings
            let highSamples = 0;
            for (let i = 0; i < waveArray.length; i++) {
                if (waveArray[i] > crossingLine) {
                    highSamples++;
                }
            }
            dutyCycle = (highSamples / waveArray.length) * 100;
            dutyCycleMinus = 100 - dutyCycle;
        } else {
            // Step 3: Identify fixed patterns among crossings to determine valid crossings
            const intervals = [];
            for (let i = 1; i < crossings.length; i++) {
                const interval = crossings[i].index - crossings[i - 1].index;
                const pattern = `${crossings[i - 1].direction}-${crossings[i].direction}`;
                intervals.push({
                    interval: interval,
                    pattern: pattern
                });
            }
            const patternGroups = {};
            intervals.forEach(({
                interval,
                pattern
            }, idx) => {
                if (!patternGroups[pattern]) {
                    patternGroups[pattern] = [];
                }
                patternGroups[pattern].push({
                    interval,
                    idx: idx + 1
                });
            });
            const consistentPatterns = {};
            for (const pattern in patternGroups) {
                const intervalsInPattern = patternGroups[pattern];
                const meanInterval = intervalsInPattern.reduce((sum, {
                    interval
                }) => sum + interval, 0) / intervalsInPattern.length;
                const variance = intervalsInPattern.reduce((sum, {
                    interval
                }) => sum + Math.pow(interval - meanInterval, 2), 0) / intervalsInPattern.length;
                const stdDev = Math.sqrt(variance);
                if (stdDev / meanInterval < 0.2) {
                    consistentPatterns[pattern] = {
                        meanInterval,
                        indices: intervalsInPattern.map(({
                            idx
                        }) => idx)
                    };
                }
            }
            const validCrossings = [];
            const usedIndices = new Set();
            // Only add crossings based on pattern consistency
            for (const pattern in consistentPatterns) {
                const {
                    meanInterval,
                    indices
                } = consistentPatterns[pattern];
                indices.forEach(idx => {
                    const startCrossing = crossings[idx - 1];
                    const endCrossing = crossings[idx];
                    if (!usedIndices.has(idx - 1) && !usedIndices.has(idx)) {
                        const interval = endCrossing.index - startCrossing.index;
                        if (Math.abs(interval - meanInterval) / meanInterval < 0.2) {
                            if (!usedIndices.has(idx - 1)) {
                                validCrossings.push(startCrossing);
                                usedIndices.add(idx - 1);
                            }
                            if (!usedIndices.has(idx)) {
                                validCrossings.push(endCrossing);
                                usedIndices.add(idx);
                            }
                        }
                    }
                });
            }
            validCrossings.sort((a, b) => a.index - b.index);
            // Step 4: Filter crossings to handle noise (3, 5, 7, or 9 non-valid crossings within a window of max(2% of total samples, 8 samples))
            // Only apply filtering if total crossings < 100
            const filteredCrossings = [];
            let i = 0;
            if (crossings.length < 100) {
                // Calculate the window size as the larger of 2% of the total number of samples or 8 samples
                const windowSize = Math.max(Math.round(0.02 * n), 8);
                //console.log(`Noise filtering window size: ${windowSize} samples (max of 2% of ${n} total samples or 8 samples)`);
                while (i < crossings.length) {
                    const isCurrentValid = validCrossings.some(vc => vc.index === crossings[i].index);
                    if (isCurrentValid) {
                        filteredCrossings.push(crossings[i]);
                        i++;
                        continue;
                    }
                    let windowEnd = i;
                    while (windowEnd < crossings.length && crossings[windowEnd].index - crossings[i].index <= windowSize) {
                        windowEnd++;
                    }
                    const windowCrossings = crossings.slice(i, windowEnd);
                    const nonValidCount = windowCrossings.filter(c => !validCrossings.some(vc => vc.index === c.index)).length;
                    if (nonValidCount === 3 || nonValidCount === 5 || nonValidCount === 7 || nonValidCount === 9) {
                        const indicesToMerge = windowCrossings
                            .map((c, idx) => ({
                                index: c.index,
                                originalIdx: i + idx
                            }))
                            .filter(c => !validCrossings.some(vc => vc.index === c.index))
                            .slice(0, nonValidCount);
                        const avgIndex = indicesToMerge.reduce((sum, c) => sum + c.index, 0) / nonValidCount;
                        const direction = crossings[i].direction;
                        filteredCrossings.push({
                            index: Math.round(avgIndex),
                            direction: direction
                        });
                        i += indicesToMerge.length;
                    } else {
                        filteredCrossings.push(crossings[i]);
                        i++;
                    }
                }
            } else {
                // If the condition is not met, use the original crossings without filtering
                filteredCrossings.push(...crossings);
            }
            if (filteredCrossings.length < 3) {
                //console.log("Not enough filtered crossings to determine frequency. Assuming DC signal");
                // Calculate duty cycle even with fewer than 3 filtered crossings
                let highSamples = 0;
                for (let i = 0; i < waveArray.length; i++) {
                    if (waveArray[i] > crossingLine) {
                        highSamples++;
                    }
                }
                dutyCycle = (highSamples / waveArray.length) * 100;
                dutyCycleMinus = 100 - dutyCycle;
            } else {
                // Step 5: Extract the master pattern (one complete cycle)
                const masterPatternCrossings = [];
                let currentPattern = [];
                let validCrossingIndex = 0;
                let crossingIndex = 0;
                // First attempt: 3 valid crossings
                while (validCrossingIndex < validCrossings.length && crossingIndex < filteredCrossings.length) {
                    const nextValidCrossing = validCrossings[validCrossingIndex];
                    const nextCrossing = filteredCrossings[crossingIndex];
                    if (nextCrossing.index === nextValidCrossing.index) {
                        currentPattern.push({
                            ...nextCrossing,
                            isValid: true
                        });
                        validCrossingIndex++;
                        crossingIndex++;
                    } else if (nextCrossing.index < nextValidCrossing.index) {
                        currentPattern.push({
                            ...nextCrossing,
                            isValid: false
                        });
                        crossingIndex++;
                    } else {
                        validCrossingIndex++;
                    }
                    if (currentPattern.length >= 3) {
                        const firstDirection = currentPattern[0].direction;
                        const lastDirection = currentPattern[currentPattern.length - 1].direction;
                        const validCount = currentPattern.filter(c => c.isValid).length;
                        if (firstDirection === lastDirection && validCount >= 3) {
                            masterPatternCrossings.push(...currentPattern);
                            break;
                        }
                    }
                }
                // Second attempt: 2 valid crossings and 1 non-valid crossing
                if (masterPatternCrossings.length < 3) {
                    //console.log("First attempt failed (3 valid crossings). Trying 2 valid + 1 non-valid...");
                    currentPattern = [];
                    validCrossingIndex = 0;
                    crossingIndex = 0;
                    // Collect all crossings
                    while (crossingIndex < filteredCrossings.length) {
                        const nextValidCrossing = validCrossingIndex < validCrossings.length ? validCrossings[validCrossingIndex] : null;
                        const nextCrossing = filteredCrossings[crossingIndex];
                        if (nextValidCrossing && nextCrossing.index === nextValidCrossing.index) {
                            currentPattern.push({
                                ...nextCrossing,
                                isValid: true
                            });
                            validCrossingIndex++;
                            crossingIndex++;
                        } else if (!nextValidCrossing || nextCrossing.index < nextValidCrossing.index) {
                            currentPattern.push({
                                ...nextCrossing,
                                isValid: false
                            });
                            crossingIndex++;
                        } else {
                            validCrossingIndex++;
                        }
                    }
                    // If we have exactly 2 valid crossings, pick the first valid, one non-valid, and the last valid
                    const validCount = currentPattern.filter(c => c.isValid).length;
                    if (validCount === 2) {
                        const firstValid = currentPattern.find(c => c.isValid);
                        const lastValid = currentPattern.slice().reverse().find(c => c.isValid);
                        const nonValidCrossings = currentPattern.filter(c => !c.isValid);
                        if (nonValidCrossings.length >= 1) {
                            const middleCrossing = nonValidCrossings[Math.floor(nonValidCrossings.length / 2)]; // Pick the middle non-valid crossing
                            const subPattern = [{
                                ...firstValid,
                                isValid: true
                            }, {
                                ...middleCrossing,
                                isValid: false
                            }, {
                                ...lastValid,
                                isValid: true
                            }];
                            const firstDirection = subPattern[0].direction;
                            const lastDirection = subPattern[2].direction;
                            if (firstDirection === lastDirection) {
                                masterPatternCrossings.push(...subPattern);
                            }
                        }
                    }
                }
                // Third attempt: 1 valid crossing and 2 non-valid crossings
                if (masterPatternCrossings.length < 3) {
                    //console.log("Second attempt failed (2 valid + 1 non-valid). Trying 1 valid + 2 non-valid...");
                    currentPattern = [];
                    validCrossingIndex = 0;
                    crossingIndex = 0;
                    while (validCrossingIndex < validCrossings.length && crossingIndex < filteredCrossings.length) {
                        const nextValidCrossing = validCrossings[validCrossingIndex];
                        const nextCrossing = filteredCrossings[crossingIndex];
                        if (nextCrossing.index === nextValidCrossing.index) {
                            currentPattern.push({
                                ...nextCrossing,
                                isValid: true
                            });
                            validCrossingIndex++;
                            crossingIndex++;
                        } else if (nextCrossing.index < nextValidCrossing.index) {
                            currentPattern.push({
                                ...nextCrossing,
                                isValid: false
                            });
                            crossingIndex++;
                        } else {
                            validCrossingIndex++;
                        }
                        if (currentPattern.length >= 3) {
                            const firstDirection = currentPattern[0].direction;
                            const lastDirection = currentPattern[currentPattern.length - 1].direction;
                            const validCount = currentPattern.filter(c => c.isValid).length;
                            if (firstDirection === lastDirection && validCount === 1 && currentPattern.length === 3) {
                                masterPatternCrossings.push(...currentPattern);
                                break;
                            }
                        }
                    }
                }
                // Fourth attempt: 3 non-valid crossings
                if (masterPatternCrossings.length < 3) {
                    //console.log("Third attempt failed (1 valid + 2 non-valid). Trying 3 non-valid...");
                    currentPattern = [];
                    crossingIndex = 0;
                    while (crossingIndex < filteredCrossings.length) {
                        currentPattern.push({
                            ...filteredCrossings[crossingIndex],
                            isValid: false
                        });
                        crossingIndex++;
                        if (currentPattern.length >= 3) {
                            const firstDirection = currentPattern[0].direction;
                            const lastDirection = currentPattern[currentPattern.length - 1].direction;
                            const validCount = currentPattern.filter(c => c.isValid).length;
                            if (firstDirection === lastDirection && validCount === 0 && currentPattern.length === 3) {
                                masterPatternCrossings.push(...currentPattern);
                                break;
                            }
                        }
                    }
                }
                if (masterPatternCrossings.length < 3) {
                    //console.log("Could not identify a master pattern after all attempts. Assuming DC signal.");
                    // Calculate duty cycle even if master pattern cannot be identified
                    let highSamples = 0;
                    for (let i = 0; i < waveArray.length; i++) {
                        if (waveArray[i] > crossingLine) {
                            highSamples++;
                        }
                    }
                    dutyCycle = (highSamples / waveArray.length) * 100;
                    dutyCycleMinus = 100 - dutyCycle;
                } else {
                    // Step 6: Calculate the period and the frequency from the master pattern
                    const periodSamples = masterPatternCrossings[masterPatternCrossings.length - 1].index - masterPatternCrossings[0].index;
                    const totalTime = timePerDivision * 12;
                    const timePerSample = totalTime / (n - 1);
                    period = periodSamples * timePerSample;
                    frequency = 1 / period;
                    // Step 7: Measure the "high" time within the master pattern to calculate the duty cycle
                    const startIndex = masterPatternCrossings[0].index;
                    const endIndex = masterPatternCrossings[masterPatternCrossings.length - 1].index;
                    let highSamples = 0;
                    // Count samples above the crossing line within the master pattern
                    for (let i = startIndex; i <= endIndex; i++) {
                        if (waveArray[i] > crossingLine) {
                            highSamples++;
                        }
                    }
                    // Step 8: Calculate the duty cycle
                    const highTime = highSamples * timePerSample;
                    if (period <= 0) {
                        // Calculate duty cycle even if period is invalid
                        let highSamplesFull = 0;
                        for (let i = 0; i < waveArray.length; i++) {
                            if (waveArray[i] > crossingLine) {
                                highSamplesFull++;
                            }
                        }
                        dutyCycle = (highSamplesFull / waveArray.length) * 100;
                        dutyCycleMinus = 100 - dutyCycle;
                    } else {
                        dutyCycle = (highTime / period) * 100;
                        // Calculate everything else
                        dutyCycleMinus = 100 - dutyCycle;
                        periodPlus = (period / 100) * dutyCycle;
                        periodMinus = period - periodPlus;
                        // Step 9: Calculate additional measurements
                        // Period RMS: RMS over the first cycle
                        let sumOfSquares = 0;
                        const numSamples = endIndex - startIndex + 1;
                        for (let i = startIndex; i <= endIndex; i++) {
                            const value = waveArray[i];
                            sumOfSquares += value * value;
                        }
                        periodRMS = Math.sqrt(sumOfSquares / numSamples) * 8 * voltsPerDivision;
                        // RiseTime and FallTime: Time between 10% and 90% of the first rising/falling edge
                        const amplitude = vTopNormalized - vBaseNormalized;
                        const level10 = vBaseNormalized + 0.1 * amplitude;
                        const level90 = vBaseNormalized + 0.9 * amplitude;
                        // Find the first rising edge and falling edge
                        let firstRisingEdge = null;
                        let firstFallingEdge = null;
                        for (let i = 0; i < masterPatternCrossings.length; i++) {
                            if (masterPatternCrossings[i].direction === 'up' && !firstRisingEdge) {
                                firstRisingEdge = masterPatternCrossings[i];
                            }
                            if (masterPatternCrossings[i].direction === 'down' && !firstFallingEdge) {
                                firstFallingEdge = masterPatternCrossings[i];
                            }
                            if (firstRisingEdge && firstFallingEdge) break;
                        }
                        // Calculate RiseTime
                        if (firstRisingEdge) {
                            let index10 = firstRisingEdge.index;
                            let index90 = firstRisingEdge.index;
                            // Search backward for 10% level
                            for (let i = firstRisingEdge.index; i >= 0; i--) {
                                if (waveArray[i] <= level10) {
                                    index10 = i;
                                    break;
                                }
                            }
                            // Search forward for 90% level
                            for (let i = firstRisingEdge.index; i < waveArray.length; i++) {
                                if (waveArray[i] >= level90) {
                                    index90 = i;
                                    break;
                                }
                            }
                            riseTime = (index90 - index10) * timePerSample;
                        }
                        // Calculate FallTime
                        if (firstFallingEdge) {
                            let index90 = firstFallingEdge.index;
                            let index10 = firstFallingEdge.index;
                            // Search backward for 90% level
                            for (let i = firstFallingEdge.index; i >= 0; i--) {
                                if (waveArray[i] >= level90) {
                                    index90 = i;
                                    break;
                                }
                            }
                            // Search forward for 10% level
                            for (let i = firstFallingEdge.index; i < waveArray.length; i++) {
                                if (waveArray[i] <= level10) {
                                    index10 = i;
                                    break;
                                }
                            }
                            fallTime = (index90 - index10) * timePerSample;
                        }
                        // FallingOvershoot (FOVShoot): Overshoot after the first falling edge
                        if (firstFallingEdge) {
                            // Define a window of 5% of the period samples after the falling edge, with a minimum of 3 samples
                            const windowSize = Math.max(3, Math.round(0.05 * periodSamples));
                            let minValAfterFalling = vBaseNormalized;
                            for (let i = firstFallingEdge.index; i <= Math.min(firstFallingEdge.index + windowSize, waveArray.length - 1); i++) {
                                if (waveArray[i] < minValAfterFalling) {
                                    minValAfterFalling = waveArray[i];
                                }
                            }
                            // Convert minValAfterFalling to volts
                            const minValAfterFallingVolts = minValAfterFalling * scaleFactor;
                            fallingOvershoot = vAmpVolts !== 0 ? ((vBaseVolts - minValAfterFallingVolts) / vAmpVolts) * 100 : 0;
                        }
                        // RisingPreshoot (RPREShoot): Preshoot before the first rising edge
                        if (firstRisingEdge) {
                            // Define a window of 5% of the period samples before the rising edge, with a minimum of 3 samples
                            const windowSize = Math.max(3, Math.round(0.05 * periodSamples));
                            let minValBeforeRising = vBaseNormalized;
                            for (let i = Math.max(0, firstRisingEdge.index - windowSize); i < firstRisingEdge.index; i++) {
                                if (waveArray[i] < minValBeforeRising) {
                                    minValBeforeRising = waveArray[i];
                                }
                            }
                            // Convert minValBeforeRising to volts
                            const minValBeforeRisingVolts = minValBeforeRising * scaleFactor;
                            risingPreshoot = vAmpVolts !== 0 ? ((vBaseVolts - minValBeforeRisingVolts) / vAmpVolts) * 100 : 0;
                        }
                        // RisingOvershoot: Overshoot after the first rising edge
                        if (firstRisingEdge) {
                            // Define a window of 5% of the period samples after the rising edge, with a minimum of 3 samples
                            const windowSize = Math.max(3, Math.round(0.05 * periodSamples));
                            let maxValAfterRising = vTopNormalized;
                            for (let i = firstRisingEdge.index; i <= Math.min(firstRisingEdge.index + windowSize, waveArray.length - 1); i++) {
                                if (waveArray[i] > maxValAfterRising) {
                                    maxValAfterRising = waveArray[i];
                                }
                            }
                            // Convert maxValAfterRising to volts
                            const maxValAfterRisingVolts = maxValAfterRising * scaleFactor;
                            risingOvershoot = vAmpVolts !== 0 ? ((maxValAfterRisingVolts - vTopVolts) / vAmpVolts) * 100 : 0;
                        }
                        // FallingPreshoot: Preshoot before the first falling edge
                        if (firstFallingEdge) {
                            // Define a window of 5% of the period samples before the falling edge, with a minimum of 3 samples
                            const windowSize = Math.max(3, Math.round(0.05 * periodSamples));
                            let maxValBeforeFalling = vTopNormalized;
                            for (let i = Math.max(0, firstFallingEdge.index - windowSize); i < firstFallingEdge.index; i++) {
                                if (waveArray[i] > maxValBeforeFalling) {
                                    maxValBeforeFalling = waveArray[i];
                                }
                            }
                            // Convert maxValBeforeFalling to volts
                            const maxValBeforeFallingVolts = maxValBeforeFalling * scaleFactor;
                            fallingPreshoot = vAmpVolts !== 0 ? ((maxValBeforeFallingVolts - vTopVolts) / vAmpVolts) * 100 : 0;
                        }
                        // PeriodAvg: Mean voltage over the first cycle
                        let sum = 0;
                        for (let i = startIndex; i <= endIndex; i++) {
                            sum += waveArray[i];
                        }
                        periodAvg = (sum / numSamples) * 8 * voltsPerDivision;
                    }
                }
            }
        }
    }

    // Returns the mean value of waveArray in volts
    if (!Array.isArray(waveArray) || waveArray.length === 0) {
        average = 0;
    } else {
        const n = waveArray.length;
        const sum = waveArray.reduce((acc, val) => acc + val, 0);
        average = (sum / n) * 8 * voltsPerDivision;
    }

    // Returns the RMS value of waveArray in volts
    if (!Array.isArray(waveArray) || waveArray.length === 0) {
        rms = 0;
    } else {
        const n = waveArray.length;
        const sumOfSquares = waveArray.reduce((acc, val) => acc + val * val, 0);
        const meanSquare = sumOfSquares / n;
        rms = Math.sqrt(meanSquare) * 8 * voltsPerDivision;
    }

    // Return all results as an object
    return {
        vMin: vMinVolts,
        vMax: vMaxVolts,
        peakToPeak: vPtPVolts,
        vBase: vBaseVolts,
        vTop: vTopVolts,
        amplitude: vAmpVolts,
        vMid: vMidVolts,
        overshootPlus: overshootPlus, // Positive overshoot (above Vtop, global)
        overshootMinus: overshootMinus, // Negative overshoot (below Vbase, global)
        fallingOvershoot: fallingOvershoot, // Negative overshoot after the first falling edge
        risingPreshoot: risingPreshoot, // Negative preshoot before the first rising edge
        risingOvershoot: risingOvershoot, // Positive overshoot after the first rising edge
        fallingPreshoot: fallingPreshoot, // Positive preshoot before the first falling edge
        frequency: frequency,
        period: period,
        periodPlus: periodPlus,
        periodMinus: periodMinus,
        dutyCycle: dutyCycle,
        dutyCycleMinus: dutyCycleMinus,
        periodRMS: periodRMS,
        riseTime: riseTime,
        fallTime: fallTime,
        periodMean: periodAvg,
        mean: average,
        rms: rms
    };
}

// calculates some measurements between 2 channel sources.
function calcDelayMeas(waveArray1, waveArray2, voltsPerDivision1, voltsPerDivision2, timePerDivision) {
    // Initialize result variables
    let FRR = 0,
        FFF = 0,
        FRF = 0,
        FFR = 0,
        LRR = 0,
        LRF = 0,
        LFR = 0,
        LFF = 0;
    let frequency1 = 0,
        frequency2 = 0,
        phase = 0;

    // Check if inputs are valid
    if (!Array.isArray(waveArray1) || !Array.isArray(waveArray2) || waveArray1.length < 2 || waveArray2.length < 2) {
        return {
            FRR,
            FFF,
            FRF,
            FFR,
            LRR,
            LRF,
            LFR,
            LFF,
            frequency1,
            frequency2,
            phase
        };
    }

    // Step 1: Calculate Vbase and Vtop for both sources to determine 50% voltage level
    const calcLevels = (waveArray, voltsPerDivision) => {
        const minVal = Math.min(...waveArray);
        const maxVal = Math.max(...waveArray);
        const middlePoint = (minVal + maxVal) / 2;
        const numBins = 100;
        const rangeLower = middlePoint - minVal;
        const rangeUpper = maxVal - middlePoint;
        const binWidthLower = rangeLower / numBins;
        const binWidthUpper = rangeUpper / numBins;
        const histLower = new Array(numBins).fill(0);
        const histUpper = new Array(numBins).fill(0);

        for (let i = 0; i < waveArray.length; i++) {
            const val = waveArray[i];
            if (val <= middlePoint) {
                const binIndex = Math.min(numBins - 1, Math.max(0, Math.floor((val - minVal) / binWidthLower)));
                histLower[binIndex]++;
            } else {
                const binIndex = Math.min(numBins - 1, Math.max(0, Math.floor((val - middlePoint) / binWidthUpper)));
                histUpper[binIndex]++;
            }
        }

        let maxLowerCount = 0,
            maxLowerBin = 0;
        for (let i = 0; i < numBins; i++) {
            if (histLower[i] > maxLowerCount) {
                maxLowerCount = histLower[i];
                maxLowerBin = i;
            }
        }
        let maxUpperCount = 0,
            maxUpperBin = 0;
        for (let i = 0; i < numBins; i++) {
            if (histUpper[i] > maxUpperCount) {
                maxUpperCount = histUpper[i];
                maxUpperBin = i;
            }
        }

        const vBaseNormalized = minVal + (maxLowerBin + 0.5) * binWidthLower;
        const vTopNormalized = middlePoint + (maxUpperBin + 0.5) * binWidthUpper;
        const scaleFactor = 8 * voltsPerDivision;
        const vBase = vBaseNormalized * scaleFactor;
        const vTop = vTopNormalized * scaleFactor;
        const amplitude = vTop - vBase;
        return {
            vBase,
            vTop,
            amplitude,
            vBaseNormalized,
            vTopNormalized
        };
    };

    const levels1 = calcLevels(waveArray1, voltsPerDivision1);
    const levels2 = calcLevels(waveArray2, voltsPerDivision2);

    const vBase1 = levels1.vBase;
    const vTop1 = levels1.vTop;
    const amplitude1 = levels1.amplitude;
    const vBase2 = levels2.vBase;
    const vTop2 = levels2.vTop;
    const amplitude2 = levels2.amplitude;

    const crossingLine1 = (levels1.vBaseNormalized + levels1.vTopNormalized) / 2; // 50% level for Source 1 (normalized)
    const crossingLine2 = (levels2.vBaseNormalized + levels2.vTopNormalized) / 2; // 50% level for Source 2 (normalized)

    // Define hysteresis band (10% of amplitude above and below 50% level)
    const hysteresisFraction = 0.1;
    const hysteresis1 = (levels1.vTopNormalized - levels1.vBaseNormalized) * hysteresisFraction;
    const hysteresis2 = (levels2.vTopNormalized - levels2.vBaseNormalized) * hysteresisFraction;
    const upperThreshold1 = crossingLine1 + hysteresis1;
    const lowerThreshold1 = crossingLine1 - hysteresis1;
    const upperThreshold2 = crossingLine2 + hysteresis2;
    const lowerThreshold2 = crossingLine2 - hysteresis2;

    // Step 2: Detect edges for both sources with hysteresis and calculate frequency
    const detectEdges = (waveArray, crossingLine, upperThreshold, lowerThreshold, timePerSample) => {
        const edges = {
            firstRising: null,
            firstFalling: null,
            lastRising: null,
            lastFalling: null
        };
        let state = waveArray[0] < crossingLine ? 'low' : 'high';
        let risingEdges = [];
        let frequency = 0;

        for (let i = 0; i < waveArray.length - 1; i++) {
            const currentValue = waveArray[i];
            const nextValue = waveArray[i + 1];

            if (state === 'low' && currentValue <= upperThreshold && nextValue > upperThreshold) {
                // Rising edge: Transition from low state to high state
                if (!edges.firstRising) edges.firstRising = i;
                edges.lastRising = i;
                risingEdges.push(i);
                state = 'high';
            } else if (state === 'high' && currentValue >= lowerThreshold && nextValue < lowerThreshold) {
                // Falling edge: Transition from high state to low state
                if (!edges.firstFalling) edges.firstFalling = i;
                edges.lastFalling = i;
                state = 'low';
            }
        }

        // Calculate frequency: period between first two rising edges
        if (risingEdges.length >= 2) {
            const periodSamples = risingEdges[1] - risingEdges[0];
            const period = periodSamples * timePerSample;
            frequency = period > 0 ? 1 / period : 0;
        }

        return {
            edges,
            frequency
        };
    };

    // Step 3: Calculate time per sample
    const totalTime = timePerDivision * 12;
    const timePerSample1 = totalTime / (waveArray1.length - 1);
    const timePerSample2 = totalTime / (waveArray2.length - 1);
    const timePerSample = Math.min(timePerSample1, timePerSample2);

    const result1 = detectEdges(waveArray1, crossingLine1, upperThreshold1, lowerThreshold1, timePerSample);
    const result2 = detectEdges(waveArray2, crossingLine2, upperThreshold2, lowerThreshold2, timePerSample);

    const edges1 = result1.edges;
    const edges2 = result2.edges;
    frequency1 = result1.frequency;
    frequency2 = result2.frequency;

    // Step 4: Calculate time differences
    const calcTimeDiff = (index1, index2) => {
        if (index1 === null || index2 === null) return 0;
        return (index2 - index1) * timePerSample;
    };

    FRR = calcTimeDiff(edges1.firstRising, edges2.firstRising);
    FFF = calcTimeDiff(edges1.firstFalling, edges2.firstFalling);
    FRF = calcTimeDiff(edges1.firstRising, edges2.firstFalling);
    FFR = calcTimeDiff(edges1.firstFalling, edges2.firstRising);
    LRR = calcTimeDiff(edges1.firstRising, edges2.lastRising);
    LRF = calcTimeDiff(edges1.firstRising, edges2.lastFalling);
    LFR = calcTimeDiff(edges1.firstFalling, edges2.lastRising);
    LFF = calcTimeDiff(edges1.firstFalling, edges2.lastFalling);

    // Step 5: Calculate phase difference using FRR and frequency1
    if (frequency1 > 0) {
        const period = 1 / frequency1; // Period of Source 1 in seconds
        const phaseFraction = FRR / period; // Fraction of a cycle
        phase = phaseFraction * 360; // Convert to degrees

        // Normalize phase to [-180, 180]
        phase = ((phase + 180) % 360) - 180;
    }

    // Return results
    return {
        FRR, // Time between first rising edge of Source 1 and first rising edge of Source 2
        FFF, // Time between first falling edge of Source 1 and first falling edge of Source 2
        FRF, // Time between first rising edge of Source 1 and first falling edge of Source 2
        FFR, // Time between first falling edge of Source 1 and first rising edge of Source 2
        LRR, // Time between first rising edge of Source 1 and last rising edge of Source 2
        LRF, // Time between first rising edge of Source 1 and last falling edge of Source 2
        LFR, // Time between first falling edge of Source 1 and last rising edge of Source 2
        LFF, // Time between first falling edge of Source 1 and last falling edge of Source 2
        frequency1, // Frequency of Source 1 (in Hz)
        frequency2, // Frequency of Source 2 (in Hz)
        phase // Phase difference between Source 1 and Source 2 (in degrees)
    };
}

// Measures a waveform and stores the measurement results in global variables as text
function getMeasurements(waveArray, voltsPerDivision, timePerDivision) {
    try {
        const measurements = calcMeas(waveArray, voltsPerDivision, timePerDivision);

        table_Meas[2][1] = autoUnit(measurements.frequency, 2, 'Hz');
        table_Meas[2][2] = autoUnit(measurements.period, 2, 's');
        table_Meas[2][3] = autoUnit(measurements.periodPlus, 2, 's');
        table_Meas[2][4] = autoUnit(measurements.periodMinus, 2, 's');
        table_Meas[2][5] = measurements.dutyCycle.toFixed(1) + '%';
        table_Meas[2][6] = measurements.dutyCycleMinus.toFixed(1) + '%';
        table_Meas[2][7] = autoUnit(measurements.vMin, 2, 'V');
        table_Meas[2][8] = autoUnit(measurements.vMax, 2, 'V');
        table_Meas[2][9] = autoUnit(measurements.peakToPeak, 2, 'V');
        table_Meas[2][10] = autoUnit(measurements.vBase, 2, 'V');
        table_Meas[2][11] = autoUnit(measurements.vMid, 2, 'V');
        table_Meas[2][12] = autoUnit(measurements.vTop, 2, 'V');
        table_Meas[2][13] = autoUnit(measurements.amplitude, 2, 'V');
        table_Meas[2][14] = autoUnit(measurements.rms, 2, 'V');
        table_Meas[2][15] = autoUnit(measurements.periodRMS, 2, 'V');
        table_Meas[2][16] = autoUnit(measurements.mean, 2, 'V');
        table_Meas[2][17] = autoUnit(measurements.periodMean, 2, 'V');
        table_Meas[2][18] = autoUnit(measurements.riseTime, 2, 's');
        table_Meas[2][19] = autoUnit(measurements.fallTime, 2, 's');
        table_Meas[2][20] = measurements.overshootPlus.toFixed(1) + '%';
        table_Meas[2][21] = measurements.overshootMinus.toFixed(1) + '%';
        table_Meas[2][22] = measurements.risingOvershoot.toFixed(1) + '%';
        table_Meas[2][23] = measurements.fallingOvershoot.toFixed(1) + '%';
        table_Meas[2][24] = measurements.risingPreshoot.toFixed(1) + '%';
        table_Meas[2][25] = measurements.fallingPreshoot.toFixed(1) + '%';

        const dualMeasurements = calcDelayMeas(removeExistingOffset(CH1rawPoints, "CH1"), removeExistingOffset(CH2rawPoints, "CH2"), appParam_currVPD_CH1, appParam_currVPD_CH2, appParam_currTPD); // TO-DO improve this

        table_Meas[2][26] = autoUnit(dualMeasurements.FRR, 2, 's');
        table_Meas[2][27] = autoUnit(dualMeasurements.FFF, 2, 's');
        table_Meas[2][28] = autoUnit(dualMeasurements.FRF, 2, 's');
        table_Meas[2][29] = autoUnit(dualMeasurements.FFR, 2, 's');
        table_Meas[2][30] = autoUnit(dualMeasurements.LRR, 2, 's');
        table_Meas[2][31] = autoUnit(dualMeasurements.LRF, 2, 's');
        table_Meas[2][32] = autoUnit(dualMeasurements.LFR, 2, 's');
        table_Meas[2][33] = autoUnit(dualMeasurements.LFF, 2, 's');
        table_Meas[2][34] = dualMeasurements.phase.toFixed(1) + '°';
    } catch (error) {
        console.log(`Error getting measurements: ${error.message}`);
    }
}

// calculates the voltage value of the trigger level
function findTriggerVolts(voltsPerDivision) {
    const value = ((param_triggerlevel - (param_triggerCH1CH2 == 0 ? param_CH1verticalPos : param_CH2verticalPos)) / 200); // since it's an operation between oscilloscope params, there is no need to subtract 128.
    const volts = value * 8 * voltsPerDivision; // value * number of vertical divisions * volts-per-division
    return volts;
}

// finds the value of a waveArray at positionX and returns that value
function findCrossing(positionX, waveArray) {
    // Ensure positionX is between 0 and 1
    if (positionX < 0 || positionX > 1) {
        throw new Error("positionX must be between 0 and 1");
    }

    // Handle edge cases
    if (waveArray.length === 0) return 0;
    if (waveArray.length === 1) return waveArray[0];

    // Calculate the fractional index position
    const arrayLength = waveArray.length - 1;
    const floatIndex = positionX * arrayLength;
    const lowerIndex = Math.floor(floatIndex);
    const upperIndex = Math.min(lowerIndex + 1, arrayLength);

    // If we're exactly at an index, return that value
    if (lowerIndex === floatIndex) {
        return waveArray[lowerIndex];
    }

    // Get the two points for interpolation
    const y1 = waveArray[lowerIndex];
    const y2 = waveArray[upperIndex];

    // Calculate the fraction between the two points
    const fraction = floatIndex - lowerIndex;

    // Linear interpolation: y = y1 + (y2 - y1) * fraction
    const result = y1 + (y2 - y1) * fraction;

    return result;
}


//---------------------------- MAIN APP FUNCTIONS -------------------------------------------------------------------------------------------------------------------------//

// Main loop
function doIteration() {
    //console.clear();
    //console.log("Iterating...");
    processParams(); // process parameter data recieved from the oscilloscope
    updateDOM(); // update DOM elements as required
    processWaveforms(); // do required operations with the waveform data
    // Recording: commit one frame per genuinely new acquisition (deduped via appParam_bufferUpdated).
    if (appParam_isRecording && appParam_bufferUpdated) {
        recordedFrames.push({ ch1: recPendingCH1, ch2: recPendingCH2 });
        appParam_bufferUpdated = false;
    }
    plotGrid(0); // draw the grid if required
    plotREF(0); // draw the REF waveform if required
    drawMenu(0); // draw the menu if required
    plotData(); // draw the required waveforms
    drawHUD(); //draw all necessary HUD elements and text in the canvas
    drawMessage(); //draw a message (if required)
}

// Processes the parameter data recieved by the oscilloscope, and stores it into global variables
let previousTestArray = []; // THIS LINE IS FOR TESTING
function processParams() {
    if (currentPRMData.length == 640) {
        try {
            const paramBuffer = currentPRMData.length > 640 ? currentPRMData.substring(0, 640) : currentPRMData; // Adjusted for 640 bytes, each byte being 2 characters

            const PRMbytes = Math.floor(paramBuffer.length / 2);
            const PRMrawBytes = [];
            const testArray = []; // TEST
            document.getElementById('test-test-2').innerHTML = '';
            for (let i = 0; i < PRMbytes; i++) {
                const value = parseInt(paramBuffer.substring(i * 2, i * 2 + 2), 16);
                PRMrawBytes.push(value);
                testArray.push('  ' + ((i).toString().padStart(3, "0")) + ':' + ((value).toString().padStart(3, "0"))); // THIS LINE IS FOR TESTING
            }
            //console.log(`Got ${PRMbytes} bytes from ${paramBuffer.length} characters`);

            // set values for parameter variables
            param_stopRun = PRMrawBytes[0]; //byte   0 - STOP(0) RUN(1)
            param_CH2enabled = PRMrawBytes[2]; //byte   2 - CH2 OFF(0) ON(1)
            param_timeZoomLvl = PRMrawBytes[20]; //byte  20 - Time zoom level (2-30) (5ns=2 10s=30)
            param_triggerCH1CH2 = PRMrawBytes[64]; //byte  64 - Trigger CH1 (0) CH2 (1)
            param_triggerMode = PRMrawBytes[65]; //byte  65 - Trigger Mode AUTO (0) NORMAL (1)
            param_triggerEdge = PRMrawBytes[66]; //byte  66 - Trigger up (0) down (1)
            param_triggerLvlAutoManual = PRMrawBytes[67]; //byte  67 - Trigger Level AUTO(0) MANUAL(1)
            param_triggerlevel = PRMrawBytes[72]; //byte  72 - trigger level current channel (0-255) center (128) ????
            param_CH1voltsZoom = PRMrawBytes[74]; //byte  74 - CH1 volts zoom level (4-13) (base values: 10mV=4 10v=13) must be multiplied by its channel's x1/x10/x100!!!
            param_CH1trueVerticalPos = PRMrawBytes[81] == 0 ? PRMrawBytes[80] : (PRMrawBytes[80] - 256); //(-200 / +200)
            param_CH1verticalPos = PRMrawBytes[81] == 0 ? (PRMrawBytes[80] + 128 > 227 ? 227 : PRMrawBytes[80] + 128) : (PRMrawBytes[80] - 128 < 29 ? 29 : PRMrawBytes[80] - 128); //bytes 80/81 - CH1 vertical position (processed to scale it to the same value range as param_triggerlevel, for simplicity)
            param_CH2trueVerticalPos = PRMrawBytes[149] == 0 ? PRMrawBytes[148] : (PRMrawBytes[148] - 256); //(-200 / +200)
            param_CH2verticalPos = PRMrawBytes[149] == 0 ? (PRMrawBytes[148] + 128 > 227 ? 227 : PRMrawBytes[148] + 128) : (PRMrawBytes[148] - 128 < 29 ? 29 : PRMrawBytes[148] - 128); //bytes 148/149 - CH2 vertical position (processed to scale it to the same value range as param_triggerlevel, for simplicity)
            param_CH1DCAC = PRMrawBytes[116]; //byte 116 - CH1 DC(0) AC(1)
            param_CH1x1x10x100 = PRMrawBytes[117]; //byte 117 - CH1 1x(0) 10x(1) 100x(2)
            param_CH2voltsZoom = PRMrawBytes[140]; //byte 140 - CH2 volts zoom level (4-13) (base values: 10mV=4 10v=13) must be multiplied by its channel's x1/x10/x100!!!
            param_CH2DCAC = PRMrawBytes[180]; //byte 180 - CH2 DC(0) AC(1)
            param_CH2x1x10x100 = PRMrawBytes[181]; //byte 181 - CH2 1x(0) 10x(1) 100x(2)
            param_XYModeEnabled = PRMrawBytes[249]; //byte 249 - XY mode disabled (0) enabled (1)
            param_sigGenEnabled = PRMrawBytes[250]; //byte 250 - signal generator disabled (0) enabled (1)
            param_selectedChannel = PRMrawBytes[284]; //byte 284 - current selected channel CH1(0) CH2(1)
            param_trigger_edit = PRMrawBytes[286]; //byte 286 - trigger edit mode disabled (0)  enabled (1) ????
            param_oscMenuPage = PRMrawBytes[287]; //byte 287 - oscilloscope menu flags: no menu (0), normal menu (1), waveform generator menu (4), 50% menu (8)

            // Get proper horizontal position value from params
            const bytes_horizontalCurrentPos = [56, 57, 58, 59, 60, 61, 62];
            let leSum = '';
            for (let i = bytes_horizontalCurrentPos.length - 1; i >= 0; i--) {
                leSum += paramBuffer.substring(bytes_horizontalCurrentPos[i] * 2, bytes_horizontalCurrentPos[i] * 2 + 2);
            }
            appParam_horizontalCurrentPos = parseInt(leSum, 16);
            if (PRMrawBytes[63] == 255) {
                let substractionValue = '';
                substractionValue = parseInt(substractionValue.padStart(bytes_horizontalCurrentPos.length * 2, "FF"), 16);
                appParam_horizontalCurrentPos = (appParam_horizontalCurrentPos - substractionValue);
            }

            // execute every time zoom level is changed, update horizontal position global variables.
            if ((param_timeZoomLvl != appParam_previous_timeZoomLvl) || (param_CH2enabled != appParam_previous_CH2enabled)) {
                appParam_previous_timeZoomLvl = param_timeZoomLvl;
                appParam_previous_CH2enabled = param_CH2enabled;
                if (param_timeZoomLvl <= 10) {
                    appParam_horizontalTriggerPoint = table_TPD[2][param_timeZoomLvl] / table_TPD[2][10] * (param_CH2enabled == 0 ? 2400000 : 1200000);
                } else {
                    appParam_horizontalTriggerPoint = (param_CH2enabled == 0 ? 2400000 : 1200000);
                    if (param_stopRun == 0) { // when in Stop mode, appParam_horizontalTriggerPoint depends on the relationship between current zoom level and zoom level at the moment of enabling STOP
                        appParam_horizontalTriggerPoint = table_TPD[2][param_timeZoomLvl] / table_TPD[2][appParam_horizontalSnapshotZoomLvl] * appParam_horizontalTriggerPoint;
                    }
                }
                appParam_horizontalWindowWidth = appParam_horizontalTriggerPoint * 2;
                appParam_horizontalLimitLeft = appParam_horizontalTriggerPoint - (param_CH2enabled == 0 ? 2350000 : 1150000);
                appParam_horizontalLimitRight = appParam_horizontalTriggerPoint + (param_CH2enabled == 0 ? 2350000 : 1150000);

                appParam_horizontalSnapshotPoint = appParam_horizontalTriggerPoint + appParam_horizontalSnapshotPointOffset;
                appParam_horizontalLimitLeftSnapshot = (appParam_horizontalSnapshotPoint - (param_CH2enabled == 0 ? 2350000 : 1150000)) + (appParam_horizontalWindowWidth / 2);
                appParam_horizontalLimitRightSnapshot = (appParam_horizontalSnapshotPoint + (param_CH2enabled == 0 ? 2350000 : 1150000)) - (appParam_horizontalWindowWidth / 2);
            }

            // execute every time run/stop is set to stop (or every time it changes, will do the job), update snapshot related global variables
            if (param_stopRun != appParam_previous_stopRun) {
                appParam_previous_stopRun = param_stopRun;
                appParam_horizontalSnapshotPointOffset = appParam_horizontalCurrentPos - appParam_horizontalTriggerPoint;
                appParam_horizontalSnapshotPoint = appParam_horizontalTriggerPoint + appParam_horizontalSnapshotPointOffset;
                appParam_horizontalLimitLeftSnapshot = (appParam_horizontalSnapshotPoint - (param_CH2enabled == 0 ? 2350000 : 1150000)) + (appParam_horizontalWindowWidth / 2);
                appParam_horizontalLimitRightSnapshot = (appParam_horizontalSnapshotPoint + (param_CH2enabled == 0 ? 2350000 : 1150000)) - (appParam_horizontalWindowWidth / 2);
                if (param_stopRun == 0) {
                    appParam_horizontalSnapshotZoomLvl = param_timeZoomLvl;
                } else {
                    appParam_horizontalSnapshotZoomLvl = 0; // reset to 0 if in run mode
                }
                appParam_CH1SnapshotVerticalPos = param_CH1trueVerticalPos;
                appParam_CH2SnapshotVerticalPos = param_CH2trueVerticalPos;
            }

            // Get appParam_timeArrowPosition value and normalize it to 0-1 (or -1 if disabled) to properly display it in the grid
            appParam_timeArrowPosition = ((appParam_horizontalCurrentPos - appParam_horizontalTriggerPoint) / appParam_horizontalWindowWidth) + 0.5; // used for the time position arrow
            appParam_timeArrowPosition = ((appParam_timeArrowPosition < 0.007) ? 0.007 : (appParam_timeArrowPosition > 0.993 ? 0.993 : appParam_timeArrowPosition));
            if (param_timeZoomLvl > 24) {
                appParam_timeArrowPosition = -1;
            }

            // Get time offset value to calculate the time markings on the grid divisions
            appParam_timeOffset = ((appParam_horizontalCurrentPos - appParam_horizontalTriggerPoint) / appParam_horizontalWindowWidth) + 0.5;

            // Calculate the intended number of shown samples
            if (param_stopRun == 0) {
                if (param_CH2enabled == 0) {
                    appParam_intendedSamples = Math.round(table_TPD[2][param_timeZoomLvl] / table_TPD[2][appParam_horizontalSnapshotZoomLvl] * table_timeZoomSamples[0][appParam_horizontalSnapshotZoomLvl]) + 1;
                    if (appParam_intendedSamples > 4801) {
                        appParam_intendedSamples = 4801;
                    }
                } else {
                    appParam_intendedSamples = Math.round(table_TPD[2][param_timeZoomLvl] / table_TPD[2][appParam_horizontalSnapshotZoomLvl] * table_timeZoomSamples[1][appParam_horizontalSnapshotZoomLvl]) + 1;
                    if (appParam_intendedSamples > 4801) {
                        appParam_intendedSamples = 4801;
                    }
                }
            } else {
                if (param_CH2enabled == 0) {
                    appParam_intendedSamples = table_timeZoomSamples[0][param_timeZoomLvl] + 1;
                } else {
                    appParam_intendedSamples = table_timeZoomSamples[1][param_timeZoomLvl] + 1;
                }
            }

            // Set the number of raw samples to be drawn on screen
            if (appParam_GeneralSignalSource == "DataBuffer") {
                appParam_intendedDrawnSamples = appParam_intendedSamples > 1201 ? 1201 : appParam_intendedSamples;
            } else if (appParam_GeneralSignalSource == "DataBuffer2") {
                appParam_intendedDrawnSamples = appParam_intendedSamples;
            } else if (appParam_GeneralSignalSource == "WAV") {
                appParam_intendedDrawnSamples = 300;
            }

            gridRightMargin = (appParam_menuPage == 0 ? 25 : 250); //Change the grid right margin: 25px if menu is closed, 250px if menu is open.

            // Assign values to oscilloscope-parameter-dependant menu variables
            appParam_CH1Coupling = param_CH1DCAC == 0 ? 'DC' : 'AC';
            appParam_CH1Probe = param_CH1x1x10x100 == 0 ? '1x' : (param_CH1x1x10x100 == 1 ? '10x' : '100x');
            appParam_CH2Coupling = param_CH2DCAC == 0 ? 'DC' : 'AC';
            appParam_CH2Probe = param_CH2x1x10x100 == 0 ? '1x' : (param_CH2x1x10x100 == 1 ? '10x' : '100x');
            appParam_triggerMode = param_triggerMode == 0 ? 'Auto' : 'Normal';
            appParam_triggerLvlAutoManual = param_triggerLvlAutoManual == 0 ? 'AutoLvl' : 'Manual';
            appParam_CH2Enabled = param_CH2enabled == 0 ? 'OFF' : 'ON';

            // Set frequently used global variables
            appParam_currTPD = getTimeDiv(param_timeZoomLvl, 1);
            appParam_currVPD_CH1 = getVoltsDiv(param_CH1voltsZoom, param_CH1x1x10x100, 1);
            appParam_currVPD_CH2 = getVoltsDiv(param_CH2voltsZoom, param_CH2x1x10x100, 1);
            appParam_mathVerticalPos = appParam_mathOffset;
            // Limit appParam_mathVerticalPos to -0.495 +0.495
            if (appParam_mathVerticalPos < -0.495) {
                appParam_mathVerticalPos = -0.495;
            } else if (appParam_mathVerticalPos > 0.495) {
                appParam_mathVerticalPos = 0.495;
            }

            appParam_FFTVerticalPos = appParam_FFTOffset;
            // Limit appParam_FFTVerticalPos to -0.495 +0.495
            if (appParam_FFTVerticalPos < -0.495) {
                appParam_FFTVerticalPos = -0.495;
            } else if (appParam_FFTVerticalPos > 0.495) {
                appParam_FFTVerticalPos = 0.495;
            }

            const canvas = document.getElementById('plotCanvas');
            const ctx = canvas.getContext('2d');
            trackBufferChangeTime(backupCH1Data, ctx);

            // PERFORM SOME ACTIONS (these must be done as soon as the oscilloscope parameters are updated) -----------------------------------------------------

            // init selected channel based on oscilloscope params.
            if (appParam_selectedChannel == 'NONE') {
                appParam_selectedChannel = param_selectedChannel == 0 ? 'CH1' : 'CH2';
            }
            // Force select CH2 once, if the conditions are met and the force select CH2 flag is set.
            if (param_CH2enabled == 1 && appParam_selectedChannel == 'CH2' && appParam_forceSelectCH2 == 1) {
                sendCommand('#KEY,5');
                appParam_forceSelectCH2 = 0;
            }

            // Force set waveform offsets to 50%
            if (param_oscMenuPage == 8 && appParam_force50percent == 1) {
                sendCommand('#KEY,9');
                appParam_force50percent = 0;
            } else if (param_oscMenuPage == 8 && appParam_force50percent == 2) {
                sendCommand('#KEY,8');
                sendCommand('#KEY,9');
                appParam_force50percent = 0;
            }

            // Force set trigger level to 50%
            if (param_triggerLvlAutoManual == 0 && appParam_force50percentTrigger == 1) {
                sendCommand('#KEY,47');
                appParam_force50percentTrigger = 0;
            }


            // Compare and highlight changes - THIS SECTION IS FOR TESTING --------------------------------------------------------------------------------------------------------------
            let highlightedHTML = '';
            for (let i = 0; i < testArray.length; i++) {
                const current = testArray[i];
                const previous = previousTestArray[i] || '';
                let lineHTML = '';
                for (let j = 0; j < current.length; j++) {
                    if (j >= previous.length || current[j] !== previous[j]) {
                        lineHTML += `<span class="highlight">${current[j]}</span>`;
                    } else {
                        lineHTML += current[j];
                    }
                }
                highlightedHTML += lineHTML;
            }
            document.getElementById('test-test-2').innerHTML = highlightedHTML;
            previousTestArray = [...testArray]; // Update previous array
            //read bytes 68-69
            //little endian?

            const testInfo1 = "CURR-POS:" + appParam_horizontalCurrentPos + " | " + appParam_horizontalLimitLeft + "<--- TRIG_POINT:" + appParam_horizontalTriggerPoint + " --->" + appParam_horizontalLimitRight + " | " + appParam_horizontalLimitLeftSnapshot + "<--- SNAP_POINT:" + appParam_horizontalSnapshotPoint + " --->" + appParam_horizontalLimitRightSnapshot;
            document.getElementById('test-test').innerHTML = testInfo1;
            //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

        } catch (error) {
            //console.log(`Error processing params: ${error.message}`);
        }
    } else {
        //console.log(`Error processing params: Only recieved ${currentPRMData.length} of 640 characters`);
    }
}

// Helper function to pass a source channel
function getChannelSource(chanSource) {
    if (chanSource == 'CH1') {
        return CH1rawPoints;
    } else if (chanSource == 'CH2') {
        return CH2rawPoints;
    } else if (chanSource == 'MATH1') {
        return MATH1rawPoints;
    } else if (chanSource == 'FFT') {
        return FFTrawPoints;
    } else if (chanSource == 'REF') {
        return REFrawPoints;
    }
}

// Do whatever operations with the waveform data
function processWaveforms() {
    try {
        // Clean channel arrays
        CH1rawPoints = [];
        CH2rawPoints = [];
        FFTrawPoints = [];
        MATH1rawPoints = [];

        // Process Channel 1 data (always enabled) -----------------------------------------------------------------------------
        CH1rawPoints = convertToWaveArray(currentCH1Data);

        // Recording: snapshot the raw acquired (pre-interpolation) calibrated volts before further processing overwrites CH1rawPoints.
        recPendingCH2 = null;
        if (appParam_isRecording && appParam_bufferUpdated) recPendingCH1 = CH1rawPoints.slice();

        //TEST WAVEFORM - DEMO MODE - FOR TESTING - OVERRIDES CH1 INPUT
        if (appParam_demoMode_Enabled == 'ON') {
            appParam_demoMode_CH1shape = document.getElementById('ch1-shape').value;
            appParam_demoMode_CH1noise = document.getElementById('ch1-noise').value;
            appParam_demoMode_CH1cycles = document.getElementById('ch1-cycles').value;
            appParam_demoMode_CH1amplitude = document.getElementById('ch1-amplitude').value;
            appParam_demoMode_CH1phase = document.getElementById('ch1-phase').value;
            appParam_demoMode_CH1samples = document.getElementById('ch1-samples').value;
            CH1rawPoints = generateWaveformData(appParam_demoMode_CH1shape, parseFloat(appParam_demoMode_CH1noise), parseInt(appParam_demoMode_CH1cycles), parseFloat(appParam_demoMode_CH1amplitude), parseInt(appParam_demoMode_CH1phase), parseInt(appParam_demoMode_CH1samples));
        }

        // calculate samplerate (With Databuffer signal this is done before any signal processing, to ensure accuracy. WAV signals are already processed and interpolated, so we can only "estimate" in those cases)
        if (appParam_GeneralSignalSource == "DataBuffer" || appParam_GeneralSignalSource == "DataBuffer2") {
            appParam_sampleRate = (CH1rawPoints.length - 1) / 12 / appParam_currTPD; // if signal is DataBuffer, get sample rate from CH1 waveform (-1 samples, because we previously added 1 sample)
        } else {
            appParam_sampleRate = (CH1rawPoints.length) / 12 / appParam_currTPD; // if signal is WAV, get "estimated" sample rate from CH1 waveform
            if (param_CH2enabled == 0) { // if "estimated" sample rate is higher than real samplerate limits, assume samplerate is the limit value
                appParam_sampleRate = appParam_sampleRate > 200000000 ? 200000000 : appParam_sampleRate;
            } else if (param_CH2enabled == 1) {
                appParam_sampleRate = appParam_sampleRate > 100000000 ? 100000000 : appParam_sampleRate;
            }
        }

        // Apply low pass filter (if enabled)
        if (appParam_CH1BWLimit == 'ON') {
            CH1rawPoints = filterLowPass(CH1rawPoints, appParam_CH1BWLimitValue[2], appParam_currTPD);
        }

        // Waveform Averaging (if enabled)
        if (appParam_acquisitionMode == 'Average') {
            CH1rawPoints = waveformAveraging(CH1rawPoints, appParam_acquisitionModeSteps, 0);
        }

        // Waveform Interpolation (if enabled)
        CH1rawPoints = doInterpolationFixedLength(CH1rawPoints, appParam_Interpolation, workingWaveformRes);

        // Apply vertical offset movement RELATIVE TO THE LAST UPDATED FRAME, only if the source data is 'Databuffer'.
        // When STOP, apply vertical offset movement RELATIVE TO THE LAST OFFSET VALUE AT THE MOMENT STOP WAS ACTIVATED, only if the source data is 'Databuffer'.
        if (appParam_GeneralSignalSource == "DataBuffer" || appParam_GeneralSignalSource == "DataBuffer2") {
            if (param_stopRun == 0) {
                CH1rawPoints = applyOffset(CH1rawPoints, ((param_CH1trueVerticalPos - appParam_CH1SnapshotVerticalPos) / 200));
            } else {
                CH1rawPoints = applyOffset(CH1rawPoints, ((param_CH1trueVerticalPos - last_param_CH1trueVerticalPos) / 200));
            }

        }

        // Process Channel 2 data (only if enabled) -----------------------------------------------------------------------------
        if (param_CH2enabled === 1) {
            CH2rawPoints = convertToWaveArrayCH2(currentCH2Data);

            // Recording: snapshot the raw acquired (pre-interpolation) CH2 volts before further processing.
            if (appParam_isRecording && appParam_bufferUpdated) recPendingCH2 = CH2rawPoints.slice();

            //TEST WAVEFORM - DEMO MODE - FOR TESTING - OVERRIDES CH2 INPUT
            if (appParam_demoMode_Enabled == 'ON') {
                appParam_demoMode_CH2shape = document.getElementById('ch2-shape').value;
                appParam_demoMode_CH2noise = document.getElementById('ch2-noise').value;
                appParam_demoMode_CH2cycles = document.getElementById('ch2-cycles').value;
                appParam_demoMode_CH2amplitude = document.getElementById('ch2-amplitude').value;
                appParam_demoMode_CH2phase = document.getElementById('ch2-phase').value;
                appParam_demoMode_CH2samples = document.getElementById('ch2-samples').value;
                CH2rawPoints = generateWaveformData(appParam_demoMode_CH2shape, parseFloat(appParam_demoMode_CH2noise), parseInt(appParam_demoMode_CH2cycles), parseFloat(appParam_demoMode_CH2amplitude), parseInt(appParam_demoMode_CH2phase), parseInt(appParam_demoMode_CH2samples));
            }

            // Apply low pass filter (if enabled)
            if (appParam_CH2BWLimit == 'ON') {
                CH2rawPoints = filterLowPass(CH2rawPoints, appParam_CH2BWLimitValue[2], appParam_currTPD);
            }

            // Waveform Averaging (if enabled)
            if (appParam_acquisitionMode == 'Average') {
                CH2rawPoints = waveformAveraging(CH2rawPoints, appParam_acquisitionModeSteps, 1);
            }

            // Waveform Interpolation (if enabled)
            CH2rawPoints = doInterpolationFixedLength(CH2rawPoints, appParam_Interpolation, workingWaveformRes);

            // Apply vertical offset movement RELATIVE TO THE LAST UPDATED FRAME, only if the source data is 'Databuffer'
            // When STOP, apply vertical offset movement RELATIVE TO THE LAST OFFSET VALUE AT THE MOMENT STOP WAS ACTIVATED, only if the source data is 'Databuffer'.
            if (appParam_GeneralSignalSource == "DataBuffer" || appParam_GeneralSignalSource == "DataBuffer2") {
                if (param_stopRun == 0) {
                    CH2rawPoints = applyOffset(CH2rawPoints, ((param_CH2trueVerticalPos - appParam_CH2SnapshotVerticalPos) / 200));
                } else {
                    CH2rawPoints = applyOffset(CH2rawPoints, ((param_CH2trueVerticalPos - last_param_CH2trueVerticalPos) / 200));
                }
            }
        }

        // Process MATH 1 data (only if enabled) --------------------------------------------------------------------------------
        if (appParam_mathEnabled == 'ON') {
            let operandA = [];
            let operandB = [];
            //ensure both arrays have the same length. If not, interpolate the smaller one to make them the same length
            if (getChannelSource(appParam_mathSourceA).length > getChannelSource(appParam_mathSourceB).length) {
                operandA = getChannelSource(appParam_mathSourceA);
                operandB = doInterpolationFixedLength(getChannelSource(appParam_mathSourceB), 'Linear', operandA.length);
            } else if (getChannelSource(appParam_mathSourceA).length < getChannelSource(appParam_mathSourceB).length) {
                operandB = getChannelSource(appParam_mathSourceB);
                operandA = doInterpolationFixedLength(getChannelSource(appParam_mathSourceA), 'Linear', operandB.length);
            } else {
                operandA = getChannelSource(appParam_mathSourceA);
                operandB = getChannelSource(appParam_mathSourceB);
            }
            // remove offsets from operands if applicable
            operandA = removeExistingOffset(operandA, appParam_mathSourceA);
            operandB = removeExistingOffset(operandB, appParam_mathSourceB);

            // scale both arrays to the same amplitude scale (volts-division)
            const vpdA = appParam_mathSourceA == 'CH1' ? appParam_currVPD_CH1 : (appParam_mathSourceA == 'CH2' ? appParam_currVPD_CH2 : appParam_REFVPD);
            const vpdB = appParam_mathSourceB == 'CH1' ? appParam_currVPD_CH1 : (appParam_mathSourceB == 'CH2' ? appParam_currVPD_CH2 : appParam_REFVPD);
            operandA = scaleVoltsAtoB(operandA, vpdA, vpdB);
            // Do the selected math operation and pass the result to the MATH1 channel
            MATH1rawPoints = mathOperation(operandA, operandB, appParam_mathOperation);

            // Scale to the selected volts-per-division
            MATH1rawPoints = scaleVoltsAtoB(MATH1rawPoints, vpdB, table_VPD[2][appParam_mathVoltsZoom]);

            // Apply offset
            MATH1rawPoints = applyOffset(MATH1rawPoints, appParam_mathOffset);

        }

        // Process FFT data (only if enabled) -----------------------------------------------------------------------------------
        if (appParam_FFTEnabled == 'ON') {
            // Get the source signal and remove the offset if necessary
            FFTrawPoints = removeExistingOffset(getChannelSource(appParam_FFTSource), appParam_FFTSource);

            // Get FFT measurement data (must do it before computing the FFT, the measurement calculation performs its own FFT from the pre-FFT waveform data)
            appParam_FFTMeasurements = calculateTHDPlusN(FFTrawPoints, appParam_sampleRate, standard = 'RF'); // 'Audio' or 'RF'

            // Compute FFT with window gain compensation
            const FFT_UPD = appParam_FFTUnits == 'V' ? table_VPD[2][appParam_FFT_VPD] : (appParam_FFTUnits == 'W' ? table_WPD[2][appParam_FFT_WPD] : ((appParam_FFTUnits == 'dB' || appParam_FFTUnits == 'dBV' || appParam_FFTUnits == 'dBm' || appParam_FFTUnits == 'dBW' || appParam_FFTUnits == 'dBFS') ? table_dBPD[2][appParam_FFT_dBPD] : 1));
            FFTrawPoints = createFFT(FFTrawPoints, appParam_FFTWindow, appParam_FFTZoom, appParam_FFTScale, FFT_UPD, 0, appParam_FFTImpedance[2]);

            // Perform FFT analysis to get values from peaks and other useful values (this must be done after computing the FFT, these measurements are calculated from the FFT data)
            appParam_FFTAnalysis = analyzeFFT(FFTrawPoints, appParam_FFTZoom, CH1rawPoints, (appParam_FFTSource == 'REF' ? appParam_REFTPD : appParam_currTPD), appParam_FFTFindPeaks);

            // Apply offset
            FFTrawPoints = applyOffset(FFTrawPoints, appParam_FFTOffset);
        }

    } catch (error) {
        //console.log(`Error processing waveforms: ${error.message}`);
    }
}

// Draws the grid in its own canvas
function plotGrid(forceRedraw = 0) {
    // Define the number of grids to draw
    appParam_gridsToDraw = 1;
    if (appParam_XYmode == 'ON') {
        appParam_gridsToDraw = 1;
    } else if (appParam_displayMode === 'Stacked') {
        appParam_gridsToDraw = 1 + ((param_CH2enabled === 1) ? 1 : 0) + ((appParam_mathEnabled == 'ON') ? 1 : 0) + ((appParam_FFTEnabled == 'ON') ? 1 : 0);
    }

    if ((forceRedraw == 1) || (appParam_gridsToDraw != appParam_previousGridsToDraw) || (gridRightMargin != appParam_previousGridRightMargin) || (appParam_gridMode != appParam_previousGridMode)) { // check if the grid requeriments have changed to redraw the updated grid if needed
        appParam_REFForceUpdate = 1; // Enable flag to update the REF waveform to fit the grid
        appParam_previousGridMode = appParam_gridMode; // update reference values
        appParam_previousGridsToDraw = appParam_gridsToDraw; // update reference values
        appParam_previousGridRightMargin = gridRightMargin; // update reference values
        //console.log(`Redrawing grid...`);

        const canvas = document.getElementById('gridCanvas');
        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        try {
            // Draw the grid (or grids if applicable)
            drawGrid(ctx, appParam_gridsToDraw, gridLeftMargin, gridRightMargin, gridTopMargin, gridBottomMargin, gridInterMargin, appParam_gridMode);
        } catch (error) {
            //console.log(`Error drawing grid: ${error.message}`);
        }
    }
}

// Draws the menu in its own canvas
function drawMenu(forceRedraw = 0) {
    if (appParam_menuForceDelete == 1) { // delete the manu
        appParam_menuForceDelete = 0;
        const canvas = document.getElementById('menuCanvas');
        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        ctx.shadowBlur = 0; // 15;
        ctx.shadowColor = 'transparent'; //color;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    if ((appParam_menuForceDraw == 1) || (forceRedraw == 1)) { // redraw the menu if needed     
        appParam_menuForceDraw = 0;
        try {
            // Draw the menu
            const canvas = document.getElementById('menuCanvas');
            const ctx = canvas.getContext('2d');
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            ctx.shadowBlur = 0; // 15;
            ctx.shadowColor = 'transparent'; //color;
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            const darkGrey = '#303030';
            const lightGrey = '#808080';

            const menuWidth = 216;
            const menuHeight = 710;
            const titleheight = 45;
            const blockHeight = 68;
            const boxWidth = 188;
            const boxHeight = 31;

            // Draw Menu main block
            ctx.fillStyle = lightGrey;
            ctx.fillRect(0, 4, menuWidth, menuHeight);
            for (let i = 0; i < 8; i++) {
                if (labels_Menu[appParam_menuPage][i + 1] != "") {
                    ctx.fillRect(200, 101.5 + (72 * i), 20, 11);
                }
            }
            ctx.fillStyle = 'black';
            ctx.fillRect(3.5, 7.5, menuWidth - 7, menuHeight - 7);
            for (let i = 0; i < 8; i++) {
                if (labels_Menu[appParam_menuPage][i + 1] != "") {
                    ctx.fillRect(195, 103.5 + (72 * i), 26, 7);
                }
            }
            // Draw separators
            ctx.fillStyle = lightGrey;
            for (let i = 0; i < 8; i++) {
                if (labels_Menu[appParam_menuPage][i] != "") {
                    ctx.fillRect(0, 69.5 + (72 * i), menuWidth, 2);
                    //drawText(ctx, "<         >", menuWidth / 2, 48 + (72 * i), 23, 'yellow', 0, 1);
                }
            }
            // Draw last separator (always drawn)
            ctx.fillRect(0, 69.5 + (72 * 8), menuWidth, 2);
            // Draw Menu Title
            drawText(ctx, labels_Menu[appParam_menuPage][0], menuWidth / 2, 38, 23, 'yellow', 0, 1);
            // Draw Menu Labels
            for (let i = 1; i < 9; i++) { // Draw labels
                drawText(ctx, labels_Menu[appParam_menuPage][i], menuWidth / 2, 20 + (72 * i), 23, 'yellow', 0, 1);
                if (labels_MenuOptionValues[i] != "" && labels_MenuOptionValues[i] != " ") {
                    if (false) {
                        drawText(ctx, labels_MenuOptionValues[i], menuWidth / 2, 48 + (72 * i), 23, 'white', 0, 1); // this one is currently not used
                    } else {
                        drawText(ctx, "< " + labels_MenuOptionValues[i] + " >", menuWidth / 2, 48 + (72 * i), 23, 'white', 0, 1);
                    }
                }
            }
            // Draw menu "Exit" option
            drawText(ctx, "Back", menuWidth / 2, 680, 23, 'yellow', 0, 1);

        } catch (error) {
            //console.log(`Error drawing menu: ${error.message}`);
        }
    }
}

// Draws the REF waveform in its own canvas
function plotREF(forceRedraw = 0) {
    if (appParam_REFForceUpdate == 1 && appParam_REFEnabled == 0) {
        appParam_REFForceUpdate = 0;
        const canvas = document.getElementById('refCanvas');
        const ctx = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        //console.log("Deleting REF");
        return;
    }
    if ((appParam_REFForceUpdate == 1 && appParam_REFEnabled > 0) || forceRedraw == 1) {
        appParam_REFForceUpdate = 0;
        //console.log("Updating REF");
        try {
            const canvas = document.getElementById('refCanvas');
            const ctx = canvas.getContext('2d');
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);

            // Set grid index to 0 and get bounds data
            let gridIndex = 0;
            let gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
            let gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;

            if (appParam_REFEnabled == 1) {
                // Draw waveform
                const CH1smoothPoints = processForPlotting(REFrawPoints, canvasWidth - gridLeftMargin - gridRightMargin, appParam_Interpolation);
                const CH1PointsToDraw = CH1smoothPoints.map(p => ({
                    x: gridBoundsArray[gridIndex].xMin + p.x,
                    y: gridCenterY - (p.y) * gridHeight
                }));
                drawWaveform(ctx, CH1PointsToDraw, gridBoundsArray[gridIndex], '#333300', appParam_Interpolation, appParam_lineThickness);
            }

            // CHANNEL 2 WAVEFORM (if enabled):
            if (param_CH2enabled === 1) {
                // Advance to next index and get bounds data
                gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
                gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
                gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
            }
            if (param_CH2enabled === 1 && appParam_REFEnabled == 2) {
                // Draw waveform
                const CH2smoothPoints = processForPlotting(REFrawPoints, canvasWidth - gridLeftMargin - gridRightMargin, appParam_Interpolation);
                const CH2PointsToDraw = CH2smoothPoints.map(p => ({
                    x: gridBoundsArray[gridIndex].xMin + p.x,
                    y: gridCenterY - (p.y) * gridHeight
                }));
                drawWaveform(ctx, CH2PointsToDraw, gridBoundsArray[gridIndex], '#00440B', appParam_Interpolation, appParam_lineThickness);
            } else if (param_CH2enabled === 0 && appParam_REFEnabled == 2) { // If REF holds a snapshot of this channel but the channel was disabled, render to CH1 space
                // Draw waveform
                const CH2smoothPoints = processForPlotting(REFrawPoints, canvasWidth - gridLeftMargin - gridRightMargin, appParam_Interpolation);
                const CH2PointsToDraw = CH2smoothPoints.map(p => ({
                    x: gridBoundsArray[0].xMin + p.x,
                    y: ((gridBoundsArray[0].yMin + gridBoundsArray[0].yMax) / 2) - (p.y) * (gridBoundsArray[0].yMax - gridBoundsArray[0].yMin)
                }));
                drawWaveform(ctx, CH2PointsToDraw, gridBoundsArray[0], '#00440B', appParam_Interpolation, appParam_lineThickness);
            }

            // CHANNEL MATH1 WAVEFORM (if enabled):
            if (appParam_mathEnabled == 'ON') {
                // Advance to next index and get bounds data
                gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
                gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
                gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
            }
            if (appParam_mathEnabled == 'ON' && appParam_REFEnabled == 3) {
                // Draw waveform
                const MATH1smoothPoints = processForPlotting(REFrawPoints, canvasWidth - gridLeftMargin - gridRightMargin, appParam_Interpolation);
                const MATH1PointsToDraw = MATH1smoothPoints.map(p => ({
                    x: gridBoundsArray[gridIndex].xMin + p.x,
                    y: gridCenterY - (p.y) * gridHeight
                }));
                drawWaveform(ctx, MATH1PointsToDraw, gridBoundsArray[gridIndex], '#082A55', appParam_Interpolation, appParam_lineThickness);
            } else if (appParam_mathEnabled == 'OFF' && appParam_REFEnabled == 3) { // If REF holds a snapshot of this channel but the channel was disabled, render to CH1 space
                // Draw waveform
                const MATH1smoothPoints = processForPlotting(REFrawPoints, canvasWidth - gridLeftMargin - gridRightMargin, appParam_Interpolation);
                const MATH1PointsToDraw = MATH1smoothPoints.map(p => ({
                    x: gridBoundsArray[0].xMin + p.x,
                    y: ((gridBoundsArray[0].yMin + gridBoundsArray[0].yMax) / 2) - (p.y) * (gridBoundsArray[0].yMax - gridBoundsArray[0].yMin)
                }));
                drawWaveform(ctx, MATH1PointsToDraw, gridBoundsArray[0], '#082A55', appParam_Interpolation, appParam_lineThickness);
            }

            // FFT advance index if enabled (for consistency, but this could be deleted)
            if (appParam_FFTEnabled == 'ON') { // if FFT is enabled and stacked mode is enabled, advance the index as necessary
                gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
            }
        } catch (error) {
            //console.log(`Error plotting REF: ${error.message}`);
        }
    }
}

// Draws the waveforms into the canvas
function plotData() {
    const canvas = document.getElementById('plotCanvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    try {
        // Set grid index to 0 and get bounds data
        let gridIndex = 0;
        let gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        let gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;


        if (appParam_XYmode == 'ON') { // TEST
            let gridCenterX = (gridBoundsArray[gridIndex].xMin + gridBoundsArray[gridIndex].xMax) / 2;
            let gridWidth = gridBoundsArray[gridIndex].xMax - gridBoundsArray[gridIndex].xMin;
            const XYsmoothPoints = mapForXY(CH1rawPoints, CH2rawPoints);
            const XYPointsToDraw = XYsmoothPoints.map(p => ({
                x: gridCenterX + (p.x) * gridWidth / 6 * 4,
                y: gridCenterY - (p.y) * gridHeight
            }));
            drawWaveform(ctx, XYPointsToDraw, gridBoundsArray[0], 'yellow', appParam_Interpolation, appParam_lineThickness);
        } else {
            // CHANNEL 1 WAVEFORM:
            // Draw waveform
            const CH1smoothPoints = processForPlotting(CH1rawPoints, canvasWidth - gridLeftMargin - gridRightMargin, appParam_Interpolation);
            const CH1PointsToDraw = CH1smoothPoints.map(p => ({
                x: gridBoundsArray[gridIndex].xMin + p.x,
                y: gridCenterY - (p.y) * gridHeight
            }));
            drawWaveform(ctx, CH1PointsToDraw, gridBoundsArray[gridIndex], 'yellow', appParam_Interpolation, appParam_lineThickness);

            // CHANNEL 2 WAVEFORM (if enabled):
            if (param_CH2enabled === 1) {
                // Advance to next index and get bounds data
                gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
                gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
                gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
                // Draw waveform
                const CH2smoothPoints = processForPlotting(CH2rawPoints, canvasWidth - gridLeftMargin - gridRightMargin, appParam_Interpolation);
                const CH2PointsToDraw = CH2smoothPoints.map(p => ({
                    x: gridBoundsArray[gridIndex].xMin + p.x,
                    y: gridCenterY - (p.y) * gridHeight
                }));
                drawWaveform(ctx, CH2PointsToDraw, gridBoundsArray[gridIndex], '#00E020', appParam_Interpolation, appParam_lineThickness);
            }

            // CHANNEL MATH1 WAVEFORM (if enabled):
            if (appParam_mathEnabled == 'ON') {
                // Advance to next index and get bounds data
                gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
                gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
                gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
                // Draw waveform
                const MATH1smoothPoints = processForPlotting(MATH1rawPoints, canvasWidth - gridLeftMargin - gridRightMargin, appParam_Interpolation);
                const MATH1PointsToDraw = MATH1smoothPoints.map(p => ({
                    x: gridBoundsArray[gridIndex].xMin + p.x,
                    y: gridCenterY - (p.y) * gridHeight
                }));
                drawWaveform(ctx, MATH1PointsToDraw, gridBoundsArray[gridIndex], 'dodgerblue', appParam_Interpolation, appParam_lineThickness);
            }

            // CHANNEL FFT WAVEFORM (if enabled):
            if (appParam_FFTEnabled == 'ON') {
                // Advance to next index and get bounds data
                gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
                gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
                gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
                // Draw waveform
                const FFTsmoothPoints = processForPlottingFFT(FFTrawPoints, canvasWidth - gridLeftMargin - gridRightMargin, appParam_Interpolation);
                const FFTPointsToDraw = FFTsmoothPoints.map(p => ({
                    x: gridBoundsArray[gridIndex].xMin + p.x,
                    y: gridCenterY - (p.y) * gridHeight
                }));
                drawWaveform(ctx, FFTPointsToDraw, gridBoundsArray[gridIndex], 'red', appParam_Interpolation, appParam_lineThickness);
            }
        }



        //console.log(`Plotted ${CH1rawPoints.length} points from ${backupCH1Data.length} characters (CH1)`);
        if (param_CH2enabled === 1) {
            //console.log(`Plotted ${CH2rawPoints.length} points from ${backupCH2Data.length} characters (CH2)`);
        }
    } catch (error) {
        //console.log(`Error plotting data: ${error.message}`);
    }

}

//draws HUD elements and text
function drawHUD() {
    const canvas = document.getElementById('plotCanvas');
    const ctx = canvas.getContext('2d');
    const darkGrey = '#303030';
    const lightGrey = '#808080';

    // CHANNEL INFO BLOCKS ON BOTTOM BAR
    let posX_infoCH = gridLeftMargin;
    let posY_infoCH = 673;
    const infoWidth = 195;
    const infoHeight = 40;
    let color_infoCH1 = 'yellow';
    let color_infoCH2 = '#00E020';
    let color_infoMATH1 = 'dodgerblue';
    let color_FFT = 'red';

    if (appParam_selectedChannel == 'CH1') {
        color_infoCH1 = 'yellow';
        color_infoCH2 = darkGrey;
        color_infoMATH1 = darkGrey;
        color_FFT = darkGrey;
    } else if (appParam_selectedChannel == 'CH2') {
        color_infoCH1 = darkGrey;
        color_infoCH2 = '#00E020';
        color_infoMATH1 = darkGrey;
        color_FFT = darkGrey;
    } else if (appParam_selectedChannel == 'MATH1') {
        color_infoCH1 = darkGrey;
        color_infoCH2 = darkGrey;
        color_infoMATH1 = 'dodgerblue';
        color_FFT = darkGrey;
    } else if (appParam_selectedChannel == 'FFT') {
        color_infoCH1 = darkGrey;
        color_infoCH2 = darkGrey;
        color_infoMATH1 = darkGrey;
        color_FFT = 'red';
    }

    ctx.lineWidth = 2;

    // CH1 block
    ctx.strokeStyle = color_infoCH1;
    ctx.beginPath();
    ctx.moveTo(posX_infoCH, posY_infoCH);
    ctx.lineTo(posX_infoCH + infoWidth, posY_infoCH);
    ctx.lineTo(posX_infoCH + infoWidth, posY_infoCH + infoHeight);
    ctx.lineTo(posX_infoCH, posY_infoCH + infoHeight);
    ctx.lineTo(posX_infoCH, posY_infoCH);
    ctx.stroke();
    drawText(ctx, "CH1  ", posX_infoCH + 7, posY_infoCH + 21, 28, color_infoCH1, 1, 0);
    drawText(ctx, (param_CH1DCAC == 0 ? "DC" : "AC"), posX_infoCH + 74, posY_infoCH + 15, 26, '#000000', 0, 1);
    drawText(ctx, (param_CH1x1x10x100 == 0 ? "1x" : (param_CH1x1x10x100 == 1 ? "10x" : "100x")), posX_infoCH + 73, posY_infoCH + 32, 13, '#000000', 0, 1);
    drawText(ctx, getVoltsDiv(param_CH1voltsZoom, param_CH1x1x10x100, 0), posX_infoCH + 145, posY_infoCH + 15, 26, color_infoCH1, 0, 1);
    drawText(ctx, "Ę ", posX_infoCH + 148, posY_infoCH + 20, 40, color_infoCH1, 0, 1); // volts-div symbol

    // CH2 block
    posX_infoCH = gridLeftMargin + 205;
    ctx.strokeStyle = color_infoCH2;
    ctx.beginPath();
    ctx.moveTo(posX_infoCH, posY_infoCH);
    ctx.lineTo(posX_infoCH + infoWidth, posY_infoCH);
    ctx.lineTo(posX_infoCH + infoWidth, posY_infoCH + infoHeight);
    ctx.lineTo(posX_infoCH, posY_infoCH + infoHeight);
    ctx.lineTo(posX_infoCH, posY_infoCH);
    ctx.stroke();
    drawText(ctx, "CH2  ", posX_infoCH + 7, posY_infoCH + 21, 28, color_infoCH2, 1, 0);
    drawText(ctx, (param_CH2DCAC == 0 ? "DC" : "AC"), posX_infoCH + 74, posY_infoCH + 15, 26, '#000000', 0, 1);
    drawText(ctx, (param_CH2x1x10x100 == 0 ? "1x" : (param_CH2x1x10x100 == 1 ? "10x" : "100x")), posX_infoCH + 73, posY_infoCH + 32, 13, '#000000', 0, 1);
    if (param_CH2enabled == 1) {
        drawText(ctx, getVoltsDiv(param_CH2voltsZoom, param_CH2x1x10x100, 0), posX_infoCH + 145, posY_infoCH + 15, 26, color_infoCH2, 0, 1);
        drawText(ctx, "Ę ", posX_infoCH + 148, posY_infoCH + 20, 40, color_infoCH2, 0, 1); // volts-div symbol
    } else {
        drawText(ctx, "OFF", posX_infoCH + 145, posY_infoCH + 21, 28, color_infoCH2, 0, 1);
    }

    // MATH1 block (if enabled)
    //if (appParam_mathEnabled == 'ON'){
    posX_infoCH = gridLeftMargin + 410;
    ctx.strokeStyle = color_infoMATH1;
    ctx.beginPath();
    ctx.moveTo(posX_infoCH, posY_infoCH);
    ctx.lineTo(posX_infoCH + infoWidth, posY_infoCH);
    ctx.lineTo(posX_infoCH + infoWidth, posY_infoCH + infoHeight);
    ctx.lineTo(posX_infoCH, posY_infoCH + infoHeight);
    ctx.lineTo(posX_infoCH, posY_infoCH);
    ctx.stroke();
    drawText(ctx, "MATH1", posX_infoCH + 7, posY_infoCH + 21, 28, color_infoMATH1, 1, 0);
    if (appParam_mathEnabled == 'ON') {
        drawText(ctx, table_VPD[1][appParam_mathVoltsZoom], posX_infoCH + 145, posY_infoCH + 15, 26, color_infoMATH1, 0, 1);
        drawText(ctx, "Ę ", posX_infoCH + 148, posY_infoCH + 20, 40, color_infoMATH1, 0, 1); // volts-div symbol
    } else {
        drawText(ctx, "OFF", posX_infoCH + 145, posY_infoCH + 21, 28, color_infoMATH1, 0, 1);
    }
    //}

    // FFT block (if enabled)
    //if (appParam_FFTEnabled == 'ON'){
    let FFT_UPD_text = appParam_FFTUnits == 'V' ? table_VPD[1][appParam_FFT_VPD] : (appParam_FFTUnits == 'W' ? table_WPD[1][appParam_FFT_WPD] : ((appParam_FFTUnits == 'dB' || appParam_FFTUnits == 'dBV' || appParam_FFTUnits == 'dBm' || appParam_FFTUnits == 'dBW' || appParam_FFTUnits == 'dBFS') ? table_dBPD[1][appParam_FFT_dBPD] : "---"));
    FFT_UPD_text = appParam_FFTUnits == 'dBV' ? (FFT_UPD_text + 'V') : (appParam_FFTUnits == 'dBm' ? (FFT_UPD_text + 'm') : (appParam_FFTUnits == 'dBW' ? (FFT_UPD_text + 'W') : (appParam_FFTUnits == 'dBFS' ? (FFT_UPD_text + 'FS') : FFT_UPD_text)));
    FFT_UPD_text = appParam_FFTUnits == '°' ? "60°" : FFT_UPD_text;

    posX_infoCH = gridLeftMargin + 615;
    ctx.strokeStyle = color_FFT;
    ctx.beginPath();
    ctx.moveTo(posX_infoCH, posY_infoCH);
    ctx.lineTo(posX_infoCH + infoWidth, posY_infoCH);
    ctx.lineTo(posX_infoCH + infoWidth, posY_infoCH + infoHeight);
    ctx.lineTo(posX_infoCH, posY_infoCH + infoHeight);
    ctx.lineTo(posX_infoCH, posY_infoCH);
    ctx.stroke();
    drawText(ctx, " FFT ", posX_infoCH + 7, posY_infoCH + 21, 28, color_FFT, 1, 0);
    if (appParam_FFTEnabled == 'ON') {
        drawText(ctx, FFT_UPD_text, posX_infoCH + 145, posY_infoCH + 15, 26, color_FFT, 0, 1);
        drawText(ctx, "Ę ", posX_infoCH + 148, posY_infoCH + 20, 40, color_FFT, 0, 1); // volts-div symbol
    } else {
        drawText(ctx, "OFF", posX_infoCH + 145, posY_infoCH + 21, 28, color_FFT, 0, 1);
    }
    //}

    if (appParam_XYmode == 'OFF') {
        // draw time (H) arrow
        if (appParam_cursorMode != 'OFF' && (appParam_cursorSource == 'CH1' || appParam_displayMode == 'Overlay')) {
            drawText(ctx, "Ċ", ((appParam_timeArrowPosition * (canvas.width - gridLeftMargin - gridRightMargin)) + gridLeftMargin + 2), (gridTopMargin + 12), 30, 'white', 0, 1); //small arrow
        } else {
            drawText(ctx, "Ĕ", ((appParam_timeArrowPosition * (canvas.width - gridLeftMargin - gridRightMargin)) + gridLeftMargin + 2), (gridTopMargin + 12), 30, 'white', 0, 1); //normal arrow
        }
    }

    // TOP BAR ---------------------------------------------

    // Draw zoom map
    drawZoomMap(ctx);

    // Draw trigger status text
    let trigText = '';
    let trigTextColor = '';
    if (param_stopRun == 0) {
        trigTextColor = 'red';
        trigText = 'STOP';
    } else if (param_stopRun == 1) {
        trigTextColor = '#00E020';
        trigText = param_triggerMode == 0 ? 'AUTO' : 'NORMAL';
    } else if (param_stopRun == 2) {
        trigTextColor = 'yellow';
        trigText = 'WAIT';
    }
    drawText(ctx, trigText, (gridLeftMargin + 4), 14, 15, trigTextColor, 1, 0);

    // Time/div info
    drawText(ctx, "H", 100, 14, 15, 'white', 1, 0);
    drawText(ctx, getTimeDiv(param_timeZoomLvl, 0), 120, 14, 15, 'white', 0, 0);

    // Sample rate (if available)
    drawText(ctx, autoUnit(appParam_sampleRate, 2, "Sa/s"), 220, 14, 15, 'white', 0, 0);

    // Display mode icon
    drawText(ctx, (appParam_displayMode == 'Overlay' ? "Ě" : "ě"), 380, 16, 21, 'white', 0, 0); // display (overlay or stacked mode) icon

    // Draw Trigger info
    let trigTextPos = 875;
    drawText(ctx, "T", (trigTextPos), 14, 15, 'white', 1, 0);
    if (param_triggerCH1CH2 == 0) {
        drawText(ctx, "CH1", (trigTextPos + 20), 14, 15, 'yellow', 1, 0);
        drawText(ctx, (param_triggerEdge == 0 ? "Ē" : "ē"), (trigTextPos + 55), 16, 24, 'yellow', 0, 0);
        drawText(ctx, autoUnit(findTriggerVolts(appParam_currVPD_CH1), 2, "V"), (trigTextPos + 75), 14, 15, 'yellow', 0, 0);
    } else {
        drawText(ctx, "CH2", (trigTextPos + 20), 14, 15, '#00E020', 1, 0);
        drawText(ctx, (param_triggerEdge == 0 ? "Ē" : "ē"), (trigTextPos + 55), 16, 24, '#00E020', 0, 0);
        drawText(ctx, autoUnit(findTriggerVolts(appParam_currVPD_CH2), 2, "V"), (trigTextPos + 85), 14, 15, '#00E020', 0, 0);
    }

    if (appParam_XYmode == 'ON') {
        // maybe draw something for XY mode
    } else {
        // Draw cursors if enabled
        drawCursors(ctx);

        // DRAW ON-SCREEN TEXT. FOR STACKED MODE ----------------------------------------------------------

        // CHANNEL 1 ------------------------------------------------------------------------------------------------------------------------------------------------------------
        // Set grid index to 0 and get bounds data
        let gridIndex = 0;
        let gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        let gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
        let labelIndex = 0;
        // CH1 icons
        drawText(ctx, "ĕ", (gridLeftMargin - 9), (gridCenterY - ((param_CH1verticalPos - 128) / 200) * gridHeight), 30, 'yellow', 0, 1); // draw CH1 arrow
        if (param_triggerCH1CH2 == 0) {
            drawText(ctx, "ė", (1293 - gridRightMargin), (gridCenterY - ((param_triggerlevel - 128) / 200) * gridHeight), 30, 'yellow', 0, 1); // draw CH1 trigger arrow
            drawTriggerLine(ctx, gridIndex); // draw trigger line (10 frames countdown)
        }
        // CH1 division markings
        if (appParam_displayMode === 'Stacked') {
            for (let i = 0; i < 13; i++) {
                drawText(ctx, autoUnit((appParam_currTPD * (i - 6 - ((appParam_timeOffset - 0.5) * 12))), 1, "s"), (gridLeftMargin + ((canvas.width - gridLeftMargin - gridRightMargin) / 12) * i), (gridCenterY + 0.5 * gridHeight + 7), 11, 'yellow', 0, 1, gridLeftMargin - 5, gridRightMargin - 5);
            }
            // CH1 measurements
            writeMeasurements(ctx, 'CH1', (gridCenterY + 0.5 * gridHeight - 15));
            if (appParam_cursorMode != 'OFF' && appParam_cursorSource == 'CH1') {
                writeMeasurements(ctx, 'CURSORS', (gridCenterY - 0.5 * gridHeight + 15));
            }
        }

        // CHANNEL 2 (IF ENABLED) -----------------------------------------------------------------------------------------------------------------------------------------------
        if (param_CH2enabled === 1) {
            // Advance to next index (if applicable) and get bounds data
            gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
            gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
            gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
            labelIndex++;
            // CH2 icons
            drawText(ctx, "Ė", (gridLeftMargin - 9), (gridCenterY - ((param_CH2verticalPos - 128) / 200) * gridHeight), 30, '#00E020', 0, 1); // draw CH2 arrow
            if (param_triggerCH1CH2 == 1) {
                drawText(ctx, "ė", (1293 - gridRightMargin), (gridCenterY - ((param_triggerlevel - 128) / 200) * gridHeight), 30, '#00E020', 0, 1); // draw trigger arrow
                drawTriggerLine(ctx, gridIndex); // draw trigger line (10 frames countdown)
            }
            // CH2 division markings (if in stacked mode)
            if (appParam_displayMode === 'Stacked') {
                for (let i = 0; i < 13; i++) { // draw division marking values under the grid
                    drawText(ctx, autoUnit((appParam_currTPD * (i - 6 - ((appParam_timeOffset - 0.5) * 12))), 1, "s"), (gridLeftMargin + ((canvas.width - gridLeftMargin - gridRightMargin) / 12) * i), (gridCenterY + 0.5 * gridHeight + 7), 11, '#00E020', 0, 1, gridLeftMargin - 5, gridRightMargin - 5);
                }
                // CH2 measurements
                writeMeasurements(ctx, 'CH2', (gridCenterY + 0.5 * gridHeight - 15));
                if (appParam_cursorMode != 'OFF' && appParam_cursorSource == 'CH2') {
                    writeMeasurements(ctx, 'CURSORS', (gridCenterY - 0.5 * gridHeight + 15));
                }
            }
        }

        // CHANNEL MATH1 (IF ENABLED) ------------------------------------------------------------------------------------------------------------------------------------------
        if (appParam_mathEnabled == 'ON') {
            // Advance to next index (if applicable) and get bounds data
            gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
            gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
            gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
            labelIndex++;
            // MATH1 icon
            drawText(ctx, "Č", (gridLeftMargin - 9), (gridCenterY - appParam_mathVerticalPos * gridHeight), 30, 'dodgerblue', 0, 1); // draw MATH1 arrow
            // MATH1 division markings (if in stacked mode)
            if (appParam_displayMode === 'Stacked') {
                for (let i = 0; i < 13; i++) { // draw division marking values under the grid
                    drawText(ctx, autoUnit((appParam_currTPD * (i - 6 - ((appParam_timeOffset - 0.5) * 12))), 1, "s"), (gridLeftMargin + ((canvas.width - gridLeftMargin - gridRightMargin) / 12) * i), (gridCenterY + 0.5 * gridHeight + 7), 11, 'dodgerblue', 0, 1, gridLeftMargin - 5, gridRightMargin - 5);
                }
                // MATH1 measurements
                writeMeasurements(ctx, 'MATH1', (gridCenterY + 0.5 * gridHeight - 15));
                if (appParam_cursorMode != 'OFF' && appParam_cursorSource == 'MATH1') {
                    writeMeasurements(ctx, 'CURSORS', (gridCenterY - 0.5 * gridHeight + 15));
                }
                // MATH1 operation
                if (appParam_cursorMode != 'OFF' && appParam_cursorSource == 'MATH1') {
                    drawText(ctx, '(' + appParam_mathOperation.replace("A", appParam_mathSourceA).replace("B", appParam_mathSourceB) + ')', (gridLeftMargin + 5), (gridCenterY - 0.5 * gridHeight + 15 + 24), 15, 'dodgerblue', 0, 0);
                } else {
                    drawText(ctx, '(' + appParam_mathOperation.replace("A", appParam_mathSourceA).replace("B", appParam_mathSourceB) + ')', (gridLeftMargin + 5), (gridCenterY - 0.5 * gridHeight + 15), 15, 'dodgerblue', 0, 0);
                }

            }
        }

        // CHANNEL FFT (IF ENABLED) ---------------------------------------------------------------------------------------------------------------------------------------------
        if (appParam_FFTEnabled == 'ON') {
            // Advance to next index (if applicable) and get bounds data
            gridIndex = appParam_displayMode === 'Stacked' ? (gridIndex + 1) : 0;
            gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
            gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;
            labelIndex++;
            // FFT icon
            drawText(ctx, "ċ", (gridLeftMargin - 9), (gridCenterY - appParam_FFTVerticalPos * gridHeight), 30, 'red', 0, 1); // draw FFT arrow
            // FFT Peaks (all scales except 'Phase')
            if (appParam_FFTScale != 'Phase') {
                let currVpd = 1;
                if (appParam_FFTUnits == 'V') {
                    currVpd = table_VPD[2][appParam_FFT_VPD];
                } else if (appParam_FFTUnits == 'W') {
                    currVpd = table_WPD[2][appParam_FFT_WPD];
                } else if (appParam_FFTUnits == 'dB' || appParam_FFTUnits == 'dBV' || appParam_FFTUnits == 'dBm' || appParam_FFTUnits == 'dBW' || appParam_FFTUnits == 'dBFS') {
                    currVpd = table_dBPD[2][appParam_FFT_dBPD];
                } else if (appParam_FFTUnits == '°') {
                    currVpd = 60;
                }
                appParam_FFTAnalysis.peaks.forEach(peak => {
                    //console.log(`  Freq: ${peak.freq.toFixed(2)} Hz, Index: ${peak.index}, Magnitude: ${peak.magnitude.toFixed(2)}`);
                    const peakValue = appParam_FFTPeakUnits == 'Frequency' ? autoUnit(peak.freq, 2, "Hz") : autoUnit(peak.magnitude * (8 * currVpd), 2, appParam_FFTUnits);
                    if ((gridCenterY - FFTrawPoints[peak.index] * gridHeight) - 20 > gridBoundsArray[gridIndex].yMin && (gridCenterY - FFTrawPoints[peak.index] * gridHeight) - 20 < gridBoundsArray[gridIndex].yMax) {
                        drawText(ctx, peakValue, ((((canvas.width - gridLeftMargin - gridRightMargin) / 1024) * peak.index) + gridLeftMargin), (gridCenterY - FFTrawPoints[peak.index] * gridHeight) - 20, 11, 'white', 0, 1, gridLeftMargin + 1, gridRightMargin - 1);
                    }
                    if ((gridCenterY - FFTrawPoints[peak.index] * gridHeight) - 9 > gridBoundsArray[gridIndex].yMin && (gridCenterY - FFTrawPoints[peak.index] * gridHeight) - 9 < gridBoundsArray[gridIndex].yMax) {
                        drawText(ctx, 'ę', ((((canvas.width - gridLeftMargin - gridRightMargin) / 1024) * peak.index) + gridLeftMargin) + 1, (gridCenterY - FFTrawPoints[peak.index] * gridHeight) - 9, 15, 'white', 0, 1, gridLeftMargin + 1, gridRightMargin - 1);
                    }
                });
            }
            // FFT division markings (if in stacked mode)
            if (appParam_displayMode === 'Stacked') {
                for (let i = 0; i < 13; i++) {
                    drawText(ctx, autoUnit((appParam_FFTAnalysis.totalBandwidth / 12 * i) + appParam_FFTAnalysis.startFreq, 2, "Hz"), (gridLeftMargin + ((canvas.width - gridLeftMargin - gridRightMargin) / 12) * i), (gridCenterY + 0.5 * gridHeight + 7), 11, 'red', 0, 1, gridLeftMargin - 5, gridRightMargin - 5);
                }
                // FFT measurements
                writeMeasurements(ctx, 'FFT', (gridCenterY + 0.5 * gridHeight - 15));
                if (appParam_cursorMode != 'OFF' && appParam_cursorSource == 'FFT') {
                    writeMeasurements(ctx, 'CURSORS', (gridCenterY - 0.5 * gridHeight + 15));
                }
            }
        }

        // DRAW ON-SCREEN TEXT. FOR OVERLAY MODE ----------------------------------------------------------
        if (appParam_displayMode === 'Overlay') {
            // Cursors (if enabled) on top 
            if (appParam_cursorMode != 'OFF') {
                writeMeasurements(ctx, 'CURSORS', (gridCenterY - 0.5 * gridHeight + 15));
            }

            // CH1
            writeMeasurements(ctx, 'CH1', (gridCenterY + 0.5 * gridHeight - 15) - (labelIndex * 24));

            // CH2
            if (param_CH2enabled === 1) {
                labelIndex--;
                writeMeasurements(ctx, 'CH2', (gridCenterY + 0.5 * gridHeight - 15) - (labelIndex * 24));
            }

            // MATH1
            if (appParam_mathEnabled == 'ON') {
                labelIndex--;
                writeMeasurements(ctx, 'MATH1', (gridCenterY + 0.5 * gridHeight - 15) - (labelIndex * 24));
                if (appParam_cursorMode != 'OFF') {
                    drawText(ctx, '(' + appParam_mathOperation.replace("A", appParam_mathSourceA).replace("B", appParam_mathSourceB) + ')', (gridLeftMargin + 5), (gridCenterY - 0.5 * gridHeight + 15 + 24), 15, 'dodgerblue', 0, 0);
                } else {
                    drawText(ctx, '(' + appParam_mathOperation.replace("A", appParam_mathSourceA).replace("B", appParam_mathSourceB) + ')', (gridLeftMargin + 5), (gridCenterY - 0.5 * gridHeight + 15), 15, 'dodgerblue', 0, 0);
                }
                // Č = math arrow / ċ = F arrow
            }

            // FFT
            if (appParam_FFTEnabled == 'ON') {
                labelIndex--;
                writeMeasurements(ctx, 'FFT', (gridCenterY + 0.5 * gridHeight - 15) - (labelIndex * 24));
            }

            // Grid division markings
            for (let i = 0; i < 13; i++) {
                drawText(ctx, autoUnit((appParam_currTPD * (i - 6 - ((appParam_timeOffset - 0.5) * 12))), 1, "s"), (gridLeftMargin + ((canvas.width - gridLeftMargin - gridRightMargin) / 12) * i), (gridCenterY + 0.5 * gridHeight + 7), 11, 'lightGray', 0, 1, gridLeftMargin - 5, gridRightMargin - 5);
            }
        }
    }


    drawText(ctx, elapsedTimeText, 1200, 700, 15, 'yellow', 0, 0); // buffer change tracker text
}

// Draw a circle
function drawCircle(ctx, posX, posY, radius, color) {
    ctx.beginPath();
    ctx.arc(posX, posY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Draws the cursors (if enabled)
function drawCursors(ctx) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const lighterGrey = '#AAAAAA';
    if (appParam_cursorMode != 'OFF') {
        let colorX1 = lighterGrey;
        let colorX2 = lighterGrey;
        let colorY1 = lighterGrey;
        let colorY2 = lighterGrey;
        let thicknessX1 = 1;
        let thicknessX2 = 1;
        let thicknessY1 = 1;
        let thicknessY2 = 1;
        let crossingRadius = appParam_gridsToDraw == 1 ? 9 : (appParam_gridsToDraw == 2 ? 7 : 5);
        switch (appParam_cursorSelected) {
            case 'X1':
                colorX1 = 'white';
                thicknessX1 = 2;
                break;
            case 'X2':
                colorX2 = 'white';
                thicknessX2 = 2;
                break;
            case 'X1+X2':
                colorX1 = 'white';
                colorX2 = 'white';
                thicknessX1 = 2;
                thicknessX2 = 2;
                break;
            case 'Y1':
                colorY1 = 'white';
                thicknessY1 = 2;
                break;
            case 'Y2':
                colorY2 = 'white';
                thicknessY2 = 2;
                break;
            case 'Y1+Y2':
                colorY1 = 'white';
                colorY2 = 'white';
                thicknessY1 = 2;
                thicknessY2 = 2;
                break;
            default:
                break;
        }

        function drawThemCursors() {
            let crossing1 = 0.0;
            let crossing2 = 0.0;
            // draw cursors
            drawVerticalLine(ctx, (gridCenterX - (gridWidth / 2)) + (appParam_cursorX1Pos * gridWidth), gridBoundsArray[gridIndex], colorX1, 5, thicknessX1);
            drawVerticalLine(ctx, (gridCenterX - (gridWidth / 2)) + (appParam_cursorX2Pos * gridWidth), gridBoundsArray[gridIndex], colorX2, 10, thicknessX2);
            if (appParam_cursorSource == 'FFT' && appParam_FFTScale == 'Linear') {
                // Dont draw horizontal cursors if FFT linear mode
            } else if (appParam_cursorMode == 'Manual') {
                drawHorizontalLine(ctx, (gridCenterY - ((appParam_cursorY1Pos - 128) / 200) * gridHeight), gridBoundsArray[gridIndex], colorY1, 5, thicknessY1);
                drawHorizontalLine(ctx, (gridCenterY - ((appParam_cursorY2Pos - 128) / 200) * gridHeight), gridBoundsArray[gridIndex], colorY2, 10, thicknessY2);
            } else if (appParam_cursorMode == 'Track') {
                crossing1 = findCrossing(appParam_cursorX1Pos, getChannelSource(appParam_cursorSource));
                if ((crossing1 < 0.49) && (crossing1 > -0.49)) {
                    drawHorizontalLine(ctx, (gridCenterY - (crossing1) * gridHeight), gridBoundsArray[gridIndex], colorX1, 5, thicknessY1);
                }
                if ((crossing1 < 0.49) && (crossing1 > -0.49) && (appParam_cursorX1Pos < 0.991) && (appParam_cursorX1Pos > 0.009)) {
                    drawCircle(ctx, (gridCenterX - (gridWidth / 2)) + (appParam_cursorX1Pos * gridWidth), (gridCenterY - (crossing1) * gridHeight), crossingRadius, colorX1);
                }
                crossing2 = findCrossing(appParam_cursorX2Pos, getChannelSource(appParam_cursorSource));
                if ((crossing2 < 0.49) && (crossing2 > -0.49)) {
                    drawHorizontalLine(ctx, (gridCenterY - (crossing2) * gridHeight), gridBoundsArray[gridIndex], colorX2, 10, thicknessY2);
                }
                if ((crossing2 < 0.49) && (crossing2 > -0.49) && (appParam_cursorX2Pos < 0.991) && (appParam_cursorX2Pos > 0.009)) {
                    drawCircle(ctx, (gridCenterX - (gridWidth / 2)) + (appParam_cursorX2Pos * gridWidth), (gridCenterY - (crossing2) * gridHeight), crossingRadius, colorX2);
                }
            }
            // store cursor measurements
            let currVpd = 1;
            currVpd = appParam_cursorSource == 'CH1' ? appParam_currVPD_CH1 : currVpd;
            currVpd = appParam_cursorSource == 'CH2' ? appParam_currVPD_CH2 : currVpd;
            currVpd = appParam_cursorSource == 'MATH1' ? table_VPD[2][appParam_mathVoltsZoom] : currVpd;
            if (appParam_cursorSource == 'FFT') {
                if (appParam_FFTUnits == 'V') {
                    currVpd = table_VPD[2][appParam_FFT_VPD];
                } else if (appParam_FFTUnits == 'W') {
                    currVpd = table_WPD[2][appParam_FFT_WPD];
                } else if (appParam_FFTUnits == 'dB' || appParam_FFTUnits == 'dBV' || appParam_FFTUnits == 'dBm' || appParam_FFTUnits == 'dBW' || appParam_FFTUnits == 'dBFS') {
                    currVpd = table_dBPD[2][appParam_FFT_dBPD];
                } else if (appParam_FFTUnits == '°') {
                    currVpd = 60;
                } else {
                    // do nothing
                }
            }

            appParam_cursorX1Val = (appParam_cursorX1Pos - 0.5) * (12 * appParam_currTPD); // value in seconds, taking the middle of the grid as zero reference
            appParam_cursorX2Val = (appParam_cursorX2Pos - 0.5) * (12 * appParam_currTPD); // value in seconds, taking the middle of the grid as zero reference
            if (appParam_cursorSource == 'FFT') {
                appParam_cursorX1Val = (appParam_cursorX1Pos * appParam_FFTAnalysis.totalBandwidth) + appParam_FFTAnalysis.startFreq; // value in Hz of the current cursor position
                appParam_cursorX2Val = (appParam_cursorX2Pos * appParam_FFTAnalysis.totalBandwidth) + appParam_FFTAnalysis.startFreq; // value in Hz of the current cursor position
            }
            if (appParam_cursorRefLvl == 'Middle') {
                if (appParam_cursorMode == 'Manual') {
                    appParam_cursorY1Val = ((appParam_cursorY1Pos - 128) / 200) * (8 * currVpd); // value in volts, taking the middle of the grid as zero reference
                    appParam_cursorY2Val = ((appParam_cursorY2Pos - 128) / 200) * (8 * currVpd); // value in volts, taking the middle of the grid as zero reference
                } else if (appParam_cursorMode == 'Track') {
                    appParam_cursorY1Val = (crossing1) * (8 * currVpd); // value in volts, taking the middle of the grid as zero reference
                    appParam_cursorY2Val = (crossing2) * (8 * currVpd); // value in volts, taking the middle of the grid as zero reference
                }
            } else if (appParam_cursorRefLvl == 'Offset') {
                if (appParam_cursorMode == 'Manual') {
                    appParam_cursorY1Val = removeExistingOffsetSingle(((appParam_cursorY1Pos - 128) / 200), appParam_cursorSource) * (8 * currVpd); // value in volts, taking the waveform offset as zero reference
                    appParam_cursorY2Val = removeExistingOffsetSingle(((appParam_cursorY2Pos - 128) / 200), appParam_cursorSource) * (8 * currVpd); // value in volts, taking the waveform offset as zero reference
                } else if (appParam_cursorMode == 'Track') {
                    appParam_cursorY1Val = removeExistingOffsetSingle((crossing1), appParam_cursorSource) * (8 * currVpd); // value in volts, taking the waveform offset as zero reference
                    appParam_cursorY2Val = removeExistingOffsetSingle((crossing2), appParam_cursorSource) * (8 * currVpd); // value in volts, taking the waveform offset as zero reference
                }
            }

            appParam_cursorDX = appParam_cursorX2Val - appParam_cursorX1Val;
            appParam_cursorDY = appParam_cursorY2Val - appParam_cursorY1Val;
            appParam_cursor1divDX = 1 / appParam_cursorDX;
        }

        let gridIndex = 0;
        let gridCenterX = (gridBoundsArray[gridIndex].xMin + gridBoundsArray[gridIndex].xMax) / 2;
        let gridWidth = gridBoundsArray[gridIndex].xMax - gridBoundsArray[gridIndex].xMin;
        let gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        let gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;

        if (appParam_cursorMode != 'OFF' && appParam_cursorSource == 'CH1') {
            drawThemCursors();
        }
        // Advance to next index (if applicable) and get bounds data
        gridIndex = (appParam_displayMode === 'Stacked' && param_CH2enabled == 1) ? (gridIndex + 1) : gridIndex;
        gridCenterX = (gridBoundsArray[gridIndex].xMin + gridBoundsArray[gridIndex].xMax) / 2;
        gridWidth = gridBoundsArray[gridIndex].xMax - gridBoundsArray[gridIndex].xMin;
        gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;

        if (appParam_cursorSource == 'CH2') {
            drawThemCursors();
        }
        // Advance to next index (if applicable) and get bounds data
        gridIndex = (appParam_displayMode === 'Stacked' && appParam_mathEnabled == 'ON') ? (gridIndex + 1) : gridIndex;
        gridCenterX = (gridBoundsArray[gridIndex].xMin + gridBoundsArray[gridIndex].xMax) / 2;
        gridWidth = gridBoundsArray[gridIndex].xMax - gridBoundsArray[gridIndex].xMin;
        gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;

        if (appParam_cursorSource == 'MATH1') {
            drawThemCursors();
        }
        // Advance to next index (if applicable) and get bounds data
        gridIndex = (appParam_displayMode === 'Stacked' && appParam_FFTEnabled == 'ON') ? (gridIndex + 1) : gridIndex;
        gridCenterX = (gridBoundsArray[gridIndex].xMin + gridBoundsArray[gridIndex].xMax) / 2;
        gridWidth = gridBoundsArray[gridIndex].xMax - gridBoundsArray[gridIndex].xMin;
        gridCenterY = (gridBoundsArray[gridIndex].yMin + gridBoundsArray[gridIndex].yMax) / 2;
        gridHeight = gridBoundsArray[gridIndex].yMax - gridBoundsArray[gridIndex].yMin;

        if (appParam_cursorSource == 'FFT') {
            drawThemCursors();
        }
    }
}

// Draws the little waveform minimap marker thingy (still some stuff to iron out, especially the behaviour in STOP mode)
function drawZoomMap(ctx) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const darkGrey = '#303030';
    const lightGrey = '#808080';
    const blockWidth = 400;
    const blockHeight = 19;
    const pos_x = (canvasWidth / 2) - (blockWidth / 2);
    const pos_y = 5;

    if (appParam_XYmode == 'OFF') {
        let relativeWindowWidth = 0;
        let relativeWindowPos = 0;
        let realWindowWidth = 0;
        let realWindowPos = 0;
        if (param_stopRun == 0) {
            relativeWindowWidth = appParam_horizontalWindowWidth / ((appParam_horizontalLimitRightSnapshot - appParam_horizontalLimitLeftSnapshot) + appParam_horizontalWindowWidth); // relative to 1
            relativeWindowPos = 1 - ((appParam_horizontalCurrentPos - (appParam_horizontalLimitLeftSnapshot - (appParam_horizontalWindowWidth / 2))) / ((appParam_horizontalLimitRightSnapshot - appParam_horizontalLimitLeftSnapshot) + appParam_horizontalWindowWidth));
            realWindowWidth = ((blockWidth - 4) * relativeWindowWidth) < 3 ? 3 : ((blockWidth - 4) * relativeWindowWidth);
            realWindowPos = ((blockWidth - 4) * relativeWindowPos);
        } else {
            relativeWindowWidth = appParam_horizontalWindowWidth / ((appParam_horizontalLimitRight - appParam_horizontalLimitLeft) + appParam_horizontalWindowWidth); // relative to 1
            relativeWindowPos = 1 - ((appParam_horizontalCurrentPos - (appParam_horizontalLimitLeft - (appParam_horizontalWindowWidth / 2))) / ((appParam_horizontalLimitRight - appParam_horizontalLimitLeft) + appParam_horizontalWindowWidth));
            realWindowWidth = ((blockWidth - 4) * relativeWindowWidth) < 3 ? 3 : ((blockWidth - 4) * relativeWindowWidth);
            realWindowPos = ((blockWidth - 4) * relativeWindowPos);
        }

        ctx.fillStyle = lightGrey;
        ctx.fillRect(pos_x, pos_y, blockWidth, blockHeight);

        ctx.fillStyle = 'black';
        ctx.fillRect(pos_x + realWindowPos - (realWindowWidth / 2) + 2, pos_y + 1, realWindowWidth, blockHeight - 2);

        var amplitude = 4;
        var height = (pos_y + blockHeight / 2);
        var x_pos = pos_x;
        var width = 400;
        var step = 3;
        var cycles = 14.55;

        ctx.beginPath();
        ctx.moveTo(x_pos, height);
        var c = width / Math.PI / (cycles * 2);

        for (let i = 0; i < width; i += step) {
            var x = amplitude * Math.sin(i / c);
            ctx.lineTo(i + x_pos, height + x);
        }

        ctx.strokeStyle = lightGrey;
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        drawText(ctx, "X-Y Mode", (canvasWidth / 2), pos_y + (blockHeight / 2), 15, 'yellow', 0, 1); // buffer change tracker text
    }


    ctx.beginPath();
    ctx.moveTo(pos_x, pos_y);
    ctx.lineTo(pos_x + blockWidth, pos_y);
    ctx.lineTo(pos_x + blockWidth, pos_y + blockHeight);
    ctx.lineTo(pos_x, pos_y + blockHeight);
    ctx.lineTo(pos_x, pos_y);

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// lights and unlits DOM buttons as required
function updateDOM() {
    // Power button
    if (isPlotting) {
        document.getElementById('button-power').classList.add("button-lit");
    } else {
        document.getElementById('button-power').classList.remove("button-lit");
    }

    // RUN/STOP button
    if (param_stopRun == 1) {
        document.getElementById('button-runstop').classList.add("button-lit");
    } else {
        document.getElementById('button-runstop').classList.remove("button-lit");
    }

    // SINGLE button
    if (param_stopRun == 2) {
        document.getElementById('button-single').classList.add("button-lit");
    } else {
        document.getElementById('button-single').classList.remove("button-lit");
    }

    // CH1 Menu button
    if ((appParam_selectedChannel == 'CH1' && param_selectedChannel == 0) || appParam_menuPage == 4) {
        document.getElementById('button-CH1').classList.add("button-lit");
    } else {
        document.getElementById('button-CH1').classList.remove("button-lit");
    }

    // CH2 Menu button
    if ((appParam_selectedChannel == 'CH2' && param_selectedChannel == 1) || appParam_menuPage == 5) {
        document.getElementById('button-CH2').classList.add("button-lit");
    } else {
        document.getElementById('button-CH2').classList.remove("button-lit");
    }

    // Math Menu button
    if (appParam_selectedChannel == 'MATH1' || appParam_menuPage == 6) {
        document.getElementById('button-menu-math').classList.add("button-lit");
    } else {
        document.getElementById('button-menu-math').classList.remove("button-lit");
    }

    // FFT Menu button
    if (appParam_selectedChannel == 'FFT' || appParam_menuPage == 2) {
        document.getElementById('button-menu-fft').classList.add("button-lit");
    } else {
        document.getElementById('button-menu-fft').classList.remove("button-lit");
    }

    // Display Menu button
    if (appParam_menuPage == 1) {
        document.getElementById('button-menu-display').classList.add("button-lit");
    } else {
        document.getElementById('button-menu-display').classList.remove("button-lit");
    }

    // Acquisition Menu button
    if (appParam_menuPage == 3) {
        document.getElementById('button-menu-acquire').classList.add("button-lit");
    } else {
        document.getElementById('button-menu-acquire').classList.remove("button-lit");
    }

    // Trigger Menu button
    if (appParam_triggerLvlAutoManual == 'AutoLvl') {
        document.getElementById('button-menu-trigger-lvl-mode').classList.add("button-lit");
    } else {
        document.getElementById('button-menu-trigger-lvl-mode').classList.remove("button-lit");
    }

    // Measure Menu button
    if (appParam_menuPage == 8) {
        document.getElementById('button-menu-meas').classList.add("button-lit");
    } else {
        document.getElementById('button-menu-meas').classList.remove("button-lit");
    }

    // Cursor Menu button
    if (appParam_menuPage == 7 || appParam_cursorMode != 'OFF') {
        document.getElementById('button-menu-cursor').classList.add("button-lit");
    } else {
        document.getElementById('button-menu-cursor').classList.remove("button-lit");
    }

    // REF button 
    if (appParam_REFEnabled > 0) {
        document.getElementById('button-ref').classList.add("button-lit");
    } else {
        document.getElementById('button-ref').classList.remove("button-lit");
    }

    // XY button 
    if (appParam_XYmode == 'ON') {
        document.getElementById('button-xymode').classList.add("button-lit");
    } else {
        document.getElementById('button-xymode').classList.remove("button-lit");
    }

    // Multipurpose wheel LED
    if (appParam_menuPage == 2 || appParam_menuPage == 4 || appParam_menuPage == 5 || appParam_cursorMode != 'OFF') {
        document.getElementById('led-multi').classList.add("led-lit");
    } else {
        document.getElementById('led-multi').classList.remove("led-lit");
    }

    // Multipurpose buttons left/right
    if (appParam_cursorMode != 'OFF') {
        document.getElementById('button-menu-left').classList.add("button-lit");
        document.getElementById('button-menu-right').classList.add("button-lit");
    } else {
        document.getElementById('button-menu-left').classList.remove("button-lit");
        document.getElementById('button-menu-right').classList.remove("button-lit");
    }

    // Trigger LED
    if (appParam_triggerLvlAutoManual == 'Manual') {
        document.getElementById('led-trigger').classList.add("led-lit");
    } else {
        document.getElementById('led-trigger').classList.remove("led-lit");
    }
}

function determineAutoSignalSource() {
    if (appParam_intendedSamples > 1201) {
        return "DataBuffer2";
    } else if (appParam_intendedSamples > 300) {
        return "DataBuffer";
    } else {
        return "WAV";
    }
}

// Global variables to track the data acquisition success rate. they may be deleted when they are not useful anymore.
let invalidHexCounter = 0;
let failureCounter = 0;


// Gets data from the oscilloscope
async function startPlotting() {
    if (isPlotting || !writer) return;
    isPlotting = true;
    const delayMs = appParam_CommandDelay;
    document.getElementById('button-power').textContent = "STOP";
    document.getElementById('button-record').disabled = false; // Recording can start any time after START

    checkFirmwareCompatible();

    invalidHexCounter = 0;
    failureCounter = 0;

    plotInterval = setInterval(async () => {
        try {
            // Reset acquisition flag at the start of each cycle
            isDataAcquisitionInProgress = false;

            // Determine the signal source depending on the selected mode, or the intended number of samples if Auto mode is set
            if (appParam_GeneralSignalSourceMode == "Auto") {
                appParam_GeneralSignalSource = determineAutoSignalSource();
            } else {
                appParam_GeneralSignalSource = document.getElementById('signalSource').value;
            }

            // Step 1: Request and process data
            //console.log("Starting PRM request");
            isDataAcquisitionInProgress = true;

            if (appParam_GeneralSignalSource == "DataBuffer") {
                await sendCommand("#WAV2,2", true);
            } else if (appParam_GeneralSignalSource == "DataBuffer2") {
                await sendCommand("#WAV2,3", true);
            } else {
                await sendCommand("#WAV2,1", true);
            }
            let oscilloscopeData = await new Promise((resolve) => {
                dataResolver = resolve;
            });
            isDataAcquisitionInProgress = false;
            if (!oscilloscopeData) {
                log("oscilloscope data not received, using backup data");
                currentPRMData = backupPRMData; // use backup data
                currentCH1Data = backupCH1Data; // use backup data
                currentCH2Data = backupCH2Data; // use backup data
                failureCounter++;
            } else {
                // Parse oscilloscope data and store each chunk into its appropiate variable
                const firstCommaIndex = oscilloscopeData.indexOf(',');
                const secondCommaIndex = oscilloscopeData.indexOf(',', firstCommaIndex + 1);

                // process PRM data
                const prmHexData = extractHexData(oscilloscopeData.substring(0, firstCommaIndex));
                if (prmHexData) {
                    currentPRMData = prmHexData; // use current data
                    backupPRMData = currentPRMData; // backup current data
                } else {
                    log("PRM data not received, using backup PRM data");
                    currentPRMData = backupPRMData; // use backup data
                }
                // process CH1 data
                const ch1HexData = extractHexData(oscilloscopeData.substring(firstCommaIndex + 1, secondCommaIndex));
                if (ch1HexData) { // use current data
                    currentCH1Data = ch1HexData;
                    backupCH1Data = currentCH1Data; // backup current data
                } else {
                    log("CH1 data not received, using backup CH1 data");
                    currentCH1Data = backupCH1Data; // use backup data
                }

                // process CH2 data (if enabled)
                const ch2HexData = extractHexData(oscilloscopeData.substring(secondCommaIndex + 1));
                if (ch2HexData) { // use current data
                    currentCH2Data = ch2HexData;
                    backupCH2Data = currentCH2Data; // backup current data
                } else {
                    if (param_CH2enabled == 1) {
                        log("CH2 data not received, using backup CH2 data");
                        currentCH2Data = backupCH2Data; // use backup data
                    } else {
                        currentCH2Data = '';
                    }
                }
            }

            // Step 4: calculate success rate and other stats
            //console.log("Data Invalid Hex:" + invalidHexCounter);
            //console.log("Data Total failures:" + failureCounter);


            // Step 5: Process any queued button commands
            //console.log("Processing queued button commands: " + buttonCommandQueue.length + " queued commands.");
            await processButtonCommandQueue();

        } catch (error) {
            console.log(`Error obtaining data: ${error.message}`);
        }
    }, delayMs);
}

function loadUserSettings() {
    appParam_gridMode = localStorage.getItem('appParam_gridMode') == null ? 'Lines' : localStorage.getItem('appParam_gridMode');
    appParam_displayMode = localStorage.getItem('appParam_displayMode') == null ? 'Overlay' : localStorage.getItem('appParam_displayMode');
    appParam_lineThickness = localStorage.getItem('appParam_lineThickness') == null ? '1px' : localStorage.getItem('appParam_lineThickness');
}

function saveUserSettings() {
    localStorage.setItem('appParam_gridMode', appParam_gridMode);
    localStorage.setItem('appParam_displayMode', appParam_displayMode);
    localStorage.setItem('appParam_lineThickness', appParam_lineThickness);
}

// Modified stopPlotting to handle queued commands on stop
function stopPlotting() {
    if (!isPlotting) return;
    isPlotting = false;
    isDataAcquisitionInProgress = false; // Unlock button commands
    clearInterval(plotInterval);
    plotInterval = null;
    document.getElementById('button-power').textContent = "START";
    if (!appParam_isRecording) document.getElementById('button-record').disabled = true; // keep enabled if a recording is still open (so it can be SAVEd)
    processButtonCommandQueue(); // Process any remaining queued commands
    clearAllCanvas(); // clears all canvas
    appParam_menuPage = 0; // closes the menu
    gridRightMargin = 25; // Adjusts the grid margin back to default
    turnOffAllDOM(); // turns off all lit buttons and LEDs
    console.log("Shutdown...");
}

//--------------------- MENU RELATED FUNCTIONS -----------------------------------------------------------------------------------------------------------------------------//

function toggleMenu01() { // Display Menu
    if (appParam_menuPage != 1) {
        appParam_menuPage = 1;
        labels_MenuOptionValues[1] = appParam_gridMode; // load all variables into the option values array
        labels_MenuOptionValues[2] = appParam_displayMode;
        labels_MenuOptionValues[3] = appParam_lineThickness;
        labels_MenuOptionValues[4] = '';
        labels_MenuOptionValues[5] = '';
        labels_MenuOptionValues[6] = '';
        labels_MenuOptionValues[7] = '';
        labels_MenuOptionValues[8] = '';
        appParam_menuForceDraw = 1;
    } else {
        appParam_menuPage = 0;
        appParam_menuForceDelete = 1;
    }
}

function toggleMenu02() { // FFT Menu
    if (appParam_menuPage != 2) {
        appParam_menuPage = 2;
        labels_MenuOptionValues[1] = appParam_FFTEnabled; // load all variables into the option values array
        labels_MenuOptionValues[2] = appParam_FFTSource;
        labels_MenuOptionValues[3] = appParam_FFTImpedance[3];
        labels_MenuOptionValues[4] = appParam_FFTScale; // mode
        labels_MenuOptionValues[5] = appParam_FFTWindow;
        labels_MenuOptionValues[6] = appParam_FFTFindPeaks.toString().padStart(1, '0');
        labels_MenuOptionValues[7] = appParam_FFTPeakUnits;
        labels_MenuOptionValues[8] = '';
        appParam_menuForceDraw = 1;
    } else {
        appParam_menuPage = 0;
        appParam_menuForceDelete = 1;
    }
}

function toggleMenu03() { // Acquisition Menu
    if (appParam_menuPage != 3) {
        appParam_menuPage = 3;
        labels_MenuOptionValues[1] = appParam_acquisitionMode; // load all variables into the option values array
        labels_MenuOptionValues[2] = appParam_acquisitionModeSteps;
        labels_MenuOptionValues[3] = appParam_Interpolation;
        labels_MenuOptionValues[4] = '';
        labels_MenuOptionValues[5] = '';
        labels_MenuOptionValues[6] = '';
        labels_MenuOptionValues[7] = '';
        labels_MenuOptionValues[8] = '';
        appParam_menuForceDraw = 1;
    } else {
        appParam_menuPage = 0;
        appParam_menuForceDelete = 1;
    }
}

function toggleMenu04() { // CH1 Menu
    if (appParam_menuPage != 4) {
        appParam_menuPage = 4;
        labels_MenuOptionValues[1] = appParam_CH1Coupling; // load all variables into the option values array
        labels_MenuOptionValues[2] = appParam_CH1Probe;
        labels_MenuOptionValues[3] = appParam_CH1BWLimit;
        labels_MenuOptionValues[4] = appParam_CH1BWLimitValue[3];
        labels_MenuOptionValues[5] = '';
        labels_MenuOptionValues[6] = '';
        labels_MenuOptionValues[7] = '';
        labels_MenuOptionValues[8] = '';
        appParam_menuForceDraw = 1;
    } else {
        appParam_menuPage = 0;
        appParam_menuForceDelete = 1;
    }
}

function toggleMenu05() { // CH2 Menu
    if (appParam_menuPage != 5) {
        appParam_menuPage = 5;
        labels_MenuOptionValues[1] = appParam_CH2Enabled; // load all variables into the option values array
        labels_MenuOptionValues[2] = appParam_CH2Coupling;
        labels_MenuOptionValues[3] = appParam_CH2Probe;
        labels_MenuOptionValues[4] = appParam_CH2BWLimit;
        labels_MenuOptionValues[5] = appParam_CH2BWLimitValue[3];
        labels_MenuOptionValues[6] = '';
        labels_MenuOptionValues[7] = '';
        labels_MenuOptionValues[8] = '';
        appParam_menuForceDraw = 1;
    } else {
        appParam_menuPage = 0;
        appParam_menuForceDelete = 1;
    }
}

function toggleMenu06() { // Math Menu
    if (appParam_menuPage != 6) {
        appParam_menuPage = 6;
        labels_MenuOptionValues[1] = appParam_mathEnabled; // load all variables into the option values array
        labels_MenuOptionValues[2] = appParam_mathOperation;
        labels_MenuOptionValues[3] = appParam_mathSourceA;
        labels_MenuOptionValues[4] = appParam_mathSourceB;
        labels_MenuOptionValues[5] = ''; //autoUnit(appParam_mathOffset * 8 * table_VPD[2][appParam_mathVoltsZoom], 2, 'V'); // scale and translate Math offset value to volts. left here just in case i need it for something.
        labels_MenuOptionValues[6] = '';
        labels_MenuOptionValues[7] = '';
        labels_MenuOptionValues[8] = '';
        appParam_menuForceDraw = 1;
    } else {
        appParam_menuPage = 0;
        appParam_menuForceDelete = 1;
    }
}

function toggleMenu07() { // Cursor menu
    if (appParam_menuPage != 7) {
        appParam_menuPage = 7;
        labels_MenuOptionValues[1] = appParam_cursorMode; // load all variables into the option values array
        labels_MenuOptionValues[2] = appParam_cursorSource;
        labels_MenuOptionValues[3] = appParam_cursorRefLvl;
        labels_MenuOptionValues[4] = appParam_cursorSelected;
        labels_MenuOptionValues[5] = '';
        labels_MenuOptionValues[6] = '';
        labels_MenuOptionValues[7] = '';
        labels_MenuOptionValues[8] = '';
        appParam_menuForceDraw = 1;
    } else {
        appParam_menuPage = 0;
        appParam_menuForceDelete = 1;
    }
}

function toggleMenu08() { // Measure Menu
    if (appParam_menuPage != 8) {
        appParam_menuPage = 8;
        labels_MenuOptionValues[1] = appParam_Meas[1]; // load all variables into the option values array
        labels_MenuOptionValues[2] = appParam_Meas[2];
        labels_MenuOptionValues[3] = appParam_Meas[3];
        labels_MenuOptionValues[4] = appParam_Meas[4];
        labels_MenuOptionValues[5] = appParam_Meas[5];
        labels_MenuOptionValues[6] = appParam_Meas[6];
        labels_MenuOptionValues[7] = appParam_Meas[7];
        labels_MenuOptionValues[8] = appParam_Meas[8];
        appParam_menuForceDraw = 1;
    } else {
        appParam_menuPage = 0;
        appParam_menuForceDelete = 1;
    }
}

function menuButton1() {
    if (appParam_menuPage == 1) { // Display Menu
        toggleGridMode();
        labels_MenuOptionValues[1] = appParam_gridMode; //update the option value
    } else if (appParam_menuPage == 2) { // FFT Menu
        if (appParam_XYmode == 'OFF') {
            toggleFFT();
            labels_MenuOptionValues[1] = appParam_FFTEnabled;
        }
    } else if (appParam_menuPage == 3) { // Acquisition Menu
        toggleAcquisitionMode();
        labels_MenuOptionValues[1] = appParam_acquisitionMode;
    } else if (appParam_menuPage == 4) { // CH1 Menu
        toggleCH1Coupling();
        labels_MenuOptionValues[1] = appParam_CH1Coupling;
    } else if (appParam_menuPage == 5) { // CH2 Menu
        toggleCH2();
        labels_MenuOptionValues[1] = appParam_CH2Enabled;
    } else if (appParam_menuPage == 6) { // Math menu
        if (appParam_XYmode == 'OFF') {
            toggleMath();
            labels_MenuOptionValues[1] = appParam_mathEnabled;
        }
    } else if (appParam_menuPage == 7) { // Cursor menu
        if (appParam_XYmode == 'OFF') {
            appParam_cursorMode = cycleValueFromTable(appParam_cursorMode, table_cursorMode);
            if ((appParam_cursorMode == 'Track' || (appParam_cursorSource == 'FFT' && appParam_FFTScale == 'Linear')) && (appParam_cursorSelected == 'Y1' || appParam_cursorSelected == 'Y2' || appParam_cursorSelected == 'Y1+Y2')) {
                appParam_cursorSelected = 'X1';
                labels_MenuOptionValues[4] = appParam_cursorSelected;
            }
            labels_MenuOptionValues[1] = appParam_cursorMode;
        }
    } else if (appParam_menuPage == 8) { // Measurements menu
        appParam_Meas[1] = cycleValueFromTable(appParam_Meas[1], table_Meas[0]);
        labels_MenuOptionValues[1] = appParam_Meas[1];
        table_Meas[0]
    }
    if (appParam_menuPage) {
        drawMenu(1);
    }
}

function menuButton2() {
    if (appParam_menuPage == 1) { // Display Menu
        toggleDisplayMode();
        labels_MenuOptionValues[2] = appParam_displayMode; //update the option value
    } else if (appParam_menuPage == 2) { // FFT Menu
        appParam_FFTSource = cycleValueFromTable(appParam_FFTSource, table_FFTSource);
        while (isAvailable(appParam_FFTSource) == false) {
            appParam_FFTSource = cycleValueFromTable(appParam_FFTSource, table_FFTSource);
        }
        labels_MenuOptionValues[2] = appParam_FFTSource;
    } else if (appParam_menuPage == 3) { // Acquisition Menu
        appParam_acquisitionModeSteps = cycleValueFromTable(appParam_acquisitionModeSteps, table_acquisitionModeSteps);
        labels_MenuOptionValues[2] = appParam_acquisitionModeSteps;
    } else if (appParam_menuPage == 4) { // CH1 Menu
        toggleCH1Probe();
        labels_MenuOptionValues[2] = appParam_CH1Probe;
    } else if (appParam_menuPage == 5) { // CH2 Menu
        toggleCH2Coupling();
        labels_MenuOptionValues[2] = appParam_CH2Coupling;
    } else if (appParam_menuPage == 6) { // Math menu
        appParam_mathOperation = cycleValueFromTable(appParam_mathOperation, table_mathOperation);
        labels_MenuOptionValues[2] = appParam_mathOperation;
    } else if (appParam_menuPage == 7) { // Cursor menu
        appParam_cursorSource = cycleValueFromTable(appParam_cursorSource, table_cursorSource);
        while (isAvailable(appParam_cursorSource) == false) {
            appParam_cursorSource = cycleValueFromTable(appParam_cursorSource, table_cursorSource);
        }
        labels_MenuOptionValues[2] = appParam_cursorSource;
    } else if (appParam_menuPage == 8) { // Measurements menu
        appParam_Meas[2] = cycleValueFromTable(appParam_Meas[2], table_Meas[0]);
        labels_MenuOptionValues[2] = appParam_Meas[2];
    }
    if (appParam_menuPage) {
        drawMenu(1);
    }
}

function menuButton3() {
    if (appParam_menuPage == 1) { // Display Menu
        toggleLineThickness();
        labels_MenuOptionValues[3] = appParam_lineThickness; //update the option value
    } else if (appParam_menuPage == 2) { // FFT Menu
        toggleFFTImpedanceUnits();
        labels_MenuOptionValues[3] = appParam_FFTImpedance[3];
    } else if (appParam_menuPage == 3) { // Acquisition Menu
        appParam_Interpolation = cycleValueFromTable(appParam_Interpolation, table_Interpolation);
        labels_MenuOptionValues[3] = appParam_Interpolation; //update the option value
    } else if (appParam_menuPage == 4) { // CH1 Menu
        toggleCH1BWLimit();
        labels_MenuOptionValues[3] = appParam_CH1BWLimit;
    } else if (appParam_menuPage == 5) { // CH2 Menu
        toggleCH2Probe();
        labels_MenuOptionValues[3] = appParam_CH2Probe;
    } else if (appParam_menuPage == 6) { // Math menu
        appParam_mathSourceA = cycleValueFromTable(appParam_mathSourceA, table_mathSource);
        while (isAvailable(appParam_mathSourceA) == false) {
            appParam_mathSourceA = cycleValueFromTable(appParam_mathSourceA, table_mathSource);
        }
        labels_MenuOptionValues[3] = appParam_mathSourceA;
    } else if (appParam_menuPage == 7) { // Cursor menu
        appParam_cursorRefLvl = appParam_cursorRefLvl == 'Middle' ? 'Offset' : 'Middle';
        labels_MenuOptionValues[3] = appParam_cursorRefLvl;
    } else if (appParam_menuPage == 8) { // Measurements menu
        appParam_Meas[3] = cycleValueFromTable(appParam_Meas[3], table_Meas[0]);
        labels_MenuOptionValues[3] = appParam_Meas[3];
    }
    if (appParam_menuPage) {
        drawMenu(1);
    }
}

function menuButton4() {
    if (appParam_menuPage == 1) { // Display Menu

    } else if (appParam_menuPage == 2) { // FFT Menu
        appParam_FFTScale = cycleValueFromTable(appParam_FFTScale, table_FFTScale[0]);
        appParam_FFTUnits = getFFTUnits();
        if (appParam_FFTScale == 'Phase') {
            appParam_FFTOffset = 0;
        }
        labels_MenuOptionValues[4] = appParam_FFTScale;
    } else if (appParam_menuPage == 3) { // Acquisition Menu

    } else if (appParam_menuPage == 4) { // CH1 Menu
        toggleCH1BWLimitUnits();
        labels_MenuOptionValues[4] = appParam_CH1BWLimitValue[3];
    } else if (appParam_menuPage == 5) { // CH2 Menu
        toggleCH2BWLimit();
        labels_MenuOptionValues[4] = appParam_CH2BWLimit;
    } else if (appParam_menuPage == 6) { // Math menu
        appParam_mathSourceB = cycleValueFromTable(appParam_mathSourceB, table_mathSource);
        while (isAvailable(appParam_mathSourceB) == false) {
            appParam_mathSourceB = cycleValueFromTable(appParam_mathSourceB, table_mathSource);
        }
        labels_MenuOptionValues[4] = appParam_mathSourceB;
    } else if (appParam_menuPage == 7) { // Cursor menu
        if (appParam_cursorMode == 'Track' || (appParam_cursorSource == 'FFT' && appParam_FFTScale == 'Linear')) {
            appParam_cursorSelected = cycleValueFromTable(appParam_cursorSelected, table_cursorSelectedTrack);
        } else {
            appParam_cursorSelected = cycleValueFromTable(appParam_cursorSelected, table_cursorSelected);
        }
        labels_MenuOptionValues[4] = appParam_cursorSelected;
    } else if (appParam_menuPage == 8) { // Measurements menu
        appParam_Meas[4] = cycleValueFromTable(appParam_Meas[4], table_Meas[0]);
        labels_MenuOptionValues[4] = appParam_Meas[4];
    }
    if (appParam_menuPage) {
        drawMenu(1);
    }
}

function menuButton5() {
    if (appParam_menuPage == 1) { // Display Menu

    } else if (appParam_menuPage == 2) { // FFT Menu
        appParam_FFTWindow = cycleValueFromTable(appParam_FFTWindow, table_FFTWindow);
        labels_MenuOptionValues[5] = appParam_FFTWindow;
    } else if (appParam_menuPage == 3) { // Acquisition Menu

    } else if (appParam_menuPage == 4) { // CH1 Menu

    } else if (appParam_menuPage == 5) { // CH2 Menu
        toggleCH2BWLimitUnits();
        labels_MenuOptionValues[5] = appParam_CH2BWLimitValue[3];
    } else if (appParam_menuPage == 6) { // Math menu

    } else if (appParam_menuPage == 7) { // Cursor menu

    } else if (appParam_menuPage == 8) { // Measurements menu
        appParam_Meas[5] = cycleValueFromTable(appParam_Meas[5], table_Meas[0]);
        labels_MenuOptionValues[5] = appParam_Meas[5];
    }
    if (appParam_menuPage) {
        drawMenu(1);
    }
}

function menuButton6() {
    if (appParam_menuPage == 1) { // Display Menu

    } else if (appParam_menuPage == 2) { // FFT Menu
        toggleFFTFindPeaks();
        labels_MenuOptionValues[6] = appParam_FFTFindPeaks.toString().padStart(1, '0');
    } else if (appParam_menuPage == 3) { // Acquisition Menu

    } else if (appParam_menuPage == 4) { // CH1 Menu

    } else if (appParam_menuPage == 5) { // CH2 Menu

    } else if (appParam_menuPage == 6) { // Math menu

    } else if (appParam_menuPage == 7) { // Cursor menu

    } else if (appParam_menuPage == 8) { // Measurements menu
        appParam_Meas[6] = cycleValueFromTable(appParam_Meas[6], table_Meas[0]);
        labels_MenuOptionValues[6] = appParam_Meas[6];
    }
    if (appParam_menuPage) {
        drawMenu(1);
    }
}

function menuButton7() {
    if (appParam_menuPage == 1) { // Display Menu

    } else if (appParam_menuPage == 2) { // FFT Menu
        appParam_FFTPeakUnits = appParam_FFTPeakUnits == 'Frequency' ? 'Amplitude' : 'Frequency';
        labels_MenuOptionValues[7] = appParam_FFTPeakUnits;
    } else if (appParam_menuPage == 3) { // Acquisition Menu

    } else if (appParam_menuPage == 4) { // CH1 Menu

    } else if (appParam_menuPage == 5) { // CH2 Menu

    } else if (appParam_menuPage == 6) { // Math menu

    } else if (appParam_menuPage == 7) { // Cursor menu

    } else if (appParam_menuPage == 8) { // Measurements menu
        appParam_Meas[7] = cycleValueFromTable(appParam_Meas[7], table_Meas[0]);
        labels_MenuOptionValues[7] = appParam_Meas[7];
    }
    if (appParam_menuPage) {
        drawMenu(1);
    }
}

function menuButton8() {
    if (appParam_menuPage == 1) { // Display Menu

    } else if (appParam_menuPage == 2) { // FFT Menu

    } else if (appParam_menuPage == 3) { // Acquisition Menu

    } else if (appParam_menuPage == 4) { // CH1 Menu

    } else if (appParam_menuPage == 5) { // CH2 Menu

    } else if (appParam_menuPage == 6) { // Math menu

    } else if (appParam_menuPage == 7) { // Cursor menu

    } else if (appParam_menuPage == 8) { // Measurements menu
        appParam_Meas[8] = cycleValueFromTable(appParam_Meas[8], table_Meas[0]);
        labels_MenuOptionValues[8] = appParam_Meas[8];
    }
    if (appParam_menuPage) {
        drawMenu(1);
    }
}

function menuButton9() { // "BACK" button
    if (appParam_menuPage == 1) { // Display Menu
        toggleMenu01();
    } else if (appParam_menuPage == 2) { // FFT Menu
        toggleMenu02();
    } else if (appParam_menuPage == 3) { // Acquisition Menu
        toggleMenu03();
    } else if (appParam_menuPage == 4) { // CH1 Menu
        toggleMenu04();
    } else if (appParam_menuPage == 5) { // CH2 Menu
        toggleMenu05();
    } else if (appParam_menuPage == 6) { // Math menu
        toggleMenu06();
    } else if (appParam_menuPage == 7) { // Cursor menu
        toggleMenu07();
    } else if (appParam_menuPage == 8) { // Measurements menu
        toggleMenu08();
    }
}



//-------------------- TOGGLE AND CYCLE FUNCTIONS, ACTIVATED BY BUTTONS OR MENU OPTIONS (most of these send commands to the oscilloscope and/or enable/disable stuff ) ---------------------//

// toggles between plotting and no-plotting (basically turns the virtual oscilloscope on and off)
async function togglePlotting() {
    if (isPlotting) {
        console.log("Saving user settings...");
        saveUserSettings();
        clearInterval(iterateInterval);
        iterateInterval = null;
        stopPlotting();
    } else {
        console.log("Loading user settings...");
        loadUserSettings();
        plotGrid(1);
        startPlotting();
        iterateInterval = setInterval(doIteration, 100);
    }
}

//--------------------- RECORDING (PulseView .sr export) --------------------------------------------------------------------------------------------------------------------//

// Toggles recording of acquired samples. RECORD (start) -> SAVE (finish, builds and downloads the .sr file).
function toggleRecording() {
    const btn = document.getElementById('button-record');
    if (!appParam_isRecording) {
        // Start recording. Only possible after START (button is disabled otherwise, but guard anyway).
        if (!isPlotting) return;
        recordedFrames = [];
        appParam_bufferUpdated = false; // start capturing from the next genuinely new frame
        recPendingCH1 = null;
        recPendingCH2 = null;
        recordSampleRate = appParam_sampleRate; // .sr carries a single samplerate; capture it now
        recordCH2Enabled = (param_CH2enabled === 1); // fix the recorded channel set at start
        appParam_isRecording = true;
        btn.textContent = "SAVE";
        btn.classList.add('button-lit');
        log("Recording started...");
    } else {
        // Finish recording and export the .sr file.
        appParam_isRecording = false;
        btn.textContent = "RECORD";
        btn.classList.remove('button-lit');
        if (recordedFrames.length > 0) {
            exportRecordingSR();
        } else {
            log("Recording stopped: no frames were captured.");
        }
        if (!isPlotting) btn.disabled = true; // plotting already stopped -> re-disable RECORD
    }
}

// Converts an array of numbers into an ArrayBuffer of little-endian IEEE-754 float32 (sigrok analog format).
function floatArrayToLEBytes(arr) {
    const buf = new ArrayBuffer(arr.length * 4);
    const dv = new DataView(buf);
    for (let i = 0; i < arr.length; i++) {
        dv.setFloat32(i * 4, arr[i], true); // true = little-endian
    }
    return buf;
}

// Formats a samplerate (Hz) as a sigrok-style string (e.g. "200 MHz"), mirroring sr_samplerate_string.
function formatSamplerate(hz) {
    hz = Math.round(hz);
    if (hz <= 0) hz = 1;
    if (hz % 1000000000 === 0) return (hz / 1000000000) + " GHz";
    if (hz % 1000000 === 0) return (hz / 1000000) + " MHz";
    if (hz % 1000 === 0) return (hz / 1000) + " kHz";
    return hz + " Hz";
}

// Builds the sigrok v2 'metadata' INI file contents.
function buildRecordingMetadata(sampleRate, ch2Enabled) {
    let m = "";
    m += "[global]\n";
    m += "sigrok version=0.5.0\n";
    m += "\n";
    m += "[device 1]\n";
    m += "samplerate=" + formatSamplerate(sampleRate) + "\n";
    m += "capturefile=logic-1\n";
    m += "total probes=1\n";
    m += "probe1=FRAME\n";
    m += "unitsize=1\n";
    m += "total analog=" + (ch2Enabled ? 2 : 1) + "\n";
    m += "analog2=CH1\n";
    if (ch2Enabled) m += "analog3=CH2\n";
    return m;
}

// Compact local timestamp YYYYMMDDThhmmss for the export filename.
function recordingTimestamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "T" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

// Builds the .sr ZIP (via JSZip) from recordedFrames and triggers a download.
// Each acquired frame becomes its own chunk (analog-1-<ch>-<n>, logic-1-<n>); a FRAME logic channel
// pulses at each frame's first sample so boundaries are visible in PulseView.
function exportRecordingSR() {
    if (typeof JSZip === 'undefined') {
        log("ERROR: JSZip library not loaded; cannot build the .sr file.");
        return;
    }
    const zip = new JSZip();
    zip.file("version", "2");
    zip.file("metadata", buildRecordingMetadata(recordSampleRate, recordCH2Enabled));

    for (let i = 0; i < recordedFrames.length; i++) {
        const n = i + 1;
        const frame = recordedFrames[i];
        const ch1 = frame.ch1 || [];
        const len = ch1.length;

        // Frame-marker logic channel: 1 byte per sample, 0x01 at the frame's first sample, 0x00 elsewhere.
        const logicBytes = new Uint8Array(len);
        if (len > 0) logicBytes[0] = 0x01;
        zip.file("logic-1-" + n, logicBytes);

        // CH1 analog samples (little-endian float32).
        zip.file("analog-1-2-" + n, floatArrayToLEBytes(ch1));

        // CH2 analog samples, aligned to CH1 length (pad with 0 / truncate) so all channels share one timeline.
        if (recordCH2Enabled) {
            const ch2src = frame.ch2 || [];
            const ch2 = new Array(len);
            for (let j = 0; j < len; j++) ch2[j] = (j < ch2src.length) ? ch2src[j] : 0;
            zip.file("analog-1-3-" + n, floatArrayToLEBytes(ch2));
        }
    }

    const filename = "DSO2512G_recording_" + recordingTimestamp() + ".sr";
    zip.generateAsync({ type: "blob", compression: "DEFLATE" }).then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        log("Saved " + recordedFrames.length + " frame(s) to " + filename);
    }).catch((err) => {
        log("ERROR building .sr file: " + err.message);
    });
}

function toggleXYMode() {
    if (param_XYModeEnabled == 0) {
        sendCommand('#KEY,49');
        if (appParam_mathEnabled != 'OFF') {
            toggleMath();
        }
        if (appParam_FFTEnabled != 'OFF') {
            toggleFFT();
        }
        if (appParam_cursorMode != 'OFF') {
            appParam_cursorMode = 'OFF';
        }
        if (appParam_REFEnabled != 0) {
            toggleREF();
        }
        appParam_XYmode = 'ON';
    } else {
        sendCommand('#KEY,49');
        appParam_XYmode = 'OFF';
    }
}

// Universal function for cycling the value of a variable from a set of values in a table (array).
function cycleValueFromTable(variable, table) {
    for (let i = 0; i < table.length; i++) {
        if (variable == table[i]) {
            let newValue = (i == (table.length - 1) ? table[0] : table[i + 1]);
            return newValue;
        }
    }
}

// Same as above but reversed
function cycleValueFromTableRev(variable, table) {
    for (let i = 0; i < table.length; i++) {
        if (variable == table[i]) {
            let newValue = (i == 0 ? table[table.length - 1] : table[i - 1]);
            return newValue;
        }
    }
}

function selectChannelCH1() {
    if (appParam_selectedChannel == 'CH1') {
        toggleMenu04();
    } else {
        appParam_selectedChannel = 'CH1';
        if (param_selectedChannel == 1) {
            sendCommand('#KEY,5');
        }
        if (appParam_menuPage != 0) {
            toggleMenu04();
        }
    }
}

function selectChannelCH2() {
    if (param_CH2enabled == 1) {
        if (appParam_selectedChannel == 'CH2') {
            toggleMenu05();
        } else {
            appParam_selectedChannel = 'CH2';
            if (param_selectedChannel == 0) {
                sendCommand('#KEY,5');
            }
            if (appParam_menuPage != 0) {
                toggleMenu05();
            }
        }
    } else {
        toggleMenu05();
    }
}

function selectChannelMATH1() {
    if (appParam_mathEnabled == 'ON') {
        if (appParam_selectedChannel == 'MATH1') {
            toggleMenu06();
        } else {
            appParam_selectedChannel = 'MATH1';
            if (appParam_menuPage != 0) {
                toggleMenu06();
            }
        }
    } else {
        toggleMenu06();
    }
}

function selectChannelFFT() {
    if (appParam_FFTEnabled == 'ON') {
        if (appParam_selectedChannel == 'FFT') {
            toggleMenu02();
        } else {
            appParam_selectedChannel = 'FFT';
            if (appParam_menuPage != 0) {
                toggleMenu02();
            }
        }
    } else {
        toggleMenu02();
    }
}

function toggle50PercentTrigger() {
    sendCommand('#KEY,47');
    appParam_force50percentTrigger = 1;
}

function toggle50Percent() {
    if (appParam_XYmode == 'ON') {
        sendCommand('#KEY,1');
        appParam_force50percent = 2;
    } else if (appParam_selectedChannel == 'CH1') {
        sendCommand('#KEY,1');
        appParam_force50percent = 1;
    } else if (appParam_selectedChannel == 'CH2') {
        sendCommand('#KEY,1');
        appParam_force50percent = 2;
    } else if (appParam_selectedChannel == 'MATH1') {
        appParam_mathOffset = 0;
    } else if (appParam_selectedChannel == 'FFT') {
        appParam_FFTOffset = 0;
    }
}

function toggle50PercentH() {
    if (appParam_selectedChannel == 'FFT') {
        appParam_FFTZoomPos = 0;
    } else {
        sendCommand('#KEY,1');
        appParam_force50percent = 1;
    }
}

function toggleGridMode() {
    appParam_gridMode = appParam_gridMode === 'Lines' ? 'Dots' : 'Lines';
}

function toggleDisplayMode() {
    appParam_displayMode = appParam_displayMode === 'Overlay' ? 'Stacked' : 'Overlay';
}

function toggleLineThickness() {
    appParam_lineThickness = appParam_lineThickness == '1px' ? '2px' : (appParam_lineThickness == '2px' ? '3px' : '1px');
}

function toggleFFT() {
    appParam_FFTEnabled = appParam_FFTEnabled === 'OFF' ? 'ON' : 'OFF';
    appParam_selectedChannel = appParam_FFTEnabled == 'ON' ? 'FFT' : 'CH1';
    if (appParam_selectedChannel == 'CH1' && param_selectedChannel == 1) {
        sendCommand('#KEY,5');
    }
}

function toggleFFTFindPeaks() {
    appParam_FFTFindPeaks = (appParam_FFTFindPeaks + 1) % 13; // 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 0
}

function toggleAcquisitionMode() {
    appParam_acquisitionMode = appParam_acquisitionMode == 'Sample' ? 'Average' : 'Sample';
    // Reset steps when changing mode
    avgStep01 = avgStep02 = avgStep03 = avgStep04 =
        avgStep05 = avgStep06 = avgStep07 = avgStep08 =
        avgStep09 = avgStep10 = avgStep11 = avgStep12 =
        avgStep13 = avgStep14 = avgStep15 = avgStep16 =
        avgStep17 = avgStep18 = avgStep19 = avgStep20 =
        avgStep21 = avgStep22 = avgStep23 = avgStep24 =
        avgStep25 = avgStep26 = avgStep27 = avgStep28 =
        avgStep29 = avgStep30 = avgStep31 = avgStep32 = null;
    avgStep01b = avgStep02b = avgStep03b = avgStep04b =
        avgStep05b = avgStep06b = avgStep07b = avgStep08b =
        avgStep09b = avgStep10b = avgStep11b = avgStep12b =
        avgStep13b = avgStep14b = avgStep15b = avgStep16b =
        avgStep17b = avgStep18b = avgStep19b = avgStep20b =
        avgStep21b = avgStep22b = avgStep23b = avgStep24b =
        avgStep25b = avgStep26b = avgStep27b = avgStep28b =
        avgStep29b = avgStep30b = avgStep31b = avgStep32b = null;
}

function toggleCH1Coupling() {
    appParam_CH1Coupling = appParam_CH1Coupling == 'DC' ? 'AC' : 'DC';
    sendCommand('#KEY,4A');
}

function toggleCH1Probe() {
    appParam_CH1Probe = appParam_CH1Probe == '1x' ? '10x' : (appParam_CH1Probe == '10x' ? '100x' : '1x');
    sendCommand('#KEY,42');
}

function toggleCH1BWLimit() {
    appParam_CH1BWLimit = appParam_CH1BWLimit == 'OFF' ? 'ON' : 'OFF';
}

function toggleCH1BWLimitUnits() { //[20, 'MHz', 20000000, '020 MHz'];
    appParam_CH1BWLimitValue[1] = appParam_CH1BWLimitValue[1] == 'Hz' ? 'KHz' : (appParam_CH1BWLimitValue[1] == 'KHz' ? 'MHz' : 'Hz');
    const multiplier = appParam_CH1BWLimitValue[1] == 'Hz' ? 1 : (appParam_CH1BWLimitValue[1] == 'KHz' ? 1000 : 1000000);
    appParam_CH1BWLimitValue[2] = appParam_CH1BWLimitValue[0] * multiplier;
    appParam_CH1BWLimitValue[3] = appParam_CH1BWLimitValue[0].toString().padStart(3, '0') + ' ' + appParam_CH1BWLimitValue[1];
}

function toggleFFTImpedanceUnits() { //[1, 'MΩ', 1000000, '001 MΩ'];
    appParam_FFTImpedance[1] = appParam_FFTImpedance[1] == 'Ω' ? 'KΩ' : (appParam_FFTImpedance[1] == 'KΩ' ? 'MΩ' : 'Ω');
    const multiplier = appParam_FFTImpedance[1] == 'Ω' ? 1 : (appParam_FFTImpedance[1] == 'KΩ' ? 1000 : 1000000);
    appParam_FFTImpedance[2] = appParam_FFTImpedance[0] * multiplier;
    appParam_FFTImpedance[3] = appParam_FFTImpedance[0].toString().padStart(3, '0') + ' ' + appParam_FFTImpedance[1];
}

function toggleCH2() {
    appParam_CH2Enabled = appParam_CH2Enabled == 'ON' ? 'OFF' : 'ON';
    sendCommand('#KEY,85');
    appParam_selectedChannel = appParam_CH2Enabled == 'ON' ? 'CH2' : 'CH1';
    appParam_forceSelectCH2 = 1;
}

function toggleCH2Coupling() {
    appParam_CH2Coupling = appParam_CH2Coupling == 'DC' ? 'AC' : 'DC';
    sendCommand('#KEY,4F');
}

function toggleCH2Probe() {
    appParam_CH2Probe = appParam_CH2Probe == '1x' ? '10x' : (appParam_CH2Probe == '10x' ? '100x' : '1x');
    sendCommand('#KEY,43');
}

function toggleCH2BWLimit() {
    appParam_CH2BWLimit = appParam_CH2BWLimit == 'OFF' ? 'ON' : 'OFF';
}

function toggleCH2BWLimitUnits() { //[20, 'MHz', 20000000, '020 MHz'];
    appParam_CH2BWLimitValue[1] = appParam_CH2BWLimitValue[1] == 'Hz' ? 'KHz' : (appParam_CH2BWLimitValue[1] == 'KHz' ? 'MHz' : 'Hz');
    const multiplier = appParam_CH2BWLimitValue[1] == 'Hz' ? 1 : (appParam_CH2BWLimitValue[1] == 'KHz' ? 1000 : 1000000);
    appParam_CH2BWLimitValue[2] = appParam_CH2BWLimitValue[0] * multiplier;
    appParam_CH2BWLimitValue[3] = appParam_CH2BWLimitValue[0].toString().padStart(3, '0') + ' ' + appParam_CH2BWLimitValue[1];
}

function toggleTriggerMode() {
    appParam_triggerMode = appParam_triggerMode == 'Auto' ? 'Normal' : 'Auto';
    sendCommand('#KEY,CE');
}

function toggleTriggerLvlMode() {
    appParam_triggerLvlAutoManual = appParam_triggerLvlAutoManual == 'AutoLvl' ? 'Manual' : 'AutoLvl';
    sendCommand('#KEY,47');
}

function toggleMath() {
    appParam_mathEnabled = appParam_mathEnabled == 'OFF' ? 'ON' : 'OFF';
    appParam_selectedChannel = appParam_mathEnabled == 'ON' ? 'MATH1' : 'CH1';
    if (appParam_selectedChannel == 'CH1' && param_selectedChannel == 1) {
        sendCommand('#KEY,5');
    }
}

function toggleREF() {
    if (appParam_REFEnabled == 0 && appParam_XYmode == 'OFF') {
        if (appParam_selectedChannel == 'CH1') {
            REFrawPoints = CH1rawPoints; // Take snapshot of waveform
            appParam_REFTPD = getTimeDiv(param_timeZoomLvl, 1); // Take snapshot of time-per-division value
            appParam_REFVPD = getVoltsDiv(param_CH1voltsZoom, param_CH1x1x10x100, 1); // Take snapshot of volts-per-division value
            appParam_REFEnabled = 1;
        } else if (appParam_selectedChannel == 'CH2') {
            REFrawPoints = CH2rawPoints;
            appParam_REFTPD = getTimeDiv(param_timeZoomLvl, 1);
            appParam_REFVPD = getVoltsDiv(param_CH2voltsZoom, param_CH2x1x10x100, 1);
            appParam_REFEnabled = 2;
        } else if (appParam_selectedChannel == 'MATH1') {
            REFrawPoints = MATH1rawPoints;
            appParam_REFTPD = getTimeDiv(param_timeZoomLvl, 1);
            appParam_REFVPD = table_VPD[2][appParam_mathVoltsZoom];
            appParam_REFEnabled = 3;
        }
        appParam_REFForceUpdate = 1;
    } else {
        REFrawPoints = [];
        appParam_REFTPD = 1;
        appParam_REFVPD = 1;
        appParam_REFEnabled = 0;
        appParam_REFForceUpdate = 1;
    }
}

function zoom_UP() {
    param_selectedChannel == 0 ? sendCommand('#KEY,B') : sendCommand('#KEY,4B'); //zoom up selected channel (vertical)
}

function zoom_DOWN() {
    param_selectedChannel == 0 ? sendCommand('#KEY,4') : sendCommand('#KEY,44'); //zoom down selected channel (vertical)
}

function setupButtonHold(buttonId, command) {
    const button = document.getElementById(buttonId);
    button.addEventListener('mousedown', () => {
        if (button.disabled) return;
        sendCommand(command);
        buttonIntervals[buttonId] = setInterval(() => {
            sendCommand(command);
        }, 50);
    });
    button.addEventListener('mouseup', () => {
        if (buttonIntervals[buttonId]) {
            clearInterval(buttonIntervals[buttonId]);
            delete buttonIntervals[buttonId];
        }
    });
    button.addEventListener('mouseleave', () => {
        if (buttonIntervals[buttonId]) {
            clearInterval(buttonIntervals[buttonId]);
            delete buttonIntervals[buttonId];
        }
    });
}

// Knob class to handle each knob instance
class Knob {
    constructor(id, snapInterval, onClockwise, onCounterClockwise) {
        this.knob = document.getElementById(id);
        this.angleDisplay = this.knob.parentElement.querySelector('.angle-display');
        this.onClockwise = onClockwise;
        this.onCounterClockwise = onCounterClockwise;

        this.isDragging = false;
        this.previousSnapAngle = 0;
        this.currentAngle = 0;
        this.snapInterval = snapInterval; // Use the provided snap interval

        // Fallback if angleDisplay is not found
        if (!this.angleDisplay) {
            console.error(`Angle display not found for knob with id: ${id}`);
        }

        this.init();
    }

    normalizeAngle(angle) {
        return ((angle % 360) + 360) % 360;
    }

    snapAngle(angle) {
        return Math.round(angle / this.snapInterval) * this.snapInterval;
    }

    updateKnob(angle) {
        this.currentAngle = this.normalizeAngle(angle);
        const snappedAngle = this.snapAngle(this.currentAngle);

        this.knob.style.transform = `translate(-50%, -50%) rotate(${snappedAngle}deg)`;
        if (this.angleDisplay) {
            this.angleDisplay.textContent = snappedAngle;
        }

        if (snappedAngle !== this.previousSnapAngle) {
            let angleDiff = snappedAngle - this.previousSnapAngle;
            if (angleDiff > 180) {
                angleDiff -= 360;
            } else if (angleDiff < -180) {
                angleDiff += 360;
            }

            if (angleDiff > 0) {
                this.onClockwise(snappedAngle);
            } else if (angleDiff < -0) {
                this.onCounterClockwise(snappedAngle);
            }

            this.previousSnapAngle = snappedAngle;
        }
    }

    init() {
        this.knob.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const rect = this.knob.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const deltaX = mouseX - centerX;
            const deltaY = mouseY - centerY;
            let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            angle = angle + 90;

            this.updateKnob(angle);
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }
}

function multiButtonLeft() {
    if (appParam_cursorMode != 'OFF') { // Cursors enabled
        if (appParam_cursorMode == 'Track') {
            appParam_cursorSelected = cycleValueFromTableRev(appParam_cursorSelected, table_cursorSelectedTrack);
        } else {
            appParam_cursorSelected = cycleValueFromTableRev(appParam_cursorSelected, table_cursorSelected);
        }
        if (appParam_menuPage == 7) {
            labels_MenuOptionValues[4] = appParam_cursorSelected;
            appParam_menuForceDraw = 1;
        }
    }
}

function multiButtonRight() {
    if (appParam_cursorMode != 'OFF') { // Cursors enabled
        if (appParam_cursorMode == 'Track') {
            appParam_cursorSelected = cycleValueFromTable(appParam_cursorSelected, table_cursorSelectedTrack);
        } else {
            appParam_cursorSelected = cycleValueFromTable(appParam_cursorSelected, table_cursorSelected);
        }
        if (appParam_menuPage == 7) {
            labels_MenuOptionValues[4] = appParam_cursorSelected;
            appParam_menuForceDraw = 1;
        }
    }

}

// Actions for knobs

function knobMultiClockwise(snapAngle) {
    if (appParam_cursorMode != 'OFF') { // Cursors enabled, take priority
        const moveAmountY = 198 / (8 * 50);
        const moveAmountX = 1 / (12 * 50);
        switch (appParam_cursorSelected) {
            case 'X1':
                if (appParam_cursorX1Pos < 0.998) {
                    appParam_cursorX1Pos += moveAmountX;
                }
                break;
            case 'X2':
                if (appParam_cursorX2Pos < 0.998) {
                    appParam_cursorX2Pos += moveAmountX;
                }
                break;
            case 'X1+X2':
                if (appParam_cursorX1Pos < 0.998 && appParam_cursorX2Pos < 0.998) {
                    appParam_cursorX1Pos += moveAmountX;
                    appParam_cursorX2Pos += moveAmountX;
                }
                break;
            case 'Y1':
                if (appParam_cursorY1Pos < 227) {
                    appParam_cursorY1Pos += moveAmountY;
                }
                break;
            case 'Y2':
                if (appParam_cursorY2Pos < 227) {
                    appParam_cursorY2Pos += moveAmountY;
                }
                break;
            case 'Y1+Y2':
                if (appParam_cursorY1Pos < 227 && appParam_cursorY2Pos < 227) {
                    appParam_cursorY1Pos += moveAmountY;
                    appParam_cursorY2Pos += moveAmountY;
                }
                break;
            default:
                break;
        }
        if (appParam_cursorX1Pos > 0.998) { // limit the position so they don't go out of the grid
            appParam_cursorX1Pos = 0.998;
        }
        if (appParam_cursorX2Pos > 0.998) {
            appParam_cursorX2Pos = 0.998;
        }
        if (appParam_cursorY1Pos > 227) {
            appParam_cursorY1Pos = 227;
        }
        if (appParam_cursorY2Pos > 227) {
            appParam_cursorY2Pos = 227;
        }
    } else if (appParam_menuPage == 4) { // ch1 menu
        if (appParam_CH1BWLimitValue[0] < 999) {
            appParam_CH1BWLimitValue[0]++;
        } else if (appParam_CH1BWLimitValue[0] >= 999) {
            appParam_CH1BWLimitValue[0] = 0;
        }
        const multiplier = appParam_CH1BWLimitValue[1] == 'Hz' ? 1 : (appParam_CH1BWLimitValue[1] == 'KHz' ? 1000 : 1000000);
        appParam_CH1BWLimitValue[2] = appParam_CH1BWLimitValue[0] * multiplier;
        appParam_CH1BWLimitValue[3] = appParam_CH1BWLimitValue[0].toString().padStart(3, '0') + ' ' + appParam_CH1BWLimitValue[1];
        labels_MenuOptionValues[4] = appParam_CH1BWLimitValue[3];
        appParam_menuForceDraw = 1;
    } else if (appParam_menuPage == 5) { // ch2 menu
        if (appParam_CH2BWLimitValue[0] < 999) {
            appParam_CH2BWLimitValue[0]++;
        } else if (appParam_CH2BWLimitValue[0] >= 999) {
            appParam_CH2BWLimitValue[0] = 0;
        }
        const multiplier = appParam_CH2BWLimitValue[1] == 'Hz' ? 1 : (appParam_CH2BWLimitValue[1] == 'KHz' ? 1000 : 1000000);
        appParam_CH2BWLimitValue[2] = appParam_CH2BWLimitValue[0] * multiplier;
        appParam_CH2BWLimitValue[3] = appParam_CH2BWLimitValue[0].toString().padStart(3, '0') + ' ' + appParam_CH2BWLimitValue[1];
        labels_MenuOptionValues[5] = appParam_CH2BWLimitValue[3];
        appParam_menuForceDraw = 1;
    } else if (appParam_menuPage == 2) { // FFT menu
        if (appParam_FFTImpedance[0] < 999) {
            appParam_FFTImpedance[0]++;
        } else if (appParam_FFTImpedance[0] >= 999) {
            appParam_FFTImpedance[0] = 0;
        }
        const multiplier = appParam_FFTImpedance[1] == 'Ω' ? 1 : (appParam_FFTImpedance[1] == 'KΩ' ? 1000 : 1000000);
        appParam_FFTImpedance[2] = appParam_FFTImpedance[0] * multiplier;
        appParam_FFTImpedance[3] = appParam_FFTImpedance[0].toString().padStart(3, '0') + ' ' + appParam_FFTImpedance[1];
        labels_MenuOptionValues[3] = appParam_FFTImpedance[3];
        appParam_menuForceDraw = 1;
    }
}

function knobMultiCounterClockwise(snapAngle) {
    if (appParam_cursorMode != 'OFF') { // Cursors enabled, take priority
        const moveAmountY = 198 / (8 * 50);
        const moveAmountX = 1 / (12 * 50);
        switch (appParam_cursorSelected) {
            case 'X1':
                if (appParam_cursorX1Pos > 0.002) {
                    appParam_cursorX1Pos -= moveAmountX;
                }
                break;
            case 'X2':
                if (appParam_cursorX2Pos > 0.002) {
                    appParam_cursorX2Pos -= moveAmountX;
                }
                break;
            case 'X1+X2':
                if (appParam_cursorX1Pos > 0.002 && appParam_cursorX2Pos > 0.002) {
                    appParam_cursorX1Pos -= moveAmountX;
                    appParam_cursorX2Pos -= moveAmountX;
                }
                break;
            case 'Y1':
                if (appParam_cursorY1Pos > 29) {
                    appParam_cursorY1Pos -= moveAmountY;
                }
                break;
            case 'Y2':
                if (appParam_cursorY2Pos > 29) {
                    appParam_cursorY2Pos -= moveAmountY;
                }
                break;
            case 'Y1+Y2':
                if (appParam_cursorY1Pos > 29 && appParam_cursorY2Pos > 29) {
                    appParam_cursorY1Pos -= moveAmountY;
                    appParam_cursorY2Pos -= moveAmountY;
                }
                break;
            default:
                break;
        }
        if (appParam_cursorX1Pos < 0.002) { // limit the position so they don't go out of the grid
            appParam_cursorX1Pos = 0.002;
        }
        if (appParam_cursorX2Pos < 0.002) {
            appParam_cursorX2Pos = 0.002;
        }
        if (appParam_cursorY1Pos < 29) {
            appParam_cursorY1Pos = 29;
        }
        if (appParam_cursorY2Pos < 29) {
            appParam_cursorY2Pos = 29;
        }
    } else if (appParam_menuPage == 4) { // CH1 menu
        if (appParam_CH1BWLimitValue[0] > 0) {
            appParam_CH1BWLimitValue[0]--;
        } else if (appParam_CH1BWLimitValue[0] <= 0) {
            appParam_CH1BWLimitValue[0] = 999;
        }
        const multiplier = appParam_CH1BWLimitValue[1] == 'Hz' ? 1 : (appParam_CH1BWLimitValue[1] == 'KHz' ? 1000 : 1000000);
        appParam_CH1BWLimitValue[2] = appParam_CH1BWLimitValue[0] * multiplier;
        appParam_CH1BWLimitValue[3] = appParam_CH1BWLimitValue[0].toString().padStart(3, '0') + ' ' + appParam_CH1BWLimitValue[1];
        labels_MenuOptionValues[4] = appParam_CH1BWLimitValue[3];
        appParam_menuForceDraw = 1;
    } else if (appParam_menuPage == 5) { // CH2 menu
        if (appParam_CH2BWLimitValue[0] > 0) {
            appParam_CH2BWLimitValue[0]--;
        } else if (appParam_CH2BWLimitValue[0] <= 0) {
            appParam_CH2BWLimitValue[0] = 999;
        }
        const multiplier = appParam_CH2BWLimitValue[1] == 'Hz' ? 1 : (appParam_CH2BWLimitValue[1] == 'KHz' ? 1000 : 1000000);
        appParam_CH2BWLimitValue[2] = appParam_CH2BWLimitValue[0] * multiplier;
        appParam_CH2BWLimitValue[3] = appParam_CH2BWLimitValue[0].toString().padStart(3, '0') + ' ' + appParam_CH2BWLimitValue[1];
        labels_MenuOptionValues[5] = appParam_CH2BWLimitValue[3];
        appParam_menuForceDraw = 1;
    } else if (appParam_menuPage == 2) { // FFT menu
        if (appParam_FFTImpedance[0] > 0) {
            appParam_FFTImpedance[0]--;
        } else if (appParam_FFTImpedance[0] <= 0) {
            appParam_FFTImpedance[0] = 999;
        }
        const multiplier = appParam_FFTImpedance[1] == 'Ω' ? 1 : (appParam_FFTImpedance[1] == 'KΩ' ? 1000 : 1000000);
        appParam_FFTImpedance[2] = appParam_FFTImpedance[0] * multiplier;
        appParam_FFTImpedance[3] = appParam_FFTImpedance[0].toString().padStart(3, '0') + ' ' + appParam_FFTImpedance[1];
        labels_MenuOptionValues[3] = appParam_FFTImpedance[3];
        appParam_menuForceDraw = 1;
    }
}

function knobTriggerLevelClockwise(snapAngle) {
    sendCommand('#KEY,48');
}

function knobTriggerLevelCounterClockwise(snapAngle) {
    sendCommand('#KEY,46');
}

function knobVoltsDivClockwise(snapAngle) {
    if (appParam_selectedChannel == 'CH1') {
        if (param_CH1voltsZoom > 4) {
            sendCommand('#KEY,B');
        } else {
            showMessage("LIMIT", "CH1");
        }
    } else if (appParam_selectedChannel == 'CH2') {
        if (param_CH2voltsZoom > 4) {
            sendCommand('#KEY,B');
        } else {
            showMessage("LIMIT", "CH2");
        }
    } else if (appParam_selectedChannel == 'MATH1') {
        if (appParam_mathVoltsZoom > 0) {
            appParam_mathVoltsZoom--;
        } else {
            showMessage("LIMIT", "MATH1");
        }
    } else if (appParam_selectedChannel == 'FFT') {
        if (appParam_FFTUnits == 'V') {
            if (appParam_FFT_VPD > 0) {
                appParam_FFT_VPD--;
            } else {
                showMessage("LIMIT", "FFT");
            }
        } else if (appParam_FFTUnits == 'W') {
            if (appParam_FFT_WPD > 0) {
                appParam_FFT_WPD--;
            } else {
                showMessage("LIMIT", "FFT");
            }
        } else if (appParam_FFTUnits == 'dB' || appParam_FFTUnits == 'dBV' || appParam_FFTUnits == 'dBm' || appParam_FFTUnits == 'dBW' || appParam_FFTUnits == 'dBFS') {
            if (appParam_FFT_dBPD > 0) {
                appParam_FFT_dBPD--;
            } else {
                showMessage("LIMIT", "FFT");
            }
        }
    }
}

function knobVoltsDivCounterClockwise(snapAngle) {
    if (appParam_selectedChannel == 'CH1') {
        if (param_CH1voltsZoom < 13) {
            sendCommand('#KEY,4');
        } else {
            showMessage("LIMIT", "CH1");
        }
    } else if (appParam_selectedChannel == 'CH2') {
        if (param_CH2voltsZoom < 13) {
            sendCommand('#KEY,4');
        } else {
            showMessage("LIMIT", "CH2");
        }
    } else if (appParam_selectedChannel == 'MATH1') {
        if (appParam_mathVoltsZoom < 19) {
            appParam_mathVoltsZoom++;
        } else {
            showMessage("LIMIT", "MATH1");
        }
    } else if (appParam_selectedChannel == 'FFT') {
        if (appParam_FFTUnits == 'V') {
            if (appParam_FFT_VPD < 19) {
                appParam_FFT_VPD++;
            } else {
                showMessage("LIMIT", "FFT");
            }
        } else if (appParam_FFTUnits == 'W') {
            if (appParam_FFT_WPD < 18) {
                appParam_FFT_WPD++;
            } else {
                showMessage("LIMIT", "FFT");
            }
        } else if (appParam_FFTUnits == 'dB' || appParam_FFTUnits == 'dBV' || appParam_FFTUnits == 'dBm' || appParam_FFTUnits == 'dBW' || appParam_FFTUnits == 'dBFS') {
            if (appParam_FFT_dBPD < 5) {
                appParam_FFT_dBPD++;
            } else {
                showMessage("LIMIT", "FFT");
            }
        }
    }
}

function knobVerticalPosClockwise(snapAngle) {
    if (appParam_selectedChannel == 'CH1') {
        if (param_CH1trueVerticalPos < 200) {
            sendCommand('#KEY,10');
        } else {
            showMessage("LIMIT", "CH1");
        }
    } else if (appParam_selectedChannel == 'CH2') {
        if (param_CH2trueVerticalPos < 200) {
            sendCommand('#KEY,10');
        } else {
            showMessage("LIMIT", "CH2");
        }
    } else if (appParam_selectedChannel == 'MATH1') {
        if (appParam_mathOffset < 1) {
            let value = 0.005;
            appParam_mathOffset = Math.round((appParam_mathOffset + value) * 1e12) / 1e12; // fix for floating point precision issue
        } else {
            showMessage("LIMIT", "MATH1");
        }
    } else if (appParam_selectedChannel == 'FFT' && appParam_FFTScale != 'Phase') {
        if (appParam_FFTOffset < 1) {
            let value = 0.005;
            appParam_FFTOffset = Math.round((appParam_FFTOffset + value) * 1e12) / 1e12; // fix for floating point precision issue
        } else {
            showMessage("LIMIT", "FFT");
        }
    }
}

function knobVerticalPosCounterClockwise(snapAngle) {
    if (appParam_selectedChannel == 'CH1') {
        if (param_CH1trueVerticalPos > -200) {
            sendCommand('#KEY,11');
        } else {
            showMessage("LIMIT", "CH1");
        }
    } else if (appParam_selectedChannel == 'CH2') {
        if (param_CH2trueVerticalPos > -200) {
            sendCommand('#KEY,11');
        } else {
            showMessage("LIMIT", "CH2");
        }
    } else if (appParam_selectedChannel == 'MATH1') {
        if (appParam_mathOffset > -1) {
            let value = 0.005;
            appParam_mathOffset = Math.round((appParam_mathOffset - value) * 1e12) / 1e12; // fix for floating point precision issue
        } else {
            showMessage("LIMIT", "MATH1");
        }
    } else if (appParam_selectedChannel == 'FFT' && appParam_FFTScale != 'Phase') {
        if (appParam_FFTOffset > -1) {
            let value = 0.005;
            appParam_FFTOffset = Math.round((appParam_FFTOffset - value) * 1e12) / 1e12; // fix for floating point precision issue
        } else {
            showMessage("LIMIT", "FFT");
        }
    }
}

function knobTimeDivClockwise(snapAngle) {
    if (appParam_selectedChannel == 'FFT') {
        if (appParam_FFTZoom != table_FFTZoom[table_FFTZoom.length - 1]) {
            appParam_FFTZoomPos = Math.floor(appParam_FFTZoomPos / getIntFromString(appParam_FFTZoom));
            appParam_FFTZoom = cycleValueFromTable(appParam_FFTZoom, table_FFTZoom);
            appParam_FFTZoomPos = Math.floor(appParam_FFTZoomPos * getIntFromString(appParam_FFTZoom));
        } else {
            showMessage("LIMIT", "FFT");
        }
    } else if (param_CH2enabled == 0) {
        if (param_timeZoomLvl > 2) {
            sendCommand('#KEY,C');
        } else {
            showMessage("LIMIT", "ALL");
        }
    } else if (param_CH2enabled == 1) {
        if (param_timeZoomLvl > 3) {
            sendCommand('#KEY,C');
        } else {
            showMessage("LIMIT", "ALL");
        }
    }
}

function knobTimeDivCounterClockwise(snapAngle) {
    if (appParam_selectedChannel == 'FFT') {
        if (appParam_FFTZoom != table_FFTZoom[0]) {
            appParam_FFTZoomPos = Math.floor(appParam_FFTZoomPos / getIntFromString(appParam_FFTZoom));
            appParam_FFTZoom = cycleValueFromTableRev(appParam_FFTZoom, table_FFTZoom);
            appParam_FFTZoomPos = Math.floor(appParam_FFTZoomPos * getIntFromString(appParam_FFTZoom));
            if (appParam_FFTZoomPos > (1024 * getIntFromString(appParam_FFTZoom)) - 1024) {
                appParam_FFTZoomPos = (1024 * getIntFromString(appParam_FFTZoom)) - 1024;
            }
        } else {
            showMessage("LIMIT", "FFT");
        }
    } else {
        if (param_timeZoomLvl < 30) {
            sendCommand('#KEY,D');
        } else {
            showMessage("LIMIT", "ALL");
        }
    }
}

function knobHorizontalPosClockwise(snapAngle) {
    if (appParam_selectedChannel == 'FFT') { // FFT horizontal movement
        if (appParam_FFTZoomPos < (1024 * getIntFromString(appParam_FFTZoom)) - 1024) {
            appParam_FFTZoomPos = appParam_FFTZoomPos + Math.round(1.7 * getIntFromString(appParam_FFTZoom));
            if (appParam_FFTZoomPos > (1024 * getIntFromString(appParam_FFTZoom)) - 1024) {
                appParam_FFTZoomPos = (1024 * getIntFromString(appParam_FFTZoom)) - 1024;
                showMessage("LIMIT", "FFT");
            }
        } else {
            showMessage("LIMIT", "FFT");
        }
    } else { // normal horizontal movement for all channels simultaneously
        if (param_stopRun == 0) {
            if (appParam_horizontalCurrentPos < appParam_horizontalLimitRightSnapshot) {
                sendCommand('#KEY,8');
            } else if (param_timeZoomLvl < 25) { // higher than 24 is roll mode
                showMessage("LIMIT", "ALL");
            }
        } else {
            if (appParam_horizontalCurrentPos < appParam_horizontalLimitRight) {
                sendCommand('#KEY,8');
            } else if (param_timeZoomLvl < 25) { // higher than 24 is roll mode
                showMessage("LIMIT", "ALL");
            }
        }
    }
}

function knobHorizontalPosCounterClockwise(snapAngle) {
    if (appParam_selectedChannel == 'FFT') {
        if (appParam_FFTZoomPos > 0) {
            appParam_FFTZoomPos = appParam_FFTZoomPos - Math.round(1.7 * getIntFromString(appParam_FFTZoom));
            if (appParam_FFTZoomPos < 0) {
                appParam_FFTZoomPos = 0;
                showMessage("LIMIT", "FFT");
            }
        } else {
            showMessage("LIMIT", "FFT");
        }
    } else { // normal horizontal movement for all channels simultaneously
        if (param_stopRun == 0) {
            if (appParam_horizontalCurrentPos > appParam_horizontalLimitLeftSnapshot) {
                sendCommand('#KEY,6');
            } else if (param_timeZoomLvl < 25) { // higher than 24 is roll mode
                showMessage("LIMIT", "ALL");
            }
        } else {
            if (appParam_horizontalCurrentPos > appParam_horizontalLimitLeft) {
                sendCommand('#KEY,6');
            } else if (param_timeZoomLvl < 25) { // higher than 24 is roll mode
                showMessage("LIMIT", "ALL");
            }
        }
    }
}

function toggleTestSection() {
    let x = document.getElementById("test-container");
    if (x.style.display == "none") {
        x.style.display = "block";
    } else {
        x.style.display = "none";
    }
}

function init() {
    document.getElementById('commandInput').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !this.disabled) {
            event.preventDefault();
            sendCommand(this.value);
            this.value = '';
        }
    });

    document.getElementById('commandFile').addEventListener('change', function() {
        if (this.files.length > 0) loadCommandsFromFile(this.files[0]);
    });

    document.getElementById('signalSourceMode').addEventListener('change', function() {
        appParam_GeneralSignalSourceMode = this.value;
        let y = document.getElementById("signalSource");
        if (appParam_GeneralSignalSourceMode == 'Auto') {
            y.disabled = true;
            y.style.color = "#b5b5b5";
        } else {
            y.disabled = false;
            y.style.color = "black";
        }
    });

    document.getElementById('demo-mode').addEventListener('change', function() {
        appParam_demoMode_Enabled = this.value;
    });

    const canvas = document.getElementById('plotCanvas');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    if (!navigator.serial) {
        log("Web Serial API is not supported in this browser. Use Chrome or Edge.");
        console.log("Web Serial API is not supported in this browser. Use Chrome or Edge.");
        drawText(document.getElementById('gridCanvas').getContext('2d'), "Web Serial API is not supported in this browser. Use Chrome, Opera or Edge.", 640, 360, 28, 'yellow', 0, 1, 0, 0);
        document.getElementById('toggleConnectBtn').disabled = true;
    }

    document.querySelectorAll('.control-button').forEach(button => {
        button.disabled = true;
    });

    const knobMulti = new Knob('knobMulti', 30, knobMultiClockwise, knobMultiCounterClockwise);
    const knobTriggerLevel = new Knob('knobTriggerLevel', 30, knobTriggerLevelClockwise, knobTriggerLevelCounterClockwise);
    const knobVoltsDiv = new Knob('knobVoltsDiv', 45, knobVoltsDivClockwise, knobVoltsDivCounterClockwise);
    const knobVerticalPos = new Knob('knobVerticalPos', 30, knobVerticalPosClockwise, knobVerticalPosCounterClockwise);
    const knobTimeDiv = new Knob('knobTimeDiv', 45, knobTimeDivClockwise, knobTimeDivCounterClockwise);
    const knobHorizontalPos = new Knob('knobHorizontalPos', 30, knobHorizontalPosClockwise, knobHorizontalPosCounterClockwise);
}

window.onload = init;
