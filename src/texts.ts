// 読みの文章（最小セット）と装備辞書、英語プロンプトの部品。
// 装備辞書は「呪文・シルエット・装備の意味表示」の3出口で共用する（仕様書5.1）。
import type { Appearance, Element, FormType, FortuneStage, Gan, GlamourTier, ShiShen, Tone, YearFortune, Zhi } from './fortune';
import {
  glamourTierOf, decideCharacter, yearFortune,
  GAN_ELEMENT, ZHI_ELEMENT, SANGOU, GOU_PAIRS, ROKUGOU, KEI_PAIRS,
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
  fortuneHeading: string;
  fortuneBody: string[];
  equipLines: string[];
  footer: string;
  mainColor: Element;
}

export function explainedInfoOf(chart: Chart, year: number): ExplainedTexts {
  const spec = decideCharacter(chart);
  const f = yearFortune(chart, year);
  return {
    personality: personalityTextsOf(chart),
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
 * プレフィックス称号（一番強い通変 × トーンの30種）。
 * 後から差し替えやすいよう、通変ごとに3トーン分をまとめたデータ構造にしている。
 */
export const PREFIX_TITLES: Record<ShiShen, Record<Tone, string>> = {
  比肩: { normal: '凛々しき挑み手', dark: '孤高の挑み手', villain: '反逆の挑み手' },
  劫財: { normal: '熱き競い手', dark: '影に燃える競い手', villain: '炎の略奪者' },
  食神: { normal: 'ほほえむ作り手', dark: '夜更けの作り手', villain: '甘い毒の作り手' },
  傷官: { normal: '鮮やかなる表現者', dark: '月下の表現者', villain: '毒舌の扇動者' },
  偏財: { normal: '福を呼ぶ商い手', dark: '裏通りの商い手', villain: '闇市の商い手' },
  正財: { normal: '堅実な蓄え手', dark: '静かなる蓄え手', villain: '欲深き金庫番' },
  七殺: { normal: '勇ましき切り込み手', dark: '影の斬り手', villain: '闇の執行者' },
  正官: { normal: '誇り高き騎士', dark: '影の騎士', villain: '闇の騎士' },
  偏印: { normal: '神秘の探求者', dark: '深淵の探求者', villain: '禁書の探求者' },
  正印: { normal: '慈しみの守り手', dark: '静寂の守り手', villain: '影の守護者' },
};

export function prefixTitleOf(star: ShiShen, tone: Tone): string {
  return PREFIX_TITLES[star][tone];
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

// トーンごとの雰囲気（英語）。SDの可愛さは維持し、ホラーにはしない（オーナー決定 2026-11-15）
const TONE_MOOD_EN: Record<Tone, string> = {
  normal: '',
  dark: 'The mood is cool and shadowy, like a lone hero of the night: a calm, confident smirk, a black flowing cape over the outfit, deep blue and black color accents, and a quiet night-time air with a faint crescent-moon glow.',
  villain: 'The mood is playfully villainous but still cute and charming: tiny devil horns, a mischievous scheming grin, sly sparkling eyes, and purple and black decorative accents. Cute and adorable, never horror.',
};
const TONE_MOOD_JA: Record<Tone, string> = {
  normal: '通常：いつもの明るい雰囲気',
  dark: 'ダークヒーロー：クールで影のある雰囲気、黒いマント、夜の気配',
  villain: 'ヴィラン：小さな悪魔の角、いたずらっぽい悪だくみの笑み、紫や黒の装飾（可愛さは維持、ホラーにはしない）',
};

// ネガティブプロンプトはトーンで出し分ける。通常は "dark mood" を禁止するが、
// ダークヒーロー／ヴィランでは外し、代わりにホラー化だけを防ぐ語を入れる。
const NEGATIVE_BASE =
  'text, letters, words, alphabet, numbers, frame, border, logo, watermark, signature, realistic, photograph, 3d render, scary, landscape orientation, wide image, portrait orientation, vertical image, letterbox, pillarbox';
export function negativePromptOf(tone: Tone): string {
  return tone === 'normal'
    ? `${NEGATIVE_BASE}, dark mood`
    : `${NEGATIVE_BASE}, horror, grotesque, realistic violence, blood, creepy`;
}

// 見た目（指定なし／男の子／女の子）の呪文への反映（オーナー決定 2026-11-15、v0.1.9 訂正）。
// 内部的には「男の子＝イケメンアイドルのような顔立ち」「女の子＝アイドルのような顔立ち」として扱う。
// ただし「アイドル」は歌手・アイドル活動の要素ではなく顔立ちの印象のこと。
// 呪文に入れるのは顔立ち（少しリアル寄りで整った顔立ち・瞳・眉・笑顔）と髪まわりだけで、
// ステージ衣装・ヘッドセットマイク・星のアクセサリー等の歌手系の装備・小物は入れない。
// 人型・精霊型ではキャラそのものを男の子／女の子として書き分ける。
// 獣型・道具型・群体型では性別表現は付けず、顔まわりの小さな雰囲気の差だけにする
// （小物は従来分＝女の子のリボンまで。新規の歌手系小物は足さない）。
type AppearanceKey = Exclude<Appearance, 'none'>;
const APPEARANCE_FORM_EN: Partial<Record<FormType, Record<AppearanceKey, string>>> = {
  人型: { boy: 'a small boy character', girl: 'a cute little girl character' },
  精霊型: { boy: 'a small boy fairy spirit character', girl: 'a cute little girl fairy spirit character' },
};
const APPEARANCE_EXTRA_EN: Record<FormType, Record<AppearanceKey, string>> = {
  人型: {
    boy: 'Give him a handsome idol-like face: slightly realistic, well-defined facial features, sparkling clear eyes, strong neat eyebrows and a fresh, bright smile, with neat short hair.',
    girl: 'Give her a cute idol-like face: slightly realistic, well-defined facial features, big sparkling eyes, long eyelashes and a bright, cheerful smile, with long silky hair and a ribbon hair accessory.',
  },
  精霊型: {
    boy: 'Give him a handsome idol-like face: slightly realistic, well-defined facial features, sparkling clear eyes, strong neat eyebrows and a fresh, bright smile, with neat short hair.',
    girl: 'Give her a cute idol-like face: slightly realistic, well-defined facial features, big sparkling eyes, long eyelashes and a bright, cheerful smile, with long silky hair and a ribbon hair accessory.',
  },
  獣型: {
    boy: 'Add only a small boyish touch around the face: strong neat eyebrows and sparkling clear eyes.',
    girl: 'Add only a small feminine touch around the face: long eyelashes, a soft gentle expression, and a cute ribbon.',
  },
  道具型: {
    boy: 'Add only a small boyish touch around the face: strong neat eyebrows and sparkling clear eyes.',
    girl: 'Add only a small feminine touch around the face: long eyelashes, a soft gentle expression, and a cute ribbon.',
  },
  群体型: {
    boy: 'Add only a small boyish touch around the faces: strong neat eyebrows and sparkling clear eyes.',
    girl: 'Add only a small feminine touch around the faces: long eyelashes, soft gentle expressions, and cute ribbons.',
  },
};
const APPEARANCE_JA: Record<FormType, Record<Appearance, string>> = {
  人型: { none: '指定なし（AIにおまかせ）', boy: '男の子：イケメンアイドルのような顔立ち（少しリアル寄りで整った顔立ち・キラキラした瞳・凛々しい眉・爽やかな笑顔）と短い髪', girl: '女の子：アイドルのような顔立ち（少しリアル寄りで整った顔立ち・大きな瞳・まつ毛・明るい笑顔）と長い髪・リボン' },
  精霊型: { none: '指定なし（AIにおまかせ）', boy: '男の子：イケメンアイドルのような顔立ち（少しリアル寄りで整った顔立ち・キラキラした瞳・凛々しい眉・爽やかな笑顔）と短い髪', girl: '女の子：アイドルのような顔立ち（少しリアル寄りで整った顔立ち・大きな瞳・まつ毛・明るい笑顔）と長い髪・リボン' },
  獣型: { none: '指定なし（AIにおまかせ）', boy: '男の子：凛々しい眉とキラキラした瞳の顔まわりだけ（無理な人型化はしない）', girl: '女の子：まつ毛と柔らかい表情、リボンの顔まわりだけ（無理な人型化はしない）' },
  道具型: { none: '指定なし（AIにおまかせ）', boy: '男の子：凛々しい眉とキラキラした瞳の顔まわりだけ（無理な人型化はしない）', girl: '女の子：まつ毛と柔らかい表情、リボンの顔まわりだけ（無理な人型化はしない）' },
  群体型: { none: '指定なし（AIにおまかせ）', boy: '男の子：凛々しい眉とキラキラした瞳の顔まわりだけ（無理な人型化はしない）', girl: '女の子：まつ毛と柔らかい表情、リボンの顔まわりだけ（無理な人型化はしない）' },
};

export function buildPrompt(chart: Chart, spec: CharacterSpec, stars = 3, tone: Tone = 'normal', appearance: Appearance = 'none'): PromptParts {
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
  const formPhrase = appearance === 'none'
    ? FORM_EN[spec.form]
    : (APPEARANCE_FORM_EN[spec.form]?.[appearance] ?? FORM_EN[spec.form]);
  const lines = [
    'Square image, 1:1 aspect ratio. The character and the sparkling background fill the entire square canvas from edge to edge.',
    `A chibi character sticker illustration in the style of 1980s Japanese sparkling prize stickers. Super-deformed, about 2.5 heads tall, bold outlines, vivid colors, ${SPARKLE_EN[tier]}.`,
    `The character is ${formPhrase}, ${BODY_EN[chart.dayGan]}, with ${expr}.`,
    ...(appearance === 'none' ? [] : [APPEARANCE_EXTRA_EN[spec.form][appearance]]),
    ...(TONE_MOOD_EN[tone] ? [TONE_MOOD_EN[tone]] : []),
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
    { label: 'トーン', value: TONE_MOOD_JA[tone] },
    { label: '見た目', value: APPEARANCE_JA[spec.form][appearance] },
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
    negative: negativePromptOf(tone),
    partsJa,
  };
}
