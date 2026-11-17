// コレクションの保存（localStorage、端末内のみ）
import { normalizeAppearance, type Appearance, type Tone } from './fortune';

export type EntryStatus = 'waiting' | 'done' | 'sent';

export interface Entry {
  id: string;
  nickname: string;
  y: number;
  m: number;
  d: number;
  hour: number | null;
  minute: number;
  status: EntryStatus;
  image?: string; // 合成済みシールの dataURL（完成時）
  showPostfix?: boolean; // ポストフィックス（日干の称号）を付けるか。既定は false（付けない）。旧データには無いので undefined は false 扱い
  tone?: Tone; // キャラのトーン。旧データには無いので undefined は「一番強い星からの初期値」で算出する
  appearance?: Appearance; // キャラの見た目。旧データには無いので undefined は「指定なし」扱い
  createdAt: number;
}

const KEY = 'meishikiSeal.entries.v1';

/** 保存容量の不足で localStorage への書き込みができなかったことを表すエラー */
export class StorageFullError extends Error {
  constructor(message = '保存容量がいっぱいで保存できませんでした') {
    super(message);
    this.name = 'StorageFullError';
  }
}

/** ブラウザが投げる容量不足エラー（QuotaExceededError 等）かどうか */
export function isStorageFullError(e: unknown): boolean {
  if (e instanceof StorageFullError) return true;
  if (typeof e !== 'object' || e === null) return false;
  const err = e as { name?: string; code?: number };
  return err.name === 'QuotaExceededError'
    || err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || err.code === 22 // 旧来の QUOTA_EXCEEDED_ERR
    || err.code === 1014; // Firefox の NS_ERROR_DOM_QUOTA_REACHED
}

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Entry[];
    if (!Array.isArray(arr)) return [];
    // 読み込み時に見た目を現行の値へ読み替える（v0.1.8 の 'idol' は男の子扱い。保存データは壊さない）
    return arr.map((e) => ({ ...e, appearance: normalizeAppearance(e.appearance) }));
  } catch {
    return [];
  }
}

/** 完成シール（登録済み画像）があるか。一覧の「解説つきで見る」ボタンの表示条件 */
export function hasSealImage(e: Entry): boolean {
  return typeof e.image === 'string' && e.image.length > 0;
}

export function saveEntries(entries: Entry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch (e) {
    // 容量不足は呼び出し側で対処できるよう専用エラーに変換する（v0.2.1）。
    // それ以外（JSON 化の失敗など）はそのまま投げる。
    if (isStorageFullError(e)) throw new StorageFullError();
    throw e;
  }
}

export function addEntry(e: Omit<Entry, 'id' | 'createdAt'>): Entry {
  const entries = loadEntries();
  const entry: Entry = {
    ...e,
    id: `e${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    createdAt: Date.now(),
  };
  entries.unshift(entry);
  saveEntries(entries);
  return entry;
}

export function updateEntry(id: string, patch: Partial<Entry>): Entry | undefined {
  const entries = loadEntries();
  const i = entries.findIndex((e) => e.id === id);
  if (i < 0) return undefined;
  entries[i] = { ...entries[i], ...patch };
  saveEntries(entries);
  return entries[i];
}

export function getEntry(id: string): Entry | undefined {
  return loadEntries().find((e) => e.id === id);
}

/** 登録を1件削除する（容量を空ける導線。詳細画面から使う） */
export function deleteEntry(id: string): void {
  saveEntries(loadEntries().filter((e) => e.id !== id));
}

/**
 * 完成シールの保存を、候補（大きい順の dataURL）を順に試しながら行う。
 * 容量不足で失敗したら次の候補（より小さい dataURL）で再試行する。
 * 保存できたら { dataUrl, index }、全候補で保存できなければ null を返す。
 * 候補は必要になるまで作らない（makeCandidate は成功するまで順に呼ばれる）。
 * 容量不足以外のエラーはそのまま投げる。
 */
export function tryUpdateEntryImage(
  id: string,
  candidateCount: number,
  makeCandidate: (index: number) => string,
): { dataUrl: string; index: number } | null {
  for (let i = 0; i < candidateCount; i++) {
    const dataUrl = makeCandidate(i);
    try {
      const updated = updateEntry(id, { image: dataUrl, status: 'done' });
      if (!updated) return null; // 対象の登録が無い
      return { dataUrl, index: i };
    } catch (e) {
      if (isStorageFullError(e)) continue; // 次の候補で再試行
      throw e;
    }
  }
  return null;
}
