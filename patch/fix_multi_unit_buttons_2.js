
    } else {
        multiButtonUnitStep(-1); // MOD: otherwise step the unit of the wheel-adjustable value down
    }
}

// MOD: the two buttons below the multipurpose wheel step the UNIT of whatever numeric that wheel is
// adjusting on the open menu, so the pair (wheel = magnitude, buttons = unit) covers the whole value.
// The unit was previously reachable only through its own menu slot, and only in one direction.
// Cursors keep priority, matching knobMultiClockwise.
function multiButtonUnitStep(dir) {
    if (appParam_menuPage == 4) { // CH1 menu - LP filter frequency
        toggleCH1BWLimitUnits(dir);
        labels_MenuOptionValues[4] = appParam_CH1_LPFValue[3];
        appParam_menuForceDraw = 1;
    } else if (appParam_menuPage == 5) { // CH2 menu - LP filter frequency
        toggleCH2BWLimitUnits(dir);
        labels_MenuOptionValues[5] = appParam_CH2_LPFValue[3];
        appParam_menuForceDraw = 1;
    } else if (appParam_menuPage == 2) { // FFT menu - impedance
        toggleFFTImpedanceUnits(dir);
        labels_MenuOptionValues[3] = appParam_FFTImpedance[3];
        appParam_menuForceDraw = 1;
