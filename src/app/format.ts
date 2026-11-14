import type { Locale, Period } from '../content/model.ts';

export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/gu,
  character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export const paragraphs = (text: string | null | undefined): string => text
  ? text.split(/\n\s*\n/u).map(part => `<p>${escapeHtml(part).replace(/\n/gu, '<br>')}</p>`).join('')
  : '';

const presentWords = new Set(['present', 'heute', 'current', 'now', 'ongoing', 'laufend']);
export interface ParsedDate { value: number; precision: 'month' | 'year' | 'present' }

/** "2024-03" → 2024.167 (month start); "2023" → 2023 with year precision; "present" → now. */
export function parseDate(raw: string | null | undefined, now = new Date()): ParsedDate | null {
  const text = (raw ?? '').trim().toLowerCase();
  if (!text) return null;
  if (presentWords.has(text)) return { value: now.getFullYear() + now.getMonth() / 12 + now.getDate() / 365, precision: 'present' };
  const month = /^(\d{4})-(\d{1,2})$/u.exec(text);
  if (month) return { value: Number(month[1]) + (Number(month[2]) - 1) / 12, precision: 'month' };
  const year = /^(\d{4})$/u.exec(text);
  if (year) return { value: Number(year[1]), precision: 'year' };
  return null;
}

const monthFormat: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
  de: new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
};

export function formatDate(raw: string | null | undefined, locale: Locale): string {
  const text = (raw ?? '').trim();
  if (!text) return '';
  if (presentWords.has(text.toLowerCase())) return locale === 'de' ? 'heute' : 'present';
  const month = /^(\d{4})-(\d{1,2})$/u.exec(text);
  if (month) return monthFormat[locale].format(Date.UTC(Number(month[1]), Number(month[2]) - 1, 1));
  return text;
}

/** Human period label built only from the record's own start/end values. */
export function formatPeriod(period: Period, locale: Locale): string {
  const start = formatDate(period.start, locale);
  const end = formatDate(period.end, locale);
  if (start && end) return `${start} – ${end}`;
  return start || end || period.label;
}

export function placeLabel(location: { city: string | null; region: string | null; country: string | null; address?: string | null; postalCode?: string | null }): string {
  return [location.city, location.region, location.country].filter(Boolean).join(', ');
}

/** Parse CEFR information from free text such as "B2", "B1-B2", "C1 (IELTS)". */
export const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export function parseCefr(...values: (string | null | undefined)[]): { from: number; to: number } | null {
  for (const value of values) {
    const found = [...(value ?? '').toUpperCase().matchAll(/\b([ABC][12])\b/gu)].map(match => cefrLevels.indexOf(match[1] as typeof cefrLevels[number]));
    const valid = found.filter(index => index >= 0);
    if (valid.length) return { from: Math.min(...valid), to: Math.max(...valid) };
  }
  return null;
}
export function isNative(...values: (string | null | undefined)[]): boolean {
  return values.some(value => /\b(native|mother tongue|muttersprache|first language)\b/iu.test(value ?? ''));
}
