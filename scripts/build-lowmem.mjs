import { spawnSync } from 'node:child_process';

// 低メモリ向けに astro build の minify を無効化する（astro.config.mjs 側が LOW_MEM_BUILD を参照）
const env = { ...process.env, LOW_MEM_BUILD: '1' };

// npm run build:lowmem -- --verbose のように渡された引数を、内部の npm run build に透過する
const forwardedArgs = process.argv.slice(2);
const result = spawnSync('npm', ['run', 'build', '--', ...forwardedArgs], {
  stdio: 'inherit',
  shell: true, // Windows(cmd)でも動かす
  env,
});

process.exit(result.status ?? 1);


