import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateContent, locales } from './generate-content.ts';
import { renderCvDocument, escapeHtml } from '../src/cv.ts';
import { renderHome, renderProject, renderNotFound } from '../src/render/page.ts';
import { stationsFor } from '../src/app/appearance.ts';
import { markFile } from '../src/render/mark.ts';
import { rootRedirect } from '../src/app/state.ts';
import { publishPublicAssets } from './cv-artifacts.ts';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const distRoot = resolve(projectRoot, 'dist');

async function writeRoute(route: string, html: string): Promise<void> {
  const dir = resolve(distRoot, `.${route}`);
  if (dir !== distRoot && !dir.startsWith(distRoot + sep)) throw new Error(`Invalid build route: ${route}`);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, 'index.html'), html);
}

export async function buildSite(): Promise<void> {
  const started = performance.now();
  const content = await generateContent();
  // Only the fixed output child is removable. Never delete sources.
  if (dirname(distRoot) !== resolve(projectRoot) || !distRoot.endsWith(`${sep}dist`)) throw new Error('Unsafe output directory');
  await rm(distRoot, { recursive: true, force: true });
  await mkdir(resolve(distRoot, 'assets'), { recursive: true });
  const cvArtifacts = await publishPublicAssets(projectRoot, distRoot, content);

  const result = await build({
    absWorkingDir: projectRoot, entryPoints: { app: 'src/main.ts' }, outdir: 'dist/assets', bundle: true, splitting: true,
    format: 'esm', platform: 'browser', target: ['es2022', 'chrome111', 'firefox115', 'safari16.4'], minify: true, sourcemap: false, metafile: true,
    external: ['/fonts/*', '/images/*'], chunkNames: 'chunks/[name]-[hash]', legalComments: 'linked', logLevel: 'warning',
  });
  await cp(resolve(projectRoot, 'src/cv.css'), resolve(distRoot, 'assets/cv.css'));
  await writeFile(resolve(distRoot, 'assets/cv-print.js'), `document.querySelector('#print-cv')?.addEventListener('click',()=>window.print());`);
  await writeFile(resolve(distRoot, 'favicon.svg'), markFile());

  const bundleHash = createHash('sha256');
  for (const file of ['app.js', 'app.css']) bundleHash.update(await readFile(resolve(distRoot, 'assets', file)).catch(() => Buffer.from('')));
  const assetVersion = bundleHash.digest('hex').slice(0, 10);

  let routes = 0;
  for (const locale of locales) {
    const model = content[locale];
    const pdfHref = cvArtifacts[locale].current ? cvArtifacts[locale].href ?? null : null;
    const base = { pdfHref, assetVersion };
    await writeRoute(`/${locale}/`, renderHome(model, { ...base, kind: 'home' })); routes++;
    await writeRoute(`/${locale}/lab/`, renderHome(model, { ...base, kind: 'lab', station: 'start' })); routes++;
    for (const station of stationsFor(model).filter(id => id !== 'start')) {
      await writeRoute(`/${locale}/lab/${station}/`, renderHome(model, { ...base, kind: 'lab', station })); routes++;
    }
    for (const project of model.projects) {
      await writeRoute(`/${locale}/projects/${project.id}/`, renderProject(model, project.id, { ...base, kind: 'project' })); routes++;
    }
    await writeRoute(`/${locale}/cv/`, renderCvDocument(model, pdfHref ? { pdfHref } : {})); routes++;
  }
  const en = content.en;
  await writeFile(resolve(distRoot, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(en.person.name)}</title><script>${rootRedirect}</script><style>body{font:16px/1.6 system-ui,sans-serif;background:#07060f;color:#f1efff;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#b8a2ff}</style></head><body><main><h1>${escapeHtml(en.person.name)}</h1><p><a href="/en/">English</a> · <a href="/de/">Deutsch</a></p><p><a href="/en/cv/">Complete CV</a> · <a href="/de/cv/">Vollständiger Lebenslauf</a></p></main></body></html>`);
  await writeFile(resolve(distRoot, '404.html'), renderNotFound(en, { kind: 'notfound', pdfHref: null, assetVersion }));
  await writeFile(resolve(projectRoot, 'docs/build-manifest.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), node: process.version, routes,
    outputs: Object.fromEntries(Object.entries(result.metafile!.outputs).map(([path, output]) => [path, { bytes: output.bytes }])),
  }, null, 2));
  const outputs = Object.entries(result.metafile!.outputs);
  const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
  const main = outputs.find(([path]) => path.endsWith('assets/app.js'))?.[1].bytes ?? 0;
  const css = outputs.find(([path]) => path.endsWith('assets/app.css'))?.[1].bytes ?? 0;
  const lazy = outputs.filter(([path]) => path.includes('/chunks/') && path.endsWith('.js')).reduce((sum, [, output]) => sum + output.bytes, 0);
  console.log(`Built ${routes} pages (EN + DE, portfolio, lab stations, projects, CVs) in ${Math.round(performance.now() - started)} ms. JS ${kb(main)} + lazy ${kb(lazy)}, CSS ${kb(css)}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildSite();
