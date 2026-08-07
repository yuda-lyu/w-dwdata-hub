import ot from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import isnum from 'wsemi/src/isnum.mjs'
import isestr from 'wsemi/src/isestr.mjs'


//utc外掛, dayjs核心之format()一律以執行環境時區輸出, 需掛utc外掛才能以utcOffset指定固定偏移
ot.extend(utc)


//台灣時區偏移小時數, 台灣自1980年起無日光節約時間, 故固定為UTC+8
let TZ_OFFSET_HOUR = 8


//輸出格式
let FORMAT = 'YYYY-MM-DD HH:mm:ss'


/**
 * 時間轉UTC+8之日期時間字串
 *
 * 可接受ISO時間字串、RFC822時間字串、unix秒數(非毫秒)或Date物件, 一律輸出台灣時間'YYYY-MM-DD HH:mm:ss';
 * 以dayjs之utc外掛指定固定偏移+8, 不受執行環境時區影響(在UTC伺服器上結果相同)
 *
 * @param {String|Number|Date} value 輸入ISO或RFC822時間字串、unix秒數或Date物件
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
 * console.log(toDatetimeUTC8('abc'), toDatetimeUTC8(''), toDatetimeUTC8(null))
 * // => '' '' ''
 *
 */
function toDatetimeUTC8(value) {

    let dt = null

    //數值一律視為unix秒數, dayjs之ot(number)為毫秒故須改用ot.unix
    if (isnum(value)) {
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
    }
    else {
        return ''
    }

    //check
    if (!dt.isValid()) {
        return ''
    }

    return dt.utcOffset(TZ_OFFSET_HOUR).format(FORMAT)
}


export default toDatetimeUTC8
