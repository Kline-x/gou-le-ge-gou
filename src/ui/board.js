// 牌面渲染：所有牌在覆盖整屏的 playfield 里，靠 transform 在场上 / 卡槽 / 移出区之间移动；按对局事件播放动画
import { ICONS } from '../art/icons.js';
import { STACK_GAP } from '../core/layout.js';
import { BUFFER_COLS } from '../core/game.js';

const ROW_H = 1.12;    // 盲盒堆与移出区那一行的高度（牌宽为单位）
const BUF_GAP = 0.1;   // 移出区列间距
const BUF_LIFT = 0.16; // 移出区叠放时每层上移
const T_MIN = 24;
const T_MAX = 64;

export function createBoard({ screen, stage, slotEl, playfield, onTap }) {
  const reduce = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const pos = new Map();
  let game = null;
  let els = [];
  let visualSlot = [];
  let T = 48;
  let S = 44;
  let bx = 0;
  let by = 0;
  let cells = [];
  let hinted = -1;

  const tf = (p) => `translate3d(${p.x}px, ${p.y}px, 0) scale(${p.s})`;

  // 鼠标/触屏在 pointerdown 就响应（更跟手）；键盘回车/空格产生的 click（detail === 0）另行处理
  playfield.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const el = e.target.closest('.tile');
    if (!el) return;
    e.preventDefault();
    onTap(Number(el.dataset.id));
  });
  playfield.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    const el = e.target.closest('.tile');
    if (el) onTap(Number(el.dataset.id));
  });

  function measure() {
    const L = game.level;
    const sr = screen.getBoundingClientRect();
    const st = stage.getBoundingClientRect();
    const unitsH = L.rows + STACK_GAP + ROW_H;
    const fit = Math.floor(Math.min(st.width / L.cols, st.height / unitsH));
    T = Math.max(T_MIN, Math.min(T_MAX, fit));
    bx = st.left - sr.left + (st.width - L.cols * T) / 2;
    by = st.top - sr.top + Math.max(0, (st.height - unitsH * T) / 2);
    playfield.style.setProperty('--t', `${T}px`);
    slotEl.style.setProperty('--slot-w', `${Math.round(L.cols * T + 20)}px`);
    cells = Array.from(slotEl.children, (c) => {
      const r = c.getBoundingClientRect();
      return { x: r.left - sr.left, y: r.top - sr.top, w: r.width };
    });
    S = cells.length ? cells[0].w : T;
  }

  const zOf = (t) => (t.group === 'main' ? 10 + t.z * 20 + Math.round(t.y * 2) : 10 + t.z);
  function bufPos(col, h) {
    const L = game.level;
    const x0 = L.cols / 2 - (BUFFER_COLS + (BUFFER_COLS - 1) * BUF_GAP) / 2;
    return { x: bx + (x0 + col * (1 + BUF_GAP)) * T, y: by + (L.rows + STACK_GAP - h * BUF_LIFT) * T, s: 1, z: 700 + h * 4 + col };
  }
  function slotAt(i) {
    const c = cells[Math.max(0, Math.min(i, cells.length - 1))];
    return { x: c.x, y: c.y, s: S / T, z: 900 + i };
  }
  function posOf(id) {
    const st = game.state;
    const t = st.tiles[id];
    if (t.zone === 'slot') return slotAt(visualSlot.indexOf(id));
    if (t.zone === 'buffer') return bufPos(t.col, st.buffer[t.col].indexOf(id));
    return { x: bx + t.x * T, y: by + t.y * T, s: 1, z: zOf(t) };
  }

  function put(id, p) {
    const el = els[id];
    if (!el) return;
    el.style.transform = tf(p);
    el.style.zIndex = String(p.z);
    pos.set(id, p);
  }

  // 移到新位置；lift > 0 时走抛物线（先抬高再落下）
  function move(id, p, ms, lift = 0) {
    const el = els[id];
    if (!el) return Promise.resolve();
    const from = pos.get(id);
    for (const a of el.getAnimations()) a.finish();
    put(id, p);
    if (reduce || !from || !ms) return Promise.resolve();
    const frames = lift
      ? [{ transform: tf(from) }, { transform: tf({ x: (from.x + p.x) / 2, y: Math.min(from.y, p.y) - lift, s: Math.max(from.s, p.s) * 1.1 }), offset: 0.45 }, { transform: tf(p) }]
      : [{ transform: tf(from) }, { transform: tf(p) }];
    return el.animate(frames, { duration: ms, easing: 'cubic-bezier(.3,.7,.35,1)' }).finished.catch(() => {});
  }

  // 以牌中心为基准缩放（transform-origin 在左上角，需要补偿位移）
  function around(p, k) {
    const w = T * p.s;
    const h = T * ROW_H * p.s;
    return { x: p.x + (w - w * k) / 2, y: p.y + (h - h * k) / 2, s: p.s * k, z: p.z };
  }

  function pop(id) {
    const el = els[id];
    const p = pos.get(id);
    if (!el || !p) return Promise.resolve();
    const done = reduce
      ? Promise.resolve()
      : el.animate(
        [{ transform: tf(p), opacity: 1 }, { transform: tf(around(p, 1.25)), opacity: 1, offset: 0.35 }, { transform: tf(around(p, 0.2)), opacity: 0 }],
        { duration: 220, easing: 'ease-in', fill: 'forwards' },
      ).finished.catch(() => {});
    return done.then(() => { el.remove(); els[id] = null; pos.delete(id); });
  }

  function setIcon(id, kind) {
    const use = els[id] && els[id].querySelector('use');
    if (use) use.setAttribute('href', `#ic-${ICONS[kind].key}`);
  }

  async function flip(changes) {
    const ids = game.state.tiles.filter((t) => t.zone === 'board' && els[t.id]).map((t) => t.id);
    const squash = (p, k) => `${tf(p)} translate(${T / 2}px, 0) scaleX(${k}) translate(${-T / 2}px, 0)`;
    if (!reduce) {
      await Promise.all(ids.map((id) => els[id].animate(
        [{ transform: tf(pos.get(id)) }, { transform: squash(pos.get(id), 0.05) }],
        { duration: 150, easing: 'ease-in', fill: 'forwards' },
      ).finished.catch(() => {})));
    }
    for (const c of changes) setIcon(c.id, c.kind);
    if (!reduce) {
      await Promise.all(ids.map((id) => {
        const el = els[id];
        for (const a of el.getAnimations()) a.cancel();
        return el.animate([{ transform: squash(pos.get(id), 0.05) }, { transform: tf(pos.get(id)) }], { duration: 170, easing: 'ease-out' }).finished.catch(() => {});
      }));
    }
  }

  function refresh() {
    if (!game) return;
    for (const t of game.state.tiles) {
      const el = els[t.id];
      if (!el) continue;
      const free = game.isFree(t.id);
      const covered = !free && (t.zone === 'board' || t.zone === 'buffer');
      el.classList.toggle('is-covered', covered);
      el.classList.toggle('is-free', free);
      el.classList.toggle('is-slot', t.zone === 'slot');
      el.tabIndex = free ? 0 : -1;
      el.setAttribute('aria-label', `${ICONS[t.kind].name}${covered ? '，被压住' : t.zone === 'slot' ? '，在卡槽中' : ''}`);
    }
  }

  function mount(g) {
    game = g;
    const st = g.state;
    playfield.textContent = '';
    els = [];
    pos.clear();
    hinted = -1;
    visualSlot = st.slot.slice();
    measure();
    const frag = document.createDocumentFragment();
    for (const t of st.tiles) {
      if (t.zone === 'gone') continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'tile';
      el.dataset.id = String(t.id);
      el.innerHTML = `<span class="tile-face"><svg aria-hidden="true" focusable="false"><use href="#ic-${ICONS[t.kind].key}"></use></svg></span>`;
      els[t.id] = el;
      frag.appendChild(el);
    }
    playfield.appendChild(frag);
    for (const t of st.tiles) if (els[t.id]) put(t.id, posOf(t.id));
    refresh();
    if (reduce) return;
    for (const t of st.tiles) {
      const el = els[t.id];
      if (!el || t.zone !== 'board') continue;
      const p = pos.get(t.id);
      el.animate(
        [{ transform: tf({ ...p, y: p.y - T * 1.6 }), opacity: 0 }, { transform: tf(p), opacity: 1 }],
        { duration: 360, delay: Math.min(620, t.z * 32 + (t.id % 9) * 10), easing: 'cubic-bezier(.2,.9,.3,1.15)', fill: 'backwards' },
      );
    }
  }

  async function play(events, hooks = {}) {
    for (const ev of events) {
      if (ev.type === 'pick') {
        visualSlot.splice(ev.slotIndex, 0, ev.id);
        const el = els[ev.id];
        el.classList.add('is-flying');
        refresh();
        const jobs = [move(ev.id, slotAt(ev.slotIndex), 200, T * 0.9)];
        visualSlot.forEach((id, i) => { if (id !== ev.id) jobs.push(move(id, slotAt(i), 150)); });
        await Promise.all(jobs);
        el.classList.remove('is-flying');
        hooks.onLand?.(ev);
      } else if (ev.type === 'eliminate') {
        const cs = ev.ids.map(center);
        hooks.onEliminate?.(ev, { x: cs.reduce((a, c) => a + c.x, 0) / cs.length, y: cs.reduce((a, c) => a + c.y, 0) / cs.length });
        await Promise.all(ev.ids.map(pop));
        visualSlot = visualSlot.filter((id) => !ev.ids.includes(id));
        await Promise.all(visualSlot.map((id, i) => move(id, slotAt(i), 150)));
      } else if (ev.type === 'moveOut') {
        const moved = new Set(ev.moves.map((m) => m.id));
        visualSlot = visualSlot.filter((id) => !moved.has(id));
        refresh();
        await Promise.all([
          ...ev.moves.map((m) => move(m.id, bufPos(m.col, m.height), 280, T * 0.7)),
          ...visualSlot.map((id, i) => move(id, slotAt(i), 180)),
        ]);
      } else if (ev.type === 'undo') {
        visualSlot = visualSlot.filter((id) => id !== ev.id);
        refresh();
        await Promise.all([move(ev.id, posOf(ev.id), 260, T * 0.8), ...visualSlot.map((id, i) => move(id, slotAt(i), 160))]);
      } else if (ev.type === 'shuffle') {
        await flip(ev.changes);
      }
    }
    refresh();
  }

  function center(id) {
    const p = pos.get(id);
    return p ? { x: p.x + (T * p.s) / 2, y: p.y + (T * ROW_H * p.s) / 2 } : { x: 0, y: 0 };
  }

  function deny(id) {
    const el = els[id];
    const p = pos.get(id);
    if (!el || !p || reduce) return;
    el.animate([{ transform: tf(p) }, { transform: tf({ ...p, x: p.x - 5 }) }, { transform: tf({ ...p, x: p.x + 5 }) }, { transform: tf(p) }], { duration: 200 });
  }

  function hint(id) {
    clearHint();
    if (els[id]) { els[id].classList.add('is-hint'); hinted = id; }
  }
  function clearHint() {
    if (hinted >= 0 && els[hinted]) els[hinted].classList.remove('is-hint');
    hinted = -1;
  }

  function resize() {
    if (!game) return;
    measure();
    for (const t of game.state.tiles) if (els[t.id]) put(t.id, posOf(t.id));
  }

  function clear() {
    playfield.textContent = '';
    els = [];
    pos.clear();
    visualSlot = [];
    game = null;
    hinted = -1;
  }

  return { mount, clear, resize, refresh, play, deny, hint, clearHint, center };
}
