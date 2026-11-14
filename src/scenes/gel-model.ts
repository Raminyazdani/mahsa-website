/**
 * Conceptual agarose-gel physics shared by the 3D scene, the 2D fallback and the tests.
 * Migration comes only from the electric field (voltage × time). UV only changes visibility.
 * Bands are illustrative — they are not experimental data from the CV.
 */
export type Stain = 'etbr' | 'sybr';
export type GelView = '3d' | 'top';
export interface GelState {
  progress: number;      // 0 = samples in wells, 1 = bromophenol-blue front near the end
  elapsed: number;       // simulated run time in seconds
  running: boolean;
  voltage: number;       // 60–150 V
  uvOn: boolean;
  intensity: number;     // 0–1 lamp output
  stain: Stain;
  view: GelView;
}
export interface Band { lane: number; bp: number; amount: number; kind: 'dna' | 'dye'; dye?: 'bromophenol' | 'xylene' }

export const initialGel = (): GelState => ({ progress: 0, elapsed: 0, running: false, voltage: 110, uvOn: true, intensity: 0.8, stain: 'etbr', view: '3d' });

/** Real-time seconds a full run takes at 110 V in the animation, and the simulated minutes it stands for. */
export const RUN_SECONDS_AT_110 = 22;
export const SIM_MINUTES_AT_110 = 45;

const ladderSizes = [10000, 6000, 4000, 3000, 2000, 1500, 1000, 700, 500, 300, 200];
export const LANES = 6;
export const bands: Band[] = [
  ...ladderSizes.map(bp => ({ lane: 0, bp, amount: bp === 3000 || bp === 1000 ? 1 : 0.62, kind: 'dna' as const })),
  { lane: 1, bp: 650, amount: 1, kind: 'dna' },
  { lane: 2, bp: 1200, amount: 0.8, kind: 'dna' }, { lane: 2, bp: 450, amount: 0.7, kind: 'dna' },
  { lane: 3, bp: 2500, amount: 0.9, kind: 'dna' },
  // plasmid-like pattern: open circular, linear and supercoiled forms
  { lane: 4, bp: 7000, amount: 0.45, kind: 'dna' }, { lane: 4, bp: 4000, amount: 0.35, kind: 'dna' }, { lane: 4, bp: 2100, amount: 0.95, kind: 'dna' },
  { lane: 5, bp: 1500, amount: 0.75, kind: 'dna' }, { lane: 5, bp: 900, amount: 0.75, kind: 'dna' }, { lane: 5, bp: 300, amount: 0.6, kind: 'dna' },
  // loading dyes in every lane, visible without UV
  ...Array.from({ length: LANES }, (_, lane) => [
    { lane, bp: 4000, amount: 0.5, kind: 'dye' as const, dye: 'xylene' as const },
    { lane, bp: 400, amount: 0.65, kind: 'dye' as const, dye: 'bromophenol' as const },
  ]).flat(),
];

/** Relative mobility: linear in log10(size), the classic semi-log relation for agarose gels. */
export function mobility(bp: number): number {
  return Math.min(1, Math.max(0.02, 1.81 - 0.415 * Math.log10(bp)));
}
const SCALE = 0.85 / mobility(400); // bromophenol blue reaches 85 % of the gel when progress = 1

/** Position along the lane, 0 at the well and 1 at the anode end; may exceed 1 (ran off the gel). */
export function bandPosition(band: Band, progress: number): number {
  return progress * mobility(band.bp) * SCALE;
}

/** Band spreading grows with distance travelled (diffusion). */
export function bandWidth(band: Band, progress: number): number {
  return 0.11 + bandPosition(band, progress) * 0.12 + (band.kind === 'dye' ? 0.22 : 0);
}

const stainEfficiency: Record<Stain, number> = { etbr: 1, sybr: 1.12 };
/** Fluorescence seen by the camera: needs DNA and UV; never depends on migration. */
export function fluorescence(band: Band, state: GelState): number {
  if (band.kind !== 'dna') return 0;
  if (bandPosition(band, state.progress) > 1.02) return 0;
  return band.amount * (state.uvOn ? state.intensity : 0) * stainEfficiency[state.stain];
}
/** Visible-light absorbance of tracking dyes: independent of UV. */
export function dyeOpacity(band: Band, state: GelState): number {
  if (band.kind !== 'dye') return 0;
  return bandPosition(band, state.progress) > 1.02 ? 0 : band.amount;
}

export function step(state: GelState, dt: number): GelState {
  if (!state.running) return state;
  const rate = (state.voltage / 110) / RUN_SECONDS_AT_110;
  const progress = Math.min(1, state.progress + dt * rate);
  const elapsed = state.elapsed + dt * (SIM_MINUTES_AT_110 * 60 / RUN_SECONDS_AT_110);
  return { ...state, progress, elapsed, running: progress < 1 };
}

/** Simulated time that corresponds to a scrubbed progress at the current voltage. */
export function elapsedFor(progress: number, voltage: number): number {
  return progress * SIM_MINUTES_AT_110 * 60 * (110 / voltage);
}

export const stainColor: Record<Stain, string> = { etbr: '#FF4F9A', sybr: '#2CF5A0' };
export const formatClock = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
