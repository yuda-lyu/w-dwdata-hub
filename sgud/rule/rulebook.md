# 規則帳本

本檔為套件設計與開發階段之規則帳本(藍圖),為要求程式碼須長成什麼樣,或由規格產出之測試(項目/說明/流程)有哪些,包含軸、單一擁有者、已知限制、破壞性變更紀錄,以及對應是哪些測試檔案或指令等,由agent自行編列、擴充與維護.當前已做到哪些記於`sgud/state/state.md`.過長時依類型拆為`rulebook_<類型>.md`,本檔只留索引.

## 一、瀏覽器啟動(Chromium系一律經 w-playwright)

背景:Windows 上 Chromium 系瀏覽器(真 Chrome 153 起、完整 Chromium、Edge)每啟動一個新的根行程,即以錯誤密碼替目前使用者呼叫一次 `LogonUser`(錯誤密碼次數 +1),10 分鐘內 10 次即鎖住帳號.`w-playwright` 於每次啟動合併出恰一串 `--disable-features`(含守門功能 `AutofillAiWalletPrivatePasses`)並統一 Playwright 版本;使用端一律經它啟動,不直接依賴 `playwright`／`playwright-core`.

### R-DWH-PW-01 啟動一律經 w-playwright,且單一啟動點

- 規則:本套件 `src`、`test`、`toolg` 不得以靜態匯入、動態 `import()` 或 `require` 引用 `playwright`／`playwright-core`;瀏覽器只經 `import wpw from 'w-playwright'` 之 `wpw.launchChromium`／`wpw.launchChromiumPersistent` 啟動(不深層匯入 `w-playwright/src/*`).`src` 內啟動點收斂為單一內部函數 `launchBrowser`(`src/fetchMops.mjs`).
- 盤點指令(命中數須為 0;`dist/`、`docs/dist/` 為發布時自動產製之副本,不列入):
  - `rg -n --glob '*.{mjs,js}' --glob '!**/node_modules/**' --glob '!**/dist/**' "(from\s+|import\(\s*|require\(\s*)['\"\`]playwright(-core)?['\"\`/]" src test toolg`
  - `rg -n "\"playwright(-core)?\"\s*:" package.json`
  - 防空集合:同一正則對 `w-playwright` 套件之 `src/_pw.mjs` 必命中 2 處.
- 啟動點全集(`rg -n "wpw\.(launchChromium|launchChromiumPersistent)\(" src`):

  | 站點 | 說明 | 判準 |
  |---|---|---|
  | `src/fetchMops.mjs` `launchBrowser` | `wpw.launchChromium({ headless:true, executablePath: CHROME_PATH, channel:'chrome', args:['--no-sandbox','--disable-setuid-sandbox'], timeout })` | 已套 |
  | `test/tools/hasChrome.mjs` | 以 `wpw.findSystemChrome({ executablePath: CHROME_PATH })` 判斷 Chrome 是否存在,不啟動瀏覽器 | 已套(不啟動) |

- 接線測試(R-PW-WIRING,`test/unit-fetchMopsLaunch.test.mjs`,以 `wpw.setBrowserTypeForTest` 替身,不啟動瀏覽器):斷言替身確被呼叫(次數 >0)、`args` 最後一個元素為恰一串之 `--disable-features=` 且含 `AutofillAiWalletPrivatePasses`、`ignoreDefaultArgs` 為去掉 Playwright 預設之那一串、`headless`／`channel`／`executablePath`(`CHROME_PATH`)／`timeout`／原 `args` 原樣送出.至少一案不用替身:`test/fetchMops.test.mjs` 之 2 個真 Chrome 案例.
- 變異驗證:把 `launchBrowser` 改為不經 `wpw`、或改變送出之選項,上列接線測試須轉紅(做法見經驗檔).

### R-DWH-PW-02 啟動重試與錯誤契約

- 規則:
  1. 啟動重試次數 = `min(opt.maxRetries, 2)`(最多啟動 3 次;原為 `maxRetries`,預設最多 11 次).`opt.maxRetries` 對頁面導航與查詢之重試不變.理由:Chromium 系每次啟動根行程皆可能觸發一次錯誤密碼計數,守門若因瀏覽器改版而失效,一次呼叫內之啟動次數須遠低於門檻(10).
  2. 只重試 `w-playwright` 之 `E_LAUNCH`、`E_LAUNCH_TIMEOUT`;其餘(`E_ARG`、`E_ENV`、`E_PW_VERSION`、`E_LOGON_GUARD`、`E_BROWSER_MISSING`、`E_INSTALL`,或無 `code` 者)重試不會成功,立即 reject.
  3. reject 之 `Error` 訊息為 `瀏覽器啟動失敗（已重試 N 次）: <w-playwright固定詞彙訊息>`,並帶 `code`(`w-playwright` 之錯誤碼);Playwright 原錯誤只經 `funLog` 交出,`opt.useShowLog` 為 `true` 時以 `console.warn` 印出.
