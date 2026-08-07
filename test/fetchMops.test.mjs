import assert from 'assert'
import fetchMops, { MARKET_KINDS, getPayload } from '../src/fetchMops.mjs'
import serverForTest from './tools/serverForTest.mjs'
import hasChrome from './tools/hasChrome.mjs'


describe('fetchMops', function() {

    let svr = null
    let chromeOk = false

    before(async function() {
        this.timeout(120000)
        svr = await serverForTest()
        chromeOk = await hasChrome()
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('目標市場別為上市、上櫃、興櫃與公開發行共4種', function() {
        let r = MARKET_KINDS
        let rr = [
            { name: '上市', marketKind: 'sii' },
            { name: '上櫃', marketKind: 'otc' },
            { name: '興櫃', marketKind: 'rotc' },
            { name: '公開發行', marketKind: 'pub' },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('查詢payload帶入指定市場別且其餘欄位固定', function() {
        let r = getPayload('sii')
        let rr = {
            scopeType: '2',
            companyId: '',
            dateType: '2',
            firstDate: '',
            lastDate: '',
            marketKind: 'sii',
            announcementBasis: '0',
            dateRangeType: '1',
            announcementType: '1',
            sort: '1',
            encodeURIComponent: 1,
            step: 1,
            firstin: 1,
            off: 1,
        }
        assert.strict.deepEqual(r, rr)
    })

    it('逐一查詢4種市場別並回傳結果與hasError', async function() {
        if (!chromeOk) {
            this.skip()
        }
        this.timeout(180000)
        let t = await fetchMops({
            pageUrl: svr.url('/mops/page'),
            apiUrl: svr.url('/mops/api/t146sb10'),
            maxRetries: 0,
            showLog: false,
        })
        let r = [
            t.hasError,
            t.results.length,
            t.results.map((v) => v.market),
            t.results.map((v) => v.marketKind),
            t.results[0].data.result[0].companyId,
            t.results[2].data.code,
        ]
        let rr = [
            false,
            4,
            ['上市', '上櫃', '興櫃', '公開發行'],
            ['sii', 'otc', 'rotc', 'pub'],
            '2330',
            406,
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('application-level錯誤(code非200亦非406)時該筆帶error且hasError為true', async function() {
        if (!chromeOk) {
            this.skip()
        }
        this.timeout(180000)
        let t = await fetchMops({
            pageUrl: svr.url('/mops/page'),
            apiUrl: svr.url('/mops-error/api/t146sb10'),
            maxRetries: 0,
            showLog: false,
        })
        let r = [
            t.hasError,
            t.results.length,
            t.results.every((v) => String(v.error).startsWith('MOPS code 500')),
        ]
        let rr = [true, 4, true]
        assert.strict.deepEqual(r, rr)
    })

})
