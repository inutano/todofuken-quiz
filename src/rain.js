// src/rain.js — 正解時の絵文字レイン（物理バウンド）
(function () {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const MAX = 160;
  let particles = [];
  let running = false;
  let layer = null;

  function ensureLayer() {
    layer = document.getElementById('rain-layer');
    if (!layer) return;
    layer.setAttribute('viewBox', `0 0 100 100`);
    layer.setAttribute('preserveAspectRatio', 'none');
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function burst(emojis, count) {
    if (!layer) ensureLayer();
    if (!layer) return;
    const n = Math.min(count, MAX - particles.length);
    for (let i = 0; i < n; i++) {
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('font-size', rnd(3.2, 5.5).toFixed(2)); // in viewBox units (~vh)
      t.setAttribute('text-anchor', 'middle');
      t.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      layer.appendChild(t);
      particles.push({
        el: t, x: rnd(5, 95), y: rnd(-15, -2),
        vx: rnd(-0.6, 0.6), vy: rnd(0, 0.4),
        life: rnd(3.6, 4.6), age: 0, resting: false,
      });
    }
    if (!running) { running = true; requestAnimationFrame(step); }
  }

  let last = null;
  function step(ts) {
    if (last == null) last = ts;
    let dt = (ts - last) / 16.67; last = ts;
    if (dt > 3) dt = 3;
    const G = 0.09, REST = 0.7, FLOOR = 98, WALL_L = 1, WALL_R = 99, FADE = 0.8;
    for (const p of particles) {
      p.age += dt / 60;
      if (!p.resting) {
        p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > FLOOR) { p.y = FLOOR; p.vy = -Math.abs(p.vy) * REST; p.vx *= 0.8; }
        if (p.x < WALL_L) { p.x = WALL_L; p.vx = Math.abs(p.vx) * REST; }
        if (p.x > WALL_R) { p.x = WALL_R; p.vx = -Math.abs(p.vx) * REST; }
        // 床付近で十分減速したら着地させてその場に留める
        if (p.y >= FLOOR - 0.4 && Math.abs(p.vy) < 0.35 && Math.abs(p.vx) < 0.25) {
          p.resting = true; p.y = FLOOR; p.vx = 0; p.vy = 0;
        }
      }
      const remain = p.life - p.age;
      const op = remain < FADE ? Math.max(0, remain / FADE) : 1;
      p.el.setAttribute('x', p.x.toFixed(2));
      p.el.setAttribute('y', p.y.toFixed(2));
      p.el.setAttribute('opacity', op.toFixed(2));
    }
    const alive = [];
    for (const p of particles) {
      if (p.age < p.life) alive.push(p); else p.el.remove();
    }
    particles = alive;
    if (particles.length) { requestAnimationFrame(step); }
    else { running = false; last = null; }
  }
  window.RAIN = { burst };
})();
