import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import fetchWithRetry from './fetchWithRetry.mjs'
import getOptFetch from './getOptFetch.mjs'


//證交所開放資料平台之休市日期API
let API_URL = 'https://openapi.twse.com.tw/v1/holidaySchedule/holidaySchedule'


//本函數之預設抓取設定
let DFLT = {
    responseType: 'text',
    timeout: 30000,
    maxRetries: 10,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    label: 'fetch-tw-data-holiday',
}


/**
 * 民國日期YYYMMDD轉西元日期YYYYMMDD
 *
 * @param {String} rocDate 輸入民國日期字串，年份位數不限
 * @returns {String} 回傳西元日期YYYYMMDD字串
 */
function rocToWestern(rocDate) {

    let rocYear = parseInt(rocDate.substring(0, rocDate.length - 4), 10)
    let mmdd = rocDate.substring(rocDate.length - 4)

    return `${rocYear + 1911}${mmdd}`
}


/**
 * 判斷條目是否為非假日條目
 *
 * 應排除者有二類：
 * 交易日標記(「國曆新年開始交易日」「農曆春節前最後交易日」「農曆春節後開始交易日」)；
 * 結算作業日(「市場無交易，僅辦理結算交割作業」)
 *
 * @param {Object} entry 輸入API回傳之單筆條目物件
 * @returns {Boolean} 回傳是否為非假日條目之布林值
 */
function isNonHolidayEntry(entry) {

    let name = String(get(entry, 'Name', ''))
    let description = String(get(entry, 'Description', ''))

    return /交易日/.test(name) ||
        /市場無交易/.test(name) ||
        /開始交易/.test(description) ||
        /最後交易/.test(description)
}


/**
 * 抓取台灣證券市場休市日期
 *
 * 由證交所開放資料平台取得當年度休市日期清單, 排除交易日標記與結算作業日, 並依日期去重與排序;
 * 給定checkDate時另回傳該日是否為休市日
 *
 * @param {String} [checkDate] 輸入待查詢日期YYYYMMDD字串，非合法YYYYMMDD時略過單日比對
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.url='https://openapi.twse.com.tw/v1/holidaySchedule/holidaySchedule'] 輸入API網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.timeout=30000] 輸入單次請求逾時毫秒整數，預設30000
 * @param {Integer} [opt.maxRetries=10] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入重試之線性退避基礎毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入重試之線性退避上限毫秒整數，預設30000
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示重試訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{dataYear,totalHolidays,holidays}，有給checkDate時另含{checkDate,isHoliday,holidayName}，API回傳非JSON或空陣列時reject回傳錯誤物件
 * @example
 *
 * import fetchTwDataHoliday from './src/fetchTwDataHoliday.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTwDataHoliday('20260101')
 *     console.log(r.dataYear, r.totalHolidays, r.isHoliday, r.holidayName)
 *     // => '2026' 15 true '中華民國開國紀念日'
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTwDataHoliday(checkDate, opt = {}) {

    //url
    let url = get(opt, 'url')
    if (!isestr(url)) {
        url = API_URL
    }

    //optFetch
    let optFetch = getOptFetch(opt, DFLT)

    //body
    let body = await fetchWithRetry(url, optFetch)

    //raw, API維護時可能回HTTP 200加HTML(非JSON), 產生文件記載之友善訊息而非裸SyntaxError
    let raw = null
    try {
        raw = JSON.parse(body)
    }
    catch (err) {
        throw new Error('API 回傳非 JSON 格式（可能為維護頁面或網路中介），請稍後再試')
    }
    if (!isearr(raw)) {
        throw new Error('API 回傳空陣列或格式異常')
    }

    //holidays, 轉為結構化假日清單(排除交易日標記與結算作業日)
    let holidays = raw
        .filter((entry) => !isNonHolidayEntry(entry))
        .map((entry) => {
            return {
                date: rocToWestern(get(entry, 'Date', '')),
                rocDate: get(entry, 'Date', ''),
                name: get(entry, 'Name', ''),
                weekday: get(entry, 'Weekday', ''),
                description: String(get(entry, 'Description', '') || '').replace(/<br\s*\/?>/gi, '').trim(),
            }
        })

    //uniqueHolidays, 去重(同一天可能有多筆同名條目)
    let seen = new Set()
    let uniqueHolidays = holidays.filter((h) => {
        if (seen.has(h.date)) {
            return false
        }
        seen.add(h.date)
        return true
    })
    uniqueHolidays.sort((a, b) => a.date.localeCompare(b.date))

    //dataYear
    let dataYear = uniqueHolidays.length > 0 ? uniqueHolidays[0].date.substring(0, 4) : null

    //result
    let result = {
        dataYear,
        totalHolidays: uniqueHolidays.length,
        holidays: uniqueHolidays,
    }

    //checkDate為opt, 僅當為合法YYYYMMDD字串才做單日假日比對, 無效則略過(不誤標isHoliday)
    if (isestr(checkDate) && /^\d{8}$/.test(checkDate)) {
        result.checkDate = checkDate
        let match = uniqueHolidays.find((h) => h.date === checkDate)
        result.isHoliday = !!match
        result.holidayName = match ? match.name : null
    }

    return result
}


export default fetchTwDataHoliday
