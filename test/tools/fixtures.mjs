//本檔為各資料來源之測試用固定回應內容
//欄位結構與命名皆比照各官方API實際格式, 令測試斷言等同於對規格之翻譯, 而非對現況之指紋


//===== AI News Aggregator =====


//含前後空白之欄位供斷言trim, 第2筆published_at不可解析供斷言time退回''
let aiNews = {
    items: [
        { url: ' https://ai.example/a1 ', published_at: '2026-08-07T01:02:03Z', title: ' AI標題一 ', source: ' Example News ' },
        { url: 'https://ai.example/a2', published_at: 'not-a-date', title: 'AI標題二', source: 'Other News' },
    ],
}


//===== RSS =====


//第1筆有dc:creator供斷言from取creator, 第2筆無供斷言from退回channel title
let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>測試訂閱源</title>
<link>https://rss.example/</link>
<item>
<title>RSS標題一</title>
<link>https://rss.example/1</link>
<pubDate>Fri, 07 Aug 2026 01:02:03 GMT</pubDate>
<description>描述一</description>
<dc:creator>作者甲</dc:creator>
</item>
<item>
<title>RSS標題二</title>
<link>https://rss.example/2</link>
<pubDate>Fri, 07 Aug 2026 02:03:04 GMT</pubDate>
<description>描述二</description>
</item>
</channel>
</rss>`


//含content:encoded內嵌全文之feed(WordPress系), 供斷言withContent取全文且顯著長於description;
//全文內含粗體、實體、&nbsp;與script, 供斷言stripHtml各轉換
let rssContentXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>內容測試源</title>
<link>https://rss.example/</link>
<item>
<title>含全文項目</title>
<link>https://rss.example/c1</link>
<pubDate>Fri, 07 Aug 2026 01:02:03 GMT</pubDate>
<description>摘要開頭</description>
<content:encoded><![CDATA[<p>第一段完整全文，含<b>粗體</b>與&amp;實體。</p><p>第二段&nbsp;內容，長度遠大於摘要，供斷言withContent顯著長於description。</p><script>bad()</script>]]></content:encoded>
</item>
</channel>
</rss>`


