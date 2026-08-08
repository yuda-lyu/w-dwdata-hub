import http from 'http'
import encodeBig5 from './encodeBig5.mjs'
import * as fx from './fixtures.mjs'


/**
 * 啟動本機測試用HTTP伺服器
 *
 * 各路由以官方API之實際路徑與回應格式提供固定內容, 令測試不需連線外部網站即可驗證抓取與解析;
 * 另提供通用路由供fetchWithRetry之重試、逾時與編碼行為斷言
 *
 * 通用路由：
 * /json/ok 回200 JSON；
 * /json/bad 回200但內容非JSON；
 * /status/:code 回指定HTTP狀態碼；
 * /flaky/:code?n=2 前n次回指定狀態碼其後回200 JSON(可由/flaky/reset歸零)；
 * /text/big5 回Big5編碼文字；
 * /slow?ms=100 延遲後回200 JSON；
 * /echo 回請求方法與標頭之JSON
 *
 * @returns {Promise} 回傳Promise，resolve回傳{port,url,close,getCount}物件，其中url為由路徑組出完整網址之函數，close為關閉伺服器之async函數，getCount為取得指定路徑請求次數之函數
 * @example
 *
 * import serverForTest from './tools/serverForTest.mjs'
 *
 * let svr = await serverForTest()
 * console.log(svr.url('/json/ok'))
 * // => 'http://127.0.0.1:54321/json/ok'
 * await svr.close()
 *
 */
