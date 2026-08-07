import assert from 'assert'
import safeFilename from '../src/safeFilename.mjs'


describe('safeFilename', function() {

    it('替換Windows與POSIX不允許之字元為底線', function() {
        let r = safeFilename('a\\b/c:d*e?f"g<h>i|j')
        let rr = 'a_b_c_d_e_f_g_h_i_j'
        assert.strict.deepEqual(r, rr)
    })

    it('保留中文與一般字元', function() {
        let r = safeFilename('葛兆光：禅宗与中国文化 (2026)')
        let rr = '葛兆光：禅宗与中国文化 (2026)'
        assert.strict.deepEqual(r, rr)
    })

    it('截斷至200字元', function() {
        let r = safeFilename('a'.repeat(300)).length
        let rr = 200
        assert.strict.deepEqual(r, rr)
    })

    it('非字串轉為字串處理, null與undefined轉為空字串', function() {
        let r = [
            safeFilename(null),
            safeFilename(undefined),
            safeFilename(123),
        ]
        let rr = ['', '', '123']
        assert.strict.deepEqual(r, rr)
    })

})
