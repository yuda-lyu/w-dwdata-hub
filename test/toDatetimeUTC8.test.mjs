import assert from 'assert'
import toDatetimeUTC8 from '../src/toDatetimeUTC8.mjs'


describe('toDatetimeUTC8', function() {

    it('ISO時間字串轉UTC+8', function() {
        let r = [
            toDatetimeUTC8('2026-08-07T01:02:03Z'),
            toDatetimeUTC8('2026-08-06T16:00:00Z'),
            toDatetimeUTC8('2026-12-31T20:00:00Z'),
        ]
        let rr = ['2026-08-07 09:02:03', '2026-08-07 00:00:00', '2027-01-01 04:00:00']
        assert.strict.deepEqual(r, rr)
    })

    it('RFC822時間字串轉UTC+8', function() {
        let r = [
            toDatetimeUTC8('Fri, 07 Aug 2026 01:02:03 GMT'),
            toDatetimeUTC8('Fri, 07 Aug 2026 02:03:04 GMT'),
        ]
        let rr = ['2026-08-07 09:02:03', '2026-08-07 10:03:04']
        assert.strict.deepEqual(r, rr)
    })

    it('數值視為unix秒數轉UTC+8', function() {
        let r = [
            toDatetimeUTC8(1786000000),
            toDatetimeUTC8(1786000060),
        ]
        let rr = ['2026-08-06 15:06:40', '2026-08-06 15:07:40']
        assert.strict.deepEqual(r, rr)
    })

    it('Date物件轉UTC+8', function() {
        let r = toDatetimeUTC8(new Date('2026-08-07T01:02:03Z'))
        let rr = '2026-08-07 09:02:03'
        assert.strict.deepEqual(r, rr)
    })

    it('不受執行環境時區影響, 一律以UTC+8輸出', function() {
        //以UTC+0與UTC+8之等價時刻做交叉驗證, 兩者應得相同結果
        let r = [
            toDatetimeUTC8('2026-08-07T01:02:03Z'),
            toDatetimeUTC8('2026-08-07T09:02:03+08:00'),
        ]
        let rr = ['2026-08-07 09:02:03', '2026-08-07 09:02:03']
        assert.strict.deepEqual(r, rr)
    })

    it('無法解析或為空時回傳空字串', function() {
        let r = [
            toDatetimeUTC8('not-a-date'),
            toDatetimeUTC8(''),
            toDatetimeUTC8(0),
            toDatetimeUTC8(null),
            toDatetimeUTC8(undefined),
            toDatetimeUTC8({}),
            toDatetimeUTC8([]),
        ]
        let rr = ['', '', '', '', '', '', '']
        assert.strict.deepEqual(r, rr)
    })

})
