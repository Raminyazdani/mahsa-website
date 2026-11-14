import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import type { Locale, WebsiteContent } from '../src/content/model.ts';

const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
export interface CvFingerprint { sha256: string; modelSha256: string; sourceSha256: string; templateSha256: string; assetsSha256: string }
export interface CvArtifact { filename: string; pdfSha256: string; fingerprint: CvFingerprint; verifiedAt: string }
export interface CvArtifactManifest { version: 1; artifacts: Partial<Record<Locale, CvArtifact>> }
export interface CvArtifactStatus { locale: Locale; current: boolean; reason: string; filename: string; href?: string }
export const pdfFilename = (locale: Locale) => `mahsa-cv.${locale}.pdf`;

export async function cvFingerprint(root: string, locale: Locale, model: WebsiteContent): Promise<CvFingerprint> {
  const modelSha256 = hash(JSON.stringify(model));
  const sourceSha256 = hash(await readFile(resolve(root, `content/mahsa-cv.${locale}.json`)));
  const template = await Promise.all(['src/cv.ts', 'src/cv.css'].map(async path => [path, hash(await readFile(resolve(root, path)))]));
  const templateSha256 = hash(JSON.stringify(template));
  const assetPaths = new Set<string>(model.person.images.map(image => image.src));
  for (const education of model.education) if (education.logo) assetPaths.add(education.logo);
  for (const font of await readdir(resolve(root, 'public/fonts'))) if (font.endsWith('.woff2')) assetPaths.add(`/fonts/${font}`);
  const assets = await Promise.all([...assetPaths].sort().map(async path => {
    if (!path.startsWith('/')) throw new Error(`CV asset must be local for reproducible PDF: ${path}`);
    const target = resolve(root, 'public', `.${path}`);
    const publicRoot = resolve(root, 'public');
    if (!target.startsWith(publicRoot + sep)) throw new Error(`Invalid CV asset: ${path}`);
    return [path, hash(await readFile(target))];
  }));
  const assetsSha256 = hash(JSON.stringify(assets));
  return { sha256: hash(JSON.stringify({ modelSha256, sourceSha256, templateSha256, assetsSha256 })), modelSha256, sourceSha256, templateSha256, assetsSha256 };
}

export async function checkCvArtifact(root: string, locale: Locale, model: WebsiteContent): Promise<CvArtifactStatus> {
  const filename = pdfFilename(locale);
  const status = (reason: string): CvArtifactStatus => ({ locale, filename, current: false, reason });
  let pdf: Buffer;
  try { pdf = await readFile(resolve(root, 'public/cv', filename)); }
  catch { return status('no verified local PDF file'); }
  let manifest: CvArtifactManifest;
  try { manifest = JSON.parse(await readFile(resolve(root, 'content/cv-pdf-artifacts.json'), 'utf8')) as CvArtifactManifest; }
  catch { return status('verification stamp is missing or invalid'); }
  const artifact = manifest.version === 1 ? manifest.artifacts?.[locale] : undefined;
  if (!artifact || artifact.filename !== filename) return status('verification stamp is missing for this language');
  if (artifact.pdfSha256 !== hash(pdf)) return status('PDF bytes changed after verification');
  const current = await cvFingerprint(root, locale, model);
  if (artifact.fingerprint?.sha256 !== current.sha256) return status('source, model, CV template, photo or fonts changed after PDF verification');
  return { locale, filename, current: true, reason: 'verified artifact matches current content and CV presentation', href: `/cv/${filename}` };
}

/** The only public-asset copy used by builds; stale PDFs never enter dist. */
export async function publishPublicAssets(root: string, destination: string, models: Record<Locale, WebsiteContent>, warn: (message: string) => void = console.warn): Promise<Record<Locale, CvArtifactStatus>> {
  const source = resolve(root, 'public');
  await cp(source, destination, { recursive: true, filter: path => {
    const part = relative(source, path).replace(/\\/gu, '/');
    return part !== 'cv' && !part.startsWith('cv/');
  } });
  const statuses = {} as Record<Locale, CvArtifactStatus>;
  for (const locale of ['en', 'de'] as const) {
    const status = await checkCvArtifact(root, locale, models[locale]);
    statuses[locale] = status;
    if (status.current) {
      await mkdir(resolve(destination, 'cv'), { recursive: true });
      await cp(resolve(source, 'cv', status.filename), resolve(destination, 'cv', status.filename));
    } else warn(`[CV ${locale}] Download PDF omitted: ${status.reason}. The current HTML/print CV remains available. Run the documented cv:preview → WeasyPrint → cv:verify → cv:stamp workflow.`);
  }
  return statuses;
}
