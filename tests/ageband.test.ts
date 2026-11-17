import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  computeChart, decideCharacter, ageAt, ageBandOf, GAN_ELEMENT,
  type AgeBand, type Element,
} from '../src/fortune';
import {
  buildPrompt, buildTextOf, hairTextOf, appearanceReasonLines, explainedInfoOf,
} from '../src/texts';

// v0.2.5: 年齢区分（子ども／若者／青年／中年／円熟）・体格（最強の五行）・髪（日干の五行）。
// どれも命式と年齢から自動で決まり、利用者は選べない。
// 年齢は生成時点の今日の日付で計算する満年齢。
const TODAY = new Date(2026, 10, 17); // 2026-11-17 を「今日」として固定

describe('年齢区分の判定（ageBandOf）', () => {
  it('満年齢の計算（誕生日前は1歳引く）', () => {
    expect(ageAt({ y: 2013, m: 11, d: 18 }, TODAY)).toBe(12); // 誕生日の前日
    expect(ageAt({ y: 2013, m: 11, d: 17 }, TODAY)).toBe(13); // 誕生日当日
    expect(ageAt({ y: 2010, m: 10, d: 28 }, TODAY)).toBe(16);
  });

  it('境界：12歳まで子ども／13歳から若者', () => {
    expect(ageBandOf({ y: 2014, m: 11, d: 17 }, TODAY)).toBe('child'); // 12歳
    expect(ageBandOf({ y: 2013, m: 11, d: 18 }, TODAY)).toBe('child'); // 12歳（誕生日前）
    expect(ageBandOf({ y: 2013, m: 11, d: 17 }, TODAY)).toBe('youth'); // 13歳
  });

  it('境界：19歳まで若者／20歳から青年', () => {
    expect(ageBandOf({ y: 2007, m: 11, d: 17 }, TODAY)).toBe('youth'); // 19歳
    expect(ageBandOf({ y: 2006, m: 11, d: 17 }, TODAY)).toBe('adult'); // 20歳
  });

  it('境界：39歳まで青年／40歳から中年', () => {
    expect(ageBandOf({ y: 1987, m: 11, d: 17 }, TODAY)).toBe('adult'); // 39歳
    expect(ageBandOf({ y: 1986, m: 11, d: 17 }, TODAY)).toBe('middle'); // 40歳
    // 1986-05-07 生まれは、39歳の間は青年、40歳の誕生日から中年
    expect(ageBandOf({ y: 1986, m: 5, d: 7 }, new Date(2026, 4, 6))).toBe('adult');
    expect(ageBandOf({ y: 1986, m: 5, d: 7 }, new Date(2026, 4, 7))).toBe('middle');
  });

  it('境界：59歳まで中年／60歳から円熟', () => {
    expect(ageBandOf({ y: 1967, m: 11, d: 17 }, TODAY)).toBe('middle'); // 59歳
    expect(ageBandOf({ y: 1966, m: 11, d: 17 }, TODAY)).toBe('mature'); // 60歳
  });
});

