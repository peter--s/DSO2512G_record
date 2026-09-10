function toggleFFTImpedanceUnits(dir = 1) { //[1, 'MΩ', 1000000, '001 MΩ'];  MOD: dir -1 steps back
    appParam_FFTImpedance[1] = dir > 0 ?
        (appParam_FFTImpedance[1] == 'Ω' ? 'KΩ' : (appParam_FFTImpedance[1] == 'KΩ' ? 'MΩ' : 'Ω')) :
        (appParam_FFTImpedance[1] == 'Ω' ? 'MΩ' : (appParam_FFTImpedance[1] == 'KΩ' ? 'Ω' : 'KΩ'));
