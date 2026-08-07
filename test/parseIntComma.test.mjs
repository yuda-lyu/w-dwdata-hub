import assert from 'assert'
import parseIntComma from '../src/parseIntComma.mjs'


describe('parseIntComma', function() {

    it('去除千分位逗號後轉整數', function() {
        let r = [
            parseIntComma('1,234,567'),
            parseIntComma('1000'),
            parseIntComma('-1,500'),
            parseIntComma('0'),
        ]
        let rr = [1234567, 1000, -1500, 0]
        assert.strict.deepEqual(r, rr)
    })

    it('證交所與櫃買中心之缺值表示法轉為0', function() {
        let r = [
            parseIntComma('-'),
            parseIntComma(''),
            parseIntComma('N/A'),
        ]
        let rr = [0, 0, 0]
        assert.strict.deepEqual(r, rr)
    })

    it('非字串原樣回傳', function() {
        let r = [
            parseIntComma(12),
            parseIntComma(null),
            parseIntComma(undefined),
        ]
        let rr = [12, null, undefined]
        assert.strict.deepEqual(r, rr)
    })

})
