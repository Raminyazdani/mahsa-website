import type { Ctx } from '../context.ts';
import { $, $$, h, onVisible } from '../ui.ts';
import { icon } from '../../render/icons.ts';

/** Languages: strips develop colour up to the CEFR level when they enter the view. */
export function initLanguages(ctx: Ctx) {
  const section = $('#languages');
  if (!section) return;
  onVisible(section, visible => { if (visible) section.classList.add('is-developed'); }, { rootMargin: '-15% 0px' });
  if (ctx.motion() === 'off') section.classList.add('is-developed');
}

/** Contact: the label printer prints the contact label once it is in view; real links and copy buttons. */
export function initContact(ctx: Ctx) {
  const section = $('#contact');
  if (!section) return;
  const printer = $('[data-printer]', section)!;
  const print = () => { printer.classList.remove('is-printed'); void printer.offsetWidth; printer.classList.add('is-printed'); };
  onVisible(section, visible => { if (visible && !printer.classList.contains('is-printed')) print(); }, { rootMargin: '-20% 0px' });
  $('[data-reprint]', section)?.addEventListener('click', print);
  const email = ctx.content.person.contacts.find(item => item.href.startsWith('mailto:'));
  const controls: HTMLElement[] = [];
  if (email) {
    controls.push(h('a', { class: 'hardkey', href: email.href, html: `${icon('mail')}<span>${ctx.l.actions.email}</span>` }));
    controls.push(h('button', { type: 'button', class: 'hardkey hardkey--small', 'data-copy': email.label, 'aria-label': `${ctx.l.actions.copy}: ${email.label}`, html: `${icon('copy')}${icon('check', 'icon icon-done')}` }));
  }
  const pdf = $<HTMLAnchorElement>('.contact-cv a[download]', section);
  controls.push(h('a', { class: 'hardkey hardkey--small', href: pdf?.href ?? `/${ctx.locale}/cv/`, ...(pdf ? { download: '' } : {}), 'aria-label': pdf ? ctx.l.actions.download : ctx.l.actions.fullCv, html: icon(pdf ? 'download' : 'book') }));
  ctx.registerConsole('contact', { controls });
  void $$;
}
