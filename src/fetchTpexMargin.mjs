import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'
import isYmd from './isYmd.mjs'
import toRocDate from './toRocDate.mjs'
import parseIntComma from './parseIntComma.mjs'


//櫃買中心網站根網址
let BASE_URL = 'https://www.tpex.org.tw'


//本函數之預設抓取設定
let DFLT = {
    timeout: 15000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    label: 'fetch-tpex-margin',
}


/**
 * 抓取櫃買中心(TPEX)上櫃融資融券
 *
 * 抓取指定日之上櫃個股融資融券餘額並轉為結構化資料, 可指定股票代號陣列過濾;
 * 選表以欄位同時含「資餘額」與「券餘額」比對, 失敗則退而取第一張有資料表, 並鎖定index6與index14兩錨點欄位驗證佈局,
 * 不符即fail-loud, 避免固定index解析在API改版後靜默產生錯誤資料
 *
 * @param {String} dateStr 輸入日期YYYYMMDD字串
 * @param {Array} [stockCodes] 輸入股票代號字串陣列，省略或空陣列表示全市場
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.baseUrl='https://www.tpex.org.tw'] 輸入櫃買中心根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.timeout=15000] 輸入單次請求逾時毫秒整數，預設15000
 * @param {Integer} [opt.maxRetries=10] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入重試之線性退避基礎毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入重試之線性退避上限毫秒整數，預設30000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{source,date,count,data}，日期無效、無資料、欄位佈局不符或指定個股查無資料時reject回傳錯誤物件
 * @example
 *
 * import fetchTpexMargin from './src/fetchTpexMargin.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTpexMargin('20260807', ['6488'])
 *     console.log(r.source, r.count, r.data[0].code)
 *     // => 'tpex_margin' 1 '6488'
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTpexMargin(dateStr, stockCodes, opt = {}) {

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
    let rocDate = toRocDate(dateStr)
    let url = `${baseUrl}/web/stock/margin_trading/margin_balance/margin_bal_result.php?l=zh-tw&d=${rocDate}&o=json`

    if (showLog) {
        console.log(`Fetching TPEX margin data: ${dateStr} (${rocDate})`)
        console.log(`Target: ${targetCodes.length > 0 ? targetCodes.join(', ') : 'All Market'}`)
        console.log(`URL: ${url}`)
    }

    //data
    let data = await fetchWithRetry(url, optFetch)

    //marginTable, TPEX格式: { stat: 'ok', tables: [{ title, fields, data }] }
    //fields: ["代號","名稱","前資餘額(張)","資買","資賣","現償","資餘額","資屬證金","資使用率(%)",
    //         "資限額","前券餘額(張)","券賣","券買","券償","券餘額","券屬證金","券使用率(%)","券限額","資券相抵(張)","備註"]
    let tables = Array.isArray(data.tables) ? data.tables : []
    let marginTable = tables.find((t) => {
        return get(t, 'data.length', 0) > 0 &&
            Array.isArray(t.fields) &&
            t.fields.some((f) => String(f).includes('資餘額')) &&
            t.fields.some((f) => String(f).includes('券餘額'))
    }) || tables.find((t) => get(t, 'data.length', 0) > 0)
    if (!marginTable || !isearr(get(marginTable, 'data'))) {
        throw new Error('TPEX margin API returned no data. Possibly a holiday or data not yet available.')
    }

    //shape guard, 主比對失敗時會fallback取第一張有資料表, 若該表結構不同則下方固定index(2~19)會靜默解析錯欄位
    //此處鎖定解析所依賴之兩個錨點欄位(index 6=資餘額、index 14=券餘額), 不符即fail-loud
    let fields = Array.isArray(marginTable.fields) ? marginTable.fields : []
    if (!String(fields[6] || '').includes('資餘額') || !String(fields[14] || '').includes('券餘額')) {
        throw new Error(`TPEX 融資融券資料欄位佈局與預期不符（index6 應含「資餘額」實為「${fields[6] ?? ''}」、index14 應含「券餘額」實為「${fields[14] ?? ''}」）；可能 API 格式變更，停止解析以免產生錯誤資料`)
    }

    //rows
    let rows = marginTable.data
    if (targetCodes.length > 0) {
        rows = rows.filter((row) => targetCodes.includes(String(row[0] || '').trim()))
        if (rows.length === 0) {
            throw new Error(`指定個股 ${targetCodes.join(',')} 不在上櫃融資融券資料中（可能為上市股或代碼有誤）`)
        }
    }

    //parsedData
    //idx: 0=代號, 1=名稱, 2=前資餘額, 3=資買, 4=資賣, 5=現償, 6=資餘額,
    //     7=資屬證金, 8=資使用率, 9=資限額, 10=前券餘額, 11=券賣, 12=券買,
    //     13=券償, 14=券餘額, 15=券屬證金, 16=券使用率, 17=券限額, 18=資券相抵, 19=備註
    let parsedData = rows.map((row) => {

        let marginPrev = parseIntComma(row[2])
        let marginBuy = parseIntComma(row[3])
        let marginSell = parseIntComma(row[4])
        let marginBalance = parseIntComma(row[6])
        let shortPrev = parseIntComma(row[10])
        let shortSell = parseIntComma(row[11])
        let shortBuy = parseIntComma(row[12])
        let shortBalance = parseIntComma(row[14])

        return {
            code: String(row[0] || '').trim(),
            name: String(row[1] || '').trim(),
            marginBuy,
            marginSell,
            marginCashRepay: parseIntComma(row[5]),
            marginPrevBalance: marginPrev,
            marginBalance,
            marginChange: marginBalance - marginPrev,
            marginLimit: parseIntComma(row[9]),
            shortSell,
            shortBuy,
            shortCashRepay: parseIntComma(row[13]),
            shortPrevBalance: shortPrev,
            shortBalance,
            shortChange: shortBalance - shortPrev,
            shortLimit: parseIntComma(row[17]),
            offset: parseIntComma(row[18]),
            note: String(row[19] || '').trim(),
        }
    })

    if (showLog) {
        console.log(`Fetched ${parsedData.length} records.`)
    }

    return {
        source: 'tpex_margin',
        date: dateStr,
        count: parsedData.length,
        data: parsedData,
    }
}


export default fetchTpexMargin
