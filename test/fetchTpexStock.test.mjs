import assert from 'assert'
import fetchTpexStock from '../src/fetchTpexStock.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchTpexStock', function() {

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
        for (let dateStr of ['', null, '2026-08-07', '20260230']) {
            await fetchTpexStock(dateStr, [], optFast)
                .then(() => {
                    r.push('resolved')
                })
                .catch((err) => {
                    r.push(err.message.startsWith('dateStr 須為合法之 YYYYMMDD 字串'))
                })
        }
        let rr = [true, true, true, true]
        assert.strict.deepEqual(r, rr)
    })

    it('未指定個股時回傳全市場', async function() {
        let t = await fetchTpexStock('20260807', undefined, optFast)
        let r = [t.source, t.date, t.count, t.data[0][0]]
        let rr = ['tpex', '20260807', 2, '6488']
        assert.strict.deepEqual(r, rr)
    })

    it('選表優先取標題含「行情」者而非第一張有資料表', async function() {
        let t = await fetchTpexStock('20260807', [], optFast)
        let r = [t.count, t.data[0].length >= 8]
        let rr = [2, true]
        assert.strict.deepEqual(r, rr)
    })

    it('指定個股時過濾為該個股', async function() {
        let t = await fetchTpexStock('20260807', ['6510'], optFast)
        let r = [t.count, t.data[0][0], t.data[0][1]]
        let rr = [1, '6510', '精測']
        assert.strict.deepEqual(r, rr)
    })

    it('指定個股查無資料時reject且訊息與整體無資料明確區分', async function() {
        let r = null
        await fetchTpexStock('20260807', ['2330'], optFast)
            .catch((err) => {
                r = err.message
            })
        let rr = '指定個股 2330 在 20260807 之上櫃資料中查無資料（可能為上市股、代碼有誤、或當日無交易）'
        assert.strict.deepEqual(r, rr)
    })

})