//全文位於description之feed(arXiv系), rss-parser將其映為item.content,
//供斷言withContent之content fallback(無content:encoded時取content)
let rssDescOnlyXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>arXiv式測試源</title>
<link>https://rss.example/</link>
<item>
<title>論文一</title>
<link>https://rss.example/p1</link>
<pubDate>Fri, 07 Aug 2026 01:02:03 GMT</pubDate>
<description>arXiv:2608.01234 Announce Type: new Abstract: 這是一段完整摘要，不含HTML標籤，長度足以代表全文內容本體。</description>
</item>
</channel>
</rss>`


//合法但小於100字元之feed, 低於fetchWebByCurl之MIN_HTML_LENGTH,
//供斷言curl模式判empty-response、auto模式退回fetch
let rssTinyXml = '<rss version="2.0"><channel><title>t</title></channel></rss>'


//===== Hacker News =====


let hnNewStories = [101, 102, 103]


//103為comment供斷言僅保留story, 102無url供斷言退回站內討論頁網址
let hnItems = {
    101: { id: 101, type: 'story', title: 'HN標題一', url: 'https://hn.example/1', time: 1786000000 },
    102: { id: 102, type: 'story', title: 'HN標題二', time: 1786000060 },
    103: { id: 103, type: 'comment', text: '留言', time: 1786000120 },
}


//===== 鉅亨網 =====


//第2筆publishAt為null供斷言time退回''
let cnyesPage1 = {
    items: {
        data: [
            { newsId: 5001, title: '鉅亨標題一', publishAt: 1786000000 },
            { newsId: 5002, title: '鉅亨標題二', publishAt: null },
        ],
    },
}


let cnyesPageEmpty = { items: { data: [] } }


//===== 財報狗 =====


//第1筆為相對路徑供斷言補origin, 第2筆為絕對路徑供斷言保留, 第3筆無標題供斷言略過
let statementdogHtml = `<!DOCTYPE html><html><head><title>財報狗</title></head><body>
<div class="statementdog-news-list-item">
<div class="statementdog-news-list-item-date">2026-08-07</div>
<a class="statementdog-news-list-item-link" href="/news/n1"><div class="statementdog-news-list-item-title">財報狗標題一</div></a>
</div>
<div class="statementdog-news-list-item">
<div class="statementdog-news-list-item-date">2026-08-06</div>
<a class="statementdog-news-list-item-link" href="https://other.example/n2"><div class="statementdog-news-list-item-title">財報狗標題二</div></a>
</div>
<div class="statementdog-news-list-item">
<div class="statementdog-news-list-item-date">2026-08-05</div>
<a class="statementdog-news-list-item-link" href="/news/n3"><div class="statementdog-news-list-item-title"></div></a>
</div>
</body></html>`


//主要selector全無, 供斷言fallback selector生效
let statementdogFallbackHtml = `<!DOCTYPE html><html><head><title>財報狗</title></head><body>
<article><h2>備援標題一</h2><time>2026-08-07</time><a href="/news/f1">連結</a></article>
<article><h2>備援標題二</h2><time>2026-08-06</time><a href="/news/f2">連結</a></article>
</body></html>`


//無任何項目, 供斷言拋出0筆錯誤
let statementdogEmptyHtml = '<!DOCTYPE html><html><head><title>財報狗</title></head><body><p>維護中</p></body></html>'


//===== MoneyDJ =====


//第3列時間格式不符供斷言略過
let moneydjPage1Html = `<!DOCTYPE html><html><head><title>MoneyDJ</title></head><body><table>
<tr><td>08/07 09:02</td><td><a href="/kmdj/news/newsviewer.aspx?a=m1" title="MoneyDJ標題一">連結</a></td></tr>
<tr><td>09:05</td><td><a href="https://www.moneydj.com/m2" title="MoneyDJ標題二">連結</a></td></tr>
<tr><td>不是時間</td><td><a href="/kmdj/news/newsviewer.aspx?a=m3" title="不應出現">連結</a></td></tr>
</table></body></html>`


let moneydjPage2Html = `<!DOCTYPE html><html><head><title>MoneyDJ</title></head><body><table>
<tr><td>昨 23:59</td><td><a href="/kmdj/news/newsviewer.aspx?a=m4" title="MoneyDJ標題三">連結</a></td></tr>
</table></body></html>`


let moneydjEmptyHtml = '<!DOCTYPE html><html><head><title>MoneyDJ</title></head><body><table></table></body></html>'


//===== 證交所個股日成交資訊 =====


//回傳整月資料, 供斷言指定日過濾為單筆
let twseStockDay = {
    stat: 'OK',
    date: '20260801',
    title: '115年08月 2330 台積電 各日成交資訊',
    fields: ['日期', '成交股數', '成交金額', '開盤價', '最高價', '最低價', '收盤價', '漲跌價差', '成交筆數'],
    data: [
        ['115/08/06', '30,000,000', '33,000,000,000', '1,090.00', '1,105.00', '1,085.00', '1,100.00', '+10.00', '50,000'],
        ['115/08/07', '28,000,000', '31,000,000,000', '1,100.00', '1,120.00', '1,095.00', '1,115.00', '+15.00', '48,000'],
    ],
}


let twseMiIndex = {
    stat: 'OK',
    date: '20260807',
    tables: [
        {
            title: '每日收盤行情(全部(不含權證、牛熊證、可展延牛熊證))',
            fields: ['證券代號', '證券名稱', '成交股數', '收盤價'],
            data: [
                ['2330', '台積電', '28,000,000', '1,115.00'],
                ['2317', '鴻海', '15,000,000', '215.00'],
            ],
        },
    ],
}


//===== 證交所融資融券 =====


//tables[0]為結構不同之干擾表, 供斷言以title「融資融券彙總」精確選表
let twseMargin = {
    stat: 'OK',
    date: '20260807',
    tables: [
        {
            title: '信用交易統計',
            fields: ['項目', '買進'],
            data: [['融資(交易單位)', '100']],
        },
        {
            title: '融資融券彙總',
            fields: [
                '代號', '名稱', '買進', '賣出', '現金償還', '前日餘額', '今日餘額', '次一營業日限額',
                '買進', '賣出', '現券償還', '前日餘額', '今日餘額', '次一營業日限額', '資券互抵', '註記',
            ],
            data: [
                ['2330', '台積電', '1,000', '500', '100', '10,000', '10,400', '99,999', '200', '300', '50', '2,000', '2,250', '88,888', '10', ''],
                ['2317', '鴻海', '800', '900', '0', '20,000', '19,900', '77,777', '100', '80', '0', '1,000', '980', '66,666', '5', 'X'],
            ],
        },
    ],
}


//===== 證交所三大法人買賣超 =====


//欄位值含前後空白供斷言trim
let twseT86 = {
    stat: 'OK',
    date: '20260807',
    fields: ['證券代號', '證券名稱', '外陸資買進股數(不含外資自營商)', '三大法人買賣超股數'],
    data: [
        ['2330 ', '台積電  ', ' 1,000,000', '500,000'],
        ['2317', '鴻海', '800,000', '-200,000'],
    ],
}


//===== 櫃買中心上櫃行情 =====


//tables[0]為干擾表, 供斷言以title「行情」優先選表
let tpexStock = {
    stat: 'ok',
    date: '115/08/07',
    tables: [
        {
            title: '上櫃指數統計',
            fields: ['指數', '收盤'],
            data: [['櫃買指數', '230.00']],
        },
        {
            title: '上櫃股票行情(不含權證、牛熊證)',
            fields: ['代號', '名稱', '收盤', '漲跌', '開盤', '最高', '最低', '成交股數', '成交金額(元)'],
            data: [
                ['6488', '環球晶', '520.00', '+5.00', '515.00', '525.00', '512.00', '3,000,000', '1,560,000,000'],
                ['6510', '精測', '480.00', '-2.00', '482.00', '486.00', '478.00', '1,000,000', '480,000,000'],
            ],
        },
    ],
}


//===== 櫃買中心融資融券 =====


let tpexMargin = {
    stat: 'ok',
    date: '115/08/07',
    tables: [
        {
            title: '上櫃融資融券餘額',
            fields: [
                '代號', '名稱', '前資餘額(張)', '資買', '資賣', '現償', '資餘額', '資屬證金', '資使用率(%)',
                '資限額', '前券餘額(張)', '券賣', '券買', '券償', '券餘額', '券屬證金', '券使用率(%)', '券限額', '資券相抵(張)', '備註',
            ],
            data: [
                ['6488', '環球晶', '5,000', '300', '200', '50', '5,050', '0', '1.20', '400,000', '1,000', '100', '80', '20', '1,000', '0', '0.30', '400,000', '30', ''],
                ['6510', '精測', '2,000', '100', '150', '0', '1,950', '0', '0.80', '200,000', '500', '50', '60', '10', '480', '0', '0.20', '200,000', '10', 'X'],
            ],
        },
    ],
}


//欄位佈局錯位, 供斷言錨點欄位檢核會fail-loud
let tpexMarginBadShape = {
    stat: 'ok',
    tables: [
        {
            title: '上櫃融資融券餘額',
            fields: ['代號', '名稱', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n'],
            data: [['6488', '環球晶', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14']],
        },
    ],
}


//===== 櫃買中心三大法人買賣超 =====


//fields為裸欄名, 買進股數/賣出股數/買賣超股數循環7次, 共24欄
let tpex3instiFields = [
    '代號', '名稱',
    '買進股數', '賣出股數', '買賣超股數',
    '買進股數', '賣出股數', '買賣超股數',
    '買進股數', '賣出股數', '買賣超股數',
    '買進股數', '賣出股數', '買賣超股數',
    '買進股數', '賣出股數', '買賣超股數',
    '買進股數', '賣出股數', '買賣超股數',
    '買進股數', '賣出股數', '買賣超股數',
    '三大法人買賣超股數合計',
]


let tpex3insti = {
    stat: 'ok',
    tables: [
        {
            title: '三大法人買賣超彙總',
            fields: tpex3instiFields,
            data: [
                ['6488', '環球晶 ', '100', '50', '50', '10', '5', '5', '110', '55', '55', '200', '100', '100', '30', '10', '20', '40', '20', '20', '70', '30', '40', '195'],
                ['6510', '精測', '10', '20', '-10', '0', '0', '0', '10', '20', '-10', '5', '0', '5', '1', '1', '0', '2', '0', '2', '3', '1', '2', '-3'],
            ],
        },
        {},
    ],
}


//欄序已變, 供斷言結構防呆會fail-loud
let tpex3instiBadShape = {
    stat: 'ok',
    tables: [
        {
            title: '三大法人買賣超彙總',
            fields: ['代號', '名稱', '買進股數', '買賣超股數', '賣出股數', '三大法人買賣超股數合計'],
            data: [['6488', '環球晶', '1', '2', '3', '4']],
        },
    ],
}


//===== 期交所 =====


//含價差合約(到期月份含'/')與次月合約, 供斷言僅取近月且排除價差
let taifexFuturesCsv = `交易日期,契約,到期月份(週別),開盤價,最高價,最低價,收盤價,成交量,結算價,交易時段
2026/08/07,TX,202608,23000,23200,22900,23150,"80,000",23160,一般
2026/08/07,TX,202608,23150,23300,23100,23250,20000,23260,盤後
2026/08/07,TX,202609,22900,23000,22800,22950,5000,22960,一般
2026/08/07,TX,202608/202609,-,-,-,-,100,-,一般`


let taifexInstitutionalCsv = `日期,商品名稱,身份別,多方交易口數,空方交易口數,多空交易口數淨額,多方未平倉口數,多方未平倉契約金額(千元),空方未平倉口數,空方未平倉契約金額(千元),多空未平倉口數淨額,多空未平倉契約金額淨額(千元)
2026/08/07,臺股期貨,自營商,5000,4800,200,10000,4600000,9000,4140000,1000,460000
2026/08/07,臺股期貨,投信,300,100,200,2000,920000,500,230000,1500,690000
2026/08/07,臺股期貨,外資,20000,18000,2000,50000,23000000,30000,13800000,20000,9200000`


let taifexPcRatioCsv = `日期,賣權成交量,買權成交量,買賣權成交量比率%,賣權未平倉量,買權未平倉量,買賣權未平倉量比率%
2026/08/07,100000,90000,111.11,50000,60000,83.33`


//===== 公開資訊觀測站 =====


//MOPS重大訊息頁, 內容僅需可載入以供page.evaluate於同源context內發送查詢
let mopsPageHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>重大訊息</title></head>
<body><div id="app">公開資訊觀測站 重大訊息 t146sb10</div></body></html>`


