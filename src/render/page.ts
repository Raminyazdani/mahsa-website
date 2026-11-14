import type { Locale, WebsiteContent } from '../content/model.ts';
import { labels } from '../app/i18n.ts';
import { escapeHtml as e, paragraphs } from '../app/format.ts';
import { stationsFor, stationChannel, projectAppearance } from '../app/appearance.ts';
import type { StationId } from '../app/appearance.ts';
import { headBootstrap } from '../app/state.ts';
import { icon } from './icons.ts';
import { mark } from './mark.ts';
import { labMap } from './labmap.ts';
import * as S from './sections.ts';

export interface PageOptions {
  kind: 'home' | 'lab' | 'project' | 'notfound';
  station?: StationId | null;
  projectId?: string;
  pdfHref: string | null;
  assetVersion: string;
}

const transfers: Record<string, string> = { start: 'light', profile: 'pipette', methods: 'hypha', journey: 'current', projects: 'morph', publications: 'morph', training: 'dip', languages: 'flow', references: 'flow', interests: 'flow' };

function head(content: WebsiteContent, title: string, description: string, options: PageOptions, alternates: Record<Locale, string>): string {
  const v = options.assetVersion;
  return `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${e(title)}</title><meta name="description" content="${e(description.slice(0, 300))}">
<meta name="color-scheme" content="light dark"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#07060f"><meta name="theme-color" media="(prefers-color-scheme: light)" content="#f3f4fa">
<link rel="alternate" hreflang="en" href="${alternates.en}"><link rel="alternate" hreflang="de" href="${alternates.de}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description.slice(0, 200))}"><meta property="og:type" content="profile">
<script>${headBootstrap}</script>
<link rel="preload" href="/fonts/bricolage-grotesque-latin-opsz.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/app.css?v=${v}">
<script type="module" src="/assets/app.js?v=${v}"></script>
</head>`;
}

function topbar(content: WebsiteContent, stations: StationId[], options: PageOptions): string {
  const l = labels[content.locale];
  const other: Locale = content.locale === 'en' ? 'de' : 'en';
  const onHome = options.kind === 'home' || options.kind === 'lab';
  const lab = options.kind === 'lab';
  const href = (id: StationId) => lab ? `/${content.locale}/lab/${id === 'start' ? '' : `${id}/`}` : onHome ? `#${id}` : `/${content.locale}/#${id}`;
  const nav = stations.filter(id => id !== 'start').map(id => `<a href="${href(id)}" data-nav="${id}" data-ch="${stationChannel[id]}"><i aria-hidden="true"></i>${e(l.sections[id])}</a>`).join('');
  return `<header class="topbar" data-topbar>
  <a class="brand" href="/${content.locale}/${lab ? 'lab/' : ''}" data-nav-home>${mark('brand-mark', { size: 34 })}<span class="brand-text"><span class="brand-name">${e(content.person.name)}</span><span class="brand-sub">${e(content.person.headlines[1] ? content.person.headlines.slice(1).join(' · ') : l.brandSub)}</span></span></a>
  <nav class="topnav" aria-label="${e(l.lab.stations)}">${nav}</nav>
  <div class="tools">
    <div class="selector selector--mode" role="radiogroup" aria-label="${e(l.mode.label)}">
      <button type="button" role="radio" aria-checked="${!lab}" data-set-mode="portfolio" aria-label="${e(l.mode.portfolio)}" title="${e(l.mode.portfolio)}">${icon('book')}<span>${e(l.mode.portfolio)}</span></button><button type="button" role="radio" aria-checked="${lab}" data-set-mode="lab" aria-label="${e(l.mode.lab)}" title="${e(l.mode.lab)}">${icon('flask')}<span>${e(l.mode.lab)}</span></button>
    </div>
    <button type="button" class="tool" data-open="palette" aria-label="${e(l.search.open)} (Ctrl K)" title="${e(l.search.open)} · Ctrl K">${icon('search')}</button>
    <button type="button" class="tool" data-open="saved" aria-label="${e(l.saved.open)}" title="${e(l.saved.open)}">${icon('star')}<span class="tool-count" data-saved-count hidden>0</span></button>
    <button type="button" class="tool" data-theme-toggle aria-label="${e(l.theme.toggle)}" title="${e(l.theme.toggle)}">${icon('sun', 'icon icon-sun')}${icon('moon', 'icon icon-moon')}</button>
    <a class="tool tool--text" href="/${other}/${lab ? 'lab/' : ''}" hreflang="${other}" lang="${other}" data-locale-link="${other}" aria-label="${e(l.language.switchTo)}">${e(l.language.short)}</a>
    <button type="button" class="tool" data-open="settings" aria-label="${e(l.settings.open)}" title="${e(l.settings.open)}">${icon('sliders')}</button>
    <a class="tool tool--cv" href="/${content.locale}/cv/">${e(l.actions.cv)}</a>
    <button type="button" class="tool tool--menu" data-open="menu" aria-label="${e(l.actions.menu)}">${icon('menu')}</button>
  </div>
</header>`;
}

