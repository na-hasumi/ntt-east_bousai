// スクロールイベントやリサイズイベントで実行回数を間引き
function debounce(func, timeout) {
    let timer;
    timeout = timeout !== undefined ? timeout : 300; // funcが呼び出されるまでの遅延時間
    return () => {
        const context = this;
        const args = arguments;
        clearTimeout(timer);
        timer = setTimeout(() => {
        func.apply(context, args);
        }, timeout);
    };
}

export default debounce;