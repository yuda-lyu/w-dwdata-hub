/**
 * 含千分位逗號之字串轉整數
 *
 * 證交所與櫃買中心之數值欄位皆以逗號分隔千分位, 且缺值以'-'或空字串表示;
 * 非字串者原樣回傳(該類API之數值欄位偶為number), 無法轉為整數者回傳0
 *
 * @param {String} str 輸入含千分位逗號之數值字串
 * @returns {Number} 回傳整數，非字串輸入時原樣回傳，無法轉換時回傳0
 * @example
 *
 * import parseIntComma from './src/parseIntComma.mjs'
 *
 * console.log(parseIntComma('1,234,567'), parseIntComma('-'), parseIntComma(''), parseIntComma(12))
 * // => 1234567 0 0 12
 *
 */
function parseIntComma(str) {

    //check, 該類API之數值欄位偶為number, 原樣回傳
    if (typeof str !== 'string') {
        return str
    }

    return parseInt(str.replace(/,/g, ''), 10) || 0
}


export default parseIntComma
