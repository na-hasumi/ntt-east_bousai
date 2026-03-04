import getDevice from './getDevice';
import AOS from 'aos';
import 'aos/dist/aos.css';

// wow.js初期化
const initAOS = () => {
    const device = getDevice();
    if (!device) return;

    const offset = device === 'sp' ? 100 : 300; //SP : PC

    AOS.init({
        offset: offset,
        once: true,
        delay: 0,
        duration: 1000,
    });

    // デバイス別のアニメーション設定
    if (device === 'sp') {
        // スマホ用：fade-rightアニメーションを適用
        const elements = document.querySelectorAll('[data-aos-mobile="fade-right"]');
        elements.forEach(element => {
            element.setAttribute('data-aos', 'fade-right');
        });
    }
}

export default initAOS