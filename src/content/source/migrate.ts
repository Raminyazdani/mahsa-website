import { ContentValidationError } from '../validate.ts';
/**
 * Example supported future storage envelope. Migration stays at the boundary;
 * maintained JSON remains the original format. This pure transform rejects
 * mixed formats and never guesses missing CV facts.
 */
export function unwrapSource(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const envelope = input as Record<string, unknown>;
  if (!Object.hasOwn(envelope, 'formatVersion')) return input;
  if (envelope.formatVersion !== 2 || !Object.hasOwn(envelope, 'cv') ||
      Object.keys(envelope).some(key => !['formatVersion', 'cv'].includes(key))) {
    throw new ContentValidationError([{ path: '/formatVersion', message: 'Expected envelope { formatVersion: 2, cv: <original CV> }; do not mix source formats' }]);
  }
  return envelope.cv;
}
