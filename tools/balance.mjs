// 平衡模拟：各难度 × N 局，统计贪心机器人「无道具 / 有道具」通关率
// 用法：node tools/balance.mjs [局数=200] [key1,key2,...]
import { generateLevel, LEVELS } from '../src/core/generator.js';
import { createGame } from '../src/core/game.js';
import { playOut } from '../src/core/bot.js';

const N = Number(process.argv[2]) || 200;
const keys = process.argv[3] ? process.argv[3].split(',') : Object.keys(LEVELS);
const pct = (n) => `${((n / N) * 100).toFixed(1).padStart(5)}%`;

for (const key of keys) {
  const t0 = Date.now();
  let plain = 0;
  let props = 0;
  for (let i = 0; i < N; i++) {
    const level = generateLevel(key, `bal-${i}`);
    if (playOut(createGame(level)) === 'won') plain++;
    if (playOut(createGame(level), { useProps: true }) === 'won') props++;
  }
  const cfg = LEVELS[key];
  console.log(`${key.padEnd(7)} ${String(cfg.kinds * cfg.perKind).padStart(3)} 张  无道具 ${pct(plain)}  有道具 ${pct(props)}  ${Date.now() - t0}ms`);
}
