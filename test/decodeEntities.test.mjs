import assert from 'assert'
import decodeEntities from '../src/decodeEntities.mjs'


describe('decodeEntities', function() {

    it('解碼具名實體', function() {
        let r = decodeEntities('a&amp;b&lt;c&gt;d&quot;e&apos;f&nbsp;g')
        let rr = 'a&b<c>d"e\'f g'
        assert.strict.deepEqual(r, rr)
    })

    it('解碼中文網站正文常見之標點實體', function() {
        let r = decodeEntities('&hellip;&mdash;&ndash;&middot;&laquo;&raquo;&copy;&reg;')
        let rr = '…—–·«»©®'
        assert.strict.deepEqual(r, rr)
    })

    it('解碼十進位與十六進位數值實體', function() {
        let r = decodeEntities('&#65;&#66;&#x43;&#x44;&#20013;&#x6587;')
        let rr = 'ABCD中文'
        assert.strict.deepEqual(r, rr)
    })

    it('無對照之具名實體保留原字串', function() {
        let r = decodeEntities('a&unknown;b&amp;c')
        let rr = 'a&unknown;b&c'
        assert.strict.deepEqual(r, rr)
    })

    it('非字串回傳空字串', function() {
        let r = [
            decodeEntities(null),
            decodeEntities(undefined),
            decodeEntities(123),
            decodeEntities({}),
        ]
        let rr = ['', '', '', '']
        assert.strict.deepEqual(r, rr)
    })

})
