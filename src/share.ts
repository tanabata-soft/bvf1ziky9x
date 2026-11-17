// テキストの共有（Web Share API）と、使えない環境でのコピーへのフォールバック（v0.2.3）。
// 呪文を Muse や Gemini などのアプリへ直接送れるようにするためのもの。
// 環境（navigator）への依存は ShareEnv として注入し、単体テストで動きを担保する。

export type ShareOutcome =
  | 'shared' // 共有シートで共有できた
  | 'cancelled' // 共有シートをキャンセルした（失敗ではない。コピーにも落とさない）
  | 'copied' // 共有が使えず（または失敗し）、クリップボードへのコピーで代替した
  | 'failed'; // 共有もコピーもできなかった

export interface ShareEnv {
  share?: (data: { text: string }) => Promise<void>;
  writeClipboard?: (text: string) => Promise<void>;
}

export async function shareOrCopyText(text: string, env: ShareEnv): Promise<ShareOutcome> {
  if (env.share) {
    try {
      await env.share({ text });
      return 'shared';
    } catch (e) {
      // 共有シートを閉じただけのキャンセルは、勝手にコピーへ落とさない
      if ((e as { name?: unknown } | null | undefined)?.name === 'AbortError') return 'cancelled';
      // それ以外の失敗（共有対象が無い等）はコピーで代替する
    }
  }
  if (env.writeClipboard) {
    try {
      await env.writeClipboard(text);
      return 'copied';
    } catch {
      // 下の failed に落とす
    }
  }
  return 'failed';
}
