import type { Locale, WebsiteContent } from '../content/model.ts';
import { labels } from '../app/i18n.ts';
import { escapeHtml as e, paragraphs, formatPeriod, placeLabel, parseCefr, isNative, cefrLevels } from '../app/format.ts';
import { categoryAppearance, groupAppearance, projectAppearance, stationChannel, seed, rng } from '../app/appearance.ts';
import type { StationId } from '../app/appearance.ts';
import { icon } from './icons.ts';
import { mark } from './mark.ts';
import { barcodeSvg } from './code128.ts';

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function stationHead(id: StationId, index: number, content: WebsiteContent, extra = ''): string {
  const l = labels[content.locale];
  return `<header class="station-head">
    <p class="station-meta"><span class="station-no">${pad2(index)}</span><span class="station-label">${e(l.sections[id])}</span><span class="station-ch"><i class="led" aria-hidden="true"></i>${e(l.channels[id] ?? '')}</span></p>
    <h2 class="station-title" id="${id}-title"><span class="sr-only">${e(l.sections[id])}: </span>${e(l.titles[id] ?? l.sections[id])}</h2>
    ${l.intros[id] ? `<p class="station-intro">${e(l.intros[id])}</p>` : ''}${extra}
  </header>`;
}

const starButton = (key: string, title: string, locale: Locale) => {
  const l = labels[locale];
  return `<button type="button" class="star" data-fav="${e(key)}" data-fav-title="${e(title)}" aria-pressed="false" aria-label="${e(l.saved.save)}: ${e(title)}" title="${e(l.saved.save)}">${icon('star')}<span class="star-text">${e(l.saved.save)}</span></button>`;
};

/* ───────────────────────────── Hero ───────────────────────────── */
export function hero(content: WebsiteContent): string {
  const l = labels[content.locale];
  const p = content.person;
  const [eyebrow, ...channels] = p.headlines;
  const photo = p.images.find(image => image.kind === 'profile') ?? p.images[0];
  const place = p.locations.map(placeLabel).filter(Boolean)[0] ?? '';
  const chs = ['sybr', 'etbr', 'dapi', 'cfp', 'yfp'];
  return `<section class="station hero" id="start" data-station="start" data-ch="uv" aria-labelledby="hero-name">
  <div class="hero-backdrop" aria-hidden="true"><div class="hero-glow"></div><div class="hero-grid"></div></div>
  <div class="hero-stage" data-gel-stage>
    <canvas class="gel-canvas" aria-hidden="true"></canvas>
    <svg class="gel-fallback" aria-hidden="true" focusable="false"></svg>
    <div class="gel-labels" aria-hidden="true"></div>
  </div>
  <div class="hero-copy">
    ${eyebrow ? `<p class="hero-eyebrow"><i class="led" aria-hidden="true"></i>${e(eyebrow)}</p>` : ''}
    <h1 class="hero-name" id="hero-name"><span class="hero-first">${e(p.firstName)}</span> <span class="hero-last">${e(p.lastName)}</span></h1>
    ${channels.length ? `<ul class="hero-channels">${channels.map((item, index) => `<li data-ch="${chs[index % chs.length]}"><i aria-hidden="true"></i>${e(item)}</li>`).join('')}</ul>` : ''}
    ${place ? `<p class="hero-place">${icon('pin')}<span><span class="sr-only">${e(l.hero.based)} </span>${e(place)}</span></p>` : ''}
    <div class="hero-cta">
      <a class="key key--primary" href="#profile" data-goto="profile">${e(l.actions.explore)}${icon('arrowDown')}</a>
      <a class="key" href="/${content.locale}/cv/">${icon('book')}${e(l.actions.fullCv)}</a>
      <a class="key key--ghost" href="/${content.locale}/lab/" data-mode-link="lab">${icon('map')}${e(l.mode.toLab)}</a>
    </div>
  </div>
  ${photo ? badge(content, photo.src, place) : ''}
  <div class="psu" role="group" aria-label="${e(l.hero.instrument)}" data-psu>
    <div class="psu-lcd" aria-live="polite">
      <div class="lcd-row"><span data-readout="volt">110 V</span><span data-readout="time">00:00</span></div>
      <div class="lcd-row lcd-row--sub"><span data-readout="uv">UV 80%</span><span data-readout="stain">EtBr</span></div>
      <p class="lcd-status" data-readout="status">${e(l.hero.status.idle)}</p>
      <label class="lcd-progress"><span class="sr-only">${e(l.hero.progress)}</span><input type="range" min="0" max="1000" value="0" step="1" data-gel="progress"><span class="lcd-track" aria-hidden="true"><span class="lcd-fill"></span></span></label>
    </div>
    <div class="psu-keys">
      <button type="button" class="hardkey hardkey--run" data-gel="run" aria-pressed="false"><i class="led" aria-hidden="true"></i><span data-run-label>${e(l.hero.run)}</span>${icon('play', 'icon icon-play')}${icon('pause', 'icon icon-pause')}</button>
      <label class="fader" title="${e(l.hero.voltage)}"><span class="psu-label">${e(l.hero.voltage)}</span><input type="range" min="60" max="150" step="5" value="110" data-gel="voltage"></label>
      <button type="button" class="rocker" role="switch" aria-checked="true" data-gel="uv" title="${e(l.hero.uv)}"><span class="rocker-face"><span>I</span><span>O</span></span><span class="sr-only">${e(l.hero.uv)}</span></button>
      <label class="fader fader--uv" title="${e(l.hero.uv)}"><span class="psu-label">${e(l.hero.uv)}</span><input type="range" min="0" max="100" step="1" value="80" data-gel="intensity"></label>
      <div class="psu-row">
        <div class="selector selector--mini" role="radiogroup" aria-label="${e(l.hero.stain)}"><button type="button" role="radio" aria-checked="true" data-gel-stain="etbr">${e(l.hero.etbr)}</button><button type="button" role="radio" aria-checked="false" data-gel-stain="sybr">${e(l.hero.sybr)}</button></div>
        <div class="selector selector--mini" role="radiogroup" aria-label="${e(l.hero.view)}"><button type="button" role="radio" aria-checked="true" data-gel-view="3d">${e(l.hero.view3d)}</button><button type="button" role="radio" aria-checked="false" data-gel-view="top">${e(l.hero.viewTop)}</button></div>
        <button type="button" class="hardkey hardkey--small" data-gel="reset" title="${e(l.hero.reset)}">${icon('reset')}<span class="sr-only">${e(l.hero.reset)}</span></button>
      </div>
    </div>
    <p class="psu-note"><span>${e(l.hero.uvNote)}</span> <span>${e(l.hero.dyeNote)}</span></p>
  </div>
  <p class="hero-caption">${e(l.hero.instrument)}</p>
  <a class="hero-next" href="#profile" data-goto="profile" aria-label="${e(l.hero.scroll)}">${icon('arrowDown')}</a>
</section>`;
}

