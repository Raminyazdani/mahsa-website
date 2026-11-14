import type { Locale } from '../content/model.ts';

export type Theme = 'system' | 'light' | 'dark';
export type Motion = 'full' | 'gentle' | 'off';
export type Mode = 'portfolio' | 'lab';
export type BenchView = 'workbench' | 'instruments';

export interface Preferences {
  theme: Theme; motion: Motion; motionExplicit: boolean; mode: Mode; bench: BenchView;
  focus: boolean; favorites: string[]; locale: Locale | null;
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem?(key: string): void }

export const storageKey = 'mahsa-lab.v2';
export const defaults: Preferences = { theme: 'system', motion: 'full', motionExplicit: false, mode: 'portfolio', bench: 'workbench', focus: false, favorites: [], locale: null };

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? value as T : fallback;

/** Never throws: blocked, missing or corrupted storage yields defaults. */
export function readPreferences(storage: StorageLike | null, reducedMotion = false): Preferences {
  const fallback: Preferences = { ...defaults, motion: reducedMotion ? 'gentle' : 'full', favorites: [] };
  try {
    const raw = storage?.getItem(storageKey);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
    const p = value as Record<string, unknown>;
    const motionExplicit = p.motionExplicit === true && ['full', 'gentle', 'off'].includes(String(p.motion));
    return {
      theme: oneOf(p.theme, ['system', 'light', 'dark'] as const, fallback.theme),
      motion: motionExplicit ? p.motion as Motion : fallback.motion, motionExplicit,
      mode: oneOf(p.mode, ['portfolio', 'lab'] as const, fallback.mode),
      bench: oneOf(p.bench, ['workbench', 'instruments'] as const, fallback.bench),
      focus: p.focus === true,
      locale: p.locale === 'en' || p.locale === 'de' ? p.locale : null,
      favorites: Array.isArray(p.favorites) ? [...new Set(p.favorites.filter((x): x is string => typeof x === 'string' && x.trim().length > 0 && x.length < 300))] : [],
    };
  } catch { return fallback; }
}

export function savePreferences(storage: StorageLike | null, preferences: Preferences): boolean {
  try { if (!storage) return false; storage.setItem(storageKey, JSON.stringify(preferences)); return true; } catch { return false; }
}

/* ─────────────── Routes ─────────────── */
export interface Route {
  locale: Locale;
  page: 'home' | 'lab' | 'project' | 'cv' | 'unknown';
  station: string | null;      // section/station id
  project: string | null;
  skill: string | null;        // selected method id (?skill=)
  bench: BenchView | null;     // ?bench=
  record: string | null;       // #record-<id> or ?record=
}

const decode = (value: string) => { try { return decodeURIComponent(value); } catch { return null; } };

export function parseRoute(url: URL, fallbackLocale: Locale = 'en'): Route {
  const parts = url.pathname.split('/').filter(Boolean);
  const locale: Locale = parts[0] === 'de' || parts[0] === 'en' ? parts[0] : fallbackLocale;
  const rest = parts[0] === 'de' || parts[0] === 'en' ? parts.slice(1) : parts;
  const hash = decode(url.hash.replace(/^#/u, '')) ?? '';
  const skill = url.searchParams.get('skill')?.trim() || null;
  const benchParam = url.searchParams.get('bench');
  const bench: BenchView | null = benchParam === 'workbench' || benchParam === 'instruments' ? benchParam : null;
  let record = url.searchParams.get('record')?.trim() || null;
  if (!record && hash.startsWith('record-')) record = hash.slice('record-'.length);
  const base = { locale, skill, bench, record };
  if (rest.length === 0) return { ...base, page: 'home', station: hash && !hash.startsWith('record-') && !hash.startsWith('project-') ? hash : hash.startsWith('record-') ? 'journey' : hash.startsWith('project-') ? 'projects' : skill ? 'methods' : null, project: hash.startsWith('project-') ? hash.slice(8) : null };
  if (rest[0] === 'lab') return { ...base, page: 'lab', station: rest[1] ? decode(rest[1]) : null, project: null };
  if (rest[0] === 'projects' && rest[1]) return { ...base, page: 'project', station: 'projects', project: decode(rest[1]) };
  if (rest[0] === 'cv') return { ...base, page: 'cv', station: null, project: null };
  return { ...base, page: 'unknown', station: null, project: null };
}

export interface UrlOptions { locale?: Locale; skill?: string | null; bench?: BenchView | null }

/** Shareable URL for a station in a given mode, keeping only meaningful view state. */
export function stationUrl(locale: Locale, mode: Mode, station: string | null, options: UrlOptions = {}): string {
  const query = new URLSearchParams();
  if (options.skill) query.set('skill', options.skill);
  if (options.bench && options.bench !== 'workbench') query.set('bench', options.bench);
  const q = query.size ? `?${query}` : '';
  if (mode === 'lab') return `/${locale}/lab/${station && station !== 'start' ? `${encodeURIComponent(station)}/` : ''}${q}`;
  return `/${locale}/${q}${station && station !== 'start' ? `#${encodeURIComponent(station)}` : ''}`;
}

/** Inline, pre-paint bootstrap shared by every page: theme, motion and focus without a flash. */
const readStored = `let p={};try{const v=JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)})||'null');if(v&&typeof v==='object'&&!Array.isArray(v))p=v}catch(e){}`;
export const headBootstrap = `(()=>{${readStored};const d=document.documentElement,m=t=>matchMedia(t).matches;d.dataset.theme=p.theme==='light'||p.theme==='dark'?p.theme:m('(prefers-color-scheme: dark)')?'dark':'light';d.dataset.themePref=p.theme==='light'||p.theme==='dark'?p.theme:'system';d.dataset.motion=p.motionExplicit&&['full','gentle','off'].includes(p.motion)?p.motion:m('(prefers-reduced-motion: reduce)')?'gentle':'full';d.dataset.focus=p.focus===true?'on':'off';d.classList.add('js')})()`;
export const rootRedirect = `(()=>{${readStored};const l=p.locale==='de'||p.locale==='en'?p.locale:(navigator.language||'en').toLowerCase().startsWith('de')?'de':'en';location.replace('/'+l+'/'+(p.mode==='lab'?'lab/':'')+location.search+location.hash)})()`;
