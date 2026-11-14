import type { Link, WebsiteContent } from './content/model.ts';

export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g,
  character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

const labels = {
  en: { cv: 'Curriculum vitae', back: 'Back to the website', print: 'Print / save PDF', other: 'Deutsch',
    about: 'Profile', education: 'Education', experience: 'Experience', projects: 'Research & projects',
    skills: 'Methods & technical skills', languages: 'Languages', training: 'Training',
    publications: 'Publications', references: 'References', interests: 'Interests',
    grade: 'Grade', certificate: 'Certificate evidence supplied', score: 'Score' },
  de: { cv: 'Lebenslauf', back: 'Zurück zur Website', print: 'Drucken / als PDF speichern', other: 'English',
    about: 'Profil', education: 'Studium', experience: 'Berufserfahrung', projects: 'Forschung und Projekte',
    skills: 'Methoden und technische Kenntnisse', languages: 'Sprachen', training: 'Weiterbildungen',
    publications: 'Publikationen', references: 'Referenzen', interests: 'Interessen',
    grade: 'Note', certificate: 'Zertifikatsnachweis vorhanden', score: 'Ergebnis' },
} as const;

const join = (items: (string | null | undefined)[], separator = ' · ') => items.filter(Boolean).map(escapeHtml).join(separator);
const paragraph = (text: string | null) => text ? text.split(/\n\s*\n/u).map(part => `<p>${escapeHtml(part).replace(/\n/gu, '<br>')}</p>`).join('') : '';
const link = (item: Link) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>${/^https?:/u.test(item.href) && item.label !== item.href ? `<span class="cv-paper-url"> [${escapeHtml(item.href.replace(/^https?:\/\//u, ''))}]</span>` : ''}`;
const links = (items: Link[]) => items.length ? `<div class="cv-links">${items.map(link).join('<span aria-hidden="true"> · </span>')}</div>` : '';
const section = (id: string, title: string, body: string) => body ? `<section class="cv-section" id="${id}" aria-labelledby="cv-${id}"><h2 id="cv-${id}">${escapeHtml(title)}</h2>${body}</section>` : '';

/** Complete presentation from WebsiteContent only. No portfolio state or filtering. */
export function renderCvBody(content: WebsiteContent): string {
  const l = labels[content.locale];
  const person = content.person;
  return `<article class="cv-sheet" data-person-name="${escapeHtml(person.name)}" aria-label="${escapeHtml(l.cv)}">
    <header class="cv-header">
      <div class="cv-identity"><p class="cv-eyebrow">${escapeHtml(l.cv)}</p><h1>${escapeHtml(person.name)}</h1>
      ${person.headlines.length ? `<p class="cv-headlines">${join(person.headlines)}</p>` : ''}
      <div class="cv-contact">${links([...person.contacts, ...content.profiles])}
      ${person.locations.length ? `<p>${person.locations.map(location => join([location.address, location.postalCode, location.city, location.region, location.country], ', ')).join(' · ')}</p>` : ''}${person.birthDate ? `<p>${escapeHtml(person.birthDate)}</p>` : ''}</div></div>
      ${person.images.map(image => `<img class="cv-photo" src="${escapeHtml(image.src)}" alt="${escapeHtml(person.name)}" width="266" height="266">`).join('')}
    </header>
    ${section('about', l.about, paragraph(person.summary))}
    ${section('education', l.education, content.education.map(item => `<article class="cv-entry" data-content-id="${escapeHtml(item.id)}"><div class="cv-entry-heading"><h3>${join([item.qualification, item.subject], ' — ')}</h3><p class="cv-date">${escapeHtml(item.period.label)}</p></div><p class="cv-organization">${join([item.institution, item.location])}</p>${item.grade ? `<p>${escapeHtml(l.grade)}: ${escapeHtml(item.grade)}</p>` : ''}${paragraph(item.description)}${item.logo ? `<img class="cv-logo" src="${escapeHtml(item.logo)}" alt="${escapeHtml(item.institution)}">` : ''}</article>`).join(''))}
    ${section('projects', l.projects, content.projects.map(item => `<article class="cv-entry" data-content-id="${escapeHtml(item.id)}"><h3>${escapeHtml(item.title)}</h3>${paragraph(item.description)}${links(item.links)}</article>`).join(''))}
    ${section('experience', l.experience, content.experience.map(item => `<article class="cv-entry" data-content-id="${escapeHtml(item.id)}"><div class="cv-entry-heading"><h3>${escapeHtml(item.title)}</h3><p class="cv-date">${escapeHtml(item.period.label)}</p></div><p class="cv-organization">${escapeHtml(item.organization)}</p>${paragraph(item.description)}${item.link ? links([{ label: item.link, href: item.link }]) : ''}</article>`).join(''))}
    ${section('skills', l.skills, content.skills.map(category => `<div class="cv-skill-category"><h3>${escapeHtml(category.title)}</h3>${category.groups.map(group => `<div class="cv-skill-group"><h4>${escapeHtml(group.title)}</h4><p>${group.items.map(item => `<span data-content-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</span>`).join('; ')}</p></div>`).join('')}</div>`).join(''))}
    ${section('training', l.training, `<ul class="cv-training">${content.training.map(item => `<li data-content-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.title)}</strong>${[item.issuer, item.date, item.duration].filter(Boolean).length ? ` — ${join([item.issuer, item.date, item.duration])}` : ''}${item.hasCertificateEvidence ? ` · ${escapeHtml(l.certificate)}` : ''}${item.link ? ` · ${link({ label: item.link, href: item.link })}` : ''}</li>`).join('')}</ul>`.replace('<ul class="cv-training"></ul>', ''))}
    ${section('languages', l.languages, content.languages.map(item => `<article class="cv-language" data-content-id="${escapeHtml(item.id)}"><h3>${escapeHtml(item.name)}</h3><p>${join([...new Set([item.level, item.frameworkLevel, item.status].filter(Boolean))])}</p>${item.certificates.map(certificate => `<p>${join([certificate.name, certificate.issuer, certificate.date])}${certificate.score !== null ? ` · ${escapeHtml(l.score)}: ${certificate.score}${certificate.maximumScore !== null ? ` / ${certificate.maximumScore}` : ''}` : ''}${certificate.link ? ` · ${link({ label: certificate.link, href: certificate.link })}` : ''}</p>`).join('')}</article>`).join(''))}
    ${section('publications', l.publications, content.publications.map(item => `<article class="cv-entry" data-content-id="${escapeHtml(item.id)}"><h3>${escapeHtml(item.title)}</h3><p>${join(item.authors, ', ')}</p><p>${join([item.kind, item.status, item.date, item.venue])}</p>${item.doi ? links([{ label: item.doi, href: `https://doi.org/${item.doi}` }]) : ''}${links(item.links)}</article>`).join(''))}
    ${section('references', l.references, content.references.map(item => `<article class="cv-entry" data-content-id="${escapeHtml(item.id)}"><h3>${escapeHtml(item.name)}</h3><p>${join([item.role, item.department, item.organization, item.location])}</p>${links(item.contacts)}</article>`).join(''))}
    ${section('interests', l.interests, content.interests.map(item => `<article class="cv-entry"><h3>${escapeHtml(item.name)}</h3>${paragraph(item.description)}</article>`).join(''))}
  </article>`;
}

export function renderCvDocument(content: WebsiteContent, options: { pdfHref?: string } = {}): string {
  const l = labels[content.locale];
  const other = content.locale === 'en' ? 'de' : 'en';
  const footer = `${content.person.name} — ${l.cv}`.replace(/["\\]/gu, '');
  return `<!doctype html><html lang="${content.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(personTitle(content))}</title><meta name="description" content="${escapeHtml(content.person.summary)}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="preload" href="/fonts/inter-latin-wght.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/cv.css"><style>@page{@bottom-left{content:"${escapeHtml(footer)}";font:500 7.5pt Inter,Arial,sans-serif;color:#5F5C7C}@bottom-right{content:counter(page) " / " counter(pages);font:500 7.5pt Inter,Arial,sans-serif;color:#5F5C7C}}</style><script type="module" src="/assets/cv-print.js"></script></head><body class="cv-page"><nav class="cv-toolbar" aria-label="CV"><a href="/${content.locale}/">← ${escapeHtml(l.back)}</a><a href="/${other}/cv/" hreflang="${other}">${l.other}</a>${options.pdfHref ? `<a href="${escapeHtml(options.pdfHref)}" download>PDF ↓</a>` : ''}<button type="button" id="print-cv">${escapeHtml(l.print)}</button></nav><main>${renderCvBody(content)}</main></body></html>`;
}

function personTitle(content: WebsiteContent) { return `${content.person.name} — ${labels[content.locale].cv}`; }
