import assert from 'assert'
import fetchTpex3insti from '../src/fetchTpex3insti.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchTpex3insti', function() {

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
        await fetchTpex3insti('2026-08-07', [], optFast)
            .catch((err) => {
                r.push(err.message)
            })
        await fetchTpex3insti('20260230', [], optFast)
            .catch((err) => {
                r.push(err.message)
            })
        let rr = [
            'dateStr must be YYYYMMDD, got: 2026-08-07',
            'dateStr 不是合法日期: 20260230',
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('以固定位置還原7組明細欄名, 不因裸欄名重複而塌成1組', async function() {
        let t = await fetchTpex3insti('20260807', ['6488'], optFast)
        let rr = {
            '代號': '6488',
            '名稱': '環球晶',
            '外陸資買進股數(不含外資自營商)': '100',
            '外陸資賣出股數(不含外資自營商)': '50',
            '外陸資買賣超股數(不含外資自營商)': '50',
            '外資自營商買進股數': '10',
            '外資自營商賣出股數': '5',
            '外資自營商買賣超股數': '5',
            '外資及陸資買進股數': '110',
            '外資及陸資賣出股數': '55',
            '外資及陸資買賣超股數': '55',
            '投信買進股數': '200',
            '投信賣出股數': '100',
            '投信買賣超股數': '100',
            '自營商買進股數(自行買賣)': '30',
            '自營商賣出股數(自行買賣)': '10',
            '自營商買賣超股數(自行買賣)': '20',
            '自營商買進股數(避險)': '40',
            '自營商賣出股數(避險)': '20',
            '自營商買賣超股數(避險)': '20',
            '自營商買進股數': '70',
            '自營商賣出股數': '30',
            '自營商買賣超股數': '40',
            '三大法人買賣超股數合計': '195',
        }
        assert.strict.deepEqual(t.data[0], rr)
    })

    it('未指定個股時回傳全市場', async function() {
        let t = await fetchTpex3insti('20260807', [], optFast)
        let r = [t.source, t.date, t.data.length]
        let rr = ['tpex', '20260807', 2]
        assert.strict.deepEqual(r, rr)
    })

    it('欄序已變時fail-loud, 避免把外資數字貼到投信頭上', async function() {
        let r = null
        await fetchTpex3insti('20260807', [], { ...optFast, baseUrl: svr.url('/bad-shape') })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = err.message
            })
        let rr = 'TPEX 3insti: 欄數異常，預期 24 得 6（疑似 API 改版，請重新校準 TPEX_FIELD_MAP）'
        assert.strict.deepEqual(r, rr)
    })

})
