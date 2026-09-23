import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPages } from '../build.mjs';

// 提交的 dist 必须与当前源码构建结果一致：改了源码忘记 `npm run build` 时这里会失败
test('dist 与源码构建结果一致', () => {
  const { standalone, fragment, xhtml } = buildPages();
  const norm = (s) => s.replace(/\r\n/g, '\n');
  const read = (name) => norm(fs.readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8'));
  assert.equal(read('index.html'), norm(standalone), 'dist/index.html 过期，请运行 npm run build');
  assert.equal(read('artifact.html'), norm(fragment), 'dist/artifact.html 过期，请运行 npm run build');
  assert.equal(read('index.xhtml'), norm(xhtml), 'dist/index.xhtml 过期，请运行 npm run build');
});
