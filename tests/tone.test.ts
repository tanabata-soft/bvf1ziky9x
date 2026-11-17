import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  computeChart, decideCharacter, defaultToneOf, toneOfChart, TONE_OF_STAR, TONE_LABEL, DARK_TONES,
  type ShiShen, type Tone,
} from '../src/fortune';
import { buildPrompt, negativePromptOf, prefixTitleOf, toneReasonOf, TONE_INFO } from '../src/texts';
import { addEntry, loadEntries } from '../src/store';

// v0.1.6: キャラのトーン（旧：共通3種を利用者が選択）
// v0.2.3: トーンは利用者が選ぶものではなく、最強の通変ごとに固有の10種で常に自動決定する。
// 名称・理由・雰囲気文・帯色はトーンごとに作り分ける。
describe('トーンの決定ルール（最強の通変ごとの固有トーン）', () => {
  const EXPECTED: Record<ShiShen, Tone> = {
    正官: 'hero', 正印: 'sage', 正財: 'guardian', 食神: 'healer', 比肩: 'lonewolf',
    劫財: 'gambler', 傷官: 'rebel', 偏財: 'trickster', 七殺: 'villain', 偏印: 'phantom',
  };
  it('10星すべてが期待どおりの固有トーンになる', () => {
    for (const star of Object.keys(EXPECTED) as ShiShen[]) {
      expect(defaultToneOf(star), star).toBe(EXPECTED[star]);
      expect(TONE_OF_STAR[star], star).toBe(EXPECTED[star]);
    }
  });
  it('10種のトーンはすべて相異なる（星ごとに固有）', () => {
    expect(new Set(Object.values(EXPECTED)).size).toBe(10);
    expect(new Set(Object.values(TONE_OF_STAR)).size).toBe(10);
  });
  it('トーン名称がオーナー決定どおり', () => {
    expect(TONE_LABEL.hero).toBe('ヒーロー（正統派）');
    expect(TONE_LABEL.sage).toBe('賢者');
    expect(TONE_LABEL.guardian).toBe('守り手');
    expect(TONE_LABEL.healer).toBe('癒し手');
    expect(TONE_LABEL.lonewolf).toBe('一匹狼');
    expect(TONE_LABEL.gambler).toBe('勝負師');
    expect(TONE_LABEL.rebel).toBe('反逆者');
    expect(TONE_LABEL.trickster).toBe('トリックスター');
    expect(TONE_LABEL.villain).toBe('ヴィラン');
    expect(TONE_LABEL.phantom).toBe('幻惑者');
  });
  it('10星すべてに理由文があり、toneReasonOf が引ける', () => {
    for (const star of Object.keys(EXPECTED) as ShiShen[]) {
      expect(toneReasonOf(star).length, star).toBeGreaterThan(0);
      expect(toneReasonOf(star)).toBe(TONE_INFO[EXPECTED[star]].reason);
    }
    expect(toneReasonOf('正官')).toBe('名誉と秩序の星');
    expect(toneReasonOf('傷官')).toBe('権威に逆らう反骨の才能');
    expect(toneReasonOf('偏印')).toBe('読めないひらめきと孤独の星');
  });
  it('10種すべてに雰囲気文（EN/JA）がある', () => {
    for (const tone of Object.values(EXPECTED)) {
      expect(TONE_INFO[tone].moodEn.length, tone).toBeGreaterThan(0);
      expect(TONE_INFO[tone].moodJa.length, tone).toBeGreaterThan(0);
      expect(TONE_INFO[tone].moodJa, tone).toContain(TONE_LABEL[tone].replace(/（.*）/, ''));
    }
  });
});

describe('toneOfChart（命式から常に算出する）', () => {
  it('ゆうと（1986-05-07、最強は正官）はヒーロー', () => {
    const chart = computeChart({ y: 1986, m: 5, d: 7, hour: null, minute: 0 });
    expect(chart.strongest).toBe('正官');
    expect(toneOfChart(chart)).toBe('hero');
  });
  it('最強が偏印（1988-12-01）は幻惑者', () => {
    const chart = computeChart({ y: 1988, m: 12, d: 1, hour: null, minute: 0 });
    expect(chart.strongest).toBe('偏印');
    expect(toneOfChart(chart)).toBe('phantom');
  });
  it('最強が傷官（1985-11-02）は反逆者', () => {
    const chart = computeChart({ y: 1985, m: 11, d: 2, hour: null, minute: 0 });
    expect(chart.strongest).toBe('傷官');
    expect(toneOfChart(chart)).toBe('rebel');
  });
});

