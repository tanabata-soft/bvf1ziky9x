import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeChart, decideCharacter, TONE_LABEL, type Tone } from '../src/fortune';
import {
  buildPrompt, TONE_INFO, ornamentTextOf, appearanceReasonLines, explainedInfoOf,
} from '../src/texts';

// v0.2.6: 職業ごとの顔・頭の装飾（オーナー確定）。
// 装飾は職業から一意に決まり、利用者は選べない。頭にサブ装備が乗る命式では
// 装備の置き場所を優先して装飾を小さく弱める。覆うのは顔の半分程度までを上限とし、
// 表現は「半分程度は見える」側で書く（フルフェイスは使わない）。
const ALL_TONES: Tone[] = [
  'knight', 'priest', 'merchant', 'bard', 'fighter',
  'gladiator', 'mage', 'rogue', 'darkknight', 'seer',
];

// 試作命式（1917-07-22）＝精霊型、サブ装備2つ（2つ目は頭の位置）
const chart = computeChart({ y: 1917, m: 7, d: 22, hour: null, minute: 0 });
const spec = decideCharacter(chart);
// 頭が空いている版（サブ装備を1つに減らしたもの）で通常版の装飾を見る
const openSpec = { ...spec, subEq: spec.subEq.slice(0, 1) };

describe('装飾の割り当て（職業ごとに1つ）', () => {
  it('前提：試作命式はサブ装備が2つ（頭が埋まっている）', () => {
    expect(spec.subEq.length).toBe(2);
    expect(openSpec.subEq.length).toBe(1);
  });

  it('10職業すべてに装飾の文（EN/JA・通常版と小さい版）がある', () => {
    for (const tone of ALL_TONES) {
      const info = TONE_INFO[tone];
      expect(info.ornamentEn.length, tone).toBeGreaterThan(0);
      expect(info.ornamentJa.length, tone).toBeGreaterThan(0);
      expect(info.ornamentSmallEn.length, tone).toBeGreaterThan(0);
      expect(info.ornamentSmallJa.length, tone).toBeGreaterThan(0);
      expect(info.ornamentSmallEn, tone).not.toBe(info.ornamentEn);
    }
  });

  it('覆い方の内訳：マスクは盗賊・暗黒騎士、ベールは僧侶・占い師、それ以外は覆わない', () => {
    expect(TONE_INFO.rogue.faceCover).toBe('mouth');
    expect(TONE_INFO.darkknight.faceCover).toBe('mouth');
    expect(TONE_INFO.priest.faceCover).toBe('veil');
    expect(TONE_INFO.seer.faceCover).toBe('veil');
    for (const tone of ['knight', 'merchant', 'bard', 'fighter', 'gladiator', 'mage'] as Tone[]) {
      expect(TONE_INFO[tone].faceCover, tone).toBe('none');
    }
  });

  it('10職業すべてで呪文に装飾の文が入り、部品併記にも職業つきで出る', () => {
    for (const tone of ALL_TONES) {
      const p = buildPrompt(chart, openSpec, 3, tone);
      expect(p.prompt, tone).toContain(TONE_INFO[tone].ornamentEn);
      const part = p.partsJa.find((x) => x.label === '顔の装飾（職業）');
      expect(part, tone).toBeDefined();
      expect(part!.value, tone).toContain(TONE_LABEL[tone]);
      expect(part!.value, tone).toContain(TONE_INFO[tone].ornamentJa);
    }
  });

  it('顔まわりの装いは雰囲気文と重複させず、装飾に一本化する', () => {
    expect(TONE_INFO.bard.moodEn).not.toContain('feathered');
    expect(TONE_INFO.mage.moodEn).not.toContain('pointed hat');
    expect(TONE_INFO.rogue.moodEn).not.toContain('hood');
    expect(TONE_INFO.seer.moodEn).not.toContain('hood');
    // 呪文側では装飾として入る
    expect(buildPrompt(chart, openSpec, 3, 'bard').prompt).toContain('feathered cap');
    expect(buildPrompt(chart, openSpec, 3, 'mage').prompt).toContain('pointed hat');
  });
});

