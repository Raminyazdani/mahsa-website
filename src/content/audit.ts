/** Derived evidence only. This module is part of the source boundary. */
import { readFile } from 'node:fs/promises';
import type { Locale, WebsiteContent } from './model.ts';
import { toWebsiteContent } from './adapter.ts';
import { renderCvBody, escapeHtml } from '../cv.ts';

interface Leaf { path: string; value: string | number | boolean }
const pointer = (value: string) => value.replace(/~/gu, '~0').replace(/\//gu, '~1');
function leaves(value: unknown, path = ''): Leaf[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => leaves(item, `${path}/${index}`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => leaves(item, `${path}/${pointer(key)}`));
  if (['string', 'number', 'boolean'].includes(typeof value) && value !== '' && value !== false) return [{ path, value: value as Leaf['value'] }];
  return [];
}
const normalize = (value: unknown) => String(value).replace(/\s+/gu, ' ').trim();
function isSourceMetadata(leaf: Leaf): boolean {
  return leaf.path.startsWith('/config/') || /\/(?:type_key|_verification|_sources)(?:\/|$)/u.test(leaf.path) ||
    /\/Pictures\/\d+\/type_of$/u.test(leaf.path);
}
export interface ContentAuditRow { sourcePath: string; modelPaths: string[]; fullCv: boolean; note?: string }
export interface ContentAudit { locale: Locale; factCount: number; rows: ContentAuditRow[]; missing: ContentAuditRow[] }

export function auditSource(source: unknown, model: WebsiteContent = toWebsiteContent(source)): ContentAudit {
  const modelLeaves = leaves(model);
  const cv = normalize(renderCvBody(model).replace(/<[^>]+>/gu, ' '));
  const html = renderCvBody(model);
  const rows = leaves(source).filter(leaf => !isSourceMetadata(leaf)).map(leaf => {
    const value = normalize(leaf.value);
    const modelPaths = modelLeaves.filter(item => normalize(item.value).includes(value)).map(item => item.path);
    let fullCv = cv.includes(normalize(escapeHtml(value))) || html.includes(escapeHtml(value));
    let note: string | undefined;
    if (!fullCv && value === 'present' && model.locale === 'de' && leaf.path.startsWith('/education/')) {
      fullCv = cv.includes('heute'); note = 'Localized ongoing date: present → heute';
    }
    return { sourcePath: leaf.path, modelPaths, fullCv, ...(note ? { note } : {}) };
  });
  return { locale: model.locale, factCount: rows.length, rows, missing: rows.filter(row => !row.modelPaths.length || !row.fullCv) };
}

export async function auditContent(locale: Locale): Promise<ContentAudit> {
  const source = JSON.parse(await readFile(new URL(`../../content/mahsa-cv.${locale}.json`, import.meta.url), 'utf8')) as unknown;
  return auditSource(source);
}
