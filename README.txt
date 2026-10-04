=== PROVENANCE ===
Generated from DSO2512G-APP-beta60.html with:
    python3 js_analyzer.py app.html --clean -e -n -g -u > README.txt
Two preparation steps were needed for beta60 and do not affect the inventory below:
  * the two <script type="text/js-worker"> FFT blocks were removed first - they are separate
    worker namespaces, and leaving them in makes the analyzer report only them (18 functions);
  * the single optional-chaining site (`getElementById("customOperation")?.value`) was rewritten
    without `?.`, because js_analyzer.py uses esprima 4.0.1, which predates ES2020 and otherwise
    fails the whole script with "Unexpected token .".
Line numbers are therefore those of the app with the two worker blocks removed.

=== CLEAN COMPLETE ===
-> Cleaned & repaired HTML written to: app_report_clean.html


=== JS REPORT | Classes: 1 | Methods: 5 | Functions: 270 | Variables: 400 | Leaks: 13 | Mutations: 1201 ===

#001 [Line 0813] VARIABLE: 'code_fftWorker' (const | Scope: Global)

#002 [Lines 0814-0816] VARIABLE: 'blob_fftWorker' (const | Scope: Global)

#003 [Line 0817] VARIABLE: 'url_fftWorker' (const | Scope: Global)

#004 [Line 0818] VARIABLE: 'worker_fftWorker' (const | Scope: Global)

#005 [Line 0820] VARIABLE: 'code_fftMeasWorker' (const | Scope: Global)

#006 [Lines 0821-0823] VARIABLE: 'blob_fftMeasWorker' (const | Scope: Global)

#007 [Line 0824] VARIABLE: 'url_fftMeasWorker' (const | Scope: Global)

#008 [Line 0825] VARIABLE: 'worker_fftMeasWorker' (const | Scope: Global)

#009 [Line 0827] VARIABLE: 'worker_bodePlotFFTWorker_Gain1' (const | Scope: Global)

#010 [Line 0828] VARIABLE: 'worker_bodePlotFFTWorker_Gain2' (const | Scope: Global)

#011 [Line 0829] VARIABLE: 'worker_bodePlotFFTWorker_Phase1' (const | Scope: Global)

#012 [Line 0830] VARIABLE: 'worker_bodePlotFFTWorker_Phase2' (const | Scope: Global)

#013 [Line 0843] ⚡ MUTATION: 'FFTrawPoints' altered inside scope 'Anonymous/Callback'

#014 [Line 0845] ⚡ MUTATION: 'appParam_FFTAnalysis' altered inside scope 'Anonymous/Callback'

#015 [Line 0848] ⚡ MUTATION: 'FFTrawPoints' altered inside scope 'Anonymous/Callback'

#016 [Lines 0869-0879] ⚡ MUTATION: 'appParam_FFTMeasurements' altered inside scope 'Anonymous/Callback'

#017 [Line 0891] ⚡ MUTATION: 'bodePlotFFT_Gain1' altered inside scope 'Anonymous/Callback'

#018 [Line 0892] ⚡ MUTATION: 'bodePlotTotalBandwidth' altered inside scope 'Anonymous/Callback'

#019 [Line 0905] ⚡ MUTATION: 'bodePlotFFT_Gain2' altered inside scope 'Anonymous/Callback'

#020 [Line 0918] ⚡ MUTATION: 'bodePlotFFT_Phase1' altered inside scope 'Anonymous/Callback'

#021 [Line 0931] ⚡ MUTATION: 'bodePlotFFT_Phase2' altered inside scope 'Anonymous/Callback'

#022 [Line 0963] ⚡ MUTATION: 'worker_bodePlotFFTWorker_Gain1' altered inside scope 'Anonymous/Callback'

#023 [Line 0966] ⚡ MUTATION: 'worker_bodePlotFFTWorker_Gain2' altered inside scope 'Anonymous/Callback'

#024 [Line 0969] ⚡ MUTATION: 'worker_bodePlotFFTWorker_Phase1' altered inside scope 'Anonymous/Callback'

#025 [Line 0972] ⚡ MUTATION: 'worker_bodePlotFFTWorker_Phase2' altered inside scope 'Anonymous/Callback'

#026 [Line 0975] ⚡ MUTATION: 'worker_fftWorker' altered inside scope 'Anonymous/Callback'

#027 [Line 0977] ⚡ MUTATION: 'url_fftWorker' altered inside scope 'Anonymous/Callback'

#028 [Line 0980] ⚡ MUTATION: 'worker_fftMeasWorker' altered inside scope 'Anonymous/Callback'

#029 [Line 0982] ⚡ MUTATION: 'url_fftMeasWorker' altered inside scope 'Anonymous/Callback'

#030 [Line 0987] VARIABLE: 'ITERATION_INTERVAL' (let | Scope: Global)

#031 [Line 0990] VARIABLE: 'verticalScale' (const | Scope: Global)

#032 [Line 0991] VARIABLE: 'verticalOffsetCH1' (const | Scope: Global)

#033 [Line 0992] VARIABLE: 'verticalOffsetCH2' (const | Scope: Global)

#034 [Line 0995] VARIABLE: 'appCalib_1ChannelInterleave' (let | Scope: Global)

#035 [Line 0996] VARIABLE: 'appCalib_1ChannelOffset' (let | Scope: Global)

#036 [Line 0997] VARIABLE: 'appCalib_2ChannelOffsetCH1' (let | Scope: Global)

#037 [Line 0998] VARIABLE: 'appCalib_2ChannelOffsetCH2' (let | Scope: Global)

#038 [Line 1001] VARIABLE: 'darkerGrey' (const | Scope: Global)

#039 [Line 1002] VARIABLE: 'darkGrey' (const | Scope: Global)

#040 [Line 1003] VARIABLE: 'mediumGrey' (const | Scope: Global)

#041 [Line 1004] VARIABLE: 'lightGrey' (const | Scope: Global)

#042 [Line 1006] VARIABLE: 'color_CH1' (const | Scope: Global)

#043 [Line 1007] VARIABLE: 'color_CH2' (const | Scope: Global)

#044 [Line 1008] VARIABLE: 'color_MATH1' (const | Scope: Global)

#045 [Line 1009] VARIABLE: 'color_FFT' (const | Scope: Global)

#046 [Line 1010] VARIABLE: 'color_REF' (const | Scope: Global)

#047 [Line 1012] VARIABLE: 'menuTitleColor' (let | Scope: Global)

#048 [Line 1013] VARIABLE: 'menuOptionColor' (let | Scope: Global)

#049 [Line 1014] VARIABLE: 'menuValueColor' (let | Scope: Global)

#050 [Line 1015] VARIABLE: 'menuBorderColor' (let | Scope: Global)

#051 [Line 1016] VARIABLE: 'menuBackgroundColor' (let | Scope: Global)

#052 [Line 1017] VARIABLE: 'screenBackgroundColor' (let | Scope: Global)

#053 [Line 1018] VARIABLE: 'disabledColor' (let | Scope: Global)

#054 [Lines 1020-1048] VARIABLE: 'screenColorSets' (const | Scope: Global)

#055 [Line 1051] VARIABLE: 'port' (let | Scope: Global)

#056 [Line 1052] VARIABLE: 'reader' (let | Scope: Global)

#057 [Line 1053] VARIABLE: 'writer' (let | Scope: Global)

#058 [Line 1054] VARIABLE: 'commandQueue' (let | Scope: Global)

#059 [Line 1055] VARIABLE: 'responseQueue' (let | Scope: Global)

#060 [Line 1056] VARIABLE: 'isReading' (let | Scope: Global)

#061 [Line 1057] VARIABLE: 'isSending' (let | Scope: Global)

#062 [Line 1058] VARIABLE: 'reconnecting' (let | Scope: Global)

#063 [Line 1059] VARIABLE: 'reconnectTimeout' (let | Scope: Global)

#064 [Line 1061] VARIABLE: 'isPlotting' (let | Scope: Global)

#065 [Line 1062] VARIABLE: 'plotInterval' (let | Scope: Global)

#066 [Line 1063] VARIABLE: 'logEntries' (let | Scope: Global)

#067 [Line 1064] VARIABLE: 'forceShutdown' (let | Scope: Global)

#068 [Line 1066] VARIABLE: 'iterateInterval' (let | Scope: Global)

#069 [Line 1069] VARIABLE: 'currentCH1Data' (let | Scope: Global)

#070 [Line 1070] VARIABLE: 'currentCH2Data' (let | Scope: Global)

#071 [Line 1071] VARIABLE: 'rawCH1DataArray' (let | Scope: Global)

#072 [Line 1072] VARIABLE: 'rawCH2DataArray' (let | Scope: Global)

#073 [Line 1073] VARIABLE: 'currentCH1DataArray' (let | Scope: Global)

#074 [Line 1074] VARIABLE: 'currentCH2DataArray' (let | Scope: Global)

#075 [Line 1075] VARIABLE: 'currentMATH1DataArray' (let | Scope: Global)

#076 [Lines 1076-1087] VARIABLE: 'currentREFBankDataArray' (let | Scope: Global)

#077 [Line 1088] VARIABLE: 'CH1rawPoints' (let | Scope: Global)

#078 [Line 1089] VARIABLE: 'CH2rawPoints' (let | Scope: Global)

#079 [Line 1090] VARIABLE: 'FFTrawPoints' (let | Scope: Global)

#080 [Line 1091] VARIABLE: 'MATH1rawPoints' (let | Scope: Global)

#081 [Lines 1092-1103] VARIABLE: 'REFrawPoints' (let | Scope: Global)

#082 [Line 1106] VARIABLE: 'bodePlot_step' (let | Scope: Global)

#083 [Line 1107] VARIABLE: 'bodePlotGainBuffer' (let | Scope: Global)

#084 [Line 1108] VARIABLE: 'bodePlotPhaseBuffer' (let | Scope: Global)

#085 [Line 1109] VARIABLE: 'bodePlotGainDrawBuffer' (let | Scope: Global)

#086 [Line 1110] VARIABLE: 'bodePlotIntendedSamples' (let | Scope: Global)

#087 [Line 1111] VARIABLE: 'bodePlotSweepCounter' (let | Scope: Global)

#088 [Line 1112] VARIABLE: 'bodePlot_wait_counter' (let | Scope: Global)

#089 [Line 1113] VARIABLE: 'bodePlot_averagingCounter' (let | Scope: Global)

#090 [Lines 1114-1118] VARIABLE: 'bodePlotAutoScale' (let | Scope: Global)

#091 [Line 1119] VARIABLE: 'bodePlotFreqs' (let | Scope: Global)

#092 [Line 1120] VARIABLE: 'action_bodePlotSetAveraging' (let | Scope: Global)

#093 [Line 1121] VARIABLE: 'bodePlotFFT_Gain1' (let | Scope: Global)

#094 [Line 1122] VARIABLE: 'bodePlotFFT_Gain2' (let | Scope: Global)

#095 [Line 1123] VARIABLE: 'bodePlotFFT_Phase1' (let | Scope: Global)

#096 [Line 1124] VARIABLE: 'bodePlotFFT_Phase2' (let | Scope: Global)

#097 [Line 1125] VARIABLE: 'bodePlotTotalBandwidth' (let | Scope: Global)

#098 [Line 1126] VARIABLE: 'bodePlotFFTReady' (let | Scope: Global)

#099 [Line 1129] VARIABLE: 'avgStepsCH1' (let | Scope: Global)

#100 [Line 1130] VARIABLE: 'avgStepsCH2' (let | Scope: Global)

#101 [Line 1133] VARIABLE: 'envelopeMaxCH1DataArray' (let | Scope: Global)

#102 [Line 1134] VARIABLE: 'envelopeMinCH1DataArray' (let | Scope: Global)

#103 [Line 1135] VARIABLE: 'envelopeMaxCH2DataArray' (let | Scope: Global)

#104 [Line 1136] VARIABLE: 'envelopeMinCH2DataArray' (let | Scope: Global)

#105 [Line 1137] VARIABLE: 'envelopeMaxCH1rawPoints' (let | Scope: Global)

#106 [Line 1138] VARIABLE: 'envelopeMinCH1rawPoints' (let | Scope: Global)

#107 [Line 1139] VARIABLE: 'envelopeMaxCH2rawPoints' (let | Scope: Global)

#108 [Line 1140] VARIABLE: 'envelopeMinCH2rawPoints' (let | Scope: Global)

#109 [Line 1143] VARIABLE: 'gridLeftMargin' (let | Scope: Global)

#110 [Line 1144] VARIABLE: 'gridRightMargin' (let | Scope: Global)

#111 [Line 1145] VARIABLE: 'gridTopMargin' (let | Scope: Global)

#112 [Line 1146] VARIABLE: 'gridBottomMargin' (let | Scope: Global)

#113 [Line 1147] VARIABLE: 'gridInterMargin' (let | Scope: Global)

#114 [Line 1148] VARIABLE: 'gridBoundsArray' (let | Scope: Global)

#115 [Line 1151] VARIABLE: 'previousPlotBuffer1' (let | Scope: Global)

#116 [Line 1152] VARIABLE: 'timeLastChange' (let | Scope: Global)

#117 [Line 1153] VARIABLE: 'bufferChangeTime' (let | Scope: Global)

#118 [Line 1154] VARIABLE: 'appParam_panCounter' (let | Scope: Global)

#119 [Line 1155] VARIABLE: 'appParam_isPanAllowed' (let | Scope: Global)

#120 [Line 1158] VARIABLE: 'table_timeZoomSamples' (const | Scope: Global)

#121 [Lines 1161-1165] VARIABLE: 'table_TPD' (const | Scope: Global)

#122 [Lines 1168-1172] VARIABLE: 'table_VPD' (const | Scope: Global)

#123 [Lines 1175-1179] VARIABLE: 'table_WPD' (const | Scope: Global)

#124 [Lines 1182-1186] VARIABLE: 'table_dBPD' (const | Scope: Global)

#125 [Lines 1189-1193] VARIABLE: 'table_mathScale' (const | Scope: Global)

#126 [Lines 1196-1199] VARIABLE: 'table_triggerHysteresis' (const | Scope: Global)

#127 [Line 1202] VARIABLE: 'appParam_message' (let | Scope: Global)

#128 [Line 1203] VARIABLE: 'appParam_messageChannel' (let | Scope: Global)

#129 [Line 1204] VARIABLE: 'appParam_lastMessage' (let | Scope: Global)

#130 [Line 1205] VARIABLE: 'appParam_messageCountdown' (let | Scope: Global)

#131 [Line 1206] VARIABLE: 'appParam_messagePriority' (let | Scope: Global)

#132 [Line 1209] VARIABLE: 'appParam_CH1VoltsZoom' (let | Scope: Global)

#133 [Line 1210] VARIABLE: 'appParam_CH2VoltsZoom' (let | Scope: Global)

#134 [Line 1211] VARIABLE: 'appParam_triggerAutoLvlOffset' (let | Scope: Global)

#135 [Line 1212] VARIABLE: 'appParam_sigGenEnabled' (let | Scope: Global)

#136 [Line 1213] VARIABLE: 'appParam_horizontalWindowWidth' (let | Scope: Global)

#137 [Line 1214] VARIABLE: 'appParam_timeArrowPosition' (let | Scope: Global)

#138 [Line 1215] VARIABLE: 'appParam_timeOffset' (let | Scope: Global)

#139 [Line 1218] VARIABLE: 'appParam_current_horizontalPos' (let | Scope: Global)

#140 [Line 1219] VARIABLE: 'appParam_current_TPD' (let | Scope: Global)

#141 [Line 1220] VARIABLE: 'appParam_current_CH1_VPD' (let | Scope: Global)

#142 [Line 1221] VARIABLE: 'appParam_current_CH2_VPD' (let | Scope: Global)

#143 [Line 1222] VARIABLE: 'appParam_current_sampleRate' (let | Scope: Global)

#144 [Line 1223] VARIABLE: 'appParam_current_timeZoomLvl' (let | Scope: Global)

#145 [Line 1224] VARIABLE: 'appParam_current_numChans' (let | Scope: Global)

#146 [Line 1225] VARIABLE: 'appParam_current_zoomScale' (let | Scope: Global)

#147 [Line 1226] VARIABLE: 'appParam_current_intendedSamples' (let | Scope: Global)

#148 [Line 1227] VARIABLE: 'appParam_current_intendedSamplesInterpolated' (let | Scope: Global)

#149 [Line 1228] VARIABLE: 'appParam_current_horizontalLimitLeft' (let | Scope: Global)

#150 [Line 1229] VARIABLE: 'appParam_current_horizontalLimitRight' (let | Scope: Global)

#151 [Line 1230] VARIABLE: 'appParam_current_interpScale' (let | Scope: Global)

#152 [Line 1233] VARIABLE: 'appParam_snapshot_horizontalPos' (let | Scope: Global)

#153 [Line 1234] VARIABLE: 'appParam_snapshot_TPD' (let | Scope: Global)

#154 [Line 1235] VARIABLE: 'appParam_snapshot_CH1_VPD' (let | Scope: Global)

#155 [Line 1236] VARIABLE: 'appParam_snapshot_CH2_VPD' (let | Scope: Global)

#156 [Line 1237] VARIABLE: 'appParam_snapshot_sampleRate' (let | Scope: Global)

#157 [Line 1238] VARIABLE: 'appParam_snapshot_timeZoomLvl' (let | Scope: Global)

#158 [Line 1239] VARIABLE: 'appParam_snapshot_numChans' (let | Scope: Global)

#159 [Line 1240] VARIABLE: 'appParam_snapshot_zoomScale' (let | Scope: Global)

#160 [Line 1241] VARIABLE: 'appParam_snapshot_intendedSamples' (let | Scope: Global)

#161 [Line 1242] VARIABLE: 'appParam_snapshot_intendedSamplesInterpolated' (let | Scope: Global)

#162 [Line 1243] VARIABLE: 'appParam_snapshot_horizontalLimitLeft' (let | Scope: Global)

#163 [Line 1244] VARIABLE: 'appParam_snapshot_horizontalLimitRight' (let | Scope: Global)

#164 [Line 1245] VARIABLE: 'appParam_snapshot_interpScale' (let | Scope: Global)

#165 [Line 1248] VARIABLE: 'appParam_isFocused' (let | Scope: Global)

#166 [Line 1249] VARIABLE: 'appParam_stopRun' (let | Scope: Global)

#167 [Line 1250] VARIABLE: 'appParam_CommandDelay' (let | Scope: Global)

#168 [Line 1251] VARIABLE: 'appParam_gridsToDraw' (let | Scope: Global)

#169 [Line 1252] VARIABLE: 'appParam_menuForceDraw' (let | Scope: Global)

#170 [Line 1253] VARIABLE: 'appParam_menuForceDelete' (let | Scope: Global)

#171 [Line 1254] VARIABLE: 'appParam_triggerVerticalPos' (let | Scope: Global)

#172 [Line 1255] VARIABLE: 'appParam_CH1VerticalPos' (let | Scope: Global)

#173 [Line 1256] VARIABLE: 'appParam_CH2VerticalPos' (let | Scope: Global)

#174 [Line 1257] VARIABLE: 'appParam_mathVerticalPos' (let | Scope: Global)

#175 [Line 1258] VARIABLE: 'appParam_REFVerticalPos' (let | Scope: Global)

#176 [Line 1259] VARIABLE: 'appParam_selectedChannel' (let | Scope: Global)

#177 [Line 1260] VARIABLE: 'appParam_isFirmwareVersionValid' (let | Scope: Global)

#178 [Line 1261] VARIABLE: 'appParam_oscilloscopeMode' (let | Scope: Global)

#179 [Line 1262] VARIABLE: 'appParam_dataIsNew' (let | Scope: Global)

#180 [Line 1263] VARIABLE: 'appParam_dataIsSync' (let | Scope: Global)

#181 [Line 1264] VARIABLE: 'appParam_isRollMode' (let | Scope: Global)

#182 [Line 1265] VARIABLE: 'appParam_superXYMode' (let | Scope: Global)

#183 [Line 1268] VARIABLE: 'appParam_previous_stopRun' (let | Scope: Global)

#184 [Line 1269] VARIABLE: 'appParam_previous_VoltsZoom' (let | Scope: Global)

#185 [Line 1270] VARIABLE: 'appParam_previous_gridMode' (let | Scope: Global)

#186 [Line 1271] VARIABLE: 'appParam_previous_gridRightMargin' (let | Scope: Global)

#187 [Line 1272] VARIABLE: 'appParam_previous_gridsToDraw' (let | Scope: Global)

#188 [Line 1273] VARIABLE: 'appParam_previous_timeZoomLvl' (let | Scope: Global)

#189 [Line 1274] VARIABLE: 'appParam_previous_intendedSamples' (let | Scope: Global)

#190 [Line 1277] VARIABLE: 'appParam_menuPage' (let | Scope: Global)

#191 [Line 1278] VARIABLE: 'appParam_lastMenu' (let | Scope: Global)

#192 [Line 1279] VARIABLE: 'appParam_XYcompatibleMenus' (let | Scope: Global)

#193 [Line 1280] VARIABLE: 'appParam_bodePlotCompatibleMenus' (let | Scope: Global)

#194 [Line 1281] VARIABLE: 'appParam_overrideCursors' (let | Scope: Global)

#195 [Line 1282] VARIABLE: 'labels_menuTitle' (let | Scope: Global)

#196 [Line 1283] VARIABLE: 'labels_menuOptions' (let | Scope: Global)

#197 [Line 1284] VARIABLE: 'labels_menuOptionValues' (let | Scope: Global)

#198 [Line 1288] VARIABLE: 'appParam_gridMode' (let | Scope: Global)

#199 [Line 1289] VARIABLE: 'appParam_displayMode' (let | Scope: Global)

#200 [Line 1290] VARIABLE: 'appParam_dotsLines' (let | Scope: Global)

#201 [Line 1291] VARIABLE: 'appParam_lineThickness' (let | Scope: Global)

#202 [Line 1292] VARIABLE: 'table_dotsLines' (let | Scope: Global)

#203 [Line 1295] VARIABLE: 'appParam_FFTEnabled' (let | Scope: Global)

#204 [Line 1296] VARIABLE: 'appParam_FFTSource' (let | Scope: Global)

#205 [Line 1297] VARIABLE: 'appParam_FFTWindow' (let | Scope: Global)

#206 [Line 1298] VARIABLE: 'appParam_FFTZoom' (let | Scope: Global)

#207 [Line 1299] VARIABLE: 'appParam_FFTZoomPos' (let | Scope: Global)

#208 [Line 1300] VARIABLE: 'appParam_FFTFindPeaks' (let | Scope: Global)

#209 [Line 1301] VARIABLE: 'appParam_FFTPeakUnits' (let | Scope: Global)

#210 [Line 1302] VARIABLE: 'appParam_FFTScale' (let | Scope: Global)

#211 [Line 1303] VARIABLE: 'appParam_FFTUnits' (let | Scope: Global)

#212 [Line 1304] VARIABLE: 'appParam_FFT_VPD' (let | Scope: Global)

#213 [Line 1305] VARIABLE: 'appParam_FFT_WPD' (let | Scope: Global)

#214 [Line 1306] VARIABLE: 'appParam_FFT_dBPD' (let | Scope: Global)

#215 [Line 1307] VARIABLE: 'appParam_FFTImpedance' (let | Scope: Global)

#216 [Line 1308] VARIABLE: 'appParam_FFTOffset' (let | Scope: Global)

#217 [Line 1309] VARIABLE: 'appParam_FFTVerticalPos' (let | Scope: Global)

#218 [Line 1310] VARIABLE: 'appParam_FFTStandard' (let | Scope: Global)

#219 [Lines 1311-1320] VARIABLE: 'appParam_FFTAnalysis' (let | Scope: Global)

#220 [Lines 1321-1331] VARIABLE: 'appParam_FFTMeasurements' (let | Scope: Global)

#221 [Line 1332] VARIABLE: 'table_FFTSource' (let | Scope: Global)

#222 [Line 1333] VARIABLE: 'table_FFTWindow' (let | Scope: Global)

#223 [Line 1334] VARIABLE: 'table_FFTZoom' (let | Scope: Global)

#224 [Lines 1335-1338] VARIABLE: 'table_FFTScale' (let | Scope: Global)

#225 [Line 1341] VARIABLE: 'appParam_acquisitionMode' (let | Scope: Global)

#226 [Line 1342] VARIABLE: 'appParam_acquisitionAverageSteps' (let | Scope: Global)

#227 [Line 1343] VARIABLE: 'appParam_acquisitionEnvelopeSteps' (let | Scope: Global)

#228 [Line 1344] VARIABLE: 'appParam_acquisitionSmoothingSteps' (let | Scope: Global)

#229 [Line 1345] VARIABLE: 'appParam_acquisitionEnvelopePersistence' (let | Scope: Global)

#230 [Line 1346] VARIABLE: 'appParam_acquisitionSmoothingWindow' (let | Scope: Global)

#231 [Line 1347] VARIABLE: 'appParam_acquisitionEnvelopeOpacity' (let | Scope: Global)

#232 [Line 1348] VARIABLE: 'appParam_Interpolation' (let | Scope: Global)