describe('年齢区分の呪文への反映（人型・男の子）', () => {
  // ゆうと（2010-10-28）＝人型。区分だけを差し替えて文言を見る
  const chart = computeChart({ y: 2010, m: 10, d: 28, hour: null, minute: 0 });
  const spec = decideCharacter(chart);
  const jaOf = (p: ReturnType<typeof buildPrompt>) => p.partsJa.find((x) => x.label === '見た目')?.value ?? '';

  it('前提：人型である', () => {
    expect(spec.form).toBe('人型');
  });

  it('子ども：元気な子どもの表現と約2.5頭身', () => {
    const p = buildPrompt(chart, spec, 3, 'knight', 'boy', 'child');
    expect(p.prompt).toContain('a cheerful little boy character');
    expect(p.prompt).toContain('childlike face');
    expect(p.prompt).toContain('about 2.5 heads tall');
    expect(jaOf(p)).toContain('男の子（子ども）');
  });

  it('若者：v0.2.4 の表現そのまま（アイドルのような顔立ち・約3頭身）', () => {
    const p = buildPrompt(chart, spec, 3, 'knight', 'boy', 'youth');
    expect(p.prompt).toContain('a handsome young male character with an idol-like face');
    expect(p.prompt).toContain('about 3 heads tall, with slightly more mature proportions');
    expect(p.prompt).toContain('fresh, confident smile');
    expect(jaOf(p)).toContain('男の子（若者）');
    // 区分を渡さない場合も若者（従来の見本を維持）
    const d = buildPrompt(chart, spec, 3, 'knight', 'boy');
    expect(d.prompt).toBe(p.prompt);
  });

  it('青年：大人の男性の表現と約3.5頭身、少年・少女を思わせる語は使わない', () => {
    const p = buildPrompt(chart, spec, 3, 'knight', 'boy', 'adult');
    expect(p.prompt).toContain('a handsome adult man character');
    expect(p.prompt).toContain('about 3.5 heads tall, with adult proportions');
    expect(p.prompt).not.toContain('idol-like');
    expect(p.prompt).not.toContain('young male');
    expect(p.prompt).not.toContain('childlike');
    expect(jaOf(p)).toContain('男の子（青年）');
    const g = buildPrompt(chart, spec, 3, 'knight', 'girl', 'adult');
    expect(g.prompt).toContain('a beautiful adult woman character');
    expect(jaOf(g)).toContain('女の子（青年）');
  });

  it('中年：円熟した大人の魅力。老いを強調する語は入れない', () => {
    const p = buildPrompt(chart, spec, 3, 'knight', 'boy', 'middle');
    expect(p.prompt).toContain('a dignified middle-aged man character');
    expect(p.prompt).toContain('calm mature charm');
    expect(p.prompt).toContain('about 3.5 heads tall, with adult proportions');
    expect(p.prompt).not.toContain('wrinkle');
    expect(p.prompt).not.toContain('gray');
    expect(jaOf(p)).toContain('男の子（中年）');
  });

  it('円熟：貫禄と穏やかさ。しわ・弱々しさの語は入れず、髪の銀色は少しだけ', () => {
    const p = buildPrompt(chart, spec, 3, 'knight', 'boy', 'mature');
    expect(p.prompt).toContain('serene gravitas');
    expect(p.prompt).toContain('still vibrant and full of life');
    expect(p.prompt).toContain('about 3.5 heads tall, with adult proportions');
    expect(p.prompt).toContain('a few silver strands mixed in');
    expect(p.prompt).not.toContain('wrinkle');
    expect(p.prompt).not.toContain('frail');
    expect(p.prompt).not.toContain('gray');
    expect(jaOf(p)).toContain('男の子（円熟）');
  });

  it('全区分で矛盾する語が混ざらない（人型・男女）', () => {
    const bands: AgeBand[] = ['child', 'youth', 'adult', 'middle', 'mature'];
    for (const band of bands) {
      for (const a of ['boy', 'girl'] as const) {
        const p = buildPrompt(chart, spec, 3, 'knight', a, band);
        expect(p.prompt, `${band}/${a}`).not.toContain('wrinkle');
        if (band !== 'child') expect(p.prompt, `${band}/${a}`).not.toContain('childlike');
        if (band !== 'youth') expect(p.prompt, `${band}/${a}`).not.toContain('idol-like');
        if (band === 'child' || band === 'youth') {
          expect(p.prompt, `${band}/${a}`).not.toContain('3.5 heads tall');
          expect(p.prompt, `${band}/${a}`).not.toContain('middle-aged');
        }
        if (band === 'adult' || band === 'middle' || band === 'mature') {
          expect(p.prompt, `${band}/${a}`).not.toContain('2.5 heads tall');
        }
      }
    }
  });

  it('指定なしでは年齢区分は効かない（従来どおり）', () => {
    for (const band of ['child', 'adult', 'mature'] as AgeBand[]) {
      const p = buildPrompt(chart, spec, 3, 'knight', 'none', band);
      expect(p.prompt).toContain('about 2.5 heads tall');
      expect(p.prompt).not.toContain('adult man');
      expect(p.prompt).not.toContain('idol-like');
    }
  });
});

