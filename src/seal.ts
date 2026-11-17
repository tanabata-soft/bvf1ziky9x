// 画像の取り込み（トリミングなし）とシール合成（Canvas）。
// v0.1.1: 絵を切らない「はめ込み（contain）」方式。名前帯を細くし、絵の面積を最大化。
// v0.1.2: レア度は星で出さず、枠・ホロの「派手さ」3段階で表す（オーナー決定 2026-11-15）。
//   ふつう＝細めの色枠・ホロ控えめ／キラ＝プリズム枠・星屑／大当たり＝金色の太枠・強いプリズム・枠の装飾模様。
// v0.1.5: 名前帯は2段をやめ、プレフィックス＋ニックネームを空白なしでつなげた1行表示
//   （オーナー決定 2026-11-15）。プレフィックスは少し小さめの字で同じ行に並べる。
import { ELEMENT_COLOR } from './texts';
import { displayNameSegments, type NameSegmentKind } from './name';
import type { Element, GlamourTier, Tone } from './fortune';

export interface SealName {
  prefix: string;
  nickname: string;
  postfix: string; // '' のときは付けない（既定は付けない）
  tier: GlamourTier;
  mainColor: Element;
  tone?: Tone; // 帯の色を決める職業（省略時は騎士＝五行色）
}

// 名前帯の色（v0.2.4：職業ごと）。明るい系（騎士・僧侶・商人・吟遊詩人）は
// 五行色ベースとし、この表にある影・闇系だけ濃色グラデーションにする。
const BAND_GRADIENT: Partial<Record<Tone, [string, string, string]>> = {
  fighter: ['#3a5a78', '#16222e', '#05090f'], // 武闘家：青灰
  gladiator: ['#8a2b1d', '#3d130c', '#120503'], // 闘士：炎の深紅
  mage: ['#2f3a9e', '#141a4d', '#04060f'], // 魔法使い：藍
  rogue: ['#0f5a4c', '#0a2e26', '#03100c'], // 盗賊：深いエメラルド
  darkknight: ['#7a1630', '#33081a', '#0d0207'], // 暗黒騎士：深紅〜黒
  seer: ['#4a2166', '#1e0b33', '#07020f'], // 占い師：紫〜黒
};

const SIZE = 1080;
// 名前帯：上部に細く（プレフィックス＋ニックネームを1行で連結。帯を詰めて絵の領域を広げる）
const BAND_H = 88;

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

/** 生成画像＋名前帯を合成したシール（Canvas）を返す。レア度は枠の派手さで表し、星は描かない。
 *  img は切り抜き済み Canvas（v0.1.8 の切り抜き調整）でもよい */
