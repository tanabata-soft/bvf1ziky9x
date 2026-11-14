// 画像の取り込み（トリミングなし）とシール合成（Canvas）。
// v0.1.1: 絵を切らない「はめ込み（contain）」方式。名前帯を細くし、絵の面積を最大化。
// v0.1.2: レア度は星で出さず、枠・ホロの「派手さ」3段階で表す（オーナー決定 2026-11-15）。
//   ふつう＝細めの色枠・ホロ控えめ／キラ＝プリズム枠・星屑／大当たり＝金色の太枠・強いプリズム・枠の装飾模様。
import { ELEMENT_COLOR } from './texts';
import type { Element, GlamourTier } from './fortune';

export interface SealName {
  prefix: string;
  nickname: string;
  postfix: string; // '' のときは付けない（既定は付けない）
  tier: GlamourTier;
  mainColor: Element;
}

const SIZE = 1080;
// 名前帯：上部に細く（プレフィックス小＋名前大の2段）
const BAND_H = 104;

// 段階ごとの枠まわりの寸法（outer=外枠の外側、inner=内側の白地の開始位置。差が枠の太さ）
const FRAME: Record<GlamourTier, { outer: number; inner: number }> = {
  normal: { outer: 10, inner: 28 }, // 細め（18px）
  kira: { outer: 10, inner: 30 }, // 標準（20px）
  jackpot: { outer: 6, inner: 50 }, // 太枠（44px）
};

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

function goldGradient(ctx: CanvasRenderingContext2D): CanvasGradient {
  const gold = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  gold.addColorStop(0, '#a87400'); gold.addColorStop(0.25, '#f6d365');
  gold.addColorStop(0.5, '#fff6c9'); gold.addColorStop(0.75, '#d4a017');
  gold.addColorStop(1, '#a87400');
  return gold;
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

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

/** 大当たりの金枠に沿って装飾（星屑とダイヤ）を並べる */
function drawFrameOrnaments(ctx: CanvasRenderingContext2D, outer: number, inner: number) {
  const mid = (outer + inner) / 2;
  const r = Math.max(7, (inner - outer) * 0.26);
  const step = 92;
  let i = 0;
  const put = (x: number, y: number) => {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      drawSparkle(ctx, x, y, r);
    } else {
      ctx.fillStyle = '#fff3b0';
      drawDiamond(ctx, x, y, r * 0.8);
    }
    i++;
  };
  for (let x = outer + 56; x <= SIZE - outer - 56; x += step) put(x, mid);
  for (let x = outer + 56; x <= SIZE - outer - 56; x += step) put(x, SIZE - mid);
  for (let y = outer + 56 + step / 2; y <= SIZE - outer - 56; y += step) put(mid, y);
  for (let y = outer + 56 + step / 2; y <= SIZE - outer - 56; y += step) put(SIZE - mid, y);
}

/** 生成画像＋名前帯を合成したシール（Canvas）を返す。レア度は枠の派手さで表し、星は描かない */
export function composeSeal(img: HTMLImageElement, name: SealName): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  const { outer, inner: IN } = FRAME[name.tier];
  const IN_SIZE = SIZE - IN * 2;
  const IMG_Y = IN + BAND_H + 8;
  const IMG_H = IN + IN_SIZE - IMG_Y;

  // 背景と外枠（段階で色・太さ・装飾が変わる）
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  if (name.tier === 'jackpot') ctx.fillStyle = goldGradient(ctx);
  else if (name.tier === 'kira') ctx.fillStyle = prismGradient(ctx);
  else ctx.fillStyle = ELEMENT_COLOR[name.mainColor];
  roundRectPath(ctx, outer, outer, SIZE - outer * 2, SIZE - outer * 2, 64);
  ctx.fill();
  if (name.tier === 'jackpot') drawFrameOrnaments(ctx, outer, IN);
  ctx.fillStyle = '#ffffff';
  roundRectPath(ctx, IN, IN, IN_SIZE, IN_SIZE, 48);
  ctx.fill();

  // 絵の領域：余白は段階に応じた地で埋め、絵は全体が収まるよう contain で置く
  ctx.save();
  roundRectPath(ctx, IN, IMG_Y, IN_SIZE, IMG_H, 26);
  ctx.clip();
  if (name.tier === 'normal') {
    ctx.fillStyle = '#fbfbff';
    ctx.fillRect(IN, IMG_Y, IN_SIZE, IMG_H);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = prismGradient(ctx);
    ctx.fillRect(IN, IMG_Y, IN_SIZE, IMG_H);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffffff';
    for (const [fx, fy, r] of SPARKLES.slice(0, 4)) {
      drawSparkle(ctx, IN + fx * IN_SIZE, IMG_Y + fy * IMG_H, r);
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = prismGradient(ctx);
    ctx.fillRect(IN, IMG_Y, IN_SIZE, IMG_H);
    if (name.tier === 'jackpot') {
      const glow = ctx.createRadialGradient(SIZE / 2, IMG_Y + IMG_H / 2, 80, SIZE / 2, IMG_Y + IMG_H / 2, IMG_H * 0.75);
      glow.addColorStop(0, 'rgba(255,255,255,0.5)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(IN, IMG_Y, IN_SIZE, IMG_H);
    }
    ctx.fillStyle = name.tier === 'jackpot' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)';
    for (const [fx, fy, r] of SPARKLES) {
      drawSparkle(ctx, IN + fx * IN_SIZE, IMG_Y + fy * IMG_H, r);
    }
    if (name.tier === 'jackpot') {
      ctx.fillStyle = 'rgba(255,246,201,0.75)';
      for (const [fx, fy, r] of SPARKLES) {
        drawSparkle(ctx, IN + ((fx + 0.37) % 1) * IN_SIZE, IMG_Y + ((fy + 0.43) % 1) * IMG_H, r * 0.55);
      }
    }
  }
  const scale = Math.min(IN_SIZE / img.naturalWidth, IMG_H / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, IN + (IN_SIZE - w) / 2, IMG_Y + (IMG_H - h) / 2, w, h);
  ctx.restore();

  // 名前帯（上部・細く）。基本形はプレフィックス＋ニックネーム。ポストフィックスは任意
  ctx.save();
  roundRectPath(ctx, IN, IN, IN_SIZE, BAND_H, 36);
  ctx.clip();
  ctx.fillStyle = ELEMENT_COLOR[name.mainColor];
  ctx.fillRect(IN, IN, IN_SIZE, BAND_H);
  if (name.tier === 'jackpot') {
    ctx.fillStyle = goldGradient(ctx);
    ctx.fillRect(IN, IN + BAND_H - 6, IN_SIZE, 6);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.font = '500 30px "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';
  ctx.fillText(name.prefix, SIZE / 2, IN + 42);
  ctx.font = '700 56px "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';
  const mainLine = name.postfix ? `${name.nickname}・${name.postfix}` : name.nickname;
  ctx.fillText(mainLine, SIZE / 2, IN + BAND_H - 12, IN_SIZE - 40);
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
