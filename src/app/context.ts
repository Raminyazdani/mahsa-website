import type { Locale, WebsiteContent } from '../content/model.ts';
import type { Labels } from './i18n.ts';
import type { Preferences, Mode } from './state.ts';

export interface ConsoleSpec { controls: HTMLElement[] }
export interface Ctx {
  content: WebsiteContent; locale: Locale; l: Labels;
  prefs: Preferences;
  page: 'home' | 'lab' | 'project' | 'notfound';
  mode(): Mode;
  theme(): 'dark' | 'light';
  motion(): 'full' | 'gentle' | 'off';
  focus(): boolean;
  stations: string[];
  current(): string;
  save(): void;
  goTo(station: string, options?: { focus?: boolean; replace?: boolean; instant?: boolean }): void;
  registerConsole(station: string, spec: ConsoleSpec): void;
  refreshConsole(): void;
  setQuery(params: Record<string, string | null>): void;
  favorites: { has(key: string): boolean; toggle(key: string, title?: string): boolean };
}
