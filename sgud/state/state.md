# 狀態(現況)

本檔記當前已開發功能之最新狀態:各功能做到哪裡、對應之規則帳本條目與測試檔、已知缺口與待辦、最近一次驗證或發布之版本.規則帳本(`sgud/rule/rulebook.md`)為藍圖、本檔為現況,兩者比對即知尚未做到者.接續工作時先讀此檔;只記現況,不寫過程(過程寫入`sgud/exp/experience.md`).

- 最近一次驗證:2026-11-13,全套 200 passing／0 failing／0 pending(含真 Chrome 2 案);`package.json` 版本 1.0.37,本輪改動未提交、未發布.
- 瀏覽器啟動:已改經 `w-playwright`(`^1.0.1`,帶入 `playwright-core` 1.64.1),本套件不再直接依賴 `playwright`／`playwright-core`.

## 功能與測試對照

| 功能(`src/`) | 做到哪裡 | 規則帳本 | 測試檔 |
|---|---|---|---|
| `fetchMops`(公開資訊觀測站重大訊息) | 完成;系統 Chrome 經 `w-playwright` 啟動;啟動重試上限 2 次;啟動失敗之 `Error` 帶 `code` | R-DWH-PW-01～04 | `test/fetchMops.test.mjs`(真 Chrome 2 案)、`test/unit-fetchMopsLaunch.test.mjs`(替身 14 案) |
| `fetchRSS`、`fetchHackerNews`、`fetchAiNewsAggregator` | 完成(一般新聞;`fetchRSS` 之 curl 模式經 `w-fetch-web`) | — | `test/<函數名>.test.mjs` |
| `fetchCnyes`、`fetchMoneydj`、`fetchStatementdog` | 完成(台股新聞) | — | 同上 |
| `fetchTwseStock`、`fetchTpexStock`、`fetchTwseMargin`、`fetchTpexMargin`、`fetchTwseT86`、`fetchTpex3insti`、`fetchTaifex`、`fetchTwDataHoliday` | 完成(台股資料) | — | 同上 |
| `fetchAisixiang`、`fetchGuancha` | 完成(中文評論網站;`fetchGuancha` 經 `w-fetch-web` 之 curl) | — | 同上 |
| 共用:`fetchWithRetry`、`getOptFetch`、`isYmd`、`toRocDate`、`toDatetimeUTC8`、`decodeEntities`、`htmlToMarkdown`、`stripHtml`、`extractDivContent`、`parseIntComma`、`safeFilename` | 完成,不對外匯出 | — | 同名 `test/<名>.test.mjs`、`test/WDwdataHub.test.mjs`(匯出清單) |

## 已知缺口與待辦

- `dist/`、`docs/dist/` 為上一版建置(仍含 `require("playwright")`),於發布時由發布列自動重產,非待辦.
- 現有測試檔名未依 `unit-`／`api-`／`e2e-` 前綴分層(新增者 `unit-fetchMopsLaunch.test.mjs` 依前綴);既有檔不重新命名.
- 啟動重試上限(2 次)為本套件主責之決定,使用端若要求維持原 `maxRetries` 次數須另行裁示(見 R-DWH-PW-02).
- 真 Chrome／Edge 之守門驗證由 `w-playwright` 之 `api-realChromeGuard` 負責;本套件之真 Chrome 案例僅作端對端確認,未獨立驗證各瀏覽器版本.
