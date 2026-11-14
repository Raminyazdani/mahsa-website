import type { Ctx } from '../context.ts';
import { $, $$, bus, h, normalize } from '../ui.ts';
import { parseRoute } from '../state.ts';
import type { BenchView } from '../state.ts';
import { icon } from '../../render/icons.ts';
import { escapeHtml as e } from '../format.ts';

interface SkillInfo { id: string; name: string; shortName: string; group: string; groupTitle: string; category: string; categoryTitle: string; pos: string; text: string; tags: string[] }

/** Methods: one data set, two bench views (Workbench / Group instruments) sharing search, filter and selection. */
export function initMethods(ctx: Ctx) {
  const found = $('#methods');
  if (!found) return;
  const section: HTMLElement = found;
  const { content, l } = ctx;
  const skills: SkillInfo[] = [];
  for (const category of content.skills) for (const group of category.groups) group.items.forEach((item, index) => skills.push({
    id: item.id, name: item.name, shortName: item.shortName, group: group.id, groupTitle: group.title, category: category.id, categoryTitle: category.title,
    pos: `${group.id}~${index}`, text: normalize(`${item.name} ${item.shortName} ${group.title} ${category.title}`), tags: item.tags }));
  const byId = new Map(skills.map(skill => [skill.id, skill]));
  const total = skills.length;

  const route = parseRoute(new URL(location.href), ctx.locale);
  let view: BenchView = route.bench ?? ctx.prefs.bench;
  let query = '';
  const filters = new Set<string>();
  let selected: string | null = route.skill && byId.has(route.skill) ? route.skill : null;

  const input = $<HTMLInputElement>('[data-bench-search]', section)!;
  const count = $('[data-bench-count]', section)!, empty = $('[data-bench-empty]', section)!, clear = $<HTMLButtonElement>('[data-bench-clear]', section)!;
  const ticket = $('[data-ticket]', section)!;
  const panels = { workbench: $('[data-bench-panel="workbench"]', section)!, instruments: $('[data-bench-panel="instruments"]', section)! };

  /* Console: view switch + search + clear */
  const cView = h('div', { class: 'selector selector--mini', role: 'radiogroup', 'aria-label': l.methods.view },
    h('button', { type: 'button', role: 'radio', 'data-v': 'workbench' }, l.methods.workbench), h('button', { type: 'button', role: 'radio', 'data-v': 'instruments' }, l.methods.instruments));
  cView.addEventListener('click', event => { const b = (event.target as Element).closest<HTMLButtonElement>('[data-v]'); if (b) setView(b.dataset.v as BenchView); });
  const cSearch = h('button', { type: 'button', class: 'hardkey hardkey--small', html: `${icon('search')}<span class="sr-only">${e(l.methods.search)}</span>` });
  cSearch.addEventListener('click', () => { input.scrollIntoView({ block: 'center', behavior: ctx.motion() === 'off' ? 'instant' as ScrollBehavior : 'smooth' }); input.focus({ preventScroll: true }); });
  const cClear = h('button', { type: 'button', class: 'hardkey hardkey--small', hidden: true, html: `${icon('reset')}<span>${e(l.methods.clear)}</span>` });
  cClear.addEventListener('click', () => clearAll());
  ctx.registerConsole('methods', { controls: [cView, cSearch, cClear] });

  function setView(next: BenchView, persist = true) {
    view = next;
    panels.workbench.hidden = view !== 'workbench'; panels.instruments.hidden = view !== 'instruments';
    $$<HTMLButtonElement>('[data-bench-view]', section).forEach(b => b.setAttribute('aria-checked', String(b.dataset.benchView === view)));
    cView.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === view)));
    section!.dataset.view = view;
    if (persist) { ctx.prefs.bench = view; ctx.save(); ctx.setQuery({ bench: view === 'workbench' ? null : view }); }
    apply(); paintSelection();
  }

  function apply() {
    const tokens = normalize(query.trim()).split(/\s+/u).filter(Boolean);
    let shown = 0;
    const matchById = new Map<string, boolean>();
    for (const skill of skills) {
      const inFilter = !filters.size || filters.has(skill.category);
      const inQuery = !tokens.length || tokens.every(token => skill.text.includes(token));
      const match = inFilter && inQuery;
      matchById.set(skill.id, match);
      if (match) shown++;
    }
    for (const el of $$<HTMLElement>('[data-skill]', section)) {
      const match = matchById.get(el.dataset.skill!) ?? false;
      el.toggleAttribute('data-dim', !match);
      el.toggleAttribute('data-hit', match && tokens.length > 0);
    }
    for (const el of $$<SVGElement>('[data-skill-mark]', section)) { const m = matchById.get(el.dataset.skillMark!) ?? false; el.classList.toggle('is-dim', !m); el.classList.toggle('is-hit', m && tokens.length > 0); }
    // Hide whole zones / instruments that have nothing to show only when a filter is active (data never disappears without a visible reason).
    for (const zone of $$<HTMLElement>('.zone-group, .inst', section)) zone.toggleAttribute('data-empty', !$$<HTMLElement>('[data-skill]:not([data-dim])', zone).length);
    count.textContent = l.methods.count(shown, total);
    empty.hidden = shown > 0;
    const active = !!tokens.length || filters.size > 0;
    clear.hidden = !active; cClear.hidden = !active;
    section!.classList.toggle('is-uv', tokens.length > 0);
    $$<HTMLButtonElement>('[data-filter]', section).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all' ? filters.size === 0 : filters.has(b.dataset.filter!))));
  }

  function clearAll() { query = ''; input.value = ''; filters.clear(); apply(); }

  function paintSelection() {
    for (const el of $$<HTMLElement>('[data-skill]', section)) el.setAttribute('aria-pressed', String(el.dataset.skill === selected));
    for (const el of $$<SVGElement>('[data-skill-mark]', section)) el.classList.toggle('is-selected', el.dataset.skillMark === selected);
    const skill = selected ? byId.get(selected) : null;
    if (!skill) { ticket.innerHTML = `<p class="ticket-empty">${e(l.methods.select)}</p>`; return; }
    const related = content.projects.filter(project => skill.tags.length && project.tags.some(tag => skill.tags.includes(tag)));
    ticket.innerHTML = `
      <p class="ticket-kicker"><i class="led" aria-hidden="true"></i>${e(l.methods.selected)}</p>
      <h3 class="ticket-title">${e(skill.name)}</h3>
      <dl class="ticket-rows"><div><dt>${e(l.methods.category)}</dt><dd>${e(skill.categoryTitle)}</dd></div><div><dt>${e(l.methods.group)}</dt><dd>${e(skill.groupTitle)}</dd></div></dl>
      <p class="ticket-note">${e(l.methods.inCv)} <strong>${e(skill.categoryTitle)} › ${e(skill.groupTitle)}</strong>.</p>
      <div class="ticket-related"><p class="mono-label">${e(l.methods.related)}</p>${related.length ? `<ul>${related.map(project => `<li><a href="/${ctx.locale}/projects/${encodeURIComponent(project.id)}/">${e(project.title)}</a></li>`).join('')}</ul>` : `<p class="muted small">${e(l.methods.relatedNone)}</p>`}</div>
      <div class="ticket-actions"><button type="button" class="star" data-fav="skill:${e(skill.pos)}" data-fav-title="${e(skill.name)}" aria-pressed="false">${icon('star')}<span class="star-text">${e(l.saved.save)}</span></button><button type="button" class="textkey" data-copy-link="?skill=${encodeURIComponent(skill.id)}#methods">${icon('link')}${e(l.actions.copyLink)}</button></div>
      <div class="ticket-tear" aria-hidden="true"></div>`;
    bus.emit('favorites');
    ticket.classList.remove('is-printing'); void ticket.offsetWidth; ticket.classList.add('is-printing');
  }

  function select(id: string | null, updateUrl = true) {
    selected = id && byId.has(id) ? id : null;
    paintSelection();
    if (updateUrl) ctx.setQuery({ skill: selected });
  }

  /* Events */
  input.addEventListener('input', () => { query = input.value; apply(); });
  input.addEventListener('keydown', event => { if (event.key === 'Escape' && input.value) { event.stopPropagation(); input.value = ''; query = ''; apply(); } });
  clear.addEventListener('click', clearAll);
  section.addEventListener('click', event => {
    const target = event.target as Element;
    const filter = target.closest<HTMLButtonElement>('[data-filter]');
    if (filter) { const id = filter.dataset.filter!; if (id === 'all') filters.clear(); else if (filters.has(id)) filters.delete(id); else filters.add(id); apply(); return; }
    const v = target.closest<HTMLButtonElement>('[data-bench-view]');
    if (v) { setView(v.dataset.benchView as BenchView); return; }
    const item = target.closest<HTMLElement>('[data-skill]');
    if (item) { select(item.dataset.skill === selected ? null : item.dataset.skill!); return; }
    const mark = target.closest<SVGElement>('[data-skill-mark]');
    if (mark) select(mark.dataset.skillMark!);
  });
  section.addEventListener('pointerover', event => {
    const el = (event.target as Element).closest<HTMLElement>('[data-skill], [data-skill-mark]');
    const id = el?.dataset.skill ?? (el as SVGElement | null)?.dataset?.skillMark ?? null;
    for (const m of $$<SVGElement>('[data-skill-mark]', section)) m.classList.toggle('is-hover', m.dataset.skillMark === id);
    for (const s of $$<HTMLElement>('.inst [data-skill]', section)) s.classList.toggle('is-hover', s.dataset.skill === id);
  });
  /* Roving arrow-key focus across visible items of the active view */
  section.addEventListener('keydown', event => {
    const item = (event.target as Element).closest<HTMLElement>('[data-skill]');
    if (!item || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const list = $$<HTMLElement>('[data-skill]', panels[view]).filter(el => !el.hasAttribute('data-dim') && el.offsetParent !== null);
    const i = list.indexOf(item); if (i < 0) return;
    event.preventDefault();
    let next = i;
    if (event.key === 'Home') next = 0; else if (event.key === 'End') next = list.length - 1;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = i + (event.key === 'ArrowRight' ? 1 : -1);
    else {
      const r = item.getBoundingClientRect(); const down = event.key === 'ArrowDown';
      const candidates = list.map((el, index) => ({ index, r: el.getBoundingClientRect() })).filter(c => down ? c.r.top > r.top + 4 : c.r.top < r.top - 4);
      candidates.sort((a, b) => (Math.abs(a.r.top - r.top) - Math.abs(b.r.top - r.top)) || (Math.abs(a.r.left - r.left) - Math.abs(b.r.left - r.left)));
      const rowTop = candidates[0]?.r.top;
      const row = candidates.filter(c => Math.abs(c.r.top - (rowTop ?? 0)) < 6).sort((a, b) => Math.abs(a.r.left - r.left) - Math.abs(b.r.left - r.left));
      next = row[0]?.index ?? i;
    }
    list[Math.max(0, Math.min(list.length - 1, next))]?.focus();
  });
  bus.on('methods:select', id => { select(String(id)); setTimeout(() => $(`[data-skill="${CSS.escape(String(id))}"]`, panels[view])?.scrollIntoView({ block: 'center', behavior: ctx.motion() === 'off' ? 'instant' as ScrollBehavior : 'smooth' }), 350); });
  bus.on('route', r => { const rr = r as ReturnType<typeof parseRoute>; if (rr.skill && rr.skill !== selected && byId.has(rr.skill)) select(rr.skill, false); });

  setView(view, false); apply(); paintSelection();
  if (selected) setTimeout(() => $(`[data-skill="${CSS.escape(selected!)}"]`, panels[view])?.scrollIntoView({ block: 'center' }), 400);
}
