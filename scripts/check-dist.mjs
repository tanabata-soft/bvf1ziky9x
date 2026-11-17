// ビルド成果物（dist/）が PWA として成立しているかを確認する: npm run build のあとに実行
// PWA テンプレート（mmishina-art/pwa-template）の scripts/check-dist.mjs をこのアプリ向けにしたもの。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const errors = [];
const need = (cond, msg) => { if (!cond) errors.push(msg); };

need(existsSync(join(dist, 'index.html')), 'dist/index.html がありません（先に npm run build）');
need(existsSync(join(dist, 'sw.js')), 'dist/sw.js（Service Worker）がありません');

const manifestPath = join(dist, 'manifest.webmanifest');
if (!existsSync(manifestPath)) {
  errors.push('dist/manifest.webmanifest がありません');
} else {
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  need(m.lang === 'ja', 'manifest: lang が ja ではありません');
  need(m.display === 'standalone', 'manifest: display が standalone ではありません');
  need(m.start_url === './' && m.scope === './', 'manifest: start_url / scope は ./ にしてください');
  need(m.name && m.short_name, 'manifest: name / short_name がありません');
  // テンプレートの仮名が残っていないこと（このアプリの名前であること）を実測で確かめる
  need(m.name === '命式シール（仮）', `manifest: name が「命式シール（仮）」ではありません: ${m.name}`);
  need(m.short_name === '命式シール（仮）', `manifest: short_name が「命式シール（仮）」ではありません: ${m.short_name}`);
  need(!/テンプレート|PWAアプリ/.test(`${m.name} ${m.short_name}`), 'manifest: テンプレートの仮名が残っています');
  need(m.theme_color && m.background_color, 'manifest: theme_color / background_color がありません');
  need(m.theme_color === '#7b4b94', `manifest: theme_color が index.html とそろっていません: ${m.theme_color}`);
  const icons = m.icons ?? [];
  need(icons.some((i) => i.sizes === '192x192'), 'manifest: 192x192 のアイコンがありません');
  need(icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'), 'manifest: 512x512 (any) のアイコンがありません');
  need(icons.some((i) => i.purpose === 'maskable'), 'manifest: maskable アイコンがありません');
  for (const i of icons) need(existsSync(join(dist, i.src)), `manifest が参照するアイコンが dist にありません: ${i.src}`);
}

// Service Worker が vite-plugin-pwa（Workbox）の自動生成であること
const sw = existsSync(join(dist, 'sw.js')) ? readFileSync(join(dist, 'sw.js'), 'utf8') : '';
need(/precacheAndRoute/.test(sw), 'sw.js が Workbox の自動生成（precacheAndRoute）ではありません');

// コメント内の文言で誤検知しないよう、HTML コメントは除く
const html = (existsSync(join(dist, 'index.html')) ? readFileSync(join(dist, 'index.html'), 'utf8') : '').replace(/<!--[\s\S]*?-->/g, '');
for (const [re, label] of [
  [/rel="manifest"/, 'link rel=manifest'],
  [/name="theme-color"/, 'meta theme-color'],
  [/rel="apple-touch-icon"/, 'apple-touch-icon'],
  [/viewport-fit=cover/, 'viewport-fit=cover'],
]) need(re.test(html), `index.html に ${label} がありません`);
need(/id="update-banner"/.test(html) && /id="update-button"/.test(html) && /id="update-later"/.test(html), '更新バナー（#update-banner / #update-button / #update-later）がありません');
need(!/user-scalable=no|maximum-scale/.test(html), 'viewport で拡大を禁止しないでください（user-scalable=no / maximum-scale）');
need(!/(?:src|href)="\/(?!\/)/.test(html), 'index.html に絶対パス（/ から始まる参照）があります。相対パスにしてください');
// 手書き時代のファイルが残っていないこと
need(!existsSync(join(dist, 'icon.svg')), 'dist 直下に旧 icon.svg が残っています（icons/ 配下が正）');

// 外部の URL（CDN・Web フォントなど）が成果物に入っていないか。外部に頼るとオフラインで動かなくなる。
const ALLOWED_URL = [/^https?:\/\/www\.w3\.org\//, /^https:\/\/bit\.ly\/wb-precache$/];
const TEXT_FILE = /\.(?:html|js|css|webmanifest|json)$/;
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
if (existsSync(dist)) {
  for (const file of walk(dist).filter((p) => TEXT_FILE.test(p))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
      if (!ALLOWED_URL.some((re) => re.test(m[0]))) errors.push(`${relative(dist, file)} に外部の URL があります: ${m[0]}`);
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log('✓ dist は PWA として成立しています');
