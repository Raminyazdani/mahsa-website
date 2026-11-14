import type { Ctx } from './context.ts';
import { $, $$, bus, h, toast } from './ui.ts';
import { icon } from '../render/icons.ts';

interface Resolved { key: string; title: string; kind: string; href: string }

/** Saved items live in preferences (localStorage); every entry can be removed. */
export function initFavorites(ctx: Ctx) {
  const { content, l, locale } = ctx;
  const list = $('[data-saved-list]'), empty = $('[data-saved-empty]'), count = $('[data-saved-count]');
  const portfolioBase = `/${locale}/`;

  function skillByPos(pos: string) {
    const [groupId, index] = pos.split('~');
    for (const category of content.skills) for (const group of category.groups) if (group.id === groupId) { const item = group.items[Number(index)]; if (item) return { item, group, category }; }
    return null;
  }

  function resolve(key: string): Resolved | null {
    const [kind, ...rest] = key.split(':'); const id = rest.join(':');
    if (kind === 'project') { const p = content.projects.find(item => item.id === id); return p ? { key, title: p.title, kind: l.sections.projects!, href: `/${locale}/projects/${encodeURIComponent(p.id)}/` } : null; }
    if (kind === 'record') {
      const edu = content.education.find(item => item.id === id); if (edu) return { key, title: `${edu.qualification} — ${edu.subject}`, kind: l.journey.education, href: `${portfolioBase}#record-${id}` };
      const exp = content.experience.find(item => item.id === id); if (exp) return { key, title: `${exp.title} — ${exp.organization}`, kind: l.journey.experience, href: `${portfolioBase}#record-${id}` };
      return null;
    }
    if (kind === 'skill') { const found = skillByPos(id); return found ? { key, title: found.item.name, kind: `${l.sections.methods} · ${found.group.title}`, href: `${portfolioBase}?skill=${encodeURIComponent(found.item.id)}#methods` } : null; }
    if (kind === 'training') { const t = content.training.find(item => item.id === id); return t ? { key, title: t.title, kind: l.sections.training!, href: `${portfolioBase}?slide=${encodeURIComponent(id)}#training` } : null; }
    return null;
  }

  function render() {
    const items = ctx.prefs.favorites.map(resolve).filter((x): x is Resolved => !!x);
    if (list) list.replaceChildren(...items.map(item => {
      const remove = h('button', { type: 'button', class: 'tool tool--small', 'aria-label': `${l.saved.remove}: ${item.title}`, html: icon('close') });
      remove.addEventListener('click', () => { toggle(item.key); });
      return h('li', {}, h('a', { href: item.href }, h('small', {}, item.kind), item.title), remove);
    }));
    if (empty) empty.hidden = items.length > 0;
    if (count) { count.hidden = items.length === 0; count.textContent = String(items.length); }
    for (const star of $$<HTMLButtonElement>('[data-fav]')) syncStar(star);
  }
  function syncStar(star: HTMLButtonElement) {
    const on = ctx.prefs.favorites.includes(star.dataset.fav!);
    star.setAttribute('aria-pressed', String(on));
    const title = star.dataset.favTitle ?? '';
    star.setAttribute('aria-label', `${on ? l.saved.unsave : l.saved.save}: ${title}`);
    const text = star.querySelector('.star-text'); if (text) text.textContent = on ? (locale === 'de' ? 'Gemerkt' : 'Saved') : l.saved.save;
  }
  function toggle(key: string, title?: string): boolean {
    const favorites = ctx.prefs.favorites;
    const index = favorites.indexOf(key);
    if (index >= 0) favorites.splice(index, 1); else favorites.push(key);
    ctx.save(); render();
    const on = index < 0;
    if (title) toast(`${on ? (locale === 'de' ? 'Gemerkt' : 'Saved') : (locale === 'de' ? 'Entfernt' : 'Removed')}: ${title}`);
    bus.emit('favorites');
    return on;
  }
  document.addEventListener('click', event => {
    const star = (event.target as Element).closest<HTMLButtonElement>('[data-fav]');
    if (!star) return;
    toggle(star.dataset.fav!, star.dataset.favTitle);
  });
  bus.on('favorites:render', render);
  bus.on('favorites', () => { for (const star of $$<HTMLButtonElement>('[data-fav]')) syncStar(star); });
  render();
  return { has: (key: string) => ctx.prefs.favorites.includes(key), toggle, render, syncStar };
}
