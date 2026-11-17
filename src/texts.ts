// 読みの文章（最小セット）と装備辞書、英語プロンプトの部品。
// 装備辞書は「呪文・シルエット・装備の意味表示」の3出口で共用する（仕様書5.1）。
import type { AgeBand, Appearance, Element, FormType, FortuneStage, Gan, GlamourTier, ShiShen, Tone, YearFortune, Zhi } from './fortune';
import {
  glamourTierOf, decideCharacter, yearFortune,
  GAN_ELEMENT, ZHI_ELEMENT, SANGOU, GOU_PAIRS, ROKUGOU, KEI_PAIRS,
  TONE_OF_STAR, DARK_TONES, TONE_LABEL, toneOfChart,
  AGE_BAND_LABEL, AGE_BAND_RANGE, APPEARANCE_LABEL,
} from './fortune';
import type { CharacterSpec, Chart } from './fortune';

export const DAY_GAN_TEXT: Record<Gan, string> = {
  甲: '大きな樹のようにまっすぐで、頼られると力を発揮するタイプです。筋を通すことを大切にし、曲がったことが苦手です。',
  乙: '草花やツタのようにしなやかで、環境に合わせて伸びていくタイプです。芯は意外と粘り強く、美意識も高い人です。',
  丙: '太陽のように明るく、その場にいるだけで空気を温めるタイプです。表現することが得意で、注目されると伸びていきます。',
  丁: '灯火のように静かに周りを照らすタイプです。感受性が豊かで、人の気持ちの変化によく気づきます。',
  戊: '山のようにどっしりと構え、簡単には動じないタイプです。信用を何より大切にし、守る力に優れています。',
  己: '畑の土のように人を育てるのが上手なタイプです。細やかな気配りと、地道な積み重ねが持ち味です。',
  庚: '鋼のように意志が固く、決めたらやり抜くタイプです。変化を恐れず、道を切り開く力があります。',
  辛: '宝石のように繊細で、磨かれるほど輝くタイプです。美的感覚に優れ、自分なりの美学を持っています。',
  壬: '大河のようにスケールが大きく、流れに乗るのが上手なタイプです。知恵と適応力をあわせ持ちます。',
  癸: '雨露のように静かに染み入るタイプです。想像力が豊かで、人の心にそっと寄り添う力があります。',
};

/** 性格ひとこと（解説つき書き出し用の一行要約） */
export const DAY_GAN_SHORT: Record<Gan, string> = {
  甲: '大きな樹のようにまっすぐで、頼られると力を発揮するタイプです。',
  乙: '草花やツタのようにしなやかで、環境に合わせて伸びていくタイプです。',
  丙: '太陽のように明るく、その場にいるだけで空気を温めるタイプです。',
  丁: '灯火のように静かに周りを照らし、人の気持ちによく気づくタイプです。',
  戊: '山のようにどっしりと構え、信用を何より大切にするタイプです。',
  己: '畑の土のように人を育てるのが上手で、気配りの細やかなタイプです。',
  庚: '鋼のように意志が固く、決めたらやり抜くタイプです。',
  辛: '宝石のように繊細で、磨かれるほど輝くタイプです。',
  壬: '大河のようにスケールが大きく、流れに乗るのが上手なタイプです。',
  癸: '雨露のように静かに染み入り、人の心にそっと寄り添うタイプです。',
};

export const STRONGEST_TEXT: Record<ShiShen, string> = {
  比肩: '自分の足で立つ力が強く、自分のやり方を貫くことで道が開けます。',
  劫財: '人と競い合う場面で燃えるタイプで、仲間と刺激し合うほど伸びていきます。',
  食神: 'ものを作り出す楽しさにあふれ、作品や料理など、形あるものを生む力があります。',
  傷官: '表現の切れ味が鋭く、言葉や技術で人を惹きつける力があります。',
  偏財: '巡ってくるチャンスを掴むのが上手で、人との縁そのものが財産になります。',
  正財: 'コツコツ積み上げる堅実さがあり、信頼と実績を着実に貯めていけます。',
  七殺: 'プレッシャーの中でこそ力が出るタイプで、勝負どころに強い人です。',
  正官: '責任感と品格があり、人から任されることで評価が高まっていきます。',
  偏印: 'ひらめきと探求心に優れ、人と違う視点を持つことが武器になります。',
  正印: '学ぶ力と守る力があり、周りの人を安心させる存在です。',
};

export const YEAR_STAR_TEXT: Record<ShiShen, string> = {
  比肩: '自分のペースを取り戻す年です。自立や再スタートのテーマが出てきます。',
  劫財: '人との関わりが活発になる年です。競争や協力の場面が増えそうです。',
  食神: '作ること・楽しむことが広がる年です。趣味や作品づくりに追い風が吹きます。',
  傷官: '表現と発信の年です。言葉が注目されやすい分、言い方には少し注意を。',
  偏財: '人脈とチャンスが広がる年です。思いがけない縁が動きそうです。',
  正財: '堅実に積み上げる年です。お金や暮らしの土台を整えるのに向いています。',
  七殺: '勝負とプレッシャーの年です。踏ん張りどころですが、乗り越えれば大きく伸びます。',
  正官: '評価と責任の年です。任される仕事が増え、肩書きが動きやすい時期です。',
  偏印: '学びとひらめきの年です。新しい分野への好奇心が運を連れてきます。',
  正印: '守られ、整える年です。学び直しや体調管理に向いています。',
};

export const STAGE_TEXT: Record<FortuneStage, string> = {
  大吉: '追い風の強い一年です。やりたいことに思い切って挑戦してみてください。',
  吉: '順調な一年です。一歩ずつ進めることで、確かな実りが期待できます。',
  小吉: '穏やかな一年です。大きな賭けより、日々を丁寧に過ごすことが実りにつながります。',
  変化: '変化の多い一年です。予定が動くこと自体は悪いことではありません。柔軟に乗り換える姿勢が助けになります。',
  凶: '少し気を付けたい一年です。無理を重ねず、体調管理と確認を丁寧に。急いで決めないことが守りになります。',
  大凶: '踏ん張りどころの一年です。大きな決断は急がず、守りを固めて過ごしてください。備えと休息が来年への力になります。',
};

// ---------- 読み文面のバリエーション（v0.1.9） ----------
// 日干が同じ2人だと性格の書き出しと運勢本文が全く同じ文になってしまう問題への対応。
// 日干の一行要約に「生まれ月（月支）の季節感」と「日支（相棒の動物）に由来する一節」を組み合わせ、
// 運勢本文には判定に使っている要素（支の合・冲・刑・三合、不足五行と流年の関係、最強の星）を
// 反映した、その人の命式に寄せた一文を差し込む。部品はすべてデータ駆動で、文同士は独立に足すだけ
// （組み合わせで破綻しない形）。