//各市場別之查詢結果, 興櫃回code 406(查無相符資料)供斷言其亦屬正常空結果
let mopsResults = {
    sii: { code: 200, message: '查詢成功', result: [{ companyId: '2330', companyName: '台積電', typeK: 'sii' }] },
    otc: { code: 200, message: '查詢成功', result: [{ companyId: '6488', companyName: '環球晶', typeK: 'otc' }] },
    rotc: { code: 406, message: '查無相符資料', result: [] },
    pub: { code: 200, message: '查詢成功', result: [{ companyId: '9999', companyName: '某公開發行公司', typeK: 'pub' }] },
}


/**
 * 取得指定市場別之MOPS查詢結果
 *
 * @param {String} marketKind 輸入市場別字串，可為'sii'、'otc'、'rotc'、'pub'
 * @returns {Object} 回傳MOPS查詢結果物件
 */
function getMopsResult(marketKind) {
    return mopsResults[marketKind] || { code: 406, message: '查無相符資料', result: [] }
}


//===== 證交所休市日期 =====


//含重複條目、交易日標記與結算作業日, 供斷言去重與排除
let holidaySchedule = [
    { Date: '1150216', Name: '農曆春節', Weekday: '一', Description: '2月16日<br/>放假' },
    { Date: '1150101', Name: '中華民國開國紀念日', Weekday: '四', Description: '1月1日(星期四)為假日。' },
    { Date: '1150101', Name: '中華民國開國紀念日', Weekday: '四', Description: '重複條目' },
    { Date: '1150102', Name: '國曆新年開始交易日', Weekday: '五', Description: '開始交易' },
    { Date: '1150218', Name: '市場無交易，僅辦理結算交割作業', Weekday: '三', Description: '' },
]


