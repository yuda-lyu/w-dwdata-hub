import assert from 'assert'
import fetchTwseT86 from '../src/fetchTwseT86.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchTwseT86', function() {

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
        await fetchTwseT86('2026-08-07', [], optFast)
            .catch((err) => {
                r.push(err.message)
            })
        await fetchTwseT86('20260230', [], optFast)
            .catch((err) => {
                r.push(err.message)
            })
        let rr = [
            'dateStr must be YYYYMMDD, got: 2026-08-07',
            'dateStr 不是合法日期: 20260230',
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('以API回傳之fields為key轉為物件陣列並去除欄位前後空白', async function() {
        let t = await fetchTwseT86('20260807', [], optFast)
        let rr = {
            source: 'twse',
            date: '20260807',
            data: [
                {
                    '證券代號': '2330',
                    '證券名稱': '台積電',
                    '外陸資買進股數(不含外資自營商)': '1,000,000',
                    '三大法人買賣超股數': '500,000',
                },
                {
                    '證券代號': '2317',
                    '證券名稱': '鴻海',
                    '外陸資買進股數(不含外資自營商)': '800,000',
                    '三大法人買賣超股數': '-200,000',
                },
            ],
        }
        assert.strict.deepEqual(t, rr)
    })

    it('指定個股時以證券代號欄過濾', async function() {
        let t = await fetchTwseT86('20260807', ['2317'], optFast)
        let r = [t.data.length, t.data[0]['證券代號']]
        let rr = [1, '2317']
        assert.strict.deepEqual(r, rr)
    })

    it('指定個股皆不存在時回傳空陣列', async function() {
        let t = await fetchTwseT86('20260807', ['9999'], optFast)
        let r = t.data
        let rr = []
        assert.strict.deepEqual(r, rr)
    })

})
