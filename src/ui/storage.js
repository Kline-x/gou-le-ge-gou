// 本地存档：设置、狗群阵营、每日记录与统计；存储不可用或存档损坏时退回默认值，只在内存里运行
export const SAVE_KEY = 'glgg:v1';

export function defaultSave() {
  return {
    settings: { music: true, sfx: true, vibrate: true },
    team: null,
    daily: {},
    stats: { plays: 0, wins: 0, dailyWins: 0, streak: 0, lastDailyWin: null, dogsContributed: 0 },
  };
}

export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function prevDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

const emptyDay = () => ({ l1: false, l2: false, attempts: 0, bestRemaining: null });

export function createStore(storage) {
  const save = defaultSave();
  try {
    const raw = storage ? storage.getItem(SAVE_KEY) : null;
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        Object.assign(save.settings, data.settings);
        Object.assign(save.stats, data.stats);
        if (data.daily && typeof data.daily === 'object') save.daily = data.daily;
        if (typeof data.team === 'string') save.team = data.team;
      }
    }
  } catch { /* 存档损坏或存储不可读：用默认值 */ }

  const persist = () => {
    try { if (storage) storage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* 隐私模式、配额已满：忽略 */ }
  };
  const day = (key) => {
    if (!save.daily[key]) save.daily[key] = emptyDay();
    return save.daily[key];
  };

  return {
    get data() { return save; },
    peekDay: (key) => save.daily[key] || emptyDay(),
    setSetting(name, value) { save.settings[name] = value; persist(); },
    setTeam(team) { save.team = team; persist(); },
    recordPlay() { save.stats.plays++; persist(); },
    recordLoss(key, remaining) {
      const d = day(key);
      d.attempts++;
      if (d.bestRemaining === null || remaining < d.bestRemaining) d.bestRemaining = remaining;
      persist();
    },
    recordWin({ daily, level, key }) {
      save.stats.wins++;
      if (daily && level === 'daily1') day(key).l1 = true;
      if (daily && level === 'daily2') {
        const d = day(key);
        d.attempts++;
        d.bestRemaining = 0;
        if (!d.l2) {
          d.l2 = true;
          const s = save.stats;
          s.dailyWins++;
          s.dogsContributed++;
          s.streak = s.lastDailyWin === prevDateKey(key) ? s.streak + 1 : 1;
          s.lastDailyWin = key;
        }
      }
      persist();
    },
    currentStreak(today) {
      const s = save.stats;
      return s.lastDailyWin === today || s.lastDailyWin === prevDateKey(today) ? s.streak : 0;
    },
  };
}
