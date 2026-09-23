// 启动与流程编排：存档、音频、平台能力、对局生命周期、结算、调试接口与热更新续玩
import { LEVELS, generateLevel } from '../core/generator.js';
import { createGame } from '../core/game.js';
import { bestMove } from '../core/bot.js';
import { ICONS, iconSymbolsSVG } from '../art/icons.js';
import { BREEDS } from '../art/dogs.js';
import { createAudio } from '../audio/audio.js';
import { createStore, dateKey } from './storage.js';
import { initPlatform, setPresence, broadcastWin, aiRoast, hotBoot, hotSnapshot } from './platform.js';
import { createFx } from './fx.js';
import { renderShareCard, saveCard } from './share.js';
import { createBoard } from './board.js';
import { createScreens } from './screens.js';

const COMBO_TEXT = ['', '汪！', '汪汪！', '汪汪汪！', '狗王驾到！'];
// 每日种子带版本号：以后若改动生成器/机器人/布局，把 v1 升级为 v2，避免同一天的关卡被悄悄改掉
const dailySeed = (day) => `dog-v1-${day}`;
// 这些错误码表示当前页面用不了某个平台能力：隐藏对应按钮，不再重试
const GONE_CODES = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'unavailable']);
const TEAM = Object.fromEntries(BREEDS.map((b) => [b.key, b]));
const $ = (id) => document.getElementById(id);

