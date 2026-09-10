
    // MOD: this now reports the acquisition STATE the way a bench scope does (Rigol AUTO/READY/T'D/
    // STOP/ROLL, Tek Auto/Ready/Trig'd/Stop), instead of the trigger MODE. Stock showed a green
    // 'AUTO'/'NORMAL' whether or not anything was actually triggering, so a free-running sweep and a
    // locked one looked identical. The drawText call moved to the trigger group on the right; only
    // the text/colour are decided here. Mode (Auto/Normal) remains on the trigger menu.
