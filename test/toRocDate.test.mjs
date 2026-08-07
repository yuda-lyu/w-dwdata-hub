import assert from 'assert'
import toRocDate from '../src/toRocDate.mjs'


describe('toRocDate', function() {

    it('西元轉民國且月日保留原始2碼', function() {
        let r = [
            toRocDate('20260807'),
            toRocDate('20260101'),
            toRocDate('20261231'),
        ]
        let rr = ['115/08/07', '115/01/01', '115/12/31']
        assert.strict.deepEqual(r, rr)
    })

    it('民國元年與元年前之邊界', function() {
        let r = [
            toRocDate('19120101'),
            toRocDate('19110101'),
            toRocDate('19100101'),
        ]
        let rr = ['1/01/01', '0/01/01', '-1/01/01']
        assert.strict.deepEqual(r, rr)
    })

    it('非有效字串回傳空字串', function() {
        let r = [
            toRocDate(''),
            toRocDate(null),
            toRocDate(undefined),
            toRocDate(20260807),
        ]
        let rr = ['', '', '', '']
        assert.strict.deepEqual(r, rr)
    })

})
