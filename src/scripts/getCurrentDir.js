/********************************************************************
* 現在のディレクトリを取得
**********************************************************************/
/**
 * 
 * @param {string} pathname 
 * new URL(Astro.request.url).pathname を渡してください。
 * @returns {string} 
 */
const getCurrentDir = (pathname) => {
    const urlPath = pathname.split('/');
    return urlPath[urlPath.length - 1];
}

export default getCurrentDir;
