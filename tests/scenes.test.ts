import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialGel, step, bands, bandPosition, fluorescence, dyeOpacity, mobility, elapsedFor } from '../src/scenes/gel-model.ts';
import { createSynthesis, expose, couple, maskFor, errorCount } from '../src/scenes/synthesis-model.ts';
import { code128 } from '../src/render/code128.ts';

const dna = bands.filter(band => band.kind === 'dna');
const dye = bands.filter(band => band.kind === 'dye');

test('gel: UV changes only visibility, never band positions', () => {
  const base = { ...initialGel(), progress: 0.6 };
  const positions = (state: typeof base) => bands.map(band => bandPosition(band, state.progress));
  for (const variant of [{ uvOn: false }, { intensity: 0.1 }, { intensity: 1 }, { stain: 'sybr' as const }]) assert.deepEqual(positions({ ...base, ...variant }), positions(base));
  assert.ok(dna.every(band => fluorescence(band, { ...base, uvOn: false }) === 0), 'no UV, no fluorescence');
  assert.ok(dye.every(band => dyeOpacity(band, { ...base, uvOn: false }) === dyeOpacity(band, base)), 'tracking dye is visible without UV');
});

test('gel: smaller fragments migrate further; distance grows with voltage × time', () => {
  assert.ok(mobility(200) > mobility(1000) && mobility(1000) > mobility(10000));
  const run = (voltage: number, seconds: number) => { let s = { ...initialGel(), voltage, running: true }; for (let t = 0; t < seconds; t += 0.05) s = step(s, 0.05); return s.progress; };
  assert.ok(run(150, 5) > run(60, 5));
  assert.ok(run(110, 8) > run(110, 4));
  let s = { ...initialGel(), running: true }; for (let i = 0; i < 2000; i++) s = step(s, 0.05);
  assert.equal(s.progress, 1); assert.equal(s.running, false, 'the run stops when the dye front reaches the end');
  assert.ok(elapsedFor(1, 150) < elapsedFor(1, 60));
});

test('synthesis: light deprotects only masked spots; one base couples; misses become deletions', () => {
  const mask = maskFor('checker', 4, 2);
  let chip = expose(createSynthesis(4, 2), mask, 1, () => 0);
  assert.deepEqual(chip.spots.map(spot => spot.deprotected), mask);
  chip = couple(chip, 'A');
  assert.deepEqual(chip.spots.map(spot => spot.bases.join('')), mask.map(on => on ? 'A' : ''));
  assert.equal(chip.cycle, 1); assert.equal(errorCount(chip), 0);
  chip = couple(expose(chip, mask, 0, () => 0.5), 'G');
  assert.equal(errorCount(chip), mask.filter(Boolean).length, 'zero yield: every exposed strand misses the base');
  assert.ok(chip.spots.filter((_, i) => !mask[i]).every(spot => spot.bases.length === 0), 'unexposed spots never change');
  const idle = couple(createSynthesis(2, 2), 'T');
  assert.equal(idle.cycle, 0, 'coupling without exposure adds nothing');
});

test('Code 128 barcodes are structurally valid (start B, checksum, stop)', () => {
  const widths = code128('mahsa@example.org')!;
  assert.deepEqual(widths.slice(0, 6), [2, 1, 1, 2, 1, 4]);
  assert.deepEqual(widths.slice(-7), [2, 3, 3, 1, 1, 1, 2]);
  assert.equal(widths.reduce((a, b) => a + b, 0), 11 * ('mahsa@example.org'.length + 3) + 2);
  assert.equal(code128('ümlaut'), null, 'characters outside set B never produce a misleading code');
});