/** 生まれ月の季節感（月支→季節）。性格の書き出しに足す一節 */
export const SEASON_TRAIT: Record<'spring' | 'summer' | 'autumn' | 'winter', string> = {
  spring: '春に芽吹く若芽のような伸びやかさがあり、新しいことを始める力が追い風になります。',
  summer: '夏の陽射しのような勢いがあり、動き出すと周りも巻き込む力があります。',
  autumn: '秋の実りのような落ち着きがあり、積み重ねを形にしていくのが得意です。',
  winter: '冬の静けさのような深さがあり、じっくり考える時間から力が湧いてきます。',
};

/** 日支（相棒の動物）に由来する一節。性格の締めに足す */
export const DAY_ZHI_TRAIT: Record<Zhi, string> = {
  子: '相棒のねずみのように機敏で、変化の兆しを素早く察知する勘の良さがあります。',
  丑: '相棒の牛のように粘り強く、一度決めたことは最後までやり抜く芯の強さがあります。',
  寅: '相棒の虎のように堂々としていて、ここぞという場面で前に出る勇気があります。',
  卯: '相棒の兎のように穏やかで、場の空気を和ませる優しさがあります。',
  辰: '相棒の龍のように夢が大きく、周りを巻き込むスケールの発想があります。',
  巳: '相棒の蛇のように洞察が鋭く、物事の本質を静かに見抜く力があります。',
  午: '相棒の馬のように駆け抜ける勢いがあり、行動の速さが持ち味です。',
  未: '相棒の羊のように温かく、人の気持ちに寄り添う思いやりがあります。',
  申: '相棒の猿のように器用で機転が利き、遊び心を忘れない人です。',
  酉: '相棒の鶏のように几帳面で、細部まで気を配る丁寧さがあります。',
  戌: '相棒の犬のように誠実で、仲間を守る気持ちの強い人です。',
  亥: '相棒の猪のようにまっすぐ突き進む情熱があり、決めたら迷わない強さがあります。',
};

/** 性格文（解説つきシール用）: 日干の要約＋季節感／最強の星／日支の一節 */
export function personalityTextsOf(chart: Chart): string[] {
  const monthZhi = chart.pillars[1].zhi;
  return [
    `${DAY_GAN_SHORT[chart.dayGan]}${SEASON_TRAIT[seasonOf(monthZhi)]}`,
    STRONGEST_TEXT[chart.strongest],
    DAY_ZHI_TRAIT[chart.dayZhi],
  ];
}

/** 最強の星を「今年の過ごし方の鍵」として添えるときの短いヒント */
const STRONGEST_YEAR_HINT: Record<ShiShen, string> = {
  比肩: '自分のペースを守ることが力になります。',
  劫財: '仲間と刺激し合う場を持つことが力になります。',
  食神: '作る楽しさを味わう時間が力になります。',
  傷官: '表現する場を持つことが力になります。',
  偏財: '人との縁を広げる動きが力になります。',
  正財: 'コツコツした積み重ねが力になります。',
  七殺: '勝負どころで踏ん張る覚悟が力になります。',
  正官: '任された役割を果たすことが力になります。',
  偏印: '好奇心のままに探る時間が力になります。',
  正印: '学びと休息で整えることが力になります。',
};

const pairMatch = (pairs: [Zhi, Zhi][], a: Zhi, b: Zhi): boolean =>
  pairs.some(([x, y]) => (x === a && y === b) || (y === a && x === b));

/**
 * 運勢の「その人に寄せた一文」。判定（yearFortune）と同じ要素から組み立てる:
 * 日支と流年地支の関係（六合／冲／刑／三合の半会）→ 流年の五行と命式の関係（不足を補う／強いものが重なる）
 * → どちらも無ければ最強の星を鍵にした一文。凶・大凶でも断定せず、過ごし方の助言を添える。
 */
export function fortunePersonalLine(chart: Chart, f: YearFortune): string {
  const dz = chart.dayZhi;
  const parts: string[] = [];
  const isChong = pairMatch(GOU_PAIRS, f.zhi, dz);
  if (pairMatch(ROKUGOU, f.zhi, dz)) {
    parts.push(`生まれた日の支「${dz}」と今年の支「${f.zhi}」が寄り添う組み合わせで、人との縁が動きやすい年です。新しい出会いや再会を大切にしてください。`);
  } else if (isChong) {
    parts.push(`生まれた日の支「${dz}」と今年の支「${f.zhi}」がぶつかる組み合わせで、環境や予定の変化が起きやすい年です。変化は新しい流れの入口でもあります。決めつけず、様子を見ながら進めてください。`);
  } else if (pairMatch(KEI_PAIRS, f.zhi, dz)) {
    parts.push(`生まれた日の支「${dz}」と今年の支「${f.zhi}」に少し引っかかりのある組み合わせです。確認を丁寧に進めることが、結果的に近道になります。`);
  } else {
    // 三合の半会（例：寅と午）。局の五行は地支自体の五行とは別に決まる
    const SANGOU_ELEMENT: Element[] = ['水', '火', '金', '木']; // SANGOU の並び（申子辰／寅午戌／巳酉丑／亥卯未）に対応
    const ti = SANGOU.findIndex((t) => t.includes(f.zhi) && t.includes(dz) && f.zhi !== dz);
    if (ti >= 0) {
      parts.push(`生まれた日の支「${dz}」と今年の支「${f.zhi}」で「${SANGOU_ELEMENT[ti]}」の気が集まる組み合わせです。同じ方向を向く仲間と力を合わせると進みやすい年です。`);
    }
  }
  const yearEls: Element[] = [GAN_ELEMENT[f.gan], ZHI_ELEMENT[f.zhi]];
  if (yearEls.includes(chart.weakestElement)) {
    parts.push(`今年は、あなたに足りない「${chart.weakestElement}」の気を補ってくれる年です。いつもと違う選択を取り入れることが、バランスを整える助けになります。`);
  } else if (yearEls.includes(chart.strongestElement)) {
    parts.push(`今年は、もともと強い「${chart.strongestElement}」の気がさらに重なる年です。得意なことに偏りすぎず、休む時間も予定に入れてください。`);
  }
  if (parts.length) return parts.join('');
  if (f.shiShen === chart.strongest) {
    return `今年は、あなたの中で一番強い「${chart.strongest}」と同じ星が巡る年です。持ち味がそのまま表に出やすいので、自信を持って進める一方、周りへの配慮も忘れずに。`;
  }
  return `今年の過ごし方の鍵は、あなたの中で一番強い「${chart.strongest}」の星です。${STRONGEST_YEAR_HINT[chart.strongest]}`;
}

/** 運勢本文（詳細画面の読み表示と解説つきシールで共用）: 流年の星の文＋その人に寄せた一文＋段階の総評 */
export function fortuneBodyOf(chart: Chart, f: YearFortune): string[] {
  return [YEAR_STAR_TEXT[f.shiShen], fortunePersonalLine(chart, f), STAGE_TEXT[f.stage]];
}

