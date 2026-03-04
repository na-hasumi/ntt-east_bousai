const { spawn } = require('child_process');
const os = require('os');

// ローカルIPアドレスを取得する関数
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4で、内部（非ループバック）アドレスを取得
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const port = process.env.PORT || 3000;

console.log('\n🚀 Next.js 開発サーバーを起動中...\n');
console.log(`┃ Local:    http://localhost:${port}`);
console.log(`┃ Network:  http://${localIP}:${port}\n`);

// 環境変数PORTがあればそれを使用
const args = ['next', 'dev'];
if (process.env.PORT) {
  args.push('-p', process.env.PORT);
}

// next dev を起動
const nextDev = spawn('npx', args, {
  stdio: 'inherit',
  shell: true
});

nextDev.on('error', (error) => {
  console.error('エラーが発生しました:', error);
  process.exit(1);
});

nextDev.on('close', (code) => {
  process.exit(code);
});

