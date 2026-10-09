// 3Dモデル（GLB）から製品セクションの回転フレームを書き出すスクリプト
//
// 使い方:
//   1. 現LPの3Dモデルを tools/turntable/model.glb として保存
//      https://shoenki.duct-noda.com/wp-content/uploads/2025/04/tripo_pbr_model_95e0715c-0842-41ff-9e3a-1b5cf42615b4.glb
//   2. npm i -D playwright（またはグローバルの playwright を使用）
//   3. node tools/turntable/render-frames.js
//   → tools/turntable/out/*.png（1200×1000・透過）が60枚出力されます。
//     トリミングとWebP変換をして assets/img/jl8a/00〜59.webp に置き換えてください。
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const dir = __dirname;
const N = 60;
// [角度(rad), 仰角(rad), カメラ距離, 露出, 幅, 高さ]
const frames = Array.from({ length: N }, (_, i) => [0.95 - 1.9 * i / (N - 1), 0.34 - 0.12 * i / (N - 1), 2.3, 1.0, 1200, 1000]);

const srv = http.createServer((q, r) => {
  const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    r.end(d);
  });
}).listen(0);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.error(e.message));
  await p.goto(`http://localhost:${srv.address().port}/render.html`);
  await p.evaluate(() => load('/model.glb'));
  const out = path.join(dir, 'out');
  fs.mkdirSync(out, { recursive: true });
  for (let i = 0; i < frames.length; i++) {
    const d = await p.evaluate(a => draw(...a), frames[i]);
    fs.writeFileSync(path.join(out, String(i).padStart(2, '0') + '.png'), Buffer.from(d.split(',')[1], 'base64'));
  }
  await b.close(); srv.close();
  console.log(`${frames.length} frames → ${out}`);
})();
