import assert from 'assert'
import fetchCnyes from '../src/fetchCnyes.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchCnyes', function() {

    let svr = null

    before(async function() {
        svr = await serverForTest()
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('轉為統一格式並組出新聞內容頁網址', async function() {
        let r = await fetchCnyes({ url: svr.url('/cnyes/newslist'), pageDelayMs: 0, showLog: false })
        let rr = [
            { time: '2026-08-06 15:06:40', title: '鉅亨標題一', link: 'https://news.cnyes.com/news/id/5001' },
            { time: '', title: '鉅亨標題二', link: 'https://news.cnyes.com/news/id/5002' },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('publishAt缺漏時該筆time退回空字串, 不影響其餘新聞', async function() {
        let t = await fetchCnyes({ url: svr.url('/cnyes/newslist'), pageDelayMs: 0, showLog: false })
        let r = [t.length, t[1].time, t[1].title]
        let rr = [2, '', '鉅亨標題二']
        assert.strict.deepEqual(r, rr)
    })

    it('無更多資料時停止翻頁', async function() {
        let c0 = svr.getCount('/cnyes/newslist')
        await fetchCnyes({ url: svr.url('/cnyes/newslist'), pageDelayMs: 0, showLog: false })
        let r = svr.getCount('/cnyes/newslist') - c0
        let rr = 2
        assert.strict.deepEqual(r, rr)
    })

    it('targetTotal達標即停止翻頁', async function() {
        let c0 = svr.getCount('/cnyes/newslist')
        let t = await fetchCnyes({ url: svr.url('/cnyes/newslist'), targetTotal: 1, pageDelayMs: 0, showLog: false })
        let r = [t.length, svr.getCount('/cnyes/newslist') - c0]
        let rr = [1, 1]
        assert.strict.deepEqual(r, rr)
    })

    it('HTTP 403納入重試範圍, 含初始共執行maxRetries+1次', async function() {
        let c0 = svr.getCount('/status/403')
        await fetchCnyes({ url: svr.url('/status/403'), maxRetries: 2, baseDelayMs: 10, maxDelayMs: 10, pageDelayMs: 0, showLog: false })
            .catch(() => {})
        let r = svr.getCount('/status/403') - c0
        let rr = 3
        assert.strict.deepEqual(r, rr)
    })

})
