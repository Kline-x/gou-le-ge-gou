// 从实施计划中提取带 file= 标注的代码块并写入文件（同一路径以最后一个代码块为准）
import fs from 'node:fs';
import path from 'node:path';

const [, , planPath, ...rest] = process.argv;
if (!planPath) { console.error('用法：node tools/extract-plan.mjs <plan.md> [--only a,b]'); process.exit(1); }
const onlyIdx = rest.indexOf('--only');
const only = onlyIdx >= 0 ? new Set(rest[onlyIdx + 1].split(',')) : null;

const text = fs.readFileSync(planPath, 'utf8').replace(/\r\n/g, '\n');
const re = /^```[\w-]* file=(\S+)\n([\s\S]*?)^```$/gm;
const files = new Map();
let m;
while ((m = re.exec(text))) files.set(m[1], m[2]);

let n = 0;
for (const [rel, body] of files) {
  if (only && !only.has(rel)) continue;
  const out = path.resolve(rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body);
  console.log('写入', rel);
  n++;
}
console.log(`共写入 ${n} 个文件`);
