// Service Worker の登録と「更新」ボタン。新版は待機させ、ボタンが押されたときだけ切り替える。
// PWA テンプレート（mmishina-art/pwa-template）の src/pwa.ts と同じ作法。
import { registerSW } from 'virtual:pwa-register';

/** 前面に戻ったときに新しい版を確かめる間隔の下限（切り替えのたびに問い合わせないように）。 */
const CHECK_GAP_MS = 60_000;

/** 「更新」を押したあと、新しい版が動き出すのを待つ時間の上限。過ぎたら読み込み直す */
const RELOAD_FALLBACK_MS = 3000;

export function setupUpdateBanner(banner: HTMLElement, button: HTMLButtonElement, later: HTMLElement): void {
  let reg: ServiceWorkerRegistration | undefined;
  const updateSW = registerSW({
    onNeedRefresh() {
      banner.hidden = false;
    },
    // ホーム画面アプリ（特に iPhone）は、閉じたつもりでも裏で開いたままのことが多く、
    // 開いたときにしか確かめないと、何日も古い版のままになる。前面に戻ったときにも確かめる
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      reg = registration;
      let last = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || Date.now() - last < CHECK_GAP_MS) return;
        last = Date.now();
        registration.update().catch(() => {
          // オフラインなどで確かめられなくても、いまの版のまま動く
        });
      });
    },
  });
  button.addEventListener('click', () => {
    button.disabled = true;
    let reloading = false;
    const reload = (): void => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    // 入れたばかりで最初に開いた回などは、ページが Service Worker の管理下になく、
    // 新しい版に切り替わっても自動では読み込み直されない（押しても反応しないように見える）。
    // 新しい版が動き出したら、ここで読み込み直す。動き出したと分からなくても、少し待って読み込み直す
    const waiting = reg?.waiting;
    waiting?.addEventListener('statechange', () => {
      if (waiting.state === 'activated') reload();
    });
    void updateSW(true);
    setTimeout(reload, RELOAD_FALLBACK_MS);
  });
  // 「あとで」: この回は閉じる（次に開いたとき、また出る）
  later.addEventListener('click', () => {
    banner.hidden = true;
  });
}
