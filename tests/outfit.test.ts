import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  computeChart, decideCharacter, toneOfChart, TONE_LABEL, type Tone,
} from '../src/fortune';
import { buildPrompt, TONE_INFO, outfitTextOf, explainedInfoOf } from '../src/texts';

// v0.2.8: 職業を強調する（オーナー指示「せっかく職業があるので職業を強調して」）。
// 職業ごとに装い（衣装）を明確に定義し、呪文で "dressed unmistakably as a ..." と
// 強く打ち出す。装備ルールが最優先で、職業の小道具（吟遊詩人のリュート）は
// サブ装備が腰・頭まで埋まっている命式では小さい版に弱める。
const ALL_TONES = Object.keys(TONE_LABEL) as Tone[];

describe('職業の装い（全10職業）', () => {
  // ゆうと（2010-10-28）。職業だけを差し替えて文言を見る
  const chart = computeChart({ y: 2010, m: 10, d: 28, hour: null, minute: 0 });
  const spec = decideCharacter(chart);

  it('10職業すべてに装いの文があり、呪文に強く打ち出される', () => {
    expect(ALL_TONES).toHaveLength(10);
    for (const tone of ALL_TONES) {
      const info = TONE_INFO[tone];
      expect(info.outfitEn, tone).toContain('dressed unmistakably');
      expect(info.outfitJa.length, tone).toBeGreaterThan(0);
      expect(info.outfitShortJa.length, tone).toBeGreaterThan(0);
      const p = buildPrompt(chart, spec, 3, tone);
      expect(p.prompt, tone).toContain(outfitTextOf(tone, spec).en);
      const part = p.partsJa.find((x) => x.label === '装い（職業）');
      expect(part?.value, tone).toContain(info.outfitJa.split('、')[0]);
      expect(part?.value, tone).toContain(TONE_LABEL[tone]);
    }
  });

  it('装いの具体例：騎士は磨かれた鎧、魔法使いは星と月の刺繍、暗黒騎士は黒い鎧', () => {
    expect(TONE_INFO.knight.outfitEn).toContain('polished light armor');
    expect(TONE_INFO.priest.outfitEn).toContain('ceremonial robes');
    expect(TONE_INFO.merchant.outfitEn).toContain('pocket-watch chain');
    expect(TONE_INFO.fighter.outfitEn).toContain('dogi-style');
    expect(TONE_INFO.gladiator.outfitEn).toContain('arena armor');
    expect(TONE_INFO.mage.outfitEn).toContain('embroidered with stars and moons');
    expect(TONE_INFO.darkknight.outfitEn).toContain('black armor-like attire');
    expect(TONE_INFO.seer.outfitEn).toContain('patterned with moons and stars');
  });

  it('顔の装飾と重なる要素は装いに入れない（装飾側に一本化）', () => {
    expect(TONE_INFO.mage.outfitEn).not.toContain('pointed hat'); // とんがり帽子は装飾
    expect(TONE_INFO.seer.outfitEn).not.toContain('veil'); // ベールは装飾
    expect(TONE_INFO.rogue.outfitEn).not.toContain('hood'); // フードは装飾
    expect(TONE_INFO.bard.outfitEn).not.toContain('feather'); // 羽根は装飾
  });

  it('吟遊詩人以外には職業の小道具は付かない', () => {
    for (const tone of ALL_TONES) {
      const o = outfitTextOf(tone, spec);
      if (tone === 'bard') continue;
      expect(o.propWeakened, tone).toBe(false);
      expect(o.en, tone).not.toContain('lute');
      expect(TONE_INFO[tone].propEn, tone).toBeUndefined();
    }
  });
});

describe('吟遊詩人の小道具（背中のリュート）と装備の優先', () => {
  // 実命式：1951-03-10 は吟遊詩人でサブ装備1つ、1950-01-02 は吟遊詩人でサブ装備2つ
  const oneSubChart = computeChart({ y: 1951, m: 3, d: 10, hour: null, minute: 0 });
  const oneSubSpec = decideCharacter(oneSubChart);
  const twoSubChart = computeChart({ y: 1950, m: 1, d: 2, hour: null, minute: 0 });
  const twoSubSpec = decideCharacter(twoSubChart);

  it('前提：どちらも吟遊詩人で、サブ装備の数が違う', () => {
    expect(toneOfChart(oneSubChart)).toBe('bard');
    expect(oneSubSpec.subEq).toHaveLength(1);
    expect(toneOfChart(twoSubChart)).toBe('bard');
    expect(twoSubSpec.subEq).toHaveLength(2);
  });

  it('サブ装備が1つまでなら、リュートを背中に背負う', () => {
    const o = outfitTextOf('bard', oneSubSpec);
    expect(o.propWeakened).toBe(false);
    expect(o.en).toContain('A lute is strapped on its back.');
    expect(o.shortJa).toContain('リュート');
    const p = buildPrompt(oneSubChart, oneSubSpec, 3, 'bard');
    expect(p.prompt).toContain('A lute is strapped on its back.');
  });

  it('サブ装備が腰・頭まで埋まっている命式では、リュートは小さなチャームに弱まる', () => {
    const o = outfitTextOf('bard', twoSubSpec);
    expect(o.propWeakened).toBe(true);
    expect(o.en).not.toContain('strapped on its back');
    expect(o.en).toContain('tiny lute-shaped charm');
    expect(o.shortJa).toContain('小さなリュートのチャーム');
    const p = buildPrompt(twoSubChart, twoSubSpec, 3, 'bard');
    expect(p.prompt).not.toContain('A lute is strapped on its back.');
    expect(p.prompt).toContain('tiny lute-shaped charm');
    const part = p.partsJa.find((x) => x.label === '装い（職業）');
    expect(part?.value).toContain('サブ装備を優先して小さく');
  });
});

describe('装いの表示（設計欄と解説つきシール）', () => {
  it('解説つきシールの職業の行に装いが添えられる（シール単体には入れない）', () => {
    const knight = computeChart({ y: 1986, m: 5, d: 7, hour: null, minute: 0 });
    const info = explainedInfoOf(knight, 2026);
    expect(info.jobLine).toContain('騎士');
    expect(info.jobLine).toContain('装いは磨かれた軽い鎧風の装いとマント');
    // 小道具が弱まった吟遊詩人では、職業の行も小さい版になる
    const bard = computeChart({ y: 1950, m: 1, d: 2, hour: null, minute: 0 });
    const bardInfo = explainedInfoOf(bard, 2026);
    expect(bardInfo.jobLine).toContain('装いは');
    expect(bardInfo.jobLine).toContain('小さなリュートのチャーム');
  });

  it('詳細画面（main.ts）の設計欄の職業行にも装いが出る', () => {
    const mainSrc = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(mainSrc).toContain('outfitTextOf(tone, spec).shortJa');
  });

  it('CLI（make-prompt.ts）の職業行にも装いが出る', () => {
    const cliSrc = readFileSync(new URL('../scripts/make-prompt.ts', import.meta.url), 'utf8');
    expect(cliSrc).toContain('outfitTextOf(tone, spec).shortJa');
  });
});
