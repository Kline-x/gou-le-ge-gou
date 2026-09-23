import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPages, assembleXhtml } from '../build.mjs';
import { iconSymbolsSVG, iconSVG } from '../src/art/icons.js';
import { BREEDS, MOODS, dogHeadSVG } from '../src/art/dogs.js';
import { logoSVG } from '../src/art/logo.js';

// 轻量 XML 良构检查：去掉声明、DOCTYPE、注释、CDATA 后，逐个校验标签写法、属性必须带引号的值、成对闭合、实体只用 XML 自带的
function assertWellFormedXml(xml, label) {
  const s = xml
    .replace(/^<\?xml[^>]*\?>/, '')
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const entity = s.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)[^\s;]{0,12};?/);
  assert.equal(entity, null, `${label} 含 XML 不认识的实体：${entity && entity[0]}`);
  const tagRe = /<[^>]*>/g;
  const okRe = /^<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>$/;
  const stack = [];
  let m;
  while ((m = tagRe.exec(s))) {
    const tag = m[0];
    const t = okRe.exec(tag);
    assert.ok(t, `${label} 标签写法不符合 XML（属性缺值或未加引号？）：${tag.slice(0, 120)}`);
    const [, closing, name, , selfClose] = t;
    if (closing) assert.equal(stack.pop(), name, `${label} 标签不配对：</${name}>`);
    else if (!selfClose) stack.push(name);
  }
  assert.deepEqual(stack, [], `${label} 有未闭合标签`);
}

test('XHTML 产物是良构 XML，且以 XHTML 命名空间开头', () => {
  const { xhtml } = buildPages();
  assert.ok(xhtml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xhtml.includes('<html xmlns="http://www.w3.org/1999/xhtml"'));
  assert.ok(xhtml.includes('//<![CDATA[') && xhtml.includes('/*<![CDATA[*/'));
  assertWellFormedXml(xhtml, 'dist/index.xhtml');
});

test('CDATA 中出现的 "]]>" 会被拆开', () => {
  const tpl = '<title>t</title>\n<style>/*@CSS*/</style>\n<!--@BODY-->\n<div id="app"></div>\n<script>/*@JS*/</script>\n';
  const out = assembleXhtml({ tpl, css: 'a{b:c}', js: 'const x = a[b[0]]>1;' });
  assert.ok(out.includes('a[b[0]]]]><![CDATA[>1'));
  assertWellFormedXml(out, 'fixture');
});

test('运行时插入的美术 SVG 都带命名空间且良构', () => {
  const svgs = [iconSymbolsSVG(), iconSVG(3, 30), logoSVG()];
  for (const b of BREEDS) for (const mood of MOODS) svgs.push(dogHeadSVG(b.key, mood));
  for (const svg of svgs) {
    assert.ok(/^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(svg), `缺少 xmlns：${svg.slice(0, 60)}`);
    assertWellFormedXml(svg, 'art');
  }
});

test('界面源码里的 HTML 片段符合 XML 写法（XHTML 下 innerHTML 按 XML 解析）', () => {
  const files = ['src/index.html', ...fs.readdirSync('src/ui').map((f) => `src/ui/${f}`)];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const entity = src.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)[a-zA-Z]+;/);
    assert.equal(entity, null, `${f} 含 HTML 专有实体：${entity && entity[0]}`);
    const svg = src.match(/<svg(?![^>]*xmlns=)[^>]*>/);
    assert.equal(svg, null, `${f} 的 <svg> 缺少 xmlns：${svg && svg[0]}`);
    const bool = src.match(/<[a-z][^<>]*\s(hidden|disabled|checked|selected|readonly|multiple|autofocus)(?=[\s/>])(?!\s*=)/);
    assert.equal(bool, null, `${f} 含不带值的布尔属性：${bool && bool[1]}`);
  }
});
