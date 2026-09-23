// WebAudio 实时合成：音效 + 原创 BGM + 紧张声部；无 AudioContext 时全部静默
//
// 约定：
// - 只用具名导出（const / function 两种写法），构建脚本依赖这个约定；
// - 模块顶层不访问 window / document，浏览器能力都在函数里按需判断；
// - 全部声音实时合成，不读取任何音频文件。

export const SFX_NAMES = Object.freeze(['tap', 'place', 'match', 'woof', 'moveOut', 'undo', 'shuffle', 'warn', 'deny', 'win', 'lose', 'revive', 'button']);

// ───────────────────────── 原创曲谱《狗狗撒欢》 ─────────────────────────
// C 大调五声音阶（C D E G A），128 BPM，16 小节 AABA，一遍 30 秒，循环播放。
// 和声：A 段 C | Am | Dm | G，B 段 Am | Em | Dm | G。
// 动机：A 段句头是「汪-汪、汪-汪」的下行四度（G→D），句尾用十六分音符小跑上行；
//      B 段把它倒过来变成上行四度（E→A），一路推到全曲最高音 E6，再滑回 A 段。
//
// 记谱：每小节 16 个记号，空格分隔，一个记号 = 一个十六分音符。
//   旋律 / 贝斯：音名（如 E5）表示在此起音；'-' 延长前一个音；'.' 休止。
//   鼓：k 底鼓、s 军鼓、h 踩镲，可以组合（如 ks）；'.' 表示这一步没有鼓。

const STEPS_PER_BAR = 16;

const LEAD_PHRASES = {
  hook: 'G5 -  D5 -  .  .  G5 -  D5 -  .  .  E5 G5 A5 C6', // 汪-汪，汪-汪，小跑上行
  answer: 'A5 -  -  G5 -  E5 -  -  D5 -  E5 -  C5 -  -  -', // 切分着落回来
  hookLow: 'A5 -  E5 -  .  .  A5 -  E5 -  .  .  D5 E5 G5 A5', // 句头移到 Dm 上
  half: 'G5 -  -  A5 -  G5 -  -  E5 -  D5 -  -  -  .  .', // 半终止，停在属音上
  turn: 'A5 -  E5 -  .  .  A5 -  G5 -  E5 -  D5 -  E5 -', // Dm → G，引向终止
  cadence: 'G5 -  -  C6 -  -  A5 -  G5 -  E5 -  C5 -  -  -', // 回到主音
  bridge1: 'E5 -  A5 -  .  .  E5 -  A5 -  .  .  C6 -  A5 -', // B 段：「汪-汪」倒影成上行四度
  bridge2: 'D5 -  G5 -  .  .  D5 -  G5 -  .  .  A5 -  G5 -',
  bridge3: 'E5 -  A5 -  .  .  E5 -  A5 -  .  .  C6 -  D6 -',
  bridge4: 'E6 -  -  D6 -  -  C6 -  A5 -  G5 -  E5 -  D5 -', // 冲到最高点后一路滑回
  loopEnd: 'G5 -  -  C6 -  -  A5 -  G5 -  E5 -  C5 -  E5 -', // 同 cadence，末尾带弱起接回开头
};
const LEAD_FORM = [
  'hook', 'answer', 'hookLow', 'half', // A
  'hook', 'answer', 'turn', 'cadence', // A
  'bridge1', 'bridge2', 'bridge3', 'bridge4', // B
  'hook', 'answer', 'turn', 'loopEnd', // A
];

// 贝斯：每半小节「3+3+2」的弹跳节奏（根音、根音、五度）
const BASS_PATTERNS = {
  C: 'C3 -  .  C3 -  .  G2 -  C3 -  .  C3 -  .  G2 -',
  Am: 'A2 -  .  A2 -  .  E2 -  A2 -  .  A2 -  .  E2 -',
  Dm: 'D3 -  .  D3 -  .  A2 -  D3 -  .  D3 -  .  A2 -',
  G: 'G2 -  .  G2 -  .  D3 -  G2 -  .  G2 -  .  A2 -', // 末尾 A2 往上接回 C3
  DG: 'D3 -  .  D3 -  .  A2 -  G2 -  .  G2 -  .  D3 -', // 前半 Dm，后半 G
  Em: 'E2 -  .  E2 -  .  G2 -  E2 -  .  E2 -  .  D2 -', // B 不在五声音阶里，用小三度 G 代替五度
  DmLow: 'D2 -  .  D2 -  .  A2 -  D2 -  .  D2 -  .  A2 -',
};
const BASS_FORM = ['C', 'Am', 'Dm', 'G', 'C', 'Am', 'DG', 'C', 'Am', 'Em', 'DmLow', 'G', 'C', 'Am', 'DG', 'C'];

