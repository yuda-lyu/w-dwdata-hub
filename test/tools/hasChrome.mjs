import wpw from 'w-playwright'


/**
 * 檢核執行環境是否有可供Playwright以channel為'chrome'啟動之Chrome
 *
 * 用於測試中判斷是否跳過須實際啟動瀏覽器之案例，避免無Chrome環境誤報失敗；
 * 以w-playwright之findSystemChrome判定執行檔是否存在(可由環境變數CHROME_PATH指定)，不啟動瀏覽器(Chromium系瀏覽器每啟動一次即可能觸發Windows之錯誤密碼計數)；
 * 只判存在，不代表可啟動
 *
 * @returns {Promise} 回傳Promise，resolve回傳是否有Chrome之布林值
 * @example
 *
 * import hasChrome from './tools/hasChrome.mjs'
 *
 * console.log(await hasChrome())
 * // => true
 *
 */
async function hasChrome() {
    return wpw.findSystemChrome({ executablePath: process.env.CHROME_PATH }) !== ''
}


export default hasChrome
