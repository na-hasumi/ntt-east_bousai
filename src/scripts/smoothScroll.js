import getHeaderH from './getHeaderH';
import scrollTo from './scrollTo';

// スムーススクロール
const smoothScroll = () => {
    const headerisFixed= true; //ヘッダーが追従するかどうか
    const EXTRA_OFFSET = 0; // 追加で上にずらす量（px）

    const getOffsets = () => {
        const headerH = headerisFixed ? getHeaderH() : 0;
        return { headerH, extra: EXTRA_OFFSET };
    };

    // ページ読み込み時にURLのハッシュがある場合、適切なタイミングでスクロール
    let hashScrolled = false; // 既にスクロール済みかどうかのフラグ
    
    const scrollToHashOnLoad = () => {
        const hash = window.location.hash;
        if (!hash || hashScrolled) return;

        const targetId = hash.replace('#', '');
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            hashScrolled = true; // フラグを立てて重複実行を防ぐ
            
            // ページが完全に読み込まれるまで待つ
            const scrollToTarget = () => {
                // Lenisが有効な場合はLenisに任せる
                if (window.lenis) {
                    const { headerH, extra } = getOffsets();
                    // アニメーションなしで即時移動
                    window.lenis.scrollTo(targetElement, {
                        // 要素の表示位置を上にずらす（= スクロール位置は少なめになる）
                        offset: -headerH - extra,
                        immediate: true, 
                        force: true
                    });
                    return;
                }

                // ヘッダーの高さを取得
                const { headerH, extra } = getOffsets();
                
                const rect = targetElement.getBoundingClientRect().top;
                const offset = window.scrollY;
                const target = rect + offset - headerH - extra;
                
                // レイアウトが確定してからスクロール
                requestAnimationFrame(() => {
                    scrollTo(target);
                });
            };

            // ページが完全に読み込まれた後にスクロール（画像などの読み込みを考慮）
            if (document.readyState === 'complete') {
                // 既に読み込み完了している場合、少し待ってからスクロール
                setTimeout(scrollToTarget, 100);
            } else {
                // まだ読み込み中の場合は、loadイベントを待つ
                window.addEventListener('load', () => {
                    setTimeout(scrollToTarget, 100);
                }, { once: true });
            }
        }
    };

    const doWhenLoaded = () => {
        // すべてのhrefに#が含まれるaタグを取得
        const allLinks = document.querySelectorAll('a[href*="#"]');
        const smoothScrollTrigger = Array.from(allLinks).filter(link => {
            const href = link.getAttribute('href');
            if (!href) return false;
            // #で始まるか、同じページ内のアンカーリンク（現在のパスを含む、または相対パス）のみを対象
            // 外部リンク（http://やhttps://で始まる）は除外
            return href.startsWith('#') || 
                   (!href.startsWith('http://') && !href.startsWith('https://') && href.includes('#'));
        });

        // ヘッダーの高さを取得
        const { headerH, extra } = getOffsets();
    
        // aタグにそれぞれクリックイベントを設定
        for (let i = 0; i < smoothScrollTrigger.length; i++) {
            smoothScrollTrigger[i].addEventListener('click', (e) => {
                let href = smoothScrollTrigger[i].getAttribute('href'); // 各a要素のリンク先を取得
                
                // 同じページ内のアンカーリンクかどうかを判定
                let isSamePageAnchor = false;
                
                if (href.startsWith('#')) {
                    // #で始まる場合は同じページ内
                    isSamePageAnchor = true;
                } else {
                    // 相対パスまたは絶対パスの場合、URLを解析して現在のページと比較
                    try {
                        const linkUrl = new URL(href, window.location.href);
                        const currentUrl = new URL(window.location.href);
                        // パス名が同じ場合は同じページ内
                        isSamePageAnchor = linkUrl.pathname === currentUrl.pathname;
                    } catch (e) {
                        // URL解析に失敗した場合は、パス部分が現在のパスと一致するかチェック
                        const hashIndex = href.indexOf('#');
                        if (hashIndex !== -1) {
                            const pathPart = href.substring(0, hashIndex);
                            isSamePageAnchor = pathPart === window.location.pathname || 
                                             pathPart === '' || 
                                             href.startsWith(window.location.pathname + '#');
                        }
                    }
                }
                
                // 別のページへのリンクの場合は通常の遷移を許可
                if (!isSamePageAnchor) {
                    return; // preventDefault()を実行せず、通常の遷移を許可
                }
                
                // ターゲットの位置を取得
                e.preventDefault();
                // #以降の部分（ハッシュ部分）を抽出
                const hashMatch = href.match(/#(.+)/);
                const targetId = hashMatch ? hashMatch[1] : '';
                let targetElement = document.getElementById(targetId); // リンク先の要素（コンテンツ）を取得
                
                if (window.lenis && targetElement) {
                    // Lenisのoffsetも調整しないと、下のtarget計算を変えても反映されない
                    const { headerH: currentHeaderH, extra: currentExtra } = getOffsets();
                    window.lenis.scrollTo(targetElement, {
                        offset: -currentHeaderH - currentExtra,
                        immediate: false
                    });
                    return;
                }

                let target;
                
                if (targetElement) {
                    const rect = targetElement.getBoundingClientRect().top; // ブラウザからの高さを取得
                    const offset = window.scrollY; // 現在のスクロール量を取得
                    target = rect + offset - headerH - extra; //最終的な位置を割り出す  
                    // console.log(target);
                } else {
                    target = 0; //ターゲットが存在しない場合はTOPに移動
                }
    
                // スクロールさせる
                scrollTo(target);
            });
        }
    }
    
    // ページ読み込み時のハッシュスクロール処理
    scrollToHashOnLoad();
    
    window.addEventListener('load', () => {
        doWhenLoaded();
        // ページ読み込み完了後にハッシュスクロールを実行
        scrollToHashOnLoad();
    });
    window.addEventListener('resize', doWhenLoaded);
}

export default smoothScroll