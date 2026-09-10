function toggleCH2BWLimitUnits(dir = 1) { //[20, 'MHz', 20000000, '020 MHz'];  MOD: dir -1 steps back
    appParam_CH2_LPFValue[1] = dir > 0 ?
        (appParam_CH2_LPFValue[1] == 'Hz' ? 'KHz' : (appParam_CH2_LPFValue[1] == 'KHz' ? 'MHz' : 'Hz')) :
        (appParam_CH2_LPFValue[1] == 'Hz' ? 'MHz' : (appParam_CH2_LPFValue[1] == 'KHz' ? 'Hz' : 'KHz'));
