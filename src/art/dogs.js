// 6 个犬种 × 6 种心情的 Q 版狗头（viewBox 0 0 120 120）
// 参数化拼装：犬种提供耳朵、脸型、面罩/花纹片段；心情提供眉毛、眼睛、嘴和附加元素。
// 片段会被重复插入页面，因此不得使用 id、渐变、滤镜和 <text>。

// 统一深棕描边与主线宽
const INK = '#3B2A1A';
const W = 4;
// 口腔、舌头、汗珠/泪滴、腮红
const MOUTH_IN = '#6B2A22';
const TONGUE = '#FF7F93';
const DROP = '#7CCBF5';
const BLUSH = '#FF7A8A';

// 犬种顺序与 Global Constraints 一致。colors 里：fur 主毛色、light 浅色花纹、ear 耳朵内侧（或垂耳）色
export const BREEDS = [
  { key: 'shiba', name: '柴犬', team: '柴犬队', colors: { fur: '#E8913A', light: '#FFF1DC', ear: '#FFF1DC' } },
  { key: 'husky', name: '哈士奇', team: '哈士奇队', colors: { fur: '#8E9AAF', light: '#FFFFFF', ear: '#FFFFFF', eye: '#4FB3F0' } },
  { key: 'corgi', name: '柯基', team: '柯基队', colors: { fur: '#F0A04B', light: '#FFFFFF', ear: '#FFD9BF' } },
  { key: 'golden', name: '金毛', team: '金毛队', colors: { fur: '#E3B04B', light: '#F8DD9F', ear: '#CF9433' } },
  { key: 'teddy', name: '泰迪', team: '泰迪队', colors: { fur: '#A0673A', light: '#CC9464', ear: '#86522C' } },
  { key: 'tianyuan', name: '田园犬', team: '田园犬队', colors: { fur: '#D9A441', light: '#FFFFFF', ear: '#F2D08E', muzzle: '#BD8733' } },
];

export const MOODS = ['idle', 'happy', 'worried', 'sad', 'cheer', 'shock'];

// 默认脸型：圆润的 Q 版大头（x 17..103，y 28..104）
const HEAD = 'M60 28C87 28 103 44 103 66C103 88 86 104 60 104C34 104 17 88 17 66C17 44 33 28 60 28Z';
// 默认头部高光位置（左上）
const HEAD_SHINE = 'M27.5 52Q30.5 41 40.5 35';
// 双眼中心
const EYE_L = [44, 66];
const EYE_R = [76, 66];

// 数值保留两位小数
function n2(v) {
  return Math.round(v * 100) / 100;
}

// 左右对称：左侧片段 + 以 x=60 为轴的镜像副本
function pair(svg) {
  return `${svg}<g transform="matrix(-1 0 0 1 120 0)">${svg}</g>`;
}

// 一组圆的“并集”描边：先画粗深色底，再盖同样的填色圆，外轮廓就是一条连续的描边
function curlyBlob(circles, fill) {
  const shapes = circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return `<g fill="${INK}" stroke="${INK}" stroke-width="${W * 2}">${shapes}</g><g fill="${fill}">${shapes}</g>`;
}

// 泰迪的卷毛头：沿椭圆排一圈小圆（中间再由实心椭圆补满）
function teddyHeadCircles() {
  const list = [];
  for (let k = 0; k < 18; k++) {
    const t = (k * 20 * Math.PI) / 180;
    list.push([n2(60 + 37 * Math.cos(t)), n2(67 + 32 * Math.sin(t)), 9]);
  }
  return list;
}