#233 [Line 1349] VARIABLE: 'appParam_InterpolationMethod' (let | Scope: Global)

#234 [Line 1350] VARIABLE: 'appParam_InterpolationUpsampling' (let | Scope: Global)

#235 [Line 1351] VARIABLE: 'appParam_envelopeCounterCH1' (let | Scope: Global)

#236 [Line 1352] VARIABLE: 'appParam_envelopeCounterCH2' (let | Scope: Global)

#237 [Line 1353] VARIABLE: 'table_acquisitionMode' (let | Scope: Global)

#238 [Line 1354] VARIABLE: 'table_acquisitionEnvelopeOpacity' (let | Scope: Global)

#239 [Line 1355] VARIABLE: 'table_acquisitionAverageSteps' (let | Scope: Global)

#240 [Line 1356] VARIABLE: 'table_acquisitionEnvelopeSteps' (let | Scope: Global)

#241 [Line 1357] VARIABLE: 'table_acquisitionSmoothingSteps' (let | Scope: Global)

#242 [Line 1358] VARIABLE: 'table_acquisitionEnvelopePersistence' (let | Scope: Global)

#243 [Line 1359] VARIABLE: 'table_acquisitionSmoothingWindow' (let | Scope: Global)

#244 [Line 1360] VARIABLE: 'table_InterpolationMethod' (let | Scope: Global)

#245 [Line 1361] VARIABLE: 'table_InterpolationUpsampling' (let | Scope: Global)

#246 [Line 1362] VARIABLE: 'action_resetEnvelopeCH1' (let | Scope: Global)

#247 [Line 1363] VARIABLE: 'action_resetEnvelopeCH2' (let | Scope: Global)

#248 [Line 1366] VARIABLE: 'appParam_CH1Coupling' (let | Scope: Global)

#249 [Line 1367] VARIABLE: 'appParam_CH1Probe' (let | Scope: Global)

#250 [Line 1368] VARIABLE: 'appParam_CH1_LPF' (let | Scope: Global)

#251 [Line 1369] VARIABLE: 'appParam_CH1_LPFType' (let | Scope: Global)

#252 [Line 1370] VARIABLE: 'appParam_CH1_LPFOrder' (let | Scope: Global)

#253 [Line 1371] VARIABLE: 'appParam_CH1_LPFValue' (let | Scope: Global)

#254 [Line 1372] VARIABLE: 'appParam_CH1invertY' (let | Scope: Global)

#255 [Line 1373] VARIABLE: 'appParam_CH1Offset' (let | Scope: Global)

#256 [Line 1376] VARIABLE: 'appParam_CH2Enabled' (let | Scope: Global)

#257 [Line 1377] VARIABLE: 'appParam_CH2Coupling' (let | Scope: Global)

#258 [Line 1378] VARIABLE: 'appParam_CH2Probe' (let | Scope: Global)

#259 [Line 1379] VARIABLE: 'appParam_CH2_LPF' (let | Scope: Global)

#260 [Line 1380] VARIABLE: 'appParam_CH2_LPFType' (let | Scope: Global)

#261 [Line 1381] VARIABLE: 'appParam_CH2_LPFOrder' (let | Scope: Global)

#262 [Line 1382] VARIABLE: 'appParam_CH2_LPFValue' (let | Scope: Global)

#263 [Line 1383] VARIABLE: 'appParam_CH2invertY' (let | Scope: Global)

#264 [Line 1384] VARIABLE: 'appParam_CH2Offset' (let | Scope: Global)

#265 [Line 1387] VARIABLE: 'table_LPFTypes' (let | Scope: Global)

#266 [Line 1388] VARIABLE: 'table_LPFOrders' (let | Scope: Global)

#267 [Line 1391] VARIABLE: 'appParam_mathEnabled' (let | Scope: Global)

#268 [Line 1392] VARIABLE: 'appParam_mathOperation' (let | Scope: Global)

#269 [Line 1393] VARIABLE: 'appParam_mathSourceA' (let | Scope: Global)

#270 [Line 1394] VARIABLE: 'appParam_mathSourceB' (let | Scope: Global)

#271 [Line 1395] VARIABLE: 'appParam_mathScale' (let | Scope: Global)

#272 [Line 1396] VARIABLE: 'appParam_mathVoltsZoom' (let | Scope: Global)

#273 [Line 1397] VARIABLE: 'appParam_mathOffset' (let | Scope: Global)

#274 [Line 1398] VARIABLE: 'table_mathOperation' (let | Scope: Global)

#275 [Line 1399] VARIABLE: 'table_mathSource' (let | Scope: Global)

#276 [Line 1402] VARIABLE: 'appParam_cursorMode' (let | Scope: Global)

#277 [Line 1403] VARIABLE: 'appParam_cursorSource' (let | Scope: Global)

#278 [Line 1404] VARIABLE: 'appParam_cursorRefLvl' (let | Scope: Global)

#279 [Line 1405] VARIABLE: 'appParam_cursorSelected' (let | Scope: Global)

#280 [Line 1406] VARIABLE: 'appParam_cursorX1Pos' (let | Scope: Global)

#281 [Line 1407] VARIABLE: 'appParam_cursorX2Pos' (let | Scope: Global)

#282 [Line 1408] VARIABLE: 'appParam_cursorY1Pos' (let | Scope: Global)

#283 [Line 1409] VARIABLE: 'appParam_cursorY2Pos' (let | Scope: Global)

#284 [Line 1410] VARIABLE: 'appParam_cursorX1Val' (let | Scope: Global)

#285 [Line 1411] VARIABLE: 'appParam_cursorX2Val' (let | Scope: Global)

#286 [Line 1412] VARIABLE: 'appParam_cursorY1Val' (let | Scope: Global)

#287 [Line 1413] VARIABLE: 'appParam_cursorY2Val' (let | Scope: Global)

#288 [Line 1414] VARIABLE: 'appParam_cursorY1ValPhase' (let | Scope: Global)

#289 [Line 1415] VARIABLE: 'appParam_cursorY2ValPhase' (let | Scope: Global)

#290 [Line 1416] VARIABLE: 'appParam_cursorDX' (let | Scope: Global)

#291 [Line 1417] VARIABLE: 'appParam_cursorDY' (let | Scope: Global)

#292 [Line 1418] VARIABLE: 'appParam_cursor1divDX' (let | Scope: Global)

#293 [Line 1419] VARIABLE: 'table_cursorMode' (let | Scope: Global)

#294 [Line 1420] VARIABLE: 'table_cursorSource' (let | Scope: Global)

#295 [Line 1421] VARIABLE: 'table_cursorSelected' (let | Scope: Global)

#296 [Line 1422] VARIABLE: 'table_cursorSelectedTrack' (let | Scope: Global)

#297 [Line 1425] VARIABLE: 'appParam_Meas' (let | Scope: Global)

#298 [Line 1426] VARIABLE: 'appParam_meas_CH1' (let | Scope: Global)

#299 [Line 1427] VARIABLE: 'appParam_meas_CH2' (let | Scope: Global)

#300 [Line 1428] VARIABLE: 'appParam_meas_MATH1' (let | Scope: Global)

#301 [Lines 1429-1432] VARIABLE: 'table_Meas' (let | Scope: Global)

#302 [Line 1435] VARIABLE: 'appParam_triggerLevel' (let | Scope: Global)

#303 [Line 1436] VARIABLE: 'appParam_triggerSource' (let | Scope: Global)

#304 [Line 1437] VARIABLE: 'appParam_triggerEdge' (let | Scope: Global)

#305 [Line 1438] VARIABLE: 'appParam_triggerMode' (let | Scope: Global)

#306 [Line 1439] VARIABLE: 'appParam_triggerLvlAutoManual' (let | Scope: Global)

#307 [Line 1440] VARIABLE: 'appParam_triggerHysteresis' (let | Scope: Global)

#308 [Line 1441] VARIABLE: 'appParam_triggerStabilize' (let | Scope: Global)

#309 [Line 1442] VARIABLE: 'appParam_isTriggered' (let | Scope: Global)

#310 [Lines 1443-1446] VARIABLE: 'appParam_current_stabilizationOffset' (let | Scope: Global)

#311 [Lines 1447-1450] VARIABLE: 'appParam_snapshot_stabilizationOffset' (let | Scope: Global)

#312 [Line 1451] VARIABLE: 'appParam_periodSamples_CH1' (let | Scope: Global)

#313 [Line 1452] VARIABLE: 'appParam_periodSamples_CH2' (let | Scope: Global)

#314 [Line 1453] VARIABLE: 'appParam_lastTriggerPos' (let | Scope: Global)

#315 [Line 1454] VARIABLE: 'appParam_triggerLineCountdown' (let | Scope: Global)

#316 [Line 1455] VARIABLE: 'appParam_triggerBlinkCounter' (let | Scope: Global)

#317 [Line 1456] VARIABLE: 'appParam_triggerBlinkState' (let | Scope: Global)

#318 [Line 1457] VARIABLE: 'appParam_trigdPersistenceCounter' (let | Scope: Global)

#319 [Line 1460] VARIABLE: 'appParam_anyREFEnabled' (let | Scope: Global)

#320 [Line 1461] VARIABLE: 'appParam_selectedREFBank' (let | Scope: Global)

#321 [Line 1462] VARIABLE: 'appParam_REFSource' (let | Scope: Global)

#322 [Line 1463] VARIABLE: 'appParam_REFDisplay' (let | Scope: Global)

#323 [Line 1464] VARIABLE: 'appParam_REFOffset' (let | Scope: Global)

#324 [Line 1465] VARIABLE: 'appParam_REFhorizontalPos' (let | Scope: Global)

#325 [Line 1466] VARIABLE: 'appParam_REFVoltsZoom' (let | Scope: Global)

#326 [Line 1467] VARIABLE: 'appParam_REFzoomScale' (let | Scope: Global)

#327 [Line 1468] VARIABLE: 'appParam_REFintendedSamples' (let | Scope: Global)

#328 [Line 1469] VARIABLE: 'appParam_REFintendedSamplesInterpolated' (let | Scope: Global)

#329 [Line 1471] VARIABLE: 'appParam_REFBankHorizontalZoomLvl' (let | Scope: Global)

#330 [Line 1472] VARIABLE: 'appParam_REFBankVPD' (let | Scope: Global)

#331 [Line 1473] VARIABLE: 'appParam_REFBankNumChans' (let | Scope: Global)

#332 [Line 1474] VARIABLE: 'appParam_REFBankSampleRate' (let | Scope: Global)

#333 [Line 1475] VARIABLE: 'appParam_REFBankHorizontalPos' (let | Scope: Global)

#334 [Line 1476] VARIABLE: 'appParam_REFBankInterpScale' (let | Scope: Global)

#335 [Line 1478] VARIABLE: 'appParam_currentREF_Offset' (let | Scope: Global)

#336 [Line 1479] VARIABLE: 'appParam_currentREF_horizontalPos' (let | Scope: Global)

#337 [Line 1480] VARIABLE: 'appParam_currentREF_voltsZoom' (let | Scope: Global)

#338 [Line 1481] VARIABLE: 'appParam_currentREF_horizontalLimitLeft' (let | Scope: Global)

#339 [Line 1482] VARIABLE: 'appParam_currentREF_horizontalLimitRight' (let | Scope: Global)

#340 [Line 1483] VARIABLE: 'appParam_currentREF_timeArrowPosition' (let | Scope: Global)

#341 [Line 1484] VARIABLE: 'table_refSource' (let | Scope: Global)

#342 [Line 1485] VARIABLE: 'table_refDisplay' (let | Scope: Global)

#343 [Line 1486] VARIABLE: 'table_refBank' (let | Scope: Global)

#344 [Line 1487] VARIABLE: 'action_REFForceUpdate' (let | Scope: Global)

#345 [Line 1490] VARIABLE: 'appParam_bodePlotEnabled' (let | Scope: Global)

#346 [Line 1491] VARIABLE: 'appParam_bodePlotMode' (let | Scope: Global)

#347 [Line 1492] VARIABLE: 'appParam_bodePlotStartFreq' (let | Scope: Global)

#348 [Line 1493] VARIABLE: 'appParam_bodePlotStopFreq' (let | Scope: Global)

#349 [Line 1494] VARIABLE: 'appParam_bodePlotDensity' (let | Scope: Global)

#350 [Line 1495] VARIABLE: 'appParam_bodePlotAveraging' (let | Scope: Global)

#351 [Line 1496] VARIABLE: 'table_bodePlotPPD' (let | Scope: Global)

#352 [Lines 1497-1501] VARIABLE: 'table_bodePlotFrequencies' (let | Scope: Global)

#353 [Line 1502] VARIABLE: 'action_doBodePlot' (let | Scope: Global)

#354 [Line 1503] VARIABLE: 'appParam_bodePlotSweepFreqs' (let | Scope: Global)

#355 [Line 1506] VARIABLE: 'appParam_soundEnabled' (let | Scope: Global)

#356 [Line 1507] VARIABLE: 'appParam_colorTheme' (let | Scope: Global)

#357 [Line 1508] VARIABLE: 'appParam_screenColorTheme' (let | Scope: Global)

#358 [Line 1509] VARIABLE: 'appParam_refreshRate' (let | Scope: Global)

#359 [Line 1510] VARIABLE: 'appParam_powerOnSettings' (let | Scope: Global)

#360 [Line 1511] VARIABLE: 'table_screenColorTheme' (let | Scope: Global)

#361 [Line 1514] VARIABLE: 'appParam_saveRecallOperation' (let | Scope: Global)

#362 [Line 1515] VARIABLE: 'appParam_saveRecallType' (let | Scope: Global)

#363 [Line 1516] VARIABLE: 'appParam_waveSaveSource' (let | Scope: Global)

#364 [Line 1517] VARIABLE: 'appParam_waveRecallDest' (let | Scope: Global)

#365 [Line 1518] VARIABLE: 'appParam_invertScreenshot' (let | Scope: Global)

#366 [Line 1519] VARIABLE: 'table_saveRecallType' (let | Scope: Global)

#367 [Line 1520] VARIABLE: 'table_waveSaveSource' (let | Scope: Global)

#368 [Lines 1532-1541] FUNCTION: 'log' (Global)
  • Inputs: message

#369 [Lines 1543-1546] FUNCTION: 'clearLog' (Global)

#370 [Line 1544] ⚡ MUTATION: 'logEntries' altered inside scope 'clearLog'

#371 [Line 1569] VARIABLE: 'action_setChannels' (let | Scope: Global)

#372 [Line 1570] VARIABLE: 'action_setTriggerSource' (let | Scope: Global)

#373 [Line 1571] VARIABLE: 'action_rollModeReset' (let | Scope: Global)

#374 [Line 1572] VARIABLE: 'action_triggerForce' (let | Scope: Global)

#375 [Line 1573] VARIABLE: 'action_forceAutoSet' (let | Scope: Global)

#376 [Line 1574] VARIABLE: 'action_resetTriggerAcquisition' (let | Scope: Global)

#377 [Line 1575] VARIABLE: 'action_setCouplingCH1' (let | Scope: Global)

#378 [Line 1576] VARIABLE: 'action_setCouplingCH2' (let | Scope: Global)

#379 [Line 1577] VARIABLE: 'action_setCH1VoltsZoom' (let | Scope: Global)

#380 [Line 1578] VARIABLE: 'action_setCH2VoltsZoom' (let | Scope: Global)

#381 [Line 1580] VARIABLE: 'fpgaParam_ch2enabled' (let | Scope: Global)

#382 [Line 1581] VARIABLE: 'fpgaParam_triggersource' (let | Scope: Global)

#383 [Line 1582] VARIABLE: 'fpgaParam_triggeredge' (let | Scope: Global)

#384 [Line 1583] VARIABLE: 'fpgaParam_ch1coupling' (let | Scope: Global)

#385 [Line 1584] VARIABLE: 'fpgaParam_ch2coupling' (let | Scope: Global)

#386 [Line 1585] VARIABLE: 'fpgaParam_timeZoomLvl' (let | Scope: Global)

#387 [Line 1586] VARIABLE: 'fpgaParam_CH1VoltsZoom' (let | Scope: Global)

#388 [Line 1587] VARIABLE: 'fpgaParam_CH2VoltsZoom' (let | Scope: Global)

#389 [Line 1588] VARIABLE: 'rollModeSamples' (let | Scope: Global)

#390 [Line 1590] VARIABLE: 'table_FPGA_VoltsZoomValues' (let | Scope: Global)

#391 [Lines 1592-1595] VARIABLE: 'table_FPGA_TimeZoomValues' (const | Scope: Global)

#392 [Line 1597] VARIABLE: 'fpgaParam_AutoSet_CH1Volts' (let | Scope: Global)

#393 [Line 1598] VARIABLE: 'fpgaParam_AutoSet_Time' (let | Scope: Global)

#394 [Line 1599] VARIABLE: 'fpgaParam_AutoSet_CH2Volts' (let | Scope: Global)

#395 [Line 1600] VARIABLE: 'fpgaParam_AutoSet_MaxEdges' (let | Scope: Global)

#396 [Line 1601] VARIABLE: 'fpgaParam_AutoSet_HistoryCH1' (let | Scope: Global)

#397 [Line 1602] VARIABLE: 'fpgaParam_AutoSet_HistoryCH2' (let | Scope: Global)

#398 [Line 1604] VARIABLE: 'calib_CH1' (let | Scope: Global)

#399 [Line 1605] VARIABLE: 'calib_CH2' (let | Scope: Global)

#400 [Line 1606] VARIABLE: 'calib_FPGA' (let | Scope: Global)

#401 [Line 1607] VARIABLE: 'calib_data_3_ch1' (let | Scope: Global)

#402 [Line 1608] VARIABLE: 'calib_data_3_ch2' (let | Scope: Global)

#403 [Line 1609] VARIABLE: 'calib_data_4_ch1' (let | Scope: Global)

#404 [Line 1610] VARIABLE: 'calib_data_4_ch2' (let | Scope: Global)

#405 [Lines 1612-1615] FUNCTION: 'FPGA_readRegister' (Global)
  • Inputs: regNumber
  • Return: hexToDecimal(result)

#406 [Lines 1617-1620] FUNCTION: 'FPGA_writeRegister' (Global)
  • Inputs: regNumber, newValue
  • Return: result

#407 [Lines 1622-1625] FUNCTION: 'FPGA_readPortD' (Global)
  • Return: hexToDecimal(result)

#408 [Lines 1627-1630] FUNCTION: 'FPGA_writePortD' (Global)
  • Inputs: newValue
  • Return: result

#409 [Lines 1632-1635] FUNCTION: 'FPGA_readPCBVersion' (Global)
  • Return: result

#410 [Lines 1637-1640] FUNCTION: 'FPGA_readRawData' (Global)
  • Inputs: reg02, addr, sizeSamples
  • Return: result

#411 [Lines 1642-1681] FUNCTION: 'FPGA_readCalibData' (Global)

#412 [Line 1643] ⚡ MUTATION: 'calib_CH1' altered inside scope 'FPGA_readCalibData'

#413 [Line 1644] ⚡ MUTATION: 'calib_CH2' altered inside scope 'FPGA_readCalibData'

#414 [Line 1645] ⚡ MUTATION: 'calib_FPGA' altered inside scope 'FPGA_readCalibData'

#415 [Line 1646] ⚡ MUTATION: 'calib_data_3_ch1' altered inside scope 'FPGA_readCalibData'

#416 [Line 1647] ⚡ MUTATION: 'calib_data_3_ch2' altered inside scope 'FPGA_readCalibData'

#417 [Line 1648] ⚡ MUTATION: 'calib_data_4_ch1' altered inside scope 'FPGA_readCalibData'

#418 [Line 1649] ⚡ MUTATION: 'calib_data_4_ch2' altered inside scope 'FPGA_readCalibData'

#419 [Line 1677] ⚡ MUTATION: 'calib_data_3_ch1' altered inside scope 'FPGA_readCalibData'

#420 [Line 1678] ⚡ MUTATION: 'calib_data_3_ch2' altered inside scope 'FPGA_readCalibData'

#421 [Line 1679] ⚡ MUTATION: 'calib_data_4_ch1' altered inside scope 'FPGA_readCalibData'

#422 [Line 1680] ⚡ MUTATION: 'calib_data_4_ch2' altered inside scope 'FPGA_readCalibData'

#423 [Lines 1683-1712] FUNCTION: 'FPGA_calcMoveUpDown' (Global)
  • Inputs: zeroVoltPos, channel
  • Return: Math.floor((val * 4096) / 3000000)

#424 [Lines 1714-1717] FUNCTION: 'SIGGEN_setFrequency' (Global)
  • Inputs: freqHz
  • Return: true

#425 [Lines 1719-1722] FUNCTION: 'SIGGEN_setDuty' (Global)
  • Inputs: dutyPercent
  • Return: true

#426 [Lines 1724-1727] FUNCTION: 'SIGGEN_setWaveformShape' (Global)
  • Inputs: waveformShape
  • Return: true

#427 [Lines 1729-1732] FUNCTION: 'SIGGEN_setON' (Global)
  • Return: true

#428 [Lines 1734-1737] FUNCTION: 'SIGGEN_setOFF' (Global)
  • Return: true

#429 [Lines 1739-1747] FUNCTION: 'FPGA_setCH1DCAC' (Global)
  • Inputs: value
  • Return: result

#430 [Line 1744] ⚡ MUTATION: 'fpgaParam_ch1coupling' altered inside scope 'FPGA_setCH1DCAC'

#431 [Lines 1749-1757] FUNCTION: 'FPGA_setCH2DCAC' (Global)
  • Inputs: value
  • Return: result

#432 [Line 1754] ⚡ MUTATION: 'fpgaParam_ch2coupling' altered inside scope 'FPGA_setCH2DCAC'

#433 [Lines 1759-1764] FUNCTION: 'FPGA_setCH2enabled' (Global)
  • Inputs: value
  • Return: result

#434 [Lines 1766-1772] FUNCTION: 'FPGA_setCH1VoltsZoom' (Global)
  • Inputs: value
  • Return: result

#435 [Lines 1774-1780] FUNCTION: 'FPGA_setCH2VoltsZoom' (Global)
  • Inputs: value
  • Return: result

#436 [Lines 1782-1789] FUNCTION: 'FPGA_setZeroVerticalPos' (Global)
  • Return: result

#437 [Lines 1791-1795] FUNCTION: 'FPGA_setSamplingRate' (Global)
  • Return: result

#438 [Lines 1797-1965] FUNCTION: 'FPGA_autoSet' (Global)
  • Return: true | true

#439 [Lines 1802-1807] FUNCTION: 'save4Last' (Local (in FPGA_autoSet))
  • Inputs: value, historyArray

#440 [Lines 1809-1815] FUNCTION: 'isStuck' (Local (in FPGA_autoSet))
  • Inputs: historyArray, skip
  • Return: true | false

#441 [Line 1819] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'FPGA_autoSet'

#442 [Line 1820] ⚡ MUTATION: 'appParam_CH1VoltsZoom' altered inside scope 'FPGA_autoSet'

#443 [Line 1822] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'FPGA_autoSet'

#444 [Line 1824] ⚡ MUTATION: 'appParam_CH2VoltsZoom' altered inside scope 'FPGA_autoSet'

#445 [Line 1826] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'FPGA_autoSet'

#446 [Line 1828] ⚡ MUTATION: 'action_forceAutoSet' altered inside scope 'FPGA_autoSet'

#447 [Line 1830] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'FPGA_autoSet'

#448 [Line 1831] ⚡ MUTATION: 'fpgaParam_AutoSet_CH1Volts' altered inside scope 'FPGA_autoSet'

#449 [Line 1832] ⚡ MUTATION: 'fpgaParam_AutoSet_Time' altered inside scope 'FPGA_autoSet'

#450 [Line 1833] ⚡ MUTATION: 'fpgaParam_AutoSet_CH2Volts' altered inside scope 'FPGA_autoSet'

#451 [Line 1834] ⚡ MUTATION: 'fpgaParam_AutoSet_MaxEdges' altered inside scope 'FPGA_autoSet'

#452 [Line 1835] ⚡ MUTATION: 'fpgaParam_AutoSet_HistoryCH1' altered inside scope 'FPGA_autoSet'

#453 [Line 1836] ⚡ MUTATION: 'fpgaParam_AutoSet_HistoryCH2' altered inside scope 'FPGA_autoSet'

#454 [Line 1842] ⚡ MUTATION: 'action_forceAutoSet' altered inside scope 'FPGA_autoSet'

#455 [Line 1851] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'FPGA_autoSet'

#456 [Line 1853] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'FPGA_autoSet'

#457 [Line 1857] ⚡ MUTATION: 'fpgaParam_AutoSet_CH1Volts' altered inside scope 'FPGA_autoSet'

#458 [Line 1862] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'FPGA_autoSet'

#459 [Line 1863] ⚡ MUTATION: 'fpgaParam_AutoSet_CH1Volts' altered inside scope 'FPGA_autoSet'

#460 [Line 1865] ⚡ MUTATION: 'fpgaParam_AutoSet_CH1Volts' altered inside scope 'FPGA_autoSet'

#461 [Line 1871] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'FPGA_autoSet'

#462 [Line 1872] ⚡ MUTATION: 'fpgaParam_AutoSet_CH1Volts' altered inside scope 'FPGA_autoSet'