export function composeSeal(img: HTMLImageElement | HTMLCanvasElement, name: SealName): HTMLCanvasElement {
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
  const srcW = (img as HTMLImageElement).naturalWidth || img.width;
  const srcH = (img as HTMLImageElement).naturalHeight || img.height;
  const scale = Math.min(IN_SIZE / srcW, IMG_H / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  ctx.drawImage(img, IN + (IN_SIZE - w) / 2, IMG_Y + (IMG_H - h) / 2, w, h);
  ctx.restore();

  // 名前帯（上部・細く）。基本形はプレフィックス＋ニックネーム。ポストフィックスは任意
  // 帯の色はトーンで変わる（明るい系＝五行の色／影・闇系＝トーンごとの濃色グラデーション）。
  // 枠の派手さ（レア度段階）とは別軸で両立する（オーナー決定 2026-11-15）
  ctx.save();
  roundRectPath(ctx, IN, IN, IN_SIZE, BAND_H, 36);
  ctx.clip();
  const band = BAND_GRADIENT[name.tone ?? 'knight'];
  if (band) {
    const g = ctx.createLinearGradient(IN, IN, SIZE - IN, IN + BAND_H);
    g.addColorStop(0, band[0]); g.addColorStop(0.55, band[1]); g.addColorStop(1, band[2]);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = ELEMENT_COLOR[name.mainColor];
  }
  ctx.fillRect(IN, IN, IN_SIZE, BAND_H);
  if (name.tier === 'jackpot') {
    ctx.fillStyle = goldGradient(ctx);
    ctx.fillRect(IN, IN + BAND_H - 6, IN_SIZE, 6);
  }
  // 1行表示：プレフィックスは少し小さめ、ニックネームは大きめ、同じ行に空白なしで連結。
  // 全体が帯の幅に収まらない場合は、比率を保ったまま全体を自動縮小する。
  const NAME_FONT = '"Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif';
  const BASE_SIZE: Record<NameSegmentKind, number> = { prefix: 38, nickname: 56, postfix: 34 };
  const WEIGHT: Record<NameSegmentKind, number> = { prefix: 500, nickname: 700, postfix: 500 };
  const fontFor = (kind: NameSegmentKind, scale: number) =>
    `${WEIGHT[kind]} ${Math.max(10, Math.round(BASE_SIZE[kind] * scale))}px ${NAME_FONT}`;
  const segs = displayNameSegments(name.prefix, name.nickname, name.postfix);
  const measureAll = (scale: number) => segs.map((s) => {
    ctx.font = fontFor(s.kind, scale);
    return ctx.measureText(s.text).width;
  });
  const MAX_W = IN_SIZE - 40;
  let nameScale = 1;
  let segWidths = measureAll(nameScale);
  let totalW = segWidths.reduce((a, b) => a + b, 0);
  if (totalW > MAX_W) {
    nameScale = MAX_W / totalW;
    segWidths = measureAll(nameScale);
    totalW = segWidths.reduce((a, b) => a + b, 0);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  const baseline = IN + BAND_H / 2 + BASE_SIZE.nickname * nameScale * 0.36;
  let cursorX = (SIZE - totalW) / 2;
  segs.forEach((s, i) => {
    ctx.font = fontFor(s.kind, nameScale);
    ctx.fillText(s.text, cursorX, baseline);
    cursorX += segWidths[i];
  });
  ctx.restore();

  return canvas;
}

/** dataURL など URL から画像を読み込む（解説つき合成で完成シールを再利用するため） */
export function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像を読み込めませんでした'));
    img.src = src;
  });
}

export interface ExplainedInfo {
  personality: string[]; // 性格ひとこと（段落ごと）
  jobLine: string; // 職業（職業名＋短い理由、1行）
  appearanceLines: string[]; // 見た目（年齢感・体格・髪＋根拠、1行ずつ）
  fortuneHeading: string; // 例: 2026年の運勢（吉）
  fortuneBody: string[]; // 運勢の短文（段落ごと）
  equipLines: string[]; // 装備の意味（1行=1装備、折り返し可）
  footer: string;
  mainColor: Element;
}

const FONT_STACK = '"Hiragino Maru Gothic ProN", "Hiragino Sans", "Noto Sans JP", sans-serif';

