import { describe, it, expect, vi } from 'vitest';
import { shareOrCopyText } from '../src/share';

// v0.2.3: 呪文の共有（Web Share API）と、使えない環境でのコピーへのフォールバック
describe('shareOrCopyText', () => {
  const TEXT = '呪文の本文';

  it('共有が使える環境では navigator.share 相当が呼ばれ shared になる', async () => {
    const share = vi.fn(async (_data: { text: string }) => {});
    const writeClipboard = vi.fn(async (_t: string) => {});
    const outcome = await shareOrCopyText(TEXT, { share, writeClipboard });
    expect(outcome).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ text: TEXT });
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it('共有シートのキャンセル（AbortError）では cancelled になり、コピーに落ちない', async () => {
    const abort = new Error('cancelled');
    abort.name = 'AbortError';
    const share = vi.fn(async (_data: { text: string }) => { throw abort; });
    const writeClipboard = vi.fn(async (_t: string) => {});
    const outcome = await shareOrCopyText(TEXT, { share, writeClipboard });
    expect(outcome).toBe('cancelled');
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it('共有が AbortError 以外で失敗したらコピーに落ちて copied になる', async () => {
    const share = vi.fn(async (_data: { text: string }) => { throw new Error('not supported'); });
    const writeClipboard = vi.fn(async (_t: string) => {});
    const outcome = await shareOrCopyText(TEXT, { share, writeClipboard });
    expect(outcome).toBe('copied');
    expect(writeClipboard).toHaveBeenCalledWith(TEXT);
  });

  it('共有が使えない環境では最初からコピーになり copied を返す', async () => {
    const writeClipboard = vi.fn(async (_t: string) => {});
    const outcome = await shareOrCopyText(TEXT, { writeClipboard });
    expect(outcome).toBe('copied');
    expect(writeClipboard).toHaveBeenCalledWith(TEXT);
  });

  it('共有もコピーも失敗したら failed になる', async () => {
    const writeClipboard = vi.fn(async (_t: string) => { throw new Error('denied'); });
    await expect(shareOrCopyText(TEXT, { writeClipboard })).resolves.toBe('failed');
    await expect(shareOrCopyText(TEXT, {})).resolves.toBe('failed');
  });
});
