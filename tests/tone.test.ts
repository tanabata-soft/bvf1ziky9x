import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  computeChart, decideCharacter, defaultToneOf, toneOfChart, TONE_OF_STAR, TONE_LABEL, DARK_TONES,
  type ShiShen, type Tone,
} from '../src/fortune';
import { buildPrompt, negativePromptOf, prefixTitleOf, toneReasonOf, TONE_INFO, explainedInfoOf } from '../src/texts';
import { addEntry, loadEntries } from '../src/store';

// v0.1.6: キャラのトーン（旧：共通3種を利用者が選択）
// v0.2.3: 選択制を廃止し、最強の通変から常に自動決定に変更
// v0.2.4: トーンは「RPG の職業」10種として正式化（オーナー確定）。利用者は選べない。
describe('職業の決定ルール（最強の通変ごとの固有の職業）', () => {
  const EXPECTED: Record<ShiShen, Tone> = {
    正官: 'knight', 正印: 'priest', 正財: 'merchant', 食神: 'bard', 比肩: 'fighter',
    劫財: 'gladiator', 傷官: 'mage', 偏財: 'rogue', 七殺: 'darkknight', 偏印: 'seer',
  };
  it('10星すべてが期待どおりの職業になる', () => {
    for (const star of Object.keys(EXPECTED) as ShiShen[]) {
      expect(defaultToneOf(star), star).toBe(EXPECTED[star]);
      expect(TONE_OF_STAR[star], star).toBe(EXPECTED[star]);
    }
  });
  it('10種の職業はすべて相異なる（星ごとに固有）', () => {
    expect(new Set(Object.values(EXPECTED)).size).toBe(10);
    expect(new Set(Object.values(TONE_OF_STAR)).size).toBe(10);
  });
  it('職業の正式名称がオーナー確定どおり', () => {
    expect(TONE_LABEL.knight).toBe('騎士');
    expect(TONE_LABEL.priest).toBe('僧侶');
    expect(TONE_LABEL.merchant).toBe('商人');
    expect(TONE_LABEL.bard).toBe('吟遊詩人');
    expect(TONE_LABEL.fighter).toBe('武闘家');
    expect(TONE_LABEL.gladiator).toBe('闘士');
    expect(TONE_LABEL.mage).toBe('魔法使い');
    expect(TONE_LABEL.rogue).toBe('盗賊');
    expect(TONE_LABEL.darkknight).toBe('暗黒騎士');
    expect(TONE_LABEL.seer).toBe('占い師');
  });
  it('10星すべてに理由文があり、toneReasonOf が引ける', () => {
    for (const star of Object.keys(EXPECTED) as ShiShen[]) {
      expect(toneReasonOf(star).length, star).toBeGreaterThan(0);
      expect(toneReasonOf(star)).toBe(TONE_INFO[EXPECTED[star]].reason);
    }
    expect(toneReasonOf('正官')).toBe('名誉と秩序を重んじる星');
    expect(toneReasonOf('傷官')).toBe('型破りの才能と言葉の力');
    expect(toneReasonOf('偏印')).toBe('ひらめきと神秘の星');
  });
  it('10種すべてに雰囲気／装い文（EN/JA）があり、JA は職業名を含む', () => {
    for (const tone of Object.values(EXPECTED)) {
      expect(TONE_INFO[tone].moodEn.length, tone).toBeGreaterThan(0);
      expect(TONE_INFO[tone].moodJa.length, tone).toBeGreaterThan(0);
      expect(TONE_INFO[tone].moodJa, tone).toContain(TONE_LABEL[tone]);
    }
  });
});

