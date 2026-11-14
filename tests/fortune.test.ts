import { describe, it, expect } from 'vitest';
import {
  shiShenOf, computeChart, decideCharacter, decideForm, rarityOf, yearFortune, glamourTierOf,
} from '../src/fortune';
import { buildPrompt } from '../src/texts';

describe('shiShenOf（通変）', () => {
  it('日干・乙から見た各天干', () => {
    expect(shiShenOf('乙', '乙')).toBe('比肩');
    expect(shiShenOf('乙', '甲')).toBe('劫財');
    expect(shiShenOf('甲', '甲')).toBe('比肩');
    expect(shiShenOf('乙', '丁')).toBe('食神');
    expect(shiShenOf('乙', '丙')).toBe('傷官');
    expect(shiShenOf('乙', '己')).toBe('偏財');
    expect(shiShenOf('乙', '戊')).toBe('正財');
    expect(shiShenOf('乙', '辛')).toBe('七殺');
    expect(shiShenOf('乙', '庚')).toBe('正官');
    expect(shiShenOf('乙', '癸')).toBe('偏印');
    expect(shiShenOf('乙', '壬')).toBe('正印');
  });
});

describe('既知の命式（仕様書の試作：1917-07-22、時刻不明）', () => {
  const chart = computeChart({ y: 1917, m: 7, d: 22, hour: null, minute: 0 });
  it('年柱 丁巳・月柱 丁未・日柱 乙丑、時柱なし', () => {
    expect(chart.pillars.map((p) => p.gz)).toEqual(['丁巳', '丁未', '乙丑']);
    expect(chart.hasTime).toBe(false);
    expect(chart.dayGan).toBe('乙');
  });
  it('日柱の十二運は衰、蔵干は己・癸・辛', () => {
    expect(chart.pillars[2].diShi).toBe('衰');
    expect(chart.pillars[2].hideGan).toEqual(['己', '癸', '辛']);
  });
  it('最強の通変は食神で、形態は精霊型（身弱ルール）', () => {
    expect(chart.strongest).toBe('食神');
    expect(decideForm(chart)).toBe('精霊型');
  });
  it('分身キャラ：メイン装備は食神、相棒は丑、紋章は巳', () => {
    const spec = decideCharacter(chart);
    expect(spec.mainEq.shiShen).toBe('食神');
    expect(spec.companionZhi).toBe('丑');
    expect(spec.crestZhi).toBe('巳');
    expect(spec.subEq.length).toBeLessThanOrEqual(2);
  });
  it('レア度は根拠つきで星が付く', () => {
    const r = rarityOf(chart);
    expect(r.stars).toBeGreaterThanOrEqual(3);
    expect(r.reasons.length).toBeGreaterThan(0);
  });
  it('2027年は丑未の冲で「変化」になる', () => {
    const f = yearFortune(chart, 2027);
    expect(f.gz).toBe('丁未');
    expect(f.stage).toBe('変化');
  });
  it('呪文にメイン装備と相棒が入り、決まり文句で終わる', () => {
    const spec = decideCharacter(chart);
    const p = buildPrompt(chart, spec);
    expect(p.prompt).toContain('glowing lantern');
    expect(p.prompt).toContain('tiny calf');
    expect(p.prompt).toContain('No text, no letters, no words, no frame, no border, no logo.');
    expect(p.negative).toContain('watermark');
    expect(p.partsJa.length).toBeGreaterThan(5);
  });
});

describe('形態5型の決定ルール（実例日付）', () => {
  const at = (y: number, m: number, d: number) =>
    decideForm(computeChart({ y, m, d, hour: 10, minute: 0 }));
  it('人型', () => { expect(at(1980, 1, 1)).toBe('人型'); });
  it('群体型（同じ通変が3つ以上）', () => { expect(at(1980, 1, 2)).toBe('群体型'); });
  it('道具型（印が最強）', () => { expect(at(1980, 1, 6)).toBe('道具型'); });
  it('精霊型（身弱）', () => { expect(at(1980, 2, 11)).toBe('精霊型'); });
  it('獣型（最強の星が日支本気由来）', () => { expect(at(1980, 2, 13)).toBe('獣型'); });
});

describe('レア度の派手さ段階（オーナー決定 2026-11-15：シールには星を出さない）', () => {
  it('星1〜2=ふつう／3〜4=キラ／5=大当たり', () => {
    expect(glamourTierOf(1)).toBe('normal');
    expect(glamourTierOf(2)).toBe('normal');
    expect(glamourTierOf(3)).toBe('kira');
    expect(glamourTierOf(4)).toBe('kira');
    expect(glamourTierOf(5)).toBe('jackpot');
  });
  it('呪文の背景のキラキラ表現が段階で出し分けられる', () => {
    const chart = computeChart({ y: 1917, m: 7, d: 22, hour: null, minute: 0 });
    const spec = decideCharacter(chart);
    expect(buildPrompt(chart, spec, 1).prompt).toContain('softly sparkling');
    expect(buildPrompt(chart, spec, 4).prompt).toContain('sparkling stardust');
    expect(buildPrompt(chart, spec, 5).prompt).toContain('extremely dazzling');
  });
});

describe('時刻ありの命式', () => {
  it('時柱が出る', () => {
    const chart = computeChart({ y: 1990, m: 6, d: 15, hour: 8, minute: 30 });
    expect(chart.pillars).toHaveLength(4);
    expect(chart.pillars.map((p) => p.gz)).toEqual(['庚午', '壬午', '辛亥', '壬辰']);
  });
});
