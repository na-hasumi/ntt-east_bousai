// メディアクエリ判定
const getMq = () => {
    if (window.innerWidth < 375) {
        return 'xs';
    } else if (window.innerWidth < 768) {
        return 'sm';
    } else if (window.innerWidth < 992) {
        return 'md';
    }  else if (window.innerWidth < 1320) {
        return 'lg';
    } else {
        return 'xl';
    }
}

export default getMq