import assert from 'assert'
import fetchTwseMargin from '../src/fetchTwseMargin.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchTwseMargin', function() {

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
        await fetchTwseMargin('2026-08-07', [], optFast)
            .catch((err) => {
                r.push(err.message)
            })
        await fetchTwseMargin('20260230', [], optFast)
            .catch((err) => {
                r.push(err.message)
            })
        let rr = [
            '日期參數無效：格式須為 YYYYMMDD (收到 "2026-08-07")',
            '日期參數無效：不合法的日期 (20260230)',
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('以標題「融資融券彙總」選表, 不誤取第一張有資料表', async function() {
        let t = await fetchTwseMargin('20260807', [], optFast)
        let r = [t.source, t.date, t.count, t.data[0].code, t.data[0].name]
        let rr = ['twse_margin', '20260807', 2, '2330', '台積電']
        assert.strict.deepEqual(r, rr)
    })

    it('依固定欄序解析融資融券並算出增減', async function() {
        let t = await fetchTwseMargin('20260807', ['2330'], optFast)
        let rr = {
            code: '2330',
            name: '台積電',
            marginBuy: 1000,
            marginSell: 500,
            marginCashRepay: 100,
            marginPrevBalance: 10000,
            marginBalance: 10400,
            marginChange: 400,
            marginLimit: 99999,
            shortSell: 300,
            shortBuy: 200,
            shortCashRepay: 50,
            shortPrevBalance: 2000,
            shortBalance: 2250,
            shortChange: 250,
            shortLimit: 88888,
            offset: 10,
            note: '',
        }
        assert.strict.deepEqual(t.data[0], rr)
    })

    it('指定個股查無資料時reject', async function() {
        let r = null
        await fetchTwseMargin('20260807', ['6488'], optFast)
            .catch((err) => {
                r = err.message
            })
        let rr = '指定個股 6488 不在上市融資融券資料中（可能為上櫃股或代碼有誤）'
        assert.strict.deepEqual(r, rr)
    })

})
