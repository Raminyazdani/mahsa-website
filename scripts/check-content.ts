/** Content gate: every source fact reaches the model and the complete CV; the UI only consumes the public model. */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { auditContent } from '../src/content/audit.ts';
import { generateContent, locales } from './generate-content.ts';
import { projectRoot } from './build.ts';

const content = await generateContent();
const audits = await Promise.all(locales.map(auditContent));
for (const audit of audits) if (audit.missing.length) throw new Error(`${audit.locale}: CV coverage missing ${JSON.stringify(audit.missing)}`);
await mkdir(resolve(projectRoot, 'docs'), { recursive: true });
await writeFile(resolve(projectRoot, 'docs/content-coverage.json'), JSON.stringify({
  description: 'Derived evidence from the validated JSON and the complete CV HTML; not a hand-written content file.',
  generatedAt: new Date().toISOString(), audits,
}, null, 2));

async function scan(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? scan(resolve(dir, entry.name)) : [resolve(dir, entry.name)]))).flat();
}
for (const file of await scan(resolve(projectRoot, 'src'))) {
  const path = relative(projectRoot, file).replace(/\\/gu, '/');
  if (!path.endsWith('.ts') || path.startsWith('src/content/')) continue;
  const source = await readFile(file, 'utf8');
  if (/(?:from\s*|import\s*\()\s*['"][^'"]*(?:content\/(?:adapter|load|validate|source|index)|mahsa-cv\.[a-z]+\.json)/u.test(source)) {
    throw new Error(`${path}: UI must import only the WebsiteContent model and generated content`);
  }
  // Interface copy must not carry CV facts or another person's data.
  if (/ramin|yazdani|lorem ipsum/iu.test(source)) throw new Error(`${path}: contains reference-person data or placeholder text`);
}
console.log(audits.map(audit => `${audit.locale}: ${audit.factCount} source facts trace to model and complete CV`).join('\n'));
console.log(`Validated ${Object.keys(content).length} languages; UI content boundary passes.`);
