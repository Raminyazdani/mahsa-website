import type { Ctx } from './context.ts';
import { $, bus, h, normalize, toast } from './ui.ts';
import { stationChannel } from './appearance.ts';
import type { StationId } from './appearance.ts';
import { formatPeriod } from './format.ts';

interface Entry { group: string; title: string; sub?: string; ch: string; run(): void; text: string }

/** Command palette: keyboard (Ctrl/⌘ K, /) and touch (search button). Searches every record and action. */
export function initPalette(ctx: Ctx) {
  const dialog = $<HTMLDialogElement>('[data-palette]');
  const input = $<HTMLInputElement>('[data-palette-input]');
  const results = $('[data-palette-results]');
  if (!dialog || !input || !results) return;
  const { content, l, locale } = ctx;
  const home = (hash: string, query = '') => `/${locale}/${query}${hash}`;
  const go = (station: string, after?: () => void) => () => {
    if (ctx.page === 'project') { location.href = home(`#${station}`); return; }
    ctx.goTo(station, { focus: true }); after?.();
  };

  function entries(): Entry[] {
    const list: Entry[] = [];
    const add = (entry: Omit<Entry, 'text'>) => list.push({ ...entry, text: normalize(`${entry.title} ${entry.sub ?? ''}`) });
    for (const id of ctx.stations) add({ group: l.search.groups.sections!, title: l.sections[id] ?? id, sub: l.channels[id], ch: stationChannel[id as StationId] ?? 'uv', run: go(id) });
    for (const project of content.projects) add({ group: l.search.groups.projects!, title: project.title, sub: project.description.slice(0, 90), ch: 'yfp', run: () => { location.href = `/${locale}/projects/${encodeURIComponent(project.id)}/`; } });
    for (const category of content.skills) for (const group of category.groups) for (const item of group.items) add({ group: l.search.groups.methods!, title: item.name, sub: `${category.title} · ${group.title}`, ch: 'sybr',
      run: () => { if (ctx.page === 'project') { location.href = home('#methods', `?skill=${encodeURIComponent(item.id)}`); return; } ctx.goTo('methods', { focus: false }); bus.emit('methods:select', item.id); } });
    for (const item of content.education) add({ group: l.search.groups.records!, title: `${item.qualification} — ${item.subject}`, sub: `${item.institution} · ${formatPeriod(item.period, locale)}`, ch: 'dapi', run: openRecord(item.id) });
    for (const item of content.experience) add({ group: l.search.groups.records!, title: item.title, sub: `${item.organization} · ${formatPeriod(item.period, locale)}`, ch: 'cfp', run: openRecord(item.id) });
    for (const item of content.training) add({ group: l.search.groups.training!, title: item.title, sub: l.sections.training, ch: 'he', run: go('training', () => bus.emit('training:select', item.id)) });
    for (const item of content.languages) add({ group: l.search.groups.languages!, title: item.name, sub: [item.level, item.frameworkLevel].filter(Boolean).join(' · '), ch: 'ph', run: go('languages') });
    const email = content.person.contacts.find(item => item.href.startsWith('mailto:'));
    const actions = l.search.groups.actions!;
    add({ group: actions, title: ctx.mode() === 'lab' ? l.mode.toPortfolio : l.mode.toLab, ch: 'uv', run: () => (document.querySelector<HTMLElement>(`[data-set-mode="${ctx.mode() === 'lab' ? 'portfolio' : 'lab'}"]`))?.click() });
    add({ group: actions, title: l.theme.toggle, sub: `${l.theme.light} / ${l.theme.dark}`, ch: 'yfp', run: () => document.querySelector<HTMLElement>('[data-theme-toggle]')?.click() });
    add({ group: actions, title: l.language.switchTo, ch: 'dapi', run: () => document.querySelector<HTMLAnchorElement>('[data-locale-link]')?.click() });
    add({ group: actions, title: l.actions.fullCv, ch: 'he', run: () => { location.href = `/${locale}/cv/`; } });
    if (email) add({ group: actions, title: `${l.actions.copy}: ${email.label}`, ch: 'uv', run: () => { void navigator.clipboard?.writeText(email.label).then(() => toast(`${l.actions.copied}: ${email.label}`), () => toast(l.actions.copyFail)); } });
    add({ group: actions, title: `${l.focus.label}: ${ctx.focus() ? l.focus.off : l.focus.on}`, sub: l.focus.hint, ch: 'cfp', run: () => document.querySelector<HTMLElement>(`[data-setting="focus"][data-value="${ctx.focus() ? 'off' : 'on'}"]`)?.click() });
    add({ group: actions, title: l.saved.title, ch: 'ph', run: () => bus.emit('sheet:open', 'saved') });
    add({ group: actions, title: l.settings.title, sub: `${l.motion.label} · ${l.theme.label} · ${l.mode.label}`, ch: 'uv', run: () => bus.emit('sheet:open', 'settings') });
    return list;
  }
  function openRecord(id: string) {
    return () => { if (ctx.page === 'project') { location.href = home(`#record-${id}`); return; } ctx.goTo('journey', { focus: false }); bus.emit('journey:open', id); };
  }

  let items: Entry[] = [], shown: Entry[] = [], selected = 0;
  const highlight = (text: string, query: string) => {
    const span = document.createElement('span');
    if (!query) { span.textContent = text; return span; }
    const n = normalize(text); const at = n.indexOf(query);
    if (at < 0) { span.textContent = text; return span; }
    span.append(text.slice(0, at), h('mark', {}, text.slice(at, at + query.length)), text.slice(at + query.length));
    return span;
  };
  function render() {
    const query = normalize(input!.value.trim());
    const tokens = query.split(/\s+/u).filter(Boolean);
    shown = tokens.length ? items.filter(item => tokens.every(token => item.text.includes(token))) : items.filter(item => item.group === l.search.groups.sections || item.group === l.search.groups.actions || item.group === l.search.groups.projects);
    selected = Math.min(selected, Math.max(0, shown.length - 1));
    const nodes: HTMLElement[] = [];
    let lastGroup = '';
    shown.slice(0, 60).forEach((item, index) => {
      if (item.group !== lastGroup) { nodes.push(h('li', { class: 'palette-group', role: 'presentation' }, item.group)); lastGroup = item.group; }
      const title = highlight(item.title, tokens[0] ?? '');
      const li = h('li', { class: 'palette-item', role: 'option', id: `pal-${index}`, 'aria-selected': String(index === selected), 'data-ch': item.ch },
        h('i', { class: 'led', 'aria-hidden': 'true' }), h('span', {}, title, item.sub ? h('small', {}, item.sub) : null));
      li.addEventListener('click', () => choose(index));
      li.addEventListener('pointermove', () => { if (selected !== index) { selected = index; mark(); } });
      nodes.push(li);
    });
    if (!shown.length) nodes.push(h('li', { class: 'palette-empty', role: 'presentation' }, l.search.empty));
    results!.replaceChildren(...nodes);
    input!.setAttribute('aria-activedescendant', shown.length ? `pal-${selected}` : '');
  }
  function mark() {
    results!.querySelectorAll('.palette-item').forEach(el => el.setAttribute('aria-selected', String(el.id === `pal-${selected}`)));
    input!.setAttribute('aria-activedescendant', `pal-${selected}`);
    results!.querySelector(`#pal-${selected}`)?.scrollIntoView({ block: 'nearest' });
  }
  function choose(index: number) { const item = shown[index]; if (!item) return; dialog!.close(); item.run(); }
  function open() {
    if (dialog!.open) return;
    items = entries(); input!.value = ''; selected = 0; render();
    dialog!.showModal(); input!.focus();
  }
  input.addEventListener('input', () => { selected = 0; render(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); selected = Math.min(shown.length - 1, selected + 1); mark(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); selected = Math.max(0, selected - 1); mark(); }
    else if (event.key === 'Enter') { event.preventDefault(); choose(selected); }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  bus.on('palette:open', open);
}
