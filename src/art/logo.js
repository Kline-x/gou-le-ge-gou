// 手绘笔画字标「狗了个狗」（viewBox 0 0 400 130）
// 不依赖字体：每个字由圆头粗笔画 path 拼成，每个字占一个 100×100 的格子。
// 每个笔画叠画三遍：深色外描边 26 → 白色描边 19 → 彩色芯 11。

// 深色外描边
const INK = '#3B2A1A';

// 每个字的笔画（100×100 坐标，按书写笔顺）
const STROKES = {
  // 狗 = 犭（撇、弯钩、撇）+ 句（勹：撇、横折钩；口：竖、横折、横）
  '狗': [
    'M33 13Q28 21 18 27',
    'M19 29Q34 38 33 57Q32 75 26 86L20 81',
    'M32 50Q25 61 13 68',
    'M55 12Q51 24 41 33',
    'M51 24H84V80Q84 89 73 86',
    'M52 42V67',
    'M52 42H69V67',
    'M52 67H69',
  ],
  // 了 = ㇇（横撇）+ 亅（竖钩）
  '了': [
    'M21 21H73L51 42',
    'M51 42C54 57 54 70 53 79Q52 90 39 85',
  ],
  // 个 = 人（撇、捺）+ 丨（竖）
  '个': [
    'M50 14Q40 34 15 51',
    'M50 14Q61 34 85 51',
    'M50 39V88',
  ],
};

// 四个字的颜色、旋转角和位置（上下略有错落）
// x 故意不是 0/100/200/300：两端的字带旋转，26 宽的外描边会被 viewBox 裁掉，所以首尾各向内收 2~4
const CHARS = [
  { ch: '狗', color: '#FF8A1F', rot: -6, x: 2, y: 16 },
  { ch: '了', color: '#43A047', rot: 4, x: 100, y: 9 },
  { ch: '个', color: '#29B6F6', rot: -3, x: 198, y: 17 },
  { ch: '狗', color: '#F06292', rot: 6, x: 296, y: 10 },
];

// 字标 SVG
export function logoSVG() {
  const body = CHARS.map(({ ch, color, rot, x, y }) => {
    const paths = STROKES[ch].map((d) => `<path d="${d}"/>`).join('');
    return `<g data-char="${ch}" transform="translate(${x} ${y}) rotate(${rot} 50 50)">`
      + `<g stroke="${INK}" stroke-width="26">${paths}</g>`
      + `<g stroke="#FFFFFF" stroke-width="19">${paths}</g>`
      + `<g stroke="${color}" stroke-width="11">${paths}</g>`
      + '</g>';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="狗了个狗" viewBox="0 0 400 130" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
