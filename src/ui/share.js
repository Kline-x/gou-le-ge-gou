// 战绩图：Canvas 绘制 1080×1440 竖版海报；保存优先走 downloads 能力，普通网页再试系统分享，最后 <a download>
import { logoSVG } from '../art/logo.js';
import { dogHeadSVG } from '../art/dogs.js';
import { iconSVG } from '../art/icons.js';

const W = 1080;
const H = 1440;
const FONT = '"PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const INK = '#3B2A1A';

function svgImage(svg) {
  const src = svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('SVG 图片加载失败'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export async function renderShareCard(info) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const won = info.result === 'won';

  ctx.fillStyle = '#A5D66F';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#98CE62';
  for (let y = 60; y < H; y += 120) ctx.fillRect(0, y, W, 60);

  const kinds = Array.from({ length: 6 }, (_, i) => (info.moves * 7 + i * 5) % 16);
  const [logo, dog, ...icons] = await Promise.all([
    svgImage(logoSVG()),
    svgImage(dogHeadSVG(info.breedKey, won ? 'cheer' : 'sad')),
    ...kinds.map((k) => svgImage(iconSVG(k, 128))),
  ]);

  ctx.drawImage(logo, 130, 40, 820, 267);

  ctx.fillStyle = INK;
  roundRect(ctx, 80, 344, 920, 880, 56);
  ctx.fill();
  ctx.fillStyle = '#FFFBF0';
  roundRect(ctx, 80, 330, 920, 880, 56);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = INK;
  ctx.stroke();

  ctx.drawImage(dog, W / 2 - 160, 346, 320, 320);

  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#E8641A' : '#C62828';
  ctx.font = `900 92px ${FONT}`;
  ctx.fillText(won ? '通关成功！' : `还差 ${info.remaining} 张！`, W / 2, 770);
  ctx.fillStyle = '#7A5A34';
  ctx.font = `700 38px ${FONT}`;
  ctx.fillText(`${info.mode === 'daily' ? '今日挑战' : '自由练习'} · ${info.levelName} · ${info.dateKey}`, W / 2, 836);

  const stats = [['用时', fmtTime(info.seconds)], ['拿牌', `${info.moves} 次`], ['道具', `${info.propsUsed} 次`]];
  stats.forEach(([label, value], i) => {
    const x = 130 + i * 280;
    const y = 884;
    ctx.fillStyle = '#FFF1D6';
    roundRect(ctx, x, y, 260, 168, 32);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = '#7A5A34';
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(label, x + 130, y + 58);
    ctx.fillStyle = INK;
    ctx.font = `900 54px ${FONT}`;
    ctx.fillText(value, x + 130, y + 130);
  });

  ctx.fillStyle = INK;
  ctx.font = `800 40px ${FONT}`;
  const line = !info.teamName
    ? '快来选个狗群，一起通关'
    : won && info.key === 'daily2'
      ? `我为${info.teamName}贡献了第 ${info.dogs} 只狗`
      : info.streak > 0 ? `${info.teamName} · 连续打卡 ${info.streak} 天` : `${info.teamName} · 明天再来，汪！`;
  ctx.fillText(line, W / 2, 1136);

  icons.forEach((img, i) => ctx.drawImage(img, 88 + i * 154, 1244, 120, 120));

  ctx.fillStyle = '#2F5D1E';
  ctx.font = `800 36px ${FONT}`;
  ctx.fillText('狗了个狗 · 每天一关，等你来挑战', W / 2, 1412);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('战绩图导出失败');
  return { blob, url: URL.createObjectURL(blob) };
}

export async function saveCard(blob, platform) {
  const filename = `狗了个狗战绩-${Date.now()}.png`;
  if (platform.downloads) {
    try {
      await platform.downloads.save({ filename, data: blob });
      return 'saved';
    } catch (e) {
      return e && e.code === 'declined' ? 'declined' : 'failed';
    }
  }
  // Artifact 沙箱里 <a download> 与 Web Share 都不可用，只能让用户长按图片
  if (platform.inClaude) return 'failed';
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: '狗了个狗' });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'declined';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
