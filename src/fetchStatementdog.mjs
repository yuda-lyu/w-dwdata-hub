import * as cheerio from 'cheerio'
import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'


//財報狗最新新聞頁
let PAGE_URL = 'https://statementdog.com/news/latest'


//本函數之預設抓取設定
let DFLT = {
    responseType: 'text',
    timeout: 30000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    retryStatus: [403],
    label: 'fetch-statementdog',
}


//主要selector, 對應財報狗現行版型
let PRIMARY_ITEM = '.statementdog-news-list-item'
let PRIMARY_TITLE = '.statementdog-news-list-item-title'
let PRIMARY_LINK = '.statementdog-news-list-item-link'
let PRIMARY_DATE = '.statementdog-news-list-item-date'


//備援selector, 財報狗改版導致主要selector失效時改用之通用結構
let FALLBACK_ITEM = 'article, .news-item, [class*="news"][class*="item"]'
let FALLBACK_TITLE = 'h2, h3, [class*="title"]'
let FALLBACK_LINK = 'a[href]'
let FALLBACK_DATE = 'time, [class*="date"], [class*="time"]'


/**
 * 抓取財報狗最新新聞
 *
 * 以cheerio解析財報狗最新新聞頁, 主要selector失效時自動改用通用結構備援selector;
 * 相對路徑連結會補上來源網址之origin, 抓取到0筆時視為版型改變而拋出錯誤(不重試)
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.url='https://statementdog.com/news/latest'] 輸入新聞頁網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.timeout=30000] 輸入單次請求逾時毫秒整數，預設30000
 * @param {Integer} [opt.maxRetries=10] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入重試之線性退避基礎毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入重試之線性退避上限毫秒整數，預設30000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳新聞物件陣列，各物件為{time,title,link}，抓取失敗或解析到0筆時reject回傳錯誤物件
 * @example
 *
 * import fetchStatementdog from './src/fetchStatementdog.mjs'
 *
 * let test = async () => {
 *
 *     let rs = await fetchStatementdog()
 *     console.log(rs.length, rs[0])
 *     // => 30 { time: '2026-08-07', title: '...', link: 'https://statementdog.com/news/...' }
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchStatementdog(opt = {}) {

    //url
    let url = get(opt, 'url')
    if (!isestr(url)) {
        url = PAGE_URL
    }

    //optFetch
    let optFetch = getOptFetch(opt, DFLT)
    let showLog = optFetch.showLog

    if (showLog) {
        console.log(`Fetching ${url}...`)
    }

    //html
    let html = await fetchWithRetry(url, optFetch)

    //origin, 由來源網址推得, 供補齊相對路徑連結
    let origin = new URL(url).origin

    //$
    let $ = cheerio.load(html)

    //usePrimary
    let usePrimary = $(PRIMARY_ITEM).length > 0
    let itemSel = usePrimary ? PRIMARY_ITEM : FALLBACK_ITEM
    let titleSel = usePrimary ? PRIMARY_TITLE : FALLBACK_TITLE
    let linkSel = usePrimary ? PRIMARY_LINK : FALLBACK_LINK
    let dateSel = usePrimary ? PRIMARY_DATE : FALLBACK_DATE
    if (!usePrimary && showLog) {
        console.warn('主要 CSS selector 未匹配，嘗試 fallback selector...')
    }

    //newsItems
    let newsItems = []
    $(itemSel).each((index, element) => {

        let titleElement = $(element).find(titleSel)
        let linkElement = usePrimary ? $(element).find(linkSel) : $(element).find(linkSel).first()
        let timeElement = $(element).find(dateSel)

        let title = titleElement.text().trim()
        let link = linkElement.attr('href')
        let time = timeElement.text().trim()

        if (!title || !link) {
            return
        }

        //補齊相對路徑連結
        if (!link.startsWith('http')) {
            link = `${origin}${link.startsWith('/') ? '' : '/'}${link}`
        }

        newsItems.push({ time, title, link })
    })

    if (showLog) {
        console.log(`Extracted News Items: ${newsItems.length}`)
    }

    //check, 0筆代表版型改變或selector失效, 屬非暫時性錯誤故不重試
    if (newsItems.length === 0) {
        throw new Error('抓取到 0 筆新聞，可能是頁面結構改變或 selector 失效，請確認財報狗頁面是否正常。')
    }

    return newsItems
}


export default fetchStatementdog
