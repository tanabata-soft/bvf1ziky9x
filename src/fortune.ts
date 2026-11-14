// 四柱推命の計算層（試作版）
// 命式の算出は lunar-typescript の EightChar に任せ、通変・五行・強弱・
// 形態・装備・レア度・運気判定はこちらで決める。
import { Solar } from 'lunar-typescript';

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type Gan = (typeof GAN)[number];
export type Zhi = (typeof ZHI)[number];
export type Element = '木' | '火' | '土' | '金' | '水';
export const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];

export const GAN_ELEMENT: Record<Gan, Element> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
export const GAN_YINYANG: Record<Gan, '+' | '-'> = {
  甲: '+', 丙: '+', 戊: '+', 庚: '+', 壬: '+',
  乙: '-', 丁: '-', 己: '-', 辛: '-', 癸: '-',
};
export const ZHI_ELEMENT: Record<Zhi, Element> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};
/** 地支の蔵干（本気・中気・余気の順） */
export const ZHI_HIDE: Record<Zhi, Gan[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'],
  未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'], 酉: ['辛'],
  戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};
export const ZHI_ANIMAL: Record<Zhi, string> = {
  子: 'ねずみ', 丑: '牛', 寅: '虎', 卯: '兎', 辰: '龍', 巳: '蛇',
  午: '馬', 未: '羊', 申: '猿', 酉: '鶏', 戌: '犬', 亥: '猪',
};

export type ShiShen = '比肩' | '劫財' | '食神' | '傷官' | '偏財' | '正財' | '七殺' | '正官' | '偏印' | '正印';
export const SHISHEN: ShiShen[] = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印'];

/** 生（generate）: 木→火→土→金→水→木 */
const GEN_NEXT: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

/** 日干 day から見た gan の通変 */
export function shiShenOf(day: Gan, gan: Gan): ShiShen {
  const de = GAN_ELEMENT[day];
  const te = GAN_ELEMENT[gan];
  const samePolarity = GAN_YINYANG[day] === GAN_YINYANG[gan];
  if (te === de) return samePolarity ? '比肩' : '劫財';
  if (GEN_NEXT[de] === te) return samePolarity ? '食神' : '傷官'; // 日干が生じる
  if (GEN_NEXT[te] === de) return samePolarity ? '偏印' : '正印'; // 日干を生む
  if (GEN_NEXT[GEN_NEXT[de]] === te) return samePolarity ? '偏財' : '正財'; // 日干が克す
  return samePolarity ? '七殺' : '正官'; // 日干を克す
}

export interface Pillar {
  label: string; // 年柱・月柱・日柱・時柱
  gan: Gan;
  zhi: Zhi;
  gz: string;
  hideGan: Gan[];
  ganShiShen: ShiShen | '本人';
  zhiShiShen: ShiShen; // 本気の通変
  diShi: string; // 十二運
}

export interface Chart {
  pillars: Pillar[]; // 時柱なしの場合は3本
  hasTime: boolean;
  dayGan: Gan;
  dayZhi: Zhi;
  elementTotals: Record<Element, number>;
  shiShenScores: Record<ShiShen, number>;
  /** 最強の通変について、日支本気からの寄与があるか */
  strongestFromDayZhi: boolean;
  strongest: ShiShen;
  rankedShiShen: ShiShen[]; // スコア順（同点は SHISHEN 順）
  weakBody: boolean;
  supportRatio: number;
  strongestElement: Element;
  weakestElement: Element;
}

export interface BirthInput {
  y: number; m: number; d: number;
  hour: number | null; // null = 時刻不明
  minute: number;
}

function eightChar(b: BirthInput) {
  const hour = b.hour ?? 12;
  const minute = b.hour === null ? 0 : b.minute;
  return Solar.fromYmdHms(b.y, b.m, b.d, hour, minute, 0).getLunar().getEightChar();
}

