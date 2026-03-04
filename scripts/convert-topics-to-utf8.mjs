import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import iconv from 'iconv-lite';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    backup: false,
    dir: '.',
    encoding: 'shift_jis',
    globPrefix: 'topics',
  };

  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--backup') args.backup = true;
    else if (a === '--no-backup') args.backup = false;
    else if (a.startsWith('--dir=')) args.dir = a.slice('--dir='.length);
    else if (a.startsWith('--encoding=')) args.encoding = a.slice('--encoding='.length);
    else if (a.startsWith('--prefix=')) args.globPrefix = a.slice('--prefix='.length);
  }
  return args;
}

function updateCharset(html) {
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
  const { dryRun, backup, dir, encoding, globPrefix } = parseArgs(process.argv.slice(2));
  const targetDir = path.resolve(process.cwd(), dir);

  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().startsWith(globPrefix) && e.name.toLowerCase().endsWith('.htm'))
    .map((e) => path.join(targetDir, e.name))
    .sort((a, b) => a.localeCompare(b, 'en'));

  if (files.length === 0) {
    console.log(`[convert-topics-to-utf8] No topics*.htm files found in: ${targetDir}`);
    return;
  }

  console.log(`[convert-topics-to-utf8] Target dir: ${targetDir}`);
  console.log(
    `[convert-topics-to-utf8] Files: ${files.length} | encoding=${encoding} | backup=${backup} | dryRun=${dryRun}`
  );

  for (const filePath of files) {
    const buf = await fs.readFile(filePath);
    const decoded = iconv.decode(buf, encoding);
    const updated = updateCharset(decoded);

    // Preserve original line endings (best-effort).
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

    console.log(`- ${path.relative(process.cwd(), filePath)} (${buf.length}B -> ${outBuf.length}B)`);
  }

  console.log('[convert-topics-to-utf8] Done.');
  if (dryRun) {
    console.log('[convert-topics-to-utf8] Note: --dry-run was enabled, no files were written.');
  }
}

main().catch((err) => {
  console.error('[convert-topics-to-utf8] Failed:', err);
  process.exitCode = 1;
});

