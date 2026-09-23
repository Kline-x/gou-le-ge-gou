# 狗了个狗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一款和《羊了个羊》玩法一致、狗狗主题的三消堆叠网页游戏。产物是零外链的单文件，同时发布为 Claude Artifact 和 GitHub Pages。

**Architecture:**
- 纯逻辑层（`src/core`）：可复现随机数 → 几何布局 → 有解关卡生成 → 对局状态机 → 机器人。不依赖 DOM，由 node:test 覆盖。
- 资源层：
  - `src/art`：只生成 SVG 字符串。
  - `src/audio`：WebAudio 实时合成。
- 表现层（`src/ui`）：
  - 所有牌都放在一个覆盖整屏的 playfield 里，靠 transform 在场上、卡槽、移出区之间移动。
  - 逻辑层返回事件，表现层按事件播放动画。
- 构建：`build.mjs` 把各模块包进闭包，内联成两份产物：`dist/index.html`（完整文档）和 `dist/artifact.html`（Artifact 片段）。

**Tech Stack:** 原生 ES2022 模块、零 npm 依赖、Node ≥ 18（本机 24.14）、node:test、WebAudio、Canvas 2D、SVG。

设计依据：`docs/superpowers/specs/2026-09-23-gou-le-ge-gou-design.md`

> 说明：
> - 代码以仓库文件为准，本计划里的代码是首版。执行中的修正记在交接文档里，不回写本计划。
> - 美术（Task 7）和音频（Task 8）是创作型任务：计划只固定接口、测试和视觉/听觉规格，SVG 路径和合成参数由执行者产出。
> - 其余任务里带 `file=` 标注的代码块，可以用 `tools/extract-plan.mjs` 直接落盘。

## Global Constraints

- 零外链：两份产物里，`src=`、`href=`、`url(...)`、`@import` 都不能指向 `http://` 或 `https://`。不用网络字体，不用外部脚本。
- 零依赖：不引入任何 npm 包；脚本只用 Node 内置模块。
- 模块风格：
  - import 全部写在文件顶部，只用具名导入：`import { a, b } from './x.js';`
  - 导出只用 `export function`、`export const`、`export class` 三种形式。
  - 顶层名字在模块内唯一即可（构建时每个模块各包一个闭包）。
- 分层边界：
  - `src/core/*` 不得引用 `window`、`document`、`localStorage`。
  - `src/art/*` 只返回字符串，不碰 DOM。
  - `src/audio/*` 在没有 AudioContext 的环境（比如 node）里也不能抛错。
- 注释、界面文案、提交信息一律用中文。提交信息结尾加一行：`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 规则常量：
  - 卡槽容量 7；
  - 道具每关各 1 次，包括复活；
  - 连消判定：距上一次消除不超过 3 次拿牌；
  - 覆盖判定：`B.z > A.z && |B.x−A.x| < 1 && |B.y−A.y| < 1`。
- 牌面配色：面 `#FFFBF0`，厚边 `#E2B878`，描边 `#7A5A34`，覆盖遮罩 `rgba(30,43,18,.48)`。
- 图案顺序（kind 0..15）：`bone ball bowl paw poop hydrant duck frisbee house collar sausage drumstick slipper doge melon kibble`
- 犬种顺序：`shiba husky corgi golden teddy tianyuan`；心情：`idle happy worried sad cheer shock`
- 布局：
  - 牌边长 `T` 限制在 36 到 64px；
  - 桌面端游戏区最大宽度 480px；
  - 左右留白至少 16px；
  - 页面不得出现横向滚动。
- 存储：localStorage 的键是 `glgg:v1`，所有读写都包在 try/catch 里。
- 平台能力声明：`{ room: { topics: { win: 'interact' } }, sample: {}, downloads: true }`；只通过 `window.claude?.use?.(name)` 获取，`null` 时隐藏对应功能。
- 震动：点牌 `8`；消除 `[15,30,15]`；失败 `[80,50,120]`。
- 本地预览：`node tools/serve.mjs`（默认端口 5301）；内置浏览器用 `.claude/launch.json` 里的 `gou-le-ge-gou` 配置启动。

---

## File Structure

| 文件 | 职责 |
|---|---|
| `package.json` | `type: module`，scripts：`test`、`build`、`balance`、`serve` |
| `tools/serve.mjs` | 本地静态服务，用于预览产物和资源预览页 |
| `tools/extract-plan.mjs` | 把计划里带 `file=` 标注的代码块写成文件 |
| `src/core/rng.js` | `hashSeed`、`createRng`（mulberry32） |
| `src/core/layout.js` | `buildLayout`（分层图案、对称、配平张数、盲盒堆）、`computeCovers` |
| `src/core/assign.js` | `assignKinds`：模拟拿牌路径分配图案，保证有解；pDig 控制往下挖（执行中从 generator 拆出，避免与 game 循环依赖） |
| `src/core/generator.js` | `LEVELS`、`generateLevel`：多个有解候选里挑机器人最难打的一个 |
| `src/core/game.js` | `createGame`：拿牌、卡槽、消除、胜负、道具、复活、动作日志、回放 |
| `src/core/bot.js` | `greedyMove`、`playOut`，用于平衡模拟和调试自动玩 |
| `tools/balance.mjs` | 各难度通关率模拟 |
| `src/art/icons.js` | 16 种图案的 SVG 和 symbol sprite |
| `src/art/dogs.js` | 6 个犬种 × 6 种心情的狗头 SVG |
| `src/art/logo.js` | 「狗了个狗」手绘笔画字标 |
| `src/audio/audio.js` | 音效、原创 BGM、紧张声部 |
| `tools/art-preview.html`、`tools/audio-preview.html` | 资源预览页 |
| `build.mjs` | 打包出两份产物，并做零外链校验 |
| `src/index.html` | 页面骨架模板，含 `/*@CSS*/` 和 `/*@JS*/` 占位 |
| `src/styles.css` | 设计令牌、昼夜主题、全部组件样式 |
| `src/ui/storage.js` | 存档读写、每日记录、连续打卡 |
| `src/ui/platform.js` | claude.ai 平台能力的渐进增强（room、sample、downloads、hot） |
| `src/ui/fx.js` | Canvas 粒子和彩带 |
| `src/ui/share.js` | 战绩图绘制与保存/分享 |
| `src/ui/board.js` | 牌的 DOM 渲染、排版、飞行动画、输入队列 |
| `src/ui/screens.js` | 首页、各种弹层、新手引导、吉祥物气泡 |
| `src/ui/main.js` | 启动、对局流程、结算、调试接口、hot 快照 |
| `tests/*.test.mjs` | node:test 单元测试 |
| `dist/index.html`、`dist/artifact.html` | 构建产物（入库） |

---

### Task 1: 工程脚手架

**Files:**
- Create: `package.json`
- Create: `tools/serve.mjs`
- Create: `tools/extract-plan.mjs`
- Create: `.claude/launch.json`（已被 gitignore，不入库）

**Interfaces:**
- Produces:
  - `npm test` 执行 `node --test "tests/*.test.mjs"`。
  - `node tools/serve.mjs` 在 `PORT`（默认 5301）上把项目根目录作为静态目录提供；访问 `/` 时跳转到 `/dist/index.html`。
  - `node tools/extract-plan.mjs <plan.md> [--only a,b]` 把带 `file=路径` 标注的代码块写成文件。

- [ ] **Step 1: 写 package.json**

```json file=package.json
{
  "name": "gou-le-ge-gou",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "狗了个狗：狗狗主题的三消堆叠小游戏",
  "scripts": {
    "test": "node --test \"tests/*.test.mjs\"",
    "build": "node build.mjs",
    "balance": "node tools/balance.mjs",
    "serve": "node tools/serve.mjs"
  },
  "engines": { "node": ">=18" }
}
```

- [ ] **Step 2: 写静态服务**

```js file=tools/serve.mjs
// 本地静态服务：预览构建产物与资源预览页（禁用缓存，避免看到旧文件）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5301;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') { res.writeHead(302, { Location: '/dist/index.html' }); res.end(); return; }
  if (url.endsWith('/')) url += 'index.html';
  const file = path.join(ROOT, url);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}).listen(PORT, () => console.log(`狗了个狗本地服务：http://localhost:${PORT}/`));
```

- [ ] **Step 3: 写计划代码提取脚本**

```js file=tools/extract-plan.mjs
// 从实施计划中提取带 file= 标注的代码块并写入文件（同一路径以最后一个代码块为准）
import fs from 'node:fs';
import path from 'node:path';

const [, , planPath, ...rest] = process.argv;
if (!planPath) { console.error('用法：node tools/extract-plan.mjs <plan.md> [--only a,b]'); process.exit(1); }
const onlyIdx = rest.indexOf('--only');
const only = onlyIdx >= 0 ? new Set(rest[onlyIdx + 1].split(',')) : null;

const text = fs.readFileSync(planPath, 'utf8').replace(/\r\n/g, '\n');
const re = /^```[\w-]* file=(\S+)\n([\s\S]*?)^```$/gm;
const files = new Map();
let m;
while ((m = re.exec(text))) files.set(m[1], m[2]);

let n = 0;
for (const [rel, body] of files) {
  if (only && !only.has(rel)) continue;
  const out = path.resolve(rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body);
  console.log('写入', rel);
  n++;
}
console.log(`共写入 ${n} 个文件`);
```

- [ ] **Step 4: 配置内置浏览器预览**

```json file=.claude/launch.json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "gou-le-ge-gou",
      "runtimeExecutable": "node",
      "runtimeArgs": ["E:/code/AI/vibCoding/gou-le-ge-gou/tools/serve.mjs"],
      "port": 5301,
      "autoPort": true
    }
  ]
}
```

- [ ] **Step 5: 验证并提交**

Run: `node tools/extract-plan.mjs docs/superpowers/plans/2026-09-23-gou-le-ge-gou.md --only package.json,tools/serve.mjs,.claude/launch.json && node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'));console.log('ok')"`
Expected: 写入 3 个文件并打印 `ok`

```bash
git add package.json tools/serve.mjs tools/extract-plan.mjs
git commit -m "chore: 工程脚手架（静态服务、计划提取脚本）"
```

---

### Task 7: 美术资源（图案、狗头、字标）

> 创作型任务，交给独立子代理执行。本任务只依赖 Global Constraints，不依赖其他任务。

**Files:**
- Create: `src/art/icons.js`
- Create: `src/art/dogs.js`
- Create: `src/art/logo.js`
- Create: `tools/art-preview.html`
- Test: `tests/art.test.mjs`

**Interfaces:**
- Produces:
  - `ICONS: Array<{ key: string, name: string, color: string, svg: string }>`
    - 长度 16，顺序严格按 Global Constraints 的图案顺序。
    - `svg` 是 viewBox `0 0 64 64` 的内部片段，不含外层 `<svg>`。
  - `iconSymbolsSVG(): string`：一段隐藏的 sprite `<svg ... style="display:none">`，每个图案对应一个 `<symbol id="ic-<key>" viewBox="0 0 64 64">`。
  - `iconSVG(kind: number, size = 64): string`：完整的独立 `<svg>`，用于战绩图和预览。
  - `BREEDS: Array<{ key, name, team, colors }>`
    - `key` 按犬种顺序：`shiba husky corgi golden teddy tianyuan`。
    - `name` 依次为：`柴犬 哈士奇 柯基 金毛 泰迪 田园犬`。
    - `team` 是 `name + '队'`。
  - `MOODS = ['idle','happy','worried','sad','cheer','shock']`
  - `dogHeadSVG(breedKey: string, mood: string): string`：完整 `<svg viewBox="0 0 120 120">`。犬种未知时退回柴犬，心情未知时退回 idle。
  - `logoSVG(): string`：完整的 `<svg role="img" aria-label="狗了个狗" viewBox="0 0 400 130">`。

**视觉规格（必须遵守）：**

- 通用要求：
  - 扁平填色，粗描边（64 画布上 stroke-width 3 左右，`stroke-linejoin="round"`），加一处白色半透明高光。
  - 不用渐变、滤镜、`<text>`、`id` 属性，因为同一个 SVG 会在页面里重复插入。
  - 内容限制在 6 到 58 的安全区内。
  - 缩到 28px 时仍然一眼能认出是什么。
- 图案表：主色必须作为最大面积的填色，外形要互相区分。

| kind | key | 名称 | 主色 | 造型 |
|---|---|---|---|---|
| 0 | bone | 骨头 | `#F6E7C8` | 横放的狗骨头，两端各两个圆头，描边 `#7A5A34` |
| 1 | ball | 网球 | `#CBE33B` | 圆球加两道白色弧线 |
| 2 | bowl | 狗盆 | `#F57C23` | 梯形盆，盆口冒出一堆棕色狗粮颗粒 |
| 3 | paw | 狗爪 | `#5D4037` | 一个大肉掌加四个趾头，掌心有粉色肉垫 `#FF9EB5` |
| 4 | poop | 便便 | `#8D5A3B` | 三层螺旋冰淇淋造型，一双白底黑眼珠，带个小尖顶 |
| 5 | hydrant | 消防栓 | `#E53935` | 圆顶、柱身，两侧有出水口，带底座 |
| 6 | duck | 小黄鸭 | `#FFD43B` | 侧面洗澡鸭，橙色鸭嘴 |
| 7 | frisbee | 飞盘 | `#29B6F6` | 略微倾斜的椭圆盘，带两道同心环，边缘有厚度 |
| 8 | house | 狗窝 | `#26A69A` | 青绿色三角屋顶，木色墙 `#D9A566`，深色拱门 |
| 9 | collar | 项圈 | `#8E44AD` | 紫色圆环加铆钉，下面挂一块金色 `#FFC83D` 骨头形牌子 |
| 10 | sausage | 火腿肠 | `#F06292` | 略弯的长条，两端扎口，带一道高光 |
| 11 | drumstick | 鸡腿 | `#C0662B` | 烤鸡腿，白色骨头从一端伸出，端头是两个小圆 |
| 12 | slipper | 拖鞋 | `#3F6FD8` | 俯视的拖鞋，鞋面一条带，鞋头有一个半圆形咬痕缺口 |
| 13 | doge | 狗头 | `#F2B45A` | 柴犬正脸，白色腮帮和眉点，眯眼斜看的「狗头保命」表情 |
| 14 | melon | 西瓜 | `#43A047` | 半圆形西瓜瓣：绿皮、白边、红瓤 `#EF5350`，带黑籽 |
| 15 | kibble | 狗粮袋 | `#5C6BC0` | 立着的袋子，顶部折边，袋身印白色骨头图标 |

- 狗头（viewBox 为 120）：
  - Q 版大头，两只大眼睛，统一用深棕描边 `#3B2A1A`，线宽约 4。
  - 犬种特征：

    | 犬种 | 毛色 | 特征 |
    |---|---|---|
    | 柴犬 | 橙 `#E8913A` 配奶白 `#FFF1DC` | 立耳，米色眉点 |
    | 哈士奇 | 灰 `#8E9AAF` 配白 | 白色倒三角面罩，蓝眼睛，立耳 |
    | 柯基 | 橙 `#F0A04B` 配白 | 超大立耳，额头一道白纹 |
    | 金毛 | 金 `#E3B04B` | 下垂的耳朵 |
    | 泰迪 | 棕 `#A0673A` | 用一圈小圆组成卷毛轮廓，耳朵也是卷毛 |
    | 田园犬 | 土黄 `#D9A441` 配白下巴 | 立耳，嘴套颜色略深 |

  - 心情：

    | 心情 | 表现 |
    |---|---|
    | idle | 圆眼，微笑 |
    | happy | 眯成 ^ ^，张嘴露舌头 |
    | worried | 八字眉，头侧挂一颗蓝色汗珠 |
    | sad | 下垂的眼睛，挂着泪滴，嘴角向下 |
    | cheer | 星星眼，大笑，脸颊红晕 |
    | shock | 小圆点眼，O 型嘴，头顶三道惊讶线 |

- 字标：
  - 「狗 了 个 狗」四个字全部用圆头粗笔画的 path 拼出，不依赖字体。每个字占一个 100×100 的格子，笔画结构必须能读出这个汉字：
    - 狗 = 犭 + 句
    - 了 = ㇇ + 亅
    - 个 = 人 + 丨
  - 每个笔画叠画三遍：先画深色外描边（`#3B2A1A`，线宽 26），再画白色描边（线宽 19），最后画彩色芯（线宽 11）。
  - 四个字的颜色依次是：`#FF8A1F`、`#43A047`、`#29B6F6`、`#F06292`。
  - 四个字分别旋转 -6°、4°、-3°、6°，上下略有错落。
  - 每个字的 `<g>` 带上 `data-char="狗"` 这样的属性。

- [ ] **Step 1: 写失败的结构测试**

```js file=tests/art.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS, iconSVG, iconSymbolsSVG } from '../src/art/icons.js';
import { BREEDS, MOODS, dogHeadSVG } from '../src/art/dogs.js';
import { logoSVG } from '../src/art/logo.js';

const KEYS = ['bone', 'ball', 'bowl', 'paw', 'poop', 'hydrant', 'duck', 'frisbee', 'house', 'collar', 'sausage', 'drumstick', 'slipper', 'doge', 'melon', 'kibble'];

// 极简良构检查：标签成对闭合、无脚本、无外链（xmlns 命名空间除外）
function assertWellFormed(svg, label) {
  assert.equal(typeof svg, 'string', label);
  assert.ok(!/<script|javascript:|on\w+=/i.test(svg), `${label} 含脚本`);
  assert.ok(!/https?:\/\/(?!www\.w3\.org\/)/i.test(svg), `${label} 含外链`);
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, closing, name, , selfClose] = m;
    if (closing) assert.equal(stack.pop(), name, `${label} 标签不配对：${name}`);
    else if (!selfClose) stack.push(name);
  }
  assert.equal(stack.length, 0, `${label} 有未闭合标签：${stack.join(',')}`);
}

test('16 种图案：顺序、名称、主色唯一', () => {
  assert.equal(ICONS.length, 16);
  assert.deepEqual(ICONS.map((i) => i.key), KEYS);
  for (const icon of ICONS) {
    assert.ok(/^[\u4e00-\u9fa5]{1,4}$/.test(icon.name), `名称不合法：${icon.name}`);
    assert.ok(/^#[0-9A-F]{6}$/i.test(icon.color), `主色不合法：${icon.color}`);
  }
  assert.equal(new Set(ICONS.map((i) => i.color.toUpperCase())).size, 16, '主色必须互不相同');
});

test('图案片段良构且不含 id', () => {
  for (const icon of ICONS) {
    assertWellFormed(`<g>${icon.svg}</g>`, icon.key);
    assert.ok(!/\sid=/.test(icon.svg), `${icon.key} 不得包含 id 属性`);
    assert.ok(icon.svg.includes(icon.color) || icon.svg.includes(icon.color.toLowerCase()), `${icon.key} 未使用主色`);
  }
});

test('iconSVG 与 sprite', () => {
  for (let k = 0; k < 16; k++) {
    const s = iconSVG(k, 32);
    assert.ok(s.startsWith('<svg'), `iconSVG(${k}) 应以 <svg 开头`);
    assert.ok(s.includes('viewBox="0 0 64 64"'));
    assert.ok(s.includes('width="32"'));
    assertWellFormed(s, `iconSVG(${k})`);
  }
  const sprite = iconSymbolsSVG();
  assertWellFormed(sprite, 'sprite');
  for (const key of KEYS) assert.ok(sprite.includes(`<symbol id="ic-${key}"`), `sprite 缺少 ${key}`);
});

test('6 个犬种 × 6 种心情的狗头', () => {
  assert.deepEqual(BREEDS.map((b) => b.key), ['shiba', 'husky', 'corgi', 'golden', 'teddy', 'tianyuan']);
  assert.deepEqual(BREEDS.map((b) => b.name), ['柴犬', '哈士奇', '柯基', '金毛', '泰迪', '田园犬']);
  for (const b of BREEDS) assert.equal(b.team, b.name + '队');
  assert.deepEqual(MOODS, ['idle', 'happy', 'worried', 'sad', 'cheer', 'shock']);
  for (const b of BREEDS) {
    const seen = new Set();
    for (const mood of MOODS) {
      const s = dogHeadSVG(b.key, mood);
      assert.ok(s.startsWith('<svg') && s.includes('viewBox="0 0 120 120"'), `${b.key}/${mood}`);
      assertWellFormed(s, `${b.key}/${mood}`);
      assert.ok(!/\sid=/.test(s), `${b.key}/${mood} 不得包含 id`);
      seen.add(s);
    }
    assert.equal(seen.size, MOODS.length, `${b.key} 的 6 种心情必须各不相同`);
  }
  assert.equal(dogHeadSVG('unknown', 'nope'), dogHeadSVG('shiba', 'idle'), '未知参数应退回柴犬 idle');
});

test('字标', () => {
  const s = logoSVG();
  assertWellFormed(s, 'logo');
  assert.ok(s.includes('aria-label="狗了个狗"') && s.includes('role="img"'));
  assert.equal((s.match(/data-char="狗"/g) || []).length, 2);
  assert.equal((s.match(/data-char="了"/g) || []).length, 1);
  assert.equal((s.match(/data-char="个"/g) || []).length, 1);
  assert.ok(!/<text/.test(s), '字标不得依赖字体');
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/art.test.mjs`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现三个模块**

`src/art/icons.js` 的骨架（ICONS 里 16 个 `svg` 片段由执行者按视觉规格手绘）：

```js
// 16 种狗狗主题图案（viewBox 0 0 64 64 的内部片段）
export const ICONS = [
  { key: 'bone', name: '骨头', color: '#F6E7C8', svg: '…' },
  // …共 16 项，顺序与 Global Constraints 一致
];

// 页面内复用的 symbol sprite（牌面用 <use href="#ic-key"> 引用）
export function iconSymbolsSVG() {
  const symbols = ICONS.map((i) => `<symbol id="ic-${i.key}" viewBox="0 0 64 64">${i.svg}</symbol>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:none">${symbols}</svg>`;
}

// 独立完整 SVG（战绩图、预览页用）
export function iconSVG(kind, size = 64) {
  const i = ICONS[kind] || ICONS[0];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">${i.svg}</svg>`;
}
```

`src/art/dogs.js`：
- 用参数化方式拼装：每个犬种给出耳朵、脸型、面罩和花纹的片段函数，心情给出眼睛、嘴、眉毛和附加元素（汗珠、泪滴、红晕、惊讶线）。
- 统一输出 `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">…</svg>`。

`src/art/logo.js`：
- 用 `const STROKES = { '狗': [...paths], '了': [...], '个': [...] }` 定义每个字的笔画 path（100×100 坐标）。
- `logoSVG()` 按三遍叠画、颜色、旋转和错落规则输出。

- [ ] **Step 4: 写资源预览页**

`tools/art-preview.html`：
- 用 `<script type="module">` 从 `../src/art/*.js` 导入。
- 16 个图案，每个都放在牌面样式上（牌面样式按 Global Constraints 的配色），分别画 64px 和 28px 两种尺寸。
- 36 个狗头，按 6 行 × 6 列排列。
- 字标，分别放在浅色和深色背景上。
- 页面通过 `node tools/serve.mjs` 访问：`http://localhost:5301/tools/art-preview.html`。