function badge(content: WebsiteContent, src: string, place: string): string {
  const l = labels[content.locale];
  const p = content.person;
  return `<div class="badge-rig" data-badge aria-hidden="false">
    <svg class="lanyard" aria-hidden="true" focusable="false"><path d=""/></svg>
    <a class="badge" href="#profile" data-goto="profile" aria-label="${e(p.name)} — ${e(l.sections.profile)}">
      <span class="badge-clip" aria-hidden="true"></span>
      <span class="badge-top"><span class="badge-access"><i class="led" aria-hidden="true"></i>${e(l.hero.badge)}</span>${mark('badge-mark', { size: 26 })}</span>
      <span class="badge-photo"><img src="${e(src)}" alt="" width="266" height="266" decoding="async"></span>
      <span class="badge-name"><span>${e(p.firstName)}</span><span>${e(p.lastName)}</span></span>
      ${p.headlines[0] ? `<span class="badge-role">${e(p.headlines[0])}</span>` : ''}
      ${place ? `<span class="badge-place">${e(place)}</span>` : ''}
      ${barcodeSvg(p.id, { height: 22, className: 'badge-code' })}
    </a>
  </div>`;
}

/* ───────────────────────────── Profile ───────────────────────────── */
export function profile(content: WebsiteContent, index: number): string {
  const l = labels[content.locale];
  const p = content.person;
  const place = p.locations.map(placeLabel).filter(Boolean).join(' · ');
  const email = p.contacts.find(item => item.href.startsWith('mailto:'));
  const rows: [string, string][] = [];
  rows.push([l.profile.name, e(p.name)]);
  if (p.headlines[0]) rows.push([l.profile.study, e(p.headlines[0])]);
  if (p.headlines.length > 1) rows.push([l.profile.focus, p.headlines.slice(1).map(e).join(' · ')]);
  if (place) rows.push([l.profile.location, e(place)]);
  if (content.languages.length) rows.push([l.profile.languages, content.languages.map(item => `${e(item.name)} <span class="muted">${e(item.frameworkLevel ?? item.level ?? item.status ?? '')}</span>`).join(' · ')]);
  if (email) rows.push([l.profile.contact, `<a href="${e(email.href)}">${e(email.label)}</a>`]);
  if (content.profiles.length) rows.push([l.profile.profiles, content.profiles.map(item => `<a href="${e(item.href)}" rel="noopener">${e(item.label)}</a>`).join(' · ')]);
  return `<section class="station profile" id="profile" data-station="profile" data-ch="${stationChannel.profile}" aria-labelledby="profile-title">
  ${stationHead('profile', index, content)}
  <div class="profile-grid">
    <div class="profile-text">
      <div class="focus-rail" aria-hidden="true"><span class="focus-knob"><i></i></span><span class="focus-scale"></span></div>
      <div class="profile-summary" data-focus-text>${paragraphs(p.summary)}</div>
    </div>
    <figure class="scope" data-scope>
      <div class="scope-ring" aria-hidden="true"><canvas class="scope-canvas" data-cells></canvas><span class="scope-reticle"></span></div>
      <figcaption><span class="scope-mode" data-theme-text="${e(l.profile.brightfield)}|${e(l.profile.fluorescence)}">${e(l.profile.fluorescence)}</span><span class="scope-note">${e(l.profile.cellsNote)}</span></figcaption>
    </figure>
    <div class="specimen" aria-labelledby="specimen-title">
      <p class="specimen-head" id="specimen-title"><span>${e(l.profile.label)}</span>${mark('specimen-mark', { size: 22 })}</p>
      <dl class="specimen-rows">${rows.map(([key, value]) => `<div><dt>${e(key)}</dt><dd>${value}</dd></div>`).join('')}</dl>
      ${barcodeSvg(p.id, { height: 26, className: 'specimen-code' })}
    </div>
  </div>
</section>`;
}

