import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import { computeCovers } from '../src/core/layout.js';
import { LEVELS, generateLevel } from '../src/core/generator.js';
import { assignKinds } from '../src/core/assign.js';

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
