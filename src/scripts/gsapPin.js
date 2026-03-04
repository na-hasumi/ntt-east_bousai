import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// 連続シーン: `.js-pin-scene` を順に重ね、各シーンは下端到達で固定→次シーンが来たら解除
function createStackedScenes(options) {
  const {
    selectorScenes = ".js-pin-scene",
    start = "bottom bottom",
    endFallback = "+=600%",
    pinSpacing = false,
    baseZIndex = 1,
    // blur = 5
  } = options;

  const scenes = Array.from(document.querySelectorAll(selectorScenes));
  if (!scenes.length) return;

  // レイヤー順: 先頭ほど低く、後続ほど高く
  scenes.forEach((el, idx) => {
    if (!el.style.position) el.style.position = "relative";
    el.style.zIndex = String(baseZIndex + idx);
  });

  scenes.forEach((el, idx) => {
    if (!el.style.willChange) el.style.willChange = "filter";
    gsap.set(el, { filter: "blur(0px)" });
    ScrollTrigger.create({
      trigger: el,
      start,
      end: endFallback,
      pin: true,
      pinSpacing,
      anticipatePin: 1
    });

    // ブラーアニメーション（各シーンの寿命に同期）
    gsap.to(el, {
      filter: `blur(${blur}px)`,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start,
        end: "+=100%",
        scrub: true
      }
    });
  });
}

// API: 連続シーンのみ
const initGsapPin = (options = {}) => {
  createStackedScenes(options);
};

export default initGsapPin