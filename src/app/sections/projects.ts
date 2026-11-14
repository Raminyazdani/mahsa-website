import type { Ctx } from '../context.ts';
import { $, $$, bus, fitCanvas, h, sceneLoop } from '../ui.ts';
import { icon } from '../../render/icons.ts';
import { createSynthesis, expose, couple, maskFor, errorCount } from '../../scenes/synthesis-model.ts';
import type { Base, PatternName } from '../../scenes/synthesis-model.ts';
import { rng } from '../appearance.ts';

const BASE_COLOR: Record<Base, string> = { A: '#2CF5A0', C: '#5C7CFF', G: '#FFB020', T: '#FF4F9A' };

export function initProjects(ctx: Ctx) {
  const section = $('#projects');
  if (!section) return;
  const experiments = $$<HTMLElement>('.experiment', section);
  if (!experiments.length) return;
  let index = 0;
  const prev = h('button', { type: 'button', class: 'hardkey hardkey--small', 'aria-label': ctx.l.project.prev, html: icon('chevronLeft') });
  const label = h('span', { class: 'console-readout' }, '01');
  const next = h('button', { type: 'button', class: 'hardkey hardkey--small', 'aria-label': ctx.l.project.next, html: icon('chevronRight') });
  const open = h('a', { class: 'hardkey', href: '#', 'aria-label': ctx.l.projects.open, html: `${icon('arrowUpRight')}<span>${ctx.l.projects.open}</span>` });
  const show = (i: number) => {
    index = (i + experiments.length) % experiments.length;
    const el = experiments[index]!;
    el.scrollIntoView({ block: 'start', behavior: ctx.motion() === 'off' ? 'instant' as ScrollBehavior : 'smooth' });
    sync();
  };
  const sync = () => { label.textContent = `${String(index + 1).padStart(2, '0')} / ${String(experiments.length).padStart(2, '0')}`; open.setAttribute('href', `/${ctx.locale}/projects/${encodeURIComponent(experiments[index]!.dataset.project!)}/`); };
  prev.addEventListener('click', () => show(index - 1)); next.addEventListener('click', () => show(index + 1));
  const io = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { index = experiments.indexOf(entry.target as HTMLElement); sync(); } }), { rootMargin: '-45% 0px -45% 0px' });
  experiments.forEach(el => io.observe(el));
  ctx.registerConsole('projects', { controls: experiments.length > 1 ? [prev, label, next, open] : [open] });
  sync();
}

/** Every conceptual apparatus on the page (home and project pages). */
export function initApparatus(ctx: Ctx) {
  for (const el of $$<HTMLElement>('[data-apparatus]')) {
    const kind = el.dataset.apparatus;
    if (kind === 'photolithography') synthesis(ctx, el);
    else if (kind === 'expression') expression(ctx, el);
    else specimen(ctx, el);
  }
}

