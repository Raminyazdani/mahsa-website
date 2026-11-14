/**
 * Conceptual model of light-directed (photolithographic) DNA synthesis on a chip.
 * 1. Expose: micromirrors send UV to masked spots; each exposed strand loses its photolabile
 *    protecting group with probability = deprotection yield.
 * 2. Couple: one base is added to every unprotected strand. An exposed strand that stayed protected
 *    misses this base — a deletion error. The new base arrives protected again.
 * Illustration only: it shows the principle, not results from the thesis.
 */
export type Base = 'A' | 'C' | 'G' | 'T';
export type PatternName = 'checker' | 'ring' | 'diagonal' | 'all' | 'custom';
export interface Spot { bases: (Base | '-')[]; deprotected: boolean; attempted: boolean; deprotectedBefore: boolean }
export interface Chip { cols: number; rows: number; cycle: number; exposed: boolean; spots: Spot[] }

export const createSynthesis = (cols: number, rows: number): Chip => ({
  cols, rows, cycle: 0, exposed: false,
  spots: Array.from({ length: cols * rows }, () => ({ bases: [], deprotected: false, attempted: false, deprotectedBefore: false })),
});

export function maskFor(pattern: PatternName, cols: number, rows: number): boolean[] {
  return Array.from({ length: cols * rows }, (_, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    if (pattern === 'all') return true;
    if (pattern === 'checker') return (r + c) % 2 === 0;
    if (pattern === 'diagonal') return Math.abs(r - (c * (rows - 1)) / Math.max(1, cols - 1)) < 0.75;
    if (pattern === 'ring') { const dx = (c - (cols - 1) / 2) / (cols / 2), dy = (r - (rows - 1) / 2) / (rows / 2); const d = Math.hypot(dx, dy); return d > 0.45 && d < 0.95; }
    return false;
  });
}

export function expose(chip: Chip, mask: boolean[], yieldFraction: number, random: () => number = Math.random): Chip {
  const y = Math.min(1, Math.max(0, yieldFraction));
  return { ...chip, exposed: true, spots: chip.spots.map((spot, i) => mask[i]
    ? { ...spot, attempted: true, deprotected: spot.deprotected || random() < y }
    : spot) };
}

export function couple(chip: Chip, base: Base): Chip {
  const any = chip.spots.some(spot => spot.attempted || spot.deprotected);
  const spots = chip.spots.map(spot => {
    if (spot.deprotected) return { bases: [...spot.bases, base], deprotected: false, attempted: false, deprotectedBefore: true };
    if (spot.attempted) return { bases: [...spot.bases, '-' as const], deprotected: false, attempted: false, deprotectedBefore: false };
    return { ...spot, deprotectedBefore: false };
  });
  return { ...chip, spots, exposed: false, cycle: chip.cycle + (any ? 1 : 0) };
}

export const errorCount = (chip: Chip) => chip.spots.filter(spot => spot.bases.includes('-')).length;
