import assert from 'assert'
import htmlToMarkdown from '../src/htmlToMarkdown.mjs'


describe('htmlToMarkdown', function() {

    it('段落轉為空行分隔', function() {
        let r = htmlToMarkdown('<p>第一段</p><p>第二段</p>')
        let rr = '第一段\n\n第二段'
        assert.strict.deepEqual(r, rr)
    })

    it('粗體與斜體轉為Markdown標記', function() {
        let r = htmlToMarkdown('<p>a<b>粗</b>b<strong>體</strong>c<i>斜</i>d<em>體</em></p>')
        let rr = 'a**粗**b**體**c*斜*d*體*'
        assert.strict.deepEqual(r, rr)
    })

    it('標題轉為粗體段落', function() {
        let r = htmlToMarkdown('<h1>標題</h1><p>內文</p>')
        let rr = '**標題**\n\n內文'
        assert.strict.deepEqual(r, rr)
    })

    it('連結轉為Markdown連結, 無文字之連結被移除', function() {
        let r = [
            htmlToMarkdown('<p><a href="https://a.example/">連結</a></p>'),
            htmlToMarkdown('<p>x<a href="https://a.example/"></a>y</p>'),
        ]
        let rr = ['[連結](https://a.example/)', 'xy']
        assert.strict.deepEqual(r, rr)
    })

    it('br轉為換行', function() {
        let r = htmlToMarkdown('<p>一<br/>二<br>三</p>')
        let rr = '一\n二\n三'
        assert.strict.deepEqual(r, rr)
    })

    it('移除script、style與註解', function() {
        let r = htmlToMarkdown('<p>前</p><script>var a=1</script><style>.a{}</style><!--註解--><p>後</p>')
        let rr = '前\n\n後'
        assert.strict.deepEqual(r, rr)
    })

    it('解碼HTML實體並收斂多重空行', function() {
        let r = htmlToMarkdown('<p>a&amp;b</p><p></p><p></p><p>c</p>')
        let rr = 'a&b\n\nc'
        assert.strict.deepEqual(r, rr)
    })

    it('預設移除img, image為true時轉為Markdown圖片', function() {
        let r = [
            htmlToMarkdown('<p><img src="https://a.example/1.png" />文字</p>'),
            htmlToMarkdown('<p><img src="https://a.example/1.png" />文字</p>', { image: true }),
        ]
        let rr = ['文字', '![](https://a.example/1.png)文字']
        assert.strict.deepEqual(r, rr)
    })

    it('非字串回傳空字串', function() {
        let r = [
            htmlToMarkdown(null),
            htmlToMarkdown(undefined),
            htmlToMarkdown(123),
        ]
        let rr = ['', '', '']
        assert.strict.deepEqual(r, rr)
    })

})
