import assert from 'assert'
import fetchAisixiang, {
    BASE_URL,
    MAX_PAGES,
    fetchAuthorsList,
    lookupAuthor,
    fetchTopicsList,
    lookupTopic,
    fetchAuthorArticles,
    fetchKeywordArticles,
    fetchTitleArticles,
    fetchTopicArticles,
    fetchArticle
} from '../src/fetchAisixiang.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchAisixiang', function() {

    let svr = null
    let optFast = null

    before(async function() {
        svr = await serverForTest()
        optFast = { baseUrl: svr.url(''), baseDelayMs: 10, maxDelayMs: 10, pageDelayMs: 0, showLog: false }
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('模組常數與預設匯出之函數齊備', function() {
        let r = [
            BASE_URL,
            MAX_PAGES,
            Object.keys(fetchAisixiang).sort(),
        ]
        let rr = [
            'https://www.aisixiang.com',
            50,
            [
                'BASE_URL', 'MAX_PAGES', 'USER_AGENT', 'fetchArticle', 'fetchAuthorArticles',
                'fetchAuthorsList', 'fetchKeywordArticles', 'fetchTitleArticles', 'fetchTopicArticles',
                'fetchTopicsList', 'lookupAuthor', 'lookupTopic', 'safeFilename',
            ],
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchAuthorsList解析作者清單並去除重複slug', async function() {
        let r = await fetchAuthorsList(optFast)
        let rr = [
            { slug: 'gezhaoguang', name: '葛兆光' },
            { slug: 'qinhui', name: '秦晖' },
            { slug: 'zhangwei', name: '张维' },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('lookupAuthor查無時回傳null', function() {
        let authors = [{ slug: 'gezhaoguang', name: '葛兆光' }]
        let r = [
            lookupAuthor(authors, '葛兆光'),
            lookupAuthor(authors, '葛兆光'.replace('葛', '楊')),
            lookupAuthor(authors, ''),
            lookupAuthor(null, '葛兆光'),
        ]
        let rr = [{ slug: 'gezhaoguang', name: '葛兆光' }, null, null, null]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchTopicsList解析主題清單並標記分類', async function() {
        let r = await fetchTopicsList(optFast)
        let rr = [
            { id: '301', name: '大数据', category: '学科' },
            { id: '302', name: '政治学', category: '学科' },
            { id: '401', name: '中美贸易战', category: '事件' },
            { id: '501', name: '康德', category: '人物' },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('lookupTopic查無時回傳null', function() {
        let topics = [{ id: '301', name: '大数据', category: '学科' }]
        let r = [
            lookupTopic(topics, '大数据').id,
            lookupTopic(topics, '大數據'),
            lookupTopic(null, '大数据'),
        ]
        let rr = ['301', null, null]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchAuthorArticles以name兩跳查得專欄文章並標記分類', async function() {
        let t = await fetchAuthorArticles({ ...optFast, name: '葛兆光' })
        let r = [t.status, t.site, t.mode, t.resolved.slug, t.resolved.name, t.count, t.items[0], t.items[2].category]
        let rr = [
            'success', 'aisixiang', 'author', 'gezhaoguang', '葛兆光', 3,
            { aid: '146669', url: svr.url('/data/146669.html'), title: '禅宗与中国文化', category: '论文' },
            '时评',
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchAuthorArticles以slug捷徑跳過清單查找', async function() {
        let c0 = svr.getCount('/thinktank/')
        let t = await fetchAuthorArticles({ ...optFast, slug: 'gezhaoguang' })
        let r = [t.status, t.count, svr.getCount('/thinktank/') - c0]
        let rr = ['success', 3, 0]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchAuthorArticles查無作者時回success且count為0並附說明', async function() {
        let t = await fetchAuthorArticles({ ...optFast, name: '不存在的作者XYZ' })
        let r = [t.status, t.count, t.items, t.authors_count, t.message.includes('尚無此作者文章'), t.message.includes('簡繁')]
        let rr = ['success', 0, [], 3, true, true]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchAuthorArticles命中欄頁但0篇時回success且附說明', async function() {
        let t = await fetchAuthorArticles({ ...optFast, slug: 'nobody' })
        let r = [t.status, t.count, t.message.includes('0 篇文章')]
        let rr = ['success', 0, true]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchKeywordArticles自動翻頁並解析搜尋結果', async function() {
        let t = await fetchKeywordArticles('老庄', optFast)
        let r = [t.status, t.mode, t.count, t.items[0], t.resolved.search_url.includes('searchfield=keywords')]
        let rr = [
            'success', 'keyword', 2,
            { aid: '300001', url: svr.url('/data/300001.html'), title: '老庄之道', author: '作者甲' },
            true,
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchKeywordArticles無結果時回success且count為0, 不誤抓側邊欄連結', async function() {
        let t = await fetchKeywordArticles('老莊', optFast)
        let r = [t.status, t.count, t.items, t.message.includes('無相關文章'), t.message.includes('簡體')]
        let rr = ['success', 0, [], true, true]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchTitleArticles走title搜尋端點', async function() {
        let t = await fetchTitleArticles('老庄', optFast)
        let r = [t.status, t.mode, t.count, t.resolved.search_url.includes('searchfield=title')]
        let rr = ['success', 'title', 2, true]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchTopicArticles以keyword兩跳並自動翻頁全抓', async function() {
        let t = await fetchTopicArticles({ ...optFast, keyword: '大数据' })
        let r = [t.status, t.mode, t.resolved.id, t.resolved.category, t.resolved.total_pages, t.resolved.pages_fetched, t.count]
        let rr = ['success', 'topic', '301', '学科', 2, 2, 3]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchTopicArticles以id捷徑跳過清單查找', async function() {
        let c0 = svr.getCount('/zhuanti/')
        let t = await fetchTopicArticles({ ...optFast, id: '301' })
        let r = [t.status, t.count, svr.getCount('/zhuanti/') - c0]
        let rr = ['success', 3, 0]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchTopicArticles查無主題時回success且count為0並建議改查keyword', async function() {
        let t = await fetchTopicArticles({ ...optFast, keyword: '不存在的主題ABC' })
        let r = [t.status, t.count, t.topics_count, t.message.includes('fetchKeywordArticles')]
        let rr = ['success', 0, 4, true]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchArticle轉為含frontmatter之Markdown並去除站名後綴', async function() {
        let t = await fetchArticle({ ...optFast, aid: '146669' })
        let r = [
            t.status,
            t.mode,
            t.url,
            t.title,
            t.markdown.startsWith('---\n'),
            t.markdown.includes(`source: "${svr.url('/data/146669.html')}"`),
            t.markdown.includes('**禅宗**'),
            t.markdown.includes('[士大夫](/data/1.html)'),
            t.markdown.includes('&思想史脉络'),
            t.markdown.includes('嵌套段落亦應被完整切出。'),
        ]
        let rr = ['success', 'fetch', svr.url('/data/146669.html'), '葛兆光：禅宗与中国文化', true, true, true, true, true, true]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchArticle以url為入口', async function() {
        let t = await fetchArticle({ ...optFast, url: svr.url('/data/146669.html') })
        let r = [t.status, t.title, t.chars > 30]
        let rr = ['success', '葛兆光：禅宗与中国文化', true]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchArticle解析失敗時reject', async function() {
        let r = null
        await fetchArticle({ ...optFast, aid: '999999' })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = err.message.startsWith('解析失敗')
            })
        let rr = true
        assert.strict.deepEqual(r, rr)
    })

    it('必要參數缺失時拋錯', async function() {
        let r = []
        await fetchAuthorArticles(optFast).catch((err) => r.push(err.message))
        await fetchKeywordArticles(undefined, optFast).catch((err) => r.push(err.message))
        await fetchTitleArticles(undefined, optFast).catch((err) => r.push(err.message))
        await fetchTopicArticles(optFast).catch((err) => r.push(err.message))
        await fetchArticle(optFast).catch((err) => r.push(err.message))
        let rr = ['需要 name 或 slug', '需要 keyword', '需要 keyword', '需要 keyword 或 id', '需要 aid 或 url']
        assert.strict.deepEqual(r, rr)
    })

})
