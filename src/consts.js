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
export const SITE_NAME = 'NTT東日本 防災研究所';
export const SITE_DESCRIPTION = 'NTT東日本 防災研究所「防災研」は、地域防災の実装支援パートナーです。NTT東日本が持つ通信・デジタル技術のノウハウを軸に、地域防災のさらなる高度化に向けたアイデア創出と、その実証・検証を行います。';
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
        link: BASE_DIR + 'action/',
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
                link: BASE_DIR + 'to-local/',
                blank: false,
            },
            {
                name: '企業・大学・研究機関の皆さまへ',
                link: BASE_DIR + 'to-company/',
                blank: false,
            },
            {
                name: 'メディアの皆さまへ',
                link: BASE_DIR + 'to-media/',
                blank: false,
            },
        ]
    }
];