/** 解説つきシールに載せる情報一式（詳細画面の書き出しと一覧ビューアで共用する単一の生成処理） */
export interface ExplainedTexts {
  personality: string[];
  jobLine: string; // 職業（職業名＋短い理由）。v0.2.4 で追加（オーナー確定）
  appearanceLines: string[]; // 見た目（年齢感・体格・髪＋それぞれの根拠）。v0.2.5 で追加（オーナー指示）
  fortuneHeading: string;
  fortuneBody: string[];
  equipLines: string[];
  footer: string;
  mainColor: Element;
}

export function explainedInfoOf(chart: Chart, year: number, ageBand: AgeBand = 'youth'): ExplainedTexts {
  const spec = decideCharacter(chart);
  const f = yearFortune(chart, year);
  const tone = toneOfChart(chart);
  const reasons = appearanceReasonLines(chart, spec, ageBand);
  return {
    personality: personalityTextsOf(chart),
    jobLine: `${TONE_LABEL[tone]} ― 最強の星「${chart.strongest}」は${toneReasonOf(chart.strongest)}`,
    appearanceLines: [
      `年齢感：${reasons.ageLine}`,
      `体格：${reasons.buildLine}`,
      `${hairLabelOf(spec.form)}：${reasons.hairLine}`,
    ],
    fortuneHeading: `${f.year}年の運勢（${f.stage}）`,
    fortuneBody: fortuneBodyOf(chart, f),
    equipLines: [
      ...[spec.mainEq, ...spec.subEq].map((p) =>
        `${EQUIPMENT[p.shiShen].name}（${p.shiShen}）：${EQUIPMENT[p.shiShen].meaning}`),
      `お守りのリボンチャーム：足りない五行「${spec.charmElement}」を補い、バランスを整えるお守りです`,
    ],
    footer: '命式シール（仮）― 四柱推命をもとにした贈り物シールです',
    mainColor: chart.strongestElement,
  };
}

export interface EquipmentInfo {
  name: string; // 日本語名
  en: string; // 英語プロンプト用
  meaning: string; // 装備の意味（日本語一文）
}

export const EQUIPMENT: Record<ShiShen, EquipmentInfo> = {
  食神: { name: 'ランタン', en: 'a glowing lantern', meaning: 'ものを作り出し、人に分ける力の象徴です' },
  傷官: { name: '大きな筆', en: 'a giant calligraphy brush', meaning: '表現の切れ味と言葉の力の象徴です' },
  偏財: { name: '宝石袋', en: 'a pouch full of gems', meaning: '巡ってくるチャンスと人の縁の象徴です' },
  正財: { name: '鍵の束', en: 'a bunch of golden keys', meaning: '堅実に蓄えて守る力の象徴です' },
  七殺: { name: '剣', en: 'a shining sword', meaning: '勝負どころで道を切り開く力の象徴です' },
  正官: { name: '勲章とマント', en: 'a medal and a flowing cape', meaning: '誇りと責任、評価の象徴です' },
  偏印: { name: '水晶玉', en: 'a crystal orb', meaning: 'ひらめきと探求心の象徴です' },
  正印: { name: '大きな本', en: 'a big old book', meaning: '学びと守りの象徴です' },
  比肩: { name: '対の腕輪', en: 'a pair of matching bracelets', meaning: '自分の足で立つ力の象徴です' },
  劫財: { name: '炎のスカーフ', en: 'a scarf made of flames', meaning: '競い合う熱さと勢いの象徴です' },
};

/**
 * プレフィックス称号（一番強い通変ごとに1つ）。
 * v0.2.2 までは通変×3トーンの30種だったが、トーンが星ごとの固有のものになったため、
 * 称号も星ごとに1つに統一した。v0.2.4 で職業（RPG の職業10種）と地続きの称号に見直した
 * （例：正官＝誇り高き騎士、偏印＝深淵の探求者は既存が合っているため維持）。
 */
export const PREFIX_TITLE: Record<ShiShen, string> = {
  比肩: '孤高の拳士',
  劫財: '熱き闘士',
  食神: 'ほほえむ歌い手',
  傷官: '鮮やかなる魔法使い',
  偏財: '福を呼ぶ盗み手',
  正財: '誠実な商い手',
  七殺: '闇の騎士',
  正官: '誇り高き騎士',
  偏印: '深淵の探求者',
  正印: '慈悲深き僧侶',
};

export function prefixTitleOf(star: ShiShen): string {
  return PREFIX_TITLE[star];
}

/** ポストフィックス称号（日干＝本体のタイプから） */
export const POSTFIX_TITLE: Record<Gan, string> = {
  甲: '大樹の守り手', 乙: 'ツタの守り手', 丙: '太陽の灯し手', 丁: '灯火の守り手', 戊: '大地の番人',
  己: '畑の育て手', 庚: '鋼の守り手', 辛: '宝石の磨き手', 壬: '大河の渡し手', 癸: '雨露の恵み手',
};

export const ELEMENT_COLOR: Record<Element, string> = {
  木: '#43a047', 火: '#e53935', 土: '#c17900', 金: '#b8860b', 水: '#1e88e5',
};
export const ELEMENT_COLOR_EN: Record<Element, string> = {
  木: 'fresh green', 火: 'red', 土: 'amber', 金: 'golden', 水: 'light blue',
};

// ---------- 英語プロンプト ----------

const BODY_EN: Record<Gan, string> = {
  甲: 'a young oak-tree spirit with leafy hair',
  乙: 'a vine-and-flower spirit with soft green vines and small blossoms',
  丙: 'a bright sun spirit with warm rays of light around its head',
  丁: 'a candlelight spirit with a small gentle flame above its head',
  戊: 'a mountain spirit with a rocky, steady body',
  己: 'a garden-soil spirit with tiny sprouts growing on its head',
  庚: 'a steel knight spirit with shiny metallic armor',
  辛: 'a jewel spirit with a sparkling gemstone body',
  壬: 'a great-river spirit with flowing wave patterns',
  癸: 'a raindrop spirit with clear droplets floating around it',
};

const FORM_EN: Record<CharacterSpec['form'], string> = {
  人型: 'a small humanoid child character',
  精霊型: 'a small floating fairy-like spirit character',
  獣型: 'a small beast-like character standing upright',
  道具型: 'a magical living object character with a cute face',
  群体型: 'a trio of three tiny identical characters standing together',
};

export const DISHI_EN: Record<string, string> = {
  長生: 'a curious, bright-eyed expression', 沐浴: 'a playful, cheerful expression',
  冠帯: 'a confident, neatly dressed expression', 臨官: 'a proud, energetic expression',
  帝旺: 'a bold, majestic expression', 衰: 'a calm, gentle expression',
  病: 'a sleepy, tender expression', 死: 'a quiet, serene expression',
  墓: 'a shy expression, peeking out', 絶: 'a mysterious, dreamy expression',
  胎: 'an innocent, baby-like expression', 養: 'a soft, warm, well-cared-for expression',
};

