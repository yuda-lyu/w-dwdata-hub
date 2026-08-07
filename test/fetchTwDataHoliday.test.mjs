import assert from 'assert'
import fetchTwDataHoliday from '../src/fetchTwDataHoliday.mjs'
import serverForTest from './tools/serverForTest.mjs'


describe('fetchTwDataHoliday', function() {

    let svr = null
    let optFast = null

    before(async function() {
        svr = await serverForTest()
        optFast = { url: svr.url('/v1/holidaySchedule/holidaySchedule'), baseDelayMs: 10, maxDelayMs: 10, showLog: false }
    })

    after(async function() {
        if (svr) {
            await svr.close()
        }
    })

    it('民國日期轉西元並依日期排序, 交易日標記與結算作業日被排除且同日去重', async function() {
        let t = await fetchTwDataHoliday(undefined, optFast)
        let rr = {
            dataYear: '2026',
            totalHolidays: 2,
            holidays: [
                {
                    date: '20260101',
                    rocDate: '1150101',
                    name: '中華民國開國紀念日',
                    weekday: '四',
                    description: '1月1日(星期四)為假日。',
                },
                {
                    date: '20260216',
                    rocDate: '1150216',
                    name: '農曆春節',
                    weekday: '一',
                    description: '2月16日放假',
                },
            ],
        }
        assert.strict.deepEqual(t, rr)
    })

    it('checkDate為休市日時回傳isHoliday為true與假日名稱', async function() {
        let t = await fetchTwDataHoliday('20260101', optFast)
        let r = [t.checkDate, t.isHoliday, t.holidayName]
        let rr = ['20260101', true, '中華民國開國紀念日']
        assert.strict.deepEqual(r, rr)
    })

    it('checkDate非休市日時回傳isHoliday為false與null', async function() {
        let t = await fetchTwDataHoliday('20260102', optFast)
        let r = [t.checkDate, t.isHoliday, t.holidayName]
        let rr = ['20260102', false, null]
        assert.strict.deepEqual(r, rr)
    })

    it('checkDate非合法YYYYMMDD時略過單日比對, 不誤標isHoliday', async function() {
        let r = []
        for (let checkDate of ['', null, undefined, '2026-01-01', 20260101]) {
            let t = await fetchTwDataHoliday(checkDate, optFast)
            r.push([t.checkDate, t.isHoliday, t.holidayName])
        }
        let rr = [
            [undefined, undefined, undefined],
            [undefined, undefined, undefined],
            [undefined, undefined, undefined],
            [undefined, undefined, undefined],
            [undefined, undefined, undefined],
        ]
        assert.strict.deepEqual(r, rr)
    })

    it('API回傳非JSON時給出友善訊息而非裸SyntaxError', async function() {
        let r = null
        await fetchTwDataHoliday(undefined, { ...optFast, url: svr.url('/json/bad') })
            .then(() => {
                r = 'resolved'
            })
            .catch((err) => {
                r = [err.message, err instanceof SyntaxError]
            })
        let rr = ['API 回傳非 JSON 格式（可能為維護頁面或網路中介），請稍後再試', false]
        assert.strict.deepEqual(r, rr)
    })

    it('API回傳非陣列時reject', async function() {
        let r = null
        await fetchTwDataHoliday(undefined, { ...optFast, url: svr.url('/json/ok') })
            .catch((err) => {
                r = err.message
            })
        let rr = 'API 回傳空陣列或格式異常'
        assert.strict.deepEqual(r, rr)
    })

})
