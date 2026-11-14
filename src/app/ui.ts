/** Small DOM helpers shared by all modules. */
export const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector);
export const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [...root.querySelectorAll<T>(selector)];

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | boolean | number | undefined | null> = {}, ...children: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key === 'html') el.innerHTML = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(child);
  return el;
}

type Handler = (detail?: unknown) => void;
const handlers = new Map<string, Set<Handler>>();
export const bus = {
  on(event: string, fn: Handler) { if (!handlers.has(event)) handlers.set(event, new Set()); handlers.get(event)!.add(fn); return () => handlers.get(event)!.delete(fn); },
  emit(event: string, detail?: unknown) { handlers.get(event)?.forEach(fn => { try { fn(detail); } catch (error) { console.error(error); } }); },
};

let toastTimer = 0;
export function toast(message: string): void {
  const el = $('[data-toast]');
  if (!el) return;
  el.innerHTML = '';
  el.append(h('i', { class: 'led', 'aria-hidden': 'true' }), h('span', {}, message));
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-on'), 2400);
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
  try {
    const area = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0;left:-9999px' }) as HTMLTextAreaElement;
    area.value = text; document.body.append(area); area.select();
    const ok = document.execCommand('copy'); area.remove(); return ok;
  } catch { return false; }
}

/** Run `fn` while `el` is on screen; returns a stop function. */
export function onVisible(el: Element, fn: (visible: boolean) => void, options: IntersectionObserverInit = { rootMargin: '120px 0px' }): () => void {
  const io = new IntersectionObserver(entries => entries.forEach(entry => fn(entry.isIntersecting)), options);
  io.observe(el);
  return () => io.disconnect();
}

/** Focus trap for sheets/dialog-like panels. */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const items = $$<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', container).filter(el => el.offsetParent !== null);
  if (!items.length) return;
  const first = items[0]!, last = items[items.length - 1]!;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

export const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase();

/** rAF loop that only runs while visible, the tab is shown and motion is allowed. */
export function sceneLoop(el: Element, draw: (dt: number, t: number) => void, allowed: () => boolean): { refresh(): void; stop(): void } {
  let visible = false, raf = 0, last = 0, t = 0;
  const safeDraw = (dt: number) => {
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    if (rect && (rect.width < 24 || rect.height < 24)) return; // hidden (e.g. another lab station): nothing to draw
    try { draw(dt, t); } catch (error) { console.error(error); }
  };
  const tick = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now; t += dt;
    safeDraw(dt);
    if (visible && allowed() && document.visibilityState === 'visible') raf = requestAnimationFrame(tick);
  };
  const refresh = () => {
    if (visible && allowed() && document.visibilityState === 'visible') { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
    else { if (raf) cancelAnimationFrame(raf); raf = 0; safeDraw(0); }
  };
  const stopIo = onVisible(el, v => { visible = v; refresh(); });
  document.addEventListener('visibilitychange', refresh);
  return { refresh, stop() { stopIo(); document.removeEventListener('visibilitychange', refresh); if (raf) cancelAnimationFrame(raf); } };
}

/** Canvas sized to its CSS box at a capped device-pixel ratio. */
export function fitCanvas(canvas: HTMLCanvasElement, maxRatio = 2): { w: number; h: number; ctx: CanvasRenderingContext2D } {
  const ratio = Math.min(window.devicePixelRatio || 1, maxRatio);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width)), hgt = Math.max(1, Math.round(rect.height));
  if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(hgt * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(hgt * ratio); }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { w, h: hgt, ctx };
}