function seg(name: string, label: string, options: [string, string][]): string {
  return `<div class="setting"><p class="setting-label" id="set-${name}">${e(label)}</p><div class="selector selector--wide" role="radiogroup" aria-labelledby="set-${name}">${options.map(([value, text]) => `<button type="button" role="radio" aria-checked="false" data-setting="${name}" data-value="${value}">${e(text)}</button>`).join('')}</div></div>`;
}

function overlays(content: WebsiteContent, stations: StationId[], options: PageOptions): string {
  const l = labels[content.locale];
  const lab = options.kind === 'lab';
  const href = (id: StationId) => lab ? `/${content.locale}/lab/${id === 'start' ? '' : `${id}/`}` : options.kind === 'home' ? `#${id}` : `/${content.locale}/#${id}`;
  return `
<div class="console" data-console role="region" aria-label="${e(l.console.label)}" hidden>
  <div class="console-station"><i class="led" aria-hidden="true"></i><span class="console-no" data-console-no>01</span><span class="console-name" data-console-name>${e(l.sections.start)}</span></div>
  <div class="console-controls" data-console-controls></div>
  <div class="console-nav"><button type="button" class="tool tool--small" data-console-prev aria-label="${e(l.console.prev)}">${icon('chevronLeft')}</button><button type="button" class="tool tool--small" data-console-next aria-label="${e(l.console.next)}">${icon('chevronRight')}</button></div>
</div>
<div class="scrim" data-scrim hidden></div>
<aside class="sheet sheet--settings" data-sheet="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title" hidden>
  <header class="sheet-head"><h2 id="settings-title">${e(l.settings.title)}</h2><button type="button" class="tool" data-close aria-label="${e(l.actions.close)}">${icon('close')}</button></header>
  <div class="sheet-body">
    ${seg('mode', l.mode.label, [['portfolio', l.mode.portfolio], ['lab', l.mode.lab]])}
    ${seg('theme', l.theme.label, [['system', l.theme.system], ['light', l.theme.light], ['dark', l.theme.dark]])}
    ${seg('locale', l.language.label, [['en', l.language.en], ['de', l.language.de]])}
    ${seg('motion', l.motion.label, [['full', l.motion.full], ['gentle', l.motion.gentle], ['off', l.motion.off]])}
    ${seg('focus', l.focus.label, [['off', l.focus.off], ['on', l.focus.on]])}
    <p class="setting-hint">${e(l.focus.hint)}</p>
    <div class="setting setting--actions"><button type="button" class="textkey" data-replay-intro>${icon('play')}${e(l.settings.replay)}</button><button type="button" class="textkey" data-clear-storage>${icon('reset')}${e(l.settings.clear)}</button></div>
    <p class="setting-hint">${e(l.settings.storage)}</p>
  </div>
</aside>
<aside class="sheet sheet--saved" data-sheet="saved" role="dialog" aria-modal="true" aria-labelledby="saved-title" hidden>
  <header class="sheet-head"><h2 id="saved-title">${e(l.saved.title)}</h2><button type="button" class="tool" data-close aria-label="${e(l.actions.close)}">${icon('close')}</button></header>
  <div class="sheet-body"><ul class="saved-list" data-saved-list></ul><p class="saved-empty" data-saved-empty>${e(l.saved.empty)}</p></div>
</aside>
<aside class="sheet sheet--menu" data-sheet="menu" role="dialog" aria-modal="true" aria-labelledby="menu-title" hidden>
  <header class="sheet-head"><h2 id="menu-title">${e(l.actions.menu)}</h2><button type="button" class="tool" data-close aria-label="${e(l.actions.close)}">${icon('close')}</button></header>
  <div class="sheet-body"><nav class="menu-list" aria-label="${e(l.lab.stations)}">${stations.map((id, i) => `<a href="${href(id)}" data-nav="${id}" data-ch="${stationChannel[id]}"><span class="menu-no">${S.pad2(i + 1)}</span><span>${e(l.sections[id])}</span><i class="led" aria-hidden="true"></i></a>`).join('')}</nav>
  <div class="menu-tools"><a class="key" href="/${content.locale}/cv/">${icon('book')}${e(l.actions.fullCv)}</a><button type="button" class="key" data-open="settings">${icon('sliders')}${e(l.settings.open)}</button></div></div>
</aside>
<dialog class="palette" data-palette aria-labelledby="palette-title">
  <form method="dialog" class="palette-box" data-palette-form>
    <h2 class="sr-only" id="palette-title">${e(l.search.title)}</h2>
    <label class="palette-input">${icon('search')}<span class="sr-only">${e(l.search.title)}</span><input type="text" role="combobox" aria-expanded="true" aria-controls="palette-results" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${e(l.search.placeholder)}" data-palette-input><kbd>Esc</kbd></label>
    <ul class="palette-results" id="palette-results" role="listbox" aria-label="${e(l.search.title)}" data-palette-results></ul>
    <p class="palette-foot"><span>${e(l.search.hint)}</span><span>Ctrl K · /</span></p>
  </form>
</dialog>
<div class="toast" role="status" aria-live="polite" data-toast></div>
<div class="intro" data-intro hidden><div class="intro-tube" aria-hidden="true"></div><p class="intro-text" aria-hidden="true">${mark('intro-mark', { size: 56 })}<span>${e(l.intro.boot)}</span></p><button type="button" class="key intro-skip" data-intro-skip>${e(l.intro.skip)}</button></div>`;
}

