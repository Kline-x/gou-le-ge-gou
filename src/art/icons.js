// 16 种狗狗主题图案（viewBox 0 0 64 64 的内部片段）
// 风格：扁平填色 + 深棕粗描边（线宽约 3，圆角连接）+ 一处白色半透明高光。
// 所有内容限制在 6..58 的安全区内。片段会在页面里被重复插入，
// 因此不得使用 id、渐变、滤镜和 <text>。

// 通用深色描边
const INK = '#3B2A1A';
// 描边公共属性（线宽 3、圆角）
const LINE = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

// 数值保留两位小数，避免路径里出现长串小数
function r2(n) {
  return Math.round(n * 100) / 100;
}

// 白色半透明高光（描边式短弧）
function shine(d, width = 3, opacity = 0.6) {
  return `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
}

// 狗骨头外轮廓：两端各两颗圆头，中间骨干略收腰
// cx/cy 中心；half 圆头圆心到中心的水平距离；dy 上下圆头圆心的半间距；
// r 圆头半径；s 骨干半高；waist 骨干收腰量
function bonePath(cx, cy, half, dy, r, s, waist = 0) {
  const dx = Math.sqrt(r * r - (dy - s) ** 2);
  const n = Math.sqrt(r * r - dy * dy);
  const xl = cx - half + dx;
  const xr = cx + half - dx;
  return `M${r2(xl)} ${r2(cy - s)}Q${r2(cx)} ${r2(cy - s + waist)} ${r2(xr)} ${r2(cy - s)}`
    + `A${r} ${r} 0 1 1 ${r2(cx + half + n)} ${r2(cy)}`
    + `A${r} ${r} 0 1 1 ${r2(xr)} ${r2(cy + s)}`
    + `Q${r2(cx)} ${r2(cy + s - waist)} ${r2(xl)} ${r2(cy + s)}`
    + `A${r} ${r} 0 1 1 ${r2(cx - half - n)} ${r2(cy)}`
    + `A${r} ${r} 0 1 1 ${r2(xl)} ${r2(cy - s)}Z`;
}

// 狗盆里堆出来的狗粮颗粒：[cx, cy, r, 颜色]，从顶层往底层画（后画的压在前面）
const KIBBLE_PILE = [
  [27, 15.5, 5.3, '#B8763A'], [37, 15.5, 5.3, '#9A5A2B'],
  [21.5, 23, 5.5, '#9A5A2B'], [32, 22.5, 5.6, '#B8763A'], [42.5, 23, 5.5, '#8A4E25'],
  [16.5, 30, 5.5, '#B8763A'], [26.5, 29.5, 5.6, '#8A4E25'], [37.5, 29.5, 5.6, '#9A5A2B'], [47.5, 30, 5.5, '#B8763A'],
];

// 狗爪的四个趾头：[cx, cy, rx, ry, 旋转角]
const PAW_TOES = [
  [13.4, 30.5, 5, 6.6, -30], [24, 18.5, 5.2, 6.8, -10], [40, 18.5, 5.2, 6.8, 10], [50.6, 30.5, 5, 6.6, 30],
];

// 西瓜籽：[cx, cy]（西瓜瓣坐标系，圆心 31.5,24）
const MELON_SEEDS = [[23.5, 29], [31.5, 31.5], [39.5, 29], [27, 35.5], [36, 35.5]];

// 飞盘、项圈等用到的次要色
const FRISBEE_RIM = '#0288D1';
const HYDRANT_DARK = '#B71C1C';

// 图案顺序与 Global Constraints 一致（kind 0..15）
export const ICONS = [
  {
    key: 'bone', name: '骨头', color: '#F6E7C8',
    svg: `<path d="${bonePath(32, 32, 15, 8, 9, 5, 1.5)}" fill="#F6E7C8" stroke="#7A5A34" stroke-width="3.5" stroke-linejoin="round"/>`
      + shine('M11.8 22.1A5.5 5.5 0 0 1 16 18.6M28.5 30.6H35.5', 3, 0.85),
  },
  {
    key: 'ball', name: '网球', color: '#CBE33B',
    svg: '<circle cx="32" cy="32" r="24" fill="#CBE33B"/>'
      + '<path d="M16.5 15Q33 32 16.5 49M47.5 15Q31 32 47.5 49" fill="none" stroke="#FFFFFF" stroke-width="3.8" stroke-linecap="round"/>'
      + shine('M27 13.6Q32 11.9 37 13.6', 3, 0.7)
      + `<circle cx="32" cy="32" r="24" fill="none" ${LINE}/>`,
  },
  {
    key: 'bowl', name: '狗盆', color: '#F57C23',
    svg: KIBBLE_PILE.map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${INK}" stroke-width="2.5"/>`).join('')
      + `<path d="M12 39H52L56 50.5Q57 55 52.5 55H11.5Q7 55 8 50.5Z" fill="#F57C23" ${LINE}/>`
      + `<rect x="9" y="31.5" width="46" height="7.5" rx="3.75" fill="#F57C23" ${LINE}/>`
      + `<path d="${bonePath(32, 47, 6, 2.2, 3, 1.4)}" fill="#FFFFFF"/>`
      + shine('M13.5 35.2H23', 2.5, 0.6),
  },
  {
    key: 'paw', name: '狗爪', color: '#5D4037',
    svg: PAW_TOES.map(([x, y, rx, ry, a]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${x} ${y})" fill="#5D4037" ${LINE}/>`).join('')
      + `<path d="M32 32.5C39.5 32.5 46.5 39 47 45.5C47.5 51.5 43.5 54.5 38.5 53.2C35.8 52.5 34.3 51.6 32 51.6C29.7 51.6 28.2 52.5 25.5 53.2C20.5 54.5 16.5 51.5 17 45.5C17.5 39 24.5 32.5 32 32.5Z" fill="#5D4037" ${LINE}/>`
      + '<path d="M32 38.5C36.5 38.5 40.3 42 40.6 45.5C40.9 48.6 38.6 50.1 36 49.4C34.5 49 33.4 48.5 32 48.5C30.6 48.5 29.5 49 28 49.4C25.4 50.1 23.1 48.6 23.4 45.5C23.7 42 27.5 38.5 32 38.5Z" fill="#FF9EB5"/>'
      + PAW_TOES.map(([x, y, , , a]) => `<ellipse cx="${x}" cy="${y + 0.6}" rx="2.4" ry="3.2" transform="rotate(${a} ${x} ${y})" fill="#FF9EB5"/>`).join('')
      + shine('M21.5 41Q23 37.4 26.6 36', 2.5, 0.45),
  },
  {
    key: 'poop', name: '便便', color: '#8D5A3B',
    svg: `<path d="M25.5 21.5Q28.5 14 36.5 9Q35 15 39.5 21Z" fill="#8D5A3B" ${LINE}/>`
      + `<ellipse cx="32.5" cy="25.5" rx="12.5" ry="6.8" fill="#8D5A3B" ${LINE}/>`
      + `<ellipse cx="31.5" cy="35.5" rx="18" ry="7.8" fill="#8D5A3B" ${LINE}/>`
      + `<ellipse cx="32" cy="47" rx="23.5" ry="8.5" fill="#8D5A3B" ${LINE}/>`
      + shine('M16.8 35.5Q17.8 32.2 21.2 30.6', 2.5, 0.5)
      + `<circle cx="25" cy="45.5" r="4.6" fill="#FFFFFF" stroke="${INK}" stroke-width="2"/>`
      + `<circle cx="39" cy="45.5" r="4.6" fill="#FFFFFF" stroke="${INK}" stroke-width="2"/>`
      + `<circle cx="26" cy="46.2" r="2.4" fill="${INK}"/><circle cx="40" cy="46.2" r="2.4" fill="${INK}"/>`
      + '<circle cx="26.8" cy="45.3" r=".9" fill="#FFFFFF"/><circle cx="40.8" cy="45.3" r=".9" fill="#FFFFFF"/>'
      + `<path d="M28.5 51.5Q32 54 35.5 51.5" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  {
    key: 'hydrant', name: '消防栓', color: '#E53935',
    svg: `<rect x="28.5" y="8" width="7" height="5" rx="2" fill="${HYDRANT_DARK}" ${LINE}/>`
      + `<path d="M19 25A13 13.5 0 0 1 45 25Z" fill="#E53935" ${LINE}/>`
      + `<rect x="11" y="30.5" width="11" height="8" rx="2" fill="#E53935" ${LINE}/>`
      + `<rect x="42" y="30.5" width="11" height="8" rx="2" fill="#E53935" ${LINE}/>`
      + `<rect x="8" y="28.5" width="5.5" height="12" rx="2" fill="#E53935" ${LINE}/>`
      + `<rect x="50.5" y="28.5" width="5.5" height="12" rx="2" fill="#E53935" ${LINE}/>`
      + `<path d="M21 25H43L45 49H19Z" fill="#E53935" ${LINE}/>`
      + `<rect x="16" y="22.5" width="32" height="6" rx="3" fill="${HYDRANT_DARK}" ${LINE}/>`
      + `<rect x="14" y="48.5" width="36" height="7.5" rx="3" fill="${HYDRANT_DARK}" ${LINE}/>`
      + `<circle cx="32" cy="38" r="5" fill="${HYDRANT_DARK}" ${LINE}/><circle cx="32" cy="38" r="1.6" fill="${INK}"/>`
      + shine('M24.6 32V44.5M22.8 21.2Q23.3 15.8 27.8 14.2', 3, 0.5),
  },
  {
    key: 'duck', name: '小黄鸭', color: '#FFD43B',
    svg: `<path d="M8 29.5C11.5 34 16 36.5 22.5 36L44 36C52 36 56.5 40.5 56 46C55.5 52.5 47 56 32 56C17 56 10 51.5 9 44.5C8.5 40 7.5 34 8 29.5Z" fill="#FFD43B" ${LINE}/>`
      + `<path d="M19.5 42.5C25.5 38.5 34.5 39 38.5 43.5C35.5 49.5 27.5 51.5 21.5 49C19 48 18 45 19.5 42.5Z" fill="#F5B400" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`
      + `<circle cx="37.5" cy="22.5" r="12.5" fill="#FFD43B" ${LINE}/>`
      + `<path d="M47 20Q56 17.5 56.5 22.5Q56.5 27 47 26Z" fill="#FF8C1A" ${LINE}/>`
      + `<path d="M49.5 23.1H54.5" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`
      + `<circle cx="40.5" cy="19.5" r="2.6" fill="${INK}"/><circle cx="41.4" cy="18.6" r=".9" fill="#FFFFFF"/>`
      + '<ellipse cx="42.3" cy="26.6" rx="2.8" ry="1.7" fill="#FF9EB5" opacity=".85"/>'
      + shine('M29.8 18.5Q31.2 14 35.5 12.9', 3, 0.6),
  },
  {
    key: 'frisbee', name: '飞盘', color: '#29B6F6',
    svg: '<g transform="rotate(-14 32 32)">'
      + `<ellipse cx="32" cy="35" rx="24" ry="12.5" fill="${FRISBEE_RIM}" ${LINE}/>`
      + `<ellipse cx="32" cy="30" rx="24" ry="12.5" fill="#29B6F6" ${LINE}/>`
      + `<ellipse cx="32" cy="30" rx="15.5" ry="8" fill="none" stroke="${FRISBEE_RIM}" stroke-width="2.5"/>`
      + `<ellipse cx="32" cy="30" rx="7.5" ry="3.8" fill="none" stroke="${FRISBEE_RIM}" stroke-width="2.5"/>`
      + shine('M13.5 27.4A19.2 10 0 0 1 21 21.8', 3, 0.65)
      + '</g>',
  },
  {
    key: 'house', name: '狗窝', color: '#26A69A',
    svg: `<path d="M13.5 34H50.5V52.5Q50.5 55.5 47.5 55.5H16.5Q13.5 55.5 13.5 52.5Z" fill="#D9A566" ${LINE}/>`
      + '<path d="M15 45.5H23M41 45.5H49" stroke="#B98546" stroke-width="2" stroke-linecap="round"/>'
      + `<path d="M23.5 55.5V46.5A8.5 8.5 0 0 1 40.5 46.5V55.5Z" fill="#4A2E1F" ${LINE}/>`
      + `<path d="M29.8 9.6Q32 7.4 34.2 9.6L55 33.2Q57 36.5 53.5 36.5H10.5Q7 36.5 9 33.2Z" fill="#26A69A" ${LINE}/>`
      + `<path d="${bonePath(32, 26, 5.5, 2, 2.8, 1.3)}" fill="#FFFFFF"/>`
      + shine('M15.6 30L26.4 17.8', 3, 0.5),
  },
  {
    key: 'collar', name: '项圈', color: '#8E44AD',
    // 皮带式圆环：顶部一枚银色搭扣，环上几颗银铆钉，下面挂金色骨头牌
    svg: '<path d="M8.25 25A23.75 17.25 0 1 0 55.75 25A23.75 17.25 0 1 0 8.25 25ZM17.75 25A14.25 7.75 0 1 0 46.25 25A14.25 7.75 0 1 0 17.75 25Z" '
      + `fill="#8E44AD" fill-rule="evenodd" ${LINE}/>`
      + [155, 205, 335, 25].map((a) => {
        const t = (a * Math.PI) / 180;
        return `<circle cx="${r2(32 + 19 * Math.cos(t))}" cy="${r2(25 + 12.5 * Math.sin(t))}" r="1.9" fill="#F1ECFA" stroke="${INK}" stroke-width="1.2"/>`;
      }).join('')
      + shine('M17.3 16.4A19 12.5 0 0 1 25.5 13.2', 2.2, 0.55)
      + `<rect x="27.5" y="7.5" width="9" height="10.5" rx="2.2" fill="#DDE2EA" stroke="${INK}" stroke-width="2.2"/>`
      + `<path d="M29.3 12.5H34.7" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
      + `<circle cx="32" cy="45" r="2.8" fill="none" stroke="${INK}" stroke-width="2.2"/>`
      + `<path d="${bonePath(32, 50.5, 7, 2.6, 3.3, 1.7)}" fill="#FFC83D" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  },
  {
    key: 'sausage', name: '火腿肠', color: '#F06292',
    svg: `<g transform="translate(15.41 45.34) rotate(160.5)"><path d="M0 -3.4L6.5 -4.6Q8.8 0 6.5 4.6L0 3.4Z" fill="#D94A7B" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`
      + `<g transform="translate(45.34 15.41) rotate(-70.5)"><path d="M0 -3.4L6.5 -4.6Q8.8 0 6.5 4.6L0 3.4Z" fill="#D94A7B" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`
      // 肠身：沿中心线 M22 43Q37.5 37.5 43 22 两侧各偏移 9.5 的圆头胶囊
      + `<path d="M25.18 51.95Q44.94 44.94 51.95 25.18A9.5 9.5 0 0 0 34.05 18.82Q30.06 30.06 18.82 34.05A9.5 9.5 0 0 0 25.18 51.95Z" fill="#F06292" ${LINE}/>`
      + shine('M25.6 36.5Q32.6 32.6 36.5 25.6', 3.5, 0.6),
  },
  {
    key: 'drumstick', name: '鸡腿', color: '#C0662B',
    svg: `<g fill="${INK}" stroke="${INK}" stroke-linecap="round"><path d="M36 36L45.5 45.5" stroke-width="13"/><circle cx="50" cy="45" r="4.3" stroke-width="6"/><circle cx="45" cy="50" r="4.3" stroke-width="6"/></g>`
      + '<path d="M36 36L45.5 45.5" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>'
      + '<circle cx="50" cy="45" r="4.3" fill="#FFFFFF"/><circle cx="45" cy="50" r="4.3" fill="#FFFFFF"/>'
      + `<path d="M41 42.5C35 48 22 51 14 44.5C6 38 7.5 22 16.5 14.5C25.5 7 40 9 46 18C51 25.5 47.5 36 41 42.5Z" fill="#C0662B" ${LINE}/>`
      + shine('M15.5 27Q17 20 23.5 16.5', 3, 0.5),
  },
  {
    key: 'slipper', name: '拖鞋', color: '#3F6FD8',
    // 俯视鞋底：宽鞋头、收窄的足弓、圆鞋跟；鞋头右上角是一个半圆形咬痕缺口
    svg: '<g transform="translate(32 32.4) rotate(22) scale(.97) translate(-32 -32)">'
      + `<path d="M32 6.5C23 6.5 16.5 11 16.5 18.5C16.5 26 22.5 30 23.5 38C24 42 21 45 21 49.5C21 54.5 26 57.5 31.5 57.5C37 57.5 42 54.5 42 49.5C42 45 40 42 40.5 38C41.5 30 47.5 26 47.5 18.5C47.5 16.5 47.2 14.8 46.6 13.2A5.3 5.3 0 0 1 38.5 7.4C36.5 6.8 34.3 6.5 32 6.5Z" fill="#3F6FD8" ${LINE}/>`
      + `<path d="M16.2 25.5Q32 19 47.8 25.5L42.8 35.5Q32 30.5 21 35.5Z" fill="#FFFFFF" ${LINE}/>`
      + shine('M20.8 17.5Q21.6 12.8 26.2 10.8', 3, 0.5)
      + '</g>',
  },
  {
    key: 'doge', name: '狗头', color: '#F2B45A',
    svg: `<path d="M11.5 29.5L14 9.5Q15 7 17.5 8.5L30 17.5Z" fill="#F2B45A" ${LINE}/>`
      + `<path d="M52.5 29.5L50 9.5Q49 7 46.5 8.5L34 17.5Z" fill="#F2B45A" ${LINE}/>`
      + '<path d="M15 24.5L16.5 13L25 19.5ZM49 24.5L47.5 13L39 19.5Z" fill="#FFE3BF"/>'
      + '<path d="M32 15C46 15 56 23.5 56 36C56 48.5 45.5 56 32 56C18.5 56 8 48.5 8 36C8 23.5 18 15 32 15Z" fill="#F2B45A"/>'
      + '<path d="M32 38C37.5 38 41 40.5 43 43.5C46.5 41 51 40.5 55.6 42C54 50.5 45 56 32 56C19 56 10 50.5 8.4 42C13 40.5 17.5 41 21 43.5C23 40.5 26.5 38 32 38Z" fill="#FFF6E6"/>'
      + '<ellipse cx="22" cy="25.5" rx="3.2" ry="2.2" fill="#FFF6E6"/><ellipse cx="42" cy="25.5" rx="3.2" ry="2.2" fill="#FFF6E6"/>'
      + `<path d="M32 15C46 15 56 23.5 56 36C56 48.5 45.5 56 32 56C18.5 56 8 48.5 8 36C8 23.5 18 15 32 15Z" fill="none" ${LINE}/>`
      + shine('M13.5 31Q15 24.5 21 21', 3, 0.5)
      + `<path d="M16.5 31.5H27.5A5.5 5.5 0 0 1 16.5 31.5ZM36.5 31.5H47.5A5.5 5.5 0 0 1 36.5 31.5Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
      + `<circle cx="25" cy="33.3" r="2.3" fill="${INK}"/><circle cx="45" cy="33.3" r="2.3" fill="${INK}"/>`
      + `<path d="M15.5 31.5H28.5M35.5 31.5H48.5" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M28.5 40.5Q32 39 35.5 40.5Q35 44 32 45Q29 44 28.5 40.5Z" fill="${INK}"/>`
      + `<path d="M32 45V46.5M26.5 46Q29.2 49.5 32 46.5Q34.8 49.5 38.5 45.5" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    key: 'melon', name: '西瓜', color: '#43A047',
    svg: '<g transform="translate(-.25 0) rotate(-20 31.5 24)">'
      + '<path d="M6.5 24A25 25 0 0 0 56.5 24Z" fill="#43A047"/>'
      + '<path d="M13.5 24A18 18 0 0 0 49.5 24Z" fill="#F1F8E9"/>'
      + '<path d="M16.5 24A15 15 0 0 0 46.5 24Z" fill="#EF5350"/>'
      + MELON_SEEDS.map(([x, y]) => {
        const a = r2((Math.atan2(y - 24, x - 31.5) * 180) / Math.PI - 90);
        return `<ellipse cx="${x}" cy="${y}" rx="1.5" ry="2.3" transform="rotate(${a} ${x} ${y})" fill="#2B1D14"/>`;
      }).join('')
      + shine('M12.9 34.8A21.5 21.5 0 0 0 20.8 42.6', 2.5, 0.5)
      + `<path d="M6.5 24A25 25 0 0 0 56.5 24Z" fill="none" ${LINE}/>`
      + '</g>',
  },
  {
    key: 'kibble', name: '狗粮袋', color: '#5C6BC0',
    svg: `<path d="M14.5 18H49.5C52.5 28 53.5 40 52.5 50Q52 55.5 46.5 55.5H17.5Q12 55.5 11.5 50C10.5 40 11.5 28 14.5 18Z" fill="#5C6BC0" ${LINE}/>`
      + `<path d="M13 12L16.8 8.8L20.6 12L24.4 8.8L28.2 12L32 8.8L35.8 12L39.6 8.8L43.4 12L47.2 8.8L51 12V19.5Q51 21.5 49 21.5H15Q13 21.5 13 19.5Z" fill="#3F4BA6" ${LINE}/>`
      + `<path d="${bonePath(32, 38.5, 9, 3.3, 4.2, 2.2)}" fill="#FFFFFF"/>`
      + shine('M16.6 27Q15.4 37 16.4 47', 3, 0.45),
  },
];

// 页面内复用的 symbol sprite（牌面用 <use href="#ic-key"> 引用）
export function iconSymbolsSVG() {
  const symbols = ICONS.map((i) => `<symbol id="ic-${i.key}" viewBox="0 0 64 64">${i.svg}</symbol>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:none">${symbols}</svg>`;
}

// 独立完整 SVG（战绩图、预览页用）
export function iconSVG(kind, size = 64) {
  const i = ICONS[kind] || ICONS[0];
  const s = Number(size) || 64; // 只接受数字，避免把任意字符串拼进属性
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${s}" height="${s}">${i.svg}</svg>`;
}