const COMPANION_EN: Record<Zhi, string> = {
  子: 'a tiny mouse', 丑: 'a tiny calf', 寅: 'a tiny tiger cub', 卯: 'a tiny rabbit',
  辰: 'a tiny baby dragon', 巳: 'a tiny snake', 午: 'a tiny foal', 未: 'a tiny lamb',
  申: 'a tiny baby monkey', 酉: 'a tiny chick', 戌: 'a tiny puppy', 亥: 'a tiny baby boar',
};
const CREST_EN: Record<Zhi, string> = {
  子: 'rat', 丑: 'ox', 寅: 'tiger', 卯: 'rabbit', 辰: 'dragon', 巳: 'snake',
  午: 'horse', 未: 'sheep', 申: 'monkey', 酉: 'rooster', 戌: 'dog', 亥: 'boar',
};
const SEASON_EN: Record<string, string> = {
  spring: 'with soft spring accents of cherry blossom petals',
  summer: 'with bright summer accents of green leaves and sunlight',
  autumn: 'with autumn accents of colorful maple leaves',
  winter: 'with quiet winter accents of falling snowflakes',
};
export function seasonOf(monthZhi: Zhi): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (['寅', '卯', '辰'].includes(monthZhi)) return 'spring';
  if (['巳', '午', '未'].includes(monthZhi)) return 'summer';
  if (['申', '酉', '戌'].includes(monthZhi)) return 'autumn';
  return 'winter';
}
export const SEASON_JA: Record<string, string> = {
  spring: '春', summer: '夏', autumn: '秋', winter: '冬',
};

function sizePhrase(tier: 1 | 2 | 3, en: string, main: boolean): string {
  if (main) {
    if (tier === 3) return `${en.replace(/^a /, 'a large ')} held with both hands in front`;
    if (tier === 2) return `${en} held in one hand in front`;
    return `${en} held gently in front`;
  }
  return tier >= 2 ? en : en.replace(/^a /, 'a small ');
}

export interface PromptParts {
  prompt: string;
  negative: string;
  partsJa: { label: string; value: string }[];
}

// レア度の派手さ段階ごとに、背景のキラキラの強さを表す英語表現を出し分ける
// （オーナー決定 2026-11-15：レア度は星でなく派手さで表す）
const SPARKLE_EN: Record<GlamourTier, string> = {
  normal: 'a softly sparkling pale prism background with just a few gentle sparkles',
  kira: 'a rainbow prism holographic background with sparkling stardust',
  jackpot: 'an extremely dazzling, luxurious rainbow prism holographic background filled with brilliant sparkles, glowing light rays and glittering gems',
};
const SPARKLE_JA: Record<GlamourTier, string> = {
  normal: 'ふつう（星1〜2相当）：淡いプリズム背景に控えめなきらめき',
  kira: 'キラ（星3〜4相当）：虹色プリズム背景に星屑のきらめき',
  jackpot: '大当たり（星5相当）：豪華な虹色プリズム背景に強い光と宝石のきらめき',
};

// 職業ごとの情報（理由文・呪文の雰囲気／装い文 EN/JA）。名称は fortune.ts の TONE_LABEL。
// 雰囲気文には職業らしい装いを反映するが、装備ルール（何を持つか・大きさ・持ち方）が
// 最優先で、装いはそれと矛盾しない範囲の雰囲気づけに留める。
// SDの可愛さは維持し、ホラーにはしない（オーナー決定 2026-11-15）
export interface ToneInfo {
  reason: string; // その職業になる理由（最強の星の性質）
  moodEn: string; // 呪文に入れる雰囲気／装い文（英語）
  moodJa: string; // 部品の日本語併記
}
export const TONE_INFO: Record<Tone, ToneInfo> = {
  knight: {
    reason: '名誉と秩序を重んじる星',
    moodEn: 'The mood is bright and gallant, like a noble little knight: an upright, dignified bearing, a sincere shining smile, a small cape and light armor-like trims, and clean, noble colors.',
    moodJa: '騎士：明るく凛々しい雰囲気、小さなマントと軽い鎧風の装い、誠実な笑顔',
  },
  priest: {
    reason: '慈しみと守り、学びの星',
    moodEn: 'The mood is calm and merciful, like a gentle little priest: a serene kind smile, white robe-like garments with soft gold trims, warm healing light, and a quiet, scholarly air.',
    moodJa: '僧侶：穏やかで慈しみ深い雰囲気、白い法衣風の装いと温かい光、静かな微笑み',
  },
  merchant: {
    reason: '誠実に財を守り育てる星',
    moodEn: 'The mood is warm and dependable, like an honest little merchant: a friendly trustworthy smile, neat tidy clothes with a small apron-like trim, steady earthy colors, and a careful, nurturing air.',
    moodJa: '商人：温かく頼れる雰囲気、きちんとした身なりと小さな前掛け風の装い、誠実な笑顔',
  },
  bard: {
    reason: '生み出して楽しませる星',
    moodEn: 'The mood is joyful and musical, like a cheerful little bard poet: a bright singing smile, a light traveling outfit with a small feathered cap, cozy warm colors, and a generous air that shares fun with everyone.',
    moodJa: '吟遊詩人：明るく楽しい雰囲気、羽根つきの小さな帽子と旅装束、歌うような笑顔',
  },
  fighter: {
    reason: '武器に頼らず自分の体で立つ、自立の星',
    moodEn: 'The mood is bold and disciplined, like a little martial artist who relies on their own body: a confident determined grin, a simple training outfit with wrapped fists, deep blue-grey accents, and a self-reliant air. Cute and charming, never horror.',
    moodJa: '武闘家：凛々しく自立した雰囲気、道着風の装いと拳の包帯、青灰の差し色（可愛さは維持、ホラーにはしない）',
  },
  gladiator: {
    reason: '熱い勝負の星',
    moodEn: 'The mood is hot and fearless, like a passionate little gladiator: an excited competitive grin, a light arena outfit with a bold sash, ember-red accents, and a restless, energetic air. Cute and charming, never horror.',
    moodJa: '闘士：熱く大胆な雰囲気、軽い闘技装束と大胆な帯、炎のような差し色（可愛さは維持、ホラーにはしない）',
  },
  mage: {
    reason: '型破りの才能と言葉の力',
    moodEn: 'The mood is brilliant and unconventional, like a little mage of words and wonders: a cheeky fearless grin, a pointed hat and flowing robe-like outfit, vivid indigo accents, and a free, untamed air. Cute and charming, never horror.',
    moodJa: '魔法使い：型破りで自由な雰囲気、とんがり帽子とローブ風の装い、藍の差し色（可愛さは維持、ホラーにはしない）',
  },
  rogue: {
    reason: '流れを読んで財を動かす星',
    moodEn: 'The mood is playful and quick-witted, like a cheerful little rogue who reads the flow of fortune: a sly fun-loving grin, a light nimble outfit with a small hood and pouch, deep emerald accents, and an ever-changing air. Cute and charming, never horror.',
    moodJa: '盗賊：遊び心のある雰囲気、小さなフードと小袋の軽い装い、深いエメラルドの差し色（可愛さは維持、ホラーにはしない）',
  },
  darkknight: {
    reason: '闘争の星',
    moodEn: 'The mood is dark and commanding, like a little dark knight: a bold confident glare softened by cuteness, dark armor-like trims and a deep crimson cape, and an air of playful dominance. Cute and adorable, never horror.',
    moodJa: '暗黒騎士：闇と闘争の雰囲気、黒い鎧風の装いと深紅のマント（可愛さは維持、ホラーにはしない）',
  },
  seer: {
    reason: 'ひらめきと神秘の星',
    moodEn: 'The mood is mysterious and dreamy, like a little fortune teller: a quiet unreadable smile, a soft hood and flowing cloth, deep purple accents, faint moonlit sparkles, and an enchanting, solitary air. Cute and adorable, never horror.',
    moodJa: '占い師：神秘的な雰囲気、柔らかなフードと揺れる布、紫の差し色と月明かりのきらめき（可愛さは維持、ホラーにはしない）',
  },
};

