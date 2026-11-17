/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// アプリ名・色はここと index.html の theme-color をそろえる（PWA テンプレートの作法）
const APP_NAME = '命式シール（仮）';
const THEME_COLOR = '#7b4b94';
const BACKGROUND_COLOR = '#fdf8ff';

export default defineConfig({
  // GitHub Pages のプロジェクトサイトでも動くよう相対ベースにする
  base: './',
  // 画面に表示するバージョン（package.json の version が元）
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    VitePWA({
      // 'prompt': 新版は待機させ、画面の「更新」ボタンで切り替える（勝手に切り替えない）
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: '四柱推命で分身キャラシールを作るアプリ',
        lang: 'ja',
        display: 'standalone',
        start_url: './',
        scope: './',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,mp3,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
