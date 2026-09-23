import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, SFX_NAMES, SONG } from '../src/audio/audio.js';

test('无 AudioContext 的环境下可以安全创建与调用', () => {
  const a = createAudio();
  for (const f of ['unlock', 'setMusic', 'setSfx', 'play', 'startMusic', 'stopMusic', 'setTension']) {
    assert.equal(typeof a[f], 'function', `缺少方法 ${f}`);
  }
  assert.doesNotThrow(() => {
    a.unlock();
    for (const n of SFX_NAMES) a.play(n, { combo: 3, variant: 2 });
    a.startMusic();
    a.setTension(1);
    a.stopMusic();
    a.setMusic(false);
    a.setSfx(false);
  });
});

test('音效清单完整', () => {
  assert.deepEqual([...SFX_NAMES].sort(), ['button', 'deny', 'lose', 'match', 'moveOut', 'place', 'revive', 'shuffle', 'tap', 'undo', 'warn', 'win', 'woof'].sort());
});

test('原创曲谱：16 小节、五声音阶、音符不越界', () => {
  assert.equal(SONG.bpm, 128);
  assert.equal(SONG.bars, 16);
  assert.equal(SONG.stepsPerBar, 16);
  const total = SONG.bars * SONG.stepsPerBar;
  const penta = new Set([0, 2, 4, 7, 9]);
  for (const part of ['lead', 'bass']) {
    assert.ok(SONG[part].length > 16, `${part} 音符太少`);
    for (const n of SONG[part]) {
      assert.ok(penta.has(((n.pitch % 12) + 12) % 12), `${part} 出现非五声音阶音：${n.pitch}`);
      assert.ok(n.step >= 0 && n.step + n.len <= total, `${part} 音符越界：${n.step}`);
    }
  }
  assert.ok(SONG.drums.every((d) => ['kick', 'snare', 'hat'].includes(d.type)));
});