describe('toneOfChart（命式から常に算出する）', () => {
  it('ゆうと（1986-05-07、最強は正官）は騎士', () => {
    const chart = computeChart({ y: 1986, m: 5, d: 7, hour: null, minute: 0 });
    expect(chart.strongest).toBe('正官');
    expect(toneOfChart(chart)).toBe('knight');
  });
  it('最強が偏印（1988-12-01）は占い師', () => {
    const chart = computeChart({ y: 1988, m: 12, d: 1, hour: null, minute: 0 });
    expect(chart.strongest).toBe('偏印');
    expect(toneOfChart(chart)).toBe('seer');
  });
  it('最強が傷官（1985-11-02）は魔法使い', () => {
    const chart = computeChart({ y: 1985, m: 11, d: 2, hour: null, minute: 0 });
    expect(chart.strongest).toBe('傷官');
    expect(toneOfChart(chart)).toBe('mage');
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

  it('旧UIで tone=villain を保存した ゆうと でも、使う職業は算出値 knight で、保存データの tone は残る', () => {
    addEntry({
      nickname: 'ゆうと', y: 1986, m: 5, d: 7, hour: null, minute: 0,
      status: 'waiting', tone: 'villain' as unknown as Tone, // v0.2.2 までの旧形式の値
    });
    const [saved] = loadEntries();
    expect(saved.tone as unknown).toBe('villain'); // データは消さない・壊さない
    const chart = computeChart({ y: saved.y, m: saved.m, d: saved.d, hour: saved.hour, minute: saved.minute });
    expect(toneOfChart(chart)).toBe('knight'); // 使うのは常に算出値
  });
});

describe('職業を選ぶUIは無い（v0.2.3〜）', () => {
  const mainSrc = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  it('main.ts にトーンのラジオ選択や保存済み tone の参照が無い', () => {
    expect(mainSrc).not.toContain('toneSel');
    expect(mainSrc).not.toContain('onToneChange');
    expect(mainSrc).not.toContain('entry.tone');
    expect(mainSrc).not.toContain('e.tone');
  });
  it('main.ts は職業表示に toneOfChart と理由文を使う', () => {
    expect(mainSrc).toContain('toneOfChart');
    expect(mainSrc).toContain('toneReasonOf');
    expect(mainSrc).toContain('<strong>職業</strong>');
  });
});

describe('称号は星ごとに1つ（職業と地続き）', () => {
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

describe('解説つきシールの文面に職業が含まれる（v0.2.4）', () => {
  it('ゆうとの jobLine は騎士＋理由', () => {
    const chart = computeChart({ y: 1986, m: 5, d: 7, hour: null, minute: 0 });
    const info = explainedInfoOf(chart, 2026);
    expect(info.jobLine).toContain('騎士');
    expect(info.jobLine).toContain('名誉と秩序を重んじる星');
    expect(info.jobLine).toContain('正官');
  });
});

describe('呪文とネガティブは職業で出し分ける', () => {
  const chart = computeChart({ y: 1917, m: 7, d: 22, hour: null, minute: 0 });
  const spec = decideCharacter(chart);

  it('明るい系（騎士）のネガティブは dark mood を含み、本文に騎士の装い文が入る', () => {
    const p = buildPrompt(chart, spec, 3, 'knight');
    expect(p.negative).toContain('dark mood');
    expect(p.prompt).toContain('little knight');
    expect(p.prompt).not.toContain('fortune teller');
  });

  it('占い師では dark mood が禁止から外れ、ホラー防止の語に替わる。本文に占い師の装い文が入る', () => {
    const p = buildPrompt(chart, spec, 3, 'seer');
    expect(p.negative).not.toContain('dark mood');
    expect(p.negative).toContain('horror');
    expect(p.negative).toContain('grotesque');
    expect(p.prompt).toContain('fortune teller');
  });

  it('暗黒騎士では本文に暗黒騎士の装い文が入る', () => {
    const p = buildPrompt(chart, spec, 3, 'darkknight');
    expect(p.negative).not.toContain('dark mood');
    expect(p.prompt).toContain('little dark knight');
    expect(p.prompt).toContain('never horror');
  });

  it('negativePromptOf の出し分け：明るい系4職は dark mood 維持、影・闇系6職はホラー防止', () => {
    for (const t of ['knight', 'priest', 'merchant', 'bard'] as Tone[]) {
      expect(negativePromptOf(t), t).toContain('dark mood');
      expect(DARK_TONES).not.toContain(t);
    }
    for (const t of ['fighter', 'gladiator', 'mage', 'rogue', 'darkknight', 'seer'] as Tone[]) {
      expect(negativePromptOf(t), t).not.toContain('dark mood');
      expect(negativePromptOf(t), t).toContain('realistic violence');
      expect(DARK_TONES).toContain(t);
    }
  });
});
