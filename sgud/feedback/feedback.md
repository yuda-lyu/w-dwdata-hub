# 回饋

本檔記任務中發現之自有套件、全域技能、全域設定之調整與抽提提案;只增不改,處置結果另記一列並寫明承接哪一列.回饋是紀錄與提案,實際修改走各自之通報管道.過長時依`role-writer-sgud`§3整理.

| # | 日期 | 類別 | 對象 | 內容 | 依據 |
|---|---|---|---|---|---|
| 1 | 2026-11-13 | 自有套件 | w-playwright | 建議導出「啟動錯誤是否可重試」之判定(或於 README 明列哪些 `code` 屬暫時性),使用端之重試迴圈不必各自硬編 `E_LAUNCH`／`E_LAUNCH_TIMEOUT` 清單;`w-playwright` 新增錯誤碼時,硬編清單會悄悄失準(拒絕類被重試,或暫時性錯誤不被重試) | `src/fetchMops.mjs` 之 `RETRYABLE_LAUNCH_CODES`;`w-playwright` README〈API〉錯誤碼表 |
| 2 | 2026-11-13 | 全域技能 | role-coder-for-test(或 role-coder-for-validate) | 修前碼無法執行(相依已被移除,或依紀律不得啟動真瀏覽器)時,「改動之測試先紅後綠」缺少標準作法.本輪以 `./tmp/` 內之副本逐一植入變異、以 mocha json reporter 解析紅綠、不改 repo 內檔案取得證據,可復用於多個套件;建議增列此作法與範本腳本 | `sgud/exp/experience.md` 2026-11-13 條目(變異共 7 種,各轉紅,無變異對照全綠) |
