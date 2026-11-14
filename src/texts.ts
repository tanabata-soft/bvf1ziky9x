// 読みの文章（最小セット）と装備辞書、英語プロンプトの部品。
// 装備辞書は「呪文・シルエット・装備の意味表示」の3出口で共用する（仕様書5.1）。
import type { Element, FortuneStage, Gan, GlamourTier, ShiShen, Zhi } from './fortune';
import { glamourTierOf } from './fortune';
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

/** プレフィックス称号（一番強い通変から） */
export const PREFIX_TITLE: Record<ShiShen, string> = {
  比肩: '凛々しき挑み手', 劫財: '熱き競い手', 食神: 'ほほえむ作り手', 傷官: '鮮やかなる表現者',
  偏財: '福を呼ぶ商い手', 正財: '堅実な蓄え手', 七殺: '勇ましき切り込み手', 正官: '誇り高き騎士',
  偏印: '神秘の探求者', 正印: '慈しみの守り手',
};

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

export function buildPrompt(chart: Chart, spec: CharacterSpec, stars = 3): PromptParts {
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
  const lines = [
    `A chibi character sticker illustration in the style of 1980s Japanese sparkling prize stickers. Super-deformed, about 2.5 heads tall, bold outlines, vivid colors, ${SPARKLE_EN[tier]}.`,
    `The character is ${FORM_EN[spec.form]}, ${BODY_EN[chart.dayGan]}, with ${expr}.`,
    `It carries ${sizePhrase(spec.mainEq.sizeTier, main.en, true)}.`,
    ...(subs.length ? [`Also: ${subs.join(', and ')}.`] : []),
    `A small ${ELEMENT_COLOR_EN[spec.charmElement]} ribbon charm is tied at the neck.`,
    `${COMPANION_EN[spec.companionZhi].replace(/^a /, 'A ')} companion stands beside the character.`,
    `A small embroidered emblem of a ${CREST_EN[spec.crestZhi]} is on the outfit, ${SEASON_EN[season]}.`,
    'No text, no letters, no words, no frame, no border, no logo.',
  ];
  const partsJa = [
    { label: '背景の派手さ（レア度）', value: SPARKLE_JA[tier] },
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
    negative:
      'text, letters, words, alphabet, numbers, frame, border, logo, watermark, signature, realistic, photograph, 3d render, scary, dark mood',
    partsJa,
  };
}
