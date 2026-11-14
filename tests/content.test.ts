import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, writeFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toWebsiteContent, loadWebsiteContent, ContentValidationError } from '../src/content/index.ts';
import type { SourceCv, SourcePublication } from '../src/content/source/types.ts';

const original = JSON.parse(await readFile(new URL('../content/mahsa-cv.en.json', import.meta.url), 'utf8')) as SourceCv;
const fresh = () => structuredClone(original);

for (const locale of ['en', 'de'] as const) {
  test(`${locale} loads the merged CV through the public entry point`, async () => {
    const result = await loadWebsiteContent(locale);
    assert.equal(result.locale, locale);
    assert.equal(result.person.name, 'Mahsa Nejadhossein');
    assert.equal(result.person.id, 'mahsa_nejadhossein');
    assert.ok(result.person.contacts.some(link => link.href === 'mailto:mahsa.nejad77@gmail.com'));
    assert.ok(result.person.contacts.some(link => link.href === 'tel:+4917664777330'));
    const skills = result.skills.flatMap(category => category.groups.flatMap(group => group.items));
    assert.ok(skills.some(skill => skill.name === 'FinchTV'), 'German-only fact must exist in both locales');
    assert.ok(result.languages.some(language => language.frameworkLevel === 'B1-B2'));
    assert.ok(result.projects.length > 0);
    assert.ok(result.visibleSections.includes('projects'));
    assert.equal(result.person.images[0]?.src, '/images/mahsa-profile.jpg');
  });
}

test('the adapter leaves the source unchanged', () => {
  const input = fresh();
  const before = structuredClone(input);
  toWebsiteContent(input);
  assert.deepEqual(input, before);
});

test('a new project and a new skill category appear without UI or mapping edits', () => {
  const input = fresh();
  input.projects.push({ title: 'New research project', description: 'New content from JSON',
    url: 'https://example.org/research', type_key: [] });
  input.skills['New category'] = { 'New subgroup': [
    { long_name: 'New method', short_name: 'Method', type_key: [] },
  ] };
  const output = toWebsiteContent(input);
  assert.equal(output.projects.at(-1)?.title, 'New research project');
  assert.equal(output.projects.at(-1)?.links[0]?.href, 'https://example.org/research');
  assert.equal(output.skills.at(-1)?.groups[0]?.items[0]?.name, 'New method');
});

test('removing content hides sections and empty skill groups', () => {
  const input = fresh();
  input.projects = [];
  input.education = [];
  input.experiences = [];
  input.languages = [];
  input.workshop_and_certifications = [];
  input.skills = { 'Empty category': { 'Empty subgroup': [] } };
  const result = toWebsiteContent(input);
  assert.deepEqual(result.visibleSections, ['about']);
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.projects, []);
  assert.deepEqual(result.training, []);
});

