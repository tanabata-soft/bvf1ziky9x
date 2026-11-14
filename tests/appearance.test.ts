import { describe, it, expect } from 'vitest';
import { computeChart, decideCharacter } from '../src/fortune';
import { buildPrompt } from '../src/texts';

// v0.1.7: キャラの見た目（指定なし／男の子／女の子）は呪文だけに効く
describe('見た目の呪文への反映', () => {
  // 試作命式（1917-07-22、時刻不明）＝精霊型
  const chart = computeChart({ y: 1917, m: 7, d: 22, hour: null, minute: 0 });
  const spec = decideCharacter(chart);

  it('前提：試作命式は精霊型', () => {
    expect(spec.form).toBe('精霊型');
  });

  it('女の子指定では girl 向けの表現が入る（精霊型）', () => {
    const p = buildPrompt(chart, spec, 3, 'normal', 'girl');
    expect(p.prompt).toContain('a cute little girl fairy spirit character');
    expect(p.prompt).toContain('ribbon hair accessory');
    expect(p.prompt).toContain('dress-like outfit');
    const ja = p.partsJa.find((x) => x.label === '見た目');
    expect(ja?.value).toContain('女の子');
  });

  it('男の子指定では boy 向けの表現が入る（精霊型）', () => {
    const p = buildPrompt(chart, spec, 3, 'normal', 'boy');
    expect(p.prompt).toContain('a small boy fairy spirit character');
    expect(p.prompt).toContain('boyish look');
  });

  it('指定なしでは性別表現が入らない（従来どおり）', () => {
    const p = buildPrompt(chart, spec, 3, 'normal', 'none');
    expect(p.prompt).toContain('a small floating fairy-like spirit character');
    expect(p.prompt).not.toContain('girl');
    expect(p.prompt).not.toContain('boyish');
    expect(p.prompt).not.toContain('ribbon hair accessory');
  });

  it('獣型では性別表現を付けず、小さな雰囲気の差だけにする', () => {
    const beast = { ...spec, form: '獣型' as const };
    const girl = buildPrompt(chart, beast, 3, 'normal', 'girl');
    expect(girl.prompt).toContain('a small beast-like character standing upright');
    expect(girl.prompt).toContain('cute ribbon and long eyelashes');
    expect(girl.prompt).not.toContain('girl character');
    const boy = buildPrompt(chart, beast, 3, 'normal', 'boy');
    expect(boy.prompt).toContain('tiny little cap');
    expect(boy.prompt).not.toContain('boy character');
  });

  it('見た目を変えてもトーン・称号まわりの前提は変わらない（ネガティブはトーンのみで決まる）', () => {
    const p = buildPrompt(chart, spec, 3, 'villain', 'girl');
    expect(p.negative).not.toContain('dark mood');
    expect(p.prompt).toContain('devil horns');
    expect(p.prompt).toContain('a cute little girl fairy spirit character');
  });
});
