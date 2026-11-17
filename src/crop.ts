// 画像登録時の切り抜き調整（v0.1.8）。
// 生成AIが横長・縦長の画像を出すことが多いため、登録時に正方形の範囲を選べるようにする。
// 考え方：正方形のビュー（画面上の表示領域）の中に画像を cover で置き、
// ドラッグで位置、ズームで大きさを変える。ビューからはみ出す余白は作らない
// （ズームの下限は「画像がビューをちょうど覆う」まで）。
// ここにあるのは表示サイズに依存しない純粋な計算と、Canvas への切り抜き適用だけ。

export interface CropViewState {
  zoom: number; // 1 = 画像の短辺がビューにちょうど収まる（cover の最小倍率）
  dx: number; // 画像の中心とビューの中心のずれ（ビュー表示px、右が正）
  dy: number; // 同上（下が正）
}

export interface SourceRect {
  x: number;
  y: number;
  side: number;
}

export const MAX_ZOOM = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** cover の基準倍率：画像の短辺がビューの一辺に一致する倍率 */
export function coverScale(viewSize: number, imgW: number, imgH: number): number {
  return viewSize / Math.min(imgW, imgH);
}

/** 既定は中央・ズーム1（短辺いっぱいの正方形） */
export function defaultCropState(): CropViewState {
  return { zoom: 1, dx: 0, dy: 0 };
}

/** ズームとずれを「画像がビューを常に覆う」範囲に丸める */
export function clampCropState(
  state: CropViewState, viewSize: number, imgW: number, imgH: number,
): CropViewState {
  const zoom = clamp(state.zoom, 1, MAX_ZOOM);
  const s = coverScale(viewSize, imgW, imgH) * zoom;
  const maxDx = Math.max(0, (imgW * s - viewSize) / 2);
  const maxDy = Math.max(0, (imgH * s - viewSize) / 2);
  return {
    zoom,
    dx: clamp(state.dx, -maxDx, maxDx),
    dy: clamp(state.dy, -maxDy, maxDy),
  };
}

/** ドラッグ（表示pxの移動量）を加える */
export function panCropState(
  state: CropViewState, ddx: number, ddy: number,
  viewSize: number, imgW: number, imgH: number,
): CropViewState {
  return clampCropState({ ...state, dx: state.dx + ddx, dy: state.dy + ddy }, viewSize, imgW, imgH);
}

/**
 * 表示上の点 (px, py)（ビューの左上原点）を中心に保ったままズームする。
 * スライダーはビューの中心、ピンチは2本指の中点を渡す想定。
 */
export function zoomCropStateAt(
  state: CropViewState, newZoom: number, px: number, py: number,
  viewSize: number, imgW: number, imgH: number,
): CropViewState {
  const zoom = clamp(newZoom, 1, MAX_ZOOM);
  const sOld = coverScale(viewSize, imgW, imgH) * state.zoom;
  const sNew = coverScale(viewSize, imgW, imgH) * zoom;
  // 点 (px,py) の下にある元画像の位置（画像中心からの相対、元画像px）
  const qx = (px - viewSize / 2 - state.dx) / sOld;
  const qy = (py - viewSize / 2 - state.dy) / sOld;
  // その位置が新しい倍率でも同じ表示点に来るよう中心のずれを解く
  const dx = px - viewSize / 2 - qx * sNew;
  const dy = py - viewSize / 2 - qy * sNew;
  return clampCropState({ zoom, dx, dy }, viewSize, imgW, imgH);
}

/** 現在の状態が切り取る、元画像上の正方形の範囲 */
export function cropSourceRect(
  state: CropViewState, viewSize: number, imgW: number, imgH: number,
): SourceRect {
  const s = coverScale(viewSize, imgW, imgH) * state.zoom;
  const side = viewSize / s;
  const x = imgW / 2 - state.dx / s - side / 2;
  const y = imgH / 2 - state.dy / s - side / 2;
  return { x, y, side };
}

/** 切り抜いた正方形を outSize × outSize の Canvas にして返す */
export function applyCrop(
  img: HTMLImageElement, rect: SourceRect, outSize = 1080,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, rect.x, rect.y, rect.side, rect.side, 0, 0, outSize, outSize);
  return canvas;
}
