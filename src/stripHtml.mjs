import isstr from 'wsemi/src/isstr.mjs'
import decodeEntities from './decodeEntities.mjs'


/**
 * 去除HTML標籤與實體, 保留段落換行
 *
 * 與htmlToMarkdown不同, 本函數輸出純文字(不產生Markdown標記), 供feed內嵌全文等
 * 「只要內文、不要格式」之場景使用;
 * 先移除script與style, 再將段落類閉合標籤與br轉為換行, 最後清除殘留標籤並解碼實體
 *
 * @param {String} html 輸入HTML字串
 * @returns {String} 回傳純文字字串，輸入非字串時回傳''
 * @example
 *
 * import stripHtml from './src/stripHtml.mjs'
 *
 * console.log(stripHtml('<p>第一段<b>粗體</b></p><p>第二段&amp;實體</p>'))
 * // => '第一段粗體\n第二段&實體'
 *
 */
function stripHtml(html) {

    //check
    if (!isstr(html)) {
        return ''
    }

    let s = html

    //移除script與style
    s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
    s = s.replace(/<style[\s\S]*?<\/style>/gi, '')

    //段落類閉合標籤與br轉為換行
    s = s.replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
    s = s.replace(/<br\s*\/?>/gi, '\n')

    //清除殘留標籤
    s = s.replace(/<[^>]+>/g, '')

    //解碼實體
    s = decodeEntities(s)

    //decodeEntities把&nbsp;解為U+00A0, 統一為半形空白(必須用顯式跳脫u00A0, 不可貼字面字元)
    s = s.replace(/\u00A0/g, ' ')

    //行內空白標準化
    s = s.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n')

    //多重空行收斂
    s = s.replace(/\n{3,}/g, '\n\n')

    return s.trim()
}


export default stripHtml
