import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import cint from 'wsemi/src/cint.mjs'
import delay from 'wsemi/src/delay.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import isYmd from './isYmd.mjs'


//期交所網站根網址
let BASE_URL = 'https://www.taifex.com.tw'


//本函數之預設抓取設定, 期交所CSV為MS950(Big5)編碼
let DFLT = {
    responseType: 'text',
    encoding: 'big5',
    timeout: 15000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    label: 'fetch-taifex',
}


//對期交所同網域請求改為序列執行, 每支間隔1秒, 降低被限流風險
let DEFAULT_INTER_REQUEST_DELAY_MS = 1000


//身份別中文名對應之結果key
let IDENTITY_MAP = {
    '外資及陸資': 'foreign',
    '外資': 'foreign',
    '投信': 'trust',
    '自營商': 'dealers',
}


/**
 * 解析單行CSV
 *
 * 支援含逗號之引號欄位與""跳脫雙引號(RFC 4180子集, 足以涵蓋期交所未來欄位變動)
 *
 * @param {String} line 輸入CSV單行字串
 * @returns {Array} 回傳欄位字串陣列
 */
function parseCSVLine(line) {

    let result = []
    let cur = ''
    let inQuote = false

    for (let i = 0; i < line.length; i++) {
        let c = line[i]
        if (inQuote) {
            if (c === '"') {
                if (line[i + 1] === '"') {
                    cur += '"'
                    i++
                }
                else {
                    inQuote = false
                }
            }
            else {
                cur += c
            }
        }
        else if (c === ',') {
            result.push(cur.trim())
            cur = ''
        }
        else if (c === '"' && cur.length === 0) {
            inQuote = true
        }
        else {
            cur += c
        }
    }
    result.push(cur.trim())

    return result
}


/**
 * 解析CSV文字為物件陣列
 *
 * 以首列為欄名, 支援尾端逗號、引號欄位, 並去除前後空白
 *
 * @param {String} csvText 輸入CSV文字字串
 * @returns {Array} 回傳物件陣列，資料不足2列時回傳[]
 */
function parseCSV(csvText) {

    let lines = csvText.trim().split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    if (lines.length < 2) {
        return []
    }

    let headers = parseCSVLine(lines[0])
    let rows = []
    for (let i = 1; i < lines.length; i++) {
        let values = parseCSVLine(lines[i])
        let obj = {}
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j] || ''
        }
        rows.push(obj)
    }

    return rows
}


/**
 * 含千分位逗號之字串轉數值
 *
 * 與parseIntComma不同, 本函數保留小數並以null表達缺值, 供期交所價格與比率欄位使用
 *
 * @param {String} str 輸入數值字串
 * @returns {Number|null} 回傳數值，為'-'、空字串或無法轉換時回傳null
 */
function parseNum(str) {

    if (!str || str === '-' || str === '') {
        return null
    }

    let num = Number(str.replace(/,/g, ''))

    return isNaN(num) ? null : num
}


/**
 * 抓取台指期行情
 *
 * @param {String} dateSlash 輸入日期YYYY/MM/DD字串
 * @param {Object} cfg 輸入已正規化之設定物件
 * @returns {Promise} 回傳Promise，resolve回傳近月合約行情物件
 */
