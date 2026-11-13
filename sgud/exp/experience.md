# 累積經驗

本檔為執行工作時特有之累積經驗,留給後續之嘗試、執行與判斷,由agent自行編列、擴充與維護.過長時抽出舊者為`experience_<年月日>.md`,並於本檔註明何時抽出.

## 改經 w-playwright 啟動瀏覽器(2026-11-13)

- **修前碼無法再執行,先紅後綠改以變異驗證**:`package.json` 本就未宣告 `playwright`(靠 `w-fetch-web` 舊版提升),升 `w-fetch-web` 後 `node_modules` 已無 `playwright`,修前之 `fetchMops.mjs` 連載入都失敗,且修前之真瀏覽器測試依紀律不得跑.故新測試的「紅」改在 `./tmp/<案名>/mut/` 之副本植入變異取得(不改 repo 內檔案):逐一做「不經 `wpw`」、「取消重試上限」、「拒絕類亦重試」、「不帶 `code`」、「不傳 `funLog`」、「不送 `executablePath`」、「`args` 少 `--no-sandbox`」,各變異皆有測試轉紅,無變異對照全綠.變異點字串須在原檔恰出現 1 次,否則腳本拋錯.變異副本放在 `./tmp/` 內即可解析 repo 根之 `node_modules`,不需目錄連結.
- **替身層仍會讀登入守門**:環境變數 `W_PLAYWRIGHT_LOGON_GUARD=1` 時,即使以 `setBrowserTypeForTest` 替身取代 BrowserType,`launchChromium` 在呼叫替身前仍讀一次目前使用者之錯誤密碼次數(`channel: 'chrome'` 屬非 headless shell),故替身測試每案約多 0.1 秒,且錯誤次數 ≥1 時這些測試會以 `E_LOGON_GUARD` 失敗——這是預期的拒絕,不是測試缺陷.
- **拒絕類錯誤碼的取得**:替身測試要驗「不重試」時,不必真造 `E_LOGON_GUARD`;設 `SELENIUM_REMOTE_URL` 即可使 `w-playwright` 在呼叫替身之前以 `E_ENV` 拒絕(替身呼叫 0 次),測後須還原環境變數.以 `console.warn` 攔截計算 `[Retry` 行數即可判斷有無重試,不必以計時推論.
- **`E_BROWSER_MISSING` 在本套件不可達**:`E_BROWSER_MISSING` 僅用於 Playwright 受管瀏覽器缺檔,本套件固定給 `channel: 'chrome'`(系統通道),缺 Chrome 時為 `E_LAUNCH`,仍會被重試(上限 2 次).
- **`findSystemChrome` 只判存在**:取代真啟動探測後,「有 Chrome 但無法啟動」之環境不再被自動跳過,真 Chrome 案例會失敗而非略過.
- **真 Chrome 案例的節奏**:`test/fetchMops.test.mjs` 之 2 案各約 7～9 秒;`mocha --parallel` 下與替身測試檔在不同行程,替身測試只讀錯誤次數、不啟動瀏覽器,不影響真啟動序列.
