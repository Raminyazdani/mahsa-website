import type { Ctx } from '../context.ts';
import { $, bus, fitCanvas, onVisible, sceneLoop } from '../ui.ts';

interface Cell { x: number; y: number; r: number; vx: number; vy: number; ph: number; grow: number; fade: number; split: number }

/** Profile: the summary comes into focus like a specimen; live cells drift in the field of view. */
export function initProfile(ctx: Ctx) {
  const found = $('#profile');
  if (!found) return;
  const section: HTMLElement = found;
  const text = $('[data-focus-text]', section), rail = $('.focus-rail', section);
  let active = false;
  const update = () => {
    if (!text) return;
    const rect = text.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - rect.top) / (innerHeight * 0.42)));
    const strength = ctx.focus() ? 0 : ctx.motion() === 'full' ? 5 : ctx.motion() === 'gentle' ? 2 : 0;
    section.style.setProperty('--focus-blur', `${((1 - p) * strength).toFixed(2)}px`);
    section.style.setProperty('--focus-p', p.toFixed(3));
    rail?.style.setProperty('--knob', `${(p * 320).toFixed(1)}deg`);
  };
  onVisible(section, visible => { active = visible; if (visible) update(); });
  addEventListener('scroll', () => { if (active) requestAnimationFrame(update); }, { passive: true });
  bus.on('motion', update); bus.on('focus', update); update();

  const canvas = $<HTMLCanvasElement>('[data-cells]', section);
  if (!canvas) return;
  const cells: Cell[] = [];
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  let w = 0, h = 0, R = 0, pointer = { x: -999, y: -999 }, nextSplit = 3;
  const seedCells = () => {
    cells.length = 0;
    for (let i = 0; i < 11; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R * 0.75;
      cells.push({ x: w / 2 + Math.cos(a) * d, y: h / 2 + Math.sin(a) * d, r: rnd(R * 0.07, R * 0.12), vx: rnd(-6, 6), vy: rnd(-6, 6), ph: Math.random() * 10, grow: 1, fade: 1, split: 0 });
    }
  };
  canvas.addEventListener('pointermove', event => { const r = canvas.getBoundingClientRect(); pointer = { x: event.clientX - r.left, y: event.clientY - r.top }; });
  canvas.addEventListener('pointerleave', () => { pointer = { x: -999, y: -999 }; });

  function blob(c: CanvasRenderingContext2D, x: number, y: number, r: number, ph: number, t: number, wobble: number) {
    c.beginPath();
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const rr = r * (1 + wobble * (Math.sin(a * 3 + ph + t * 0.9) * 0.06 + Math.sin(a * 5 - ph * 1.3 + t * 0.6) * 0.035));
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  }

  const loop = sceneLoop(canvas, (dt, t) => {
    const fit = fitCanvas(canvas, 1.75);
    if (fit.w !== w || fit.h !== h) { w = fit.w; h = fit.h; R = Math.min(w, h) / 2; if (!cells.length) seedCells(); }
    const c = fit.ctx;
    const dark = ctx.theme() === 'dark';
    const m = ctx.motion() === 'off' || ctx.focus() ? 0 : ctx.motion() === 'gentle' ? 0.35 : 1;
    // physics
    if (m > 0 && dt > 0) {
      nextSplit -= dt;
      if (nextSplit <= 0) {
        nextSplit = rnd(4, 7);
        const live = cells.filter(cell => cell.fade >= 1 && cell.split === 0);
        if (cells.length < 16 && live.length) live[Math.floor(Math.random() * live.length)]!.split = 0.001;
        else if (cells.length >= 16) { const old = cells.find(cell => cell.fade >= 1); if (old) old.fade = 0.999; }
      }
      for (const cell of cells) {
        cell.vx += rnd(-1, 1) * 8 * dt * m; cell.vy += rnd(-1, 1) * 8 * dt * m;
        const dx = cell.x - pointer.x, dy = cell.y - pointer.y, dist = Math.hypot(dx, dy);
        if (dist < R * 0.4 && dist > 0.1) { const f = (1 - dist / (R * 0.4)) * 90 * dt; cell.vx += (dx / dist) * f; cell.vy += (dy / dist) * f; }
        const cx = cell.x - w / 2, cy = cell.y - h / 2, d = Math.hypot(cx, cy);
        if (d > R * 0.82 - cell.r) { cell.vx -= (cx / d) * 30 * dt; cell.vy -= (cy / d) * 30 * dt; }
        cell.vx *= 0.985; cell.vy *= 0.985;
        cell.x += cell.vx * dt * m; cell.y += cell.vy * dt * m;
        if (cell.grow < 1) cell.grow = Math.min(1, cell.grow + dt * 0.25);
        if (cell.fade < 1) cell.fade = Math.max(0, cell.fade - dt * 0.4);
        if (cell.split > 0) {
          cell.split += dt * 0.45;
          if (cell.split >= 1) {
            cell.split = 0; const r = cell.r * 0.82;
            cells.push({ ...cell, r, x: cell.x + r * 0.9, vx: cell.vx + 6, ph: cell.ph + 2, grow: 0.7, split: 0 });
            cell.r = r; cell.x -= r * 0.9; cell.vx -= 6; cell.grow = 0.7;
          }
        }
      }
      for (let i = cells.length - 1; i >= 0; i--) if (cells[i]!.fade <= 0) cells.splice(i, 1);
    }
    // draw
    c.clearRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h / 2, R * 0.1, w / 2, h / 2, R);
    if (dark) { g.addColorStop(0, '#0B0D1C'); g.addColorStop(1, '#03040A'); }
    else { g.addColorStop(0, '#FBF6F1'); g.addColorStop(0.75, '#F3E7EC'); g.addColorStop(1, '#E2D3E6'); }
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, R, 0, Math.PI * 2); c.fill();
    c.save(); c.beginPath(); c.arc(w / 2, h / 2, R, 0, Math.PI * 2); c.clip();
    for (const cell of cells) {
      const alpha = cell.fade;
      const lobes = cell.split > 0 ? [[-1, 1], [1, 1]] : [[0, 1]];
      for (const [side] of lobes) {
        const off = cell.split > 0 ? side! * cell.r * 0.55 * Math.min(1, cell.split * 1.4) : 0;
        const r = cell.r * cell.grow * (cell.split > 0 ? 0.86 : 1);
        const x = cell.x + off, y = cell.y;
        blob(c, x, y, r, cell.ph + off, t, 1);
        if (dark) {
          const cg = c.createRadialGradient(x, y, r * 0.2, x, y, r);
          cg.addColorStop(0, `rgba(44,245,160,${0.32 * alpha})`); cg.addColorStop(1, `rgba(44,245,160,${0.08 * alpha})`);
          c.fillStyle = cg; c.shadowColor = 'rgba(44,245,160,.6)'; c.shadowBlur = 18 * alpha; c.fill(); c.shadowBlur = 0;
          c.strokeStyle = `rgba(120,255,200,${0.35 * alpha})`; c.lineWidth = 1; c.stroke();
          blob(c, x + Math.sin(cell.ph) * r * 0.15, y + Math.cos(cell.ph) * r * 0.12, r * 0.42, cell.ph * 2, t * 0.7, 0.6);
          c.fillStyle = `rgba(110,140,255,${0.95 * alpha})`; c.shadowColor = 'rgba(92,124,255,.9)'; c.shadowBlur = 14; c.fill(); c.shadowBlur = 0;
        } else {
          c.fillStyle = `rgba(236,128,176,${0.32 * alpha})`; c.fill();
          c.strokeStyle = `rgba(188,70,130,${0.55 * alpha})`; c.lineWidth = 1.2; c.stroke();
          blob(c, x + Math.sin(cell.ph) * r * 0.15, y + Math.cos(cell.ph) * r * 0.12, r * 0.42, cell.ph * 2, t * 0.7, 0.6);
          c.fillStyle = `rgba(86,58,150,${0.82 * alpha})`; c.fill();
          c.fillStyle = `rgba(40,20,90,${0.5 * alpha})`;
          for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + Math.sin(cell.ph + k * 2) * r * 0.2, y + Math.cos(cell.ph + k * 1.7) * r * 0.18, r * 0.06, 0, Math.PI * 2); c.fill(); }
        }
      }
    }
    c.restore();
  }, () => ctx.motion() !== 'off' && !ctx.focus());
  bus.on('theme', loop.refresh); bus.on('motion', loop.refresh); bus.on('focus', loop.refresh); bus.on('station', loop.refresh);
  const label = $('.scope-mode', section);
  const setLabel = () => { if (!label) return; const [bright, fluo] = (label.dataset.themeText ?? '|').split('|'); label.textContent = ctx.theme() === 'dark' ? fluo! : bright!; };
  bus.on('theme', setLabel); setLabel();
}