- [ ] **Step 5: 运行测试，确认通过**

Run: `node --test tests/art.test.mjs`
Expected: PASS（5 个测试）

- [ ] **Step 6: 目视检查**

- 在浏览器里打开预览页，截图检查：28px 下 16 个图案都能互相区分，狗头的表情能看出来，字标能读成「狗了个狗」。
- 有问题就修改后再看一次。

- [ ] **Step 7: 提交**

```bash
git add src/art tests/art.test.mjs tools/art-preview.html
git commit -m "feat: 狗狗图案、犬种头像与手绘字标"
```

---

### Task 8: 音频引擎（音效 + 原创 BGM）

> 创作型任务，交给独立子代理执行。本任务只依赖 Global Constraints，不依赖其他任务。

**Files:**
- Create: `src/audio/audio.js`
- Create: `tools/audio-preview.html`
- Test: `tests/audio.test.mjs`

**Interfaces:**
- Produces:
  - `SFX_NAMES`：只读数组，内容为 `['tap','place','match','woof','moveOut','undo','shuffle','warn','deny','win','lose','revive','button']`
  - `SONG`：`{ bpm: 128, bars: 16, stepsPerBar: 16, lead: Array<{step, pitch, len}>, bass: Array<{step, pitch, len}>, drums: Array<{step, type: 'kick'|'snare'|'hat'}> }`
    - `pitch` 用 MIDI 音高，`step` 是全曲第几个十六分音符。
    - 旋律和贝斯只能用 C 大调五声音阶（C D E G A）。
  - `createAudio()` 返回一个对象，包含：
    - `unlock(): void`：首次用户手势时调用，创建并恢复 AudioContext；重复调用没有副作用。
    - `setMusic(on: boolean)`、`setSfx(on: boolean)`：开关音乐和音效。
    - `play(name: string, opts?: { combo?: number, variant?: number }): void`：播放音效。
    - `startMusic()`、`stopMusic()`：开始和停止背景音乐。
    - `setTension(level: number /* 0..1 */)`：控制紧张声部的强度。

**听觉规格（必须遵守）：**

- 结构与生命周期：
  - 总线结构：master → musicBus、sfxBus；master 增益 0.8；音乐默认 0.35，音效默认 0.9。
  - 解锁之前调用 `play` 或 `startMusic` 一律静默忽略，不排队。
  - 环境里没有 AudioContext 时（比如 node），返回一个所有方法都是空函数的对象。
  - `visibilitychange` 切到 hidden 时暂停 context，回到可见时恢复。只有在已解锁、并且存在 `document` 时才绑定这个监听。
- 调度：音乐用前瞻调度器，每 25ms 检查一次，提前 0.12s 排程。`stopMusic` 需要在 0.2s 内淡出。
- 乐器：
  - 主旋律：triangle 和 square 按 7:3 混合，短促的拨弦包络（起音 5ms，衰减 180ms）。
  - 贝斯：square 波，经过 800Hz 低通滤波。
  - 鼓：
    - kick：正弦波，频率从 150Hz 在 0.12s 内滑到 45Hz。
    - snare：白噪声经过 1800Hz 带通，时长 0.12s。
    - hat：白噪声经过 7000Hz 高通，时长 0.04s。
- 旋律要原创、欢快、有记忆点，用 AABA 的 16 小节结构，不得抄袭任何现有歌曲。
- 紧张声部：`setTension(t)` 把一层「十六分音符踩镲 + 八度贝斯脉冲」的增益平滑过渡到 `0.5*t`。
- 音效：

  | 名称 | 声音 |
  |---|---|
  | tap | 短促的「啵」，正弦波 880→660Hz，40ms |
  | place | 木头轻敲声，三角波 300Hz 叠加带通噪声，60ms |
  | match | 三音上行琶音；`combo` 每加 1，整体升 2 个半音，最多升 12 |
  | woof | 狗叫：锯齿波，基频先滑升再滑落，经过 600Hz 和 1200Hz 两个共振峰带通，叠一点噪声，时长 150ms。三种变体：0 中型犬 350Hz；1 小型犬 600Hz；2 大型犬 200Hz 连叫两声 |
  | moveOut | 上扬的嗖声：噪声扫频加正弦上滑 |
  | undo | 倒带声：正弦波 800→300Hz 下滑，同时加颤音 |
  | shuffle | 洗牌沙沙声：连续 6 个短噪声颗粒 |
  | warn | 心跳声：两个低频的咚 |
  | deny | 闷响：正弦波 120Hz，80ms |
  | win | 大三和弦号角加一段上行音阶，再接 woof 变体 1 |
  | lose | 悲伤的长号：锯齿波加低通，G→F#→F→E 下行，最后一个音拖长，再接一声呜咽（正弦波 700→400Hz 滑落） |
  | revive | 魔法闪光：高音五声音阶快速上行，带颤音 |
  | button | 很轻的点击声 |

- [ ] **Step 1: 写失败的测试**

```js file=tests/audio.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, SFX_NAMES, SONG } from '../src/audio/audio.js';

test('无 AudioContext 的环境下可以安全创建与调用', () => {
  const a = createAudio();
  for (const f of ['unlock', 'setMusic', 'setSfx', 'play', 'startMusic', 'stopMusic', 'setTension']) {
    assert.equal(typeof a[f], 'function', `缺少方法 ${f}`);
  }
  assert.doesNotThrow(() => {
    a.unlock();
    for (const n of SFX_NAMES) a.play(n, { combo: 3, variant: 2 });
    a.startMusic();
    a.setTension(1);
    a.stopMusic();
    a.setMusic(false);
    a.setSfx(false);
  });
});

test('音效清单完整', () => {
  assert.deepEqual([...SFX_NAMES].sort(), ['button', 'deny', 'lose', 'match', 'moveOut', 'place', 'revive', 'shuffle', 'tap', 'undo', 'warn', 'win', 'woof'].sort());
});

test('原创曲谱：16 小节、五声音阶、音符不越界', () => {
  assert.equal(SONG.bpm, 128);
  assert.equal(SONG.bars, 16);
  assert.equal(SONG.stepsPerBar, 16);
  const total = SONG.bars * SONG.stepsPerBar;
  const penta = new Set([0, 2, 4, 7, 9]);
  for (const part of ['lead', 'bass']) {
    assert.ok(SONG[part].length > 16, `${part} 音符太少`);
    for (const n of SONG[part]) {
      assert.ok(penta.has(((n.pitch % 12) + 12) % 12), `${part} 出现非五声音阶音：${n.pitch}`);
      assert.ok(n.step >= 0 && n.step + n.len <= total, `${part} 音符越界：${n.step}`);
    }
  }
  assert.ok(SONG.drums.every((d) => ['kick', 'snare', 'hat'].includes(d.type)));
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/audio.test.mjs`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/audio/audio.js`**

骨架（合成细节由执行者按听觉规格实现）：

```js
// WebAudio 实时合成：音效 + 原创 BGM + 紧张声部；无 AudioContext 时全部静默
export const SFX_NAMES = Object.freeze(['tap', 'place', 'match', 'woof', 'moveOut', 'undo', 'shuffle', 'warn', 'deny', 'win', 'lose', 'revive', 'button']);

export const SONG = { bpm: 128, bars: 16, stepsPerBar: 16, lead: [/* … */], bass: [/* … */], drums: [/* … */] };

export function createAudio() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  const noop = () => {};
  if (!AC) return { unlock: noop, setMusic: noop, setSfx: noop, play: noop, startMusic: noop, stopMusic: noop, setTension: noop };
  // … 懒创建 context、总线、噪声缓冲、调度器、各音效实现
}
```

- [ ] **Step 4: 写试听页**

`tools/audio-preview.html`：
- 每个音效一个按钮（match 附带 combo 选择，woof 附带 variant 选择）。
- 提供音乐开关和紧张度滑块。
- 首次点击任意按钮时调用 `unlock()`。

- [ ] **Step 5: 运行测试，确认通过**

Run: `node --test tests/audio.test.mjs`
Expected: PASS（3 个测试）

- [ ] **Step 6: 浏览器冒烟检查**

打开 `http://localhost:5301/tools/audio-preview.html`，依次点击所有按钮、开关音乐、拖动紧张度，控制台必须零报错。

- [ ] **Step 7: 提交**

```bash
git add src/audio tests/audio.test.mjs tools/audio-preview.html
git commit -m "feat: WebAudio 音效与原创背景音乐"
```

---

### Task 2: 可复现随机数

**Files:**
- Create: `src/core/rng.js`
- Test: `tests/rng.test.mjs`

**Interfaces:**
- Produces:
  - `hashSeed(str: string): number`，返回 uint32，算法用 xmur3 变体。
  - `createRng(seed: number): Rng`，其中 `Rng` 包含：
    - `next(): number`，返回 [0,1)
    - `int(n): number`，返回 [0,n) 的整数
    - `pick(arr)`
    - `shuffle(arr)`：原地 Fisher-Yates，并返回同一个数组
    - `fork(label): Rng`：先消耗父流的一个值，再和 label 一起派生出子流

- [ ] **Step 1: 写失败的测试**

```js file=tests/rng.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSeed, createRng } from '../src/core/rng.js';

test('hashSeed 稳定、区分输入、落在 uint32', () => {
  assert.equal(hashSeed('dog-2026-09-23'), hashSeed('dog-2026-09-23'));
  assert.notEqual(hashSeed('dog-2026-09-23'), hashSeed('dog-2026-09-24'));
  const h = hashSeed('abc');
  assert.ok(Number.isInteger(h) && h >= 0 && h < 2 ** 32);
});

test('同种子序列可复现，不同种子不同', () => {
  const a = createRng(42);
  const b = createRng(42);
  const c = createRng(43);
  const sa = Array.from({ length: 20 }, () => a.next());
  const sb = Array.from({ length: 20 }, () => b.next());
  const sc = Array.from({ length: 20 }, () => c.next());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
});

test('int / pick / shuffle', () => {
  const r = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = r.int(5);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 5);
  }
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...arr];
  const s = r.shuffle(copy);
  assert.equal(s, copy, 'shuffle 应原地打乱并返回同一数组');
  assert.deepEqual([...s].sort((x, y) => x - y), arr);
  assert.ok(arr.includes(r.pick(arr)));
});

test('fork 派生的子流可复现且因 label 而异', () => {
  const a = createRng(99).fork('layout');
  const b = createRng(99).fork('layout');
  const c = createRng(99).fork('kinds');
  const sa = [a.next(), a.next()];
  assert.deepEqual(sa, [b.next(), b.next()]);
  assert.notDeepEqual(sa, [c.next(), c.next()]);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/rng.test.mjs`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 实现**

```js file=src/core/rng.js
// 可复现随机数：xmur3 字符串哈希 + mulberry32 生成器（同种子同序列，便于每日同关与回放）

export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n) => Math.floor(next() * n);
  return {
    next,
    int,
    pick: (arr) => arr[int(arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    fork: (label) => createRng(hashSeed(`${label}:${Math.floor(next() * 4294967296)}`)),
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/rng.test.mjs`
Expected: PASS（4 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/core/rng.js tests/rng.test.mjs
git commit -m "feat: 可复现随机数（xmur3 + mulberry32）"
```

---

### Task 3: 几何布局与覆盖关系

**Files:**
- Create: `src/core/layout.js`
- Test: `tests/layout.test.mjs`

**Interfaces:**
- Consumes: Task 2 的 `Rng`（只用 `next/int/pick/shuffle`）
- Produces:
  - `buildLayout(cfg, rng): Array<{x, y, z, group}>`
    - `cfg` 字段：`{ cols, rows, layers, stackSize, total, taper, shrink, baseInset, patterns? }`
    - 返回的张数恰好等于 `total`，其中场上 `total − 2×stackSize` 张，左右盲盒堆各 `stackSize` 张。
  - `computeCovers(tiles): { coveredBy: number[][], covers: number[][] }`
    - 下标就是 tiles 数组的下标。
    - `coveredBy[i]` 是所有压在 i 上面的牌，`covers[j]` 是 j 压住的所有牌。
  - 常量：
    - `STACK_STEP = 0.06`：盲盒堆每张牌的 x 偏移。
    - `STACK_GAP = 0.35`：盲盒堆与场地底边的距离，盲盒堆的 `y = rows + STACK_GAP`。
    - 左堆的 `x = i×STACK_STEP`，右堆的 `x = cols−1−i×STACK_STEP`，两堆的 `z` 都等于 `i`。

- [ ] **Step 1: 写失败的测试**

```js file=tests/layout.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { buildLayout, computeCovers, STACK_GAP } from '../src/core/layout.js';

const CFGS = [
  { cols: 7, rows: 8, layers: 3, stackSize: 0, total: 18, taper: 0, shrink: 0, baseInset: 2 },
  { cols: 7, rows: 8, layers: 7, stackSize: 6, total: 90, taper: 0.15, shrink: 0.3, baseInset: 0 },
  { cols: 7, rows: 8, layers: 12, stackSize: 12, total: 180, taper: 0.12, shrink: 0.2, baseInset: 0 },
];

test('张数精确、坐标合法、同层不重叠', () => {
  for (const cfg of CFGS) {
    for (let s = 0; s < 30; s++) {
      const tiles = buildLayout(cfg, createRng(1000 + s));
      assert.equal(tiles.length, cfg.total);
      const main = tiles.filter((t) => t.group === 'main');
      assert.equal(main.length, cfg.total - 2 * cfg.stackSize);
      assert.equal(tiles.filter((t) => t.group === 'stackL').length, cfg.stackSize);
      assert.equal(tiles.filter((t) => t.group === 'stackR').length, cfg.stackSize);
      for (const t of main) {
        assert.ok(t.x >= 0 && t.x + 1 <= cfg.cols && t.y >= 0 && t.y + 1 <= cfg.rows, `越界 ${JSON.stringify(t)}`);
        assert.ok(Number.isInteger(t.x * 2) && Number.isInteger(t.y * 2), '坐标必须是 0.5 的倍数');
        assert.ok(t.z >= 0 && t.z < cfg.layers);
      }
      for (let i = 0; i < main.length; i++) {
        for (let j = i + 1; j < main.length; j++) {
          const a = main[i];
          const b = main[j];
          if (a.z === b.z) assert.ok(Math.abs(a.x - b.x) >= 1 || Math.abs(a.y - b.y) >= 1, '同层重叠');
        }
      }
      for (const t of tiles.filter((x) => x.group !== 'main')) assert.equal(t.y, cfg.rows + STACK_GAP);
    }
  }
});

test('同种子布局完全一致', () => {
  const a = buildLayout(CFGS[2], createRng(5));
  const b = buildLayout(CFGS[2], createRng(5));
  assert.deepEqual(a, b);
});

test('多层结构：每层都有牌，底层不少于顶层', () => {
  const cfg = CFGS[2];
  const tiles = buildLayout(cfg, createRng(77));
  const perLayer = Array.from({ length: cfg.layers }, (_, z) => tiles.filter((t) => t.group === 'main' && t.z === z).length);
  for (const n of perLayer) assert.ok(n > 0, `存在空层：${perLayer}`);
  assert.ok(perLayer[0] >= perLayer[cfg.layers - 1]);
});

test('computeCovers：重叠且更高才算压住，擦边不算', () => {
  const tiles = [
    { x: 0, y: 0, z: 0 },
    { x: 0.5, y: 0.5, z: 1 },
    { x: 1, y: 0, z: 1 },
    { x: 0, y: 0, z: 2 },
  ];
  const { coveredBy, covers } = computeCovers(tiles);
  assert.deepEqual(coveredBy[0], [1, 3]);
  assert.deepEqual(coveredBy[1], [3]);
  assert.deepEqual(coveredBy[2], []);
  assert.deepEqual(coveredBy[3], []);
  assert.deepEqual(covers[3], [0, 1]);
});

test('盲盒堆只有最上面一张空闲', () => {
  const cfg = CFGS[1];
  const tiles = buildLayout(cfg, createRng(9));
  const { coveredBy } = computeCovers(tiles);
  for (const group of ['stackL', 'stackR']) {
    const ids = tiles.map((t, i) => i).filter((i) => tiles[i].group === group);
    const free = ids.filter((i) => coveredBy[i].length === 0);
    assert.equal(free.length, 1);
    assert.equal(tiles[free[0]].z, cfg.stackSize - 1);
  }
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/layout.test.mjs`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 实现**

```js file=src/core/layout.js
// 几何布局：逐层生成左右对称的图案并配平张数，再加两侧盲盒堆；只产出坐标，不含图案
const EPS = 1e-6;
const OFFSETS = [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]];

export const PATTERNS = ['slab', 'checker', 'holes', 'ring', 'cross', 'stripesV', 'stripesH'];
export const STACK_STEP = 0.06;
export const STACK_GAP = 0.35;

// 左右对称的图案掩码：只计算左半边（含中轴列），再镜像到右半边
export function patternMask(type, w, h, rng, density = 0.5) {
  const half = Math.ceil(w / 2);
  const mask = Array.from({ length: h }, () => new Array(w).fill(false));
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < half; c++) {
      let on;
      switch (type) {
        case 'slab': on = true; break;
        case 'checker': on = (r + c) % 2 === 0; break;
        case 'holes': on = !(r % 2 === 1 && c % 2 === 1); break;
        case 'ring': on = r === 0 || r === h - 1 || c === 0; break;
        case 'cross': on = Math.abs(r - (h - 1) / 2) < 1 || c === half - 1; break;
        case 'stripesV': on = c % 2 === 0; break;
        case 'stripesH': on = r % 2 === 0; break;
        default: on = rng.next() < density;
      }
      mask[r][c] = on;
      mask[r][w - 1 - c] = on;
    }
  }
  return mask;
}

function countOn(mask) {
  let n = 0;
  for (const row of mask) for (const v of row) if (v) n++;
  return n;
}

// 每层可用区域：越往上向中心收缩；偏移 0.5 时少放一列/一行，保证左右对称
function region(cfg, z, ox, oy) {
  const { cols, rows, baseInset = 0, shrink = 0.25 } = cfg;
  const maxInset = Math.floor((Math.min(cols, rows) - 2) / 2);
  const inset = Math.min(baseInset + Math.floor(z * shrink), maxInset);
  return {
    x0: inset + ox,
    y0: inset + oy,
    w: Math.floor(cols - 2 * inset - ox + EPS),
    h: Math.floor(rows - 2 * inset - oy + EPS),
  };
}

// 各层目标张数：底层多、顶层少（taper 控制坡度），总和恰为 boardTarget
function layerTargets(boardTarget, layers, taper) {
  const weights = Array.from({ length: layers }, (_, z) => 1 + taper * (layers - 1 - z));
  const sum = weights.reduce((a, b) => a + b, 0);
  const targets = weights.map((w) => Math.floor((boardTarget * w) / sum));
  let rest = boardTarget - targets.reduce((a, b) => a + b, 0);
  for (let z = 0; rest > 0; z = (z + 1) % layers, rest--) targets[z]++;
  return targets;
}

// 用对称单元（镜像两格一组，中轴列一格一组）把掩码增删到恰好 target 格
function adjustMask(mask, target, rng) {
  const h = mask.length;
  const w = mask[0].length;
  let n = countOn(mask);
  const units = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < Math.ceil(w / 2); c++) units.push({ r, c, m: w - 1 - c, size: c === w - 1 - c ? 1 : 2 });
  }
  rng.shuffle(units);
  for (const u of units) {
    if (n === target) break;
    const on = mask[u.r][u.c];
    if (n > target && on && (u.size === 1 || n - target >= 2)) {
      mask[u.r][u.c] = false; mask[u.r][u.m] = false; n -= u.size;
    } else if (n < target && !on && (u.size === 1 || target - n >= 2)) {
      mask[u.r][u.c] = true; mask[u.r][u.m] = true; n += u.size;
    }
  }
  // 偶数宽度没有中轴列时可能还差 1 格：单独翻转一格（牺牲一处对称）
  for (let r = 0; r < h && n !== target; r++) {
    for (let c = 0; c < w && n !== target; c++) {
      if (n > target && mask[r][c]) { mask[r][c] = false; n--; }
      else if (n < target && !mask[r][c]) { mask[r][c] = true; n++; }
    }
  }
}

// 选一个自然张数接近目标的结构化图案（±35%），没有就用随机密度图案，然后配平
function pickCells(spec, target, rng, patterns) {
  const { w, h } = spec;
  const options = [];
  for (const type of patterns) {
    const mask = patternMask(type, w, h, rng);
    const n = countOn(mask);
    if (n > 0 && Math.abs(n - target) <= Math.max(2, target * 0.35)) options.push(mask);
  }
  const mask = options.length ? rng.pick(options) : patternMask('random', w, h, rng, target / (w * h));
  adjustMask(mask, target, rng);
  const cells = [];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (mask[r][c]) cells.push({ r, c });
  return cells;
}

export function buildLayout(cfg, rng) {
  const { cols, rows, layers, stackSize = 0, total, taper = 0.1, patterns = PATTERNS } = cfg;
  const boardTarget = total - 2 * stackSize;
  if (boardTarget < 1) throw new Error('布局张数不足');
  const targets = layerTargets(boardTarget, layers, taper);

  // 先定每层的偏移与区域（相邻层偏移必不同，形成半张错位）
  const specs = [];
  let prev = -1;
  for (let z = 0; z < layers; z++) {
    let oi = rng.int(4);
    if (oi === prev) oi = (oi + 1 + rng.int(3)) % 4;
    prev = oi;
    const [ox, oy] = OFFSETS[oi];
    const reg = region(cfg, z, ox, oy);
    specs.push({ z, ...reg, cap: reg.w * reg.h });
  }

  // 容量不足的层把缺口转给有余量的层（从底层往上找）
  let overflow = 0;
  specs.forEach((s, z) => {
    if (targets[z] > s.cap) { overflow += targets[z] - s.cap; targets[z] = s.cap; }
  });
  for (let z = 0; overflow > 0 && z < layers; z++) {
    const add = Math.min(overflow, specs[z].cap - targets[z]);
    targets[z] += add;
    overflow -= add;
  }
  if (overflow > 0) throw new Error('布局容量不足，请减少张数或增加层数');

  const tiles = [];
  for (const s of specs) {
    for (const { r, c } of pickCells(s, targets[s.z], rng, patterns)) {
      tiles.push({ x: s.x0 + c, y: s.y0 + r, z: s.z, group: 'main' });
    }
  }
  for (let i = 0; i < stackSize; i++) {
    tiles.push({ x: i * STACK_STEP, y: rows + STACK_GAP, z: i, group: 'stackL' });
    tiles.push({ x: cols - 1 - i * STACK_STEP, y: rows + STACK_GAP, z: i, group: 'stackR' });
  }
  return tiles;
}