/** maxWidth に収まるよう折り返す。行頭の句読点・括弧閉じは前の行にぶら下げる（禁則処理） */
const NO_LINE_START = '、。・：；！？）」』】〉》。';
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxWidth && cur) {
      if (NO_LINE_START.includes(ch)) {
        cur += ch; // ぶら下げ：少しはみ出しても行頭には置かない
      } else {
        lines.push(cur);
        cur = ch;
      }
    } else {
      cur += ch;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/**
 * 解説つき書き出し（v0.1.3）: 上部に完成シール、下部に解説パネルの縦長1枚。
 * 文字はすべてアプリ側で描く。生年月日は入れない。
 */
export function composeExplainedSeal(sealImg: HTMLImageElement, info: ExplainedInfo): HTMLCanvasElement {
  const W = SIZE;
  const PAD = 60;
  const TEXT_W = W - PAD * 2;
  const HEAD_FONT = `700 37px ${FONT_STACK}`;
  const BODY_FONT = `400 31px ${FONT_STACK}`;
  const BODY_LH = 50;
  const HEAD_H = 56;

  interface Section { heading: string; lines: string[] }
  // 計測用コンテキストで折り返しを先に確定する
  const measure = document.createElement('canvas').getContext('2d')!;
  const build = (heading: string, paras: string[]): Section => {
    measure.font = BODY_FONT;
    return { heading, lines: paras.flatMap((p) => wrapLines(measure, p, TEXT_W)) };
  };
  const sections: Section[] = [
    build('性格', info.personality),
    build('職業', [info.jobLine]),
    build('見た目', info.appearanceLines),
    build(info.fortuneHeading, info.fortuneBody),
    build('装備の意味', info.equipLines),
  ];
  const TOP_PAD = 46;
  const SECTION_GAP = 36;
  const FOOTER_H = 66;
  const panelH = TOP_PAD
    + sections.reduce((s, sec) => s + HEAD_H + sec.lines.length * BODY_LH, 0)
    + SECTION_GAP * (sections.length - 1)
    + FOOTER_H + 30;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = SIZE + panelH;
  const ctx = canvas.getContext('2d')!;

  // 上部: 完成シール（そのまま全体を描く）
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, canvas.height);
  ctx.drawImage(sealImg, 0, 0, W, SIZE);

  // 下部: 解説パネル
  const py = SIZE;
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, py, W, panelH);
  ctx.fillStyle = ELEMENT_COLOR[info.mainColor];
  ctx.fillRect(0, py, W, 10);

  let y = py + TOP_PAD;
  sections.forEach((sec, i) => {
    if (i > 0) y += SECTION_GAP;
    // 見出し（色丸＋太字）
    ctx.fillStyle = ELEMENT_COLOR[info.mainColor];
    ctx.beginPath();
    ctx.arc(PAD + 13, y + 22, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = HEAD_FONT;
    ctx.fillStyle = '#33333f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(sec.heading, PAD + 42, y + 36);
    y += HEAD_H;
    // 本文
    ctx.font = BODY_FONT;
    ctx.fillStyle = '#3d3d4d';
    for (const line of sec.lines) {
      ctx.fillText(line, PAD, y + 34);
      y += BODY_LH;
    }
  });

  // フッターと下端のプリズム帯
  ctx.font = `400 24px ${FONT_STACK}`;
  ctx.fillStyle = '#8a8aa0';
  ctx.textAlign = 'center';
  ctx.fillText(info.footer, W / 2, py + panelH - 28);
  ctx.fillStyle = prismGradient(ctx);
  ctx.fillRect(0, py + panelH - 12, W, 12);

  return canvas;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.88);
}

export interface SealEncodeStep { size: number; quality: number }

/**
 * 完成シールを端末に保存するときのエンコード段階（大きい順）。
 * 標準は 1080×1080・品質0.85（v0.2.0 の 0.88 から微減。贈る用途の見た目は損なわない範囲）。
 * 保存容量が足りないときは、次の段階（低品質→縮小）で自動で再試行する（v0.2.1）。
 */
export const SEAL_SAVE_STEPS: readonly SealEncodeStep[] = [
  { size: 1080, quality: 0.85 },
  { size: 1080, quality: 0.72 },
  { size: 864, quality: 0.72 },
  { size: 864, quality: 0.6 },
  { size: 720, quality: 0.6 },
];

/** 合成済みシール Canvas を、指定した大きさ・品質の JPEG dataURL にする */
export function encodeSealCanvas(canvas: HTMLCanvasElement, step: SealEncodeStep): string {
  if (step.size === canvas.width && step.size === canvas.height) {
    return canvas.toDataURL('image/jpeg', step.quality);
  }
  const c = document.createElement('canvas');
  c.width = step.size;
  c.height = step.size;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, step.size, step.size);
  return c.toDataURL('image/jpeg', step.quality);
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
