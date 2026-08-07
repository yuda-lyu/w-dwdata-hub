import assert from 'assert'
import fetchAiNewsAggregator from '../src/fetchAiNewsAggregator.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchAiNewsAggregator', function() {

    let svr = null

    before(async function() {
        svr = await serverForTest()
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('轉為統一格式並去除欄位前後空白', async function() {
        let r = await fetchAiNewsAggregator({ url: svr.url('/ai-news/latest-24h.json'), showLog: false })
        let rr = [
            {
                url: 'https://ai.example/a1',
                time: '2026-08-07 09:02:03',
                title: 'AI標題一',
                description: '',
                from: 'Example News',
            },
            {
                url: 'https://ai.example/a2',
                time: '',
                title: 'AI標題二',
                description: '',
                from: 'Other News',
            },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('published_at無法解析時time退回空字串', async function() {
        let t = await fetchAiNewsAggregator({ url: svr.url('/ai-news/latest-24h.json'), showLog: false })
        let r = t[1].time
        let rr = ''
        assert.strict.deepEqual(r, rr)
    })

    it('回傳非JSON時reject', async function() {
        let r = null
        await fetchAiNewsAggregator({ url: svr.url('/json/bad'), maxRetries: 0, showLog: false })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = err.message.startsWith('回傳非JSON格式')
            })
        let rr = true
        assert.strict.deepEqual(r, rr)
    })

    it('HTTP 404不重試並reject', async function() {
        let c0 = svr.getCount('/status/404')
        let e = null
        await fetchAiNewsAggregator({ url: svr.url('/status/404'), maxRetries: 3, showLog: false })
            .catch((err) => {
                e = err
            })
        let r = [e.statusCode, svr.getCount('/status/404') - c0]
        let rr = [404, 1]
        assert.strict.deepEqual(r, rr)
    })

    it('回應無items欄位時回傳空陣列', async function() {
        let r = await fetchAiNewsAggregator({ url: svr.url('/json/ok'), showLog: false })
        let rr = []
        assert.strict.deepEqual(r, rr)
    })

})