// 覆盖关系：B 比 A 高且两者在 x、y 上都有正面积重叠，则 B 压住 A
export function computeCovers(tiles) {
  const n = tiles.length;
  const coveredBy = Array.from({ length: n }, () => []);
  const covers = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const a = tiles[i];
    for (let j = 0; j < n; j++) {
      const b = tiles[j];
      if (b.z > a.z && Math.abs(b.x - a.x) < 1 - EPS && Math.abs(b.y - a.y) < 1 - EPS) {
        coveredBy[i].push(j);
        covers[j].push(i);
      }
    }
  }
  return { coveredBy, covers };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/layout.test.mjs`
Expected: PASS（5 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/core/layout.js tests/layout.test.mjs
git commit -m "feat: 分层对称布局与覆盖关系计算"
```

---

### Task 4: 有解关卡生成

**Files:**
- Create: `src/core/generator.js`
- Test: `tests/generator.test.mjs`

**Interfaces:**
- Consumes：
  - Task 2 的 `hashSeed`、`createRng`
  - Task 3 的 `buildLayout`、`computeCovers`
- Produces:
  - `ICON_COUNT = 16`
  - `LEVELS`：`Record<key, { name, kinds, perKind, cols, rows, layers, stackSize, taper, shrink, baseInset, kOpen, pContinue, solvable }>`，`key` 取值为 `daily1 | daily2 | easy | normal | hard | hell`。
  - `generateLevel(key, seedStr): Level`，其中 `Level` 的结构是：

    ```
    { key, name, seedStr, seed, cols, rows,
      tiles: Array<{id, x, y, z, group, kind}>,
      kinds: number[],
      solution: number[] | null }
    ```

    - `seed = hashSeed(key + '|' + seedStr)`
    - `tiles[i].id === i`
    - `solution` 是按顺序拿牌的 id 序列；关卡不保证有解时为 `null`。
  - `assignKinds(opts): { kinds: number[], path: number[] } | null`，`opts` 的字段：
    - `n`：待分配的场上牌数，本地下标为 0..n−1。
    - `coveredBy`：本地下标表示的覆盖关系。
    - `quota`：`Map<kind, count>`，场上牌的图案配额，总和等于 `n`。
    - `kOpen`、`pContinue`：控制难度。
    - `rng`
    - `initialSlot`：`kind[]`，真实卡槽的初始内容。
    - `fixed`：`kind[][]`，移出区 3 列，每列从底到顶排列。
    - `maxTries`：失败重试次数。

    `path` 只包含场上牌的本地下标。

- [ ] **Step 1: 写失败的测试**

```js file=tests/generator.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { computeCovers } from '../src/core/layout.js';
import { LEVELS, generateLevel, assignKinds } from '../src/core/generator.js';

// 独立校验解路径：每步拿的牌都空闲、卡槽（消除后）不超过 6 张、最后清空
function verifyPath(level) {
  const { tiles, solution } = level;
  const { coveredBy } = computeCovers(tiles);
  assert.equal(solution.length, tiles.length, '解路径必须覆盖全部牌');
  assert.equal(new Set(solution).size, tiles.length, '解路径不得重复');
  const gone = new Set();
  const slot = new Map();
  let occ = 0;
  let maxOcc = 0;
  for (const id of solution) {
    assert.ok(coveredBy[id].every((j) => gone.has(j)), `拿了被压住的牌 ${id}`);
    gone.add(id);
    const k = tiles[id].kind;
    const c = (slot.get(k) || 0) + 1;
    if (c === 3) { slot.delete(k); occ -= 2; } else { slot.set(k, c); occ++; }
    maxOcc = Math.max(maxOcc, occ);
    assert.ok(occ <= 6, `卡槽超过 6 张：${occ}`);
  }
  assert.equal(occ, 0, '结束时卡槽应为空');
  return maxOcc;
}

test('有解关卡：解路径合法、卡槽不超 6 张', () => {
  for (const key of ['daily1', 'easy', 'normal', 'hard', 'daily2']) {
    const n = key === 'daily1' ? 30 : 60;
    for (let s = 0; s < n; s++) verifyPath(generateLevel(key, `t-${s}`));
  }
});

test('图案配额：每种图案张数 = perKind，种类数 = kinds', () => {
  for (const key of Object.keys(LEVELS)) {
    const cfg = LEVELS[key];
    const level = generateLevel(key, 'quota');
    assert.equal(level.tiles.length, cfg.kinds * cfg.perKind);
    const count = new Map();
    for (const t of level.tiles) count.set(t.kind, (count.get(t.kind) || 0) + 1);
    assert.equal(count.size, cfg.kinds);
    for (const [k, c] of count) {
      assert.ok(Number.isInteger(k) && k >= 0 && k < 16);
      assert.equal(c, cfg.perKind);
    }
    level.tiles.forEach((t, i) => assert.equal(t.id, i));
  }
});

test('同 key 同种子完全一致；原味地狱没有解路径', () => {
  assert.deepEqual(generateLevel('daily2', 'dog-2026-09-23'), generateLevel('daily2', 'dog-2026-09-23'));
  assert.notDeepEqual(generateLevel('daily2', 'dog-2026-09-23').tiles, generateLevel('daily2', 'dog-2026-09-24').tiles);
  assert.equal(generateLevel('hell', 'x').solution, null);
});

test('教学关只有 3 种图案', () => {
  assert.equal(generateLevel('daily1', 'd').kinds.length, 3);
});

test('assignKinds：带初始卡槽与移出区时守恒且可行', () => {
  const quota = new Map([[0, 2], [1, 3], [2, 1]]);
  const res = assignKinds({
    n: 6, coveredBy: [[], [], [], [], [], []], quota, kOpen: 3, pContinue: 0.5,
    rng: createRng(3), initialSlot: [0], fixed: [[2, 2], [], []], maxTries: 30,
  });
  assert.ok(res, '应当能找到分配');
  const count = new Map();
  for (const k of res.kinds) count.set(k, (count.get(k) || 0) + 1);
  assert.deepEqual([...count.entries()].sort(), [[0, 2], [1, 3], [2, 1]]);
});

test('assignKinds：卡槽已是 6 张各不相同的单张时判定无解', () => {
  const quota = new Map([0, 1, 2, 3, 4, 5].map((k) => [k, 2]));
  const res = assignKinds({
    n: 12, coveredBy: Array.from({ length: 12 }, () => []), quota, kOpen: 3, pContinue: 0.5,
    rng: createRng(1), initialSlot: [0, 1, 2, 3, 4, 5], fixed: [[], [], []], maxTries: 5,
  });
  assert.equal(res, null);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/generator.test.mjs`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 实现**

```js file=src/core/generator.js
// 关卡生成：几何布局 + 沿模拟拿牌路径分配图案，保证至少存在一条不用道具的解
import { hashSeed, createRng } from './rng.js';
import { buildLayout, computeCovers } from './layout.js';

export const ICON_COUNT = 16;

// 难度参数（初值由 tools/balance.mjs 校准）
export const LEVELS = {
  daily1: { name: '第 1 关', kinds: 3, perKind: 6, cols: 7, rows: 8, layers: 3, stackSize: 0, taper: 0, shrink: 0, baseInset: 2, kOpen: 1, pContinue: 1, solvable: true },
  daily2: { name: '第 2 关', kinds: 15, perKind: 12, cols: 7, rows: 8, layers: 12, stackSize: 12, taper: 0.12, shrink: 0.2, baseInset: 0, kOpen: 3, pContinue: 0.35, solvable: true },
  easy: { name: '简单', kinds: 6, perKind: 6, cols: 7, rows: 8, layers: 4, stackSize: 0, taper: 0.2, shrink: 0.5, baseInset: 1, kOpen: 2, pContinue: 0.6, solvable: true },
  normal: { name: '普通', kinds: 10, perKind: 9, cols: 7, rows: 8, layers: 7, stackSize: 6, taper: 0.15, shrink: 0.3, baseInset: 0, kOpen: 2, pContinue: 0.45, solvable: true },
  hard: { name: '困难', kinds: 14, perKind: 12, cols: 7, rows: 8, layers: 10, stackSize: 10, taper: 0.12, shrink: 0.22, baseInset: 0, kOpen: 3, pContinue: 0.35, solvable: true },
  hell: { name: '原味地狱', kinds: 16, perKind: 12, cols: 7, rows: 8, layers: 12, stackSize: 12, taper: 0.1, shrink: 0.2, baseInset: 0, kOpen: 3, pContinue: 0.3, solvable: false },
};

// 一次分配尝试：模拟拿牌，维护虚拟卡槽，只做「安全」的选择
function tryAssign({ n, coveredBy, quota, kOpen, pContinue, rng, initialSlot = [], fixed = null }) {
  const kinds = new Array(n).fill(-1);
  const blockers = coveredBy.map((a) => a.length);
  const covers = Array.from({ length: n }, () => []);
  coveredBy.forEach((arr, i) => arr.forEach((j) => covers[j].push(i)));
  const free = [];
  for (let i = 0; i < n; i++) if (blockers[i] === 0) free.push(i);
  const remaining = new Map(quota);
  const open = new Map();
  let occupancy = 0;
  for (const k of initialSlot) { open.set(k, (open.get(k) || 0) + 1); occupancy++; }
  const cols = fixed ? fixed.map((c) => [...c]) : [];
  const path = [];
  const steps = n + cols.reduce((s, c) => s + c.length, 0);

  const place = (k) => {
    const c = (open.get(k) || 0) + 1;
    if (c === 3) { open.delete(k); occupancy -= 2; } else { open.set(k, c); occupancy++; }
  };
  // 放入 k 之后仍安全：不超过 6 张；若恰好 6 张，必须至少有一个对子可补齐
  const safeAfter = (k) => {
    const c = open.get(k) || 0;
    if (c === 2) return true;
    const occ = occupancy + 1;
    if (occ > 6) return false;
    if (occ < 6 || c === 1) return true;
    for (const v of open.values()) if (v === 2) return true;
    return false;
  };
  const chooseKind = () => {
    const pairs = [];
    const singles = [];
    const fresh = [];
    for (const [k, left] of remaining) {
      if (left <= 0 || !safeAfter(k)) continue;
      const c = open.get(k) || 0;
      if (c === 2) pairs.push(k);
      else if (c === 1) singles.push(k);
      else if (open.size < kOpen) fresh.push(k);
    }
    if (occupancy >= 5 && pairs.length) return rng.pick(pairs);
    const cont = pairs.concat(singles);
    if (cont.length && (!fresh.length || rng.next() < pContinue)) return rng.pick(cont);
    if (fresh.length) return rng.pick(fresh);
    return -1;
  };

  for (let step = 0; step < steps; step++) {
    // 移出区栈顶若能延续已打开的图案，优先拿它
    let bufCol = -1;
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      if (col.length && open.has(col[col.length - 1]) && safeAfter(col[col.length - 1])) { bufCol = ci; break; }
    }
    if (bufCol < 0 && !free.length) {
      for (let ci = 0; ci < cols.length; ci++) {
        const col = cols[ci];
        if (col.length && safeAfter(col[col.length - 1])) { bufCol = ci; break; }
      }
    }
    if (bufCol >= 0) {
      place(cols[bufCol].pop());
      continue;
    }
    if (!free.length) return null;
    const i = free.splice(rng.int(free.length), 1)[0];
    const k = chooseKind();
    if (k < 0) return null;
    kinds[i] = k;
    remaining.set(k, remaining.get(k) - 1);
    place(k);
    path.push(i);
    for (const j of covers[i]) if (--blockers[j] === 0) free.push(j);
  }
  return occupancy === 0 ? { kinds, path } : null;
}

export function assignKinds(opts) {
  const tries = opts.maxTries ?? 1;
  for (let t = 0; t < tries; t++) {
    const res = tryAssign(opts);
    if (res) return res;
  }
  return null;
}

export function generateLevel(key, seedStr) {
  const cfg = LEVELS[key];
  if (!cfg) throw new Error(`未知关卡：${key}`);
  const seed = hashSeed(`${key}|${seedStr}`);
  const rng = createRng(seed);
  const total = cfg.kinds * cfg.perKind;
  const positions = buildLayout({ ...cfg, total }, rng.fork('layout'));
  const kindsUsed = rng.fork('icons').shuffle([...Array(ICON_COUNT).keys()]).slice(0, cfg.kinds);
  const quota = new Map(kindsUsed.map((k) => [k, cfg.perKind]));
  const kindRng = rng.fork('kinds');
  let kinds;
  let solution = null;
  if (cfg.solvable) {
    const { coveredBy } = computeCovers(positions);
    const res = assignKinds({ n: positions.length, coveredBy, quota, kOpen: cfg.kOpen, pContinue: cfg.pContinue, rng: kindRng });
    if (!res) throw new Error(`关卡生成失败：${key}/${seedStr}`);
    kinds = res.kinds;
    solution = res.path;
  } else {
    const pool = [];
    for (const [k, c] of quota) for (let i = 0; i < c; i++) pool.push(k);
    kinds = kindRng.shuffle(pool);
  }
  return {
    key,
    name: cfg.name,
    seedStr,
    seed,
    cols: cfg.cols,
    rows: cfg.rows,
    tiles: positions.map((p, id) => ({ id, x: p.x, y: p.y, z: p.z, group: p.group, kind: kinds[id] })),
    kinds: kindsUsed,
    solution,
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/generator.test.mjs`
Expected: PASS（6 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/core/generator.js tests/generator.test.mjs
git commit -m "feat: 有解关卡生成（模拟拿牌路径分配图案）"
```

---

### Task 5: 对局状态机

**Files:**
- Create: `src/core/game.js`
- Test: `tests/game.test.mjs`

**Interfaces:**
- Consumes：
  - Task 2 的 `createRng`、`hashSeed`
  - Task 3 的 `computeCovers`
  - Task 4 的 `assignKinds`、`generateLevel`（仅测试中使用）
- Produces:
  - 常量：`SLOT_SIZE = 7`、`BUFFER_COLS = 3`
  - `createGame(level): Game`，`Game` 包含：
    - `level`
    - `state`（getter），结构为 `{ tiles, slot: id[], buffer: id[][], props, used, status, moves, combo, remaining }`
      - `tiles[i]` 的字段：`{ id, x, y, z, group, kind, zone: 'board'|'slot'|'buffer'|'gone', col }`
      - `props`、`used` 的字段：`{ moveOut, undo, shuffle, revive }`
      - `status` 取值：`'playing' | 'won' | 'lost'`
    - `actions`（getter），返回 `Array<['p', id] | ['m'] | ['u'] | ['s'] | ['r']>`
    - 查询：`isFree(id)`、`freeIds()`、`blocking(id)`
    - 操作：`pick(id)`、`moveOut()`、`undo()`、`shuffle()`、`revive()`，都返回 `Event[] | null`
    - 可用性判断：`canMoveOut()`、`canUndo()`、`canShuffle()`、`canRevive()`
    - 回放：`apply(action)`、`replay(actions): boolean`
  - `Event` 的几种形式：

    ```
    {type:'pick', id, slotIndex, from:{zone:'board'}|{zone:'buffer', col}}
    {type:'eliminate', ids, kind, combo}
    {type:'moveOut', moves:[{id, col, height}]}
    {type:'undo', id, to}
    {type:'shuffle', changes:[{id, kind}], solvable}
    {type:'revive'}
    {type:'win'}
    {type:'lose'}
    ```

- [ ] **Step 1: 写失败的测试**

```js file=tests/game.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, SLOT_SIZE } from '../src/core/game.js';
import { generateLevel } from '../src/core/generator.js';

// 手工小关：默认都在第 0 层且互不重叠（间隔 2 格）
function mk(list) {
  return {
    key: 't', seed: 1, cols: 7, rows: 8,
    tiles: list.map((t, id) => ({ id, x: (id % 3) * 2, y: Math.floor(id / 3) * 2, z: 0, group: 'main', ...t })),
  };
}
const kindsOf = (g) => g.state.slot.map((id) => g.state.tiles[id].kind);

test('被压住的牌不能拿，上面拿走后才能拿', () => {
  const g = createGame(mk([{ x: 0, y: 0, z: 0, kind: 0 }, { x: 0.5, y: 0, z: 1, kind: 1 }]));
  assert.equal(g.isFree(0), false);
  assert.equal(g.pick(0), null);
  assert.ok(g.pick(1));
  assert.equal(g.isFree(0), true);
  assert.ok(g.pick(0));
});

test('入槽时同图案挨着放', () => {
  const g = createGame(mk([{ kind: 0 }, { kind: 1 }, { kind: 0 }]));
  g.pick(0);
  g.pick(1);
  const ev = g.pick(2);
  assert.equal(ev[0].slotIndex, 1);
  assert.deepEqual(kindsOf(g), [0, 0, 1]);
});

test('凑齐 3 张消除，连消按 3 步窗口计数', () => {
  const g = createGame(mk([
    { kind: 0 }, { kind: 0 }, { kind: 0 }, { kind: 1 }, { kind: 1 }, { kind: 1 },
    { kind: 2 }, { kind: 3 }, { kind: 4 }, { kind: 2 }, { kind: 2 },
  ]));
  g.pick(0); g.pick(1);
  const e1 = g.pick(2);
  assert.deepEqual(e1[1], { type: 'eliminate', ids: [0, 1, 2], kind: 0, combo: 1 });
  assert.deepEqual(g.state.slot, []);
  g.pick(3); g.pick(4);
  assert.equal(g.pick(5)[1].combo, 2);
  g.pick(6); g.pick(7); g.pick(8); g.pick(9);
  assert.equal(g.pick(10)[1].combo, 1, '超过 3 步应重置');
  assert.equal(g.state.remaining, 11 - 9);
});

test('卡槽满 7 张判负；清空判胜', () => {
  const lose = createGame(mk(Array.from({ length: 7 }, (_, k) => ({ kind: k }))));
  for (let i = 0; i < 6; i++) lose.pick(i);
  const ev = lose.pick(6);
  assert.equal(ev.at(-1).type, 'lose');
  assert.equal(lose.state.status, 'lost');
  assert.equal(lose.state.slot.length, SLOT_SIZE);
  assert.equal(lose.pick(0), null, '失败后不能再拿');

  const win = createGame(mk([{ kind: 5 }, { kind: 5 }, { kind: 5 }]));
  win.pick(0); win.pick(1);
  assert.equal(win.pick(2).at(-1).type, 'win');
  assert.equal(win.state.status, 'won');
});

test('撤回：牌回原位并恢复覆盖；消除后与次数用尽时不可撤回', () => {
  const g = createGame(mk([{ x: 0, y: 0, z: 0, kind: 0 }, { x: 0.5, y: 0.5, z: 1, kind: 1 }, { kind: 1 }, { kind: 1 }]));
  g.pick(1);
  assert.equal(g.isFree(0), true);
  const ev = g.undo();
  assert.deepEqual(ev, [{ type: 'undo', id: 1, to: { zone: 'board' } }]);
  assert.equal(g.state.tiles[1].zone, 'board');
  assert.equal(g.isFree(0), false);
  assert.equal(g.state.props.undo, 0);
  g.pick(1);
  assert.equal(g.undo(), null, '次数用尽');

  const h = createGame(mk([{ kind: 0 }, { kind: 0 }, { kind: 0 }, { kind: 1 }]));
  h.pick(0); h.pick(1); h.pick(2);
  assert.equal(h.canUndo(), false, '上一步发生消除时不可撤回');
});

test('移出：卡槽前 3 张进移出区，栈顶可拿，只能用一次', () => {
  const g = createGame(mk([{ kind: 0 }, { kind: 1 }, { kind: 2 }, { kind: 3 }, { kind: 1 }]));
  g.pick(0); g.pick(1); g.pick(2); g.pick(3);
  const ev = g.moveOut();
  assert.deepEqual(ev[0].moves, [{ id: 0, col: 0, height: 0 }, { id: 1, col: 1, height: 0 }, { id: 2, col: 2, height: 0 }]);
  assert.deepEqual(g.state.slot, [3]);
  assert.ok(g.isFree(1));
  g.pick(4);
  assert.ok(g.pick(1));
  assert.deepEqual(g.state.buffer[1], []);
  assert.equal(g.moveOut(), null);
});

test('撤回从移出区拿的牌会回到原来那一列', () => {
  const g = createGame(mk([{ kind: 0 }, { kind: 1 }, { kind: 2 }]));
  g.pick(0); g.pick(1); g.pick(2);
  g.moveOut();
  g.pick(1);
  g.undo();
  assert.deepEqual(g.state.buffer[1], [1]);
  assert.equal(g.state.tiles[1].zone, 'buffer');
});

test('复活：失败后移出 3 张继续，只能一次', () => {
  const g = createGame(mk(Array.from({ length: 9 }, (_, k) => ({ kind: k }))));
  for (let i = 0; i < 7; i++) g.pick(i);
  assert.equal(g.state.status, 'lost');
  const ev = g.revive();
  assert.equal(ev[0].type, 'revive');
  assert.equal(g.state.status, 'playing');
  assert.equal(g.state.slot.length, 4);
  assert.equal(g.state.buffer.flat().length, 3);
  assert.equal(g.state.props.moveOut, 1, '复活不占用移出次数');
  g.pick(7); g.pick(8);
  g.moveOut();
  assert.equal(g.state.buffer.flat().length, 6, '再次移出叠在栈顶');
  assert.equal(g.revive(), null);
});

test('洗牌：位置与图案多重集合不变，同种子可复现', () => {
  const level = generateLevel('normal', 'shuffle');
  const a = createGame(level);
  const b = createGame(level);
  for (const g of [a, b]) for (const id of level.solution.slice(0, 10)) g.pick(id);
  const boardKinds = (g) => g.state.tiles.filter((t) => t.zone === 'board').map((t) => t.kind).sort((x, y) => x - y);
  const places = (g) => g.state.tiles.map((t) => [t.x, t.y, t.z, t.zone]);
  const before = boardKinds(a);
  const placesBefore = places(a);
  const ev = a.shuffle();
  b.shuffle();
  assert.deepEqual(boardKinds(a), before);
  assert.deepEqual(places(a), placesBefore);
  assert.equal(ev[0].type, 'shuffle');
  assert.equal(ev[0].solvable, true);
  assert.deepEqual(a.state.tiles.map((t) => t.kind), b.state.tiles.map((t) => t.kind));
  assert.equal(a.shuffle(), null, '洗牌只能一次');
});

test('动作日志回放得到相同局面', () => {
  const level = generateLevel('hard', 'replay');
  const a = createGame(level);
  for (const id of level.solution.slice(0, 20)) a.pick(id);
  a.moveOut();
  a.shuffle();
  const b = createGame(level);
  assert.equal(b.replay(a.actions), true);
  assert.deepEqual(b.state, a.state);
});

