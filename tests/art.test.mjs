import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS, iconSVG, iconSymbolsSVG } from '../src/art/icons.js';
import { BREEDS, MOODS, dogHeadSVG } from '../src/art/dogs.js';
import { logoSVG } from '../src/art/logo.js';

const KEYS = ['bone', 'ball', 'bowl', 'paw', 'poop', 'hydrant', 'duck', 'frisbee', 'house', 'collar', 'sausage', 'drumstick', 'slipper', 'doge', 'melon', 'kibble'];

// 极简良构检查：标签成对闭合、无脚本、无外链（xmlns 命名空间除外）
function assertWellFormed(svg, label) {
  assert.equal(typeof svg, 'string', label);
  assert.ok(!/<script|javascript:|on\w+=/i.test(svg), `${label} 含脚本`);
  assert.ok(!/https?:\/\/(?!www\.w3\.org\/)/i.test(svg), `${label} 含外链`);
  const stack = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, closing, name, , selfClose] = m;
    if (closing) assert.equal(stack.pop(), name, `${label} 标签不配对：${name}`);
    else if (!selfClose) stack.push(name);
  }
  assert.equal(stack.length, 0, `${label} 有未闭合标签：${stack.join(',')}`);
}

test('16 种图案：顺序、名称、主色唯一', () => {
  assert.equal(ICONS.length, 16);
  assert.deepEqual(ICONS.map((i) => i.key), KEYS);
  for (const icon of ICONS) {
    assert.ok(/^[\u4e00-\u9fa5]{1,4}$/.test(icon.name), `名称不合法：${icon.name}`);
    assert.ok(/^#[0-9A-F]{6}$/i.test(icon.color), `主色不合法：${icon.color}`);
  }
  assert.equal(new Set(ICONS.map((i) => i.color.toUpperCase())).size, 16, '主色必须互不相同');
});

test('图案片段良构且不含 id', () => {
  for (const icon of ICONS) {
    assertWellFormed(`<g>${icon.svg}</g>`, icon.key);
    assert.ok(!/\sid=/.test(icon.svg), `${icon.key} 不得包含 id 属性`);
    assert.ok(icon.svg.includes(icon.color) || icon.svg.includes(icon.color.toLowerCase()), `${icon.key} 未使用主色`);
  }
});

test('iconSVG 与 sprite', () => {
  for (let k = 0; k < 16; k++) {
    const s = iconSVG(k, 32);
    assert.ok(s.startsWith('<svg'), `iconSVG(${k}) 应以 <svg 开头`);
    assert.ok(s.includes('viewBox="0 0 64 64"'));
    assert.ok(s.includes('width="32"'));
    assertWellFormed(s, `iconSVG(${k})`);
  }
  const sprite = iconSymbolsSVG();
  assertWellFormed(sprite, 'sprite');
  for (const key of KEYS) assert.ok(sprite.includes(`<symbol id="ic-${key}"`), `sprite 缺少 ${key}`);
});

test('6 个犬种 × 6 种心情的狗头', () => {
  assert.deepEqual(BREEDS.map((b) => b.key), ['shiba', 'husky', 'corgi', 'golden', 'teddy', 'tianyuan']);
  assert.deepEqual(BREEDS.map((b) => b.name), ['柴犬', '哈士奇', '柯基', '金毛', '泰迪', '田园犬']);
  for (const b of BREEDS) assert.equal(b.team, b.name + '队');
  assert.deepEqual(MOODS, ['idle', 'happy', 'worried', 'sad', 'cheer', 'shock']);
  for (const b of BREEDS) {
    const seen = new Set();
    for (const mood of MOODS) {
      const s = dogHeadSVG(b.key, mood);
      assert.ok(s.startsWith('<svg') && s.includes('viewBox="0 0 120 120"'), `${b.key}/${mood}`);
      assertWellFormed(s, `${b.key}/${mood}`);
      assert.ok(!/\sid=/.test(s), `${b.key}/${mood} 不得包含 id`);
      seen.add(s);
    }
    assert.equal(seen.size, MOODS.length, `${b.key} 的 6 种心情必须各不相同`);
  }
  assert.equal(dogHeadSVG('unknown', 'nope'), dogHeadSVG('shiba', 'idle'), '未知参数应退回柴犬 idle');
});

test('字标', () => {
  const s = logoSVG();
  assertWellFormed(s, 'logo');
  assert.ok(s.includes('aria-label="狗了个狗"') && s.includes('role="img"'));
  assert.equal((s.match(/data-char="狗"/g) || []).length, 2);
  assert.equal((s.match(/data-char="了"/g) || []).length, 1);
  assert.equal((s.match(/data-char="个"/g) || []).length, 1);
  assert.ok(!/<text/.test(s), '字标不得依赖字体');
});
