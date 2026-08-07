import isestr from 'wsemi/src/isestr.mjs'


/**
 * 西元YYYYMMDD日期字串轉民國日期字串
 *
 * 民國年為西元年減1911, 月與日保留原始2碼不補零亦不去零, 以符合證交所與櫃買中心API之查詢格式
 *
 * @param {String} dateStr 輸入西元日期YYYYMMDD字串
 * @returns {String} 回傳民國日期字串，格式為'YYY/MM/DD'，輸入非有效字串時回傳''
 * @example
 *
 * import toRocDate from './src/toRocDate.mjs'
 *
 * console.log(toRocDate('20260807'), toRocDate('19110101'))
 * // => '115/08/07' '0/01/01'
 *
 */
function toRocDate(dateStr) {

    //check
    if (!isestr(dateStr)) {
        return ''
    }

    //y, m, d
    let y = parseInt(dateStr.substring(0, 4), 10) - 1911
    let m = dateStr.substring(4, 6)
    let d = dateStr.substring(6, 8)

    return `${y}/${m}/${d}`
}


export default toRocDate
