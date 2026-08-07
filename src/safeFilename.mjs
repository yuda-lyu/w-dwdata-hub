import isstr from 'wsemi/src/isstr.mjs'


/**
 * 字串轉安全檔名
 *
 * 將Windows與POSIX皆不允許之字元(\/:*?"<>|)替換為底線, 並截斷至200字元以避開檔名長度上限
 *
 * @param {String} name 輸入檔名字串
 * @returns {String} 回傳安全檔名字串
 * @example
 *
 * import safeFilename from './src/safeFilename.mjs'
 *
 * console.log(safeFilename('a/b:c*d?e'))
 * // => 'a_b_c_d_e'
 *
 */
function safeFilename(name) {

    //check
    if (!isstr(name)) {
        name = String(name === null || name === undefined ? '' : name)
    }

    return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 200)
}


export default safeFilename
