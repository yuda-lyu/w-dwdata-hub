import wfw from 'w-fetch-web'
import get from 'lodash-es/get.js'
import isbol from 'wsemi/src/isbol.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import cint from 'wsemi/src/cint.mjs'
import delay from 'wsemi/src/delay.mjs'
import decodeEntities from './decodeEntities.mjs'
import htmlToMarkdown from './htmlToMarkdown.mjs'
import extractDivContent from './extractDivContent.mjs'
import safeFilename from './safeFilename.mjs'


//w-fetch-web為UMD套件, 只能default import, named import取不到函數
let { fetchWebByCurl } = wfw


//觀察者網網站根網址
let BASE_URL = 'https://www.guancha.cn'


//觀察者網對User-Agent較敏感, 故固定送出桌面瀏覽器標頭
let USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'


//頁間延遲毫秒
let PAGE_DELAY_MS = 1000


//翻頁安全上限, 50頁×60筆=3000筆
let MAX_PAGES = 50


//預設值
let DEFAULT_MAX_RETRIES = 5


//偵測首頁之門檻, 首頁底部A-Z作者索引實測有約22個<dt>[A-Z]</dt>, 真實list頁為0個
//取門檻5以容忍站方版型微調, 同時遠離0
let HOMEPAGE_DT_THRESHOLD = 5


/**
 * 已知主題對照表
 *
 * 觀察者網無公開主題清單頁, 本表為手工整理(由首頁專題標籤與大頻道nav), 未涵蓋者請直接傳slug。
 * 注意：同一中文名有多個slug時(如「财经」對應大頻道/economy與分頁欄目/CaiJing),
 * 分頁欄目slug必須排在前面, 因lookupTopic採first-match;
 * /economy等大頻道是「精選首頁」不分頁, /CaiJing等欄目才能以list_N.shtml翻頁全抓
 */
let KNOWN_TOPICS = [
    //中文名重複者, 分頁版slug在前, 大頻道版slug用獨立中文名標記避免覆蓋
    { slug: 'CaiJing', name: '财经' }, //分頁版(首選)
    { slug: 'economy', name: '财经-大頻道' }, //大頻道精選首頁, 不分頁
    { slug: 'JunShi', name: '军事' }, //分頁版(首選)
    { slug: 'military-affairs', name: '军事-大頻道' }, //大頻道精選首頁, 不分頁
    { slug: 'ZhengZhi', name: '政治' },
    { slug: 'WenHua', name: '文化' },
    { slug: 'chanjing', name: '产经' },
    { slug: 'qiche', name: '观出行' },
    { slug: 'gongye-keji', name: '科技' },
    { slug: 'ChengShi', name: '城事' },
    { slug: 'GuanJinRong', name: '观金融' },
    { slug: 'XinShiDai', name: '新时代' },
    { slug: 'ChaoJiGongCheng', name: '超级工程' },
    { slug: 'NengYuanZhanLue', name: '能源战略' },
    { slug: 'RenGongZhiNeng', name: '人工智能' },
    { slug: 'XinZhiGuanChaSuoNews', name: '心智观察所' },
    { slug: 'YiLangJuShi', name: '伊朗局势' },
    { slug: 'MeiGuoMeng', name: '美国一梦' },
    { slug: 'MeiGuoJingJi', name: '美国经济' },
    { slug: 'ELuoSiZhiSheng', name: '俄罗斯之声' },
    { slug: 'lianganyuanzhuopai', name: '两岸圆桌派' },
    { slug: 'ZheJiuShiZhongGuo', name: '这就是中国' },
    { slug: 'YiZhouJunQingGuanCha', name: '一周军事观察' },
    { slug: 'feizhoushangkou', name: '非洲之窗' },
    { slug: 'toutiao', name: '观察者头条' },
    { slug: 'gushi', name: '股市' },
    { slug: 'guanwangwenyu', name: '新潮观鱼' },
    { slug: 'jingtiriben', name: '冲破战后秩序 日本想干什么' },
    { slug: 'DaoGuoDianAVI', name: '日本' },
]


/**
 * 正規化本模組共用設定
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @returns {Object} 回傳已正規化之設定物件，內含baseUrl、showLog與optFetch
 */