//===== 愛思想 =====


let aisixiangThinktankHtml = `<!DOCTYPE html><html><head><title>思想庫_爱思想</title></head><body>
<div class="thinktank_list">
<a href="/thinktank/gezhaoguang.html">葛兆光</a>
<a href="/thinktank/qinhui.html">秦晖，清华大学</a>
<a href="/thinktank/zhangwei.html">张维</a>
</div>
</body></html>`


let aisixiangAuthorHtml = `<!DOCTYPE html><html><head><title>葛兆光_爱思想</title></head><body>
<h3>论文</h3>
<a href="/data/146669.html">禅宗与中国文化</a>
<a href="/data/146670.html">中国思想史</a>
<h3>时评</h3>
<a href="/data/146671.html">学术与社会</a>
</body></html>`


let aisixiangEmptyAuthorHtml = `<!DOCTYPE html><html><head><title>无文章_爱思想</title></head><body>
<h3>论文</h3>
</body></html>`


let aisixiangZhuantiListHtml = `<!DOCTYPE html><html><head><title>专题_爱思想</title></head><body>
<h3>学科关键词</h3>
<a href="/zhuanti/301.html">大数据</a>
<a href="/zhuanti/302.html">政治学</a>
<h3>事件关键词</h3>
<a href="/zhuanti/401.html">中美贸易战</a>
<h3>人物关键词</h3>
<a href="/zhuanti/501.html">康德</a>
</body></html>`


