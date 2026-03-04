import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import iconv from 'iconv-lite';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    backup: true,
    dir: '.publications',
    encoding: 'shift_jis',
  };

  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--backup') args.backup = true;
    else if (a === '--no-backup') args.backup = false;
    else if (a.startsWith('--dir=')) args.dir = a.slice('--dir='.length);
    else if (a.startsWith('--encoding=')) args.encoding = a.slice('--encoding='.length);
  }
  return args;
}

function updateCharset(html) {
  // Update common Shift_JIS declarations to utf-8 (case-insensitive, tolerant of shift-jis/shift_jis).
  return html.replace(/charset\s*=\s*shift[\s_-]*jis/gi, 'charset=utf-8');
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { dryRun, backup, dir, encoding } = parseArgs(process.argv.slice(2));
  const targetDir = path.resolve(process.cwd(), dir);

  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.htm'))
    .map((e) => path.join(targetDir, e.name))
    .sort((a, b) => a.localeCompare(b, 'en'));

  if (files.length === 0) {
    console.log(`[convert-publications-to-utf8] No .htm files found in: ${targetDir}`);
    return;
  }

  console.log(`[convert-publications-to-utf8] Target dir: ${targetDir}`);
  console.log(
    `[convert-publications-to-utf8] Files: ${files.length} | encoding=${encoding} | backup=${backup} | dryRun=${dryRun}`
  );

  let converted = 0;
  for (const filePath of files) {
    const buf = await fs.readFile(filePath);
    const decoded = iconv.decode(buf, encoding);
    const updated = updateCharset(decoded);

    // Preserve original line endings as best-effort.
    const usesCrlf = decoded.includes('\r\n');
    const normalized = usesCrlf ? updated.replace(/\r?\n/g, '\r\n') : updated.replace(/\r?\n/g, '\n');

    const outBuf = Buffer.from(normalized, 'utf8');

    if (!dryRun) {
      if (backup) {
        const bakPath = `${filePath}.bak`;
        if (!(await fileExists(bakPath))) {
          await fs.writeFile(bakPath, buf);
        }
      }
      await fs.writeFile(filePath, outBuf);
    }

    converted += 1;
    console.log(`- ${path.relative(process.cwd(), filePath)} (${buf.length}B -> ${outBuf.length}B)`);
  }

  console.log(`[convert-publications-to-utf8] Done. Converted: ${converted}`);
  if (dryRun) {
    console.log('[convert-publications-to-utf8] Note: --dry-run was enabled, no files were written.');
  }
}

main().catch((err) => {
  console.error('[convert-publications-to-utf8] Failed:', err);
  process.exitCode = 1;
});

