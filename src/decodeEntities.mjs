import isstr from 'wsemi/src/isstr.mjs'


//常用具名HTML實體對照表, 涵蓋中文網站正文常見者
let NAMED = {
    nbsp: ' ',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: '\'',
    hellip: '…',
    mdash: '—',
    ndash: '–',
    middot: '·',
    ldquo: '"',
    rdquo: '"',
    lsquo: '‘',
    rsquo: '’',
    laquo: '«',
    raquo: '»',
    copy: '©',
    reg: '®',
}


/**
 * 解碼HTML實體
 *
 * 支援具名實體(如&amp;)、十進位數值實體(如&#39;)與十六進位數值實體(如&#x27;),
 * 無對照之具名實體保留原字串不動
 *
 * @param {String} str 輸入含HTML實體之字串
 * @returns {String} 回傳解碼後字串，輸入非字串時回傳''
 * @example
 *
 * import decodeEntities from './src/decodeEntities.mjs'
 *
 * console.log(decodeEntities('a&amp;b&#65;&#x42;&unknown;'))
 * // => 'a&bAB&unknown;'
 *
 */
function decodeEntities(str) {

    //check
    if (!isstr(str)) {
        return ''
    }

    return str
        .replace(/&([a-zA-Z]+);/g, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : m))
        .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([\da-fA-F]+);/g, (m, n) => String.fromCodePoint(parseInt(n, 16)))
}


export default decodeEntities
