/**
 * Mahsa's mark: a 5×5 photolithographic synthesis array. Light "writes" an M into the spots —
 * UV violet → EtBr pink → SYBR green, the three lights of her work. Unlit spots stay as rings.
 */
const M = [
  '1...1',
  '11.11',
  '1.1.1',
  '1...1',
  '1...1',
];

export function mark(id = 'm', options: { size?: number; title?: string; chip?: boolean } = {}): string {
  const size = options.size ?? 40;
  const step = 9.4, start = 32 - step * 2;
  const spots: string[] = [];
  M.forEach((row, r) => [...row].forEach((cell, c) => {
    const x = (start + c * step).toFixed(1), y = (start + r * step).toFixed(1);
    spots.push(cell === '1'
      ? `<circle cx="${x}" cy="${y}" r="3.35" fill="url(#${id}-g)"/>`
      : `<circle cx="${x}" cy="${y}" r="2.2" fill="none" stroke="currentColor" stroke-opacity=".28" stroke-width="1"/>`);
  }));
  const title = options.title ? `<title>${options.title}</title>` : '';
  const chip = options.chip === false ? '' : `<rect x="3" y="3" width="58" height="58" rx="16" fill="var(--mark-chip, #120F26)"/><rect x="3.5" y="3.5" width="57" height="57" rx="15.5" fill="none" stroke="url(#${id}-e)" stroke-opacity=".7"/>`;
  return `<svg class="mark" viewBox="0 0 64 64" width="${size}" height="${size}" ${options.title ? 'role="img"' : 'aria-hidden="true"'} focusable="false">${title}<defs><linearGradient id="${id}-g" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9D7BFF"/><stop offset=".55" stop-color="#FF5FAE"/><stop offset="1" stop-color="#39F5A0"/></linearGradient><linearGradient id="${id}-e" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9D7BFF"/><stop offset="1" stop-color="#39F5A0" stop-opacity=".35"/></linearGradient></defs>${chip}<g style="color:var(--mark-ring,#E9E6FF)">${spots.join('')}</g></svg>`;
}

/** Standalone favicon / asset version (fixed colours, no CSS variables). */
export function markFile(): string {
  return mark('f', { size: 64 }).replace('class="mark" ', 'xmlns="http://www.w3.org/2000/svg" ')
    .replace('var(--mark-chip, #120F26)', '#120F26').replace('color:var(--mark-ring,#E9E6FF)', 'color:#E9E6FF')
    .replace(/currentColor/gu, '#E9E6FF');
}
