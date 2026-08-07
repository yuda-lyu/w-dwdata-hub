import assert from 'assert'
import fetchTaifex from '../src/fetchTaifex.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchTaifex', function() {

    let svr = null
    let optFast = null

    before(async function() {
        svr = await serverForTest()
        optFast = { baseUrl: svr.url(''), baseDelayMs: 10, maxDelayMs: 10, interRequestDelayMs: 0, showLog: false }
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('日期格式錯誤與日期不合法之訊息不同', async function() {
        let r = []
        await fetchTaifex('2026-08-07', optFast)
            .catch((err) => {
                r.push(err.message)
            })
        await fetchTaifex('20260230', optFast)
            .catch((err) => {
                r.push(err.message)
            })
        let rr = [
            'dateStr 須為 YYYYMMDD 字串，得到: 2026-08-07',
            'dateStr 非合法日期: 20260230',
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('Big5編碼之CSV可正確解碼與解析', async function() {
        let t = await fetchTaifex('20260807', optFast)
        let r = [t.date, t.errors, t.futures.tx.contractMonth]
        let rr = ['20260807', [], '202608']
        assert.strict.deepEqual(r, rr)
    })

    it('台指期取近月合約, 排除到期月份含斜線之價差合約', async function() {
        let t = await fetchTaifex('20260807', optFast)
        let rr = {
            contractMonth: '202608',
            open: 23000,
            high: 23200,
            low: 22900,
            close: 23150,
            settlement: 23160,
            volume: 80000,
            afterHoursClose: 23250,
            afterHoursSettlement: 23260,
            afterHoursVolume: 20000,
        }
        assert.strict.deepEqual(t.futures.tx, rr)
    })

    it('三大法人期貨未平倉依身份別轉為foreign、trust與dealers', async function() {
        let t = await fetchTaifex('20260807', optFast)
        let r = [
            Object.keys(t.institutional).sort(),
            t.institutional.foreign.netContracts,
            t.institutional.trust.netContracts,
            t.institutional.dealers.netContracts,
        ]
        let rr = [['dealers', 'foreign', 'trust'], 20000, 1500, 1000]
        assert.strict.deepEqual(r, rr)
    })

    it('Put/Call Ratio解析為數值', async function() {
        let t = await fetchTaifex('20260807', optFast)
        let rr = {
            putVolume: 100000,
            callVolume: 90000,
            ratio: 111.11,
            putOpenInterest: 50000,
            callOpenInterest: 60000,
            openInterestRatio: 83.33,
        }
        assert.strict.deepEqual(t.pcRatio, rr)
    })

    it('三支資料全失敗時reject並帶errors', async function() {
        let e = null
        await fetchTaifex('20260807', { ...optFast, baseUrl: svr.url('/no-data') })
            .catch((err) => {
                e = err
            })
        let r = [e.message.startsWith('所有資料抓取失敗'), e.errors.length]
        let rr = [true, 3]
        assert.strict.deepEqual(r, rr)
    })

})
