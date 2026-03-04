import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {
    inputDir: '.',
    output: 'src/pages/_topics.json',
    pretty: true,
    prefix: 'topics',
  };
  for (const a of argv) {
    if (a.startsWith('--input-dir=')) args.inputDir = a.slice('--input-dir='.length);
    else if (a.startsWith('--output=')) args.output = a.slice('--output='.length);
    else if (a.startsWith('--prefix=')) args.prefix = a.slice('--prefix='.length);
    else if (a === '--pretty') args.pretty = true;
    else if (a === '--no-pretty') args.pretty = false;
  }
  return args;
}

function decodeHtmlEntities(str) {
  return (
    str
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
  );
}

function htmlToText(html) {
  if (!html) return '';
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  const stripped = withBreaks.replace(/<[^>]*>/g, '');
  return decodeHtmlEntities(stripped).replace(/\r\n/g, '\n');
}

function normalizeText(s) {
  return String(s ?? '')
    .replace(/[\t \f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHref(href) {
  const h = String(href ?? '').trim();
  if (!h) return '';
  // keep absolute URLs as-is
  if (/^https?:\/\//i.test(h)) return h;
  // site is generated as *.html (Astro build.format='file')
  return h.replace(/\.htm(\b|$)/gi, '.html$1');
}

function extractYear(html, fileName) {
  // Prefer file name first. (topics-nav always starts with 2024 link even on older pages)
  // 1) file name: topics2023.htm / topics2011.htm
  const m = fileName.match(/(\d{4})/);
  if (m) return Number(m[1]);

  // 2) title: トピックス一覧 2024年度 - ...
  const t = html.match(/<title>[\s\S]*?(\d{4})\s*年度[\s\S]*?<\/title>/i);
  if (t) return Number(t[1]);

  // 3) topic-path: トピックス2024年度 / トピックス2011年度
  const topicPath = html.match(/トピックス\s*(\d{4})\s*年度/i);
  if (topicPath) return Number(topicPath[1]);

  return null;
}

function extractTable(html) {
  const m = html.match(/<table\b[^>]*class\s*=\s*(["'])[^"']*\btbl-topics-view\b[^"']*\1[^>]*>([\s\S]*?)<\/table>/i);
  return m ? m[2] : '';
}

function extractRows(tableInnerHtml) {
  const rows = [];

  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr;
  while ((tr = trRe.exec(tableInnerHtml))) {
    const trInner = tr[1];

    const thMatch = trInner.match(/<th\b[^>]*>([\s\S]*?)<\/th>/i);
    const dateText = normalizeText(htmlToText(thMatch ? thMatch[1] : ''));

    // category alt in the 2nd td (image alt)
    const categoryMatch = trInner.match(
      /<td\b[^>]*>\s*<img\b[^>]*\balt\s*=\s*(["'])([\s\S]*?)\1[\s\S]*?\/?>\s*<\/td>/i
    );
    const category = normalizeText(decodeHtmlEntities(categoryMatch ? categoryMatch[2] : ''));

    // content td (3rd): may include prefix text + <a> + optional <img alt="更新">
    const tdMatches = [...trInner.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    const contentTd = tdMatches.length >= 3 ? tdMatches[2] : tdMatches.length >= 1 ? tdMatches[tdMatches.length - 1] : '';

    const linkMatch = contentTd.match(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/i);
    const href = normalizeHref(linkMatch ? linkMatch[2] : '');
    const linkText = linkMatch ? normalizeText(htmlToText(linkMatch[3])) : '';

    // optional prefix text before <a> (e.g. 【高分子材料】)
    const beforeLink = contentTd.split(/<a\b/i)[0] ?? '';
    const prefixText = normalizeText(htmlToText(beforeLink));

    const title = normalizeText([prefixText, linkText].filter(Boolean).join(' '));

    const isNew = /<img\b[^>]*\balt\s*=\s*(["'])\s*(更新|UP|アップ)\s*\1/i.test(contentTd);

    if (dateText || category || title || href) {
      rows.push({
        date: dateText,
        category,
        title,
        href,
        isNew,
      });
    }
  }

  return rows;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const { inputDir, output, pretty, prefix } = parseArgs(process.argv.slice(2));
  const inputAbs = path.resolve(process.cwd(), inputDir);
  const outputAbs = path.resolve(process.cwd(), output);

  const entries = await fs.readdir(inputAbs, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().startsWith(prefix) && e.name.toLowerCase().endsWith('.htm'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'en'));

  if (files.length === 0) {
    console.log(`[extract-topics-json] No ${prefix}*.htm files found in: ${inputAbs}`);
    return;
  }

  const years = [];
  for (const name of files) {
    const filePath = path.join(inputAbs, name);
    const html = await fs.readFile(filePath, 'utf8');

    const year = extractYear(html, name);
    if (!year) {
      console.warn(`[extract-topics-json] Skip (year not found): ${name}`);
      continue;
    }

    const tableInner = extractTable(html);
    const items = extractRows(tableInner);

    years.push({
      year,
      source: path.posix.join(inputDir.replace(/\\/g, '/'), name),
      items,
    });
  }

  years.sort((a, b) => b.year - a.year);

  const data = {
    generatedAt: new Date().toISOString(),
    years,
  };

  await ensureDir(outputAbs);
  const json = pretty ? JSON.stringify(data, null, 2) + '\n' : JSON.stringify(data) + '\n';
  await fs.writeFile(outputAbs, json, 'utf8');

  console.log(`[extract-topics-json] Wrote: ${path.relative(process.cwd(), outputAbs)}`);
  console.log(`[extract-topics-json] Years: ${years.length} (latest: ${years[0]?.year ?? 'n/a'})`);
}

main().catch((err) => {
  console.error('[extract-topics-json] Failed:', err);
  process.exitCode = 1;
});

