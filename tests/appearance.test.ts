import { describe, it, expect } from 'vitest';
import { computeChart, decideCharacter, normalizeAppearance } from '../src/fortune';
import { buildPrompt } from '../src/texts';

// 見た目（指定なし／男の子／女の子）は呪文だけに効く。
// v0.1.9: 内部的には「男の子＝イケメンアイドルのような顔立ち」「女の子＝アイドルのような顔立ち」。
// 「アイドル」は顔立ちの印象のこと。歌手系の要素（ステージ衣装・ヘッドセットマイク・星の
// アクセサリー等）は入れず、顔立ちは少しリアル寄りで整った方向にする（オーナー訂正）。
// v0.1.8 の独立選択肢 'idol' は男の子に統合し、保存データは 'boy' に読み替える。
describe('見た目の呪文への反映', () => {
  // 試作命式（1917-07-22、時刻不明）＝精霊型
  const chart = computeChart({ y: 1917, m: 7, d: 22, hour: null, minute: 0 });
  const spec = decideCharacter(chart);

  it('前提：試作命式は精霊型', () => {
    expect(spec.form).toBe('精霊型');
  });

  it('男の子指定ではイケメンアイドルのような顔立ちの表現が入る（精霊型）', () => {
    const p = buildPrompt(chart, spec, 3, 'normal', 'boy');
    expect(p.prompt).toContain('a small boy fairy spirit character');
    expect(p.prompt).toContain('handsome idol-like face');
    expect(p.prompt).toContain('sparkling clear eyes');
    expect(p.prompt).toContain('fresh, bright smile');
    const ja = p.partsJa.find((x) => x.label === '見た目');
    expect(ja?.value).toContain('男の子');
    expect(ja?.value).toContain('イケメンアイドル');
  });

  it('女の子指定ではアイドルのような顔立ちの表現が入る（精霊型）', () => {
    const p = buildPrompt(chart, spec, 3, 'normal', 'girl');
    expect(p.prompt).toContain('a cute little girl fairy spirit character');
    expect(p.prompt).toContain('cute idol-like face');
    expect(p.prompt).toContain('big sparkling eyes');
    expect(p.prompt).toContain('bright, cheerful smile');
    expect(p.prompt).toContain('ribbon hair accessory');
    const ja = p.partsJa.find((x) => x.label === '見た目');
    expect(ja?.value).toContain('女の子');
    expect(ja?.value).toContain('アイドル');
  });

  it('顔立ちは少しリアル寄りで整った方向の表現が入る（男女共通）', () => {
    for (const a of ['boy', 'girl'] as const) {
      const p = buildPrompt(chart, spec, 3, 'normal', a);
      expect(p.prompt).toContain('slightly realistic');
      expect(p.prompt).toContain('well-defined facial features');
    }
  });

  it('歌手系の語は呪文に入らない（全形態・男女共通）', () => {
    const singerWords = ['headset', 'microphone', 'stage outfit', 'star-shaped', 'idol smile', 'singer'];
    const forms = ['人型', '精霊型', '獣型', '道具型', '群体型'] as const;
    for (const form of forms) {
      for (const a of ['boy', 'girl'] as const) {
        const p = buildPrompt(chart, { ...spec, form }, 3, 'normal', a);
        for (const w of singerWords) {
          expect(p.prompt, `${form}/${a} に ${w} が入っている`).not.toContain(w);
        }
      }
    }
  });

  it('指定なしでは性別・顔立ちの表現が入らない（従来どおり）', () => {
    const p = buildPrompt(chart, spec, 3, 'normal', 'none');
    expect(p.prompt).toContain('a small floating fairy-like spirit character');
    expect(p.prompt).not.toContain('girl');
    expect(p.prompt).not.toContain('idol-like');
    expect(p.prompt).not.toContain('ribbon hair accessory');
  });

  it('獣型では性別表現を付けず、顔まわりの小さな差だけにする', () => {
    const beast = { ...spec, form: '獣型' as const };
    const girl = buildPrompt(chart, beast, 3, 'normal', 'girl');
    expect(girl.prompt).toContain('a small beast-like character standing upright');
    expect(girl.prompt).toContain('long eyelashes');
    expect(girl.prompt).toContain('soft gentle expression');
    expect(girl.prompt).toContain('cute ribbon');
    expect(girl.prompt).not.toContain('girl character');
    expect(girl.prompt).not.toContain('idol-like face');
    const boy = buildPrompt(chart, beast, 3, 'normal', 'boy');
    expect(boy.prompt).toContain('strong neat eyebrows');
    expect(boy.prompt).toContain('sparkling clear eyes');
    expect(boy.prompt).not.toContain('boy character');
    expect(boy.prompt).not.toContain('tiny little cap');
  });

  it('見た目を変えてもトーン・称号まわりの前提は変わらない（ネガティブはトーンのみで決まる）', () => {
    const p = buildPrompt(chart, spec, 3, 'villain', 'girl');
    expect(p.negative).not.toContain('dark mood');
    expect(p.prompt).toContain('devil horns');
    expect(p.prompt).toContain('a cute little girl fairy spirit character');
  });
});

describe('見た目の保存データ読み替え（normalizeAppearance）', () => {
  it("v0.1.8 の 'idol' は男の子として扱う", () => {
    expect(normalizeAppearance('idol')).toBe('boy');
  });

  it('現行の値はそのまま通す', () => {
    expect(normalizeAppearance('none')).toBe('none');
    expect(normalizeAppearance('boy')).toBe('boy');
    expect(normalizeAppearance('girl')).toBe('girl');
  });

  it('未知の値・欠落は「指定なし」に倒す', () => {
    expect(normalizeAppearance(undefined)).toBe('none');
    expect(normalizeAppearance(null)).toBe('none');
    expect(normalizeAppearance('unknown')).toBe('none');
  });
});
