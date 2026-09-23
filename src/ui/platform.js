// claude.ai 平台能力的渐进增强：room（在线狗友与通关广播）、sample（AI 狗评）、downloads（保存战绩图）、hot（热更新续玩）
// 普通网页里 globalThis.claude 不存在，所有能力为空，页面照常运行
import { BREEDS } from '../art/dogs.js';

const TEAM_KEYS = new Set(BREEDS.map((b) => b.key));

export function sanitizeTeam(value) {
  return typeof value === 'string' && TEAM_KEYS.has(value) ? value : null;
}

// 在线人数与各阵营人数：只数真人（kind === 'viewer'），阵营只认白名单
export function summarizePeers(peers) {
  const teams = {};
  let total = 0;
  for (const p of peers || []) {
    if (p.kind !== 'viewer') continue;
    total++;
    const t = sanitizeTeam(p.presence && p.presence.team);
    if (t) teams[t] = (teams[t] || 0) + 1;
  }
  return { total, teams };
}

export function buildRoastPrompt(s) {
  const result = s.result === 'won' ? '通关' : `失败，还剩 ${s.remaining} 张没消`;
  return [
    '你是网页小游戏「狗了个狗」里的柴犬吉祥物。玩法和《羊了个羊》一样：点牌进 7 格卡槽，三张相同就消除，卡槽满了就输。',
    '请用柴犬的口吻、简体中文，写两到三句话点评玩家这一局：毒舌但友善、好笑、有梗，可以带一两个「汪」；不要使用表情符号，不超过 90 个字，不要逐条复述数据。',
    `本局数据：关卡「${s.levelName}」；结果：${result}；用时 ${s.seconds} 秒；拿牌 ${s.moves} 次；用了道具 ${s.propsUsed} 次（移出 ${s.used.moveOut}、撤回 ${s.used.undo}、洗牌 ${s.used.shuffle}、复活 ${s.used.revive}）；玩家阵营：${s.teamName || '还没加入狗群'}。`,
    '直接输出点评正文。',
  ].join('\n');
}

export function initPlatform({ onPeers, onWinBroadcast, onChange } = {}) {
  const api = { inClaude: false, room: null, sample: null, downloads: null };
  const c = globalThis.claude;
  if (!c || typeof c.use !== 'function') return api;
  api.inClaude = true;
  const use = (name) => Promise.resolve().then(() => c.use(name)).catch(() => null);
  use('room').then((room) => {
    if (!room) return;
    try {
      room.onPeers((change) => onPeers?.(summarizePeers(change.peers)), () => onPeers?.(null));
      room.on('win', (msg) => { if (!msg.sameTab) onWinBroadcast?.(sanitizeTeam(msg.data && msg.data.team), !!msg.isMe); });
      api.room = room;
    } catch { api.room = null; }
    onChange?.(api);
  });
  use('sample').then((sample) => { if (sample) { api.sample = sample; onChange?.(api); } });
  use('downloads').then((downloads) => { if (downloads) { api.downloads = downloads; onChange?.(api); } });
  return api;
}

export function setPresence(api, patch) {
  if (!api.room) return;
  Promise.resolve().then(() => api.room.presence({ ...patch, team: sanitizeTeam(patch.team) })).catch(() => {});
}

export function broadcastWin(api, team) {
  if (!api.room) return;
  Promise.resolve().then(() => api.room.emit('win', { team: sanitizeTeam(team) })).catch(() => {});
}

export async function aiRoast(api, summary, onText, signal) {
  if (!api.sample) throw { code: 'unavailable', message: '当前环境不支持 AI 狗评' };
  const res = await api.sample(buildRoastPrompt(summary), {
    onText: ({ text }) => onText(text),
    modelTier: 'quick',
    cache: false,
    signal,
  });
  return res.text;
}

// 热更新续玩：页面重新发布后，用快照里的动作日志恢复对局
export function hotBoot(start) {
  const hot = globalThis.claude && globalThis.claude.hot;
  if (hot && typeof hot.ready === 'function') {
    try { hot.ready(start); return; } catch { /* 退回普通启动 */ }
  }
  start((hot && hot.data) || {});
}

export function hotSnapshot(fn) {
  const hot = globalThis.claude && globalThis.claude.hot;
  if (hot && typeof hot.snapshot === 'function') {
    try { hot.snapshot(fn); } catch { /* 不支持就算了 */ }
  }
}
