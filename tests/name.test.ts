import { describe, it, expect } from 'vitest';
import { buildDisplayName, displayNameSegments } from '../src/name';

// v0.1.5: 表示名はプレフィックスとニックネームを空白なしでつなげた1行が基本形
describe('表示名の組み立て', () => {
  it('プレフィックス＋ニックネームを空白なしでつなげる', () => {
    expect(buildDisplayName('誇り高き騎士', 'ゆうと', '')).toBe('誇り高き騎士ゆうと');
  });

  it('ポストフィックスがある場合は末尾に「・ポストフィックス」を付ける', () => {
    expect(buildDisplayName('誇り高き騎士', 'ゆうと', '宝石の磨き手')).toBe('誇り高き騎士ゆうと・宝石の磨き手');
  });

  it('空白が入らない', () => {
    expect(buildDisplayName('ほほえむ作り手', 'タロウ', 'ツタの守り手')).not.toMatch(/\s/);
  });

  it('セグメントは prefix / nickname / postfix の順で、ポストフィックスには「・」が付く', () => {
    const segs = displayNameSegments('誇り高き騎士', 'ゆうと', '宝石の磨き手');
    expect(segs.map((s) => s.kind)).toEqual(['prefix', 'nickname', 'postfix']);
    expect(segs.map((s) => s.text)).toEqual(['誇り高き騎士', 'ゆうと', '・宝石の磨き手']);
  });

  it('ポストフィックスが空ならセグメントは2つだけ', () => {
    const segs = displayNameSegments('誇り高き騎士', 'ゆうと', '');
    expect(segs).toHaveLength(2);
  });
});
