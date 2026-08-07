import get from 'lodash-es/get.js'
import isbol from 'wsemi/src/isbol.mjs'
import isestr from 'wsemi/src/isestr.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import isobj from 'wsemi/src/isobj.mjs'
import ispint from 'wsemi/src/ispint.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import cint from 'wsemi/src/cint.mjs'
import delay from 'wsemi/src/delay.mjs'


//預設User-Agent, 各資料來源網站多會擋無User-Agent之請求
let DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'


//預設值
let DEFAULT_TIMEOUT_MS = 30000
let DEFAULT_MAX_RETRIES = 10
let DEFAULT_BASE_DELAY_MS = 5000
let DEFAULT_MAX_DELAY_MS = 30000


//視為暫時性故障之網路層錯誤碼, node內建fetch(undici)會把底層錯誤掛於err.cause
let NETWORK_ERROR_CODES = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNABORTED', 'EAI_AGAIN', 'EPIPE']


/**
 * 判斷錯誤是否值得重試
 *
 * 有statusCode(即HTTP層錯誤)時, 5xx與429視為暫時性, 其餘由retryStatus指定;
 * 無statusCode(即網路層錯誤)時, 由錯誤碼、AbortError與undici暫時性錯誤判斷
 *
 * @param {Error} err 輸入錯誤物件
 * @param {Array} retryStatus 輸入額外視為可重試之HTTP狀態碼陣列
 * @returns {Boolean} 回傳是否可重試布林值
 */
function isRetryableError(err, retryStatus) {

    //statusCode, 由fetchOnce於HTTP非2xx時掛入
    let statusCode = get(err, 'statusCode', null)
    if (ispint(statusCode)) {
        return statusCode >= 500 || statusCode === 429 || retryStatus.includes(statusCode)
    }

    //code, undici把底層錯誤掛在err.cause
    let code = get(err, 'cause.code', null) || get(err, 'code', null)
    if (isestr(code) && NETWORK_ERROR_CODES.includes(code)) {
        return true
    }

    //AbortController觸發之逾時
    let name = get(err, 'name', '')
    if (name === 'AbortError' || name === 'TimeoutError') {
        return true
    }

    //undici之socket與逾時類暫時性錯誤
    let ms = String(get(err, 'cause.code', '') || get(err, 'message', ''))
    if (/UND_ERR_(SOCKET|HEADERS_TIMEOUT|BODY_TIMEOUT|CONNECT_TIMEOUT)/.test(ms)) {
        return true
    }

    return false
}


/**
 * 單次抓取, HTTP非2xx時拋出帶statusCode之錯誤
 *
 * @param {String} url 輸入待抓取網址字串
 * @param {Object} cfg 輸入已正規化之設定物件
 * @returns {Promise} 回傳Promise，resolve回傳解析後資料
 */
async function fetchOnce(url, cfg) {

    //ac, 以AbortController實作逾時, 避免socket卡住永不回應
    let ac = new AbortController()
    let idTimer = setTimeout(() => {
        ac.abort()
    }, cfg.timeout)

    try {

        //opt
        let opt = {
            method: cfg.method,
            headers: cfg.headers,
            signal: ac.signal,
        }
        if (cfg.body !== null) {
            opt.body = cfg.body
        }

        //fetch
        let res = await fetch(url, opt)

        //check, node內建fetch不會因HTTP非2xx而拋錯, 需自行檢核
        if (!res.ok) {
            let err = new Error(`HTTP ${res.status} ${res.statusText}`.trim())
            err.statusCode = res.status
            err.url = url
            throw err
        }

        //arrayBuffer
        if (cfg.responseType === 'arrayBuffer') {
            return await res.arrayBuffer()
        }

        //text
        if (cfg.responseType === 'text') {
            if (cfg.encoding !== '') {
                //指定編碼(如big5)時需自行解碼, res.text()一律以utf-8解碼
                let ab = await res.arrayBuffer()
                return new TextDecoder(cfg.encoding).decode(ab)
            }
            return await res.text()
        }

        //json, 先取text再自行parse, 令維護頁面(HTTP 200+HTML)能產生可讀訊息而非裸SyntaxError
        let text = await res.text()
        try {
            return JSON.parse(text)
        }
        catch (err) {
            throw new Error(`回傳非JSON格式(可能為維護頁面或網路中介): ${text.slice(0, 100)}`)
        }

    }
    finally {
        clearTimeout(idTimer)
    }
}


