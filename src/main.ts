import './style.css';
import {
  computeChart, decideCharacter, rarityOf, yearFortune, glamourTierOf, GLAMOUR_LABEL,
  toneOfChart, TONE_LABEL, APPEARANCE_LABEL, ageBandOf,
  type Appearance, type BirthInput, type Chart,
} from './fortune';
import { shareOrCopyText, type ShareOutcome } from './share';
import {
  DAY_GAN_TEXT, STRONGEST_TEXT,
  EQUIPMENT, prefixTitleOf, POSTFIX_TITLE, ELEMENT_COLOR, buildPrompt, seasonOf, SEASON_JA,
  fortuneBodyOf, explainedInfoOf, toneReasonOf, appearanceReasonLines, hairLabelOf,
} from './texts';
import { silhouetteSvg } from './silhouette';
import { buildDisplayName } from './name';
import {
  loadImage, loadImageFromUrl, composeSeal, composeExplainedSeal, canvasToDataUrl, exportSeal,
  encodeSealCanvas, SEAL_SAVE_STEPS,
} from './seal';
import {
  defaultCropState, clampCropState, panCropState, zoomCropStateAt, cropSourceRect, applyCrop,
  coverScale, type CropViewState,
} from './crop';
import {
  loadEntries, addEntry, updateEntry, getEntry, hasSealImage,
  deleteEntry, tryUpdateEntryImage,
  type Entry,
} from './store';
import { setupUpdateBanner } from './pwa';

// バージョンは package.json の version が元（vite.config.ts が埋め込む）
const APP_VERSION = __APP_VERSION__;
const app = document.querySelector<HTMLDivElement>('#app')!;

interface Person {
  nickname: string;
  birth: BirthInput;
}

type Route =
  | { name: 'input' }
  | { name: 'result'; person: Person } // 今回だけ（保存しない）
  | { name: 'list' }
  | { name: 'detail'; id: string };

let route: Route = { name: 'input' };
// 今回だけモードで合成した画像（メモリ内のみ）
let transientImage: string | undefined;
// 今回だけモードのポストフィックス表示（既定は付けない）
let transientShowPostfix = false;
// 今回だけモードの見た目（既定は指定なし）
let transientAppearance: Appearance = 'none';
// 詳細画面に一度だけ出すお知らせ（小さく保存したとき等）
let detailFlash = '';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

// ---------- ボタンのフィードバック（v0.1.4） ----------

/** 実行系ボタン：処理中ラベル→完了（✓）／失敗表示を約1.5秒出して元に戻す */
async function withButtonFeedback(
  btn: HTMLButtonElement, busyLabel: string, doneLabel: string,
  fn: () => Promise<void> | void,
): Promise<boolean> {
  const orig = btn.textContent ?? '';
  btn.disabled = true;
  btn.textContent = busyLabel;
  let ok = true;
  try { await fn(); } catch { ok = false; }
  btn.textContent = ok ? doneLabel : 'うまくいきませんでした';
  btn.classList.add(ok ? 'btn-success' : 'btn-fail');
  window.setTimeout(() => {
    btn.textContent = orig;
    btn.classList.remove('btn-success', 'btn-fail');
    btn.disabled = false;
  }, 1500);
  return ok;
}

/** コピーボタン：実際に書けたときだけ成功表示にする */
function flashCopyResult(btn: HTMLButtonElement, ok: boolean): void {
  const orig = btn.textContent ?? '';
  btn.disabled = true;
  btn.textContent = ok ? 'コピーしました ✓' : 'コピーできませんでした';
  btn.classList.add(ok ? 'btn-success' : 'btn-fail');
  window.setTimeout(() => {
    btn.textContent = orig;
    btn.classList.remove('btn-success', 'btn-fail');
    btn.disabled = false;
  }, 1500);
}

/** 共有ボタン（v0.2.3）：結果を約1.5秒表示する。共有シートのキャンセル時は何も表示しない */
function flashShareResult(btn: HTMLButtonElement, outcome: ShareOutcome): void {
  if (outcome === 'cancelled') return;
  const orig = btn.textContent ?? '';
  btn.disabled = true;
  btn.textContent = outcome === 'shared' ? '共有しました ✓' : outcome === 'copied' ? 'コピーしました ✓' : 'うまくいきませんでした';
  btn.classList.add(outcome === 'failed' ? 'btn-fail' : 'btn-success');
  window.setTimeout(() => {
    btn.textContent = orig;
    btn.classList.remove('btn-success', 'btn-fail');
    btn.disabled = false;
  }, 1500);
}

function displayName(nickname: string, chart: Chart, showPostfix: boolean): { prefix: string; postfix: string; full: string } {
  const prefix = prefixTitleOf(chart.strongest);
  const postfix = POSTFIX_TITLE[chart.dayGan];
  // 基本形は「プレフィックス＋ニックネーム」を空白なしでつなげた1行。ポストフィックスは任意
  // （オーナー決定 2026-11-15）。組み立ては共通関数 buildDisplayName に寄せる
  return { prefix, postfix, full: buildDisplayName(prefix, nickname, showPostfix ? postfix : '') };
}

