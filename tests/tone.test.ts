import { describe, it, expect } from 'vitest';
import { computeChart, decideCharacter, defaultToneOf } from '../src/fortune';
import { buildPrompt, negativePromptOf, prefixTitleOf } from '../src/texts';

// v0.1.6: キャラのトーン（通常／ダークヒーロー／ヴィラン）
describe('トーンの初期値（一番強い通変からの提案）', () => {
  it('七殺・偏印はヴィラン', () => {
    expect(defaultToneOf('七殺')).toBe('villain');
    expect(defaultToneOf('偏印')).toBe('villain');
  });
  it('傷官・劫財はダークヒーロー', () => {
    expect(defaultToneOf('傷官')).toBe('dark');
    expect(defaultToneOf('劫財')).toBe('dark');
  });
  it('それ以外は通常', () => {
    expect(defaultToneOf('正官')).toBe('normal');
    expect(defaultToneOf('食神')).toBe('normal');
    expect(defaultToneOf('正印')).toBe('normal');
    expect(defaultToneOf('比肩')).toBe('normal');
    expect(defaultToneOf('偏財')).toBe('normal');
    expect(defaultToneOf('正財')).toBe('normal');
  });
});

describe('称号はトーンで変わる', () => {
  it('正官：通常＝誇り高き騎士／ダーク＝影の騎士／ヴィラン＝闇の騎士', () => {
    expect(prefixTitleOf('正官', 'normal')).toBe('誇り高き騎士');
    expect(prefixTitleOf('正官', 'dark')).toBe('影の騎士');
    expect(prefixTitleOf('正官', 'villain')).toBe('闇の騎士');
  });
  it('全通変に3トーン分の称号がある', () => {
    const stars = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印'] as const;
    for (const s of stars) {
      for (const t of ['normal', 'dark', 'villain'] as const) {
        expect(prefixTitleOf(s, t).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('呪文とネガティブはトーンで出し分ける', () => {
  const chart = computeChart({ y: 1917, m: 7, d: 22, hour: null, minute: 0 });
  const spec = decideCharacter(chart);

  it('通常トーンのネガティブは dark mood を含み、本文にダーク系の雰囲気文が入らない', () => {
    const p = buildPrompt(chart, spec, 3, 'normal');
    expect(p.negative).toContain('dark mood');
    expect(p.prompt).not.toContain('devil horns');
    expect(p.prompt).not.toContain('lone hero of the night');
  });

  it('ヴィランでは dark mood が禁止から外れ、ホラー防止の語に替わる。本文に悪魔の角と悪だくみの笑みが入る', () => {
    const p = buildPrompt(chart, spec, 3, 'villain');
    expect(p.negative).not.toContain('dark mood');
    expect(p.negative).toContain('horror');
    expect(p.negative).toContain('grotesque');
    expect(p.prompt).toContain('devil horns');
    expect(p.prompt).toContain('mischievous scheming grin');
  });

  it('ダークヒーローでは本文に夜と黒マントの雰囲気文が入る', () => {
    const p = buildPrompt(chart, spec, 3, 'dark');
    expect(p.negative).not.toContain('dark mood');
    expect(p.prompt).toContain('lone hero of the night');
    expect(p.prompt).toContain('black flowing cape');
  });

  it('negativePromptOf も同じ出し分け', () => {
    expect(negativePromptOf('normal')).toContain('dark mood');
    expect(negativePromptOf('dark')).not.toContain('dark mood');
    expect(negativePromptOf('villain')).toContain('realistic violence');
  });
});