const DRUM_PATTERNS = {
  groove: 'k  .  h  .  s  .  h  .  k  .  h  k  s  .  h  .',
  fill: 'k  .  h  .  s  .  h  .  k  .  h  k  s  .  s  s', // 句尾小过门
  roll: 'k  .  h  .  s  .  h  .  k  .  s  .  s  s  s  s', // 进 B 段前的军鼓滚奏
  drive: 'k  .  h  .  ks .  h  .  k  .  h  .  ks .  h  .', // B 段四拍底鼓，更有推进感
  lift: 'k  .  h  .  ks .  h  .  k  .  s  .  ks s  s  s', // 回 A 段前的过门
};
const DRUM_FORM = ['groove', 'groove', 'groove', 'fill', 'groove', 'groove', 'groove', 'roll', 'drive', 'drive', 'drive', 'lift', 'groove', 'groove', 'groove', 'fill'];

// 每半小节的和弦根音：紧张声部的八度贝斯脉冲跟着它走
const HARMONY = 'C C A A D D G G C C A A D G C C A A E E D D G G C C A A D G C C'.split(' ');

const NOTE_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const DRUM_KINDS = { k: 'kick', s: 'snare', h: 'hat' };

// 音名 → MIDI 音高（C4 = 60）
function noteToMidi(name) {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) throw new Error('曲谱里有无法识别的音名：' + name);
  return 12 * (Number(m[3]) + 1) + NOTE_OFFSETS[m[1]] + (m[2] ? 1 : 0);
}

