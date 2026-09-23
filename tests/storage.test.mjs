import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, defaultSave, dateKey, prevDateKey, SAVE_KEY } from '../src/ui/storage.js';

function mem(initial) {
  const m = new Map(initial === undefined ? [] : [[SAVE_KEY, initial]]);
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
}

test('日期工具', () => {
  assert.equal(dateKey(new Date(2026, 8, 3)), '2026-09-03');
  assert.equal(prevDateKey('2026-03-01'), '2026-02-28');
  assert.equal(prevDateKey('2026-01-01'), '2025-12-31');
});

test('空存储、损坏存档、抛错存储、无存储都退回默认值', () => {
  assert.deepEqual(createStore(mem()).data, defaultSave());
  assert.deepEqual(createStore(mem('{坏掉的 json')).data, defaultSave());
  const boom = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const s = createStore(boom);
  assert.doesNotThrow(() => s.setTeam('husky'));
  assert.equal(s.data.team, 'husky');
  assert.deepEqual(createStore(null).data, defaultSave());
});

test('写入后可被新实例读回，缺省字段补默认', () => {
  const st = mem();
  const a = createStore(st);
  a.setTeam('corgi');
  a.setSetting('music', false);
  const b = createStore(st);
  assert.equal(b.data.team, 'corgi');
  assert.equal(b.data.settings.music, false);
  assert.equal(b.data.settings.sfx, true);
});

test('每日通关：同一天只记一次，连续打卡累加，断档重置', () => {
  const s = createStore(mem());
  s.recordWin({ daily: true, level: 'daily1', key: '2026-09-21' });
  assert.equal(s.peekDay('2026-09-21').l1, true);
  s.recordWin({ daily: true, level: 'daily2', key: '2026-09-21' });
  s.recordWin({ daily: true, level: 'daily2', key: '2026-09-21' });
  assert.equal(s.data.stats.dailyWins, 1);
  assert.equal(s.data.stats.dogsContributed, 1);
  s.recordWin({ daily: true, level: 'daily2', key: '2026-09-22' });
  assert.equal(s.data.stats.streak, 2);
  assert.equal(s.currentStreak('2026-09-23'), 2);
  assert.equal(s.currentStreak('2026-09-25'), 0);
  s.recordWin({ daily: true, level: 'daily2', key: '2026-09-25' });
  assert.equal(s.data.stats.streak, 1);
  assert.equal(s.data.stats.wins, 5);
});

test('失败记录尝试次数与最少剩余；peekDay 不创建记录', () => {
  const s = createStore(mem());
  s.recordLoss('2026-09-23', 50);
  s.recordLoss('2026-09-23', 80);
  assert.deepEqual(s.peekDay('2026-09-23'), { l1: false, l2: false, attempts: 2, bestRemaining: 50 });
  assert.deepEqual(s.peekDay('2020-01-01'), { l1: false, l2: false, attempts: 0, bestRemaining: null });
  assert.equal(s.data.daily['2020-01-01'], undefined);
});
