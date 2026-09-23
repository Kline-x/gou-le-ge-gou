// Canvas 特效层：消除时的骨头/爪印/星星爆点与通关彩带；没有粒子时停止动画循环
const PALETTE = ['#FF8A1F', '#FFD43B', '#43A047', '#29B6F6', '#F06292', '#8E44AD', '#FFFFFF'];
const rand = (a, b) => a + Math.random() * (b - a);

export function createFx(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let parts = [];
  let raf = 0;
  let last = 0;
  let w = 0;
  let h = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    w = r.width;
    h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const circle = (x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); };

  function draw(p) {
    const s = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.fade));
    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#3B2A1A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (p.shape === 'bone') {
      circle(-s * 0.55, -s * 0.2, s * 0.26);
      circle(-s * 0.55, s * 0.2, s * 0.26);
      circle(s * 0.55, -s * 0.2, s * 0.26);
      circle(s * 0.55, s * 0.2, s * 0.26);
      ctx.rect(-s * 0.55, -s * 0.16, s * 1.1, s * 0.32);
      ctx.fill();
    } else if (p.shape === 'paw') {
      ctx.ellipse(0, s * 0.18, s * 0.34, s * 0.28, 0, 0, Math.PI * 2);
      for (const [dx, dy] of [[-0.38, -0.2], [-0.13, -0.42], [0.13, -0.42], [0.38, -0.2]]) circle(dx * s, dy * s, s * 0.13);
      ctx.fill();
    } else if (p.shape === 'star') {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.22 : s * 0.5;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.shape === 'rect') {
      ctx.rect(-s / 2, -s / 4, s, s / 2);
      ctx.fill();
    } else {
      circle(0, 0, s * 0.3);
      ctx.fill();
    }
    ctx.restore();
  }

  function frame(t) {
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 1 / 60);
    last = t;
    ctx.clearRect(0, 0, w, h);
    parts = parts.filter((p) => (p.life -= dt) > 0 && p.y < h + 80);
    const k = (d) => Math.pow(d, dt * 60);
    for (const p of parts) {
      p.vy += p.g * dt;
      p.vx *= k(p.drag);
      p.vy *= k(p.drag);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      draw(p);
    }
    if (parts.length) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; ctx.clearRect(0, 0, w, h); }
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  function burst(x, y, color) {
    if (reduce) return;
    const shapes = ['bone', 'paw', 'star', 'dot'];
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(160, 420);
      parts.push({
        shape: shapes[i % 4], x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 160, g: 900, drag: 0.985,
        rot: rand(0, 6.28), vr: rand(-8, 8), size: rand(10, 18),
        color: i % 3 === 0 ? PALETTE[i % PALETTE.length] : color, life: rand(0.55, 0.9), fade: 0.3,
      });
    }
    kick();
  }

  function confetti() {
    if (reduce) return;
    for (let i = 0; i < 140; i++) {
      parts.push({
        shape: i % 5 === 0 ? 'bone' : 'rect', x: rand(0, w), y: rand(-h * 0.6, -10), vx: rand(-60, 60), vy: rand(80, 220),
        g: 140, drag: 0.995, rot: rand(0, 6.28), vr: rand(-6, 6), size: rand(10, 16),
        color: PALETTE[i % PALETTE.length], life: rand(2.6, 3.6), fade: 0.6,
      });
    }
    kick();
  }

  resize();
  return { resize, burst, confetti };
}