function localStorageOrNull() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function boot(hot) {
  const store = createStore(localStorageOrNull());
  const save = store.data;
  if (save.team && !TEAM[save.team]) save.team = null;
  const today = dateKey();
  const params = new URLSearchParams(globalThis.location ? globalThis.location.search : '');
  const audio = createAudio();
  audio.setMusic(save.settings.music);
  audio.setSfx(save.settings.sfx);
  document.body.insertAdjacentHTML('afterbegin', iconSymbolsSVG());
  const ui = createScreens();
  ui.setBreed(save.team || 'shiba');
  const fx = createFx($('fx'));
  let peers = null;
  let s = null;
  let card = null;
  let roastCtl = null;
  let resultSeq = 0; // 每次弹结算加一，晚到的旧战绩图直接丢弃

  const platform = initPlatform({
    onPeers: (p) => { peers = p; renderHome(); },
    onWinBroadcast: (team, fromMe) => { if (!fromMe) ui.toast(`一位${team ? TEAM[team].team : ''}狗友刚刚通关了今日第 2 关！`); },
    onChange: () => { renderHome(); syncPresence(); },
  });
  const board = createBoard({ screen: $('game'), stage: $('stage'), slotEl: $('slot'), playfield: $('playfield'), onTap: tap });

  const vibrate = (pattern) => {
    if (!save.settings.vibrate || !navigator.vibrate) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { navigator.vibrate(pattern); } catch { /* 不支持震动 */ }
  };
  const playing = () => !!s && s.game.state.status === 'playing';
  const elapsed = () => (s ? s.elapsed + (s.running ? performance.now() - s.since : 0) : 0);
  const pauseClock = () => { if (s && s.running) { s.elapsed += performance.now() - s.since; s.running = false; } };
  const resumeClock = () => { if (s && !s.running && playing()) { s.since = performance.now(); s.running = true; } };
  const newPracticeSeed = () => params.get('seed') || `p-${Date.now().toString(36)}`;

  // 每次用户手势都尝试解锁音频并按设置开始背景音乐（两者都幂等）；iOS 只认 touchend/click 这类手势，所以多监听几种
  const unlock = () => {
    audio.unlock();
    if (save.settings.music) audio.startMusic();
  };
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(type, unlock, { capture: true, passive: true });

  function syncPresence() {
    setPresence(platform, { team: save.team, screen: s ? 'game' : 'home', level: s ? s.key : null });
  }

  function renderHome() {
    const d = store.peekDay(today);
    ui.home({
      dailySub: d.l2 ? '今日已通关 ✓ 再挑战一次' : d.l1 ? '第 2 关 · 真正的考验' : '第 1 关 · 热身',
      teamName: save.team ? TEAM[save.team].team : '还没加入狗群',
      streak: store.currentStreak(today),
      online: peers,
    });
  }

  function stopRoast() {
    if (roastCtl) { roastCtl.abort(); roastCtl = null; }
  }

  function goHome() {
    stopRoast();
    pauseClock();
    s = null;
    board.clear();
    audio.setTension(0);
    ui.slotDanger(false);
    ui.hush();
    ui.setBaseMood('idle');
    ui.show('home');
    renderHome();
    syncPresence();
  }

  function updateHud() {
    const g = s.game;
    const st = g.state;
    ui.hud({
      name: s.mode === 'practice' ? `练习 · ${g.level.name}` : g.level.name,
      left: st.remaining,
      props: st.props,
      can: { moveOut: g.canMoveOut(), undo: g.canUndo(), shuffle: g.canShuffle() },
    });
  }

  function startLevel(key, seedStr, mode, actions = null) {
    stopRoast();
    const level = generateLevel(key, seedStr);
    let game = createGame(level);
    if (actions && (!game.replay(actions) || game.state.status !== 'playing')) {
      console.warn('续玩回放失败或对局已结束，从头开始');
      game = createGame(level);
      actions = null;
    }
    s = { game, key, seedStr, mode, elapsed: 0, since: performance.now(), running: true, busy: false, queue: [], warned: false };
    ui.close();
    ui.show('game');
    board.mount(game);
    fx.resize();
    ui.setBaseMood('idle');
    ui.slotDanger(false);
    audio.setTension(0);
    updateHud();
    if (!actions) store.recordPlay();
    syncPresence();
    if (key === 'daily1' && !actions) {
      board.hint(level.solution[0]);
      ui.say('点亮着的牌，凑齐 3 张就能消除！', 3200);
    } else {
      ui.say(key === 'daily2' ? '第 2 关来了，稳住别慌！' : '开干，汪！', 2000);
    }
  }

  function tap(id) {
    if (!playing() || ui.isOpen()) return;
    if (s.busy) {
      if (s.queue.length < 3) s.queue.push(id);
      return;
    }
    pick(id);
  }

  function pick(id) {
    const g = s.game;
    const t = g.state.tiles[id];
    const events = g.pick(id);
    if (!events) {
      if (t && (t.zone === 'board' || t.zone === 'buffer')) {
        board.deny(id);
        audio.play('deny');
        ui.flashMood('shock', 700);
        ui.say('这张被压住啦，先拿上面的', 1300);
      }
      return;
    }
    board.clearHint();
    audio.play('tap');
    vibrate(8);
    run(events);
  }

  async function run(events) {
    const cur = s;
    cur.busy = true;
    try {
      await board.play(events, {
        onLand: () => audio.play('place'),
        onEliminate: (ev, c) => {
          audio.play('match', { combo: ev.combo });
          if (ev.combo >= 2) audio.play('woof', { variant: ev.combo >= 3 ? 1 : 0 });
          vibrate([15, 30, 15]);
          fx.burst(c.x, c.y, ICONS[ev.kind].color);
          ui.combo(COMBO_TEXT[Math.min(ev.combo, 4)], c.x, c.y - 24);
          ui.flashMood('happy', 900);
        },
      });
    } finally {
      cur.busy = false;
    }
    if (s !== cur) return;
    afterAction(events);
    while (s === cur && playing() && !cur.busy && cur.queue.length && !ui.isOpen()) pick(cur.queue.shift());
  }

  function afterAction(events) {
    const st = s.game.state;
    updateHud();
    const n = st.slot.length;
    audio.setTension(n >= 6 ? 1 : n === 5 ? 0.5 : 0);
    ui.slotDanger(n >= 5 && st.status === 'playing');
    if (st.status === 'playing') {
      if (n >= 5 && !s.warned) {
        s.warned = true;
        audio.play('warn');
        ui.setBaseMood('worried');
        ui.say(n >= 6 ? '只剩 1 格了！' : '卡槽快满了，稳住！', 1600);
      } else if (n < 5 && s.warned) {
        s.warned = false;
        ui.setBaseMood('idle');
      }
    }
    if (st.status !== 'playing') s.queue.length = 0;
    if (events.some((e) => e.type === 'win')) onWin();
    else if (events.some((e) => e.type === 'lose')) onLose();
  }

  function useProp(name) {
    if (!playing() || s.busy || ui.isOpen()) return;
    const g = s.game;
    const events = name === 'moveOut' ? g.moveOut() : name === 'undo' ? g.undo() : g.shuffle();
    if (!events) {
      ui.denyProp(name);
      audio.play('deny');
      const st = g.state;
      const why = st.props[name] <= 0 ? '这个道具用完啦'
        : name === 'undo' ? (st.slot.length ? '只能撤回刚放进卡槽的那一张' : '卡槽是空的，没得撤回')
          : name === 'moveOut' ? '卡槽是空的，不用移出' : '场上没有牌可洗了';
      ui.say(why, 1500);
      return;
    }
    audio.play(name);
    board.clearHint();
    ui.say(name === 'moveOut' ? '挪出去 3 张，喘口气' : name === 'undo' ? '刚才那步不算！' : '重新洗牌，汪！', 1400);
    run(events);
  }

  function summary(result) {
    const st = s.game.state;
    const u = st.used;
    return {
      result, key: s.key, mode: s.mode, levelName: s.game.level.name, dateKey: today,
      seconds: Math.round(elapsed() / 1000), moves: st.moves, remaining: st.remaining,
      used: u, propsUsed: u.moveOut + u.undo + u.shuffle + u.revive,
      breedKey: save.team || 'shiba', teamName: save.team ? TEAM[save.team].team : '',
      streak: store.currentStreak(today), dogs: save.stats.dogsContributed, canRevive: s.game.canRevive(),
    };
  }

  function onWin() {
    pauseClock();
    const cur = s;
    store.recordWin({ daily: cur.mode === 'daily', level: cur.key, key: today });
    audio.setTension(0);
    audio.play('win');
    vibrate([20, 40, 20, 40, 60]);
    fx.confetti();
    ui.setBaseMood('cheer');
    ui.slotDanger(false);
    if (cur.mode === 'daily' && cur.key === 'daily1') {
      setTimeout(() => { if (s === cur) ui.intro2(LEVELS.daily2, () => startLevel('daily2', dailySeed(today), 'daily')); }, 700);
      return;
    }
    if (cur.mode === 'daily' && cur.key === 'daily2') broadcastWin(platform, save.team);
    setTimeout(() => { if (s === cur) showResult(summary('won')); }, 800);
  }

  function onLose() {
    pauseClock();
    const cur = s;
    audio.setTension(0);
    audio.play('lose');
    vibrate([80, 50, 120]);
    ui.setBaseMood('sad');
    ui.shakeSlot();
    if (cur.mode === 'daily') store.recordLoss(today, cur.game.state.remaining);
    setTimeout(() => { if (s === cur) showResult(summary('lost')); }, 700);
  }

  function showResult(info) {
    const cur = s;
    const seq = ++resultSeq;
    if (card) URL.revokeObjectURL(card.url);
    card = null;
    const daily2Won = info.result === 'won' && info.key === 'daily2';
    ui.result(info, {
      canSave: !platform.inClaude || !!platform.downloads,
      canRoast: !!platform.sample,
      nextLabel: cur.mode === 'practice' ? '再来一局' : daily2Won ? '再挑战一次' : '下一关',
      onNext: () => startLevel(cur.key, cur.mode === 'practice' ? newPracticeSeed() : cur.seedStr, cur.mode),
      onRetry: () => startLevel(cur.key, cur.seedStr, cur.mode),
      onRevive: () => {
        const events = cur.game.revive();
        if (!events) return;
        stopRoast();
        resultSeq++;
        ui.close();
        audio.play('revive');
        ui.setBaseMood('idle');
        cur.warned = false;
        ui.say('复活成功，再来！', 1500);
        resumeClock();
        run(events);
      },
      onHome: () => { ui.close(); goHome(); },
      onSave: async (btn) => {
        if (!card) { ui.toast('战绩图还在生成，稍等一下'); return; }
        btn.disabled = true;
        const r = await saveCard(card.blob, platform);
        btn.disabled = false;
        if (r === 'unavailable') btn.hidden = true;
        const tips = { saved: '战绩图已保存', downloaded: '战绩图已下载', shared: '已打开分享', declined: '已取消保存' };
        ui.toast(tips[r] || '这里保存不了，可以长按图片保存');
      },
      onRoast: async (btn) => {
        btn.disabled = true;
        ui.roastText('狗子正在酝酿毒舌……');
        stopRoast();
        const ctl = new AbortController();
        roastCtl = ctl;
        try {
          await aiRoast(platform, info, (text) => { if (!ctl.signal.aborted) ui.roastText(text); }, ctl.signal);
        } catch (e) {
          const code = e && e.code;
          if (ctl.signal.aborted) return;
          if (GONE_CODES.has(code)) {
            ui.roastText('狗子这次不想说话（没有获得 AI 授权）');
            btn.hidden = true;
            return;
          }
          ui.roastText(code === 'rate_limited' ? '狗子说累了，过一会儿再来' : code === 'cancelled' ? '' : '狗子走神了，再点一次试试');
        }
        btn.disabled = false;
      },
    });
    renderShareCard(info).then((c) => {
      if (s !== cur || seq !== resultSeq) { URL.revokeObjectURL(c.url); return; }
      card = c;
      ui.setCard(c.url, () => c.canvas.toDataURL('image/png'));
    }).catch(() => ui.cardFailed());
  }

  function pause() {
    if (!playing() || ui.isOpen()) return;
    s.queue.length = 0;
    pauseClock();
    ui.pause({
      settings: save.settings,
      onToggle: toggleSetting,
      onResume: () => resumeClock(),
      onRestart: () => startLevel(s.key, s.seedStr, s.mode),
      onHome: () => goHome(),
    });
  }

  function toggleSetting(name, value) {
    store.setSetting(name, value);
    if (name === 'music') {
      audio.setMusic(value);
      if (value) audio.startMusic(); else audio.stopMusic();
    }
    if (name === 'sfx') audio.setSfx(value);
    if (name === 'vibrate' && value) vibrate(20);
  }

  function openPack(first) {
    ui.pack({
      selected: save.team,
      peers,
      first,
      stats: { dailyWins: save.stats.dailyWins, streak: store.currentStreak(today), dogs: save.stats.dogsContributed },
    }, (key) => {
      store.setTeam(key);
      ui.setBreed(key);
      audio.play('woof', { variant: key === 'husky' || key === 'golden' ? 2 : key === 'teddy' || key === 'corgi' ? 1 : 0 });
      renderHome();
      syncPresence();
      if (first) {
        ui.close();
        ui.toast(`欢迎加入${TEAM[key].team}！`);
      } else {
        openPack(false);
      }
    });
  }

  $('btn-daily').addEventListener('click', () => {
    audio.play('button');
    startLevel(store.peekDay(today).l1 ? 'daily2' : 'daily1', dailySeed(today), 'daily');
  });
  $('btn-practice').addEventListener('click', () => {
    audio.play('button');
    ui.practice(LEVELS, (key) => startLevel(key, newPracticeSeed(), 'practice'));
  });
  $('btn-pack').addEventListener('click', () => { audio.play('button'); openPack(false); });
  $('btn-settings').addEventListener('click', () => { audio.play('button'); ui.settings(save.settings, toggleSetting); });
  $('btn-help').addEventListener('click', () => { audio.play('button'); ui.help(); });
  $('btn-pause').addEventListener('click', () => { audio.play('button'); pause(); });
  for (const name of ['moveOut', 'undo', 'shuffle']) $(`prop-${name}`).addEventListener('click', () => useProp(name));
  addEventListener('resize', () => { fx.resize(); board.resize(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing() && !ui.isOpen()) pause(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && playing() && !ui.isOpen()) pause(); });

  if (params.has('debug') || (globalThis.location && globalThis.location.hash === '#debug')) {
    const dbg = {
      state: () => (s ? s.game.state : null),
      actions: () => (s ? s.game.actions : []),
      solution: () => (s ? s.game.level.solution : null),
      level: (key = 'daily1', seed = dailySeed(today)) => startLevel(key, seed, key.startsWith('daily') ? 'daily' : 'practice'),
      step() {
        if (!playing() || ui.isOpen()) return false;
        const g = s.game;
        const acts = g.actions;
        const sol = g.level.solution;
        const onPath = !!sol && acts.every((a, i) => a[0] === 'p' && a[1] === sol[i]);
        const id = onPath && acts.length < sol.length ? sol[acts.length] : bestMove(g).id;
        if (id >= 0) tap(id);
        return true;
      },
      autoplay(ms = 150) {
        const iv = setInterval(() => { if (!dbg.step()) clearInterval(iv); }, ms);
        return iv;
      },
      save: () => save,
      platform: () => platform,
      audio: () => audio,
    };
    globalThis.__dog = dbg;
  }

  hotSnapshot(() => (s ? { screen: 'game', key: s.key, seedStr: s.seedStr, mode: s.mode, actions: s.game.actions } : { screen: 'home' }));
  renderHome();
  syncPresence();
  if (hot && hot.screen === 'game' && LEVELS[hot.key] && typeof hot.seedStr === 'string') {
    startLevel(hot.key, hot.seedStr, hot.mode === 'practice' ? 'practice' : 'daily', Array.isArray(hot.actions) ? hot.actions : null);
  } else if (!save.team) {
    setTimeout(() => openPack(true), 300);
  }
}

hotBoot(boot);
