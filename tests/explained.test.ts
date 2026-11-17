import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { computeChart, yearFortune, ZHI_ANIMAL } from '../src/fortune';
import { explainedInfoOf, personalityTextsOf, fortuneBodyOf, companionLineOf } from '../src/texts';
import { hasSealImage, type Entry } from '../src/store';

// v0.1.9: 解説つきシールの文面は explainedInfoOf（単一の生成処理）に寄せ、
// 詳細画面の書き出しと一覧ビューアでずれないようにする。
describe('解説つきシールの共通生成（explainedInfoOf）', () => {
  const yuto = computeChart({ y: 1986, m: 5, d: 7, hour: null, minute: 0 });

  it('ゆうと（1986-05-07）の性格・運勢・装備がそろう', () => {
    const info = explainedInfoOf(yuto, 2026);
    expect(info.personality.length).toBeGreaterThanOrEqual(2);
    expect(info.fortuneHeading).toMatch(/^2026年の運勢（.+）$/);
    expect(info.fortuneBody.length).toBe(3);
    // ゆうとのメイン装備は正官＝勲章とマント
    expect(info.equipLines.some((l) => l.includes('勲章とマント'))).toBe(true);
    expect(info.equipLines.some((l) => l.includes('お守りのリボンチャーム'))).toBe(true);
    expect(info.footer).toContain('命式シール');
  });

  // v0.2.12: 「装備の意味」の末尾にお供（相棒）の説明行を足す（オーナー指摘「お供の説明ないの？」）
  it('装備の意味の末尾にお供の説明行が入る', () => {
    const info = explainedInfoOf(yuto, 2026);
    const last = info.equipLines[info.equipLines.length - 1];
    expect(last).toBe(companionLineOf(yuto));
    expect(last.startsWith(`お供の${ZHI_ANIMAL[yuto.dayZhi]}：`)).toBe(true);
    expect(last).toContain(`（日支 ${yuto.dayZhi}）`);
    // 具体例：マサト（1977-07-07、日支 丑）は牛の行になる
    const masato = computeChart({ y: 1977, m: 7, d: 7, hour: null, minute: 0 });
    expect(masato.dayZhi).toBe('丑');
    const minfo = explainedInfoOf(masato, 2026);
    expect(minfo.equipLines[minfo.equipLines.length - 1])
      .toBe('お供の牛：粘り強さと芯の強さの象徴です（日支 丑）');
  });

  it('運勢本文は fortuneBodyOf と一致する（表示箇所でずれない）', () => {
    const info = explainedInfoOf(yuto, 2026);
    expect(info.fortuneBody).toEqual(fortuneBodyOf(yuto, yearFortune(yuto, 2026)));
    expect(info.personality).toEqual(personalityTextsOf(yuto));
  });
});

// v0.1.9: 日干が同じ2人でも文面が分かれること（オーナー実例：同じ年の6月9日と8月18日はどちらも丙日）
describe('読み文面のバリエーション（日干が同じ丙の2人）', () => {
  const june = computeChart({ y: 2015, m: 6, d: 9, hour: null, minute: 0 });
  const august = computeChart({ y: 2015, m: 8, d: 18, hour: null, minute: 0 });

  it('前提：どちらも日干は丙', () => {
    expect(june.dayGan).toBe('丙');
    expect(august.dayGan).toBe('丙');
  });

  it('性格の書き出しが同一にならない（季節感と日支で分かれる）', () => {
    const a = personalityTextsOf(june);
    const b = personalityTextsOf(august);
    expect(a[0]).not.toBe(b[0]); // 日干の要約＋生まれ月の季節感
    expect(a.join('\n')).not.toBe(b.join('\n'));
    // 日干の要約自体は共通の出発点として残る
    expect(a[0]).toContain('太陽のように明るく');
    expect(b[0]).toContain('太陽のように明るく');
  });

  it('今年（2026年）の運勢本文が同一にならない', () => {
    const a = fortuneBodyOf(june, yearFortune(june, 2026));
    const b = fortuneBodyOf(august, yearFortune(august, 2026));
    expect(a.join('\n')).not.toBe(b.join('\n'));
    // 流年の星の文と段階の総評は、同じ日干・同じ段階なら共通でよい
    expect(a[0]).toBe(b[0]);
    // その人に寄せた一文（2文目）が分かれる
    expect(a[1]).not.toBe(b[1]);
  });

  it('解説つきシール全体でも2人の文面が分かれる', () => {
    const a = explainedInfoOf(june, 2026);
    const b = explainedInfoOf(august, 2026);
    expect(a.personality.join('\n')).not.toBe(b.personality.join('\n'));
    expect(a.fortuneBody.join('\n')).not.toBe(b.fortuneBody.join('\n'));
  });
});

// v0.2.11: 解説つきシールの節の順序は「性格／運勢／職業／見た目／装備の意味」
// （オーナー指示「説明文は性格と運勢が先にあった方がいい」。対象はシール合成のみ）
describe('解説つきシールの節の順序（composeExplainedSeal）', () => {
  it('性格→運勢→職業→見た目→装備の意味 の順で並ぶ', () => {
    const sealSrc = readFileSync(new URL('../src/seal.ts', import.meta.url), 'utf8');
    const order = [
      "build('性格', info.personality)",
      'build(info.fortuneHeading, info.fortuneBody)',
      "build('職業', [info.jobLine])",
      "build('見た目', info.appearanceLines)",
      "build('装備の意味', info.equipLines)",
    ];
    const positions = order.map((s) => sealSrc.indexOf(s));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

// v0.1.9: 一覧の「解説つきで見る」ボタンは完成済み（画像登録済み）にだけ出す
describe('一覧ボタンの表示条件（hasSealImage）', () => {
  const base: Entry = {
    id: 'e1', nickname: 'テスト', y: 1990, m: 1, d: 1, hour: null, minute: 0,
    status: 'waiting', createdAt: 0,
  };

  it('画像待ち（画像なし）では出さない', () => {
    expect(hasSealImage(base)).toBe(false);
    expect(hasSealImage({ ...base, image: '' })).toBe(false);
  });

  it('完成・贈った（画像あり）では出す', () => {
    const img = 'data:image/jpeg;base64,xxxx';
    expect(hasSealImage({ ...base, status: 'done', image: img })).toBe(true);
    expect(hasSealImage({ ...base, status: 'sent', image: img })).toBe(true);
  });
});
