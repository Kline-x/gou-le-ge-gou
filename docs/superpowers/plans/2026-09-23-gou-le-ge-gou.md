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
