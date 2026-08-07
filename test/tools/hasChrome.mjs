import { chromium } from 'playwright'


/**
 * 檢核執行環境是否可用Playwright啟動Chrome(channel為'chrome')
 *
 * 用於測試中判斷是否跳過須實際啟動瀏覽器之案例，避免無Chrome環境誤報失敗
 *
 * @returns {Promise} 回傳Promise，resolve回傳是否可用之布林值
 * @example
 *
 * import hasChrome from './tools/hasChrome.mjs'
 *
 * console.log(await hasChrome())
 * // => true
 *
 */
async function hasChrome() {
    let browser = null
    try {
        browser = await chromium.launch({
            headless: true,
            executablePath: process.env.CHROME_PATH || undefined,
            channel: 'chrome',
        })
        return true
    }
    catch {
        return false
    }
    finally {
        if (browser) {
            await browser.close().catch(() => {})
        }
    }
}


export default hasChrome
