import assert from 'assert'
import fetchMoneydj from '../src/fetchMoneydj.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchMoneydj', function() {

    let svr = null

    //optFast, 令重試與頁間等待縮至最短, 避免測試耗時
    let optFast = { baseDelayMs: 10, maxDelayMs: 10, pageDelayMs: 0, showLog: false }

    before(async function() {
        svr = await serverForTest()
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('逐頁抓取並合併, 相對路徑連結補上列表頁origin', async function() {
        let r = await fetchMoneydj({ ...optFast, baseUrl: svr.url('/moneydj/newsreallist.aspx?a=mb06&index1='), totalPages: 2 })
        let rr = [
            { time: '08/07 09:02', title: 'MoneyDJ標題一', link: svr.url('/kmdj/news/newsviewer.aspx?a=m1') },
            { time: '09:05', title: 'MoneyDJ標題二', link: 'https://www.moneydj.com/m2' },
            { time: '昨 23:59', title: 'MoneyDJ標題三', link: svr.url('/kmdj/news/newsviewer.aspx?a=m4') },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('時間格式不符之列被略過', async function() {
        let t = await fetchMoneydj({ ...optFast, baseUrl: svr.url('/moneydj/newsreallist.aspx?a=mb06&index1='), totalPages: 1 })
        let r = [t.length, t.some((v) => v.title === '不應出現')]
        let rr = [2, false]
        assert.strict.deepEqual(r, rr)
    })

    it('totalPages控制抓取頁數', async function() {
        let c0 = svr.getCount('/moneydj/newsreallist.aspx')
        await fetchMoneydj({ ...optFast, baseUrl: svr.url('/moneydj/newsreallist.aspx?a=mb06&index1='), totalPages: 3 })
        let r = svr.getCount('/moneydj/newsreallist.aspx') - c0
        let rr = 3
        assert.strict.deepEqual(r, rr)
    })

    it('onPageDone於每頁完成時被呼叫', async function() {
        let rs = []
        await fetchMoneydj({
            ...optFast,
            baseUrl: svr.url('/moneydj/newsreallist.aspx?a=mb06&index1='),
            totalPages: 2,
            onPageDone: (pageIndex, itemCount, totalPages) => {
                rs.push([pageIndex, itemCount, totalPages])
            },
        })
        let rr = [[1, 2, 2], [2, 1, 2]]
        assert.strict.deepEqual(rs, rr)
    })

    it('單頁抓取失敗時跳過該頁不中斷整體抓取', async function() {
        let t = await fetchMoneydj({ ...optFast, baseUrl: svr.url('/moneydj-flaky/newsreallist.aspx?index1='), totalPages: 2, maxRetries: 0 })
        let r = [t.length, t[0].title]
        let rr = [1, 'MoneyDJ標題三']
        assert.strict.deepEqual(r, rr)
    })

    it('全部頁面皆0筆時reject', async function() {
        let r = null
        await fetchMoneydj({ ...optFast, baseUrl: svr.url('/moneydj-empty/newsreallist.aspx?index1='), totalPages: 2 })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = err.message.startsWith('抓取到 0 筆新聞')
            })
        let rr = true
        assert.strict.deepEqual(r, rr)
    })

})
