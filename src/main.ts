import './style.css';
import {
  computeChart, decideCharacter, rarityOf, yearFortune, glamourTierOf, GLAMOUR_LABEL,
  type BirthInput, type Chart,
} from './fortune';
import {
  DAY_GAN_TEXT, DAY_GAN_SHORT, STRONGEST_TEXT, YEAR_STAR_TEXT, STAGE_TEXT,
  EQUIPMENT, PREFIX_TITLE, POSTFIX_TITLE, ELEMENT_COLOR, buildPrompt, seasonOf, SEASON_JA,
} from './texts';
import { silhouetteSvg } from './silhouette';
import { loadImage, loadImageFromUrl, composeSeal, composeExplainedSeal, canvasToDataUrl, exportSeal } from './seal';
import {
  loadEntries, addEntry, updateEntry, getEntry,
  type Entry,
} from './store';

const APP_VERSION = '0.1.4';
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

function displayName(nickname: string, chart: Chart, showPostfix: boolean): { prefix: string; postfix: string; full: string } {
  const prefix = PREFIX_TITLE[chart.strongest];
  const postfix = POSTFIX_TITLE[chart.dayGan];
  // 基本形は「プレフィックス＋ニックネーム」。ポストフィックスは任意（オーナー決定 2026-11-15）
  return { prefix, postfix, full: showPostfix ? `${prefix} ${nickname}・${postfix}` : `${prefix} ${nickname}` };
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
        <legend>この結果の扱い</legend>
        <label class="check"><input type="radio" name="save" value="save" checked> コレクションに保存する</label>
        <label class="check"><input type="radio" name="save" value="once"> 今回だけ（保存しない）</label>
      </fieldset>
      <button type="submit" class="primary">占う</button>
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
    const save = (app.querySelector<HTMLInputElement>('input[name="save"]:checked')!).value === 'save';
    if (save) {
      const entry = addEntry({
        nickname, y, m, d, hour, minute, status: 'waiting',
      });
      route = { name: 'detail', id: entry.id };
    } else {
      transientImage = undefined;
      transientShowPostfix = false;
      route = { name: 'result', person };
    }
    render();
  });
}

// ---------- 読みの描画（結果・詳細で共用） ----------
interface ReadingOpts {
  image?: string;
  status?: Entry['status'];
  showPostfix: boolean;
  onTogglePostfix: (show: boolean) => void;
  onRegisterImage: (dataUrl: string) => void;
  onExport?: () => Promise<void> | void;
  onSent?: () => void;
}

