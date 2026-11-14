import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadWebsiteContent } from '../src/content/index.ts';
import type { Locale, WebsiteContent } from '../src/content/model.ts';
import { checkCvArtifact, cvFingerprint, pdfFilename, publishPublicAssets } from '../scripts/cv-artifacts.ts';
import type { CvArtifactManifest } from '../scripts/cv-artifacts.ts';
import { renderCvDocument } from '../src/cv.ts';

const project = fileURLToPath(new URL('../', import.meta.url));
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'mahsa-pdf-guard-'));
  for (const directory of ['src', 'content', 'public/cv']) await mkdir(resolve(root, directory), { recursive: true });
  for (const path of ['src/cv.ts', 'src/cv.css', 'content/mahsa-cv.en.json', 'content/mahsa-cv.de.json']) await cp(resolve(project, path), resolve(root, path));
  for (const directory of ['fonts', 'images']) await cp(resolve(project, 'public', directory), resolve(root, 'public', directory), { recursive: true });
  const models = Object.fromEntries(await Promise.all((['en', 'de'] as const).map(async locale => [locale, await loadWebsiteContent(locale)]))) as Record<Locale, WebsiteContent>;
  const manifest: CvArtifactManifest = { version: 1, artifacts: {} };
  for (const locale of ['en', 'de'] as const) {
    // Guard fixtures simulate a previously verified artifact; PDF rendering is
    // independently checked against actual PDFs by verify-cv-pdfs.py.
    const bytes = Buffer.from(`%PDF-fixture-${locale}`);
    await writeFile(resolve(root, 'public/cv', pdfFilename(locale)), bytes);
    manifest.artifacts[locale] = { filename: pdfFilename(locale), pdfSha256: createHash('sha256').update(bytes).digest('hex'), fingerprint: await cvFingerprint(root, locale, models[locale]), verifiedAt: new Date().toISOString() };
  }
  await writeFile(resolve(root, 'content/cv-pdf-artifacts.json'), JSON.stringify(manifest));
  return { root, models };
}

test('current stamped PDF is published and linked; JSON mutation omits stale bytes and download link while current CV remains', async () => {
  const { root, models } = await fixture();
  try {
    const current = await publishPublicAssets(root, resolve(root, 'current-dist'), models);
    assert.equal(current.en.current, true);
    assert.ok(await stat(resolve(root, 'current-dist/cv/mahsa-cv.en.pdf')));
    assert.ok(renderCvDocument(models.en, { pdfHref: current.en.href }).includes('href="/cv/mahsa-cv.en.pdf" download'));
    const source = JSON.parse(await readFile(resolve(root, 'content/mahsa-cv.en.json'), 'utf8'));
    source.basics[0].summary = 'Updated CV through source JSON';
    await writeFile(resolve(root, 'content/mahsa-cv.en.json'), JSON.stringify(source));
    models.en = await loadWebsiteContent('en', resolve(root, 'content/mahsa-cv.en.json'));
    const warnings: string[] = [];
    const stale = await publishPublicAssets(root, resolve(root, 'mutated-dist'), models, message => warnings.push(message));
    assert.equal(stale.en.current, false);
    assert.equal(stale.de.current, true);
    assert.equal(await stat(resolve(root, 'mutated-dist/cv/mahsa-cv.en.pdf')).catch(() => null), null);
    const html = renderCvDocument(models.en, { pdfHref: stale.en.href });
    assert.ok(html.includes('Updated CV through source JSON'));
    assert.ok(!html.includes(' download'));
    assert.ok(warnings.some(message => message.includes('cv:verify') && message.includes('omitted')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CV stylesheet and asset changes invalidate download artifacts even when JSON text is unchanged', async () => {
  const { root, models } = await fixture();
  try {
    await writeFile(resolve(root, 'src/cv.css'), (await readFile(resolve(root, 'src/cv.css'), 'utf8')) + '\n/* layout change */');
    assert.equal((await checkCvArtifact(root, 'en', models.en)).current, false);
    await cp(resolve(project, 'src/cv.css'), resolve(root, 'src/cv.css'));
    assert.equal((await checkCvArtifact(root, 'en', models.en)).current, true);
    await writeFile(resolve(root, 'public/images/mahsa-profile.jpg'), 'changed portrait bytes');
    assert.equal((await checkCvArtifact(root, 'en', models.en)).current, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('missing stamp or tampered PDF cannot be published as verified', async () => {
  const { root, models } = await fixture();
  try {
    await writeFile(resolve(root, 'public/cv/mahsa-cv.en.pdf'), '%PDF-changed-after-verification');
    assert.match((await checkCvArtifact(root, 'en', models.en)).reason, /bytes changed/u);
    await rm(resolve(root, 'content/cv-pdf-artifacts.json'));
    assert.equal((await checkCvArtifact(root, 'de', models.de)).current, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