function serverForTest() {
    return new Promise((resolve) => {

        //counts, 記錄各路徑之請求次數, 供斷言重試次數與翻頁次數
        let counts = {}

        //flakyCount, /flaky/:code之已回應失敗次數
        let flakyCount = 0

        let server = http.createServer(async (req, res) => {

            let u = new URL(req.url, 'http://127.0.0.1')
            let pathname = u.pathname
            let qs = u.searchParams

            //count
            counts[pathname] = (counts[pathname] || 0) + 1

            let sendJson = (code, obj) => {
                let body = typeof obj === 'string' ? obj : JSON.stringify(obj)
                res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
                res.end(body)
            }
            let sendText = (code, text, contentType = 'text/plain; charset=utf-8') => {
                res.writeHead(code, { 'Content-Type': contentType })
                res.end(text)
            }
            let sendHtml = (code, html) => {
                sendText(code, html, 'text/html; charset=utf-8')
            }
            let sendBig5 = (code, text) => {
                let buf = encodeBig5(text)
                res.writeHead(code, { 'Content-Type': 'text/csv; charset=big5', 'Content-Length': buf.length })
                res.end(buf)
            }

            //===== 通用路由 =====

            if (pathname === '/json/ok') {
                sendJson(200, { ok: true, value: 1 })
                return
            }
            if (pathname === '/json/bad') {
                sendJson(200, '<html><body>維護中</body></html>')
                return
            }
            if (pathname === '/flaky/reset') {
                flakyCount = 0
                sendJson(200, { ok: true })
                return
            }
            if (pathname.startsWith('/flaky/')) {
                let code = parseInt(pathname.split('/')[2], 10)
                let n = parseInt(qs.get('n') || '1', 10)
                if (flakyCount < n) {
                    flakyCount++
                    res.writeHead(code, { 'Content-Type': 'text/plain' })
                    res.end('flaky')
                    return
                }
                sendJson(200, { ok: true, failed: flakyCount })
                return
            }
            if (pathname.startsWith('/status/')) {
                let code = parseInt(pathname.split('/')[2], 10)
                res.writeHead(code, { 'Content-Type': 'text/plain' })
                res.end(`status ${code}`)
                return
            }
            if (pathname === '/text/big5') {
                sendBig5(200, '中文測試,Big5編碼')
                return
            }
            if (pathname === '/slow') {
                let ms = parseInt(qs.get('ms') || '100', 10)
                await new Promise((resolve) => setTimeout(resolve, ms))
                sendJson(200, { ok: true })
                return
            }
            if (pathname === '/echo') {
                sendJson(200, { method: req.method, headers: req.headers })
                return
            }

            //===== AI News Aggregator =====

            if (pathname === '/ai-news/latest-24h.json') {
                sendJson(200, fx.aiNews)
                return
            }

            //===== RSS =====

            if (pathname === '/rss/feed.xml') {
                sendText(200, fx.rssXml, 'application/rss+xml; charset=utf-8')
                return
            }
            if (pathname === '/rss/feed-content.xml') {
                sendText(200, fx.rssContentXml, 'application/rss+xml; charset=utf-8')
                return
            }
            if (pathname === '/rss/feed-desc.xml') {
                sendText(200, fx.rssDescOnlyXml, 'application/rss+xml; charset=utf-8')
                return
            }
            if (pathname === '/rss/feed-tiny.xml') {
                sendText(200, fx.rssTinyXml, 'application/rss+xml; charset=utf-8')
                return
            }

            //===== Hacker News =====

            if (pathname === '/hn/newstories.json') {
                sendJson(200, fx.hnNewStories)
                return
            }
            if (pathname.startsWith('/hn/item/')) {
                let id = pathname.split('/')[3].replace('.json', '')
                sendJson(200, fx.hnItems[id] || null)
                return
            }

            //===== 鉅亨網 =====

            if (pathname === '/cnyes/newslist') {
                let page = parseInt(qs.get('page') || '1', 10)
                sendJson(200, page === 1 ? fx.cnyesPage1 : fx.cnyesPageEmpty)
                return
            }

            //===== 財報狗 =====

            if (pathname === '/statementdog/news/latest') {
                sendHtml(200, fx.statementdogHtml)
                return
            }
            if (pathname === '/statementdog-fallback/news/latest') {
                sendHtml(200, fx.statementdogFallbackHtml)
                return
            }
            if (pathname === '/statementdog-empty/news/latest') {
                sendHtml(200, fx.statementdogEmptyHtml)
                return
            }

            //===== MoneyDJ =====

            if (pathname === '/moneydj/newsreallist.aspx') {
                let index1 = parseInt(qs.get('index1') || '1', 10)
                if (index1 === 1) {
                    sendHtml(200, fx.moneydjPage1Html)
                }
                else if (index1 === 2) {
                    sendHtml(200, fx.moneydjPage2Html)
                }
                else {
                    sendHtml(200, fx.moneydjEmptyHtml)
                }
                return
            }
            if (pathname === '/moneydj-empty/newsreallist.aspx') {
                sendHtml(200, fx.moneydjEmptyHtml)
                return
            }
            if (pathname === '/moneydj-flaky/newsreallist.aspx') {
                //第1頁一律失敗, 供斷言單頁失敗時跳過該頁而不中斷整體抓取
                let index1 = parseInt(qs.get('index1') || '1', 10)
                if (index1 === 1) {
                    sendText(404, 'not found')
                    return
                }
                sendHtml(200, fx.moneydjPage2Html)
                return
            }

            //===== 證交所 =====

            if (pathname === '/exchangeReport/STOCK_DAY') {
                //查詢日期早於資料起始日時, 證交所回stat非OK
                if ((qs.get('date') || '') < '20100101') {
                    sendJson(200, { stat: '查詢日期小於99年1月4日，請重新查詢!' })
                    return
                }
                sendJson(200, fx.twseStockDay)
                return
            }
            if (pathname === '/exchangeReport/MI_INDEX') {
                sendJson(200, fx.twseMiIndex)
                return
            }
            if (pathname === '/rwd/zh/marginTrading/MI_MARGN') {
                sendJson(200, fx.twseMargin)
                return
            }
            if (pathname === '/rwd/zh/fund/T86') {
                sendJson(200, fx.twseT86)
                return
            }

            //===== 櫃買中心 =====

            if (pathname === '/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php') {
                sendJson(200, fx.tpexStock)
                return
            }
            if (pathname === '/web/stock/margin_trading/margin_balance/margin_bal_result.php') {
                sendJson(200, fx.tpexMargin)
                return
            }
            if (pathname === '/bad-shape/web/stock/margin_trading/margin_balance/margin_bal_result.php') {
                sendJson(200, fx.tpexMarginBadShape)
                return
            }
            if (pathname === '/web/stock/3insti/daily_trade/3itrade_hedge_result.php') {
                sendJson(200, fx.tpex3insti)
                return
            }
            if (pathname === '/bad-shape/web/stock/3insti/daily_trade/3itrade_hedge_result.php') {
                sendJson(200, fx.tpex3instiBadShape)
                return
            }

            //===== 期交所 =====

            if (pathname === '/cht/3/futDataDown') {
                sendBig5(200, fx.taifexFuturesCsv)
                return
            }
            if (pathname === '/cht/3/futContractsDateDown') {
                sendBig5(200, fx.taifexInstitutionalCsv)
                return
            }
            if (pathname === '/cht/3/pcRatioDown') {
                sendBig5(200, fx.taifexPcRatioCsv)
                return
            }
            if (pathname === '/no-data/cht/3/futDataDown' ||
                pathname === '/no-data/cht/3/futContractsDateDown' ||
                pathname === '/no-data/cht/3/pcRatioDown') {
                //非交易日時期交所回僅有表頭之CSV
                sendBig5(200, '交易日期,契約')
                return
            }

            //===== 公開資訊觀測站 =====

            if (pathname === '/mops/page') {
                sendHtml(200, fx.mopsPageHtml)
                return
            }
            if (pathname === '/mops/api/t146sb10' || pathname === '/mops-error/api/t146sb10') {

                //body, MOPS查詢API為POST且以JSON帶marketKind
                let chunks = []
                for await (let chunk of req) {
                    chunks.push(chunk)
                }
                let marketKind = ''
                try {
                    marketKind = JSON.parse(Buffer.concat(chunks).toString('utf8')).marketKind
                }
                catch (err) {
                    marketKind = ''
                }

                //application-level錯誤, HTTP 200但code非200亦非406
                if (pathname === '/mops-error/api/t146sb10') {
                    sendJson(200, { code: 500, message: '系統忙碌中' })
                    return
                }

                sendJson(200, fx.getMopsResult(marketKind))
                return
            }

            //===== 證交所休市日期 =====

            if (pathname === '/v1/holidaySchedule/holidaySchedule') {
                sendJson(200, fx.holidaySchedule)
                return
            }

            //===== 愛思想 =====

            if (pathname === '/thinktank/') {
                sendHtml(200, fx.aisixiangThinktankHtml)
                return
            }
            if (pathname === '/thinktank/gezhaoguang.html') {
                sendHtml(200, fx.aisixiangAuthorHtml)
                return
            }
            if (pathname === '/thinktank/nobody.html') {
                sendHtml(200, fx.aisixiangEmptyAuthorHtml)
                return
            }
            if (pathname === '/zhuanti/') {
                sendHtml(200, fx.aisixiangZhuantiListHtml)
                return
            }
            if (pathname === '/zhuanti/301.html') {
                let page = parseInt(qs.get('page') || '1', 10)
                sendHtml(200, page === 1 ? fx.aisixiangZhuantiPage1Html : fx.aisixiangZhuantiPage2Html)
                return
            }
            if (pathname === '/data/search') {
                let keywords = qs.get('keywords') || ''
                sendHtml(200, keywords === '老庄' ? fx.aisixiangSearchHitHtml : fx.aisixiangSearchEmptyHtml)
                return
            }
            if (pathname === '/data/146669.html') {
                sendHtml(200, fx.aisixiangArticleHtml)
                return
            }
            if (pathname === '/data/999999.html') {
                sendHtml(200, fx.aisixiangBadArticleHtml)
                return
            }

            //===== 觀察者網 =====

            if (pathname === '/' || pathname === '/NotExistSlug/list_1.shtml') {
                //站方對不存在之slug會302跳首頁, 此處直接回首頁內容以重現該情境
                sendHtml(200, fx.guanchaHomeHtml)
                return
            }
            if (pathname === '/AnSheng/list_1.shtml') {
                sendHtml(200, fx.guanchaListPage1Html)
                return
            }
            if (pathname === '/AnSheng/list_2.shtml') {
                sendHtml(200, fx.guanchaListPage2Html)
                return
            }
            if (pathname.startsWith('/AnSheng/list_')) {
                sendHtml(200, fx.guanchaListEmptyHtml)
                return
            }
            if (pathname === '/AnSheng/2026_08_07_800001.shtml') {
                sendHtml(200, fx.guanchaArticleHtml)
                return
            }
            if (pathname === '/AnSheng/2026_01_01_000000.shtml') {
                //已下架文章, 站方會302跳首頁
                sendHtml(200, fx.guanchaHomeHtml)
                return
            }
            if (pathname === '/CaiJing/list_1.shtml') {
                sendHtml(200, fx.guanchaListPage1Html)
                return
            }
            if (pathname.startsWith('/CaiJing/list_')) {
                sendHtml(200, fx.guanchaListEmptyHtml)
                return
            }

            sendText(404, 'not found')
        })

        server.listen(0, '127.0.0.1', () => {
            let port = server.address().port
            resolve({
                port,
                url: (pathname) => `http://127.0.0.1:${port}${pathname}`,
                getCount: (pathname) => counts[pathname] || 0,
                close: () => new Promise((resolve) => {
                    server.close(() => {
                        resolve(true)
                    })
                }),
            })
        })

    })
}


export default serverForTest
