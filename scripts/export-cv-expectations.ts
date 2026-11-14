/** Derived verification input. Raw source shape stays inside src/content. */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { generateContent, locales } from './generate-content.ts';
import type { WebsiteContent } from '../src/content/model.ts';
import { cvFingerprint } from './cv-artifacts.ts';
import type { CvFingerprint } from './cv-artifacts.ts';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

interface TextFact { path: string; alternatives: string[] }
interface PdfExpectation { locale: string; modelSha256: string; fingerprint: CvFingerprint; name: string; text: TextFact[]; links: { path: string; href: string }[]; images: { path: string; src: string }[]; excluded: { path: string; reason: string }[] }
function expectation(model: WebsiteContent, fingerprint: CvFingerprint): PdfExpectation {
  const result: PdfExpectation = { locale: model.locale, modelSha256: createHash('sha256').update(JSON.stringify(model)).digest('hex'), fingerprint, name: model.person.name, text: [], links: [], images: [], excluded: [] };
  function visit(value: unknown, path = ''): void {
    if (Array.isArray(value)) { value.forEach((item, index) => visit(item, `${path}/${index}`)); return; }
    if (value && typeof value === 'object') { Object.entries(value).forEach(([key, item]) => visit(item, `${path}/${key}`)); return; }
    if (value === null || value === '') return;
    if (path === '/locale' || /\/id$/u.test(path) || /\/key$/u.test(path) || /\/(?:tags|visibleSections)\//u.test(path) || /\/images\/\d+\/kind$/u.test(path) || /\/(?:shortName|icon)$/u.test(path)) {
      result.excluded.push({ path, reason: 'شناسه، alias، طبقه‌بندی یا متادیتای ارائه؛ واقعیت چاپی مستقل نیست.' }); return;
    }
    if (/\/href$/u.test(path) || /\/certificates\/\d+\/link$/u.test(path) || /\/(?:experience|training)\/\d+\/link$/u.test(path)) {
      result.links.push({ path, href: String(value) }); return;
    }
    if (/\/images\/\d+\/src$/u.test(path) || /\/education\/\d+\/logo$/u.test(path)) {
      result.images.push({ path, src: String(value) }); return;
    }
    if (typeof value === 'boolean') {
      if (value && /\/hasCertificateEvidence$/u.test(path)) result.text.push({ path, alternatives: [model.locale === 'de' ? 'Zertifikatsnachweis vorhanden' : 'Certificate evidence supplied'] });
      else result.excluded.push({ path, reason: 'نبود شواهد گواهی، ادعای مدرک یا متن رزومه نیست.' });
      return;
    }
    const text = String(value);
    result.text.push({ path, alternatives: text === 'present' && model.locale === 'de' ? ['heute'] : [text] });
  }
  visit(model);
  for (const [index, publication] of model.publications.entries()) if (publication.doi) result.links.push({ path: `/publications/${index}/doi`, href: `https://doi.org/${publication.doi}` });
  return result;
}
export async function writeCvExpectations(): Promise<void> {
  const models = await generateContent();
  const root = fileURLToPath(new URL('../', import.meta.url));
  const directory = new URL('../output/cv-verification/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const expectations = await Promise.all(locales.map(async locale => expectation(models[locale], await cvFingerprint(root, locale, models[locale]))));
  await writeFile(new URL('expectations.json', directory), JSON.stringify({ generatedAt: new Date().toISOString(), models: expectations }, null, 2));
  console.log('Derived all PDF text/link/image expectations from WebsiteContent: output/cv-verification/expectations.json');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await writeCvExpectations();
