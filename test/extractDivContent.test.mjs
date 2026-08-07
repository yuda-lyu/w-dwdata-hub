import assert from 'assert'
import extractDivContent from '../src/extractDivContent.mjs'


describe('extractDivContent', function() {

    it('以深度追蹤切出含巢狀div之完整內容', function() {
        let r = extractDivContent('<body><div class="ct">a<div>b</div>c</div><p>外部</p></body>', 'ct')
        let rr = 'a<div>b</div>c'
        assert.strict.deepEqual(r, rr)
    })

    it('切出空容器回傳空字串而非null', function() {
        let r = extractDivContent('<div class="ct"></div><div class="side"><a>不應被抓</a></div>', 'ct')
        let rr = ''
        assert.strict.deepEqual(r, rr)
    })

    it('起始標籤採前綴比對, div帶其他屬性亦可命中', function() {
        let r = extractDivContent('<div class="content all-txt" id="cont"><p>內文</p></div>', 'content all-txt')
        let rr = '<p>內文</p>'
        assert.strict.deepEqual(r, rr)
    })

    it('找不到指定class回傳null', function() {
        let r = extractDivContent('<div class="other">a</div>', 'ct')
        let rr = null
        assert.strict.deepEqual(r, rr)
    })

    it('標籤未閉合回傳null', function() {
        let r = extractDivContent('<div class="ct">a<div>b', 'ct')
        let rr = null
        assert.strict.deepEqual(r, rr)
    })

    it('非有效輸入回傳null', function() {
        let r = [
            extractDivContent(null, 'ct'),
            extractDivContent('<div class="ct">a</div>', ''),
            extractDivContent('<div class="ct">a</div>', null),
            extractDivContent(123, 'ct'),
        ]
        let rr = [null, null, null, null]
        assert.strict.deepEqual(r, rr)
    })

})