function renderReading(person: Person, opts: ReadingOpts): string {
  const chart = computeChart(person.birth);
  const spec = decideCharacter(chart);
  const rarity = rarityOf(chart);
  const dn = displayName(person.nickname, chart, opts.showPostfix);
  const prompt = buildPrompt(chart, spec, rarity.stars);
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
      <p>${YEAR_STAR_TEXT[f.shiShen]}</p>
      <p>${STAGE_TEXT[f.stage]}</p>
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
    <div class="display-name"><span class="prefix">${esc(dn.prefix)}</span>
    <span class="main-name">${esc(person.nickname)}${opts.showPostfix ? `<span class="postfix">・${esc(dn.postfix)}</span>` : ''}</span></div>
    <label class="check small"><input type="checkbox" id="postfixToggle" ${opts.showPostfix ? 'checked' : ''}> 後ろの称号「・${esc(dn.postfix)}」も付ける（基本は付けません）</label>
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
    </ul>
  </section>

  <section class="card">
    <h2>キャラ生成の呪文（英語）</h2>
    <p class="small">お使いの画像生成AI（Gemini、ChatGPT、Museなど）にそのまま貼って使えます。名前は呪文に含まれていません。</p>
    <ul class="parts">${prompt.partsJa.map((p) => `<li><strong>${esc(p.label)}</strong>：${esc(p.value)}</li>`).join('')}</ul>
    <pre class="prompt" id="promptText">${esc(prompt.prompt)}</pre>
    <button class="primary" id="copyPrompt">呪文をコピー</button>
    <h3>ネガティブプロンプト（対応するAI向け）</h3>
    <pre class="prompt" id="negativeText">${esc(prompt.negative)}</pre>
    <button id="copyNegative">ネガティブプロンプトをコピー</button>
  </section>

  <section class="card">
    <h2>画像を登録してシールを完成させる</h2>
    <p class="small">生成した画像を選ぶと、絵全体が切れずに収まる形で名前帯と枠を合成します。レア度は星ではなく、枠の派手さ（ふつう／キラ／大当たり）で表れます。</p>
    <input type="file" id="imageFile" accept="image/*">
    <div id="registerMsg"></div>
    ${opts.image ? '<p class="success">✓ シールが完成しています。画像を選ぶと差し替えできます。</p>' : ''}
    ${opts.image ? `<div class="actions">
      <button class="primary" id="exportBtn">シール単体を書き出す（共有／ダウンロード）</button>
      <button id="exportExplainedBtn">解説つきで書き出す（共有／ダウンロード）</button>
      ${opts.onSent ? '<button id="sentBtn">贈ったことにする</button>' : ''}
    </div>` : ''}
  </section>`;
}

function bindReading(person: Person, opts: ReadingOpts) {
  const chart = computeChart(person.birth);
  const rarity = rarityOf(chart);
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
  app.querySelector<HTMLInputElement>('#postfixToggle')?.addEventListener('change', (ev) => {
    opts.onTogglePostfix((ev.target as HTMLInputElement).checked);
  });
  app.querySelector<HTMLInputElement>('#imageFile')?.addEventListener('change', async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const msg = app.querySelector('#registerMsg')!;
    msg.innerHTML = '<p class="small">シールを合成しています…</p>';
    try {
      const img = await loadImage(file);
      const canvas = composeSeal(img, {
        prefix: dn.prefix, nickname: person.nickname, postfix: opts.showPostfix ? dn.postfix : '',
        tier: glamourTierOf(rarity.stars), mainColor: chart.strongestElement,
      });
      opts.onRegisterImage(canvasToDataUrl(canvas));
    } catch {
      msg.innerHTML = '<p class="error">画像を読み込めませんでした。別の画像でお試しください。</p>';
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
      const sealImg = await loadImageFromUrl(opts.image!);
      const spec = decideCharacter(chart);
      const f = yearFortune(chart, new Date().getFullYear());
      const canvas = composeExplainedSeal(sealImg, {
        personality: [DAY_GAN_SHORT[chart.dayGan], STRONGEST_TEXT[chart.strongest]],
        fortuneHeading: `${f.year}年の運勢（${f.stage}）`,
        fortuneBody: [YEAR_STAR_TEXT[f.shiShen], STAGE_TEXT[f.stage]],
        equipLines: [
          ...[spec.mainEq, ...spec.subEq].map((p) =>
            `${EQUIPMENT[p.shiShen].name}（${p.shiShen}）：${EQUIPMENT[p.shiShen].meaning}`),
          `お守りのリボンチャーム：足りない五行「${spec.charmElement}」を補い、バランスを整えるお守りです`,
        ],
        footer: '命式シール（仮）― 四柱推命をもとにした贈り物シールです',
        mainColor: chart.strongestElement,
      });
      await exportSeal(canvasToDataUrl(canvas), `seal-explained-${person.nickname}.jpg`);
    });
    if (!ok && msg) {
      msg.innerHTML = '<p class="error">解説つき画像を作れませんでした。もう一度お試しください。</p>';
    }
  });
  app.querySelector('#sentBtn')?.addEventListener('click', () => { opts.onSent?.(); });
}

// ---------- 結果画面（今回だけ） ----------
function renderResult(person: Person) {
  const opts: ReadingOpts = {
    image: transientImage,
    showPostfix: transientShowPostfix,
    onTogglePostfix: (show) => { transientShowPostfix = show; render(); },
    onRegisterImage: (dataUrl) => { transientImage = dataUrl; render(); },
    onExport: () => (transientImage ? exportSeal(transientImage, `seal-${person.nickname}.jpg`) : undefined),
  };
  app.innerHTML = `${headerHtml()}<main>
    <p class="small">「今回だけ」の結果です。コレクションには保存されていません。</p>
    ${renderReading(person, opts)}
  </main>`;
  bindNav();
  bindReading(person, opts);
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
    onTogglePostfix: (show) => { updateEntry(id, { showPostfix: show }); render(); },
    onRegisterImage: (dataUrl) => {
      updateEntry(id, { image: dataUrl, status: 'done' });
      render();
    },
    onExport: () => (entry.image ? exportSeal(entry.image, `seal-${entry.nickname}.jpg`) : undefined),
    onSent: entry.status === 'done' ? () => { updateEntry(id, { status: 'sent' }); render(); } : undefined,
  };
  app.innerHTML = `${headerHtml()}<main>
    <button class="back" data-nav="list">← シール帳へ戻る</button>
    ${renderReading(person, opts)}
  </main>`;
  bindNav();
  bindReading(person, opts);
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
        <div class="seal-name"><span class="small">${esc(dn.prefix)}</span><br>${esc(e.nickname)}${showPostfix ? `<span class="small">・${esc(dn.postfix)}</span>` : ''}</div>
        <span class="badge badge-${e.status}">${e.status === 'waiting' ? '画像待ち' : e.status === 'done' ? '完成' : '贈った'}</span>
      </div>
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* 試作版では失敗しても続行 */ });
  });
}

render();
