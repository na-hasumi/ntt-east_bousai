import getHeaderH from './getHeaderH';
import getMq from './getMq';

// ハンバーガーメニュー
const toggleGnav = () => {
    const trigger = document.querySelector('.js_menubar'); //メニューバー
    const target = document.querySelector('.js_gnav'); //グロナビ
    if (!trigger || !target) return;

    /**
     * グロナビ展開後の高さを設定
    */
    const setTargetH = () => {
        const headerH = getHeaderH();
        const endHeight = `${window.innerHeight - headerH}px`; //画面の高さ - ヘッダーの高さ

        // 展開後の高さをカスタムプロパティに設定
        target.style.setProperty('--end-height', endHeight);
    }

    /* setTargetH();
    window.addEventListener('resize', setTargetH); */
    

    /**
     * グロナビ出現時にbodyを固定
     * @var {string} type - 開く時は'open'、閉じる時は'close'
    */
    const fixBody = (type = 'open') => {
        const body = document.body;
        const duration = 200;
        const header = document.querySelector('.js_header');
        const scroll = type === 'open' ? window.scrollY : Math.abs(parseFloat(body.style.top || '0'));
        
        // 固定
        if (type === 'open') {
            // スクロール位置を保存
            body.dataset.scrollPosition = scroll.toString();
            body.classList.add('is_fixed');
            body.style.top = `${-scroll}px`;
            
            // スクロール位置に基づいて背景状態を設定
            if (scroll > 100) {
                requestAnimationFrame(() => {
                    header?.classList.add('is_bg');
                });
            }
    
        // 固定を解除
        } else if (type === 'close') {
            if (!body.classList.contains('is_fixed')) return;
            
            body.classList.remove('is_fixed');
            body.style.top = '';
            window.scrollTo(0, scroll);
            
            // スクロール位置に基づいて背景状態を設定
            requestAnimationFrame(() => {
                if (scroll > 100) {
                    header?.classList.add('is_bg');
                } else {
                    header?.classList.remove('is_bg');
                }
            });
            
            // 保存したスクロール位置をクリア
            body.removeAttribute('data-scroll-position');
        }
    }
    
    // 開く
    const open = () => {
        const header = document.querySelector('.js_header');
        const currentScroll = window.scrollY;
        
        trigger.classList.add('is_active');
        target.classList.add('is_show');
        fixBody('open');
        
        // 確実に背景状態を設定
        requestAnimationFrame(() => {
            if (currentScroll > 100) {
                header?.classList.add('is_bg');
            }
        });
    }
    
    // 閉じる
    const close = () => {
        trigger.classList.remove('is_active');
        target.classList.remove('is_show');
        fixBody('close');
    }

    // トグル
    const toggle = () => {
        // 開く時
        if (!trigger.classList.contains('is_active')) {
            open();
        // 閉じる時
        } else {
            close();
        }
    }
    // 開閉関数をクリックイベントに登録
    trigger.addEventListener('click', toggle);

    // グロナビにページ内リンクがある場合
    const anchorLink = () => {
        // グロナビ内のhref="#"のaタグを取得
        const anchorList = target.querySelectorAll('a[href^="#"]');
        if (!anchorList || anchorList.length === 0) return;

        // クリックイベントを追加
        anchorList.forEach(anchor => {
            anchor.addEventListener('click', () => {
                // PCでは発火しない
                const mq = getMq();
                if (mq === 'lg' || mq === 'xl') return;
                close(); //グロナビを閉じる
            });
        });
    }
    anchorLink();

    
    /**
     * グロナビを開いた状態でメディアクエリが変わった時lg以上なら閉じる
    */
    const closeOnMq = () => {
        const mq = getMq();
        if (mq === 'lg' || mq === 'xl') close();
    }
    window.addEventListener('resize', closeOnMq);
}

export default toggleGnav