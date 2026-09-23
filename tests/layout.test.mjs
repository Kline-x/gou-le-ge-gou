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