/* ───────────────────────────── Methods ───────────────────────────── */
export function methods(content: WebsiteContent, index: number): string {
  const l = labels[content.locale];
  const total = content.skills.reduce((sum, category) => sum + category.groups.reduce((s, group) => s + group.items.length, 0), 0);
  const filters = content.skills.map((category, i) => {
    const look = categoryAppearance(category.key, i);
    const count = category.groups.reduce((sum, group) => sum + group.items.length, 0);
    return `<button type="button" class="chip" data-filter="${e(category.id)}" data-ch="${look.channel}" aria-pressed="false"><i aria-hidden="true"></i>${e(category.title)}<span class="chip-count">${count}</span></button>`;
  }).join('');

  const workbench = content.skills.flatMap((category, ci) => {
    const look = categoryAppearance(category.key, ci);
    return category.groups.map(group => `<div class="zone-group" data-cat="${e(category.id)}" data-group="${e(group.id)}" data-ch="${look.channel}">
        <p class="zg-head"><span class="zone-tape"><span>${e(category.title)}</span></span>${group.title !== category.title ? `<span class="zone-group-label">${e(group.title)}</span>` : ''}</p>
        <div class="vessels" role="list">${group.items.map((item, ii) => `<div role="listitem" class="vessel-slot"><button type="button" class="vessel vessel--${look.vessel}" data-skill="${e(item.id)}" data-pos="${e(group.id)}~${ii}" aria-pressed="false" style="--tilt:${((seed(item.name) % 5) - 2) * 0.5}deg">
            <span class="vessel-cap" aria-hidden="true"></span><span class="vessel-neck" aria-hidden="true"></span>
            <span class="vessel-body"><span class="vessel-liquid" aria-hidden="true"><i></i></span><span class="vessel-label"${Math.max(...(item.shortName || item.name).split(/[\s/-]+/u).map(word => word.length)) >= 14 ? ' data-long' : ''}>${e(item.shortName || item.name)}</span></span>
          </button></div>`).join('')}</div>
      </div>`);
  }).join('');

  const instruments = content.skills.flatMap((category, ci) => {
    const look = categoryAppearance(category.key, ci);
    return category.groups.map(group => instrument(group.key, group.id, group.title, category.title, look.channel, group.items));
  }).join('');

  return `<section class="station methods" id="methods" data-station="methods" data-ch="${stationChannel.methods}" aria-labelledby="methods-title">
  ${stationHead('methods', index, content)}
  <div class="bench-controls" data-bench-controls>
    <div class="selector" role="radiogroup" aria-label="${e(l.methods.view)}">
      <button type="button" role="radio" aria-checked="true" data-bench-view="workbench">${icon('bench')}${e(l.methods.workbench)}</button>
      <button type="button" role="radio" aria-checked="false" data-bench-view="instruments">${icon('grid')}${e(l.methods.instruments)}</button>
    </div>
    <label class="search-field">${icon('search')}<span class="sr-only">${e(l.methods.search)}</span><input type="search" data-bench-search placeholder="${e(l.methods.searchPlaceholder)}" autocomplete="off" spellcheck="false"></label>
    <div class="chips" role="group" aria-label="${e(l.methods.category)}">
      <button type="button" class="chip chip--all" data-filter="all" aria-pressed="true">${e(l.methods.all)}<span class="chip-count">${total}</span></button>${filters}
    </div>
    <p class="bench-count" data-bench-count aria-live="polite">${e(l.methods.count(total, total))}</p>
    <button type="button" class="textkey" data-bench-clear hidden>${icon('reset')}${e(l.methods.clear)}</button>
  </div>
  <div class="bench-layout">
    <div class="bench-views">
      <div class="uv-lamp" aria-hidden="true"><span class="uv-tube"></span><span class="uv-cone"></span></div>
      <div class="shelf" data-bench-panel="workbench" aria-label="${e(l.methods.workbench)}">${workbench}</div>
      <div class="instruments" data-bench-panel="instruments" aria-label="${e(l.methods.instruments)}" hidden>${instruments}</div>
      <p class="bench-empty" data-bench-empty hidden>${e(l.methods.none)}</p>
      <p class="bench-hint">${e(l.methods.keyboard)}</p>
    </div>
    <div class="ticket" data-bench-detail role="region" aria-live="polite" aria-label="${e(l.methods.selected)}">
      <div class="ticket-printer" aria-hidden="true"><span class="ticket-slot"></span><i class="led"></i></div>
      <div class="ticket-paper" data-ticket>
        <p class="ticket-empty">${e(l.methods.select)}</p>
      </div>
    </div>
  </div>
</section>`;
}

