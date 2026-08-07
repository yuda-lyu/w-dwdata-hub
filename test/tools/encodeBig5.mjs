//由TextDecoder('big5')反推之編碼表, 首次呼叫時建立後快取
let mapChar2Bytes = null


/**
 * 建立Big5編碼表
 *
 * node內建TextDecoder可解Big5但TextEncoder僅支援utf-8, 故以TextDecoder逐一解碼合法雙位元組序列反推編碼表,
 * 令測試不需額外相依即可產生Big5位元組(期交所CSV為Big5編碼)
 *
 * @returns {Map} 回傳字元對應位元組陣列之Map
 */
function buildMap() {

    let m = new Map()
    let dec = new TextDecoder('big5')

    //單位元組(ASCII)
    for (let b = 0; b < 0x80; b++) {
        m.set(String.fromCharCode(b), [b])
    }

    //雙位元組, lead為0x81-0xFE, trail為0x40-0x7E與0xA1-0xFE
    for (let lead = 0x81; lead <= 0xFE; lead++) {
        for (let trail = 0x40; trail <= 0xFE; trail++) {
            if (trail > 0x7E && trail < 0xA1) {
                continue
            }
            let s = dec.decode(new Uint8Array([lead, trail]))
            if (s.length !== 1 || s === '�') {
                continue
            }
            if (!m.has(s)) {
                m.set(s, [lead, trail])
            }
        }
    }

    return m
}


/**
 * 字串編碼為Big5位元組
 *
 * 供測試伺服器產生期交所風格之Big5 CSV, 無對應碼位之字元以'?'替代
 *
 * @param {String} str 輸入字串
 * @returns {Buffer} 回傳Big5編碼之Buffer
 * @example
 *
 * import encodeBig5 from './tools/encodeBig5.mjs'
 *
 * let buf = encodeBig5('契約')
 * console.log(new TextDecoder('big5').decode(buf))
 * // => '契約'
 *
 */
function encodeBig5(str) {

    if (mapChar2Bytes === null) {
        mapChar2Bytes = buildMap()
    }

    let bytes = []
    for (let ch of String(str)) {
        let bs = mapChar2Bytes.get(ch)
        if (bs === undefined) {
            bytes.push(0x3F) //'?'
        }
        else {
            bytes.push(...bs)
        }
    }

    return Buffer.from(bytes)
}


export default encodeBig5
