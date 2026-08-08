import wi from './src/WDwdataHub.mjs'


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


//node g.mjs
