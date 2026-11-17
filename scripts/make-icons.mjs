// アイコンの PNG を生成する: npm run icons（要 Playwright の Chromium）
// 正本は public/icons/icon.svg と icon-maskable.svg。PNG を直接編集しない。
// maskable と apple-touch-icon は全面塗り版（icon-maskable.svg）から作る
// （maskable は端末が外側を切り抜くため図柄を中央 80% に収めた版、
//  apple-touch-icon は iOS が角を丸めるため全面塗りにする。PWA テンプレートの作法）。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  // 手元の検証用プロジェクトから借りる（このリポジトリ単体では npm i -D playwright で入れる）
  ({ chromium } = require('/home/hatch/workspace/stb-flaky73/node_modules/playwright'));
}

const iconsDir = new URL('../public/icons/', import.meta.url).pathname;
const targets = [
  { svg: 'icon.svg', out: 'icon-192.png', size: 192, transparent: true },
  { svg: 'icon.svg', out: 'icon-512.png', size: 512, transparent: true },
  { svg: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512, transparent: false },
  { svg: 'icon-maskable.svg', out: 'apple-touch-icon.png', size: 180, transparent: false },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const t of targets) {
    const svg = readFileSync(iconsDir + t.svg, 'utf8');
    const html = `<!doctype html><body style="margin:0"><div id="icon" style="width:${t.size}px;height:${t.size}px">${svg.replace('<svg ', `<svg width="${t.size}" height="${t.size}" `)}</div></body>`;
    await page.setContent(html);
    const el = page.locator('#icon svg');
    await el.screenshot({ path: iconsDir + t.out, omitBackground: t.transparent });
    console.log('generated:', t.out);
  }
} finally {
  await browser.close();
}
