import assert from 'assert'
import fetchTpexMargin from '../src/fetchTpexMargin.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchTpexMargin', function() {

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

    it('日期格式錯誤與日期不合法之訊息不同', async function() {
        let r = []
        await fetchTpexMargin('2026-08-07', [], optFast)
            .catch((err) => {
                r.push(err.message)
            })
        await fetchTpexMargin('20260230', [], optFast)
            .catch((err) => {
                r.push(err.message)
            })
        let rr = [
            '日期參數無效：格式須為 YYYYMMDD (收到 "2026-08-07")',
            '日期參數無效：不合法的日期 (20260230)',
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('依固定欄序解析融資融券並算出增減', async function() {
        let t = await fetchTpexMargin('20260807', ['6488'], optFast)
        let rr = {
            code: '6488',
            name: '環球晶',
            marginBuy: 300,
            marginSell: 200,
            marginCashRepay: 50,
            marginPrevBalance: 5000,
            marginBalance: 5050,
            marginChange: 50,
            marginLimit: 400000,
            shortSell: 100,
            shortBuy: 80,
            shortCashRepay: 20,
            shortPrevBalance: 1000,
            shortBalance: 1000,
            shortChange: 0,
            shortLimit: 400000,
            offset: 30,
            note: '',
        }
        assert.strict.deepEqual(t.data[0], rr)
    })

    it('未指定個股時回傳全市場', async function() {
        let t = await fetchTpexMargin('20260807', [], optFast)
        let r = [t.source, t.date, t.count]
        let rr = ['tpex_margin', '20260807', 2]
        assert.strict.deepEqual(r, rr)
    })

    it('欄位佈局與預期不符時fail-loud, 不產生錯誤資料', async function() {
        let r = null
        await fetchTpexMargin('20260807', [], { ...optFast, baseUrl: svr.url('/bad-shape') })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = err.message.startsWith('TPEX 融資融券資料欄位佈局與預期不符')
            })
        let rr = true
        assert.strict.deepEqual(r, rr)
    })

    it('指定個股查無資料時reject', async function() {
        let r = null
        await fetchTpexMargin('20260807', ['2330'], optFast)
            .catch((err) => {
                r = err.message
            })
        let rr = '指定個股 2330 不在上櫃融資融券資料中（可能為上市股或代碼有誤）'
        assert.strict.deepEqual(r, rr)
    })

})