/** 最強の通変から、そのトーンになった理由文を引く */
export function toneReasonOf(strongest: ShiShen): string {
  return TONE_INFO[TONE_OF_STAR[strongest]].reason;
}

// ネガティブプロンプトはトーンで出し分ける。明るい系は "dark mood" を禁止するが、
// 影・闇系（DARK_TONES）では外し、代わりにホラー化だけを防ぐ語を入れる。
// v0.2.2: 男の子・女の子（顔立ちを少しリアル寄りに寄せる見た目）では、本文の
// 「slightly realistic」と打ち消し合うため単独の realistic を外す。
// 写真化・3D化の禁止（photorealistic, photograph, 3d render）は残す。
const NEGATIVE_BASE =
  'text, letters, words, alphabet, numbers, frame, border, logo, watermark, signature, realistic, photograph, 3d render, scary, landscape orientation, wide image, portrait orientation, vertical image, letterbox, pillarbox';
const NEGATIVE_BASE_FACE =
  'text, letters, words, alphabet, numbers, frame, border, logo, watermark, signature, photorealistic, photograph, 3d render, scary, landscape orientation, wide image, portrait orientation, vertical image, letterbox, pillarbox';
export function negativePromptOf(tone: Tone, appearance: Appearance = 'none'): string {
  const base = appearance === 'none' ? NEGATIVE_BASE : NEGATIVE_BASE_FACE;
  return DARK_TONES.includes(tone)
    ? `${base}, horror, grotesque, realistic violence, blood, creepy`
    : `${base}, dark mood`;
}

// 見た目（指定なし／男の子／女の子）の呪文への反映（オーナー決定 2026-11-15、v0.1.9 訂正、v0.2.2 改訂）。
// 内部的には「男の子＝イケメンアイドルのような顔立ち」「女の子＝アイドルのような顔立ち」として扱う。
// ただし「アイドル」は歌手・アイドル活動の要素ではなく顔立ちの印象のこと。
// 呪文に入れるのは顔立ち（少しリアル寄りで整った顔立ち・瞳・眉・笑顔）と髪まわりだけで、
// ステージ衣装・ヘッドセットマイク・星のアクセサリー等の歌手系の装備・小物は入れない。
// 人型・精霊型ではキャラそのものを男の子／女の子として書き分ける。
// v0.2.2: 実生成が「少年（子ども）」に見えたため、人型・精霊型の男の子・女の子は
// small／little 等の幼さを出す語を外して「アイドルのような顔立ちの若者」に寄せ、
// 顔立ちの描き込み（瞳・鼻筋・口元・肌の陰影）を強め、比率も約3頭身で少し大人びた指定にする。
// 獣型・道具型・群体型では性別表現は付けず、顔まわりの小さな雰囲気の差だけにする
// （小物は従来分＝女の子のリボンまで。新規の歌手系小物は足さない）。
// v0.2.5: 年齢区分（子ども／若者／青年／中年／円熟）を自動で効かせる（オーナー確定）。
// 区分は生年月日から生成時点の年齢で決まり（fortune.ts の ageBandOf）、利用者は選べない。
// 若者の表現は v0.2.2〜v0.2.4 のものをそのまま使う（見本の維持）。
// 中年は老けさせすぎず、円熟は貫禄と穏やかさで表し、老いの強調（しわ・弱々しさ）はしない。
type AppearanceKey = Exclude<Appearance, 'none'>;
type HumanForm = '人型' | '精霊型';

/** 年齢区分ごとの本体表現（人型・精霊型のみ。獣型などは FORM_EN のまま性別表現を付けない） */
const AGE_FORM_EN: Record<HumanForm, Record<AgeBand, Record<AppearanceKey, string>>> = {
  人型: {
    child: { boy: 'a cheerful little boy character', girl: 'a cheerful little girl character' },
    youth: { boy: 'a handsome young male character with an idol-like face', girl: 'a beautiful young female character with an idol-like face' },
    adult: { boy: 'a handsome adult man character with a refined, grown-up face', girl: 'a beautiful adult woman character with a refined, grown-up face' },
    middle: { boy: 'a dignified middle-aged man character with calm mature charm', girl: 'a dignified middle-aged woman character with calm mature charm' },
    mature: { boy: 'a dignified mature man character with serene gravitas and warm charm, still vibrant and full of life', girl: 'a dignified mature woman character with serene gravitas and warm charm, still vibrant and full of life' },
  },
  精霊型: {
    child: { boy: 'a cheerful little boy fairy spirit character', girl: 'a cheerful little girl fairy spirit character' },
    youth: { boy: 'a handsome young male fairy spirit character with an idol-like face', girl: 'a beautiful young female fairy spirit character with an idol-like face' },
    adult: { boy: 'a handsome adult man fairy spirit character with a refined, grown-up face', girl: 'a beautiful adult woman fairy spirit character with a refined, grown-up face' },
    middle: { boy: 'a dignified middle-aged man fairy spirit character with calm mature charm', girl: 'a dignified middle-aged woman fairy spirit character with calm mature charm' },
    mature: { boy: 'a dignified mature man fairy spirit character with serene gravitas and warm charm, still vibrant and full of life', girl: 'a dignified mature woman fairy spirit character with serene gravitas and warm charm, still vibrant and full of life' },
  },
};

