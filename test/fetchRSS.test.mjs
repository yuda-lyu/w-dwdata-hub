import assert from 'assert'
import fetchRSS from '../src/fetchRSS.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchRSS', function() {

    let svr = null

    before(async function() {
        svr = await serverForTest()
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('非http與https網址拋錯', async function() {
        let r = []
        for (let url of [null, undefined, '', 123, 'abc', 'ftp://a.com/feed.xml']) {
            await fetchRSS(url)
                .then(() => {
                    r.push('resolved')
                })
                .catch((err) => {
                    r.push(err.message)
                })
        }
        let rr = [
            'rssUrl 須為有效的 http/https RSS 網址',
            'rssUrl 須為有效的 http/https RSS 網址',
            'rssUrl 須為有效的 http/https RSS 網址',
            'rssUrl 須為有效的 http/https RSS 網址',
            'rssUrl 須為有效的 http/https RSS 網址',
            'rssUrl 須為有效的 http/https RSS 網址',
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('解析RSS並轉為統一格式, from優先取creator否則退回訂閱源標題', async function() {
        let r = await fetchRSS(svr.url('/rss/feed.xml'), { showLog: false })
        let rr = [
            {
                url: 'https://rss.example/1',
                time: '2026-08-07 09:02:03',
                title: 'RSS標題一',
                description: '描述一',
                from: '作者甲',
            },
            {
                url: 'https://rss.example/2',
                time: '2026-08-07 10:03:04',
                title: 'RSS標題二',
                description: '描述二',
                from: '測試訂閱源',
            },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('HTTP 404納入重試範圍, 含初始共執行maxRetries+1次', async function() {
        let c0 = svr.getCount('/status/404')
        await fetchRSS(svr.url('/status/404'), { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 10, showLog: false })
            .catch(() => {})
        let r = svr.getCount('/status/404') - c0
        let rr = 3
        assert.strict.deepEqual(r, rr)
    })

    it('內容非XML時reject', async function() {
        let r = null
        await fetchRSS(svr.url('/json/ok'), { maxRetries: 0, showLog: false })
            .then(() => {
                r = 'resolved'
            })
            .catch(() => {
                r = 'rejected'
            })
        let rr = 'rejected'
        assert.strict.deepEqual(r, rr)
    })

    it('預設不附content欄, 回傳形狀維持五欄不變', async function() {
        let t = await fetchRSS(svr.url('/rss/feed-content.xml'), { showLog: false })
        let r = Object.keys(t[0])
        let rr = ['url', 'time', 'title', 'description', 'from']
        assert.strict.deepEqual(r, rr)
    })

    it('withContent為true時附content欄, 取content:encoded去標籤與實體且顯著長於description', async function() {
        let t = await fetchRSS(svr.url('/rss/feed-content.xml'), { withContent: true, showLog: false })
        let r = [
            Object.keys(t[0]),
            t[0].description,
            t[0].content,
            t[0].content.length > t[0].description.length * 4,
            t[0].content.includes('<'),
            t[0].content.includes('bad()'),
        ]
        let rr = [
            ['url', 'time', 'title', 'description', 'from', 'content'],
            '摘要開頭',
            '第一段完整全文，含粗體與&實體。\n第二段 內容，長度遠大於摘要，供斷言withContent顯著長於description。',
            true,
            false,
            false,
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('withContent對無content:encoded之feed(arXiv系)退取content, 全文與description一致', async function() {
        let t = await fetchRSS(svr.url('/rss/feed-desc.xml'), { withContent: true, showLog: false })
        let r = [t[0].content, t[0].content === t[0].description]
        let rr = ['arXiv:2608.01234 Announce Type: new Abstract: 這是一段完整摘要，不含HTML標籤，長度足以代表全文內容本體。', true]
        assert.strict.deepEqual(r, rr)
    })

    it('method為curl時走系統curl抓取, 解析結果與fetch相同', async function() {
        let t = await fetchRSS(svr.url('/rss/feed.xml'), { method: 'curl', maxRetries: 0, showLog: false })
        let r = [t.length, t[0].title, t[0].from, t[1].from]
        let rr = [2, 'RSS標題一', '作者甲', '測試訂閱源']
        assert.strict.deepEqual(r, rr)
    })

    it('curl模式對極短feed判empty-response而reject, 證明分派確實走curl路徑', async function() {
        //同一網址fetch模式可正常解析(見下一測試), 故此reject即為curl路徑之行為證據
        let r = null
        await fetchRSS(svr.url('/rss/feed-tiny.xml'), { method: 'curl', maxRetries: 0, showLog: false })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = err.reason
            })
        let rr = 'empty-response'
        assert.strict.deepEqual(r, rr)
    })

    it('fetch模式對極短feed正常解析為0項, 與curl模式行為對照', async function() {
        let r = await fetchRSS(svr.url('/rss/feed-tiny.xml'), { maxRetries: 0, showLog: false })
        let rr = []
        assert.strict.deepEqual(r, rr)
    })

    it('auto模式於curl失敗時退回fetch, 極短feed不reject而回0項', async function() {
        let r = await fetchRSS(svr.url('/rss/feed-tiny.xml'), { method: 'auto', maxRetries: 0, showLog: false })
        let rr = []
        assert.strict.deepEqual(r, rr)
    })

    it('method非法值一律退回預設fetch行為', async function() {
        let r = []
        for (let method of ['FETCH', 'wget', 123, null, {}]) {
            let t = await fetchRSS(svr.url('/rss/feed.xml'), { method, showLog: false })
            r.push(t.length)
        }
        let rr = [2, 2, 2, 2, 2]
        assert.strict.deepEqual(r, rr)
    })

})