test('item IDs survive reordering and remain unique for identical entries', () => {
  const input = fresh();
  const before = toWebsiteContent(input).projects.map(project => project.id);
  input.projects.reverse();
  assert.deepEqual(toWebsiteContent(input).projects.map(project => project.id), [...before].reverse());
  input.projects.push(structuredClone(input.projects[0]!));
  const ids = toWebsiteContent(input).projects.map(project => project.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('CV facts remain complete while internal provenance never enters the website model', () => {
  const input = fresh();
  input.basics[0].birthDate = '1900-01-01';
  input.basics[0].location[0]!.address = 'PRIVATE STREET';
  input.basics[0].location[0]!.postalCode = 'PRIVATE POSTCODE';
  input.projects[0]!._verification = { internal: 'PRIVATE REVIEW NOTE' };
  const output = JSON.stringify(toWebsiteContent(input));
  for (const value of ['1900-01-01', 'PRIVATE STREET', 'PRIVATE POSTCODE']) assert.ok(output.includes(value));
  for (const value of ['PRIVATE REVIEW NOTE', '_verification', 'type_key']) {
    assert.ok(!output.includes(value), `Unexpected source-only value: ${value}`);
  }
});

test('month/year precision and unknown training evidence are preserved', () => {
  const result = toWebsiteContent(fresh());
  const internship = result.experience.find(item => item.organization.includes('Shafa'))!;
  assert.equal(internship.period.start, '2022-07');
  assert.equal(internship.period.end, '2023');
  assert.ok(result.training.every(item => item.issuer === null && item.date === null && !item.hasCertificateEvidence));
  assert.equal(result.education[0]?.grade, '2.2 (current average; German grading scale)');
});

test('German website labels are localized without changing storage keys', async () => {
  const result = await loadWebsiteContent('de');
  assert.equal(result.education[0]?.period.label, '2024-03 – heute');
  assert.ok(result.skills.some(group => group.title === 'Labormethoden'));
  assert.ok(result.skills.some(group => group.groups.some(child => child.title === 'Office- und Designsoftware')));
});

test('schema errors identify the bad field and reject wrong casing', () => {
  const invalid = fresh() as unknown as Record<string, unknown>;
  invalid['workshopAndCertifications'] = invalid['workshop_and_certifications'];
  delete invalid['workshop_and_certifications'];
  assert.throws(() => toWebsiteContent(invalid), (error: unknown) => {
    assert.ok(error instanceof ContentValidationError);
    assert.ok(error.issues.some(issue => issue.path === '/workshop_and_certifications'));
    assert.ok(error.issues.some(issue => issue.path === '/workshopAndCertifications'));
    return true;
  });
  const nested = fresh();
  (nested.education[0] as unknown as Record<string, unknown>)['startDate'] = 2024;
  assert.throws(() => toWebsiteContent(nested), (error: unknown) => {
    assert.ok(error instanceof ContentValidationError);
    assert.ok(error.issues.some(issue => issue.path === '/education/0/startDate'));
    return true;
  });
});

test('invalid URLs fail with their field path rather than being published or dropped', () => {
  const input = fresh();
  input.projects[0]!.url = 'javascript:alert(1)';
  assert.throws(() => toWebsiteContent(input), (error: unknown) => {
    assert.ok(error instanceof ContentValidationError);
    assert.ok(error.issues.some(issue => issue.path === '/projects/0/url'));
    return true;
  });
});

test('meaningful unnamed language evidence is rejected, while empty placeholders are omitted', () => {
  const input = fresh();
  const certificate = { test: null, organization: null, overall: null, reading: null,
    listening: null, writing: null, speaking: null, examDate: null, URL: null };
  input.languages[0]!.certifications.push(certificate);
  assert.equal(toWebsiteContent(input).languages[0]?.certificates.length, 0);
  input.languages[0]!.certifications[0]!.overall = 0;
  assert.throws(() => toWebsiteContent(input), (error: unknown) => {
    assert.ok(error instanceof ContentValidationError);
    assert.ok(error.issues.some(issue => issue.path === '/languages/0/certifications/0/test'));
    return true;
  });
  input.languages[0]!.certifications[0]!.test = 'Example test';
  assert.equal(toWebsiteContent(input).languages[0]?.certificates[0]?.score, 0);
});

test('adding a publication preserves book venue, date precision and nested DOI', () => {
  const input = fresh();
  const chapter: SourcePublication = {
    title: 'Example chapter', authors: ['Example Author'], authors_structured: [],
    type: 'chapter', status: 'published', year: 2025, month: 2, day: 3, date: null,
    journal: '', volume: null, issue: null, pages: null, article_number: null,
    doi: null, issn: null, url: null, access_date: null, language: null,
    publisher: null, place: null, editors: null, book_title: 'Example book',
    chapter_pages: null, edition: null, conference: null, degree_type: null,
    repository_url: null, correspondent: '', supervisors: null, institution: null,
    faculty: null, school: null, isbn: null, submissionDate: null,
    identifiers: { doi: '10.1000/example', isbn: null, issn: null, pmid: null, pmcid: null, arxiv: null },
    notes: null, URL: null, type_key: [],
  };
  input.publications.push(chapter);
  const output = toWebsiteContent(input);
  assert.ok(output.visibleSections.includes('publications'));
  assert.equal(output.publications[0]?.venue, 'Example book');
  assert.equal(output.publications[0]?.date, '2025-02-03');
  assert.equal(output.publications[0]?.doi, '10.1000/example');
  chapter.day = null;
  assert.equal(toWebsiteContent(input).publications[0]?.date, '2025-02');
  chapter.month = null;
  assert.equal(toWebsiteContent(input).publications[0]?.date, '2025');
});

test('each load reads current JSON and reports the file for malformed or mismatched content', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mahsa-content-'));
  const file = join(directory, 'cv.json');
  try {
    const input = fresh();
    await writeFile(file, JSON.stringify(input));
    assert.equal((await loadWebsiteContent('en', file)).person.summary, input.basics[0].summary);
    input.basics[0].summary = 'Updated through JSON only';
    await writeFile(file, JSON.stringify(input));
    assert.equal((await loadWebsiteContent('en', file)).person.summary, 'Updated through JSON only');
    await assert.rejects(loadWebsiteContent('de', file), /config\/lang/);
    await writeFile(file, '{ invalid JSON');
    await assert.rejects(loadWebsiteContent('en', file), (error: unknown) => {
      assert.ok(error instanceof ContentValidationError);
      assert.ok(error.message.includes(file));
      return true;
    });
  } finally {
    await rm(file, { force: true });
    await rmdir(directory);
  }
});