/** 年齢区分ごとの顔立ち文（人型・精霊型） */
const AGE_EXTRA_HUMAN_EN: Record<AgeBand, Record<AppearanceKey, string>> = {
  child: {
    boy: 'Give him a cheerful, childlike face: big round eyes with clearly drawn irises and highlights, soft round cheeks, and a bright, innocent smile.',
    girl: 'Give her a cheerful, childlike face: big round eyes with clearly drawn irises, highlights and long eyelashes, soft round cheeks, and a bright, innocent smile. She wears a ribbon hair accessory.',
  },
  youth: {
    boy: 'Give him a handsome idol-like face drawn with slightly realistic, well-defined facial features: large detailed eyes with clearly drawn irises and highlights, a visible nose bridge and well-shaped lips, and soft natural shading on the skin. He has neatly styled short hair, strong tidy eyebrows and a fresh, confident smile.',
    girl: 'Give her a beautiful idol-like face drawn with slightly realistic, well-defined facial features: large detailed eyes with clearly drawn irises, highlights and long eyelashes, a visible nose bridge and well-shaped lips, and soft natural shading on the skin. She has long silky hair with a ribbon hair accessory and a bright, charming smile.',
  },
  adult: {
    boy: 'Give him a handsome, grown-up face drawn with slightly realistic, well-defined facial features: deep detailed eyes with clearly drawn irises and highlights, a defined nose bridge and well-shaped lips, and soft natural shading on the skin. He has strong tidy eyebrows and a calm, confident smile.',
    girl: 'Give her a beautiful, grown-up face drawn with slightly realistic, well-defined facial features: deep detailed eyes with clearly drawn irises, highlights and long eyelashes, a defined nose bridge and well-shaped lips, and soft natural shading on the skin. She has a calm, graceful smile and wears a ribbon hair accessory.',
  },
  middle: {
    boy: 'Give him a distinguished face with calm mature charm, drawn with slightly realistic, well-defined facial features: steady detailed eyes with clearly drawn irises and highlights, a defined nose bridge and well-shaped lips, and soft natural shading on the skin. He has strong tidy eyebrows and a composed, reassuring smile. Keep him vibrant and handsome, never aged or weary.',
    girl: 'Give her a distinguished face with calm mature charm, drawn with slightly realistic, well-defined facial features: steady detailed eyes with clearly drawn irises, highlights and long eyelashes, a defined nose bridge and well-shaped lips, and soft natural shading on the skin. She has a composed, warm smile and wears a ribbon hair accessory. Keep her vibrant and beautiful, never aged or weary.',
  },
  mature: {
    boy: 'Give him a serene, dignified face with the warm gravitas of seasoned years, drawn with slightly realistic, well-defined facial features: calm detailed eyes with clearly drawn irises and highlights, a defined nose bridge and well-shaped lips, and soft natural shading on the skin. He has a gentle, composed smile. Keep him vibrant and full of life, with smooth healthy skin and a strong, lively presence.',
    girl: 'Give her a serene, dignified face with the warm gravitas of seasoned years, drawn with slightly realistic, well-defined facial features: calm detailed eyes with clearly drawn irises, highlights and long eyelashes, a defined nose bridge and well-shaped lips, and soft natural shading on the skin. She has a gentle, composed smile and wears a ribbon hair accessory. Keep her vibrant and full of life, with smooth healthy skin and a strong, lively presence.',
  },
};

/** 年齢区分ごとの顔まわり文（獣型・道具型＝単数の顔、群体型＝複数の顔） */
const AGE_EXTRA_SINGLE_EN: Record<AgeBand, Record<AppearanceKey, string>> = {
  child: {
    boy: 'Add only a small boyish touch around the face: big round sparkling eyes and soft round cheeks.',
    girl: 'Add only a small girlish touch around the face: big round sparkling eyes, soft round cheeks, and a cute ribbon.',
  },
  youth: {
    boy: 'Add only a small boyish touch around the face: strong neat eyebrows and sparkling clear eyes.',
    girl: 'Add only a small feminine touch around the face: long eyelashes, a soft gentle expression, and a cute ribbon.',
  },
  adult: {
    boy: 'Add only a small masculine touch around the face: calm, well-defined eyebrows and composed, confident eyes.',
    girl: 'Add only a small feminine touch around the face: graceful eyelashes, a composed gentle expression, and a cute ribbon.',
  },
  middle: {
    boy: 'Add only a small masculine touch around the face: steady eyebrows and calm, dignified eyes.',
    girl: 'Add only a small feminine touch around the face: soft eyelashes, a serene gentle expression, and a cute ribbon.',
  },
  mature: {
    boy: 'Add only a small masculine touch around the face: serene, dignified eyes and a calm, warm expression.',
    girl: 'Add only a small feminine touch around the face: soft eyelashes, a serene, warm expression, and a cute ribbon.',
  },
};
const AGE_EXTRA_MULTI_EN: Record<AgeBand, Record<AppearanceKey, string>> = {
  child: {
    boy: 'Add only a small boyish touch around the faces: big round sparkling eyes and soft round cheeks.',
    girl: 'Add only a small feminine touch around the faces: big round sparkling eyes, soft round cheeks, and cute ribbons.',
  },
  youth: {
    boy: 'Add only a small boyish touch around the faces: strong neat eyebrows and sparkling clear eyes.',
    girl: 'Add only a small feminine touch around the faces: long eyelashes, soft gentle expressions, and cute ribbons.',
  },
  adult: {
    boy: 'Add only a small masculine touch around the faces: calm, well-defined eyebrows and composed, confident eyes.',
    girl: 'Add only a small feminine touch around the faces: graceful eyelashes, composed gentle expressions, and cute ribbons.',
  },
  middle: {
    boy: 'Add only a small masculine touch around the faces: steady eyebrows and calm, dignified eyes.',
    girl: 'Add only a small feminine touch around the faces: soft eyelashes, serene gentle expressions, and cute ribbons.',
  },
  mature: {
    boy: 'Add only a small masculine touch around the faces: serene, dignified eyes and calm, warm expressions.',
    girl: 'Add only a small feminine touch around the faces: soft eyelashes, serene, warm expressions, and cute ribbons.',
  },
};

/** 見た目の追加文（形態×年齢区分×見た目）。人型・精霊型は顔立ち文、他形態は顔まわりの差だけ */
function appearanceExtraEn(form: FormType, band: AgeBand, appearance: AppearanceKey): string {
  if (form === '人型' || form === '精霊型') return AGE_EXTRA_HUMAN_EN[band][appearance];
  if (form === '群体型') return AGE_EXTRA_MULTI_EN[band][appearance];
  return AGE_EXTRA_SINGLE_EN[band][appearance];
}

/** 年齢区分ごとの比率（人型・精霊型で男女指定のときだけ使う。他形態・指定なしは約2.5頭身のまま） */
const PROPORTIONS_EN: Record<AgeBand, string> = {
  child: 'about 2.5 heads tall',
  youth: 'about 3 heads tall, with slightly more mature proportions',
  adult: 'about 3.5 heads tall, with adult proportions',
  middle: 'about 3.5 heads tall, with adult proportions',
  mature: 'about 3.5 heads tall, with adult proportions',
};

