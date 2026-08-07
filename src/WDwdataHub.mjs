import fetchAiNewsAggregator from './fetchAiNewsAggregator.mjs'
import fetchAisixiang from './fetchAisixiang.mjs'
import fetchCnyes from './fetchCnyes.mjs'
import fetchGuancha from './fetchGuancha.mjs'
import fetchHackerNews from './fetchHackerNews.mjs'
import fetchMoneydj from './fetchMoneydj.mjs'
import fetchMops from './fetchMops.mjs'
import fetchRSS from './fetchRSS.mjs'
import fetchStatementdog from './fetchStatementdog.mjs'
import fetchTaifex from './fetchTaifex.mjs'
import fetchTpex3insti from './fetchTpex3insti.mjs'
import fetchTpexMargin from './fetchTpexMargin.mjs'
import fetchTpexStock from './fetchTpexStock.mjs'
import fetchTwDataHoliday from './fetchTwDataHoliday.mjs'
import fetchTwseMargin from './fetchTwseMargin.mjs'
import fetchTwseStock from './fetchTwseStock.mjs'
import fetchTwseT86 from './fetchTwseT86.mjs'


/**
 * 資料下載中心
 *
 * 各函數依資料來源分為三類：
 * 綜合新聞(fetchRSS、fetchHackerNews、fetchAiNewsAggregator)；
 * 台股新聞與資料(fetchCnyes、fetchMoneydj、fetchStatementdog、fetchMops、fetchTwseStock、fetchTpexStock、fetchTwseMargin、fetchTpexMargin、fetchTwseT86、fetchTpex3insti、fetchTaifex、fetchTwDataHoliday)；
 * 中文評論網站(fetchAisixiang、fetchGuancha)，此二者為物件，其內再含多個抓取函數
 *
 * @returns {Object} 回傳物件，其內可呼叫fetchRSS、fetchHackerNews、fetchAiNewsAggregator、fetchCnyes、fetchMoneydj、fetchStatementdog、fetchMops、fetchTwseStock、fetchTpexStock、fetchTwseMargin、fetchTpexMargin、fetchTwseT86、fetchTpex3insti、fetchTaifex、fetchTwDataHoliday之async函數，及fetchAisixiang、fetchGuancha之物件
 * @example
 *
 * 詳見各fetch函數範例
 *
 */
let WDwdataHub = {

    //綜合新聞
    fetchRSS,
    fetchHackerNews,
    fetchAiNewsAggregator,

    //台股新聞
    fetchCnyes,
    fetchMoneydj,
    fetchStatementdog,
    fetchMops,

    //台股資料
    fetchTwseStock,
    fetchTpexStock,
    fetchTwseMargin,
    fetchTpexMargin,
    fetchTwseT86,
    fetchTpex3insti,
    fetchTaifex,
    fetchTwDataHoliday,

    //中文評論網站
    fetchAisixiang,
    fetchGuancha,

}


export default WDwdataHub
