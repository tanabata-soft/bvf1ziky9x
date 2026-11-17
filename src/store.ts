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
  localStorage.setItem(KEY, JSON.stringify(entries));
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