function getCfg(opt = {}) {

    //baseUrl
    let baseUrl = get(opt, 'baseUrl')
    if (!isestr(baseUrl)) {
        baseUrl = BASE_URL
    }
    baseUrl = baseUrl.replace(/\/+$/, '')

    //maxRetries
    let maxRetries = get(opt, 'maxRetries')
    if (!isp0int(maxRetries)) {
        maxRetries = DEFAULT_MAX_RETRIES
    }
    else {
        maxRetries = cint(maxRetries)
    }

    //timeoutMs
    let timeoutMs = get(opt, 'timeout')
    if (!ispint(timeoutMs)) {
        timeoutMs = null
    }
    else {
        timeoutMs = cint(timeoutMs)
    }

    //showLog
    let showLog = get(opt, 'showLog')
    if (!isbol(showLog)) {
        showLog = true
    }

    //optFetch
    let optFetch = { userAgent: USER_AGENT, referer: baseUrl, maxRetries }
    if (timeoutMs !== null) {
        optFetch.timeoutMs = timeoutMs
    }

    //pageDelayMs
    let pageDelayMs = get(opt, 'pageDelayMs')
    if (!isp0int(pageDelayMs)) {
        pageDelayMs = PAGE_DELAY_MS
    }
    else {
        pageDelayMs = cint(pageDelayMs)
    }

    //maxPages
    let maxPages = get(opt, 'maxPages')
    if (!ispint(maxPages)) {
        maxPages = MAX_PAGES
    }
    else {
        maxPages = Math.min(cint(maxPages), MAX_PAGES)
    }

    return { baseUrl, showLog, pageDelayMs, maxPages, optFetch }
}


/**
 * 抓取網頁原始HTML
 *
 * 委派w-fetch-web之fetchWebByCurl(其本身內建重試與線性退避), 失敗時拋出帶reason與httpCode之錯誤
 *
 * @param {String} url 輸入待抓取網址字串
 * @param {Object} cfg 輸入已正規化之設定物件
 * @returns {Promise} 回傳Promise，resolve回傳原始HTML字串
 */
async function fetchHtml(url, cfg) {

    let r = await fetchWebByCurl(url, cfg.optFetch)
    if (r.status !== 'success') {
        let err = new Error(r.message || 'fetch failed')
        err.reason = r.reason
        err.url = url
        err.httpCode = r.httpCode
        throw err
    }

    //注意：觀察者網對「不存在的slug／已下架文章」會302跳首頁(curl -L跟隨後httpCode仍為200)
    //fetchWebByCurl不回傳effective URL無法靠URL比對, list頁與首頁之<title>又同為「观察者网」故title也無法區分
    //改以結構特徵偵測(見isHomepageHtml), 由各caller視情境處理
    return r.html
}


/**
 * 偵測HTML是否為觀察者網首頁
 *
 * 判準為首頁底部含A-Z作者索引之<dt>[A-Z]</dt>標記(真正的作者欄頁、欄目頁與主題集頁皆無此區塊),
 * 用以識別「請求被302導向首頁」之情形
 *
 * @param {String} html 輸入HTML字串
 * @returns {Boolean} 回傳是否為首頁之布林值
 */
function isHomepageHtml(html) {
    let m = html.match(/<dt>[A-Z]<\/dt>/g)
    return !!m && m.length >= HOMEPAGE_DT_THRESHOLD
}


/**
 * 由HTML抽出title標籤內容
 *
 * @param {String} html 輸入HTML字串
 * @returns {String|null} 回傳標題字串，無title標籤時回傳null
 */
function extractHtmlTitle(html) {
    let m = html.match(/<title>([\s\S]*?)<\/title>/i)
    return m ? decodeEntities(m[1].trim()) : null
}


/**
 * 由正文第一段抽出作者署名
 *
 * 觀察者網正文首段常見【文/观察者网 XXX】或【文/观察者网专栏作者 XXX，翻译/ XXX】
 *
 * @param {String} contentHtml 輸入正文區塊HTML字串
 * @returns {String|null} 回傳作者署名字串，無署名時回傳null
 */
function extractAuthorFromContent(contentHtml) {
    let m = contentHtml.match(/【([^】]{4,120})】/)
    if (!m) {
        return null
    }
    return m[1].replace(/<[^>]+>/g, '').trim()
}


/**
 * 由HTML抽出發布時間
 *
 * @param {String} html 輸入HTML字串
 * @returns {String|null} 回傳發布時間字串，格式為'YYYY-MM-DD HH:mm:ss'，無發布時間時回傳null
 */
