import get from 'lodash-es/get.js'
import isbol from 'wsemi/src/isbol.mjs'
import isobj from 'wsemi/src/isobj.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import cint from 'wsemi/src/cint.mjs'


//各抓取函數共用之預設值
let DEFAULT_TIMEOUT_MS = 30000
let DEFAULT_MAX_RETRIES = 10
let DEFAULT_BASE_DELAY_MS = 5000
let DEFAULT_MAX_DELAY_MS = 30000


/**
 * 取得正整數設定值
 *
 * @param {Object} opt 輸入呼叫端設定物件
 * @param {Object} dflt 輸入各抓取函數之預設值物件
 * @param {String} key 輸入設定鍵名字串
 * @param {Integer} fallback 輸入無設定時之預設整數
 * @returns {Integer} 回傳正整數
 */
function pickPint(opt, dflt, key, fallback) {

    let v = get(opt, key)
    if (ispint(v)) {
        return cint(v)
    }

    v = get(dflt, key)
    if (ispint(v)) {
        return cint(v)
    }

    return fallback
}


/**
 * 正規化抓取設定
 *
 * 各抓取函數之timeout、maxRetries、baseDelayMs、maxDelayMs與showLog皆可由呼叫端覆寫,
 * 未給者取該函數之預設值, 再未給者取全域預設值;
 * responseType、encoding、headers、retryStatus與label屬各函數固有特性, 僅由dflt指定不開放覆寫
 *
 * @param {Object} [opt={}] 輸入呼叫端設定物件，預設{}
 * @param {Object} [dflt={}] 輸入各抓取函數之預設值物件，預設{}
 * @returns {Object} 回傳可直接傳入fetchWithRetry之設定物件，另含showLog供呼叫端判斷是否輸出過程訊息
 * @example
 *
 * import getOptFetch from './src/getOptFetch.mjs'
 *
 * console.log(getOptFetch({ maxRetries: 2 }, { timeout: 15000, label: 'abc' }))
 * // => { timeout: 15000, maxRetries: 2, baseDelayMs: 5000, maxDelayMs: 30000, showLog: true, label: 'abc' }
 *
 */
function getOptFetch(opt = {}, dflt = {}) {

    //maxRetries, 可為0故另行處理
    let maxRetries = get(opt, 'maxRetries')
    if (!isp0int(maxRetries)) {
        maxRetries = get(dflt, 'maxRetries')
    }
    if (!isp0int(maxRetries)) {
        maxRetries = DEFAULT_MAX_RETRIES
    }
    else {
        maxRetries = cint(maxRetries)
    }

    //showLog
    let showLog = get(opt, 'showLog')
    if (!isbol(showLog)) {
        showLog = get(dflt, 'showLog')
    }
    if (!isbol(showLog)) {
        showLog = true
    }

    let r = {
        timeout: pickPint(opt, dflt, 'timeout', DEFAULT_TIMEOUT_MS),
        maxRetries,
        baseDelayMs: pickPint(opt, dflt, 'baseDelayMs', DEFAULT_BASE_DELAY_MS),
        maxDelayMs: pickPint(opt, dflt, 'maxDelayMs', DEFAULT_MAX_DELAY_MS),
        showLog,
    }

    //各函數固有特性, 不開放呼叫端覆寫
    if (isestr(get(dflt, 'responseType'))) {
        r.responseType = dflt.responseType
    }
    if (isestr(get(dflt, 'encoding'))) {
        r.encoding = dflt.encoding
    }
    if (isobj(get(dflt, 'headers'))) {
        r.headers = dflt.headers
    }
    if (isearr(get(dflt, 'retryStatus'))) {
        r.retryStatus = dflt.retryStatus
    }
    if (isestr(get(dflt, 'label'))) {
        r.label = dflt.label
    }

    return r
}


export default getOptFetch