// 各犬种的部件：back 画在头后面（立耳），marks 为脸上花纹，front 画在头前面（垂耳/卷毛耳）
const PARTS = {
  shiba: (c) => ({
    back: pair(`<path d="M22 60C20 44 22 28 28 17Q31 12 36 16C44 22 51 28 56 34Z" fill="${c.fur}" stroke="${INK}" stroke-width="${W}"/>`
      + `<path d="M29 49C28.5 40 29.5 31 32 24.5Q33.5 21.5 36 24C40.5 28.5 44.5 32.5 48 36.5Z" fill="${c.ear}"/>`),
    // 奶白色腮帮与嘴套（柴犬的“里白”）
    marks: `<path d="M18 78C25 73 35 74 41 80C46 75 53 72 60 72C67 72 74 75 79 80C85 74 95 73 102 78C99 94 83 104 60 104C37 104 21 94 18 78Z" fill="${c.light}"/>`,
    browDot: c.light,
  }),
  husky: (c) => ({
    back: pair(`<path d="M24 58C22 42 24 26 29 14Q31 9 35.5 13C43 21 50 28 55 34Z" fill="${c.fur}" stroke="${INK}" stroke-width="${W}"/>`
      + `<path d="M30.5 48C30 39 31 30 33 22.5Q34 20 36 22C40 26.5 44 31 47.5 35.5Z" fill="${c.ear}"/>`),
    // 白色倒三角面罩，额头中间留一道灰色 V 形
    marks: `<path d="M24 60C30 51 40 50 48 55L60 67L72 55C80 50 90 51 96 60C98 72 92 86 82 95C75 101 68 104 60 104C52 104 45 101 38 95C28 86 22 72 24 60Z" fill="${c.light}"/>`,
  }),
  corgi: (c) => ({
    back: pair(`<path d="M21 64C13 48 11 28 13 12Q14 6 20 8C34 14 46 24 54 34Z" fill="${c.fur}" stroke="${INK}" stroke-width="${W}"/>`
      + `<path d="M24.5 54C19.5 43 18.5 30 19.5 18.5Q20.5 14 24.5 16C33 21 41 28 47 35Z" fill="${c.ear}"/>`),
    // 额头一道白纹，向下展开成白色嘴套
    marks: `<path d="M55.5 29Q60 27 64.5 29L65.5 57C71 63 80 69 86 79C90 92 78 104 60 104C42 104 30 92 34 79C40 69 49 63 54.5 57Z" fill="${c.light}"/>`,
  }),
  golden: (c) => ({
    marks: `<ellipse cx="60" cy="87" rx="19" ry="14" fill="${c.light}"/>`,
    // 下垂的大耳朵，压在脸的两侧
    front: pair(`<path d="M38 34C26 30 12 38 8 56C5 72 9 88 17 93C25 97 31 90 31 78C31 66 32 54 38 34Z" fill="${c.ear}" stroke="${INK}" stroke-width="${W}"/>`),
    shine: 'M42 43Q46 36.5 53 33.8',
  }),
  teddy: (c) => ({
    // 一圈小圆组成的卷毛轮廓
    union: curlyBlob(teddyHeadCircles(), c.fur) + `<ellipse cx="60" cy="67" rx="38" ry="33" fill="${c.fur}"/>`,
    marks: `<ellipse cx="60" cy="86" rx="18" ry="14.5" fill="${c.light}"/>`,
    // 卷毛垂耳
    front: pair(curlyBlob([[21, 60, 9], [17, 72, 9], [19, 85, 8.5], [25.5, 95, 7.5]], c.ear)),
    shine: 'M34 44Q38 37 46 33.5',
  }),
  tianyuan: (c) => ({
    // 立耳：比柴犬更高、向外撇，长在头的两侧
    back: pair(`<path d="M24 60C19 47 17.5 30 19.5 14Q20.5 6.5 27 9.5C36 15 44.5 25 51 34Z" fill="${c.fur}" stroke="${INK}" stroke-width="${W}"/>`
      + `<path d="M26.5 51C22.5 42 21.5 31 22.5 20Q23.5 15.5 27.5 17.5C33.5 22 38.5 28 42.5 34Z" fill="${c.ear}"/>`),
    // 白下巴 + 颜色略深的嘴套（豆形吻部，盖住鼻子到下巴）
    marks: `<path d="M36 93C44 88 76 88 84 93C78 101 69 104 60 104C51 104 42 101 36 93Z" fill="${c.light}"/>`
      + `<path d="M60 69C72.5 69 82 75.5 82 84.5C82 93.5 72.5 98 60 98C47.5 98 38 93.5 38 84.5C38 75.5 47.5 69 60 69Z" fill="${c.muzzle}"/>`,
  }),
};

