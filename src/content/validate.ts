import { Ajv } from 'ajv';
import type { ErrorObject } from 'ajv';
import { sourceSchema } from './source/schema.ts';
import type { SourceCv } from './source/types.ts';

export interface ContentIssue { path: string; message: string }
export class ContentValidationError extends Error {
  readonly issues: ContentIssue[];
  constructor(issues: ContentIssue[], source = 'CV JSON') {
    super(`${source} is invalid:\n${issues.map(issue => `  ${issue.path}: ${issue.message}`).join('\n')}`);
    this.name = 'ContentValidationError';
    this.issues = issues;
  }
}

// Compile once. Validation never edits the source or fills in missing facts.
const validate = new Ajv({ allErrors: true, strict: true }).compile<SourceCv>(sourceSchema);
const escapePointer = (value: string) => value.replace(/~/g, '~0').replace(/\//g, '~1');
function structuralIssue(error: ErrorObject): ContentIssue {
  const property = error.keyword === 'required' ? error.params.missingProperty
    : error.keyword === 'additionalProperties' ? error.params.additionalProperty : null;
  return {
    path: `${error.instancePath}${property ? `/${escapePointer(property)}` : ''}` || '/',
    message: error.message ?? 'Invalid value',
  };
}

function allowedUrl(value: string): boolean {
  if (!value.trim()) return true;
  if (value !== value.trim() || /[\u0000-\u0020\\]/u.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) {
    return !value.split('/').some(part => part === '..');
  }
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function validateSource(value: unknown, source?: string): SourceCv {
  if (!validate(value)) {
    throw new ContentValidationError((validate.errors ?? []).map(structuralIssue), source);
  }
  const issues: ContentIssue[] = [];
  const requireText = (text: string, path: string) => {
    if (!text.trim()) issues.push({ path, message: 'Must contain text when this item is present' });
  };
  requireText(value.config.ID, '/config/ID');
  if (!['en', 'de'].includes(value.config.lang)) {
    issues.push({ path: '/config/lang', message: 'Supported languages are en and de' });
  }
  if (![value.basics[0].fname, value.basics[0].lname].some(text => text.trim())) {
    issues.push({ path: '/basics/0', message: 'At least one name must contain text' });
  }
  value.profiles.forEach((item, i) => requireText(item.network, `/profiles/${i}/network`));
  value.profiles.forEach((item, i) => requireText(item.url, `/profiles/${i}/url`));
  value.basics[0].Pictures.forEach((item, i) => requireText(item.URL, `/basics/0/Pictures/${i}/URL`));
  value.education.forEach((item, i) => requireText(item.institution, `/education/${i}/institution`));
  value.experiences.forEach((item, i) => requireText(item.role, `/experiences/${i}/role`));
  value.projects.forEach((item, i) => requireText(item.title, `/projects/${i}/title`));
  value.publications.forEach((item, i) => requireText(item.title, `/publications/${i}/title`));
  value.references.forEach((item, i) => requireText(item.name, `/references/${i}/name`));
  value.interests.forEach((item, i) => requireText(item.name, `/interests/${i}/name`));
  value.languages.forEach((item, i) => requireText(item.language, `/languages/${i}/language`));
  value.languages.forEach((item, i) => item.certifications.forEach((certificate, j) => {
    const hasEvidence = Object.entries(certificate).some(([key, field]) => key !== 'test' &&
      field !== null && field !== undefined && (typeof field !== 'string' || field.trim()));
    if (hasEvidence && !certificate.test?.trim()) {
      issues.push({ path: `/languages/${i}/certifications/${j}/test`,
        message: 'Name the language test when certificate details are provided' });
    }
  }));
  value.publications.forEach((item, i) => {
    const invalidMonth = item.month !== null && (item.month < 1 || item.month > 12);
    const invalidDay = item.day !== null && (item.day < 1 || item.day > 31);
    if (invalidMonth) issues.push({ path: `/publications/${i}/month`, message: 'Use a month from 1 to 12 or null' });
    if (invalidDay) issues.push({ path: `/publications/${i}/day`, message: 'Use a day from 1 to 31 or null' });
    if (item.month !== null && item.year === null) {
      issues.push({ path: `/publications/${i}/year`, message: 'A publication month needs its year' });
    }
    if (item.day !== null && item.month === null) {
      issues.push({ path: `/publications/${i}/month`, message: 'A publication day needs its month' });
    }
    if (item.year !== null && item.month !== null && item.day !== null && !invalidMonth && !invalidDay) {
      const daysInMonth = new Date(Date.UTC(item.year, item.month, 0)).getUTCDate();
      if (item.day > daysInMonth) issues.push({ path: `/publications/${i}/day`, message: 'This day does not exist in the supplied month' });
    }
  });
  value.workshop_and_certifications.forEach((group, i) => group.certifications.forEach((item, j) =>
    requireText(item.name, `/workshop_and_certifications/${i}/certifications/${j}/name`)));
  for (const [category, groups] of Object.entries(value.skills)) {
    for (const [group, items] of Object.entries(groups)) {
      items.forEach((item, i) => requireText(item.long_name,
        `/skills/${escapePointer(category)}/${escapePointer(group)}/${i}/long_name`));
    }
  }
  // Do not inspect provenance: it is never emitted to the public model.
  function checkLinks(node: unknown, path = ''): void {
    if (Array.isArray(node)) { node.forEach((item, i) => checkLinks(item, `${path}/${i}`)); return; }
    if (!node || typeof node !== 'object') return;
    for (const [key, item] of Object.entries(node)) {
      if (key.startsWith('_')) continue;
      const itemPath = `${path}/${escapePointer(key)}`;
      if (key === 'type_key' && Array.isArray(item)) {
        const recordKeys = item.filter((tag): tag is string => typeof tag === 'string' && tag.startsWith('record:'));
        if (recordKeys.length > 1 || recordKeys.some(tag => !/^record:[a-z0-9][a-z0-9-]*$/u.test(tag))) {
          issues.push({ path: itemPath, message: 'Use at most one record:<lowercase-slug> identity tag' });
        }
      }
      if (['url', 'URL', 'logo_url', 'repository_url', 'profile_url'].includes(key) &&
          typeof item === 'string' && !allowedUrl(item)) {
        issues.push({ path: itemPath, message: 'Use an http(s) URL or a root-relative asset path' });
      }
      if (key === 'email') {
        const emails = Array.isArray(item) ? item : [item];
        emails.forEach((email, index) => {
          if (typeof email === 'string' && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
            issues.push({ path: Array.isArray(item) ? `${itemPath}/${index}` : itemPath,
              message: 'Use a valid email address or leave it empty' });
          }
        });
      }
      checkLinks(item, itemPath);
    }
  }
  checkLinks(value);
  if (issues.length) throw new ContentValidationError(issues, source);
  return value;
}