describe('見本の維持（ゆうと 2010-10-28）', () => {
  const birth = { y: 2010, m: 10, d: 28, hour: null, minute: 0 };
  const chart = computeChart(birth);
  const spec = decideCharacter(chart);

  it('2026-11-17 時点で若者（16歳）', () => {
    expect(ageBandOf(birth, TODAY)).toBe('youth');
  });

  it('年齢まわりの文言は v0.2.4 と同じ（若者の表現）', () => {
    const p = buildPrompt(chart, spec, 4, 'knight', 'boy', ageBandOf(birth, TODAY));
    expect(p.prompt).toContain('a handsome young male character with an idol-like face');
    expect(p.prompt).toContain('about 3 heads tall, with slightly more mature proportions');
    expect(p.prompt).toContain('clearly drawn irises');
    expect(p.prompt).toContain('fresh, confident smile');
  });
});

describe('体格（最強の五行）と髪（日干の五行）', () => {
  it('体格：5つの五行それぞれに文がある（人型は強く、他形態は弱く）', () => {
    const cases: [Element, string, string][] = [
      ['木', 'tall, slender, supple build', 'すらりと伸びやか'],
      ['火', 'radiant, glamorous presence', '華やかで明るい存在感'],
      ['土', 'reassuringly sturdy build', 'どっしり'],
      ['金', 'sharp, crisp, dignified silhouette', 'シャープで凛々しい'],
      ['水', 'soft, graceful build', '柔らかく神秘的'],
    ];
    for (const [el, en, ja] of cases) {
      const strong = buildTextOf(el, '人型');
      expect(strong.en, el).toContain(en);
      expect(strong.ja, el).toContain(ja);
      const weak = buildTextOf(el, '獣型');
      expect(weak.en, el).not.toBe(strong.en); // 他形態は含みとして弱い文になる
      expect(weak.ja, el).toBe(strong.ja);
    }
  });

  it('髪：日干の五行ごとに色・髪型の文がある', () => {
    const cases: [Element, string, string][] = [
      ['木', 'green-tinged brown hair', '緑がかった髪'],
      ['火', 'reddish hair', '赤みのある髪'],
      ['土', 'calm brown hair', '落ち着いた茶色の髪'],
      ['金', 'bright silvery-gold hair', '銀に近い明るい髪'],
      ['水', 'black to deep blue hair', '深い青の髪'],
    ];
    for (const [el, en, ja] of cases) {
      const t = hairTextOf(el, '人型', 'youth');
      expect(t.en, el).toContain(en);
      expect(t.ja, el).toContain(ja);
    }
  });

  it('髪：獣型は毛並み、道具型・群体型は差し色として反映する', () => {
    const beast = hairTextOf('金', '獣型', 'youth');
    expect(beast.en).toContain('coat and fur');
    expect(beast.ja).toContain('毛並み');
    for (const form of ['道具型', '群体型'] as const) {
      const acc = hairTextOf('水', form, 'youth');
      expect(acc.en).toContain('Accent colors');
      expect(acc.ja).toContain('差し色');
    }
  });

  it('髪色は年齢区分によらず五行どおり（円熟だけ銀色が少し混じる）', () => {
    for (const band of ['child', 'youth', 'adult', 'middle'] as AgeBand[]) {
      const t = hairTextOf('水', '人型', band);
      expect(t.en, band).toContain('black to deep blue hair');
      expect(t.en, band).not.toContain('silver strands');
    }
    const mature = hairTextOf('水', '人型', 'mature');
    expect(mature.en).toContain('black to deep blue hair');
    expect(mature.en).toContain('a few silver strands mixed in');
  });

  it('日干の並び（2010-10-28=辛から10日）で髪の文が五行どおりに変わる', () => {
    // 日干は10日周期：辛(金)→壬(水)→癸(水)→甲(木)→乙(木)→丙(火)→丁(火)→戊(土)→己(土)→庚(金)
    const expected: [number, string][] = [
      [28, '金'], [29, '水'], [30, '水'], [31, '木'],
    ];
    for (const [d, el] of expected) {
      const c = computeChart({ y: 2010, m: 10, d, hour: null, minute: 0 });
      expect(GAN_ELEMENT[c.dayGan], `10/${d}`).toBe(el);
    }
    const nov: [number, string][] = [[1, '木'], [2, '火'], [3, '火'], [4, '土'], [5, '土'], [6, '金']];
    for (const [d, el] of nov) {
      const c = computeChart({ y: 2010, m: 11, d, hour: null, minute: 0 });
      expect(GAN_ELEMENT[c.dayGan], `11/${d}`).toBe(el);
    }
  });

  it('ゆうと（2010-10-28）：日干 辛＝金、最強の五行も金 → 体格はシャープ、髪は銀に近い明るい髪', () => {
    const chart = computeChart({ y: 2010, m: 10, d: 28, hour: null, minute: 0 });
    const spec = decideCharacter(chart);
    expect(chart.dayGan).toBe('辛');
    expect(chart.strongestElement).toBe('金');
    const p = buildPrompt(chart, spec, 4, 'knight', 'boy', 'youth');
    expect(p.prompt).toContain('sharp, crisp, dignified silhouette');
    expect(p.prompt).toContain('bright silvery-gold hair');
    const build = p.partsJa.find((x) => x.label.startsWith('体格'));
    expect(build?.value).toContain('シャープで凛々しい');
    expect(build?.value).toContain('金');
    const hair = p.partsJa.find((x) => x.label === '髪');
    expect(hair?.value).toContain('銀に近い明るい髪');
    expect(hair?.value).toContain('辛');
  });

  it('1986-05-07：最強の五行は火 → 体格は華やかな存在感の文が入る', () => {
    const chart = computeChart({ y: 1986, m: 5, d: 7, hour: null, minute: 0 });
    const spec = decideCharacter(chart);
    expect(chart.strongestElement).toBe('火');
    const p = buildPrompt(chart, spec, 3, 'knight', 'boy', 'adult');
    expect(p.prompt).toContain('radiant, glamorous presence');
    // 精霊型でも青年は大人の表現になる
    expect(p.prompt).toContain('a handsome adult man fairy spirit character');
    const ja = p.partsJa.find((x) => x.label === '見た目');
    expect(ja?.value).toContain('男の子（青年）');
  });
});

