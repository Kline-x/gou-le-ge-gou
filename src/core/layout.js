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