async function fetchFuturesData(dateSlash, cfg) {

    let url = `${cfg.baseUrl}/cht/3/futDataDown?down_type=1&queryStartDate=${dateSlash}&queryEndDate=${dateSlash}&commodity_id=TX`
    if (cfg.showLog) {
        console.log(`Fetching futures data: ${url}`)
    }

    let csvText = await fetchWithRetry(url, { ...cfg.optFetch, label: `${DFLT.label} Futures` })
    let rows = parseCSV(csvText)
    if (rows.length === 0) {
        throw new Error('台指期行情：無資料（可能非交易日）')
    }

    //txRows, 排除到期月份含'/'之價差合約
    let txRows = rows.filter((r) => r['契約'] === 'TX' && !r['到期月份(週別)'].includes('/'))
    if (txRows.length === 0) {
        throw new Error('台指期行情：找不到 TX 合約資料')
    }

    //依到期月份升冪排序以取近月
    txRows.sort((a, b) => {
        return a['到期月份(週別)'].trim().localeCompare(b['到期月份(週別)'].trim())
    })

    //nearMonth
    let nearMonth = txRows[0]['到期月份(週別)'].trim()
    let nearMonthRows = txRows.filter((r) => r['到期月份(週別)'].trim() === nearMonth)

    //一般盤與盤後盤
    let regularRow = nearMonthRows.find((r) => r['交易時段'] === '一般')
    let afterHoursRow = nearMonthRows.find((r) => r['交易時段'] === '盤後')

    let result = {
        contractMonth: nearMonth,
        open: null,
        high: null,
        low: null,
        close: null,
        settlement: null,
        volume: null,
        afterHoursClose: null,
        afterHoursSettlement: null,
        afterHoursVolume: null,
    }

    if (regularRow) {
        result.open = parseNum(regularRow['開盤價'])
        result.high = parseNum(regularRow['最高價'])
        result.low = parseNum(regularRow['最低價'])
        result.close = parseNum(regularRow['收盤價'])
        result.settlement = parseNum(regularRow['結算價'])
        result.volume = parseNum(regularRow['成交量'])
    }

    if (afterHoursRow) {
        result.afterHoursClose = parseNum(afterHoursRow['收盤價'])
        result.afterHoursSettlement = parseNum(afterHoursRow['結算價'])
        result.afterHoursVolume = parseNum(afterHoursRow['成交量'])
    }

    if (cfg.showLog) {
        console.log(`  台指期近月 (${nearMonth}): 開${result.open} 高${result.high} 低${result.low} 收${result.close} 結算${result.settlement} 量${result.volume}`)
        if (result.afterHoursClose !== null) {
            console.log(`  盤後: 收${result.afterHoursClose} 結算${result.afterHoursSettlement} 量${result.afterHoursVolume}`)
        }
    }

    return result
}


/**
 * 抓取三大法人期貨未平倉
 *
 * @param {String} dateSlash 輸入日期YYYY/MM/DD字串
 * @param {Object} cfg 輸入已正規化之設定物件
 * @returns {Promise} 回傳Promise，resolve回傳以foreign、trust、dealers為key之未平倉物件
 */
async function fetchInstitutionalData(dateSlash, cfg) {

    let url = `${cfg.baseUrl}/cht/3/futContractsDateDown?queryStartDate=${dateSlash}&queryEndDate=${dateSlash}&commodityId=TXF`
    if (cfg.showLog) {
        console.log(`Fetching institutional data: ${url}`)
    }

    let csvText = await fetchWithRetry(url, { ...cfg.optFetch, label: `${DFLT.label} Institutional` })
    let rows = parseCSV(csvText)
    if (rows.length === 0) {
        throw new Error('三大法人期貨未平倉：無資料（可能非交易日）')
    }

    let result = {}
    for (let row of rows) {

        let identity = row['身份別']
        let key = IDENTITY_MAP[identity]
        if (!key) {
            continue
        }

        result[key] = {
            longContracts: parseNum(row['多方未平倉口數']),
            longAmount: parseNum(row['多方未平倉契約金額(千元)']),
            shortContracts: parseNum(row['空方未平倉口數']),
            shortAmount: parseNum(row['空方未平倉契約金額(千元)']),
            netContracts: parseNum(row['多空未平倉口數淨額']),
            netAmount: parseNum(row['多空未平倉契約金額淨額(千元)']),
            tradingLong: parseNum(row['多方交易口數']),
            tradingShort: parseNum(row['空方交易口數']),
            tradingNet: parseNum(row['多空交易口數淨額']),
        }

        if (cfg.showLog) {
            console.log(`  ${identity}: 未平倉淨額 ${result[key].netContracts} 口`)
        }

    }

    //rows非空但無任一身份別命中(例如官方變更欄位用語), 視為解析失敗
    //比照本檔其他解析在資料缺漏時拋錯之慣例, 避免回傳空物件被當成成功而靜默缺資料
    if (Object.keys(result).length === 0) {
        throw new Error('三大法人期貨未平倉：無法解析身份別（可能官方變更欄位用語）')
    }

    return result
}


/**
 * 抓取Put/Call Ratio
 *
 * @param {String} dateSlash 輸入日期YYYY/MM/DD字串
 * @param {Object} cfg 輸入已正規化之設定物件
 * @returns {Promise} 回傳Promise，resolve回傳Put/Call Ratio物件
 */
async function fetchPCRatio(dateSlash, cfg) {

    let url = `${cfg.baseUrl}/cht/3/pcRatioDown?queryStartDate=${dateSlash}&queryEndDate=${dateSlash}`
    if (cfg.showLog) {
        console.log(`Fetching P/C ratio: ${url}`)
    }

    let csvText = await fetchWithRetry(url, { ...cfg.optFetch, label: `${DFLT.label} PCRatio` })
    let rows = parseCSV(csvText)
    if (rows.length === 0) {
        throw new Error('Put/Call Ratio：無資料（可能非交易日）')
    }

    let row = rows[0]
    let result = {
        putVolume: parseNum(row['賣權成交量']),
        callVolume: parseNum(row['買權成交量']),
        ratio: parseNum(row['買賣權成交量比率%']),
        putOpenInterest: parseNum(row['賣權未平倉量']),
        callOpenInterest: parseNum(row['買權未平倉量']),
        openInterestRatio: parseNum(row['買賣權未平倉量比率%']),
    }

    if (cfg.showLog) {
        console.log(`  Put ${result.putVolume} / Call ${result.callVolume} = ${result.ratio}%`)
    }

    return result
}