/** 年齢区分ごとの見た目の日本語併記（人型・精霊型） */
const AGE_JA_HUMAN: Record<AgeBand, Record<AppearanceKey, string>> = {
  child: {
    boy: '元気な子どもの顔立ち（大きな瞳・丸い頬・明るい笑顔）。約2.5頭身',
    girl: '元気な子どもの顔立ち（大きな瞳・まつ毛・丸い頬・明るい笑顔、リボン）。約2.5頭身',
  },
  youth: {
    boy: 'アイドルのような顔立ちの若い男性（少しリアル寄りで整った顔立ち・描き込んだ瞳・鼻筋と口元・肌の自然な陰影）。約3頭身で少し大人びた比率、短い髪',
    girl: 'アイドルのような顔立ちの若い女性（少しリアル寄りで整った顔立ち・描き込んだ瞳・まつ毛・鼻筋と口元・肌の自然な陰影）。約3頭身で少し大人びた比率、長い髪・リボン',
  },
  adult: {
    boy: '大人の男性として描く（少しリアル寄りで整った大人の顔立ち・落ち着いた自信のある笑顔）。約3.5頭身で大人びた比率',
    girl: '大人の女性として描く（少しリアル寄りで整った大人の顔立ち・落ち着いた優美な笑顔、リボン）。約3.5頭身で大人びた比率',
  },
  middle: {
    boy: '円熟した大人の魅力のある男性（落ち着いた顔立ちと佇まい。老けさせすぎない）。約3.5頭身で大人びた比率',
    girl: '円熟した大人の魅力のある女性（落ち着いた顔立ちと佇まい。老けさせすぎない、リボン）。約3.5頭身で大人びた比率',
  },
  mature: {
    boy: '貫禄と穏やかさのある円熟した大人（老いは強調しない。髪に少し銀色が混じる程度）。約3.5頭身で大人びた比率',
    girl: '貫禄と穏やかさのある円熟した大人（老いは強調しない。髪に少し銀色が混じる程度、リボン）。約3.5頭身で大人びた比率',
  },
};
/** 年齢区分ごとの見た目の日本語併記（獣型・道具型・群体型＝顔まわりだけ） */
const AGE_JA_OTHER: Record<AgeBand, Record<AppearanceKey, string>> = {
  child: {
    boy: '大きな丸い瞳と丸い頬の、元気な子どもの顔まわりだけ（無理な人型化はしない）',
    girl: '大きな丸い瞳と丸い頬、リボンの、元気な子どもの顔まわりだけ（無理な人型化はしない）',
  },
  youth: {
    boy: '凛々しい眉とキラキラした瞳の顔まわりだけ（無理な人型化はしない）',
    girl: 'まつ毛と柔らかい表情、リボンの顔まわりだけ（無理な人型化はしない）',
  },
  adult: {
    boy: '落ち着いた凛々しい眉と自信のある瞳の顔まわりだけ（無理な人型化はしない）',
    girl: 'まつ毛と落ち着いた柔らかい表情、リボンの顔まわりだけ（無理な人型化はしない）',
  },
  middle: {
    boy: '穏やかで凛々しい眉と落ち着いた瞳の顔まわりだけ（無理な人型化はしない）',
    girl: 'まつ毛と穏やかで柔らかい表情、リボンの顔まわりだけ（無理な人型化はしない）',
  },
  mature: {
    boy: '穏やかで貫禄のある瞳と温かい表情の顔まわりだけ（無理な人型化はしない）',
    girl: 'まつ毛と穏やかで温かい表情、リボンの顔まわりだけ（無理な人型化はしない）',
  },
};

/** 見た目の日本語併記。年齢区分が分かる形（例：「男の子（青年）：…」）にする */
function appearanceJaOf(form: FormType, appearance: Appearance, band: AgeBand): string {
  if (appearance === 'none') return '指定なし（AIにおまかせ）';
  const body = (form === '人型' || form === '精霊型')
    ? AGE_JA_HUMAN[band][appearance]
    : AGE_JA_OTHER[band][appearance];
  return `${APPEARANCE_LABEL[appearance]}（${AGE_BAND_LABEL[band]}）：${body}`;
}

// ---------- 体格と髪（v0.2.5、オーナー確定） ----------
// どちらも命式から自動で決まり、利用者は選べない。
// 体格・全体の雰囲気はいちばん強い五行から、髪の色・髪型は日干の五行から決まる。
// 髪色は年齢区分によらず五行どおり（円熟だけ、髪に少し銀色が混じる程度を許す）。

export interface ElementText { en: string; ja: string }

const BUILD_TEXT: Record<Element, { strong: string; weak: string; ja: string }> = {
  木: {
    strong: 'The character has a tall, slender, supple build with a fresh, breezy presence.',
    weak: 'The character has a fresh, breezy air and a light, supple silhouette.',
    ja: 'すらりと伸びやかな体格で、爽やかな雰囲気',
  },
  火: {
    strong: 'The character has a radiant, glamorous presence, bright and full of lively energy.',
    weak: 'The character has a bright, glamorous air, full of lively energy.',
    ja: '華やかで明るい存在感',
  },
  土: {
    strong: 'The character has a calm, solid, reassuringly sturdy build.',
    weak: 'The character has a calm, solid, grounded silhouette.',
    ja: '穏やかでどっしりとした体格',
  },
  金: {
    strong: 'The character has a sharp, crisp, dignified silhouette.',
    weak: 'The character has a sharp, crisp silhouette.',
    ja: 'シャープで凛々しいシルエット',
  },
  水: {
    strong: 'The character has a soft, graceful build with a mysterious, fluid air.',
    weak: 'The character has a soft, mysterious, fluid air.',
    ja: '柔らかく神秘的な雰囲気',
  },
};

/** 体格・全体の雰囲気（いちばん強い五行から）。人型・精霊型は体格として強く、他形態は雰囲気・シルエットの含みとして弱く */
export function buildTextOf(el: Element, form: FormType): ElementText {
  const t = BUILD_TEXT[el];
  const human = form === '人型' || form === '精霊型';
  return { en: human ? t.strong : t.weak, ja: t.ja };
}

const HAIR_EN: Record<Element, string> = {
  木: 'green-tinged brown hair, sleek and straight',
  火: 'reddish hair in a bright, lively, dynamic style',
  土: 'calm brown hair in a gentle, relaxed style',
  金: 'bright silvery-gold hair in a sharp, neat style',
  水: 'black to deep blue hair, soft and flowing',
};
/** 獣型の毛並み・道具型／群体型の差し色に使う色合い（英語） */
const HAIR_TONE_EN: Record<Element, string> = {
  木: 'green-tinged brown', 火: 'warm reddish', 土: 'calm brown', 金: 'bright silvery-gold', 水: 'black to deep blue',
};
const HAIR_JA: Record<Element, string> = {
  木: '茶色から緑がかった髪で、しなやかでまっすぐな髪型',
  火: '赤みのある髪で、明るく動きのある髪型',
  土: '落ち着いた茶色の髪で、穏やかな髪型',
  金: '銀に近い明るい髪で、シャープな髪型',
  水: '黒から深い青の髪で、柔らかく流れる髪型',
};
const HAIR_COAT_JA: Record<Element, string> = {
  木: '緑がかった茶色の毛並み', 火: '赤みのある毛並み', 土: '落ち着いた茶色の毛並み',
  金: '銀に近い明るい毛並み', 水: '黒から深い青の毛並み',
};
const HAIR_ACCENT_JA: Record<Element, string> = {
  木: '緑がかった茶色の差し色', 火: '赤みのある色の差し色', 土: '落ち着いた茶色の差し色',
  金: '銀に近い明るい色の差し色', 水: '黒から深い青の差し色',
};

