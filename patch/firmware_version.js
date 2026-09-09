

        // Firmware tolerance: the loop above is exact string equality against a fixed list, so a
        // NEWER modded firmware (V9B5, V9B6, ...) is rejected even though the message the app then
        // shows says "or newer" — and the app calls stopPlotting(), so it refuses to run at all.
        // versionData is also used untrimmed, so a trailing CR alone would fail the comparison.
        // Runs before the "not compatible" branch below, so accepting here suppresses it.
        log("Received: Firmware [" + versionData + "]");
        const FW_MIN_MOD = 3;
        const fwText = String(versionData).trim();
        // The base version is checked here rather than relying on parseResponseBuffer() only
        // resolving on a 'V1.3.0C' prefix: this branch should stand on its own, so a different
        // base firmware is rejected even if it carries a high-looking MOD revision.
        const fwIsBaseVersion = /^V1\.3\.0C\b/i.test(fwText);
        const fwMatch = fwText.match(/MOD\s*V9B\s*(\d+)/i);
        if (fwIsBaseVersion && fwMatch && parseInt(fwMatch[1], 10) >= FW_MIN_MOD) {
            appParam_isFirmwareVersionValid = 1;
            log("Firmware accepted (MOD V9B" + fwMatch[1] + " >= V9B" + FW_MIN_MOD + ")");
        } else if (fwIsBaseVersion && !fwMatch) {
            // Right base firmware, unrecognised revision format - accept rather than lock out.
            appParam_isFirmwareVersionValid = 1;
            log("Firmware revision format not recognised - accepted on the V1.3.0C prefix.");
        }
