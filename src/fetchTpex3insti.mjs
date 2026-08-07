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
    label: 'fetch-tpex-3insti',
}


//TPEX 3insti_hedge端點之fields為「裸欄名」——買進股數/賣出股數/買賣超股數各重複7次
//(外資不含自營 / 外資自營 / 外資合計 / 投信 / 自營自行 / 自營避險 / 自營合計), 群組標籤不在JSON內
//故唯一可靠解法是以「固定位置」對應語意欄名(不可用欄名當key, 否則同名後者覆蓋前者、7組塌成1組)
//明細欄名對齊TWSE T86(外陸資.../投信.../自營商...), 令下游TWSE與TPEX共用同一套key
//末欄保留「三大法人買賣超股數合計」(下游有寫死讀此名者, 勿改)
let TPEX_FIELD_MAP = [
    '代號',
    '名稱',
    '外陸資買進股數(不含外資自營商)',
    '外陸資賣出股數(不含外資自營商)',
    '外陸資買賣超股數(不含外資自營商)',
    '外資自營商買進股數',
    '外資自營商賣出股數',
    '外資自營商買賣超股數',
    '外資及陸資買進股數',
    '外資及陸資賣出股數',
    '外資及陸資買賣超股數',
    '投信買進股數',
    '投信賣出股數',
    '投信買賣超股數',
    '自營商買進股數(自行買賣)',
    '自營商賣出股數(自行買賣)',
    '自營商買賣超股數(自行買賣)',
    '自營商買進股數(避險)',
    '自營商賣出股數(避險)',
    '自營商買賣超股數(避險)',
    '自營商買進股數',
    '自營商賣出股數',
    '自營商買賣超股數',
    '三大法人買賣超股數合計',
]


/**
 * 驗證TPEX回傳fields是否仍為預期結構
 *
 * 結構防呆(fail-loud), 驗證仍為「24欄、買進/賣出/買賣超循環×7」;
 * 不符即拋錯(屬非暫時性錯誤故不重試), 避免API改版後靜默把外資的數字貼到投信頭上
 *
 * @param {Array} fields 輸入API回傳之欄名字串陣列
 */
function assertTpexFieldShape(fields) {

    if (fields.length !== TPEX_FIELD_MAP.length) {
        throw new Error(`TPEX 3insti: 欄數異常，預期 ${TPEX_FIELD_MAP.length} 得 ${fields.length}（疑似 API 改版，請重新校準 TPEX_FIELD_MAP）`)
    }
    if (!String(fields[0]).includes('代號') || !String(fields[1]).includes('名稱')) {
        throw new Error(`TPEX 3insti: 前兩欄非「代號/名稱」（得「${fields[0]}」「${fields[1]}」，疑似 API 改版）`)
    }
    if (!String(fields[fields.length - 1]).includes('合計')) {
        throw new Error(`TPEX 3insti: 末欄非「合計」（得「${fields[fields.length - 1]}」，疑似 API 改版）`)
    }

    let cycle = ['買進股數', '賣出股數', '買賣超股數']
    for (let i = 2; i < fields.length - 1; i++) {
        let expect = cycle[(i - 2) % 3]
        if (String(fields[i]) !== expect) {
            throw new Error(`TPEX 3insti: 第 ${i} 欄預期「${expect}」得「${fields[i]}」（疑似 API 改版，欄序已變）`)
        }
    }

}


/**
 * 抓取櫃買中心(TPEX)上櫃三大法人買賣超
 *
 * 抓取指定日之上櫃三大法人買賣超(含自營商避險), 因API之fields為裸欄名且重複, 故以固定位置對應語意欄名;
 * 套位置對應前先驗證欄位結構, 不符即拋錯以避免產生錯置之財務資料
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
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{source,date,data}，日期無效、無資料或欄位結構不符時reject回傳錯誤物件
 * @example
 *
 * import fetchTpex3insti from './src/fetchTpex3insti.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTpex3insti('20260807', ['6488'])
 *     console.log(r.source, r.data.length, r.data[0]['代號'])
 *     // => 'tpex' 1 '6488'
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTpex3insti(dateStr, stockCodes, opt = {}) {

    //check
    if (!isestr(dateStr) || !/^\d{8}$/.test(dateStr)) {
        throw new Error(`dateStr must be YYYYMMDD, got: ${dateStr}`)
    }
    if (!isYmd(dateStr)) {
        //合法性驗證, 例如20260230雖符合8碼但日期不存在
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
    let rocDateStr = toRocDate(dateStr)
    let url = `${baseUrl}/web/stock/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&t=D&d=${rocDateStr}&o=json`

    if (showLog) {
        console.log(`Fetching from: ${url}`)
        console.log(`Target: ${targetCodes.length === 0 ? 'All Market' : targetCodes.join(', ')}`)
    }

    //data
    let data = await fetchWithRetry(url, optFetch)

    //check
    if (!isearr(get(data, 'tables'))) {
        throw new Error('TPEX 3insti: tables not found in response. Possibly a holiday or no data.')
    }

    //table, 此端點回tables[0]=資料表、tables[1]=空{}
    //取含「代號」「名稱」表頭之資料表, 退而取tables[0], 避免未來新增其他資料表時誤抓
    let tables = data.tables
    let table = tables.find((t) => {
        return Array.isArray(t.fields) &&
            t.fields.some((f) => String(f).includes('代號')) &&
            t.fields.some((f) => String(f).includes('名稱'))
    }) || tables[0]

    //fields, rawData
    let fields = get(table, 'fields')
    let rawData = get(table, 'data')
    if (!Array.isArray(fields) || !Array.isArray(rawData)) {
        throw new Error('TPEX 3insti: data/fields not found in table.')
    }

    //套位置對應前先驗結構(fields為裸欄名, 必須靠固定位置才能還原7組明細)
    assertTpexFieldShape(fields)

    //processedData
    let processedData = rawData
        .map((row) => {
            let obj = {}
            TPEX_FIELD_MAP.forEach((key, index) => {
                let value = row[index]
                if (typeof value === 'string') {
                    value = value.trim()
                }
                obj[key] = value
            })
            return obj
        })
        .filter((item) => targetCodes.length === 0 || targetCodes.includes(item['代號']))

    if (showLog) {
        console.log(`Fetched ${processedData.length} records.`)
    }

    return { source: 'tpex', date: dateStr, data: processedData }
}


export { TPEX_FIELD_MAP }
export default fetchTpex3insti
