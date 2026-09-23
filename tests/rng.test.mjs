import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashSeed, createRng } from '../src/core/rng.js';

test('hashSeed 稳定、区分输入、落在 uint32', () => {
  assert.equal(hashSeed('dog-2026-09-23'), hashSeed('dog-2026-09-23'));
  assert.notEqual(hashSeed('dog-2026-09-23'), hashSeed('dog-2026-09-24'));
  const h = hashSeed('abc');
  assert.ok(Number.isInteger(h) && h >= 0 && h < 2 ** 32);
});

test('同种子序列可复现，不同种子不同', () => {
  const a = createRng(42);
  const b = createRng(42);
  const c = createRng(43);
  const sa = Array.from({ length: 20 }, () => a.next());
  const sb = Array.from({ length: 20 }, () => b.next());
  const sc = Array.from({ length: 20 }, () => c.next());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
});

test('int / pick / shuffle', () => {
  const r = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = r.int(5);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 5);
  }
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...arr];
  const s = r.shuffle(copy);
  assert.equal(s, copy, 'shuffle 应原地打乱并返回同一数组');
  assert.deepEqual([...s].sort((x, y) => x - y), arr);
  assert.ok(arr.includes(r.pick(arr)));
});

test('fork 派生的子流可复现且因 label 而异', () => {
  const a = createRng(99).fork('layout');
  const b = createRng(99).fork('layout');
  const c = createRng(99).fork('kinds');
  const sa = [a.next(), a.next()];
  assert.deepEqual(sa, [b.next(), b.next()]);
  assert.notDeepEqual(sa, [c.next(), c.next()]);
});
