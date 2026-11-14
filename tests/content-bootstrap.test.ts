import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { headBootstrap, rootRedirect, storageKey } from '../src/app/state.ts';

function context(raw: string | null, options: { language?: string; dark?: boolean; reduced?: boolean; throws?: boolean } = {}) {
  let redirected = '';
  const dataset = {} as Record<string, string>;
  const env = {
    localStorage: { getItem: (key: string) => { assert.equal(key, storageKey); if (options.throws) throw new Error('Blocked'); return raw; } },
    matchMedia: (query: string) => ({ matches: query.includes('dark') ? !!options.dark : query.includes('reduced') ? !!options.reduced : false }),
    document: { documentElement: { dataset, classList: { add() { /* noop */ } } } },
    navigator: { language: options.language ?? 'en-US' },
    location: { search: '?skill=x', hash: '#methods', replace: (value: string) => { redirected = value; } },
  };
  return { env, dataset, redirect: () => redirected };
}

test('pre-paint bootstrap applies the saved lighting, motion and focus before first paint', () => {
  const c = context(JSON.stringify({ theme: 'light', motion: 'off', motionExplicit: true, focus: true }), { dark: true });
  runInNewContext(headBootstrap, c.env);
  assert.equal(c.dataset.theme, 'light'); assert.equal(c.dataset.motion, 'off'); assert.equal(c.dataset.focus, 'on');
});

test('without a choice it follows the device (dark + reduced motion) and survives blocked or corrupt storage', () => {
  for (const raw of ['{broken', '[]', JSON.stringify({ theme: 'system' }), JSON.stringify({ theme: 'neon', motion: 'off' })]) {
    const c = context(raw, { dark: true, reduced: true }); runInNewContext(headBootstrap, c.env);
    assert.equal(c.dataset.theme, 'dark'); assert.equal(c.dataset.motion, 'gentle'); assert.equal(c.dataset.focus, 'off');
  }
  const blocked = context(null, { throws: true }); runInNewContext(headBootstrap, blocked.env);
  assert.equal(blocked.dataset.theme, 'light'); assert.equal(blocked.dataset.motion, 'full');
});

test('root redirect: saved language and mode first, then browser language; query and hash survive', () => {
  const saved = context(JSON.stringify({ locale: 'en', mode: 'lab' }), { language: 'de-DE' }); runInNewContext(rootRedirect, saved.env);
  assert.equal(saved.redirect(), '/en/lab/?skill=x#methods');
  for (const [raw, language, expected] of [[null, 'de-DE', 'de'], ['{broken', 'fr', 'en'], ['[]', 'de', 'de'], [JSON.stringify({ locale: 'xx' }), 'de-AT', 'de']] as const) {
    const c = context(raw, { language }); runInNewContext(rootRedirect, c.env); assert.equal(c.redirect(), `/${expected}/?skill=x#methods`);
  }
});
