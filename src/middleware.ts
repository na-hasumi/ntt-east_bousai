import type { MiddlewareHandler } from 'astro';

/**
 * 開発環境で、ビルド成果物（.html / flatten 済み）と同じURLでもアクセスできるようにする。
 *
 * - 通常ページ: /foo.html -> /foo
 * - index系:    /publications/index.html -> /publications
 * - topics:     /topics2023.html -> /topics2023（dev は拡張子なしのため）
 *
 * NOTE:
 * - 本番では不要（本番は静的ファイルとして .html が存在する）
 * - dev はルーティングが拡張子なし基準のため、ここでは 302 リダイレクトで吸収する
 */
export const onRequest: MiddlewareHandler = async (context, next) => {
  if (!import.meta.env.DEV) return next();

  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // /xxx/index.html -> /xxx
  if (pathname.endsWith('/index.html')) {
    const nextPath = pathname.slice(0, -'/index.html'.length) || '/';
    if (nextPath !== pathname) {
      url.pathname = nextPath;
      return context.redirect(url.toString(), 302);
    }
  }

  // /xxx.html -> /xxx
  if (pathname.endsWith('.html')) {
    const nextPath = pathname.replace(/\.html$/i, '');
    if (nextPath !== pathname) {
      url.pathname = nextPath || '/';
      return context.redirect(url.toString(), 302);
    }
  }

  return next();
};

