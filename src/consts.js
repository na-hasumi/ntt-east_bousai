/********************************************************************
* プロジェクト共通の定数
**********************************************************************/
// パス
export const BASE_HOST = 'https://www.ntt-east.co.jp/';
export const BASE_DIR = '/bousai/'; //ルートディレクトリを下げる場合はここを変更
export const IMG_PATH = BASE_DIR + 'images/';

// ロゴリンク（それぞれ別リンク）
export const LOGO_01_LINK = BASE_HOST; // NTT東日本
export const LOGO_02_LINK = BASE_DIR; // 防災研

// メタ関係
export const SITE_NAME = 'NTT東日本 防災研';
export const SITE_DESCRIPTION = '';
export const SEPARATOR = ' | ';

// グロナビ
export const NAV_LIST = [
    {
        name: '私たちについて',
        link: BASE_DIR + 'about/',
        blank: false,
    },
    {
        name: 'フェーズフリー 4つの行動',
        link: BASE_DIR + 'phase-free/',
        blank: false,
    },
    {
        name: '共同研究',
        link: BASE_DIR + 'research/',
        blank: false,
    },
    {
        name: '私たちとできること',
        link: '',
        blank: false,
        children: [
            {
                name: '地域・自治体の皆さまへ',
                link: BASE_DIR + 'for-local-government/',
                blank: false,
            },
            {
                name: '企業・大学・研究機関の皆さまへ',
                link: BASE_DIR + 'for-enterprise/',
                blank: false,
            },
            {
                name: 'メディアの皆さまへ',
                link: BASE_DIR + 'for-media/',
                blank: false,
            },
        ]
    }
];