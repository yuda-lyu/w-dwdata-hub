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

})
