/**
 * Google CSE(Programmable Search Engine) のオーバーレイ検索を
 * ヘッダーのフォーム入力と連動させる初期化。
 *
 * - submitでページ遷移せず検索実行
 * - オーバーレイ表示中は背面スクロールをロック（html.is_cse_overlay_open）
 * - Lenisがあればstop/start
 * - scrollbar-gutter 非対応ブラウザのみ横ズレ補正をフォールバック適用
 *
 * NOTE: Astroの各ページで複数回実行されても安全なようにガードあり。
 */
export default function initCseOverlaySearch(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 二重初期化防止
  if (window.__cseOverlaySearchInitialized) return;
  window.__cseOverlaySearchInitialized = true;

  const {
    cx = 'e1fc9599811f94b35',
    formSelector = '[data-site-search-form]',
    inputSelector = '.el_search_input',
    overlaySelector = '.gsc-results-wrapper-overlay',
    cseElementName = 'siteSearchResults',
  } = options;

  const form = document.querySelector(formSelector);
  if (!(form instanceof HTMLFormElement)) return;

  const input = form.querySelector(inputSelector);
  if (!(input instanceof HTMLInputElement)) return;

  let cseReady = false;
  let scriptLoading = false;
  let lastQuery = '';
  let overlayOpen = false;
  let overlayWatchdogId = null;

  // scrollbar-gutter対応判定（非対応環境向けにだけ補正）
  const supportsScrollbarGutter =
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
      ? CSS.supports('scrollbar-gutter: stable')
      : false;

  let prevBodyPaddingRight = '';
  let prevHeaderPaddingRight = '';
  let prevGnavTransform = '';
  let prevGotopTransform = '';

  const getOverlayEl = () => document.querySelector(overlaySelector);
  const isOverlayVisible = () => {
    const el = getOverlayEl();
    if (!(el instanceof HTMLElement)) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  };

  const stopWatchdog = () => {
    if (overlayWatchdogId == null) return;
    window.clearInterval(overlayWatchdogId);
    overlayWatchdogId = null;
  };

  const startWatchdog = () => {
    if (overlayWatchdogId != null) return;
    overlayWatchdogId = window.setInterval(() => {
      // 閉じたのにロックが残る事故を防ぐ
      if (overlayOpen && !isOverlayVisible()) setOverlayLock(false);
      if (!overlayOpen) stopWatchdog();
    }, 200);
  };

  const setOverlayLock = (open) => {
    if (open === overlayOpen) return;
    overlayOpen = open;

    const html = document.documentElement;
    const body = document.body;

    if (open) {
      if (!supportsScrollbarGutter) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        prevBodyPaddingRight = body.style.paddingRight;
        const header = document.querySelector('.ly_header');
        prevHeaderPaddingRight = header instanceof HTMLElement ? header.style.paddingRight : '';
        const gnav = document.querySelector('.bl_gnav');
        prevGnavTransform = gnav instanceof HTMLElement ? gnav.style.transform : '';
        const gotop = document.querySelector('.gotop.is_fixed');
        prevGotopTransform = gotop instanceof HTMLElement ? gotop.style.transform : '';

        if (scrollbarWidth > 0) {
          body.style.paddingRight = `${scrollbarWidth}px`;
          if (header instanceof HTMLElement) header.style.paddingRight = `${scrollbarWidth}px`;
          if (gnav instanceof HTMLElement) gnav.style.transform = `translateX(-${scrollbarWidth}px)`;
          if (gotop instanceof HTMLElement) gotop.style.transform = `translateX(-${scrollbarWidth}px)`;
        }
      }

      html.classList.add('is_cse_overlay_open');
      window.lenis?.stop?.();
      startWatchdog();
      return;
    }

    html.classList.remove('is_cse_overlay_open');

    if (!supportsScrollbarGutter) {
      body.style.paddingRight = prevBodyPaddingRight;
      const header = document.querySelector('.ly_header');
      if (header instanceof HTMLElement) header.style.paddingRight = prevHeaderPaddingRight;
      const gnav = document.querySelector('.bl_gnav');
      if (gnav instanceof HTMLElement) gnav.style.transform = prevGnavTransform;
      const gotop = document.querySelector('.gotop.is_fixed');
      if (gotop instanceof HTMLElement) gotop.style.transform = prevGotopTransform;
    }

    window.lenis?.start?.();
    stopWatchdog();
  };

  // オーバーレイの出現/消失を監視してロックを切り替える
  const observer = new MutationObserver(() => setOverlayLock(isOverlayVisible()));
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  });

  // 取りこぼし対策：閉じる操作を拾ったら数回だけ状態同期
  const syncOverlaySoon = () => {
    let i = 0;
    const tick = () => {
      setOverlayLock(isOverlayVisible());
      if (++i < 12) window.setTimeout(tick, 50);
    };
    tick();
  };

  document.addEventListener(
    'click',
    (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('.gsc-results-close-btn, .gsc-results-close, .gsc-results-wrapper-overlay')) {
        syncOverlaySoon();
      }
    },
    true
  );
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    syncOverlaySoon();
  });

  // ホイール/タッチのスクロール連鎖を止める（Lenis等の干渉も抑止）
  const isInOverlay = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(overlaySelector));
  };

  document.addEventListener(
    'wheel',
    (e) => {
      if (!overlayOpen) return;
      if (isInOverlay(e.target)) {
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true, passive: false }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!overlayOpen) return;
      if (isInOverlay(e.target)) {
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    },
    { capture: true, passive: false }
  );

  const ensureCse = () => {
    if (cseReady || scriptLoading) return;
    scriptLoading = true;

    // 読み込み後に検索できるようにcallbackを定義
    window.__gcse = {
      callback: () => {
        cseReady = true;
        scriptLoading = false;
        if (lastQuery) {
          const el = window.google?.search?.cse?.element?.getElement?.(cseElementName);
          if (el && typeof el.execute === 'function') el.execute(lastQuery);
        }
      },
    };

    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = 'https://cse.google.com/cse.js?cx=' + encodeURIComponent(cx);
    document.head.appendChild(s);
  };

  const runSearch = (q) => {
    lastQuery = q;
    ensureCse();
    syncOverlaySoon();

    // すでに準備できているなら即実行
    if (cseReady) {
      const el = window.google?.search?.cse?.element?.getElement?.(cseElementName);
      if (el && typeof el.execute === 'function') el.execute(q);
    }
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault(); // 遷移しない
    const q = (input.value || '').trim();
    if (!q) {
      input.focus();
      return;
    }
    input.value = q;
    runSearch(q);
  });
}