/** 髪の色・髪型（日干の五行から）。人型・精霊型は髪、獣型は毛並みの色合い、道具型・群体型は差し色 */
export function hairTextOf(el: Element, form: FormType, band: AgeBand): ElementText {
  if (form === '人型' || form === '精霊型') {
    // 円熟だけ、髪に少し銀色が混じる程度を許す（髪色そのものは年齢によらず五行どおり）
    const silver = band === 'mature' ? ', with a few silver strands mixed in' : '';
    const silverJa = band === 'mature' ? '、少し銀色が混じる' : '';
    return {
      en: `The character has ${HAIR_EN[el]}${silver}.`,
      ja: `${HAIR_JA[el]}${silverJa}`,
    };
  }
  if (form === '獣型') {
    return { en: `Its coat and fur carry ${HAIR_TONE_EN[el]} tones.`, ja: HAIR_COAT_JA[el] };
  }
  return { en: `Accent colors in ${HAIR_TONE_EN[el]} tones appear on the character.`, ja: HAIR_ACCENT_JA[el] };
}

/** 髪まわりの部品ラベル（形態で変わる：髪／毛並み／差し色） */
export function hairLabelOf(form: FormType): string {
  if (form === '人型' || form === '精霊型') return '髪';
  if (form === '獣型') return '毛並み';
  return '差し色';
}

export interface AppearanceReasons {
  ageLine: string; // 年齢感と根拠
  buildLine: string; // 体格と根拠
  hairLine: string; // 髪（毛並み・差し色）と根拠
}

/**
 * 外見が「なぜそうなったか」の理由文（年齢区分・体格・髪）。
 * 詳細画面の「分身キャラの設計」と解説つきシールで共用し、表示箇所でずれないようにする。
 */
export function appearanceReasonLines(chart: Chart, spec: CharacterSpec, band: AgeBand): AppearanceReasons {
  const build = buildTextOf(chart.strongestElement, spec.form);
  const dayEl = GAN_ELEMENT[chart.dayGan];
  const hair = hairTextOf(dayEl, spec.form, band);
  return {
    ageLine: `${AGE_BAND_LABEL[band]} ― 年齢の区分（${AGE_BAND_RANGE[band]}）から`,
    buildLine: `${build.ja} ― いちばん強い五行『${chart.strongestElement}』の性質から`,
    hairLine: `${hair.ja} ― 日干『${chart.dayGan}』（${dayEl}）の性質から`,
  };
}

export function buildPrompt(chart: Chart, spec: CharacterSpec, stars = 3, tone: Tone = 'knight', appearance: Appearance = 'none', ageBand: AgeBand = 'youth'): PromptParts {
  const dayPillar = chart.pillars[2];
  const expr = DISHI_EN[dayPillar.diShi] ?? 'a gentle expression';
  const main = EQUIPMENT[spec.mainEq.shiShen];
  const subs = spec.subEq.map((s, i) => {
    const info = EQUIPMENT[s.shiShen];
    const place = i === 0 ? 'hanging at the waist' : 'worn on the head';
    return `${sizePhrase(s.sizeTier, info.en, false)} ${place}`;
  });
  const season = seasonOf(spec.seasonZhi);
  const tier = glamourTierOf(stars);
  const human = spec.form === '人型' || spec.form === '精霊型';
  const formPhrase = appearance === 'none'
    ? FORM_EN[spec.form]
    : spec.form === '人型' || spec.form === '精霊型'
      ? AGE_FORM_EN[spec.form][ageBand][appearance]
      : FORM_EN[spec.form];
  // 比率：人型・精霊型で男女指定のときだけ年齢区分で変える（v0.2.2 の約3頭身は若者の指定）
  const proportions = appearance !== 'none' && human
    ? PROPORTIONS_EN[ageBand]
    : 'about 2.5 heads tall';
  // 体格（最強の五行）と髪（日干の五行）は、見た目の指定によらず命式から常に入れる（v0.2.5）
  const build = buildTextOf(chart.strongestElement, spec.form);
  const dayEl = GAN_ELEMENT[chart.dayGan];
  const hair = hairTextOf(dayEl, spec.form, ageBand);
  const lines = [
    'Square image, 1:1 aspect ratio. The character and the sparkling background fill the entire square canvas from edge to edge.',
    `A chibi character sticker illustration in the style of 1980s Japanese sparkling prize stickers. Super-deformed, ${proportions}, bold outlines, vivid colors, ${SPARKLE_EN[tier]}.`,
    `The character is ${formPhrase}, ${BODY_EN[chart.dayGan]}, with ${expr}.`,
    build.en,
    hair.en,
    ...(appearance === 'none' ? [] : [appearanceExtraEn(spec.form, ageBand, appearance)]),
    ...(TONE_INFO[tone].moodEn ? [TONE_INFO[tone].moodEn] : []),
    `It carries ${sizePhrase(spec.mainEq.sizeTier, main.en, true)}.`,
    ...(subs.length ? [`Also: ${subs.join(', and ')}.`] : []),
    `A small ${ELEMENT_COLOR_EN[spec.charmElement]} ribbon charm is tied at the neck.`,
    `${COMPANION_EN[spec.companionZhi].replace(/^a /, 'A ')} companion stands beside the character.`,
    `A small embroidered emblem of a ${CREST_EN[spec.crestZhi]} is on the outfit, ${SEASON_EN[season]}.`,
    'No text, no letters, no words, no frame, no border, no logo.',
  ];
  const partsJa = [
    { label: '画角', value: '正方形（1:1）。キャラと背景が正方形の全面に広がる' },
    { label: '背景の派手さ（レア度）', value: SPARKLE_JA[tier] },
    { label: '職業', value: TONE_INFO[tone].moodJa },
    { label: '見た目', value: appearanceJaOf(spec.form, appearance, ageBand) },
    { label: '体格（最強の五行）', value: `${build.ja}（最強の五行・${chart.strongestElement}）` },
    { label: hairLabelOf(spec.form), value: `${hair.ja}（日干・${chart.dayGan}＝${dayEl}）` },
    { label: '本体（日干）', value: `${chart.dayGan}＝${BODY_EN[chart.dayGan]}（日干のモチーフ）` },
    { label: '形態', value: spec.form },
    { label: '素の表情（日柱の十二運）', value: `${dayPillar.diShi}＝${expr}` },
    { label: `メイン装備（${spec.mainEq.shiShen}）`, value: `${main.name}／${main.meaning}` },
    ...spec.subEq.map((s, i) => ({
      label: `サブ装備${i + 1}（${s.shiShen}）`,
      value: `${EQUIPMENT[s.shiShen].name}／${EQUIPMENT[s.shiShen].meaning}`,
    })),
    { label: '補いのお守り', value: `足りない五行「${spec.charmElement}」の色のリボンチャーム` },
    { label: '相棒（日支）', value: COMPANION_EN[spec.companionZhi] },
    { label: '紋章（年支）', value: `${spec.crestZhi}（${CREST_EN[spec.crestZhi]}）の刺繍` },
    { label: '季節（月支）', value: SEASON_JA[season] },
  ];
  return {
    prompt: lines.join('\n'),
    negative: negativePromptOf(tone, appearance),
    partsJa,
  };
}
