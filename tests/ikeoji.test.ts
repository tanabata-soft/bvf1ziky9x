import { describe, it, expect } from 'vitest';
import { computeChart, decideCharacter } from '../src/fortune';
import {
  buildPrompt, negativePromptOf, appearanceReasonLines, explainedInfoOf,
} from '../src/texts';

// v0.2.7: 男の子の中年・円熟は「イケオジ風」（オーナー指示）。
// 実生成で白い長いヒゲの老人寄りになった指摘への対応で、スタイリッシュで
// 洗練された魅力的な大人の男性として描き、「老け」とは切り分ける。
// 女の子・青年以下・指定なしには入れない。
describe('イケオジ風（男の子×中年・円熟）', () => {
  // ゆうと（2010-10-28）＝人型。区分と見た目だけを差し替えて文言を見る
  const chart = computeChart({ y: 2010, m: 10, d: 28, hour: null, minute: 0 });
  const spec = decideCharacter(chart);

  it('前提：人型である', () => {
    expect(spec.form).toBe('人型');
  });

  it('中年：イケオジ方向の文が入り、ヒゲは付けない形を基本にする', () => {
    const p = buildPrompt(chart, spec, 3, 'knight', 'boy', 'middle');
    expect(p.prompt).toContain('impeccably groomed gentleman');
    expect(p.prompt).toContain('stylish, dashing');
    expect(p.prompt).toContain('clean-shaven');
    expect(p.prompt).toContain('never aged or weary');
    // 老いを思わせる語は本文に入れない
    expect(p.prompt).not.toContain('wrinkle');
    expect(p.prompt).not.toContain('gray');
    const ja = p.partsJa.find((x) => x.label === '見た目');
    expect(ja?.value).toContain('イケオジ風');
  });

  it('円熟：シルバーフォックスの含みでイケオジ方向の文が入る', () => {
    const p = buildPrompt(chart, spec, 3, 'knight', 'boy', 'mature');
    expect(p.prompt).toContain('silver-fox gentleman');
    expect(p.prompt).toContain('impeccably groomed');
    expect(p.prompt).toContain('clean-shaven');
    expect(p.prompt).toContain('still vibrant and full of life');
    expect(p.prompt).not.toContain('wrinkle');
    expect(p.prompt).not.toContain('gray');
    const ja = p.partsJa.find((x) => x.label === '見た目');
    expect(ja?.value).toContain('イケオジ風');
  });

  it('ネガティブ：中年・円熟の男の子だけ、長いヒゲ・白いヒゲを禁止する', () => {
    for (const band of ['middle', 'mature'] as const) {
      const p = buildPrompt(chart, spec, 3, 'knight', 'boy', band);
      expect(p.negative, band).toContain('long beard');
      expect(p.negative, band).toContain('white beard');
      // negativePromptOf の直接指定でも同じ
      expect(negativePromptOf('knight', 'boy', band)).toContain('long beard');
      expect(negativePromptOf('knight', 'boy', band)).toContain('white beard');
      // ヒゲそのものではなく形だけを禁止する（短く整えたヒゲは許容）
      const tokens = p.negative.split(',').map((s) => s.trim());
      expect(tokens, band).not.toContain('beard');
    }
  });

  it('女の子×中年・円熟にはイケオジの文もヒゲ禁止も入らない', () => {
    for (const band of ['middle', 'mature'] as const) {
      const p = buildPrompt(chart, spec, 3, 'knight', 'girl', band);
      expect(p.prompt, band).not.toContain('gentleman');
      expect(p.prompt, band).not.toContain('silver-fox');
      expect(p.prompt, band).not.toContain('clean-shaven');
      expect(p.negative, band).not.toContain('beard');
      const ja = p.partsJa.find((x) => x.label === '見た目');
      expect(ja?.value, band).not.toContain('イケオジ');
    }
    expect(negativePromptOf('knight', 'girl', 'middle')).not.toContain('beard');
    expect(negativePromptOf('knight', 'girl', 'mature')).not.toContain('beard');
  });

  it('男の子×青年以下にはイケオジの文もヒゲ禁止も入らない', () => {
    for (const band of ['child', 'youth', 'adult'] as const) {
      const p = buildPrompt(chart, spec, 3, 'knight', 'boy', band);
      expect(p.prompt, band).not.toContain('gentleman');
      expect(p.prompt, band).not.toContain('silver-fox');
      expect(p.negative, band).not.toContain('beard');
    }
    expect(negativePromptOf('knight', 'boy', 'adult')).not.toContain('beard');
    expect(negativePromptOf('knight', 'boy')).not.toContain('beard'); // 区分省略時（若者扱い）
  });

  it('指定なし×中年ではヒゲ禁止は入らない', () => {
    const p = buildPrompt(chart, spec, 3, 'knight', 'none', 'middle');
    expect(p.negative).not.toContain('beard');
    expect(negativePromptOf('knight', 'none', 'middle')).not.toContain('beard');
  });

  it('マスクの職業（暗黒騎士）でも目元中心の文がイケオジ方向になる', () => {
    const p = buildPrompt(chart, spec, 3, 'darkknight', 'boy', 'middle');
    expect(p.prompt).toContain('Above the mask');
    expect(p.prompt).toContain('impeccably groomed gentleman');
    expect(p.negative).toContain('long beard');
    const m = buildPrompt(chart, spec, 3, 'darkknight', 'boy', 'mature');
    expect(m.prompt).toContain('Above the mask');
    expect(m.prompt).toContain('silver-fox gentleman');
  });

  it('外見の理由：年齢感の行にイケオジ風の根拠が入る（男の子×中年・円熟のみ）', () => {
    const mid = appearanceReasonLines(chart, spec, 'middle', 'boy');
    expect(mid.ageLine).toContain('中年');
    expect(mid.ageLine).toContain('40〜59歳');
    expect(mid.ageLine).toContain('イケオジ風（洗練された大人の男性）');
    const mat = appearanceReasonLines(chart, spec, 'mature', 'boy');
    expect(mat.ageLine).toContain('円熟');
    expect(mat.ageLine).toContain('イケオジ風');
    // 女の子・青年・指定なし（引数省略含む）では入らない
    expect(appearanceReasonLines(chart, spec, 'middle', 'girl').ageLine).not.toContain('イケオジ');
    expect(appearanceReasonLines(chart, spec, 'adult', 'boy').ageLine).not.toContain('イケオジ');
    expect(appearanceReasonLines(chart, spec, 'middle').ageLine).not.toContain('イケオジ');
  });

  it('解説つきシールの「見た目」節にもイケオジ風の根拠が入る', () => {
    const info = explainedInfoOf(chart, 2026, 'middle', 'boy');
    expect(info.appearanceLines[0]).toContain('イケオジ風');
    const plain = explainedInfoOf(chart, 2026, 'middle');
    expect(plain.appearanceLines[0]).not.toContain('イケオジ');
  });
});
