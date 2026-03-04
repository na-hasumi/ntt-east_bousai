import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// パスの設定
const documentsDir = path.join(__dirname, '..', '.documents');
const outputDir = path.join(__dirname, '..', 'src', 'components', 'documents');
const defaultSitemapPath = path.join(
  __dirname,
  '..',
  'src',
  'pages',
  'documents',
  '_sitemap_tree.json'
);

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// HTMLファイルから <div id="content"> ... </div> を「対応する閉じタグ」まで丸ごと抽出する関数
// - <div id="main"> ... <div id="content"> のように同一行に他要素があってもOK
// - <!--content end--> の有無や位置（</div>の前後）に依存しない
// Astro はブラウザより厳密にHTMLをパースするため、本文中に「タグではない <」が混ざるとコンパイルエラーになります。
// 例: "（< 10nm）" のようなケース。これを "&lt;" にエスケープして安全化します。
// また、本文中の "{002}" のような表記は Astro では "{...}" が式として解釈され、
// "002" がレガシー8進数リテラル扱いでビルドエラーになることがあります。
// そのため「タグの外側」の { } も HTML エンティティへエスケープします。
function sanitizeHtmlForAstro(htmlLike) {
  let out = '';
  let i = 0;

  const len = htmlLike.length;
  while (i < len) {
    const ch = htmlLike[i];

    if (ch !== '<') {
      // タグの外側（テキスト）では Astro の式開始/終了として解釈される { } を避ける
      if (ch === '{') {
        out += '&#123;';
      } else if (ch === '}') {
        out += '&#125;';
      } else {
        out += ch;
      }
      i += 1;
      continue;
    }

    // コメントはそのまま通す
    if (htmlLike.startsWith('<!--', i)) {
      const end = htmlLike.indexOf('-->', i + 4);
      if (end === -1) {
        // 壊れているコメントは "<" をエスケープして続行
        out += '&lt;';
        i += 1;
      } else {
        out += htmlLike.slice(i, end + 3);
        i = end + 3;
      }
      continue;
    }

    // タグとして成立しそうな開始文字か判定
    const next = htmlLike[i + 1] ?? '';
    const isTagStart =
      next === '/' || next === '!' || next === '?' || /[A-Za-z]/.test(next);

    if (!isTagStart) {
      // 本文中の "<" とみなしエスケープ
      out += '&lt;';
      i += 1;
      continue;
    }

    // ">" までをタグとして通す（属性内の "<" までは扱わない）
    const close = htmlLike.indexOf('>', i + 1);
    if (close === -1) {
      // 閉じ ">" がない場合は "<" をエスケープ
      out += '&lt;';
      i += 1;
      continue;
    }

    out += htmlLike.slice(i, close + 1);
    i = close + 1;
  }

  return out;
}

function decodeHtmlEntities(input) {
  // 最低限のHTML entityデコード（タイトル用）
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    micro: 'µ',
    alpha: 'α',
    beta: 'β',
    gamma: 'γ',
    delta: 'δ',
  };

  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, num) =>
      String.fromCodePoint(Number.parseInt(num, 10))
    )
    .replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m);
}

function stripHtmlTags(input) {
  // タイトル抽出用途なので、雑にタグを落とす（script/styleは来ない想定）
  return input.replace(/<[^>]+>/g, '');
}

function decodeHtmlEntitiesInTextNodes(html) {
  // タグは保持し、タグ外のテキストだけ entity をデコードする
  // 例: 'A<sup>2</sup>&amp;B' -> 'A<sup>2</sup>&B'
  let out = '';
  let i = 0;

  while (i < html.length) {
    const ch = html[i];

    if (ch === '<') {
      const close = html.indexOf('>', i + 1);
      if (close === -1) {
        // 不正なHTML。残りはテキスト扱いでデコードして終端。
        out += decodeHtmlEntities(html.slice(i));
        break;
      }
      out += html.slice(i, close + 1);
      i = close + 1;
      continue;
    }

    const nextTag = html.indexOf('<', i);
    const textChunk = nextTag === -1 ? html.slice(i) : html.slice(i, nextTag);
    out += decodeHtmlEntities(textChunk);
    i = nextTag === -1 ? html.length : nextTag;
  }

  return out;
}