function footer(content: WebsiteContent): string {
  const l = labels[content.locale];
  return `<footer class="footer"><div class="footer-in"><p class="footer-brand">${mark('foot-mark', { size: 28 })}<span>${e(content.person.name)}</span></p><p class="footer-links"><a href="/${content.locale}/cv/">${e(l.footer.cv)}</a><a href="#top" data-goto="start">${e(l.footer.top)}</a></p><p class="footer-note">${e(l.footer.made)} ${e(l.footer.fonts)}</p></div></footer>`;
}

function stationMarkup(id: StationId, index: number, content: WebsiteContent, options: PageOptions): string {
  switch (id) {
    case 'start': return S.hero(content);
    case 'profile': return S.profile(content, index);
    case 'methods': return S.methods(content, index);
    case 'journey': return S.journey(content, index);
    case 'projects': return S.projects(content, index);
    case 'training': return S.training(content, index);
    case 'languages': return S.languages(content, index);
    case 'publications': case 'references': case 'interests': return S.records(id, content, index);
    case 'contact': return S.contact(content, index, options.pdfHref);
  }
}

export function renderHome(content: WebsiteContent, options: PageOptions): string {
  const l = labels[content.locale];
  const stations = stationsFor(content);
  const lab = options.kind === 'lab';
  const active = options.station && stations.includes(options.station) ? options.station : 'start';
  const path = (locale: Locale) => lab ? `/${locale}/lab/${active === 'start' ? '' : `${active}/`}` : `/${locale}/`;
  const title = `${content.person.name} — ${content.person.headlines[0] ?? l.brandSub}${lab && active !== 'start' ? ` · ${l.sections[active]}` : ''}`;
  const sections = stations.map((id, i) => stationMarkup(id, i + 1, content, options) + (i < stations.length - 1 ? S.transfer(transfers[id] ?? 'flow') : '')).join('\n');
  const map = labMap(stations.map(id => ({ id, label: l.sections[id] ?? id, href: `/${content.locale}/lab/${id === 'start' ? '' : `${id}/`}` })));
  return `<!doctype html><html lang="${content.locale}" data-page="${lab ? 'lab' : 'home'}" data-mode="${lab ? 'lab' : 'portfolio'}" data-station="${active}">${head(content, title, content.person.summary, options, { en: path('en'), de: path('de') })}
<body><a class="skip" href="#main">${e(l.skip)}</a><span id="top"></span>
${topbar(content, stations, options)}
<div class="lab-shell">
  <aside class="labmap" data-labmap aria-labelledby="labmap-title">
    <div class="labmap-head"><p class="mono-label" id="labmap-title">${e(l.lab.map)}</p><button type="button" class="tool tool--small labmap-toggle" data-labmap-toggle aria-expanded="false">${icon('map')}<span>${e(l.lab.openMap)}</span></button></div>
    <div class="labmap-figure">${map}</div>
    <ol class="labmap-list">${stations.map((id, i) => `<li><a href="/${content.locale}/lab/${id === 'start' ? '' : `${id}/`}" data-station-link="${id}" data-ch="${stationChannel[id]}"${id === active && lab ? ' aria-current="page"' : ''}><span class="lm-num">${S.pad2(i + 1)}</span><span class="lm-name">${e(l.sections[id])}</span><span class="lm-ch">${e(l.channels[id] ?? '')}</span><i class="led" aria-hidden="true"></i></a></li>`).join('')}</ol>
    <p class="labmap-hint">${e(l.lab.hint)}</p>
  </aside>
  <main id="main" class="stations" tabindex="-1">
<h1 class="sr-only lab-h1">${e(content.person.name)} — ${e(l.mode.lab)}</h1>
${sections}
  </main>
</div>
${footer(content)}
${overlays(content, stations, options)}
</body></html>`;
}

