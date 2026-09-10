
            appParam_isTriggered = triggerStop; // MOD: latch the real trigger state for the top-bar status. False here covers Auto free-run, a Normal-mode timeout, and STOP (waitUntilReady returns false immediately when appParam_stopRun == 0).