#463 [Line 1874] ⚡ MUTATION: 'fpgaParam_AutoSet_CH1Volts' altered inside scope 'FPGA_autoSet'

#464 [Line 1890] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'FPGA_autoSet'

#465 [Line 1892] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'FPGA_autoSet'

#466 [Line 1896] ⚡ MUTATION: 'fpgaParam_AutoSet_CH2Volts' altered inside scope 'FPGA_autoSet'

#467 [Line 1901] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'FPGA_autoSet'

#468 [Line 1902] ⚡ MUTATION: 'fpgaParam_AutoSet_CH2Volts' altered inside scope 'FPGA_autoSet'

#469 [Line 1904] ⚡ MUTATION: 'fpgaParam_AutoSet_CH2Volts' altered inside scope 'FPGA_autoSet'

#470 [Line 1910] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'FPGA_autoSet'

#471 [Line 1911] ⚡ MUTATION: 'fpgaParam_AutoSet_CH2Volts' altered inside scope 'FPGA_autoSet'

#472 [Line 1913] ⚡ MUTATION: 'fpgaParam_AutoSet_CH2Volts' altered inside scope 'FPGA_autoSet'

#473 [Line 1922] ⚡ MUTATION: 'fpgaParam_AutoSet_CH2Volts' altered inside scope 'FPGA_autoSet'

#474 [Line 1934] ⚡ MUTATION: 'fpgaParam_AutoSet_MaxEdges' altered inside scope 'FPGA_autoSet'

#475 [Line 1940] ⚡ MUTATION: 'fpgaParam_AutoSet_Time' altered inside scope 'FPGA_autoSet'

#476 [Line 1948] ⚡ MUTATION: 'fpgaParam_AutoSet_Time' altered inside scope 'FPGA_autoSet'

#477 [Line 1950] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'FPGA_autoSet'

#478 [Line 1951] ⚡ MUTATION: 'fpgaParam_AutoSet_Time' altered inside scope 'FPGA_autoSet'

#479 [Line 1956] ⚡ MUTATION: 'fpgaParam_AutoSet_Time' altered inside scope 'FPGA_autoSet'

#480 [Line 1958] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'FPGA_autoSet'

#481 [Line 1959] ⚡ MUTATION: 'fpgaParam_AutoSet_Time' altered inside scope 'FPGA_autoSet'

#482 [Lines 1967-2048] FUNCTION: 'FPGA_setTrigger' (Global)
  • Inputs: triggersource, triggeredge
  • Return: true

#483 [Line 1981] ⚡ MUTATION: 'appParam_triggerAutoLvlOffset' altered inside scope 'FPGA_setTrigger'

#484 [Line 1982] ⚠️  LEAK: 'triggerY' (Unintended Global)

#485 [Line 1984] ⚡ MUTATION: 'appParam_triggerAutoLvlOffset' altered inside scope 'FPGA_setTrigger'

#486 [Line 1985] ⚠️  LEAK: 'triggerY' (Unintended Global)

#487 [Line 1990] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'FPGA_setTrigger'

#488 [Line 1992] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'FPGA_setTrigger'

#489 [Line 1997] ⚡ MUTATION: 'appParam_triggerAutoLvlOffset' altered inside scope 'FPGA_setTrigger'

#490 [Line 2005] ⚠️  LEAK: 'triggerY' (Unintended Global)

#491 [Line 2011] ⚠️  LEAK: 'triggerY' (Unintended Global)

#492 [Lines 2050-2075] FUNCTION: 'FPGA_waitUntilReady' (Global)
  • Inputs: mask, timeout
  • Return: false | false | true | false

#493 [Line 2064] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'FPGA_waitUntilReady'

