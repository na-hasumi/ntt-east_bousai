/**
 * 共通のスクロール処理機能
 * showOnStop機能付きのスクロールハンドラー
 * 
 * オプション:
 * - enableShowOnStop: showOnStop機能自体を有効にするかどうか（デフォルト: true）
 * - showOnStop: 停止時に表示するかどうか（enableShowOnStopがtrueの場合のみ有効）
 * - hideAtBottom: 最下部でクラスを外すかどうか
 * - offset: TOPから何px地点で発火するか
 * - bottomOffset: 最下部判定のオフセット
 * - stopDelay: 停止判定の遅延時間（ミリ秒）
 */
const createScrollHandler = (target, options = {}) => {
    // オプションのデフォルト値
    const config = {
        hideAtBottom: false, // 最下部でクラスを外すかどうか
        offset: 300, // TOPから何px地点で発火するか
        bottomOffset: 100, // 最下部判定のオフセット
        enableShowOnStop: true, // showOnStop機能自体を有効にするかどうか
        showOnStop: true, // true: 停止時に表示, false: スクロール中に表示
        stopDelay: 150, // 停止判定の遅延時間（ミリ秒）
        ...options
    };
    
    if (!target) return null;
    
    // サーバーサイドレンダリング対応
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return null;
    }
    
    const offset = config.offset;
    let scrollTimer = null; // スクロール停止タイマー
    let stopTimer = null; // 停止判定タイマー
    
    // スクロールイベントハンドラー
    const handleScroll = () => {
        // 既存のタイマーをクリア
        if (scrollTimer) {
            clearTimeout(scrollTimer);
        }
        if (stopTimer) {
            clearTimeout(stopTimer);
        }
        
        // スクロール位置を取得
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // ページ最下部チェック（オプションで制御）
        if (config.hideAtBottom) {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const bottomOffset = config.bottomOffset;
            
            // ページ最下部に到達した場合（オフセット手前でクラスを外す）
            if (scrollTop + windowHeight >= documentHeight - bottomOffset) {
                target.classList.remove('is_show');
                // タイマーもクリア
                if (scrollTimer) {
                    clearTimeout(scrollTimer);
                    scrollTimer = null;
                }
                if (stopTimer) {
                    clearTimeout(stopTimer);
                    stopTimer = null;
                }
                return; // 最下部の場合は他の処理をスキップ
            }
        }
        
        // ページ上部に戻った場合（スクロール位置が300px未満）
        if (scrollTop < offset) {
            target.classList.remove('is_show');
            // タイマーもクリア
            if (scrollTimer) {
                clearTimeout(scrollTimer);
                scrollTimer = null;
            }
            if (stopTimer) {
                clearTimeout(stopTimer);
                stopTimer = null;
            }
            return; // 上部の場合は他の処理をスキップ
        }
        
        // パターン別の処理
        if (config.enableShowOnStop) {
            // showOnStop機能が有効な場合
            if (config.showOnStop) {
                // 停止時に表示するパターン
                if (scrollTop >= offset) {
                    // スクロール中は非表示
                    target.classList.remove('is_show');
                    
                    // 停止判定タイマーを設定
                    stopTimer = setTimeout(() => {
                        target.classList.add('is_show');
                    }, config.stopDelay);
                }
            } else {
                // スクロール中に表示するパターン（従来の動作）
                if (target.classList.contains('is_show')) {
                    scrollTimer = setTimeout(() => {
                        target.classList.remove('is_show');
                    }, 3000);
                } else {
                    // クラスが付いていない場合（3秒後に外された後など）、再度スクロールした時はクラスを付与
                    // スクロール位置が300px以上の場合のみ表示
                    if (scrollTop >= offset) {
                        target.classList.add('is_show');
                    }
                }
            }
        } else {
            // showOnStop機能が無効な場合（従来のシンプルな動作）
            if (scrollTop >= offset) {
                target.classList.add('is_show');
            } else {
                target.classList.remove('is_show');
            }
        }
    }
    
    // スクロールイベントを追加
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // クリーンアップ関数を返す
    return () => {
        window.removeEventListener('scroll', handleScroll);
        if (scrollTimer) {
            clearTimeout(scrollTimer);
        }
        if (stopTimer) {
            clearTimeout(stopTimer);
        }
    };
};

export default createScrollHandler;
