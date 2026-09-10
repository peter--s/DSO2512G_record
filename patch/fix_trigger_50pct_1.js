    // MOD: bench-scope behaviour. Stock code set appParam_triggerLevel = 0, which puts the
    // level on the CHANNEL'S ZERO REFERENCE (the middle grid line only while that channel's
    // offset is 0), so on a signal riding on a DC offset it lands off the waveform and will
    // not trigger - the exact case this button exists to rescue. Scopes that label this "50%"
    // (Tektronix "Set to 50%", Rigol/Siglent level-knob push) use 50% of the SIGNAL: the
    // midpoint between the measured peaks of the trigger source.
    const src = (appParam_triggerSource == 0) ? CH1rawPoints : CH2rawPoints;
    const chOff = (appParam_triggerSource == 0) ? appParam_CH1Offset : appParam_CH2Offset;
    let mn = Infinity,
        mx = -Infinity;
    if (src) {
        for (let i = 0; i < src.length; i++) {
            const v = src[i];
            if (!isFinite(v)) continue; // skip roll-mode gaps / unpopulated samples
            if (v < mn) mn = v;
            if (v > mx) mx = v;
        }
    }
    if (isFinite(mn) && isFinite(mx)) {
        // CH1rawPoints/CH2rawPoints already have the channel offset applied (applyOffset),
        // so their midpoint is directly comparable to appParam_triggerVerticalPos, which is
        // chOffset + appParam_triggerLevel. Subtract the offset to get the level itself.
        let lvl = ((mn + mx) / 2) - chOff;
        appParam_triggerLevel = Math.max(-1, Math.min(1, lvl)); // same range the level knob enforces
    } else {
        appParam_triggerLevel = 0; // no usable samples (not plotting yet) - stock behaviour
    }