- 測試:`test/unit-fetchMopsLaunch.test.mjs`〈啟動重試〉8 案;各規則皆經變異驗證(取消上限、拒絕類亦重試、不帶 code、不傳 `funLog` 各轉紅).
- 狀態:已套.

### R-DWH-PW-03 依賴宣告與建置

- 規則:`package.json` 之 `dependencies` 宣告 `w-playwright`(`^1.0.1`),不宣告 `playwright`／`playwright-core`(本套件原即未宣告,靠依賴樹提升);`w-fetch-web` 取 `^1.0.44` 以上(其啟動亦經 `w-playwright`).`toolg/gDistRollup.mjs` 之 `external`、`globals` 以 `'w-playwright'` 取代 `'playwright'`,依發布與建置腳本之標準寫法(`'./src'`、`'./dist'`,選項寫於本檔).
- 盤點:`rg -n "playwright" package.json toolg/gDistRollup.mjs`;`npm ls w-playwright playwright-core` 應見單一份 `w-playwright@1.x`、`playwright-core@1.64.1`(精確版,由 `w-playwright` 帶入).
- 驗證:以副本於 `./tmp/` 執行 `toolg/gDistRollup.mjs`,產出之 UMD 含 `require("w-playwright")`、不含 `playwright` 之直接 `require`/`chromium.launch`,且 `require` 該 UMD 可載入、`fetchMops` 為函數.
- 狀態:已套.

### R-DWH-PW-04 啟動真瀏覽器之測試紀律

- 規則:
  1. 會啟動真 Chrome 之測試只有 `test/fetchMops.test.mjs` 之 2 個案例(`fetchMops` 每呼叫啟動一次,故無法同檔共用;皆 `maxRetries: 0`);判斷「有無 Chrome」一律用 `hasChrome()`(`findSystemChrome`,不啟動瀏覽器),不以真啟動探測.
  2. 其餘測試(含新增)不得啟動真 Chrome／Edge／完整 Chromium;以 `setBrowserTypeForTest` 替身驗證選項與重試.
  3. 在 Windows 跑上列 2 案前後,讀目前使用者之錯誤密碼次數(`w-playwright/test/tools/readBadPassword.mjs`),須為 0 且前後無增量;可設環境變數 `W_PLAYWRIGHT_LOGON_GUARD=1`,由 `w-playwright` 於每次啟動前檢查(≥1 即 `E_LOGON_GUARD` 拒絕).此環境變數開啟時,替身測試之每次 `launchChromium` 也會讀一次次數(約 0.1 秒,唯讀).
  4. 不得移除或覆寫 `W_PLAYWRIGHT_LOGON_GUARD`;`PWDEBUG`、`SELENIUM_REMOTE_URL` 不得設定(`w-playwright` 以 `E_ENV` 拒絕).

## 二、測試檔對照(改動範圍 → 測試檔)

| 改動範圍 | 測試檔 |
|---|---|
| `src/fetchMops.mjs` 之啟動(`launchBrowser`)、重試、錯誤契約 | `test/unit-fetchMopsLaunch.test.mjs`、`test/fetchMops.test.mjs`(真 Chrome 2 案) |
| `test/tools/hasChrome.mjs` | `test/unit-fetchMopsLaunch.test.mjs`〈hasChrome〉 |
| `src/fetchMops.mjs` 之 payload、查詢與重試(頁面內) | `test/fetchMops.test.mjs` |
| `src/WDwdataHub.mjs`(匯出清單) | `test/WDwdataHub.test.mjs` |
| 其他 `src/fetch*.mjs` 與共用函數 | 同名 `test/<名>.test.mjs` |
| 依賴、`toolg/` | 副本建 dist 驗證(R-DWH-PW-03) |

全套:`npm test`(`mocha --parallel "test/*.test.mjs" --timeout 180000`),會啟動真 Chrome 2 次.

## 三、破壞性變更紀錄

- 改經 `w-playwright` 啟動:`fetchMops` 啟動重試上限改為 2 次(原 `maxRetries`)、拒絕類錯誤不重試、啟動失敗之 `Error` 帶 `code` 且訊息改為 `w-playwright` 之固定詞彙(不再含 Playwright 原錯誤訊息)、`PWDEBUG`／`SELENIUM_REMOTE_URL` 環境下拒絕啟動(`E_ENV`).