test('按生成器的解路径能不用道具通关', () => {
  for (const key of ['daily1', 'easy', 'normal', 'hard', 'daily2']) {
    for (let s = 0; s < 15; s++) {
      const level = generateLevel(key, `g-${s}`);
      const g = createGame(level);
      for (const id of level.solution) {
        assert.ok(g.pick(id), `${key}/${s} 解路径中途不可走`);
        assert.ok(g.state.slot.length <= 6);
      }
      assert.equal(g.state.status, 'won');
    }
  }
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/game.test.mjs`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 实现**

```js file=src/core/game.js
// 对局状态机：拿牌、卡槽、消除、胜负、道具与复活；操作返回事件数组，非法操作返回 null
import { hashSeed, createRng } from './rng.js';
import { computeCovers } from './layout.js';
import { assignKinds } from './generator.js';

export const SLOT_SIZE = 7;
export const BUFFER_COLS = 3;
const COMBO_WINDOW = 3;

export function createGame(level) {
  const tiles = level.tiles.map((t) => ({ id: t.id, x: t.x, y: t.y, z: t.z, group: t.group, kind: t.kind, zone: 'board', col: -1 }));
  const { coveredBy, covers } = computeCovers(tiles);
  const blockers = coveredBy.map((a) => a.length);
  const slot = [];
  const buffer = Array.from({ length: BUFFER_COLS }, () => []);
  const props = { moveOut: 1, undo: 1, shuffle: 1, revive: 1 };
  const used = { moveOut: 0, undo: 0, shuffle: 0, revive: 0 };
  const actions = [];
  let status = 'playing';
  let moves = 0;
  let combo = 0;
  let lastElimMove = -Infinity;
  let shuffles = 0;
  let lastPick = null;
  let remaining = tiles.length;

  const isFree = (id) => {
    const t = tiles[id];
    if (!t) return false;
    if (t.zone === 'board') return blockers[id] === 0;
    if (t.zone === 'buffer') { const col = buffer[t.col]; return col[col.length - 1] === id; }
    return false;
  };
  const freeIds = () => tiles.filter((t) => isFree(t.id)).map((t) => t.id);
  const blocking = (id) => covers[id].filter((j) => tiles[j].zone === 'board').length;

  function pick(id) {
    if (status !== 'playing' || !isFree(id)) return null;
    const t = tiles[id];
    const from = t.zone === 'board' ? { zone: 'board' } : { zone: 'buffer', col: t.col };
    if (t.zone === 'board') for (const j of covers[id]) blockers[j]--;
    else buffer[t.col].pop();
    t.zone = 'slot';
    t.col = -1;
    let idx = slot.length;
    for (let i = slot.length - 1; i >= 0; i--) if (tiles[slot[i]].kind === t.kind) { idx = i + 1; break; }
    slot.splice(idx, 0, id);
    moves++;
    actions.push(['p', id]);
    const events = [{ type: 'pick', id, slotIndex: idx, from }];
    const same = slot.filter((s) => tiles[s].kind === t.kind);
    let eliminated = false;
    if (same.length === 3) {
      for (const s of same) { tiles[s].zone = 'gone'; slot.splice(slot.indexOf(s), 1); }
      remaining -= 3;
      combo = moves - lastElimMove <= COMBO_WINDOW ? combo + 1 : 1;
      lastElimMove = moves;
      eliminated = true;
      events.push({ type: 'eliminate', ids: same, kind: t.kind, combo });
    }
    lastPick = { id, from, eliminated };
    if (remaining === 0) { status = 'won'; events.push({ type: 'win' }); }
    else if (slot.length >= SLOT_SIZE) { status = 'lost'; events.push({ type: 'lose' }); }
    return events;
  }

  // 卡槽最左边最多 3 张依次叠到移出区 0/1/2 列栈顶
  function takeToBuffer() {
    const take = slot.splice(0, Math.min(BUFFER_COLS, slot.length));
    return take.map((id, col) => {
      const t = tiles[id];
      t.zone = 'buffer';
      t.col = col;
      buffer[col].push(id);
      return { id, col, height: buffer[col].length - 1 };
    });
  }

  const canMoveOut = () => status === 'playing' && props.moveOut > 0 && slot.length > 0;
  function moveOut() {
    if (!canMoveOut()) return null;
    props.moveOut--; used.moveOut++;
    lastPick = null;
    actions.push(['m']);
    return [{ type: 'moveOut', moves: takeToBuffer() }];
  }

  const canUndo = () => status === 'playing' && props.undo > 0 && !!lastPick && !lastPick.eliminated && tiles[lastPick.id].zone === 'slot';
  function undo() {
    if (!canUndo()) return null;
    props.undo--; used.undo++;
    const { id, from } = lastPick;
    lastPick = null;
    slot.splice(slot.indexOf(id), 1);
    const t = tiles[id];
    if (from.zone === 'board') {
      t.zone = 'board';
      for (const j of covers[id]) blockers[j]++;
    } else {
      t.zone = 'buffer';
      t.col = from.col;
      buffer[from.col].push(id);
    }
    actions.push(['u']);
    return [{ type: 'undo', id, to: from }];
  }

  const canShuffle = () => status === 'playing' && props.shuffle > 0 && tiles.some((t) => t.zone === 'board');
  // 洗牌：位置不动只换图案；随机数由「关卡种子 + 洗牌次数」决定，保证回放一致；尽量保证有解
  function shuffle() {
    if (!canShuffle()) return null;
    props.shuffle--; used.shuffle++; shuffles++;
    const rng = createRng(hashSeed(`${level.seed ?? 0}:shuffle:${shuffles}`));
    const ids = tiles.filter((t) => t.zone === 'board').map((t) => t.id);
    const local = new Map(ids.map((id, i) => [id, i]));
    const quota = new Map();
    for (const id of ids) quota.set(tiles[id].kind, (quota.get(tiles[id].kind) || 0) + 1);
    const res = assignKinds({
      n: ids.length,
      coveredBy: ids.map((id) => coveredBy[id].filter((j) => local.has(j)).map((j) => local.get(j))),
      quota,
      kOpen: 3,
      pContinue: 0.5,
      rng,
      initialSlot: slot.map((id) => tiles[id].kind),
      fixed: buffer.map((col) => col.map((id) => tiles[id].kind)),
      maxTries: 30,
    });
    const next = res ? res.kinds : rng.shuffle(ids.map((id) => tiles[id].kind));
    const changes = [];
    ids.forEach((id, i) => {
      if (tiles[id].kind !== next[i]) { tiles[id].kind = next[i]; changes.push({ id, kind: next[i] }); }
    });
    lastPick = null;
    actions.push(['s']);
    return [{ type: 'shuffle', changes, solvable: !!res }];
  }

  const canRevive = () => status === 'lost' && props.revive > 0;
  function revive() {
    if (!canRevive()) return null;
    props.revive--; used.revive++;
    status = 'playing';
    lastPick = null;
    actions.push(['r']);
    return [{ type: 'revive' }, { type: 'moveOut', moves: takeToBuffer() }];
  }

  function apply(a) {
    switch (a[0]) {
      case 'p': return pick(a[1]);
      case 'm': return moveOut();
      case 'u': return undo();
      case 's': return shuffle();
      case 'r': return revive();
      default: return null;
    }
  }
  const replay = (list) => list.every((a) => apply(a) !== null);

  return {
    level,
    get state() {
      return { tiles, slot: slot.slice(), buffer: buffer.map((c) => c.slice()), props: { ...props }, used: { ...used }, status, moves, combo, remaining };
    },
    get actions() { return actions.map((a) => a.slice()); },
    isFree, freeIds, blocking,
    pick, moveOut, undo, shuffle, revive,
    canMoveOut, canUndo, canShuffle, canRevive,
    apply, replay,
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/game.test.mjs`
Expected: PASS（11 个测试）

- [ ] **Step 5: 提交**

```bash
git add src/core/game.js tests/game.test.mjs
git commit -m "feat: 对局状态机（卡槽、消除、道具、复活、回放）"
```

---

### Task 6: 贪心机器人与难度平衡

**Files:**
- Create: `src/core/bot.js`
- Create: `tools/balance.mjs`
- Modify: `src/core/generator.js` 的 `LEVELS` 表（仅调整数值）
- Test: `tests/bot.test.mjs`

**Interfaces:**
- Consumes：
  - Task 4 的 `generateLevel`、`LEVELS`
  - Task 5 的 `createGame` 和 `Game`
- Produces:
  - `bestMove(game): { id: number, score: number }`：没有可拿的牌时 `id = -1`。
  - `greedyMove(game): number`
  - `playOut(game, { useProps = false, maxSteps = 3000 } = {}): 'won' | 'lost'`

- [ ] **Step 1: 写失败的测试**

```js file=tests/bot.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel } from '../src/core/generator.js';
import { createGame } from '../src/core/game.js';
import { bestMove, greedyMove, playOut } from '../src/core/bot.js';

test('greedyMove 总是返回一张空闲牌', () => {
  const g = createGame(generateLevel('hard', 'bot'));
  for (let i = 0; i < 30 && g.state.status === 'playing'; i++) {
    const id = greedyMove(g);
    assert.ok(g.isFree(id));
    g.pick(id);
  }
});

test('能补齐三张时一定补齐', () => {
  const level = {
    key: 't', seed: 1, cols: 7, rows: 8,
    tiles: [0, 0, 1, 0].map((kind, id) => ({ id, x: id * 2 % 6, y: Math.floor(id / 3) * 2, z: 0, group: 'main', kind })),
  };
  const g = createGame(level);
  g.pick(0);
  g.pick(1);
  const { id, score } = bestMove(g);
  assert.equal(g.state.tiles[id].kind, 0);
  assert.ok(score >= 1000);
});

test('教学关机器人必胜；playOut 总会结束', () => {
  for (let s = 0; s < 20; s++) assert.equal(playOut(createGame(generateLevel('daily1', `b-${s}`))), 'won');
  for (const key of ['daily2', 'hell']) {
    const r = playOut(createGame(generateLevel(key, 'end')), { useProps: true });
    assert.ok(r === 'won' || r === 'lost');
  }
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/bot.test.mjs`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 实现机器人**

```js file=src/core/bot.js
// 贪心机器人：只看空闲牌与卡槽（不偷看被压住的图案），用于平衡模拟与调试自动玩
import { SLOT_SIZE } from './game.js';

export function bestMove(game) {
  const s = game.state;
  const free = game.freeIds();
  if (!free.length) return { id: -1, score: -Infinity };
  const inSlot = new Map();
  for (const id of s.slot) { const k = s.tiles[id].kind; inSlot.set(k, (inSlot.get(k) || 0) + 1); }
  const freeOf = new Map();
  for (const id of free) { const k = s.tiles[id].kind; freeOf.set(k, (freeOf.get(k) || 0) + 1); }
  let best = -1;
  let bestScore = -Infinity;
  for (const id of free) {
    const k = s.tiles[id].kind;
    const c = inSlot.get(k) || 0;
    const f = freeOf.get(k);
    let score;
    if (c === 2) score = 1000;
    else if (s.slot.length + 1 >= SLOT_SIZE) score = -10000;
    else if (c === 1) score = f >= 2 ? 800 : 400;
    else score = f >= 3 ? 600 : f === 2 ? 150 : 0;
    if (c === 0 && SLOT_SIZE - s.slot.length <= 2) score -= 500;
    score += game.blocking(id) * 3 + (s.tiles[id].zone === 'buffer' ? 5 : 0);
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return { id: best, score: bestScore };
}

export const greedyMove = (game) => bestMove(game).id;

export function playOut(game, { useProps = false, maxSteps = 3000 } = {}) {
  for (let step = 0; step < maxSteps; step++) {
    const s = game.state;
    if (s.status === 'won') return 'won';
    if (s.status === 'lost') {
      if (useProps && game.canRevive()) { game.revive(); continue; }
      return 'lost';
    }
    if (useProps && s.slot.length >= 5 && game.canMoveOut()) { game.moveOut(); continue; }
    const { id, score } = bestMove(game);
    if (useProps && score < 100 && s.slot.length >= 2 && game.canShuffle()) { game.shuffle(); continue; }
    if (id < 0) return 'lost';
    game.pick(id);
  }
  return game.state.status === 'won' ? 'won' : 'lost';
}
```

- [ ] **Step 4: 写平衡模拟脚本**

```js file=tools/balance.mjs
// 平衡模拟：各难度 × N 局，统计贪心机器人「无道具 / 有道具」通关率
// 用法：node tools/balance.mjs [局数=200] [key1,key2,...]
import { generateLevel, LEVELS } from '../src/core/generator.js';
import { createGame } from '../src/core/game.js';
import { playOut } from '../src/core/bot.js';

const N = Number(process.argv[2]) || 200;
const keys = process.argv[3] ? process.argv[3].split(',') : Object.keys(LEVELS);
const pct = (n) => `${((n / N) * 100).toFixed(1).padStart(5)}%`;

for (const key of keys) {
  const t0 = Date.now();
  let plain = 0;
  let props = 0;
  for (let i = 0; i < N; i++) {
    const level = generateLevel(key, `bal-${i}`);
    if (playOut(createGame(level)) === 'won') plain++;
    if (playOut(createGame(level), { useProps: true }) === 'won') props++;
  }
  const cfg = LEVELS[key];
  console.log(`${key.padEnd(7)} ${String(cfg.kinds * cfg.perKind).padStart(3)} 张  无道具 ${pct(plain)}  有道具 ${pct(props)}  ${Date.now() - t0}ms`);
}
```

- [ ] **Step 5: 运行测试和平衡模拟**

Run: `node --test tests/bot.test.mjs && node tools/balance.mjs 200`
Expected:
- 测试 PASS（3 个）。
- 模拟会为每档难度打印一行通关率。

- [ ] **Step 6: 按目标校准 `LEVELS`**

- 「有道具」通关率的目标：

  | 关卡 | 目标 |
  |---|---|
  | `daily1` | 100% |
  | `easy` | ≥ 90% |
  | `normal` | 50% 到 80% |
  | `hard` | 20% 到 50% |
  | `daily2` | 5% 到 25% |

- 调参时依次调整这些量：`kinds`（最敏感）→ `layers`/`stackSize` → `kOpen`/`pContinue` → `taper`/`shrink`。每次只改一两个值，改完重跑 `node tools/balance.mjs 200 <key>`。
- 约束：
  - `kinds × perKind` 必须能放得下（布局不抛错）。
  - `perKind` 必须是 3 的倍数。
  - `daily1` 保持 3 种图案。
- 校准后重跑全部测试：`npm test`，预期全部 PASS。

- [ ] **Step 7: 提交**

```bash
git add src/core/bot.js tools/balance.mjs tests/bot.test.mjs src/core/generator.js
git commit -m "feat: 贪心机器人与难度平衡校准"
```

---

### Task 9: 构建脚本（单文件双产物）

**Files:**
- Create: `build.mjs`
- Test: `tests/build.test.mjs`

**Interfaces:**
- Produces:
  - `bundleModules(srcDir, entryRel): string`：把入口及其依赖包成一个个闭包，按依赖先后排列。遇到循环依赖、不支持的 import/export 写法时抛错。
  - `assemblePages({ tpl, css, js }): { standalone, fragment }`
    - 模板用 `<!--@BODY-->` 把内容分成 head 片段和 body 片段，并用 `/*@CSS*/`、`/*@JS*/` 标出注入位置。
    - `fragment` 以 `<title>` 开头。
    - `standalone` 是完整文档：自带 viewport-fit=cover、安全区 padding 和 favicon。
  - `assertNoExternal(html, label)`：`src`、`href`、`url()` 指向 http(s)，或者出现 `@import` 时，都会抛错。
  - 直接运行 `node build.mjs` 时写出 `dist/index.html` 和 `dist/artifact.html`，并打印两份文件的大小。

- [ ] **Step 1: 写失败的测试**

```js file=tests/build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { bundleModules, assemblePages, assertNoExternal } from '../build.mjs';

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glgg-'));
  for (const [rel, code] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, code);
  }
  return dir;
}

test('按依赖顺序打包，具名导入导出正确', () => {
  const dir = fixture({
    'core/a.js': 'export const A = 2;\nexport function double(x) { return x * A; }\n',
    'core/b.js': "import { double } from './a.js';\nexport class Box { constructor(v) { this.v = double(v); } }\n",
    'ui/main.js': "import { Box } from '../core/b.js';\nimport { A } from '../core/a.js';\nglobalThis.result = new Box(5).v + A;\n",
  });
  const js = bundleModules(dir, 'ui/main.js');
  const ctx = {};
  vm.runInNewContext(js, ctx);
  assert.equal(ctx.result, 12);
  assert.ok(js.indexOf('__m_core_a_js =') < js.indexOf('__m_core_b_js ='));
  assert.ok(js.indexOf('__m_core_b_js =') < js.indexOf('__m_ui_main_js ='));
});

test('循环依赖与不支持的写法会报错', () => {
  const cyc = fixture({
    'a.js': "import { b } from './b.js';\nexport const a = 1;\n",
    'b.js': "import { a } from './a.js';\nexport const b = 2;\n",
  });
  assert.throws(() => bundleModules(cyc, 'a.js'), /循环依赖/);
  const def = fixture({ 'main.js': 'export default 1;\n' });
  assert.throws(() => bundleModules(def, 'main.js'), /只支持/);
  const star = fixture({ 'main.js': "import * as x from './x.js';\n" });
  assert.throws(() => bundleModules(star, 'main.js'), /只支持/);
});

test('组装两份页面', () => {
  const tpl = '<title>狗了个狗</title>\n<style>/*@CSS*/</style>\n<!--@BODY-->\n<div id="app"></div>\n<script>/*@JS*/</script>\n';
  const { standalone, fragment } = assemblePages({ tpl, css: 'body{color:red}', js: 'globalThis.x = "$&";' });
  assert.ok(fragment.startsWith('<title>狗了个狗</title>'));
  assert.ok(!/<!doctype|<html|<head|<body/i.test(fragment));
  assert.ok(fragment.includes('body{color:red}') && fragment.includes('globalThis.x = "$&";'));
  assert.ok(standalone.startsWith('<!doctype html>'));
  assert.ok(standalone.includes('viewport-fit=cover'));
  const head = standalone.slice(0, standalone.indexOf('</head>'));
  assert.ok(head.includes('<title>狗了个狗</title>'), 'title 必须位于 head');
  assert.ok(standalone.indexOf('<div id="app">') > standalone.indexOf('<body>'));
});

test('零外链校验', () => {
  assert.throws(() => assertNoExternal('<script src="https://x.com/a.js"></script>', 't'), /外部资源/);
  assert.throws(() => assertNoExternal('<style>a{background:url(https://x.com/a.png)}</style>', 't'), /外部资源/);
  assert.throws(() => assertNoExternal("<style>@import 'x.css';</style>", 't'), /外部资源/);
  assert.doesNotThrow(() => assertNoExternal('<svg xmlns="http://www.w3.org/2000/svg"></svg><a href="#x">x</a><i style="background:url(data:image/svg+xml,abc)"></i>', 't'));
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/build.test.mjs`
Expected: FAIL（Cannot find module '../build.mjs'）

- [ ] **Step 3: 实现**

```js file=build.mjs
// 构建：把 src 下的 ES 模块按依赖顺序包进闭包，内联 CSS/JS，输出完整文档与 Artifact 片段两份产物
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cg fill='%23E8913A' stroke='%233B2A1A' stroke-width='3'%3E%3Cellipse cx='32' cy='42' rx='14' ry='12'/%3E%3Ccircle cx='15' cy='26' r='6'/%3E%3Ccircle cx='25' cy='15' r='6'/%3E%3Ccircle cx='39' cy='15' r='6'/%3E%3Ccircle cx='49' cy='26' r='6'/%3E%3C/g%3E%3C/svg%3E";

const ident = (rel) => `__m_${rel.replace(/[^\w]/g, '_')}`;

function parseModule(srcDir, rel) {
  const code = fs.readFileSync(path.join(srcDir, rel), 'utf8');
  const imports = [];
  let body = code.replace(/^import\s*\{([^}]*)\}\s*from\s*'([^']+)';[ \t]*$/gm, (_, names, from) => {
    const dep = path.posix.normalize(path.posix.join(path.posix.dirname(rel), from));
    imports.push({ dep, names: names.split(',').map((s) => s.trim().replace(/\s+as\s+/, ': ')).filter(Boolean) });
    return '';
  });
  if (/^\s*import[\s*{'"]/m.test(body)) throw new Error(`${rel}：只支持文件顶部的具名 import`);
  const exports = [];
  body = body.replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kw, name) => {
    exports.push(name);
    return `${kw} ${name}`;
  });
  if (/^\s*export\s/m.test(body)) throw new Error(`${rel}：只支持 export function / const / class`);
  return { rel, imports, exports, body };
}

export function bundleModules(srcDir, entryRel) {
  const done = new Map();
  const visit = (rel, stack) => {
    if (done.has(rel)) return;
    if (stack.includes(rel)) throw new Error(`循环依赖：${[...stack, rel].join(' → ')}`);
    const mod = parseModule(srcDir, rel);
    for (const imp of mod.imports) visit(imp.dep, [...stack, rel]);
    done.set(rel, mod);
  };
  visit(entryRel, []);
  let js = '';
  for (const m of done.values()) {
    const head = m.imports.map((i) => `const { ${i.names.join(', ')} } = ${ident(i.dep)};`).join('\n');
    js += `// ---- ${m.rel} ----\nconst ${ident(m.rel)} = (() => {\n${head}\n${m.body.trim()}\nreturn { ${m.exports.join(', ')} };\n})();\n`;
  }
  return js;
}

export function assemblePages({ tpl, css, js }) {
  const parts = tpl.split('<!--@BODY-->');
  if (parts.length !== 2) throw new Error('模板缺少 <!--@BODY--> 分隔');
  if (/<\/script/i.test(js)) throw new Error('脚本中不得出现 </script');
  const script = `(() => {\n'use strict';\n${js}\n})();`;
  const fill = (s) => s.replace('/*@CSS*/', () => css).replace('/*@JS*/', () => script).trim();
  const head = fill(parts[0]);
  const body = fill(parts[1]);
  const fragment = `${head}\n${body}\n`;
  const standalone = [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    '<meta name="description" content="狗了个狗：狗狗主题的三消堆叠小游戏，每天一关，看你能不能通关。">',
    '<meta name="theme-color" content="#9ed36a">',
    `<link rel="icon" href="${FAVICON}">`,
    '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>',
    head,
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    '',
  ].join('\n');
  return { standalone, fragment };
}

export function assertNoExternal(html, label) {
  const bad = html.match(/(?:src|href)\s*=\s*["']?https?:|url\(\s*["']?https?:|@import/gi);
  if (bad) throw new Error(`${label} 含外部资源引用：${bad.slice(0, 3).join(' | ')}`);
}

function main() {
  const js = bundleModules(SRC, 'ui/main.js');
  const css = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
  const tpl = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const { standalone, fragment } = assemblePages({ tpl, css, js });
  assertNoExternal(standalone, 'dist/index.html');
  assertNoExternal(fragment, 'dist/artifact.html');
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'index.html'), standalone);
  fs.writeFileSync(path.join(DIST, 'artifact.html'), fragment);
  const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`;
  console.log(`dist/index.html ${kb(standalone)}，dist/artifact.html ${kb(fragment)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test tests/build.test.mjs`
Expected: PASS（4 个测试）

- [ ] **Step 5: 提交**

```bash
git add build.mjs tests/build.test.mjs
git commit -m "feat: 单文件双产物构建脚本与零外链校验"
```

---

### Task 10: 页面骨架与样式

**Files:**
- Create: `src/index.html`
- Create: `src/styles.css`

**Interfaces:**
- Produces（后续 UI 模块依赖的 DOM id 和 class）：
  - 首页相关 id：
    - `home`、`btn-settings`、`btn-help`
    - `online`、`online-count`
    - `logo`、`hero-dog`、`hero-line`
    - `btn-daily`、`daily-sub`、`btn-practice`、`btn-pack`
    - `team-chip`、`streak`
  - 对局相关 id：
    - `game`、`btn-pause`、`level-name`、`tiles-left`
    - `stage`、`slot`（含 7 个 `.slot-cell`）
    - `mascot`、`mascot-face`、`bubble`
    - `prop-moveOut`、`prop-undo`、`prop-shuffle`
    - `badge-moveOut`、`badge-undo`、`badge-shuffle`
    - `playfield`
  - 公共层 id：`modal-layer`、`modal`、`fx`、`toasts`、`app`
  - 牌元素：`button.tile[data-id]`，里面是 `span.tile-face > svg > use`。状态 class 有 `is-covered`、`is-free`、`is-slot`、`is-flying`、`is-hint`。牌边长由 playfield 上的 CSS 变量 `--t` 提供。
  - 卡槽：`.slot` 的宽度由 CSS 变量 `--slot-w` 控制；危险状态 class 为 `.slot.is-danger`。
  - 道具按钮：`.prop.is-empty` 表示已用完，`.prop.is-idle` 表示暂时不可用。

- [ ] **Step 1: 写模板**

```html file=src/index.html
<title>狗了个狗</title>
<style>/*@CSS*/</style>
<!--@BODY-->
<div class="app" id="app">
  <section class="screen home" id="home" aria-label="首页">
    <header class="home-top">
      <button class="icon-btn" id="btn-settings" type="button" aria-label="设置">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm8.4 2-1.9-.4a7 7 0 0 0-.6-1.5l1.1-1.6-1.9-1.9-1.6 1.1a7 7 0 0 0-1.5-.6l-.4-1.9h-2.7l-.4 1.9a7 7 0 0 0-1.5.6L5.3 5.2 3.4 7.1l1.1 1.6a7 7 0 0 0-.6 1.5l-1.9.4v2.7l1.9.4c.1.5.3 1 .6 1.5l-1.1 1.6 1.9 1.9 1.6-1.1c.5.3 1 .5 1.5.6l.4 1.9h2.7l.4-1.9c.5-.1 1-.3 1.5-.6l1.6 1.1 1.9-1.9-1.1-1.6c.3-.5.5-1 .6-1.5l1.9-.4v-2.7Z"/></svg>
      </button>
      <div class="online" id="online" hidden><i class="online-dot" aria-hidden="true"></i>在线狗友 <b id="online-count">1</b></div>
      <button class="icon-btn" id="btn-help" type="button" aria-label="玩法说明"><b aria-hidden="true">?</b></button>
    </header>
    <h1 class="logo" id="logo"><span class="sr-only">狗了个狗</span></h1>
    <div class="hero">
      <div class="hero-dog" id="hero-dog" aria-hidden="true"></div>
      <p class="hero-line" id="hero-line">今天也要汪汪通关</p>
    </div>
    <nav class="home-actions" aria-label="开始游戏">
      <button class="btn btn-go btn-big" id="btn-daily" type="button"><span class="btn-title">今日挑战</span><span class="btn-sub" id="daily-sub">第 1 关 · 热身</span></button>
      <div class="home-row">
        <button class="btn btn-soft" id="btn-practice" type="button">自由练习</button>
        <button class="btn btn-soft" id="btn-pack" type="button">我的狗群</button>
      </div>
    </nav>
    <footer class="home-foot"><span class="team-chip" id="team-chip"></span><span class="streak" id="streak"></span></footer>
  </section>

  <section class="screen game" id="game" aria-label="对局" hidden>
    <header class="bar">
      <button class="icon-btn" id="btn-pause" type="button" aria-label="暂停">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>
      </button>
      <div class="bar-title" id="level-name">第 1 关</div>
      <div class="bar-left">剩 <b id="tiles-left">0</b> 张</div>
    </header>
    <div class="stage" id="stage"></div>
    <div class="slot" id="slot" role="list" aria-label="卡槽，最多 7 张">
      <i class="slot-cell"></i><i class="slot-cell"></i><i class="slot-cell"></i><i class="slot-cell"></i><i class="slot-cell"></i><i class="slot-cell"></i><i class="slot-cell"></i>
    </div>
    <div class="dock">
      <div class="mascot" id="mascot"><div class="bubble" id="bubble" role="status" hidden></div><div class="mascot-face" id="mascot-face"></div></div>
      <div class="props">
        <button class="prop" id="prop-moveOut" type="button" data-prop="moveOut"><span class="prop-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 20h14M12 16V4M7 9l5-5 5 5"/></svg></span><span class="prop-name">移出</span><i class="badge" id="badge-moveOut">1</i></button>
        <button class="prop" id="prop-undo" type="button" data-prop="undo"><span class="prop-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></span><span class="prop-name">撤回</span><i class="badge" id="badge-undo">1</i></button>
        <button class="prop" id="prop-shuffle" type="button" data-prop="shuffle"><span class="prop-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h4l10 10h4M3 17h4L17 7h4M18 4l3 3-3 3M18 14l3 3-3 3"/></svg></span><span class="prop-name">洗牌</span><i class="badge" id="badge-shuffle">1</i></button>
      </div>
    </div>
    <div class="playfield" id="playfield"></div>
  </section>

  <div class="modal-layer" id="modal-layer" hidden>
    <div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"></div>
  </div>
  <canvas class="fx" id="fx" aria-hidden="true"></canvas>
  <div class="toasts" id="toasts" role="status" aria-live="polite"></div>
</div>
<script>/*@JS*/</script>
```

- [ ] **Step 2: 写样式**

```css file=src/styles.css
/* ===== 设计令牌：白天草坪（浅色，完整定义） ===== */
:root {
  --font: "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif;
  --bg: #9ed36a;
  --grass-a: #a5d66f;
  --grass-b: #98ce62;
  --on-grass: #2f5d1e;
  --ink: #3b2a1a;
  --panel: #fffbf0;
  --panel-2: #fff1d6;
  --panel-text: #3b2a1a;
  --panel-soft: #7a5a34;
  --tile-face: #fffbf0;
  --tile-side: #e2b878;
  --tile-edge: #7a5a34;
  --tile-shade: rgba(30, 43, 18, .48);
  --wood: #8d5a2e;
  --wood-edge: #5b3718;
  --cell: #6b4220;
  --wood-text: #fff3df;
  --go: #ff8a1f;
  --go-edge: #a94d00;
  --go-text: #ffffff;
  --soft: #ffffff;
  --soft-text: #2f5d1e;
  --prop: #45b7f0;
  --prop-edge: #0b5c8e;
  --badge: #ff5252;
  --danger: #e53935;
  --bubble: #ffffff;
  --bubble-text: #5a3413;
  --scrim: rgba(22, 34, 12, .55);
  --hint: #ffd43b;
  --moon: 0;
  color-scheme: light;
}

/* ===== 夜晚后院（深色）：跟随系统；显式浅色时不生效 ===== */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #1e3321;
    --grass-a: #223b22;
    --grass-b: #1d341e;
    --on-grass: #d8ecc4;
    --ink: #140d06;
    --panel: #2d261e;
    --panel-2: #3a3027;
    --panel-text: #f6ead6;
    --panel-soft: #cdb896;
    --tile-face: #f2e8d2;
    --tile-side: #b48c55;
    --tile-edge: #4a3520;
    --tile-shade: rgba(4, 10, 4, .56);
    --wood: #6a4223;
    --wood-edge: #2c190a;
    --cell: #4a2c14;
    --wood-text: #f3e2c6;
    --go: #f07e16;
    --go-edge: #6e3200;
    --soft: #3b4b2f;
    --soft-text: #e5f3d3;
    --prop: #2e92c7;
    --prop-edge: #093a5c;
    --badge: #ff5a5a;
    --danger: #ff6b5e;
    --bubble: #fff8ea;
    --scrim: rgba(0, 0, 0, .6);
    --hint: #ffe066;
    --moon: 1;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #1e3321;
  --grass-a: #223b22;
  --grass-b: #1d341e;
  --on-grass: #d8ecc4;
  --ink: #140d06;
  --panel: #2d261e;
  --panel-2: #3a3027;
  --panel-text: #f6ead6;
  --panel-soft: #cdb896;
  --tile-face: #f2e8d2;
  --tile-side: #b48c55;
  --tile-edge: #4a3520;
  --tile-shade: rgba(4, 10, 4, .56);
  --wood: #6a4223;
  --wood-edge: #2c190a;
  --cell: #4a2c14;
  --wood-text: #f3e2c6;
  --go: #f07e16;
  --go-edge: #6e3200;
  --soft: #3b4b2f;
  --soft-text: #e5f3d3;
  --prop: #2e92c7;
  --prop-edge: #093a5c;
  --badge: #ff5a5a;
  --danger: #ff6b5e;
  --bubble: #fff8ea;
  --scrim: rgba(0, 0, 0, .6);
  --hint: #ffe066;
  --moon: 1;
  color-scheme: dark;
}

/* ===== 基础 ===== */
*, *::before, *::after { box-sizing: border-box; }
html { box-sizing: border-box; height: 100%; }
body {
  height: 100%;
  margin: 0;
  background-color: var(--bg);
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='%23000' fill-opacity='.06'%3E%3Cellipse cx='30' cy='38' rx='9' ry='7'/%3E%3Ccircle cx='21' cy='27' r='3.6'/%3E%3Ccircle cx='27' cy='21' r='3.6'/%3E%3Ccircle cx='34' cy='21' r='3.6'/%3E%3Ccircle cx='40' cy='27' r='3.6'/%3E%3Cellipse cx='88' cy='96' rx='9' ry='7'/%3E%3Ccircle cx='79' cy='85' r='3.6'/%3E%3Ccircle cx='85' cy='79' r='3.6'/%3E%3Ccircle cx='92' cy='79' r='3.6'/%3E%3Ccircle cx='98' cy='85' r='3.6'/%3E%3C/g%3E%3C/svg%3E"),
    repeating-linear-gradient(180deg, var(--grass-a) 0 40px, var(--grass-b) 40px 80px);
  color: var(--panel-text);
  font-family: var(--font);
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
}
button { font: inherit; color: inherit; }
[hidden] { display: none !important; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
:focus-visible { outline: 3px solid var(--hint); outline-offset: 2px; }

/* ===== 外壳：手机竖屏，桌面居中成手机比例 ===== */
.app { position: relative; height: 100%; max-width: 480px; margin: 0 auto; overflow: hidden; isolation: isolate; }
.app::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 200px;
  pointer-events: none;
  opacity: var(--moon);
  background:
    radial-gradient(circle at 84% 44px, #fff6d8 0 16px, rgba(255, 246, 216, .22) 17px 30px, transparent 31px),
    radial-gradient(circle at 12% 30px, #ffffff 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 30% 72px, #ffffff 0 1.2px, transparent 2.5px),
    radial-gradient(circle at 54% 22px, #ffffff 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 66% 92px, #ffffff 0 1px, transparent 2.5px),
    radial-gradient(circle at 94% 118px, #ffffff 0 1.3px, transparent 2.5px);
}
@media (min-width: 720px) and (min-height: 700px) {
  .app { height: calc(100% - 40px); margin-block: 20px; border: 3px solid var(--ink); border-radius: 30px; box-shadow: 0 10px 0 var(--ink); background: inherit; }
}
.screen { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 10px 16px 12px; }

/* ===== 通用按钮 ===== */
.icon-btn {
  width: 44px; height: 44px; padding: 0;
  display: grid; place-items: center;
  border: 3px solid var(--ink); border-radius: 14px;
  background: var(--soft); color: var(--soft-text);
  box-shadow: 0 4px 0 var(--ink);
  cursor: pointer; font-size: 22px; font-weight: 900;
}
.icon-btn svg { width: 22px; height: 22px; fill: currentColor; }
.icon-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.btn {
  min-height: 48px; padding: 10px 16px;
  border: 3px solid var(--ink); border-radius: 18px;
  font-size: 18px; font-weight: 800; letter-spacing: .04em;
  box-shadow: 0 5px 0 var(--ink);
  cursor: pointer;
  transition: transform .08s, box-shadow .08s;
}
.btn:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--ink); }
.btn:disabled { cursor: default; filter: grayscale(.6); }
.btn-go { background: var(--go); color: var(--go-text); text-shadow: 0 2px 0 var(--go-edge); }
.btn-soft { background: var(--soft); color: var(--soft-text); }

/* ===== 首页 ===== */
.home { align-items: center; gap: 8px; }
.home-top { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 48px; }
.online {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px;
  background: var(--panel); color: var(--panel-text);
  border: 2px solid var(--ink); font-size: 14px; font-weight: 700;
}
.online b { font-variant-numeric: tabular-nums; }
.online-dot { width: 8px; height: 8px; border-radius: 50%; background: #3ccf4e; box-shadow: 0 0 0 3px rgba(60, 207, 78, .25); }
.logo { margin: 2px 0 0; width: min(94%, 380px); line-height: 0; }
.logo svg { width: 100%; height: auto; overflow: visible; }
.hero { flex: 1 1 auto; min-height: 0; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
.hero-dog { width: min(46vw, 190px); max-height: 100%; aspect-ratio: 1; animation: bob 2.4s ease-in-out infinite; }
.hero-dog svg { width: 100%; height: 100%; display: block; }
.hero-line { margin: 0; color: var(--on-grass); font-weight: 800; font-size: 17px; letter-spacing: .06em; text-align: center; text-wrap: balance; }
.home-actions { width: 100%; display: grid; gap: 12px; }
.home-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn-big { display: grid; gap: 2px; padding: 12px 16px 10px; }
.btn-title { font-size: 26px; letter-spacing: .1em; }
.btn-sub { font-size: 14px; font-weight: 700; letter-spacing: .04em; color: rgba(255, 255, 255, .92); }
.home-foot { width: 100%; min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--on-grass); font-size: 14px; font-weight: 800; }
.team-chip { display: inline-flex; align-items: center; gap: 6px; }
.team-chip svg { width: 30px; height: 30px; }

/* ===== 对局 ===== */
.bar { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 10px; min-height: 52px; }
.bar-title {
  justify-self: center; padding: 5px 18px; border-radius: 999px;
  background: var(--panel); color: var(--panel-text); border: 3px solid var(--ink);
  font-size: 18px; font-weight: 900; letter-spacing: .06em; white-space: nowrap;
}
.bar-left {
  padding: 5px 12px; border-radius: 999px;
  background: var(--wood); color: var(--wood-text); border: 2px solid var(--wood-edge);
  font-size: 14px; font-weight: 800; white-space: nowrap;
}
.bar-left b { font-variant-numeric: tabular-nums; }
.stage { position: relative; flex: 1 1 auto; min-height: 0; margin-top: 4px; }
.slot {
  position: relative; align-self: center; width: var(--slot-w, 100%); max-width: 100%;
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 7px;
  border-radius: 16px; background: var(--wood); border: 3px solid var(--wood-edge);
  box-shadow: inset 0 3px 0 rgba(255, 255, 255, .16), 0 4px 0 var(--wood-edge);
}
.slot-cell { display: block; aspect-ratio: 1 / 1.12; border-radius: 10px; background: var(--cell); box-shadow: inset 0 3px 0 rgba(0, 0, 0, .25); }
.slot.is-danger { border-color: var(--danger); box-shadow: inset 0 3px 0 rgba(255, 255, 255, .16), 0 4px 0 var(--danger), 0 0 0 3px rgba(229, 57, 53, .35); animation: throb 1.2s ease-in-out infinite; }
.slot.is-shake { animation: shake .5s ease-in-out; }
.dock { display: flex; align-items: center; gap: 10px; padding: 12px 0 2px; min-height: 86px; }
.mascot { position: relative; width: 64px; height: 64px; flex: none; }
.mascot-face { width: 64px; height: 64px; }
.mascot-face svg { width: 100%; height: 100%; display: block; }
.bubble {
  position: absolute; left: 4px; bottom: calc(100% + 10px); z-index: 1200;
  width: max-content; max-width: min(260px, 72vw);
  padding: 8px 12px; border-radius: 14px;
  background: var(--bubble); color: var(--bubble-text); border: 2px solid var(--ink);
  font-size: 14px; font-weight: 700; line-height: 1.45;
  box-shadow: 0 3px 0 rgba(0, 0, 0, .2);
  animation: pop-in .2s ease-out;
}
.bubble::after { content: ""; position: absolute; left: 22px; top: 100%; border: 8px solid transparent; border-top-color: var(--ink); }
.props { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.prop {
  position: relative; display: grid; justify-items: center; gap: 2px;
  padding: 8px 0 6px; border-radius: 18px;
  border: 3px solid var(--prop-edge); background: var(--prop); color: #ffffff;
  font-size: 14px; font-weight: 800; box-shadow: 0 4px 0 var(--prop-edge); cursor: pointer;
}
.prop:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--prop-edge); }
.prop-ic svg { width: 26px; height: 26px; display: block; fill: none; stroke: #ffffff; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.prop .badge {
  position: absolute; top: -9px; right: -6px; min-width: 22px; height: 22px; padding: 0 5px;
  border-radius: 11px; border: 2px solid #ffffff; background: var(--badge); color: #ffffff;
  font-style: normal; font-size: 13px; font-weight: 900; line-height: 18px; text-align: center;
}
.prop.is-idle { filter: saturate(.55); }
.prop.is-empty { filter: grayscale(.9); }
.prop.is-empty .badge { background: #8a8a8a; }
.prop.is-deny { animation: shake .3s ease-in-out; }

/* ===== 牌（全部在 playfield 中，靠 transform 定位） ===== */
.playfield { position: absolute; inset: 0; pointer-events: none; --t: 48px; }
.tile {
  position: absolute; left: 0; top: 0;
  width: var(--t); height: calc(var(--t) * 1.12);
  padding: 0; margin: 0; border: 0; background: none;
  transform-origin: 0 0; pointer-events: auto; cursor: pointer;
}
.tile-face {
  position: absolute; left: 0; top: 0; width: var(--t); height: var(--t);
  display: grid; place-items: center;
  border: max(1.5px, calc(var(--t) * .04)) solid var(--tile-edge); border-radius: 18%;
  background: var(--tile-face);
  box-shadow: 0 calc(var(--t) * .12) 0 var(--tile-side), 0 calc(var(--t) * .12) 0 max(1.5px, calc(var(--t) * .04)) var(--tile-edge);
  transition: translate .12s ease-out;
}
.tile-face svg { width: 80%; height: 80%; display: block; pointer-events: none; }
.tile::after {
  content: ""; position: absolute; left: 0; top: 0;
  width: var(--t); height: calc(var(--t) * 1.12); border-radius: 18%;
  background: var(--tile-shade); opacity: 0; pointer-events: none;
  transition: opacity .25s ease-out;
}
.tile.is-covered { cursor: default; }
.tile.is-covered::after { opacity: 1; }
.tile.is-slot { cursor: default; }
.tile.is-flying { z-index: 1000 !important; }
.tile.is-hint .tile-face { animation: hint 1s ease-in-out infinite; }
@media (hover: hover) {
  .tile.is-free:hover .tile-face { translate: 0 -3px; }
}

/* ===== 弹层 ===== */
.modal-layer { position: absolute; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 16px; background: var(--scrim); animation: fade-in .18s ease-out; }
.modal {
  width: min(100%, 400px); max-height: 100%; overflow-y: auto;
  padding: 18px 18px 16px; border-radius: 24px;
  background: var(--panel); color: var(--panel-text);
  border: 3px solid var(--ink); box-shadow: 0 8px 0 var(--ink);
  animation: pop-in .26s cubic-bezier(.2, 1.4, .4, 1);
  -webkit-user-select: text; user-select: text;
}
.modal:focus { outline: none; }
.modal-title { margin: 0 0 10px; font-size: 24px; font-weight: 900; letter-spacing: .06em; text-align: center; text-wrap: balance; }
.modal-body { font-size: 15px; line-height: 1.65; }
.modal-body p { margin: 0 0 8px; }
.modal-actions { display: grid; gap: 10px; margin-top: 16px; }
.modal-actions.two { grid-template-columns: 1fr 1fr; }
.modal-dog { width: 104px; height: 104px; margin: -4px auto 6px; }
.modal-dog svg { width: 100%; height: 100%; display: block; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0 12px; }
.stat { display: grid; gap: 2px; padding: 8px 6px; border-radius: 14px; background: var(--panel-2); border: 2px solid var(--ink); text-align: center; }
.stat small { font-size: 12px; color: var(--panel-soft); font-weight: 700; }
.stat b { font-size: 20px; font-weight: 900; font-variant-numeric: tabular-nums; }
.card-wrap { display: grid; place-items: center; aspect-ratio: 3 / 4; max-height: 34vh; margin: 0 auto; border-radius: 14px; border: 2px solid var(--ink); background: var(--panel-2); overflow: hidden; color: var(--panel-soft); font-size: 13px; }
.card-wrap img { width: 100%; height: 100%; object-fit: contain; display: block; -webkit-user-select: auto; user-select: auto; -webkit-touch-callout: default; }
.card-tip { margin: 6px 0 0; text-align: center; font-size: 12px; color: var(--panel-soft); }
.roast { margin-top: 10px; padding: 10px 12px; border-radius: 14px; background: var(--panel-2); border: 2px dashed var(--panel-soft); font-size: 15px; line-height: 1.6; white-space: pre-wrap; min-height: 3.2em; }
.rules { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.rules li { display: grid; grid-template-columns: 30px 1fr; gap: 8px; align-items: start; }
.rules svg { width: 30px; height: 30px; }
.choice-list { display: grid; gap: 10px; }
.choice { display: grid; gap: 2px; text-align: left; padding: 10px 14px; border-radius: 16px; border: 3px solid var(--ink); background: var(--panel-2); color: var(--panel-text); box-shadow: 0 4px 0 var(--ink); cursor: pointer; }
.choice:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--ink); }
.choice b { font-size: 18px; }
.choice small { font-size: 13px; color: var(--panel-soft); font-weight: 600; }
.team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.team { display: grid; justify-items: center; gap: 2px; padding: 8px 4px; border-radius: 16px; border: 3px solid var(--ink); background: var(--panel-2); color: var(--panel-text); cursor: pointer; box-shadow: 0 3px 0 var(--ink); }
.team svg { width: 64px; height: 64px; display: block; }
.team b { font-size: 14px; }
.team small { font-size: 12px; color: var(--panel-soft); font-variant-numeric: tabular-nums; }
.team.is-on { background: var(--go); color: var(--go-text); }
.team.is-on small { color: var(--go-text); }
.pack-stats { margin: 12px 0 0; text-align: center; font-size: 14px; color: var(--panel-soft); font-weight: 700; }
.switches { display: grid; gap: 10px; }
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 16px; font-weight: 800; }
.switch { position: relative; width: 56px; height: 32px; padding: 0; border-radius: 999px; border: 3px solid var(--ink); background: var(--panel-2); cursor: pointer; }
.switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 22px; height: 22px; border-radius: 50%; background: var(--panel-soft); transition: transform .15s; }
.switch[aria-pressed="true"] { background: var(--go); }
.switch[aria-pressed="true"]::after { transform: translateX(24px); background: #ffffff; }
.intro-big { margin: 4px 0 10px; text-align: center; font-size: 44px; font-weight: 900; letter-spacing: .08em; color: var(--danger); text-shadow: 0 3px 0 var(--ink); animation: throb 1s ease-in-out infinite; }

/* ===== 提示、连消文字、特效层 ===== */
.fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2500; }
.toasts { position: absolute; left: 12px; right: 12px; top: 62px; z-index: 2600; display: grid; justify-items: center; gap: 8px; pointer-events: none; }
.toast { max-width: 100%; padding: 8px 14px; border-radius: 999px; background: var(--panel); color: var(--panel-text); border: 2px solid var(--ink); box-shadow: 0 3px 0 var(--ink); font-size: 14px; font-weight: 800; text-align: center; animation: toast 2.6s ease forwards; }
.combo {
  position: absolute; z-index: 2400; transform: translate(-50%, -50%);
  color: #ffffff; font-size: 30px; font-weight: 900; letter-spacing: .06em; white-space: nowrap; pointer-events: none;
  text-shadow: 0 3px 0 #3b2a1a, 2px 2px 0 #3b2a1a, -2px 2px 0 #3b2a1a, 2px -2px 0 #3b2a1a, -2px -2px 0 #3b2a1a;
  animation: combo .95s ease-out forwards;
}

/* ===== 动画 ===== */
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes shake { 0%, 100% { translate: 0 0; } 20% { translate: -6px 0; } 40% { translate: 6px 0; } 60% { translate: -4px 0; } 80% { translate: 4px 0; } }
@keyframes throb { 0%, 100% { scale: 1; } 50% { scale: 1.02; } }
@keyframes pop-in { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes toast { 0% { opacity: 0; transform: translateY(-8px); } 10%, 80% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-6px); } }
@keyframes combo { 0% { opacity: 0; scale: .5; } 20% { opacity: 1; scale: 1.15; } 70% { opacity: 1; scale: 1; translate: 0 -24px; } 100% { opacity: 0; translate: 0 -40px; } }
@keyframes hint { 0%, 100% { box-shadow: 0 calc(var(--t) * .12) 0 var(--tile-side), 0 calc(var(--t) * .12) 0 2px var(--tile-edge), 0 0 0 0 var(--hint); } 50% { box-shadow: 0 calc(var(--t) * .12) 0 var(--tile-side), 0 calc(var(--t) * .12) 0 2px var(--tile-edge), 0 0 0 6px var(--hint); } }

/* ===== 减少动态 ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/index.html src/styles.css
git commit -m "feat: 页面骨架与昼夜主题样式"
```

---

### Task 11: 本地存档与平台能力

**Files:**
- Create: `src/ui/storage.js`
- Create: `src/ui/platform.js`
- Test: `tests/storage.test.mjs`
- Test: `tests/platform.test.mjs`

**Interfaces:**
- Consumes：Task 7 的 `BREEDS`
- Produces:
  - storage 模块：
    - 常量与工具函数：`SAVE_KEY`、`defaultSave()`、`dateKey(date?)`、`prevDateKey(key)`
    - `createStore(storage | null)`，返回的对象包含：
      - `data`（getter）
      - `peekDay(key)`
      - `setSetting(name, v)`、`setTeam(key)`
      - `recordPlay()`
      - `recordLoss(key, remaining)`
      - `recordWin({ daily, level, key })`
      - `currentStreak(today)`
  - platform 模块：
    - 纯函数：`sanitizeTeam(v)`、`summarizePeers(peers)`（返回 `{ total, teams }`）、`buildRoastPrompt(summary)`
    - `initPlatform({ onPeers, onWinBroadcast, onChange })`：返回 `{ inClaude, room, sample, downloads }`，能力在 Promise 解析之后才逐个点亮。
    - 调用 room 的封装：`setPresence(api, patch)`、`broadcastWin(api, team)`
    - `aiRoast(api, summary, onText, signal)`：返回 `Promise<string>`。
    - 热更新续玩：`hotBoot(start)`、`hotSnapshot(fn)`

- [ ] **Step 1: 写失败的测试**

```js file=tests/storage.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, defaultSave, dateKey, prevDateKey, SAVE_KEY } from '../src/ui/storage.js';

function mem(initial) {
  const m = new Map(initial === undefined ? [] : [[SAVE_KEY, initial]]);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
}

test('日期工具', () => {
  assert.equal(dateKey(new Date(2026, 8, 3)), '2026-09-03');
  assert.equal(prevDateKey('2026-03-01'), '2026-02-28');
  assert.equal(prevDateKey('2026-01-01'), '2025-12-31');
});

test('空存储、损坏存档、抛错存储、无存储都退回默认值', () => {
  assert.deepEqual(createStore(mem()).data, defaultSave());
  assert.deepEqual(createStore(mem('{坏掉的 json')).data, defaultSave());
  const boom = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const s = createStore(boom);
  assert.doesNotThrow(() => s.setTeam('husky'));
  assert.equal(s.data.team, 'husky');
  assert.deepEqual(createStore(null).data, defaultSave());
});

test('写入后可被新实例读回，缺省字段补默认', () => {
  const st = mem();
  const a = createStore(st);
  a.setTeam('corgi');
  a.setSetting('music', false);
  const b = createStore(st);
  assert.equal(b.data.team, 'corgi');
  assert.equal(b.data.settings.music, false);
  assert.equal(b.data.settings.sfx, true);
});

test('每日通关：同一天只记一次，连续打卡累加，断档重置', () => {
  const s = createStore(mem());
  s.recordWin({ daily: true, level: 'daily1', key: '2026-09-21' });
  assert.equal(s.peekDay('2026-09-21').l1, true);
  s.recordWin({ daily: true, level: 'daily2', key: '2026-09-21' });
  s.recordWin({ daily: true, level: 'daily2', key: '2026-09-21' });
  assert.equal(s.data.stats.dailyWins, 1);
  assert.equal(s.data.stats.dogsContributed, 1);
  s.recordWin({ daily: true, level: 'daily2', key: '2026-09-22' });
  assert.equal(s.data.stats.streak, 2);
  assert.equal(s.currentStreak('2026-09-23'), 2);
  assert.equal(s.currentStreak('2026-09-25'), 0);
  s.recordWin({ daily: true, level: 'daily2', key: '2026-09-25' });
  assert.equal(s.data.stats.streak, 1);
  assert.equal(s.data.stats.wins, 5);
});

test('失败记录尝试次数与最少剩余；peekDay 不创建记录', () => {
  const s = createStore(mem());
  s.recordLoss('2026-09-23', 50);
  s.recordLoss('2026-09-23', 80);
  assert.deepEqual(s.peekDay('2026-09-23'), { l1: false, l2: false, attempts: 2, bestRemaining: 50 });
  assert.deepEqual(s.peekDay('2020-01-01'), { l1: false, l2: false, attempts: 0, bestRemaining: null });
  assert.equal(s.data.daily['2020-01-01'], undefined);
});
```

```js file=tests/platform.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTeam, summarizePeers, buildRoastPrompt, initPlatform, hotBoot } from '../src/ui/platform.js';

test('阵营白名单', () => {
  assert.equal(sanitizeTeam('husky'), 'husky');
  assert.equal(sanitizeTeam('<img src=x>'), null);
  assert.equal(sanitizeTeam(3), null);
});

test('在线狗友汇总：只数真人，阵营走白名单', () => {
  const r = summarizePeers([
    { kind: 'viewer', presence: { team: 'shiba' } },
    { kind: 'viewer', presence: { team: 'shiba' } },
    { kind: 'viewer', presence: { team: 'evil' } },
    { kind: 'viewer', presence: {} },
    { kind: 'agent', presence: { team: 'corgi' } },
  ]);
  assert.deepEqual(r, { total: 4, teams: { shiba: 2 } });
  assert.deepEqual(summarizePeers(undefined), { total: 0, teams: {} });
});

test('AI 狗评提示词包含本局数据与口吻要求', () => {
  const p = buildRoastPrompt({ levelName: '第 2 关', result: 'lost', remaining: 37, seconds: 125, moves: 88, propsUsed: 2, used: { moveOut: 1, undo: 0, shuffle: 1, revive: 0 }, teamName: '柴犬队' });
  for (const s of ['第 2 关', '37', '125', '88', '柴犬队', '柴犬', '中文']) assert.ok(p.includes(s), `缺少：${s}`);
  assert.ok(!p.includes('undefined'));
});

test('不在 claude.ai 里时平台能力为空，hotBoot 以空数据启动', () => {
  const api = initPlatform({});
  assert.equal(api.inClaude, false);
  assert.equal(api.room, null);
  let got = null;
  hotBoot((d) => { got = d; });
  assert.deepEqual(got, {});
});

test('模拟 claude.ai：能力到位后点亮并转发事件', async () => {
  const listeners = {};
  let peersHandler = null;
  const room = {
    onPeers: (fn) => { peersHandler = fn; return () => {}; },
    on: (topic, fn) => { listeners[topic] = fn; return () => {}; },
    presence: async () => {},
    emit: async () => {},
  };
  const sample = async () => ({ text: 'x', truncated: false });
  globalThis.claude = { use: async (name) => (name === 'room' ? room : name === 'sample' ? sample : null) };
  try {
    const seen = { peers: null, win: [], changes: 0 };
    const api = initPlatform({
      onPeers: (p) => { seen.peers = p; },
      onWinBroadcast: (team, me) => seen.win.push([team, me]),
      onChange: () => { seen.changes++; },
    });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(api.inClaude, true);
    assert.equal(api.room, room);
    assert.equal(api.sample, sample);
    assert.equal(api.downloads, null);
    peersHandler({ peers: [{ kind: 'viewer', presence: { team: 'corgi' } }] });
    assert.deepEqual(seen.peers, { total: 1, teams: { corgi: 1 } });
    listeners.win({ data: { team: 'golden' }, sameTab: false, isMe: false });
    listeners.win({ data: { team: 'golden' }, sameTab: true, isMe: true });
    assert.deepEqual(seen.win, [['golden', false]]);
    assert.ok(seen.changes >= 2);
  } finally {
    delete globalThis.claude;
  }
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test tests/storage.test.mjs tests/platform.test.mjs`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 实现存档**

```js file=src/ui/storage.js
// 本地存档：设置、狗群阵营、每日记录与统计；存储不可用或存档损坏时退回默认值，只在内存里运行
export const SAVE_KEY = 'glgg:v1';

export function defaultSave() {
  return {
    settings: { music: true, sfx: true, vibrate: true },
    team: null,
    daily: {},
    stats: { plays: 0, wins: 0, dailyWins: 0, streak: 0, lastDailyWin: null, dogsContributed: 0 },
  };
}

export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function prevDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

const emptyDay = () => ({ l1: false, l2: false, attempts: 0, bestRemaining: null });

export function createStore(storage) {
  const save = defaultSave();
  try {
    const raw = storage ? storage.getItem(SAVE_KEY) : null;
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        Object.assign(save.settings, data.settings);
        Object.assign(save.stats, data.stats);
        if (data.daily && typeof data.daily === 'object') save.daily = data.daily;
        if (typeof data.team === 'string') save.team = data.team;
      }
    }
  } catch { /* 存档损坏或存储不可读：用默认值 */ }

  const persist = () => {
    try { if (storage) storage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* 隐私模式、配额已满：忽略 */ }
  };
  const day = (key) => {
    if (!save.daily[key]) save.daily[key] = emptyDay();
    return save.daily[key];
  };

  return {
    get data() { return save; },
    peekDay: (key) => save.daily[key] || emptyDay(),
    setSetting(name, value) { save.settings[name] = value; persist(); },
    setTeam(team) { save.team = team; persist(); },
    recordPlay() { save.stats.plays++; persist(); },
    recordLoss(key, remaining) {
      const d = day(key);
      d.attempts++;
      if (d.bestRemaining === null || remaining < d.bestRemaining) d.bestRemaining = remaining;
      persist();
    },
    recordWin({ daily, level, key }) {
      save.stats.wins++;
      if (daily && level === 'daily1') day(key).l1 = true;
      if (daily && level === 'daily2') {
        const d = day(key);
        d.attempts++;
        d.bestRemaining = 0;
        if (!d.l2) {
          d.l2 = true;
          const s = save.stats;
          s.dailyWins++;
          s.dogsContributed++;
          s.streak = s.lastDailyWin === prevDateKey(key) ? s.streak + 1 : 1;
          s.lastDailyWin = key;
        }
      }
      persist();
    },
    currentStreak(today) {
      const s = save.stats;
      return s.lastDailyWin === today || s.lastDailyWin === prevDateKey(today) ? s.streak : 0;
    },
  };
}
```

- [ ] **Step 4: 实现平台能力**

```js file=src/ui/platform.js
// claude.ai 平台能力的渐进增强：room（在线狗友与通关广播）、sample（AI 狗评）、downloads（保存战绩图）、hot（热更新续玩）
// 普通网页里 globalThis.claude 不存在，所有能力为空，页面照常运行
import { BREEDS } from '../art/dogs.js';

const TEAM_KEYS = new Set(BREEDS.map((b) => b.key));

export function sanitizeTeam(value) {
  return typeof value === 'string' && TEAM_KEYS.has(value) ? value : null;
}

// 在线人数与各阵营人数：只数真人（kind === 'viewer'），阵营只认白名单
export function summarizePeers(peers) {
  const teams = {};
  let total = 0;
  for (const p of peers || []) {
    if (p.kind !== 'viewer') continue;
    total++;
    const t = sanitizeTeam(p.presence && p.presence.team);
    if (t) teams[t] = (teams[t] || 0) + 1;
  }
  return { total, teams };
}

export function buildRoastPrompt(s) {
  const result = s.result === 'won' ? '通关' : `失败，还剩 ${s.remaining} 张没消`;
  return [
    '你是网页小游戏「狗了个狗」里的柴犬吉祥物。玩法和《羊了个羊》一样：点牌进 7 格卡槽，三张相同就消除，卡槽满了就输。',
    '请用柴犬的口吻、简体中文，写两到三句话点评玩家这一局：毒舌但友善、好笑、有梗，可以带一两个「汪」；不要使用表情符号，不超过 90 个字，不要逐条复述数据。',
    `本局数据：关卡「${s.levelName}」；结果：${result}；用时 ${s.seconds} 秒；拿牌 ${s.moves} 次；用了道具 ${s.propsUsed} 次（移出 ${s.used.moveOut}、撤回 ${s.used.undo}、洗牌 ${s.used.shuffle}、复活 ${s.used.revive}）；玩家阵营：${s.teamName || '还没加入狗群'}。`,
    '直接输出点评正文。',
  ].join('\n');
}

export function initPlatform({ onPeers, onWinBroadcast, onChange } = {}) {
  const api = { inClaude: false, room: null, sample: null, downloads: null };
  const c = globalThis.claude;
  if (!c || typeof c.use !== 'function') return api;
  api.inClaude = true;
  const use = (name) => Promise.resolve().then(() => c.use(name)).catch(() => null);
  use('room').then((room) => {
    if (!room) return;
    try {
      room.onPeers((change) => onPeers?.(summarizePeers(change.peers)), () => onPeers?.(null));
      room.on('win', (msg) => { if (!msg.sameTab) onWinBroadcast?.(sanitizeTeam(msg.data && msg.data.team), !!msg.isMe); });
      api.room = room;
    } catch { api.room = null; }
    onChange?.(api);
  });
  use('sample').then((sample) => { if (sample) { api.sample = sample; onChange?.(api); } });
  use('downloads').then((downloads) => { if (downloads) { api.downloads = downloads; onChange?.(api); } });
  return api;
}

export function setPresence(api, patch) {
  if (!api.room) return;
  Promise.resolve().then(() => api.room.presence({ ...patch, team: sanitizeTeam(patch.team) })).catch(() => {});
}

export function broadcastWin(api, team) {
  if (!api.room) return;
  Promise.resolve().then(() => api.room.emit('win', { team: sanitizeTeam(team) })).catch(() => {});
}

export async function aiRoast(api, summary, onText, signal) {
  if (!api.sample) throw { code: 'unavailable', message: '当前环境不支持 AI 狗评' };
  const res = await api.sample(buildRoastPrompt(summary), {
    onText: ({ text }) => onText(text),
    modelTier: 'quick',
    cache: false,
    signal,
  });
  return res.text;
}

// 热更新续玩：页面重新发布后，用快照里的动作日志恢复对局
export function hotBoot(start) {
  const hot = globalThis.claude && globalThis.claude.hot;
  if (hot && typeof hot.ready === 'function') {
    try { hot.ready(start); return; } catch { /* 退回普通启动 */ }
  }
  start((hot && hot.data) || {});
}

export function hotSnapshot(fn) {
  const hot = globalThis.claude && globalThis.claude.hot;
  if (hot && typeof hot.snapshot === 'function') {
    try { hot.snapshot(fn); } catch { /* 不支持就算了 */ }
  }
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `node --test tests/storage.test.mjs tests/platform.test.mjs`
Expected: PASS（10 个测试）

- [ ] **Step 6: 提交**

```bash
git add src/ui/storage.js src/ui/platform.js tests/storage.test.mjs tests/platform.test.mjs
git commit -m "feat: 本地存档与 claude.ai 平台能力渐进增强"
```

---

### Task 12: 特效层与战绩图

**Files:**
- Create: `src/ui/fx.js`
- Create: `src/ui/share.js`

**Interfaces:**
- Consumes：Task 7 的 `logoSVG`、`dogHeadSVG`、`iconSVG`
- Produces:
  - `createFx(canvas)`，返回 `{ resize(), burst(x, y, color), confetti() }`。坐标以 `.app` 左上角为原点；设置了减少动态时什么也不画。
  - `renderShareCard(info): Promise<{ blob: Blob, url: string }>`，`info` 使用 main.js 里 `summary()` 返回的结构。
  - `saveCard(blob, platform)`：返回 `Promise<'saved' | 'declined' | 'failed' | 'shared' | 'downloaded'>`。

- [ ] **Step 1: 写特效层**

```js file=src/ui/fx.js
// Canvas 特效层：消除时的骨头/爪印/星星爆点与通关彩带；没有粒子时停止动画循环
const PALETTE = ['#FF8A1F', '#FFD43B', '#43A047', '#29B6F6', '#F06292', '#8E44AD', '#FFFFFF'];
const rand = (a, b) => a + Math.random() * (b - a);

export function createFx(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let parts = [];
  let raf = 0;
  let last = 0;
  let w = 0;
  let h = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    w = r.width;
    h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const circle = (x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); };

  function draw(p) {
    const s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.fade));
    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#3B2A1A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (p.shape === 'bone') {
      circle(-s * 0.55, -s * 0.2, s * 0.26);
      circle(-s * 0.55, s * 0.2, s * 0.26);
      circle(s * 0.55, -s * 0.2, s * 0.26);
      circle(s * 0.55, s * 0.2, s * 0.26);
      ctx.rect(-s * 0.55, -s * 0.16, s * 1.1, s * 0.32);
      ctx.fill();
    } else if (p.shape === 'paw') {
      ctx.ellipse(0, s * 0.18, s * 0.34, s * 0.28, 0, 0, Math.PI * 2);
      for (const [dx, dy] of [[-0.38, -0.2], [-0.13, -0.42], [0.13, -0.42], [0.38, -0.2]]) circle(dx * s, dy * s, s * 0.13);
      ctx.fill();
    } else if (p.shape === 'star') {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.22 : s * 0.5;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.shape === 'rect') {
      ctx.rect(-s / 2, -s / 4, s, s / 2);
      ctx.fill();
    } else {
      circle(0, 0, s * 0.3);
      ctx.fill();
    }
    ctx.restore();
  }

  function frame(t) {
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 1 / 60);
    last = t;
    ctx.clearRect(0, 0, w, h);
    parts = parts.filter((p) => (p.life -= dt) > 0 && p.y < h + 80);
    const k = (d) => Math.pow(d, dt * 60);
    for (const p of parts) {
      p.vy += p.g * dt;
      p.vx *= k(p.drag);
      p.vy *= k(p.drag);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      draw(p);
    }
    if (parts.length) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; ctx.clearRect(0, 0, w, h); }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  function burst(x, y, color) {
    if (reduce) return;
    const shapes = ['bone', 'paw', 'star', 'dot'];
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(160, 420);
      parts.push({
        shape: shapes[i % 4], x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 160, g: 900, drag: 0.985,
        rot: rand(0, 6.28), vr: rand(-8, 8), size: rand(10, 18),
        color: i % 3 === 0 ? PALETTE[i % PALETTE.length] : color, life: rand(0.55, 0.9), fade: 0.3,
      });
    }
    kick();
  }

  function confetti() {
    if (reduce) return;
    for (let i = 0; i < 140; i++) {
      parts.push({
        shape: i % 5 === 0 ? 'bone' : 'rect', x: rand(0, w), y: rand(-h * 0.6, -10), vx: rand(-60, 60), vy: rand(80, 220),
        g: 140, drag: 0.995, rot: rand(0, 6.28), vr: rand(-6, 6), size: rand(10, 16),
        color: PALETTE[i % PALETTE.length], life: rand(2.6, 3.6), fade: 0.6,
      });
    }
    kick();
  }

  resize();
  return { resize, burst, confetti };
}
```

- [ ] **Step 2: 写战绩图**

```js file=src/ui/share.js
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
      : `${info.teamName} · 连续打卡 ${info.streak} 天`;
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
```

- [ ] **Step 3: 提交**

```bash
git add src/ui/fx.js src/ui/share.js
git commit -m "feat: 消除粒子、通关彩带与战绩图"
```

---

### Task 13: 牌面渲染与动画

**Files:**
- Create: `src/ui/board.js`

**Interfaces:**
- Consumes：
  - Task 7 的 `ICONS`
  - Task 3 的 `STACK_GAP`
  - Task 5 的 `BUFFER_COLS` 和 `Game`
  - Task 10 的 DOM 约定
- Produces:
  - `createBoard({ screen, stage, slotEl, playfield, onTap })`，返回的对象包含：
    - `mount(game)`、`clear()`、`resize()`、`refresh()`
    - `play(events, hooks): Promise<void>`，其中 `hooks` 为 `{ onLand?(ev), onEliminate?(ev, {x, y}) }`
    - `deny(id)`、`hint(id)`、`clearHint()`、`center(id)`
  - 坐标系：以 `#game`（与 `.app` 同大小）的左上角为原点。
  - 触发 `onTap(id)` 的方式有两种：鼠标或触屏的 pointerdown，以及键盘触发的 click（`detail === 0`）。

- [ ] **Step 1: 实现**

```js file=src/ui/board.js
// 牌面渲染：所有牌在覆盖整屏的 playfield 里，靠 transform 在场上 / 卡槽 / 移出区之间移动；按对局事件播放动画
import { ICONS } from '../art/icons.js';
import { STACK_GAP } from '../core/layout.js';
import { BUFFER_COLS } from '../core/game.js';

const ROW_H = 1.12;    // 盲盒堆与移出区那一行的高度（牌宽为单位）
const BUF_GAP = 0.1;   // 移出区列间距
const BUF_LIFT = 0.16; // 移出区叠放时每层上移
const T_MIN = 24;
const T_MAX = 64;

export function createBoard({ screen, stage, slotEl, playfield, onTap }) {
  const reduce = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const pos = new Map();
  let game = null;
  let els = [];
  let visualSlot = [];
  let T = 48;
  let S = 44;
  let bx = 0;
  let by = 0;
  let cells = [];
  let hinted = -1;

  const tf = (p) => `translate3d(${p.x}px, ${p.y}px, 0) scale(${p.s})`;

  // 鼠标/触屏在 pointerdown 就响应（更跟手）；键盘回车/空格产生的 click（detail === 0）另行处理
  playfield.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const el = e.target.closest('.tile');
    if (!el) return;
    e.preventDefault();
    onTap(Number(el.dataset.id));
  });
  playfield.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    const el = e.target.closest('.tile');
    if (el) onTap(Number(el.dataset.id));
  });

  function measure() {
    const L = game.level;
    const sr = screen.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    const unitsH = L.rows + STACK_GAP + ROW_H;
    const fit = Math.floor(Math.min(st.width / L.cols, st.height / unitsH));
    T = Math.max(T_MIN, Math.min(T_MAX, fit));
    bx = st.left - sr.left + (st.width - L.cols * T) / 2;
    by = st.top - sr.top + Math.max(0, (st.height - unitsH * T) / 2);
    playfield.style.setProperty('--t', `${T}px`);
    slotEl.style.setProperty('--slot-w', `${Math.round(L.cols * T + 20)}px`);
    cells = Array.from(slotEl.children, (c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left - sr.left, y: r.top - sr.top, w: r.width };
    });
    S = cells.length ? cells[0].w : T;
  }

  const zOf = (t) => (t.group === 'main' ? 10 + t.z * 20 + Math.round(t.y * 2) : 10 + t.z);
  function bufPos(col, h) {
    const L = game.level;
    const x0 = L.cols / 2 - (BUFFER_COLS + (BUFFER_COLS - 1) * BUF_GAP) / 2;
    return { x: bx + (x0 + col * (1 + BUF_GAP)) * T, y: by + (L.rows + STACK_GAP - h * BUF_LIFT) * T, s: 1, z: 700 + h * 4 + col };
  }
  function slotAt(i) {
    const c = cells[Math.max(0, Math.min(i, cells.length - 1))];
    return { x: c.x, y: c.y, s: S / T, z: 900 + i };
  }
  function posOf(id) {
    const st = game.state;
    const t = st.tiles[id];
    if (t.zone === 'slot') return slotAt(visualSlot.indexOf(id));
    if (t.zone === 'buffer') return bufPos(t.col, st.buffer[t.col].indexOf(id));
    return { x: bx + t.x * T, y: by + t.y * T, s: 1, z: zOf(t) };
  }

  function put(id, p) {
    const el = els[id];
    if (!el) return;
    el.style.transform = tf(p);
    el.style.zIndex = String(p.z);
    pos.set(id, p);
  }

  // 移到新位置；lift > 0 时走抛物线（先抬高再落下）
  function move(id, p, ms, lift = 0) {
    const el = els[id];
    if (!el) return Promise.resolve();
    const from = pos.get(id);
    for (const a of el.getAnimations()) a.finish();
    put(id, p);
    if (reduce || !from || !ms) return Promise.resolve();
    const frames = lift
      ? [{ transform: tf(from) }, { transform: tf({ x: (from.x + p.x) / 2, y: Math.min(from.y, p.y) - lift, s: Math.max(from.s, p.s) * 1.1 }), offset: 0.45 }, { transform: tf(p) }]
      : [{ transform: tf(from) }, { transform: tf(p) }];
    return el.animate(frames, { duration: ms, easing: 'cubic-bezier(.3,.7,.35,1)' }).finished.catch(() => {});
  }

  // 以牌中心为基准缩放（transform-origin 在左上角，需要补偿位移）
  function around(p, k) {
    const w = T * p.s;
    const h = T * ROW_H * p.s;
    return { x: p.x + (w - w * k) / 2, y: p.y + (h - h * k) / 2, s: p.s * k, z: p.z };
  }

  function pop(id) {
    const el = els[id];
    const p = pos.get(id);
    if (!el || !p) return Promise.resolve();
    const done = reduce
      ? Promise.resolve()
      : el.animate(
        [{ transform: tf(p), opacity: 1 }, { transform: tf(around(p, 1.25)), opacity: 1, offset: 0.35 }, { transform: tf(around(p, 0.2)), opacity: 0 }],
        { duration: 220, easing: 'ease-in', fill: 'forwards' },
      ).finished.catch(() => {});
    return done.then(() => { el.remove(); els[id] = null; pos.delete(id); });
  }

  function setIcon(id, kind) {
    const use = els[id] && els[id].querySelector('use');
    if (use) use.setAttribute('href', `#ic-${ICONS[kind].key}`);
  }

  async function flip(changes) {
    const ids = game.state.tiles.filter((t) => t.zone === 'board' && els[t.id]).map((t) => t.id);
    const squash = (p, k) => `${tf(p)} translate(${T / 2}px, 0) scaleX(${k}) translate(${-T / 2}px, 0)`;
    if (!reduce) {
      await Promise.all(ids.map((id) => els[id].animate(
        [{ transform: tf(pos.get(id)) }, { transform: squash(pos.get(id), 0.05) }],
        { duration: 150, easing: 'ease-in', fill: 'forwards' },
      ).finished.catch(() => {})));
    }
    for (const c of changes) setIcon(c.id, c.kind);
    if (!reduce) {
      await Promise.all(ids.map((id) => {
        const el = els[id];
        for (const a of el.getAnimations()) a.cancel();
        return el.animate([{ transform: squash(pos.get(id), 0.05) }, { transform: tf(pos.get(id)) }], { duration: 170, easing: 'ease-out' }).finished.catch(() => {});
      }));
    }
  }

  function refresh() {
    if (!game) return;
    for (const t of game.state.tiles) {
      const el = els[t.id];
      if (!el) continue;
      const free = game.isFree(t.id);
      const covered = !free && (t.zone === 'board' || t.zone === 'buffer');
      el.classList.toggle('is-covered', covered);
      el.classList.toggle('is-free', free);
      el.classList.toggle('is-slot', t.zone === 'slot');
      el.tabIndex = free ? 0 : -1;
      el.setAttribute('aria-label', `${ICONS[t.kind].name}${covered ? '，被压住' : t.zone === 'slot' ? '，在卡槽中' : ''}`);
    }
  }

  function mount(g) {
    game = g;
    const st = g.state;
    playfield.textContent = '';
    els = [];
    pos.clear();
    hinted = -1;
    visualSlot = st.slot.slice();
    measure();
    const frag = document.createDocumentFragment();
    for (const t of st.tiles) {
      if (t.zone === 'gone') continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tile';
      el.dataset.id = String(t.id);
      el.innerHTML = `<span class="tile-face"><svg aria-hidden="true" focusable="false"><use href="#ic-${ICONS[t.kind].key}"></use></svg></span>`;
      els[t.id] = el;
      frag.appendChild(el);
    }
    playfield.appendChild(frag);
    for (const t of st.tiles) if (els[t.id]) put(t.id, posOf(t.id));
    refresh();
    if (reduce) return;
    for (const t of st.tiles) {
      const el = els[t.id];
      if (!el || t.zone !== 'board') continue;
      const p = pos.get(t.id);
      el.animate(
        [{ transform: tf({ ...p, y: p.y - T * 1.6 }), opacity: 0 }, { transform: tf(p), opacity: 1 }],
        { duration: 360, delay: Math.min(620, t.z * 32 + (t.id % 9) * 10), easing: 'cubic-bezier(.2,.9,.3,1.15)', fill: 'backwards' },
      );
    }
  }

  async function play(events, hooks = {}) {
    for (const ev of events) {
      if (ev.type === 'pick') {
        visualSlot.splice(ev.slotIndex, 0, ev.id);
        const el = els[ev.id];
        el.classList.add('is-flying');
        refresh();
        const jobs = [move(ev.id, slotAt(ev.slotIndex), 200, T * 0.9)];
        visualSlot.forEach((id, i) => { if (id !== ev.id) jobs.push(move(id, slotAt(i), 150)); });
        await Promise.all(jobs);
        el.classList.remove('is-flying');
        hooks.onLand?.(ev);
      } else if (ev.type === 'eliminate') {
        const cs = ev.ids.map(center);
        hooks.onEliminate?.(ev, { x: cs.reduce((a, c) => a + c.x, 0) / cs.length, y: cs.reduce((a, c) => a + c.y, 0) / cs.length });
        await Promise.all(ev.ids.map(pop));
        visualSlot = visualSlot.filter((id) => !ev.ids.includes(id));
        await Promise.all(visualSlot.map((id, i) => move(id, slotAt(i), 150)));
      } else if (ev.type === 'moveOut') {
        const moved = new Set(ev.moves.map((m) => m.id));
        visualSlot = visualSlot.filter((id) => !moved.has(id));
        refresh();
        await Promise.all([
          ...ev.moves.map((m) => move(m.id, bufPos(m.col, m.height), 280, T * 0.7)),
          ...visualSlot.map((id, i) => move(id, slotAt(i), 180)),
        ]);
      } else if (ev.type === 'undo') {
        visualSlot = visualSlot.filter((id) => id !== ev.id);
        refresh();
        await Promise.all([move(ev.id, posOf(ev.id), 260, T * 0.8), ...visualSlot.map((id, i) => move(id, slotAt(i), 160))]);
      } else if (ev.type === 'shuffle') {
        await flip(ev.changes);
      }
    }
    refresh();
  }

  function center(id) {
    const p = pos.get(id);
    return p ? { x: p.x + (T * p.s) / 2, y: p.y + (T * ROW_H * p.s) / 2 } : { x: 0, y: 0 };
  }

  function deny(id) {
    const el = els[id];
    const p = pos.get(id);
    if (!el || !p || reduce) return;
    el.animate([{ transform: tf(p) }, { transform: tf({ ...p, x: p.x - 5 }) }, { transform: tf({ ...p, x: p.x + 5 }) }, { transform: tf(p) }], { duration: 200 });
  }

  function hint(id) {
    clearHint();
    if (els[id]) { els[id].classList.add('is-hint'); hinted = id; }
  }
  function clearHint() {
    if (hinted >= 0 && els[hinted]) els[hinted].classList.remove('is-hint');
    hinted = -1;
  }

  function resize() {
    if (!game) return;
    measure();
    for (const t of game.state.tiles) if (els[t.id]) put(t.id, posOf(t.id));
  }

  function clear() {
    playfield.textContent = '';
    els = [];
    pos.clear();
    visualSlot = [];
    game = null;
    hinted = -1;
  }

  return { mount, clear, resize, refresh, play, deny, hint, clearHint, center };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/ui/board.js
git commit -m "feat: 牌面渲染、飞入卡槽与消除动画"
```

---

### Task 14: 界面层（首页、HUD、弹层、吉祥物）

**Files:**
- Create: `src/ui/screens.js`

**Interfaces:**
- Consumes：Task 7 的 `BREEDS`、`dogHeadSVG`、`logoSVG`、`iconSVG`；Task 10 的 DOM 约定
- Produces：`createScreens()` 返回的对象包含以下方法。
  - 页面与 HUD：
    - `show('home' | 'game')`
    - `home({ dailySub, teamName, streak, online })`
    - `hud({ name, left, props, can })`
    - `denyProp(name)`、`slotDanger(on)`、`shakeSlot()`
  - 吉祥物与提示：
    - `setBreed(key)`、`setBaseMood(mood)`、`flashMood(mood, ms)`
    - `say(text, ms)`、`hush()`
    - `toast(text)`、`combo(text, x, y)`
  - 弹层：
    - `open(opts)`：返回 `{ body, buttons }`
    - `close()`、`isOpen()`
    - `settings(settings, onToggle)`
    - `help()`
    - `practice(LEVELS, onPick)`
    - `pack({ selected, peers, stats, first }, onPick)`
    - `pause({ settings, onToggle, onResume, onRestart, onHome })`
    - `intro2(levelCfg, onStart)`
    - `result(info, handlers)`
    - `setCard(url)`、`cardFailed()`、`roastText(text)`

- [ ] **Step 1: 实现**

```js file=src/ui/screens.js
// 界面层：首页、HUD、弹层、吉祥物与气泡、提示条；只负责渲染与收集点击，流程由 main.js 编排
import { BREEDS, dogHeadSVG } from '../art/dogs.js';
import { logoSVG } from '../art/logo.js';
import { iconSVG } from '../art/icons.js';

const $ = (id) => document.getElementById(id);
const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export function createScreens() {
  const layer = $('modal-layer');
  const modal = $('modal');
  const bubble = $('bubble');
  const face = $('mascot-face');
  let breed = 'shiba';
  let baseMood = 'idle';
  let shown = '';
  let moodTimer = 0;
  let bubbleTimer = 0;
  let lastFocus = null;

  $('logo').insertAdjacentHTML('beforeend', logoSVG().replace('<svg', '<svg aria-hidden="true"'));

  // ---- 吉祥物 ----
  function paint(m) {
    if (m === shown) return;
    shown = m;
    face.innerHTML = dogHeadSVG(breed, m);
  }
  function setBaseMood(m) { baseMood = m; clearTimeout(moodTimer); paint(m); }
  function flashMood(m, ms = 800) {
    clearTimeout(moodTimer);
    paint(m);
    moodTimer = setTimeout(() => paint(baseMood), ms);
  }
  function setBreed(key) {
    breed = key || 'shiba';
    shown = '';
    paint(baseMood);
    $('hero-dog').innerHTML = dogHeadSVG(breed, 'happy');
  }
  function say(text, ms = 1800) {
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, ms);
  }
  function hush() { clearTimeout(bubbleTimer); bubble.hidden = true; }

  // ---- 页面与 HUD ----
  function show(name) {
    $('home').hidden = name !== 'home';
    $('game').hidden = name !== 'game';
  }
  function home({ dailySub, teamName, streak, online }) {
    $('daily-sub').textContent = dailySub;
    const chip = $('team-chip');
    chip.innerHTML = dogHeadSVG(breed, 'idle');
    const name = document.createElement('span');
    name.textContent = teamName;
    chip.appendChild(name);
    $('streak').textContent = streak > 0 ? `连续打卡 ${streak} 天` : '';
    const box = $('online');
    box.hidden = !(online && online.total > 0);
    if (!box.hidden) $('online-count').textContent = String(online.total);
  }
  function hud({ name, left, props, can }) {
    $('level-name').textContent = name;
    $('tiles-left').textContent = String(left);
    for (const k of ['moveOut', 'undo', 'shuffle']) {
      const btn = $(`prop-${k}`);
      $(`badge-${k}`).textContent = String(props[k]);
      btn.classList.toggle('is-empty', props[k] <= 0);
      btn.classList.toggle('is-idle', props[k] > 0 && !can[k]);
      btn.setAttribute('aria-label', `${btn.querySelector('.prop-name').textContent}，剩 ${props[k]} 次`);
    }
  }
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  function denyProp(k) { restart($(`prop-${k}`), 'is-deny'); }
  function slotDanger(on) { $('slot').classList.toggle('is-danger', on); }
  function shakeSlot() { restart($('slot'), 'is-shake'); }

  function toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }
  function combo(text, x, y) {
    const c = document.createElement('div');
    c.className = 'combo';
    c.textContent = text;
    c.style.left = `${x}px`;
    c.style.top = `${y}px`;
    $('app').appendChild(c);
    setTimeout(() => c.remove(), 1000);
  }

  // ---- 弹层 ----
  function open({ title, body = '', actions = [], dismissible = true, onDismiss = null }) {
    lastFocus = document.activeElement;
    modal.textContent = '';
    const h = document.createElement('h2');
    h.className = 'modal-title';
    h.id = 'modal-title';
    h.textContent = title;
    const b = document.createElement('div');
    b.className = 'modal-body';
    if (typeof body === 'string') b.innerHTML = body;
    else if (body) b.appendChild(body);
    const acts = document.createElement('div');
    acts.className = 'modal-actions';
    const buttons = {};
    for (const a of actions) {
      if (a.hidden) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn ${a.go ? 'btn-go' : 'btn-soft'}`;
      btn.textContent = a.label;
      btn.addEventListener('click', () => a.onClick(btn));
      acts.appendChild(btn);
      if (a.key) buttons[a.key] = btn;
    }
    modal.append(h, b);
    if (acts.children.length) modal.appendChild(acts);
    layer.hidden = false;
    const dismiss = () => { close(); onDismiss?.(); };
    layer.onclick = dismissible ? (e) => { if (e.target === layer) dismiss(); } : null;
    layer.onkeydown = dismissible ? (e) => { if (e.key === 'Escape') dismiss(); } : null;
    modal.focus();
    return { body: b, buttons };
  }
  function close() {
    if (layer.hidden) return;
    layer.hidden = true;
    modal.textContent = '';
    layer.onclick = null;
    layer.onkeydown = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const isOpen = () => !layer.hidden;

  function switches(settings, onToggle) {
    const wrap = document.createElement('div');
    wrap.className = 'switches';
    for (const [key, label] of [['music', '背景音乐'], ['sfx', '音效'], ['vibrate', '震动']]) {
      const row = document.createElement('div');
      row.className = 'switch-row';
      const span = document.createElement('span');
      span.id = `sw-label-${key}`;
      span.textContent = label;
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'switch';
      sw.id = `sw-${key}`;
      sw.setAttribute('aria-labelledby', span.id);
      sw.setAttribute('aria-pressed', String(!!settings[key]));
      sw.addEventListener('click', () => {
        const v = sw.getAttribute('aria-pressed') !== 'true';
        sw.setAttribute('aria-pressed', String(v));
        onToggle(key, v);
      });
      row.append(span, sw);
      wrap.appendChild(row);
    }
    return wrap;
  }

  function settings(s, onToggle) {
    open({ title: '设置', body: switches(s, onToggle), actions: [{ label: '好的', go: true, onClick: close }] });
  }

  function help() {
    const rules = [
      [0, '点一张亮着的牌，它会飞进下方的 7 格卡槽。'],
      [3, '卡槽里凑齐 3 张相同的，就会消除。'],
      [4, '卡槽塞满 7 张就输了；变暗的牌被压住，暂时点不了。'],
      [1, '道具每关各 1 次：移出、撤回、洗牌；输了还能复活 1 次。'],
      [13, '今日挑战每天一关，大家玩的都是同一关：第 1 关热身，第 2 关才是真正的考验。'],
    ];
    const body = `<ul class="rules">${rules.map(([k, t]) => `<li>${iconSVG(k, 30)}<span>${t}</span></li>`).join('')}</ul>`;
    open({ title: '怎么玩', body, actions: [{ label: '明白了，汪！', go: true, onClick: close }] });
  }

  function practice(levels, onPick) {
    const list = document.createElement('div');
    list.className = 'choice-list';
    const items = [['easy', '轻松消遣，适合练手'], ['normal', '要动点脑子'], ['hard', '和第 2 关差不多难'], ['hell', '不保证有解，致敬原版']];
    for (const [key, desc] of items) {
      const L = levels[key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.innerHTML = `<b>${L.name}</b><small>${L.kinds} 种图案 · ${L.kinds * L.perKind} 张 · ${desc}</small>`;
      b.addEventListener('click', () => onPick(key));
      list.appendChild(b);
    }
    open({ title: '自由练习', body: list, actions: [{ label: '返回', onClick: close }] });
  }

  function pack({ selected, peers, stats, first }, onPick) {
    const box = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'team-grid';
    for (const b of BREEDS) {
      const on = b.key === selected;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `team${on ? ' is-on' : ''}`;
      btn.setAttribute('aria-pressed', String(on));
      const n = peers && peers.teams[b.key];
      btn.innerHTML = `${dogHeadSVG(b.key, on ? 'happy' : 'idle')}<b>${b.team}</b><small>${n ? `在线 ${n}` : '&nbsp;'}</small>`;
      btn.addEventListener('click', () => onPick(b.key));
      grid.appendChild(btn);
    }
    box.appendChild(grid);
    if (!first) {
      const p = document.createElement('p');
      p.className = 'pack-stats';
      p.textContent = `今日挑战通关 ${stats.dailyWins} 次 · 连续打卡 ${stats.streak} 天 · 为狗群贡献 ${stats.dogs} 只狗`;
      box.appendChild(p);
    }
    open({
      title: first ? '选一个狗群加入' : '我的狗群',
      body: box,
      dismissible: !first,
      actions: first ? [] : [{ label: '好的', go: true, onClick: close }],
    });
  }

  function pause(h) {
    open({
      title: '暂停一下',
      body: switches(h.settings, h.onToggle),
      onDismiss: h.onResume,
      actions: [
        { label: '继续游戏', go: true, onClick: () => { close(); h.onResume(); } },
        { label: '重开本关', onClick: () => { close(); h.onRestart(); } },
        { label: '回到首页', onClick: () => { close(); h.onHome(); } },
      ],
    });
  }

  function intro2(L, onStart) {
    open({
      title: '热身结束！',
      dismissible: false,
      body: `<div class="modal-dog">${dogHeadSVG(breed, 'shock')}</div><p class="intro-big">第 2 关</p><p>${L.kinds} 种图案、${L.kinds * L.perKind} 张牌、${L.layers} 层叠叠乐，两侧还有盲盒牌堆。道具各 1 次，复活 1 次，祝你好运，汪！</p>`,
      actions: [{ label: '开始第 2 关', go: true, onClick: () => { close(); onStart(); } }],
    });
  }

  function result(info, h) {
    const won = info.result === 'won';
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="modal-dog">${dogHeadSVG(breed, won ? 'cheer' : 'sad')}</div>
      <div class="stats">
        <div class="stat"><small>用时</small><b>${fmtTime(info.seconds)}</b></div>
        <div class="stat"><small>${won ? '拿牌' : '剩余'}</small><b>${won ? `${info.moves} 次` : `${info.remaining} 张`}</b></div>
        <div class="stat"><small>道具</small><b>${info.propsUsed} 次</b></div>
      </div>
      <div class="card-wrap" id="card-wrap">战绩图生成中…</div>
      <p class="card-tip" id="card-tip" hidden>手机上可以长按图片保存</p>
      <div class="roast" id="roast" hidden></div>`;
    const title = won ? (info.key === 'daily2' ? '今日挑战通关！' : '通关成功！') : '卡槽满啦！';
    const actions = won
      ? [
        { key: 'next', label: h.nextLabel, go: true, onClick: h.onNext },
        { key: 'save', label: '保存战绩图', onClick: h.onSave, hidden: !h.canSave },
        { key: 'roast', label: 'AI 狗评', onClick: h.onRoast, hidden: !h.canRoast },
        { key: 'home', label: '回到首页', onClick: h.onHome },
      ]
      : [
        { key: 'revive', label: '复活一次（移出 3 张）', go: true, onClick: h.onRevive, hidden: !info.canRevive },
        { key: 'retry', label: '重新开始', go: !info.canRevive, onClick: h.onRetry },
        { key: 'save', label: '保存战绩图', onClick: h.onSave, hidden: !h.canSave },
        { key: 'roast', label: 'AI 狗评', onClick: h.onRoast, hidden: !h.canRoast },
        { key: 'home', label: '回到首页', onClick: h.onHome },
      ];
    return open({ title, body, actions, dismissible: false });
  }
  function setCard(url) {
    const wrap = $('card-wrap');
    if (!wrap) return;
    wrap.textContent = '';
    const img = new Image();
    img.alt = '本局战绩图';
    img.src = url;
    wrap.appendChild(img);
    const tip = $('card-tip');
    if (tip) tip.hidden = false;
  }
  function cardFailed() {
    const wrap = $('card-wrap');
    if (wrap) wrap.textContent = '战绩图生成失败';
  }
  function roastText(text) {
    const r = $('roast');
    if (!r) return;
    r.hidden = !text;
    r.textContent = text;
  }

  return {
    show, home, hud, denyProp, slotDanger, shakeSlot,
    setBreed, setBaseMood, flashMood, say, hush, toast, combo,
    open, close, isOpen, settings, help, practice, pack, pause, intro2, result, setCard, cardFailed, roastText,
  };
}
```

- [ ] **Step 2: 提交**

```bash
git add src/ui/screens.js
git commit -m "feat: 首页、HUD、弹层与吉祥物界面层"
```

---

### Task 15: 主流程编排

**Files:**
- Create: `src/ui/main.js`

**Interfaces:**
- Consumes：Task 2–14 的全部接口
- Produces：
  - 页面入口，启动时经由 `hotBoot` 进入。
  - URL 带 `?debug` 或 `#debug` 时，暴露 `globalThis.__dog`，包含：
    - `state()`、`actions()`、`solution()`
    - `level(key, seed)`
    - `step()`、`autoplay(ms)`
    - `save()`、`platform()`
  - URL 带 `?seed=` 时，固定自由练习的种子。

