import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = {
    inputDir: '.publications',
    output: 'src/pages/publications/_publications.json',
    pretty: true,
  };
  for (const a of argv) {
    if (a.startsWith('--input-dir=')) args.inputDir = a.slice('--input-dir='.length);
    else if (a.startsWith('--output=')) args.output = a.slice('--output='.length);
    else if (a === '--pretty') args.pretty = true;
    else if (a === '--no-pretty') args.pretty = false;
  }
  return args;
}

function decodeHtmlEntities(str) {
  return (
    str
      // named entities (minimal set we expect)
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      // numeric entities: decimal and hex
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
  );
}

function htmlToText(html) {
  if (!html) return '';
  // Treat "<br>" (and following whitespace/newline used for HTML formatting) as a single newline.
  const withBreaks = html.replace(/<br\s*\/?>\s*/gi, '\n');
  const stripped = withBreaks.replace(/<[^>]*>/g, '');
  return decodeHtmlEntities(stripped).replace(/\r\n/g, '\n');
}

function normalizeText(s) {
  return s.replace(/[\t \f\v]+/g, ' ').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeMultilineText(s) {
  // Keep intentional newlines (e.g. from <br>), but normalize spaces around them.
  const normalizedNewlines = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalizedNewlines
    .split('\n')
    .map((line) => line.replace(/[\t \f\v]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((line, idx, arr) => {
      // keep blank lines only if they are between non-blank lines (avoid leading/trailing empties)
      if (line !== '') return true;
      const hasPrev = idx > 0 && arr[idx - 1] !== '';
      const hasNext = idx < arr.length - 1 && arr[idx + 1] !== '';
      return hasPrev && hasNext;
    })
    .join('\n')
    .trim();
}

function extractClassNameFromAttrs(attrs) {
  if (!attrs) return null;
  const m = attrs.match(/\bclass\s*=\s*(["'])([\s\S]*?)\1/i);
  if (!m) return null;
  const raw = decodeHtmlEntities(m[2] ?? '');
  const normalized = String(raw).replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function extractLinksFromHtml(html) {
  if (!html) return [];
  const links = [];
  const aRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(html))) {
    const attrs = m[1] ?? '';
    const inner = m[2] ?? '';

    const hrefMatch = attrs.match(/\bhref\s*=\s*(["'])([\s\S]*?)\1/i);
    const href = hrefMatch ? decodeHtmlEntities(hrefMatch[2] ?? '').trim() : '';
    if (!href) continue;

    const text = normalizeText(htmlToText(inner));
    links.push({ href, text: text || href });
  }
  return links;
}

function extractYear(html, fallbackName) {
  // Prefer robust sources in case image alt is wrong (e.g. 2018.htm had alt="2017年度").
  // 1) topic-path text: "...外部発表 > 2018年度"
  const topic = html.match(/外部発表[\s\S]*?(\d{4})\s*年度/i);
  if (topic) return Number(topic[1]);

  // 2) <title>外部発表2018年度 - ...</title>
  const title = html.match(/<title>\s*外部発表\s*(\d{4})\s*年度[\s\S]*?<\/title>/i);
  if (title) return Number(title[1]);

  // 3) file name fallback (e.g. 2018.htm)
  const m2 = fallbackName.match(/(\d{4})/);
  if (m2) return Number(m2[1]);

  // 4) image alt fallback
  const alt = html.match(/alt\s*=\s*["']\s*(\d{4})\s*年度\s*["']/i);
  if (alt) return Number(alt[1]);

  return null;
}

function extractSections(html) {
  const sections = [];

  const h3Re = /<h3\b[^>]*class\s*=\s*(["'])[^"']*\bh3-publications\b[^"']*\1[^>]*>([\s\S]*?)<\/h3>/gi;

  let h3Match;
  while ((h3Match = h3Re.exec(html))) {
    const title = normalizeText(htmlToText(h3Match[2]));
    const afterH3Idx = h3Re.lastIndex;

    // Find the next dl-publications after this h3
    const dlOpenRe = /<dl\b[^>]*class\s*=\s*(["'])[^"']*\bdl-publications\b[^"']*\1[^>]*>/gi;
    dlOpenRe.lastIndex = afterH3Idx;
    const dlOpen = dlOpenRe.exec(html);
    if (!dlOpen) continue;

    const dlStart = dlOpen.index;
    const dlBodyStart = dlOpenRe.lastIndex;
    const dlCloseIdx = html.indexOf('</dl>', dlBodyStart);
    if (dlCloseIdx === -1) continue;
    const dlInner = html.slice(dlBodyStart, dlCloseIdx);

    const entries = [];
    const tokenRe = /<(dt|dd)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let current = null;
    let token;
    while ((token = tokenRe.exec(dlInner))) {
      const tag = token[1].toLowerCase();
      const attrs = token[2] ?? '';
      const raw = token[3];
      if (tag === 'dt') {
        const hasBr = /<br\s*\/?>/i.test(raw);
        const dtText = hasBr ? normalizeMultilineText(htmlToText(raw)) : normalizeText(htmlToText(raw));
        if (!dtText) continue;
        const dtLinks = extractLinksFromHtml(raw);
        current = { dt: dtLinks.length ? { text: dtText, links: dtLinks } : dtText, dd: [] };
        entries.push(current);
      } else if (tag === 'dd') {
        if (!current) continue; // ignore stray dd before first dt
        const ddText = normalizeMultilineText(htmlToText(raw));
        if (!ddText) continue;
        const className = extractClassNameFromAttrs(attrs);
        const ddLinks = extractLinksFromHtml(raw);
        if (className || ddLinks.length) {
          current.dd.push({ text: ddText, ...(className ? { className } : {}), ...(ddLinks.length ? { links: ddLinks } : {}) });
        } else {
          current.dd.push(ddText);
        }
      }
    }

    sections.push({ title, entries });
  }

  return sections;
}

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const { inputDir, output, pretty } = parseArgs(process.argv.slice(2));
  const inputAbs = path.resolve(process.cwd(), inputDir);
  const outputAbs = path.resolve(process.cwd(), output);

  const entries = await fs.readdir(inputAbs, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.htm'))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, 'en'));

  if (files.length === 0) {
    console.log(`[extract-publications-json] No .htm files found in: ${inputAbs}`);
    return;
  }

  const years = [];
  for (const name of files) {
    const filePath = path.join(inputAbs, name);
    const html = await fs.readFile(filePath, 'utf8');

    const year = extractYear(html, name);
    if (!year) {
      console.warn(`[extract-publications-json] Skip (year not found): ${name}`);
      continue;
    }

    const sections = extractSections(html);
    years.push({ year, source: path.posix.join(inputDir.replace(/\\/g, '/'), name), sections });
  }

  // sort by year desc
  years.sort((a, b) => b.year - a.year);

  const data = {
    generatedAt: new Date().toISOString(),
    years,
  };

  await ensureDir(outputAbs);
  const json = pretty ? JSON.stringify(data, null, 2) + '\n' : JSON.stringify(data) + '\n';
  await fs.writeFile(outputAbs, json, 'utf8');

  console.log(`[extract-publications-json] Wrote: ${path.relative(process.cwd(), outputAbs)}`);
  console.log(`[extract-publications-json] Years: ${years.length} (latest: ${years[0]?.year ?? 'n/a'})`);
}

main().catch((err) => {
  console.error('[extract-publications-json] Failed:', err);
  process.exitCode = 1;
});

