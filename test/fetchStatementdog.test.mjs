import assert from 'assert'
import fetchStatementdog from '../src/fetchStatementdog.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchStatementdog', function() {

    let svr = null

    //optFast, 令重試等待縮至10毫秒, 避免測試耗時
    let optFast = { baseDelayMs: 10, maxDelayMs: 10, showLog: false }

    before(async function() {
        svr = await serverForTest()
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('以主要selector解析, 相對路徑連結補上來源網址origin', async function() {
        let r = await fetchStatementdog({ ...optFast, url: svr.url('/statementdog/news/latest') })
        let rr = [
            { time: '2026-08-07', title: '財報狗標題一', link: svr.url('/news/n1') },
            { time: '2026-08-06', title: '財報狗標題二', link: 'https://other.example/n2' },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('無標題之項目被略過', async function() {
        let t = await fetchStatementdog({ ...optFast, url: svr.url('/statementdog/news/latest') })
        let r = t.length
        let rr = 2
        assert.strict.deepEqual(r, rr)
    })

    it('主要selector未匹配時改用備援selector', async function() {
        let t = await fetchStatementdog({ ...optFast, url: svr.url('/statementdog-fallback/news/latest') })
        let r = [t.length, t[0].title, t[0].link]
        let rr = [2, '備援標題一', svr.url('/news/f1')]
        assert.strict.deepEqual(r, rr)
    })

    it('解析到0筆時reject且不重試', async function() {
        let c0 = svr.getCount('/statementdog-empty/news/latest')
        let r = null
        await fetchStatementdog({ ...optFast, url: svr.url('/statementdog-empty/news/latest'), maxRetries: 3 })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = [err.message.startsWith('抓取到 0 筆新聞'), svr.getCount('/statementdog-empty/news/latest') - c0]
            })
        let rr = [true, 1]
        assert.strict.deepEqual(r, rr)
    })

    it('HTTP 403納入重試範圍, 含初始共執行maxRetries+1次', async function() {
        let c0 = svr.getCount('/status/403')
        await fetchStatementdog({ ...optFast, url: svr.url('/status/403'), maxRetries: 2 })
            .catch(() => {})
        let r = svr.getCount('/status/403') - c0
        let rr = 3
        assert.strict.deepEqual(r, rr)
    })

})
