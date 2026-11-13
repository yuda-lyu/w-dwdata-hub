# w-dwdata-hub
A download data hub.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-dwdata-hub.svg?style=flat)](https://npmjs.org/package/w-dwdata-hub) 
[![license](https://img.shields.io/npm/l/w-dwdata-hub.svg?style=flat)](https://npmjs.org/package/w-dwdata-hub) 
[![npm download](https://img.shields.io/npm/dt/w-dwdata-hub.svg)](https://npmjs.org/package/w-dwdata-hub) 
[![npm download](https://img.shields.io/npm/dm/w-dwdata-hub.svg)](https://npmjs.org/package/w-dwdata-hub) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-dwdata-hub.svg)](https://www.jsdelivr.com/package/npm/w-dwdata-hub)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-dwdata-hub/global.html).

## Installation

### Using npm(ES6 module):
```alias
npm i w-dwdata-hub
```

Note:
- All fetch functions use node's built-in `fetch`, so node 18+ is required.
- `fetchMops` launches the system Google Chrome (`channel: 'chrome'`) through [w-playwright](https://www.npmjs.com/package/w-playwright), so **Google Chrome must be installed** on the machine (or set env `CHROME_PATH` to the browser executable). Installing this package brings in `w-playwright` and its pinned `playwright-core`; do not install `playwright` or `playwright-core` separately, and do not run `npx playwright install` (it can download a different version than the one `w-playwright` uses). `fetchMops` uses no Playwright-managed browser, so nothing is downloaded; if you also launch a managed browser yourself, get it with `await wpw.ensureChromium()` of `w-playwright`, and for offline machines point env `PLAYWRIGHT_BROWSERS_PATH` to a pre-copied browser folder **before** loading the package (see the `w-playwright` README).
- Launch guard: on Windows, a new Chromium-family browser root process (real Chrome 153+, Edge, full Chromium) may call `LogonUser` with a wrong password for the current user at every launch (security event 4625, bad-password count +1; the default local policy locks the account after 10 within 10 minutes). `w-playwright` therefore always adds one `--disable-features` argument that contains Playwright's default list plus `AutofillAiWalletPrivatePasses` (which stops it); there is no option to turn this off. The environments `PWDEBUG` (inspector mode) and `SELENIUM_REMOTE_URL` would bypass the guard and are rejected (`E_ENV`). Optionally set env `W_PLAYWRIGHT_LOGON_GUARD=1` to refuse a launch when the current user's bad-password count is not 0 (`E_LOGON_GUARD`, off by default; see the `w-playwright` README).
- `fetchGuancha` delegates fetching to `w-fetch-web`, which needs `curl` in system PATH.
- `fetchRSS` with `opt.method` `'curl'` or `'auto'` also needs `curl` in system PATH.

#### Functions:

General news, each returns an array of `{url, time, title, description, from}`:
| function | description |
| --- | --- |
| `fetchRSS(rssUrl, opt)` | fetch an RSS or Atom feed |
| `fetchHackerNews(limit, opt)` | fetch the latest Hacker News stories |
| `fetchAiNewsAggregator(opt)` | fetch the latest 24h AI news digest |

Taiwan stock market news:
| function | description |
| --- | --- |
| `fetchCnyes(opt)` | fetch Anue(cnyes) tw_stock news, returns `{time, title, link}` |
| `fetchMoneydj(opt)` | fetch MoneyDJ tw stock news(MB06), returns `{time, title, link}` |
| `fetchStatementdog(opt)` | fetch StatementDog latest news, returns `{time, title, link}` |
| `fetchMops(opt)` | fetch MOPS material announcements of the day, by the system Chrome launched through w-playwright |

Taiwan stock market data:
| function | description |
| --- | --- |
| `fetchTwseStock(dateStr, stockCode, opt)` | fetch TWSE listed stock daily quotes |
| `fetchTpexStock(dateStr, stockCodes, opt)` | fetch TPEX OTC stock daily quotes |
| `fetchTwseMargin(dateStr, stockCodes, opt)` | fetch TWSE margin trading balance |
| `fetchTpexMargin(dateStr, stockCodes, opt)` | fetch TPEX margin trading balance |
| `fetchTwseT86(dateStr, stockCodes, opt)` | fetch TWSE institutional investors net buy/sell |
| `fetchTpex3insti(dateStr, stockCodes, opt)` | fetch TPEX institutional investors net buy/sell |
| `fetchTaifex(dateStr, opt)` | fetch TAIFEX TX quotes, institutional open interest and Put/Call ratio |
| `fetchTwDataHoliday(checkDate, opt)` | fetch TWSE market holiday schedule |

Chinese commentary sites, each is an object holding several functions:
| function | description |
| --- | --- |
| `fetchAisixiang.fetchAuthorsList(opt)` | fetch the columnist list of aisixiang.com |
| `fetchAisixiang.fetchTopicsList(opt)` | fetch the curated topic list of aisixiang.com |
| `fetchAisixiang.fetchAuthorArticles(opt)` | list articles by author `name` or `slug` |
| `fetchAisixiang.fetchKeywordArticles(keyword, opt)` | list articles by keyword tag |
| `fetchAisixiang.fetchTitleArticles(keyword, opt)` | list articles by title search |
| `fetchAisixiang.fetchTopicArticles(opt)` | list articles by topic `keyword` or `id` |
| `fetchAisixiang.fetchArticle(opt)` | fetch one article by `aid` or `url`, into markdown |
| `fetchGuancha.fetchAuthorsList(opt)` | fetch the A-Z author index of guancha.cn |
| `fetchGuancha.fetchAuthorArticles(opt)` | list articles by author `name` or `slug` |
| `fetchGuancha.fetchTopicArticles(opt)` | list articles by topic `name` or `slug` |
| `fetchGuancha.fetchArticle(opt)` | fetch one article by `url`, into markdown |

#### Example:
> **Link:** [[dev source code](https://github.com/yuda-lyu/w-dwdata-hub/blob/master/g.mjs)]
```alias
import wi from 'w-dwdata-hub'

let test = async () => {

    //綜合新聞: RSS訂閱源, 回傳統一格式{url,time,title,description,from}
    let r1 = await wi.fetchRSS('https://www.ptt.cc/atom/Gossiping.xml', { showLog: false })
    console.log('rss:', r1.length, r1[0].time, r1[0].title)
    // => rss: 19 2026-08-07 09:30:19 [問卦] 公視是怎麼走到今天這一步的？

    //綜合新聞: 擋node fetch之站台(403)改走curl抓取, 並以withContent附feed內嵌全文(去標籤純文字)
    let r1b = await wi.fetchRSS('https://alphaarchitect.com/feed', { method: 'curl', withContent: true, showLog: false })
    console.log('rss(curl):', r1b.length, r1b[0].content.length, r1b[0].description.length)
    // => rss(curl): 5 6339 545

    //綜合新聞: Hacker News最新文章, 可指定取回篇數
    let r2 = await wi.fetchHackerNews(5, { showLog: false })
    console.log('hackerNews:', r2.length, r2[0].from, r2[0].title)
    // => hackerNews: 5 Hacker News Romania blasts rock to divert water from drought-hit Danube to nuclear reactor

    //綜合新聞: AI News Aggregator近24小時彙整
    let r3 = await wi.fetchAiNewsAggregator({ showLog: false })
    console.log('aiNews:', r3.length, r3[0].from)
    // => aiNews: 914 夕小瑶科技说

    //台股新聞: 鉅亨網, 逐頁抓至targetTotal則
    let r4 = await wi.fetchCnyes({ targetTotal: 30, showLog: false })
    console.log('cnyes:', r4.length, r4[0].time, r4[0].link)
    // => cnyes: 30 2026-08-07 09:20:46 https://news.cnyes.com/news/id/6563766

    //台股資料: 證交所上市個股日成交資訊, 指定日期會由整月資料過濾為當日單筆
    let r5 = await wi.fetchTwseStock('20260806', '2330', { showLog: false })
    console.log('twseStock:', r5.stat, r5.data.length, r5.data[0][6])
    // => twseStock: OK 1 2,365.00

    //台股資料: 櫃買中心上櫃融資融券, 未指定個股則回全市場
    let r6 = await wi.fetchTpexMargin('20260806', ['6488'], { showLog: false })
    console.log('tpexMargin:', r6.source, r6.count, r6.data[0].marginChange)
    // => tpexMargin: tpex_margin 1 -694

    //台股資料: 期交所台指期、三大法人未平倉與Put/Call Ratio, 單支失敗僅記於errors
    let r7 = await wi.fetchTaifex('20260806', { showLog: false })
    console.log('taifex:', r7.futures.tx.close, r7.pcRatio.ratio, r7.errors)
    // => taifex: 44280 109.14 []

    //台股資料: 證交所休市日期, 給定日期則另回傳該日是否休市
    let r8 = await wi.fetchTwDataHoliday('20260101', { showLog: false })
    console.log('holiday:', r8.dataYear, r8.totalHolidays, r8.isHoliday, r8.holidayName)
    // => holiday: 2026 22 true 中華民國開國紀念日

    //中文評論網站: 愛思想, 依作者中文名查專欄文章清單
    let r9 = await wi.fetchAisixiang.fetchAuthorArticles({ name: '葛兆光', showLog: false })
    console.log('aisixiang:', r9.status, r9.resolved.slug, r9.count)
    // => aisixiang: success gezhaoguang 170

    //中文評論網站: 愛思想, 抓單篇文章轉為含frontmatter之Markdown
    let r10 = await wi.fetchAisixiang.fetchArticle({ aid: '146669', showLog: false })
    console.log('aisixiang:', r10.status, r10.title, r10.chars)
    // => aisixiang: success 葛兆光：禅宗与中国文化 16986

    //中文評論網站: 觀察者網, 依主題中文名查文章清單, 自動選用可翻頁之欄目slug
    let r11 = await wi.fetchGuancha.fetchTopicArticles({ name: '财经', maxPages: 1, showLog: false })
    console.log('guancha:', r11.status, r11.resolved.slug, r11.count)
    // => guancha: success CaiJing 30

    //查無資料時回status為success且count為0, 抓取失敗才回status為error, 兩者可明確區分
    let r12 = await wi.fetchGuancha.fetchAuthorArticles({ name: '不存在的作者XYZ', showLog: false })
    console.log('guancha:', r12.status, r12.count, r12.message)
    // => guancha: success 0 "不存在的作者XYZ" 不在觀察者網作者索引中（共 641 位）。尚無此作者文章。提醒：本函數不轉繁簡，呼叫端負責用站方登錄字形（簡體）。

}
await test()
    .catch((err) => {
        console.log(err)
    })
```

#### Common options:
各抓取函數皆接受`opt`設定物件，以下為共用項目：

| key | type | default | description |
| --- | --- | --- | --- |
| `timeout` | Integer | 依函數而異 | 單次請求逾時毫秒 |
| `maxRetries` | Integer | 依函數而異 | 最大重試次數，含初始共執行`maxRetries+1`次 |
| `baseDelayMs` | Integer | 依函數而異 | 重試之線性退避基礎毫秒 |
| `maxDelayMs` | Integer | 依函數而異 | 重試之線性退避上限毫秒 |
| `showLog` | Boolean | `true` | 是否顯示過程與重試訊息 |
| `baseUrl`／`url`／`apiBase` | String | 官方網址 | 來源網址，供測試或改指向鏡像時覆寫 |

重試條件為HTTP 5xx與429及網路層錯誤（含逾時）；HTTP 4xx（429除外）預設不重試，僅部份函數另納入403或404（例如鉅亨網、財報狗、MoneyDJ納入403，RSS納入404）。

#### Options for fetchRSS:
`fetchRSS`另有專屬選項：

| key | type | default | description |
| --- | --- | --- | --- |
| `method` | String | `'fetch'` | 抓取方式，可為`'fetch'`（node內建fetch）、`'curl'`（系統curl，可通過以TLS指紋擋非瀏覽器用戶端之站台）、`'auto'`（curl優先，失敗退回fetch） |
| `withContent` | Boolean | `false` | `true`時各項目附加`content`欄，依`content:encoded`→`content`→`summary`→`description`優先序取feed內嵌全文，並去除HTML標籤與實體、保留段落換行 |

curl模式之重試退避由`w-fetch-web`內建（3至15秒線性），`baseDelayMs`／`maxDelayMs`／404重試於curl模式不生效；極短之feed（小於100字元）會被curl模式判為`empty-response`。

#### Browser launch of fetchMops:
`fetchMops`經`w-playwright`啟動系統Chrome（須已安裝Google Chrome，或以環境變數`CHROME_PATH`指定執行檔），啟動時一律加入守門參數（原因見上方Note）。啟動規則（改經`w-playwright`啟動之版本起）：
- 啟動失敗或逾時（`w-playwright`錯誤碼`E_LAUNCH`、`E_LAUNCH_TIMEOUT`）才重試，重試次數為`opt.maxRetries`與`2`取小者（最多啟動3次；原為`maxRetries`，預設最多啟動11次）。原因：Chromium系瀏覽器每啟動一個根行程即可能替目前Windows使用者記一次錯誤密碼，守門若因瀏覽器改版而失效，一次呼叫內之啟動次數須遠低於鎖定門檻。`opt.maxRetries`對頁面導航與查詢之重試不變。
- `w-playwright`之拒絕類錯誤（`E_ENV`、`E_PW_VERSION`、`E_LOGON_GUARD`、`E_BROWSER_MISSING`、`E_ARG`、`E_INSTALL`）重試不會成功，立即`reject`、不重試。
- 啟動失敗時`reject`之`Error`訊息格式為`瀏覽器啟動失敗（已重試 N 次）: <w-playwright固定詞彙訊息>`，並帶`code`屬性（`w-playwright`之錯誤碼，如`E_LAUNCH`、`E_LOGON_GUARD`）；`Playwright`之原錯誤訊息不附於`Error`，`opt.useShowLog`為`true`（預設）時以`console.warn`印出。

#### Error contract:
- 參數不合法（如日期非`YYYYMMDD`、必填參數缺漏）一律`throw`，不會靜默回傳空結果。
- 抓取或解析失敗一律`reject`；`fetchAisixiang`與`fetchGuancha`則改回傳`{status:'error',...}`結果物件。
- 「查詢成功但結果為0筆」與「抓取失敗」明確區分：前者回`{status:'success',count:0,message}`，後者回`{status:'error'}`或`reject`。
- API結構與預期不符時一律fail-loud拋錯（如櫃買中心融資融券之欄位佈局檢核、櫃買中心三大法人之24欄結構檢核），不以固定index靜默解析出錯置資料。

#### Tests:
```alias
npm test
```
測試不連線外部網站，改以`test/tools/serverForTest.mjs`啟動本機HTTP伺服器提供各官方API格式之固定回應；`fetchMops`之瀏覽器案例於無Chrome環境時自動跳過（以`w-playwright`之`findSystemChrome`判斷Chrome是否存在，不啟動瀏覽器），有Chrome時每案經`w-playwright`啟動真Chrome一次（共2次）。`fetchMops`之啟動選項與重試規則另以`w-playwright`之`setBrowserTypeForTest`替身驗證（`test/unit-fetchMopsLaunch.test.mjs`，不啟動瀏覽器）。在Windows上跑真Chrome之案例前，建議先確認目前使用者之錯誤密碼次數為0（可設`W_PLAYWRIGHT_LOGON_GUARD=1`由`w-playwright`於啟動前檢查）。
