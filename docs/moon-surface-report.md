# 真實全球月面修訂驗收

日期：2026-10-20（臺灣時間）。

## 完成內容
- NASA CGI Moon Kit 2019全球色彩圖4096×2048，涵蓋正面、背面與兩極，取代程序斑紋；由LOLA真實高程建立4K法線，無地形誇大，輪廓維持球形。
- 太空月球、地球觀測窗、全螢幕HUD、大型月面窗共用月面資產、月球本體姿態及照明著色。保留真實日期天平動、地心黃道北向上／當地天頂投影。
- 新增月球近看，拖曳繞月與縮放；進入全螢幕保留近看，播放時跟隨月球。月海與隕石坑標示可切換，背面及重疊名稱隱藏。
- 月面全亮閱讀有明確非實際照明提示，不改相位／食象／可見性。右上角HUD始終維持實際模型照明。
- 大型地球月面窗可由設定→月面開啟，或在一般觀測窗雙擊／按Enter；Esc／關閉返回。無WebGL仍可CPU繪製同一月面及日期。

## 檢核工具與結果
- Astronomy Engine 2.1.19：真實日期位置與IAU月球姿態。NASA LROC／LOLA：全球表面與高程。科學幾何保持純函式，不從影像反推月相或食象。
- Vitest：49/49測試通過（9檔），含既有軌道／相位／食象／地平線與RK4檢核；新增本體座標、經緯度方向、影像雙線性取樣、IAU朝地半球與天平動、天頂退化及月食／閱讀照明分離測試。見moon-unit-report.json。
- Playwright 1.56.1／Chromium 141.0.7390.37：月面專項8/8組通過，零pageerror及主流程console error。四主要月相、正反面、月食紅化、全亮模式、鏡頭不改地球所見、鍵盤、大型觀測窗及無WebGL替代操作皆檢查。見moon-playwright.json。
- GPU／CPU同位置比較：依同一模型參數取6個樣本，普通與全亮各3點，RGB最大差1/255（允差6/255），見moon-render-comparison.json。此為渲染一致性檢查，不是從像素判斷科學狀態。
- 五尺寸：1440×900、1024×768、390×844、320×568、844×390，月面設定、近看、全螢幕及大型觀測窗無捲軸／裁切。
- 日期回歸17/17通過，含當地地平線、日月食案例時間、保存匯出及拒絕儲存／WebGL替代。地球地圖五尺寸操作及太陽播放／減少動態回歸通過。獨立紀錄為moon-date-regression.json、moon-earth-regression.json、moon-solar-regression.json。
- 全頁版面635個狀態通過，零越界、捲軸、內容裁切及執行錯誤，見moon-layout-audit.json。測試產生的歷史檔案已還原，保留本次獨立紀錄。
- TypeScript與正式Vite建置成功；Three.js chunk約501.86KB（gzip125.56KB），建置有超過500KB的建議拆分警告。

## 效能實測與未通過項目
裝置：11th Gen Intel(R) Core(TM) i5-11500 @ 2.70GHz，Windows win32 10.0.26200。Chromium實際使用ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)，為軟體GPU。只有一個驗收瀏覽器執行，1440×900 DPR1，本機Vite、資產暖快取；全螢幕月球近看加右上角實際月相，1模擬天／實秒。暖機4秒，量測約5.01秒、114個rAF。
平均22.65FPS、中位幀耗時50.0ms、P95 50.1ms；自動3D畫素倍率0.50。**未達桌面50FPS目標**，不標為通過。軟體光柵化、4K表面取樣、兩個視角繪製及觀測窗複製有成本；此量測不是GPU timer，也不能取代實際硬體測試。原始條件與數據見moon-performance.json，可執行tests/moon-performance.mjs重現。
首次月面資產合計13,588,554 bytes（約13.6MB），需等候下載／解碼；提供載入及失敗提示。CPU像素資料只在替代模式／取樣檢查時建立，正常顯示避免額外像素記憶體。

## 科學與裝置限制
NASA貼圖為經處理的靜態視覺化資料，非所選日期實況。極區細節較低；4K大致數公里／像素。高程法線只改局部明暗，不含坑緣自遮蔽、形狀位移、精密月緣食象或大氣光譜；最低亮度及月食紅色為教學近似。月相k與食象仍用獨立幾何計算。
教學模式維持短期同步自轉／固定月軸近似；真實模式使用IAU近似，不是JPL精密定向／地形預報。未測實體平板、Safari、Firefox；實機硬體效能仍待驗證。

## 資料完整性與重建
NASA說明：https://svs.gsfc.nasa.gov/4720/ 。原始主機逾時，改由固定GitHub鏡像取得同名TIFF；逐段確認Content-Range／長度並比對完整Git blob SHA1，原始與衍生SHA256見moon-map-sources.json。工具tools/build-moon-map.py需要Python、Pillow及NumPy，不增加網站執行依賴或外部API。來源與署名見public/THIRD_PARTY_NOTICES.txt。

## 截圖
- moon-phase-0.png至moon-phase-3.png：新月、上弦、滿月、下弦。
- moon-fullscreen-{1440,1024,390,320,844}.png：全亮近看與保持實際照明的HUD。
- moon-space-farside.png：繞到背面觀察不同地貌。
- moon-detail-{1440,1024,390,320,844}.png及moon-observer-detail.png：大型地球觀測月面。
- moon-lunar-eclipse.png：月食紅化與滿月受光比例分離。
- moon-cpu-fallback.png：無WebGL的真實月面替代顯示。

驗收修正紀錄：地球舊測試曾把新增的5個月面標籤也算入洲洋數量，已限定地理標籤範圍再重跑通過；午夜測試最初有一項未通過，獨立前景測試可正常跨日，之後明確把分頁切到前景並以模擬2.2秒涵蓋兩次更新週期，完整17項重跑通過。沒有把初次失敗覆寫成未重測的通過。
