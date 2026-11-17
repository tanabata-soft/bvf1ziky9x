import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadEntries, addEntry, getEntry, saveEntries, deleteEntry,
  tryUpdateEntryImage, StorageFullError, isStorageFullError,
} from '../src/store';
import { SEAL_SAVE_STEPS } from '../src/seal';

// v0.2.1 回帰テスト：localStorage の容量不足で登録フローが固まった事故の再発防止。
// 容量上限を持つ localStorage の偽物を使い、setItem が QuotaExceededError を投げる状況を再現する。
class FakeLocalStorage {
  private map = new Map<string, string>();
  limit = Number.POSITIVE_INFINITY; // キー＋値の合計文字数の上限
  failWith: Error | null = null; // セットすると setItem は常にこのエラーを投げる

  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) {
    if (this.failWith) throw this.failWith;
    let total = k.length + v.length;
    for (const [kk, vv] of this.map) if (kk !== k) total += kk.length + vv.length;
    if (total > this.limit) {
      const e = new Error('quota exceeded');
      e.name = 'QuotaExceededError';
      throw e;
    }
    this.map.set(k, String(v));
  }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  usedChars() {
    let total = 0;
    for (const [k, v] of this.map) total += k.length + v.length;
    return total;
  }
}

let fake: FakeLocalStorage;

beforeEach(() => {
  fake = new FakeLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = fake;
});

const baseEntry = {
  nickname: 'タロウ', y: 1990, m: 1, d: 2, hour: null, minute: 0,
  status: 'waiting' as const, appearance: 'none' as const,
};

describe('容量不足エラーの扱い', () => {
  it('saveEntries は QuotaExceededError を StorageFullError に変換する', () => {
    fake.limit = 100;
    expect(() => saveEntries([{ ...baseEntry, id: 'x', createdAt: 1 }])).toThrow(StorageFullError);
  });

  it('isStorageFullError はブラウザ差異（名前・コード）を吸収する', () => {
    const byName = new Error('x'); byName.name = 'QuotaExceededError';
    const byCode = Object.assign(new Error('x'), { code: 22 });
    const firefox = Object.assign(new Error('x'), { code: 1014 });
    expect(isStorageFullError(byName)).toBe(true);
    expect(isStorageFullError(byCode)).toBe(true);
    expect(isStorageFullError(firefox)).toBe(true);
    expect(isStorageFullError(new TypeError('boom'))).toBe(false);
    expect(isStorageFullError(null)).toBe(false);
  });

  it('容量不足以外のエラーは変換されずにそのまま投げられる', () => {
    fake.failWith = new TypeError('boom');
    expect(() => saveEntries([])).toThrow(TypeError);
    expect(() => saveEntries([])).not.toThrow(StorageFullError);
  });
});

describe('tryUpdateEntryImage（段階的な再試行）', () => {
  it('容量に収まる候補まで順に試し、成功した候補で保存する', () => {
    const target = addEntry({ ...baseEntry });
    // 候補は 60万字→30万字→10万字。上限15万字なら3番目だけが入る
    fake.limit = 150000;
    const sizes = [600000, 300000, 100000];
    const calls: number[] = [];
    const result = tryUpdateEntryImage(target.id, sizes.length, (i) => {
      calls.push(i);
      return 'data:image/jpeg;base64,' + 'A'.repeat(sizes[i]);
    });
    expect(calls).toEqual([0, 1, 2]); // 成功するまで順に呼ばれ、成功したら止まる
    expect(result?.index).toBe(2);
    const saved = getEntry(target.id);
    expect(saved?.status).toBe('done');
    expect(saved?.image).toBe(result?.dataUrl);
    expect(saved?.image?.length).toBe(100000 + 'data:image/jpeg;base64,'.length);
  });

  it('最初の候補で入れば再試行しない', () => {
    const target = addEntry({ ...baseEntry });
    const calls: number[] = [];
    const result = tryUpdateEntryImage(target.id, 3, (i) => {
      calls.push(i);
      return 'data:image/jpeg;base64,small';
    });
    expect(calls).toEqual([0]);
    expect(result?.index).toBe(0);
  });

  it('全候補が入らなければ null を返し、既存の保存内容は壊れない', () => {
    const target = addEntry({ ...baseEntry, status: 'done', image: 'data:old' });
    fake.limit = fake.usedChars(); // 今の使用量ちょうど。少しでも増える書き込みは失敗する
    const result = tryUpdateEntryImage(target.id, 3, () => 'data:image/jpeg;base64,' + 'B'.repeat(50000));
    expect(result).toBeNull();
    const saved = getEntry(target.id);
    expect(saved?.image).toBe('data:old');
    expect(saved?.status).toBe('done');
  });

  it('容量不足以外のエラーは再試行せずに投げる', () => {
    const target = addEntry({ ...baseEntry });
    fake.failWith = new TypeError('boom');
    expect(() => tryUpdateEntryImage(target.id, 3, () => 'data:x')).toThrow(TypeError);
  });
});

describe('deleteEntry（容量を空ける導線）', () => {
  it('登録を削除でき、空いた分だけ保存が通るようになる', () => {
    const target = addEntry({ ...baseEntry });
    const filler = addEntry({ ...baseEntry, nickname: 'フィラー', status: 'done', image: 'data:' + 'C'.repeat(100000) });
    fake.limit = fake.usedChars();
    const candidate = () => 'data:image/jpeg;base64,' + 'D'.repeat(50000);
    expect(tryUpdateEntryImage(target.id, 1, candidate)).toBeNull();

    deleteEntry(filler.id);
    expect(loadEntries().map((e) => e.id)).toEqual([target.id]);

    const result = tryUpdateEntryImage(target.id, 1, candidate);
    expect(result?.index).toBe(0);
    expect(getEntry(target.id)?.image).toBe(candidate());
  });
});

describe('保存エンコード段階（SEAL_SAVE_STEPS）', () => {
  it('標準は 1080×1080 で、段階ごとに大きさ・品質が下がっていく', () => {
    expect(SEAL_SAVE_STEPS[0]).toEqual({ size: 1080, quality: 0.85 });
    for (let i = 1; i < SEAL_SAVE_STEPS.length; i++) {
      expect(SEAL_SAVE_STEPS[i].size).toBeLessThanOrEqual(SEAL_SAVE_STEPS[i - 1].size);
      expect(SEAL_SAVE_STEPS[i].quality).toBeLessThanOrEqual(SEAL_SAVE_STEPS[i - 1].quality);
    }
    const last = SEAL_SAVE_STEPS[SEAL_SAVE_STEPS.length - 1];
    expect(last.size).toBeLessThan(1080);
  });
});
