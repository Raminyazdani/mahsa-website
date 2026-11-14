/**
 * Appearance metadata only: colours, instrument shapes and scene types keyed by stable source keys
 * or record ids. It never adds or changes CV facts. Unknown keys fall back to a generic look so new
 * JSON content renders without code edits.
 */
import type { WebsiteContent } from '../content/model.ts';

export type Channel = 'uv' | 'etbr' | 'sybr' | 'dapi' | 'cfp' | 'yfp' | 'he' | 'ph' | 'cy5' | 'coral';
export type StationId = 'start' | 'profile' | 'methods' | 'journey' | 'projects' | 'training' | 'languages'
  | 'publications' | 'references' | 'interests' | 'contact';

export const stationChannel: Record<StationId, Channel> = {
  start: 'uv', profile: 'dapi', methods: 'sybr', journey: 'cfp', projects: 'yfp', training: 'he', languages: 'ph',
  publications: 'cy5', references: 'cy5', interests: 'cy5', contact: 'uv',
};

/** Order of stations; only those with content are rendered. */
export function stationsFor(content: WebsiteContent): StationId[] {
  const v = new Set(content.visibleSections);
  const list: StationId[] = ['start'];
  if (v.has('about')) list.push('profile');
  if (v.has('skills')) list.push('methods');
  if (v.has('education') || v.has('experience')) list.push('journey');
  if (v.has('projects')) list.push('projects');
  if (v.has('publications')) list.push('publications');
  if (v.has('training')) list.push('training');
  if (v.has('languages')) list.push('languages');
  if (v.has('references')) list.push('references');
  if (v.has('interests')) list.push('interests');
  if (content.person.contacts.length || content.profiles.length) list.push('contact');
  return list;
}

/** Skill categories (source keys) → bench channel + bottle silhouette. */
const categoryLook: Record<string, { channel: Channel; vessel: Vessel }> = {
  'Programming & Scripting': { channel: 'dapi', vessel: 'flask' },
  'Data Visualization & Reporting': { channel: 'yfp', vessel: 'falcon' },
  'Software & Web Development': { channel: 'dapi', vessel: 'flask' },
  'Databases & Data Engineering': { channel: 'cfp', vessel: 'vial' },
  'DevOps & Infrastructure': { channel: 'cfp', vessel: 'vial' },
  'Bioinformatics Domains': { channel: 'etbr', vessel: 'vial' },
  'Laboratory Techniques': { channel: 'sybr', vessel: 'duran' },
  'Soft Skills': { channel: 'coral', vessel: 'falcon' },
};
export type Vessel = 'duran' | 'flask' | 'falcon' | 'vial';
const fallbackChannels: Channel[] = ['sybr', 'etbr', 'dapi', 'yfp', 'cfp', 'coral'];
export function categoryAppearance(key: string, index: number): { channel: Channel; vessel: Vessel } {
  return categoryLook[key] ?? { channel: fallbackChannels[index % fallbackChannels.length]!, vessel: 'duran' };
}

/** Skill groups (source keys) → the instrument that presents them in "Group instruments". */
export type Instrument = 'terminal' | 'monitor' | 'chromatogram' | 'helix' | 'plate' | 'cycle' | 'rack' | 'tubes';
const groupInstrument: Record<string, Instrument> = {
  'Programming Languages': 'terminal',
  'Scripting & Automation Tools': 'terminal',
  'Machine Learning & Data Science': 'terminal',
  'Scientific Python Libraries': 'terminal',
  'Dashboarding & Reporting Platforms': 'monitor',
  'Scientific Plotting Tools': 'monitor',
  'Genomics & Genome Assembly': 'chromatogram',
  'Transcriptomics & Single-Cell Analysis': 'chromatogram',
  'Protein Structure & Structural Bioinformatics': 'helix',
  'Molecular & Microbial Biology Techniques': 'plate',
  'Metagenomics & Microbial Ecology': 'plate',
  'Experimental Design & Laboratory Documentation': 'cycle',
  'Analytical Instruments & Chromatography': 'rack',
  'Bioprocess & Bioreactor Engineering': 'rack',
};
export function groupAppearance(key: string): Instrument { return groupInstrument[key] ?? 'tubes'; }

/** Project record ids → conceptual apparatus. Unknown projects get a generic specimen view. */
export type Mechanic = 'photolithography' | 'expression' | 'specimen';
const projectMechanic: Record<string, Mechanic> = {
  'photolithographic-dna-synthesis': 'photolithography',
  'taq-polymerase': 'expression',
};
export function projectAppearance(id: string): Mechanic { return projectMechanic[id] ?? 'specimen'; }

/** Small deterministic hash for generative visuals (stable per id). */
export function seed(value: string): number {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.codePointAt(0)!, 16777619);
  return h >>> 0;
}
export function rng(seedValue: number): () => number {
  let a = seedValue || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
