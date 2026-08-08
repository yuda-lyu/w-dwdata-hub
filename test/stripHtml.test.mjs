import assert from 'assert'
import stripHtml from '../src/stripHtml.mjs'


describe('stripHtml', function() {

    it('去除標籤輸出純文字, 段落閉合轉為換行', function() {
        let r = stripHtml('<p>第一段<b>粗體</b></p><p>第二段</p>')
        let rr = '第一段粗體\n第二段'
        assert.strict.deepEqual(r, rr)
    })

    it('與htmlToMarkdown不同, 不產生Markdown標記', function() {
        let r = stripHtml('<h1>標題</h1><p><a href="https://a.example/">連結</a>與<em>斜體</em></p>')
        let rr = '標題\n連結與斜體'
        assert.strict.deepEqual(r, rr)
    })

    it('移除script與style', function() {
        let r = stripHtml('<p>前</p><script>var a=1</script><style>.a{}</style><p>後</p>')
        let rr = '前\n後'
        assert.strict.deepEqual(r, rr)
    })

    it('br與li閉合轉為換行, 開標籤不產生換行', function() {
        let r = [
            stripHtml('一<br/>二<br>三'),
            stripHtml('<ul><li>三</li><li>四</li></ul>'),
        ]
        let rr = ['一\n二\n三', '三\n四']
        assert.strict.deepEqual(r, rr)
    })

    it('解碼實體且nbsp統一為半形空白', function() {
        let t = stripHtml('<p>a&amp;b&nbsp;c&hellip;</p>')
        let r = [t, t.includes('\u00A0')]
        let rr = ['a&b c…', false]
        assert.strict.deepEqual(r, rr)
    })

    it('多重空行收斂且前後修剪', function() {
        let r = stripHtml('<p></p><p></p><p>內文</p><p></p>')
        let rr = '內文'
        assert.strict.deepEqual(r, rr)
    })

    it('非字串回傳空字串', function() {
        let r = [
            stripHtml(null),
            stripHtml(undefined),
            stripHtml(123),
            stripHtml({}),
        ]
        let rr = ['', '', '', '']
        assert.strict.deepEqual(r, rr)
    })

})