export function computeChart(b: BirthInput): Chart {
  const ec = eightChar(b);
  const dayGan = ec.getDay()[0] as Gan;
  const mk = (
    label: string, gz: string, hide: string[], diShi: string, isDay = false,
  ): Pillar => {
    const gan = gz[0] as Gan;
    const zhi = gz[1] as Zhi;
    const hideGan = hide as Gan[];
    return {
      label, gan, zhi, gz, hideGan,
      ganShiShen: isDay ? '本人' : shiShenOf(dayGan, gan),
      zhiShiShen: shiShenOf(dayGan, hideGan[0]),
      diShi,
    };
  };
  const pillars: Pillar[] = [
    mk('年柱', ec.getYear(), ec.getYearHideGan(), ec.getYearDiShi()),
    mk('月柱', ec.getMonth(), ec.getMonthHideGan(), ec.getMonthDiShi()),
    mk('日柱', ec.getDay(), ec.getDayHideGan(), ec.getDayDiShi(), true),
  ];
  if (b.hour !== null) {
    pillars.push(mk('時柱', ec.getTime(), ec.getTimeHideGan(), ec.getTimeDiShi()));
  }

  // 五行バランス（試作の重み: 天干2、本気3、中気・余気1）
  const elementTotals: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    elementTotals[GAN_ELEMENT[p.gan]] += 2;
    p.hideGan.forEach((g, i) => {
      elementTotals[GAN_ELEMENT[g]] += i === 0 ? 3 : 1;
    });
  }

  // 通変スコア（天干: 年・時3、月4／本気: 月支3・他2／蔵干の残り1）
  const shiShenScores = Object.fromEntries(SHISHEN.map((s) => [s, 0])) as Record<ShiShen, number>;
  const dayZhiByStrongest = new Set<ShiShen>();
  for (const p of pillars) {
    if (p.ganShiShen !== '本人') {
      shiShenScores[p.ganShiShen] += p.label === '月柱' ? 4 : 3;
    }
    p.hideGan.forEach((g, i) => {
      const ss = shiShenOf(dayGan, g);
      const w = i === 0 ? (p.label === '月柱' ? 3 : 2) : 1;
      shiShenScores[ss] += w;
      if (p.label === '日柱' && i === 0) dayZhiByStrongest.add(ss);
    });
  }
  const rankedShiShen = [...SHISHEN].sort(
    (a, c) => shiShenScores[c] - shiShenScores[a] || SHISHEN.indexOf(a) - SHISHEN.indexOf(c),
  );
  const strongest = rankedShiShen[0];

  // 身の強弱（試作ヒューリスティクス: 日干を支える五行＝同元素＋生む元素の割合）
  const de = GAN_ELEMENT[dayGan];
  const gen = (Object.keys(GEN_NEXT) as Element[]).find((e) => GEN_NEXT[e] === de)!;
  const total = ELEMENTS.reduce((s, e) => s + elementTotals[e], 0);
  const supportRatio = (elementTotals[de] + elementTotals[gen]) / total;
  const weakBody = supportRatio < 0.35;

  const byTotal = [...ELEMENTS].sort((a, c) => elementTotals[c] - elementTotals[a]);
  return {
    pillars,
    hasTime: b.hour !== null,
    dayGan,
    dayZhi: pillars[2].zhi,
    elementTotals,
    shiShenScores,
    strongestFromDayZhi: dayZhiByStrongest.has(strongest),
    strongest,
    rankedShiShen,
    weakBody,
    supportRatio,
    strongestElement: byTotal[0],
    weakestElement: byTotal[byTotal.length - 1],
  };
}

/** 指定した暦年の流年（干支）。年の中日で求めるため立春境界の影響を受けない */
export function yearPillar(year: number): { gan: Gan; zhi: Zhi; gz: string } {
  const gz = Solar.fromYmdHms(year, 7, 1, 12, 0, 0).getLunar().getEightChar().getYear();
  return { gan: gz[0] as Gan, zhi: gz[1] as Zhi, gz };
}

// ---------- 分身キャラ決定 ----------

export type FormType = '人型' | '精霊型' | '獣型' | '道具型' | '群体型';

