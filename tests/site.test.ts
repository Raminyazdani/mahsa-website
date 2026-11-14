import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadWebsiteContent, toWebsiteContent } from '../src/content/index.ts';
import { renderHome, renderProject } from '../src/render/page.ts';
import { stationsFor, groupAppearance, projectAppearance, categoryAppearance } from '../src/app/appearance.ts';
import { parseCefr, isNative, parseDate, formatPeriod } from '../src/app/format.ts';
import { escapeHtml } from '../src/cv.ts';
import type { SourceCv } from '../src/content/source/types.ts';

const options = { pdfHref: null, assetVersion: 'test' };
const strip = (html: string) => html.replace(/<[^>]+>/gu, ' ').replace(/&amp;/gu, '&').replace(/&#39;/gu, "'").replace(/&quot;/gu, '"').replace(/\s+/gu, ' ');

for (const locale of ['en', 'de'] as const) {
  test(`${locale}: every record, method, project and contact is on the home page`, async () => {
    const model = await loadWebsiteContent(locale);
    const html = renderHome(model, { ...options, kind: 'home' });
    const text = strip(html);
    for (const category of model.skills) for (const group of category.groups) for (const item of group.items) assert.ok(html.includes(`data-skill="${item.id}"`), item.name);
    for (const item of [...model.education, ...model.experience]) assert.ok(html.includes(`id="record-${item.id}"`), item.id);
    for (const project of model.projects) { assert.ok(text.includes(project.title), project.title); for (const part of project.description.split(/\n\s*\n/u)) assert.ok(text.includes(part.replace(/\s+/gu, ' ').trim()), part.slice(0, 30)); }
    for (const item of model.training) assert.ok(text.includes(item.title), item.title);
    for (const item of model.languages) assert.ok(text.includes(item.name), item.name);
    for (const link of [...model.person.contacts, ...model.profiles]) assert.ok(html.includes(`href="${escapeHtml(link.href)}"`), link.href);
    assert.ok(html.includes(model.person.images[0]!.src));
    assert.ok(!/ramin|yazdani|lorem ipsum/iu.test(text), 'no reference-person data or placeholders');
    assert.ok(html.includes(`lang="${locale}"`) && html.includes('data-mode="portfolio"'));
  });
  test(`${locale}: lab pages open the requested station; project pages carry the full record`, async () => {
    const model = await loadWebsiteContent(locale);
    const lab = renderHome(model, { ...options, kind: 'lab', station: 'journey' });
    assert.ok(lab.includes('data-mode="lab"') && lab.includes('data-station="journey"'));
    for (const id of stationsFor(model)) assert.ok(lab.includes(`data-station-link="${id}"`), `lab map lists ${id}`);
    for (const project of model.projects) {
      const page = renderProject(model, project.id, { ...options, kind: 'project' });
      assert.ok(strip(page).includes(project.title) && page.includes(`data-project-page="${project.id}"`));
    }
  });
}

test('collections grow without hidden caps and unknown groups/projects still render', async () => {
  const source = JSON.parse(await readFile(new URL('../content/mahsa-cv.en.json', import.meta.url), 'utf8')) as SourceCv;
  for (let i = 0; i < 60; i++) source.projects.push({ title: `Project ${i}`, description: `Description ${i}`, url: null, type_key: [] });
  source.skills['New category'] = { 'Unseen group': Array.from({ length: 140 }, (_, i) => ({ long_name: `Method ${i}`, short_name: `M${i}`, type_key: [] })) };
  const model = toWebsiteContent(source);
  const html = renderHome(model, { ...options, kind: 'home' });
  assert.equal((html.match(/class="experiment"/gu) ?? []).length, model.projects.length);
  assert.ok(html.includes('Method 139') && html.includes('Project 59'));
  assert.equal(groupAppearance('Unseen group'), 'tubes');
  assert.equal(projectAppearance('something-new'), 'specimen');
  assert.ok(categoryAppearance('New category', 9).channel);
});

test('empty optional sections disappear cleanly', async () => {
  const source = JSON.parse(await readFile(new URL('../content/mahsa-cv.en.json', import.meta.url), 'utf8')) as SourceCv;
  source.workshop_and_certifications = []; source.languages = []; source.projects = [];
  const model = toWebsiteContent(source);
  const html = renderHome(model, { ...options, kind: 'home' });
  for (const id of ['training', 'languages', 'projects']) assert.ok(!html.includes(`id="${id}"`), id);
  assert.ok(html.includes('id="methods"') && html.includes('id="journey"'));
});

test('levels and dates are read from the CV text without inventing precision', () => {
  assert.deepEqual(parseCefr('B1-B2'), { from: 2, to: 3 });
  assert.deepEqual(parseCefr('B2'), { from: 3, to: 3 });
  assert.equal(parseCefr('Native'), null);
  assert.ok(isNative('Native') && isNative('Muttersprache') && !isNative('B2'));
  assert.deepEqual(parseDate('2023'), { value: 2023, precision: 'year' });
  assert.equal(parseDate('2024-03')!.precision, 'month');
  assert.equal(parseDate('present')!.precision, 'present');
  assert.equal(parseDate('soon'), null);
  assert.equal(formatPeriod({ start: '2024-03', end: 'present', label: '' }, 'de'), 'März 2024 – heute');
});