- [ ] **Step 1: 实现**

```js file=src/ui/main.js
// 启动与流程编排：存档、音频、平台能力、对局生命周期、结算、调试接口与热更新续玩
import { LEVELS, generateLevel } from '../core/generator.js';
import { createGame } from '../core/game.js';
import { bestMove } from '../core/bot.js';
import { ICONS, iconSymbolsSVG } from '../art/icons.js';
import { BREEDS } from '../art/dogs.js';
import { createAudio } from '../audio/audio.js';
import { createStore, dateKey } from './storage.js';
import { initPlatform, setPresence, broadcastWin, aiRoast, hotBoot, hotSnapshot } from './platform.js';
import { createFx } from './fx.js';
import { renderShareCard, saveCard } from './share.js';
import { createBoard } from './board.js';
import { createScreens } from './screens.js';

const COMBO_TEXT = ['', '', '汪汪！', '汪汪汪！', '狗王驾到！'];
const TEAM = Object.fromEntries(BREEDS.map((b) => [b.key, b]));
const $ = (id) => document.getElementById(id);

function localStorageOrNull() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function boot(hot) {
  const store = createStore(localStorageOrNull());
  const save = store.data;
  const today = dateKey();
  const params = new URLSearchParams(globalThis.location ? globalThis.location.search : '');
  const audio = createAudio();
  audio.setMusic(save.settings.music);
  audio.setSfx(save.settings.sfx);
  document.body.insertAdjacentHTML('afterbegin', iconSymbolsSVG());
  const ui = createScreens();
  ui.setBreed(save.team || 'shiba');
  const fx = createFx($('fx'));
  let peers = null;
  let s = null;
  let card = null;
  let roastCtl = null;

  const platform = initPlatform({
    onPeers: (p) => { peers = p; renderHome(); },
    onWinBroadcast: (team, fromMe) => { if (!fromMe) ui.toast(`一位${team ? TEAM[team].team : ''}狗友刚刚通关了今日第 2 关！`); },
    onChange: () => { renderHome(); syncPresence(); },
  });
  const board = createBoard({ screen: $('game'), stage: $('stage'), slotEl: $('slot'), playfield: $('playfield'), onTap: tap });

  const vibrate = (pattern) => {
    if (!save.settings.vibrate || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch { /* 不支持震动 */ }
  };
  const playing = () => !!s && s.game.state.status === 'playing';
  const elapsed = () => (s ? s.elapsed + (s.running ? performance.now() - s.since : 0) : 0);
  const pauseClock = () => { if (s && s.running) { s.elapsed += performance.now() - s.since; s.running = false; } };
  const resumeClock = () => { if (s && !s.running && playing()) { s.since = performance.now(); s.running = true; } };
  const newPracticeSeed = () => params.get('seed') || `p-${Date.now().toString(36)}`;

  // 首次交互时解锁音频并开始背景音乐（浏览器要求用户手势）
  const unlock = () => {
    audio.unlock();
    if (save.settings.music) audio.startMusic();
    removeEventListener('pointerdown', unlock, true);
    removeEventListener('keydown', unlock, true);
  };
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);

  function syncPresence() {
    setPresence(platform, { team: save.team, screen: s ? 'game' : 'home', level: s ? s.key : null });
  }

  function renderHome() {
    const d = store.peekDay(today);
    ui.home({
      dailySub: d.l2 ? '今日已通关 ✓ 再挑战一次' : d.l1 ? '第 2 关 · 真正的考验' : '第 1 关 · 热身',
      teamName: save.team ? TEAM[save.team].team : '还没加入狗群',
      streak: store.currentStreak(today),
      online: peers,
    });
  }

  function goHome() {
    pauseClock();
    s = null;
    board.clear();
    audio.setTension(0);
    ui.slotDanger(false);
    ui.hush();
    ui.setBaseMood('idle');
    ui.show('home');
    renderHome();
    syncPresence();
  }

  function updateHud() {
    const g = s.game;
    const st = g.state;
    ui.hud({
      name: s.mode === 'practice' ? `练习 · ${g.level.name}` : g.level.name,
      left: st.remaining,
      props: st.props,
      can: { moveOut: g.canMoveOut(), undo: g.canUndo(), shuffle: g.canShuffle() },
    });
  }

  function startLevel(key, seedStr, mode, actions = null) {
    const level = generateLevel(key, seedStr);
    const game = createGame(level);
    if (actions && !game.replay(actions)) console.warn('续玩回放中途失败，保留已回放的部分');
    s = { game, key, seedStr, mode, elapsed: 0, since: performance.now(), running: true, busy: false, queue: [], warned: false };
    ui.close();
    ui.show('game');
    board.mount(game);
    fx.resize();
    ui.setBaseMood('idle');
    ui.slotDanger(false);
    audio.setTension(0);
    updateHud();
    store.recordPlay();
    syncPresence();
    if (key === 'daily1' && !actions) {
      board.hint(level.solution[0]);
      ui.say('点亮着的牌，凑齐 3 张就能消除！', 3200);
    } else {
      ui.say(key === 'daily2' ? '第 2 关来了，稳住别慌！' : '开干，汪！', 2000);
    }
  }

  function tap(id) {
    if (!playing() || ui.isOpen()) return;
    if (s.busy) {
      if (s.queue.length < 3) s.queue.push(id);
      return;
    }
    pick(id);
  }

  function pick(id) {
    const g = s.game;
    const t = g.state.tiles[id];
    const events = g.pick(id);
    if (!events) {
      if (t && (t.zone === 'board' || t.zone === 'buffer')) {
        board.deny(id);
        audio.play('deny');
        ui.flashMood('shock', 700);
        ui.say('这张被压住啦，先拿上面的', 1300);
      }
      return;
    }
    board.clearHint();
    audio.play('tap');
    vibrate(8);
    run(events);
  }

  async function run(events) {
    const cur = s;
    cur.busy = true;
    await board.play(events, {
      onLand: () => audio.play('place'),
      onEliminate: (ev, c) => {
        audio.play('match', { combo: ev.combo });
        if (ev.combo >= 2) audio.play('woof', { variant: ev.combo >= 3 ? 1 : 0 });
        vibrate([15, 30, 15]);
        fx.burst(c.x, c.y, ICONS[ev.kind].color);
        if (ev.combo >= 2) ui.combo(COMBO_TEXT[Math.min(ev.combo, 4)], c.x, c.y - 24);
        ui.flashMood('happy', 900);
      },
    });
    if (s !== cur) return;
    cur.busy = false;
    afterAction(events);
    while (s === cur && playing() && !cur.busy && cur.queue.length && !ui.isOpen()) pick(cur.queue.shift());
  }

  function afterAction(events) {
    const st = s.game.state;
    updateHud();
    const n = st.slot.length;
    audio.setTension(n >= 6 ? 1 : n === 5 ? 0.5 : 0);
    ui.slotDanger(n >= 5 && st.status === 'playing');
    if (st.status === 'playing') {
      if (n >= 5 && !s.warned) {
        s.warned = true;
        audio.play('warn');
        ui.setBaseMood('worried');
        ui.say(n >= 6 ? '只剩 1 格了！' : '卡槽快满了，稳住！', 1600);
      } else if (n < 5 && s.warned) {
        s.warned = false;
        ui.setBaseMood('idle');
      }
    }
    if (events.some((e) => e.type === 'win')) onWin();
    else if (events.some((e) => e.type === 'lose')) onLose();
  }

  function useProp(name) {
    if (!playing() || s.busy || ui.isOpen()) return;
    const g = s.game;
    const events = name === 'moveOut' ? g.moveOut() : name === 'undo' ? g.undo() : g.shuffle();
    if (!events) {
      ui.denyProp(name);
      audio.play('deny');
      const st = g.state;
      const why = st.props[name] <= 0 ? '这个道具用完啦'
        : name === 'undo' ? (st.slot.length ? '刚消除完，撤回不了哦' : '卡槽是空的，没得撤回')
          : name === 'moveOut' ? '卡槽是空的，不用移出' : '场上没有牌可洗了';
      ui.say(why, 1500);
      return;
    }
    audio.play(name);
    board.clearHint();
    ui.say(name === 'moveOut' ? '挪出去 3 张，喘口气' : name === 'undo' ? '刚才那步不算！' : '重新洗牌，汪！', 1400);
    run(events);
  }

  function summary(result) {
    const st = s.game.state;
    const u = st.used;
    return {
      result, key: s.key, mode: s.mode, levelName: s.game.level.name, dateKey: today,
      seconds: Math.round(elapsed() / 1000), moves: st.moves, remaining: st.remaining,
      used: u, propsUsed: u.moveOut + u.undo + u.shuffle + u.revive,
      breedKey: save.team || 'shiba', teamName: save.team ? TEAM[save.team].team : '',
      streak: store.currentStreak(today), dogs: save.stats.dogsContributed, canRevive: s.game.canRevive(),
    };
  }

  function onWin() {
    pauseClock();
    const cur = s;
    store.recordWin({ daily: cur.mode === 'daily', level: cur.key, key: today });
    audio.setTension(0);
    audio.play('win');
    vibrate([20, 40, 20, 40, 60]);
    fx.confetti();
    ui.setBaseMood('cheer');
    ui.slotDanger(false);
    if (cur.mode === 'daily' && cur.key === 'daily1') {
      setTimeout(() => { if (s === cur) ui.intro2(LEVELS.daily2, () => startLevel('daily2', `dog-${today}`, 'daily')); }, 700);
      return;
    }
    if (cur.mode === 'daily' && cur.key === 'daily2') broadcastWin(platform, save.team);
    setTimeout(() => { if (s === cur) showResult(summary('won')); }, 800);
  }

  function onLose() {
    pauseClock();
    const cur = s;
    audio.setTension(0);
    audio.play('lose');
    vibrate([80, 50, 120]);
    ui.setBaseMood('sad');
    ui.shakeSlot();
    if (cur.mode === 'daily') store.recordLoss(today, cur.game.state.remaining);
    setTimeout(() => { if (s === cur) showResult(summary('lost')); }, 700);
  }

  function showResult(info) {
    const cur = s;
    card = null;
    const daily2Won = info.result === 'won' && info.key === 'daily2';
    ui.result(info, {
      canSave: !platform.inClaude || !!platform.downloads,
      canRoast: !!platform.sample,
      nextLabel: cur.mode === 'practice' ? '再来一局' : daily2Won ? '再挑战一次' : '下一关',
      onNext: () => startLevel(cur.key, cur.mode === 'practice' ? newPracticeSeed() : cur.seedStr, cur.mode),
      onRetry: () => startLevel(cur.key, cur.seedStr, cur.mode),
      onRevive: () => {
        const events = cur.game.revive();
        if (!events) return;
        ui.close();
        audio.play('revive');
        ui.setBaseMood('idle');
        cur.warned = false;
        ui.say('复活成功，再来！', 1500);
        resumeClock();
        run(events);
      },
      onHome: () => { ui.close(); goHome(); },
      onSave: async (btn) => {
        if (!card) { ui.toast('战绩图还在生成，稍等一下'); return; }
        btn.disabled = true;
        const r = await saveCard(card.blob, platform);
        btn.disabled = false;
        const tips = { saved: '战绩图已保存', downloaded: '战绩图已下载', shared: '已打开分享', declined: '已取消保存' };
        ui.toast(tips[r] || '保存失败，可以长按图片保存');
      },
      onRoast: async (btn) => {
        btn.disabled = true;
        ui.roastText('狗子正在酝酿毒舌……');
        if (roastCtl) roastCtl.abort();
        roastCtl = new AbortController();
        try {
          await aiRoast(platform, info, (text) => ui.roastText(text), roastCtl.signal);
        } catch (e) {
          const code = e && e.code;
          if (code === 'not_granted' || code === 'sampling_disabled') {
            ui.roastText('狗子这次不想说话（没有获得 AI 授权）');
            btn.hidden = true;
            return;
          }
          ui.roastText(code === 'rate_limited' ? '狗子说累了，过一会儿再来' : code === 'cancelled' ? '' : '狗子走神了，再点一次试试');
        }
        btn.disabled = false;
      },
    });
    renderShareCard(info).then((c) => { card = c; ui.setCard(c.url); }).catch(() => ui.cardFailed());
  }

  function pause() {
    if (!s || ui.isOpen()) return;
    pauseClock();
    ui.pause({
      settings: save.settings,
      onToggle: toggleSetting,
      onResume: () => resumeClock(),
      onRestart: () => startLevel(s.key, s.seedStr, s.mode),
      onHome: () => goHome(),
    });
  }

  function toggleSetting(name, value) {
    store.setSetting(name, value);
    if (name === 'music') {
      audio.setMusic(value);
      if (value) audio.startMusic(); else audio.stopMusic();
    }
    if (name === 'sfx') audio.setSfx(value);
    if (name === 'vibrate' && value) vibrate(20);
  }

  function openPack(first) {
    ui.pack({
      selected: save.team,
      peers,
      first,
      stats: { dailyWins: save.stats.dailyWins, streak: store.currentStreak(today), dogs: save.stats.dogsContributed },
    }, (key) => {
      store.setTeam(key);
      ui.setBreed(key);
      audio.play('woof', { variant: key === 'husky' || key === 'golden' ? 2 : key === 'teddy' || key === 'corgi' ? 1 : 0 });
      renderHome();
      syncPresence();
      if (first) {
        ui.close();
        ui.toast(`欢迎加入${TEAM[key].team}！`);
      } else {
        openPack(false);
      }
    });
  }

  $('btn-daily').addEventListener('click', () => {
    audio.play('button');
    startLevel(store.peekDay(today).l1 ? 'daily2' : 'daily1', `dog-${today}`, 'daily');
  });
  $('btn-practice').addEventListener('click', () => {
    audio.play('button');
    ui.practice(LEVELS, (key) => startLevel(key, newPracticeSeed(), 'practice'));
  });
  $('btn-pack').addEventListener('click', () => { audio.play('button'); openPack(false); });
  $('btn-settings').addEventListener('click', () => { audio.play('button'); ui.settings(save.settings, toggleSetting); });
  $('btn-help').addEventListener('click', () => { audio.play('button'); ui.help(); });
  $('btn-pause').addEventListener('click', () => { audio.play('button'); pause(); });
  for (const name of ['moveOut', 'undo', 'shuffle']) $(`prop-${name}`).addEventListener('click', () => useProp(name));
  addEventListener('resize', () => { fx.resize(); board.resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing() && !ui.isOpen()) pause(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && playing() && !ui.isOpen()) pause(); });

  if (params.has('debug') || (globalThis.location && globalThis.location.hash === '#debug')) {
    const dbg = {
      state: () => (s ? s.game.state : null),
      actions: () => (s ? s.game.actions : []),
      solution: () => (s ? s.game.level.solution : null),
      level: (key = 'daily1', seed = `dog-${today}`) => startLevel(key, seed, key.startsWith('daily') ? 'daily' : 'practice'),
      step() {
        if (!playing() || ui.isOpen()) return false;
        const g = s.game;
        const acts = g.actions;
        const sol = g.level.solution;
        const onPath = !!sol && acts.every((a, i) => a[0] === 'p' && a[1] === sol[i]);
        const id = onPath && acts.length < sol.length ? sol[acts.length] : bestMove(g).id;
        if (id >= 0) tap(id);
        return true;
      },
      autoplay(ms = 150) {
        const iv = setInterval(() => { if (!dbg.step()) clearInterval(iv); }, ms);
        return iv;
      },
      save: () => save,
      platform: () => platform,
    };
    globalThis.__dog = dbg;
  }

  hotSnapshot(() => (s ? { screen: 'game', key: s.key, seedStr: s.seedStr, mode: s.mode, actions: s.game.actions } : { screen: 'home' }));
  renderHome();
  syncPresence();
  if (hot && hot.screen === 'game' && LEVELS[hot.key] && typeof hot.seedStr === 'string') {
    startLevel(hot.key, hot.seedStr, hot.mode === 'practice' ? 'practice' : 'daily', Array.isArray(hot.actions) ? hot.actions : null);
  } else if (!save.team) {
    setTimeout(() => openPack(true), 300);
  }
}

hotBoot(boot);
```

