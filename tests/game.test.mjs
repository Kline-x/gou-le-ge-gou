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

test('原味地狱的洗牌纯随机（不走有解分配）', () => {
  const level = generateLevel('hell', 'shuffle');
  const g = createGame(level);
  const ev = g.shuffle();
  assert.equal(ev[0].solvable, false);
});

test('新开局与移出之后都不能撤回', () => {
  const g = createGame(mk([{ kind: 0 }, { kind: 1 }]));
  assert.equal(g.canUndo(), false);
  g.pick(0);
  g.moveOut();
  assert.equal(g.canUndo(), false);
});

test('撤回会回退步数，连消窗口不把撤回过的拿牌算进去', () => {
  const g = createGame(mk([{ kind: 0 }, { kind: 0 }, { kind: 0 }, { kind: 9 }, { kind: 1 }, { kind: 1 }, { kind: 1 }]));
  g.pick(0); g.pick(1); g.pick(2);
  g.pick(3);
  g.undo();
  assert.equal(g.state.moves, 3);
  g.pick(4); g.pick(5);
  assert.equal(g.pick(6)[1].combo, 2);
});

test('blocking：不在场上的牌不遮挡任何牌', () => {
  const g = createGame(mk([{ x: 0, y: 0, z: 0, kind: 0 }, { x: 0.5, y: 0, z: 1, kind: 1 }, { kind: 2 }]));
  assert.equal(g.blocking(1), 1);
  g.pick(1);
  assert.equal(g.blocking(1), 0);
  g.moveOut();
  assert.equal(g.blocking(1), 0);
});