/**
 * 抓取期交所(TAIFEX)台指期相關資料
 *
 * 序列抓取台指期行情、三大法人期貨未平倉與Put/Call Ratio共三支CSV(每支間隔1秒以降低限流風險);
 * 期交所CSV為Big5(MS950)編碼, 由本函數解碼; 三支之中任一支失敗僅記錄於errors, 三支全失敗才拋錯
 *
 * @param {String} dateStr 輸入日期YYYYMMDD字串
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.baseUrl='https://www.taifex.com.tw'] 輸入期交所根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.timeout=15000] 輸入單次請求逾時毫秒整數，預設15000
 * @param {Integer} [opt.maxRetries=10] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入重試之線性退避基礎毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入重試之線性退避上限毫秒整數，預設30000
 * @param {Integer} [opt.interRequestDelayMs=1000] 輸入三支CSV之間隔毫秒整數，預設1000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{date,futures,institutional,pcRatio,errors}，日期無效或三支資料全失敗時reject回傳錯誤物件
 * @example
 *
 * import fetchTaifex from './src/fetchTaifex.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTaifex('20260807')
 *     console.log(r.date, r.futures.tx.close, r.pcRatio.ratio, r.errors)
 *     // => '20260807' 23456 108.5 []
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTaifex(dateStr, opt = {}) {

    //check, 函數入口驗日期
    if (!isestr(dateStr) || !/^\d{8}$/.test(dateStr)) {
        throw new Error(`dateStr 須為 YYYYMMDD 字串，得到: ${dateStr}`)
    }
    if (!isYmd(dateStr)) {
        throw new Error(`dateStr 非合法日期: ${dateStr}`)
    }

    //baseUrl
    let baseUrl = get(opt, 'baseUrl')
    if (!isestr(baseUrl)) {
        baseUrl = BASE_URL
    }
    baseUrl = baseUrl.replace(/\/+$/, '')

    //cfg
    let optFetch = getOptFetch(opt, DFLT)
    let showLog = optFetch.showLog
    let cfg = { baseUrl, showLog, optFetch }

    //interRequestDelayMs
    let interRequestDelayMs = get(opt, 'interRequestDelayMs')
    if (!isp0int(interRequestDelayMs)) {
        interRequestDelayMs = DEFAULT_INTER_REQUEST_DELAY_MS
    }
    else {
        interRequestDelayMs = cint(interRequestDelayMs)
    }

    //dateSlash
    let dateSlash = `${dateStr.substring(0, 4)}/${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`
    if (showLog) {
        console.log(`Fetching TAIFEX data for ${dateStr} (${dateSlash})`)
    }

    let errors = []
    let futures = null
    let institutional = null
    let pcRatio = null

    try {
        futures = await fetchFuturesData(dateSlash, cfg)
    }
    catch (err) {
        let msg = `台指期行情: ${get(err, 'message', err)}`
        if (showLog) {
            console.error(msg)
        }
        errors.push(msg)
    }

    await delay(interRequestDelayMs)

    try {
        institutional = await fetchInstitutionalData(dateSlash, cfg)
    }
    catch (err) {
        let msg = `三大法人: ${get(err, 'message', err)}`
        if (showLog) {
            console.error(msg)
        }
        errors.push(msg)
    }

    await delay(interRequestDelayMs)

    try {
        pcRatio = await fetchPCRatio(dateSlash, cfg)
    }
    catch (err) {
        let msg = `Put/Call Ratio: ${get(err, 'message', err)}`
        if (showLog) {
            console.error(msg)
        }
        errors.push(msg)
    }

    //三支全失敗才視為完全失敗
    let hasAnyData = futures || institutional || pcRatio
    if (!hasAnyData) {
        let err = new Error(`所有資料抓取失敗: ${errors.join('; ')}`)
        err.errors = errors
        throw err
    }

    return {
        date: dateStr,
        futures: futures ? { tx: futures } : null,
        institutional: institutional || null,
        pcRatio: pcRatio || null,
        errors,
    }
}


export { parseCSV, parseCSVLine, parseNum }
export default fetchTaifex
