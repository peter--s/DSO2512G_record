

        // ---- MOD: accept the documented minimum "or newer" -------------------------
        // The stock test above is exact string equality against a single version, so a
        // NEWER modded firmware (V9B6+) is rejected even though the on-screen message
        // says "or newer". versionData is response.slice(4) with no trim, so a trailing
        // CR or space alone is enough to fail the equality test.
        const FW_MIN_MOD = 5;
        const fwText = String(versionData).trim();
        // MOD: check the base version here rather than relying on parseResponseBuffer()
        // only resolving on a 'V1.3.0C' prefix - a different base firmware must be
        // rejected even if it carries a high-looking MOD revision.
        const fwIsBaseVersion = /^V1\.3\.0C\b/i.test(fwText);
        const fwMatch = fwText.match(/MOD\s*V9B\s*(\d+)/i);
        if (fwIsBaseVersion && fwMatch && parseInt(fwMatch[1], 10) >= FW_MIN_MOD) {
            appParam_isFirmwareVersionValid = 1;
            log("Firmware accepted (MOD V9B" + fwMatch[1] + " >= V9B" + FW_MIN_MOD + ")");
        } else if (fwIsBaseVersion && !fwMatch) {
            // Unrecognised revision format, but it is a valid modded-firmware reply.
            appParam_isFirmwareVersionValid = 1;
            log("Firmware revision format not recognised - accepted on the V1.3.0C prefix.");
        }
        // ---- end MOD ---------------------------------------------------------------