let aisixiangZhuantiPage1Html = `<!DOCTYPE html><html><head><title>大数据_爱思想</title></head><body>
<a href="/data/200001.html">作者一：大数据与治理</a>
<a href="/data/200002.html">作者二：数据要素市场</a>
<div class="list_page"><a href="/zhuanti/301.html?page=1">1</a><a href="/zhuanti/301.html?page=2">2</a></div>
</body></html>`


let aisixiangZhuantiPage2Html = `<!DOCTYPE html><html><head><title>大数据_爱思想</title></head><body>
<a href="/data/200003.html">作者三：算法治理</a>
<div class="list_page"><a href="/zhuanti/301.html?page=1">1</a><a href="/zhuanti/301.html?page=2">2</a></div>
</body></html>`


let aisixiangSearchHitHtml = `<!DOCTYPE html><html><head><title>搜索_爱思想</title></head><body>
<div class="search_list">
<a href="/data/300001.html" title="作者甲：老庄之道">老庄之道</a>
<a href="/data/300002.html" title="老庄新解">老庄新解</a>
</div>
<div class="list_page"><a href="/data/search?page=1">1</a></div>
</body></html>`


//search_list區塊為空, 供斷言0結果時不誤抓側邊欄連結
let aisixiangSearchEmptyHtml = `<!DOCTYPE html><html><head><title>搜索_爱思想</title></head><body>
<div class="search_list"></div>
<div class="side_bar"><a href="/data/999999.html" title="側邊欄不應被抓">側邊欄</a></div>
</body></html>`


let aisixiangArticleHtml = `<!DOCTYPE html><html><head><title>葛兆光：禅宗与中国文化_爱思想</title></head><body>
<div class="article-content">
<p>禅宗自唐代以来，深刻影响了中国文化。</p>
<p>本文讨论<b>禅宗</b>与<a href="/data/1.html">士大夫</a>之关系，兼及&amp;思想史脉络。</p>
<div><p>嵌套段落亦應被完整切出。</p></div>
</div>
</body></html>`


//無article-content區塊, 供斷言解析失敗會拋錯
let aisixiangBadArticleHtml = '<!DOCTYPE html><html><head><title>不存在_爱思想</title></head><body><p>404</p></body></html>'


//===== 觀察者網 =====


