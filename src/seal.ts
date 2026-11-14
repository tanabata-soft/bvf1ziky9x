// 画像の取り込み（トリミングなし）とシール合成（Canvas）。
// v0.1.1: 絵を切らない「はめ込み（contain）」方式に変更し、名前帯を細く、
// 星は帯の中に収めて、絵の面積を最大化するレイアウトにした。
import { ELEMENT_COLOR } from './texts';
import type { Element } from './fortune';

export interface SealName {
  prefix: string;
  nickname: string;
  postfix: string;
  stars: number;
  mainColor: Element;
}

const SIZE = 1080;
// 内側（白地）の範囲
const IN = 30;
const IN_SIZE = SIZE - IN * 2; // 1020
// 名前帯：上部に細く（プレフィックス小＋名前大の2段は維持）
const BAND_H = 104;
// 絵の領域：帯の下から内側の下端まで全部
const IMG_Y = IN + BAND_H + 8; // 142
const IMG_H = IN + IN_SIZE - IMG_Y; // 908

/** ファイルを読み込み、HTMLImageElement を返す（トリミングはしない） */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像を読み込めませんでした'));
    img.src = url;
  });
}

/** @deprecated 旧名。loadImage を使うこと */
export const loadSquareImage = loadImage;

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function prismGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
  const prism = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  prism.addColorStop(0, '#ff9a9e'); prism.addColorStop(0.3, '#fbc2eb');
  prism.addColorStop(0.55, '#a6c1ee'); prism.addColorStop(0.8, '#fdfbfb');
  prism.addColorStop(1, '#f6d365');
  return prism;
}

// 余白を埋めるプリズム地に散らす星屑（位置は固定して再現性を保つ）
const SPARKLES: [number, number, number][] = [
  [0.06, 0.10, 13], [0.93, 0.08, 11], [0.05, 0.55, 10], [0.95, 0.48, 13],
  [0.07, 0.88, 11], [0.94, 0.90, 10], [0.50, 0.04, 9], [0.20, 0.95, 9],
  [0.80, 0.96, 11], [0.03, 0.30, 8], [0.97, 0.72, 8], [0.30, 0.06, 8],
];

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
}

/** 生成画像＋名前帯＋レア度の星を合成したシール（Canvas）を返す */
export function composeSeal(img: HTMLImageElement, name: SealName): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // 背景とプリズム枠（外枠は従来どおり）
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = prismGradient(ctx);
  roundRectPath(ctx, 10, 10, SIZE - 20, SIZE - 20, 64);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRectPath(ctx, IN, IN, IN_SIZE, IN_SIZE, 48);
  ctx.fill();

  // 絵の領域：余白はプリズム地＋星屑で埋め、絵は全体が収まるよう contain で置く
  ctx.save();
  roundRectPath(ctx, IN, IMG_Y, IN_SIZE, IMG_H, 26);
  ctx.clip();
  ctx.fillStyle = prismGradient(ctx);
  ctx.fillRect(IN, IMG_Y, IN_SIZE, IMG_H);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const [fx, fy, r] of SPARKLES) {
    drawSparkle(ctx, IN + fx * IN_SIZE, IMG_Y + fy * IMG_H, r);
  }
  const scale = Math.min(IN_SIZE / img.naturalWidth, IMG_H / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, IN + (IN_SIZE - w) / 2, IMG_Y + (IMG_H - h) / 2, w, h);
  ctx.restore();

  // 名前帯（上部・細く）。星は帯の右端（プレフィックスの行）に小さく収める
  ctx.save();
  roundRectPath(ctx, IN, IN, IN_SIZE, BAND_H, 36);
  ctx.clip();
  ctx.fillStyle = ELEMENT_COLOR[name.mainColor];
  ctx.fillRect(IN, IN, IN_SIZE, BAND_H);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.font = '500 30px "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';
  ctx.fillText(name.prefix, SIZE / 2, IN + 42);
  ctx.font = '700 56px "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';
  const mainLine = name.postfix ? `${name.nickname}・${name.postfix}` : name.nickname;
  ctx.fillText(mainLine, SIZE / 2, IN + BAND_H - 12, IN_SIZE - 120);
  // レア度の星（帯の中、右上）
  ctx.textAlign = 'right';
  ctx.font = '28px sans-serif';
  ctx.shadowColor = 'rgba(60,30,0,0.45)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#ffe066';
  const stars = '★'.repeat(name.stars) + '☆'.repeat(5 - name.stars);
  ctx.fillText(stars, IN + IN_SIZE - 16, IN + 44);
  ctx.restore();

  return canvas;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.88);
}

/** シール画像のダウンロード／共有 */
export async function exportSeal(dataUrl: string, filename: string): Promise<void> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: 'image/jpeg' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
    throw new Error('share unavailable');
  } catch {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }
}
