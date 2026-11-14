// 画像の取り込み（中央トリミング）とシール合成（Canvas）。
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

/** ファイルを読み込み、中央トリミングした正方形の HTMLImageElement を返す */
export function loadSquareImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像を読み込めませんでした'));
    img.src = url;
  });
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 生成画像＋名前帯＋レア度の星を合成したシール（Canvas）を返す */
export function composeSeal(img: HTMLImageElement, name: SealName): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // 背景とプリズム枠
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const prism = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  prism.addColorStop(0, '#ff9a9e'); prism.addColorStop(0.3, '#fbc2eb');
  prism.addColorStop(0.55, '#a6c1ee'); prism.addColorStop(0.8, '#fdfbfb');
  prism.addColorStop(1, '#f6d365');
  ctx.fillStyle = prism;
  roundRectPath(ctx, 10, 10, SIZE - 20, SIZE - 20, 64);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRectPath(ctx, 34, 34, SIZE - 68, SIZE - 68, 48);
  ctx.fill();

  // 名前帯（上部）
  const bandH = 196;
  ctx.save();
  roundRectPath(ctx, 34, 34, SIZE - 68, bandH, 48);
  ctx.clip();
  ctx.fillStyle = ELEMENT_COLOR[name.mainColor];
  ctx.fillRect(34, 34, SIZE - 68, bandH);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.font = '500 40px "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';
  ctx.fillText(name.prefix, SIZE / 2, 108);
  ctx.font = '700 74px "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';
  const mainLine = name.postfix ? `${name.nickname}・${name.postfix}` : name.nickname;
  ctx.fillText(mainLine, SIZE / 2, 196, SIZE - 140);
  ctx.restore();

  // 生成画像（中央トリミング）
  const imgY = 34 + bandH;
  const imgH = 950 - imgY;
  ctx.save();
  roundRectPath(ctx, 34, imgY, SIZE - 68, imgH, 24);
  ctx.clip();
  const scale = Math.max((SIZE - 68) / img.naturalWidth, imgH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, 34 + (SIZE - 68 - w) / 2, imgY + (imgH - h) / 2, w, h);
  ctx.restore();

  // 下部：レア度の星
  ctx.textAlign = 'center';
  ctx.font = '64px sans-serif';
  ctx.fillStyle = '#e6a800';
  const stars = '★'.repeat(name.stars) + '☆'.repeat(5 - name.stars);
  ctx.fillText(stars, SIZE / 2, 1032);
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