//首頁底部A-Z作者索引, <dt>[A-Z]</dt>需達門檻(5)以供isHomepageHtml偵測
let guanchaHomeHtml = `<!DOCTYPE html><html><head><title>观察者网</title></head><body>
<div class="index-wrap">观察者网首页内容区块，此处為版面主體，長度足供curl之最短長度檢核通過。</div>
<dl class="fix"><dt>A</dt><dd><a href="/AnSheng/list_1.shtml">安生</a></dd></dl>
<dl class="fix"><dt>B</dt><dd><a href="/BaiTong/list_1.shtml">白彤东</a></dd></dl>
<dl class="fix"><dt>C</dt><dd><a href="/ChenPing/list_1.shtml">陈平</a></dd></dl>
<dl class="fix"><dt>D</dt><dd><a href="/DaiXu/list_1.shtml">戴旭</a></dd></dl>
<dl class="fix"><dt>J</dt><dd><a href="/JinCanRong/list_1.shtml">金灿荣</a></dd></dl>
<dl class="fix"><dt>Z</dt><dd><a href="/ZhangWeiWei/list_1.shtml">张维为</a></dd></dl>
</body></html>`


let guanchaListPage1Html = `<!DOCTYPE html><html><head><title>安生-观察者网</title></head><body>
<ul class="list-wrap">
<li><a href="/AnSheng/2026_08_07_800001.shtml" title="觀察者網標題一">觀察者網標題一</a></li>
<li><a href="/AnSheng/2026_08_06_800002.shtml" title="觀察者網標題二">觀察者網標題二</a></li>
</ul>
<div class="page">此區為分頁列, 內容補長以通過curl之最短長度檢核。</div>
</body></html>`


let guanchaListPage2Html = `<!DOCTYPE html><html><head><title>安生-观察者网</title></head><body>
<ul class="list-wrap">
<li><a href="/AnSheng/2026_08_05_800003.shtml" title="觀察者網標題三">觀察者網標題三</a></li>
</ul>
<div class="page">此區為分頁列, 內容補長以通過curl之最短長度檢核。</div>
</body></html>`


//無任何文章連結, 供斷言翻頁至此即停止
let guanchaListEmptyHtml = `<!DOCTYPE html><html><head><title>安生-观察者网</title></head><body>
<ul class="list-wrap"></ul>
<div class="page">此頁已無文章, 內容補長以通過curl之最短長度檢核, 供斷言翻頁在此停止。</div>
</body></html>`


let guanchaArticleHtml = `<!DOCTYPE html><html><head><title>OPEC+宣布增产_观察者网</title></head><body>
<div class="time"><span>2026-08-07 09:02:03</span></div>
<div class="content all-txt" id="cont">
<p>【文/观察者网 王五】OPEC+今日宣布增产。</p>
<p>此為第二段，含<img src="https://i.guancha.cn/p1.jpg" />圖片與<b>粗體</b>。</p>
</div>
</body></html>`


export {
    aiNews,
    rssXml,
    rssContentXml,
    rssDescOnlyXml,
    rssTinyXml,
    hnNewStories,
    hnItems,
    cnyesPage1,
    cnyesPageEmpty,
    statementdogHtml,
    statementdogFallbackHtml,
    statementdogEmptyHtml,
    moneydjPage1Html,
    moneydjPage2Html,
    moneydjEmptyHtml,
    twseStockDay,
    twseMiIndex,
    twseMargin,
    twseT86,
    tpexStock,
    tpexMargin,
    tpexMarginBadShape,
    tpex3instiFields,
    tpex3insti,
    tpex3instiBadShape,
    taifexFuturesCsv,
    taifexInstitutionalCsv,
    taifexPcRatioCsv,
    mopsPageHtml,
    mopsResults,
    getMopsResult,
    holidaySchedule,
    aisixiangThinktankHtml,
    aisixiangAuthorHtml,
    aisixiangEmptyAuthorHtml,
    aisixiangZhuantiListHtml,
    aisixiangZhuantiPage1Html,
    aisixiangZhuantiPage2Html,
    aisixiangSearchHitHtml,
    aisixiangSearchEmptyHtml,
    aisixiangArticleHtml,
    aisixiangBadArticleHtml,
    guanchaHomeHtml,
    guanchaListPage1Html,
    guanchaListPage2Html,
    guanchaListEmptyHtml,
    guanchaArticleHtml
}