function headerHtml(): string {
  return `
  <header class="app-header">
    <div class="app-title">命式シール<span class="kari">（仮）</span> <span class="proto-badge">試作版 v${APP_VERSION}</span></div>
    <nav>
      <button data-nav="input" class="nav-btn">占う</button>
      <button data-nav="list" class="nav-btn">シール帳</button>
    </nav>
  </header>
  <p class="stance">このアプリは、四柱推命をもとに「傾向を眺める」ための贈り物づくりの道具です。運命が決まるものではありません。</p>`;
}

function bindNav() {
  app.querySelectorAll('[data-nav]').forEach((b) => {
    b.addEventListener('click', () => {
      const n = (b as HTMLElement).dataset.nav;
      route = n === 'list' ? { name: 'list' } : { name: 'input' };
      render();
    });
  });
}

// ---------- 入力画面 ----------
function renderInput() {
  app.innerHTML = `
  ${headerHtml()}
  <main>
    <h1>分身キャラシールを作る</h1>
    <p class="lead">贈りたい相手のニックネームと生年月日を入れてください。占いの結果から、その人の内面を映した「分身キャラ」のシールの材料がそろいます。</p>
    <form id="f" class="card">
      <label>ニックネーム（相手の名前）
        <input id="nickname" type="text" maxlength="20" placeholder="例：タロウ" required>
      </label>
      <label>生年月日
        <input id="birthdate" type="date" min="1900-01-01" max="2100-12-31" required>
      </label>
      <label>出生時刻
        <input id="birthtime" type="time">
      </label>
      <label class="check"><input id="timeUnknown" type="checkbox"> 出生時刻は不明（時柱なしで占います）</label>
      <fieldset>
        <legend>キャラの見た目</legend>
        <p class="small">占う相手の性別ではなく、作る分身キャラの見た目の指定です。呪文（プロンプト）にだけ効きます。</p>
        ${(['none', 'boy', 'girl'] as Appearance[]).map((a) => `<label class="check"><input type="radio" name="appearance" value="${a}" ${a === 'none' ? 'checked' : ''}> ${APPEARANCE_LABEL[a]}</label>`).join('')}
      </fieldset>
      <fieldset>
        <legend>この結果の扱い</legend>
        <label class="check"><input type="radio" name="save" value="save" checked> コレクションに保存する</label>
        <label class="check"><input type="radio" name="save" value="once"> 今回だけ（保存しない）</label>
      </fieldset>
      <button type="submit" class="primary">占う</button>
      <div id="inputError"></div>
    </form>
    <section class="notes card">
      <h2>計算について</h2>
      <ul>
        <li>年柱・月柱は節入り（立春など）の時刻を基準に切り替わります。</li>
        <li>23時台の日柱・時柱は、暦計算ライブラリ標準の方式で計算しています。</li>
        <li>真太陽時の補正はしていません。計算はすべてこの端末の中で完結し、生年月日が外部に送られることはありません。</li>
      </ul>
    </section>
  </main>`;
  bindNav();
  const timeUnknown = app.querySelector<HTMLInputElement>('#timeUnknown')!;
  const birthtime = app.querySelector<HTMLInputElement>('#birthtime')!;
  timeUnknown.addEventListener('change', () => { birthtime.disabled = timeUnknown.checked; });
  app.querySelector<HTMLFormElement>('#f')!.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const nickname = app.querySelector<HTMLInputElement>('#nickname')!.value.trim();
    const dateVal = app.querySelector<HTMLInputElement>('#birthdate')!.value;
    if (!nickname || !dateVal) return;
    const [y, m, d] = dateVal.split('-').map(Number);
    let hour: number | null = null;
    let minute = 0;
    if (!timeUnknown.checked && birthtime.value) {
      const [hh, mm] = birthtime.value.split(':').map(Number);
      hour = hh; minute = mm;
    }
    const person: Person = { nickname, birth: { y, m, d, hour, minute } };
    const appearance = (app.querySelector<HTMLInputElement>('input[name="appearance"]:checked')?.value ?? 'none') as Appearance;
    const save = (app.querySelector<HTMLInputElement>('input[name="save"]:checked')!).value === 'save';
    if (save) {
      try {
        const entry = addEntry({
          nickname, y, m, d, hour, minute, status: 'waiting', appearance,
        });
        route = { name: 'detail', id: entry.id };
      } catch {
        // 保存容量がいっぱい等で登録を作れなかったときは、その場で理由を出す（無言で止めない）
        const err = app.querySelector('#inputError');
        if (err) {
          err.innerHTML = '<p class="error">保存容量がいっぱいで、コレクションに保存できませんでした。シール帳から不要な登録を開いて「この登録を削除する」を押すと空きができます。または「今回だけ」を選ぶと、保存せずに結果が見られます。</p>';
        }
        return;
      }
    } else {
      transientImage = undefined;
      transientShowPostfix = false;
      transientAppearance = appearance;
      route = { name: 'result', person };
    }
    render();
  });
}

// 画像登録の結果。reduced=true は容量に合わせて小さい段階で保存したことを表す
type RegisterOutcome = { ok: true; reduced: boolean } | { ok: false };

// ---------- 読みの描画（結果・詳細で共用） ----------
interface ReadingOpts {
  image?: string;
  status?: Entry['status'];
  showPostfix: boolean;
  appearance: Appearance;
  onTogglePostfix: (show: boolean) => void;
  onAppearanceChange: (appearance: Appearance) => void;
  onRegisterImage: (seal: HTMLCanvasElement) => Promise<RegisterOutcome>;
  onExport?: () => Promise<void> | void;
  onSent?: () => void;
}

