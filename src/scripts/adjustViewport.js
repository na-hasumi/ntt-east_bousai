import debounce from './debounce';

// 画面幅375以下は拡縮
const adjustViewport = () => {
    const func = () => {
        const triggerWidth = 375;
        const viewport = document.querySelector('meta[name="viewport"]');
        const value = window.outerWidth < triggerWidth
            ? `width=${triggerWidth}, target-densitydpi=device-dpi`
            : 'width=device-width, initial-scale=1';
        viewport.setAttribute('content', value);
    }

    const debouncedFunction = debounce(func);
    func(); //初期実行
    window.addEventListener('resize', debouncedFunction, false);
}

export default adjustViewport