function extractPubTime(html) {
    let m = html.match(/<span[^>]*>(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})<\/span>/)
    return m ? m[1] : null
}


/**
 * 由首頁底部A-Z索引解析作者對照
 *
 * @param {String} html 輸入首頁HTML字串
 * @returns {Array} 回傳作者物件陣列，各物件為{slug,name,letter}
 */
function parseAuthorIndex(html) {

    let flat = html.replace(/\n/g, ' ')
    let items = []
    let seen = new Set()

    let dlBlocks = [...flat.matchAll(/<dt>([A-Z])<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)]
    for (let [, letter, body] of dlBlocks) {
        let linkRe = /<a[^>]+href="(?:\.\.\/|\/)?([A-Za-z][a-zA-Z0-9_-]+)\/list_1\.shtml"[^>]*>([^<]+)<\/a>/g
        let m
        while ((m = linkRe.exec(body)) !== null) {
            let slug = m[1]
            let name = decodeEntities(m[2]).trim()
            if (!name || seen.has(slug)) {
                continue
            }
            seen.add(slug)
            items.push({ slug, name, letter })
        }
    }

    return items
}


/**
 * 解析列表頁之文章清單
 *
 * 列表頁slug與文章URL slug通常不同(作者頁同slug, 主題集頁用各自作者slug, 欄目頁用大頻道slug),
 * 故本函數不限定文章URL之slug, 抽出所有符合/<slug>/<YYYY_MM_DD>_<id>.shtml模式之連結
 *
 * @param {String} html 輸入列表頁HTML字串
 * @param {String} baseUrl 輸入網站根網址字串
 * @returns {Array} 回傳文章物件陣列，各物件為{url,title,slug}
 */
function parseListPage(html, baseUrl) {

    let flat = html.replace(/\n/g, ' ')
    let items = []
    let seen = new Set()

    let linkRe = /<a[^>]+href="\/([A-Za-z][a-zA-Z0-9_-]+)\/(\d{4}_\d{2}_\d{2}_\d+)\.shtml"(?:[^>]*title="([^"]+)")?[^>]*>([^<]*)<\/a>/g
    let m
    while ((m = linkRe.exec(flat)) !== null) {
        let articleSlug = m[1]
        let dateId = m[2]
        let titleAttr = m[3] && decodeEntities(m[3]).trim()
        let inner = m[4] && decodeEntities(m[4]).replace(/<[^>]+>/g, '').trim()
        let title = titleAttr || inner || ''
        let key = `${articleSlug}/${dateId}`
        if (seen.has(key) || !title) {
            continue
        }
        seen.add(key)
        items.push({ url: `${baseUrl}/${articleSlug}/${dateId}.shtml`, title, slug: articleSlug })
    }

    return items
}


/**
 * 自動翻頁抓取全部列表頁
 *
 * 逐頁抓/<slug>/list_N.shtml, 適用於作者頁、欄目頁與主題集頁;
 * 第1頁被302導向首頁代表slug不存在故拋錯, 後續頁被導向首頁或無新項目則視為到底
 *
 * @param {String} slug 輸入欄目或作者之slug字串
 * @param {Object} cfg 輸入已正規化之設定物件
 * @returns {Promise} 回傳Promise，resolve回傳{items,pages_fetched}
 */
async function fetchAllListPages(slug, cfg) {

    let all = []
    let seen = new Set()
    let pagesFetched = 0

    for (let page = 1; page <= cfg.maxPages; page++) {

        let url = `${cfg.baseUrl}/${slug}/list_${page}.shtml`
        if (cfg.showLog) {
            process.stderr.write(`[info] fetching ${slug} list_${page} ...\n`)
        }

        //html, 翻頁失敗時第1頁失敗即拋, 後續頁失敗視為到底
        let html = null
        try {
            html = await fetchHtml(url, cfg)
        }
        catch (err) {
            if (page === 1) {
                throw err
            }
            if (cfg.showLog) {
                process.stderr.write(`[info] page ${page} fetch error (assumed end of list): ${err.message}\n`)
            }
            break
        }

        //偵測「不存在的slug被302跳首頁」
        if (isHomepageHtml(html)) {
            if (page === 1) {
                let err = new Error(`slug "${slug}" 不存在：請求 list 頁被觀察者網 302 導向首頁。`)
                err.reason = 'redirected-to-homepage'
                throw err
            }
            if (cfg.showLog) {
                process.stderr.write(`[info] page ${page} 被導向首頁，視為到底，停止翻頁\n`)
            }
            break
        }

        pagesFetched++

        let items = parseListPage(html, cfg.baseUrl)
        let fresh = items.filter((it) => !seen.has(it.url))
        if (fresh.length === 0) {
            if (cfg.showLog) {
                process.stderr.write(`[info] page ${page} 無新項目，停止翻頁\n`)
            }
            break
        }

        for (let it of fresh) {
            seen.add(it.url)
        }
        all.push(...fresh)

        if (page < cfg.maxPages) {
            await delay(cfg.pageDelayMs)
        }

    }

    return { items: all, pages_fetched: pagesFetched }
}


