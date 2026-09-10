
let appParam_triggerHysteresis = 5; // MOD: FPGA trigger hysteresis, in FPGA code units (200 codes = 8 divisions, so 1 code = 0.04 div). Was hard-coded to 10 (0.4 div) inside FPGA_setTrigger. Adjustable on the Trigger menu with the multipurpose wheel.
const appParam_triggerHysteresisMax = 20; // MOD: 0.8 div; 0 disables hysteresis entirely (single-level comparator)
let appParam_isTriggered = false; // MOD: true while acquisitions are actually triggering (drives the top-bar TRIG'D status). Latched per acquisition, so it does not flicker between polls.
