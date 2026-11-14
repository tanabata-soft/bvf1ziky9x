// 表示名の組み立て（共通）。アプリ内の見出し・一覧・シール合成はすべてここを通す。
// v0.1.5: プレフィックスとニックネームを空白なしでつなげた1行表示が基本形
// （オーナー決定 2026-11-15。例:「誇り高き騎士ゆうと」）

export type NameSegmentKind = 'prefix' | 'nickname' | 'postfix';

export interface NameSegment {
  text: string;
  kind: NameSegmentKind;
}

/**
 * 表示名を部品に分けて返す。
 * postfix が '' のときは付けない。付ける場合は末尾に「・ポストフィックス」。
 */
export function displayNameSegments(prefix: string, nickname: string, postfix: string): NameSegment[] {
  const segs: NameSegment[] = [
    { text: prefix, kind: 'prefix' },
    { text: nickname, kind: 'nickname' },
  ];
  if (postfix) segs.push({ text: `・${postfix}`, kind: 'postfix' });
  return segs;
}

/** 表示名のプレーンテキスト（空白なし連結） */
export function buildDisplayName(prefix: string, nickname: string, postfix: string): string {
  return displayNameSegments(prefix, nickname, postfix).map((s) => s.text).join('');
}