/**
 * 抓取觀察者網作者索引
 *
 * 由首頁底部A-Z索引解析作者中文名與slug對照, 注意首頁索引僅含部分作者
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.baseUrl='https://www.guancha.cn'] 輸入網站根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.maxRetries=5] 輸入最大重試次數整數，預設5
 * @param {Integer} [opt.pageDelayMs=1000] 輸入翻頁之頁間延遲毫秒整數，預設1000
 * @param {Integer} [opt.maxPages=50] 輸入翻頁上限正整數，上限為50，預設50
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳作者物件陣列，各物件為{slug,name,letter}
 * @example
 *
 * import { fetchAuthorsList } from './src/fetchGuancha.mjs'
 *
 * let test = async () => {
 *
 *     let rs = await fetchAuthorsList()
 *     console.log(rs.length, rs[0])
 *     // => 636 { slug: 'AnSheng', name: '安生', letter: 'A' }
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchAuthorsList(opt = {}) {

    let cfg = getCfg(opt)

    let html = await fetchHtml(`${cfg.baseUrl}/`, cfg)

    return parseAuthorIndex(html)
}


/**
 * 由作者清單查找指定中文名之作者
 *
 * 本函數不轉繁簡, 呼叫端須自行使用站方登錄字形(簡體)
 *
 * @param {Array} authors 輸入作者物件陣列
 * @param {String} name 輸入作者中文名字串
 * @returns {Object|null} 回傳作者物件，查無時回傳null
 * @example
 *
 * import { lookupAuthor } from './src/fetchGuancha.mjs'
 *
 * console.log(lookupAuthor([{ slug: 'AnSheng', name: '安生' }], '安生'))
 * // => { slug: 'AnSheng', name: '安生' }
 *
 */
function lookupAuthor(authors, name) {

    if (!Array.isArray(authors) || !name) {
        return null
    }

    return authors.find((a) => a.name === name) || null
}


/**
 * 由已知主題對照表查找指定名稱之主題
 *
 * 採first-match, 故同名時分頁版slug優先(見KNOWN_TOPICS說明)
 *
 * @param {String} name 輸入主題名稱字串
 * @returns {Object|null} 回傳主題物件，查無時回傳null
 * @example
 *
 * import { lookupTopic } from './src/fetchGuancha.mjs'
 *
 * console.log(lookupTopic('财经'))
 * // => { slug: 'CaiJing', name: '财经' }
 *
 */
function lookupTopic(name) {

    if (!name) {
        return null
    }

    return KNOWN_TOPICS.find((t) => t.name === name) || null
}


