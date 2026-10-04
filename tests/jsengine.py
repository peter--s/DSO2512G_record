#!/usr/bin/env python3
"""Locate a JavaScript engine and run snippets through it.

The recording feature is plain browser JS with no build step and no package.json,
so there is nothing to `npm test`. But a syntax error in a payload does not fail
loudly - it blanks the entire app - which makes an actual parse check worth having.

Any of these will do, whichever the machine happens to have:
  * jsc, shipped with macOS inside JavaScriptCore.framework
  * node
  * d8

Tests skip cleanly when none is present.
"""
import json
import os
import shutil
import subprocess
import tempfile

JSC = ("/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# jsc exposes print(); node exposes console.log. Normalise to __emit().
SHIM = "var __emit = (typeof print === 'function') ? print : console.log;\n"

NO_ENGINE = "no JavaScript engine found (looked for jsc, node, d8)"


def find_engine():
    if os.path.exists(JSC) and os.access(JSC, os.X_OK):
        return JSC
    for name in ("node", "d8"):
        path = shutil.which(name)
        if path:
            return path
    return None


def run_js(source):
    """Run `source` and return its stdout. Raises RuntimeError on a JS error."""
    engine = find_engine()
    if engine is None:
        raise RuntimeError(NO_ENGINE)
    fd, path = tempfile.mkstemp(suffix=".js", prefix="dso-test-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(SHIM + source)
        proc = subprocess.run([engine, path], capture_output=True, text=True, timeout=120)
        if proc.returncode != 0:
            raise RuntimeError("%s failed:\n%s\n%s"
                               % (os.path.basename(engine), proc.stdout, proc.stderr))
        return proc.stdout
    finally:
        os.unlink(path)


def run_js_json(source):
    """Run `source`, which must __emit() exactly one JSON document, and parse it."""
    out = run_js(source).strip()
    last = [ln for ln in out.splitlines() if ln.strip()][-1]
    return json.loads(last)


def payload(name):
    """The JS text of one patch payload."""
    with open(os.path.join(REPO, "patch", "%s.js" % name), encoding="utf-8") as f:
        return f.read()


# The app globals the recorder reads, declared standalone so the pure helpers can run in a
# bare JS engine. This is a SECOND, hand-written copy of the app's symbol names, which can
# drift from the real app silently - beta60 renamed eleven of them at once. The guard is
# TestAppStubSymbols in test_js_functions.py, which asserts every name here is still
# declared by app_clean.html.
APP_STUBS = (
    "function log() {}\n"
    "function showMessage() {}\n"
    "function findTriggerVolts() { return 0; }\n"
    "var CH1rawPoints = [], CH2rawPoints = [];\n"
    # beta60 renamed most of these into a current_/snapshot_ pair. This list is a second,
    # hand-written copy of the app's symbol names, so it can drift from the real app silently
    # - test_app_symbols_exist() in test_js_functions.py asserts every name here is still
    # declared by app_clean.html, which is what makes the copy safe to keep.
    "var appParam_current_sampleRate = 1, appParam_current_TPD = 1, appParam_timeOffset = 0.5;\n"
    "var appParam_current_intendedSamples = 4801, appParam_acquisitionMode = 'Sample';\n"
    "var appParam_acquisitionAverageSteps = 2, appParam_acquisitionSmoothingSteps = 1;\n"
    "var appParam_acquisitionSmoothingWindow = 'Rectangle';\n"
    "var appParam_current_CH1_VPD = 1, appParam_current_CH2_VPD = 1;\n"
    "var appParam_CH1Offset = 0, appParam_CH2Offset = 0, appParam_CH2Enabled = 'OFF';\n"
    "var appParam_CH1Probe = '1x', appParam_CH2Probe = '1x';\n"
    "var appParam_CH1Coupling = 'DC', appParam_CH2Coupling = 'DC';\n"
    "var appParam_CH1_LPF = 'OFF', appParam_CH2_LPF = 'OFF';\n"
    "var appParam_CH1_LPFType = 'Butterworth', appParam_CH2_LPFType = 'Butterworth';\n"
    "var appParam_CH1_LPFOrder = 2, appParam_CH2_LPFOrder = 2;\n"
    "var appParam_CH1_LPFValue = [20, 'MHz', 20000000, '020 MHz'];\n"
    "var appParam_CH2_LPFValue = [20, 'MHz', 20000000, '020 MHz'];\n"
    "var appParam_CH1invertY = 'OFF', appParam_CH2invertY = 'OFF';\n"
    "var appParam_triggerSource = 0, appParam_triggerEdge = 0, appParam_triggerMode = 'Auto';\n"
    "var appParam_triggerStabilize = 'ON';\n"
    "var appParam_Interpolation = 'OFF', appParam_current_interpScale = 1;\n"
    # Self-calibration: the tables convertToWaveArray() biases each raw code with, which
    # recCalibCell() reports. Shaped as the app declares them (14 ranges x 31 zoom levels).
    "var appParam_current_timeZoomLvl = 10;\n"
    "var appParam_CH1VoltsZoom = 0, appParam_CH2VoltsZoom = 0;\n"
    "var appCalib_1ChannelInterleave = [...Array(14)].map(() => Array(31).fill(0));\n"
    "var appCalib_1ChannelOffset = [...Array(14)].map(() => Array(31).fill(0));\n"
    "var appCalib_2ChannelOffsetCH1 = [...Array(14)].map(() => Array(31).fill(0));\n"
    "var appCalib_2ChannelOffsetCH2 = [...Array(14)].map(() => Array(31).fill(0));\n"
    "var calib_FPGA = Array(14).fill(0);\n"
    "var isPlotting = false;\n"
    "const verticalScale = 1, verticalOffsetCH1 = 0.005, verticalOffsetCH2 = 0.008;\n"
    "var appParam_message = '', appParam_lastMessage = '', appParam_messageChannel = '';\n"
    "var appParam_messageCountdown = 0;\n"
    # localStorage is absent in a bare JS engine; the recorder guards every access, and
    # this stub lets the guarded paths run rather than throw.
    "var localStorage = { _v: {}, getItem: function (k) { return this._v[k] || null; },"
    " setItem: function (k, v) { this._v[k] = String(v); } };\n"
)


def recording_source(emit_trigger_channel=False):
    """The recording feature's globals + functions, standalone and runnable.

    Only the pure helpers are exercised; anything touching the DOM, the serial port
    or JSZip is never called, so plain declarations are enough.
    """
    src = payload("globals") + "\n" + payload("functions")
    if emit_trigger_channel:
        # The flag is a const, so flip it in the source to exercise the other layout.
        before = "const recordEmitTriggerChannel = false;"
        assert src.count(before) == 1, "recordEmitTriggerChannel declaration not found"
        src = src.replace(before, "const recordEmitTriggerChannel = true;")
    return APP_STUBS + src


# Enough of JSZip and the DOM for exportRecordingSegment() to run to completion and record
# what it wrote. Only the entry names and sizes matter here; real zipping is JSZip's problem.
ZIP_STUB = """
var __written = [];
function JSZip() {}
JSZip.prototype.file = function (name, data) {
    var size = 0;
    if (data == null) size = 0;
    else if (typeof data === 'string') size = data.length;
    else if (data.byteLength !== undefined) size = data.byteLength;
    else if (data.length !== undefined) size = data.length;
    __written.push({name: name, size: size, text: (typeof data === 'string') ? data : null});
};
JSZip.prototype.generateAsync = function () { return Promise.resolve({}); };
var document = {
    createElement: function () { return {click: function () {}}; },
    body: {appendChild: function () {}, removeChild: function () {}}
};
var URL = {createObjectURL: function () { return 'blob:stub'; }, revokeObjectURL: function () {}};
"""


def recording_source_with_zip(emit_trigger_channel=False):
    """recording_source() plus a JSZip/DOM stub, so the real export loop can be run."""
    return ZIP_STUB + recording_source(emit_trigger_channel)
