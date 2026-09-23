// 关卡生成：几何布局 + 沿模拟拿牌路径分配图案，保证至少存在一条不用道具的解
import { hashSeed, createRng } from './rng.js';
import { buildLayout, computeCovers } from './layout.js';
import { assignKinds } from './assign.js';
import { createGame } from './game.js';
import { playOut } from './bot.js';

export const ICON_COUNT = 16;

// 难度参数（经 tools/balance.mjs 校准：贪心机器人有道具通关率 daily1/easy≈100%、normal≈74%、hard≈45%、daily2≈23%，300 局）
// kOpen：解路径中同时打开的图案数上限；pContinue：延续已开图案的概率；pDig：优先拿刚露出的牌（越大越难）；
// candidates：生成几个有解候选、挑机器人最难打的那个；solvable=false 时纯随机且洗牌也纯随机
export const LEVELS = {
  daily1: { name: '第 1 关', kinds: 3, perKind: 6, cols: 7, rows: 8, layers: 3, stackSize: 0, taper: 0, shrink: 0, baseInset: 2, kOpen: 1, pContinue: 1, pDig: 0, candidates: 1, solvable: true },
  daily2: { name: '第 2 关', kinds: 16, perKind: 12, cols: 7, rows: 8, layers: 12, stackSize: 14, taper: 0.12, shrink: 0.2, baseInset: 0, kOpen: 3, pContinue: 0.35, pDig: 1, candidates: 8, solvable: true },
  easy: { name: '简单', kinds: 6, perKind: 6, cols: 7, rows: 8, layers: 4, stackSize: 0, taper: 0.2, shrink: 0.5, baseInset: 1, kOpen: 2, pContinue: 0.6, pDig: 0, candidates: 1, solvable: true },
  normal: { name: '普通', kinds: 14, perKind: 9, cols: 7, rows: 8, layers: 9, stackSize: 9, taper: 0.15, shrink: 0.3, baseInset: 0, kOpen: 2, pContinue: 0.45, pDig: 1, candidates: 3, solvable: true },
  hard: { name: '困难', kinds: 15, perKind: 12, cols: 7, rows: 8, layers: 11, stackSize: 14, taper: 0.12, shrink: 0.22, baseInset: 0, kOpen: 3, pContinue: 0.35, pDig: 1, candidates: 3, solvable: true },
  hell: { name: '原味地狱', kinds: 16, perKind: 12, cols: 7, rows: 8, layers: 12, stackSize: 12, taper: 0.1, shrink: 0.2, baseInset: 0, kOpen: 3, pContinue: 0.3, pDig: 0, candidates: 1, solvable: false },
};

// 候选关卡的难度评估：贪心机器人不用道具能清掉的比例（越低越难）
function greedyProgress(base, kinds) {
  const game = createGame({ ...base, tiles: base.tiles.map((t, i) => ({ ...t, kind: kinds[i] })) });
  playOut(game);
  return 1 - game.state.remaining / kinds.length;
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
  const gen = { kOpen: cfg.kOpen, pContinue: cfg.pContinue, pDig: cfg.pDig ?? 0, solvable: cfg.solvable };
  const base = {
    key, name: cfg.name, seedStr, seed, cols: cfg.cols, rows: cfg.rows, gen,
    tiles: positions.map((p, id) => ({ id, x: p.x, y: p.y, z: p.z, group: p.group, kind: -1 })),
  };
  let kinds;
  let solution = null;
  if (cfg.solvable) {
    // 生成若干个有解候选，挑贪心机器人最难打的那个（candidates = 1 时直接用第一个）
    const { coveredBy } = computeCovers(positions);
    const candidates = cfg.candidates ?? 1;
    let best = null;
    for (let c = 0; c < candidates; c++) {
      const res = assignKinds({ n: positions.length, coveredBy, quota, kOpen: gen.kOpen, pContinue: gen.pContinue, pDig: gen.pDig, rng: kindRng.fork(`c${c}`) });
      if (!res) continue;
      const score = candidates > 1 ? greedyProgress(base, res.kinds) : 0;
      if (!best || score < best.score) best = { ...res, score };
    }
    if (!best) throw new Error(`关卡生成失败：${key}/${seedStr}`);
    kinds = best.kinds;
    solution = best.path;
  } else {
    const pool = [];
    for (const [k, c] of quota) for (let i = 0; i < c; i++) pool.push(k);
    kinds = kindRng.shuffle(pool);
  }
  return { ...base, tiles: base.tiles.map((t, i) => ({ ...t, kind: kinds[i] })), kinds: kindsUsed, solution };
}
