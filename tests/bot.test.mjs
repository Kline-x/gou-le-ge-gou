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
