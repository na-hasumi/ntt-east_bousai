const toggleSubmenu = () => {
    const triggerList = document.querySelectorAll('.js_accordion_submenu_trigger');

    // アコーディオンのトリガーが存在しない場合処理しない
    if (!triggerList.length) return;

    // トリガーをクリックした時の処理
    const doWhenClicked = (e) => {
        const trigger = e.target; //トリガー
        const targetId = trigger.dataset.target; // data-target値の取得

        // PCとSPで処理を分岐
        if (window.innerWidth > 992) {
            // PC用の処理
            const pcTarget = document.querySelector(`.js_accordion_submenu_body_pc .bl_submenu_item[data-id="${targetId}"]`);
            if (!pcTarget) return;

            // 現在のアクティブ状態を確認
            const isCurrentlyActive = pcTarget.classList.contains('is_active');

            // 他のメニューを非表示
            document.querySelectorAll('.js_accordion_submenu_body_pc .bl_submenu_item').forEach(item => {
                triggerList.forEach(trigger => trigger.classList.remove('is_active'));
                item.classList.remove('is_active');
                item.style.height = '0';
            });
            
            // 現在アクティブでなかった場合のみ表示
            if (!isCurrentlyActive) {
                const targetH = pcTarget.scrollHeight;
                pcTarget.classList.add('is_active');
                pcTarget.style.height = `${targetH}px`;
                trigger.classList.add('is_active');
            } else {
                trigger.classList.remove('is_active');
            }

            
        } else {
            // SP用の処理（既存の処理）
            const target = trigger.nextElementSibling;
            if (!target.classList.contains('js_accordion_submenu_body')) return;

            const targetH = target.scrollHeight;
            trigger.classList.toggle('is_active');
            target.classList.toggle('is_active');

            if (target.classList.contains('is_active')) {
                target.style.height = `${targetH}px`;
            } else {
                target.style.height = '0';
            }
        }
    }

    // トリガーにクリックイベントを設定
    triggerList.forEach(el => el.addEventListener('click', doWhenClicked));

       // ドキュメント全体にクリックイベントを追加
    document.addEventListener('click', (e) => {
        // PCの場合のみ処理
        if (window.innerWidth > 992) {
            const activeSubmenu = document.querySelector('.js_accordion_submenu_body_pc .bl_submenu_item.is_active');
            const clickedTrigger = e.target.closest('.js_accordion_submenu_trigger');
            const clickedSubmenu = e.target.closest('.js_accordion_submenu_body_pc');
            
            // アクティブなサブメニューがあり、クリックされた要素がトリガーでもサブメニュー内でもない場合
            if (activeSubmenu && !clickedTrigger && !clickedSubmenu) {
                // サブメニューを閉じる
                activeSubmenu.classList.remove('is_active');
                activeSubmenu.style.height = '0';
                // トリガーのアクティブ状態も解除
                triggerList.forEach(trigger => trigger.classList.remove('is_active'));
            }
        }
    });

    // サブメニュー内のリンクがクリックされたときの処理
    const submenuLinks = document.querySelectorAll('.el_submenu_item a');
    submenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            // PCの場合
            if (window.innerWidth > 992) {
                // アクティブなサブメニューを閉じる
                document.querySelectorAll('.js_accordion_submenu_body_pc .bl_submenu_item.is_active').forEach(item => {
                    item.classList.remove('is_active');
                    item.style.height = '0';
                });
                // アクティブなトリガーのクラスを削除
                triggerList.forEach(trigger => trigger.classList.remove('is_active'));
            } else {
                // SPの場合
                const activeTrigger = document.querySelector('.js_accordion_submenu_trigger.is_active');
                if (activeTrigger) {
                    const activeSubmenu = activeTrigger.nextElementSibling;
                    if (activeSubmenu && activeSubmenu.classList.contains('js_accordion_submenu_body')) {
                        activeTrigger.classList.remove('is_active');
                        activeSubmenu.classList.remove('is_active');
                        activeSubmenu.style.height = '0';
                    }
                }
                
                // SPの場合、js_gnavとjs_menubarも閉じる
                const gnav = document.querySelector('.js_gnav');
                const menubar = document.querySelector('.js_menubar');
                const body = document.querySelector('body');
                
                if (gnav) {
                    gnav.classList.remove('is_show');
                }
                
                if (menubar) {
                    menubar.classList.remove('is_active');
                }

                if (body) {
                    body.classList.remove('is_fixed');
                }
            }
        });
    });
}

export default toggleSubmenu;