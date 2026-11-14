import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { loadWebsiteContent } from '../src/content/index.ts';
import type { Locale, WebsiteContent } from '../src/content/model.ts';

export const locales: Locale[] = ['en', 'de'];
export async function generateContent(): Promise<Record<Locale, WebsiteContent>> {
  const entries = await Promise.all(locales.map(async locale => [locale, await loadWebsiteContent(locale)] as const));
  const websiteContent = Object.fromEntries(entries) as Record<Locale, WebsiteContent>;
  const json = JSON.stringify(websiteContent).replace(/</gu, '\\u003c').replace(/\u2028/gu, '\\u2028').replace(/\u2029/gu, '\\u2029');
  const module = `// Generated from validated source JSON. Do not edit.\nimport type { Locale, WebsiteContent } from './model.ts';\nexport const websiteContent: Record<Locale, WebsiteContent> = ${json};\n`;
  const target = new URL('../src/content/generated.ts', import.meta.url);
  await mkdir(new URL('../src/content/', import.meta.url), { recursive: true });
  const current = await readFile(target, 'utf8').catch(() => '');
  if (current !== module) await writeFile(target, module, 'utf8');
  return websiteContent;
}

if (process.argv[1]?.replace(/\\/gu, '/').endsWith('/scripts/generate-content.ts')) {
  const content = await generateContent();
  console.log(`Validated and generated ${Object.keys(content).join(', ')}; source JSON remains private.`);
}