export function renderProject(content: WebsiteContent, projectId: string, options: PageOptions): string {
  const l = labels[content.locale];
  const stations = stationsFor(content);
  const index = content.projects.findIndex(item => item.id === projectId);
  const project = content.projects[index]!;
  const prev = content.projects[index - 1], next = content.projects[index + 1];
  const path = (locale: Locale) => `/${locale}/projects/${encodeURIComponent(project.id)}/`;
  return `<!doctype html><html lang="${content.locale}" data-page="project" data-mode="portfolio" data-station="projects">${head(content, `${project.title} — ${content.person.name}`, project.description, options, { en: path('en'), de: path('de') })}
<body class="project-body"><a class="skip" href="#main">${e(l.skip)}</a><span id="top"></span>
${topbar(content, stations, options)}
<main id="main" class="project-page" data-project-page="${e(project.id)}" data-ch="${stationChannel.projects}" data-mechanic="${projectAppearance(project.id)}" tabindex="-1">
  <nav class="crumbs" aria-label="${e(l.project.page)}"><a href="/${content.locale}/#project-${e(project.id)}">${icon('arrowLeft')}${e(l.projects.back)}</a></nav>
  <header class="pp-head">
    <p class="station-meta"><span class="station-no">${S.pad2(index + 1)} / ${S.pad2(content.projects.length)}</span><span class="station-label">${e(l.projects.record)}</span><span class="station-ch"><i class="led" aria-hidden="true"></i>${e(l.channels.projects)}</span></p>
    <h1 class="pp-title">${e(project.title)}</h1>
  </header>
  <div class="pp-grid">
    <div class="pp-apparatus">${S.apparatus(project.id, content.locale, 'page')}</div>
    <article class="pp-record" aria-label="${e(l.project.description)}">
      <div class="prose prose--large">${paragraphs(project.description)}</div>
      ${project.links.length ? `<p class="experiment-links">${project.links.map(link => `<a href="${e(link.href)}" rel="noopener">${e(link.label)}${icon('arrowUpRight')}</a>`).join('')}</p>` : `<p class="muted small">${e(l.projects.noLinks)}</p>`}
      <div class="experiment-actions"><button type="button" class="star" data-fav="project:${e(project.id)}" data-fav-title="${e(project.title)}" aria-pressed="false" aria-label="${e(l.saved.save)}: ${e(project.title)}">${icon('star')}<span class="star-text">${e(l.saved.save)}</span></button><button type="button" class="textkey" data-copy-link="">${icon('link')}${e(l.actions.copyLink)}</button><a class="textkey" href="/${content.locale}/cv/">${icon('book')}${e(l.actions.fullCv)}</a></div>
    </article>
  </div>
  <nav class="pp-pager" aria-label="${e(l.sections.projects)}">
    ${prev ? `<a class="pp-prev" href="/${content.locale}/projects/${encodeURIComponent(prev.id)}/">${icon('arrowLeft')}<span><small>${e(l.project.prev)}</small>${e(prev.title)}</span></a>` : '<span></span>'}
    ${next ? `<a class="pp-next" href="/${content.locale}/projects/${encodeURIComponent(next.id)}/"><span><small>${e(l.project.next)}</small>${e(next.title)}</span>${icon('arrowRight')}</a>` : '<span></span>'}
  </nav>
</main>
${footer(content)}
${overlays(content, stations, options)}
</body></html>`;
}

export function renderNotFound(content: WebsiteContent, options: PageOptions): string {
  const l = labels[content.locale];
  return `<!doctype html><html lang="${content.locale}" data-page="notfound" data-mode="portfolio">${head(content, `${l.notFound.title} — ${content.person.name}`, l.notFound.body, options, { en: '/en/', de: '/de/' })}
<body><main id="main" class="notfound"><p>${mark('nf-mark', { size: 64 })}</p><h1>${e(l.notFound.title)}</h1><p>${e(l.notFound.body)}</p><p><a class="key key--primary" href="/en/">${e(l.notFound.home)} (EN)</a> <a class="key" href="/de/">${e(labels.de.notFound.home)} (DE)</a></p></main></body></html>`;
}