function extractH1DocumentsTitle(htmlContent) {
  // <h1 class="h1-documents-title"> ... </h1> の中身を抽出して
  // <br> を \n にしつつ、h1内のタグ（例: sup/sub）は保持したまま返す。
  // HTML entity は「タグ外のテキスト部分のみ」デコードする。
  const re =
    /<h1\b[^>]*\bclass\s*=\s*(["'])[^"']*\bh1-documents-title\b[^"']*\1[^>]*>([\s\S]*?)<\/h1>/i;
  const m = htmlContent.match(re);
  if (!m) return null;

  let inner = m[2] ?? '';
  inner = inner.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  inner = inner.replace(/<br\s*\/?>/gi, '\n');

  // 画像見出しの場合もあるので alt も拾う（inner がタグだけで空になるケース対策）
  const imgAlt = inner.match(/<img\b[^>]*\balt\s*=\s*(["'])(.*?)\1/i)?.[2];

  // タグは保持したまま、テキスト部分だけ entity をデコード
  let html = decodeHtmlEntitiesInTextNodes(inner);
  html = html.replace(/\u00A0/g, ' ');

  // 行ごとの余白を整えつつ、改行は維持
  // <br> の前後にHTML改行が入っている場合、空行(\n\n)になりやすいので空行は除去する
  const lines = html
    .split('\n')
    .map(l => l.trim())
    .filter(l => stripHtmlTags(l).replace(/\u00A0/g, ' ').trim() !== '');
  html = lines.join('\n').trim();

  // タグだけでテキストが空の場合は alt にフォールバック
  if (stripHtmlTags(html).trim() === '' && imgAlt) {
    const alt = decodeHtmlEntities(imgAlt).replace(/\u00A0/g, ' ').trim();
    return alt || null;
  }

  return html || null;
}

function extractContent(htmlContent) {
  const lower = htmlContent.toLowerCase();

  // id="content" を持つ div 開始タグを探す（属性順・クォート有無を許容）
  const startRe = /<div\b[^>]*\bid\s*=\s*(["']?)content\1[^>]*>/i;
  const startMatch = htmlContent.match(startRe);
  if (!startMatch || startMatch.index == null) return null;

  const startIdx = startMatch.index;
  const startTag = startMatch[0];

  // <div>のネストを数えて対応する </div> を見つける
  let depth = 1;
  let i = startIdx + startTag.length;

  while (i < htmlContent.length) {
    const nextOpen = lower.indexOf('<div', i);
    const nextClose = lower.indexOf('</div', i);

    if (nextClose === -1) return null;

    // 次に現れるのが <div ...> か </div ...> か判定
    const isOpenNext = nextOpen !== -1 && nextOpen < nextClose;

    if (isOpenNext) {
      // 開始タグの '>' までスキップ
      const openEnd = lower.indexOf('>', nextOpen);
      if (openEnd === -1) return null;
      depth += 1;
      i = openEnd + 1;
      continue;
    }

    // </div> の '>' までスキップ
    const closeEnd = lower.indexOf('>', nextClose);
    if (closeEnd === -1) return null;
    depth -= 1;
    i = closeEnd + 1;

    if (depth === 0) {
      // <div id="content"> ... </div> まで
      let content = htmlContent.slice(startIdx, closeEnd + 1);
  
  // 印刷ボタンの画像パスを変更
  // <img src="../images/print_btn.gif" または <img src="images/print_btn.gif" を
  // <img src={IMG_PATH + "common/btn_print.svg"} width="189" height="33" に変更
  content = content.replace(
    /<img\s+src=["'](?:\.\.\/)?images\/print_btn\.gif["'][^>]*>/gi,
    '<img src={IMG_PATH + "common/btn_print.svg"} alt="このページを印刷する" width="189" height="33">'
  );

      // 不要な見出し・戻るリンク（旧サイト由来）を除去
      // - h1.h1-std / h1.h1-documents-title: 画像見出し（レイアウト側で見出しを持つため不要）
      // - p.p-bkto-top: history.back の戻るリンク（SPA/静的サイトでは不要・危険）
      content = content.replace(
        /<h1\b[^>]*\bclass\s*=\s*(["'])[^"']*\b(?:h1-std|h1-documents-title)\b[^"']*\1[^>]*>[\s\S]*?<\/h1>\s*/gi,
        ''
      );
      content = content.replace(
        /<p\b[^>]*\bclass\s*=\s*(["'])[^"']*\bp-bkto-top\b[^"']*\1[^>]*>[\s\S]*?<\/p>\s*/gi,
        ''
      );

      // Astro向け: 本文中の "<" や "{...}" を安全化してコンパイルエラーを防ぐ
      content = sanitizeHtmlForAstro(content);
  
      // 先頭末尾の余分な空白を削除
      content = content.trim();
  
  // 各行の先頭の余分な空白を削除（ただし、コンテンツ内のインデントは保持）
  // 最初の行のインデントを基準に調整
  const lines = content.split('\n');
  if (lines.length > 0) {
    const firstLineIndent = lines[0].match(/^(\s*)/)?.[1] || '';
    if (firstLineIndent) {
      // すべての行から最初の行と同じインデントを削除
      content = lines.map(line => {
        if (line.startsWith(firstLineIndent)) {
          return line.slice(firstLineIndent.length);
        }
        return line;
      }).join('\n');
    }
  }
  
  // タブでインデントを統一（既存のコンポーネントに合わせる）
  content = content.split('\n').map(line => {
    // 先頭のスペースをタブに変換（2スペース = 1タブ）
    const match = line.match(/^(\s*)/);
    if (match) {
      const spaces = match[1];
      const tabs = '\t'.repeat(Math.floor(spaces.length / 2));
      return tabs + line.trimStart();
    }
    return line;
  }).join('\n');
  
      return content;
    }
  }

  return null;
}

function resolveDocumentsHtmlPathFromUrl(url) {
  // sitemap の url は *.html なので、基本は .documents/*.htm に変換して探す
  const base = path.basename(url);
  const candidates = [
    base.replace(/\.html$/i, '.htm'),
    base, // まれに .documents 側が .html の可能性も考慮
  ];
  for (const name of candidates) {
    const p = path.join(documentsDir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function updateSitemapH1Titles({ sitemapPath, dryRun }) {
  const raw = fs.readFileSync(sitemapPath, 'utf-8');
  const sitemap = JSON.parse(raw);

  let scanned = 0;
  let updated = 0;
  let missing = 0;
  let noH1 = 0;

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'file' && typeof node.url === 'string') {
      scanned += 1;

      const htmlPath = resolveDocumentsHtmlPathFromUrl(node.url);
      if (!htmlPath) {
        missing += 1;
      } else {
        const html = fs.readFileSync(htmlPath, 'utf-8');
        const title = extractH1DocumentsTitle(html);
        if (!title) {
          noH1 += 1;
        } else if (node.name !== title) {
          node.name = title;
          updated += 1;
        }
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  }

  walk(sitemap);

  console.log(`sitemap更新対象(file): ${scanned}件`);
  console.log(`  h1-documents-title取得できず: ${noH1}件`);
  console.log(`  .documentsに対応HTMLなし: ${missing}件`);
  console.log(`  name更新: ${updated}件`);

  if (dryRun) {
    console.log('dry-run のため書き込みは行いません。');
    return;
  }

  fs.writeFileSync(sitemapPath, JSON.stringify(sitemap, null, 2) + '\n', 'utf-8');
  console.log(`✅ sitemapを書き込みました: ${sitemapPath}`);
}

// Astroコンポーネントのテンプレートを生成
function generateAstroComponent(content, options = {}) {
  const { withStyle = false } = options;
  const styleBlock = withStyle
    ? `
<style lang="scss">
@use "@styles/lower.scss";
@import "@styles/documents/print.css";
</style>`
    : '';

  return `---
import { IMG_PATH } from '/src/consts';
---

${content}
${styleBlock}`;
}

// メイン処理
function main() {
  // --update-sitemap-h1: src/pages/documents/_sitemap_tree.json の各 file node を
  //   .documents の h1.h1-documents-title から再抽出して name を更新
  //
  // 既存挙動:
  // - 引数があれば指定ファイルのみ、なければ .documents 配下の全 .htm を Astro へ変換
  // - --with-style: 従来通り documents 共通CSSを各ファイルに埋め込む
  const argv = process.argv.slice(2).filter(Boolean);

  let withStyle = false;
  let updateSitemapH1 = false;
  let dryRun = false;
  let sitemapPath = defaultSitemapPath;
  const files = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--with-style') {
      withStyle = true;
    } else if (a === '--update-sitemap-h1') {
      updateSitemapH1 = true;
    } else if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--sitemap') {
      const next = argv[i + 1];
      if (next) {
        sitemapPath = next;
        i += 1;
      }
    } else if (a.startsWith('--')) {
      console.warn(`⚠️  未対応オプション: ${a}`);
    } else {
      files.push(a);
    }
  }

  if (updateSitemapH1) {
    updateSitemapH1Titles({ sitemapPath, dryRun });
    return;
  }

  const targetFiles =
    files.length > 0
      ? files
      : fs.readdirSync(documentsDir).filter(file => file.endsWith('.htm'));

  console.log(`見つかったHTMLファイル: ${targetFiles.length}件`);
  console.log(
    `documents共通CSSを各ファイルに埋め込む: ${withStyle ? 'ON (--with-style)' : 'OFF (推奨)'}`
  );

  let successCount = 0;
  let errorCount = 0;

  for (const file of targetFiles) {
    try {
      const filePath = path.join(documentsDir, file);
      const htmlContent = fs.readFileSync(filePath, 'utf-8');

      const content = extractContent(htmlContent);

      if (!content) {
        console.warn(`⚠️  ${file}: id="content"が見つかりませんでした`);
        errorCount++;
        continue;
      }

      // ファイル名を.astroに変更
      const astroFileName = file.replace(/\.htm$/, '.astro');
      const outputPath = path.join(outputDir, astroFileName);

      // Astroコンポーネントを生成
      const astroComponent = generateAstroComponent(content, { withStyle });

      // ファイルに書き込み
      fs.writeFileSync(outputPath, astroComponent, 'utf-8');

      console.log(`✅ ${file} -> ${astroFileName}`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${file}: エラーが発生しました`, error.message);
      errorCount++;
    }
  }

  console.log('\n処理完了:');
  console.log(`  成功: ${successCount}件`);
  console.log(`  失敗: ${errorCount}件`);
}

main();

