import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import cint from 'wsemi/src/cint.mjs'
import delay from 'wsemi/src/delay.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import toDatetimeUTC8 from './toDatetimeUTC8.mjs'


//鉅亨網(Anue)台股新聞列表API
let API_URL = 'https://api.cnyes.com/media/api/v1/newslist/category/tw_stock'


//鉅亨網新聞內容頁網址前綴
let NEWS_URL = 'https://news.cnyes.com/news/id'


//本函數之預設抓取設定
let DFLT = {
    timeout: 30000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    retryStatus: [403],
    label: 'fetch-cnyes',
}


//預設值
let DEFAULT_PAGE_DELAY_MS = 500
let DEFAULT_TARGET_TOTAL = 100
let DEFAULT_PAGE_LIMIT = 30
let DEFAULT_DAYS_BACK = 10


/**
 * 抓取鉅亨網台股新聞
 *
 * 逐頁抓取鉅亨網tw_stock分類新聞直至達到targetTotal或無更多資料, 頁間預設間隔500毫秒以降低限流風險;
 * 時間欄位一律轉為UTC+8之'YYYY-MM-DD HH:mm:ss'字串, 單筆publishAt缺漏或異常時該筆time退回空字串並記錄, 不影響其餘新聞
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.url='https://api.cnyes.com/media/api/v1/newslist/category/tw_stock'] 輸入新聞列表API網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.targetTotal=100] 輸入目標新聞則數正整數，預設100
 * @param {Integer} [opt.pageLimit=30] 輸入單頁請求則數正整數，預設30
 * @param {Integer} [opt.daysBack=10] 輸入回溯天數正整數，預設10
 * @param {Integer} [opt.pageDelayMs=500] 輸入頁間延遲毫秒整數，預設500
 * @param {Integer} [opt.timeout=30000] 輸入單次請求逾時毫秒整數，預設30000
 * @param {Integer} [opt.maxRetries=10] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入重試之線性退避基礎毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入重試之線性退避上限毫秒整數，預設30000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳新聞物件陣列，各物件為{time,title,link}，抓取失敗時reject回傳錯誤物件
 * @example
 *
 * import fetchCnyes from './src/fetchCnyes.mjs'
 *
 * let test = async () => {
 *
 *     let rs = await fetchCnyes({ targetTotal: 30 })
 *     console.log(rs.length, rs[0])
 *     // => 30 { time: '2026-08-07 09:02:03', title: '...', link: 'https://news.cnyes.com/news/id/1234567' }
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchCnyes(opt = {}) {

    //url
    let url = get(opt, 'url')
    if (!isestr(url)) {
        url = API_URL
    }

    //targetTotal
    let targetTotal = get(opt, 'targetTotal')
    if (!ispint(targetTotal)) {
        targetTotal = DEFAULT_TARGET_TOTAL
    }
    else {
        targetTotal = cint(targetTotal)
    }

    //pageLimit
    let pageLimit = get(opt, 'pageLimit')
    if (!ispint(pageLimit)) {
        pageLimit = DEFAULT_PAGE_LIMIT
    }
    else {
        pageLimit = cint(pageLimit)
    }

    //daysBack
    let daysBack = get(opt, 'daysBack')
    if (!ispint(daysBack)) {
        daysBack = DEFAULT_DAYS_BACK
    }
    else {
        daysBack = cint(daysBack)
    }

    //pageDelayMs
    let pageDelayMs = get(opt, 'pageDelayMs')
    if (!isp0int(pageDelayMs)) {
        pageDelayMs = DEFAULT_PAGE_DELAY_MS
    }
    else {
        pageDelayMs = cint(pageDelayMs)
    }

    //optFetch
    let optFetch = getOptFetch(opt, DFLT)
    let showLog = optFetch.showLog

    //now, startAt
    let now = Math.floor(Date.now() / 1000)
    let startAt = now - 86400 * daysBack

    if (showLog) {
        console.log('Starting to fetch Anue (tw_stock) news...')
    }

    let allItems = []
    let page = 1
    while (allItems.length < targetTotal) {

        //qs
        let qs = new URLSearchParams({
            page: String(page),
            limit: String(pageLimit),
            isCategoryHeadline: '1',
            startAt: String(startAt),
            endAt: String(now),
        })

        //data
        let data = await fetchWithRetry(`${url}?${qs.toString()}`, optFetch)

        //items
        let items = get(data, 'items.data')
        if (!isearr(items)) {
            if (showLog) {
                console.log('No more items found.')
            }
            break
        }

        allItems = allItems.concat(items)
        if (showLog) {
            console.log(`Page ${page}: Fetched ${items.length} items. Total so far: ${allItems.length}`)
        }
        page++

        await delay(pageDelayMs)

    }

    //finalItems
    let finalItems = allItems.slice(0, targetTotal)
    if (showLog) {
        console.log(`Total items collected: ${finalItems.length}`)
    }

    return finalItems.map((item) => {

        //time, 單筆publishAt缺漏或異常時退回空字串並記錄, 保留title與link避免拖垮其餘正常新聞
        let time = toDatetimeUTC8(get(item, 'publishAt', 0))
        if (time === '' && showLog) {
            console.warn(`[fetch-cnyes] 時間格式化失敗(newsId=${get(item, 'newsId', '')}, publishAt=${get(item, 'publishAt', '')}) — 該筆time退回空字串`)
        }

        return {
            time,
            title: get(item, 'title', ''),
            link: `${NEWS_URL}/${get(item, 'newsId', '')}`,
        }
    })
}


export default fetchCnyes
