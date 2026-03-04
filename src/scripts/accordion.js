// アコーディオン
const accordion = () => {
    const triggerList = document.querySelectorAll('.js_accordion_trigger');

    // アコーディオンのトリガーが存在しない場合処理しない
    if (!triggerList.length) return;

    // トリガーをクリックした時の処理
    const doWhenClicked = (e) => {
        const trigger = e.target; //トリガー
        const target = trigger.nextElementSibling; //アコーディオン中身

        // 次の要素がjs_accordion_bodyクラスを持っていない場合は処理しない
        if (!target.classList.contains('js_accordion_body')) return;

        const targetH = target.scrollHeight; //アコーディオン中身の高さ

        // アクティブクラスの付与/削除
        trigger.classList.toggle('is_active');
        target.classList.toggle('is_active');

        // アコーディオン中身の高さ制御
        if (target.classList.contains('is_active')) {
            target.style.height = `${targetH}px`;
        } else {
            target.style.height = '0';
        }
    }

    // トリガーにクリックイベントを設定
    triggerList.forEach(el => {
        el.addEventListener('click', doWhenClicked);

        // 初期状態でis_activeが付いている場合、開いた状態にする
        if (el.classList.contains('is_active')) {
            const target = el.nextElementSibling;
            if (target && target.classList.contains('js_accordion_body')) {
                const targetH = target.scrollHeight;
                target.classList.add('is_active');
                target.style.height = `${targetH}px`;
            }
        }
    });
}

export default accordion;