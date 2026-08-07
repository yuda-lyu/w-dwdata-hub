import assert from 'assert'
import isYmd from '../src/isYmd.mjs'


describe('isYmd', function() {

    it('合法之YYYYMMDD字串為true', function() {
        let r = [
            isYmd('20260807'),
            isYmd('20000229'),
            isYmd('19110101'),
            isYmd('20261231'),
        ]
        let rr = [true, true, true, true]
        assert.strict.deepEqual(r, rr)
    })

    it('格式為8碼數字但日曆不存在之日期為false', function() {
        let r = [
            isYmd('20260230'),
            isYmd('20260231'),
            isYmd('20261301'),
            isYmd('20260732'),
            isYmd('20260000'),
            isYmd('21000229'),
        ]
        let rr = [false, false, false, false, false, false]
        assert.strict.deepEqual(r, rr)
    })

    it('非8碼數字格式為false', function() {
        let r = [
            isYmd('2026-08-07'),
            isYmd('2026080'),
            isYmd('202608071'),
            isYmd('2026080a'),
            isYmd(' 20260807'),
        ]
        let rr = [false, false, false, false, false]
        assert.strict.deepEqual(r, rr)
    })

    it('非有效字串為false', function() {
        let r = [
            isYmd(''),
            isYmd(null),
            isYmd(undefined),
            isYmd(20260807),
            isYmd({}),
            isYmd([]),
        ]
        let rr = [false, false, false, false, false, false]
        assert.strict.deepEqual(r, rr)
    })

})
