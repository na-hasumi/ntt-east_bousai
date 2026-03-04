import createScrollHandler from './scrollHandler.js';

const followBtn = (options = {}) => {
    const target = document.querySelector('.js_follow');
    if (!target) return;
    
    // 共通のスクロールハンドラーを使用
    return createScrollHandler(target, options);
}

export default followBtn;

