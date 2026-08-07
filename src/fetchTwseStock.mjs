import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import isYmd from './isYmd.mjs'
import toRocDate from './toRocDate.mjs'


//證交所網站根網址
let BASE_URL = 'https://www.twse.com.tw'


//本函數之預設抓取設定
let DFLT = {
    timeout: 10000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    label: 'fetch-twse-stock',
}


/**
 * 抓取證交所(TWSE)上市股價
 *
 * 指定stockCode時走STOCK_DAY取個股日成交資訊(該API回傳整月資料, 本函數過濾為指定日單筆);
 * 未指定或指定為'all'時走MI_INDEX取全市場收盤資料
 *
 * @param {String} dateStr 輸入日期YYYYMMDD字串
 * @param {String} [stockCode] 輸入股票代號字串，例如'2330'，省略或給'all'表示全市場
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.baseUrl='https://www.twse.com.tw'] 輸入證交所根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.timeout=10000] 輸入單次請求逾時毫秒整數，預設10000
 * @param {Integer} [opt.maxRetries=10] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入重試之線性退避基礎毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入重試之線性退避上限毫秒整數，預設30000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳證交所API原始資料物件，內含fields與data等欄位，日期無效、API回傳非OK或指定日無交易資料時reject回傳錯誤物件
 * @example
 *
 * import fetchTwseStock from './src/fetchTwseStock.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTwseStock('20260807', '2330')
 *     console.log(r.stat, r.data.length)
 *     // => 'OK' 1
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTwseStock(dateStr, stockCode, opt = {}) {

    //check, 函數入口驗日期, 令程式化呼叫不繞過CLI之檢核
    if (!isYmd(dateStr)) {
        throw new Error(`dateStr 須為合法之 YYYYMMDD 字串，得到: ${dateStr}`)
    }

    //baseUrl
    let baseUrl = get(opt, 'baseUrl')
    if (!isestr(baseUrl)) {
        baseUrl = BASE_URL
    }
    baseUrl = baseUrl.replace(/\/+$/, '')

    //optFetch
    let optFetch = getOptFetch(opt, DFLT)
    let showLog = optFetch.showLog

    //isSingleStock
    let isSingleStock = isestr(stockCode) && stockCode.toLowerCase() !== 'all'
    let stockNo = isSingleStock ? stockCode : 'ALLBUT0999'

    //url
    let url = ''
    if (isSingleStock) {
        url = `${baseUrl}/exchangeReport/STOCK_DAY?response=json&date=${dateStr}&stockNo=${stockNo}`
    }
    else {
        url = `${baseUrl}/exchangeReport/MI_INDEX?response=json&date=${dateStr}&type=ALLBUT0999`
    }

    if (showLog) {
        console.log(`Fetching TWSE data: ${dateStr}, Stock: ${stockNo}`)
        console.log(`URL: ${url}`)
    }

    //data
    let data = await fetchWithRetry(url, optFetch)

    //check
    if (get(data, 'stat') !== 'OK') {
        throw new Error(`TWSE API returned: ${get(data, 'stat')}`)
    }

    //STOCK_DAY回傳整月資料, 呼叫者既已指定單一日期則過濾為該日單筆
    //保留原欄位結構(fields/data/title等), 僅替換data為篩選後陣列
    if (isSingleStock && Array.isArray(data.data)) {
        let rocDate = toRocDate(dateStr)
        let filtered = data.data.filter((row) => row[0] === rocDate)
        data.data = filtered
        if (filtered.length === 0) {
            //整月有資料但指定日無 → 當日停盤、假日或未開市
            throw new Error(`TWSE 個股 ${stockCode} 於 ${dateStr} 無交易資料（可能為假日或停盤）`)
        }
    }

    return data
}


export default fetchTwseStock
