                appParam_FFTImpedance[3] = appParam_FFTImpedance[0].toString().padStart(3, '0') + ' ' + appParam_FFTImpedance[1];
            };
            // MOD: let the two buttons below the multipurpose wheel step the Impedance unit, in
            // both directions, while this menu page is open. The page's own option button already
            // steps it forward through toggleFFTImpedanceUnits(), which also recomputes [2] (the
            // value in ohms) and [3] (the label); reusing that function rather than repeating its
            // arithmetic keeps the two paths from drifting apart. The unit cycle is three states
            // wide, so stepping forward twice is one step back - if a fourth unit is ever added,
            // the reverse direction needs rewriting.
            multiButtLeft = function() {
                toggleFFTImpedanceUnits();
                toggleFFTImpedanceUnits();
            };
            multiButtRight = toggleFFTImpedanceUnits;