/* ───────── Photolithographic synthesis: mirrors aim UV, light deprotects, one base couples ───────── */
function synthesis(ctx: Ctx, root: HTMLElement) {
  const big = root.dataset.size === 'page';
  const cols = big ? 12 : 10, rows = big ? 8 : 6;
  let chip = createSynthesis(cols, rows);
  let pattern: PatternName = 'checker';
  let mask = maskFor(pattern, cols, rows);
  let base: Base = 'A';
  let efficiency = 0.98;
  let flash = 0, couplingFlash = 0, inspect = Math.floor(rows / 2) * cols + Math.floor(cols / 2), hover = -1;
  const random = rng(7);
  const canvas = $<HTMLCanvasElement>('.synth-canvas', root)!;
  const cycleOut = $('[data-synth-cycle]', root)!, errOut = $('[data-synth-errors]', root)!, effOut = $('[data-synth-eff]', root)!;
  const strand = $('[data-synth-strand]', root)!, spotOut = $('[data-synth-spot]', root)!;
  const exposeKey = $<HTMLButtonElement>('[data-synth="expose"]', root)!, coupleKey = $<HTMLButtonElement>('[data-synth="couple"]', root)!;
  let geo = { x0: 0, y0: 0, cell: 0, w: 0, h: 0 };

  function readouts() {
    cycleOut.textContent = String(chip.cycle);
    errOut.textContent = `${errorCount(chip)} / ${cols * rows}`;
    effOut.textContent = `${Math.round(efficiency * 100)}%`;
    const spot = chip.spots[inspect]!;
    spotOut.textContent = `${String.fromCharCode(65 + Math.floor(inspect / cols))}${(inspect % cols) + 1}`;
    strand.replaceChildren(...(spot.bases.length ? spot.bases.map((b, i) => h('li', { class: `bead ${b === '-' ? 'bead--gap' : `bead--${b.toLowerCase()}`}`, title: b === '-' ? 'deletion' : b }, b === '-' ? '·' : b)) : [h('li', { class: 'bead bead--empty' }, '5′')]));
    exposeKey.toggleAttribute('data-armed', !chip.exposed);
    coupleKey.toggleAttribute('data-armed', chip.exposed);
    loop.refresh();
  }
  root.addEventListener('click', event => {
    const t = event.target as Element;
    const p = t.closest<HTMLButtonElement>('[data-synth-pattern]');
    if (p) { pattern = p.dataset.synthPattern as PatternName; mask = maskFor(pattern, cols, rows); $$('[data-synth-pattern]', root).forEach(b => b.setAttribute('aria-checked', String(b === p))); readouts(); return; }
    const b = t.closest<HTMLButtonElement>('[data-synth-base]');
    if (b) { base = b.dataset.synthBase as Base; $$('[data-synth-base]', root).forEach(x => x.setAttribute('aria-checked', String(x === b))); return; }
    const action = t.closest<HTMLButtonElement>('[data-synth]')?.dataset.synth;
    if (action === 'expose') { chip = expose(chip, mask, efficiency, random); flash = 1; readouts(); }
    if (action === 'couple') { chip = couple(chip, base); couplingFlash = 1; readouts(); }
    if (action === 'reset') { chip = createSynthesis(cols, rows); readouts(); }
  });
  $<HTMLInputElement>('[data-synth="efficiency"]', root)!.addEventListener('input', event => { const input = event.target as HTMLInputElement; efficiency = Number(input.value) / 100; input.style.setProperty('--p', `${((Number(input.value) - 80) / 20) * 100}%`); readouts(); });
  const spotAt = (event: PointerEvent | MouseEvent) => {
    const r = canvas.getBoundingClientRect(); const x = event.clientX - r.left - geo.x0, y = event.clientY - r.top - geo.y0;
    const c = Math.floor(x / geo.cell), rr = Math.floor(y / geo.cell);
    return c >= 0 && c < cols && rr >= 0 && rr < rows ? rr * cols + c : -1;
  };
  canvas.addEventListener('pointermove', event => { hover = spotAt(event); loop.refresh(); });
  canvas.addEventListener('pointerleave', () => { hover = -1; loop.refresh(); });
  canvas.addEventListener('click', event => {
    const i = spotAt(event); if (i < 0) return;
    if (event.shiftKey || event.altKey || pattern === 'custom') { mask = mask.slice(); mask[i] = !mask[i]; pattern = 'custom'; $$('[data-synth-pattern]', root).forEach(b => b.setAttribute('aria-checked', 'false')); }
    inspect = i; readouts();
  });
  canvas.addEventListener('dblclick', event => { const i = spotAt(event); if (i < 0) return; mask = mask.slice(); mask[i] = !mask[i]; pattern = 'custom'; $$('[data-synth-pattern]', root).forEach(b => b.setAttribute('aria-checked', 'false')); readouts(); });

  const loop = sceneLoop(canvas, (dt, t) => {
    const { w, h: H, ctx: c } = fitCanvas(canvas, 2);
    const dark = ctx.theme() === 'dark';
    const cell = Math.min((w - 36) / cols, (H - 36) / rows);
    geo = { x0: (w - cell * cols) / 2, y0: (H - cell * rows) / 2, cell, w, h: H };
    flash = Math.max(0, flash - dt * 1.4); couplingFlash = Math.max(0, couplingFlash - dt * 1.6);
    c.clearRect(0, 0, w, H);
    // chip glass
    c.fillStyle = dark ? '#0B0A19' : '#E8EAF6';
    c.beginPath(); c.roundRect(geo.x0 - 14, geo.y0 - 14, cell * cols + 28, cell * rows + 28, 14); c.fill();
    c.strokeStyle = dark ? 'rgba(200,190,255,.18)' : 'rgba(40,30,110,.18)'; c.lineWidth = 1; c.stroke();
    for (let i = 0; i < cols * rows; i++) {
      const x = geo.x0 + (i % cols) * cell + cell / 2, y = geo.y0 + Math.floor(i / cols) * cell + cell / 2;
      const spot = chip.spots[i]!;
      const inMask = mask[i];
      // mirror aim: UV square where the micromirror sends light
      if (inMask) {
        const pulse = 0.22 + 0.06 * Math.sin(t * 2 + i * 0.3) * (ctx.motion() === 'off' ? 0 : 1) + flash * 0.7;
        c.fillStyle = `rgba(139,92,255,${(dark ? pulse : pulse * 0.7).toFixed(3)})`;
        c.fillRect(x - cell / 2 + 2, y - cell / 2 + 2, cell - 4, cell - 4);
      }
      // strand rings (one per coupled base, newest outside)
      const n = spot.bases.length; const maxR = cell * 0.4;
      for (let k = Math.max(0, n - 6); k < n; k++) {
        const b = spot.bases[k]!; const r = maxR * (0.35 + 0.65 * ((k - Math.max(0, n - 6) + 1) / Math.min(6, n)));
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
        c.strokeStyle = b === '-' ? (dark ? 'rgba(255,90,120,.9)' : 'rgba(190,30,66,.9)') : BASE_COLOR[b as Base]; c.lineWidth = Math.max(1.4, cell * 0.06);
        if (b === '-') c.setLineDash([2, 3]); c.stroke(); c.setLineDash([]);
      }
      // centre: protected (dim) or deprotected (glowing, ready to couple)
      c.beginPath(); c.arc(x, y, cell * 0.12, 0, Math.PI * 2);
      if (spot.deprotected) { c.fillStyle = dark ? '#F2EDFF' : '#5A2DDE'; if (dark) { c.shadowColor = '#8B5CFF'; c.shadowBlur = 12; } }
      else c.fillStyle = dark ? 'rgba(200,190,255,.28)' : 'rgba(40,30,110,.28)';
      c.fill(); c.shadowBlur = 0;
      if (couplingFlash > 0 && spot.deprotectedBefore) { c.beginPath(); c.arc(x, y, maxR * (1.1 + (1 - couplingFlash) * 0.5), 0, Math.PI * 2); c.strokeStyle = `${BASE_COLOR[base]}${Math.round(couplingFlash * 200).toString(16).padStart(2, '0')}`; c.lineWidth = 2; c.stroke(); }
      if (i === inspect || i === hover) { c.strokeStyle = dark ? '#D8FF3D' : '#566300'; c.lineWidth = i === inspect ? 2 : 1; c.strokeRect(x - cell / 2 + 1, y - cell / 2 + 1, cell - 2, cell - 2); }
    }
    // UV beam flash from the mirror array above
    if (flash > 0) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(139,92,255,${(flash * 0.5).toFixed(3)})`); g.addColorStop(1, 'rgba(139,92,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, H); }
    c.font = '600 9px "Martian Mono", monospace'; c.fillStyle = dark ? 'rgba(200,190,255,.55)' : 'rgba(40,30,110,.55)'; c.textAlign = 'center';
    for (let col = 0; col < cols; col++) c.fillText(String(col + 1), geo.x0 + col * cell + cell / 2, geo.y0 - 4);
    c.textAlign = 'right'; for (let r = 0; r < rows; r++) c.fillText(String.fromCharCode(65 + r), geo.x0 - 5, geo.y0 + r * cell + cell / 2 + 3);
  }, () => ctx.motion() !== 'off' && !ctx.focus());
  bus.on('theme', loop.refresh); bus.on('motion', loop.refresh); bus.on('station', loop.refresh);
  readouts();
}

/* ───────── Recombinant expression: E. coli divide; induction turns on protein production ───────── */
interface Rod { x: number; y: number; a: number; len: number; vx: number; vy: number; va: number; protein: number; split: number; plasmids: number }
function expression(ctx: Ctx, root: HTMLElement) {
  const canvas = $<HTMLCanvasElement>('.expr-canvas', root)!;
  const cellsOut = $('[data-expr-cells]', root)!, proteinOut = $('[data-expr-protein]', root)!;
  const induceKey = $<HTMLButtonElement>('[data-expr="induce"]', root)!;
  const x = ctx.l.projects.expr;
  let rods: Rod[] = [], induced = false, w = 0, H = 0;
  const seed = () => { rods = Array.from({ length: 9 }, () => ({ x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, a: Math.random() * Math.PI, len: 1, vx: 0, vy: 0, va: 0, protein: 0, split: 0, plasmids: 2 + Math.floor(Math.random() * 3) })); };
  seed();
  const readouts = () => { cellsOut.textContent = String(rods.length); proteinOut.textContent = induced ? x.on : x.off; induceKey.setAttribute('aria-pressed', String(induced)); loop.refresh(); };
  root.addEventListener('click', event => {
    const action = (event.target as Element).closest<HTMLButtonElement>('[data-expr]')?.dataset.expr;
    if (action === 'grow') { for (const rod of rods.slice(0, Math.max(1, 34 - rods.length))) if (rod.split === 0) rod.split = 0.001; if (ctx.motion() === 'off') divideAll(); readouts(); }
    if (action === 'induce') { induced = !induced; if (ctx.motion() === 'off') rods.forEach(r => { r.protein = induced ? 1 : r.protein; }); readouts(); }
    if (action === 'reset') { induced = false; seed(); readouts(); }
  });
  const divideAll = () => { const born: Rod[] = []; for (const rod of rods) if (rod.split > 0) { rod.split = 0; born.push({ ...rod, x: rod.x + Math.cos(rod.a) * 0.03, y: rod.y + Math.sin(rod.a) * 0.03, a: rod.a + 0.3 }); rod.x -= Math.cos(rod.a) * 0.03; rod.y -= Math.sin(rod.a) * 0.03; } rods.push(...born.slice(0, Math.max(0, 40 - rods.length))); };
  const loop = sceneLoop(canvas, (dt, t) => {
    const fit = fitCanvas(canvas, 2); w = fit.w; H = fit.h; const c = fit.ctx;
    const dark = ctx.theme() === 'dark';
    const m = ctx.motion() === 'full' ? 1 : 0.4;
    for (const rod of rods) {
      rod.vx += (Math.random() - 0.5) * 0.04 * dt * m; rod.vy += (Math.random() - 0.5) * 0.04 * dt * m; rod.va += (Math.random() - 0.5) * 0.8 * dt * m;
      rod.vx *= 0.97; rod.vy *= 0.97; rod.va *= 0.95;
      rod.x = Math.min(0.94, Math.max(0.06, rod.x + rod.vx * dt * 6)); rod.y = Math.min(0.9, Math.max(0.1, rod.y + rod.vy * dt * 6)); rod.a += rod.va * dt;
      if (induced) rod.protein = Math.min(1, rod.protein + dt * 0.18); else rod.protein = Math.max(0, rod.protein - dt * 0.05);
      if (rod.split > 0) { rod.split += dt * 0.6; if (rod.split >= 1) rod.split = 1; }
    }
    if (rods.some(r => r.split >= 1)) { divideAll(); readouts(); }
    c.clearRect(0, 0, w, H);
    const bg = c.createLinearGradient(0, 0, 0, H);
    if (dark) { bg.addColorStop(0, '#0C0B1C'); bg.addColorStop(1, '#070611'); } else { bg.addColorStop(0, '#FFF9E8'); bg.addColorStop(1, '#F6EEDB'); }
    c.fillStyle = bg; c.beginPath(); c.roundRect(0, 0, w, H, 16); c.fill();
    const L = Math.min(w, H) * 0.1;
    for (const rod of rods) {
      const len = L * (1 + rod.split * 0.9), r = L * 0.32;
      c.save(); c.translate(rod.x * w, rod.y * H); c.rotate(rod.a);
      const glow = rod.protein;
      c.beginPath(); c.roundRect(-len / 2 - r, -r, len + 2 * r, 2 * r, r);
      if (dark) { c.fillStyle = `rgba(${Math.round(60 + 195 * glow)},${Math.round(90 + 60 * glow)},${Math.round(160 - 70 * glow)},${0.35 + 0.4 * glow})`; if (glow > 0.05) { c.shadowColor = 'rgba(255,122,89,.8)'; c.shadowBlur = 18 * glow; } }
      else c.fillStyle = `rgba(${Math.round(180 + 60 * glow)},${Math.round(200 - 80 * glow)},${Math.round(170 - 90 * glow)},.75)`;
      c.fill(); c.shadowBlur = 0;
      c.strokeStyle = dark ? 'rgba(200,220,255,.45)' : 'rgba(90,70,40,.55)'; c.lineWidth = 1.1; c.stroke();
      if (rod.split > 0.4) { c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.strokeStyle = dark ? 'rgba(255,255,255,.4)' : 'rgba(90,70,40,.5)'; c.stroke(); }
      for (let p = 0; p < rod.plasmids; p++) { c.beginPath(); c.arc(-len * 0.3 + (p * len * 0.6) / Math.max(1, rod.plasmids - 1), (p % 2 ? 1 : -1) * r * 0.3, r * 0.28, 0, Math.PI * 2); c.strokeStyle = dark ? 'rgba(38,224,255,.85)' : 'rgba(0,111,134,.85)'; c.lineWidth = 1; c.stroke(); }
      const dots = Math.round(glow * 9);
      for (let d = 0; d < dots; d++) { c.beginPath(); c.arc(Math.sin(d * 2.1 + t * 0.5) * len * 0.42, Math.cos(d * 1.7 + t * 0.4) * r * 0.55, 1.6, 0, Math.PI * 2); c.fillStyle = dark ? '#FFD36B' : '#B23D1C'; c.fill(); }
      c.restore();
    }
  }, () => ctx.motion() !== 'off' && !ctx.focus());
  bus.on('theme', loop.refresh); bus.on('motion', loop.refresh); bus.on('station', loop.refresh);
  readouts();
}

/* ───────── Generic specimen for projects without a dedicated apparatus ───────── */
function specimen(ctx: Ctx, root: HTMLElement) {
  const canvas = $<HTMLCanvasElement>('.specimen-canvas', root);
  if (!canvas) return;
  const random = rng(Number(root.dataset.seed) || 1);
  const blobs = Array.from({ length: 14 }, () => ({ x: random(), y: random(), r: 0.04 + random() * 0.06, ph: random() * 6 }));
  const loop = sceneLoop(canvas, (_dt, t) => {
    const { w, h: H, ctx: c } = fitCanvas(canvas, 2);
    const dark = ctx.theme() === 'dark';
    c.clearRect(0, 0, w, H); c.fillStyle = dark ? '#0B0A19' : '#F4F1FB'; c.beginPath(); c.roundRect(0, 0, w, H, 16); c.fill();
    for (const b of blobs) { c.beginPath(); c.arc(b.x * w + Math.sin(t * 0.4 + b.ph) * 6, b.y * H + Math.cos(t * 0.3 + b.ph) * 6, b.r * Math.min(w, H), 0, Math.PI * 2); c.fillStyle = dark ? 'rgba(216,255,61,.35)' : 'rgba(86,99,0,.25)'; c.fill(); }
  }, () => ctx.motion() !== 'off' && !ctx.focus());
  bus.on('theme', loop.refresh);
}
