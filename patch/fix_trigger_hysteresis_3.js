
    } else if (appParam_menuPage == 9) { // MOD: Trigger menu - hysteresis
        if (appParam_triggerHysteresis < appParam_triggerHysteresisMax) {
            appParam_triggerHysteresis++;
        }
        labels_MenuOptionValues[4] = triggerHysteresisLabel();
        appParam_menuForceDraw = 1;
