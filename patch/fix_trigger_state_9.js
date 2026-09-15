        trigText = 'WAIT'; // single shot armed, waiting for its trigger
    } else if (appParam_isRollMode) {
        trigTextColor = '#00E020';
        trigText = 'ROLL'; // roll mode forces every sweep and never waits for a trigger, so neither
        // TRIG'D nor READY could ever be true here - without this case Normal mode
        // would sit on a permanent 'READY' that is never going to be satisfied.
        // beta46 added this state itself and an appParam_isRollMode flag to go with it; the
        // flag is used rather than a threshold because that threshold moved from 24 to 23.
    } else if (appParam_isTriggered) {
        trigTextColor = '#00E020';
        trigText = "TRIG'D"; // last acquisition was started by a real (or forced) trigger event
    } else if (appParam_triggerMode == 'Auto') {
        trigTextColor = 'yellow';
        trigText = 'AUTO'; // running, but free-running: the trigger timed out and the sweep was forced
    } else {
        trigTextColor = 'yellow';
        trigText = 'READY'; // Normal mode, armed, no trigger yet - the display is not updating