describe('外見の理由の説明（設計欄と解説つきシールで共用）', () => {
  const birth = { y: 2010, m: 10, d: 28, hour: null, minute: 0 };
  const chart = computeChart(birth);
  const spec = decideCharacter(chart);
  const band = ageBandOf(birth, TODAY);

  it('理由文に区分名・五行・日干の根拠が入る（ゆうと 2010-10-28）', () => {
    const r = appearanceReasonLines(chart, spec, band);
    expect(r.ageLine).toContain('若者');
    expect(r.ageLine).toContain('13〜19歳');
    expect(r.buildLine).toContain('シャープで凛々しい');
    expect(r.buildLine).toContain('『金』');
    expect(r.hairLine).toContain('銀に近い明るい髪');
    expect(r.hairLine).toContain('『辛』');
    expect(r.hairLine).toContain('金');
  });

  it('explainedInfoOf の「見た目」節に年齢感・体格・髪・顔の装飾と根拠が入る', () => {
    const info = explainedInfoOf(chart, 2026, band);
    expect(info.appearanceLines).toHaveLength(4);
    const joined = info.appearanceLines.join('\n');
    expect(joined).toContain('年齢感');
    expect(joined).toContain('若者');
    expect(joined).toContain('体格');
    expect(joined).toContain('シャープ');
    expect(joined).toContain('『金』');
    expect(joined).toContain('髪');
    expect(joined).toContain('銀に近い');
    expect(joined).toContain('『辛』');
    expect(joined).toContain('顔の装飾');
    expect(joined).toContain('職業『騎士』から');
    // 既存の節はそのまま
    expect(info.personality.length).toBeGreaterThanOrEqual(2);
    expect(info.jobLine).toContain('騎士');
    expect(info.equipLines.some((l) => l.includes('勲章とマント'))).toBe(true);
  });

  it('詳細画面（main.ts）の設計表示にも同じ理由が出る', () => {
    const mainSrc = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(mainSrc).toContain('appearanceReasonLines');
    expect(mainSrc).toContain('ageBandOf');
    expect(mainSrc).toContain('<strong>見た目の年齢感</strong>');
    expect(mainSrc).toContain('<strong>体格</strong>');
    // 解説つきシールの生成でも年齢区分を渡す
    expect(mainSrc).toContain('explainedInfoOf(chart, new Date().getFullYear(), ageBandOf(person.birth))');
  });

  it('解説つきシール（seal.ts）に「見た目」の節がある', () => {
    const sealSrc = readFileSync(new URL('../src/seal.ts', import.meta.url), 'utf8');
    expect(sealSrc).toContain("build('見た目', info.appearanceLines)");
  });
});
