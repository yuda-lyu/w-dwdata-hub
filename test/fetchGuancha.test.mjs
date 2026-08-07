import assert from 'assert'
import fetchGuancha, {
    BASE_URL,
    KNOWN_TOPICS,
    isHomepageHtml,
    parseListPage,
    fetchAuthorsList,
    lookupAuthor,
    lookupTopic,
    fetchAuthorArticles,
    fetchKeywordArticles,
    fetchTitleArticles,
    fetchTopicArticles,
    fetchArticle
} from '../src/fetchGuancha.mjs'
import serverForTest from './tools/serverForTest.mjs'
import { guanchaHomeHtml, guanchaListPage1Html } from './tools/fixtures.mjs'


describe('fetchGuancha', function() {

    let svr = null
    let optFast = null

    before(async function() {
        svr = await serverForTest()
        optFast = { baseUrl: svr.url(''), maxRetries: 0, pageDelayMs: 0, showLog: false }
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('模組常數與預設匯出之函數齊備', function() {
        let r = [
            BASE_URL,
            Array.isArray(KNOWN_TOPICS),
            KNOWN_TOPICS.every((t) => typeof t.slug === 'string' && typeof t.name === 'string' && t.slug.length > 0 && t.name.length > 0),
            Object.keys(fetchGuancha).sort(),
        ]
        let rr = [
            'https://www.guancha.cn',
            true,
            true,
            [
                'BASE_URL', 'KNOWN_TOPICS', 'MAX_PAGES', 'USER_AGENT', 'fetchArticle', 'fetchAuthorArticles',
                'fetchAuthorsList', 'fetchKeywordArticles', 'fetchTitleArticles', 'fetchTopicArticles',
                'lookupAuthor', 'lookupTopic', 'safeFilename',
            ],
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('KNOWN_TOPICS之分頁版slug排在大頻道版之前, 令lookupTopic之first-match取到可翻頁者', function() {
        let r = [
            lookupTopic('财经').slug,
            lookupTopic('军事').slug,
            lookupTopic('俄罗斯之声').slug,
            lookupTopic('不存在的主題XYZ'),
            lookupTopic(''),
            lookupTopic(null),
        ]
        let rr = ['CaiJing', 'JunShi', 'ELuoSiZhiSheng', null, null, null]
        assert.strict.deepEqual(r, rr)
    })

    it('isHomepageHtml以A-Z作者索引區塊辨識首頁', function() {
        let r = [
            isHomepageHtml(guanchaHomeHtml),
            isHomepageHtml(guanchaListPage1Html),
        ]
        let rr = [true, false]
        assert.strict.deepEqual(r, rr)
    })

    it('parseListPage不限定文章URL之slug', function() {
        let r = parseListPage(guanchaListPage1Html, 'https://www.guancha.cn')
        let rr = [
            { url: 'https://www.guancha.cn/AnSheng/2026_08_07_800001.shtml', title: '觀察者網標題一', slug: 'AnSheng' },
            { url: 'https://www.guancha.cn/AnSheng/2026_08_06_800002.shtml', title: '觀察者網標題二', slug: 'AnSheng' },
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchAuthorsList由首頁A-Z索引解析作者對照', async function() {
        let t = await fetchAuthorsList(optFast)
        let r = [t.length, t[0], lookupAuthor(t, '张维为').slug, lookupAuthor(t, '不存在XYZ')]
        let rr = [6, { slug: 'AnSheng', name: '安生', letter: 'A' }, 'ZhangWeiWei', null]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchAuthorArticles以name兩跳並自動翻頁至無新項目為止', async function() {
        let t = await fetchAuthorArticles({ ...optFast, name: '安生' })
        let r = [t.status, t.site, t.mode, t.resolved.slug, t.resolved.name, t.resolved.pages_fetched, t.count]
        let rr = ['success', 'guancha', 'author', 'AnSheng', '安生', 3, 3]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchAuthorArticles以slug捷徑跳過索引查找', async function() {
        let c0 = svr.getCount('/')
        let t = await fetchAuthorArticles({ ...optFast, slug: 'AnSheng' })
        let r = [t.status, t.count, svr.getCount('/') - c0]
        let rr = ['success', 3, 0]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchAuthorArticles查無作者時回success且count為0並附說明', async function() {
        let t = await fetchAuthorArticles({ ...optFast, name: '完全不存在的作者XYZ123' })
        let r = [t.status, t.count, t.items, t.authors_count, t.message.includes('尚無此作者文章')]
        let rr = ['success', 0, [], 6, true]
        assert.strict.deepEqual(r, rr)
    })

    it('slug不存在時第1頁被導向首頁, 回status為error且reason為redirected-to-homepage', async function() {
        let t = await fetchAuthorArticles({ ...optFast, slug: 'NotExistSlug' })
        let r = [t.status, t.mode, t.reason, t.error.includes('不存在')]
        let rr = ['error', 'author', 'redirected-to-homepage', true]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchKeywordArticles與fetchTitleArticles因站方簽名混淆一律回error', async function() {
        let t1 = await fetchKeywordArticles('人工智能', optFast)
        let t2 = await fetchTitleArticles('人工智能', optFast)
        let r = [
            t1.status, t1.mode, t1.error, t1.message.includes('sojson'),
            t2.status, t2.mode, t2.error,
        ]
        let rr = ['error', 'keyword', 'unsupported-by-curl', true, 'error', 'title', 'unsupported-by-curl']
        assert.strict.deepEqual(r, rr)
    })

    it('fetchTopicArticles以name查對照表後翻頁全抓', async function() {
        let t = await fetchTopicArticles({ ...optFast, name: '财经' })
        let r = [t.status, t.mode, t.resolved.slug, t.count]
        let rr = ['success', 'topic', 'CaiJing', 2]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchTopicArticles不在對照表時fail-fast', async function() {
        let t = await fetchTopicArticles({ ...optFast, name: '完全不存在的主題ABC123' })
        let r = [t.status, t.mode, t.error, t.topics_count, t.message.includes('slug')]
        let rr = ['error', 'topic', 'topic-not-in-table', KNOWN_TOPICS.length, true]
        assert.strict.deepEqual(r, rr)
    })

    it('fetchArticle轉為含frontmatter之Markdown, 保留圖片並抽出作者與發布時間', async function() {
        let t = await fetchArticle({ ...optFast, url: svr.url('/AnSheng/2026_08_07_800001.shtml') })
        let r = [
            t.status,
            t.mode,
            t.title,
            t.author,
            t.published,
            t.markdown.startsWith('---\n'),
            t.markdown.includes(`source: "${svr.url('/AnSheng/2026_08_07_800001.shtml')}"`),
            t.markdown.includes('![](https://i.guancha.cn/p1.jpg)'),
            t.markdown.includes('**粗體**'),
        ]
        let rr = ['success', 'fetch', 'OPEC+宣布增产', '文/观察者网 王五', '2026-08-07 09:02:03', true, true, true, true]
        assert.strict.deepEqual(r, rr)
    })

    it('文章已下架被導向首頁時回status為error且error為article-not-found', async function() {
        let t = await fetchArticle({ ...optFast, url: svr.url('/AnSheng/2026_01_01_000000.shtml') })
        let r = [t.status, t.mode, t.error, t.message.includes('無此文章')]
        let rr = ['error', 'fetch', 'article-not-found', true]
        assert.strict.deepEqual(r, rr)
    })

    it('抓取失敗時回status為error', async function() {
        let t = await fetchArticle({ ...optFast, url: svr.url('/nothing.shtml') })
        let r = [t.status, t.mode, typeof t.error]
        let rr = ['error', 'fetch', 'string']
        assert.strict.deepEqual(r, rr)
    })

    it('必要參數缺失時拋錯', async function() {
        let r = []
        await fetchAuthorArticles(optFast).catch((err) => r.push(err.message))
        await fetchKeywordArticles(undefined, optFast).catch((err) => r.push(err.message))
        await fetchTitleArticles(undefined, optFast).catch((err) => r.push(err.message))
        await fetchTopicArticles(optFast).catch((err) => r.push(err.message))
        await fetchArticle(optFast).catch((err) => r.push(err.message))
        let rr = ['需要 name 或 slug', '需要 keyword', '需要 keyword', '需要 name 或 slug', '需要 url']
        assert.strict.deepEqual(r, rr)
    })

})
