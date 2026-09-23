// 沿模拟拿牌路径分配图案：维护虚拟卡槽、只做安全选择，从而保证存在一条不用道具的解
// 一次分配尝试：模拟拿牌，维护虚拟卡槽，只做「安全」的选择
function tryAssign({ n, coveredBy, quota, kOpen, pContinue, pDig = 0, rng, initialSlot = [], fixed = null }) {
  const kinds = new Array(n).fill(-1);
  const blockers = coveredBy.map((a) => a.length);
  const covers = Array.from({ length: n }, () => []);
  coveredBy.forEach((arr, i) => arr.forEach((j) => covers[j].push(i)));
  const free = [];
  for (let i = 0; i < n; i++) if (blockers[i] === 0) free.push(i);
  rng.shuffle(free); // 打乱初始顺序，否则 pDig 会系统性地先挖下标靠后的右侧盲盒堆
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
    // pDig：按概率优先拿「最近刚露出来」的牌，让解路径往下挖，同图案不容易同时露在表面
    const i = rng.next() < pDig ? free.pop() : free.splice(rng.int(free.length), 1)[0];
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