export function decideForm(chart: Chart): FormType {
  // 仕様書第4章の優先順位ルール
  const counts = new Map<ShiShen, number>();
  for (const p of chart.pillars) {
    if (p.ganShiShen !== '本人') counts.set(p.ganShiShen, (counts.get(p.ganShiShen) ?? 0) + 1);
    counts.set(p.zhiShiShen, (counts.get(p.zhiShiShen) ?? 0) + 1);
  }
  if ([...counts.values()].some((c) => c >= 3)) return '群体型'; // ①
  if (chart.strongest === '正印' || chart.strongest === '偏印') return '道具型'; // ②
  if (chart.strongestFromDayZhi) return '獣型'; // ③
  if (chart.weakBody) return '精霊型'; // ④
  return '人型'; // ⑤
}

export interface EquipmentPick {
  shiShen: ShiShen;
  score: number;
  sizeTier: 1 | 2 | 3; // 1=チャーム、2=手持ち、3=両手持ち
}
export interface CharacterSpec {
  form: FormType;
  mainEq: EquipmentPick;
  subEq: EquipmentPick[];
  charmElement: Element; // 補いのお守り（最弱の五行）
  companionZhi: Zhi;
  crestZhi: Zhi;
  seasonZhi: Zhi;
  prefixShiShen: ShiShen;
}

function tier(score: number): 1 | 2 | 3 {
  if (score >= 7) return 3;
  if (score >= 4) return 2;
  return 1;
}

export function decideCharacter(chart: Chart): CharacterSpec {
  const [first, ...rest] = chart.rankedShiShen;
  const subs = rest
    .filter((s) => chart.shiShenScores[s] > 0)
    .slice(0, 2)
    .map((s) => ({ shiShen: s, score: chart.shiShenScores[s], sizeTier: tier(chart.shiShenScores[s]) }));
  return {
    form: decideForm(chart),
    mainEq: { shiShen: first, score: chart.shiShenScores[first], sizeTier: tier(chart.shiShenScores[first]) },
    subEq: subs,
    charmElement: chart.weakestElement,
    companionZhi: chart.dayZhi,
    crestZhi: chart.pillars[0].zhi,
    seasonZhi: chart.pillars[1].zhi,
    prefixShiShen: first,
  };
}

// ---------- レア度（仮ルール: チェックリスト方式） ----------

const SANGOU: Zhi[][] = [
  ['申', '子', '辰'], ['寅', '午', '戌'], ['巳', '酉', '丑'], ['亥', '卯', '未'],
];
const GOU_PAIRS: [Zhi, Zhi][] = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
const ROKUGOU: [Zhi, Zhi][] = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
const KEI_PAIRS: [Zhi, Zhi][] = [['子', '卯'], ['丑', '戌'], ['戌', '未'], ['丑', '未'], ['寅', '巳'], ['巳', '申'], ['寅', '申']];
const GAN_GOU: [Gan, Gan][] = [['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸']];

export interface Rarity {
  stars: number;
  points: number;
  reasons: string[];
}

export function rarityOf(chart: Chart): Rarity {
  const reasons: string[] = [];
  let points = 0;
  const add = (cond: boolean, label: string, pt: number) => {
    if (cond) { points += pt; reasons.push(label); }
  };
  const zhis = chart.pillars.map((p) => p.zhi);
  const gans = chart.pillars.map((p) => p.gan);
  add(ELEMENTS.every((e) => chart.elementTotals[e] > 0), '五行がすべて揃っている', 1);
  add(SANGOU.some((t) => t.every((z) => zhis.includes(z))), '三合の組み合わせが完成している', 2);
  const hasFood = chart.pillars.some((p) => p.ganShiShen === '食神' || p.ganShiShen === '傷官');
  const hasWealth = SHISHEN.filter((s) => s === '正財' || s === '偏財').some((s) => chart.shiShenScores[s] > 0);
  add(hasFood && hasWealth, '食神・傷官から財への流れ（食神生財）がある', 1);
  add(chart.shiShenScores['七殺'] > 0 && (chart.shiShenScores['正印'] > 0 || chart.shiShenScores['偏印'] > 0), '七殺と印が支え合う（殺印相生）', 1);
  add(gans.some((g, i) => gans.indexOf(g) !== i), '同じ天干が重なっている', 1);
  const total = ELEMENTS.reduce((s, e) => s + chart.elementTotals[e], 0);
  add(chart.elementTotals[chart.strongestElement] / total >= 0.45, '五行の偏りが際立っている', 1);
  add(GAN_GOU.some(([a, b2]) => gans.includes(a) && gans.includes(b2)), '天干の合がある', 1);
  const stars = points <= 0 ? 1 : points === 1 ? 2 : points === 2 ? 3 : points === 3 ? 4 : 5;
  return { stars, points, reasons };
}

