import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import isYmd from './isYmd.mjs'


//證交所網站根網址
let BASE_URL = 'https://www.twse.com.tw'


//本函數之預設抓取設定
let DFLT = {
    timeout: 15000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    label: 'fetch-twse-t86',
}


/**
 * 抓取證交所(TWSE)上市三大法人買賣超
 *
 * 抓取指定日之上市三大法人買賣超(T86), 以API回傳之fields為key轉為物件陣列, 可指定股票代號陣列過濾
 *
 * @param {String} dateStr 輸入日期YYYYMMDD字串
 * @param {Array} [stockCodes] 輸入股票代號字串陣列，省略或空陣列表示全市場
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.baseUrl='https://www.twse.com.tw'] 輸入證交所根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.timeout=15000] 輸入單次請求逾時毫秒整數，預設15000
 * @param {Integer} [opt.maxRetries=10] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入重試之線性退避基礎毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入重試之線性退避上限毫秒整數，預設30000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{source,date,data}，日期無效或API錯誤時reject回傳錯誤物件
 * @example
 *
 * import fetchTwseT86 from './src/fetchTwseT86.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTwseT86('20260807', ['2330'])
 *     console.log(r.source, r.data.length, r.data[0]['證券代號'])
 *     // => 'twse' 1 '2330'
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTwseT86(dateStr, stockCodes, opt = {}) {

    //check
    if (!isestr(dateStr) || !/^\d{8}$/.test(dateStr)) {
        throw new Error(`dateStr must be YYYYMMDD, got: ${dateStr}`)
    }
    if (!isYmd(dateStr)) {
        //合法性驗證, 例如20260230雖然符合8碼但日期不存在
        throw new Error(`dateStr 不是合法日期: ${dateStr}`)
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
    let url = `${baseUrl}/rwd/zh/fund/T86?response=json&date=${dateStr}&selectType=ALL`

    if (showLog) {
        console.log(`Fetching from: ${url}`)
        console.log(`Target: ${targetCodes.length === 0 ? 'All Market' : targetCodes.join(', ')}`)
    }

    //data
    let data = await fetchWithRetry(url, optFetch)

    //check
    if (get(data, 'stat') !== 'OK') {
        throw new Error(`TWSE T86 API returned: ${get(data, 'stat')}`)
    }

    //fields, rawData
    let fields = get(data, 'fields')
    let rawData = get(data, 'data')
    if (!Array.isArray(rawData)) {
        throw new Error('TWSE T86: data not found in response.')
    }
    if (!Array.isArray(fields)) {
        throw new Error('TWSE T86: fields not found in response.')
    }

    //parsedData, 以API回傳之fields為key
    let parsedData = rawData.map((row) => {
        let obj = {}
        fields.forEach((field, index) => {
            let value = row[index]
            if (typeof value === 'string') {
                value = value.trim()
            }
            obj[field] = value
        })
        return obj
    })

    //過濾指定個股
    if (targetCodes.length > 0) {
        let codeField = fields.find((f) => String(f).includes('證券代號'))
        if (!codeField) {
            throw new Error('無法篩選個股：API 回應中找不到證券代號欄位')
        }
        parsedData = parsedData.filter((item) => targetCodes.includes(item[codeField]))
    }

    if (showLog) {
        console.log(`Fetched ${parsedData.length} records.`)
    }

    return { source: 'twse', date: dateStr, data: parsedData }
}


export default fetchTwseT86
