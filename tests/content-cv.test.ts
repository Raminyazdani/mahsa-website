import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { toWebsiteContent, loadWebsiteContent, ContentValidationError } from '../src/content/index.ts';
import { auditContent } from '../src/content/audit.ts';
import { renderCvBody, renderCvDocument, escapeHtml } from '../src/cv.ts';
import type { SourceCv } from '../src/content/source/types.ts';

const original = JSON.parse(await readFile(new URL('../content/mahsa-cv.en.json', import.meta.url), 'utf8')) as SourceCv;
const fresh = () => structuredClone(original);

for (const locale of ['en', 'de'] as const) {
  test(`${locale}: each source fact reaches the complete rendered CV`, async () => {
    const audit = await auditContent(locale);
    assert.equal(audit.missing.length, 0);
    assert.ok(audit.factCount > 100);
    const model = await loadWebsiteContent(locale);
    const html = renderCvDocument(model);
    assert.ok(html.includes(`lang="${locale}"`));
    for (const item of [...model.education, ...model.experience, ...model.projects, ...model.training, ...model.languages]) {
      assert.ok(html.includes(`data-content-id="${item.id}"`), item.id);
    }
    for (const contact of [...model.person.contacts, ...model.profiles]) assert.ok(html.includes(`href="${escapeHtml(contact.href)}"`));
    assert.ok(html.includes('width="266" height="266"'));
    assert.ok(html.includes('photolab'));
    assert.ok(!html.includes('data-content-id="record:'));
    assert.ok(!html.includes('id="cv-publications"'));
  });
}

test('a semantic storage-envelope migration leaves the public model and complete CV unchanged', () => {
  const source = fresh();
  const expected = toWebsiteContent(source);
  const migrated = toWebsiteContent({ formatVersion: 2, cv: source });
  assert.deepEqual(migrated, expected);
  assert.equal(renderCvBody(migrated), renderCvBody(expected));
  assert.throws(() => toWebsiteContent({ formatVersion: 3, cv: source }), (error: unknown) => error instanceof ContentValidationError && error.issues[0]?.path === '/formatVersion');
});

test('add/edit/remove/reorder propagates for every current content collection without presentation edits', () => {
  const source = fresh();
  source.basics[0].summary = 'Changed source summary';
  source.education.reverse();
  source.experiences.reverse();
  source.projects.reverse();
  source.languages.reverse();
  source.workshop_and_certifications[0]!.certifications.reverse();
  const group = source.skills['Programming & Scripting']!['Programming Languages']!;
  group.reverse();
  source.projects[0]!.title = 'Edited title from source';
  source.education.push({ ...structuredClone(source.education[0]!), institution: 'Added education', type_key: [] });
  source.experiences.push({ ...structuredClone(source.experiences[0]!), role: 'Added experience', type_key: [] });
  source.languages.push({ ...structuredClone(source.languages[0]!), language: 'Added language', type_key: [] });
  source.workshop_and_certifications[0]!.certifications.push({ ...structuredClone(source.workshop_and_certifications[0]!.certifications[0]!), name: 'Added training', type_key: [] });
  group.push({ long_name: 'Added method', short_name: 'Added', type_key: [] });
  const model = toWebsiteContent(source);
  assert.equal(model.person.summary, source.basics[0].summary);
  assert.equal(model.education[0]!.institution, original.education.at(-1)!.institution);
  assert.equal(model.experience[0]!.title, original.experiences.at(-1)!.role);
  assert.equal(model.projects[0]!.title, 'Edited title from source');
  assert.equal(model.languages[0]!.name, original.languages.at(-1)!.language);
  const html = renderCvBody(model);
  for (const value of ['Added education', 'Added experience', 'Added language', 'Added training', 'Added method', 'Edited title from source', 'Changed source summary']) assert.ok(html.includes(value));
  source.education = []; source.experiences = []; source.projects = []; source.languages = [];
  source.workshop_and_certifications = []; source.skills = {};
  const empty = renderCvBody(toWebsiteContent(source));
  for (const id of ['education', 'experience', 'projects', 'skills', 'languages', 'training']) assert.ok(!empty.includes(`id="cv-${id}"`));
});

test('large collections are rendered in full with unique stable item markers', () => {
  const source = fresh();
  source.projects = Array.from({ length: 240 }, (_, index) => ({ title: `Research ${index}`, description: `Source description ${index}`, url: null, type_key: [`record:research-${index}`] }));
  source.skills = { 'Growing collection': { 'Methods': Array.from({ length: 1000 }, (_, index) => ({ long_name: `Method ${index}`, short_name: `M${index}`, type_key: [] })) } };
  source.experiences = Array.from({ length: 110 }, (_, index) => ({ role: `Role ${index}`, institution: 'Test organization', duration: '2020', description: '', type_key: [] }));
  const model = toWebsiteContent(source);
  const html = renderCvBody(model);
  assert.equal(model.projects.length, 240);
  assert.equal(model.skills[0]!.groups[0]!.items.length, 1000);
  assert.equal((html.match(/data-content-id="research-/gu) ?? []).length, 240);
  for (const item of model.skills[0]!.groups[0]!.items) assert.ok(html.includes(`data-content-id="${item.id}"`));
  assert.equal(new Set(model.experience.map(item => item.id)).size, 110);
  assert.ok(html.includes('Research 239') && html.includes('Method 999') && html.includes('Role 109'));
});

test('source values are escaped in text, attributes and complete CV output', () => {
  const source = fresh();
  source.projects[0]!.title = '<script>alert("title")</script>';
  source.projects[0]!.description = '<img src=x onerror=alert(1)> & quoted';
  const html = renderCvDocument(toWebsiteContent(source));
  assert.ok(html.includes('&lt;script&gt;alert(&quot;title&quot;)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert('));
  assert.ok(!html.includes('<img src=x'));
});

test('PDF downloads are explicit and only emitted when the builder confirms a file', () => {
  const model = toWebsiteContent(fresh());
  assert.ok(!renderCvDocument(model).includes(' download'));
  const html = renderCvDocument(model, { pdfHref: '/cv/mahsa-cv.en.pdf' });
  assert.ok(html.includes('href="/cv/mahsa-cv.en.pdf" download'));
});
