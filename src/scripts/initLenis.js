import Lenis from '@studio-freight/lenis'

// 慣性スクロール
const initLenis = () => {
    const lenis = new Lenis();
    window.lenis = lenis;

    function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
}

export default initLenis