#494 [Lines 2077-2342] FUNCTION: 'FPGA_getOscilloscopeData' (Global)
  • Return: { ch1data: null, ch2data: null, ch2enabled: fpgaParam_ch2enabled, triggersource: fpgaParam_triggersource, triggeredge... | { ch1data: null, ch2data: null, ch2enabled: fpgaParam_ch2enabled, triggersource: fpgaParam_triggersource, triggeredge... | { ch1data: null, ch2data: null, ch2enabled: fpgaParam_ch2enabled, triggersource: fpgaParam_triggersource, triggeredge... | { ch1data: data3, ch2data: data4, ch2enabled: fpgaParam_ch2enabled, triggersource: fpgaParam_triggersource, triggered...

#495 [Line 2088] ⚡ MUTATION: 'action_setChannels' altered inside scope 'FPGA_getOscilloscopeData'

#496 [Line 2090] ⚡ MUTATION: 'fpgaParam_ch2enabled' altered inside scope 'FPGA_getOscilloscopeData'

#497 [Line 2091] ⚡ MUTATION: 'fpgaParam_triggersource' altered inside scope 'FPGA_getOscilloscopeData'

#498 [Line 2093] ⚡ MUTATION: 'action_setChannels' altered inside scope 'FPGA_getOscilloscopeData'

#499 [Line 2095] ⚡ MUTATION: 'fpgaParam_ch2enabled' altered inside scope 'FPGA_getOscilloscopeData'

#500 [Line 2099] ⚡ MUTATION: 'action_setTriggerSource' altered inside scope 'FPGA_getOscilloscopeData'

#501 [Line 2100] ⚡ MUTATION: 'fpgaParam_triggersource' altered inside scope 'FPGA_getOscilloscopeData'

#502 [Line 2102] ⚡ MUTATION: 'action_setTriggerSource' altered inside scope 'FPGA_getOscilloscopeData'

#503 [Line 2103] ⚡ MUTATION: 'fpgaParam_triggersource' altered inside scope 'FPGA_getOscilloscopeData'

#504 [Line 2107] ⚡ MUTATION: 'action_setCouplingCH1' altered inside scope 'FPGA_getOscilloscopeData'

#505 [Line 2110] ⚡ MUTATION: 'action_setCouplingCH1' altered inside scope 'FPGA_getOscilloscopeData'

#506 [Line 2115] ⚡ MUTATION: 'action_setCouplingCH2' altered inside scope 'FPGA_getOscilloscopeData'

#507 [Line 2118] ⚡ MUTATION: 'action_setCouplingCH2' altered inside scope 'FPGA_getOscilloscopeData'

#508 [Line 2124] ⚡ MUTATION: 'fpgaParam_CH1VoltsZoom' altered inside scope 'FPGA_getOscilloscopeData'

#509 [Line 2125] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'FPGA_getOscilloscopeData'

#510 [Line 2130] ⚡ MUTATION: 'fpgaParam_CH2VoltsZoom' altered inside scope 'FPGA_getOscilloscopeData'

#511 [Line 2131] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'FPGA_getOscilloscopeData'

#512 [Line 2135] ⚡ MUTATION: 'fpgaParam_triggeredge' altered inside scope 'FPGA_getOscilloscopeData'

#513 [Line 2138] ⚡ MUTATION: 'fpgaParam_timeZoomLvl' altered inside scope 'FPGA_getOscilloscopeData'

#514 [Line 2164] ⚡ MUTATION: 'appParam_isTriggered' altered inside scope 'FPGA_getOscilloscopeData'

#515 [Line 2166] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'FPGA_getOscilloscopeData'

#516 [Line 2170] ⚡ MUTATION: 'rollModeSamples' altered inside scope 'FPGA_getOscilloscopeData'

#517 [Line 2173] ⚡ MUTATION: 'action_triggerForce' altered inside scope 'FPGA_getOscilloscopeData'

#518 [Line 2189] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'FPGA_getOscilloscopeData'

#519 [Line 2190] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'FPGA_getOscilloscopeData'

#520 [Line 2196] ⚡ MUTATION: 'rollModeSamples' altered inside scope 'FPGA_getOscilloscopeData'

#521 [Line 2208] ⚡ MUTATION: 'appParam_isTriggered' altered inside scope 'FPGA_getOscilloscopeData'

#522 [Line 2210] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'FPGA_getOscilloscopeData'

#523 [Line 2214] ⚡ MUTATION: 'rollModeSamples' altered inside scope 'FPGA_getOscilloscopeData'

#524 [Line 2217] ⚡ MUTATION: 'action_triggerForce' altered inside scope 'FPGA_getOscilloscopeData'

#525 [Line 2233] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'FPGA_getOscilloscopeData'

#526 [Line 2234] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'FPGA_getOscilloscopeData'

#527 [Line 2241] ⚡ MUTATION: 'rollModeSamples' altered inside scope 'FPGA_getOscilloscopeData'

#528 [Line 2277] ⚡ MUTATION: 'appParam_isTriggered' altered inside scope 'FPGA_getOscilloscopeData'

#529 [Line 2279] ⚡ MUTATION: 'appParam_isTriggered' altered inside scope 'FPGA_getOscilloscopeData'

#530 [Line 2306] ⚡ MUTATION: 'action_triggerForce' altered inside scope 'FPGA_getOscilloscopeData'

#531 [Lines 2344-2408] FUNCTION: 'FPGA_init' (Global)

#532 [Line 2399] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'FPGA_init'

#533 [Line 2403] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'FPGA_init'

#534 [Line 2406] ⚡ MUTATION: 'appParam_sigGenEnabled' altered inside scope 'FPGA_init'

#535 [Line 2415] FUNCTION: 'delay' (Global)
  • Inputs: ms

#536 [Lines 2418-2475] FUNCTION: 'connectSerial' (Global)
  • Inputs: reconnect

#537 [Line 2423] ⚡ MUTATION: 'port' altered inside scope 'connectSerial'

#538 [Line 2428] ⚡ MUTATION: 'port' altered inside scope 'connectSerial'

#539 [Line 2442] ⚡ MUTATION: 'writer' altered inside scope 'connectSerial'

#540 [Line 2443] ⚡ MUTATION: 'reader' altered inside scope 'connectSerial'

#541 [Line 2451] ⚡ MUTATION: 'commandQueue' altered inside scope 'connectSerial'

#542 [Line 2452] ⚡ MUTATION: 'responseQueue' altered inside scope 'connectSerial'

#543 [Line 2453] ⚡ MUTATION: 'isReading' altered inside scope 'connectSerial'

#544 [Line 2454] ⚡ MUTATION: 'isSending' altered inside scope 'connectSerial'

#545 [Line 2455] ⚡ MUTATION: 'reconnecting' altered inside scope 'connectSerial'

#546 [Line 2458] ⚡ MUTATION: 'reconnectTimeout' altered inside scope 'connectSerial'

#547 [Lines 2464-2467] ⚡ MUTATION: 'reconnectTimeout' altered inside scope 'connectSerial'

#548 [Line 2465] ⚡ MUTATION: 'reconnectTimeout' altered inside scope 'Anonymous/Callback'

#549 [Line 2470] ⚡ MUTATION: 'port' altered inside scope 'connectSerial'

#550 [Line 2472] ⚡ MUTATION: 'forceShutdown' altered inside scope 'connectSerial'

#551 [Lines 2478-2515] FUNCTION: 'disconnectSerial' (Global)

#552 [Line 2480] ⚡ MUTATION: 'reconnecting' altered inside scope 'disconnectSerial'

#553 [Line 2483] ⚡ MUTATION: 'reconnectTimeout' altered inside scope 'disconnectSerial'

#554 [Line 2488] ⚡ MUTATION: 'reader' altered inside scope 'disconnectSerial'

#555 [Line 2493] ⚡ MUTATION: 'writer' altered inside scope 'disconnectSerial'

#556 [Line 2508] ⚡ MUTATION: 'commandQueue' altered inside scope 'disconnectSerial'

#557 [Line 2509] ⚡ MUTATION: 'responseQueue' altered inside scope 'disconnectSerial'

#558 [Line 2510] ⚡ MUTATION: 'isReading' altered inside scope 'disconnectSerial'

#559 [Line 2511] ⚡ MUTATION: 'isSending' altered inside scope 'disconnectSerial'

#560 [Lines 2518-2530] FUNCTION: 'toggleConnection' (Global)

#561 [Lines 2533-2583] FUNCTION: 'startReading' (Global)

#562 [Line 2534] ⚡ MUTATION: 'isReading' altered inside scope 'startReading'

#563 [Line 2563] ⚡ MUTATION: 'reader' altered inside scope 'startReading'

#564 [Line 2568] ⚡ MUTATION: 'writer' altered inside scope 'startReading'

#565 [Line 2572] ⚡ MUTATION: 'port' altered inside scope 'startReading'

#566 [Line 2575] ⚡ MUTATION: 'reconnecting' altered inside scope 'startReading'

#567 [Line 2579] ⚡ MUTATION: 'isReading' altered inside scope 'startReading'

#568 [Lines 2586-2647] FUNCTION: 'sendCommand' (Global)
  • Inputs: commandText, logging
  • Return: response.slice(4) | null

#569 [Line 2596] ⚡ MUTATION: 'isSending' altered inside scope 'sendCommand'

#570 [Line 2627] ⚡ MUTATION: 'responseQueue' altered inside scope 'sendCommand'

#571 [Line 2628] ⚡ MUTATION: 'commandQueue' altered inside scope 'sendCommand'

#572 [Line 2644] ⚡ MUTATION: 'isSending' altered inside scope 'sendCommand'

#573 [Lines 2651-2660] FUNCTION: 'extractHexData' (Global)
  • Inputs: response
  • Return: response | null | null

#574 [Lines 2663-2666] FUNCTION: 'extractVB' (Global)
  • Inputs: str
  • Return: m ? [Number(m[1]), Number(m[2])] : null

#575 [Lines 2668-2697] FUNCTION: 'checkFirmwareCompatible' (Global)

#576 [Line 2669] ⚡ MUTATION: 'appParam_isFirmwareVersionValid' altered inside scope 'checkFirmwareCompatible'

#577 [Line 2678] ⚡ MUTATION: 'appParam_isFirmwareVersionValid' altered inside scope 'checkFirmwareCompatible'

#578 [Line 2680] ⚡ MUTATION: 'appParam_isFirmwareVersionValid' altered inside scope 'checkFirmwareCompatible'

#579 [Line 2685] ⚡ MUTATION: 'iterateInterval' altered inside scope 'checkFirmwareCompatible'

#580 [Lines 2700-2722] FUNCTION: 'sendCommandsFromFile' (Global)

#581 [Line 2720] ⚠️  LEAK: 'commandsToSend' (Unintended Global)

#582 [Lines 2725-2736] FUNCTION: 'loadCommandsFromFile' (Global)
  • Inputs: file

#583 [Line 2729] ⚠️  LEAK: 'commandsToSend' (Unintended Global)

#584 [Lines 2741-2753] FUNCTION: 'getTimestampFilename' (Global)
  • Return: `${yyyy}${mm}${dd}-${hh}${min}${ss}`

#585 [Lines 2756-2768] FUNCTION: 'getFormattedDate' (Global)
  • Return: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`

#586 [Lines 2770-2835] FUNCTION: 'captureScreenshot' (Global)
  • Inputs: invert

#587 [Lines 2837-2896] FUNCTION: 'exportWaveform' (Global)
  • Inputs: source

#588 [Line 2850] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'exportWaveform'

#589 [Line 2888] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'exportWaveform'

#590 [Lines 2898-2924] FUNCTION: 'generateCSV' (Global)
  • Inputs: source
  • Return: csvText

#591 [Lines 2926-2952] FUNCTION: 'generateZREF' (Global)
  • Inputs: source
  • Return: fileData

#592 [Lines 2954-2977] FUNCTION: 'importWaveform' (Global)
  • Inputs: dest
  • Return: false

#593 [Lines 2979-3031] FUNCTION: 'loadDataFromCSV' (Global)
  • Inputs: file, dest

#594 [Lines 3033-3057] FUNCTION: 'loadDataFromZREF' (Global)
  • Inputs: file, dest

#595 [Lines 3059-3087] FUNCTION: 'exportSetup' (Global)

#596 [Lines 3089-3188] FUNCTION: 'generateSetup' (Global)
  • Return: JSON.stringify(setupData, null, 2)

#597 [Lines 3190-3312] FUNCTION: 'applySetup' (Global)
  • Inputs: text

#598 [Line 3195] ⚡ MUTATION: 'appParam_gridMode' altered inside scope 'applySetup'

#599 [Line 3196] ⚡ MUTATION: 'appParam_displayMode' altered inside scope 'applySetup'

#600 [Line 3197] ⚡ MUTATION: 'appParam_dotsLines' altered inside scope 'applySetup'

#601 [Line 3198] ⚡ MUTATION: 'appParam_lineThickness' altered inside scope 'applySetup'

#602 [Line 3199] ⚡ MUTATION: 'appParam_oscilloscopeMode' altered inside scope 'applySetup'

#603 [Line 3201] ⚡ MUTATION: 'appParam_Meas' altered inside scope 'applySetup'

#604 [Line 3203] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'applySetup'

#605 [Line 3204] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'applySetup'

#606 [Line 3206] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'applySetup'

#607 [Line 3207] ⚡ MUTATION: 'appParam_triggerMode' altered inside scope 'applySetup'

#608 [Line 3208] ⚡ MUTATION: 'appParam_triggerLvlAutoManual' altered inside scope 'applySetup'

#609 [Line 3209] ⚡ MUTATION: 'appParam_triggerHysteresis' altered inside scope 'applySetup'

#610 [Line 3210] ⚡ MUTATION: 'appParam_triggerStabilize' altered inside scope 'applySetup'

#611 [Line 3211] ⚡ MUTATION: 'appParam_triggerSource' altered inside scope 'applySetup'

#612 [Line 3212] ⚡ MUTATION: 'appParam_triggerEdge' altered inside scope 'applySetup'

#613 [Line 3214] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'applySetup'

#614 [Line 3215] ⚡ MUTATION: 'appParam_acquisitionAverageSteps' altered inside scope 'applySetup'

#615 [Line 3216] ⚡ MUTATION: 'appParam_acquisitionEnvelopeSteps' altered inside scope 'applySetup'

#616 [Line 3217] ⚡ MUTATION: 'appParam_acquisitionSmoothingSteps' altered inside scope 'applySetup'

#617 [Line 3218] ⚡ MUTATION: 'appParam_acquisitionEnvelopePersistence' altered inside scope 'applySetup'

#618 [Line 3219] ⚡ MUTATION: 'appParam_acquisitionSmoothingWindow' altered inside scope 'applySetup'

#619 [Line 3220] ⚡ MUTATION: 'appParam_acquisitionEnvelopeOpacity' altered inside scope 'applySetup'

#620 [Line 3221] ⚡ MUTATION: 'appParam_Interpolation' altered inside scope 'applySetup'

#621 [Line 3222] ⚡ MUTATION: 'appParam_InterpolationMethod' altered inside scope 'applySetup'

#622 [Line 3223] ⚡ MUTATION: 'appParam_InterpolationUpsampling' altered inside scope 'applySetup'

#623 [Line 3225] ⚡ MUTATION: 'appParam_CH1Coupling' altered inside scope 'applySetup'

#624 [Line 3226] ⚡ MUTATION: 'appParam_CH1Probe' altered inside scope 'applySetup'

#625 [Line 3227] ⚡ MUTATION: 'appParam_CH1_LPF' altered inside scope 'applySetup'

#626 [Line 3228] ⚡ MUTATION: 'appParam_CH1_LPFType' altered inside scope 'applySetup'

#627 [Line 3229] ⚡ MUTATION: 'appParam_CH1_LPFOrder' altered inside scope 'applySetup'

#628 [Line 3230] ⚡ MUTATION: 'appParam_CH1_LPFValue' altered inside scope 'applySetup'

#629 [Line 3231] ⚡ MUTATION: 'appParam_CH1invertY' altered inside scope 'applySetup'

#630 [Line 3232] ⚡ MUTATION: 'appParam_CH1VoltsZoom' altered inside scope 'applySetup'

#631 [Line 3233] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'applySetup'

#632 [Line 3235] ⚡ MUTATION: 'appParam_CH2Enabled' altered inside scope 'applySetup'

#633 [Line 3236] ⚡ MUTATION: 'appParam_CH2Coupling' altered inside scope 'applySetup'

#634 [Line 3237] ⚡ MUTATION: 'appParam_CH2Probe' altered inside scope 'applySetup'

#635 [Line 3238] ⚡ MUTATION: 'appParam_CH2_LPF' altered inside scope 'applySetup'

#636 [Line 3239] ⚡ MUTATION: 'appParam_CH2_LPFType' altered inside scope 'applySetup'

#637 [Line 3240] ⚡ MUTATION: 'appParam_CH2_LPFOrder' altered inside scope 'applySetup'

#638 [Line 3241] ⚡ MUTATION: 'appParam_CH2_LPFValue' altered inside scope 'applySetup'

#639 [Line 3242] ⚡ MUTATION: 'appParam_CH2invertY' altered inside scope 'applySetup'

#640 [Line 3243] ⚡ MUTATION: 'appParam_CH2VoltsZoom' altered inside scope 'applySetup'

#641 [Line 3244] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'applySetup'

#642 [Line 3246] ⚡ MUTATION: 'appParam_mathEnabled' altered inside scope 'applySetup'

#643 [Line 3247] ⚡ MUTATION: 'appParam_mathOperation' altered inside scope 'applySetup'

#644 [Line 3248] ⚡ MUTATION: 'appParam_mathSourceA' altered inside scope 'applySetup'

#645 [Line 3249] ⚡ MUTATION: 'appParam_mathSourceB' altered inside scope 'applySetup'

#646 [Line 3250] ⚡ MUTATION: 'appParam_mathScale' altered inside scope 'applySetup'

#647 [Line 3251] ⚡ MUTATION: 'appParam_mathVoltsZoom' altered inside scope 'applySetup'

#648 [Line 3252] ⚡ MUTATION: 'appParam_mathOffset' altered inside scope 'applySetup'

#649 [Line 3255] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'applySetup'

#650 [Line 3256] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'applySetup'

#651 [Line 3257] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'applySetup'

#652 [Line 3258] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'applySetup'

#653 [Line 3259] ⚡ MUTATION: 'appParam_cursorX1Pos' altered inside scope 'applySetup'

#654 [Line 3260] ⚡ MUTATION: 'appParam_cursorX2Pos' altered inside scope 'applySetup'

#655 [Line 3261] ⚡ MUTATION: 'appParam_cursorY1Pos' altered inside scope 'applySetup'

#656 [Line 3262] ⚡ MUTATION: 'appParam_cursorY2Pos' altered inside scope 'applySetup'

#657 [Line 3264] ⚡ MUTATION: 'appParam_FFTEnabled' altered inside scope 'applySetup'

#658 [Line 3265] ⚡ MUTATION: 'appParam_FFTImpedance' altered inside scope 'applySetup'

#659 [Line 3266] ⚡ MUTATION: 'appParam_FFTScale' altered inside scope 'applySetup'

#660 [Line 3267] ⚡ MUTATION: 'appParam_FFTUnits' altered inside scope 'applySetup'

#661 [Line 3268] ⚡ MUTATION: 'appParam_FFTWindow' altered inside scope 'applySetup'

#662 [Line 3269] ⚡ MUTATION: 'appParam_FFTFindPeaks' altered inside scope 'applySetup'

#663 [Line 3270] ⚡ MUTATION: 'appParam_FFTPeakUnits' altered inside scope 'applySetup'

#664 [Line 3271] ⚡ MUTATION: 'appParam_FFTSource' altered inside scope 'applySetup'

#665 [Line 3272] ⚡ MUTATION: 'appParam_FFTZoom' altered inside scope 'applySetup'

#666 [Line 3273] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'applySetup'

#667 [Line 3274] ⚡ MUTATION: 'appParam_FFTOffset' altered inside scope 'applySetup'

#668 [Line 3275] ⚡ MUTATION: 'appParam_FFTVerticalPos' altered inside scope 'applySetup'

#669 [Line 3276] ⚡ MUTATION: 'appParam_FFT_VPD' altered inside scope 'applySetup'

#670 [Line 3277] ⚡ MUTATION: 'appParam_FFT_WPD' altered inside scope 'applySetup'

#671 [Line 3278] ⚡ MUTATION: 'appParam_FFT_dBPD' altered inside scope 'applySetup'

#672 [Line 3280] ⚡ MUTATION: 'appParam_bodePlotEnabled' altered inside scope 'applySetup'

#673 [Line 3281] ⚡ MUTATION: 'appParam_bodePlotMode' altered inside scope 'applySetup'

#674 [Line 3282] ⚡ MUTATION: 'appParam_bodePlotStartFreq' altered inside scope 'applySetup'

#675 [Line 3283] ⚡ MUTATION: 'appParam_bodePlotStopFreq' altered inside scope 'applySetup'

#676 [Line 3284] ⚡ MUTATION: 'appParam_bodePlotDensity' altered inside scope 'applySetup'

#677 [Line 3285] ⚡ MUTATION: 'appParam_bodePlotAveraging' altered inside scope 'applySetup'

#678 [Line 3296] ⚡ MUTATION: 'action_setTriggerSource' altered inside scope 'applySetup'

#679 [Line 3298] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'applySetup'

#680 [Line 3299] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'applySetup'

#681 [Line 3303] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'applySetup'

#682 [Lines 3314-3429] FUNCTION: 'applyDefaultSetup' (Global)

#683 [Line 3317] ⚡ MUTATION: 'appParam_gridMode' altered inside scope 'applyDefaultSetup'

#684 [Line 3318] ⚡ MUTATION: 'appParam_displayMode' altered inside scope 'applyDefaultSetup'

#685 [Line 3319] ⚡ MUTATION: 'appParam_dotsLines' altered inside scope 'applyDefaultSetup'

#686 [Line 3320] ⚡ MUTATION: 'appParam_lineThickness' altered inside scope 'applyDefaultSetup'

#687 [Line 3321] ⚡ MUTATION: 'appParam_oscilloscopeMode' altered inside scope 'applyDefaultSetup'

#688 [Line 3323] ⚡ MUTATION: 'appParam_Meas' altered inside scope 'applyDefaultSetup'

#689 [Line 3325] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'applyDefaultSetup'

#690 [Line 3326] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'applyDefaultSetup'

#691 [Line 3328] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'applyDefaultSetup'

#692 [Line 3329] ⚡ MUTATION: 'appParam_triggerMode' altered inside scope 'applyDefaultSetup'

#693 [Line 3330] ⚡ MUTATION: 'appParam_triggerLvlAutoManual' altered inside scope 'applyDefaultSetup'

#694 [Line 3331] ⚡ MUTATION: 'appParam_triggerHysteresis' altered inside scope 'applyDefaultSetup'

#695 [Line 3332] ⚡ MUTATION: 'appParam_triggerStabilize' altered inside scope 'applyDefaultSetup'

#696 [Line 3333] ⚡ MUTATION: 'appParam_triggerSource' altered inside scope 'applyDefaultSetup'

#697 [Line 3334] ⚡ MUTATION: 'appParam_triggerEdge' altered inside scope 'applyDefaultSetup'

#698 [Line 3336] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'applyDefaultSetup'

#699 [Line 3337] ⚡ MUTATION: 'appParam_acquisitionAverageSteps' altered inside scope 'applyDefaultSetup'

#700 [Line 3338] ⚡ MUTATION: 'appParam_acquisitionEnvelopeSteps' altered inside scope 'applyDefaultSetup'

#701 [Line 3339] ⚡ MUTATION: 'appParam_acquisitionSmoothingSteps' altered inside scope 'applyDefaultSetup'

#702 [Line 3340] ⚡ MUTATION: 'appParam_acquisitionEnvelopePersistence' altered inside scope 'applyDefaultSetup'

#703 [Line 3341] ⚡ MUTATION: 'appParam_acquisitionSmoothingWindow' altered inside scope 'applyDefaultSetup'

#704 [Line 3342] ⚡ MUTATION: 'appParam_acquisitionEnvelopeOpacity' altered inside scope 'applyDefaultSetup'

#705 [Line 3343] ⚡ MUTATION: 'appParam_Interpolation' altered inside scope 'applyDefaultSetup'

#706 [Line 3344] ⚡ MUTATION: 'appParam_InterpolationMethod' altered inside scope 'applyDefaultSetup'

#707 [Line 3345] ⚡ MUTATION: 'appParam_InterpolationUpsampling' altered inside scope 'applyDefaultSetup'

#708 [Line 3347] ⚡ MUTATION: 'appParam_CH1Coupling' altered inside scope 'applyDefaultSetup'

#709 [Line 3348] ⚡ MUTATION: 'appParam_CH1Probe' altered inside scope 'applyDefaultSetup'

#710 [Line 3349] ⚡ MUTATION: 'appParam_CH1_LPF' altered inside scope 'applyDefaultSetup'

#711 [Line 3350] ⚡ MUTATION: 'appParam_CH1_LPFType' altered inside scope 'applyDefaultSetup'

#712 [Line 3351] ⚡ MUTATION: 'appParam_CH1_LPFOrder' altered inside scope 'applyDefaultSetup'

#713 [Line 3352] ⚡ MUTATION: 'appParam_CH1_LPFValue' altered inside scope 'applyDefaultSetup'

#714 [Line 3353] ⚡ MUTATION: 'appParam_CH1invertY' altered inside scope 'applyDefaultSetup'

#715 [Line 3354] ⚡ MUTATION: 'appParam_CH1VoltsZoom' altered inside scope 'applyDefaultSetup'

#716 [Line 3355] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'applyDefaultSetup'

#717 [Line 3357] ⚡ MUTATION: 'appParam_CH2Enabled' altered inside scope 'applyDefaultSetup'

#718 [Line 3358] ⚡ MUTATION: 'appParam_CH2Coupling' altered inside scope 'applyDefaultSetup'

#719 [Line 3359] ⚡ MUTATION: 'appParam_CH2Probe' altered inside scope 'applyDefaultSetup'

#720 [Line 3360] ⚡ MUTATION: 'appParam_CH2_LPF' altered inside scope 'applyDefaultSetup'

#721 [Line 3361] ⚡ MUTATION: 'appParam_CH2_LPFType' altered inside scope 'applyDefaultSetup'

#722 [Line 3362] ⚡ MUTATION: 'appParam_CH2_LPFOrder' altered inside scope 'applyDefaultSetup'

#723 [Line 3363] ⚡ MUTATION: 'appParam_CH2_LPFValue' altered inside scope 'applyDefaultSetup'

#724 [Line 3364] ⚡ MUTATION: 'appParam_CH2invertY' altered inside scope 'applyDefaultSetup'

#725 [Line 3365] ⚡ MUTATION: 'appParam_CH2VoltsZoom' altered inside scope 'applyDefaultSetup'

#726 [Line 3366] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'applyDefaultSetup'

#727 [Line 3368] ⚡ MUTATION: 'appParam_mathEnabled' altered inside scope 'applyDefaultSetup'

#728 [Line 3369] ⚡ MUTATION: 'appParam_mathOperation' altered inside scope 'applyDefaultSetup'

#729 [Line 3370] ⚡ MUTATION: 'appParam_mathSourceA' altered inside scope 'applyDefaultSetup'

#730 [Line 3371] ⚡ MUTATION: 'appParam_mathSourceB' altered inside scope 'applyDefaultSetup'

#731 [Line 3372] ⚡ MUTATION: 'appParam_mathScale' altered inside scope 'applyDefaultSetup'

#732 [Line 3373] ⚡ MUTATION: 'appParam_mathVoltsZoom' altered inside scope 'applyDefaultSetup'

#733 [Line 3374] ⚡ MUTATION: 'appParam_mathOffset' altered inside scope 'applyDefaultSetup'

#734 [Line 3377] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'applyDefaultSetup'

#735 [Line 3378] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'applyDefaultSetup'

#736 [Line 3379] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'applyDefaultSetup'

#737 [Line 3380] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'applyDefaultSetup'

#738 [Line 3381] ⚡ MUTATION: 'appParam_cursorX1Pos' altered inside scope 'applyDefaultSetup'

#739 [Line 3382] ⚡ MUTATION: 'appParam_cursorX2Pos' altered inside scope 'applyDefaultSetup'

#740 [Line 3383] ⚡ MUTATION: 'appParam_cursorY1Pos' altered inside scope 'applyDefaultSetup'

#741 [Line 3384] ⚡ MUTATION: 'appParam_cursorY2Pos' altered inside scope 'applyDefaultSetup'

#742 [Line 3386] ⚡ MUTATION: 'appParam_FFTEnabled' altered inside scope 'applyDefaultSetup'

#743 [Line 3387] ⚡ MUTATION: 'appParam_FFTImpedance' altered inside scope 'applyDefaultSetup'

#744 [Line 3388] ⚡ MUTATION: 'appParam_FFTScale' altered inside scope 'applyDefaultSetup'

#745 [Line 3389] ⚡ MUTATION: 'appParam_FFTUnits' altered inside scope 'applyDefaultSetup'

#746 [Line 3390] ⚡ MUTATION: 'appParam_FFTWindow' altered inside scope 'applyDefaultSetup'

#747 [Line 3391] ⚡ MUTATION: 'appParam_FFTFindPeaks' altered inside scope 'applyDefaultSetup'

#748 [Line 3392] ⚡ MUTATION: 'appParam_FFTPeakUnits' altered inside scope 'applyDefaultSetup'

#749 [Line 3393] ⚡ MUTATION: 'appParam_FFTSource' altered inside scope 'applyDefaultSetup'

#750 [Line 3394] ⚡ MUTATION: 'appParam_FFTZoom' altered inside scope 'applyDefaultSetup'

#751 [Line 3395] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'applyDefaultSetup'

#752 [Line 3396] ⚡ MUTATION: 'appParam_FFTOffset' altered inside scope 'applyDefaultSetup'

#753 [Line 3397] ⚡ MUTATION: 'appParam_FFTVerticalPos' altered inside scope 'applyDefaultSetup'

#754 [Line 3398] ⚡ MUTATION: 'appParam_FFT_VPD' altered inside scope 'applyDefaultSetup'

#755 [Line 3399] ⚡ MUTATION: 'appParam_FFT_WPD' altered inside scope 'applyDefaultSetup'

#756 [Line 3400] ⚡ MUTATION: 'appParam_FFT_dBPD' altered inside scope 'applyDefaultSetup'

#757 [Line 3402] ⚡ MUTATION: 'appParam_bodePlotEnabled' altered inside scope 'applyDefaultSetup'

#758 [Line 3403] ⚡ MUTATION: 'appParam_bodePlotMode' altered inside scope 'applyDefaultSetup'

#759 [Line 3404] ⚡ MUTATION: 'appParam_bodePlotStartFreq' altered inside scope 'applyDefaultSetup'

#760 [Line 3405] ⚡ MUTATION: 'appParam_bodePlotStopFreq' altered inside scope 'applyDefaultSetup'

#761 [Line 3406] ⚡ MUTATION: 'appParam_bodePlotDensity' altered inside scope 'applyDefaultSetup'

#762 [Line 3407] ⚡ MUTATION: 'appParam_bodePlotAveraging' altered inside scope 'applyDefaultSetup'

#763 [Line 3418] ⚡ MUTATION: 'action_setTriggerSource' altered inside scope 'applyDefaultSetup'

#764 [Line 3420] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'applyDefaultSetup'

#765 [Line 3421] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'applyDefaultSetup'

#766 [Line 3425] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'applyDefaultSetup'

#767 [Lines 3431-3444] FUNCTION: 'importSetup' (Global)
  • Return: false

#768 [Lines 3446-3456] FUNCTION: 'loadDataFromZSET' (Global)
  • Inputs: file

#769 [Lines 3458-3465] FUNCTION: 'saveSetupToLocalStorage' (Global)

#770 [Lines 3467-3477] FUNCTION: 'loadSetupFromLocalStorage' (Global)

#771 [Lines 3480-3501] FUNCTION: 'loadUserSettings' (Global)

#772 [Line 3482] ⚡ MUTATION: 'appCalib_1ChannelInterleave' altered inside scope 'loadUserSettings'

#773 [Line 3483] ⚡ MUTATION: 'appCalib_1ChannelOffset' altered inside scope 'loadUserSettings'

#774 [Line 3484] ⚡ MUTATION: 'appCalib_2ChannelOffsetCH1' altered inside scope 'loadUserSettings'

#775 [Line 3485] ⚡ MUTATION: 'appCalib_2ChannelOffsetCH2' altered inside scope 'loadUserSettings'

#776 [Line 3489] ⚡ MUTATION: 'appParam_refreshRate' altered inside scope 'loadUserSettings'

#777 [Line 3490] ⚡ MUTATION: 'ITERATION_INTERVAL' altered inside scope 'loadUserSettings'

#778 [Line 3492] ⚡ MUTATION: 'appParam_screenColorTheme' altered inside scope 'loadUserSettings'

#779 [Line 3495] ⚡ MUTATION: 'appParam_powerOnSettings' altered inside scope 'loadUserSettings'

#780 [Lines 3504-3506] FUNCTION: 'saveUserSettings' (Global)

#781 [Lines 3511-3539] FUNCTION: 'scaleCorrection' (Global)
  • Inputs: offsetTotal
  • Return: offsetTotal | scaledOffset - correctionValue

#782 [Lines 3542-3646] FUNCTION: 'stabilizeTrigger' (Global)
  • Inputs: waveArray, triggerLevel, triggerSlope, posOffset, channelName
  • Return: { index: 0, found: 0 } | { index: 0, found: 0 } | { index: 0, //min, found: 0 } | { index: 0, //max, found: 0 } | { index: (triggerIndex - closestIndex) - fraction, found: crossingIndices.length }

#783 [Lines 3649-3690] FUNCTION: 'trimWaveArray' (Global)
  • Inputs: waveArray, channelName
  • Return: waveArray

#784 [Line 3652] ⚡ MUTATION: 'appParam_isPanAllowed' altered inside scope 'trimWaveArray'

#785 [Line 3655] ⚡ MUTATION: 'appParam_isPanAllowed' altered inside scope 'trimWaveArray'

#786 [Line 3657] ⚡ MUTATION: 'appParam_isPanAllowed' altered inside scope 'trimWaveArray'

#787 [Lines 3693-3817] FUNCTION: 'processForPlotting' (Global)
  • Inputs: waveArray, width, channelName
  • Return: waveArray.map((y, i) => ({ x: (i / (waveArray.length - 1 || 1)) * width, y })) | waveArray.map((y, i) => ({ x: (i * pixelStep) + leftPad, y }))

#788 [Line 3763] ⚡ MUTATION: 'appParam_currentREF_horizontalLimitLeft' altered inside scope 'processForPlotting'

#789 [Line 3764] ⚡ MUTATION: 'appParam_currentREF_horizontalLimitRight' altered inside scope 'processForPlotting'

#790 [Lines 3820-3928] FUNCTION: 'processVisibleWaveform' (Global)
  • Inputs: waveArray, width, channelName
  • Return: waveArray.map((y, i) => ({ x: (i / (waveArray.length - 1 || 1)) * width, y })) | visible

#791 [Lines 3931-3968] FUNCTION: 'convertToWaveArray' (Global)
  • Inputs: hexData
  • Return: waveArray

#792 [Lines 3971-3984] FUNCTION: 'convertToWaveArrayCH2' (Global)
  • Inputs: hexData
  • Return: waveArray

#793 [Lines 3986-4046] FUNCTION: 'waveformFIRSmoothing' (Global)
  • Inputs: waveArray, numSteps, window
  • Return: out

#794 [Lines 4048-4074] FUNCTION: 'waveformIIRSmoothing' (Global)
  • Inputs: waveArray, alpha
  • Return: [] | out

#795 [Lines 4076-4154] FUNCTION: 'waveformFilterFIR' (Global)
  • Inputs: waveArray, cutoffFreq, window, numSteps, filterPass
  • Return: waveArray.slice() | waveArray.slice() | out

#796 [Lines 4157-4277] FUNCTION: 'waveformFilterIIR' (Global)
  • Inputs: waveArray, cutoffFreq, filterType, filterOrder, filterPass
  • Return: waveArray.slice() | waveArray.slice() | waveArray.slice() | output

#797 [Lines 4180-4252] FUNCTION: 'designBiquad' (Local (in waveformFilterIIR))
  • Return: { b: [b0 * G, b1 * G, b2 * G], a: [1, a1, a2] }

#798 [Lines 4280-4320] FUNCTION: 'waveformAveraging' (Global)
  • Inputs: waveArray, numSteps, channelName
  • Return: waveArray | avgArray | avgArray

#799 [Lines 4322-4326] FUNCTION: 'resetAveragingBuffers' (Global)

#800 [Lines 4329-4395] FUNCTION: 'waveformEnvelope' (Global)
  • Inputs: waveArray, envWindow, numSteps, channelName

#801 [Line 4335] ⚡ MUTATION: 'envelopeMaxCH1DataArray' altered inside scope 'waveformEnvelope'

#802 [Line 4336] ⚡ MUTATION: 'envelopeMinCH1DataArray' altered inside scope 'waveformEnvelope'

#803 [Line 4337] ⚡ MUTATION: 'appParam_envelopeCounterCH1' altered inside scope 'waveformEnvelope'

#804 [Line 4345] ⚡ MUTATION: 'envelopeMaxCH1DataArray' altered inside scope 'waveformEnvelope'

#805 [Line 4346] ⚡ MUTATION: 'envelopeMinCH1DataArray' altered inside scope 'waveformEnvelope'

#806 [Line 4347] ⚡ MUTATION: 'appParam_envelopeCounterCH1' altered inside scope 'waveformEnvelope'

#807 [Line 4367] ⚡ MUTATION: 'envelopeMaxCH2DataArray' altered inside scope 'waveformEnvelope'

#808 [Line 4368] ⚡ MUTATION: 'envelopeMinCH2DataArray' altered inside scope 'waveformEnvelope'

#809 [Line 4369] ⚡ MUTATION: 'appParam_envelopeCounterCH2' altered inside scope 'waveformEnvelope'

#810 [Line 4377] ⚡ MUTATION: 'envelopeMaxCH2DataArray' altered inside scope 'waveformEnvelope'

#811 [Line 4378] ⚡ MUTATION: 'envelopeMinCH2DataArray' altered inside scope 'waveformEnvelope'

#812 [Line 4379] ⚡ MUTATION: 'appParam_envelopeCounterCH2' altered inside scope 'waveformEnvelope'

#813 [Lines 4397-4400] FUNCTION: 'resetEnvelopeBuffers' (Global)

#814 [Line 4398] ⚡ MUTATION: 'action_resetEnvelopeCH1' altered inside scope 'resetEnvelopeBuffers'

#815 [Line 4399] ⚡ MUTATION: 'action_resetEnvelopeCH2' altered inside scope 'resetEnvelopeBuffers'

#816 [Lines 4403-4409] FUNCTION: 'invertY' (Global)
  • Inputs: waveArray
  • Return: result

#817 [Lines 4412-4416] FUNCTION: 'cubicInterpolate' (Global)
  • Inputs: p0, p1, p2, p3, t
  • Return: 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)

#818 [Lines 4419-4428] FUNCTION: 'lanczosInterpolate' (Global)
  • Inputs: points, t, a
  • Return: sum

#819 [Lines 4430-4434] FUNCTION: 'lanczosKernel' (Global)
  • Inputs: x, a
  • Return: 1 | 0 | a * Math.sin(Math.PI * x) * Math.sin(Math.PI * x / a) / (Math.PI * Math.PI * x * x)

#820 [Lines 4437-4450] FUNCTION: 'sincInterpolate' (Global)
  • Inputs: points, t, a
  • Return: sum

#821 [Lines 4452-4455] FUNCTION: 'sincKernel' (Global)
  • Inputs: x
  • Return: 1 | Math.sin(Math.PI * x) / (Math.PI * x)

#822 [Lines 4457-4460] FUNCTION: 'lanczosWindow' (Global)
  • Inputs: x, a
  • Return: 0 | sincKernel(x / a)

#823 [Lines 4463-4488] FUNCTION: 'pchipInterpolate' (Global)
  • Inputs: points, i, t
  • Return: h00 * x1 + h10 * h1 * m0 + h01 * x2 + h11 * h1 * m1

#824 [Lines 4491-4518] FUNCTION: 'makimaInterpolate' (Global)
  • Inputs: points, i, t
  • Return: h00 * x[2] + h10 * 1 * d0 + h01 * x[3] + h11 * 1 * d1

#825 [Lines 4521-4563] FUNCTION: 'doInterpolationFixedLength' (Global)
  • Inputs: waveArray, method, desiredLength, channelName
  • Return: waveArray | interpolated

#826 [Lines 4566-4579] FUNCTION: 'processForPlottingFFT' (Global)
  • Inputs: waveArray, width
  • Return: waveArray.map((y, i) => ({ x: (i / (waveArray.length - 1 || 1)) * width, y })) | waveArray.map((y, i) => ({ x: i * pixelStep, y }))

#827 [Lines 4582-4591] FUNCTION: 'mapForXY' (Global)
  • Inputs: waveArrayA, waveArrayB
  • Return: waveXY

#828 [Lines 4593-4596] FUNCTION: 'is_numeric' (Global)
  • Inputs: val
  • Return: true | val && /^-?\d+(\.\d+)?$/.test(val + '')

#829 [Lines 4599-4601] FUNCTION: 'waveToVolts' (Global)
  • Inputs: value, voltsPerDiv
  • Return: (value * voltsPerDiv) / 0.125

#830 [Lines 4604-4606] FUNCTION: 'voltsToWave' (Global)
  • Inputs: value, voltsPerDiv
  • Return: (value * 0.125) / voltsPerDiv

#831 [Lines 4609-4872] FUNCTION: 'mathOperation' (Global)
  • Inputs: waveArrayA, waveArrayB, mathOperation
  • Return: resultArray

#832 [Lines 4877-5348] FUNCTION: 'drawGrid' (Global)
  • Inputs: ctx, numOfGrids, leftMargin, rightMargin, topMargin, bottomMargin, interMargin, gridMode

#833 [Line 4935] ⚠️  LEAK: 'canvas' (Unintended Global)

#834 [Line 4949] ⚠️  LEAK: 'canvas' (Unintended Global)

#835 [Line 4955] ⚠️  LEAK: 'canvas' (Unintended Global)

#836 [Line 4959] ⚠️  LEAK: 'canvas' (Unintended Global)

#837 [Line 5347] ⚡ MUTATION: 'gridBoundsArray' altered inside scope 'drawGrid'

#838 [Lines 5351-5413] FUNCTION: 'drawEnvelope' (Global)
  • Inputs: ctx, pointsMax, pointsMin, gridBounds, color, dotsLines, lineThickness

#839 [Lines 5416-5534] FUNCTION: 'drawWaveform' (Global)
  • Inputs: ctx, points, gridBounds, color, dotsLines, lineThickness

#840 [Lines 5537-5549] FUNCTION: 'computeOutcode' (Global)
  • Inputs: x, y, xMin, xMax, yMin, yMax
  • Return: code

#841 [Lines 5552-5620] FUNCTION: 'clipLine' (Global)
  • Inputs: x0, y0, x1, y1, xMin, xMax, yMin, yMax
  • Return: { x0: x0Clip, y0: y0Clip, x1: x1Clip, y1: y1Clip, visible: true } | { visible: false }

#842 [Lines 5559-5566] FUNCTION: 'computeOutcode' (Local (in clipLine))
  • Inputs: x, y
  • Return: code

#843 [Lines 5623-5704] FUNCTION: 'clipEnvelopeShape' (Global)
  • Inputs: x0, y0, x1, y1, xMin, xMax, yMin, yMax
  • Return: { x0: x0Clip, y0: y0Clip, x1: x1Clip, y1: y1Clip, visible: true } | { visible: false }

#844 [Lines 5630-5637] FUNCTION: 'computeOutcode' (Local (in clipEnvelopeShape))
  • Inputs: x, y
  • Return: code

#845 [Lines 5707-5722] FUNCTION: 'drawTriggerLine' (Global)
  • Inputs: ctx, gridIndex

#846 [Line 5718] ⚡ MUTATION: 'appParam_lastTriggerPos' altered inside scope 'drawTriggerLine'

#847 [Line 5719] ⚡ MUTATION: 'appParam_triggerLineCountdown' altered inside scope 'drawTriggerLine'

#848 [Lines 5725-5741] FUNCTION: 'drawHorizontalLine' (Global)
  • Inputs: ctx, Yoffset, gridBounds, color, dashLength, lineThickness

#849 [Lines 5744-5760] FUNCTION: 'drawVerticalLine' (Global)
  • Inputs: ctx, Xoffset, gridBounds, color, dashLength, lineThickness

#850 [Lines 5763-5830] FUNCTION: 'drawText' (Global)
  • Inputs: ctx, text, xPosition, yPosition, fontSize, color, invert, isCentered, leftLimit, rightLimit

#851 [Lines 5833-5842] FUNCTION: 'showMessage' (Global)
  • Inputs: text, channelName, priority

#852 [Line 5837] ⚡ MUTATION: 'appParam_messagePriority' altered inside scope 'showMessage'

#853 [Line 5838] ⚡ MUTATION: 'appParam_message' altered inside scope 'showMessage'

#854 [Line 5839] ⚡ MUTATION: 'appParam_lastMessage' altered inside scope 'showMessage'

#855 [Line 5840] ⚡ MUTATION: 'appParam_messageChannel' altered inside scope 'showMessage'

#856 [Line 5841] ⚡ MUTATION: 'appParam_messageCountdown' altered inside scope 'showMessage'

#857 [Lines 5845-5908] FUNCTION: 'drawMessage' (Global)

#858 [Line 5846] ⚠️  LEAK: 'canvas' (Unintended Global)

#859 [Line 5847] ⚠️  LEAK: 'context' (Unintended Global)

#860 [Lines 5855-5868] FUNCTION: 'drawMessageNow' (Local (in drawMessage))
  • Inputs: context, gridCenterX, gridCenterY, messageColor

#861 [Line 5864] ⚡ MUTATION: 'appParam_lastMessage' altered inside scope 'drawMessageNow'

#862 [Line 5865] ⚡ MUTATION: 'appParam_messageCountdown' altered inside scope 'drawMessageNow'

#863 [Lines 5911-6074] FUNCTION: 'writeMeasurements' (Global)
  • Inputs: ctx, channelName, yPosition

#864 [Lines 5917-5924] FUNCTION: 'giveName' (Local (in writeMeasurements))
  • Inputs: index
  • Return: table_Meas[1][i] | ''

#865 [Lines 5926-5941] FUNCTION: 'giveValue' (Local (in writeMeasurements))
  • Inputs: index
  • Return: appParam_meas_CH1[i] | appParam_meas_CH2[i] | appParam_meas_MATH1[i] | '' | ''

#866 [Lines 6077-6102] FUNCTION: 'clearAllCanvas' (Global)

#867 [Lines 6105-6114] FUNCTION: 'turnOffAllDOM' (Global)

#868 [Lines 6119-6191] FUNCTION: 'autoUnit' (Global)
  • Inputs: value, decimals, baseUnit
  • Return: `NaN${baseUnit}` | `${formattedValue}${selectedPrefix.prefix}${baseUnit}`

#869 [Lines 6194-6197] FUNCTION: 'getIntFromString' (Global)
  • Inputs: str
  • Return: parseInt(num, 10)

#870 [Lines 6199-6204] FUNCTION: 'decimalToHex' (Global)
  • Inputs: decNumber
  • Return: decNumber.toString(16).toUpperCase()

#871 [Lines 6206-6208] FUNCTION: 'hexToDecimal' (Global)
  • Inputs: hexNumber
  • Return: parseInt(hexNumber, 16)

#872 [Lines 6211-6226] FUNCTION: 'trackBufferChangeTime' (Global)
  • Inputs: currentBuffer
  • Return: true | false

#873 [Line 6218] ⚡ MUTATION: 'bufferChangeTime' altered inside scope 'trackBufferChangeTime'

#874 [Line 6221] ⚡ MUTATION: 'timeLastChange' altered inside scope 'trackBufferChangeTime'

#875 [Line 6222] ⚡ MUTATION: 'previousPlotBuffer1' altered inside scope 'trackBufferChangeTime'

#876 [Lines 6229-6235] FUNCTION: 'isOdd' (Global)
  • Inputs: num
  • Return: true | false

#877 [Lines 6238-6244] FUNCTION: 'formatHMSPad' (Global)
  • Inputs: totalSeconds
  • Return: `${h}:${m}:${s}`

#878 [Lines 6250-6257] FUNCTION: 'getVoltsDiv' (Global)
  • Inputs: voltsDivValue, x1x10Value, textOrNum
  • Return: textOrNum == 0 ? table_VPD[1][i] : table_VPD[2][i]

#879 [Lines 6260-6267] FUNCTION: 'getTimeDiv' (Global)
  • Inputs: timeDivValue, textOrNum
  • Return: textOrNum == 0 ? table_TPD[1][i] : table_TPD[2][i]

#880 [Lines 6270-6277] FUNCTION: 'getFFTUnits' (Global)
  • Return: table_FFTScale[1][i]

#881 [Lines 6279-6293] FUNCTION: 'getVPDfromChannel' (Global)
  • Inputs: channelName
  • Return: appParam_current_CH1_VPD | appParam_current_CH2_VPD | table_VPD[2][appParam_mathVoltsZoom] | 1 | table_VPD[2][appParam_REFVoltsZoom[channelName]] | 1

#882 [Lines 6296-6311] FUNCTION: 'isAvailable' (Global)
  • Inputs: channelName
  • Return: true | appParam_CH2Enabled == 'ON' ? true : false | appParam_mathEnabled == 'ON' ? true : false | appParam_FFTEnabled == 'ON' ? true : false | (currentREFBankDataArray[channelName].length > 0) ? true : false | false

#883 [Lines 6314-6328] FUNCTION: 'removeExistingOffsetSingle' (Global)
  • Inputs: singleValue, chan
  • Return: singleValue - appParam_CH1Offset | singleValue - appParam_CH2Offset | singleValue - appParam_mathOffset | singleValue - appParam_FFTOffset | singleValue - appParam_REFOffset[chan] | singleValue

#884 [Lines 6331-6345] FUNCTION: 'removeExistingOffset' (Global)
  • Inputs: waveArray, chan
  • Return: waveArray.map(value => value - appParam_CH1Offset) | waveArray.map(value => value - appParam_CH2Offset) | waveArray.map(value => value - appParam_mathOffset) | waveArray.map(value => value - appParam_FFTOffset) | waveArray.map(value => value - appParam_REFOffset[chan]) | waveArray

#885 [Lines 6348-6361] FUNCTION: 'scaleVoltsAtoB' (Global)
  • Inputs: waveArrayA, vpdA, vpdB
  • Return: waveArrayA | waveArrayA.map(value => value * scaleFactor)

#886 [Lines 6364-6367] FUNCTION: 'applyOffset' (Global)
  • Inputs: waveArrayA, offsetValue
  • Return: waveArrayA.map(value => value + offsetValue)

#887 [Lines 6370-6405] FUNCTION: 'analyzeFFT' (Global)
  • Inputs: fftArray, zoom, originalDataLength, channelName, numOfPeaks
  • Return: { totalBandwidth: displayedBandwidth, // Bandwidth covered by 1024 samples dominantFrequencies: dominantFrequencies, ...

#888 [Lines 6407-6465] FUNCTION: 'calcMeasAutoSet' (Global)
  • Inputs: waveArray
  • Return: { min: 0, max: 0, risingEdges: 0, fallingEdges: 0 } | { min: min, max: max, average: (sum / waveArray.length), midPoint: midPoint, risingEdges: risingEdges, fallingEdges: ...

#889 [Lines 6468-6473] FUNCTION: 'calcMidPoint' (Global)
  • Inputs: waveArray
  • Return: (p1 + p99) / 2

#890 [Lines 6476-7136] FUNCTION: 'calcMeas' (Global)
  • Inputs: waveArray, voltsPerDivision, sampleRate, channelName
  • Return: { vMin: vMinVolts, vMax: vMaxVolts, peakToPeak: vPtPVolts, vBase: vBaseVolts, vTop: vTopVolts, amplitude: vAmpVolts, ...

#891 [Line 6914] ⚡ MUTATION: 'appParam_periodSamples_CH1' altered inside scope 'calcMeas'

#892 [Line 6916] ⚡ MUTATION: 'appParam_periodSamples_CH2' altered inside scope 'calcMeas'

#893 [Lines 7139-7342] FUNCTION: 'calcDelayMeas' (Global)
  • Inputs: waveArray1, waveArray2, voltsPerDivision1, voltsPerDivision2, sampleRate
  • Return: { FRR, FFF, FRF, FFR, LRR, LRF, LFR, LFF, frequency1, frequency2, phase } | { FRR, // Time between first rising edge of Source 1 and first rising edge of Source 2 FFF, // Time between first fal...

#894 [Lines 7171-7224] FUNCTION: 'calcLevels' (Local (in calcDelayMeas))
  • Inputs: waveArray, voltsPerDivision
  • Return: { vBase, vTop, amplitude, vBaseNormalized, vTopNormalized }

#895 [Lines 7242-7282] FUNCTION: 'detectEdges' (Local (in calcDelayMeas))
  • Inputs: waveArray, crossingLine, upperThreshold, lowerThreshold, timePerSample
  • Return: { edges, frequency }

#896 [Lines 7299-7302] FUNCTION: 'calcTimeDiff' (Local (in calcDelayMeas))
  • Inputs: index1, index2
  • Return: 0 | (index2 - index1) * timePerSample

#897 [Lines 7345-7427] FUNCTION: 'getMeasurements' (Global)
  • Inputs: waveArray, voltsPerDivision, sampleRate, channelName
  • Return: resultsArray

#898 [Lines 7430-7447] FUNCTION: 'getEnvelopeMeasurements' (Global)
  • Inputs: waveArrayMax, waveArrayMin, measArray, voltsPerDivision, sampleRate, channelName

#899 [Lines 7450-7454] FUNCTION: 'findTriggerVolts' (Global)
  • Inputs: voltsPerDivision
  • Return: volts

#900 [Lines 7457-7489] FUNCTION: 'findCrossing' (Global)
  • Inputs: positionX, waveArray
  • Return: 0 | waveArray[0] | waveArray[lowerIndex] | result

#901 [Lines 7495-7513] FUNCTION: 'doIteration' (Global)

#902 [Lines 7516-7765] FUNCTION: 'processParams' (Global)

#903 [Line 7519] ⚡ MUTATION: 'appParam_dataIsNew' altered inside scope 'processParams'

#904 [Line 7530] ⚡ MUTATION: 'appParam_dataIsSync' altered inside scope 'processParams'

#905 [Line 7532] ⚡ MUTATION: 'appParam_dataIsSync' altered inside scope 'processParams'

#906 [Line 7537] ⚡ MUTATION: 'appParam_isPanAllowed' altered inside scope 'processParams'

#907 [Line 7540] ⚡ MUTATION: 'appParam_panCounter' altered inside scope 'processParams'

#908 [Line 7545] ⚡ MUTATION: 'appParam_isPanAllowed' altered inside scope 'processParams'

#909 [Line 7547] ⚡ MUTATION: 'appParam_isPanAllowed' altered inside scope 'processParams'

#910 [Line 7550] ⚡ MUTATION: 'appParam_panCounter' altered inside scope 'processParams'

#911 [Line 7551] ⚡ MUTATION: 'appParam_isPanAllowed' altered inside scope 'processParams'

#912 [Line 7556] ⚡ MUTATION: 'appParam_isRollMode' altered inside scope 'processParams'

#913 [Line 7558] ⚡ MUTATION: 'appParam_isRollMode' altered inside scope 'processParams'

#914 [Line 7560] ⚡ MUTATION: 'appParam_isRollMode' altered inside scope 'processParams'

#915 [Line 7562] ⚡ MUTATION: 'appParam_isRollMode' altered inside scope 'processParams'

#916 [Line 7567] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'processParams'

#917 [Line 7571] ⚡ MUTATION: 'appParam_current_interpScale' altered inside scope 'processParams'

#918 [Line 7574] ⚡ MUTATION: 'appParam_current_TPD' altered inside scope 'processParams'

#919 [Line 7575] ⚡ MUTATION: 'appParam_current_CH1_VPD' altered inside scope 'processParams'

#920 [Line 7576] ⚡ MUTATION: 'appParam_current_CH2_VPD' altered inside scope 'processParams'

#921 [Line 7577] ⚡ MUTATION: 'appParam_current_numChans' altered inside scope 'processParams'

#922 [Line 7578] ⚡ MUTATION: 'appParam_current_sampleRate' altered inside scope 'processParams'

#923 [Line 7579] ⚡ MUTATION: 'appParam_current_intendedSamples' altered inside scope 'processParams'

#924 [Line 7580] ⚡ MUTATION: 'appParam_current_intendedSamplesInterpolated' altered inside scope 'processParams'

#925 [Line 7586] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'processParams'

#926 [Line 7591] ⚡ MUTATION: 'appParam_currentREF_horizontalPos' altered inside scope 'processParams'

#927 [Line 7596] ⚡ MUTATION: 'appParam_snapshot_horizontalPos' altered inside scope 'processParams'

#928 [Line 7597] ⚡ MUTATION: 'appParam_snapshot_TPD' altered inside scope 'processParams'

#929 [Line 7598] ⚡ MUTATION: 'appParam_snapshot_CH1_VPD' altered inside scope 'processParams'

#930 [Line 7599] ⚡ MUTATION: 'appParam_snapshot_CH2_VPD' altered inside scope 'processParams'

#931 [Line 7600] ⚡ MUTATION: 'appParam_snapshot_sampleRate' altered inside scope 'processParams'

#932 [Line 7601] ⚡ MUTATION: 'appParam_snapshot_timeZoomLvl' altered inside scope 'processParams'

#933 [Line 7602] ⚡ MUTATION: 'appParam_snapshot_numChans' altered inside scope 'processParams'

#934 [Line 7603] ⚡ MUTATION: 'appParam_snapshot_interpScale' altered inside scope 'processParams'

#935 [Line 7607] ⚡ MUTATION: 'appParam_snapshot_zoomScale' altered inside scope 'processParams'

#936 [Line 7608] ⚡ MUTATION: 'appParam_snapshot_zoomScale' altered inside scope 'processParams'

#937 [Line 7609] ⚡ MUTATION: 'appParam_snapshot_intendedSamples' altered inside scope 'processParams'

#938 [Line 7610] ⚡ MUTATION: 'appParam_snapshot_intendedSamplesInterpolated' altered inside scope 'processParams'

#939 [Line 7613] ⚡ MUTATION: 'appParam_anyREFEnabled' altered inside scope 'processParams'

#940 [Line 7639] ⚡ MUTATION: 'appParam_horizontalWindowWidth' altered inside scope 'processParams'

#941 [Line 7641] ⚡ MUTATION: 'appParam_snapshot_horizontalLimitLeft' altered inside scope 'processParams'

#942 [Line 7642] ⚡ MUTATION: 'appParam_snapshot_horizontalLimitRight' altered inside scope 'processParams'

#943 [Line 7644] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'processParams'

#944 [Line 7646] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'processParams'

#945 [Line 7649] ⚡ MUTATION: 'appParam_current_horizontalLimitLeft' altered inside scope 'processParams'

#946 [Line 7650] ⚡ MUTATION: 'appParam_current_horizontalLimitRight' altered inside scope 'processParams'

#947 [Line 7652] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'processParams'

#948 [Line 7654] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'processParams'

#949 [Line 7662] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'processParams'

#950 [Line 7663] ⚡ MUTATION: 'appParam_previous_VoltsZoom' altered inside scope 'processParams'

#951 [Line 7667] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'processParams'

#952 [Line 7668] ⚡ MUTATION: 'appParam_previous_VoltsZoom' altered inside scope 'processParams'

#953 [Line 7672] ⚡ MUTATION: 'appParam_timeArrowPosition' altered inside scope 'processParams'

#954 [Line 7673] ⚡ MUTATION: 'appParam_timeArrowPosition' altered inside scope 'processParams'

#955 [Line 7675] ⚡ MUTATION: 'appParam_timeArrowPosition' altered inside scope 'processParams'

#956 [Line 7680] ⚡ MUTATION: 'appParam_currentREF_timeArrowPosition' altered inside scope 'processParams'

#957 [Line 7681] ⚡ MUTATION: 'appParam_currentREF_timeArrowPosition' altered inside scope 'processParams'

#958 [Line 7685] ⚡ MUTATION: 'appParam_timeOffset' altered inside scope 'processParams'

#959 [Line 7688] ⚡ MUTATION: 'gridRightMargin' altered inside scope 'processParams'

#960 [Line 7691] ⚡ MUTATION: 'appParam_triggerVerticalPos' altered inside scope 'processParams'

#961 [Line 7695] ⚡ MUTATION: 'appParam_triggerVerticalPos' altered inside scope 'processParams'

#962 [Line 7697] ⚡ MUTATION: 'appParam_triggerVerticalPos' altered inside scope 'processParams'

#963 [Line 7701] ⚡ MUTATION: 'appParam_CH1VerticalPos' altered inside scope 'processParams'

#964 [Line 7704] ⚡ MUTATION: 'appParam_CH1VerticalPos' altered inside scope 'processParams'

#965 [Line 7706] ⚡ MUTATION: 'appParam_CH1VerticalPos' altered inside scope 'processParams'

#966 [Line 7710] ⚡ MUTATION: 'appParam_CH2VerticalPos' altered inside scope 'processParams'

#967 [Line 7713] ⚡ MUTATION: 'appParam_CH2VerticalPos' altered inside scope 'processParams'

#968 [Line 7715] ⚡ MUTATION: 'appParam_CH2VerticalPos' altered inside scope 'processParams'

#969 [Line 7719] ⚡ MUTATION: 'appParam_mathVerticalPos' altered inside scope 'processParams'

#970 [Line 7722] ⚡ MUTATION: 'appParam_mathVerticalPos' altered inside scope 'processParams'

#971 [Line 7724] ⚡ MUTATION: 'appParam_mathVerticalPos' altered inside scope 'processParams'

#972 [Line 7728] ⚡ MUTATION: 'appParam_FFTVerticalPos' altered inside scope 'processParams'

#973 [Line 7731] ⚡ MUTATION: 'appParam_FFTVerticalPos' altered inside scope 'processParams'

#974 [Line 7733] ⚡ MUTATION: 'appParam_FFTVerticalPos' altered inside scope 'processParams'

#975 [Line 7737] ⚡ MUTATION: 'appParam_REFVerticalPos' altered inside scope 'processParams'

#976 [Line 7740] ⚡ MUTATION: 'appParam_REFVerticalPos' altered inside scope 'processParams'

#977 [Line 7742] ⚡ MUTATION: 'appParam_REFVerticalPos' altered inside scope 'processParams'

#978 [Line 7746] ⚡ MUTATION: 'appParam_previous_intendedSamples' altered inside scope 'processParams'

#979 [Line 7747] ⚡ MUTATION: 'appParam_previous_timeZoomLvl' altered inside scope 'processParams'

#980 [Lines 7768-7780] FUNCTION: 'getChannelSource' (Global)
  • Inputs: chanSource
  • Return: CH1rawPoints | CH2rawPoints | MATH1rawPoints | FFTrawPoints | REFrawPoints[chanSource]

#981 [Lines 7783-7795] FUNCTION: 'getChannelSourceRaw' (Global)
  • Inputs: chanSource
  • Return: currentCH1DataArray | currentCH2DataArray | currentMATH1DataArray | FFTrawPoints | currentREFBankDataArray[chanSource]

#982 [Lines 7798-8160] FUNCTION: 'processWaveforms' (Global)

#983 [Line 7803] ⚡ MUTATION: 'CH1rawPoints' altered inside scope 'processWaveforms'

#984 [Line 7804] ⚡ MUTATION: 'CH2rawPoints' altered inside scope 'processWaveforms'

#985 [Line 7806] ⚡ MUTATION: 'MATH1rawPoints' altered inside scope 'processWaveforms'

#986 [Lines 7807-7818] ⚡ MUTATION: 'REFrawPoints' altered inside scope 'processWaveforms'

#987 [Line 7824] ⚡ MUTATION: 'rawCH1DataArray' altered inside scope 'processWaveforms'

#988 [Line 7828] ⚡ MUTATION: 'currentCH1DataArray' altered inside scope 'processWaveforms'

#989 [Line 7832] ⚡ MUTATION: 'currentCH1DataArray' altered inside scope 'processWaveforms'

#990 [Line 7837] ⚡ MUTATION: 'currentCH1DataArray' altered inside scope 'processWaveforms'

#991 [Line 7839] ⚡ MUTATION: 'currentCH1DataArray' altered inside scope 'processWaveforms'

#992 [Line 7844] ⚡ MUTATION: 'currentCH1DataArray' altered inside scope 'processWaveforms'

#993 [Line 7849] ⚡ MUTATION: 'currentCH1DataArray' altered inside scope 'processWaveforms'

#994 [Line 7855] ⚡ MUTATION: 'appParam_current_stabilizationOffset' altered inside scope 'processWaveforms'

#995 [Line 7859] ⚡ MUTATION: 'appParam_current_stabilizationOffset' altered inside scope 'processWaveforms'

#996 [Line 7865] ⚡ MUTATION: 'currentCH1DataArray' altered inside scope 'processWaveforms'

#997 [Line 7870] ⚡ MUTATION: 'appParam_meas_CH1' altered inside scope 'processWaveforms'

#998 [Line 7877] ⚡ MUTATION: 'rawCH2DataArray' altered inside scope 'processWaveforms'

#999 [Line 7881] ⚡ MUTATION: 'currentCH2DataArray' altered inside scope 'processWaveforms'

#1000 [Line 7885] ⚡ MUTATION: 'currentCH2DataArray' altered inside scope 'processWaveforms'

#1001 [Line 7890] ⚡ MUTATION: 'currentCH2DataArray' altered inside scope 'processWaveforms'

#1002 [Line 7892] ⚡ MUTATION: 'currentCH2DataArray' altered inside scope 'processWaveforms'

#1003 [Line 7897] ⚡ MUTATION: 'currentCH2DataArray' altered inside scope 'processWaveforms'

#1004 [Line 7902] ⚡ MUTATION: 'currentCH2DataArray' altered inside scope 'processWaveforms'

#1005 [Line 7908] ⚡ MUTATION: 'appParam_current_stabilizationOffset' altered inside scope 'processWaveforms'

#1006 [Line 7912] ⚡ MUTATION: 'appParam_current_stabilizationOffset' altered inside scope 'processWaveforms'

#1007 [Line 7918] ⚡ MUTATION: 'currentCH2DataArray' altered inside scope 'processWaveforms'

#1008 [Line 7923] ⚡ MUTATION: 'appParam_meas_CH2' altered inside scope 'processWaveforms'

#1009 [Line 7929] ⚡ MUTATION: 'CH1rawPoints' altered inside scope 'processWaveforms'

#1010 [Line 7933] ⚡ MUTATION: 'CH1rawPoints' altered inside scope 'processWaveforms'

#1011 [Line 7937] ⚡ MUTATION: 'CH1rawPoints' altered inside scope 'processWaveforms'

#1012 [Line 7946] ⚡ MUTATION: 'envelopeMaxCH1rawPoints' altered inside scope 'processWaveforms'

#1013 [Line 7947] ⚡ MUTATION: 'envelopeMinCH1rawPoints' altered inside scope 'processWaveforms'

#1014 [Line 7950] ⚡ MUTATION: 'envelopeMaxCH1rawPoints' altered inside scope 'processWaveforms'

#1015 [Line 7951] ⚡ MUTATION: 'envelopeMinCH1rawPoints' altered inside scope 'processWaveforms'

#1016 [Line 7954] ⚡ MUTATION: 'envelopeMaxCH1rawPoints' altered inside scope 'processWaveforms'

#1017 [Line 7955] ⚡ MUTATION: 'envelopeMinCH1rawPoints' altered inside scope 'processWaveforms'

#1018 [Line 7963] ⚡ MUTATION: 'CH2rawPoints' altered inside scope 'processWaveforms'

#1019 [Line 7967] ⚡ MUTATION: 'CH2rawPoints' altered inside scope 'processWaveforms'

#1020 [Line 7971] ⚡ MUTATION: 'CH2rawPoints' altered inside scope 'processWaveforms'

#1021 [Line 7980] ⚡ MUTATION: 'envelopeMaxCH2rawPoints' altered inside scope 'processWaveforms'

#1022 [Line 7981] ⚡ MUTATION: 'envelopeMinCH2rawPoints' altered inside scope 'processWaveforms'

#1023 [Line 7984] ⚡ MUTATION: 'envelopeMaxCH2rawPoints' altered inside scope 'processWaveforms'

#1024 [Line 7985] ⚡ MUTATION: 'envelopeMinCH2rawPoints' altered inside scope 'processWaveforms'

#1025 [Line 7988] ⚡ MUTATION: 'envelopeMaxCH2rawPoints' altered inside scope 'processWaveforms'

#1026 [Line 7989] ⚡ MUTATION: 'envelopeMinCH2rawPoints' altered inside scope 'processWaveforms'

#1027 [Line 7993] ⚡ MUTATION: 'currentCH2DataArray' altered inside scope 'processWaveforms'

#1028 [Line 7994] ⚡ MUTATION: 'CH2rawPoints' altered inside scope 'processWaveforms'

#1029 [Line 7995] ⚡ MUTATION: 'envelopeMaxCH2DataArray' altered inside scope 'processWaveforms'

#1030 [Line 7996] ⚡ MUTATION: 'envelopeMinCH2DataArray' altered inside scope 'processWaveforms'

#1031 [Line 7997] ⚡ MUTATION: 'envelopeMaxCH2rawPoints' altered inside scope 'processWaveforms'

#1032 [Line 7998] ⚡ MUTATION: 'envelopeMinCH2rawPoints' altered inside scope 'processWaveforms'

#1033 [Line 8025] ⚡ MUTATION: 'currentMATH1DataArray' altered inside scope 'processWaveforms'

#1034 [Line 8028] ⚡ MUTATION: 'currentMATH1DataArray' altered inside scope 'processWaveforms'

#1035 [Line 8033] ⚡ MUTATION: 'appParam_meas_MATH1' altered inside scope 'processWaveforms'

#1036 [Line 8038] ⚡ MUTATION: 'MATH1rawPoints' altered inside scope 'processWaveforms'

#1037 [Line 8042] ⚡ MUTATION: 'MATH1rawPoints' altered inside scope 'processWaveforms'

#1038 [Line 8045] ⚡ MUTATION: 'MATH1rawPoints' altered inside scope 'processWaveforms'

#1039 [Line 8049] ⚡ MUTATION: 'currentMATH1DataArray' altered inside scope 'processWaveforms'

#1040 [Line 8050] ⚡ MUTATION: 'MATH1rawPoints' altered inside scope 'processWaveforms'

#1041 [Lines 8163-8181] FUNCTION: 'averageColor' (Global)
  • Inputs: hex1, hex2
  • Return: "#" + toHex(r) + toHex(g) + toHex(b)

#1042 [Line 8179] FUNCTION: 'toHex' (Local (in averageColor))
  • Inputs: v

#1043 [Lines 8184-8215] FUNCTION: 'plotGrid' (Global)
  • Inputs: forceRedraw

#1044 [Line 8187] ⚡ MUTATION: 'appParam_gridsToDraw' altered inside scope 'plotGrid'

#1045 [Line 8189] ⚡ MUTATION: 'appParam_gridsToDraw' altered inside scope 'plotGrid'

#1046 [Line 8191] ⚡ MUTATION: 'appParam_gridsToDraw' altered inside scope 'plotGrid'

#1047 [Line 8195] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'plotGrid'

#1048 [Line 8196] ⚡ MUTATION: 'appParam_previous_gridMode' altered inside scope 'plotGrid'

#1049 [Line 8197] ⚡ MUTATION: 'appParam_previous_gridsToDraw' altered inside scope 'plotGrid'

#1050 [Line 8198] ⚡ MUTATION: 'appParam_previous_gridRightMargin' altered inside scope 'plotGrid'

#1051 [Lines 8218-8292] FUNCTION: 'drawMenu' (Global)
  • Inputs: forceRedraw

#1052 [Line 8221] ⚡ MUTATION: 'appParam_menuForceDelete' altered inside scope 'drawMenu'

#1053 [Line 8231] ⚡ MUTATION: 'appParam_menuForceDraw' altered inside scope 'drawMenu'

#1054 [Lines 8295-8391] FUNCTION: 'plotREF' (Global)
  • Inputs: forceRedraw

#1055 [Line 8298] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'plotREF'

#1056 [Line 8307] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'plotREF'

#1057 [Lines 8394-8527] FUNCTION: 'plotData' (Global)

#1058 [Lines 8530-9082] FUNCTION: 'drawHUD' (Global)

#1059 [Line 8810] ⚡ MUTATION: 'appParam_trigdPersistenceCounter' altered inside scope 'drawHUD'

#1060 [Line 8821] ⚡ MUTATION: 'appParam_triggerBlinkCounter' altered inside scope 'drawHUD'

#1061 [Line 8826] ⚡ MUTATION: 'appParam_triggerBlinkState' altered inside scope 'drawHUD'

#1062 [Line 8828] ⚡ MUTATION: 'appParam_triggerBlinkState' altered inside scope 'drawHUD'

#1063 [Line 8831] ⚡ MUTATION: 'appParam_triggerBlinkCounter' altered inside scope 'drawHUD'

#1064 [Line 8832] ⚡ MUTATION: 'appParam_triggerBlinkState' altered inside scope 'drawHUD'

#1065 [Lines 9085-9091] FUNCTION: 'drawCircle' (Global)
  • Inputs: ctx, posX, posY, radius, color

#1066 [Lines 9094-9293] FUNCTION: 'drawCursors' (Global)
  • Inputs: ctx

#1067 [Lines 9296-9400] FUNCTION: 'drawZoomMap' (Global)
  • Inputs: ctx, blockWidth, position

#1068 [Lines 9403-9574] FUNCTION: 'updateDOM' (Global)

#1069 [Lines 9576-9667] FUNCTION: 'setColorTheme' (Global)

#1070 [Lines 9669-9683] FUNCTION: 'setScreenColorTheme' (Global)

#1071 [Line 9672] ⚡ MUTATION: 'menuTitleColor' altered inside scope 'setScreenColorTheme'

#1072 [Line 9673] ⚡ MUTATION: 'menuOptionColor' altered inside scope 'setScreenColorTheme'

#1073 [Line 9674] ⚡ MUTATION: 'menuValueColor' altered inside scope 'setScreenColorTheme'

#1074 [Line 9675] ⚡ MUTATION: 'menuBorderColor' altered inside scope 'setScreenColorTheme'

#1075 [Line 9676] ⚡ MUTATION: 'menuBackgroundColor' altered inside scope 'setScreenColorTheme'

#1076 [Line 9677] ⚡ MUTATION: 'screenBackgroundColor' altered inside scope 'setScreenColorTheme'

#1077 [Line 9678] ⚡ MUTATION: 'disabledColor' altered inside scope 'setScreenColorTheme'

#1078 [Lines 9686-9693] FUNCTION: 'waitUntilTimePassed' (Global)
  • Inputs: startingTime, timeout
  • Return: true

#1079 [Lines 9697-9708] VARIABLE: 'oscilloscopeData' (let | Scope: Global)

#1080 [Line 9709] VARIABLE: 'oscilloscopeData_isBad' (let | Scope: Global)

#1081 [Lines 9712-9766] FUNCTION: 'startPlotting' (Global)

#1082 [Line 9714] ⚡ MUTATION: 'isPlotting' altered inside scope 'startPlotting'

#1083 [Line 9726] ⚡ MUTATION: 'oscilloscopeData' altered inside scope 'startPlotting'

#1084 [Line 9727] ⚡ MUTATION: 'oscilloscopeData_isBad' altered inside scope 'startPlotting'

#1085 [Line 9735] ⚡ MUTATION: 'oscilloscopeData_isBad' altered inside scope 'startPlotting'

#1086 [Line 9741] ⚡ MUTATION: 'currentCH1Data' altered inside scope 'startPlotting'

#1087 [Line 9744] ⚡ MUTATION: 'oscilloscopeData_isBad' altered inside scope 'startPlotting'

#1088 [Line 9750] ⚡ MUTATION: 'currentCH2Data' altered inside scope 'startPlotting'

#1089 [Line 9753] ⚡ MUTATION: 'oscilloscopeData_isBad' altered inside scope 'startPlotting'

#1090 [Lines 9769-9779] FUNCTION: 'stopPlotting' (Global)

#1091 [Line 9772] ⚡ MUTATION: 'isPlotting' altered inside scope 'stopPlotting'

#1092 [Line 9774] ⚡ MUTATION: 'plotInterval' altered inside scope 'stopPlotting'

#1093 [Line 9775] ⚡ MUTATION: 'appParam_menuPage' altered inside scope 'stopPlotting'

#1094 [Line 9776] ⚡ MUTATION: 'gridRightMargin' altered inside scope 'stopPlotting'

#1095 [Lines 9783-9802] FUNCTION: 'createAvailableSourceTable' (Global)
  • Inputs: includeOption
  • Return: tableSource

#1096 [Lines 9804-9808] FUNCTION: 'functionIsEmpty' (Global)
  • Inputs: fn
  • Return: body.trim().length === 0

#1097 [Lines 9810-9825] FUNCTION: 'toggleMenu' (Global)
  • Inputs: menuPage

#1098 [Line 9813] ⚡ MUTATION: 'appParam_menuPage' altered inside scope 'toggleMenu'

#1099 [Line 9816] ⚡ MUTATION: 'appParam_lastMenu' altered inside scope 'toggleMenu'

#1100 [Line 9817] ⚡ MUTATION: 'appParam_menuPage' altered inside scope 'toggleMenu'

#1101 [Line 9827] FUNCTION: 'actionButton1' (Global)

#1102 [Line 9829] FUNCTION: 'actionButton2' (Global)

#1103 [Line 9831] FUNCTION: 'actionButton3' (Global)

#1104 [Line 9833] FUNCTION: 'actionButton4' (Global)

#1105 [Line 9835] FUNCTION: 'actionButton5' (Global)

#1106 [Line 9837] FUNCTION: 'actionButton6' (Global)

#1107 [Line 9839] FUNCTION: 'actionButton7' (Global)

#1108 [Line 9841] FUNCTION: 'actionButton8' (Global)

#1109 [Line 9843] FUNCTION: 'multiClockwise' (Global)

#1110 [Line 9845] FUNCTION: 'multiCounterClockwise' (Global)

#1111 [Line 9847] FUNCTION: 'multiCenter' (Global)

#1112 [Line 9849] FUNCTION: 'multiButtLeft' (Global)

#1113 [Line 9851] FUNCTION: 'multiButtRight' (Global)

#1114 [Lines 9853-10869] FUNCTION: 'updateMenu' (Global)

#1115 [Line 9857] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1116 [Lines 9861-9863] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1117 [Lines 9867-9869] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1118 [Lines 9873-9875] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1119 [Line 9874] ⚡ MUTATION: 'appParam_dotsLines' altered inside scope 'Anonymous/Callback'

#1120 [Lines 9879-9881] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1121 [Lines 9885-9888] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1122 [Line 9892] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1123 [Line 9896] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1124 [Line 9900] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1125 [Line 9902] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1126 [Line 9903] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1127 [Line 9904] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1128 [Line 9905] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1129 [Line 9910] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1130 [Lines 9914-9918] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1131 [Lines 9922-9927] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1132 [Line 9923] ⚡ MUTATION: 'appParam_FFTSource' altered inside scope 'Anonymous/Callback'

#1133 [Line 9925] ⚡ MUTATION: 'appParam_FFTSource' altered inside scope 'Anonymous/Callback'

#1134 [Lines 9931-9933] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1135 [Lines 9937-9940] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1136 [Line 9938] ⚡ MUTATION: 'appParam_FFTScale' altered inside scope 'Anonymous/Callback'

#1137 [Line 9939] ⚡ MUTATION: 'appParam_FFTUnits' altered inside scope 'Anonymous/Callback'

#1138 [Lines 9944-9946] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1139 [Line 9945] ⚡ MUTATION: 'appParam_FFTWindow' altered inside scope 'Anonymous/Callback'

#1140 [Lines 9950-9952] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1141 [Lines 9956-9958] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1142 [Line 9957] ⚡ MUTATION: 'appParam_FFTPeakUnits' altered inside scope 'Anonymous/Callback'

#1143 [Line 9962] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1144 [Lines 9964-9973] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1145 [Lines 9974-9983] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1146 [Line 9984] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1147 [Line 9985] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1148 [Line 9990] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1149 [Lines 9994-9998] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1150 [Line 9995] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'Anonymous/Callback'

#1151 [Lines 10010-10019] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1152 [Line 10012] ⚡ MUTATION: 'appParam_acquisitionAverageSteps' altered inside scope 'Anonymous/Callback'

#1153 [Line 10015] ⚡ MUTATION: 'appParam_acquisitionEnvelopeOpacity' altered inside scope 'Anonymous/Callback'

#1154 [Line 10017] ⚡ MUTATION: 'appParam_acquisitionSmoothingWindow' altered inside scope 'Anonymous/Callback'

#1155 [Lines 10030-10039] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1156 [Line 10034] ⚡ MUTATION: 'appParam_acquisitionEnvelopePersistence' altered inside scope 'Anonymous/Callback'

#1157 [Line 10037] ⚡ MUTATION: 'appParam_acquisitionSmoothingSteps' altered inside scope 'Anonymous/Callback'

#1158 [Lines 10048-10055] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1159 [Line 10052] ⚡ MUTATION: 'appParam_acquisitionEnvelopeSteps' altered inside scope 'Anonymous/Callback'

#1160 [Lines 10061-10065] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1161 [Lines 10069-10072] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1162 [Line 10070] ⚡ MUTATION: 'appParam_Interpolation' altered inside scope 'Anonymous/Callback'

#1163 [Lines 10076-10078] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1164 [Line 10077] ⚡ MUTATION: 'appParam_InterpolationMethod' altered inside scope 'Anonymous/Callback'

#1165 [Lines 10082-10085] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1166 [Line 10083] ⚡ MUTATION: 'appParam_InterpolationUpsampling' altered inside scope 'Anonymous/Callback'

#1167 [Line 10087] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1168 [Line 10088] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1169 [Line 10089] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1170 [Line 10090] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1171 [Line 10095] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1172 [Lines 10099-10103] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1173 [Line 10101] ⚡ MUTATION: 'appParam_CH1Coupling' altered inside scope 'Anonymous/Callback'

#1174 [Lines 10107-10109] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1175 [Lines 10113-10119] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1176 [Line 10115] ⚡ MUTATION: 'appParam_CH1invertY' altered inside scope 'Anonymous/Callback'

#1177 [Line 10116] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'Anonymous/Callback'

#1178 [Lines 10123-10126] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1179 [Line 10125] ⚡ MUTATION: 'appParam_CH1_LPF' altered inside scope 'Anonymous/Callback'

#1180 [Lines 10130-10132] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1181 [Line 10131] ⚡ MUTATION: 'appParam_CH1_LPFType' altered inside scope 'Anonymous/Callback'

#1182 [Lines 10136-10138] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1183 [Line 10137] ⚡ MUTATION: 'appParam_CH1_LPFOrder' altered inside scope 'Anonymous/Callback'

#1184 [Lines 10142-10144] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1185 [Line 10148] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1186 [Lines 10150-10159] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1187 [Lines 10160-10169] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1188 [Line 10170] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1189 [Line 10171] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1190 [Line 10176] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1191 [Lines 10180-10186] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1192 [Lines 10190-10194] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1193 [Line 10192] ⚡ MUTATION: 'appParam_CH2Coupling' altered inside scope 'Anonymous/Callback'

#1194 [Lines 10198-10200] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1195 [Lines 10204-10210] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1196 [Line 10206] ⚡ MUTATION: 'appParam_CH2invertY' altered inside scope 'Anonymous/Callback'

#1197 [Line 10207] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'Anonymous/Callback'

#1198 [Lines 10214-10217] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1199 [Line 10216] ⚡ MUTATION: 'appParam_CH2_LPF' altered inside scope 'Anonymous/Callback'

#1200 [Lines 10221-10223] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1201 [Line 10222] ⚡ MUTATION: 'appParam_CH2_LPFType' altered inside scope 'Anonymous/Callback'

#1202 [Lines 10227-10229] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1203 [Line 10228] ⚡ MUTATION: 'appParam_CH2_LPFOrder' altered inside scope 'Anonymous/Callback'

#1204 [Lines 10233-10235] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1205 [Lines 10237-10246] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1206 [Lines 10247-10256] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1207 [Line 10257] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1208 [Line 10258] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1209 [Line 10263] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1210 [Lines 10267-10271] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1211 [Lines 10275-10277] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1212 [Line 10276] ⚡ MUTATION: 'appParam_mathOperation' altered inside scope 'Anonymous/Callback'

#1213 [Lines 10281-10286] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1214 [Line 10282] ⚡ MUTATION: 'appParam_mathSourceA' altered inside scope 'Anonymous/Callback'

#1215 [Line 10284] ⚡ MUTATION: 'appParam_mathSourceA' altered inside scope 'Anonymous/Callback'

#1216 [Lines 10290-10295] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1217 [Line 10291] ⚡ MUTATION: 'appParam_mathSourceB' altered inside scope 'Anonymous/Callback'

#1218 [Line 10293] ⚡ MUTATION: 'appParam_mathSourceB' altered inside scope 'Anonymous/Callback'

#1219 [Lines 10299-10301] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1220 [Line 10300] ⚡ MUTATION: 'appParam_mathScale' altered inside scope 'Anonymous/Callback'

#1221 [Line 10305] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1222 [Line 10309] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1223 [Line 10313] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1224 [Line 10315] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1225 [Line 10316] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1226 [Line 10317] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1227 [Line 10318] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1228 [Line 10323] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1229 [Lines 10327-10334] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1230 [Line 10329] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'Anonymous/Callback'

#1231 [Line 10331] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'Anonymous/Callback'

#1232 [Lines 10338-10343] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1233 [Line 10339] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'Anonymous/Callback'

#1234 [Line 10341] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'Anonymous/Callback'

#1235 [Lines 10347-10349] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1236 [Line 10348] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'Anonymous/Callback'

#1237 [Lines 10353-10359] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1238 [Line 10355] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'Anonymous/Callback'

#1239 [Line 10357] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'Anonymous/Callback'

#1240 [Line 10363] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1241 [Line 10367] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1242 [Line 10371] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1243 [Line 10375] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1244 [Line 10377] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1245 [Line 10378] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1246 [Line 10379] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1247 [Line 10380] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1248 [Line 10385] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1249 [Lines 10389-10391] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1250 [Lines 10395-10397] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1251 [Lines 10401-10403] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1252 [Lines 10407-10409] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1253 [Lines 10413-10415] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1254 [Lines 10419-10421] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1255 [Lines 10425-10427] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1256 [Lines 10431-10433] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1257 [Line 10435] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1258 [Line 10436] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1259 [Line 10437] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1260 [Line 10438] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1261 [Line 10443] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1262 [Lines 10447-10449] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1263 [Lines 10453-10457] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1264 [Lines 10461-10466] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1265 [Line 10462] ⚡ MUTATION: 'appParam_triggerEdge' altered inside scope 'Anonymous/Callback'

#1266 [Line 10463] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'Anonymous/Callback'

#1267 [Lines 10470-10474] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1268 [Line 10471] ⚡ MUTATION: 'appParam_triggerStabilize' altered inside scope 'Anonymous/Callback'

#1269 [Lines 10478-10480] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1270 [Line 10479] ⚡ MUTATION: 'appParam_triggerHysteresis' altered inside scope 'Anonymous/Callback'

#1271 [Line 10484] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1272 [Line 10488] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1273 [Line 10492] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1274 [Line 10494] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1275 [Line 10495] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1276 [Line 10496] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1277 [Line 10497] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1278 [Line 10505] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1279 [Lines 10509-10515] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1280 [Line 10510] ⚡ MUTATION: 'appParam_selectedREFBank' altered inside scope 'Anonymous/Callback'

#1281 [Line 10512] ⚡ MUTATION: 'appParam_currentREF_Offset' altered inside scope 'Anonymous/Callback'

#1282 [Line 10513] ⚡ MUTATION: 'appParam_currentREF_horizontalPos' altered inside scope 'Anonymous/Callback'

#1283 [Line 10514] ⚡ MUTATION: 'appParam_currentREF_voltsZoom' altered inside scope 'Anonymous/Callback'

#1284 [Lines 10519-10524] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1285 [Lines 10528-10536] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1286 [Line 10533] ⚡ MUTATION: 'appParam_anyREFEnabled' altered inside scope 'Anonymous/Callback'

#1287 [Line 10534] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'Anonymous/Callback'

#1288 [Line 10535] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'Anonymous/Callback'

#1289 [Lines 10540-10543] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1290 [Lines 10547-10550] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1291 [Lines 10554-10556] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1292 [Line 10560] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1293 [Line 10564] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1294 [Line 10566] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1295 [Line 10567] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1296 [Line 10568] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1297 [Line 10569] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1298 [Line 10574] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1299 [Lines 10578-10581] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1300 [Lines 10585-10587] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1301 [Line 10586] ⚡ MUTATION: 'appParam_bodePlotMode' altered inside scope 'Anonymous/Callback'

#1302 [Lines 10591-10597] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1303 [Line 10593] ⚡ MUTATION: 'appParam_bodePlotStartFreq' altered inside scope 'Anonymous/Callback'

#1304 [Line 10595] ⚡ MUTATION: 'appParam_bodePlotStartFreq' altered inside scope 'Anonymous/Callback'

#1305 [Lines 10601-10607] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1306 [Line 10603] ⚡ MUTATION: 'appParam_bodePlotStopFreq' altered inside scope 'Anonymous/Callback'

#1307 [Line 10605] ⚡ MUTATION: 'appParam_bodePlotStopFreq' altered inside scope 'Anonymous/Callback'

#1308 [Lines 10611-10614] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1309 [Line 10613] ⚡ MUTATION: 'appParam_bodePlotDensity' altered inside scope 'Anonymous/Callback'

#1310 [Lines 10622-10626] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1311 [Line 10625] ⚡ MUTATION: 'appParam_bodePlotAveraging' altered inside scope 'Anonymous/Callback'

#1312 [Lines 10632-10641] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1313 [Line 10645] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1314 [Line 10648] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1315 [Line 10649] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1316 [Line 10650] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1317 [Line 10651] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1318 [Line 10656] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1319 [Lines 10660-10663] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1320 [Line 10661] ⚡ MUTATION: 'appParam_soundEnabled' altered inside scope 'Anonymous/Callback'

#1321 [Lines 10667-10670] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1322 [Line 10668] ⚡ MUTATION: 'appParam_colorTheme' altered inside scope 'Anonymous/Callback'

#1323 [Lines 10674-10677] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1324 [Line 10675] ⚡ MUTATION: 'appParam_screenColorTheme' altered inside scope 'Anonymous/Callback'

#1325 [Lines 10681-10684] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1326 [Lines 10688-10691] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1327 [Line 10689] ⚡ MUTATION: 'appParam_powerOnSettings' altered inside scope 'Anonymous/Callback'

#1328 [Lines 10695-10701] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1329 [Line 10705] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1330 [Line 10709] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1331 [Line 10711] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1332 [Line 10712] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1333 [Line 10713] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1334 [Line 10714] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1335 [Line 10719] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1336 [Lines 10723-10728] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1337 [Line 10724] ⚡ MUTATION: 'appParam_saveRecallOperation' altered inside scope 'Anonymous/Callback'

#1338 [Line 10726] ⚡ MUTATION: 'appParam_saveRecallType' altered inside scope 'Anonymous/Callback'

#1339 [Lines 10732-10737] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1340 [Line 10733] ⚡ MUTATION: 'appParam_saveRecallType' altered inside scope 'Anonymous/Callback'

#1341 [Line 10735] ⚡ MUTATION: 'appParam_saveRecallType' altered inside scope 'Anonymous/Callback'

#1342 [Lines 10751-10770] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1343 [Line 10756] ⚡ MUTATION: 'appParam_waveSaveSource' altered inside scope 'Anonymous/Callback'

#1344 [Line 10758] ⚡ MUTATION: 'appParam_waveSaveSource' altered inside scope 'Anonymous/Callback'

#1345 [Line 10761] ⚡ MUTATION: 'appParam_invertScreenshot' altered inside scope 'Anonymous/Callback'

#1346 [Line 10767] ⚡ MUTATION: 'appParam_waveRecallDest' altered inside scope 'Anonymous/Callback'

#1347 [Lines 10778-10790] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1348 [Line 10794] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1349 [Line 10798] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1350 [Line 10802] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1351 [Line 10806] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1352 [Line 10808] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1353 [Line 10809] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1354 [Line 10810] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1355 [Line 10811] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1356 [Line 10817] ⚡ MUTATION: 'labels_menuTitle' altered inside scope 'updateMenu'

#1357 [Line 10821] ⚡ MUTATION: 'actionButton1' altered inside scope 'updateMenu'

#1358 [Line 10825] ⚡ MUTATION: 'actionButton2' altered inside scope 'updateMenu'

#1359 [Line 10829] ⚡ MUTATION: 'actionButton3' altered inside scope 'updateMenu'

#1360 [Line 10833] ⚡ MUTATION: 'actionButton4' altered inside scope 'updateMenu'

#1361 [Line 10837] ⚡ MUTATION: 'actionButton5' altered inside scope 'updateMenu'

#1362 [Line 10841] ⚡ MUTATION: 'actionButton6' altered inside scope 'updateMenu'

#1363 [Line 10845] ⚡ MUTATION: 'actionButton7' altered inside scope 'updateMenu'

#1364 [Line 10849] ⚡ MUTATION: 'actionButton8' altered inside scope 'updateMenu'

#1365 [Line 10851] ⚡ MUTATION: 'multiClockwise' altered inside scope 'updateMenu'

#1366 [Line 10852] ⚡ MUTATION: 'multiCounterClockwise' altered inside scope 'updateMenu'

#1367 [Line 10853] ⚡ MUTATION: 'multiButtLeft' altered inside scope 'updateMenu'

#1368 [Line 10854] ⚡ MUTATION: 'multiButtRight' altered inside scope 'updateMenu'

#1369 [Line 10859] ⚡ MUTATION: 'appParam_overrideCursors' altered inside scope 'updateMenu'

#1370 [Line 10861] ⚡ MUTATION: 'appParam_overrideCursors' altered inside scope 'updateMenu'

#1371 [Line 10865] ⚡ MUTATION: 'appParam_menuForceDelete' altered inside scope 'updateMenu'

#1372 [Line 10867] ⚡ MUTATION: 'appParam_menuForceDraw' altered inside scope 'updateMenu'

#1373 [Lines 10871-10877] FUNCTION: 'closeAllNonXYMenus' (Global)

#1374 [Line 10873] ⚡ MUTATION: 'appParam_lastMenu' altered inside scope 'closeAllNonXYMenus'

#1375 [Line 10874] ⚡ MUTATION: 'appParam_menuPage' altered inside scope 'closeAllNonXYMenus'

#1376 [Lines 10879-10884] FUNCTION: 'menuButton1' (Global)

#1377 [Lines 10886-10891] FUNCTION: 'menuButton2' (Global)

#1378 [Lines 10893-10898] FUNCTION: 'menuButton3' (Global)

#1379 [Lines 10900-10905] FUNCTION: 'menuButton4' (Global)

#1380 [Lines 10907-10912] FUNCTION: 'menuButton5' (Global)

#1381 [Lines 10914-10919] FUNCTION: 'menuButton6' (Global)

#1382 [Lines 10921-10926] FUNCTION: 'menuButton7' (Global)

#1383 [Lines 10928-10933] FUNCTION: 'menuButton8' (Global)

#1384 [Lines 10935-10941] FUNCTION: 'menuButton9' (Global)

#1385 [Lines 10948-10964] FUNCTION: 'togglePlotting' (Global)

#1386 [Line 10953] ⚡ MUTATION: 'iterateInterval' altered inside scope 'togglePlotting'

#1387 [Line 10961] ⚡ MUTATION: 'iterateInterval' altered inside scope 'togglePlotting'

#1388 [Lines 10966-11006] FUNCTION: 'toggleBodePlotMode' (Global)

#1389 [Line 10975] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'toggleBodePlotMode'

#1390 [Line 10985] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'toggleBodePlotMode'

#1391 [Line 10986] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'toggleBodePlotMode'

#1392 [Line 10987] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'toggleBodePlotMode'

#1393 [Line 10988] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'toggleBodePlotMode'

#1394 [Line 10989] ⚡ MUTATION: 'appParam_bodePlotEnabled' altered inside scope 'toggleBodePlotMode'

#1395 [Line 10993] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'toggleBodePlotMode'

#1396 [Line 10994] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'toggleBodePlotMode'

#1397 [Line 10995] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'toggleBodePlotMode'

#1398 [Line 10996] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'toggleBodePlotMode'

#1399 [Line 10997] ⚡ MUTATION: 'appParam_bodePlotEnabled' altered inside scope 'toggleBodePlotMode'

#1400 [Line 11001] ⚡ MUTATION: 'bodePlotFreqs' altered inside scope 'toggleBodePlotMode'

#1401 [Line 11003] ⚡ MUTATION: 'bodePlotFreqs' altered inside scope 'toggleBodePlotMode'

#1402 [Lines 11008-11038] FUNCTION: 'toggleXYMode' (Global)

#1403 [Line 11017] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'toggleXYMode'

#1404 [Line 11027] ⚡ MUTATION: 'appParam_oscilloscopeMode' altered inside scope 'toggleXYMode'

#1405 [Line 11032] ⚡ MUTATION: 'appParam_oscilloscopeMode' altered inside scope 'toggleXYMode'

#1406 [Lines 11040-11061] FUNCTION: 'toggleSuperXYMode' (Global)
  • Inputs: force

#1407 [Line 11042] ⚡ MUTATION: 'appParam_superXYMode' altered inside scope 'toggleSuperXYMode'

#1408 [Line 11043] ⚡ MUTATION: 'ITERATION_INTERVAL' altered inside scope 'toggleSuperXYMode'

#1409 [Line 11045] ⚡ MUTATION: 'appParam_superXYMode' altered inside scope 'toggleSuperXYMode'

#1410 [Line 11046] ⚡ MUTATION: 'ITERATION_INTERVAL' altered inside scope 'toggleSuperXYMode'

#1411 [Line 11048] ⚡ MUTATION: 'appParam_superXYMode' altered inside scope 'toggleSuperXYMode'

#1412 [Line 11050] ⚡ MUTATION: 'ITERATION_INTERVAL' altered inside scope 'toggleSuperXYMode'

#1413 [Line 11052] ⚡ MUTATION: 'ITERATION_INTERVAL' altered inside scope 'toggleSuperXYMode'

#1414 [Line 11059] ⚡ MUTATION: 'iterateInterval' altered inside scope 'toggleSuperXYMode'

#1415 [Line 11060] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'toggleSuperXYMode'

#1416 [Lines 11064-11071] FUNCTION: 'cycleValueFromTable' (Global)
  • Inputs: variable, table
  • Return: newValue

#1417 [Lines 11074-11081] FUNCTION: 'cycleValueFromTableRev' (Global)
  • Inputs: variable, table
  • Return: newValue

#1418 [Lines 11083-11092] FUNCTION: 'selectChannelCH1' (Global)

#1419 [Line 11087] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'selectChannelCH1'

#1420 [Lines 11094-11107] FUNCTION: 'selectChannelCH2' (Global)

#1421 [Line 11099] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'selectChannelCH2'

#1422 [Lines 11109-11122] FUNCTION: 'selectChannelMATH1' (Global)

#1423 [Line 11114] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'selectChannelMATH1'

#1424 [Lines 11124-11137] FUNCTION: 'selectChannelFFT' (Global)

#1425 [Line 11129] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'selectChannelFFT'

#1426 [Lines 11139-11152] FUNCTION: 'selectChannelREF' (Global)

#1427 [Line 11144] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'selectChannelREF'

#1428 [Lines 11154-11159] FUNCTION: 'resetCursors' (Global)

#1429 [Line 11155] ⚡ MUTATION: 'appParam_cursorX1Pos' altered inside scope 'resetCursors'

#1430 [Line 11156] ⚡ MUTATION: 'appParam_cursorX2Pos' altered inside scope 'resetCursors'

#1431 [Line 11157] ⚡ MUTATION: 'appParam_cursorY1Pos' altered inside scope 'resetCursors'

#1432 [Line 11158] ⚡ MUTATION: 'appParam_cursorY2Pos' altered inside scope 'resetCursors'

#1433 [Lines 11161-11167] FUNCTION: 'zeroLevelTrigger' (Global)
  • Return: showMessage("NOT AVAILABLE IN BODE PLOT MODE", "ALL")

#1434 [Line 11163] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'zeroLevelTrigger'

#1435 [Line 11164] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'zeroLevelTrigger'

#1436 [Lines 11169-11175] FUNCTION: 'set50PercentTrigger' (Global)
  • Return: showMessage("NOT AVAILABLE IN BODE PLOT MODE", "ALL")

#1437 [Line 11171] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'set50PercentTrigger'

#1438 [Line 11172] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'set50PercentTrigger'

#1439 [Lines 11177-11198] FUNCTION: 'toggle50Percent' (Global)

#1440 [Line 11181] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'toggle50Percent'

#1441 [Line 11183] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'toggle50Percent'

#1442 [Line 11187] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'toggle50Percent'

#1443 [Line 11191] ⚡ MUTATION: 'appParam_mathOffset' altered inside scope 'toggle50Percent'

#1444 [Line 11193] ⚡ MUTATION: 'appParam_FFTOffset' altered inside scope 'toggle50Percent'

#1445 [Line 11195] ⚡ MUTATION: 'appParam_currentREF_Offset' altered inside scope 'toggle50Percent'

#1446 [Line 11196] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'toggle50Percent'

#1447 [Lines 11200-11217] FUNCTION: 'toggle50PercentH' (Global)

#1448 [Line 11204] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'toggle50PercentH'

#1449 [Line 11206] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'toggle50PercentH'

#1450 [Line 11208] ⚡ MUTATION: 'appParam_currentREF_horizontalPos' altered inside scope 'toggle50PercentH'

#1451 [Line 11209] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'toggle50PercentH'

#1452 [Line 11211] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'toggle50PercentH'

#1453 [Lines 11219-11221] FUNCTION: 'toggleGridMode' (Global)

#1454 [Line 11220] ⚡ MUTATION: 'appParam_gridMode' altered inside scope 'toggleGridMode'

#1455 [Lines 11223-11225] FUNCTION: 'toggleDisplayMode' (Global)

#1456 [Line 11224] ⚡ MUTATION: 'appParam_displayMode' altered inside scope 'toggleDisplayMode'

#1457 [Lines 11227-11230] FUNCTION: 'toggleLineThickness' (Global)

#1458 [Line 11228] ⚡ MUTATION: 'appParam_lineThickness' altered inside scope 'toggleLineThickness'

#1459 [Line 11229] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'toggleLineThickness'

#1460 [Lines 11232-11235] FUNCTION: 'toggleFFT' (Global)

#1461 [Line 11233] ⚡ MUTATION: 'appParam_FFTEnabled' altered inside scope 'toggleFFT'

#1462 [Line 11234] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'toggleFFT'

#1463 [Lines 11237-11239] FUNCTION: 'toggleFFTFindPeaks' (Global)

#1464 [Line 11238] ⚡ MUTATION: 'appParam_FFTFindPeaks' altered inside scope 'toggleFFTFindPeaks'

#1465 [Lines 11241-11247] FUNCTION: 'setCouplingCH1' (Global)
  • Inputs: mode

#1466 [Line 11242] ⚡ MUTATION: 'action_setCouplingCH1' altered inside scope 'setCouplingCH1'

#1467 [Line 11243] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'setCouplingCH1'

#1468 [Line 11244] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'setCouplingCH1'

#1469 [Lines 11249-11251] FUNCTION: 'toggleCH1Probe' (Global)

#1470 [Line 11250] ⚡ MUTATION: 'appParam_CH1Probe' altered inside scope 'toggleCH1Probe'

#1471 [Lines 11253-11258] FUNCTION: 'toggleCH1BWLimitUnits' (Global)

#1472 [Lines 11260-11265] FUNCTION: 'toggleFFTImpedanceUnits' (Global)

#1473 [Lines 11267-11284] FUNCTION: 'setChannels' (Global)
  • Inputs: numChans

#1474 [Line 11268] ⚡ MUTATION: 'appParam_CH2Enabled' altered inside scope 'setChannels'

#1475 [Line 11272] ⚡ MUTATION: 'action_setChannels' altered inside scope 'setChannels'

#1476 [Line 11273] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'setChannels'

#1477 [Line 11274] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'setChannels'

#1478 [Line 11275] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'setChannels'

#1479 [Line 11276] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'setChannels'

#1480 [Lines 11286-11292] FUNCTION: 'setCouplingCH2' (Global)
  • Inputs: mode

#1481 [Line 11287] ⚡ MUTATION: 'action_setCouplingCH2' altered inside scope 'setCouplingCH2'

#1482 [Line 11288] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'setCouplingCH2'

#1483 [Line 11289] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'setCouplingCH2'

#1484 [Lines 11294-11296] FUNCTION: 'toggleCH2Probe' (Global)

#1485 [Line 11295] ⚡ MUTATION: 'appParam_CH2Probe' altered inside scope 'toggleCH2Probe'

#1486 [Lines 11298-11303] FUNCTION: 'toggleCH2BWLimitUnits' (Global)

#1487 [Lines 11305-11308] FUNCTION: 'toggleTriggerMode' (Global)

#1488 [Line 11306] ⚡ MUTATION: 'appParam_triggerMode' altered inside scope 'toggleTriggerMode'

#1489 [Line 11307] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'toggleTriggerMode'

#1490 [Lines 11310-11317] FUNCTION: 'toggleTriggerSource' (Global)
  • Return: showMessage("NOT AVAILABLE IN BODE PLOT MODE", "ALL")

#1491 [Line 11312] ⚡ MUTATION: 'appParam_triggerSource' altered inside scope 'toggleTriggerSource'

#1492 [Line 11313] ⚡ MUTATION: 'action_setTriggerSource' altered inside scope 'toggleTriggerSource'

#1493 [Line 11314] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'toggleTriggerSource'

#1494 [Lines 11319-11322] FUNCTION: 'toggleTriggerLvlMode' (Global)

#1495 [Line 11320] ⚡ MUTATION: 'appParam_triggerLvlAutoManual' altered inside scope 'toggleTriggerLvlMode'

#1496 [Line 11321] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'toggleTriggerLvlMode'

#1497 [Lines 11324-11327] FUNCTION: 'toggleMath' (Global)

#1498 [Line 11325] ⚡ MUTATION: 'appParam_mathEnabled' altered inside scope 'toggleMath'

#1499 [Line 11326] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'toggleMath'

#1500 [Lines 11329-11333] FUNCTION: 'disableREF' (Global)
  • Inputs: bank

#1501 [Line 11331] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'disableREF'

#1502 [Line 11332] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'disableREF'

#1503 [Lines 11335-11339] FUNCTION: 'resetREFPos' (Global)

#1504 [Line 11336] ⚡ MUTATION: 'appParam_currentREF_horizontalPos' altered inside scope 'resetREFPos'

#1505 [Line 11337] ⚡ MUTATION: 'appParam_currentREF_Offset' altered inside scope 'resetREFPos'

#1506 [Line 11338] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'resetREFPos'

#1507 [Lines 11341-11345] FUNCTION: 'centerREFOnScreen' (Global)

#1508 [Line 11342] ⚡ MUTATION: 'appParam_currentREF_horizontalPos' altered inside scope 'centerREFOnScreen'

#1509 [Line 11343] ⚡ MUTATION: 'appParam_currentREF_Offset' altered inside scope 'centerREFOnScreen'

#1510 [Line 11344] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'centerREFOnScreen'

#1511 [Lines 11347-11358] FUNCTION: 'saveREF' (Global)
  • Inputs: bank

#1512 [Line 11356] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'saveREF'

#1513 [Lines 11360-11371] FUNCTION: 'clearREF' (Global)
  • Inputs: bank

#1514 [Line 11369] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'clearREF'

#1515 [Lines 11373-11384] FUNCTION: 'toggleStopRun' (Global)

#1516 [Line 11375] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'toggleStopRun'

#1517 [Line 11379] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'toggleStopRun'

#1518 [Line 11381] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'toggleStopRun'

#1519 [Line 11383] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'toggleStopRun'

#1520 [Lines 11386-11389] FUNCTION: 'triggerSingle' (Global)

#1521 [Line 11387] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'triggerSingle'

#1522 [Lines 11391-11394] FUNCTION: 'triggerForce' (Global)
  • Return: showMessage("NOT AVAILABLE IN BODE PLOT MODE", "ALL")

#1523 [Line 11393] ⚡ MUTATION: 'action_triggerForce' altered inside scope 'triggerForce'

#1524 [Lines 11396-11404] FUNCTION: 'autoSet' (Global)

#1525 [Line 11397] ⚡ MUTATION: 'action_forceAutoSet' altered inside scope 'autoSet'

#1526 [Line 11398] ⚡ MUTATION: 'appParam_stopRun' altered inside scope 'autoSet'

#1527 [Line 11399] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'autoSet'

#1528 [Line 11400] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'autoSet'

#1529 [Line 11401] ⚡ MUTATION: 'appParam_triggerMode' altered inside scope 'autoSet'

#1530 [Line 11402] ⚡ MUTATION: 'action_triggerForce' altered inside scope 'autoSet'

#1531 [Lines 11406-11433] FUNCTION: 'setupButtonHold' (Global)
  • Inputs: buttonId, callback

#1532 [Lines 11411-11421] FUNCTION: 'start' (Local (in setupButtonHold))

#1533 [Lines 11423-11428] FUNCTION: 'stop' (Local (in setupButtonHold))

#1534 [Lines 11453-11535] CLASS: 'Knob' (Global)

#1535 [Lines 11454-11471] METHOD: 'constructor' (In Class: Knob)
  • Inputs: id, snapInterval, onClockwise, onCounterClockwise

#1536 [Lines 11473-11475] METHOD: 'normalizeAngle' (In Class: Knob)
  • Inputs: angle
  • Return: ((angle % 360) + 360) % 360

#1537 [Lines 11477-11479] METHOD: 'snapAngle' (In Class: Knob)
  • Inputs: angle
  • Return: Math.round(angle / this.snapInterval) * this.snapInterval

#1538 [Lines 11481-11506] METHOD: 'updateKnob' (In Class: Knob)
  • Inputs: angle

#1539 [Lines 11508-11534] METHOD: 'init' (In Class: Knob)

#1540 [Lines 11537-11553] FUNCTION: 'multiButtonLeft' (Global)

#1541 [Line 11540] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'multiButtonLeft'

#1542 [Line 11542] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'multiButtonLeft'

#1543 [Lines 11555-11571] FUNCTION: 'multiButtonRight' (Global)

#1544 [Line 11558] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'multiButtonRight'

#1545 [Line 11560] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'multiButtonRight'

#1546 [Lines 11573-11582] FUNCTION: 'multiKnobCenter' (Global)

#1547 [Lines 11586-11645] FUNCTION: 'knobMultiClockwise' (Global)

#1548 [Line 11593] ⚡ MUTATION: 'appParam_cursorX1Pos' altered inside scope 'knobMultiClockwise'

#1549 [Line 11598] ⚡ MUTATION: 'appParam_cursorX2Pos' altered inside scope 'knobMultiClockwise'

#1550 [Line 11603] ⚡ MUTATION: 'appParam_cursorX1Pos' altered inside scope 'knobMultiClockwise'

#1551 [Line 11604] ⚡ MUTATION: 'appParam_cursorX2Pos' altered inside scope 'knobMultiClockwise'

#1552 [Line 11609] ⚡ MUTATION: 'appParam_cursorY1Pos' altered inside scope 'knobMultiClockwise'

#1553 [Line 11614] ⚡ MUTATION: 'appParam_cursorY2Pos' altered inside scope 'knobMultiClockwise'

#1554 [Line 11619] ⚡ MUTATION: 'appParam_cursorY1Pos' altered inside scope 'knobMultiClockwise'

#1555 [Line 11620] ⚡ MUTATION: 'appParam_cursorY2Pos' altered inside scope 'knobMultiClockwise'

#1556 [Line 11627] ⚡ MUTATION: 'appParam_cursorX1Pos' altered inside scope 'knobMultiClockwise'

#1557 [Line 11630] ⚡ MUTATION: 'appParam_cursorX2Pos' altered inside scope 'knobMultiClockwise'

#1558 [Line 11633] ⚡ MUTATION: 'appParam_cursorY1Pos' altered inside scope 'knobMultiClockwise'

#1559 [Line 11636] ⚡ MUTATION: 'appParam_cursorY2Pos' altered inside scope 'knobMultiClockwise'

#1560 [Lines 11647-11706] FUNCTION: 'knobMultiCounterClockwise' (Global)

#1561 [Line 11654] ⚡ MUTATION: 'appParam_cursorX1Pos' altered inside scope 'knobMultiCounterClockwise'

#1562 [Line 11659] ⚡ MUTATION: 'appParam_cursorX2Pos' altered inside scope 'knobMultiCounterClockwise'

#1563 [Line 11664] ⚡ MUTATION: 'appParam_cursorX1Pos' altered inside scope 'knobMultiCounterClockwise'

#1564 [Line 11665] ⚡ MUTATION: 'appParam_cursorX2Pos' altered inside scope 'knobMultiCounterClockwise'

#1565 [Line 11670] ⚡ MUTATION: 'appParam_cursorY1Pos' altered inside scope 'knobMultiCounterClockwise'

#1566 [Line 11675] ⚡ MUTATION: 'appParam_cursorY2Pos' altered inside scope 'knobMultiCounterClockwise'

#1567 [Line 11680] ⚡ MUTATION: 'appParam_cursorY1Pos' altered inside scope 'knobMultiCounterClockwise'

#1568 [Line 11681] ⚡ MUTATION: 'appParam_cursorY2Pos' altered inside scope 'knobMultiCounterClockwise'

#1569 [Line 11688] ⚡ MUTATION: 'appParam_cursorX1Pos' altered inside scope 'knobMultiCounterClockwise'

#1570 [Line 11691] ⚡ MUTATION: 'appParam_cursorX2Pos' altered inside scope 'knobMultiCounterClockwise'

#1571 [Line 11694] ⚡ MUTATION: 'appParam_cursorY1Pos' altered inside scope 'knobMultiCounterClockwise'

#1572 [Line 11697] ⚡ MUTATION: 'appParam_cursorY2Pos' altered inside scope 'knobMultiCounterClockwise'

#1573 [Lines 11708-11721] FUNCTION: 'knobTriggerLevelClockwise' (Global)

#1574 [Line 11712] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'knobTriggerLevelClockwise'

#1575 [Line 11713] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'knobTriggerLevelClockwise'

#1576 [Lines 11723-11736] FUNCTION: 'knobTriggerLevelCounterClockwise' (Global)

#1577 [Line 11727] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'knobTriggerLevelCounterClockwise'

#1578 [Line 11728] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'knobTriggerLevelCounterClockwise'

#1579 [Lines 11738-11806] FUNCTION: 'knobVoltsDivClockwise' (Global)

#1580 [Line 11745] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'knobVoltsDivClockwise'

#1581 [Line 11746] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'knobVoltsDivClockwise'

#1582 [Line 11747] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'knobVoltsDivClockwise'

#1583 [Line 11757] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'knobVoltsDivClockwise'

#1584 [Line 11758] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'knobVoltsDivClockwise'

#1585 [Line 11759] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'knobVoltsDivClockwise'

#1586 [Line 11794] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'knobVoltsDivClockwise'

#1587 [Lines 11808-11876] FUNCTION: 'knobVoltsDivCounterClockwise' (Global)

#1588 [Line 11815] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'knobVoltsDivCounterClockwise'

#1589 [Line 11816] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'knobVoltsDivCounterClockwise'

#1590 [Line 11817] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'knobVoltsDivCounterClockwise'

#1591 [Line 11827] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'knobVoltsDivCounterClockwise'

#1592 [Line 11828] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'knobVoltsDivCounterClockwise'

#1593 [Line 11829] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'knobVoltsDivCounterClockwise'

#1594 [Line 11864] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'knobVoltsDivCounterClockwise'

#1595 [Lines 11878-11936] FUNCTION: 'knobVerticalPosClockwise' (Global)

#1596 [Line 11884] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'knobVerticalPosClockwise'

#1597 [Line 11891] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'knobVerticalPosClockwise'

#1598 [Line 11900] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'knobVerticalPosClockwise'

#1599 [Line 11909] ⚡ MUTATION: 'appParam_mathOffset' altered inside scope 'knobVerticalPosClockwise'

#1600 [Line 11916] ⚡ MUTATION: 'appParam_FFTOffset' altered inside scope 'knobVerticalPosClockwise'

#1601 [Line 11923] ⚡ MUTATION: 'appParam_currentREF_Offset' altered inside scope 'knobVerticalPosClockwise'

#1602 [Line 11924] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'knobVerticalPosClockwise'

#1603 [Lines 11938-11996] FUNCTION: 'knobVerticalPosCounterClockwise' (Global)

#1604 [Line 11944] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'knobVerticalPosCounterClockwise'

#1605 [Line 11951] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'knobVerticalPosCounterClockwise'

#1606 [Line 11960] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'knobVerticalPosCounterClockwise'

#1607 [Line 11969] ⚡ MUTATION: 'appParam_mathOffset' altered inside scope 'knobVerticalPosCounterClockwise'

#1608 [Line 11976] ⚡ MUTATION: 'appParam_FFTOffset' altered inside scope 'knobVerticalPosCounterClockwise'

#1609 [Line 11983] ⚡ MUTATION: 'appParam_currentREF_Offset' altered inside scope 'knobVerticalPosCounterClockwise'

#1610 [Line 11984] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'knobVerticalPosCounterClockwise'

#1611 [Lines 11998-12037] FUNCTION: 'knobTimeDivClockwise' (Global)

#1612 [Line 12003] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'knobTimeDivClockwise'

#1613 [Line 12004] ⚡ MUTATION: 'appParam_FFTZoom' altered inside scope 'knobTimeDivClockwise'

#1614 [Line 12005] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'knobTimeDivClockwise'

#1615 [Line 12012] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'knobTimeDivClockwise'

#1616 [Line 12013] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'knobTimeDivClockwise'

#1617 [Line 12015] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'knobTimeDivClockwise'

#1618 [Line 12025] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'knobTimeDivClockwise'

#1619 [Line 12026] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'knobTimeDivClockwise'

#1620 [Line 12028] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'knobTimeDivClockwise'

#1621 [Lines 12039-12069] FUNCTION: 'knobTimeDivCounterClockwise' (Global)

#1622 [Line 12044] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'knobTimeDivCounterClockwise'

#1623 [Line 12045] ⚡ MUTATION: 'appParam_FFTZoom' altered inside scope 'knobTimeDivCounterClockwise'

#1624 [Line 12046] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'knobTimeDivCounterClockwise'

#1625 [Line 12049] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'knobTimeDivCounterClockwise'

#1626 [Line 12057] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'knobTimeDivCounterClockwise'

#1627 [Line 12058] ⚡ MUTATION: 'action_resetTriggerAcquisition' altered inside scope 'knobTimeDivCounterClockwise'

#1628 [Line 12060] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'knobTimeDivCounterClockwise'

#1629 [Lines 12071-12118] FUNCTION: 'knobHorizontalPosClockwise' (Global)

#1630 [Line 12077] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'knobHorizontalPosClockwise'

#1631 [Line 12084] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'knobHorizontalPosClockwise'

#1632 [Line 12086] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'knobHorizontalPosClockwise'

#1633 [Line 12095] ⚡ MUTATION: 'appParam_currentREF_horizontalPos' altered inside scope 'knobHorizontalPosClockwise'

#1634 [Line 12096] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'knobHorizontalPosClockwise'

#1635 [Line 12103] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'knobHorizontalPosClockwise'

#1636 [Line 12110] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'knobHorizontalPosClockwise'

#1637 [Lines 12120-12168] FUNCTION: 'knobHorizontalPosCounterClockwise' (Global)

#1638 [Line 12126] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'knobHorizontalPosCounterClockwise'

#1639 [Line 12134] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'knobHorizontalPosCounterClockwise'

#1640 [Line 12136] ⚡ MUTATION: 'appParam_FFTZoomPos' altered inside scope 'knobHorizontalPosCounterClockwise'

#1641 [Line 12145] ⚡ MUTATION: 'appParam_currentREF_horizontalPos' altered inside scope 'knobHorizontalPosCounterClockwise'

#1642 [Line 12146] ⚡ MUTATION: 'action_REFForceUpdate' altered inside scope 'knobHorizontalPosCounterClockwise'

#1643 [Line 12153] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'knobHorizontalPosCounterClockwise'

#1644 [Line 12160] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'knobHorizontalPosCounterClockwise'

#1645 [Lines 12170-12178] FUNCTION: 'toggleSigGen' (Global)
  • Return: showMessage("NOT AVAILABLE IN BODE PLOT MODE", "ALL")

#1646 [Line 12172] ⚡ MUTATION: 'appParam_sigGenEnabled' altered inside scope 'toggleSigGen'

#1647 [Lines 12181-12241] FUNCTION: 'getCalibrationValues' (Global)
  • Inputs: waveArray, waveArray2
  • Return: { interleaveOffset: interleaveOffset, verticalOffset1: verticalOffset1, verticalOffset2: verticalOffset2, noise1: noi...

#1648 [Line 12244] VARIABLE: 'action_calibrate' (let | Scope: Global)

#1649 [Line 12245] VARIABLE: 'hzooms' (let | Scope: Global)

#1650 [Line 12246] VARIABLE: 'vzooms' (let | Scope: Global)

#1651 [Line 12247] VARIABLE: 'calibration_phase' (let | Scope: Global)

#1652 [Line 12248] VARIABLE: 'step1done' (let | Scope: Global)

#1653 [Line 12249] VARIABLE: 'step2done' (let | Scope: Global)

#1654 [Line 12250] VARIABLE: 'calib_wait_counter' (let | Scope: Global)

#1655 [Line 12251] VARIABLE: 'calib_wait_action' (let | Scope: Global)

#1656 [Line 12252] VARIABLE: 'calib_changezoom_action' (let | Scope: Global)

#1657 [Line 12253] VARIABLE: 'calib_iterations' (let | Scope: Global)

#1658 [Line 12254] VARIABLE: 'calibrationTime' (let | Scope: Global)

#1659 [Lines 12256-12502] FUNCTION: 'autoCalibration' (Global)

#1660 [Line 12257] ⚡ MUTATION: 'calibrationTime' altered inside scope 'autoCalibration'

#1661 [Line 12262] ⚡ MUTATION: 'calib_wait_action' altered inside scope 'autoCalibration'

#1662 [Line 12263] ⚡ MUTATION: 'calib_wait_counter' altered inside scope 'autoCalibration'

#1663 [Line 12273] ⚡ MUTATION: 'appParam_CH1Coupling' altered inside scope 'autoCalibration'

#1664 [Line 12277] ⚡ MUTATION: 'appParam_CH2Coupling' altered inside scope 'autoCalibration'

#1665 [Line 12286] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'autoCalibration'

#1666 [Line 12289] ⚡ MUTATION: 'appParam_Interpolation' altered inside scope 'autoCalibration'

#1667 [Line 12292] ⚡ MUTATION: 'appParam_triggerStabilize' altered inside scope 'autoCalibration'

#1668 [Line 12294] ⚡ MUTATION: 'hzooms' altered inside scope 'autoCalibration'

#1669 [Line 12295] ⚡ MUTATION: 'vzooms' altered inside scope 'autoCalibration'

#1670 [Line 12296] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1671 [Line 12297] ⚡ MUTATION: 'calibration_phase' altered inside scope 'autoCalibration'

#1672 [Line 12311] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1673 [Line 12313] ⚡ MUTATION: 'step1done' altered inside scope 'autoCalibration'

#1674 [Line 12314] ⚡ MUTATION: 'step2done' altered inside scope 'autoCalibration'

#1675 [Line 12317] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'autoCalibration'

#1676 [Line 12322] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'autoCalibration'

#1677 [Line 12323] ⚡ MUTATION: 'step1done' altered inside scope 'autoCalibration'

#1678 [Line 12333] ⚡ MUTATION: 'step2done' altered inside scope 'autoCalibration'

#1679 [Line 12344] ⚡ MUTATION: 'vzooms' altered inside scope 'autoCalibration'

#1680 [Line 12346] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1681 [Line 12350] ⚡ MUTATION: 'vzooms' altered inside scope 'autoCalibration'

#1682 [Line 12351] ⚡ MUTATION: 'hzooms' altered inside scope 'autoCalibration'

#1683 [Line 12352] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1684 [Line 12353] ⚡ MUTATION: 'calibration_phase' altered inside scope 'autoCalibration'

#1685 [Line 12359] ⚡ MUTATION: 'vzooms' altered inside scope 'autoCalibration'

#1686 [Line 12360] ⚡ MUTATION: 'hzooms' altered inside scope 'autoCalibration'

#1687 [Line 12361] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1688 [Line 12362] ⚡ MUTATION: 'calibration_phase' altered inside scope 'autoCalibration'

#1689 [Line 12371] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1690 [Line 12373] ⚡ MUTATION: 'step1done' altered inside scope 'autoCalibration'

#1691 [Line 12374] ⚡ MUTATION: 'step2done' altered inside scope 'autoCalibration'

#1692 [Line 12377] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'autoCalibration'

#1693 [Line 12382] ⚡ MUTATION: 'step1done' altered inside scope 'autoCalibration'

#1694 [Line 12392] ⚡ MUTATION: 'step2done' altered inside scope 'autoCalibration'

#1695 [Line 12403] ⚡ MUTATION: 'vzooms' altered inside scope 'autoCalibration'

#1696 [Line 12405] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1697 [Line 12408] ⚡ MUTATION: 'vzooms' altered inside scope 'autoCalibration'

#1698 [Line 12409] ⚡ MUTATION: 'hzooms' altered inside scope 'autoCalibration'

#1699 [Line 12410] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1700 [Line 12411] ⚡ MUTATION: 'calibration_phase' altered inside scope 'autoCalibration'

#1701 [Line 12423] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'autoCalibration'

#1702 [Line 12426] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'autoCalibration'

#1703 [Line 12429] ⚡ MUTATION: 'action_calibrate' altered inside scope 'autoCalibration'

#1704 [Line 12430] ⚡ MUTATION: 'hzooms' altered inside scope 'autoCalibration'

#1705 [Line 12431] ⚡ MUTATION: 'vzooms' altered inside scope 'autoCalibration'

#1706 [Line 12432] ⚡ MUTATION: 'calibration_phase' altered inside scope 'autoCalibration'

#1707 [Line 12433] ⚡ MUTATION: 'step1done' altered inside scope 'autoCalibration'

#1708 [Line 12434] ⚡ MUTATION: 'step2done' altered inside scope 'autoCalibration'

#1709 [Line 12435] ⚡ MUTATION: 'calib_wait_counter' altered inside scope 'autoCalibration'

#1710 [Line 12436] ⚡ MUTATION: 'calib_wait_action' altered inside scope 'autoCalibration'

#1711 [Line 12437] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1712 [Line 12438] ⚡ MUTATION: 'calib_iterations' altered inside scope 'autoCalibration'

#1713 [Line 12456] ⚡ MUTATION: 'appParam_selectedChannel' altered inside scope 'autoCalibration'

#1714 [Line 12459] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'autoCalibration'

#1715 [Line 12462] ⚡ MUTATION: 'action_calibrate' altered inside scope 'autoCalibration'

#1716 [Line 12463] ⚡ MUTATION: 'hzooms' altered inside scope 'autoCalibration'

#1717 [Line 12464] ⚡ MUTATION: 'vzooms' altered inside scope 'autoCalibration'

#1718 [Line 12465] ⚡ MUTATION: 'calibration_phase' altered inside scope 'autoCalibration'

#1719 [Line 12466] ⚡ MUTATION: 'step1done' altered inside scope 'autoCalibration'

#1720 [Line 12467] ⚡ MUTATION: 'step2done' altered inside scope 'autoCalibration'

#1721 [Line 12468] ⚡ MUTATION: 'calib_wait_counter' altered inside scope 'autoCalibration'

#1722 [Line 12469] ⚡ MUTATION: 'calib_wait_action' altered inside scope 'autoCalibration'

#1723 [Line 12470] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1724 [Line 12471] ⚡ MUTATION: 'calib_iterations' altered inside scope 'autoCalibration'

#1725 [Line 12474] ⚡ MUTATION: 'appCalib_1ChannelInterleave' altered inside scope 'autoCalibration'

#1726 [Line 12475] ⚡ MUTATION: 'appCalib_1ChannelOffset' altered inside scope 'autoCalibration'

#1727 [Line 12476] ⚡ MUTATION: 'appCalib_2ChannelOffsetCH1' altered inside scope 'autoCalibration'

#1728 [Line 12477] ⚡ MUTATION: 'appCalib_2ChannelOffsetCH2' altered inside scope 'autoCalibration'

#1729 [Line 12486] ⚡ MUTATION: 'calib_changezoom_action' altered inside scope 'autoCalibration'

#1730 [Line 12488] ⚡ MUTATION: 'appParam_CH1VoltsZoom' altered inside scope 'autoCalibration'

#1731 [Line 12490] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'autoCalibration'

#1732 [Line 12493] ⚡ MUTATION: 'appParam_CH2VoltsZoom' altered inside scope 'autoCalibration'

#1733 [Line 12495] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'autoCalibration'

#1734 [Line 12498] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'autoCalibration'

#1735 [Line 12499] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'autoCalibration'

#1736 [Line 12500] ⚡ MUTATION: 'calib_wait_action' altered inside scope 'autoCalibration'

#1737 [Lines 12505-12507] FUNCTION: 'startCalibration' (Global)

#1738 [Line 12506] ⚡ MUTATION: 'action_calibrate' altered inside scope 'startCalibration'

#1739 [Lines 12509-12511] FUNCTION: 'stopCalibration' (Global)

#1740 [Line 12510] ⚡ MUTATION: 'calibration_phase' altered inside scope 'stopCalibration'

#1741 [Lines 12513-12515] FUNCTION: 'abortCalibration' (Global)

#1742 [Line 12514] ⚡ MUTATION: 'calibration_phase' altered inside scope 'abortCalibration'

#1743 [Line 12517] VARIABLE: 'bodePlotTime' (let | Scope: Global)

#1744 [Lines 12519-12862] FUNCTION: 'performBodePlot' (Global)

#1745 [Line 12521] ⚡ MUTATION: 'bodePlotTime' altered inside scope 'performBodePlot'

#1746 [Lines 12524-12528] ⚡ MUTATION: 'bodePlotAutoScale' altered inside scope 'performBodePlot'

#1747 [Line 12530] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'performBodePlot'

#1748 [Line 12531] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'performBodePlot'

#1749 [Line 12532] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'performBodePlot'

#1750 [Line 12533] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'performBodePlot'

#1751 [Line 12535] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'performBodePlot'

#1752 [Line 12536] ⚡ MUTATION: 'appParam_Interpolation' altered inside scope 'performBodePlot'

#1753 [Line 12538] ⚡ MUTATION: 'appParam_current_horizontalPos' altered inside scope 'performBodePlot'

#1754 [Line 12540] ⚡ MUTATION: 'appParam_CH1Coupling' altered inside scope 'performBodePlot'

#1755 [Line 12542] ⚡ MUTATION: 'appParam_CH1invertY' altered inside scope 'performBodePlot'

#1756 [Line 12543] ⚡ MUTATION: 'appParam_CH1_LPF' altered inside scope 'performBodePlot'

#1757 [Line 12544] ⚡ MUTATION: 'appParam_CH1VoltsZoom' altered inside scope 'performBodePlot'

#1758 [Line 12545] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'performBodePlot'

#1759 [Line 12546] ⚡ MUTATION: 'appParam_CH1Offset' altered inside scope 'performBodePlot'

#1760 [Line 12548] ⚡ MUTATION: 'appParam_CH2Coupling' altered inside scope 'performBodePlot'

#1761 [Line 12550] ⚡ MUTATION: 'appParam_CH2invertY' altered inside scope 'performBodePlot'

#1762 [Line 12551] ⚡ MUTATION: 'appParam_CH2_LPF' altered inside scope 'performBodePlot'

#1763 [Line 12552] ⚡ MUTATION: 'appParam_CH2VoltsZoom' altered inside scope 'performBodePlot'

#1764 [Line 12553] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'performBodePlot'

#1765 [Line 12554] ⚡ MUTATION: 'appParam_CH2Offset' altered inside scope 'performBodePlot'

#1766 [Line 12556] ⚡ MUTATION: 'action_setTriggerSource' altered inside scope 'performBodePlot'

#1767 [Line 12557] ⚡ MUTATION: 'appParam_triggerMode' altered inside scope 'performBodePlot'

#1768 [Line 12558] ⚡ MUTATION: 'appParam_triggerEdge' altered inside scope 'performBodePlot'

#1769 [Line 12559] ⚡ MUTATION: 'appParam_triggerHysteresis' altered inside scope 'performBodePlot'

#1770 [Line 12560] ⚡ MUTATION: 'appParam_triggerLevel' altered inside scope 'performBodePlot'

#1771 [Line 12562] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'performBodePlot'

#1772 [Line 12565] ⚡ MUTATION: 'appParam_bodePlotSweepFreqs' altered inside scope 'performBodePlot'

#1773 [Line 12577] ⚡ MUTATION: 'bodePlotFreqs' altered inside scope 'performBodePlot'

#1774 [Line 12580] ⚡ MUTATION: 'bodePlotIntendedSamples' altered inside scope 'performBodePlot'

#1775 [Line 12581] ⚡ MUTATION: 'bodePlotSweepCounter' altered inside scope 'performBodePlot'

#1776 [Line 12582] ⚡ MUTATION: 'bodePlotGainBuffer' altered inside scope 'performBodePlot'

#1777 [Line 12583] ⚡ MUTATION: 'bodePlotGainDrawBuffer' altered inside scope 'performBodePlot'

#1778 [Line 12584] ⚡ MUTATION: 'bodePlotPhaseBuffer' altered inside scope 'performBodePlot'

#1779 [Line 12591] ⚡ MUTATION: 'appParam_sigGenEnabled' altered inside scope 'performBodePlot'

#1780 [Line 12595] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1781 [Line 12597] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1782 [Line 12599] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1783 [Line 12602] ⚡ MUTATION: 'bodePlot_wait_counter' altered inside scope 'performBodePlot'

#1784 [Line 12603] ⚡ MUTATION: 'action_bodePlotSetAveraging' altered inside scope 'performBodePlot'

#1785 [Line 12606] ⚡ MUTATION: 'bodePlot_step' altered inside scope 'performBodePlot'

#1786 [Line 12634] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'performBodePlot'

#1787 [Line 12635] ⚡ MUTATION: 'bodePlot_wait_counter' altered inside scope 'performBodePlot'

#1788 [Line 12645] ⚡ MUTATION: 'action_setCH1VoltsZoom' altered inside scope 'performBodePlot'

#1789 [Line 12646] ⚡ MUTATION: 'bodePlot_wait_counter' altered inside scope 'performBodePlot'

#1790 [Line 12662] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'performBodePlot'

#1791 [Line 12663] ⚡ MUTATION: 'bodePlot_wait_counter' altered inside scope 'performBodePlot'

#1792 [Line 12673] ⚡ MUTATION: 'action_setCH2VoltsZoom' altered inside scope 'performBodePlot'

#1793 [Line 12674] ⚡ MUTATION: 'bodePlot_wait_counter' altered inside scope 'performBodePlot'

#1794 [Line 12691] ⚡ MUTATION: 'bodePlot_wait_counter' altered inside scope 'performBodePlot'

#1795 [Line 12700] ⚡ MUTATION: 'bodePlot_wait_counter' altered inside scope 'performBodePlot'

#1796 [Line 12710] ⚡ MUTATION: 'action_bodePlotSetAveraging' altered inside scope 'performBodePlot'

#1797 [Line 12712] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1798 [Line 12714] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1799 [Line 12717] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1800 [Line 12720] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1801 [Line 12722] ⚡ MUTATION: 'appParam_acquisitionAverageSteps' altered inside scope 'performBodePlot'

#1802 [Line 12730] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'performBodePlot'

#1803 [Line 12731] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1804 [Line 12733] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'performBodePlot'

#1805 [Line 12787] ⚡ MUTATION: 'bodePlotAutoScale' altered inside scope 'performBodePlot'

#1806 [Line 12791] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'performBodePlot'

#1807 [Line 12803] ⚡ MUTATION: 'action_bodePlotSetAveraging' altered inside scope 'performBodePlot'

#1808 [Line 12805] ⚡ MUTATION: 'bodePlot_wait_counter' altered inside scope 'performBodePlot'

#1809 [Line 12809] ⚡ MUTATION: 'bodePlot_step' altered inside scope 'performBodePlot'

#1810 [Line 12825] ⚡ MUTATION: 'appParam_sigGenEnabled' altered inside scope 'performBodePlot'

#1811 [Line 12826] ⚡ MUTATION: 'action_doBodePlot' altered inside scope 'performBodePlot'

#1812 [Line 12827] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1813 [Line 12829] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'performBodePlot'

#1814 [Line 12830] ⚡ MUTATION: 'appParam_acquisitionAverageSteps' altered inside scope 'performBodePlot'

#1815 [Line 12833] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'performBodePlot'

#1816 [Line 12835] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'performBodePlot'

#1817 [Line 12836] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'performBodePlot'

#1818 [Line 12837] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'performBodePlot'

#1819 [Line 12838] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'performBodePlot'

#1820 [Line 12846] ⚡ MUTATION: 'appParam_sigGenEnabled' altered inside scope 'performBodePlot'

#1821 [Line 12847] ⚡ MUTATION: 'action_doBodePlot' altered inside scope 'performBodePlot'

#1822 [Line 12848] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'performBodePlot'

#1823 [Line 12850] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'performBodePlot'

#1824 [Line 12851] ⚡ MUTATION: 'appParam_acquisitionAverageSteps' altered inside scope 'performBodePlot'

#1825 [Line 12854] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'performBodePlot'

#1826 [Line 12856] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'performBodePlot'

#1827 [Line 12857] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'performBodePlot'

#1828 [Line 12858] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'performBodePlot'

#1829 [Line 12859] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'performBodePlot'

#1830 [Lines 12864-12867] FUNCTION: 'startBodePlot' (Global)

#1831 [Line 12865] ⚡ MUTATION: 'action_doBodePlot' altered inside scope 'startBodePlot'

#1832 [Line 12866] ⚡ MUTATION: 'bodePlot_step' altered inside scope 'startBodePlot'

#1833 [Lines 12869-12890] FUNCTION: 'abortBodePlot' (Global)

#1834 [Line 12870] ⚡ MUTATION: 'action_doBodePlot' altered inside scope 'abortBodePlot'

#1835 [Line 12871] ⚡ MUTATION: 'bodePlot_step' altered inside scope 'abortBodePlot'

#1836 [Line 12876] ⚡ MUTATION: 'appParam_sigGenEnabled' altered inside scope 'abortBodePlot'

#1837 [Line 12877] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'abortBodePlot'

#1838 [Line 12879] ⚡ MUTATION: 'appParam_acquisitionMode' altered inside scope 'abortBodePlot'

#1839 [Line 12880] ⚡ MUTATION: 'appParam_acquisitionAverageSteps' altered inside scope 'abortBodePlot'

#1840 [Line 12883] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'abortBodePlot'

#1841 [Line 12885] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'abortBodePlot'

#1842 [Line 12886] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'abortBodePlot'

#1843 [Line 12887] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'abortBodePlot'

#1844 [Line 12888] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'abortBodePlot'

#1845 [Lines 12892-12916] FUNCTION: 'resetBodePlot' (Global)

#1846 [Line 12893] ⚡ MUTATION: 'bodePlot_step' altered inside scope 'resetBodePlot'

#1847 [Line 12895] ⚡ MUTATION: 'bodePlotIntendedSamples' altered inside scope 'resetBodePlot'

#1848 [Line 12896] ⚡ MUTATION: 'bodePlotSweepCounter' altered inside scope 'resetBodePlot'

#1849 [Line 12897] ⚡ MUTATION: 'bodePlot_averagingCounter' altered inside scope 'resetBodePlot'

#1850 [Line 12898] ⚡ MUTATION: 'bodePlotGainBuffer' altered inside scope 'resetBodePlot'

#1851 [Line 12899] ⚡ MUTATION: 'bodePlotPhaseBuffer' altered inside scope 'resetBodePlot'

#1852 [Line 12900] ⚡ MUTATION: 'bodePlotGainDrawBuffer' altered inside scope 'resetBodePlot'

#1853 [Line 12901] ⚡ MUTATION: 'appParam_bodePlotSweepFreqs' altered inside scope 'resetBodePlot'

#1854 [Line 12902] ⚡ MUTATION: 'bodePlotFreqs' altered inside scope 'resetBodePlot'

#1855 [Lines 12903-12907] ⚡ MUTATION: 'bodePlotAutoScale' altered inside scope 'resetBodePlot'

#1856 [Line 12909] ⚡ MUTATION: 'appParam_current_timeZoomLvl' altered inside scope 'resetBodePlot'

#1857 [Line 12911] ⚡ MUTATION: 'appParam_cursorMode' altered inside scope 'resetBodePlot'

#1858 [Line 12912] ⚡ MUTATION: 'appParam_cursorSource' altered inside scope 'resetBodePlot'

#1859 [Line 12913] ⚡ MUTATION: 'appParam_cursorRefLvl' altered inside scope 'resetBodePlot'

#1860 [Line 12914] ⚡ MUTATION: 'appParam_cursorSelected' altered inside scope 'resetBodePlot'

#1861 [Lines 12918-12936] FUNCTION: 'calculateBodePlotAutoAvg' (Global)
  • Inputs: value, factor
  • Return: 0 | 2 | factor == 1 ? 3 : 4 | factor == 1 ? 4 : 8 | factor == 1 ? 5 : 16 | factor == 1 ? 6 : 32 | factor == 1 ? 7 : 64 | factor == 1 ? 8 : 128

#1862 [Lines 12938-13000] FUNCTION: 'calculateBodePlotGainAutoScale' (Global)
  • Return: { dBPerDiv: 10, topBoundaryDB: 40, offsetDB: 0 } | { dBPerDiv: selectedDBPerDiv, topBoundaryDB: topBoundaryDB, offsetDB: centerDB }

#1863 [Line 12988] ⚡ MUTATION: 'bodePlotGainDrawBuffer' altered inside scope 'calculateBodePlotGainAutoScale'

#1864 [Line 12990] ⚠️  LEAK: 'scaledValue' (Unintended Global)

#1865 [Lines 13002-13015] FUNCTION: 'getBodeDecadeBaseFrequencies' (Global)
  • Return: decadeBases

#1866 [Lines 13017-13024] FUNCTION: 'getNumDecadesFromFreq' (Global)
  • Inputs: startHz, stopHz
  • Return: 1 | Math.round(logStop - logStart)

#1867 [Lines 13026-13037] FUNCTION: 'getLogFreq' (Global)
  • Inputs: position, startFreq, stopFreq
  • Return: Math.pow(10, targetExponent)

#1868 [Lines 13039-13049] FUNCTION: 'toggleRefreshRate' (Global)

#1869 [Line 13040] ⚡ MUTATION: 'appParam_refreshRate' altered inside scope 'toggleRefreshRate'

#1870 [Line 13042] ⚡ MUTATION: 'ITERATION_INTERVAL' altered inside scope 'toggleRefreshRate'

#1871 [Line 13044] ⚡ MUTATION: 'ITERATION_INTERVAL' altered inside scope 'toggleRefreshRate'

#1872 [Line 13047] ⚡ MUTATION: 'iterateInterval' altered inside scope 'toggleRefreshRate'

#1873 [Line 13048] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'toggleRefreshRate'

#1874 [Line 13052] VARIABLE: 'ghostAudioCtx' (let | Scope: Global)

#1875 [Line 13053] VARIABLE: 'oscillator' (let | Scope: Global)

#1876 [Lines 13056-13071] FUNCTION: 'playGhostAudio' (Global)

#1877 [Line 13059] ⚡ MUTATION: 'ghostAudioCtx' altered inside scope 'playGhostAudio'

#1878 [Line 13060] ⚡ MUTATION: 'oscillator' altered inside scope 'playGhostAudio'

#1879 [Lines 13074-13092] FUNCTION: 'stopGhostAudio' (Global)

#1880 [Line 13083] ⚡ MUTATION: 'oscillator' altered inside scope 'stopGhostAudio'

#1881 [Line 13087] ⚡ MUTATION: 'ghostAudioCtx' altered inside scope 'Anonymous/Callback'

#1882 [Lines 13095-13124] FUNCTION: 'playBeep' (Global)

#1883 [Lines 13127-13158] FUNCTION: 'playClick' (Global)

#1884 [Lines 13162-13165] FUNCTION: 'toggleTestSection' (Global)

#1885 [Lines 13167-13169] FUNCTION: 'test01' (Global)

#1886 [Line 13168] ⚡ MUTATION: 'action_rollModeReset' altered inside scope 'test01'

#1887 [Lines 13171-13304] FUNCTION: 'init' (Global)

#1888 [Line 13174] ⚡ MUTATION: 'appParam_colorTheme' altered inside scope 'init'

#1889 [Line 13180] ⚡ MUTATION: 'appParam_isFocused' altered inside scope 'Anonymous/Callback'

#1890 [Line 13183] ⚡ MUTATION: 'appParam_isFocused' altered inside scope 'Anonymous/Callback'

=== EXTRACTION COMPLETE ===
-> JavaScript source asset saved to: app_report_clean_extracted.js
-> Parsed structural HTML layout saved to: app_report_clean_extracted.html

