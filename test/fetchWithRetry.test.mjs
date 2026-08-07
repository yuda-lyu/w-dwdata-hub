import assert from 'assert'
import fetchWithRetry from '../src/fetchWithRetry.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchWithRetry', function() {

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

    it('非有效字串網址拋錯', async function() {
        let r = []
        for (let url of [null, undefined, '', 123, {}]) {
            await fetchWithRetry(url)
                .then(() => {
                    r.push('resolved')
                })
                .catch((err) => {
                    r.push(err.message.startsWith('url須為有效字串'))
                })
        }
        let rr = [true, true, true, true, true]
        assert.strict.deepEqual(r, rr)
    })

    it('responseType預設為json並回傳物件', async function() {
        let r = await fetchWithRetry(svr.url('/json/ok'), optFast)
        let rr = { ok: true, value: 1 }
        assert.strict.deepEqual(r, rr)
    })

    it('responseType為text時回傳原始字串', async function() {
        let t = await fetchWithRetry(svr.url('/rss/feed.xml'), { ...optFast, responseType: 'text' })
        let r = [typeof t, t.includes('<title>測試訂閱源</title>')]
        let rr = ['string', true]
        assert.strict.deepEqual(r, rr)
    })

    it('responseType為text且指定encoding時以該編碼解碼', async function() {
        let r = await fetchWithRetry(svr.url('/text/big5'), { ...optFast, responseType: 'text', encoding: 'big5' })
        let rr = '中文測試,Big5編碼'
        assert.strict.deepEqual(r, rr)
    })

    it('responseType為text但未指定encoding時以utf-8解碼, Big5內容會解出亂碼', async function() {
        let t = await fetchWithRetry(svr.url('/text/big5'), { ...optFast, responseType: 'text' })
        let r = t === '中文測試,Big5編碼'
        let rr = false
        assert.strict.deepEqual(r, rr)
    })

    it('responseType為arrayBuffer時回傳ArrayBuffer', async function() {
        let t = await fetchWithRetry(svr.url('/text/big5'), { ...optFast, responseType: 'arrayBuffer' })
        let r = [t instanceof ArrayBuffer, new TextDecoder('big5').decode(t)]
        let rr = [true, '中文測試,Big5編碼']
        assert.strict.deepEqual(r, rr)
    })

    it('回傳非JSON時拋出可讀錯誤而非裸SyntaxError', async function() {
        let r = null
        await fetchWithRetry(svr.url('/json/bad'), optFast)
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = [err.message.startsWith('回傳非JSON格式'), err instanceof SyntaxError]
            })
        let rr = [true, false]
        assert.strict.deepEqual(r, rr)
    })

    it('HTTP 404不重試, 僅執行1次且錯誤帶statusCode', async function() {
        let c0 = svr.getCount('/status/404')
        let e = null
        await fetchWithRetry(svr.url('/status/404'), { ...optFast, maxRetries: 5 })
            .catch((err) => {
                e = err
            })
        let r = [e.statusCode, svr.getCount('/status/404') - c0]
        let rr = [404, 1]
        assert.strict.deepEqual(r, rr)
    })

    it('HTTP 403預設不重試', async function() {
        let c0 = svr.getCount('/status/403')
        await fetchWithRetry(svr.url('/status/403'), { ...optFast, maxRetries: 3 })
            .catch(() => {})
        let r = svr.getCount('/status/403') - c0
        let rr = 1
        assert.strict.deepEqual(r, rr)
    })

    it('HTTP 403於retryStatus指定時會重試, 含初始共執行maxRetries+1次', async function() {
        let c0 = svr.getCount('/status/403')
        await fetchWithRetry(svr.url('/status/403'), { ...optFast, maxRetries: 3, retryStatus: [403] })
            .catch(() => {})
        let r = svr.getCount('/status/403') - c0
        let rr = 4
        assert.strict.deepEqual(r, rr)
    })

    it('HTTP 500重試至次數用盡, 含初始共執行maxRetries+1次', async function() {
        let c0 = svr.getCount('/status/500')
        let e = null
        await fetchWithRetry(svr.url('/status/500'), { ...optFast, maxRetries: 2 })
            .catch((err) => {
                e = err
            })
        let r = [e.statusCode, svr.getCount('/status/500') - c0]
        let rr = [500, 3]
        assert.strict.deepEqual(r, rr)
    })

    it('HTTP 429會重試', async function() {
        let c0 = svr.getCount('/status/429')
        await fetchWithRetry(svr.url('/status/429'), { ...optFast, maxRetries: 2 })
            .catch(() => {})
        let r = svr.getCount('/status/429') - c0
        let rr = 3
        assert.strict.deepEqual(r, rr)
    })

    it('暫時性失敗於重試後成功', async function() {
        await fetchWithRetry(svr.url('/flaky/reset'), optFast)
        let t = await fetchWithRetry(svr.url('/flaky/503?n=2'), { ...optFast, maxRetries: 5 })
        let r = [t.ok, t.failed]
        let rr = [true, 2]
        assert.strict.deepEqual(r, rr)
    })

    it('連線不到之埠號視為網路層錯誤並重試', async function() {
        let e = null
        await fetchWithRetry('http://127.0.0.1:1/abc', { ...optFast, maxRetries: 1, timeout: 2000 })
            .catch((err) => {
                e = err
            })
        let r = e !== null
        let rr = true
        assert.strict.deepEqual(r, rr)
    })

    it('逾時視為可重試錯誤, maxRetries為0時僅執行1次', async function() {
        let c0 = svr.getCount('/slow')
        let e = null
        await fetchWithRetry(svr.url('/slow?ms=300'), { ...optFast, maxRetries: 0, timeout: 50 })
            .catch((err) => {
                e = err
            })
        let r = [e !== null, svr.getCount('/slow') - c0]
        let rr = [true, 1]
        assert.strict.deepEqual(r, rr)
    })

    it('未指定User-Agent時自動補預設值, 指定時以指定者為準', async function() {
        let t1 = await fetchWithRetry(svr.url('/echo'), optFast)
        let t2 = await fetchWithRetry(svr.url('/echo'), { ...optFast, headers: { 'User-Agent': 'my-ua' } })
        let r = [t1.headers['user-agent'].includes('Mozilla/5.0'), t2.headers['user-agent']]
        let rr = [true, 'my-ua']
        assert.strict.deepEqual(r, rr)
    })

})
