import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import cint from 'wsemi/src/cint.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import toDatetimeUTC8 from './toDatetimeUTC8.mjs'


//Hacker News官方Firebase API
let API_BASE = 'https://hacker-news.firebaseio.com/v0'


//本函數之預設抓取設定
let DFLT = {
    timeout: 30000,
    maxRetries: 5,
    baseDelayMs: 3000,
    maxDelayMs: 15000,
    label: 'fetch-hacker-news',
}


//預設取回篇數與取詳情之併發數
let DEFAULT_LIMIT = 30
let CONCURRENCY = 10


/**
 * 抓取Hacker News最新文章
 *
 * 先取newstories.json之ID清單, 再分批(每批10筆)取各篇詳情並轉為統一格式;
 * 分批採Promise.allSettled, 單篇重試耗盡不會拖垮同批其他已成功文章;
 * 僅保留type為story者, 無外部連結時以Hacker News站內討論頁網址替代
 *
 * @param {Integer} [limit=30] 輸入取回文章數量正整數，非正整數時改用預設值，預設30
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.apiBase='https://hacker-news.firebaseio.com/v0'] 輸入API根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.timeout=30000] 輸入單次請求逾時毫秒整數，預設30000
 * @param {Integer} [opt.maxRetries=5] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設5
 * @param {Integer} [opt.baseDelayMs=3000] 輸入重試之線性退避基礎毫秒整數，預設3000
 * @param {Integer} [opt.maxDelayMs=15000] 輸入重試之線性退避上限毫秒整數，預設15000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示重試訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳文章物件陣列，各物件為{url,time,title,description,from}，抓取ID清單失敗時reject回傳錯誤物件
 * @example
 *
 * import fetchHackerNews from './src/fetchHackerNews.mjs'
 *
 * let test = async () => {
 *
 *     let rs = await fetchHackerNews(5)
 *     console.log(rs.length, rs[0])
 *     // => 5 { url: 'https://...', time: '2026-08-07 09:02:03', title: '...', description: '', from: 'Hacker News' }
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchHackerNews(limit = DEFAULT_LIMIT, opt = {}) {

    //limit, 非正整數(如NaN或<=0)時改用預設值, 避免slice(0,NaN)靜默回傳空陣列
    limit = ispint(limit) ? cint(limit) : DEFAULT_LIMIT

    //apiBase
    let apiBase = get(opt, 'apiBase')
    if (!isestr(apiBase)) {
        apiBase = API_BASE
    }
    apiBase = apiBase.replace(/\/+$/, '')

    //optFetch
    let optFetch = getOptFetch(opt, DFLT)

    //ids, 取得最新文章ID列表
    let ids = await fetchWithRetry(`${apiBase}/newstories.json`, optFetch)
    if (!isearr(ids)) {
        ids = []
    }
    let selected = ids.slice(0, limit)

    //items, 批次取得文章詳情並控制併發數
    let items = []
    for (let i = 0; i < selected.length; i += CONCURRENCY) {
        let batch = selected.slice(i, i + CONCURRENCY)

        //allSettled, 單一item重試耗盡而reject時不丟失整批其他已成功之文章
        let rs = await Promise.allSettled(batch.map((id) => {
            return fetchWithRetry(`${apiBase}/item/${id}.json`, optFetch)
        }))
        for (let r of rs) {
            if (r.status === 'fulfilled') {
                items.push(r.value)
            }
        }

    }

    //轉換為統一格式
    return items
        .filter((item) => item && item.type === 'story')
        .map((item) => {
            return {
                url: String(get(item, 'url', '') || `https://news.ycombinator.com/item?id=${get(item, 'id', '')}`).trim(),
                time: toDatetimeUTC8(get(item, 'time', 0)),
                title: String(get(item, 'title', '') || '').trim(),
                description: '',
                from: 'Hacker News',
            }
        })
}


export default fetchHackerNews
