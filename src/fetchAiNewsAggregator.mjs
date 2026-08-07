import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import toDatetimeUTC8 from './toDatetimeUTC8.mjs'


//AI News Aggregator近24小時彙整檔網址
let DATA_URL = 'https://raw.githubusercontent.com/SuYxh/ai-news-aggregator/refs/heads/main/data/latest-24h.json'


//本函數之預設抓取設定
let DFLT = {
    timeout: 30000,
    maxRetries: 5,
    baseDelayMs: 3000,
    maxDelayMs: 15000,
    label: 'fetch-ai-news-aggregator',
}


/**
 * 抓取AI News Aggregator新聞
 *
 * 由SuYxh/ai-news-aggregator專案之latest-24h.json取得近24小時AI新聞, 並轉為統一格式,
 * 時間欄位一律轉為UTC+8之'YYYY-MM-DD HH:mm:ss'字串
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.url='https://raw.githubusercontent.com/SuYxh/ai-news-aggregator/refs/heads/main/data/latest-24h.json'] 輸入來源網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.timeout=30000] 輸入單次請求逾時毫秒整數，預設30000
 * @param {Integer} [opt.maxRetries=5] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設5
 * @param {Integer} [opt.baseDelayMs=3000] 輸入重試之線性退避基礎毫秒整數，預設3000
 * @param {Integer} [opt.maxDelayMs=15000] 輸入重試之線性退避上限毫秒整數，預設15000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示重試訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳新聞物件陣列，各物件為{url,time,title,description,from}，抓取失敗時reject回傳錯誤物件
 * @example
 *
 * import fetchAiNewsAggregator from './src/fetchAiNewsAggregator.mjs'
 *
 * let test = async () => {
 *
 *     let rs = await fetchAiNewsAggregator()
 *     console.log(rs.length, rs[0])
 *     // => 120 { url: 'https://...', time: '2026-08-07 09:02:03', title: '...', description: '', from: 'Hacker News' }
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchAiNewsAggregator(opt = {}) {

    //url
    let url = get(opt, 'url')
    if (!isestr(url)) {
        url = DATA_URL
    }

    //data
    let data = await fetchWithRetry(url, getOptFetch(opt, DFLT))

    //rawItems
    let rawItems = get(data, 'items')
    if (!isearr(rawItems)) {
        rawItems = []
    }

    return rawItems.map((item) => {
        return {
            url: String(get(item, 'url', '') || '').trim(),
            time: toDatetimeUTC8(get(item, 'published_at', '')),
            title: String(get(item, 'title', '') || '').trim(),
            description: '',
            from: String(get(item, 'source', '') || '').trim(),
        }
    })
}


export default fetchAiNewsAggregator