function instrument(key: string, id: string, title: string, categoryTitle: string, channel: string, items: { id: string; name: string; shortName: string }[]): string {
  const kind = groupAppearance(key);
  const r = rng(seed(id));
  const list = (cls = '') => `<ul class="inst-list ${cls}">${items.map((item, i) => `<li><button type="button" class="inst-item" data-skill="${e(item.id)}" data-pos="${e(id)}~${i}" aria-pressed="false"><i class="inst-marker" aria-hidden="true">${pad2(i + 1)}</i><span>${e(item.name)}</span></button></li>`).join('')}</ul>`;
  let visual = '';
  const n = items.length;
  switch (kind) {
    case 'terminal':
      visual = `<div class="term" aria-hidden="true"><span class="term-bar"><i></i><i></i><i></i></span><span class="term-line">$ ls methods/</span><span class="term-cursor"></span></div>`;
      break;
    case 'monitor':
      visual = `<div class="monitor" aria-hidden="true">${items.map((_, i) => `<span class="win" style="--i:${i}"></span>`).join('')}<span class="monitor-stand"></span></div>`;
      break;
    case 'chromatogram': {
      const bases = ['a', 'c', 'g', 't'];
      const peaks: string[] = [];
      const count = Math.max(18, n * 6);
      for (let i = 0; i < count; i++) {
        const x = 8 + (i / (count - 1)) * 284;
        const h = 18 + r() * 46;
        peaks.push(`<path class="pk pk-${bases[i % 4]}" d="M${(x - 7).toFixed(1)} 78 C ${(x - 3).toFixed(1)} 78 ${(x - 2.5).toFixed(1)} ${(78 - h).toFixed(1)} ${x.toFixed(1)} ${(78 - h).toFixed(1)} S ${(x + 3).toFixed(1)} 78 ${(x + 7).toFixed(1)} 78"/>`);
      }
      const marks = items.map((_, i) => { const x = 8 + ((i + 0.5) / n) * 284; return `<g class="pk-mark" data-skill-mark="${e(items[i]!.id)}"><line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="6" y2="80"/><text x="${(x + 3).toFixed(1)}" y="14">${pad2(i + 1)}</text></g>`; }).join('');
      visual = `<svg class="chromat" viewBox="0 0 300 86" aria-hidden="true" focusable="false"><line class="baseline" x1="0" x2="300" y1="78" y2="78"/>${peaks.join('')}${marks}</svg>`;
      break;
    }
    case 'helix': {
      const pts: string[] = [], pts2: string[] = [];
      for (let i = 0; i <= 60; i++) { const x = 10 + i * 4.7; const y = 43 + Math.sin(i / 4.2) * 22; const y2 = 43 + Math.sin(i / 4.2 + Math.PI) * 22; pts.push(`${x.toFixed(1)},${y.toFixed(1)}`); pts2.push(`${x.toFixed(1)},${y2.toFixed(1)}`); }
      visual = `<svg class="helix" viewBox="0 0 300 86" aria-hidden="true" focusable="false"><polyline class="h1" points="${pts.join(' ')}"/><polyline class="h2" points="${pts2.join(' ')}"/>${Array.from({ length: 15 }, (_, i) => { const x = 14 + i * 19.5; const t = (x - 10) / 4.7 / 4.2; return `<line class="rung" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${(43 + Math.sin(t) * 22).toFixed(1)}" y2="${(43 + Math.sin(t + Math.PI) * 22).toFixed(1)}"/>`; }).join('')}</svg>`;
      break;
    }
    case 'plate': {
      const colonies = items.map((item, i) => {
        const angle = i * 2.39996; const radius = 15 + 58 * Math.sqrt((i + 0.6) / Math.max(n, 1));
        const cx = 100 + Math.cos(angle) * radius, cy = 100 + Math.sin(angle) * radius;
        const s = 7 + r() * 5;
        const wob = Array.from({ length: 9 }, (_, k) => { const a = (k / 9) * Math.PI * 2; const rr = s * (0.82 + r() * 0.36); return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
        return `<g class="colony" data-skill-mark="${e(item.id)}" style="--d:${(i * 0.09).toFixed(2)}s"><polygon points="${wob}"/><text x="${cx.toFixed(1)}" y="${(cy + 3).toFixed(1)}">${i + 1}</text></g>`;
      }).join('');
      visual = `<svg class="plate" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><circle class="plate-rim" cx="100" cy="100" r="96"/><circle class="plate-agar" cx="100" cy="100" r="88"/><path class="plate-gloss" d="M38 52 A80 80 0 0 1 120 22"/>${colonies}</svg>`;
      break;
    }
    case 'cycle': {
      const nodes = items.map((item, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2; const x = 100 + Math.cos(a) * 66, y = 100 + Math.sin(a) * 66;
        return `<g class="cyc-node" data-skill-mark="${e(item.id)}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}">${i + 1}</text></g>`;
      }).join('');
      visual = `<svg class="cycle" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><circle class="cyc-ring" cx="100" cy="100" r="66"/><circle class="cyc-run" cx="100" cy="100" r="66"/>${nodes}</svg>`;
      break;
    }
    case 'rack':
      return `<article class="inst inst--rack" data-group="${e(id)}" data-ch="${channel}">
        <header class="inst-head"><p class="inst-cat">${e(categoryTitle)}</p><h3>${e(title)}</h3><span class="inst-count">${n}</span></header>
        <ul class="rack">${items.map((item, i) => `<li><button type="button" class="inst-item rack-unit" data-skill="${e(item.id)}" data-pos="${e(id)}~${i}" aria-pressed="false"><i class="led" aria-hidden="true"></i><span>${e(item.name)}</span><i class="knob" aria-hidden="true" style="--k:${Math.round(r() * 270 - 135)}deg"></i><i class="rack-screw" aria-hidden="true"></i></button></li>`).join('')}</ul>
      </article>`;
    default:
      visual = `<div class="tubes" aria-hidden="true">${items.map((_, i) => `<span class="tube" style="--h:${(0.35 + r() * 0.5).toFixed(2)};--i:${i}"></span>`).join('')}</div>`;
  }
  return `<article class="inst inst--${kind}" data-group="${e(id)}" data-ch="${channel}">
    <header class="inst-head"><p class="inst-cat">${e(categoryTitle)}</p><h3>${e(title)}</h3><span class="inst-count">${n}</span></header>
    <div class="inst-visual">${visual}</div>
    ${list(kind === 'terminal' ? 'inst-list--term' : kind === 'monitor' ? 'inst-list--windows' : '')}
  </article>`;
}

/* ───────────────────────────── Journey ───────────────────────────── */
export function journey(content: WebsiteContent, index: number): string {
  const l = labels[content.locale];
  const records = [
    ...content.education.map(item => ({ id: item.id, kind: 'education' as const, start: item.period.start, title: `${item.qualification}${item.subject ? ` — ${item.subject}` : ''}`, org: item.institution, period: formatPeriod(item.period, content.locale), place: item.location, grade: item.grade, description: item.description })),
    ...content.experience.map(item => ({ id: item.id, kind: 'experience' as const, start: item.period.start, title: item.title, org: item.organization, period: formatPeriod(item.period, content.locale), place: null as string | null, grade: null as string | null, description: item.description || null })),
  ].sort((a, b) => (b.start ?? '').localeCompare(a.start ?? ''));
  const showFilter = content.education.length && content.experience.length;
  return `<section class="station journey" id="journey" data-station="journey" data-ch="${stationChannel.journey}" aria-labelledby="journey-title">
  ${stationHead('journey', index, content)}
  <div class="journey-controls">
    ${showFilter ? `<div class="selector" role="radiogroup" aria-label="${e(l.sections.journey)}">
      <button type="button" role="radio" aria-checked="true" data-journey-filter="all">${e(l.journey.all)}</button>
      <button type="button" role="radio" aria-checked="false" data-journey-filter="education"><i class="kind-dot kind-dot--education" aria-hidden="true"></i>${e(l.journey.education)}</button>
      <button type="button" role="radio" aria-checked="false" data-journey-filter="experience"><i class="kind-dot kind-dot--experience" aria-hidden="true"></i>${e(l.journey.experience)}</button>
    </div>` : ''}
    <div class="timelapse">
      <button type="button" class="hardkey hardkey--small" data-journey-play aria-pressed="false">${icon('play', 'icon icon-play')}${icon('pause', 'icon icon-pause')}<span data-play-label>${e(l.journey.play)}</span></button>
      <label class="fader fader--time"><span class="sr-only">${e(l.journey.year)}</span><input type="range" min="0" max="1000" value="1000" data-journey-scrub></label>
      <output class="year-lcd" data-journey-year>—</output>
    </div>
  </div>
  <div class="growth-stage" data-growth aria-hidden="true"><svg class="growth"></svg><div class="growth-labels"></div></div>
  <p class="journey-note">${e(l.journey.note)}</p>
  <ol class="log" aria-label="${e(l.journey.recordList)}">
    ${records.map(record => `<li class="log-row" id="record-${e(record.id)}" data-record="${e(record.id)}" data-kind="${record.kind}">
      <button type="button" class="log-head" aria-expanded="false" aria-controls="record-${e(record.id)}-detail">
        <span class="log-date">${e(record.period)}</span>
        <span class="log-kind"><i class="kind-dot kind-dot--${record.kind}" aria-hidden="true"></i>${e(record.kind === 'education' ? l.journey.education : l.journey.experience)}</span>
        <span class="log-title"><strong>${e(record.title)}</strong><span>${e(record.org)}</span></span>
        <span class="log-toggle" aria-hidden="true"></span>
      </button>
      <div class="log-detail" id="record-${e(record.id)}-detail" hidden>
        <dl>${record.place ? `<div><dt>${e(l.journey.location)}</dt><dd>${e(record.place)}</dd></div>` : ''}${record.grade ? `<div><dt>${e(l.journey.grade)}</dt><dd>${e(record.grade)}</dd></div>` : ''}</dl>
        ${paragraphs(record.description)}
        <div class="log-actions">${starButton(`record:${record.id}`, `${record.title} — ${record.org}`, content.locale)}<button type="button" class="textkey" data-copy-link="#record-${e(record.id)}">${icon('link')}${e(l.actions.copyLink)}</button></div>
      </div>
    </li>`).join('')}
  </ol>
</section>`;
}

/* ───────────────────────────── Projects ───────────────────────────── */
export function apparatus(projectId: string, locale: Locale, size: 'card' | 'page' = 'card'): string {
  const l = labels[locale];
  const kind = projectAppearance(projectId);
  if (kind === 'photolithography') {
    const s = l.projects.synth;
    return `<div class="apparatus apparatus--synth" data-apparatus="photolithography" data-size="${size}">
      <div class="synth-stage"><canvas class="synth-canvas" aria-hidden="true"></canvas><div class="synth-strand" aria-live="polite"><p class="mono-label">${e(s.inspect)} <span data-synth-spot>—</span></p><ol class="strand" data-synth-strand></ol></div></div>
      <div class="apparatus-controls">
        <div class="ctl"><p class="psu-label">${e(s.pattern)}</p><div class="selector selector--mini" role="radiogroup" aria-label="${e(s.pattern)}">${Object.entries(s.patterns).map(([key, label], i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-synth-pattern="${key}">${e(label)}</button>`).join('')}</div></div>
        <div class="ctl"><p class="psu-label">${e(s.base)}</p><div class="selector selector--mini selector--bases" role="radiogroup" aria-label="${e(s.base)}">${['A', 'C', 'G', 'T'].map((base, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-synth-base="${base}" class="base base--${base.toLowerCase()}">${base}</button>`).join('')}</div></div>
        <div class="ctl ctl--keys"><button type="button" class="hardkey" data-synth="expose">${icon('bolt')}<span>${e(s.expose)}</span></button><button type="button" class="hardkey" data-synth="couple">${icon('dot')}<span>${e(s.couple)}</span></button><button type="button" class="hardkey hardkey--small" data-synth="reset">${icon('reset')}<span class="sr-only">${e(s.reset)}</span></button></div>
        <div class="ctl"><label class="fader fader--labelled"><span class="psu-label">${e(s.efficiency)} <output data-synth-eff>98%</output></span><input type="range" min="80" max="100" step="1" value="98" data-synth="efficiency"></label></div>
        <p class="apparatus-lcd" aria-live="polite"><span>${e(s.cycle)} <b data-synth-cycle>0</b></span><span>${e(s.errors)} <b data-synth-errors>0</b></span></p>
      </div>
      <p class="apparatus-note">${e(s.hint)} <em>${e(l.projects.conceptual)}</em></p>
    </div>`;
  }
  if (kind === 'expression') {
    const x = l.projects.expr;
    return `<div class="apparatus apparatus--expr" data-apparatus="expression" data-size="${size}">
      <div class="expr-stage"><canvas class="expr-canvas" aria-hidden="true"></canvas></div>
      <div class="apparatus-controls">
        <div class="ctl ctl--keys"><button type="button" class="hardkey" data-expr="grow">${icon('dot')}<span>${e(x.grow)}</span></button><button type="button" class="hardkey" data-expr="induce" aria-pressed="false"><i class="led" aria-hidden="true"></i><span>${e(x.induce)}</span></button><button type="button" class="hardkey hardkey--small" data-expr="reset">${icon('reset')}<span class="sr-only">${e(x.reset)}</span></button></div>
        <p class="apparatus-lcd" aria-live="polite"><span>${e(x.cells)} <b data-expr-cells>0</b></span><span>${e(x.protein)} <b data-expr-protein>${e(x.off)}</b></span></p>
      </div>
      <p class="apparatus-note">${e(x.hint)} <em>${e(l.projects.conceptual)}</em></p>
    </div>`;
  }
  return `<div class="apparatus apparatus--specimen" data-apparatus="specimen" data-seed="${seed(projectId)}" data-size="${size}"><div class="specimen-stage"><canvas class="specimen-canvas" aria-hidden="true"></canvas></div><p class="apparatus-note">${e(l.projects.generic)}</p></div>`;
}

export function projects(content: WebsiteContent, index: number): string {
  const l = labels[content.locale];
  return `<section class="station projects" id="projects" data-station="projects" data-ch="${stationChannel.projects}" aria-labelledby="projects-title">
  ${stationHead('projects', index, content)}
  ${content.projects.length > 1 ? `<nav class="exp-index" aria-label="${e(l.sections.projects)}">${content.projects.map((project, i) => `<a href="#project-${e(project.id)}" data-project-jump="${e(project.id)}"><span>${pad2(i + 1)}</span>${e(project.title)}</a>`).join('')}</nav>` : ''}
  <div class="experiments">
    ${content.projects.map((project, i) => `<article class="experiment" id="project-${e(project.id)}" data-project="${e(project.id)}" data-mechanic="${projectAppearance(project.id)}" aria-labelledby="project-${e(project.id)}-title">
      <div class="experiment-apparatus">${apparatus(project.id, content.locale)}</div>
      <div class="experiment-record">
        <p class="kicker"><span>${e(l.projects.record)} ${pad2(i + 1)}</span></p>
        <h3 id="project-${e(project.id)}-title">${e(project.title)}</h3>
        <div class="prose">${paragraphs(project.description)}</div>
        ${project.links.length ? `<p class="experiment-links">${project.links.map(link => `<a href="${e(link.href)}" rel="noopener">${e(link.label)}${icon('arrowUpRight')}</a>`).join('')}</p>` : ''}
        <div class="experiment-actions"><a class="key key--primary" href="/${content.locale}/projects/${encodeURIComponent(project.id)}/">${e(l.projects.open)}${icon('arrowRight')}</a>${starButton(`project:${project.id}`, project.title, content.locale)}</div>
      </div>
    </article>`).join('')}
  </div>
</section>`;
}

/* ───────────────────────────── Training ───────────────────────────── */
export function training(content: WebsiteContent, index: number): string {
  const l = labels[content.locale];
  const stains = ['he', 'gram', 'fluo', 'giemsa', 'pas', 'dapi'];
  return `<section class="station training" id="training" data-station="training" data-ch="${stationChannel.training}" aria-labelledby="training-title">
  ${stationHead('training', index, content)}
  <div class="slidebox">
    <figure class="viewer" data-viewer>
      <div class="viewer-ring" aria-hidden="true"><canvas class="viewer-canvas"></canvas><span class="scope-reticle"></span></div>
      <figcaption class="viewer-label" aria-live="polite"><span class="mono-label">${e(l.training.microscope)}</span><strong data-viewer-title>${e(l.training.pick)}</strong><span data-viewer-meta></span></figcaption>
    </figure>
    <ol class="slides">
      ${content.training.map((item, i) => `<li><button type="button" class="slide" data-training="${e(item.id)}" data-stain="${stains[seed(item.id) % stains.length]}" data-meta="${e([item.issuer, item.date, item.duration].filter(Boolean).join(' · '))}${item.hasCertificateEvidence ? ` · ${e(l.training.certificate)}` : ''}" aria-pressed="false">
        <span class="slide-glass" aria-hidden="true"><span class="slide-smear"></span></span>
        <span class="slide-label"><span class="slide-no">${e(l.training.slide)} ${pad2(i + 1)}</span><span class="slide-title">${e(item.title)}</span></span>
      </button>${item.link ? `<a class="slide-link" href="${e(item.link)}" rel="noopener">${icon('arrowUpRight')}<span class="sr-only">${e(item.title)}</span></a>` : ''}</li>`).join('')}
    </ol>
  </div>
</section>`;
}

/* ───────────────────────────── Languages ───────────────────────────── */
export function languages(content: WebsiteContent, index: number): string {
  const l = labels[content.locale];
  return `<section class="station languages" id="languages" data-station="languages" data-ch="${stationChannel.languages}" aria-labelledby="languages-title">
  ${stationHead('languages', index, content)}
  <div class="strips">
    ${content.languages.map(item => {
      const native = isNative(item.status, item.level);
      const range = parseCefr(item.frameworkLevel, item.level);
      const text = [...new Set([item.level, item.frameworkLevel, item.status].filter(Boolean))].join(' · ');
      const pads = cefrLevels.map((level, i) => {
        const state = native ? 'full' : range ? (i <= range.from ? 'full' : i <= range.to ? 'partial' : 'empty') : 'empty';
        return `<span class="pad pad--${state}" data-level="${level}" style="--i:${i}"><span>${level}</span></span>`;
      }).join('');
      return `<article class="strip-row" data-native="${native}">
        <h3>${e(item.name)}</h3>
        <div class="strip" role="img" aria-label="${e(item.name)}: ${e(text)}">${pads}<span class="pad pad--native pad--${native ? 'full' : 'empty'}" style="--i:6"><span>${e(l.languages.native)}</span></span><span class="strip-handle" aria-hidden="true"></span></div>
        <p class="strip-result"><strong>${e(text)}</strong>${range && !native ? `<span>${e(range.from === range.to ? `${cefrLevels[range.from]} · ${l.languages.levels[cefrLevels[range.from]]}` : `${cefrLevels[range.from]}–${cefrLevels[range.to]} · ${l.languages.range}`)}</span>` : ''}</p>
        ${item.certificates.map(certificate => `<p class="strip-cert">${e([certificate.name, certificate.issuer, certificate.date].filter(Boolean).join(' · '))}${certificate.score !== null ? ` · ${certificate.score}${certificate.maximumScore !== null ? ` / ${certificate.maximumScore}` : ''}` : ''}${certificate.link ? ` · <a href="${e(certificate.link)}" rel="noopener">${e(certificate.link)}</a>` : ''}</p>`).join('')}
      </article>`;
    }).join('')}
  </div>
  <div class="strip-legend" aria-label="${e(l.languages.scale)}"><p class="mono-label">${e(l.languages.scale)}</p><ul>${cefrLevels.map((level, i) => `<li style="--i:${i}"><b>${level}</b>${e(l.languages.levels[level])}</li>`).join('')}</ul></div>
</section>`;
}

/* ───────────────────────────── Generic records (publications, references, interests) ───────────────────────────── */
export function records(id: 'publications' | 'references' | 'interests', content: WebsiteContent, index: number): string {
  let body = '';
  if (id === 'publications') body = content.publications.map(item => `<article class="record-card" id="record-${e(item.id)}"><p class="mono-label">${e([item.kind, item.status, item.date].filter(Boolean).join(' · '))}</p><h3>${e(item.title)}</h3><p>${e(item.authors.join(', '))}</p>${item.venue ? `<p class="muted">${e(item.venue)}</p>` : ''}<p class="record-links">${item.doi ? `<a href="https://doi.org/${e(item.doi)}" rel="noopener">doi:${e(item.doi)}</a>` : ''}${item.links.map(link => `<a href="${e(link.href)}" rel="noopener">${e(link.label)}</a>`).join('')}</p></article>`).join('');
  if (id === 'references') body = content.references.map(item => `<article class="record-card" id="record-${e(item.id)}"><h3>${e(item.name)}</h3><p>${e([item.role, item.department, item.organization, item.location].filter(Boolean).join(' · '))}</p><p class="record-links">${item.contacts.map(link => `<a href="${e(link.href)}">${e(link.label)}</a>`).join('')}</p></article>`).join('');
  if (id === 'interests') body = content.interests.map(item => `<article class="record-card" id="record-${e(item.id)}"><h3>${e(item.name)}</h3>${paragraphs(item.description)}</article>`).join('');
  return `<section class="station records" id="${id}" data-station="${id}" data-ch="${stationChannel[id]}" aria-labelledby="${id}-title">${stationHead(id, index, content)}<div class="record-grid">${body}</div></section>`;
}

/* ───────────────────────────── Contact ───────────────────────────── */
export function contact(content: WebsiteContent, index: number, pdfHref: string | null): string {
  const l = labels[content.locale];
  const p = content.person;
  const email = p.contacts.find(item => item.href.startsWith('mailto:'));
  const phone = p.contacts.find(item => item.href.startsWith('tel:'));
  const place = p.locations.map(placeLabel).filter(Boolean).join(' · ');
  const others = p.contacts.filter(item => item !== email && item !== phone);
  const row = (label: string, value: string, copy?: string) => `<div class="label-row"><dt>${e(label)}</dt><dd>${value}${copy ? `<button type="button" class="copy" data-copy="${e(copy)}" aria-label="${e(l.actions.copy)}: ${e(copy)}">${icon('copy')}${icon('check', 'icon icon-done')}</button>` : ''}</dd></div>`;
  return `<section class="station contact" id="contact" data-station="contact" data-ch="${stationChannel.contact}" aria-labelledby="contact-title">
  ${stationHead('contact', index, content)}
  <div class="contact-grid">
    <div class="contact-copy">
      <p class="contact-sub">${e(l.contact.sub)}</p>
      <div class="contact-actions">
        ${email ? `<a class="key key--primary" href="${e(email.href)}">${icon('mail')}${e(l.actions.email)}</a><button type="button" class="key" data-copy="${e(email.label)}">${icon('copy')}${icon('check', 'icon icon-done')}<span>${e(l.actions.copy)}: ${e(email.label)}</span></button>` : ''}
        ${phone ? `<a class="key" href="${e(phone.href)}">${icon('phone')}${e(l.actions.call)}</a>` : ''}
        ${content.profiles.map(item => `<a class="key key--ghost" href="${e(item.href)}" rel="noopener">${icon(/github/iu.test(item.label) ? 'github' : 'link')}${e(item.label)}</a>`).join('')}
      </div>
      <div class="contact-cv">
        <a class="textkey" href="/${content.locale}/cv/">${icon('book')}${e(l.actions.fullCv)}</a>
        ${pdfHref ? `<a class="textkey" href="${e(pdfHref)}" download>${icon('download')}${e(l.actions.download)}</a>` : ''}
      </div>
    </div>
    <div class="printer" data-printer>
      <div class="printer-body" aria-hidden="true"><span class="printer-slot"></span><span class="printer-brand">${mark('printer-mark', { size: 22 })}</span><i class="led"></i><span class="printer-grill"></span></div>
      <div class="label-feed">
        <div class="label-paper">
          <p class="label-to">${e(p.name)}</p>
          <dl class="label-rows">
            ${email ? row(l.contact.email, `<a href="${e(email.href)}">${e(email.label)}</a>`, email.label) : ''}
            ${phone ? row(l.contact.phone, `<a href="${e(phone.href)}">${e(phone.label)}</a>`, phone.label) : ''}
            ${others.map(item => row('', `<a href="${e(item.href)}">${e(item.label)}</a>`)).join('')}
            ${place ? row(l.contact.location, e(place)) : ''}
            ${content.profiles.length ? row(l.contact.profiles, content.profiles.map(item => `<a href="${e(item.href)}" rel="noopener">${e(item.label)}${item.href.replace(/^https?:\/\/(www\.)?/u, ' · ').replace(/\/$/u, '')}</a>`).join('<br>')) : ''}
          </dl>
          ${email ? barcodeSvg(email.label, { height: 46, className: 'label-code', label: l.contact.barcode }) : ''}
          ${email ? `<p class="label-code-text">${e(email.label)}</p>` : ''}
        </div>
      </div>
      <button type="button" class="textkey printer-reprint" data-reprint>${icon('print')}${e(l.contact.print)}</button>
    </div>
  </div>
</section>`;
}

/** Decorative transfer between two stations; each boundary uses a different physical metaphor. */
export function transfer(kind: string): string {
  const svg: Record<string, string> = {
    light: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none"><defs><linearGradient id="tr-light" x1="0" x2="1"><stop offset="0" stop-color="var(--c-uv)" stop-opacity="0"/><stop offset=".5" stop-color="var(--c-uv)"/><stop offset="1" stop-color="var(--c-dapi)" stop-opacity="0"/></linearGradient></defs><rect class="beam" x="0" y="58" width="1200" height="4" fill="url(#tr-light)"/><rect class="beam-sweep" x="-300" y="52" width="300" height="16" fill="url(#tr-light)"/></svg>',
    pipette: '<svg viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid meet"><path class="path" d="M300 20 C 500 20, 520 100, 700 100 S 900 40, 900 40" fill="none"/><path class="drop" d="M0 -9 C 5 -2 7 3 7 6 a7 7 0 0 1 -14 0 c0 -3 2 -8 7 -15z"/></svg>',
    hypha: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path class="hypha" d="M0 60 C 150 40, 300 80, 450 60 S 750 30, 900 64 S 1100 70, 1200 56" fill="none"/><path class="hypha hypha--b" d="M450 60 C 520 90, 560 100, 640 106" fill="none"/><path class="hypha hypha--b" d="M900 64 C 960 30, 1000 22, 1060 16" fill="none"/></svg>',
    current: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path class="trace" d="M0 60 H 260 L 300 30 H 560 L 600 90 H 860 L 900 60 H 1200" fill="none"/><circle class="spark" r="5"/></svg>',
    morph: '<svg viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid meet"><rect class="morph" x="560" y="20" width="80" height="80" rx="40"/></svg>',
    dip: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path class="wave" d="M-150 62 Q -75 44 0 62 T 150 62 T 300 62 T 450 62 T 600 62 T 750 62 T 900 62 T 1050 62 T 1200 62 T 1350 62"/><path class="wave" style="opacity:.45" d="M-150 72 Q -75 56 0 72 T 150 72 T 300 72 T 450 72 T 600 72 T 750 72 T 900 72 T 1050 72 T 1200 72 T 1350 72"/></svg>',
    flow: '<svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path class="flow" d="M0 60 C 200 10, 400 110, 600 60 S 1000 10, 1200 60" fill="none"/><path class="flow flow--2" d="M0 66 C 200 16, 400 116, 600 66 S 1000 16, 1200 66" fill="none"/></svg>',
  };
  return `<div class="transfer transfer--${kind}" aria-hidden="true">${svg[kind] ?? svg.flow}</div>`;
}
