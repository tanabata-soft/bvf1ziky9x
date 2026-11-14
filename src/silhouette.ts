// 画像待ちの間に表示する「シルエット絵」。
// 形態の体の影＋装備の影＋相棒の影を簡易SVGパーツで組み立てる（試作版・粗い造形）。
import type { Chart, CharacterSpec } from './fortune';
import type { ShiShen, Zhi } from './fortune';
import { ELEMENT_COLOR } from './texts';

const INK = '#26263a';
const INK2 = '#3d3d55';

function bodySvg(form: CharacterSpec['form'], x: number, y: number, s: number): string {
  // (x,y) = 中心の足元, s = 拡大率。viewBox 300x300 前提のおおまかな形。
  const t = `translate(${x} ${y}) scale(${s})`;
  switch (form) {
    case '人型':
      return `<g transform="${t}" fill="${INK}"><circle cx="0" cy="-118" r="34"/><path d="M-30 -84 Q0 -96 30 -84 L38 0 L14 0 L8 -44 L2 0 L-16 0 L-24 -50 L-34 0 L-40 0 Z"/></g>`;
    case '精霊型':
      return `<g transform="${t}" fill="${INK}"><ellipse cx="-52" cy="-104" rx="26" ry="12" transform="rotate(-24 -52 -104)"/><ellipse cx="52" cy="-104" rx="26" ry="12" transform="rotate(24 52 -104)"/><path d="M0 -152 C30 -120 34 -70 16 -34 C8 -16 4 -6 0 0 C-4 -6 -8 -16 -16 -34 C-34 -70 -30 -120 0 -152 Z"/><circle cx="-10" cy="-106" r="4" fill="#cfcfe0"/><circle cx="10" cy="-106" r="4" fill="#cfcfe0"/></g>`;
    case '獣型':
      return `<g transform="${t}" fill="${INK}"><path d="M-26 -128 L-38 -160 L-8 -140 Z"/><path d="M26 -128 L38 -160 L8 -140 Z"/><circle cx="0" cy="-112" r="36"/><ellipse cx="0" cy="-42" rx="38" ry="46"/><path d="M36 -30 Q66 -22 60 4 Q56 16 46 10 Q58 -16 34 -16 Z"/></g>`;
    case '道具型':
      return `<g transform="${t}" fill="${INK}"><rect x="-44" y="-150" width="88" height="104" rx="14"/><rect x="-16" y="-168" width="32" height="20" rx="8"/><rect x="-30" y="-46" width="18" height="20" rx="6"/><rect x="12" y="-46" width="18" height="20" rx="6"/><circle cx="-16" cy="-104" r="5" fill="#cfcfe0"/><circle cx="16" cy="-104" r="5" fill="#cfcfe0"/></g>`;
    case '群体型':
      return `<g transform="${t}" fill="${INK}">
        <g transform="translate(-52 0) scale(0.72)"><circle cx="0" cy="-118" r="34"/><path d="M-30 -84 Q0 -96 30 -84 L38 0 L-38 0 Z"/></g>
        <g transform="translate(0 6)"><circle cx="0" cy="-118" r="34"/><path d="M-30 -84 Q0 -96 30 -84 L38 0 L-38 0 Z"/></g>
        <g transform="translate(52 0) scale(0.72)"><circle cx="0" cy="-118" r="34"/><path d="M-30 -84 Q0 -96 30 -84 L38 0 L-38 0 Z"/></g></g>`;
  }
}

function equipmentSvg(ss: ShiShen, x: number, y: number, s: number): string {
  const t = `translate(${x} ${y}) scale(${s})`;
  const f = `fill="${INK2}" stroke="#6a6a88" stroke-width="2"`;
  switch (ss) {
    case '食神': // ランタン
      return `<g transform="${t}"><path d="M-6 -34 h12 l4 8 h-20 Z" fill="${INK2}"/><rect x="-17" y="-26" width="34" height="42" rx="12" ${f}/><rect x="-8" y="16" width="16" height="6" fill="${INK2}"/></g>`;
    case '傷官': // 大きな筆
      return `<g transform="${t}" fill="${INK2}"><rect x="-5" y="-46" width="10" height="52" rx="4"/><path d="M-9 6 Q0 34 1 44 Q2 34 11 6 Q0 12 -9 6 Z"/></g>`;
    case '偏財': // 宝石袋
      return `<g transform="${t}"><path d="M-8 -30 Q0 -40 8 -30 L5 -20 h-10 Z" fill="${INK2}"/><circle cx="0" cy="2" r="24" ${f}/><circle cx="-6" cy="-4" r="4" fill="#cfcfe0"/><circle cx="7" cy="4" r="3" fill="#cfcfe0"/></g>`;
    case '正財': // 鍵の束
      return `<g transform="${t}" fill="none" stroke="${INK2}" stroke-width="6"><circle cx="-8" cy="-22" r="10"/><path d="M-4 -14 L10 16 M10 16 l8 -2 M10 16 l2 8"/></g>`;
    case '七殺': // 剣
      return `<g transform="${t}"><path d="M0 -48 L7 -6 L2 26 L0 34 L-2 26 L-7 -6 Z" fill="${INK2}"/><rect x="-16" y="26" width="32" height="6" rx="3" fill="${INK2}"/><rect x="-3" y="32" width="6" height="14" fill="${INK2}"/></g>`;
    case '正官': // 勲章とマント
      return `<g transform="${t}"><path d="M-22 -40 L0 -18 L22 -40 L16 30 L-16 30 Z" fill="${INK2}"/><circle cx="0" cy="-16" r="11" ${f}/></g>`;
    case '偏印': // 水晶玉
      return `<g transform="${t}"><circle cx="0" cy="-12" r="19" ${f}/><path d="M-16 12 h32 l6 12 h-44 Z" fill="${INK2}"/></g>`;
    case '正印': // 大きな本
      return `<g transform="${t}"><rect x="-24" y="-32" width="48" height="58" rx="5" ${f}/><rect x="-3" y="-32" width="5" height="58" fill="#6a6a88"/></g>`;
    case '比肩': // 対の腕輪
      return `<g transform="${t}" fill="none" stroke="${INK2}" stroke-width="6"><circle cx="-14" cy="0" r="13"/><circle cx="15" cy="0" r="13"/></g>`;
    case '劫財': // 炎のスカーフ
      return `<g transform="${t}" fill="${INK2}"><path d="M-30 -18 Q-10 -30 6 -16 Q22 -28 32 -14 Q18 2 2 -6 Q-14 4 -30 -18 Z"/><path d="M18 -8 Q30 12 20 30 Q12 14 6 2 Z"/></g>`;
  }
}

