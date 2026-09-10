    // MOD: the status field is sized and placed first, hard against the right-hand end of the
    // graticule - mirroring where the status text used to sit at the left - and the trigger items are
    // then anchored to its left instead of to a fixed 880 * menuMult.
    // The field is one constant width for every state (widest label wins), so it does not jitter as
    // the state changes and the trigger items beside it never move. Padding matches the inverted
    // badges drawText produces, so it looks like the "T"/"CH1" badges next to it.
    const statusFontSize = 15;
    const statusLabels = ['STOP', 'WAIT', 'ROLL', "TRIG'D", 'AUTO', 'READY'];
    ctx.font = `${statusFontSize}px 'oscilloscope_custom', monospace`;
    let statusTextWidth = 0;
    for (let i = 0; i < statusLabels.length; i++) {
        statusTextWidth = Math.max(statusTextWidth, ctx.measureText(statusLabels[i]).width);
    }
    const statusFieldWidth = statusTextWidth + (statusFontSize * 0.3) + (statusFontSize * 0.2); // padding_left + padding_right
    const statusFieldHeight = statusFontSize + (statusFontSize * 0.2) + (statusFontSize * 0.2); // padding_top + padding_bottom
    // The graticule's own right edge. gridRightMargin is already 25 or 250 depending on whether a menu
    // is open, so it tracks the shrinking grid on its own - multiplying by menuMult as well would
    // double-count the shrink and drag the whole cluster left into the zoom map.
    const statusRight = canvas.width - gridRightMargin;
    const statusLeft = statusRight - statusFieldWidth;

    let trigTextPos = statusLeft - 200; // trigger items sit immediately to the left of the status field
