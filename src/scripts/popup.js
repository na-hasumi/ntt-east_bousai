import fixBody from '@module/fixBody';

// ポップアップ
const popup = () => {
    // data属性で指定されたポップアップトリガーを取得
    const triggerList = document.querySelectorAll('[data-popup-id]');
    // ポップアップボタンがなければ終了
    if (!triggerList.length) return;

    // 既に初期化済みのターゲットをIDで参照するためのマップ
    const idToTarget = new Map();

    // 全てのポップアップボタンに実行
    for (let i = 0; i < triggerList.length; i++) {
        const trigger = triggerList[i]; // ポップアップボタン
        const targetId = trigger.getAttribute('data-popup-id');
        if (!targetId) continue;

        // 既に初期化済みならそれを利用
        let target = idToTarget.get(targetId);

        // 未初期化の場合はIDから要素を取得し、初期化する
        if (!target) {
            const found = document.getElementById(targetId);
            if (!found) continue;
            if (!found.classList.contains('js_popup_body')) continue;

            // 中身要素をbodyの最後に移動
            const clonedTarget = teleportEl(found);

            // 閉じる要素を取得し、クリックイベントを設定（1回のみ）
            const closeEl = getCloseEl(clonedTarget);
            if (closeEl && closeEl.close) closeEl.close.addEventListener('click', () => hide(clonedTarget));
            if (closeEl && closeEl.overlay) closeEl.overlay.addEventListener('click', () => hide(clonedTarget));

            idToTarget.set(targetId, clonedTarget);
            target = clonedTarget;
        }
        
        // トリガーにクリックイベントを設定
        trigger.addEventListener('click', () => {
            const needsInnerAnchor = trigger.hasAttribute('data-popup-link');
            const innerAnchorId = trigger.getAttribute('data-popup-link') || targetId;
            
            show(target);
            
            if (needsInnerAnchor) {
                // 次フレームでスクロール（描画更新後に計算するため）
                requestAnimationFrame(() => {
                    const displayEl = target.querySelector('.js_popup_inner');
                    if (!displayEl) return;
                    const anchorEl = target.querySelector(`[id="${innerAnchorId}"]`);
                    if (!anchorEl) return;

                    const displayRect = displayEl.getBoundingClientRect();
                    const anchorRect = anchorEl.getBoundingClientRect();
                    const offset = anchorRect.top - displayRect.top + displayEl.scrollTop;

                    displayEl.scrollTop = offset;
                });
            }
        });
    }
}

// 対象要素をbodyの最後に移動させる
const teleportEl = (target) => {
    const clonedTarget = target.cloneNode(true); //対象要素を複製
    document.body.appendChild(clonedTarget); //複製要素をbodyの最後に追加
    target.remove(); //元の要素を削除

    return clonedTarget; //複製要素を返す
}

// 閉じる要素を取得（子孫まで探索）
const getCloseEl = (target) => {
    const close = target.querySelector('.js_popup_close');
    const overlay = target.querySelector('.js_popup_overlay');
    return { close, overlay };
}

// 表示関数
const show = (target) => {
    target.classList.add('is_active');
    const displayEl = target.querySelector('.js_popup_display'); //表示領域
    const contentsEl = target.querySelector('.js_popup_contents'); //中身
    const windowH = window.innerHeight; //ウィンドウの高さ
    const contentsH = contentsEl.clientHeight; //中身の高さ
    fixBody('open');

    // 中身の高さがウィンドウの高さより高い場合、スクロールバーを表示
    if (contentsH > windowH) {
        displayEl.classList.add('is_scroll');
    }

    // モーダル内のvideoタグを再生
    const videoEl = target.querySelector('video');
    if (videoEl) {
        videoEl.play().catch(error => {
            console.log('動画の再生に失敗しました:', error);
        });
    }

    // YouTubeのiframeを再生
    const youtubeIframes = target.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
    youtubeIframes.forEach(iframe => {
        // YouTubeのiframeのsrcにautoplay=1を追加して再生
        const src = iframe.src;
        if (src.includes('?')) {
            iframe.src = src + '&autoplay=1';
        } else {
            iframe.src = src + '?autoplay=1';
        }
    });
}

// 非表示関数
const hide = (target) => {
    target.classList.remove('is_active');
    fixBody('close');

    // モーダル内のvideoタグを一時停止
    const videoEl = target.querySelector('video');
    if (videoEl) {
        videoEl.pause();
    }

    // YouTubeのiframeを一時停止
    const youtubeIframes = target.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
    youtubeIframes.forEach(iframe => {
        // YouTubeのiframeのsrcからautoplay=1を削除して一時停止
        const src = iframe.src;
        if (src.includes('&autoplay=1')) {
            iframe.src = src.replace('&autoplay=1', '');
        } else if (src.includes('?autoplay=1')) {
            iframe.src = src.replace('?autoplay=1', '');
        }
    });
}

export default popup;