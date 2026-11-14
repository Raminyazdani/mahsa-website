import type { Link, Locale, Section, WebsiteContent } from './model.ts';
import { validateSource } from './validate.ts';
import { displayDate, skillHeading } from './source/presentation.ts';
import { unwrapSource } from './source/migrate.ts';

const text = (value: string | null | undefined) => value?.trim() ?? '';
const optional = (value: string | null | undefined) => text(value) || null;
const strings = (values: string[]) => values.map(text).filter(Boolean);
const tags = (values: string[]) => strings(values).filter(value => !value.startsWith('record:'));
function identity(typeKeys: string[], factory: ReturnType<typeof idFactory>, ...values: unknown[]): string {
  const explicit = typeKeys.find(key => key.startsWith('record:'))?.slice('record:'.length);
  return explicit ? factory.explicit(explicit) : factory(...values);
}
function publicationDate(item: { date: string | null; year: number | null; month: number | null; day: number | null }): string | null {
  if (optional(item.date)) return optional(item.date);
  if (item.year === null) return null;
  const parts = [String(item.year)];
  if (item.month !== null) parts.push(String(item.month).padStart(2, '0'));
  if (item.day !== null) parts.push(String(item.day).padStart(2, '0'));
  return parts.join('-');
}
function idFactory(prefix: string) {
  const seen = new Map<string, number>();
  const used = new Set<string>();
  const allocate = (base: string) => {
    let count = seen.get(base) ?? 0;
    let candidate: string;
    do { count += 1; candidate = count === 1 ? base : `${base}-${count}`; } while (used.has(candidate));
    seen.set(base, count);
    used.add(candidate);
    return candidate;
  };
  const factory = (...values: unknown[]): string => {
    const input = JSON.stringify(values);
    let hash = 2166136261;
    for (const character of input) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
    const base = `${prefix}-${(hash >>> 0).toString(36)}`;
    return allocate(base);
  };
  factory.explicit = allocate;
  return factory;
}
function contacts(email: string, phone: { formatted: string; countryCode: string; number: string }): Link[] {
  const result: Link[] = [];
  if (text(email)) result.push({ label: text(email), href: `mailto:${text(email)}` });
  const phoneNumber = `${phone.countryCode}${phone.number}`.replace(/[^+\d]/g, '');
  if (phoneNumber.replace(/\D/g, '')) result.push({ label: text(phone.formatted) || phoneNumber, href: `tel:${phoneNumber}` });
  return result;
}
function links(items: { label: string; href: string | null | undefined }[]): Link[] {
  const seen = new Set<string>();
  return items.flatMap(item => {
    const href = text(item.href);
    if (!href || seen.has(href)) return [];
    seen.add(href);
    return [{ label: text(item.label), href }];
  });
}

