/**
 * Prints both CV pages to A4 PDFs with a locally installed Chrome, Edge or Chromium
 * (the browser's own print engine). No Python or extra npm package needed.
 *   npm run cv:pdf                      → output/pdf/Mahsa-Nejadhossein-CV-{en,de}.pdf
 *   npm run cv:pdf -- --chrome="C:\Path\to\chrome.exe"   (or set CHROME_PATH)
 * Then look at every page, optionally run `npm run cv:verify`, and publish with `npm run cv:stamp`.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const flag = process.argv.find(arg => arg.startsWith('--chrome='))?.slice('--chrome='.length);
const port = 4318 + Math.floor(Math.random() * 400);
const candidates = [
  flag, process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
].filter((path): path is string => !!path);
const chrome = candidates.find(path => existsSync(path));
if (!chrome) throw new Error('No Chrome/Edge/Chromium found. Pass --chrome="path/to/browser" or set CHROME_PATH.');

const server = spawn(process.execPath, [resolve(root, 'scripts/cv-preview.ts'), `--port=${port}`], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise<void>((done, fail) => {
  const timer = setTimeout(() => fail(new Error('CV preview server did not start')), 20000);
  server.stdout!.on('data', (chunk: Buffer) => { if (chunk.toString().includes('Isolated CV QA preview')) { clearTimeout(timer); done(); } });
  server.on('exit', code => fail(new Error(`CV preview server exited (${code})`)));
});
try {
  await mkdir(resolve(root, 'output/pdf'), { recursive: true });
  for (const locale of ['en', 'de'] as const) {
    const out = resolve(root, `output/pdf/Mahsa-Nejadhossein-CV-${locale}.pdf`);
    const sandbox = process.platform === 'linux' && process.getuid?.() === 0 ? ['--no-sandbox'] : [];
    const result = spawnSync(chrome, [...sandbox, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-pdf-header-footer', '--print-to-pdf-no-header',
      '--run-all-compositor-stages-before-draw', '--virtual-time-budget=6000', `--print-to-pdf=${out}`, `http://127.0.0.1:${port}/${locale}/cv/`], { stdio: 'pipe', timeout: 90000 });
    const info = await stat(out).catch(() => null);
    if (!info || info.size < 2000) throw new Error(`${locale}: Chrome did not write a PDF.\n${result.stderr?.toString() ?? ''}`);
    console.log(`${locale}: ${out} (${Math.round(info.size / 1024)} KB)`);
  }
  console.log('Next: open and read every page, run `npm run cv:verify` (optional, Python), then `npm run cv:stamp` and `npm run build`.');
} finally { server.kill(); }
