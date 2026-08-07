import isestr from 'wsemi/src/isestr.mjs'
import cint from 'wsemi/src/cint.mjs'


/**
 * 判斷是否為合法之YYYYMMDD日期字串
 *
 * 除檢核8碼數字格式外, 另檢核日曆合法性, 例如20260230雖為8碼數字但該日不存在
 *
 * @param {String} dateStr 輸入日期字串
 * @returns {Boolean} 回傳是否為合法YYYYMMDD日期字串之布林值
 * @example
 *
 * import isYmd from './src/isYmd.mjs'
 *
 * console.log(isYmd('20260807'), isYmd('20260230'), isYmd('2026-08-07'), isYmd(20260807))
 * // => true false false false
 *
 */
function isYmd(dateStr) {

    //check
    if (!isestr(dateStr)) {
        return false
    }
    if (!/^\d{8}$/.test(dateStr)) {
        return false
    }

    //y, m, d
    let y = cint(dateStr.slice(0, 4))
    let m = cint(dateStr.slice(4, 6))
    let d = cint(dateStr.slice(6, 8))

    //dt, 由Date回推以檢核日曆合法性
    let dt = new Date(y, m - 1, d)

    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}


export default isYmd
