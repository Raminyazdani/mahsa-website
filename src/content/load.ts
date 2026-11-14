import { readFile } from 'node:fs/promises';
import { toWebsiteContent } from './adapter.ts';
import { ContentValidationError } from './validate.ts';
import type { Locale, WebsiteContent } from './model.ts';

const files: Record<Locale, URL> = {
  en: new URL('../../content/mahsa-cv.en.json', import.meta.url),
  de: new URL('../../content/mahsa-cv.de.json', import.meta.url),
};

/** Call on the server or at build time. No memoization: the next load reads current JSON. */
export async function loadWebsiteContent(locale: Locale = 'en', source?: string | URL): Promise<WebsiteContent> {
  if (!Object.hasOwn(files, locale)) throw new Error(`Unsupported website language: ${String(locale)}`);
  const filename = source ?? files[locale];
  const json = await readFile(filename, 'utf8');
  let input: unknown;
  try { input = JSON.parse(json.replace(/^\uFEFF/u, '')); }
  catch { throw new ContentValidationError([{ path: '/', message: 'Invalid JSON syntax' }], String(filename)); }
  let content: WebsiteContent;
  try { content = toWebsiteContent(input); }
  catch (error) {
    if (error instanceof ContentValidationError) throw new ContentValidationError(error.issues, String(filename));
    throw error;
  }
  if (content.locale !== locale) {
    throw new ContentValidationError([{ path: '/config/lang', message: `Expected ${locale} for this file` }], String(filename));
  }
  return content;
}
