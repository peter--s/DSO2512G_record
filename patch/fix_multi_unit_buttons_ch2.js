                appParam_CH2_LPFValue[3] = appParam_CH2_LPFValue[0].toString().padStart(3, '0') + ' ' + appParam_CH2_LPFValue[1];
            };
            // MOD: let the two buttons below the multipurpose wheel step the Filter unit, in both
            // directions, while this menu page is open. The page's own option button already steps
            // it forward through toggleCH2BWLimitUnits(), which also recomputes [2] (the value in
            // Hz) and [3] (the label); reusing that function rather than repeating its arithmetic
            // keeps the two paths from drifting apart. The unit cycle is Hz -> KHz -> MHz -> Hz, so
            // stepping forward twice is one step back - if a fourth unit is ever added, the reverse
            // direction needs rewriting. multiButtonLeft/Right() call updateMenu() for us, but only
            // because functionIsEmpty() sees a non-empty body here.
            multiButtLeft = function() {
                toggleCH2BWLimitUnits();
                toggleCH2BWLimitUnits();
            };
            multiButtRight = toggleCH2BWLimitUnits;
