import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { buildSite, distRoot, projectRoot } from './build.ts';

const dev = process.argv.includes('--dev');
const portArg = process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1];
const envPort = process.env.PORT?.trim() || undefined;
const port = Number(portArg ?? envPort ?? 4317);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Use a port between 1 and 65535');
if (dev) await buildSite();
else if (!(await stat(resolve(distRoot, 'index.html')).catch(() => null))) throw new Error('No production build. Run npm run build first.');

const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    const target = resolve(distRoot, `.${path}`);
    if (target !== distRoot && !target.startsWith(distRoot + sep)) { response.writeHead(403); response.end(); return; }
    const info = await stat(target).catch(() => null);
    let file = target;
    if (info?.isDirectory()) {
      if (!url.pathname.endsWith('/')) { response.writeHead(308, { Location: `${url.pathname}/${url.search}` }); response.end(); return; }
      file = resolve(target, 'index.html');
    }
    let body: Buffer;
    try { body = await readFile(file); }
    catch { body = await readFile(resolve(distRoot, '404.html')); response.statusCode = 404; file = '404.html'; }
    response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', dev ? 'no-store' : 'no-cache');
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(400); response.end('Bad request'); }
});
// Default port busy (e.g. an older preview still running)? Use the next free one instead of failing.
const explicitPort = portArg !== undefined || envPort !== undefined;
function listen(candidate: number, attemptsLeft: number): void {
  const onListening = () => {
    server.removeListener('error', onError);
    console.log(`Mahsa ${dev ? 'development' : 'production preview'}: http://127.0.0.1:${candidate}`);
  };
  const onError = (error: NodeJS.ErrnoException) => {
    server.removeListener('listening', onListening);
    if (error.code === 'EADDRINUSE' && !explicitPort && attemptsLeft > 0 && candidate < 65535) {
      console.warn(`Port ${candidate} is already in use; trying ${candidate + 1}.`);
      listen(candidate + 1, attemptsLeft - 1);
      return;
    }
    console.error(error.code === 'EADDRINUSE' ? `Port ${candidate} is already in use. Stop the other server or pick a port, e.g. npm run dev -- --port=4320` : error);
    process.exit(1);
  };
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(candidate, '127.0.0.1');
}
listen(port, 10);

if (dev) {
  let timer: NodeJS.Timeout | undefined;
  let rebuilding = false;
  let pending = false;
  async function rebuild() {
    if (rebuilding) { pending = true; return; }
    rebuilding = true;
    try { await buildSite(); console.log('Updated. Refresh the browser.'); }
    catch (error) { console.error(error); }
    finally { rebuilding = false; if (pending) { pending = false; void rebuild(); } }
  }
  for (const directory of ['src', 'content', 'public']) watch(resolve(projectRoot, directory), { recursive: true }, (_event, file) => {
    if (!file || String(file).replace(/\\/gu, '/') === 'content/generated.ts') return;
    clearTimeout(timer); timer = setTimeout(() => void rebuild(), 140);
  });
}