function companionSvg(zhi: Zhi, x: number, y: number): string {
  const longEar = ['卯'].includes(zhi);
  const horn = ['丑', '辰', '未', '午'].includes(zhi);
  const roundEar = ['子', '申'].includes(zhi);
  const snake = zhi === '巳';
  const ears = snake
    ? `<ellipse cx="6" cy="-6" rx="30" ry="11" fill="${INK}"/>`
    : `<ellipse cx="0" cy="-16" rx="21" ry="18" fill="${INK}"/>
       ${longEar ? `<ellipse cx="-10" cy="-40" rx="5" ry="15" fill="${INK}"/><ellipse cx="9" cy="-40" rx="5" ry="15" fill="${INK}"/>`
        : horn ? `<path d="M-18 -26 L-24 -40 L-8 -32 Z" fill="${INK}"/><path d="M18 -26 L24 -40 L8 -32 Z" fill="${INK}"/>`
        : roundEar ? `<circle cx="-17" cy="-28" r="8" fill="${INK}"/><circle cx="17" cy="-28" r="8" fill="${INK}"/>`
        : `<path d="M-16 -28 L-12 -42 L-2 -32 Z" fill="${INK}"/><path d="M16 -28 L12 -42 L2 -32 Z" fill="${INK}"/>`}
       <ellipse cx="0" cy="0" rx="17" ry="13" fill="${INK}"/>`;
  return `<g transform="translate(${x} ${y})">${ears}<text x="0" y="26" text-anchor="middle" font-size="13" fill="#8a8aa5">${zhi}</text></g>`;
}

/** シルエット仮シールのSVG文字列（300x300） */
export function silhouetteSvg(chart: Chart, spec: CharacterSpec): string {
  const mainColor = ELEMENT_COLOR[chart.strongestElement];
  const charmColor = ELEMENT_COLOR[spec.charmElement];
  const mainScale = spec.mainEq.sizeTier === 3 ? 1.25 : spec.mainEq.sizeTier === 2 ? 0.95 : 0.7;
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="シルエット">
  <defs><linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${mainColor}" stop-opacity="0.55"/>
    <stop offset="0.5" stop-color="#f6d8ff" stop-opacity="0.7"/>
    <stop offset="1" stop-color="${charmColor}" stop-opacity="0.55"/>
  </linearGradient></defs>
  <rect x="0" y="0" width="300" height="300" fill="url(#pbg)"/>
  <g fill="#ffffff" opacity="0.35">
    <circle cx="42" cy="52" r="3"/><circle cx="252" cy="40" r="4"/><circle cx="272" cy="120" r="3"/>
    <circle cx="30" cy="150" r="4"/><circle cx="140" cy="30" r="3"/><circle cx="210" cy="86" r="2.5"/>
  </g>
  <ellipse cx="150" cy="272" rx="105" ry="13" fill="#00000022"/>
  ${bodySvg(spec.form, 150, 268, 1)}
  ${spec.subEq[0] ? equipmentSvg(spec.subEq[0].shiShen, 66, 128, 0.62) : ''}
  ${spec.subEq[1] ? equipmentSvg(spec.subEq[1].shiShen, 234, 128, 0.62) : ''}
  ${equipmentSvg(spec.mainEq.shiShen, 150, 218, mainScale)}
  <circle cx="150" cy="196" r="7" fill="${charmColor}" stroke="#fff" stroke-width="2"/>
  ${companionSvg(spec.companionZhi, 238, 258)}
  <g transform="translate(262 34)"><circle r="17" fill="#fffdf5" stroke="#c9a227" stroke-width="2.5"/><text y="6" text-anchor="middle" font-size="16" fill="#7a5c00">${spec.crestZhi}</text></g>
</svg>`;
}
