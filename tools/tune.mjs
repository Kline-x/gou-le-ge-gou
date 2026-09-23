// 调参实验：临时覆盖某档难度参数后跑平衡模拟，例如 node tools/tune.mjs daily2 200 '{"pDig":0.8,"candidates":8}'
import { generateLevel, LEVELS } from '../src/core/generator.js';
import { createGame } from '../src/core/game.js';
import { playOut } from '../src/core/bot.js';
const [key, n = '100', patch = '{}'] = process.argv.slice(2);
Object.assign(LEVELS[key], JSON.parse(patch));
const N = Number(n);
let plain = 0, props = 0, prog = 0; const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const level = generateLevel(key, `bal-${i}`);
  const g1 = createGame(level); if (playOut(g1) === 'won') plain++; prog += 1 - g1.state.remaining / level.tiles.length;
  if (playOut(createGame(level), { useProps: true }) === 'won') props++;
}
console.log(`${key} ${patch} 无道具 ${(plain / N * 100).toFixed(1)}% 有道具 ${(props / N * 100).toFixed(1)}% 平均进度 ${(prog / N * 100).toFixed(0)}% ${Date.now() - t0}ms`);
