import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { bundleModules, assemblePages, assertNoExternal } from '../build.mjs';

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glgg-'));
  for (const [rel, code] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, code);
  }
  return dir;
}

test('按依赖顺序打包，具名导入导出正确', () => {
  const dir = fixture({
    'core/a.js': 'export const A = 2;\nexport function double(x) { return x * A; }\n',
    'core/b.js': "import { double } from './a.js';\nexport class Box { constructor(v) { this.v = double(v); } }\n",
    'ui/main.js': "import { Box } from '../core/b.js';\nimport { A } from '../core/a.js';\nglobalThis.result = new Box(5).v + A;\n",
  });
  const js = bundleModules(dir, 'ui/main.js');
  const ctx = {};
  vm.runInNewContext(js, ctx);
  assert.equal(ctx.result, 12);
  assert.ok(js.indexOf('__m_core_a_js =') < js.indexOf('__m_core_b_js ='));
  assert.ok(js.indexOf('__m_core_b_js =') < js.indexOf('__m_ui_main_js ='));
});

test('循环依赖与不支持的写法会报错', () => {
  const cyc = fixture({
    'a.js': "import { b } from './b.js';\nexport const a = 1;\n",
    'b.js': "import { a } from './a.js';\nexport const b = 2;\n",
  });
  assert.throws(() => bundleModules(cyc, 'a.js'), /循环依赖/);
  const def = fixture({ 'main.js': 'export default 1;\n' });
  assert.throws(() => bundleModules(def, 'main.js'), /只支持/);
  const star = fixture({ 'main.js': "import * as x from './x.js';\n" });
  assert.throws(() => bundleModules(star, 'main.js'), /只支持/);
  const multi = fixture({ 'main.js': 'export const A = 1, B = 2;\n' });
  assert.throws(() => bundleModules(multi, 'main.js'), /只能声明一个名字/);
  const ok = fixture({ 'main.js': 'export const L = [1, 2];\nexport const O = { a: 1, b: 2 };\n' });
  assert.doesNotThrow(() => bundleModules(ok, 'main.js'));
});

test('组装两份页面', () => {
  const tpl = '<title>狗了个狗</title>\n<style>/*@CSS*/</style>\n<!--@BODY-->\n<div id="app"></div>\n<script>/*@JS*/</script>\n';
  const { standalone, fragment } = assemblePages({ tpl, css: 'body{color:red}', js: 'globalThis.x = "$&";' });
  assert.ok(fragment.startsWith('<title>狗了个狗</title>'));
  assert.ok(!/<!doctype|<html|<head|<body/i.test(fragment));
  assert.ok(fragment.includes('body{color:red}') && fragment.includes('globalThis.x = "$&";'));
  assert.ok(standalone.startsWith('<!doctype html>'));
  assert.ok(standalone.includes('viewport-fit=cover'));
  const head = standalone.slice(0, standalone.indexOf('</head>'));
  assert.ok(head.includes('<title>狗了个狗</title>'), 'title 必须位于 head');
  assert.ok(standalone.indexOf('<div id="app">') > standalone.indexOf('<body>'));
});

test('零外链校验', () => {
  assert.throws(() => assertNoExternal('<script src="https://x.com/a.js"></script>', 't'), /外部资源/);
  assert.throws(() => assertNoExternal('<style>a{background:url(https://x.com/a.png)}</style>', 't'), /外部资源/);
  assert.throws(() => assertNoExternal("<style>@import 'x.css';</style>", 't'), /外部资源/);
  assert.throws(() => assertNoExternal('<script src="//cdn.example.com/a.js"></script>', 't'), /外部资源/);
  assert.throws(() => assertNoExternal('<img srcset="https://x.com/a.png 2x">', 't'), /外部资源/);
  assert.doesNotThrow(() => assertNoExternal('<svg xmlns="http://www.w3.org/2000/svg"></svg><a href="#x">x</a><i style="background:url(data:image/svg+xml,abc)"></i>', 't'));
});
