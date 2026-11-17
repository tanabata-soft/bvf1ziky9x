import { describe, it, expect } from 'vitest';
import { computeChart, decideCharacter } from '../src/fortune';
import { buildPrompt, negativePromptOf } from '../src/texts';

// v0.1.8 改修1: 呪文に正方形指定を入れ、ネガティブに横長・縦長を足す
describe('呪文の正方形指定', () => {
  const chart = computeChart({ y: 1917, m: 7, d: 22, hour: null, minute: 0 });
  const spec = decideCharacter(chart);

  it('呪文の先頭が正方形指定になっている', () => {
    const p = buildPrompt(chart, spec, 3, 'hero', 'none');
    const firstLine = p.prompt.split('\n')[0];
    expect(firstLine).toContain('Square image, 1:1 aspect ratio');
    expect(firstLine).toContain('entire square canvas');
    const ja = p.partsJa.find((x) => x.label === '画角');
    expect(ja?.value).toContain('正方形');
  });

  it('ネガティブに横長・縦長の除外が入る（全トーン共通）', () => {
    for (const tone of ['hero', 'rebel', 'villain'] as const) {
      const n = negativePromptOf(tone);
      expect(n).toContain('landscape orientation');
      expect(n).toContain('portrait orientation');
    }
    const p = buildPrompt(chart, spec, 3, 'hero', 'none');
    expect(p.negative).toContain('wide image');
  });

  it('トーン別の出し分けは維持される（明るい系は dark mood 禁止、影・闇系はホラー防止）', () => {
    expect(negativePromptOf('hero')).toContain('dark mood');
    expect(negativePromptOf('rebel')).not.toContain('dark mood');
    expect(negativePromptOf('villain')).toContain('horror');
  });
});
