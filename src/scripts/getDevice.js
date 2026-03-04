import getMq from './getMq';

/**
 * デバイス判定
 * @param {boolean} includeTab タブレットサイズも判定するか
 * @returns {string}
 */
const getDevice = (includeTab = false) => {
    const mq = getMq();
    if (mq === 'xl' || mq === 'lg' || (!includeTab && mq === 'md')) {
        return 'pc';
    } else if (includeTab && mq === 'md') {
        return 'tab';
    } else {
        return 'sp';
    }
}

export default getDevice