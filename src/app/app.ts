import { websiteContent } from '../content/generated.ts';
import type { Locale } from '../content/model.ts';
import { labels } from './i18n.ts';
import { readPreferences, savePreferences, parseRoute, stationUrl, storageKey, defaults } from './state.ts';
import type { Mode, Preferences, StorageLike } from './state.ts';
import { stationChannel } from './appearance.ts';
import type { StationId } from './appearance.ts';
import { $, $$, bus, h, toast, copyText, onVisible, trapFocus, isTyping } from './ui.ts';
import { icon } from '../render/icons.ts';
import { escapeHtml } from './format.ts';
import type { Ctx, ConsoleSpec } from './context.ts';
import { initPalette } from './palette.ts';
import { initFavorites } from './favorites.ts';
import { initHero } from './sections/hero.ts';
import { initProfile } from './sections/profile.ts';
import { initMethods } from './sections/methods.ts';
import { initJourney } from './sections/journey.ts';
import { initApparatus, initProjects } from './sections/projects.ts';
import { initTraining } from './sections/training.ts';
import { initLanguages, initContact } from './sections/small.ts';

const pad2 = (n: number) => String(n).padStart(2, '0');

function safeStorage(): StorageLike | null {
  try { const s = window.localStorage; const probe = `${storageKey}.probe`; s.setItem(probe, '1'); s.removeItem(probe); return s; } catch { return null; }
}