/**
 * 抓取觀察者網指定作者之文章清單
 *
 * 給name時先抓首頁A-Z索引解析出slug再翻頁全抓(兩跳), 給slug則直接翻頁全抓;
 * 查無此作者時仍回status為'success'且count為0, slug不存在(被302導向首頁)時回status為'error'
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.name] 輸入作者中文名字串，與slug擇一必填
 * @param {String} [opt.slug] 輸入作者slug字串，與name擇一必填
 * @param {String} [opt.baseUrl='https://www.guancha.cn'] 輸入網站根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.maxRetries=5] 輸入最大重試次數整數，預設5
 * @param {Integer} [opt.pageDelayMs=1000] 輸入翻頁之頁間延遲毫秒整數，預設1000
 * @param {Integer} [opt.maxPages=50] 輸入翻頁上限正整數，上限為50，預設50
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{status,site,mode,query,resolved,fetched_at,count,items}，name與slug皆未給時reject回傳錯誤物件
 * @example
 *
 * import { fetchAuthorArticles } from './src/fetchGuancha.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchAuthorArticles({ name: '安生' })
 *     console.log(r.status, r.count, r.resolved.slug)
 *     // => 'success' 120 'AnSheng'
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchAuthorArticles(opt = {}) {

    let cfg = getCfg(opt)

    //「有提供才檢」, 傳了但非有效字串視為未提供, 讓下方「至少一個」檢查接手
    let name = get(opt, 'name')
    if (!isestr(name)) {
        name = ''
    }
    let slug = get(opt, 'slug')
    if (!isestr(slug)) {
        slug = ''
    }
    if (!name && !slug) {
        throw new Error('需要 name 或 slug')
    }

    let resolvedSlug = slug
    let resolvedName = name

    if (!resolvedSlug) {

        if (cfg.showLog) {
            process.stderr.write('[info] fetching authors index from / ...\n')
        }
        let authors = await fetchAuthorsList(opt)
        let author = lookupAuthor(authors, name)
        if (!author) {
            //「真的沒這位作者」屬成功查詢、結果0筆
            return {
                status: 'success',
                site: 'guancha',
                mode: 'author',
                query: name,
                fetched_at: new Date().toISOString(),
                authors_count: authors.length,
                count: 0,
                items: [],
                message:
                    `"${name}" 不在觀察者網作者索引中（共 ${authors.length} 位）。尚無此作者文章。` +
                    `提醒：本函數不轉繁簡，呼叫端負責用站方登錄字形（簡體）。`,
            }
        }

        resolvedSlug = author.slug
        resolvedName = author.name
    }

    let url = `${cfg.baseUrl}/${resolvedSlug}`

    let listResult = null
    try {
        listResult = await fetchAllListPages(resolvedSlug, cfg)
    }
    catch (err) {
        return {
            status: 'error',
            site: 'guancha',
            mode: 'author',
            query: resolvedName || resolvedSlug,
            resolved: { slug: resolvedSlug, url, name: resolvedName },
            fetched_at: new Date().toISOString(),
            reason: err.reason,
            error: err.message,
        }
    }

    return {
        status: 'success',
        site: 'guancha',
        mode: 'author',
        query: resolvedName || resolvedSlug,
        resolved: { slug: resolvedSlug, url, name: resolvedName, pages_fetched: listResult.pages_fetched },
        fetched_at: new Date().toISOString(),
        count: listResult.items.length,
        items: listResult.items,
    }
}


/**
 * 抓取觀察者網指定關鍵字之文章清單
 *
 * 站方搜尋API(s.guancha.cn/main/search-v2)由sojson.v4混淆並走MD5簽名, 純curl路徑無法支援,
 * 故本函數一律回status為'error'且error為'unsupported-by-curl', 並於message建議改用作者或主題slug
 *
 * @param {String} keyword 輸入關鍵字字串
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{status,site,mode,query,fetched_at,error,message}，keyword非有效字串時reject回傳錯誤物件
 * @example
 *
 * import { fetchKeywordArticles } from './src/fetchGuancha.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchKeywordArticles('人工智能')
 *     console.log(r.status, r.error)
 *     // => 'error' 'unsupported-by-curl'
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchKeywordArticles(keyword, opt = {}) {

    //check
    if (!isestr(keyword)) {
        throw new Error('需要 keyword')
    }

    return {
        status: 'error',
        site: 'guancha',
        mode: 'keyword',
        query: keyword,
        fetched_at: new Date().toISOString(),
        error: 'unsupported-by-curl',
        message:
            `觀察者網搜尋 API（s.guancha.cn/main/search-v2）由 sojson.v4 混淆並走 MD5 簽名，` +
            `本函數（純 curl 路徑）無法支援。` +
            `如已知作者拼音 slug，請改用 fetchAuthorArticles({ slug })；如已知主題 slug，請改用 fetchTopicArticles({ slug })。`,
    }
}


/**
 * 抓取觀察者網指定標題關鍵字之文章清單
 *
 * 站方無分「標題」與「全文」搜尋(兩者同源), 與fetchKeywordArticles同因簽名混淆而不可用,
 * 故本函數一律回status為'error'且error為'unsupported-by-curl'
 *
 * @param {String} keyword 輸入標題關鍵字字串
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{status,site,mode,query,fetched_at,error,message}，keyword非有效字串時reject回傳錯誤物件
 * @example
 *
 * import { fetchTitleArticles } from './src/fetchGuancha.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTitleArticles('人工智能')
 *     console.log(r.status, r.error)
 *     // => 'error' 'unsupported-by-curl'
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTitleArticles(keyword, opt = {}) {

    //check
    if (!isestr(keyword)) {
        throw new Error('需要 keyword')
    }

    return {
        status: 'error',
        site: 'guancha',
        mode: 'title',
        query: keyword,
        fetched_at: new Date().toISOString(),
        error: 'unsupported-by-curl',
        message:
            `觀察者網無分「標題」與「全文」搜尋（兩者同源），` +
            `搜尋 API 由 sojson.v4 混淆並走 MD5 簽名，本函數（純 curl 路徑）無法支援。` +
            `如已知作者拼音 slug，請改用 fetchAuthorArticles({ slug })。`,
    }
}


/**
 * 抓取觀察者網指定主題之文章清單
 *
 * 給name時先查KNOWN_TOPICS對照表解析出slug再翻頁全抓, 給slug則直接翻頁全抓;
 * 主題不在對照表時fail-fast回status為'error'且error為'topic-not-in-table'
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.name] 輸入主題中文名字串，與slug擇一必填
 * @param {String} [opt.slug] 輸入主題slug字串，與name擇一必填
 * @param {String} [opt.baseUrl='https://www.guancha.cn'] 輸入網站根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.maxRetries=5] 輸入最大重試次數整數，預設5
 * @param {Integer} [opt.pageDelayMs=1000] 輸入翻頁之頁間延遲毫秒整數，預設1000
 * @param {Integer} [opt.maxPages=50] 輸入翻頁上限正整數，上限為50，預設50
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{status,site,mode,query,resolved,fetched_at,count,items}，name與slug皆未給時reject回傳錯誤物件
 * @example
 *
 * import { fetchTopicArticles } from './src/fetchGuancha.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchTopicArticles({ name: '财经' })
 *     console.log(r.status, r.resolved.slug, r.count)
 *     // => 'success' 'CaiJing' 300
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchTopicArticles(opt = {}) {

    let cfg = getCfg(opt)

    //「有提供才檢」, 傳了但非有效字串視為未提供, 讓下方「至少一個」檢查接手
    let name = get(opt, 'name')
    if (!isestr(name)) {
        name = ''
    }
    let slug = get(opt, 'slug')
    if (!isestr(slug)) {
        slug = ''
    }
    if (!name && !slug) {
        throw new Error('需要 name 或 slug')
    }

    let resolvedSlug = slug
    let resolvedName = name

    if (!resolvedSlug) {
        let topic = lookupTopic(name)
        if (!topic) {
            //不命中對照表則fail-fast
            return {
                status: 'error',
                site: 'guancha',
                mode: 'topic',
                query: name,
                fetched_at: new Date().toISOString(),
                topics_count: KNOWN_TOPICS.length,
                error: 'topic-not-in-table',
                message:
                    `主題 "${name}" 不在已知主題對照表中（共 ${KNOWN_TOPICS.length} 個）。` +
                    `觀察者網無公開主題清單頁，本函數採手工對照。建議直接傳 slug（拼音 slug）。` +
                    `本函數不自動轉向，請呼叫端決定是否重試。`,
            }
        }
        resolvedSlug = topic.slug
        resolvedName = topic.name
    }

    let url = `${cfg.baseUrl}/${resolvedSlug}`

    let listResult = null
    try {
        listResult = await fetchAllListPages(resolvedSlug, cfg)
    }
    catch (err) {
        return {
            status: 'error',
            site: 'guancha',
            mode: 'topic',
            query: resolvedName || resolvedSlug,
            resolved: { slug: resolvedSlug, url, name: resolvedName },
            fetched_at: new Date().toISOString(),
            reason: err.reason,
            error: err.message,
        }
    }

    return {
        status: 'success',
        site: 'guancha',
        mode: 'topic',
        query: resolvedName || resolvedSlug,
        resolved: { slug: resolvedSlug, url, name: resolvedName, pages_fetched: listResult.pages_fetched },
        fetched_at: new Date().toISOString(),
        count: listResult.items.length,
        items: listResult.items,
    }
}


/**
 * 抓取觀察者網單篇文章並轉為Markdown
 *
 * 由content all-txt區塊切出正文轉Markdown(保留圖片), 並產生含title、source、author、published與created之YAML frontmatter;
 * 文章已下架時站方會302跳首頁, 本函數偵測此模式並回status為'error'且error為'article-not-found'
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} opt.url 輸入文章網址字串
 * @param {String} [opt.baseUrl='https://www.guancha.cn'] 輸入網站根網址字串，供測試或改指向鏡像時覆寫
 * @param {Integer} [opt.maxRetries=5] 輸入最大重試次數整數，預設5
 * @param {Integer} [opt.pageDelayMs=1000] 輸入翻頁之頁間延遲毫秒整數，預設1000
 * @param {Integer} [opt.maxPages=50] 輸入翻頁上限正整數，上限為50，預設50
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示過程訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳結果物件{status,site,mode,url,title,author,published,chars,markdown}，url非有效字串時reject回傳錯誤物件
 * @example
 *
 * import { fetchArticle } from './src/fetchGuancha.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchArticle({ url: 'https://www.guancha.cn/internation/2026_04_29_815417.shtml' })
 *     console.log(r.status, r.title, r.chars)
 *     // => 'success' 'OPEC+宣布增產' 2345
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchArticle(opt = {}) {

    let cfg = getCfg(opt)

    //check
    let url = get(opt, 'url')
    if (!isestr(url)) {
        throw new Error('需要 url')
    }

    let html = null
    try {
        html = await fetchHtml(url, cfg)
    }
    catch (err) {
        return {
            status: 'error',
            site: 'guancha',
            mode: 'fetch',
            url,
            fetched_at: new Date().toISOString(),
            error: err.message || 'fetch failed',
        }
    }

    //偵測「文章下架被302跳首頁」, 即title為單純「观察者网」且找不到content all-txt區塊
    let titleRaw = extractHtmlTitle(html) || ''
    let contentBlock = extractDivContent(html, 'content all-txt')
    if (titleRaw === '观察者网' || titleRaw === '觀察者網' || !contentBlock) {
        return {
            status: 'error',
            site: 'guancha',
            mode: 'fetch',
            url,
            fetched_at: new Date().toISOString(),
            error: 'article-not-found',
            message: `無此文章（title="${titleRaw}"，可能已下架或 URL 不正確）。`,
        }
    }

    let title = titleRaw.replace(/[_\-\s|｜]*(?:观察者网|觀察者網)\s*$/u, '').trim()
    let author = extractAuthorFromContent(contentBlock) || ''
    let pubTime = extractPubTime(html) || ''
    let created = new Date().toISOString().slice(0, 10)
    let body = htmlToMarkdown(contentBlock, { image: true })

    //YAML frontmatter, 雙引號escape內含雙引號
    let yamlEscape = (s) => String(s).replace(/"/g, '\\"')
    let markdown =
`---
title: "${yamlEscape(title)}"
source: "${url}"
author: "${yamlEscape(author)}"
published: "${pubTime}"
created: ${created}
description:
---
${body}
`

    return {
        status: 'success',
        site: 'guancha',
        mode: 'fetch',
        url,
        title,
        author,
        published: pubTime,
        chars: body.length,
        markdown,
    }
}


/**
 * 抓取觀察者網(guancha.cn)
 *
 * @returns {Object} 回傳物件，其內可呼叫fetchAuthorsList、lookupAuthor、lookupTopic、fetchAuthorArticles、fetchKeywordArticles、fetchTitleArticles、fetchTopicArticles、fetchArticle
 * @example
 *
 * 詳見fetchAuthorArticles、fetchTopicArticles、fetchArticle範例
 *
 */
let fetchGuancha = {
    BASE_URL,
    USER_AGENT,
    MAX_PAGES,
    KNOWN_TOPICS,
    safeFilename,
    fetchAuthorsList,
    lookupAuthor,
    lookupTopic,
    fetchAuthorArticles,
    fetchKeywordArticles,
    fetchTitleArticles,
    fetchTopicArticles,
    fetchArticle,
}


export {
    BASE_URL,
    USER_AGENT,
    PAGE_DELAY_MS,
    MAX_PAGES,
    KNOWN_TOPICS,
    safeFilename,
    isHomepageHtml,
    parseAuthorIndex,
    parseListPage,
    fetchAuthorsList,
    lookupAuthor,
    lookupTopic,
    fetchAuthorArticles,
    fetchKeywordArticles,
    fetchTitleArticles,
    fetchTopicArticles,
    fetchArticle
}
export default fetchGuancha