describe('顔の覆い方（半分程度まで・見える側で表現する）', () => {
  const FORBIDDEN = ['full-face', 'full face', 'entire face', 'whole face', 'completely covered', 'fully covered face'];

  it('どの職業・見た目でも、顔全体を覆う表現は呪文に入らない', () => {
    for (const tone of ALL_TONES) {
      for (const s of [openSpec, spec]) {
        for (const a of ['none', 'boy', 'girl'] as const) {
          const p = buildPrompt(chart, s, 3, tone, a);
          for (const w of FORBIDDEN) {
            expect(p.prompt, `${tone}/${a} に ${w}`).not.toContain(w);
          }
        }
      }
      // 装飾の定義文自体にも入れない
      for (const w of FORBIDDEN) {
        expect(TONE_INFO[tone].ornamentEn, tone).not.toContain(w);
        expect(TONE_INFO[tone].ornamentSmallEn, tone).not.toContain(w);
      }
    }
  });

  it('暗黒騎士：黒いハーフマスクで口元だけを覆い、目元と額が見える。顔立ち文は目元中心になり唇・笑顔に触れない', () => {
    const yuto = computeChart({ y: 2010, m: 10, d: 28, hour: null, minute: 0 });
    const yutoSpec = decideCharacter(yuto);
    const open = { ...yutoSpec, subEq: yutoSpec.subEq.slice(0, 1) };
    const boy = buildPrompt(yuto, open, 4, 'darkknight', 'boy', 'youth');
    expect(boy.prompt).toContain('black half mask');
    expect(boy.prompt).toContain('eyes and forehead stay fully visible');
    expect(boy.prompt).not.toContain('well-shaped lips');
    expect(boy.prompt).not.toContain('smile');
    const girl = buildPrompt(yuto, open, 4, 'darkknight', 'girl', 'youth');
    expect(girl.prompt).toContain('black half mask');
    expect(girl.prompt).not.toContain('well-shaped lips');
    expect(girl.prompt).not.toContain('smile');
    // リボンなど顔まわり以外の要素は残る
    expect(girl.prompt).toContain('ribbon hair accessory');
  });

  it('盗賊：マスクで口元を覆い、目元と額が見える。顔立ち文と矛盾しない', () => {
    const yuto = computeChart({ y: 2010, m: 10, d: 28, hour: null, minute: 0 });
    const yutoSpec = decideCharacter(yuto);
    const open = { ...yutoSpec, subEq: yutoSpec.subEq.slice(0, 1) };
    const p = buildPrompt(yuto, open, 4, 'rogue', 'boy', 'youth');
    expect(p.prompt).toContain('cloth mask covers the nose and mouth');
    expect(p.prompt).toContain('eyes and forehead stay visible');
    expect(p.prompt).not.toContain('well-shaped lips');
    expect(p.prompt).not.toContain('smile');
  });

  it('占い師・僧侶：透けるベール越しに表情が読めるため、顔立ち文はそのまま入る', () => {
    const yuto = computeChart({ y: 2010, m: 10, d: 28, hour: null, minute: 0 });
    const yutoSpec = decideCharacter(yuto);
    const open = { ...yutoSpec, subEq: yutoSpec.subEq.slice(0, 1) };
    const seer = buildPrompt(yuto, open, 4, 'seer', 'girl', 'youth');
    expect(seer.prompt).toContain('sheer veil');
    expect(seer.prompt).toContain('show softly through the translucent cloth');
    expect(seer.prompt).toContain('well-shaped lips');
    expect(seer.prompt).toContain('bright, charming smile');
    const priest = buildPrompt(yuto, open, 4, 'priest', 'girl', 'youth');
    expect(priest.prompt).toContain('sheer white veil');
    expect(priest.prompt).toContain('well-shaped lips');
  });
});

describe('頭にサブ装備が乗る命式では装飾を弱める（装備が優先）', () => {
  it('ゆうと（2010-10-28、サブ装備2つ）は騎士でも小さい版のサーカレットになる', () => {
    const yuto = computeChart({ y: 2010, m: 10, d: 28, hour: null, minute: 0 });
    const yutoSpec = decideCharacter(yuto);
    expect(yutoSpec.subEq.length).toBe(2);
    const o = ornamentTextOf('knight', yutoSpec);
    expect(o.weakened).toBe(true);
    expect(o.en).toBe(TONE_INFO.knight.ornamentSmallEn);
    const p = buildPrompt(yuto, yutoSpec, 4, 'knight', 'boy', 'youth');
    expect(p.prompt).toContain(TONE_INFO.knight.ornamentSmallEn);
    expect(p.prompt).not.toContain(TONE_INFO.knight.ornamentEn);
    const part = p.partsJa.find((x) => x.label === '顔の装飾（職業）');
    expect(part!.value).toContain('小さく');
  });

  it('頭が空いていれば通常版の装飾になる', () => {
    const o = ornamentTextOf('knight', openSpec);
    expect(o.weakened).toBe(false);
    expect(o.en).toBe(TONE_INFO.knight.ornamentEn);
  });

  it('盗賊・占い師は弱めた版ではフードが落ちる（頭の装備を優先）', () => {
    const p = buildPrompt(chart, spec, 3, 'rogue');
    expect(p.prompt).toContain(TONE_INFO.rogue.ornamentSmallEn);
    expect(p.prompt).not.toContain('hood');
    const s = buildPrompt(chart, spec, 3, 'seer');
    expect(s.prompt).toContain(TONE_INFO.seer.ornamentSmallEn);
    expect(s.prompt).not.toContain('hood');
  });
});

describe('外見の理由の説明に装飾が入る（設計欄・解説つきシール・CLI）', () => {
  const yuto = computeChart({ y: 2010, m: 10, d: 28, hour: null, minute: 0 });
  const yutoSpec = decideCharacter(yuto);

  it('appearanceReasonLines の装飾行に、装飾と職業の根拠が入る', () => {
    const r = appearanceReasonLines(yuto, yutoSpec, 'youth');
    expect(r.ornamentLine).toContain('サーカレット');
    expect(r.ornamentLine).toContain('職業『騎士』から');
    expect(r.ornamentLine).toContain('小さく'); // ゆうとは頭に装備がある
  });

  it('explainedInfoOf の「見た目」節に顔の装飾の行が入る', () => {
    const info = explainedInfoOf(yuto, 2026, 'youth');
    expect(info.appearanceLines).toHaveLength(4);
    const line = info.appearanceLines.find((l) => l.startsWith('顔の装飾：'));
    expect(line).toBeDefined();
    expect(line!).toContain('騎士');
  });

  it('詳細画面（main.ts）の設計表示と CLI にも装飾の行がある', () => {
    const mainSrc = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(mainSrc).toContain('<strong>顔の装飾</strong>');
    expect(mainSrc).toContain('appearanceReasons.ornamentLine');
    const cliSrc = readFileSync(new URL('../scripts/make-prompt.ts', import.meta.url), 'utf8');
    expect(cliSrc).toContain('顔の装飾');
    expect(cliSrc).toContain('appearanceReasons.ornamentLine');
  });
});