// MIDI 音高 → 频率（A4 = 440Hz）
function mtof(pitch) {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

// 切开一小节的记号，并确认正好 16 个
function barTokens(bar, index) {
  const tokens = bar.trim().split(/\s+/);
  if (tokens.length !== STEPS_PER_BAR) throw new Error(`曲谱第 ${index + 1} 小节应有 ${STEPS_PER_BAR} 个记号，实际 ${tokens.length} 个`);
  return tokens;
}

// 旋律 / 贝斯谱 → [{ step, pitch, len }]
function parseNotes(bars) {
  const notes = [];
  let open = null;
  bars.forEach((bar, b) => {
    barTokens(bar, b).forEach((tk, i) => {
      if (tk === '-') {
        if (open) open.len += 1;
      } else if (tk === '.') {
        open = null;
      } else {
        open = { step: b * STEPS_PER_BAR + i, pitch: noteToMidi(tk), len: 1 };
        notes.push(open);
      }
    });
  });
  return Object.freeze(notes.map((n) => Object.freeze(n)));
}

// 鼓谱 → [{ step, type }]
function parseDrums(bars) {
  const hits = [];
  bars.forEach((bar, b) => {
    barTokens(bar, b).forEach((tk, i) => {
      if (tk === '.') return;
      for (const c of tk) {
        const type = DRUM_KINDS[c];
        if (!type) throw new Error('鼓谱里有无法识别的记号：' + tk);
        hits.push(Object.freeze({ step: b * STEPS_PER_BAR + i, type }));
      }
    });
  });
  return Object.freeze(hits);
}

export const SONG = Object.freeze({
  bpm: 128,
  bars: 16,
  stepsPerBar: STEPS_PER_BAR,
  lead: parseNotes(LEAD_FORM.map((k) => LEAD_PHRASES[k])),
  bass: parseNotes(BASS_FORM.map((k) => BASS_PATTERNS[k])),
  drums: parseDrums(DRUM_FORM.map((k) => DRUM_PATTERNS[k])),
});

// ───────────────────────── 音频引擎 ─────────────────────────

export function createAudio() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  const noop = () => {};
  if (!AC) return { unlock: noop, setMusic: noop, setSfx: noop, play: noop, startMusic: noop, stopMusic: noop, setTension: noop };

  // ── 常量 ──
  const MASTER_VOL = 0.8;
  const MUSIC_VOL = 0.35;
  const SFX_VOL = 0.9;
  const MIN = 0.0001; // 指数斜坡的下限：指数斜坡不能到 0
  const STEP = 60 / SONG.bpm / 4; // 一个十六分音符的时长（秒）
  const TOTAL = SONG.bars * SONG.stepsPerBar;
  const TICK_MS = 25; // 调度器每 25ms 检查一次
  const AHEAD = 0.12; // 提前 0.12s 排程
  const FADE = 0.15; // stopMusic 的淡出时长（要求 0.2s 内）
  const TENSION_TAU = 0.2; // 紧张度平滑过渡的时间常数
  const SFX_DEDUPE = 0.03; // 30ms 内重复触发的同名音效只播一次，防止叠加爆音
  // 各声部的峰值电平（进总线之前）。带通 / 高通后的噪声能量小，所以军鼓、踩镲的数值偏大
  const LV = { lead: 0.5, bass: 0.14, kick: 0.45, snare: 0.8, hat: 0.2, tHat: 0.45, tPulse: 0.7, woof: 0.45 };
  const WOOF_GAIN = [1, 0.5, 1.1]; // 各犬种的响度补偿：小型犬的基频正落在 600Hz 共振峰上，天然更响
  const ROOT_MIDI = { C: 48, D: 50, E: 52, G: 43, A: 45 };

  // 曲谱按步分桶，排程时直接按步取
  const leadAt = byStep(SONG.lead);
  const bassAt = byStep(SONG.bass);
  const drumAt = byStep(SONG.drums);
  const rootAt = HARMONY.map((r) => ROOT_MIDI[r]);

  // ── 状态 ──
  let ctx = null; // 懒创建：第一次 unlock 时才建
  let musicBus = null;
  let sfxBus = null;
  let noiseBuf = null; // 白噪声只生成一次，之后所有噪声声部复用
  let musicOn = true;
  let sfxOn = true;
  let musicWanted = false; // 外部是否要求播放音乐（startMusic / stopMusic）
  let session = null; // 正在播放的音乐会话
  let tension = 0;
  let tensionTail = 0; // 紧张度归零后，紧张声部继续排程到这个时刻，让淡出走完
  let hidden = false;
  let warned = false;
  let asleep = 0; // 上下文没在运行时已排下的音效数
  const lastAt = {};
  const glides = new WeakMap(); // AudioParam → 最近一次平滑过渡的轨迹

  function byStep(list) {
    const buckets = Array.from({ length: TOTAL }, () => []);
    for (const item of list) buckets[item.step].push(item);
    return buckets;
  }

  // ── 生命周期 ──

  // 首次用户手势时调用：创建上下文与总线；重复调用不会重复创建任何东西
  function unlock() {
    if (ctx) {
      // 已解锁：只有上下文被系统挂起 / 打断（如 iOS 来电）且页面可见时，才补一次唤醒
      if (ctx.state !== 'running' && !hidden) wake();
      return;
    }
    let c = null;
    try {
      c = new AC();
      // 总线：musicBus、sfxBus → master → 扬声器（master 常驻图中，之后无需再引用）
      const master = c.createGain();
      const mb = c.createGain();
      const sb = c.createGain();
      master.gain.value = MASTER_VOL;
      mb.gain.value = musicOn ? MUSIC_VOL : 0;
      sb.gain.value = sfxOn ? SFX_VOL : 0;
      mb.connect(master);
      sb.connect(master);
      master.connect(c.destination);
      noiseBuf = makeNoise(c);
      ctx = c;
      musicBus = mb;
      sfxBus = sb;
    } catch (e) {
      // 浏览器不让建（例如上下文数量超限）：保持未解锁状态，所有调用继续静默
      ctx = null;
      noiseBuf = null;
      if (c && typeof c.close === 'function') settle(safe(() => c.close()));
      fail(e);
      return;
    }
    wake();
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      hidden = !!document.hidden;
      document.addEventListener('visibilitychange', onVisibility);
    }
  }

  // 恢复上下文，并播放 1 帧静音：iOS 要在用户手势里真正出过声，输出才会解锁
  function wake() {
    settle(safe(() => ctx.resume()));
    safe(() => {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      src.connect(ctx.destination);
      src.onended = () => src.disconnect();
      src.start(0);
    });
  }

  // 页面切到后台时暂停上下文，回到前台再恢复（只在已解锁且有 document 时绑定）
  function onVisibility() {
    if (document.hidden) {
      hidden = true;
      settle(safe(() => ctx.suspend()));
    } else {
      hidden = false;
      settle(safe(() => ctx.resume()));
    }
  }

  function makeNoise(c) {
    const len = Math.floor(c.sampleRate); // 1 秒白噪声，按随机偏移取用
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ── 开关 ──

  function setMusic(on) {
    musicOn = !!on;
    if (!ctx) return; // 未解锁：只记住设置，解锁时按它建总线
    glide(musicBus.gain, musicOn ? MUSIC_VOL : 0, 0.05);
    if (!musicOn) endSession(); // 关掉就停止排程，省电；想听的意愿保留
    else if (musicWanted && !session) beginSession();
  }

  function setSfx(on) {
    sfxOn = !!on;
    if (ctx) glide(sfxBus.gain, sfxOn ? SFX_VOL : 0, 0.02);
  }

  // ── 音乐 ──

  function startMusic() {
    if (!ctx) return; // 解锁前调用：静默忽略，不排队
    musicWanted = true;
    if (musicOn && !session) beginSession();
  }

  function stopMusic() {
    musicWanted = false;
    endSession();
  }

  function setTension(level) {
    const x = Number(level);
    const lv = Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
    if (lv === tension) return;
    if (ctx && lv === 0) tensionTail = ctx.currentTime + TENSION_TAU * 6;
    tension = lv;
    if (session) glide(session.tg.gain, 0.5 * lv, TENSION_TAU);
  }

  // 每次开始播放都新建一组会话节点：out 负责整体淡出，tg 是紧张声部的增益
  function beginSession() {
    const out = ctx.createGain();
    const tg = ctx.createGain();
    tg.gain.value = 0.5 * tension;
    tg.connect(out);
    out.connect(musicBus);
    const s = { out, tg, step: 0, next: ctx.currentTime + 0.06, timer: 0 };
    session = s;
    s.timer = setInterval(() => tick(s), TICK_MS);
    tick(s);
  }

  function endSession() {
    const s = session;
    if (!s) return;
    session = null;
    clearInterval(s.timer);
    // 0.15s 线性淡出到 0；已排进未来的音符随之被压掉
    safe(() => {
      const now = ctx.currentTime;
      const g = s.out.gain;
      const v = g.value;
      g.cancelScheduledValues(now);
      g.setValueAtTime(v, now);
      g.linearRampToValueAtTime(0, now + FADE);
    });
    // 淡出结束后断开会话节点；残留音符的节点会在各自结束时自行断开
    setTimeout(() => {
      s.tg.disconnect();
      s.out.disconnect();
    }, (FADE + 0.25) * 1000);
  }

  // 前瞻调度：每 25ms 检查一次，把 0.12s 内要响的步排进音频时钟
  function tick(s) {
    if (session !== s) return;
    try {
      const now = ctx.currentTime;
      if (s.next < now - 0.05) {
        // 主线程卡顿导致落后：整步跳过，不把错过的音符挤成一团补发
        const skip = Math.ceil((now - s.next) / STEP);
        s.next += skip * STEP;
        s.step = (s.step + skip) % TOTAL;
      }
      while (s.next < now + AHEAD) {
        playStep(s, s.step, s.next);
        s.next += STEP;
        s.step = (s.step + 1) % TOTAL;
      }
    } catch (e) {
      fail(e);
      endSession(); // 合成出错就停掉音乐，避免每 25ms 报一次错
    }
  }

  function playStep(s, step, t) {
    for (const n of leadAt[step]) lead(s.out, n.pitch, t);
    for (const n of bassAt[step]) bass(s.out, n.pitch, n.len * STEP, t);
    for (const d of drumAt[step]) {
      if (d.type === 'kick') kick(s.out, t, LV.kick);
      else if (d.type === 'snare') snare(s.out, t, LV.snare);
      else hat(s.out, t, LV.hat, 0.04, 7000);
    }
    if (tension > 0 || t < tensionTail) tensionStep(s.tg, step, t);
  }

  // 紧张声部：十六分音符踩镲 + 八分音符的八度贝斯脉冲（低八度 / 高八度交替）
  function tensionStep(dest, step, t) {
    const pos = step % 4;
    hat(dest, t, LV.tHat * (pos === 2 ? 1 : pos === 0 ? 0.45 : 0.65), 0.03, 8000);
    if (step % 2 === 0) {
      const root = rootAt[Math.floor(step / 8)];
      pulse(dest, pos === 0 ? root : root + 12, t);
    }
  }

  // ── 音效 ──

  function play(name, opts) {
    if (!ctx || !sfxOn || hidden) return; // 解锁前 / 音效关闭 / 页面在后台：静默忽略，不排队
    if (SFX_NAMES.indexOf(name) < 0) return;
    const now = ctx.currentTime;
    const prev = lastAt[name];
    if (prev !== undefined && now - prev < SFX_DEDUPE) return;
    if (ctx.state !== 'running') {
      // 上下文没在跑（刚解锁还在 resume，或 iOS 回前台后被打断）：play 多半在点击里调用，顺手唤醒；
      // 时钟停着时排下的声音会等醒来一齐响，所以最多只攒 4 个
      if (asleep >= 4) return;
      asleep += 1;
      wake();
    } else {
      asleep = 0;
    }
    lastAt[name] = now;
    try {
      SFX[name](now + 0.01, opts || {});
    } catch (e) {
      fail(e);
    }
  }

  const SFX = {
    // 点牌：短促的「啵」，正弦 880→660Hz，40ms
    tap(t) {
      const v = voice();
      const env = amp(v, sfxBus);
      perc(env.gain, t, 0.35, 0.003, 0.037);
      tone(v, env, 'sine', 880, t, t + 0.045).frequency.exponentialRampToValueAtTime(660, t + 0.04);
    },

    // 入槽：木头轻敲，三角波 300Hz 叠加带通噪声，60ms
    place(t) {
      const v = voice();
      const body = amp(v, sfxBus);
      perc(body.gain, t, 0.5, 0.002, 0.058);
      tone(v, body, 'triangle', 300, t, t + 0.065);
      const knock = amp(v, sfxBus);
      perc(knock.gain, t, 0.35, 0.001, 0.03);
      noise(v, filt(v, knock, 'bandpass', 1700, 3), t, 0.035);
    },

    // 三消：三音上行琶音（C5 E5 G5）；combo 从 1 起，每 +1 整体升 2 个半音，最多升 12
    match(t, o) {
      const combo = Math.max(1, toInt(o.combo, 1));
      const shift = Math.min(12, 2 * (combo - 1));
      [72, 76, 79].forEach((p, i) => {
        const last = i === 2;
        bell(sfxBus, p + shift, t + i * 0.07, last ? 0.5 : 0.4, last ? 0.34 : 0.15);
      });
    },

    // 狗叫：0 中型犬 350Hz；1 小型犬 600Hz；2 大型犬 200Hz 连叫两声
    woof(t, o) {
      const variant = toInt(o.variant, 0);
      if (variant === 1) {
        bark(t, 600, WOOF_GAIN[1]);
      } else if (variant === 2) {
        bark(t, 200, WOOF_GAIN[2]);
        bark(t + 0.22, 190, WOOF_GAIN[2] * 0.85);
      } else {
        bark(t, 350, WOOF_GAIN[0]);
      }
    },

    // 移出：上扬的嗖声——噪声带通扫频 + 正弦上滑
    moveOut(t) {
      const v = voice();
      const d = 0.3;
      const whoosh = amp(v, sfxBus);
      whoosh.gain.setValueAtTime(MIN, t);
      whoosh.gain.linearRampToValueAtTime(0.6, t + d * 0.6);
      whoosh.gain.exponentialRampToValueAtTime(MIN, t + d);
      const bp = filt(v, whoosh, 'bandpass', 500, 2.5);
      bp.frequency.setValueAtTime(500, t);
      bp.frequency.exponentialRampToValueAtTime(5000, t + d);
      noise(v, bp, t, d);
      const sing = amp(v, sfxBus);
      sing.gain.setValueAtTime(MIN, t);
      sing.gain.linearRampToValueAtTime(0.25, t + d * 0.5);
      sing.gain.exponentialRampToValueAtTime(MIN, t + d);
      tone(v, sing, 'sine', 350, t, t + d).frequency.exponentialRampToValueAtTime(1400, t + d);
    },

    // 撤回：倒带声——正弦 800→300Hz 下滑，同时叠 16Hz 颤音
    undo(t) {
      const v = voice();
      const d = 0.28;
      const env = amp(v, sfxBus);
      env.gain.setValueAtTime(MIN, t);
      env.gain.linearRampToValueAtTime(0.18, t + 0.015);
      env.gain.setValueAtTime(0.18, t + d * 0.6);
      env.gain.exponentialRampToValueAtTime(MIN, t + d);
      const o = tone(v, env, 'sine', 800, t, t + d);
      o.frequency.exponentialRampToValueAtTime(300, t + d);
      tone(v, amp(v, o.detune, 70), 'sine', 16, t, t + d); // 颤音深度 ±70 音分
    },

    // 洗牌：连续 6 个短噪声颗粒，像纸牌哗啦啦
    shuffle(t) {
      const v = voice();
      for (let i = 0; i < 6; i++) {
        const tt = t + i * 0.055 + (i ? Math.random() * 0.012 : 0); // 第一粒准时，后面带点随机更像手搓
        const env = amp(v, sfxBus);
        perc(env.gain, tt, 0.7 + Math.random() * 0.25, 0.002, 0.028);
        noise(v, filt(v, env, 'bandpass', 2200 + Math.random() * 2600, 1), tt, 0.032);
      }
    },

    // 卡槽将满：心跳，两个低频的「咚」
    warn(t) {
      thump(t, 1);
      thump(t + 0.17, 0.75);
    },

    // 点到被压住的牌：闷响，正弦 120Hz，80ms
    deny(t) {
      const v = voice();
      const env = amp(v, sfxBus);
      perc(env.gain, t, 0.5, 0.004, 0.076);
      tone(v, env, 'sine', 120, t, t + 0.08);
      // 手机小喇叭几乎放不出 120Hz：叠一点 2、3 次谐波，音高仍听作 120Hz 的闷响，但手机上听得见
      tone(v, amp(v, env, 0.5), 'sine', 240, t, t + 0.08);
      tone(v, amp(v, env, 0.25), 'sine', 360, t, t + 0.08);
    },

    // 通关：大三和弦号角（嗒-嗒-嗒——）+ 上行音阶，再接一声小型犬欢叫（woof 变体 1）
    win(t) {
      const chord = [60, 72, 76, 79]; // C4 C5 E5 G5
      horn(chord, t, 0.1);
      horn(chord, t + 0.13, 0.1);
      horn(chord, t + 0.26, 0.42);
      const scale = [72, 74, 76, 77, 79, 81, 83, 84]; // C5 → C6 大调音阶
      const s0 = t + 0.72;
      scale.forEach((p, i) => {
        const last = i === scale.length - 1;
        bell(sfxBus, p, s0 + i * 0.055, last ? 0.36 : 0.3, last ? 0.4 : 0.12);
      });
      bark(s0 + scale.length * 0.055 + 0.1, 600, WOOF_GAIN[1]);
    },

    // 失败：悲伤的长号 G→F#→F→E（锯齿波 + 低通），最后一个音拖长带颤音，再接一声呜咽
    lose(t) {
      const v = voice();
      const pitches = [55, 54, 53, 52]; // G3 F#3 F3 E3
      const durs = [0.3, 0.3, 0.3, 1.0];
      const total = durs.reduce((a, b) => a + b, 0);
      const env = amp(v, sfxBus);
      const lp = filt(v, env, 'lowpass', 450, 4);
      const o = tone(v, lp, 'sawtooth', mtof(pitches[0]), t, t + total + 0.02);
      env.gain.setValueAtTime(MIN, t);
      lp.frequency.setValueAtTime(450, t);
      let tt = t;
      pitches.forEach((p, i) => {
        const d = durs[i];
        const f = mtof(p);
        if (i > 0) {
          // 长号的滑音：从上一个音滑进来
          o.frequency.setValueAtTime(mtof(pitches[i - 1]), tt);
          o.frequency.exponentialRampToValueAtTime(f, tt + 0.05);
        }
        // 每个音「哇」一下：音量推起，滤波器同时张开再收拢
        env.gain.linearRampToValueAtTime(0.34, tt + 0.05);
        lp.frequency.exponentialRampToValueAtTime(1500, tt + 0.1);
        if (i < pitches.length - 1) {
          env.gain.linearRampToValueAtTime(0.24, tt + d - 0.05);
          env.gain.linearRampToValueAtTime(0.1, tt + d); // 音与音之间轻轻断开
          lp.frequency.exponentialRampToValueAtTime(450, tt + d);
        } else {
          env.gain.linearRampToValueAtTime(0.28, tt + d * 0.6);
          env.gain.exponentialRampToValueAtTime(MIN, tt + d);
          lp.frequency.exponentialRampToValueAtTime(300, tt + d);
          o.frequency.exponentialRampToValueAtTime(f * 0.97, tt + d); // 尾音往下耷拉
          const vib = amp(v, o.detune, 0); // 颤音逐渐加深到 ±40 音分
          vib.gain.setValueAtTime(0, tt);
          vib.gain.linearRampToValueAtTime(40, tt + 0.35);
          tone(v, vib, 'sine', 5.5, tt, tt + d);
        }
        tt += d;
      });
      whimper(t + total + 0.05);
    },

    // 复活：魔法闪光——高音五声音阶快速上行，带颤音
    revive(t) {
      const v = voice();
      const notes = [84, 86, 88, 91, 93, 96, 98, 100]; // C6 D6 E6 G6 A6 C7 D7 E7
      const gap = 0.045;
      const end = t + (notes.length - 1) * gap + 0.6;
      const vib = amp(v, null, 25); // 颤音深度 ±25 音分，所有音共用一个 LFO
      tone(v, vib, 'sine', 7, t, end);
      notes.forEach((p, i) => {
        const tt = t + i * gap;
        const last = i === notes.length - 1;
        const decay = last ? 0.55 : 0.26;
        const env = amp(v, sfxBus);
        perc(env.gain, tt, last ? 0.3 : 0.24, 0.004, decay);
        const o = tone(v, env, i % 2 ? 'triangle' : 'sine', mtof(p), tt, tt + decay + 0.01);
        vib.connect(o.detune);
      });
    },

    // 界面按钮：很轻的「嗒」
    button(t) {
      const v = voice();
      const env = amp(v, sfxBus);
      perc(env.gain, t, 0.12, 0.001, 0.02);
      tone(v, env, 'sine', 1500, t, t + 0.025).frequency.exponentialRampToValueAtTime(1000, t + 0.021);
    },
  };

  // ── 乐器 ──

  // 主旋律：三角波与方波按 7:3 混合，拨弦包络（起音 5ms、衰减 180ms）
  function lead(dest, pitch, t) {
    const v = voice();
    const env = amp(v, dest);
    perc(env.gain, t, LV.lead, 0.005, 0.18);
    const f = mtof(pitch);
    const end = t + 0.2;
    tone(v, amp(v, env, 0.7), 'triangle', f, t, end);
    tone(v, amp(v, env, 0.3), 'square', f, t, end);
  }

  // 贝斯：方波经 800Hz 低通；按音符时值保持，带一点自然衰减
  function bass(dest, pitch, dur, t) {
    const v = voice();
    const env = amp(v, dest);
    const hold = Math.max(0.05, dur - 0.03);
    env.gain.setValueAtTime(MIN, t);
    env.gain.linearRampToValueAtTime(LV.bass, t + 0.006);
    env.gain.exponentialRampToValueAtTime(LV.bass * 0.55, t + hold);
    env.gain.exponentialRampToValueAtTime(MIN, t + hold + 0.04);
    tone(v, filt(v, env, 'lowpass', 800, 1), 'square', mtof(pitch), t, t + hold + 0.05);
  }

  // 底鼓：正弦波，频率 0.12s 内从 150Hz 滑到 45Hz
  function kick(dest, t, level) {
    const v = voice();
    const env = amp(v, dest);
    perc(env.gain, t, level, 0.002, 0.2);
    tone(v, env, 'sine', 150, t, t + 0.23).frequency.exponentialRampToValueAtTime(45, t + 0.12);
  }

  // 军鼓：白噪声经 1800Hz 带通，0.12s
  function snare(dest, t, level) {
    const v = voice();
    const env = amp(v, dest);
    perc(env.gain, t, level, 0.002, 0.118);
    noise(v, filt(v, env, 'bandpass', 1800, 1), t, 0.12);
  }

  // 踩镲：白噪声经高通（主鼓组 7000Hz / 0.04s）
  function hat(dest, t, level, dur, cutoff) {
    const v = voice();
    const env = amp(v, dest);
    perc(env.gain, t, level, 0.001, dur - 0.001);
    noise(v, filt(v, env, 'highpass', cutoff, 1), t, dur);
  }

  // 紧张声部的贝斯脉冲：短促的方波
  function pulse(dest, pitch, t) {
    const v = voice();
    const env = amp(v, dest);
    perc(env.gain, t, LV.tPulse, 0.003, 0.12);
    tone(v, filt(v, env, 'lowpass', 1200, 2), 'square', mtof(pitch), t, t + 0.13);
  }

  // 明亮的铃音：三角波 + 高八度正弦
  function bell(dest, pitch, t, level, decay) {
    const v = voice();
    const env = amp(v, dest);
    perc(env.gain, t, level, 0.004, decay);
    const f = mtof(pitch);
    const end = t + decay + 0.02;
    tone(v, env, 'triangle', f, t, end);
    tone(v, amp(v, env, 0.25), 'sine', f * 2, t, end);
  }

  // 一声「汪」（150ms）：锯齿波基频先滑升再滑落，叠一点噪声，经 600Hz / 1200Hz 两个共振峰带通
  function bark(t, f0, k) {
    const v = voice();
    const d = 0.15;
    const env = amp(v, sfxBus);
    env.gain.setValueAtTime(MIN, t);
    env.gain.linearRampToValueAtTime(LV.woof * k, t + 0.008);
    env.gain.exponentialRampToValueAtTime(LV.woof * k * 0.55, t + 0.07);
    env.gain.exponentialRampToValueAtTime(MIN, t + d);
    const f1 = filt(v, amp(v, env, 2.4), 'bandpass', 600, 4);
    const f2 = filt(v, amp(v, env, 1.5), 'bandpass', 1200, 5);
    const src = amp(v, null, 1);
    src.connect(f1);
    src.connect(f2);
    const o = tone(v, src, 'sawtooth', f0 * 0.8, t, t + d + 0.01);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.15, t + 0.035); // 先滑升
    o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + d); // 再滑落
    noise(v, amp(v, src, 0.35), t, d);
  }

  // 号角：几个锯齿波叠成和弦，低通随包络张开，出「铜管」味
  function horn(pitches, t, d) {
    const v = voice();
    const env = amp(v, sfxBus);
    env.gain.setValueAtTime(MIN, t);
    env.gain.linearRampToValueAtTime(0.45, t + 0.02);
    env.gain.setValueAtTime(0.45, t + Math.max(0.03, d - 0.05));
    env.gain.exponentialRampToValueAtTime(MIN, t + d + 0.06);
    const lp = filt(v, env, 'lowpass', 600, 2);
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.exponentialRampToValueAtTime(3000, t + 0.04);
    lp.frequency.exponentialRampToValueAtTime(1600, t + d);
    const mix = amp(v, lp, 1 / pitches.length);
    pitches.forEach((p, i) => {
      const o = tone(v, mix, 'sawtooth', mtof(p), t, t + d + 0.07);
      o.detune.value = (i - 1.5) * 4; // 轻微失谐，更像一组铜管
    });
  }

  // 心跳的一下「咚」：方波 110→55Hz，低通从 700Hz 收到 150Hz。
  // 开头几十毫秒带着泛音（手机小喇叭靠它听见），随后只剩低沉的「咚」
  function thump(t, k) {
    const v = voice();
    const env = amp(v, sfxBus);
    perc(env.gain, t, 0.45 * k, 0.004, 0.14);
    const lp = filt(v, env, 'lowpass', 700, 1);
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.exponentialRampToValueAtTime(150, t + 0.12);
    tone(v, lp, 'square', 110, t, t + 0.15).frequency.exponentialRampToValueAtTime(55, t + 0.12);
  }

  // 呜咽：正弦 700→400Hz 滑落，带一点抽泣似的颤动
  function whimper(t) {
    const v = voice();
    const d = 0.5;
    const env = amp(v, sfxBus);
    env.gain.setValueAtTime(MIN, t);
    env.gain.linearRampToValueAtTime(0.22, t + 0.05);
    env.gain.linearRampToValueAtTime(0.16, t + d * 0.7);
    env.gain.exponentialRampToValueAtTime(MIN, t + d);
    const o = tone(v, env, 'sine', 700, t, t + d);
    o.frequency.exponentialRampToValueAtTime(400, t + d);
    tone(v, amp(v, o.detune, 30), 'sine', 7, t, t + d);
  }

  // ── 合成小工具 ──

  // 一次发声用到的节点都登记在这里；全部声源结束后统一 disconnect，长时间运行也不泄漏
  function voice() {
    const nodes = [];
    let live = 0;
    const done = () => {
      live -= 1;
      if (live > 0) return;
      for (const n of nodes) n.disconnect();
      nodes.length = 0;
    };
    return {
      add(node) {
        nodes.push(node);
        return node;
      },
      run(src, t0, t1, offset) {
        nodes.push(src);
        live += 1;
        src.onended = done;
        if (offset === undefined) src.start(t0);
        else src.start(t0, offset);
        src.stop(t1);
        return src;
      },
    };
  }

  // 增益节点（默认 0，作包络用）；dest 为 null 时先不连接
  function amp(v, dest, value = 0) {
    const g = v.add(ctx.createGain());
    g.gain.value = value;
    if (dest) g.connect(dest);
    return g;
  }

  function filt(v, dest, type, freq, q) {
    const f = v.add(ctx.createBiquadFilter());
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(dest);
    return f;
  }

  function tone(v, dest, type, freq, t0, t1) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.connect(dest);
    return v.run(o, t0, t1);
  }

  // 从共享白噪声里随机截一段播放
  function noise(v, dest, t0, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.connect(dest);
    const offset = Math.random() * Math.max(0, noiseBuf.duration - dur - 0.01);
    return v.run(s, t0, t0 + dur, offset);
  }

  // 打击型包络：从极小值线性起音到 peak；衰减段先用 88% 的时间指数落到 -40dB，
  // 再快速收到极小值。直接一口气指数落到 0.0001 的话，有效时长只剩标称的三分之一，听起来像咔哒声。
  function perc(param, t, peak, attack, decay) {
    param.setValueAtTime(MIN, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(Math.max(MIN, peak * 0.01), t + attack + decay * 0.88);
    param.exponentialRampToValueAtTime(MIN, t + attack + decay);
  }

  // 平滑过渡：先按当前实际值钉住，再指数逼近目标（代替 Firefox 不支持的 cancelAndHoldAtTime）。
  // 当前值按上一次滑动的公式自己算，不依赖各浏览器 param.value 在自动化进行中返回什么。
  function glide(param, target, tau) {
    const now = ctx.currentTime;
    const g = glides.get(param);
    const v = g ? g.to + (g.from - g.to) * Math.exp(-Math.max(0, now - g.at) / g.tau) : param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(v, now);
    param.setTargetAtTime(target, now, tau);
    glides.set(param, { from: v, to: target, at: now, tau });
  }

  function toInt(x, fallback) {
    const n = Number(x);
    return Number.isFinite(n) ? Math.floor(n) : fallback;
  }

  function safe(fn) {
    try {
      return fn();
    } catch (e) {
      return undefined;
    }
  }

  // resume / suspend / close 返回的 Promise 可能被拒绝（例如不在用户手势里），吞掉以免控制台报错
  function settle(p) {
    if (p && typeof p.catch === 'function') p.catch(noop);
  }

  // 音频出错只提示一次，绝不影响游戏流程
  function fail(e) {
    if (warned) return;
    warned = true;
    if (typeof console !== 'undefined') console.warn('[audio] 合成出错，已忽略：', e);
  }

  return { unlock, setMusic, setSfx, play, startMusic, stopMusic, setTension };
}
