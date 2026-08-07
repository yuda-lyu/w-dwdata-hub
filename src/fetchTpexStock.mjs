import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import isYmd from './isYmd.mjs'
import toRocDate from './toRocDate.mjs'


//櫃買中心網站根網址
let BASE_URL = 'https://www.tpex.org.tw'


//本函數之預設抓取設定
let DFLT = {
    timeout: 15000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    label: 'fetch-tpex-stock',
}


//下游依固定欄序讀取(index 0代號、2收盤、4-6開高低、7成交股數), 故驗證欄數下限
//門檻8遠低於實際約17欄, 不會誤擋正常資料
let MIN_COLUMNS = 8


/**
 * 抓取櫃買中心(TPEX)上櫃股價
 *
 * 抓取指定日之上櫃股票行情, 可指定股票代號陣列過濾;
 * 選表優先以標題含「行情」比對, 避免未來新增其他資料表時誤抓, 並驗證欄數以避免API改版後靜默讀錯欄
 *
 * @param {String} dateStr 輸入日期YYYYMMDD字串
 * @param {Array} [stockCodes] 輸入股票代號字串陣列，例如['6499','6610']，省略或空陣列表示全市場
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.baseUrl='https://www.tpex.org.tw'] 輸入櫃買中心根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.timeout=15000] 輸入單次請求逾時毫秒整數，預設15000
 * @param {Integer} [opt.maxRetries=10] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入重試之線性退避基礎毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入重試之線性退避上限毫秒整數，預設30000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{source,date,count,data}，日期無效、無資料或指定個股查無資料時reject回傳錯誤物件
 * @example
 *
 * import fetchTpexStock from './src/fetchTpexStock.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTpexStock('20260807', ['6488'])
 *     console.log(r.source, r.count)
 *     // => 'tpex' 1
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTpexStock(dateStr, stockCodes, opt = {}) {

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

    //targetCodes
    let targetCodes = isearr(stockCodes) ? stockCodes : []

    //url
    let rocDate = toRocDate(dateStr)
    let url = `${baseUrl}/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?l=zh-tw&d=${rocDate}&s=0,asc,0&o=json`

    if (showLog) {
        console.log(`Fetching TPEX data: ${dateStr} (${rocDate})`)
        console.log(`Target: ${targetCodes.length > 0 ? targetCodes.join(', ') : 'All Market'}`)
        console.log(`URL: ${url}`)
    }

    //data
    let data = await fetchWithRetry(url, optFetch)

    //TPEX API格式(2026年後): { stat, tables: [{ title: '上櫃股票行情', data: [...] }] }
    //優先以title「行情」字樣比對, 避免未來新增其他資料表時誤抓
    let tables = Array.isArray(data.tables) ? data.tables : []
    let targetTable = tables.find((t) => get(t, 'title', '').includes('行情') && get(t, 'data.length', 0) > 0) ||
        tables.find((t) => get(t, 'data.length', 0) > 0)
    let rows = get(targetTable, 'data')

    //check
    if (!isearr(rows)) {
        throw new Error('TPEX API returned no data. Possibly a holiday or data not yet available.')
    }

    //shape sanity, 驗證選中表欄數符合預期, 避免API改版後靜默讀錯欄
    if (!Array.isArray(rows[0]) || rows[0].length < MIN_COLUMNS) {
        throw new Error(`TPEX 行情資料欄數不符預期（首列 ${Array.isArray(rows[0]) ? rows[0].length : 'N/A'} 欄，應 >= ${MIN_COLUMNS}），可能 API 格式變更`)
    }

    //resultData
    let resultData = rows
    if (targetCodes.length > 0) {
        resultData = resultData.filter((row) => targetCodes.includes(row[0]))
        if (resultData.length === 0) {
            //整體有資料但過濾後為空 → 個股不在上櫃市場, 與整體無資料之錯誤訊息明確區分
            throw new Error(`指定個股 ${targetCodes.join(',')} 在 ${dateStr} 之上櫃資料中查無資料（可能為上市股、代碼有誤、或當日無交易）`)
        }
    }

    return { source: 'tpex', date: dateStr, count: resultData.length, data: resultData }
}


export default fetchTpexStock
