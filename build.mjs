// 构建：把 src 下的 ES 模块按依赖顺序包进闭包，内联 CSS/JS，输出完整文档与 Artifact 片段两份产物
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cg fill='%23E8913A' stroke='%233B2A1A' stroke-width='3'%3E%3Cellipse cx='32' cy='42' rx='14' ry='12'/%3E%3Ccircle cx='15' cy='26' r='6'/%3E%3Ccircle cx='25' cy='15' r='6'/%3E%3Ccircle cx='39' cy='15' r='6'/%3E%3Ccircle cx='49' cy='26' r='6'/%3E%3C/g%3E%3C/svg%3E";

const ident = (rel) => `__m_${rel.replace(/[^\w]/g, '_')}`;

function parseModule(srcDir, rel) {
  const code = fs.readFileSync(path.join(srcDir, rel), 'utf8');
  const imports = [];
  let body = code.replace(/^import\s*\{([^}]*)\}\s*from\s*'([^']+)';[ \t]*$/gm, (_, names, from) => {
    const dep = path.posix.normalize(path.posix.join(path.posix.dirname(rel), from));
    imports.push({ dep, names: names.split(',').map((s) => s.trim().replace(/\s+as\s+/, ': ')).filter(Boolean) });
    return '';
  });
  if (/^\s*import[\s*{'"]/m.test(body)) throw new Error(`${rel}：只支持文件顶部的具名 import`);
  const exports = [];
  body = body.replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kw, name) => {
    exports.push(name);
    return `${kw} ${name}`;
  });
  if (/^\s*export\s/m.test(body)) throw new Error(`${rel}：只支持 export function / const / class`);
  if (/^export\s+(?:const|let)\s+[\w$]+\s*=[^;\n]*,\s*[\w$]+\s*=/m.test(code)) throw new Error(`${rel}：每条 export 只能声明一个名字`);
  return { rel, imports, exports, body };
}

export function bundleModules(srcDir, entryRel) {
  const done = new Map();
  const visit = (rel, stack) => {
    if (done.has(rel)) return;
    if (stack.includes(rel)) throw new Error(`循环依赖：${[...stack, rel].join(' → ')}`);
    const mod = parseModule(srcDir, rel);
    for (const imp of mod.imports) visit(imp.dep, [...stack, rel]);
    done.set(rel, mod);
  };
  visit(entryRel, []);
  let js = '';
  for (const m of done.values()) {
    const head = m.imports.map((i) => `const { ${i.names.join(', ')} } = ${ident(i.dep)};`).join('\n');
    js += `// ---- ${m.rel} ----\nconst ${ident(m.rel)} = (() => {\n${head}\n${m.body.trim()}\nreturn { ${m.exports.join(', ')} };\n})();\n`;
  }
  return js;
}

// 完整文档共用的 head 标签（自闭合写法在 HTML 和 XHTML 里都合法）
const HEAD_TAGS = [
  '<meta charset="utf-8"/>',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>',
  '<meta name="description" content="狗了个狗：狗狗主题的三消堆叠小游戏，每天一关，看你能不能通关。"/>',
  '<meta name="theme-color" content="#9ed36a"/>',
  `<link rel="icon" href="${FAVICON}"/>`,
  '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>',
];

function splitTemplate(tpl, js) {
  const parts = tpl.split('<!--@BODY-->');
  if (parts.length !== 2) throw new Error('模板缺少 <!--@BODY--> 分隔');
  if (/<\/script/i.test(js)) throw new Error('脚本中不得出现 </script');
  return parts;
}

export function assemblePages({ tpl, css, js }) {
  const parts = splitTemplate(tpl, js);
  const script = `(() => {\n'use strict';\n${js}\n})();`;
  const fill = (s) => s.replace('/*@CSS*/', () => css).replace('/*@JS*/', () => script).trim();
  const head = fill(parts[0]);
  const body = fill(parts[1]);
  const fragment = `${head}\n${body}\n`;
  const standalone = ['<!doctype html>', '<html lang="zh-CN">', '<head>', ...HEAD_TAGS, head, '</head>', '<body>', body, '</body>', '</html>', ''].join('\n');
  return { standalone, fragment };
}

// XHTML 版：jsDelivr 把 .html 当纯文本返回，但 .xhtml 会按 application/xhtml+xml 返回，浏览器能正常运行。
// XML 规则更严：样式与脚本包进 CDATA（其中的 "]]>" 拆开）；模板与运行时插入的片段必须是良构 XML（tests/xhtml.test.mjs 把关）
export function assembleXhtml({ tpl, css, js }) {
  const parts = splitTemplate(tpl, js);
  const cdata = (s) => s.split(']]>').join(']]]]><![CDATA[>');
  const script = `//<![CDATA[\n(() => {\n'use strict';\n${cdata(js)}\n})();\n//]]>`;
  const style = `/*<![CDATA[*/\n${cdata(css)}\n/*]]>*/`;
  const fill = (s) => s.replace('/*@CSS*/', () => style).replace('/*@JS*/', () => script).trim();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE html>',
    '<html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN" xml:lang="zh-CN">',
    '<head>',
    ...HEAD_TAGS,
    fill(parts[0]),
    '</head>',
    '<body>',
    fill(parts[1]),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

export function assertNoExternal(html, label) {
  const bad = html.match(/(?:src|srcset|href)\s*=\s*["']?(?:https?:)?\/\/|url\(\s*["']?(?:https?:)?\/\/|@import/gi);
  if (bad) throw new Error(`${label} 含外部资源引用：${bad.slice(0, 3).join(' | ')}`);
}

// 用当前源码在内存里构建两份页面（main 与 dist 一致性测试共用）
export function buildPages() {
  const js = bundleModules(SRC, 'ui/main.js');
  const css = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
  const tpl = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const pages = { ...assemblePages({ tpl, css, js }), xhtml: assembleXhtml({ tpl, css, js }) };
  assertNoExternal(pages.standalone, 'dist/index.html');
  assertNoExternal(pages.fragment, 'dist/artifact.html');
  assertNoExternal(pages.xhtml, 'dist/index.xhtml');
  return pages;
}

function main() {
  const { standalone, fragment, xhtml } = buildPages();
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'index.html'), standalone);
  fs.writeFileSync(path.join(DIST, 'artifact.html'), fragment);
  fs.writeFileSync(path.join(DIST, 'index.xhtml'), xhtml);
  const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`;
  console.log(`dist/index.html ${kb(standalone)}，dist/artifact.html ${kb(fragment)}，dist/index.xhtml ${kb(xhtml)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
