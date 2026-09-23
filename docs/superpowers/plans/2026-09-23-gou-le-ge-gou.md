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
| `src/core/generator.js` | `LEVELS`、`generateLevel`、`assignKinds`（模拟拿牌路径，保证有解） |
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
