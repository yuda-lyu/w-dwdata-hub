import Parser from 'rss-parser'
import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import toDatetimeUTC8 from './toDatetimeUTC8.mjs'


//本函數之預設抓取設定, 因YouTube等站台之RSS會回傳暫時性404故將404納入重試範圍
let DFLT = {
    responseType: 'text',
    timeout: 30000,
    maxRetries: 5,
    baseDelayMs: 3000,
    maxDelayMs: 15000,
    retryStatus: [404],
    label: 'fetch-rss',
}


/**
 * 抓取RSS訂閱源
 *
 * 支援RSS與Atom, 並轉為統一格式, 時間欄位一律轉為UTC+8之'YYYY-MM-DD HH:mm:ss'字串;
 * 因YouTube等站台之RSS會回傳暫時性404, 故404亦納入重試範圍
 *
 * @param {String} rssUrl 輸入RSS網址字串，須為http或https
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Integer} [opt.timeout=30000] 輸入單次請求逾時毫秒整數，預設30000
 * @param {Integer} [opt.maxRetries=5] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設5
 * @param {Integer} [opt.baseDelayMs=3000] 輸入重試之線性退避基礎毫秒整數，預設3000
 * @param {Integer} [opt.maxDelayMs=15000] 輸入重試之線性退避上限毫秒整數，預設15000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示重試訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳項目物件陣列，各物件為{url,time,title,description,from}，網址無效或抓取失敗時reject回傳錯誤物件
 * @example
 *
 * import fetchRSS from './src/fetchRSS.mjs'
 *
 * let test = async () => {
 *
 *     let rs = await fetchRSS('https://www.ptt.cc/atom/Gossiping.xml')
 *     console.log(rs.length, rs[0])
 *     // => 20 { url: 'https://...', time: '2026-08-07 09:02:03', title: '...', description: '...', from: '...' }
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchRSS(rssUrl, opt = {}) {

    //check
    if (!isestr(rssUrl) || !/^https?:\/\//i.test(rssUrl)) {
        throw new Error('rssUrl 須為有效的 http/https RSS 網址')
    }

    //xml
    let xml = await fetchWithRetry(rssUrl, getOptFetch(opt, DFLT))

    //feed
    let parser = new Parser()
    let feed = await parser.parseString(xml)

    //feedFrom
    let feedFrom = String(get(feed, 'title', '') || '').trim()

    //items
    let items = get(feed, 'items')
    if (!isearr(items)) {
        items = []
    }

    return items.map((item) => {
        return {
            url: String(get(item, 'link', '') || '').trim(),
            time: toDatetimeUTC8(get(item, 'isoDate', '') || get(item, 'pubDate', '')),
            title: String(get(item, 'title', '') || '').trim(),
            description: String(get(item, 'contentSnippet', '') || get(item, 'summary', '') || '').trim(),
            from: String(get(item, 'creator', '') || feedFrom).trim(),
        }
    })
}


export default fetchRSS
