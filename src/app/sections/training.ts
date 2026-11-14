import type { Ctx } from '../context.ts';
import { $, $$, bus, fitCanvas, onVisible, sceneLoop } from '../ui.ts';
import { rng, seed } from '../appearance.ts';

type Stain = 'he' | 'gram' | 'fluo' | 'giemsa' | 'pas' | 'dapi';
const palettes: Record<Stain, { bg: [string, string]; dark: [string, string]; body: string; nucleus: string; darkBody: string; darkNucleus: string; shape: 'tissue' | 'rods' | 'cells' }> = {
  he: { bg: ['#FBE9F1', '#F3CFE0'], dark: ['#1A0E19', '#0C0710'], body: 'rgba(233,120,170,.45)', nucleus: 'rgba(84,54,150,.85)', darkBody: 'rgba(242,95,192,.35)', darkNucleus: 'rgba(160,130,255,.9)', shape: 'tissue' },
  gram: { bg: ['#FFF7F2', '#F7E6EC'], dark: ['#120D18', '#09060E'], body: 'rgba(120,60,170,.75)', nucleus: 'rgba(230,80,120,.8)', darkBody: 'rgba(160,120,255,.8)', darkNucleus: 'rgba(255,92,122,.85)', shape: 'rods' },
  fluo: { bg: ['#F1F8F5', '#E2F0EA'], dark: ['#04080A', '#020405'], body: 'rgba(0,140,90,.35)', nucleus: 'rgba(45,72,211,.8)', darkBody: 'rgba(44,245,160,.35)', darkNucleus: 'rgba(92,124,255,.95)', shape: 'cells' },
  giemsa: { bg: ['#F6F2FB', '#E6E0F4'], dark: ['#0E0C1C', '#07060F'], body: 'rgba(214,150,190,.5)', nucleus: 'rgba(70,60,170,.9)', darkBody: 'rgba(240,150,200,.35)', darkNucleus: 'rgba(130,140,255,.95)', shape: 'cells' },
  pas: { bg: ['#FDF0F7', '#F5D8EA'], dark: ['#180B16', '#0B060B'], body: 'rgba(200,40,140,.4)', nucleus: 'rgba(60,70,170,.8)', darkBody: 'rgba(255,79,163,.35)', darkNucleus: 'rgba(110,150,255,.9)', shape: 'tissue' },
  dapi: { bg: ['#EEF2FD', '#DCE3F8'], dark: ['#03040B', '#010206'], body: 'rgba(80,110,230,.18)', nucleus: 'rgba(45,72,211,.85)', darkBody: 'rgba(92,124,255,.12)', darkNucleus: 'rgba(120,150,255,.95)', shape: 'cells' },
};

/** Training: slides in a box; the chosen one goes under the microscope. */
export function initTraining(ctx: Ctx) {
  const found = $('#training');
  if (!found) return;
  const section: HTMLElement = found;
  const slides = $$<HTMLButtonElement>('.slide', section);
  const canvas = $<HTMLCanvasElement>('.viewer-canvas', section)!;
  const titleOut = $('[data-viewer-title]', section)!, metaOut = $('[data-viewer-meta]', section)!;
  let current: HTMLButtonElement | null = null, swap = 1;
  let shapes: { x: number; y: number; r: number; a: number; ph: number }[] = [];
  function select(slide: HTMLButtonElement, focus = false) {
    current = slide;
    slides.forEach(s => s.setAttribute('aria-pressed', String(s === slide)));
    titleOut.textContent = slide.querySelector('.slide-title')?.textContent ?? '';
    metaOut.textContent = slide.dataset.meta || ctx.l.training.course;
    const random = rng(seed(slide.dataset.training ?? 'x'));
    shapes = Array.from({ length: 34 }, () => ({ x: random(), y: random(), r: 0.035 + random() * 0.05, a: random() * Math.PI, ph: random() * 6 }));
    swap = 0; loop.refresh();
    if (focus) slide.focus();
  }
  section.addEventListener('click', event => { const slide = (event.target as Element).closest<HTMLButtonElement>('.slide'); if (slide) select(slide); });
  section.addEventListener('keydown', event => {
    const slide = (event.target as Element).closest<HTMLButtonElement>('.slide');
    if (!slide || !['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const i = slides.indexOf(slide); const next = slides[(i + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1) + slides.length) % slides.length]!;
    select(next, true);
  });
  const loop = sceneLoop(canvas, (dt, t) => {
    const { w, h, ctx: c } = fitCanvas(canvas, 2);
    const stain = (current?.dataset.stain ?? 'he') as Stain;
    const p = palettes[stain];
    const dark = ctx.theme() === 'dark';
    swap = dt === 0 ? 1 : Math.min(1, swap + dt * 2.2);
    c.clearRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    const [a, b] = dark ? p.dark : p.bg; g.addColorStop(0, a); g.addColorStop(1, b);
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
    if (!current) return;
    c.save(); c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.clip();
    c.globalAlpha = swap;
    const drift = ctx.motion() === 'off' ? 0 : 1;
    const focusBlur = (1 - swap) * 6;
    c.filter = focusBlur > 0.2 ? `blur(${focusBlur.toFixed(1)}px)` : 'none';
    for (const s of shapes) {
      const x = s.x * w + Math.sin(t * 0.2 + s.ph) * 3 * drift, y = s.y * h + Math.cos(t * 0.17 + s.ph) * 3 * drift, r = s.r * w;
      if (p.shape === 'rods') {
        c.save(); c.translate(x, y); c.rotate(s.a); c.beginPath(); c.roundRect(-r * 0.9, -r * 0.28, r * 1.8, r * 0.56, r * 0.28);
        c.fillStyle = s.ph > 3 ? (dark ? p.darkBody : p.body) : (dark ? p.darkNucleus : p.nucleus); c.fill(); c.restore();
      } else {
        c.beginPath();
        for (let k = 0; k <= 16; k++) { const ang = (k / 16) * Math.PI * 2; const rr = r * (p.shape === 'tissue' ? 1.6 : 1) * (1 + 0.12 * Math.sin(ang * 3 + s.ph)); const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr; if (k) c.lineTo(px, py); else c.moveTo(px, py); }
        c.fillStyle = dark ? p.darkBody : p.body; c.fill();
        c.beginPath(); c.arc(x + r * 0.15, y - r * 0.1, r * 0.45, 0, Math.PI * 2);
        c.fillStyle = dark ? p.darkNucleus : p.nucleus;
        if (dark) { c.shadowColor = p.darkNucleus; c.shadowBlur = 10; }
        c.fill(); c.shadowBlur = 0;
      }
    }
    c.filter = 'none'; c.globalAlpha = 1; c.restore();
  }, () => ctx.motion() !== 'off' && !ctx.focus());
  bus.on('theme', loop.refresh); bus.on('motion', loop.refresh); bus.on('station', loop.refresh);
  bus.on('training:select', id => { const slide = slides.find(s => s.dataset.training === id); if (slide) select(slide); });
  const requested = new URL(location.href).searchParams.get('slide');
  const initial = slides.find(s => s.dataset.training === requested);
  if (initial) select(initial);
  onVisible(section, visible => { if (visible && !current && slides[0]) select(slides[0]); });
}
