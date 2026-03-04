#!/usr/bin/env node
/**
 * public/images 直下（デフォルト）の画像について、src/ 内で参照されていないファイルを検出し、
 * --delete 指定時のみ削除します（デフォルトはdry-run）。
 *
 * 使い方:
 *   node scripts/cleanup-unused-public-images.mjs
 *   node scripts/cleanup-unused-public-images.mjs --delete
 *   node scripts/cleanup-unused-public-images.mjs --include-subdirs
 *
 * オプション:
 *   --delete            : 実際に削除する（指定がない場合は削除しない）
 *   --include-subdirs   : public/images 配下を再帰的に対象にする（指定がない場合は直下のみ）
 *   --verbose           : 詳細ログ
 *   --report <path>     : 結果JSONを書き出す
 */

import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
  ".bmp",
  ".ico",
]);

function parseArgs(argv) {
  const args = {
    delete: false,
    includeSubdirs: false,
    verbose: false,
    report: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--delete") args.delete = true;
    else if (a === "--include-subdirs") args.includeSubdirs = true;
    else if (a === "--verbose") args.verbose = true;
    else if (a === "--report") {
      args.report = argv[i + 1] ?? null;
      i++;
    }
  }
  return args;
}

async function* walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walkFiles(full);
    } else if (ent.isFile()) {
      yield full;
    }
  }
}

async function listTargetImages(imagesDir, includeSubdirs) {
  const targets = [];
  if (includeSubdirs) {
    for await (const file of walkFiles(imagesDir)) {
      const ext = path.extname(file).toLowerCase();
      if (IMAGE_EXTS.has(ext)) targets.push(file);
    }
    return targets;
  }

  const entries = await fs.readdir(imagesDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    targets.push(path.join(imagesDir, ent.name));
  }
  return targets;
}

async function listSrcTextFiles(srcDir) {
  const allowExts = new Set([
    ".astro",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".css",
    ".scss",
    ".sass",
    ".md",
    ".mjs",
    ".cjs",
  ]);
  const out = [];
  for await (const file of walkFiles(srcDir)) {
    const ext = path.extname(file).toLowerCase();
    if (!allowExts.has(ext)) continue;
    out.push(file);
  }
  return out;
}

function buildFilenameRegex() {
  // 拡張子の大小を吸収し、クエリ文字列 (?v=...) が続いてもファイル名部分だけ拾えるようにする
  const exts = Array.from(IMAGE_EXTS)
    .map((e) => e.replace(".", ""))
    .join("|");
  // ファイル名として現れやすい文字だけに絞る（誤検出を少し抑える）
  return new RegExp(
    String.raw`([A-Za-z0-9][A-Za-z0-9._%+\-]*\.(?:${exts}))(?=[^A-Za-z0-9._%+\-]|$)`,
    "gi",
  );
}

async function collectUsedImageBasenames(srcFiles, { verbose }) {
  const used = new Set();
  const re = buildFilenameRegex();

  for (const f of srcFiles) {
    let text;
    try {
      text = await fs.readFile(f, "utf8");
    } catch (e) {
      if (verbose) console.warn(`[skip] read failed: ${f}`);
      continue;
    }

    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const filename = m[1];
      used.add(filename.toLowerCase());
    }
  }
  return used;
}

function toPosixRelative(fromDir, fullPath) {
  return path.relative(fromDir, fullPath).split(path.sep).join("/");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();

  const imagesDir = path.join(repoRoot, "public", "images");
  const srcDir = path.join(repoRoot, "src");

  const [targetImages, srcFiles] = await Promise.all([
    listTargetImages(imagesDir, args.includeSubdirs),
    listSrcTextFiles(srcDir),
  ]);

  const usedBasenames = await collectUsedImageBasenames(srcFiles, {
    verbose: args.verbose,
  });

  const report = {
    options: args,
    repoRoot,
    imagesDir,
    srcDir,
    scannedSrcFiles: srcFiles.length,
    targetImages: targetImages.length,
    used: [],
    unused: [],
    deleted: [],
  };

  for (const imgPath of targetImages) {
    const base = path.basename(imgPath).toLowerCase();
    const rel = toPosixRelative(repoRoot, imgPath);

    if (usedBasenames.has(base)) {
      report.used.push(rel);
    } else {
      report.unused.push(rel);
    }
  }

  report.used.sort();
  report.unused.sort();

  console.log(
    `[public/images cleanup] targets=${report.targetImages}, used=${report.used.length}, unused=${report.unused.length}, scannedSrcFiles=${report.scannedSrcFiles}`,
  );

  if (report.unused.length) {
    console.log("\n[unused candidates]");
    for (const f of report.unused) console.log(`- ${f}`);
  }

  if (args.delete) {
    for (const rel of report.unused) {
      const abs = path.join(repoRoot, rel);
      try {
        await fs.unlink(abs);
        report.deleted.push(rel);
        if (args.verbose) console.log(`[deleted] ${rel}`);
      } catch (e) {
        console.warn(`[warn] failed to delete: ${rel}`);
      }
    }
    console.log(`\n[delete] deleted=${report.deleted.length}`);
  } else {
    console.log(
      `\n[dry-run] 削除は行っていません。削除する場合は --delete を付けて実行してください。`,
    );
  }

  if (args.report) {
    const outPath = path.isAbsolute(args.report)
      ? args.report
      : path.join(repoRoot, args.report);
    await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`\n[report] wrote: ${toPosixRelative(repoRoot, outPath)}`);
  }
}

await main();



