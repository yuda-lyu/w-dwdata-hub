import * as cheerio from 'cheerio'
import get from 'lodash-es/get.js'
import isfun from 'wsemi/src/isfun.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import cint from 'wsemi/src/cint.mjs'
import delay from 'wsemi/src/delay.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'


//MoneyDJ台股新聞(MB06)列表頁, 頁碼接於index1之後
let BASE_URL = 'https://www.moneydj.com/kmdj/news/newsreallist.aspx?a=mb06&index1='


//本函數之預設抓取設定
let DFLT = {
    responseType: 'text',
    timeout: 30000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    retryStatus: [403],
    label: 'fetch-moneydj',
}


//預設抓取頁數
let DEFAULT_TOTAL_PAGES = 50


//頁間隨機延遲之下限與變動範圍毫秒
let PAGE_DELAY_MIN_MS = 1000
let PAGE_DELAY_RANGE_MS = 2000


//列表頁時間欄位格式, 例如'08/07 09:02'、'09:02'、'昨 09:02'
let REG_TIME = /^(\d{2}\/\d{2}\s+\d{2}:\d{2}|\d{2}:\d{2}|昨\s*\d{2}:\d{2})$/


/**
 * 抓取MoneyDJ台股新聞
 *
 * 逐頁抓取MoneyDJ台股新聞(MB06)列表, 頁間隨機延遲1至3秒以降低被封鎖風險;
 * 單頁抓取失敗(重試耗盡)時記錄並跳過該頁, 不中斷整體抓取; 全部頁面皆0筆時拋出錯誤
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.baseUrl='https://www.moneydj.com/kmdj/news/newsreallist.aspx?a=mb06&index1='] 輸入列表頁網址前綴字串，頁碼會直接串接於後，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.totalPages=50] 輸入要抓取的頁數正整數，預設50
 * @param {Integer} [opt.timeout=30000] 輸入單次請求逾時毫秒整數，預設30000
 * @param {Integer} [opt.maxRetries=10] 輸入每頁最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入重試基礎延遲毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入重試最大延遲毫秒整數，預設30000
 * @param {Integer} [opt.pageDelayMs] 輸入頁間延遲毫秒整數，未給時採隨機1000至3000毫秒
 * @param {Function} [opt.onPageDone] 輸入每頁完成時之回呼函數，傳入(pageIndex,itemCount,totalPages)
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳新聞物件陣列，各物件為{time,title,link}，抓取到0筆時reject回傳錯誤物件
 * @example
 *
 * import fetchMoneydj from './src/fetchMoneydj.mjs'
 *
 * let test = async () => {
 *
 *     let rs = await fetchMoneydj({ totalPages: 2 })
 *     console.log(rs.length, rs[0])
 *     // => 60 { time: '08/07 09:02', title: '...', link: 'https://www.moneydj.com/kmdj/news/...' }
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchMoneydj(opt = {}) {

    //baseUrl
    let baseUrl = get(opt, 'baseUrl')
    if (!isestr(baseUrl)) {
        baseUrl = BASE_URL
    }

    //totalPages
    let totalPages = get(opt, 'totalPages')
    if (!ispint(totalPages)) {
        totalPages = DEFAULT_TOTAL_PAGES
    }
    else {
        totalPages = cint(totalPages)
    }

    //onPageDone
    let onPageDone = get(opt, 'onPageDone')
    if (!isfun(onPageDone)) {
        onPageDone = () => {}
    }

    //optFetch
    let optFetch = getOptFetch(opt, DFLT)
    let showLog = optFetch.showLog

    //pageDelayMs, 頁間隨機延遲毫秒
    let pageDelayMs = get(opt, 'pageDelayMs')
    if (!ispint(pageDelayMs) && pageDelayMs !== 0) {
        pageDelayMs = null
    }
    else {
        pageDelayMs = cint(pageDelayMs)
    }

    //domain, 由列表頁網址推得, 供補齊相對路徑連結
    let domain = new URL(baseUrl).origin

    //fetchPage
    let fetchPage = async (pageIndex) => {

        //html, MoneyDJ已確認使用UTF-8編碼(多次實測結果正確), 無需Big5解碼
        let html = await fetchWithRetry(`${baseUrl}${pageIndex}`, { ...optFetch, label: `${DFLT.label} Page ${pageIndex}` })

        //$
        let $ = cheerio.load(html)

        //newsItems
        let newsItems = []
        $('tr').each((i, el) => {

            let $row = $(el)
            let timeText = $row.find('td').eq(0).text().trim()
            let $link = $row.find('td').eq(1).find('a')

            if (timeText && REG_TIME.test(timeText) && $link.length > 0) {
                let title = $link.attr('title') || $link.text().trim()
                let linkRel = $link.attr('href')
                if (linkRel) {
                    let link = linkRel.startsWith('http') ? linkRel : domain + linkRel
                    newsItems.push({ time: timeText, title, link })
                }
            }

        })

        return newsItems
    }

    let allNewsItems = []
    for (let i = 1; i <= totalPages; i++) {

        //items, 單頁失敗記錄並跳過, 不中斷整體抓取
        let items = null
        try {
            items = await fetchPage(i)
        }
        catch (err) {
            if (showLog) {
                console.warn(`[Page ${i}] 抓取失敗，已跳過：${err.message}`)
            }
            continue
        }
        allNewsItems = allNewsItems.concat(items)

        onPageDone(i, items.length, totalPages)

        //頁間延遲, 未指定pageDelayMs時採隨機1至3秒以降低被封鎖風險
        if (i < totalPages) {
            await delay(pageDelayMs === null ? Math.floor(Math.random() * PAGE_DELAY_RANGE_MS) + PAGE_DELAY_MIN_MS : pageDelayMs)
        }

    }

    //check, 0筆代表版型改變或selector失效
    if (allNewsItems.length === 0) {
        throw new Error('抓取到 0 筆新聞，可能是頁面結構改變或 selector 失效，請確認 MoneyDJ 頁面是否正常。')
    }

    return allNewsItems
}


export default fetchMoneydj
