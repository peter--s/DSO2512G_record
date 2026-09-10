
    } else if (appParam_menuPage == 9) { // MOD: Trigger menu - hysteresis
        if (appParam_triggerHysteresis > 0) {
            appParam_triggerHysteresis--;
        }
        labels_MenuOptionValues[4] = triggerHysteresisLabel();
        appParam_menuForceDraw = 1;
