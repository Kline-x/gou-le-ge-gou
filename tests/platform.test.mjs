import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTeam, summarizePeers, buildRoastPrompt, initPlatform, hotBoot } from '../src/ui/platform.js';

test('阵营白名单', () => {
  assert.equal(sanitizeTeam('husky'), 'husky');
  assert.equal(sanitizeTeam('<img src=x>'), null);
  assert.equal(sanitizeTeam(3), null);
});

test('在线狗友汇总：只数真人，阵营走白名单', () => {
  const r = summarizePeers([
    { kind: 'viewer', presence: { team: 'shiba' } },
    { kind: 'viewer', presence: { team: 'shiba' } },
    { kind: 'viewer', presence: { team: 'evil' } },
    { kind: 'viewer', presence: {} },
    { kind: 'agent', presence: { team: 'corgi' } },
  ]);
  assert.deepEqual(r, { total: 4, teams: { shiba: 2 } });
  assert.deepEqual(summarizePeers(undefined), { total: 0, teams: {} });
});

test('AI 狗评提示词包含本局数据与口吻要求', () => {
  const p = buildRoastPrompt({ levelName: '第 2 关', result: 'lost', remaining: 37, seconds: 125, moves: 88, propsUsed: 2, used: { moveOut: 1, undo: 0, shuffle: 1, revive: 0 }, teamName: '柴犬队' });
  for (const s of ['第 2 关', '37', '125', '88', '柴犬队', '柴犬', '中文']) assert.ok(p.includes(s), `缺少：${s}`);
  assert.ok(!p.includes('undefined'));
});

test('不在 claude.ai 里时平台能力为空，hotBoot 以空数据启动', () => {
  const api = initPlatform({});
  assert.equal(api.inClaude, false);
  assert.equal(api.room, null);
  let got = null;
  hotBoot((d) => { got = d; });
  assert.deepEqual(got, {});
});

test('模拟 claude.ai：能力到位后点亮并转发事件', async () => {
  const listeners = {};
  let peersHandler = null;
  const room = {
    onPeers: (fn) => { peersHandler = fn; return () => {}; },
    on: (topic, fn) => { listeners[topic] = fn; return () => {}; },
    presence: async () => {},
    emit: async () => {},
  };
  const sample = async () => ({ text: 'x', truncated: false });
  globalThis.claude = { use: async (name) => (name === 'room' ? room : name === 'sample' ? sample : null) };
  try {
    const seen = { peers: null, win: [], changes: 0 };
    const api = initPlatform({
      onPeers: (p) => { seen.peers = p; },
      onWinBroadcast: (team, me) => seen.win.push([team, me]),
      onChange: () => { seen.changes++; },
    });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(api.inClaude, true);
    assert.equal(api.room, room);
    assert.equal(api.sample, sample);
    assert.equal(api.downloads, null);
    peersHandler({ peers: [{ kind: 'viewer', presence: { team: 'corgi' } }] });
    assert.deepEqual(seen.peers, { total: 1, teams: { corgi: 1 } });
    listeners.win({ data: { team: 'golden' }, sameTab: false, isMe: false });
    listeners.win({ data: { team: 'golden' }, sameTab: true, isMe: true });
    assert.deepEqual(seen.win, [['golden', false]]);
    assert.ok(seen.changes >= 2);
  } finally {
    delete globalThis.claude;
  }
});
