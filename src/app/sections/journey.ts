import type { Ctx } from '../context.ts';
import { $, $$, bus, h, onVisible } from '../ui.ts';
import { parseDate, formatPeriod } from '../format.ts';
import { icon } from '../../render/icons.ts';

interface Rec { id: string; kind: 'education' | 'experience'; title: string; org: string; start: number; end: number; endPrecision: 'month' | 'year' | 'present'; startPrecision: 'month' | 'year' | 'present'; label: string }
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag: string, attrs: Record<string, string | number>) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); return el; };

/** Journey: a lineage that grows from one stem. Branch start/end = CV dates; year-only dates fade over that year. */
export function initJourney(ctx: Ctx) {
  const found = $('#journey');
  if (!found) return;
  const section: HTMLElement = found;
  const { content, l, locale } = ctx;
  const stage = $('[data-growth]', section)!, svgEl = stage.querySelector('svg')!, labels = $('.growth-labels', stage)!;
  const scrub = $<HTMLInputElement>('[data-journey-scrub]', section)!, playKey = $<HTMLButtonElement>('[data-journey-play]', section)!, yearOut = $('[data-journey-year]', section)!;
  const now = new Date();
  const recs: Rec[] = [];
  const push = (id: string, kind: Rec['kind'], title: string, org: string, period: { start: string | null; end: string | null; label: string }) => {
    const s = parseDate(period.start, now), en = parseDate(period.end, now);
    if (!s) return; // undated records stay in the log below; never invent a position
    const endValue = en ? (en.precision === 'year' ? en.value + 1 : en.value + (en.precision === 'month' ? 1 / 12 : 0)) : s.value + 1 / 12;
    recs.push({ id, kind, title, org, start: s.value, end: Math.max(endValue, s.value + 1 / 12), endPrecision: en?.precision ?? 'month', startPrecision: s.precision, label: formatPeriod(period, locale) });
  };
  for (const item of content.education) push(item.id, 'education', `${item.qualification} — ${item.subject}`, item.institution, item.period);
  for (const item of content.experience) push(item.id, 'experience', item.title, item.organization, item.period);
  recs.sort((a, b) => a.start - b.start || a.end - b.end);
  if (!recs.length) { stage.hidden = true; $('.timelapse', section)!.hidden = true; return; }
  const t0 = Math.floor(Math.min(...recs.map(r => r.start))) - 0.25;
  const t1 = Math.max(...recs.map(r => r.end), now.getFullYear() + now.getMonth() / 12) + 0.35;
  let playhead = t1, filter: 'all' | Rec['kind'] = 'all', playing = false, raf = 0, grownOnce = false;
  let geometry: { x: (t: number) => number; rows: { rec: Rec; y: number; path: SVGPathElement; len: number; startX: number; endX: number }[] } | null = null;

  /* Console */
  const cPlay = h('button', { type: 'button', class: 'hardkey', 'aria-pressed': 'false', html: `${icon('play', 'icon icon-play')}${icon('pause', 'icon icon-pause')}<span>${l.journey.play}</span>` });
  cPlay.addEventListener('click', () => toggle());
  ctx.registerConsole('journey', { controls: [cPlay] });

  function build() {
    const width = Math.max(320, stage.clientWidth);
    const compact = width < 700;
    const pad = compact ? 16 : 28, rowH = compact ? 72 : 80, top = 50;
    const height = top + recs.length * rowH + 46;
    const x = (t: number) => pad + ((t - t0) / (t1 - t0)) * (width - pad * 2);
    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`); svgEl.setAttribute('width', String(width)); svgEl.setAttribute('height', String(height));
    svgEl.replaceChildren(); labels.replaceChildren();
    const defs = svg('defs', {});
    defs.innerHTML = `<linearGradient id="stem-g" x1="0" x2="1"><stop offset="0" stop-color="var(--c-dapi)" stop-opacity=".2"/><stop offset=".5" stop-color="var(--c-cfp)"/><stop offset="1" stop-color="var(--c-sybr)"/></linearGradient>` +
      recs.filter(r => r.endPrecision === 'year').map(r => `<linearGradient id="fade-${r.id}" gradientUnits="userSpaceOnUse" x1="${x(r.end - 1)}" x2="${x(r.end)}"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="m-${r.id}"><rect x="0" y="0" width="${x(r.end - 1)}" height="${height}" fill="white"/><rect x="${x(r.end - 1)}" y="0" width="${x(r.end) - x(r.end - 1) + 2}" height="${height}" fill="url(#fade-${r.id})"/></mask>`).join('');
    svgEl.append(defs);
    // axis with year ticks
    const axisY = height - 26;
    const axis = svg('g', { class: 'axis' });
    axis.append(svg('line', { x1: x(t0), x2: x(t1), y1: axisY, y2: axisY }));
    for (let year = Math.ceil(t0); year <= Math.floor(t1); year++) {
      const xx = x(year);
      axis.append(svg('line', { x1: xx, x2: xx, y1: axisY - 4, y2: axisY + 4 }), svg('line', { class: 'grid', x1: xx, x2: xx, y1: top - 10, y2: axisY - 6 }));
      if (!compact || year % 2 === 0) { const label = svg('text', { x: xx, y: axisY + 18 }); label.textContent = String(year); axis.append(label); }
    }
    svgEl.append(axis);
    // stem
    const stem = svg('path', { class: 'stem', d: `M ${x(t0)} ${top - 14} C ${x(t0 + 1)} ${top - 20}, ${x(t0 + 2)} ${top - 8}, ${x(t1)} ${top - 14}` });
    svgEl.append(stem);
    const nowX = x(now.getFullYear() + now.getMonth() / 12);
    const nowLine = svg('line', { class: 'now', x1: nowX, x2: nowX, y1: top - 26, y2: axisY }); svgEl.append(nowLine);
    const nowText = svg('text', { class: 'now-text', x: nowX, y: top - 30 }); nowText.textContent = l.journey.present; svgEl.append(nowText);
    const rows: NonNullable<typeof geometry>['rows'] = [];
    recs.forEach((rec, i) => {
      const y = top + 46 + i * rowH;
      const sx = x(rec.start), ex = x(rec.end);
      const g = svg('g', { class: `branch branch--${rec.kind}`, 'data-rec': rec.id });
      if (rec.endPrecision === 'year') g.setAttribute('mask', `url(#m-${rec.id})`);
      // organic path: drop from the stem, then grow along time with a slight wave
      let d = `M ${sx - 8} ${top - 13} C ${sx - 6} ${y - 18}, ${sx - 2} ${y}, ${sx + 10} ${y}`;
      const steps = Math.max(2, Math.round((ex - sx) / 26));
      for (let k = 1; k <= steps; k++) { const px = sx + 10 + ((ex - sx - 10) * k) / steps; const py = y + Math.sin(k * 1.7 + i) * 1.6; d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`; }
      const path = svg('path', { class: 'hypha', d }) as SVGPathElement;
      g.append(path);
      // small lateral buds along long branches
      for (let k = 1; k < Math.floor((ex - sx) / 120); k++) { const bx = sx + k * 120; g.append(svg('path', { class: 'bud', d: `M ${bx} ${y} q 8 ${k % 2 ? -12 : 12} 18 ${k % 2 ? -16 : 16}`, 'data-at': (rec.start + ((bx - sx) / (ex - sx)) * (rec.end - rec.start)).toFixed(3) })); }
      const cell = svg('g', { class: 'cell', transform: `translate(${sx + 10} ${y})` });
      cell.append(svg('circle', { class: 'cell-body', r: 8 }), svg('circle', { class: 'cell-nucleus', r: 3.2 }));
      g.append(cell);
      const tip = svg('circle', { class: `tip${rec.endPrecision === 'present' ? ' tip--live' : ''}`, cx: ex, cy: y, r: rec.endPrecision === 'present' ? 5 : 3.2 });
      g.append(tip);
      svgEl.append(g);
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      rows.push({ rec, y, path, len, startX: sx, endX: ex });
      // label (HTML) above the branch
      const button = h('button', { type: 'button', class: `growth-label growth-label--${rec.kind}`, 'data-rec': rec.id, style: `top:${y - 46}px;` },
        h('strong', {}, rec.title), h('span', {}, `${rec.org} · ${rec.label}`));
      const leftPos = Math.min(Math.max(pad, sx + 4), width - Math.min(width * 0.9, 420) - pad);
      button.style.left = `${Math.max(pad, leftPos)}px`;
      button.style.maxWidth = `${Math.max(180, width - leftPos - pad)}px`;
      button.addEventListener('click', () => openRecord(rec.id, true));
      labels.append(button);
    });
    stage.style.height = `${height}px`;
    geometry = { x, rows };
    paint();
  }

  function paint() {
    if (!geometry) return;
    const t = playhead;
    yearOut.textContent = String(Math.min(now.getFullYear(), Math.floor(t)));
    if (document.activeElement !== scrub) scrub.value = String(Math.round(((t - t0) / (t1 - t0)) * 1000));
    scrub.style.setProperty('--p', `${(((t - t0) / (t1 - t0)) * 100).toFixed(2)}%`);
    for (const row of geometry.rows) {
      const frac = Math.max(0, Math.min(1, (t - row.rec.start) / (row.rec.end - row.rec.start)));
      const begun = t >= row.rec.start;
      row.path.style.strokeDashoffset = String(row.len * (1 - (begun ? 0.12 + frac * 0.88 : 0)));
      const g = row.path.parentElement!;
      g.classList.toggle('is-born', begun); g.classList.toggle('is-done', frac >= 1);
      g.classList.toggle('is-dim', filter !== 'all' && row.rec.kind !== filter);
      for (const bud of g.querySelectorAll<SVGPathElement>('.bud')) bud.classList.toggle('is-on', t >= Number(bud.dataset.at));
      const label = labels.querySelector<HTMLElement>(`[data-rec="${row.rec.id}"]`);
      if (label) { label.classList.toggle('is-born', begun); label.classList.toggle('is-dim', filter !== 'all' && row.rec.kind !== filter); }
    }
  }

  function setPlaying(on: boolean) {
    playing = on;
    for (const key of [playKey, cPlay]) { key.setAttribute('aria-pressed', String(on)); const span = key.querySelector('span:last-child'); if (span) span.textContent = on ? l.journey.pause : l.journey.play; }
    if (on && !raf) { let last = 0; const duration = ctx.motion() === 'gentle' ? 11 : 7; const stepFn = (time: number) => { raf = 0; const dt = last ? (time - last) / 1000 : 0; last = time; playhead = Math.min(t1, playhead + dt * (t1 - t0) / duration); paint(); if (playhead >= t1) { setPlaying(false); return; } if (playing) raf = requestAnimationFrame(stepFn); }; raf = requestAnimationFrame(stepFn); }
    if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function toggle() {
    if (playing) { setPlaying(false); return; }
    if (ctx.motion() === 'off') { playhead = t1; paint(); return; }
    if (playhead >= t1 - 0.01) playhead = t0;
    setPlaying(true);
  }

  function openRecord(id: string, scroll: boolean) {
    const row = section!.querySelector<HTMLElement>(`#record-${CSS.escape(id)}`);
    if (!row) return;
    const head = row.querySelector<HTMLButtonElement>('.log-head')!, detail = row.querySelector<HTMLElement>('.log-detail')!;
    head.setAttribute('aria-expanded', 'true'); detail.hidden = false; row.classList.add('is-open', 'is-flash');
    setTimeout(() => row.classList.remove('is-flash'), 1600);
    if (scroll) row.scrollIntoView({ block: 'center', behavior: ctx.motion() === 'off' ? 'instant' as ScrollBehavior : 'smooth' });
    for (const g of svgEl.querySelectorAll<SVGGElement>('.branch')) g.classList.toggle('is-focus', g.dataset.rec === id);
  }

  playKey.addEventListener('click', toggle);
  scrub.addEventListener('input', () => { setPlaying(false); playhead = t0 + (Number(scrub.value) / 1000) * (t1 - t0); paint(); });
  $$<HTMLButtonElement>('[data-journey-filter]', section).forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.journeyFilter as typeof filter;
    $$<HTMLButtonElement>('[data-journey-filter]', section).forEach(x => x.setAttribute('aria-checked', String(x === b)));
    for (const row of $$<HTMLElement>('.log-row', section)) row.classList.toggle('is-dim', filter !== 'all' && row.dataset.kind !== filter);
    paint();
  }));
  for (const head of $$<HTMLButtonElement>('.log-head', section)) head.addEventListener('click', () => {
    const open = head.getAttribute('aria-expanded') !== 'true';
    head.setAttribute('aria-expanded', String(open));
    const row = head.closest<HTMLElement>('.log-row')!; row.classList.toggle('is-open', open);
    (row.querySelector('.log-detail') as HTMLElement).hidden = !open;
    if (open) for (const g of svgEl.querySelectorAll<SVGGElement>('.branch')) g.classList.toggle('is-focus', g.dataset.rec === row.dataset.record);
  });
  bus.on('journey:open', id => openRecord(String(id), true));

  new ResizeObserver(() => build()).observe(stage);
  onVisible(section, visible => {
    if (!visible || grownOnce) return;
    grownOnce = true;
    if (ctx.motion() !== 'off' && !ctx.focus()) { playhead = t0; paint(); setTimeout(() => setPlaying(true), 250); }
  }, { rootMargin: '-20% 0px' });
  bus.on('station', id => { if (id === 'journey') requestAnimationFrame(build); });
  const hash = location.hash.startsWith('#record-') ? location.hash.slice(8) : new URL(location.href).searchParams.get('record');
  build();
  if (hash) { grownOnce = true; setTimeout(() => openRecord(hash, true), 500); }
}
