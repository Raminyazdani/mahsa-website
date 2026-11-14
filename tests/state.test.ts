import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readPreferences, savePreferences, parseRoute, stationUrl, storageKey, defaults } from '../src/app/state.ts';

const memory = (initial: string | null = null) => { let value = initial; return { getItem: () => value, setItem: (_k: string, v: string) => { value = v; }, get value() { return value; } }; };

test('preferences: valid values are kept, invalid ones fall back, favourites are de-duplicated', () => {
  const s = memory(JSON.stringify({ theme: 'dark', motion: 'off', motionExplicit: true, mode: 'lab', bench: 'instruments', focus: true, locale: 'de', favorites: ['project:a', 'project:a', 3, ''] }));
  const p = readPreferences(s);
  assert.deepEqual(p, { theme: 'dark', motion: 'off', motionExplicit: true, mode: 'lab', bench: 'instruments', focus: true, locale: 'de', favorites: ['project:a'] });
  assert.deepEqual(readPreferences(memory('{nope')), { ...defaults, favorites: [] });
  assert.equal(readPreferences(memory(JSON.stringify({ motion: 'off' })), true).motion, 'gentle', 'an unconfirmed motion value never overrides the OS reduced-motion default');
  assert.equal(readPreferences(null).theme, 'system');
});

test('saving reports failure instead of throwing when storage is blocked', () => {
  const blocked = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
  assert.equal(savePreferences(blocked, { ...defaults }), false);
  const s = memory(); assert.equal(savePreferences(s, { ...defaults, theme: 'light' }), true);
  assert.equal(JSON.parse(s.value!).theme, 'light'); assert.equal(storageKey.length > 0, true);
});

test('routes: portfolio, lab stations, project pages and record/skill deep links', () => {
  const r = (path: string) => parseRoute(new URL(path, 'https://example.test'));
  assert.deepEqual([r('/en/').page, r('/en/').station], ['home', null]);
  assert.deepEqual([r('/de/#journey').locale, r('/de/#journey').station], ['de', 'journey']);
  assert.deepEqual([r('/en/lab/methods/').page, r('/en/lab/methods/').station], ['lab', 'methods']);
  assert.deepEqual([r('/en/projects/taq-polymerase/').page, r('/en/projects/taq-polymerase/').project], ['project', 'taq-polymerase']);
  assert.deepEqual([r('/en/#record-msc').station, r('/en/#record-msc').record], ['journey', 'msc']);
  assert.deepEqual([r('/en/?skill=s1&bench=instruments').station, r('/en/?skill=s1&bench=instruments').skill, r('/en/?skill=s1&bench=instruments').bench], ['methods', 's1', 'instruments']);
  assert.equal(r('/en/projects/%E0%A4%A/').project, null, 'malformed escapes never crash routing');
});

test('station URLs round-trip in both experience modes and keep only meaningful state', () => {
  assert.equal(stationUrl('en', 'portfolio', 'methods', { skill: 's1', bench: 'instruments' }), '/en/?skill=s1&bench=instruments#methods');
  assert.equal(stationUrl('de', 'lab', 'methods', { skill: 's1', bench: 'workbench' }), '/de/lab/methods/?skill=s1');
  assert.equal(stationUrl('en', 'lab', 'start'), '/en/lab/');
  assert.equal(stationUrl('en', 'portfolio', 'start'), '/en/');
  for (const [mode, station] of [['lab', 'journey'], ['portfolio', 'contact']] as const) {
    const back = parseRoute(new URL(stationUrl('en', mode, station), 'https://example.test'));
    assert.equal(back.station, station); assert.equal(back.page, mode === 'lab' ? 'lab' : 'home');
  }
});