/**
 * 以node內建fetch抓取資料並自動重試
 *
 * 特點：
 * HTTP 5xx與429及網路層錯誤(含逾時)會自動重試，採線性退避baseDelayMs*attempt並以maxDelayMs為上限；
 * HTTP 4xx(429除外)預設不重試，可由opt.retryStatus指定額外可重試狀態碼(如403、404)；
 * responseType為'json'時先取原始文字再自行JSON.parse，令維護頁面能產生可讀錯誤訊息
 *
 * @param {String} url 輸入待抓取網址字串
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.method='GET'] 輸入HTTP方法字串，預設'GET'
 * @param {Object} [opt.headers={}] 輸入額外HTTP標頭物件，未指定User-Agent時自動補預設值，預設{}
 * @param {String} [opt.body=null] 輸入請求主體字串，預設null代表無主體
 * @param {String} [opt.responseType='json'] 輸入回應解析方式字串，可為'json'、'text'、'arrayBuffer'，預設'json'
 * @param {String} [opt.encoding=''] 輸入responseType為'text'時之解碼字串，例如'big5'，預設''代表utf-8
 * @param {Integer} [opt.timeout=30000] 輸入單次請求逾時毫秒整數，預設30000
 * @param {Integer} [opt.maxRetries=10] 輸入最大重試次數整數，含初始共執行maxRetries+1次，預設10
 * @param {Integer} [opt.baseDelayMs=5000] 輸入線性退避之基礎毫秒整數，預設5000
 * @param {Integer} [opt.maxDelayMs=30000] 輸入線性退避之上限毫秒整數，預設30000
 * @param {Array} [opt.retryStatus=[]] 輸入額外視為可重試之HTTP狀態碼陣列，例如[403]，預設[]
 * @param {String} [opt.label=''] 輸入重試訊息前綴字串，預設''
 * @param {Boolean} [opt.showLog=true] 輸入是否顯示重試訊息布林值，預設true
 * @returns {Promise} 回傳Promise，resolve回傳解析後資料，responseType為'json'時回物件、'text'時回字串、'arrayBuffer'時回ArrayBuffer，重試耗盡或遇不可重試錯誤時reject回傳錯誤物件
 * @example
 *
 * import fetchWithRetry from './src/fetchWithRetry.mjs'
 *
 * let test = async () => {
 *
 *     let r = await fetchWithRetry('https://hacker-news.firebaseio.com/v0/item/1.json')
 *     console.log(r.type, r.by)
 *     // => 'story' 'pg'
 *
 * }
 * await test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function fetchWithRetry(url, opt = {}) {

    //check
    if (!isestr(url)) {
        throw new Error(`url須為有效字串, 得到: ${url}`)
    }

    //method
    let method = get(opt, 'method')
    if (!isestr(method)) {
        method = 'GET'
    }

    //headers
    let headers = get(opt, 'headers')
    if (!isobj(headers)) {
        headers = {}
    }
    if (!isestr(get(headers, 'User-Agent'))) {
        headers = { 'User-Agent': DEFAULT_UA, ...headers }
    }

    //body
    let body = get(opt, 'body', null)
    if (!isestr(body)) {
        body = null
    }

    //responseType
    let responseType = get(opt, 'responseType')
    if (responseType !== 'text' && responseType !== 'arrayBuffer') {
        responseType = 'json'
    }

    //encoding
    let encoding = get(opt, 'encoding')
    if (!isestr(encoding)) {
        encoding = ''
    }

    //timeout
    let timeout = get(opt, 'timeout')
    if (!ispint(timeout)) {
        timeout = DEFAULT_TIMEOUT_MS
    }
    else {
        timeout = cint(timeout)
    }

    //maxRetries
    let maxRetries = get(opt, 'maxRetries')
    if (!isp0int(maxRetries)) {
        maxRetries = DEFAULT_MAX_RETRIES
    }
    else {
        maxRetries = cint(maxRetries)
    }

    //baseDelayMs
    let baseDelayMs = get(opt, 'baseDelayMs')
    if (!ispint(baseDelayMs)) {
        baseDelayMs = DEFAULT_BASE_DELAY_MS
    }
    else {
        baseDelayMs = cint(baseDelayMs)
    }

    //maxDelayMs
    let maxDelayMs = get(opt, 'maxDelayMs')
    if (!ispint(maxDelayMs)) {
        maxDelayMs = DEFAULT_MAX_DELAY_MS
    }
    else {
        maxDelayMs = cint(maxDelayMs)
    }

    //retryStatus
    let retryStatus = get(opt, 'retryStatus')
    if (!isearr(retryStatus)) {
        retryStatus = []
    }

    //label
    let label = get(opt, 'label')
    if (!isestr(label)) {
        label = 'fetchWithRetry'
    }

    //showLog
    let showLog = get(opt, 'showLog')
    if (!isbol(showLog)) {
        showLog = true
    }

    //cfg
    let cfg = { method, headers, body, responseType, encoding, timeout }

    let lastError = null
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {

        try {
            return await fetchOnce(url, cfg)
        }
        catch (err) {
            lastError = err

            //check, 不可重試或已用盡次數則直接拋出
            let attemptsLeft = maxRetries + 1 - attempt
            if (!isRetryableError(err, retryStatus) || attemptsLeft <= 0) {
                throw err
            }

            //線性退避
            let ms = Math.min(baseDelayMs * attempt, maxDelayMs)
            if (showLog) {
                console.warn(`[${label}][Retry ${attempt}/${maxRetries}] ${err.message} — 等待 ${ms / 1000}s 後重試...`)
            }
            await delay(ms)

        }

    }

    throw lastError
}


export { DEFAULT_UA, isRetryableError }
export default fetchWithRetry
