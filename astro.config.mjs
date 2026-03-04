// @ts-check
import { BASE_HOST, BASE_DIR } from './src/consts.js';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// path
const baseUrl = BASE_HOST + BASE_DIR;

// 低メモリビルド用フラグ（minify を抑制して esbuild のメモリ消費を下げる）
// cmd:  set LOW_MEM_BUILD=1 && npm run build
// pwsh: $env:LOW_MEM_BUILD="1"; npm run build
const LOW_MEM_BUILD = process.env.LOW_MEM_BUILD === '1';


// SCSS変数ファイルを生成するプラグイン
const generateScssVariables = () => {
  return {
    name: 'generate-scss-variables',
    buildStart() {
      const variablesContent = `// 動的に生成される変数ファイル
      // このファイルはビルド時にastro.config.mjsの設定から生成されます
      $app-base-path: '${BASE_DIR}';`;
      const variablesPath = path.resolve('./src/styles/global/_variables.scss');
      fs.writeFileSync(variablesPath, variablesContent);
    }
  };
};

// documentsディレクトリ構造をフラット化するインテグレーション
// documents/xxx/index.html -> documents/xxx.html
const flattenDocuments = () => {
  return {
    name: 'flatten-documents',
    hooks: {
      'astro:build:done': async (/** @type {{ dir: URL }} */ { dir }) => {
        const distDir = fileURLToPath(dir);
        const documentsDir = path.join(distDir, 'documents');
        
        if (fs.existsSync(documentsDir)) {
          const items = fs.readdirSync(documentsDir, { withFileTypes: true });
          
          for (const item of items) {
            if (item.isDirectory()) {
              const dirPath = path.join(documentsDir, item.name);
              const indexHtmlPath = path.join(dirPath, 'index.html');
              
              if (fs.existsSync(indexHtmlPath)) {
                const newFilePath = path.join(documentsDir, `${item.name}.html`);
                fs.renameSync(indexHtmlPath, newFilePath);
                try {
                  fs.rmdirSync(dirPath);
                  console.log(`Flattened: ${item.name}/index.html -> ${item.name}.html`);
                } catch (e) {
                  // ディレクトリが空でない場合は警告だけ出して残す
                  console.warn(`Directory not empty, skipped removal: ${dirPath}`);
                }
              }
            }
          }
        }
      }
    }
  };
};

// publicationsディレクトリ構造をフラット化するインテグレーション
// publications/2023/index.html -> publications/2023.html
const flattenPublications = () => {
  return {
    name: 'flatten-publications',
    hooks: {
      'astro:build:done': async (/** @type {{ dir: URL }} */ { dir }) => {
        const distDir = fileURLToPath(dir);
        const publicationsDir = path.join(distDir, 'publications');

        if (fs.existsSync(publicationsDir)) {
          const items = fs.readdirSync(publicationsDir, { withFileTypes: true });

          for (const item of items) {
            if (item.isDirectory()) {
              const dirPath = path.join(publicationsDir, item.name);
              const indexHtmlPath = path.join(dirPath, 'index.html');

              if (fs.existsSync(indexHtmlPath)) {
                const newFilePath = path.join(publicationsDir, `${item.name}.html`);
                fs.renameSync(indexHtmlPath, newFilePath);
                try {
                  fs.rmdirSync(dirPath);
                  console.log(`Flattened: publications/${item.name}/index.html -> publications/${item.name}.html`);
                } catch (e) {
                  // ディレクトリが空でない場合は警告だけ出して残す
                  console.warn(`Directory not empty, skipped removal: ${dirPath}`);
                }
              }
            }
          }
        }
      }
    }
  };
};

// build.format='file' のとき、src/pages/**/index.astro に対応する出力を
// dist/xxx.html -> dist/xxx/index.html に移動する（例外的に index.html 形式が欲しいケース用）
const moveIndexRoutesToDirectory = () => {
  return {
    name: 'move-index-routes-to-directory',
    hooks: {
      'astro:build:done': async (/** @type {{ dir: URL }} */ { dir }) => {
        const distDir = fileURLToPath(dir);
        const pagesRoot = path.resolve('./src/pages');

        /** @param {string} current */
        const walkPages = (current) => {
          const entries = fs.readdirSync(current, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
              walkPages(fullPath);
              continue;
            }
            if (!entry.isFile()) continue;
            if (entry.name !== 'index.astro') continue;

            const rel = path.relative(pagesRoot, fullPath);
            const relPosix = rel.split(path.sep).join('/');
            // "service/index.astro" -> "service"
            const routeDir = relPosix.replace(/\/index\.astro$/, '');
            if (!routeDir) continue; // root (src/pages/index.astro) はそのまま dist/index.html

            const from = path.join(distDir, `${routeDir}.html`);
            const toDir = path.join(distDir, routeDir);
            const to = path.join(toDir, 'index.html');

            if (fs.existsSync(from)) {
              fs.mkdirSync(toDir, { recursive: true });
              fs.renameSync(from, to);
              console.log(`Index route: ${routeDir}.html -> ${routeDir}/index.html`);
            }
          }
        };

        walkPages(pagesRoot);
      },
    },
  };
};

// https://astro.build/config
export default defineConfig({
  site: baseUrl,
  outDir: './dist' + BASE_DIR,
  base: BASE_DIR,
  compressHTML: false,
  // *.astro -> *.html の「ファイル形式」で出力する（/xxx/index.html ではなく /xxx.html）
  // 例: src/pages/analysis/automobile.astro -> dist/analysis/automobile.html
  build: {
    format: 'file',
  },
  // 末尾スラッシュURLを避け、/xxx.html に寄せる（リンクは「気にしない」でOKとのことだが整合のため）
  trailingSlash: 'ignore',
  integrations: [
    sitemap(),
    flattenDocuments(),
    flattenPublications(),
    moveIndexRoutesToDirectory(),
  ],
  scopedStyleStrategy: 'class', //CSSスコープの方法
  devToolbar: {
    enabled: false// Astro Dev Toolbar（メニューバー）を非表示
  },
  vite: {
    plugins: [generateScssVariables()],
    resolve: {
      alias: {
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@styles': '/src/styles',
        '@scripts': '/src/scripts',
        '@pages': '/src/pages',
      }
    },
    ...(LOW_MEM_BUILD
      ? {
          // NOTE: 画質/機能を変えずに最も効くのが minify 無効化（生成物は大きくなる）
          // JS minify / CSS minify のどちらも esbuild 経由でメモリを食うことがある
          build: {
            minify: false,
            cssMinify: false,
            sourcemap: false,
          },
        }
      : {}),
    css: {
      preprocessorOptions: {
        scss: {
          // Sass 側が確実に解決できる探索パス（@use "global" など）
          // ※ Vite の resolve.alias（@styles など）は Sass の @use/@forward では効かないことがある
          // Vite / Sass のバージョン差分で `includePaths` / `loadPaths` のどちらが使われるかが変わるため両方設定する
          includePaths: ['src/styles'],
          loadPaths: ['src/styles'],
          additionalData: `
            @use "sass:math";
            @use "sass:map";
            // Vite が確実に解決できる絶対パス形式にする（相対解決で /src/styles/program/... に寄るのを防ぐ）
            @use "/src/styles/global/index" as g;
          `
        }
      }
    }
  }
});
