
}

// MOD: menu text for the trigger hysteresis - shows both the raw FPGA code count (what the register
// takes) and what it costs in divisions, since that is what limits how close to the signal's extreme
// the trigger level can be set. 200 codes = 8 divisions.
function triggerHysteresisLabel() {
    return appParam_triggerHysteresis + ' = ' + (appParam_triggerHysteresis * 0.04).toFixed(2) + 'div';
