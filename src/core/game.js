// 对局状态机：拿牌、卡槽、消除、胜负、道具与复活；操作返回事件数组，非法操作返回 null
import { hashSeed, createRng } from './rng.js';
import { computeCovers } from './layout.js';
import { assignKinds } from './assign.js';

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
    // 原味地狱（gen.solvable === false）的洗牌与原版一样纯随机
    const res = level.gen?.solvable === false ? null : assignKinds({
      n: ids.length,
      coveredBy: ids.map((id) => coveredBy[id].filter((j) => local.has(j)).map((j) => local.get(j))),
      quota,
      kOpen: level.gen?.kOpen ?? 3,
      pContinue: level.gen?.pContinue ?? 0.5,
      pDig: level.gen?.pDig ?? 0,
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
