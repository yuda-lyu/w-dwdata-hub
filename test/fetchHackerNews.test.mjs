import assert from 'assert'
import fetchHackerNews from '../src/fetchHackerNews.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchHackerNews', function() {

    let svr = null

    before(async function() {
        svr = await serverForTest()
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('僅保留story, 無url者退回站內討論頁網址', async function() {
        let r = await fetchHackerNews(30, { apiBase: svr.url('/hn'), showLog: false })
        let rr = [
            {
                url: 'https://hn.example/1',
                time: '2026-08-06 15:06:40',
                title: 'HN標題一',
                description: '',
                from: 'Hacker News',
            },
            {
                url: 'https://news.ycombinator.com/item?id=102',
                time: '2026-08-06 15:07:40',
                title: 'HN標題二',
                description: '',
                from: 'Hacker News',
            },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('limit限制取回篇數', async function() {
        let t = await fetchHackerNews(1, { apiBase: svr.url('/hn'), showLog: false })
        let r = [t.length, t[0].title]
        let rr = [1, 'HN標題一']
        assert.strict.deepEqual(r, rr)
    })

    it('limit非正整數時改用預設值30而非回傳空陣列', async function() {
        let r = []
        for (let limit of [0, -1, NaN, null, undefined, 'abc']) {
            let t = await fetchHackerNews(limit, { apiBase: svr.url('/hn'), showLog: false })
            r.push(t.length)
        }
        let rr = [2, 2, 2, 2, 2, 2]
        assert.strict.deepEqual(r, rr)
    })

    it('apiBase尾端斜線會被正規化', async function() {
        let t = await fetchHackerNews(30, { apiBase: svr.url('/hn') + '/', showLog: false })
        let r = t.length
        let rr = 2
        assert.strict.deepEqual(r, rr)
    })

    it('取ID清單失敗時reject', async function() {
        let r = null
        await fetchHackerNews(30, { apiBase: svr.url('/nothing'), maxRetries: 0, showLog: false })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = err.statusCode
            })
        let rr = 404
        assert.strict.deepEqual(r, rr)
    })

})