// 白色半透明高光
function headShine(d) {
  return `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="4.5" opacity=".45"/>`;
}

// 眉毛：柴犬用米色眉点（随心情倾斜），其余犬种在担心/难过时画八字眉
function brows(mood, dotColor) {
  const tilt = mood === 'worried' || mood === 'sad' ? 20 : 0;
  if (dotColor) {
    const edge = tilt ? ` stroke="${INK}" stroke-width="2.5"` : '';
    return pair(`<ellipse cx="44" cy="52" rx="5.5" ry="3.6" transform="rotate(${-tilt} 44 52)" fill="${dotColor}"${edge}/>`);
  }
  if (!tilt) return '';
  return `<path d="M35 55.5L49 50.5M71 50.5L85 55.5" fill="none" stroke="${INK}" stroke-width="${W}"/>`;
}

// 圆眼：黑眼珠（或带蓝色虹膜）+ 两颗高光
function roundEye(x, y, r, iris) {
  const ball = iris
    ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${iris}" stroke="${INK}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="${n2(r * 0.52)}" fill="${INK}"/>`
    : `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/>`;
  return ball
    + `<circle cx="${n2(x + r * 0.32)}" cy="${n2(y - r * 0.35)}" r="${n2(r * 0.36)}" fill="#FFFFFF"/>`
    + `<circle cx="${n2(x - r * 0.35)}" cy="${n2(y + r * 0.38)}" r="${n2(r * 0.17)}" fill="#FFFFFF"/>`;
}

// 五角星（星星眼）
function starPath(cx, cy, outer, inner) {
  let d = '';
  for (let k = 0; k < 10; k++) {
    const t = ((-90 + k * 36) * Math.PI) / 180;
    const rad = k % 2 ? inner : outer;
    d += `${k ? 'L' : 'M'}${n2(cx + rad * Math.cos(t))} ${n2(cy + rad * Math.sin(t))}`;
  }
  return `${d}Z`;
}

// 下垂的眼睛：内眼角高、外眼角低的半圆眼（左眼，右眼用镜像）
function droopyEye(iris) {
  const [x, y] = EYE_L;
  const shape = `M${x + 7.5} ${y - 3.5}L${x - 7.5} ${y + 0.5}A8 8 0 0 0 ${x + 7.5} ${y - 3.5}Z`;
  const body = iris
    ? `<path d="${shape}" fill="${iris}" stroke="${INK}" stroke-width="2.5"/><circle cx="${x}" cy="${y + 2}" r="3" fill="${INK}"/>`
    : `<path d="${shape}" fill="${INK}"/>`;
  return body + `<circle cx="${x + 2.5}" cy="${y + 2.5}" r="1.8" fill="#FFFFFF"/>`;
}

// 各心情的眼睛
function eyes(mood, iris) {
  const both = (fn) => fn(EYE_L[0], EYE_L[1]) + fn(EYE_R[0], EYE_R[1]);
  switch (mood) {
    case 'happy':
      return both((x, y) => `<path d="M${x - 9} ${y + 3}Q${x} ${y - 8} ${x + 9} ${y + 3}" fill="none" stroke="${INK}" stroke-width="4.5"/>`);
    case 'worried':
      return both((x, y) => roundEye(x, y + 1, 7, iris));
    case 'sad':
      return pair(droopyEye(iris));
    case 'cheer':
      return both((x, y) => `<path d="${starPath(x, y, 9.5, 4.3)}" fill="#FFD43B" stroke="${INK}" stroke-width="3"/>`);
    case 'shock':
      return both((x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="#FFFFFF" stroke="${INK}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="2.8" fill="${INK}"/>`);
    default:
      return both((x, y) => roundEye(x, y, 8, iris));
  }
}

