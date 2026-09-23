// 界面层：首页、HUD、弹层、吉祥物与气泡、提示条；只负责渲染与收集点击，流程由 main.js 编排
import { BREEDS, dogHeadSVG } from '../art/dogs.js';
import { logoSVG } from '../art/logo.js';
import { iconSVG } from '../art/icons.js';

const $ = (id) => document.getElementById(id);
const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export function createScreens() {
  const layer = $('modal-layer');
  const modal = $('modal');
  const bubble = $('bubble');
  const face = $('mascot-face');
  let breed = 'shiba';
  let baseMood = 'idle';
  let shown = '';
  let moodTimer = 0;
  let bubbleTimer = 0;
  let lastFocus = null;

  $('logo').insertAdjacentHTML('beforeend', logoSVG().replace('<svg', '<svg aria-hidden="true"'));

  // ---- 吉祥物 ----
  function paint(m) {
    if (m === shown) return;
    shown = m;
    face.innerHTML = dogHeadSVG(breed, m);
  }
  function setBaseMood(m) { baseMood = m; clearTimeout(moodTimer); paint(m); }
  function flashMood(m, ms = 800) {
    clearTimeout(moodTimer);
    paint(m);
    moodTimer = setTimeout(() => paint(baseMood), ms);
  }
  function setBreed(key) {
    breed = key || 'shiba';
    shown = '';
    paint(baseMood);
    $('hero-dog').innerHTML = dogHeadSVG(breed, 'happy');
  }
  function say(text, ms = 1800) {
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, ms);
  }
  function hush() { clearTimeout(bubbleTimer); bubble.hidden = true; }

  // ---- 页面与 HUD ----
  function show(name) {
    $('home').hidden = name !== 'home';
    $('game').hidden = name !== 'game';
  }
  function home({ dailySub, teamName, streak, online }) {
    $('daily-sub').textContent = dailySub;
    const chip = $('team-chip');
    chip.innerHTML = dogHeadSVG(breed, 'idle');
    const name = document.createElement('span');
    name.textContent = teamName;
    chip.appendChild(name);
    $('streak').textContent = streak > 0 ? `连续打卡 ${streak} 天` : '';
    const box = $('online');
    box.hidden = !(online && online.total > 0);
    if (!box.hidden) $('online-count').textContent = String(online.total);
  }
  function hud({ name, left, props, can }) {
    $('level-name').textContent = name;
    $('tiles-left').textContent = String(left);
    for (const k of ['moveOut', 'undo', 'shuffle']) {
      const btn = $(`prop-${k}`);
      $(`badge-${k}`).textContent = String(props[k]);
      btn.classList.toggle('is-empty', props[k] <= 0);
      btn.classList.toggle('is-idle', props[k] > 0 && !can[k]);
      btn.setAttribute('aria-label', `${btn.querySelector('.prop-name').textContent}，剩 ${props[k]} 次`);
    }
  }
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  function denyProp(k) { restart($(`prop-${k}`), 'is-deny'); }
  function slotDanger(on) { $('slot').classList.toggle('is-danger', on); }
  function shakeSlot() { restart($('slot'), 'is-shake'); }

  function toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }
  function combo(text, x, y) {
    const c = document.createElement('div');
    c.className = 'combo';
    c.textContent = text;
    c.style.left = `${x}px`;
    c.style.top = `${y}px`;
    $('app').appendChild(c);
    setTimeout(() => c.remove(), 1000);
  }

  // ---- 弹层 ----
  function open({ title, body = '', actions = [], dismissible = true, onDismiss = null }) {
    lastFocus = document.activeElement;
    modal.textContent = '';
    const h = document.createElement('h2');
    h.className = 'modal-title';
    h.id = 'modal-title';
    h.textContent = title;
    const b = document.createElement('div');
    b.className = 'modal-body';
    if (typeof body === 'string') b.innerHTML = body;
    else if (body) b.appendChild(body);
    const acts = document.createElement('div');
    acts.className = 'modal-actions';
    const buttons = {};
    for (const a of actions) {
      if (a.hidden) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn ${a.go ? 'btn-go' : 'btn-soft'}`;
      btn.textContent = a.label;
      btn.addEventListener('click', () => a.onClick(btn));
      acts.appendChild(btn);
      if (a.key) buttons[a.key] = btn;
    }
    modal.append(h, b);
    if (acts.children.length) modal.appendChild(acts);
    layer.hidden = false;
    const dismiss = () => { close(); onDismiss?.(); };
    layer.onclick = dismissible ? (e) => { if (e.target === layer) dismiss(); } : null;
    layer.onkeydown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (dismissible) dismiss();
      } else if (e.key === 'Tab') {
        trapFocus(e);
      }
    };
    modal.focus();
    return { body: b, buttons };
  }
  // 焦点在弹层内循环，不跳到背后的牌上
  function trapFocus(e) {
    const items = [...modal.querySelectorAll('button:not([disabled]):not([hidden]), [href], [tabindex]:not([tabindex="-1"])')];
    if (!items.length) { e.preventDefault(); modal.focus(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === modal)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function close() {
    if (layer.hidden) return;
    layer.hidden = true;
    modal.textContent = '';
    layer.onclick = null;
    layer.onkeydown = null;
    if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus();
  }
  const isOpen = () => !layer.hidden;

  function switches(settings, onToggle) {
    const wrap = document.createElement('div');
    wrap.className = 'switches';
    for (const [key, label] of [['music', '背景音乐'], ['sfx', '音效'], ['vibrate', '震动']]) {
      const row = document.createElement('div');
      row.className = 'switch-row';
      const span = document.createElement('span');
      span.id = `sw-label-${key}`;
      span.textContent = label;
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'switch';
      sw.id = `sw-${key}`;
      sw.setAttribute('aria-labelledby', span.id);
      sw.setAttribute('aria-pressed', String(!!settings[key]));
      sw.addEventListener('click', () => {
        const v = sw.getAttribute('aria-pressed') !== 'true';
        sw.setAttribute('aria-pressed', String(v));
        onToggle(key, v);
      });
      row.append(span, sw);
      wrap.appendChild(row);
    }
    return wrap;
  }

  function settings(s, onToggle) {
    open({ title: '设置', body: switches(s, onToggle), actions: [{ label: '好的', go: true, onClick: close }] });
  }

  function help() {
    const rules = [
      [0, '点一张亮着的牌，它会飞进下方的 7 格卡槽。'],
      [3, '卡槽里凑齐 3 张相同的，就会消除。'],
      [4, '卡槽塞满 7 张就输了；变暗的牌被压住，暂时点不了。'],
      [1, '道具每关各 1 次：移出、撤回、洗牌；输了还能复活 1 次。'],
      [13, '今日挑战每天一关，大家玩的都是同一关：第 1 关热身，第 2 关才是真正的考验。'],
    ];
    const body = `<ul class="rules">${rules.map(([k, t]) => `<li>${iconSVG(k, 30)}<span>${t}</span></li>`).join('')}</ul>`;
    open({ title: '怎么玩', body, actions: [{ label: '明白了，汪！', go: true, onClick: close }] });
  }

  function practice(levels, onPick) {
    const list = document.createElement('div');
    list.className = 'choice-list';
    const items = [['easy', '轻松消遣，适合练手'], ['normal', '要动点脑子'], ['hard', '和第 2 关差不多难'], ['hell', '不保证有解，致敬原版']];
    for (const [key, desc] of items) {
      const L = levels[key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.innerHTML = `<b>${L.name}</b><small>${L.kinds} 种图案 · ${L.kinds * L.perKind} 张 · ${desc}</small>`;
      b.addEventListener('click', () => onPick(key));
      list.appendChild(b);
    }
    open({ title: '自由练习', body: list, actions: [{ label: '返回', onClick: close }] });
  }

  function pack({ selected, peers, stats, first }, onPick) {
    const box = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'team-grid';
    for (const b of BREEDS) {
      const on = b.key === selected;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `team${on ? ' is-on' : ''}`;
      btn.setAttribute('aria-pressed', String(on));
      const n = peers && peers.teams[b.key];
      btn.innerHTML = `${dogHeadSVG(b.key, on ? 'happy' : 'idle')}<b>${b.team}</b><small>${n ? `在线 ${n}` : '&nbsp;'}</small>`;
      btn.addEventListener('click', () => onPick(b.key));
      grid.appendChild(btn);
    }
    box.appendChild(grid);
    if (!first) {
      const p = document.createElement('p');
      p.className = 'pack-stats';
      p.textContent = `今日挑战通关 ${stats.dailyWins} 次 · 连续打卡 ${stats.streak} 天 · 为狗群贡献 ${stats.dogs} 只狗`;
      box.appendChild(p);
    }
    open({
      title: first ? '选一个狗群加入' : '我的狗群',
      body: box,
      dismissible: !first,
      actions: first ? [] : [{ label: '好的', go: true, onClick: close }],
    });
  }

  function pause(h) {
    open({
      title: '暂停一下',
      body: switches(h.settings, h.onToggle),
      onDismiss: h.onResume,
      actions: [
        { label: '继续游戏', go: true, onClick: () => { close(); h.onResume(); } },
        { label: '重开本关', onClick: () => { close(); h.onRestart(); } },
        { label: '回到首页', onClick: () => { close(); h.onHome(); } },
      ],
    });
  }

  function intro2(L, onStart) {
    open({
      title: '热身结束！',
      dismissible: false,
      body: `<div class="modal-dog">${dogHeadSVG(breed, 'shock')}</div><p class="intro-big">第 2 关</p><p>${L.kinds} 种图案、${L.kinds * L.perKind} 张牌、${L.layers} 层叠叠乐，两侧还有盲盒牌堆。道具各 1 次，复活 1 次，祝你好运，汪！</p>`,
      actions: [{ label: '开始第 2 关', go: true, onClick: () => { close(); onStart(); } }],
    });
  }

  function result(info, h) {
    const won = info.result === 'won';
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="modal-dog">${dogHeadSVG(breed, won ? 'cheer' : 'sad')}</div>
      <div class="stats">
        <div class="stat"><small>用时</small><b>${fmtTime(info.seconds)}</b></div>
        <div class="stat"><small>${won ? '拿牌' : '剩余'}</small><b>${won ? `${info.moves} 次` : `${info.remaining} 张`}</b></div>
        <div class="stat"><small>道具</small><b>${info.propsUsed} 次</b></div>
      </div>
      <div class="card-wrap" id="card-wrap">战绩图生成中…</div>
      <p class="card-tip" id="card-tip" hidden>手机上可以长按图片保存</p>
      <div class="roast" id="roast" hidden></div>`;
    const title = won ? (info.key === 'daily2' ? '今日挑战通关！' : '通关成功！') : '卡槽满啦！';
    const actions = won
      ? [
        { key: 'next', label: h.nextLabel, go: true, onClick: h.onNext },
        { key: 'save', label: '保存战绩图', onClick: h.onSave, hidden: !h.canSave },
        { key: 'roast', label: 'AI 狗评', onClick: h.onRoast, hidden: !h.canRoast },
        { key: 'home', label: '回到首页', onClick: h.onHome },
      ]
      : [
        { key: 'revive', label: '复活一次（移出 3 张）', go: true, onClick: h.onRevive, hidden: !info.canRevive },
        { key: 'retry', label: '重新开始', go: !info.canRevive, onClick: h.onRetry },
        { key: 'save', label: '保存战绩图', onClick: h.onSave, hidden: !h.canSave },
        { key: 'roast', label: 'AI 狗评', onClick: h.onRoast, hidden: !h.canRoast },
        { key: 'home', label: '回到首页', onClick: h.onHome },
      ];
    return open({ title, body, actions, dismissible: false });
  }
  function setCard(url, fallback) {
    const wrap = $('card-wrap');
    if (!wrap) return;
    wrap.textContent = '';
    const img = new Image();
    img.alt = '本局战绩图';
    img.onerror = () => {
      img.onerror = () => cardFailed();
      if (fallback) img.src = fallback(); else cardFailed();
    };
    img.src = url;
    wrap.appendChild(img);
    const tip = $('card-tip');
    if (tip) tip.hidden = false;
  }
  function cardFailed() {
    const wrap = $('card-wrap');
    if (wrap) wrap.textContent = '战绩图生成失败';
  }
  function roastText(text) {
    const r = $('roast');
    if (!r) return;
    r.hidden = !text;
    r.textContent = text;
  }

  return {
    show, home, hud, denyProp, slotDanger, shakeSlot,
    setBreed, setBaseMood, flashMood, say, hush, toast, combo,
    open, close, isOpen, settings, help, practice, pack, pause, intro2, result, setCard, cardFailed, roastText,
  };
}
