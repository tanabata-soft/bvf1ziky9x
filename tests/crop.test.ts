import { describe, it, expect } from 'vitest';
import {
  defaultCropState, clampCropState, panCropState, zoomCropStateAt,
  cropSourceRect, coverScale, MAX_ZOOM,
} from '../src/crop';

// v0.1.8: 切り抜き計算（ビューは正方形、画像は cover で置く前提）
const VIEW = 640;
const W = 1260; // オーナー実例の横長画像サイズ
const H = 703;

describe('切り抜き計算', () => {
  it('既定は中央で、短辺いっぱいの正方形を切り取る', () => {
    const rect = cropSourceRect(defaultCropState(), VIEW, W, H);
    expect(rect.side).toBeCloseTo(H, 5);
    expect(rect.x).toBeCloseTo((W - H) / 2, 5);
    expect(rect.y).toBeCloseTo(0, 5);
  });

  it('cover倍率は短辺基準', () => {
    expect(coverScale(VIEW, W, H)).toBeCloseTo(VIEW / H, 8);
    expect(coverScale(VIEW, H, W)).toBeCloseTo(VIEW / H, 8);
  });

  it('どれだけドラッグしても切り抜き範囲は画像の外に出ない', () => {
    for (const [ddx, ddy] of [[100000, 0], [-100000, 0], [0, 100000], [0, -100000], [9999, 9999]] as const) {
      const st = panCropState(defaultCropState(), ddx, ddy, VIEW, W, H);
      const rect = cropSourceRect(st, VIEW, W, H);
      expect(rect.x).toBeGreaterThanOrEqual(-1e-6);
      expect(rect.y).toBeGreaterThanOrEqual(-1e-6);
      expect(rect.x + rect.side).toBeLessThanOrEqual(W + 1e-6);
      expect(rect.y + rect.side).toBeLessThanOrEqual(H + 1e-6);
    }
  });

  it('ズームすると切り抜き範囲は小さくなり、ズーム1未満にはならない', () => {
    const z2 = zoomCropStateAt(defaultCropState(), 2, VIEW / 2, VIEW / 2, VIEW, W, H);
    expect(cropSourceRect(z2, VIEW, W, H).side).toBeCloseTo(H / 2, 5);
    const zHalf = zoomCropStateAt(defaultCropState(), 0.5, VIEW / 2, VIEW / 2, VIEW, W, H);
    expect(zHalf.zoom).toBe(1);
    expect(cropSourceRect(zHalf, VIEW, W, H).side).toBeCloseTo(H, 5);
    const zHuge = zoomCropStateAt(defaultCropState(), 1000, VIEW / 2, VIEW / 2, VIEW, W, H);
    expect(zHuge.zoom).toBe(MAX_ZOOM);
  });

  it('ズームの中心点の下にある画像の位置は動かない', () => {
    const before = defaultCropState();
    const px = 200; const py = 480;
    const s0 = coverScale(VIEW, W, H) * before.zoom;
    const qx = (px - VIEW / 2 - before.dx) / s0;
    const qy = (py - VIEW / 2 - before.dy) / s0;
    const after = zoomCropStateAt(before, 1.8, px, py, VIEW, W, H);
    const s1 = coverScale(VIEW, W, H) * after.zoom;
    expect(px - VIEW / 2 - after.dx).toBeCloseTo(qx * s1, 5);
    expect(py - VIEW / 2 - after.dy).toBeCloseTo(qy * s1, 5);
  });

  it('ズーム後に端へ寄せても範囲は画像内に収まる', () => {
    const z = zoomCropStateAt(defaultCropState(), 3, VIEW / 2, VIEW / 2, VIEW, W, H);
    const st = panCropState(z, -100000, -100000, VIEW, W, H);
    const rect = cropSourceRect(st, VIEW, W, H);
    expect(rect.x).toBeGreaterThanOrEqual(-1e-6);
    expect(rect.y).toBeGreaterThanOrEqual(-1e-6);
    expect(rect.x + rect.side).toBeLessThanOrEqual(W + 1e-6);
    expect(rect.y + rect.side).toBeLessThanOrEqual(H + 1e-6);
  });

  it('正方形の画像では既定の切り抜きが全体と一致する', () => {
    const rect = cropSourceRect(defaultCropState(), VIEW, 800, 800);
    expect(rect).toEqual({ x: 0, y: 0, side: 800 });
    const st = clampCropState({ zoom: 1, dx: 50, dy: 50 }, VIEW, 800, 800);
    expect(st.dx).toBe(0);
    expect(st.dy).toBe(0);
  });
});
