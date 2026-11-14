import type { Ctx } from '../context.ts';
import { $, $$, bus, onVisible } from '../ui.ts';
import { initialGel, step, bands, bandPosition, bandWidth, fluorescence, dyeOpacity, LANES, stainColor, formatClock, elapsedFor } from '../../scenes/gel-model.ts';
import type { GelState } from '../../scenes/gel-model.ts';
import type { GelScene } from '../../scenes/gel-scene.ts';
import { icon } from '../../render/icons.ts';

export function initHero(ctx: Ctx) {
  const found = $('#start');
  if (!found) return;
  const hero: HTMLElement = found;
  const { l } = ctx;
  let state: GelState = initialGel();
  let scene: GelScene | null = null;
  let visible = true, raf = 0, last = 0;
  const q = <T extends HTMLElement>(s: string) => $<T>(s, hero);
  const readout = (name: string) => q(`[data-readout="${name}"]`);
  const runKey = q<HTMLButtonElement>('[data-gel="run"]')!, uvKey = q<HTMLButtonElement>('[data-gel="uv"]')!;
  const volt = q<HTMLInputElement>('[data-gel="voltage"]')!, intensity = q<HTMLInputElement>('[data-gel="intensity"]')!, progress = q<HTMLInputElement>('[data-gel="progress"]')!;
  const fallback = hero.querySelector<SVGSVGElement>('.gel-fallback')!;

  /* Console mirror controls: real buttons bound to the same state. */
  const cRun = document.createElement('button'); cRun.type = 'button'; cRun.className = 'hardkey'; cRun.setAttribute('aria-pressed', 'false');
  cRun.innerHTML = `${icon('play', 'icon icon-play')}${icon('pause', 'icon icon-pause')}<span></span>`;
  const cUv = document.createElement('button'); cUv.type = 'button'; cUv.className = 'rocker'; cUv.setAttribute('role', 'switch'); cUv.setAttribute('aria-label', l.hero.uv);
  cUv.innerHTML = '<span class="rocker-face"><span>I</span><span>O</span></span>';
  const cReset = document.createElement('button'); cReset.type = 'button'; cReset.className = 'hardkey hardkey--small'; cReset.innerHTML = `${icon('reset')}<span class="sr-only">${l.hero.reset}</span>`;
  ctx.registerConsole('start', { controls: [cRun, cUv, cReset] });

  function sync() {
    const running = state.running;
    for (const key of [runKey, cRun]) { key.setAttribute('aria-pressed', String(running)); const label = key.querySelector('[data-run-label]') ?? key.querySelector('span:last-child'); if (label) label.textContent = running ? l.hero.pause : l.hero.run; }
    for (const key of [uvKey, cUv]) key.setAttribute('aria-checked', String(state.uvOn));
    $$<HTMLButtonElement>('[data-gel-stain]', hero).forEach(b => b.setAttribute('aria-checked', String(b.dataset.gelStain === state.stain)));
    $$<HTMLButtonElement>('[data-gel-view]', hero).forEach(b => b.setAttribute('aria-checked', String(b.dataset.gelView === state.view)));
    readout('volt')!.textContent = `${state.voltage} V`;
    readout('time')!.textContent = formatClock(state.elapsed);
    readout('uv')!.textContent = `UV ${state.uvOn ? Math.round(state.intensity * 100) + '%' : 'OFF'}`;
    readout('stain')!.textContent = state.stain === 'etbr' ? l.hero.etbr : l.hero.sybr;
    readout('status')!.textContent = state.running ? l.hero.status.running : state.progress >= 1 ? l.hero.status.done : state.progress > 0 ? l.hero.status.paused : l.hero.status.idle;
    if (document.activeElement !== progress) progress.value = String(Math.round(state.progress * 1000));
    hero.style.setProperty('--progress', state.progress.toFixed(4));
    hero.style.setProperty('--uv', (state.uvOn ? state.intensity : 0).toFixed(3));
    for (const input of [volt, intensity]) input.style.setProperty('--p', `${((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100}%`);
    scene?.setState(state);
    drawFallback();
  }

  // A short demo run on arrival: the samples leave the wells and pause mid-gel.
  let demoStop = -1;
  function tick(now: number) {
    raf = 0;
    const dt = Math.min(0.06, last ? (now - last) / 1000 : 0.016); last = now;
    state = step(state, dt);
    if (demoStop > 0 && state.progress >= demoStop) { state = { ...state, running: false }; demoStop = -1; }
    sync();
    if (state.running && visible) raf = requestAnimationFrame(tick);
  }
  function play() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }

  function setRunning(on: boolean) {
    if (on && state.progress >= 1) state = { ...state, progress: 0, elapsed: 0 };
    if (on && ctx.motion() === 'off') { state = { ...state, progress: 1, elapsed: elapsedFor(1, state.voltage), running: false }; sync(); return; }
    state = { ...state, running: on }; sync(); if (on) play();
  }
  const toggleUv = () => { state = { ...state, uvOn: !state.uvOn }; sync(); };
  const reset = () => { state = { ...initialGel(), uvOn: state.uvOn, intensity: state.intensity, stain: state.stain, view: state.view, voltage: state.voltage }; sync(); };

  runKey.addEventListener('click', () => { demoStop = -1; setRunning(!state.running); });
  cRun.addEventListener('click', () => { demoStop = -1; setRunning(!state.running); });
  uvKey.addEventListener('click', toggleUv); cUv.addEventListener('click', toggleUv);
  q('[data-gel="reset"]')!.addEventListener('click', reset); cReset.addEventListener('click', reset);
  volt.addEventListener('input', () => { state = { ...state, voltage: Number(volt.value) }; sync(); });
  intensity.addEventListener('input', () => { state = { ...state, intensity: Number(intensity.value) / 100, uvOn: Number(intensity.value) > 0 ? true : state.uvOn }; sync(); });
  progress.addEventListener('input', () => { const p = Number(progress.value) / 1000; state = { ...state, progress: p, elapsed: elapsedFor(p, state.voltage), running: false }; sync(); });
  $$<HTMLButtonElement>('[data-gel-stain]', hero).forEach(b => b.addEventListener('click', () => { state = { ...state, stain: b.dataset.gelStain as GelState['stain'] }; sync(); }));
  $$<HTMLButtonElement>('[data-gel-view]', hero).forEach(b => b.addEventListener('click', () => { state = { ...state, view: b.dataset.gelView as GelState['view'] }; hero.classList.toggle('is-top', state.view === 'top'); sync(); }));

  /* 2D fallback: the same model drawn as a top view (also used without WebGL). */
  function drawFallback() {
    if (!hero!.classList.contains('is-2d')) return;
    const W = 580, H = 400, gx = 70, gy = 50, gw = 440, gh = 300;
    const laneX = (i: number) => gx + 40 + i * ((gw - 80) / (LANES - 1));
    const wellY = gy + 26, endY = gy + gh - 12;
    const color = stainColor[state.stain];
    const uv = state.uvOn ? state.intensity : 0;
    let markup = `<defs><filter id="gel-glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    markup += `<rect x="20" y="10" width="${W - 40}" height="${H - 20}" rx="26" fill="var(--bg-3)" stroke="var(--line-2)"/>`;
    markup += `<rect x="${gx - 16}" y="${gy - 16}" width="${gw + 32}" height="${gh + 32}" rx="14" fill="rgba(110,70,255,${(0.1 + uv * 0.5).toFixed(2)})"/>`;
    markup += `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="8" fill="rgba(200,210,255,.14)" stroke="rgba(200,190,255,.35)"/>`;
    for (let i = 0; i < LANES; i++) markup += `<rect x="${laneX(i) - 22}" y="${wellY - 6}" width="44" height="8" rx="2" fill="rgba(30,25,70,.7)"/>`;
    for (const band of bands) {
      const pos = bandPosition(band, state.progress); if (pos > 1.02) continue;
      const y = wellY + pos * (endY - wellY); const thick = 4 + bandWidth(band, state.progress) * 14;
      if (band.kind === 'dna') { const f = fluorescence(band, state); if (f <= 0.01) continue; markup += `<rect x="${laneX(band.lane) - 20}" y="${(y - thick / 2).toFixed(1)}" width="40" height="${thick.toFixed(1)}" rx="2" fill="${color}" opacity="${Math.min(1, f).toFixed(2)}" filter="url(#gel-glow)"/>`; }
      else markup += `<rect x="${laneX(band.lane) - 20}" y="${(y - thick / 2).toFixed(1)}" width="40" height="${thick.toFixed(1)}" rx="3" fill="${band.dye === 'bromophenol' ? '#3d45ff' : '#2a8cff'}" opacity="${(dyeOpacity(band, state) * 0.45).toFixed(2)}"/>`;
    }
    markup += `<text x="${gx - 4}" y="${gy - 24}" fill="var(--ink-2)" font-size="11" font-family="var(--font-mono)">${l.hero.cathode}</text><text x="${gx - 4}" y="${gy + gh + 34}" fill="#ff6b7a" font-size="11" font-family="var(--font-mono)">${l.hero.anode}</text>`;
    fallback.setAttribute('viewBox', `0 0 ${W} ${H}`); fallback.innerHTML = markup;
  }

  /* Badge on a lanyard: a damped pendulum you can grab. */
  const rig = q('[data-badge]'), badge = rig?.querySelector<HTMLElement>('.badge'), lanyard = rig?.querySelector('path');
  if (rig && badge && lanyard) {
    let angle = 0, velocity = 0, dragging = false, startX = 0, startAngle = 0, moved = false, braf = 0, lastT = 0;
    const pivot = () => { const r = rig.getBoundingClientRect(); const b = badge.offsetTop; return { x: r.left + r.width / 2, y: r.top + b - 46, top: b }; };
    const drawLanyard = () => {
      const w = rig.clientWidth, cx = w / 2, top = badge.offsetTop;
      const py = top - 46; const rad = angle * Math.PI / 180;
      const clipX = cx - Math.sin(rad) * 32, clipY = py + Math.cos(rad) * 32;
      lanyard.setAttribute('d', `M ${cx - 26} 0 Q ${cx - 18} ${py * 0.85} ${clipX - 3} ${clipY} M ${cx + 26} 0 Q ${cx + 18} ${py * 0.85} ${clipX + 3} ${clipY}`);
      badge.style.setProperty('--swing', `${angle.toFixed(2)}deg`);
      badge.style.setProperty('--sheen', String(50 + angle * 4));
    };
    const animate = (now: number) => {
      braf = 0;
      const dt = Math.min(0.033, lastT ? (now - lastT) / 1000 : 0.016); lastT = now;
      if (!dragging) { const accel = -20 * angle - 1.3 * velocity; velocity += accel * dt; angle += velocity * dt; }
      drawLanyard();
      if (dragging || Math.abs(angle) > 0.05 || Math.abs(velocity) > 0.05) braf = requestAnimationFrame(animate); else { angle = 0; velocity = 0; drawLanyard(); }
    };
    const kick = () => { if (!braf && ctx.motion() !== 'off') { lastT = 0; braf = requestAnimationFrame(animate); } };
    badge.addEventListener('pointerdown', event => { if (ctx.motion() === 'off' || event.button !== 0) return; dragging = true; moved = false; startX = event.clientX; startAngle = angle; badge.setPointerCapture(event.pointerId); kick(); });
    badge.addEventListener('pointermove', event => {
      if (!dragging) return;
      const dx = event.clientX - startX; if (Math.abs(dx) > 4) moved = true;
      const p = pivot(); const len = Math.max(120, event.clientY - p.y);
      const target = startAngle + Math.atan2(-dx, len) * 180 / Math.PI * 1.3;
      velocity = (Math.max(-40, Math.min(40, target)) - angle) * 18; angle = Math.max(-40, Math.min(40, target));
    });
    const release = (event: PointerEvent) => { if (!dragging) return; dragging = false; badge.releasePointerCapture?.(event.pointerId); kick(); };
    badge.addEventListener('pointerup', release); badge.addEventListener('pointercancel', release);
    badge.addEventListener('click', event => { if (moved) { event.preventDefault(); event.stopImmediatePropagation(); moved = false; } }, true);
    let lastScroll = scrollY;
    addEventListener('scroll', () => { const d = scrollY - lastScroll; lastScroll = scrollY; if (scrollY < innerHeight && ctx.motion() === 'full') { velocity += Math.max(-30, Math.min(30, d * 0.6)); kick(); } }, { passive: true });
    hero.addEventListener('pointermove', event => { if (ctx.motion() !== 'full' || dragging) return; velocity += (event.movementX || 0) * 0.04; kick(); });
    // On narrow screens the badge hangs just below the copy, over the instrument, never over text.
    const place = () => {
      const narrow = hero!.clientWidth < 900;
      if (narrow) { const copy = q('.hero-copy')!; rig.style.top = `${copy.offsetTop + copy.offsetHeight + 6}px`; }
      else rig.style.removeProperty('top');
      drawLanyard();
    };
    new ResizeObserver(place).observe(hero);
    place();
    drawLanyard();
    setTimeout(() => { if (ctx.motion() === 'full') { velocity = 70; kick(); } }, 900);
  }

  /* 3D scene: lazy, after first paint. 2D fallback shows until it is ready (or forever without WebGL). */
  hero.classList.add('is-2d');
  hero.querySelector('.hero-caption')?.setAttribute('data-fallback', '');
  drawFallback();
  const slot = () => { const r = hero!.getBoundingClientRect(); const copy = q('.hero-copy')!.getBoundingClientRect(); const psu = q('.psu')!.getBoundingClientRect();
    const narrow = r.width < 900;
    if (narrow) return new DOMRect(r.left - r.width * 0.05, copy.bottom + 30, r.width * 1.1, Math.max(260, psu.top - copy.bottom - 40));
    let left = Math.max(copy.right - 40, r.left + r.width * 0.42);
    // Medium desktop widths: the hanging badge would hide the ladder lanes. Start the bench under the badge's
    // right half and let the tray bleed a little past the right edge instead of shrinking it.
    const medium = r.width < 1360;
    const rig = q('.badge-rig')?.getBoundingClientRect();
    if (medium && rig && rig.width) left = Math.max(left, rig.left + rig.width * 0.55);
    const right = medium ? r.right + r.width * 0.05 : r.right - 10;
    return new DOMRect(left, r.top + 70, right - left, Math.max(300, psu.top - r.top - 80)); };
  const load = async () => {
    try {
      const { createGelScene } = await import('../../scenes/gel-scene.ts');
      const lanes = Array.from({ length: LANES }, (_, i) => i === 0 ? l.hero.ladder : String(i));
      scene = createGelScene({ canvas: q<HTMLCanvasElement>('.gel-canvas')!, host: q('[data-gel-stage]')!, slot, labels: q('.gel-labels')!, theme: ctx.theme(), motion: ctx.motion(), text: { lanes, cathode: l.hero.cathode, anode: l.hero.anode } });
      if (!scene) throw new Error('WebGL unavailable');
      scene.setState(state);
      scene.setActive(visible);
      hero.classList.remove('is-2d'); hero.classList.add('is-3d');
    } catch {
      hero.classList.add('is-2d'); hero.querySelector('.hero-caption')?.setAttribute('data-fallback', l.hero.fallback); drawFallback();
    }
  };
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  // The Three.js chunk is only fetched once the bench is on screen or about to be (not for a deep link
  // to another station, and not while another Laboratory station is open).
  const stopPreload = onVisible(hero, near => {
    if (!near) return;
    stopPreload();
    if (idle) idle(() => void load(), { timeout: 900 }); else setTimeout(() => void load(), 250);
  }, { rootMargin: '900px 0px' });

  onVisible(hero, v => { visible = v && document.visibilityState === 'visible'; scene?.setActive(visible && (ctx.mode() === 'portfolio' || ctx.current() === 'start')); if (visible && state.running) play(); }, { rootMargin: '0px' });
  document.addEventListener('visibilitychange', () => { visible = document.visibilityState === 'visible'; scene?.setActive(visible); if (visible && state.running) play(); });
  bus.on('theme', theme => scene?.setTheme(theme as 'dark' | 'light'));
  bus.on('motion', motion => scene?.setMotion(motion as 'full' | 'gentle' | 'off'));
  bus.on('station', id => { if (ctx.mode() === 'lab') { scene?.setActive(id === 'start'); if (id === 'start') requestAnimationFrame(() => scene?.resize()); } });
  bus.on('mode', () => requestAnimationFrame(() => scene?.resize()));
    const deep = location.hash.length > 1 || ctx.current() !== 'start';
  if (ctx.motion() === 'full' && !ctx.focus() && !deep) { state = { ...state, progress: 0.02, running: true }; demoStop = 0.58; setTimeout(play, 600); }
  else state = { ...state, progress: 0.58, elapsed: elapsedFor(0.58, state.voltage) };
  sync();
}