// ---------- 流年（今年・来年の運勢） ----------

export type FortuneStage = '大吉' | '吉' | '小吉' | '変化' | '凶' | '大凶';
export interface YearFortune {
  year: number;
  gz: string;
  gan: Gan;
  zhi: Zhi;
  shiShen: ShiShen;
  stage: FortuneStage;
  score: number;
  factors: string[];
}

export function yearFortune(chart: Chart, year: number): YearFortune {
  const yp = yearPillar(year);
  const ss = shiShenOf(chart.dayGan, yp.gan);
  const els: Element[] = [GAN_ELEMENT[yp.gan], ZHI_ELEMENT[yp.zhi]];
  let score = 0;
  let chong = false;
  const factors: string[] = [];
  for (const e of els) {
    if (e === chart.weakestElement) { score += 1; factors.push(`足りない${e}を補ってくれる年です`); }
    if (e === chart.strongestElement) { score -= 1; factors.push(`もともと強い${e}がさらに重なります`); }
  }
  const supportStars: ShiShen[] = ['正印', '偏印', '比肩', '劫財'];
  const wealthStars: ShiShen[] = ['正財', '偏財'];
  const officerStars: ShiShen[] = ['正官', '七殺'];
  const outputStars: ShiShen[] = ['食神', '傷官'];
  if (chart.weakBody) {
    if (supportStars.includes(ss)) { score += 2; factors.push('支えてくれる星が巡り、力を回復しやすい年です'); }
    if (wealthStars.includes(ss) || officerStars.includes(ss)) { score -= 2; factors.push('負担の大きい星が巡り、無理をしやすい年です'); }
  } else {
    if (outputStars.includes(ss) || wealthStars.includes(ss)) { score += 2; factors.push('力を外へ使える星が巡り、活動が実りやすい年です'); }
    if (supportStars.includes(ss)) { score -= 1; factors.push('支えが重なり、少し動きにくさが出る年です'); }
  }
  const dz = chart.dayZhi;
  if (ROKUGOU.some(([a, b2]) => (a === yp.zhi && b2 === dz) || (b2 === yp.zhi && a === dz))) {
    score += 2; factors.push('生まれた日の支と今年の支が合わさり、縁が動きやすい年です');
  }
  if (GOU_PAIRS.some(([a, b2]) => (a === yp.zhi && b2 === dz) || (b2 === yp.zhi && a === dz))) {
    score -= 2; chong = true; factors.push('生まれた日の支と今年の支がぶつかり、変化が起きやすい年です');
  }
  // 冲と刑が重なる組み合わせ（丑未など）では、冲を優先して刑は数えない
  if (!chong && KEI_PAIRS.some(([a, b2]) => (a === yp.zhi && b2 === dz) || (b2 === yp.zhi && a === dz))) {
    score -= 1; factors.push('支同士に少し引っかかりがあり、確認を丁寧にしたい年です');
  }
  const uniqFactors = [...new Set(factors)];
  let stage: FortuneStage;
  if (chong) stage = score >= -3 ? '変化' : '大凶';
  else if (score >= 4) stage = '大吉';
  else if (score >= 2) stage = '吉';
  else if (score >= 0) stage = '小吉';
  else if (score >= -2) stage = '凶';
  else stage = '大凶';
  return { year, gz: yp.gz, gan: yp.gan, zhi: yp.zhi, shiShen: ss, stage, score, factors: uniqFactors };
}
