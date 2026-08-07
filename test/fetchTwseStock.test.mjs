import assert from 'assert'
import fetchTwseStock from '../src/fetchTwseStock.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchTwseStock', function() {

    let svr = null
    let optFast = null

    before(async function() {
        svr = await serverForTest()
        optFast = { baseUrl: svr.url(''), baseDelayMs: 10, maxDelayMs: 10, showLog: false }
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('日期非合法YYYYMMDD時拋錯', async function() {
        let r = []
        for (let dateStr of ['', null, undefined, '2026-08-07', '20260230', 20260807]) {
            await fetchTwseStock(dateStr, '2330', optFast)
                .then(() => {
                    r.push('resolved')
                })
                .catch((err) => {
                    r.push(err.message.startsWith('dateStr 須為合法之 YYYYMMDD 字串'))
                })
        }
        let rr = [true, true, true, true, true, true]
        assert.strict.deepEqual(r, rr)
    })

    it('指定個股走STOCK_DAY並過濾為指定日單筆', async function() {
        let t = await fetchTwseStock('20260807', '2330', optFast)
        let r = [t.stat, t.data.length, t.data[0][0], t.data[0][6], t.fields.length]
        let rr = ['OK', 1, '115/08/07', '1,115.00', 9]
        assert.strict.deepEqual(r, rr)
    })

    it('未指定個股或指定all時走MI_INDEX取全市場', async function() {
        let t1 = await fetchTwseStock('20260807', undefined, optFast)
        let t2 = await fetchTwseStock('20260807', 'all', optFast)
        let t3 = await fetchTwseStock('20260807', 'ALL', optFast)
        let r = [t1.tables[0].data.length, t2.tables[0].data.length, t3.tables[0].data.length]
        let rr = [2, 2, 2]
        assert.strict.deepEqual(r, rr)
    })

    it('指定日無交易資料時reject並與整體無資料區分', async function() {
        let r = null
        await fetchTwseStock('20260808', '2330', optFast)
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = err.message
            })
        let rr = 'TWSE 個股 2330 於 20260808 無交易資料（可能為假日或停盤）'
        assert.strict.deepEqual(r, rr)
    })

    it('API回傳stat非OK時reject且不重試', async function() {
        let c0 = svr.getCount('/exchangeReport/STOCK_DAY')
        let r = null
        await fetchTwseStock('20090101', '2330', { ...optFast, maxRetries: 3 })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = [err.message.startsWith('TWSE API returned:'), svr.getCount('/exchangeReport/STOCK_DAY') - c0]
            })
        let rr = [true, 1]
        assert.strict.deepEqual(r, rr)
    })

})
