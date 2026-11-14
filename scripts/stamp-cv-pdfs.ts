/** Explicitly accepts successfully verified PDFs for static publication. */
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { generateContent, locales } from './generate-content.ts';
import { cvFingerprint, pdfFilename } from './cv-artifacts.ts';
import type { CvArtifactManifest, CvFingerprint } from './cv-artifacts.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const reportArg = process.argv.find(arg => arg.startsWith('--report='))?.slice('--report='.length);
const report = JSON.parse(await readFile(resolve(root, reportArg ?? 'docs/evidence/pdf/verification.json'), 'utf8')) as { checks: { locale: string; pdf: string; sha256: string; modelSha256: string; fingerprint: CvFingerprint; result: string; verifiedTextFacts: number }[] };
const models = await generateContent();
const manifest: CvArtifactManifest = { version: 1, artifacts: {} };
// Validate every record before copying either file or changing the stamp.
const accepted = await Promise.all(locales.map(async locale => {
  const record = report.checks?.find(item => item.locale === locale);
  if (!record || record.result !== 'pass' || !record.verifiedTextFacts) throw new Error(`${locale}: run cv:verify successfully before stamping`);
  const fingerprint = await cvFingerprint(root, locale, models[locale]);
  if (record.modelSha256 !== fingerprint.modelSha256 || record.fingerprint?.sha256 !== fingerprint.sha256) throw new Error(`${locale}: verification is stale after a source/template/asset edit. Regenerate PDFs and run cv:verify again.`);
  const filename = pdfFilename(locale);
  const path = resolve(record.pdf);
  const allowed = [resolve(root, `output/pdf/Mahsa-Nejadhossein-CV-${locale}.pdf`), resolve(root, 'public/cv', filename)];
  if (!allowed.includes(path)) throw new Error(`${locale}: stamp only accepts the documented output/pdf or public/cv paths`);
  const sha256 = createHash('sha256').update(await readFile(path)).digest('hex');
  if (sha256 !== record.sha256) throw new Error(`${locale}: PDF bytes changed after verification; run cv:verify again`);
  return { locale, filename, path, sha256, fingerprint };
}));
await mkdir(resolve(root, 'public/cv'), { recursive: true });
for (const record of accepted) {
  const target = resolve(root, 'public/cv', record.filename);
  if (record.path !== target) await cp(record.path, target);
  manifest.artifacts[record.locale] = { filename: record.filename, pdfSha256: record.sha256, fingerprint: record.fingerprint, verifiedAt: new Date().toISOString() };
}
await writeFile(resolve(root, 'content/cv-pdf-artifacts.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Stamped verified English and German PDFs. Build will publish them only while content, CV template and assets match.');
