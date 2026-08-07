import assert from 'assert'
import WDwdataHub from '../src/WDwdataHub.mjs'


describe('WDwdataHub', function() {

    it('匯出全部抓取函數', function() {
        let r = Object.keys(WDwdataHub).sort()
        let rr = [
            'fetchAiNewsAggregator',
            'fetchAisixiang',
            'fetchCnyes',
            'fetchGuancha',
            'fetchHackerNews',
            'fetchMoneydj',
            'fetchMops',
            'fetchRSS',
            'fetchStatementdog',
            'fetchTaifex',
            'fetchTpex3insti',
            'fetchTpexMargin',
            'fetchTpexStock',
            'fetchTwDataHoliday',
            'fetchTwseMargin',
            'fetchTwseStock',
            'fetchTwseT86',
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('單一來源者為函數', function() {
        let ks = [
            'fetchAiNewsAggregator', 'fetchCnyes', 'fetchHackerNews', 'fetchMoneydj', 'fetchMops',
            'fetchRSS', 'fetchStatementdog', 'fetchTaifex', 'fetchTpex3insti', 'fetchTpexMargin',
            'fetchTpexStock', 'fetchTwDataHoliday', 'fetchTwseMargin', 'fetchTwseStock', 'fetchTwseT86',
        ]
        let r = ks.map((k) => typeof WDwdataHub[k])
        let rr = ks.map(() => 'function')
        assert.strict.deepEqual(r, rr)
    })

    it('多函數來源者為物件, 其內各項為函數或常數', function() {
        let r = [
            typeof WDwdataHub.fetchAisixiang,
            typeof WDwdataHub.fetchAisixiang.fetchAuthorArticles,
            typeof WDwdataHub.fetchAisixiang.fetchArticle,
            typeof WDwdataHub.fetchGuancha,
            typeof WDwdataHub.fetchGuancha.fetchAuthorArticles,
            typeof WDwdataHub.fetchGuancha.fetchArticle,
            Array.isArray(WDwdataHub.fetchGuancha.KNOWN_TOPICS),
        ]
        let rr = ['object', 'function', 'function', 'object', 'function', 'function', true]
        assert.strict.deepEqual(r, rr)
    })

    it('不匯出內部共用函數', function() {
        let ks = ['fetchWithRetry', 'getOptFetch', 'isYmd', 'toRocDate', 'toDatetimeUTC8', 'decodeEntities', 'htmlToMarkdown', 'extractDivContent', 'parseIntComma']
        let r = ks.map((k) => Object.prototype.hasOwnProperty.call(WDwdataHub, k))
        let rr = ks.map(() => false)
        assert.strict.deepEqual(r, rr)
    })

})