function renderReading(person: Person, opts: ReadingOpts): string {
  const chart = computeChart(person.birth);
  const spec = decideCharacter(chart);
  const rarity = rarityOf(chart);
  // 職業は利用者が選ぶものではなく、常に最強の通変から決まる（v0.2.3〜）
  const tone = toneOfChart(chart);
  // 設計欄の理由文は「最強の星『○○』は〜のため」の形に整える（オーナー確定の表示）
  const jobReason = toneReasonOf(chart.strongest);
  const jobBecause = jobReason.endsWith('星') ? jobReason.slice(0, -1) : `${jobReason}を持つ`;
  const dn = displayName(person.nickname, chart, opts.showPostfix);
  // 年齢区分は生年月日から今日の年齢で決まる（v0.2.5）。見た目の年齢感にだけ効く
  const ageBand = ageBandOf(person.birth);
  const appearanceReasons = appearanceReasonLines(chart, spec, ageBand);
  const prompt = buildPrompt(chart, spec, rarity.stars, tone, opts.appearance, ageBand);
  const tier = glamourTierOf(rarity.stars);
  const now = new Date();
  const thisYear = now.getFullYear();
  const years = [thisYear, thisYear + 1].map((y) => yearFortune(chart, y));
  const dayPillar = chart.pillars[2];

  const pillarRows = chart.pillars.map((p) => `
    <tr>
      <th>${p.label}</th><td class="gz">${p.gz}</td>
      <td>${p.hideGan.join('・')}</td>
      <td>${p.ganShiShen === '本人' ? '―' : p.ganShiShen}／${p.zhiShiShen}</td>
      <td>${p.diShi}</td>
    </tr>`).join('');

  const maxEl = Math.max(...Object.values(chart.elementTotals));
  const elementBars = (Object.entries(chart.elementTotals) as [keyof typeof chart.elementTotals, number][])
    .map(([el, v]) => `
      <div class="el-row"><span class="el-name">${el}</span>
      <div class="el-bar"><div style="width:${Math.round((v / maxEl) * 100)}%;background:${ELEMENT_COLOR[el]}"></div></div>
      <span class="el-val">${v}</span></div>`).join('');

  const fortuneCards = years.map((f) => `
    <article class="fortune-card">
      <h3>${f.year}年（${f.gz}）の運勢 <span class="stage stage-${f.stage}">${f.stage}</span></h3>
      ${fortuneBodyOf(chart, f).map((p) => `<p>${esc(p)}</p>`).join('')}
      ${f.factors.length ? `<ul>${f.factors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <p class="small">この年の装備：${EQUIPMENT[f.shiShen].name}（${f.shiShen}）</p>
    </article>`).join('');

  const equipList = [
    { kind: 'メイン装備', pick: spec.mainEq },
    ...spec.subEq.map((s, i) => ({ kind: `サブ装備${i + 1}`, pick: s })),
  ].map(({ kind, pick }) => `
    <li><strong>${kind}：${EQUIPMENT[pick.shiShen].name}</strong>（${pick.shiShen}）
    <span class="small">大きさ ${pick.sizeTier === 3 ? '両手持ち' : pick.sizeTier === 2 ? '手持ち' : 'チャーム'}／${EQUIPMENT[pick.shiShen].meaning}</span></li>`).join('');

  const visual = opts.image
    ? `<img class="seal-img" src="${opts.image}" alt="完成シール">`
    : `<div class="seal-silhouette">${silhouetteSvg(chart, spec)}</div>`;

  return `
  <section class="card result-head">
    <div class="display-name"><span class="prefix">${esc(dn.prefix)}</span><span class="main-name">${esc(person.nickname)}${opts.showPostfix ? `<span class="postfix">・${esc(dn.postfix)}</span>` : ''}</span></div>
    <label class="check small"><input type="checkbox" id="postfixToggle" ${opts.showPostfix ? 'checked' : ''}> 後ろの称号「・${esc(dn.postfix)}」も付ける（基本は付けません）</label>
    <div class="tone-row"><span class="small">キャラの見た目：</span>${(['none', 'boy', 'girl'] as Appearance[]).map((a) => `<label class="check small"><input type="radio" name="appearanceSel" value="${a}" ${opts.appearance === a ? 'checked' : ''}> ${APPEARANCE_LABEL[a]}</label>`).join('')}</div>
    <p class="small">見た目は分身キャラの見た目の指定で、呪文にだけ効きます（称号とシールは変わりません）。</p>
    ${opts.image ? '<p class="small">※ 完成済みシールへの反映は、画像を登録し直したときに行われます。</p>' : ''}
    <p class="small">形態：${spec.form} ／ レア度：<span class="stars">${'★'.repeat(rarity.stars)}${'☆'.repeat(5 - rarity.stars)}</span>（シールでは星ではなく「${GLAMOUR_LABEL[tier]}」の枠の派手さで表します）${opts.status ? ` ／ 状態：${opts.status === 'waiting' ? '画像待ち' : opts.status === 'done' ? '完成' : '贈った'}` : ''}</p>
    ${visual}
    <p class="small">${opts.image ? '' : '画像待ちの間はシルエットで表示しています。装備の影から完成形を想像してみてください。'}</p>
  </section>

  <section class="card">
    <h2>命式</h2>
    <table class="meishiki">
      <thead><tr><th></th><th>干支</th><th>蔵干</th><th>通変（干／支）</th><th>十二運</th></tr></thead>
      <tbody>${pillarRows}</tbody>
    </table>
    ${chart.hasTime ? '' : '<p class="small">出生時刻が不明のため、時柱なしで計算しています。</p>'}
    <p>日干は「${chart.dayGan}」。${esc(DAY_GAN_TEXT[chart.dayGan])}</p>
    <p>一番強い星は「${chart.strongest}」。${esc(STRONGEST_TEXT[chart.strongest])}</p>
    ${rarity.reasons.length ? `<p class="small">レア度の根拠：${rarity.reasons.map(esc).join('／')}</p>` : ''}
  </section>

  <section class="card">
    <h2>五行バランス</h2>
    ${elementBars}
    <p class="small">強い五行：${chart.strongestElement} ／ 足りない五行：${chart.weakestElement}（補いのお守りの色になります）／ 本人の強さ：${chart.weakBody ? '支えを借りて伸びるタイプ' : '自分の力で進めるタイプ'}</p>
  </section>

  <section>
    <h2 class="section-title">今年と来年の運勢</h2>
    ${fortuneCards}
    <p class="small note">年の表示は暦年ベースです。四柱推命では本来、立春（2月4日頃）で年が切り替わります。</p>
  </section>

  <section class="card">
    <h2>分身キャラの設計</h2>
    <ul class="equip">
      ${equipList}
      <li><strong>補いのお守り</strong>：${spec.charmElement}の色のリボンチャーム（足りない五行を補います）</li>
      <li><strong>相棒</strong>：日支「${spec.companionZhi}」の動物</li>
      <li><strong>紋章</strong>：年支「${spec.crestZhi}」の刺繍</li>
      <li><strong>背景の季節</strong>：月支から「${SEASON_JA[seasonOf(spec.seasonZhi)]}」</li>
      <li><strong>素の表情</strong>：日柱の十二運「${dayPillar.diShi}」</li>
      <li><strong>職業</strong>：${TONE_LABEL[tone]} ― 最強の星『${chart.strongest}』は${jobBecause}ため。称号・呪文・シールの帯の色に反映されます</li>
      <li><strong>見た目の年齢感</strong>：${appearanceReasons.ageLine}。男の子・女の子の呪文に反映されます</li>
      <li><strong>体格</strong>：${appearanceReasons.buildLine}。呪文に反映されます</li>
      <li><strong>${hairLabelOf(spec.form)}</strong>：${appearanceReasons.hairLine}。呪文に反映されます</li>
    </ul>
  </section>

  <section class="card">
    <h2>キャラ生成の呪文（英語）</h2>
    <p class="small">お使いの画像生成AI（Gemini、ChatGPT、Museなど）にそのまま貼って使えます。名前は呪文に含まれていません。</p>
    <p class="small">「呪文を共有」を押すと、共有シートから Muse や Gemini などのアプリへ直接送れます（共有できない環境ではコピーになります）。</p>
    <p class="small">正方形で出るよう呪文に入れています。横長になった場合は、画像登録のときに切り抜き位置を選べます。</p>
    <ul class="parts">${prompt.partsJa.map((p) => `<li><strong>${esc(p.label)}</strong>：${esc(p.value)}</li>`).join('')}</ul>
    <pre class="prompt" id="promptText">${esc(prompt.prompt)}</pre>
    <button class="primary" id="copyPrompt">呪文をコピー</button>
    <button id="sharePrompt">呪文を共有</button>
    <h3>ネガティブプロンプト（対応するAI向け）</h3>
    <pre class="prompt" id="negativeText">${esc(prompt.negative)}</pre>
    <button id="copyNegative">ネガティブプロンプトをコピー</button>
    <button id="shareNegative">ネガティブプロンプトを共有</button>
  </section>

  <section class="card">
    <h2>画像を登録してシールを完成させる</h2>
    <p class="small">生成した画像を選ぶと、まず切り抜き調整の画面が出ます。正方形の範囲で切り抜くか、「全体を使う」で絵全体が切れずに収まる形（余白はプリズム背景）で合成するか選べます。レア度は星ではなく、枠の派手さ（ふつう／キラ／大当たり）で表れます。</p>
    <input type="file" id="imageFile" accept="image/*">
    <div id="cropArea"></div>
    <div id="registerMsg"></div>
    ${opts.image ? '<p class="success">✓ シールが完成しています。画像を選ぶと差し替えできます。</p>' : ''}
    ${opts.image ? `<div class="actions">
      <button class="primary" id="exportBtn">シール単体を書き出す（共有／ダウンロード）</button>
      <button id="exportExplainedBtn">解説つきで書き出す（共有／ダウンロード）</button>
      ${opts.onSent ? '<button id="sentBtn">贈ったことにする</button>' : ''}
    </div>` : ''}
  </section>`;
}

/**
 * 解説つきシールの生成（詳細画面の書き出しと、シール帳のビューアで共用）。
 * 文面は texts.ts の explainedInfoOf（単一の生成処理）から作るので、表示箇所でずれない。
 */
async function buildExplainedDataUrl(person: Person, sealImage: string): Promise<string> {
  const chart = computeChart(person.birth);
  const sealImg = await loadImageFromUrl(sealImage);
  const canvas = composeExplainedSeal(sealImg, explainedInfoOf(chart, new Date().getFullYear(), ageBandOf(person.birth)));
  return canvasToDataUrl(canvas);
}

function bindReading(person: Person, opts: ReadingOpts) {
  const chart = computeChart(person.birth);
  const rarity = rarityOf(chart);
  const tone = toneOfChart(chart);
  const dn = displayName(person.nickname, chart, opts.showPostfix);
  const copyText = async (id: string): Promise<boolean> => {
    const el = app.querySelector<HTMLElement>(id);
    if (!el) return false;
    try {
      await navigator.clipboard.writeText(el.textContent ?? '');
      return true;
    } catch {
      // 書けなかった環境ではテキストを選択し、手動コピーできる状態にする
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return false;
    }
  };
  app.querySelector('#copyPrompt')?.addEventListener('click', async (ev) => {
    flashCopyResult(ev.currentTarget as HTMLButtonElement, await copyText('#promptText'));
  });
  app.querySelector('#copyNegative')?.addEventListener('click', async (ev) => {
    flashCopyResult(ev.currentTarget as HTMLButtonElement, await copyText('#negativeText'));
  });
  // 共有（v0.2.3）：共有シートで受け先アプリへ直接送る。使えない環境ではコピーに落ちる
  const shareFrom = async (id: string): Promise<ShareOutcome> => {
    const el = app.querySelector<HTMLElement>(id);
    return shareOrCopyText(el?.textContent ?? '', {
      share: typeof navigator.share === 'function' ? (d) => navigator.share(d) : undefined,
      writeClipboard: (t) => navigator.clipboard.writeText(t),
    });
  };
  app.querySelector('#sharePrompt')?.addEventListener('click', async (ev) => {
    flashShareResult(ev.currentTarget as HTMLButtonElement, await shareFrom('#promptText'));
  });
  app.querySelector('#shareNegative')?.addEventListener('click', async (ev) => {
    flashShareResult(ev.currentTarget as HTMLButtonElement, await shareFrom('#negativeText'));
  });
  app.querySelector<HTMLInputElement>('#postfixToggle')?.addEventListener('change', (ev) => {
    opts.onTogglePostfix((ev.target as HTMLInputElement).checked);
  });
  app.querySelectorAll<HTMLInputElement>('input[name="appearanceSel"]').forEach((r) => {
    r.addEventListener('change', () => { opts.onAppearanceChange(r.value as Appearance); });
  });
  // 画像登録：選んだ直後に切り抜き調整を挟み、確定してから合成する（v0.1.8）
  const sealName = () => ({
    prefix: dn.prefix, nickname: person.nickname, postfix: opts.showPostfix ? dn.postfix : '',
    tier: glamourTierOf(rarity.stars), mainColor: chart.strongestElement, tone,
  });
  app.querySelector<HTMLInputElement>('#imageFile')?.addEventListener('change', async (ev) => {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const msg = app.querySelector('#registerMsg')!;
    msg.innerHTML = '<p class="small">画像を読み込んでいます…</p>';
    try {
      const img = await loadImage(file);
      msg.innerHTML = '';
      openCropEditor(img, sealName(), opts.onRegisterImage);
    } catch {
      msg.innerHTML = '<p class="error">画像を読み込めませんでした。別の画像でお試しください。</p>';
    } finally {
      input.value = ''; // 同じファイルを選び直しても change が発火するように
    }
  });
  app.querySelector('#exportBtn')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget as HTMLButtonElement;
    await withButtonFeedback(btn, '書き出しています…', '書き出しました ✓', async () => {
      await opts.onExport?.();
    });
  });
  app.querySelector('#exportExplainedBtn')?.addEventListener('click', async (ev) => {
    if (!opts.image) return;
    const btn = ev.currentTarget as HTMLButtonElement;
    const msg = app.querySelector('#registerMsg');
    const ok = await withButtonFeedback(btn, '解説つき画像を作っています…', '書き出しました ✓', async () => {
      const dataUrl = await buildExplainedDataUrl(person, opts.image!);
      await exportSeal(dataUrl, `seal-explained-${person.nickname}.jpg`);
    });
    if (!ok && msg) {
      msg.innerHTML = '<p class="error">解説つき画像を作れませんでした。もう一度お試しください。</p>';
    }
  });
  app.querySelector('#sentBtn')?.addEventListener('click', () => { opts.onSent?.(); });
}

// ---------- 切り抜き調整エディタ（v0.1.8） ----------
// 正方形のビューに画像を cover で置き、ドラッグで移動、スライダー／ピンチ／ホイールで拡縮する。
// 計算は src/crop.ts の純粋関数に寄せ、ここは描画とイベントだけを持つ。
function openCropEditor(
  img: HTMLImageElement,
  name: Parameters<typeof composeSeal>[1],
  onDone: (seal: HTMLCanvasElement) => Promise<RegisterOutcome>,
) {
  const area = app.querySelector<HTMLElement>('#cropArea');
  if (!area) return;
  const VIEW = 640; // キャンバスの内部解像度（表示は CSS でフィット）
  area.innerHTML = `
  <div class="crop-editor">
    <h3>切り抜き調整</h3>
    <p class="small">ドラッグで位置を動かし、スライダー（またはピンチ）で大きさを変えて、正方形の範囲を選んでください。</p>
    <canvas id="cropCanvas" width="${VIEW}" height="${VIEW}"></canvas>
    <label class="crop-zoom">大きさ
      <input type="range" id="cropZoom" min="100" max="400" step="1" value="100">
    </label>
    <div class="actions">
      <button class="primary" id="cropOk">この範囲でシールを作る</button>
      <button id="cropWhole">全体を使う（切り抜かない）</button>
      <button id="cropCancel">やめる</button>
    </div>
    <div id="cropMsg"></div>
  </div>`;
  area.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const canvas = area.querySelector<HTMLCanvasElement>('#cropCanvas')!;
  const ctx = canvas.getContext('2d')!;
  const slider = area.querySelector<HTMLInputElement>('#cropZoom')!;
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  let state: CropViewState = defaultCropState();

  const draw = () => {
    const s = coverScale(VIEW, imgW, imgH) * state.zoom;
    ctx.fillStyle = '#22222e';
    ctx.fillRect(0, 0, VIEW, VIEW);
    ctx.drawImage(
      img,
      VIEW / 2 + state.dx - (imgW * s) / 2,
      VIEW / 2 + state.dy - (imgH * s) / 2,
      imgW * s, imgH * s,
    );
    // 三分割の目安線
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (const f of [1 / 3, 2 / 3]) {
      ctx.beginPath(); ctx.moveTo(VIEW * f, 0); ctx.lineTo(VIEW * f, VIEW); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, VIEW * f); ctx.lineTo(VIEW, VIEW * f); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, VIEW - 3, VIEW - 3);
  };
  draw();

  // 表示px（CSSピクセル）→ キャンバス内部pxへの換算
  const toCanvasPx = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) * (VIEW / r.width),
      y: (clientY - r.top) * (VIEW / r.height),
      scale: VIEW / r.width,
    };
  };

  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;
  canvas.addEventListener('pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    const p = toCanvasPx(ev.clientX, ev.clientY);
    pointers.set(ev.pointerId, { x: p.x, y: p.y });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    const prev = pointers.get(ev.pointerId);
    if (!prev) return;
    const p = toCanvasPx(ev.clientX, ev.clientY);
    if (pointers.size === 1) {
      state = panCropState(state, p.x - prev.x, p.y - prev.y, VIEW, imgW, imgH);
    }
    pointers.set(ev.pointerId, { x: p.x, y: p.y });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0 && dist > 0) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        state = zoomCropStateAt(state, state.zoom * (dist / pinchDist), mid.x, mid.y, VIEW, imgW, imgH);
        slider.value = String(Math.round(state.zoom * 100));
      }
      pinchDist = dist;
    }
    draw();
  });
  const endPointer = (ev: PointerEvent) => {
    pointers.delete(ev.pointerId);
    pinchDist = 0;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const p = toCanvasPx(ev.clientX, ev.clientY);
    const factor = ev.deltaY < 0 ? 1.08 : 1 / 1.08;
    state = zoomCropStateAt(state, state.zoom * factor, p.x, p.y, VIEW, imgW, imgH);
    slider.value = String(Math.round(state.zoom * 100));
    draw();
  }, { passive: false });

  slider.addEventListener('input', () => {
    state = zoomCropStateAt(state, Number(slider.value) / 100, VIEW / 2, VIEW / 2, VIEW, imgW, imgH);
    draw();
  });

  // 合成→登録までを例外処理で包み、「合成しています…」のまま止まる経路をなくす（v0.2.1）。
  // 登録側（onDone）が保存できなかった場合は、合成したシールをその場で書き出せる逃がしを出す。
  const finish = async (source: HTMLImageElement | HTMLCanvasElement) => {
    const msg = area.querySelector('#cropMsg');
    if (msg) msg.innerHTML = '<p class="small">シールを合成しています…</p>';
    let seal: HTMLCanvasElement;
    try {
      seal = composeSeal(source, name);
    } catch {
      if (msg) msg.innerHTML = '<p class="error">シールの合成に失敗しました。もう一度お試しください。</p>';
      return;
    }
    let outcome: RegisterOutcome;
    try {
      outcome = await onDone(seal);
    } catch {
      outcome = { ok: false };
    }
    if (outcome.ok) return; // 成功時は登録側が画面を切り替える
    if (msg) {
      msg.innerHTML = `
        <p class="error">保存容量がいっぱいで、この端末に保存できませんでした。</p>
        <p class="small">作ったシールは下のボタンから共有／ダウンロードできます（このままでは端末には保存されません）。空きを作るには、シール帳から不要な登録を開いて「この登録を削除する」を押してください。</p>
        <div class="actions">
          <button class="primary" id="cropExportFallback">作ったシールを共有／ダウンロード</button>
        </div>`;
      msg.querySelector('#cropExportFallback')?.addEventListener('click', async (ev) => {
        const btn = ev.currentTarget as HTMLButtonElement;
        await withButtonFeedback(btn, '書き出しています…', '書き出しました ✓', async () => {
          await exportSeal(encodeSealCanvas(seal, SEAL_SAVE_STEPS[0]), `seal-${name.nickname}.jpg`);
        });
      });
    }
  };
  area.querySelector('#cropOk')?.addEventListener('click', () => {
    state = clampCropState(state, VIEW, imgW, imgH);
    void finish(applyCrop(img, cropSourceRect(state, VIEW, imgW, imgH)));
  });
  area.querySelector('#cropWhole')?.addEventListener('click', () => { void finish(img); });
  area.querySelector('#cropCancel')?.addEventListener('click', () => { area.innerHTML = ''; });
}

// ---------- 結果画面（今回だけ） ----------
function renderResult(person: Person) {
  const opts: ReadingOpts = {
    image: transientImage,
    showPostfix: transientShowPostfix,
    appearance: transientAppearance,
    onTogglePostfix: (show) => { transientShowPostfix = show; render(); },
    onAppearanceChange: (appearance) => { transientAppearance = appearance; render(); },
    onRegisterImage: async (seal) => {
      // 今回だけモードは端末に保存しないので、標準の大きさでメモリに持つだけ
      transientImage = encodeSealCanvas(seal, SEAL_SAVE_STEPS[0]);
      render();
      return { ok: true, reduced: false };
    },
    onExport: () => (transientImage ? exportSeal(transientImage, `seal-${person.nickname}.jpg`) : undefined),
  };
  app.innerHTML = `${headerHtml()}<main>
    <p class="small">「今回だけ」の結果です。コレクションには保存されていません。</p>
    ${renderReading(person, opts)}
  </main>`;
  bindNav();
  bindReading(person, opts);
}

/** 設定変更の保存：容量不足などで失敗しても画面操作自体は止めない（変更は保持されず、表示は読み込み直しで元に戻る） */
function safeUpdateEntry(id: string, patch: Partial<Entry>): void {
  try { updateEntry(id, patch); } catch { /* 保存できない状態では変更を諦める */ }
}

// ---------- 詳細画面 ----------
function renderDetail(id: string) {
  const entry = getEntry(id);
  if (!entry) { route = { name: 'list' }; render(); return; }
  const person: Person = {
    nickname: entry.nickname,
    birth: { y: entry.y, m: entry.m, d: entry.d, hour: entry.hour, minute: entry.minute },
  };
  const opts: ReadingOpts = {
    image: entry.image,
    status: entry.status,
    showPostfix: entry.showPostfix ?? false,
    appearance: entry.appearance ?? 'none',
    onTogglePostfix: (show) => { safeUpdateEntry(id, { showPostfix: show }); render(); },
    onAppearanceChange: (appearance) => { safeUpdateEntry(id, { appearance }); render(); },
    onRegisterImage: async (seal) => {
      // 容量が足りなければ、より小さい段階の dataURL で自動で再試行する（v0.2.1）
      const saved = tryUpdateEntryImage(
        id, SEAL_SAVE_STEPS.length, (i) => encodeSealCanvas(seal, SEAL_SAVE_STEPS[i]),
      );
      if (!saved) return { ok: false }; // 全段階で保存できなかった。切り抜き画面側で逃がし導線を出す
      if (saved.index > 0) {
        detailFlash = '保存容量に合わせて、少し小さいサイズで保存しました。';
      }
      render();
      return { ok: true, reduced: saved.index > 0 };
    },
    onExport: () => (entry.image ? exportSeal(entry.image, `seal-${entry.nickname}.jpg`) : undefined),
    onSent: entry.status === 'done' ? () => { safeUpdateEntry(id, { status: 'sent' }); render(); } : undefined,
  };
  const flash = detailFlash;
  detailFlash = '';
  app.innerHTML = `${headerHtml()}<main>
    <button class="back" data-nav="list">← シール帳へ戻る</button>
    ${flash ? `<p class="success">${esc(flash)}</p>` : ''}
    ${renderReading(person, opts)}
    <section class="card danger-zone">
      <h2>この登録を削除する</h2>
      <p class="small">この登録をシール帳から削除します。完成したシールの画像も消え、元に戻せません。保存容量を空けたいときにも使えます。</p>
      <div id="deleteArea">
        <button id="deleteEntryBtn" class="danger">この登録を削除する</button>
      </div>
    </section>
  </main>`;
  bindNav();
  bindReading(person, opts);
  // 削除は2段階確認（押し間違いで消えないように）
  const deleteArea = app.querySelector<HTMLElement>('#deleteArea');
  app.querySelector('#deleteEntryBtn')?.addEventListener('click', () => {
    if (!deleteArea) return;
    deleteArea.innerHTML = `
      <p class="error">本当に削除しますか？</p>
      <div class="actions">
        <button id="deleteConfirmBtn" class="danger">削除する</button>
        <button id="deleteCancelBtn">やめる</button>
      </div>`;
    deleteArea.querySelector('#deleteCancelBtn')?.addEventListener('click', () => { render(); });
    deleteArea.querySelector('#deleteConfirmBtn')?.addEventListener('click', () => {
      try {
        deleteEntry(id);
        route = { name: 'list' };
        render();
      } catch {
        deleteArea.innerHTML = '<p class="error">削除できませんでした。もう一度お試しください。</p>';
      }
    });
  });
}

// ---------- シール帳 ----------
let listFilter: 'all' | Entry['status'] = 'all';
function renderList() {
  const entries = loadEntries();
  const shown = entries.filter((e) => listFilter === 'all' || e.status === listFilter);
  const cards = shown.map((e) => {
    const person: Person = {
      nickname: e.nickname,
      birth: { y: e.y, m: e.m, d: e.d, hour: e.hour, minute: e.minute },
    };
    const chart = computeChart(person.birth);
    const spec = decideCharacter(chart);
    const showPostfix = e.showPostfix ?? false;
    const dn = displayName(e.nickname, chart, showPostfix);
    const visual = e.image
      ? `<img src="${e.image}" alt="">`
      : silhouetteSvg(chart, spec);
    return `<article class="seal-card" data-open="${e.id}">
      <div class="seal-thumb">${visual}</div>
      <div class="seal-meta">
        <div class="seal-name"><span class="name-prefix">${esc(dn.prefix)}</span>${esc(e.nickname)}${showPostfix ? `<span class="name-postfix">・${esc(dn.postfix)}</span>` : ''}</div>
        <span class="badge badge-${e.status}">${e.status === 'waiting' ? '画像待ち' : e.status === 'done' ? '完成' : '贈った'}</span>
      </div>
      ${hasSealImage(e) ? `<button class="explained-btn" data-explained="${e.id}">解説つきで見る</button>` : ''}
    </article>`;
  }).join('');
  app.innerHTML = `${headerHtml()}<main>
    <h1>シール帳</h1>
    <div class="filters">
      ${(['all', 'waiting', 'done', 'sent'] as const).map((f) => `
        <button data-filter="${f}" class="${listFilter === f ? 'active' : ''}">${f === 'all' ? 'すべて' : f === 'waiting' ? '画像待ち' : f === 'done' ? '完成' : '贈った'}</button>`).join('')}
    </div>
    ${shown.length ? `<div class="grid">${cards}</div>` : '<p>まだ登録がありません。「占う」から最初の1件を作ってみてください。</p>'}
  </main>`;
  bindNav();
  app.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    listFilter = (b as HTMLElement).dataset.filter as typeof listFilter;
    render();
  }));
  app.querySelectorAll('[data-open]').forEach((c) => c.addEventListener('click', () => {
    route = { name: 'detail', id: (c as HTMLElement).dataset.open! };
    render();
  }));
  app.querySelectorAll('[data-explained]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.stopPropagation(); // カード自体のクリック（詳細へ）は発火させない
    const entry = getEntry((b as HTMLElement).dataset.explained!);
    if (entry && hasSealImage(entry)) void openExplainedViewer(entry);
  }));
}

// ---------- 解説つきシールのビューア（一覧からその場で見る） ----------
function closeExplainedViewer() {
  document.querySelector('#sealViewer')?.remove();
  document.removeEventListener('keydown', onViewerKeydown);
}

function onViewerKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') closeExplainedViewer();
}

/**
 * 完成済みシールの解説つき版をその場で生成し、全画面オーバーレイで表示する。
 * 生成は詳細画面の書き出しと共通（buildExplainedDataUrl）。保存形式は変えない。
 */
async function openExplainedViewer(entry: Entry) {
  closeExplainedViewer();
  const overlay = document.createElement('div');
  overlay.className = 'seal-viewer';
  overlay.id = 'sealViewer';
  overlay.innerHTML = `
    <div class="seal-viewer-box" role="dialog" aria-label="解説つきシール">
      <div class="seal-viewer-head">
        <span class="seal-viewer-title">解説つきシール</span>
        <button class="seal-viewer-close" aria-label="閉じる">×</button>
      </div>
      <div class="seal-viewer-body"><p class="small">解説つきシールを作っています…</p></div>
      <div class="actions seal-viewer-actions">
        <button class="primary" id="viewerExport" disabled>共有／ダウンロード</button>
        <button id="viewerClose">閉じる</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onViewerKeydown);
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeExplainedViewer(); });
  overlay.querySelector('.seal-viewer-close')?.addEventListener('click', closeExplainedViewer);
  overlay.querySelector('#viewerClose')?.addEventListener('click', closeExplainedViewer);

  const body = overlay.querySelector<HTMLElement>('.seal-viewer-body')!;
  const exportBtn = overlay.querySelector<HTMLButtonElement>('#viewerExport')!;
  const person: Person = {
    nickname: entry.nickname,
    birth: { y: entry.y, m: entry.m, d: entry.d, hour: entry.hour, minute: entry.minute },
  };
  try {
    const dataUrl = await buildExplainedDataUrl(person, entry.image!);
    if (!document.body.contains(overlay)) return; // 生成中に閉じられた
    body.innerHTML = `<img src="${dataUrl}" alt="解説つきシール">`;
    exportBtn.disabled = false;
    exportBtn.addEventListener('click', async () => {
      await withButtonFeedback(exportBtn, '書き出しています…', '書き出しました ✓', async () => {
        await exportSeal(dataUrl, `seal-explained-${entry.nickname}.jpg`);
      });
    });
  } catch {
    if (!document.body.contains(overlay)) return;
    body.innerHTML = '<p class="error">解説つきシールを作れませんでした。詳細画面からもう一度お試しください。</p>';
  }
}

function render() {
  window.scrollTo(0, 0);
  switch (route.name) {
    case 'input': renderInput(); break;
    case 'result': renderResult(route.person); break;
    case 'list': renderList(); break;
    case 'detail': renderDetail(route.id); break;
  }
}

// Service Worker の登録と「更新」ボタン（vite-plugin-pwa が sw.js を自動生成する）
const updateBanner = document.querySelector<HTMLElement>('#update-banner');
const updateButton = document.querySelector<HTMLButtonElement>('#update-button');
const updateLater = document.querySelector<HTMLElement>('#update-later');
if (updateBanner && updateButton && updateLater) {
  setupUpdateBanner(updateBanner, updateButton, updateLater);
}

render();
