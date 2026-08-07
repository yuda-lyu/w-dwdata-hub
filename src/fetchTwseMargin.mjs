import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import isYmd from './isYmd.mjs'
import parseIntComma from './parseIntComma.mjs'


//證交所網站根網址
let BASE_URL = 'https://www.twse.com.tw'


//本函數之預設抓取設定
let DFLT = {
    timeout: 15000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    label: 'fetch-twse-margin',
}


//融資融券彙總表之文件化欄數, 下方固定index解析讀至row[15], 故欄數不足即視為API改版
let MIN_FIELDS = 16


/**
 * 抓取證交所(TWSE)上市融資融券
 *
 * 抓取指定日之上市個股融資融券餘額並轉為結構化資料, 可指定股票代號陣列過濾;
 * 選表先以標題「融資融券彙總」精確比對, 失敗則退而以欄位同時含「融資」與「融券」比對, 提升schema改版容忍度
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
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{source,date,count,data}，日期無效、API錯誤或指定個股查無資料時reject回傳錯誤物件
 * @example
 *
 * import fetchTwseMargin from './src/fetchTwseMargin.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTwseMargin('20260807', ['2330'])
 *     console.log(r.source, r.count, r.data[0].code, r.data[0].marginBalance)
 *     // => 'twse_margin' 1 '2330' 12345
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTwseMargin(dateStr, stockCodes, opt = {}) {

    //check
    if (!isestr(dateStr) || !/^\d{8}$/.test(dateStr)) {
        throw new Error(`日期參數無效：格式須為 YYYYMMDD (收到 "${dateStr}")`)
    }
    if (!isYmd(dateStr)) {
        throw new Error(`日期參數無效：不合法的日期 (${dateStr})`)
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
    let targetCodes = isearr(stockCodes) ? stockCodes.filter(Boolean) : []

    //url
    let url = `${baseUrl}/rwd/zh/marginTrading/MI_MARGN?date=${dateStr}&selectType=ALL&response=json`

    if (showLog) {
        console.log(`Fetching TWSE margin data: ${dateStr}`)
        console.log(`Target: ${targetCodes.length > 0 ? targetCodes.join(', ') : 'All Market'}`)
        console.log(`URL: ${url}`)
    }

    //data
    let data = await fetchWithRetry(url, optFetch)

    //check
    if (get(data, 'stat') !== 'OK') {
        throw new Error(`TWSE MI_MARGN API returned: ${get(data, 'stat')}`)
    }

    //detailTable, 先以title精確比對, 失敗則退而以fields雙重比對
    //fields: ["代號","名稱","買進","賣出","現金償還","前日餘額","今日餘額","次一營業日限額",
    //         "買進","賣出","現券償還","前日餘額","今日餘額","次一營業日限額","資券互抵","註記"]
    //前8欄為融資, idx 8-13為融券, idx 14=資券互抵, idx 15=註記
    let tables = Array.isArray(data.tables) ? data.tables : []
    let detailTable = tables.find((t) => get(t, 'data.length', 0) > 0 && get(t, 'title', '').includes('融資融券彙總'))
    if (!detailTable) {
        detailTable = tables.find((t) => {
            return get(t, 'data.length', 0) > 0 &&
                Array.isArray(t.fields) &&
                t.fields.some((f) => String(f).includes('融資')) &&
                t.fields.some((f) => String(f).includes('融券'))
        })
    }
    if (!detailTable || !isearr(get(detailTable, 'data'))) {
        throw new Error('TWSE MI_MARGN: 找不到融資融券彙總資料表')
    }

    //shape sanity, 固定index解析讀至row[15], 驗證欄數避免fallback抓到結構不同的表後靜默解析錯欄
    if (!Array.isArray(detailTable.fields) || detailTable.fields.length < MIN_FIELDS) {
        throw new Error(`TWSE 融資融券資料欄數不符預期（fields ${get(detailTable, 'fields.length', 'N/A')} 欄，應 >= ${MIN_FIELDS}），可能 API 格式變更`)
    }

    //rows
    let rows = detailTable.data
    if (targetCodes.length > 0) {
        rows = rows.filter((row) => targetCodes.includes(String(row[0] || '').trim()))
        if (rows.length === 0) {
            throw new Error(`指定個股 ${targetCodes.join(',')} 不在上市融資融券資料中（可能為上櫃股或代碼有誤）`)
        }
    }

    //parsedData
    let parsedData = rows.map((row) => {

        let marginBuy = parseIntComma(row[2])
        let marginSell = parseIntComma(row[3])
        let marginBalance = parseIntComma(row[6])
        let marginPrev = parseIntComma(row[5])
        let shortBuy = parseIntComma(row[8]) //融券買進(回補)
        let shortSell = parseIntComma(row[9]) //融券賣出(新增放空)
        let shortBalance = parseIntComma(row[12])
        let shortPrev = parseIntComma(row[11])

        return {
            code: String(row[0] || '').trim(),
            name: String(row[1] || '').trim(),
            marginBuy,
            marginSell,
            marginCashRepay: parseIntComma(row[4]),
            marginPrevBalance: marginPrev,
            marginBalance,
            marginChange: marginBalance - marginPrev,
            marginLimit: parseIntComma(row[7]),
            shortSell,
            shortBuy,
            shortCashRepay: parseIntComma(row[10]),
            shortPrevBalance: shortPrev,
            shortBalance,
            shortChange: shortBalance - shortPrev,
            shortLimit: parseIntComma(row[13]),
            offset: parseIntComma(row[14]),
            note: String(row[15] || '').trim(),
        }
    })

    if (showLog) {
        console.log(`Fetched ${parsedData.length} records.`)
    }

    return {
        source: 'twse_margin',
        date: dateStr,
        count: parsedData.length,
        data: parsedData,
    }
}


export default fetchTwseMargin
