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
