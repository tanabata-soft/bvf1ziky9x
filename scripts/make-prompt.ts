// チャット用：ニックネームと生年月日から、アプリと同一の計算で呪文を組み立てる CLI。
// アプリの計算モジュール（src/fortune.ts・src/texts.ts・src/name.ts）をそのまま使うので、
// アプリの表示（称号・装備・呪文）とずれない。
// 実行は scripts/make-prompt.mjs 経由（このファイルを CommonJS に変換してから node で実行する）。
//
// 使い方:
//   node scripts/make-prompt.mjs <ニックネーム> <YYYY-MM-DD> [オプション]
// オプション:
//   --time HH:MM      出生時刻（省略時・「unknown」指定時は時刻不明として計算）
//   --appearance none|boy|girl   見た目（省略時は none＝指定なし。idol は boy に読み替える）
// トーンは利用者が選ぶものではなく、最強の通変からの自動ルール（defaultToneOf）で決まる（v0.2.3〜）。
// 年齢区分（子ども／若者／青年／中年／円熟）・体格（最強の五行）・髪（日干の五行）も命式と年齢から自動で決まる（v0.2.5〜）。
// 顔の装飾は職業から自動で決まる（v0.2.6〜。頭にサブ装備が乗る命式では小さく弱める）。
declare const process: { argv: string[]; exit: (code?: number) => never };

import {
  computeChart, decideCharacter, rarityOf, toneOfChart, normalizeAppearance,
  glamourTierOf, GLAMOUR_LABEL, TONE_LABEL, APPEARANCE_LABEL, ZHI_ANIMAL,
  ageBandOf, AGE_BAND_LABEL,
  type Appearance, type BirthInput,
} from '../src/fortune';
import { buildPrompt, EQUIPMENT, prefixTitleOf, POSTFIX_TITLE, toneReasonOf, appearanceReasonLines, hairLabelOf, outfitTextOf } from '../src/texts';
import { buildDisplayName } from '../src/name';

const USAGE = `使い方: node scripts/make-prompt.mjs <ニックネーム> <YYYY-MM-DD> [--time HH:MM|unknown] [--appearance none|boy|girl]`;

function fail(msg: string): never {
  console.error(`エラー: ${msg}`);
  console.error(USAGE);
  process.exit(1);
}

function parseArgs(argv: string[]): {
  nickname: string; birth: BirthInput; appearance: Appearance;
} {
  const positional: string[] = [];
  let time: string | undefined;
  let appearance: Appearance = 'none';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--time') time = argv[++i] ?? fail('--time の値がありません');
    else if (a === '--appearance') {
      appearance = normalizeAppearance(argv[++i] ?? fail('--appearance の値がありません'));
    } else if (a === '--help' || a === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else if (a.startsWith('--')) fail(`不明なオプションです: ${a}`);
    else positional.push(a);
  }
  if (positional.length !== 2) fail('ニックネームと生年月日（YYYY-MM-DD）を指定してください');
  const [nickname, dateStr] = positional;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) fail(`生年月日は YYYY-MM-DD 形式で指定してください: ${dateStr}`);
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    fail(`存在しない日付です: ${dateStr}`);
  }
  let hour: number | null = null;
  let minute = 0;
  if (time !== undefined && time !== 'unknown') {
    const tm = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (!tm) fail(`出生時刻は HH:MM 形式で指定してください: ${time}`);
    hour = Number(tm[1]); minute = Number(tm[2]);
    if (hour > 23 || minute > 59) fail(`出生時刻が不正です: ${time}`);
  }
  return { nickname, birth: { y, m: mo, d, hour, minute }, appearance };
}

function main(): void {
  const { nickname, birth, appearance } = parseArgs(process.argv.slice(2));
  const chart = computeChart(birth);
  const spec = decideCharacter(chart);
  const rarity = rarityOf(chart);
  // トーンは最強の通変から自動で決まる（アプリと同じルール）
  const tone = toneOfChart(chart);
  const prefix = prefixTitleOf(chart.strongest, tone);
  const postfix = POSTFIX_TITLE[chart.dayGan];
  // アプリの既定表示はポストフィックスなし（詳細画面で付け外しできる）
  const displayName = buildDisplayName(prefix, nickname, '');
  // 年齢区分は生年月日から今日の年齢で決まる（アプリと同じルール、v0.2.5）
  const ageBand = ageBandOf(birth);
  const appearanceReasons = appearanceReasonLines(chart, spec, ageBand);
  const prompt = buildPrompt(chart, spec, rarity.stars, tone, appearance, ageBand);

  const pillarLine = chart.pillars.map((p) => `${p.label} ${p.gz}`).join('／');
  const subLine = spec.subEq.length
    ? spec.subEq.map((s) => `${EQUIPMENT[s.shiShen].name}（${s.shiShen}）`).join('、')
    : 'なし';
  const timeNote = birth.hour === null
    ? '時刻不明（時柱なし）'
    : `${String(birth.hour).padStart(2, '0')}:${String(birth.minute).padStart(2, '0')}`;

  console.log(`表示名：${displayName}`);
  console.log(`（ポストフィックス称号：${postfix} ※アプリの既定表示では付けません）`);
  console.log(`命式：${pillarLine}（日干：${chart.dayGan}／出生時刻：${timeNote}）`);
  console.log(`形態：${spec.form}／メイン装備：${EQUIPMENT[spec.mainEq.shiShen].name}（${spec.mainEq.shiShen}）／サブ装備：${subLine}`);
  console.log(`補いのお守り：${spec.charmElement}の色のリボンチャーム／相棒：${ZHI_ANIMAL[spec.companionZhi]}（日支 ${spec.companionZhi}）／紋章：年支 ${spec.crestZhi}`);
  const appearanceNote = appearance === 'none'
    ? APPEARANCE_LABEL[appearance]
    : `${APPEARANCE_LABEL[appearance]}（年齢区分：${AGE_BAND_LABEL[ageBand]}）`;
  console.log(`職業：${TONE_LABEL[tone]}（最強の星・${chart.strongest}から自動決定：${toneReasonOf(chart.strongest)}）／装い：${outfitTextOf(tone, spec).shortJa}／見た目：${appearanceNote}／レア度：星${rarity.stars}（${GLAMOUR_LABEL[glamourTierOf(rarity.stars)]}）`);
  console.log(`外見の理由：体格 ${appearanceReasons.buildLine}／${hairLabelOf(spec.form)} ${appearanceReasons.hairLine}`);
  console.log('');
  console.log('===== 呪文（英語プロンプト） =====');
  console.log(prompt.prompt);
  console.log('');
  console.log('===== ネガティブプロンプト =====');
  console.log(prompt.negative);
}

main();
