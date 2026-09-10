

    // MOD: acquisition status. The constant-width field is filled in the state colour and the label
    // is centred in it, rather than letting drawText's inverted badge shrink-wrap each label.
    ctx.save();
    ctx.fillStyle = trigTextColor;
    ctx.fillRect(Math.round(statusLeft), Math.round(14 - (statusFieldHeight / 2)), Math.round(statusFieldWidth), Math.round(statusFieldHeight));
    ctx.restore();
    drawText(ctx, trigText, (statusLeft + (statusFieldWidth / 2)), 14, statusFontSize, 'black', 0, 1);
