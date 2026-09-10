

    // MOD: round before the register pack below. triggerY is a float (it carries /200, *200, vOffset
    // and a calibration term) and `<< 8` coerces via ToInt32, which TRUNCATES - so the level was
    // systematically up to one code (0.04 div) low. Rounding removes that bias.
    triggerY1 = Math.round(triggerY1);
    triggerY2 = Math.round(triggerY2);
