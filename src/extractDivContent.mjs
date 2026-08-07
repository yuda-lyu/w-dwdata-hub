import isstr from 'wsemi/src/isstr.mjs'
import isestr from 'wsemi/src/isestr.mjs'


/**
 * 由HTML切出指定class之div內容
 *
 * 以深度追蹤(depth tracking)配對div開閉標籤, 比僅取首個</div>可靠, 亦能正確切出0結果之空容器;
 * 起始標籤採前綴比對, 故div上帶有其他屬性(如<div class="content all-txt" id="x">)亦可命中
 *
 * @param {String} html 輸入HTML字串
 * @param {String} className 輸入div之class屬性字串
 * @returns {String|null} 回傳div內容字串，找不到起始標籤或標籤未閉合時回傳null
 * @example
 *
 * import extractDivContent from './src/extractDivContent.mjs'
 *
 * console.log(extractDivContent('<div class="ct">a<div>b</div>c</div>', 'ct'))
 * // => 'a<div>b</div>c'
 *
 * console.log(extractDivContent('<div class="other">a</div>', 'ct'))
 * // => null
 *
 */
function extractDivContent(html, className) {

    //check
    if (!isstr(html)) {
        return null
    }
    if (!isestr(className)) {
        return null
    }

    //startIdx, 前綴比對以容忍div帶有其他屬性
    let startTag = `<div class="${className}"`
    let startIdx = html.indexOf(startTag)
    if (startIdx === -1) {
        return null
    }

    //tagClose, 找起始標籤之'>'
    let tagClose = html.indexOf('>', startIdx)
    if (tagClose === -1) {
        return null
    }

    //depth, 逐一配對div開閉標籤
    let contentStart = tagClose + 1
    let i = contentStart
    let depth = 1
    while (depth > 0 && i < html.length) {
        let open = html.indexOf('<div', i)
        let close = html.indexOf('</div>', i)
        if (close === -1) {
            return null
        }
        if (open !== -1 && open < close) {
            depth++
            i = open + 4
        }
        else {
            depth--
            if (depth === 0) {
                return html.slice(contentStart, close)
            }
            i = close + 6
        }
    }

    return null
}


export default extractDivContent
