import ot from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import isestr from 'wsemi/src/isestr.mjs'


//utc外掛, dayjs核心之format()一律以執行環境時區輸出, 需掛utc外掛才能以utcOffset指定固定偏移
ot.extend(utc)


//台灣時區偏移小時數, 台灣自1980年起無日光節約時間, 故固定為UTC+8
let TZ_OFFSET_HOUR = 8


//輸出格式
let FORMAT = 'YYYY-MM-DD HH:mm:ss'


//無時間部分之日期字串(如'2024'、'20260807'、'2026-08-07'), 即不含'T'與':'者
let REG_DATE_ONLY = /^[^T:]*$/


/**
 * 時間轉UTC+8之日期時間字串
 *
 * 可接受ISO時間字串、RFC822時間字串、純日期字串、unix秒數(Number, 非毫秒)或Date物件,
 * 一律輸出台灣時間'YYYY-MM-DD HH:mm:ss', 且不受執行環境時區影響。
 *
 * 兩類輸入之時區語意不同, 故分開處理：
 * 帶有時刻資訊者(ISO、RFC822、unix秒數、Date)代表一個絕對時點, 換算為UTC+8之當地時刻；
 * 純日期字串本身不含時點, 直接視為UTC+8當日之00:00:00, 不因執行環境時區而位移日期
 * (否則在UTC+14環境下'2024'會被解為2023-12-31)。
 *
 * @param {String|Number|Date} value 輸入ISO或RFC822時間字串、純日期字串、unix秒數或Date物件
 * @returns {String} 回傳UTC+8之日期時間字串，格式為'YYYY-MM-DD HH:mm:ss'，輸入為空或無法解析時回傳''
 * @example
 *
 * import toDatetimeUTC8 from './src/toDatetimeUTC8.mjs'
 *
 * console.log(toDatetimeUTC8('2026-08-07T01:02:03Z'))
 * // => '2026-08-07 09:02:03'
 *
 * console.log(toDatetimeUTC8(1786000000))
 * // => '2026-08-06 15:06:40'
 *
 * console.log(toDatetimeUTC8('2024'), toDatetimeUTC8('20260807'))
 * // => '2024-01-01 00:00:00' '2026-08-07 00:00:00'
 *
 * console.log(toDatetimeUTC8('abc'), toDatetimeUTC8(''), toDatetimeUTC8(null))
 * // => '' '' ''
 *
 */
function toDatetimeUTC8(value) {

    let dt = null

    //keepLocalTime, 為true時保留原始年月日時分秒僅改標時區偏移, 供純日期字串使用
    let keepLocalTime = false

    //Number型別一律視為unix秒數, dayjs之ot(number)為毫秒故須改用ot.unix
    //型別分派不可用wsemi之isnum, 其對數值字串亦回true, 會使'2024'、'20260807'等日期字串
    //被誤當unix秒數而解成1970年
    if (typeof value === 'number') {
        if (value === 0) {
            return ''
        }
        dt = ot.unix(value)
    }
    else if (value instanceof Date) {
        dt = ot(value)
    }
    else if (isestr(value)) {
        dt = ot(value)
        keepLocalTime = REG_DATE_ONLY.test(value)
    }
    else {
        return ''
    }

    //check
    if (!dt.isValid()) {
        return ''
    }

    return dt.utcOffset(TZ_OFFSET_HOUR, keepLocalTime).format(FORMAT)
}


export default toDatetimeUTC8