- [ ] **Step 2: 构建并运行全部测试**

Run: `npm test && node build.mjs`
Expected:
- 所有测试 PASS。
- 构建打印 `dist/index.html xx KB，dist/artifact.html xx KB`，不报外部资源错误。

- [ ] **Step 3: 提交**

```bash
git add src/ui/main.js dist
git commit -m "feat: 主流程编排、结算、调试接口与热更新续玩"
```

---

### Task 16: 浏览器验收

**Files:**
- 视验收结果修改 `src/**`（每个问题单独提交）

- [ ] **Step 1: 启动预览服务**

用内置浏览器的 `preview_start` 启动 `gou-le-ge-gou`，然后打开 `http://localhost:<port>/dist/index.html?debug`。

- [ ] **Step 2: 手机尺寸走查**

`resize_window` 设为 mobile（375×812），然后依次检查：
- 首次打开会弹出「选一个狗群加入」，点柴犬后弹层关闭，首页显示「柴犬队」。
- 点「今日挑战」进入第 1 关：牌按层落下，第一张可点的牌带提示光圈，被压住的牌变暗。
- 真实点击：点一张空闲牌，它会飞进卡槽；点被压住的牌，牌会抖动，气泡提示「被压住」。
- 用 `__dog.autoplay(120)` 打通第 1 关，确认出现「热身结束」弹层；点「开始第 2 关」。
- 第 2 关：两侧有盲盒堆。依次用一次移出、撤回、洗牌，确认动画和角标都正确，第二次点击会提示「用完啦」。
- 用 `__dog.autoplay(60)` 跑到结束：失败时弹层里有「复活一次」，点击后继续；最终会进入结算弹层，里面有战绩图。
- 控制台零报错（用 `read_console_messages` 检查）。