export function boot(): void {
  const root = document.documentElement;
  const locale: Locale = root.lang === 'de' ? 'de' : 'en';
  const content = websiteContent[locale];
  const l = labels[locale];
  const storage = safeStorage();
  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const prefs: Preferences = readPreferences(storage, reduceQuery.matches);
  const page = (root.dataset.page ?? 'home') as Ctx['page'];
  const stationEls = $$<HTMLElement>('.station');
  const stations = page === 'project' ? $$<HTMLAnchorElement>('.topnav a[data-nav]').map(a => a.dataset.nav!).filter(Boolean) : stationEls.map(el => el.id);
  if (page === 'project' && !stations.includes('start')) stations.unshift('start');
  let mode: Mode = root.dataset.mode === 'lab' ? 'lab' : 'portfolio';
  let current = root.dataset.station || 'start';
  let storageWarned = false;

  if (!storage && !storageWarned) { /* reported on first save attempt */ }
  const save = () => {
    if (savePreferences(storage, prefs)) return;
    if (!storageWarned) { storageWarned = true; toast(l.saved.storageFail); }
  };

  /* ───────── Theme, motion, focus ───────── */
  const resolvedTheme = (): 'dark' | 'light' => prefs.theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : prefs.theme;
  const motion = () => (root.dataset.motion as 'full' | 'gentle' | 'off') ?? 'full';
  function applyTheme(animate = false, origin?: { x: number; y: number }) {
    root.dataset.themePref = prefs.theme;
    const next = resolvedTheme();
    if (root.dataset.theme === next) { syncSettings(); return; }
    const swap = () => { root.dataset.theme = next; bus.emit('theme', next); syncSettings(); };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (animate && doc.startViewTransition && motion() !== 'off') {
      root.style.setProperty('--vt-x', `${origin?.x ?? innerWidth - 80}px`); root.style.setProperty('--vt-y', `${origin?.y ?? 30}px`);
      doc.startViewTransition(swap);
    } else swap();
  }
  function applyMotion() {
    const value = prefs.motionExplicit ? prefs.motion : reduceQuery.matches ? 'gentle' : 'full';
    if (root.dataset.motion !== value) { root.dataset.motion = value; bus.emit('motion', value); }
    syncSettings();
  }
  function applyFocus() { root.dataset.focus = prefs.focus ? 'on' : 'off'; bus.emit('focus', prefs.focus); syncSettings(); }
  darkQuery.addEventListener('change', () => { if (prefs.theme === 'system') applyTheme(true); });
  reduceQuery.addEventListener('change', () => { if (!prefs.motionExplicit) applyMotion(); });

  /* ───────── Settings sheet sync ───────── */
  function syncSettings() {
    const values: Record<string, string> = { mode, theme: prefs.theme, locale, motion: root.dataset.motion ?? 'full', focus: prefs.focus ? 'on' : 'off' };
    for (const button of $$<HTMLButtonElement>('[data-setting]')) button.setAttribute('aria-checked', String(values[button.dataset.setting!] === button.dataset.value));
    for (const button of $$<HTMLButtonElement>('[data-set-mode]')) button.setAttribute('aria-checked', String(button.dataset.setMode === mode));
    const toggle = $('[data-theme-toggle]');
    if (toggle) toggle.setAttribute('aria-label', `${l.theme.toggle} (${resolvedTheme() === 'dark' ? l.theme.dark : l.theme.light})`);
  }

  /* ───────── Console ───────── */
  const consoleEl = $('[data-console]');
  const specs = new Map<string, ConsoleSpec>();
  function renderConsole() {
    if (!consoleEl) return;
    consoleEl.hidden = false;
    const index = Math.max(0, stations.indexOf(current));
    $('[data-console-no]', consoleEl)!.textContent = pad2(index + 1);
    $('[data-console-name]', consoleEl)!.textContent = l.sections[current] ?? current;
    consoleEl.dataset.ch = stationChannel[current as StationId] ?? 'uv';
    const controls = specs.get(current)?.controls ?? [];
    $('[data-console-controls]', consoleEl)!.replaceChildren(...controls);
    const prev = $<HTMLButtonElement>('[data-console-prev]', consoleEl)!, next = $<HTMLButtonElement>('[data-console-next]', consoleEl)!;
    prev.disabled = index <= 0; next.disabled = index >= stations.length - 1;
    consoleEl.classList.toggle('is-away', current === 'start' && page !== 'project');
  }
  $('[data-console-prev]')?.addEventListener('click', () => { const i = stations.indexOf(current); if (i > 0) ctx.goTo(stations[i - 1]!, { focus: true }); });
  $('[data-console-next]')?.addEventListener('click', () => { const i = stations.indexOf(current); if (i < stations.length - 1) ctx.goTo(stations[i + 1]!, { focus: true }); });

  /* ───────── Navigation state ───────── */
  function markNav() {
    for (const a of $$<HTMLAnchorElement>('[data-nav]')) { if (a.dataset.nav === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }
    for (const a of $$<HTMLAnchorElement>('.labmap-list a[data-station-link]')) { if (mode === 'lab' && a.dataset.stationLink === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    for (const g of $$<SVGElement>('.lm-station')) g.classList.toggle('is-here', g.dataset.stationLink === current);
    root.dataset.station = current;
  }
  function localeHref(target: Locale): string {
    if (page === 'project') return `/${target}/projects/${encodeURIComponent($('[data-project-page]')?.dataset.projectPage ?? '')}/`;
    const skill = new URL(location.href).searchParams.get('skill');
    const mapped = skill ? mapSkill(skill, locale, target) : null;
    return stationUrl(target, mode, current, { skill: mapped, bench: prefs.bench });
  }
  function updateLocaleLinks() { for (const a of $$<HTMLAnchorElement>('[data-locale-link]')) a.href = localeHref(a.dataset.localeLink as Locale); }
  function currentQuery() { const q = new URL(location.href).searchParams; return { skill: q.get('skill'), bench: (q.get('bench') as 'workbench' | 'instruments' | null) }; }
  function writeUrl(push: boolean) {
    if (page === 'project') return;
    const q = currentQuery();
    const url = stationUrl(locale, mode, current, { skill: current === 'methods' ? q.skill : null, bench: current === 'methods' ? q.bench : null });
    const recordHash = mode === 'portfolio' && location.hash.startsWith('#record-') && current === 'journey' ? location.hash : '';
    const finalUrl = recordHash ? url.replace(/#.*$/u, '') + recordHash : url;
    if (finalUrl === location.pathname + location.search + location.hash) return;
    (push ? history.pushState : history.replaceState).call(history, { station: current, mode }, '', finalUrl);
    updateLocaleLinks();
  }

  function activateLab(id: string, options: { push?: boolean; focus?: boolean } = {}) {
    if (!stations.includes(id)) id = 'start';
    const changed = id !== current || !stationEls.some(el => el.classList.contains('is-active'));
    current = id;
    for (const el of stationEls) el.classList.toggle('is-active', el.id === id);
    const active = stationEls.find(el => el.id === id);
    if (changed && active && motion() !== 'off') { active.classList.remove('is-entering'); void active.offsetWidth; active.classList.add('is-entering'); }
    markNav(); renderConsole();
    writeUrl(!!options.push);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    if (options.focus && active) { active.setAttribute('tabindex', '-1'); active.focus({ preventScroll: true }); }
    document.title = `${content.person.name} — ${id === 'start' ? (content.person.headlines[0] ?? '') : l.sections[id]}`;
    bus.emit('station', id);
  }

  function scrollToStation(id: string, smooth: boolean) {
    const el = document.getElementById(id);
    if (!el) return;
    const behavior: ScrollBehavior = smooth && motion() !== 'off' ? 'smooth' : 'instant' as ScrollBehavior;
    if (id === 'start') window.scrollTo({ top: 0, behavior }); else el.scrollIntoView({ behavior, block: 'start' });
  }

  function setMode(next: Mode) {
    prefs.mode = next; save();
    if (page === 'project') { location.href = next === 'lab' ? `/${locale}/lab/projects/` : `/${locale}/#projects`; return; }
    if (next === mode) { syncSettings(); return; }
    const station = current;
    mode = next; root.dataset.mode = next;
    if (next === 'lab') activateLab(station, { push: true });
    else {
      for (const el of stationEls) el.classList.remove('is-active', 'is-entering');
      current = station; markNav(); renderConsole(); writeUrl(true);
      requestAnimationFrame(() => scrollToStation(station, false));
    }
    syncSettings(); bus.emit('mode', next); bus.emit('station', current);
  }

  /* Track the station in view (portfolio). */
  if (page === 'home' || page === 'lab') {
    let replaceTimer = 0;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(entries => {
      if (mode !== 'portfolio') return;
      for (const entry of entries) visible.set((entry.target as HTMLElement).id, entry.isIntersecting ? entry.intersectionRect.height : 0);
      let best = current, bestH = 0;
      for (const [id, height] of visible) if (height > bestH) { best = id; bestH = height; }
      if (bestH > 0 && best !== current) {
        current = best; markNav(); renderConsole(); bus.emit('station', current);
        clearTimeout(replaceTimer); replaceTimer = window.setTimeout(() => writeUrl(false), 250);
      }
    }, { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.01, 0.2, 0.5, 1] });
    stationEls.forEach(el => io.observe(el));
  }

  /* ───────── Context ───────── */
  const ctx: Ctx = {
    content, locale, l, prefs, page, stations,
    mode: () => mode, theme: resolvedTheme, motion, focus: () => prefs.focus,
    current: () => current,
    save,
    goTo(id, options = {}) {
      if (page === 'project') { location.href = mode === 'lab' ? `/${locale}/lab/${id === 'start' ? '' : `${id}/`}` : `/${locale}/${id === 'start' ? '' : `#${id}`}`; return; }
      if (mode === 'lab') { activateLab(id, { push: !options.replace, focus: options.focus }); return; }
      current = id; markNav(); renderConsole(); writeUrl(!options.replace);
      scrollToStation(id, !options.instant);
      if (options.focus) { const el = document.getElementById(id); el?.setAttribute('tabindex', '-1'); setTimeout(() => el?.focus({ preventScroll: true }), motion() === 'off' ? 0 : 450); }
      bus.emit('station', id);
    },
    registerConsole(station, spec) { specs.set(station, spec); if (station === current) renderConsole(); },
    refreshConsole: renderConsole,
    setQuery(params) {
      const url = new URL(location.href);
      for (const [key, value] of Object.entries(params)) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); }
      if (mode === 'portfolio' && page === 'home' && current === 'methods') url.hash = 'methods';
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      updateLocaleLinks();
    },
    favorites: { has: () => false, toggle: () => false },
  };

  /* ───────── Links & controls ───────── */
  document.addEventListener('click', event => {
    const target = event.target as Element;
    const link = target.closest<HTMLAnchorElement>('a[data-nav], a[data-goto], a[data-station-link], a[data-nav-home]');
    if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
      const id = link.dataset.nav ?? link.dataset.goto ?? link.dataset.stationLink ?? 'start';
      if (page === 'project' && !link.dataset.goto) return; // real navigation back to the home page
      event.preventDefault(); closeSheets();
      if (link.dataset.stationLink && mode !== 'lab') { setMode('lab'); ctx.goTo(id, { focus: true }); return; }
      ctx.goTo(id, { focus: !link.dataset.navHome && id !== 'start' });
      return;
    }
    const modeLink = target.closest<HTMLAnchorElement>('a[data-mode-link]');
    if (modeLink) { event.preventDefault(); setMode(modeLink.dataset.modeLink as Mode); return; }
    const modeButton = target.closest<HTMLButtonElement>('[data-set-mode]');
    if (modeButton) { setMode(modeButton.dataset.setMode as Mode); return; }
    const setting = target.closest<HTMLButtonElement>('[data-setting]');
    if (setting) { applySetting(setting.dataset.setting!, setting.dataset.value!, setting); return; }
    const themeToggle = target.closest<HTMLButtonElement>('[data-theme-toggle]');
    if (themeToggle) { const r = themeToggle.getBoundingClientRect(); prefs.theme = resolvedTheme() === 'dark' ? 'light' : 'dark'; save(); applyTheme(true, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); return; }
    const copy = target.closest<HTMLElement>('[data-copy]');
    if (copy) { void doCopy(copy.dataset.copy!, copy, l.actions.copied); return; }
    const copyLink = target.closest<HTMLElement>('[data-copy-link]');
    if (copyLink) {
      const hash = copyLink.dataset.copyLink ?? '';
      const url = new URL(hash && page !== 'project' ? `/${locale}/${hash}` : location.href, location.origin);
      void doCopy(url.href, copyLink, l.actions.linkCopied); return;
    }
    const opener = target.closest<HTMLElement>('[data-open]');
    if (opener) { const name = opener.dataset.open!; if (name === 'palette') bus.emit('palette:open'); else openSheet(name, opener); return; }
    if (target.closest('[data-close]') || target.closest('[data-scrim]')) { closeSheets(); return; }
    const localeLink = target.closest<HTMLAnchorElement>('[data-locale-link]');
    if (localeLink) { prefs.locale = localeLink.dataset.localeLink as Locale; save(); localeLink.href = localeHref(prefs.locale); return; }
    if (target.closest('[data-clear-storage]')) {
      try { storage?.removeItem?.(storageKey); } catch { /* ignore */ }
      Object.assign(prefs, { ...defaults, favorites: [], motion: reduceQuery.matches ? 'gentle' : 'full' });
      applyTheme(true); applyMotion(); applyFocus(); bus.emit('favorites'); toast(l.settings.cleared); return;
    }
    if (target.closest('[data-replay-intro]')) { closeSheets(); showIntro(true); return; }
    if (target.closest('[data-labmap-toggle]')) { const map = $('[data-labmap]'); const open = !map?.classList.contains('is-open'); map?.classList.toggle('is-open', open); target.closest('[data-labmap-toggle]')!.setAttribute('aria-expanded', String(open)); }
  });

  async function doCopy(text: string, el: HTMLElement, message: string) {
    const ok = await copyText(text);
    if (ok) { el.setAttribute('data-copied', ''); toast(`${message}: ${text.length > 48 ? `${text.slice(0, 46)}…` : text}`); setTimeout(() => el.removeAttribute('data-copied'), 1800); }
    else toast(l.actions.copyFail);
  }

  function applySetting(name: string, value: string, el: HTMLElement) {
    if (name === 'mode') setMode(value as Mode);
    else if (name === 'theme') { const r = el.getBoundingClientRect(); prefs.theme = value as Preferences['theme']; save(); applyTheme(true, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); }
    else if (name === 'motion') { prefs.motion = value as Preferences['motion']; prefs.motionExplicit = true; save(); applyMotion(); }
    else if (name === 'focus') { prefs.focus = value === 'on'; save(); applyFocus(); }
    else if (name === 'locale' && value !== locale) { prefs.locale = value as Locale; save(); location.href = localeHref(value as Locale); }
  }

  /* ───────── Sheets ───────── */
  let lastOpener: HTMLElement | null = null;
  function openSheet(name: string, opener?: HTMLElement) {
    closeSheets(false);
    const sheet = $(`[data-sheet="${name}"]`);
    if (!sheet) return;
    lastOpener = opener ?? (document.activeElement as HTMLElement | null);
    $('[data-scrim]')!.hidden = false; sheet.hidden = false;
    root.classList.add('has-sheet');
    if (name === 'menu') for (const a of $$<HTMLAnchorElement>('a[data-nav]', sheet)) { if (a.dataset.nav === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }
    setTimeout(() => ($('[data-close]', sheet) as HTMLElement | null)?.focus(), 30);
    bus.emit('sheet', name);
  }
  function closeSheets(restore = true) {
    const open = $$('[data-sheet]').filter(s => !s.hidden);
    if (!open.length) return;
    open.forEach(s => { s.hidden = true; });
    $('[data-scrim]')!.hidden = true; root.classList.remove('has-sheet');
    if (restore) lastOpener?.focus?.();
  }
  bus.on('sheet:open', name => openSheet(String(name)));
  document.addEventListener('keydown', event => {
    const sheet = $$('[data-sheet]').find(s => !s.hidden);
    if (sheet) { if (event.key === 'Escape') { event.preventDefault(); closeSheets(); } else trapFocus(sheet, event); return; }
    if ((event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey)) { event.preventDefault(); bus.emit('palette:open'); return; }
    if (event.key === '/' && !isTyping(event.target) && !event.ctrlKey && !event.metaKey) { event.preventDefault(); bus.emit('palette:open'); }
  });

  /* ───────── History ───────── */
  addEventListener('popstate', () => {
    const route = parseRoute(new URL(location.href), locale);
    if (page === 'project') return;
    const nextMode: Mode = route.page === 'lab' ? 'lab' : 'portfolio';
    if (nextMode !== mode) { mode = nextMode; root.dataset.mode = mode; syncSettings(); bus.emit('mode', mode); }
    const id = route.station && stations.includes(route.station) ? route.station : 'start';
    if (mode === 'lab') { current = id; for (const el of stationEls) el.classList.toggle('is-active', el.id === id); markNav(); renderConsole(); window.scrollTo({ top: 0 }); bus.emit('station', id); }
    else { for (const el of stationEls) el.classList.remove('is-active'); current = id; markNav(); renderConsole(); scrollToStation(id, false); bus.emit('station', id); }
    bus.emit('route', route);
    updateLocaleLinks();
  });

  /* ───────── Transfers & intro ───────── */
  for (const el of $$('.transfer')) onVisible(el, visible => el.classList.toggle('is-live', visible && motion() !== 'off'));
  bus.on('motion', () => { if (motion() === 'off') $$('.transfer').forEach(el => el.classList.remove('is-live')); });

  function showIntro(force = false) {
    const intro = $('[data-intro]');
    if (!intro) return;
    let seen = false;
    try { seen = sessionStorage.getItem('mahsa-intro') === '1'; } catch { seen = true; }
    const route = parseRoute(new URL(location.href), locale);
    const deep = !!(route.station && route.station !== 'start') || !!route.skill || !!route.record || location.hash.length > 1;
    if (!force && (seen || deep || motion() === 'off' || prefs.focus || page !== 'home')) return;
    try { sessionStorage.setItem('mahsa-intro', '1'); } catch { /* ignore */ }
    intro.hidden = false; intro.classList.remove('is-leaving');
    intro.style.animation = 'none'; void intro.offsetWidth; intro.style.animation = '';
    const done = () => { intro.classList.add('is-leaving'); setTimeout(() => { intro.hidden = true; }, 360); document.removeEventListener('keydown', onKey); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') done(); };
    document.addEventListener('keydown', onKey);
    $('[data-intro-skip]', intro)!.onclick = done;
    intro.onclick = event => { if (event.target === intro) done(); };
    setTimeout(() => { if (!intro.hidden) { intro.hidden = true; document.removeEventListener('keydown', onKey); } }, 3200);
    ($('[data-intro-skip]', intro) as HTMLElement).focus({ preventScroll: true });
  }

  /* Top bar adapts to the real width of its labels (German labels are longer). */
  const topbar = $('[data-topbar]');
  const fitTopbar = () => {
    if (!topbar) return;
    topbar.classList.remove('is-c1', 'is-c2', 'is-c3');
    for (const level of ['is-c1', 'is-c2', 'is-c3']) { if (topbar.scrollWidth <= topbar.clientWidth + 1) break; topbar.classList.add(level); }
  };
  new ResizeObserver(fitTopbar).observe(document.body);
  document.fonts?.ready.then(fitTopbar);

  /* Range inputs styled as faders show their fill level. */
  const paintFader = (input: HTMLInputElement) => input.style.setProperty('--p', `${((Number(input.value) - Number(input.min || 0)) / ((Number(input.max || 100) - Number(input.min || 0)) || 1)) * 100}%`);
  document.addEventListener('input', event => { const t = event.target as HTMLInputElement; if (t.type === 'range') paintFader(t); });
  $$<HTMLInputElement>('input[type="range"]').forEach(paintFader);
  bus.on('fader:paint', () => $$<HTMLInputElement>('input[type="range"]').forEach(paintFader));

  /* ───────── Start ───────── */
  applyTheme(false); applyMotion(); applyFocus();
  const favorites = initFavorites(ctx);
  ctx.favorites = favorites;
  initPalette(ctx);
  // Each station boots on its own: one failing scene never takes the rest of the site down.
  const safely = (name: string, fn: (c: Ctx) => void) => { try { fn(ctx); } catch (error) { console.error(`[${name}]`, error); } };
  if (page === 'home' || page === 'lab') {
    safely('hero', initHero); safely('profile', initProfile); safely('methods', initMethods); safely('journey', initJourney);
    safely('projects', initProjects); safely('training', initTraining); safely('languages', initLanguages); safely('contact', initContact);
  }
  safely('apparatus', initApparatus);
  if (page === 'project') {
    const id = $('[data-project-page]')?.dataset.projectPage ?? '';
    const index = content.projects.findIndex(project => project.id === id);
    const next = content.projects[index + 1] ?? content.projects[0];
    const back = h('a', { class: 'hardkey', href: `/${locale}/#projects`, 'aria-label': l.projects.back, html: `${icon('arrowLeft')}<span>${escapeHtml(l.projects.back)}</span>` });
    const controls: HTMLElement[] = [back];
    if (next && next.id !== id) controls.push(h('a', { class: 'hardkey', href: `/${locale}/projects/${encodeURIComponent(next.id)}/`, 'aria-label': l.project.next, html: `<span>${escapeHtml(l.project.next)}</span>${icon('arrowRight')}` }));
    current = 'projects'; specs.set('projects', { controls });
  }

  const route = parseRoute(new URL(location.href), locale);
  if (page === 'lab') activateLab(route.station && stations.includes(route.station) ? route.station : 'start', {});
  else {
    markNav(); renderConsole();
    if (page === 'home' && route.station && stations.includes(route.station)) {
      current = route.station; markNav(); renderConsole();
      requestAnimationFrame(() => scrollToStation(route.station!, false));
    }
  }
  updateLocaleLinks(); syncSettings();
  bus.emit('route', route);
  showIntro();
  root.classList.add('is-ready');
}

/** Skills keep their position across languages: same group, same index. */
export function mapSkill(id: string, from: Locale, to: Locale): string | null {
  if (from === to) return id;
  const source = websiteContent[from], target = websiteContent[to];
  for (const [ci, category] of source.skills.entries()) for (const [gi, group] of category.groups.entries()) {
    const index = group.items.findIndex(item => item.id === id);
    if (index >= 0) return target.skills[ci]?.groups[gi]?.items[index]?.id ?? null;
  }
  return null;
}
