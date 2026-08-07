import get from 'lodash-es/get.js'
import isbol from 'wsemi/src/isbol.mjs'
import isstr from 'wsemi/src/isstr.mjs'
import decodeEntities from './decodeEntities.mjs'


/**
 * HTML轉Markdown
 *
 * 採正則式逐項轉換, 不引入DOM解析器, 適用於已切出之正文區塊;
 * 先移除script、style與註解, 再轉換標題、粗體、斜體、換行、連結與段落, 最後清除殘留標籤並收斂空行
 *
 * @param {String} html 輸入HTML字串
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Boolean} [opt.image=false] 輸入是否將img標籤轉為Markdown圖片語法布林值，預設false代表直接移除
 * @returns {String} 回傳Markdown字串，輸入非字串時回傳''
 * @example
 *
 * import htmlToMarkdown from './src/htmlToMarkdown.mjs'
 *
 * console.log(htmlToMarkdown('<p>a<b>b</b></p><p>c</p>'))
 * // => 'a**b**\n\nc'
 *
 * console.log(htmlToMarkdown('<p><img src="a.png" /></p>', { image: true }))
 * // => '![](a.png)'
 *
 */
function htmlToMarkdown(html, opt = {}) {

    //check
    if (!isstr(html)) {
        return ''
    }

    //image
    let image = get(opt, 'image')
    if (!isbol(image)) {
        image = false
    }

    let s = html

    //移除script、style與註解
    s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
    s = s.replace(/<style[\s\S]*?<\/style>/gi, '')
    s = s.replace(/<!--[\s\S]*?-->/g, '')

    //img
    if (image) {
        s = s.replace(/<img[^>]*src="([^"]+)"[^>]*\/?>/gi, (m, url) => `![](${url})`)
    }

    //h1-h6轉粗體段落
    s = s.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n**$1**\n\n')

    //strong與b
    //標籤名後須緊接'>'或空白, 否則<br>會被b規則吃掉而變成'**'(在br規則之前)
    s = s.replace(/<\/?(?:strong|b)(?:\s[^>]*)?>/gi, '**')

    //em與i
    //同上, 標籤名後須緊接'>'或空白, 否則<img>會被i規則吃掉而變成'*'
    s = s.replace(/<\/?(?:em|i)(?:\s[^>]*)?>/gi, '*')

    //br
    s = s.replace(/<br\s*\/?>/gi, '\n')

    //a
    s = s.replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, url, text) => {
        let t = text.replace(/<[^>]+>/g, '').trim()
        return t ? `[${t}](${url})` : ''
    })

    //p
    s = s.replace(/<p(?:\s[^>]*)?>/gi, '')
    s = s.replace(/<\/p>/gi, '\n\n')

    //雜項容器標籤
    s = s.replace(/<\/?(?:div|span|section|article|font|u)(?:\s[^>]*)?>/gi, '')

    //其餘殘留標籤
    s = s.replace(/<[^>]+>/g, '')

    //實體
    s = decodeEntities(s)

    //行內空白標準化
    s = s.split('\n').map((l) => l.replace(/[ \t\u00A0]+/g, ' ').trimEnd()).join('\n')

    //多重空行收斂
    s = s.replace(/\n{3,}/g, '\n\n').replace(/\*\*\s*\*\*/g, '')

    return s.trim()
}


export default htmlToMarkdown
