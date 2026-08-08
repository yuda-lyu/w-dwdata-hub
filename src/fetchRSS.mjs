import Parser from 'rss-parser'
import fetchWebByCurl from 'w-fetch-web/src/fetchWebByCurl.mjs'
import get from 'lodash-es/get.js'
import isbol from 'wsemi/src/isbol.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import toDatetimeUTC8 from './toDatetimeUTC8.mjs'
import stripHtml from './stripHtml.mjs'


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
 * 以curl取回XML
 *
 * 委派w-fetch-web之fetchWebByCurl, 失敗時拋出帶statusCode之錯誤(與fetchWithRetry之錯誤形狀一致, 供上層統一處理)。
 * 注意: fetchWebByCurl之參數名為timeoutMs(非timeout), 且其重試退避為內建之3至15秒線性,
 * 故opt之baseDelayMs、maxDelayMs與retryStatus於curl模式不生效
 *
 * @param {String} rssUrl 輸入RSS網址字串
 * @param {Object} cfg 輸入已正規化之抓取設定物件
 * @returns {Promise} 回傳Promise，resolve回傳XML字串
 */
async function getXmlByCurl(rssUrl, cfg) {

    let r = await fetchWebByCurl(rssUrl, {
        timeoutMs: cfg.timeout,
        maxRetries: cfg.maxRetries,
    })
    if (r.status !== 'success') {
        let err = new Error(r.message || 'curl fetch failed')
        err.statusCode = r.httpCode
        err.reason = r.reason
        err.url = rssUrl
        throw err
    }

    return r.html
}


/**
 * 依method分派取回XML
 *
 * @param {String} rssUrl 輸入RSS網址字串
 * @param {String} method 輸入抓取方式字串，可為'fetch'、'curl'、'auto'
 * @param {Object} cfg 輸入已正規化之抓取設定物件
 * @returns {Promise} 回傳Promise，resolve回傳XML字串
 */
async function getXml(rssUrl, method, cfg) {

    if (method === 'curl') {
        return await getXmlByCurl(rssUrl, cfg)
    }

    if (method === 'auto') {
        try {
            return await getXmlByCurl(rssUrl, cfg)
        }
        catch (err) {
            //curl不可用(系統無curl)或該站擋curl時退回fetch
            return await fetchWithRetry(rssUrl, cfg)
        }
    }

    return await fetchWithRetry(rssUrl, cfg)
}


/**
 * 抓取RSS訂閱源
 *
 * 支援RSS與Atom, 並轉為統一格式, 時間欄位一律轉為UTC+8之'YYYY-MM-DD HH:mm:ss'字串;
 * 因YouTube等站台之RSS會回傳暫時性404, 故404亦納入重試範圍(僅fetch模式)。
 *
 * 部分站台(如以TLS指紋阻擋非瀏覽器用戶端者)對node內建fetch回403、對curl回200,
 * 此時可指定opt.method為'curl'改走系統curl, 或'auto'先curl失敗再退回fetch;
 * curl模式需系統PATH內有curl, 且重試退避由w-fetch-web內建(3至15秒線性),
 * opt之baseDelayMs、maxDelayMs與retryStatus於curl模式不生效, 極短之feed(小於100字元)會被curl模式判為empty-response
 *
 * @param {String} rssUrl 輸入RSS網址字串，須為http或https
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.method='fetch'] 輸入抓取方式字串，可為'fetch'(node內建fetch)、'curl'(系統curl)、'auto'(curl優先失敗退回fetch)，預設'fetch'
 * @param {Boolean} [opt.withContent=false] 輸入是否於各項目附加content欄布林值，true時依content:encoded、content、summary、description之優先序取feed內嵌全文並去除HTML標籤與實體，預設false
 * @param {Integer} [opt.timeout=30000] 輸入單次請求逾時毫秒整數，預設30000
 * @param {Integer} [opt.maxRetries=5] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設5
 * @param {Integer} [opt.baseDelayMs=3000] 輸入重試之線性退避基礎毫秒整數(僅fetch模式生效)，預設3000
 * @param {Integer} [opt.maxDelayMs=15000] 輸入重試之線性退避上限毫秒整數(僅fetch模式生效)，預設15000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示重試訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳項目物件陣列，各物件為{url,time,title,description,from}，withContent為true時另含content欄，網址無效或抓取失敗時reject回傳錯誤物件
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
 *     //擋node fetch之站台改走curl, 並取feed內嵌全文
 *     let rs2 = await fetchRSS('https://alphaarchitect.com/feed', { method: 'curl', withContent: true })
 *     console.log(rs2.length, rs2[0].content.length)
 *     // => 5 2093
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

    //method
    let method = get(opt, 'method')
    if (method !== 'curl' && method !== 'auto') {
        method = 'fetch' //預設維持原行為
    }

    //withContent
    let withContent = get(opt, 'withContent')
    if (!isbol(withContent)) {
        withContent = false
    }

    //xml
    let xml = await getXml(rssUrl, method, getOptFetch(opt, DFLT))

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

        let r = {
            url: String(get(item, 'link', '') || '').trim(),
            time: toDatetimeUTC8(get(item, 'isoDate', '') || get(item, 'pubDate', '')),
            title: String(get(item, 'title', '') || '').trim(),
            description: String(get(item, 'contentSnippet', '') || get(item, 'summary', '') || '').trim(),
            from: String(get(item, 'creator', '') || feedFrom).trim(),
        }

        //content, 取feed內嵌全文, 依content:encoded、content、summary、description優先序
        //content:encoded為RSS content模組之全文欄(如WordPress系), arXiv系全文則在content(源自description)
        if (withContent) {
            r.content = stripHtml(
                get(item, 'content:encoded', '') ||
                get(item, 'content', '') ||
                get(item, 'summary', '') ||
                get(item, 'description', '')
            )
        }

        return r
    })
}


export default fetchRSS
