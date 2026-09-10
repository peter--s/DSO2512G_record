    // MOD: clamp the PAIR, preserving the hysteresis band. Clamping each end independently let the
    // band collapse near the rails - at triggerY <= 8 (rising) or >= 250 (falling) it vanished
    // completely, silently turning the trigger into a single-level comparator that multi-triggers on
    // noise. Shifting both ends together keeps the band intact; the trigger level moves instead,
    // which at the rail was unreachable anyway. Y1 >= Y2 always, so at most one shift applies.
    if (triggerY2 < 8) {
        const shift = 8 - triggerY2;
        triggerY1 += shift;
        triggerY2 += shift;
    }
    if (triggerY1 > 250) {
        const shift = triggerY1 - 250;
        triggerY1 -= shift;
        triggerY2 -= shift;
    }
    // Only a band wider than the whole 8..250 range can still be out of bounds.
    triggerY1 = Math.max(Math.min(triggerY1, 250), 8);
    triggerY2 = Math.max(Math.min(triggerY2, 250), 8);
