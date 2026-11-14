/** Isolated QA preview; independent of the in-progress app/scenes build. */
import { createServer } from 'node:http';
import { cp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateContent, locales } from './generate-content.ts';
import { renderCvDocument } from '../src/cv.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const preview = resolve(root, 'output/cv-preview');
const port = Number(process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] ?? 4318);
const content = await generateContent();
await mkdir(resolve(root, 'output/pdf'), { recursive: true });
await mkdir(resolve(preview, 'assets'), { recursive: true });
for (const folder of ['fonts', 'images']) await cp(resolve(root, 'public', folder), resolve(preview, folder), { recursive: true });
await cp(resolve(root, 'src/cv.css'), resolve(preview, 'assets/cv.css'));
await writeFile(resolve(preview, 'assets/cv-print.js'), `document.querySelector('#print-cv')?.addEventListener('click',()=>window.print());`);
for (const locale of locales) {
  const directory = resolve(preview, locale, 'cv');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'index.html'), renderCvDocument(content[locale]));
}
await writeFile(resolve(preview, 'index.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><title>CV QA preview</title><h1>CV QA preview</h1><a href="/en/cv/">English CV</a> · <a href="/de/cv/">Deutscher Lebenslauf</a></html>');
console.log(`Complete CV QA HTML generated in ${preview}`);
if (process.argv.includes('--build-only')) process.exit(0);
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    let target = resolve(preview, `.${decodeURIComponent(url.pathname)}`);
    if (target !== preview && !target.startsWith(preview + sep)) { response.writeHead(403); response.end(); return; }
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    const body = await readFile(target);
    response.setHeader('Content-Type', types[extname(target)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Isolated CV QA preview: http://127.0.0.1:${port}/en/cv/ and /de/cv/`));
