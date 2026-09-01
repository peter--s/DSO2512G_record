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
    stubs = (
        "function log() {}\n"
        "function showMessage() {}\n"
        "function findTriggerVolts() { return 0; }\n"
        "var CH1rawPoints = [], appParam_sampleRate = 1, appParam_currTPD = 1;\n"
        "var appParam_timeOffset = 0.5, appParam_GeneralSignalSource = 'DataBuffer';\n"
        "var appParam_demoMode_Enabled = 'OFF', appParam_acquisitionMode = 'Normal';\n"
        "var appParam_currVPD_CH1 = 1, appParam_currVPD_CH2 = 1;\n"
        "var param_CH1trueVerticalPos = 0, param_CH2trueVerticalPos = 0, param_CH2enabled = 0;\n"
        "var appParam_CH1Probe = '1x', appParam_CH2Probe = '1x';\n"
        "var appParam_CH1Coupling = 'DC', appParam_CH2Coupling = 'DC';\n"
        "var appParam_CH1BWLimit = 'OFF', appParam_CH2BWLimit = 'OFF';\n"
        "var param_triggerCH1CH2 = 0, param_triggerEdge = 0, appParam_triggerMode = 'Auto';\n"
        "var isPlotting = false;\n"
        "const verticalScale = 1, verticalOffsetCH1 = 0.005, verticalOffsetCH2 = 0.008;\n"
    )
    return stubs + src


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