- [ ] **Step 3: 桌面尺寸与深色模式**

- `resize_window` 设为 desktop：游戏区居中显示，最大宽度 480px，带手机外框。
- `resize_window({ colorScheme: 'dark' })`：切到夜晚后院配色，文字清晰可读，牌面对比度足够。
- 每种形态截图一次，留作验收记录。

- [ ] **Step 4: Artifact 片段冒烟**

在 `dist/artifact.html` 里确认：
- 以 `<title>狗了个狗</title>` 开头。
- 不包含 doctype、html、head、body 标签。
- 大小小于 1MB。

- [ ] **Step 5: 修复发现的问题**

每个问题都按「复现 → 修复 → 重新验证」处理，并单独提交，提交信息写成 `fix: …`。

---

### Task 17: 整体代码评审

- [ ] **Step 1: 生成评审包**

运行 `review-package <开发分支起点> HEAD`。

- [ ] **Step 2: 派发整体评审**

派最强模型的评审子代理，使用 superpowers 的 `requesting-code-review` 模板。重点检查：
- 逻辑与表现层之间的一致性：事件、视觉卡槽、输入队列。
- 平台能力降级。
- 零外链。
- 可访问性。
- 性能（192 张牌时的 DOM 和动画）。

- [ ] **Step 3: 修复**