/** The only source-to-website mapping. Changing a source shape stops here. */
export function toWebsiteContent(input: unknown): WebsiteContent {
  const cv = validateSource(unwrapSource(input));
  const locale = cv.config.lang as Locale;
  const person = cv.basics[0];
  const educationId = idFactory('education');
  const experienceId = idFactory('experience');
  const projectId = idFactory('project');
  const skillId = idFactory('skill');
  const groupId = idFactory('group');
  const languageId = idFactory('language');
  const trainingId = idFactory('training');
  const publicationId = idFactory('publication');
  const referenceId = idFactory('reference');
  const interestId = idFactory('interest');
  const content: WebsiteContent = {
    locale,
    person: {
      id: text(cv.config.ID), firstName: text(person.fname), lastName: text(person.lname),
      name: strings([person.fname, person.lname]).join(' '), headlines: strings(person.label),
      summary: text(person.summary), contacts: contacts(person.email, person.phone),
      birthDate: optional(person.birthDate),
      locations: person.location.map(location => ({ address: optional(location.address), postalCode: optional(location.postalCode), city: optional(location.city),
        region: optional(location.region), country: optional(location.country) }))
        .filter(location => location.address || location.postalCode || location.city || location.region || location.country),
      images: person.Pictures.filter(picture => text(picture.URL)).map(picture => ({ kind: text(picture.type_of), src: text(picture.URL) })),
    },
    profiles: links(cv.profiles.map(profile => ({ label: profile.display_name || profile.network, href: profile.url }))),
    education: cv.education.map(item => ({ id: identity(item.type_key, educationId, item.institution, item.area, item.startDate),
      institution: text(item.institution), subject: text(item.area), qualification: text(item.studyType),
      location: optional(item.location), period: { start: optional(item.startDate), end: optional(item.endDate),
        label: strings([item.startDate, item.endDate]).map(date => displayDate(date, locale)).join(' – ') }, grade: optional(item.gpa),
      description: optional(item.description), logo: optional(item.logo_url), tags: tags(item.type_key) })),
    experience: cv.experiences.map(item => ({ id: identity(item.type_key, experienceId, item.role, item.institution, item.duration),
      title: text(item.role), organization: text(item.institution), description: text(item.description),
      period: { start: optional(item.startDate), end: optional(item.endDate), label: text(item.duration) },
      link: optional(item.url), tags: tags(item.type_key) })),
    projects: cv.projects.map(item => ({ id: identity(item.type_key, projectId, item.title, item.description),
      title: text(item.title), description: text(item.description), tags: tags(item.type_key),
      links: links([{ label: locale === 'de' ? 'Projekt' : 'Project', href: item.url }, { label: 'Repository', href: item.repository_url },
        ...(item.links ?? []).map(link => ({ label: link.label, href: link.url }))]) })),
    skills: Object.entries(cv.skills).flatMap(([category, groups]) => {
      const nonempty = Object.entries(groups).filter(([, items]) => items.length);
      return nonempty.length ? [{ id: groupId(category), key: category, title: skillHeading(category, locale),
        groups: nonempty.map(([name, items]) => ({ id: groupId(category, name), key: name, title: skillHeading(name, locale),
          items: items.map(item => ({ id: skillId(category, name, item.long_name),
            name: text(item.long_name), shortName: text(item.short_name), tags: tags(item.type_key) })) })) }] : [];
    }),
    languages: cv.languages.map(item => ({ id: identity(item.type_key, languageId, item.language), name: text(item.language),
      level: optional(item.proficiency.level), frameworkLevel: optional(item.proficiency.CEFR),
      status: optional(item.proficiency.status), tags: tags(item.type_key),
      certificates: item.certifications.filter(certificate => text(certificate.test)).map(certificate => ({
        name: text(certificate.test), issuer: optional(certificate.organization), date: optional(certificate.examDate),
        score: certificate.overall, maximumScore: certificate.maxScore ?? null, link: optional(certificate.URL) })) })),
    training: cv.workshop_and_certifications.flatMap(group => group.certifications.map(item => ({
      id: identity(item.type_key, trainingId, group.issuer, item.name, item.date), title: text(item.name), issuer: optional(group.issuer),
      date: optional(item.date), duration: optional(item.duration), hasCertificateEvidence: item.certificate,
      link: optional(item.URL), tags: tags(item.type_key) }))),
    publications: cv.publications.map(item => ({ id: identity(item.type_key, publicationId, item.title, item.doi),
      title: text(item.title), authors: strings(item.authors.length ? item.authors : item.authors_structured.map(author => author.literal)),
      kind: text(item.type), status: text(item.status), date: publicationDate(item),
      venue: optional(item.journal) ?? optional(item.book_title) ?? optional(item.conference),
      doi: optional(item.doi) ?? optional(item.identifiers.doi), tags: tags(item.type_key),
      links: links([{ label: locale === 'de' ? 'Publikation' : 'Publication', href: item.url || item.URL }, { label: 'Repository', href: item.repository_url }]) })),
    references: cv.references.map(item => ({ id: identity(item.type_key, referenceId, item.name, item.institution),
      name: text(item.name), role: text(item.position), organization: text(item.institution),
      department: optional(item.department), location: optional(item.location), tags: tags(item.type_key),
      contacts: [...item.email.flatMap(email => contacts(email, { formatted: '', countryCode: '', number: '' })),
        ...(item.phone ?? []).flatMap(phone => contacts('', phone)), ...links([{ label: 'Website', href: item.URL }])] })),
    interests: cv.interests.map(item => ({ id: interestId(item.name), name: text(item.name),
      description: text(item.description), icon: optional(item.icon) })),
    visibleSections: [],
  };
  const sections: [Section, number][] = [
    ['about', content.person.summary || content.person.headlines.length ? 1 : 0],
    ['education', content.education.length], ['experience', content.experience.length],
    ['projects', content.projects.length], ['skills', content.skills.length],
    ['languages', content.languages.length], ['training', content.training.length],
    ['publications', content.publications.length], ['references', content.references.length],
    ['interests', content.interests.length],
  ];
  content.visibleSections = sections.filter(([, count]) => count > 0).map(([section]) => section);
  return content;
}