// 鼻子（带一点高光）
const NOSE = `<path d="M53 74.5Q60 72 67 74.5Q66.5 80 60 81.5Q53.5 80 53 74.5Z" fill="${INK}"/>`
  + '<ellipse cx="57" cy="75.3" rx="2.2" ry="1.1" fill="#FFFFFF" opacity=".7"/>';

// 各心情的嘴
function mouth(mood) {
  const line = `fill="none" stroke="${INK}" stroke-width="3.5"`;
  switch (mood) {
    case 'happy':
      return `<path d="M49 83.5Q60 89 71 83.5Q70 98 60 98Q50 98 49 83.5Z" fill="${MOUTH_IN}" stroke="${INK}" stroke-width="3.5"/>`
        + `<path d="M53 91.5Q60 88.5 67 91.5V95.5Q67 102.5 60 102.5Q53 102.5 53 95.5Z" fill="${TONGUE}" stroke="${INK}" stroke-width="3"/>`
        + '<path d="M60 92.5V97.5" stroke="#E0566E" stroke-width="2"/>';
    case 'worried':
      return `<path d="M50 89Q55 85 60 89Q65 93 70 89" ${line}/>`;
    case 'sad':
      return `<path d="M50.5 92Q60 83.5 69.5 92" ${line}/>`;
    case 'cheer':
      return `<path d="M46.5 83Q60 89.5 73.5 83Q72.5 101 60 101Q47.5 101 46.5 83Z" fill="${MOUTH_IN}" stroke="${INK}" stroke-width="3.5"/>`
        + `<path d="M52 96.5Q60 90.5 68 96.5Q65.5 100 60 100Q54.5 100 52 96.5Z" fill="${TONGUE}"/>`;
    case 'shock':
      return `<ellipse cx="60" cy="91" rx="5.5" ry="7" fill="${MOUTH_IN}" stroke="${INK}" stroke-width="3.5"/>`;
    default:
      return `<path d="M60 81.5V84.5M51 84Q55.5 89.5 60 84.5Q64.5 89.5 69 84" ${line}/>`;
  }
}

// 附加元素：汗珠、泪滴、红晕、惊讶线
function extras(mood) {
  switch (mood) {
    case 'worried':
      return `<path d="M100 36C104 43 107 47.5 107 51.5A7 7 0 0 1 93 51.5C93 47.5 96 43 100 36Z" fill="${DROP}" stroke="${INK}" stroke-width="3"/>`
        + '<ellipse cx="97.3" cy="51.5" rx="1.6" ry="2.6" fill="#FFFFFF" opacity=".85"/>';
    case 'sad':
      return pair(`<path d="M34.5 72C37.5 77 39 79.5 39 81.5A4.5 4.5 0 0 1 30 81.5C30 79.5 31.5 77 34.5 72Z" fill="${DROP}" stroke="${INK}" stroke-width="2.5"/>`);
    case 'cheer':
      return pair(`<ellipse cx="34" cy="83" rx="7" ry="4.3" fill="${BLUSH}" opacity=".55"/>`);
    case 'shock':
      return `<path d="M60 6V17M44 9.5L48.5 19M76 9.5L71.5 19" fill="none" stroke="${INK}" stroke-width="${W}"/>`;
    default:
      return '';
  }
}

// 狗头 SVG：犬种未知时退回柴犬，心情未知时退回 idle
export function dogHeadSVG(breedKey, mood) {
  const breed = BREEDS.find((b) => b.key === breedKey) || BREEDS[0];
  const m = MOODS.includes(mood) ? mood : 'idle';
  const c = breed.colors;
  const p = PARTS[breed.key](c);
  let s = p.back || '';
  s += p.union || `<path d="${HEAD}" fill="${c.fur}"/>`;
  s += p.marks || '';
  if (!p.union) s += `<path d="${HEAD}" fill="none" stroke="${INK}" stroke-width="${W}"/>`;
  s += p.front || '';
  s += headShine(p.shine || HEAD_SHINE);
  s += brows(m, p.browDot);
  s += eyes(m, c.eye);
  s += NOSE;
  s += mouth(m);
  s += extras(m);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" stroke-linejoin="round" stroke-linecap="round">${s}</svg>`;
}