把全部 Critical 和 Important 发现交给一个修复子代理处理；修完后重跑 `npm test && node build.mjs`，再做一次浏览器冒烟。

---

### Task 18: 发布

- [ ] **Step 1: 合并到 main**

先确认 `npm test` 全部通过、构建产物是最新的，然后把开发分支快进合并到 `main`。

- [ ] **Step 2: 发布 Artifact**

- 先加载 artifact-capabilities 技能。
- 用 Artifact 工具发布 `dist/artifact.html`，参数如下：
  - `icon: "game"`
  - `capabilities: { room: { topics: { win: 'interact' } }, sample: {}, downloads: true }`
  - `description`：一句话介绍。

- [ ] **Step 3: 发布 GitHub Pages**

```bash
gh repo create Kline-x/gou-le-ge-gou --public --description "狗了个狗：狗狗主题的三消堆叠网页小游戏（羊了个羊玩法）" --source . --remote origin
git push -u origin main
```

接下来用一个临时 worktree 创建只含 `index.html` 的孤儿分支 `gh-pages`，并推送：

```bash
git worktree add --detach ../gou-pages
cd ../gou-pages && git checkout --orphan gh-pages && git rm -rf . -q
cp ../gou-le-ge-gou/dist/index.html index.html && touch .nojekyll
git add index.html .nojekyll && git commit -m "发布：狗了个狗 GitHub Pages"
git push -u origin gh-pages
cd ../gou-le-ge-gou && git worktree remove ../gou-pages --force
gh api -X POST repos/Kline-x/gou-le-ge-gou/pages -f "source[branch]=gh-pages" -f "source[path]=/"
```

轮询 `gh api repos/Kline-x/gou-le-ge-gou/pages/builds/latest`，直到状态为 `built`，然后用内置浏览器打开 `https://kline-x.github.io/gou-le-ge-gou/` 做一次冒烟验证。

- [ ] **Step 4: 文档同步与交接**

- README 写清楚：玩法、两个链接、本地运行方式、调试接口。
- 同步 `E:\ai-md\claude\plan\狗了个狗游戏设计方案.md`。
- 写交接快照 `E:\ai-md\claude\handoff\gou-le-ge-gou\2026-09-23-狗了个狗首版发布.md`。
- 更新记忆里的进度指针。
