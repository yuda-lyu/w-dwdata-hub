import assert from 'assert'
import wpw from 'w-playwright'
import fetchMops, { launchBrowser } from '../src/fetchMops.mjs'
import hasChrome from './tools/hasChrome.mjs'


//本檔以w-playwright之setBrowserTypeForTest替身取代BrowserType, 全程不啟動任何瀏覽器
//對應: 啟動一律經w-playwright且送出之選項含守門(R-PW-WIRING)、啟動重試規則、hasChrome不啟動瀏覽器


describe('fetchMops經w-playwright啟動(不啟動瀏覽器)', function() {

    let restores = []
    let envRestores = []

    //以替身取代BrowserType, 回傳呼叫紀錄
    function useFake(launch) {
        let calls = []
        let restore = wpw.setBrowserTypeForTest({
            launch: async (opt, next) => {
                calls.push(opt)
                return launch(opt, next, calls.length)
            },
        })
        restores.push(restore)
        return calls
    }

    //設定或刪除環境變數(undefined表刪除), 測後還原
    function setEnv(k, v) {
        let old = process.env[k]
        envRestores.push(() => {
            if (old === undefined) {
                delete process.env[k]
            }
            else {
                process.env[k] = old
            }
        })
        if (v === undefined) {
            delete process.env[k]
        }
        else {
            process.env[k] = v
        }
    }

    //替身browser, 其page回傳MOPS成功(code 200)之回應
    function makeFakeBrowser(state) {
        return {
            newPage: async () => {
                return {
                    goto: async () => {},
                    waitForTimeout: async () => {},
                    evaluate: async () => {
                        return { json: { code: 200, result: [{ companyId: '2330' }] }, raw: '' }
                    },
                }
            },
            close: async () => {
                state.closed++
            },
        }
    }

    //攔截console.warn
    function captureWarn() {
        let lines = []
        let old = console.warn
        console.warn = (...a) => {
            lines.push(a.join(' '))
        }
        envRestores.push(() => {
            console.warn = old
        })
        return lines
    }

    let cfg = { maxRetries: 10, baseDelayMs: 1, maxDelayMs: 1, useShowLog: false }

    afterEach(function() {
        while (restores.length > 0) {
            restores.pop()()
        }
        while (envRestores.length > 0) {
            envRestores.pop()()
        }
    })

    describe('啟動送出之選項(R-PW-WIRING)', function() {

        it('fetchMops之啟動經w-playwright: 替身被呼叫1次, 選項為原啟動選項+守門, 結束時關閉browser', async function() {
            //對應: 任務範圍1「啟動點改呼叫w-playwright之API」
            setEnv('CHROME_PATH', undefined)
            let state = { closed: 0 }
            let calls = useFake(async () => makeFakeBrowser(state))
            let t = await fetchMops({ maxRetries: 0, useShowLog: false })
            let o = calls[0]
            let ds = o.args.filter((v) => v.startsWith('--disable-features='))
            let r = [
                calls.length,
                state.closed,
                t.hasError,
                t.results.map((v) => v.marketKind),
                o.headless,
                o.channel,
                o.executablePath,
                o.timeout,
                o.args.slice(0, 2),
                ds.length,
                o.args[o.args.length - 1] === ds[0], //守門之串為args最後一個元素
                ds[0].split('=')[1].split(',').includes('AutofillAiWalletPrivatePasses'),
            ]
            let rr = [
                1,
                1,
                false,
                ['sii', 'otc', 'rotc', 'pub'],
                true,
                'chrome',
                undefined,
                360000,
                ['--no-sandbox', '--disable-setuid-sandbox'],
                1,
                true,
                true,
            ]
            assert.strict.deepEqual(r, rr)
        })

        it('Playwright預設之--disable-features串由ignoreDefaultArgs去掉, 使命令列只剩守門之一串', async function() {
            //對應: w-playwright守門機制(恰一個--disable-features), 使用端不得自行改寫ignoreDefaultArgs
            setEnv('CHROME_PATH', undefined)
            let calls = useFake(async () => makeFakeBrowser({ closed: 0 }))
            await fetchMops({ maxRetries: 0, useShowLog: false })
            let o = calls[0]
            let ig = o.ignoreDefaultArgs
            let r = [
                Array.isArray(ig),
                ig.length,
                ig[0].startsWith('--disable-features='),
                ig[0] !== o.args[o.args.length - 1],
                ig[0].includes('AutofillAiWalletPrivatePasses'),
            ]
            let rr = [true, 1, true, true, false]
            assert.strict.deepEqual(r, rr)
        })

        it('環境變數CHROME_PATH傳為executablePath', async function() {
            //對應: 原行為「設定環境變數CHROME_PATH則用該路徑啟動瀏覽器」不變
            setEnv('CHROME_PATH', 'X:\\not-exist\\chrome.exe')
            let calls = useFake(async () => makeFakeBrowser({ closed: 0 }))
            await fetchMops({ maxRetries: 0, useShowLog: false })
            let r = [calls.length, calls[0].executablePath, calls[0].channel]
            let rr = [1, 'X:\\not-exist\\chrome.exe', 'chrome']
            assert.strict.deepEqual(r, rr)
        })

        it('launchBrowser直接呼叫亦經w-playwright, 回傳替身之browser', async function() {
            let state = { closed: 0 }
            let calls = useFake(async () => makeFakeBrowser(state))
            let b = await launchBrowser(cfg)
            await b.close()
            let r = [calls.length, state.closed]
            let rr = [1, 1]
            assert.strict.deepEqual(r, rr)
        })

    })

    describe('啟動重試', function() {

        it('Playwright啟動失敗(E_LAUNCH)時重試至多2次共啟動3次(maxRetries=10), 錯誤帶code且訊息載明已重試次數', async function() {
            //對應: 任務範圍「建議檢討啟動重試11次」, 啟動次數須遠低於10次門檻
            let calls = useFake(async () => {
                throw new Error('boom')
            })
            let err = null
            await launchBrowser(cfg).catch((e) => {
                err = e
            })
            let r = [calls.length, err.code, err.message]
            let rr = [3, 'E_LAUNCH', '瀏覽器啟動失敗（已重試 2 次）: browser launch failed']
            assert.strict.deepEqual(r, rr)
        })

        it('maxRetries小於上限時以maxRetries為準: 0則啟動1次, 1則啟動2次', async function() {
            let calls = useFake(async () => {
                throw new Error('boom')
            })
            let n = []
            for (let maxRetries of [0, 1]) {
                calls.length = 0
                await launchBrowser({ ...cfg, maxRetries }).catch(() => {})
                n.push(calls.length)
            }
            assert.strict.deepEqual(n, [1, 2])
        })

        it('Playwright啟動逾時(E_LAUNCH_TIMEOUT)亦重試, 錯誤帶code', async function() {
            let calls = useFake(async () => {
                let e = new Error('timeout')
                e.name = 'TimeoutError'
                throw e
            })
            let err = null
            await launchBrowser(cfg).catch((e) => {
                err = e
            })
            let r = [calls.length, err.code, err.message]
            let rr = [3, 'E_LAUNCH_TIMEOUT', '瀏覽器啟動失敗（已重試 2 次）: browser launch timed out']
            assert.strict.deepEqual(r, rr)
        })

        it('第2次啟動成功即回傳browser, 共啟動2次且不再重試', async function() {
            let state = { closed: 0 }
            let calls = useFake(async (opt, next, n) => {
                if (n === 1) {
                    throw new Error('boom')
                }
                return makeFakeBrowser(state)
            })
            let b = await launchBrowser(cfg)
            let r = [calls.length, typeof b.newPage]
            let rr = [2, 'function']
            assert.strict.deepEqual(r, rr)
        })

        it('w-playwright拒絕類錯誤(此處為E_ENV)不重試: 替身0次呼叫、無重試訊息、錯誤帶code', async function() {
            //對應: 拒絕類(E_ENV、E_PW_VERSION、E_LOGON_GUARD等)重試不會成功, 立即失敗
            setEnv('SELENIUM_REMOTE_URL', 'http://127.0.0.1:1/wd/hub')
            let calls = useFake(async () => makeFakeBrowser({ closed: 0 }))
            let lines = captureWarn()
            let err = null
            await launchBrowser({ ...cfg, useShowLog: true }).catch((e) => {
                err = e
            })
            let r = [
                calls.length,
                lines.filter((v) => v.includes('[Retry')).length,
                err.code,
                err.message,
            ]
            let rr = [
                0,
                0,
                'E_ENV',
                '瀏覽器啟動失敗（已重試 0 次）: unsupported environment: SELENIUM_REMOTE_URL',
            ]
            assert.strict.deepEqual(r, rr)
        })

        it('顯示過程訊息時印出重試訊息與Playwright之原錯誤(w-playwright只經funLog交出原錯誤)', async function() {
            useFake(async () => {
                throw new Error('boom-original')
            })
            let lines = captureWarn()
            await launchBrowser({ ...cfg, maxRetries: 1, useShowLog: true }).catch(() => {})
            let r = [
                lines.filter((v) => v.includes('[browser.launch] E_LAUNCH: boom-original')).length,
                lines.filter((v) => v.includes('[browser.launch][Retry 1/1]')).length,
            ]
            let rr = [2, 1]
            assert.strict.deepEqual(r, rr)
        })

        it('不顯示過程訊息時不印出任何訊息', async function() {
            useFake(async () => {
                throw new Error('boom-original')
            })
            let lines = captureWarn()
            await launchBrowser({ ...cfg, maxRetries: 1, useShowLog: false }).catch(() => {})
            assert.strict.deepEqual(lines, [])
        })

        it('fetchMops啟動失敗時reject, 錯誤帶code, 且不開頁面', async function() {
            setEnv('CHROME_PATH', undefined)
            let calls = useFake(async () => {
                throw new Error('boom')
            })
            let err = null
            await fetchMops({ maxRetries: 0, useShowLog: false }).catch((e) => {
                err = e
            })
            let r = [calls.length, err.code, err.message]
            let rr = [1, 'E_LAUNCH', '瀏覽器啟動失敗（已重試 0 次）: browser launch failed']
            assert.strict.deepEqual(r, rr)
        })

    })

    describe('hasChrome(測試輔助)', function() {

        it('指定之CHROME_PATH不存在則為false, 存在則為true, 且不啟動瀏覽器', async function() {
            let calls = useFake(async () => makeFakeBrowser({ closed: 0 }))
            setEnv('CHROME_PATH', 'X:\\not-exist\\chrome.exe')
            let r1 = await hasChrome()
            setEnv('CHROME_PATH', process.execPath)
            let r2 = await hasChrome()
            let r = [r1, r2, calls.length]
            let rr = [false, true, 0]
            assert.strict.deepEqual(r, rr)
        })

        it('未設定CHROME_PATH時依系統Chrome之存在與否', async function() {
            let calls = useFake(async () => makeFakeBrowser({ closed: 0 }))
            setEnv('CHROME_PATH', undefined)
            let r = [await hasChrome(), calls.length]
            let rr = [wpw.findSystemChrome() !== '', 0]
            assert.strict.deepEqual(r, rr)
        })

    })

})