describe('保存済みの手動 tone は使われない（データ自体は壊さない）', () => {
  class MemStorage {
    private map = new Map<string, string>();
    get length() { return this.map.size; }
    key(i: number) { return [...this.map.keys()][i] ?? null; }
    getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
    setItem(k: string, v: string) { this.map.set(k, String(v)); }
    removeItem(k: string) { this.map.delete(k); }
    clear() { this.map.clear(); }
  }
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemStorage();
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('旧UIで tone=villain を保存した ゆうと でも、使うトーンは算出値 hero で、保存データの tone は残る', () => {
    addEntry({
      nickname: 'ゆうと', y: 1986, m: 5, d: 7, hour: null, minute: 0,
      status: 'waiting', tone: 'villain',
    });
    const [saved] = loadEntries();
    expect(saved.tone).toBe('villain'); // データは消さない・壊さない
    const chart = computeChart({ y: saved.y, m: saved.m, d: saved.d, hour: saved.hour, minute: saved.minute });
    expect(toneOfChart(chart)).toBe('hero'); // 使うのは常に算出値
  });
});

describe('トーンを選ぶUIは無い（v0.2.3）', () => {
  const mainSrc = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  it('main.ts にトーンのラジオ選択や保存済み tone の参照が無い', () => {
    expect(mainSrc).not.toContain('toneSel');
    expect(mainSrc).not.toContain('onToneChange');
    expect(mainSrc).not.toContain('entry.tone');
    expect(mainSrc).not.toContain('e.tone');
  });
  it('main.ts はトーン表示に toneOfChart と理由文を使う', () => {
    expect(mainSrc).toContain('toneOfChart');
    expect(mainSrc).toContain('toneReasonOf');
  });
});

describe('称号は星ごとに1つ（そのトーンの性格を反映）', () => {
  it('ゆうとの見本：正官＝誇り高き騎士、偏印＝深淵の探求者', () => {
    expect(prefixTitleOf('正官')).toBe('誇り高き騎士');
    expect(prefixTitleOf('偏印')).toBe('深淵の探求者');
  });
  it('全通変に称号がある', () => {
    const stars = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印'] as const;
    for (const s of stars) {
      expect(prefixTitleOf(s).length, s).toBeGreaterThan(0);
    }
  });
});

describe('呪文とネガティブはトーンで出し分ける', () => {
  const chart = computeChart({ y: 1917, m: 7, d: 22, hour: null, minute: 0 });
  const spec = decideCharacter(chart);

  it('明るい系（ヒーロー）のネガティブは dark mood を含み、本文にヒーローの雰囲気文が入る', () => {
    const p = buildPrompt(chart, spec, 3, 'hero');
    expect(p.negative).toContain('dark mood');
    expect(p.prompt).toContain('orthodox hero');
    expect(p.prompt).not.toContain('illusionist');
  });

  it('幻惑者では dark mood が禁止から外れ、ホラー防止の語に替わる。本文に幻惑者の雰囲気文が入る', () => {
    const p = buildPrompt(chart, spec, 3, 'phantom');
    expect(p.negative).not.toContain('dark mood');
    expect(p.negative).toContain('horror');
    expect(p.negative).toContain('grotesque');
    expect(p.prompt).toContain('elusive illusionist');
  });

  it('ヴィランでは本文に支配者の雰囲気文が入る', () => {
    const p = buildPrompt(chart, spec, 3, 'villain');
    expect(p.negative).not.toContain('dark mood');
    expect(p.prompt).toContain('little ruler of the battlefield');
    expect(p.prompt).toContain('never horror');
  });

  it('negativePromptOf の出し分け：明るい系4種は dark mood 維持、影・闇系6種はホラー防止', () => {
    for (const t of ['hero', 'sage', 'guardian', 'healer'] as Tone[]) {
      expect(negativePromptOf(t), t).toContain('dark mood');
      expect(DARK_TONES).not.toContain(t);
    }
    for (const t of ['lonewolf', 'gambler', 'rebel', 'trickster', 'villain', 'phantom'] as Tone[]) {
      expect(negativePromptOf(t), t).not.toContain('dark mood');
      expect(negativePromptOf(t), t).toContain('realistic violence');
      expect(DARK_TONES).toContain(t);
    }
  });
});
