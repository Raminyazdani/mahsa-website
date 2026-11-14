import type { StationId } from '../app/appearance.ts';
import { stationChannel } from '../app/appearance.ts';

/** Isometric lab floor plan. Pointer shortcut only — the HTML station list is the accessible navigation. */
const TW = 46, TH = 23, ZH = 30, OX = 270, OY = 36;
const P = (x: number, y: number, z = 0) => [OX + (x - y) * TW / 2, OY + (x + y) * TH / 2 - z * ZH] as const;
const pts = (list: (readonly [number, number])[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

function box(cx: number, cy: number, z0: number, w: number, d: number, h: number, cls = ''): string {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - d / 2, y1 = cy + d / 2, z1 = z0 + h;
  return `<g class="iso ${cls}"><polygon class="iso-r" points="${pts([P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)])}"/><polygon class="iso-l" points="${pts([P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)])}"/><polygon class="iso-t" points="${pts([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)])}"/></g>`;
}
const quadTop = (cx: number, cy: number, z: number, w: number, d: number, cls: string) =>
  `<polygon class="${cls}" points="${pts([P(cx - w / 2, cy - d / 2, z), P(cx + w / 2, cy - d / 2, z), P(cx + w / 2, cy + d / 2, z), P(cx - w / 2, cy + d / 2, z)])}"/>`;
const faceFront = (cx: number, cy: number, z0: number, w: number, h: number, cls: string) =>
  `<polygon class="${cls}" points="${pts([P(cx - w / 2, cy, z0 + h), P(cx + w / 2, cy, z0 + h), P(cx + w / 2, cy, z0), P(cx - w / 2, cy, z0)])}"/>`;

function instrument(id: StationId, x: number, y: number): string {
  const z = 0.42;
  switch (id) {
    case 'start':
      return box(x, y, z, 1.25, 0.95, 0.16, 'lm-dev') + quadTop(x, y, z + 0.161, 1.0, 0.72, 'lm-glow-uv') +
        `<polygon class="lm-lid" points="${pts([P(x - 0.62, y - 0.48, z + 0.16), P(x + 0.62, y - 0.48, z + 0.16), P(x + 0.62, y - 0.78, z + 0.86), P(x - 0.62, y - 0.78, z + 0.86)])}"/>`;
    case 'profile':
      return box(x + 0.05, y + 0.05, z, 0.85, 0.65, 0.1, 'lm-dev') + box(x + 0.05, y - 0.2, z + 0.1, 0.22, 0.2, 0.85, 'lm-dev') +
        box(x + 0.05, y + 0.02, z + 0.78, 0.5, 0.36, 0.16, 'lm-dev') + box(x + 0.05, y + 0.12, z + 0.5, 0.12, 0.12, 0.28, 'lm-dev2') + quadTop(x + 0.05, y + 0.12, z + 0.11, 0.42, 0.3, 'lm-glow-ch');
    case 'methods':
      return box(x - 0.55, y, z, 0.08, 0.6, 1.1, 'lm-dev') + box(x + 0.55, y, z, 0.08, 0.6, 1.1, 'lm-dev') + box(x, y, z + 0.5, 1.18, 0.6, 0.05, 'lm-dev2') + box(x, y, z + 1.05, 1.18, 0.6, 0.05, 'lm-dev2') +
        [-0.36, -0.08, 0.2, 0.42].map((dx, i) => box(x + dx, y + 0.05, z + 0.55, 0.16, 0.16, 0.26 + (i % 2) * 0.08, `lm-bottle lm-b${i}`)).join('') +
        [-0.3, 0.0, 0.3].map((dx, i) => box(x + dx, y + 0.05, z + 0.05, 0.18, 0.18, 0.3, `lm-bottle lm-b${i + 2}`)).join('');
    case 'journey':
      return box(x, y, z, 1.0, 0.9, 1.15, 'lm-dev') + faceFront(x, y + 0.451, z + 0.18, 0.7, 0.78, 'lm-glow-ch') +
        [0.4, 0.62, 0.84].map(h => `<line class="lm-shelf-line" x1="${P(x - 0.33, y + 0.452, z + h)[0]}" y1="${P(x - 0.33, y + 0.452, z + h)[1]}" x2="${P(x + 0.33, y + 0.452, z + h)[0]}" y2="${P(x + 0.33, y + 0.452, z + h)[1]}"/>`).join('');
    case 'projects': {
      let cells = '';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cells += quadTop(x - 0.28 + i * 0.28, y - 0.25 + j * 0.25, z + 0.551, 0.18, 0.16, (i + j) % 2 ? 'lm-glow-ch' : 'lm-chip-off');
      return box(x, y, z, 1.15, 1.0, 0.55, 'lm-dev') + cells;
    }
    case 'training':
      return box(x, y, z, 1.05, 0.75, 0.14, 'lm-dev') + [-0.3, -0.1, 0.1, 0.3].map((dx, i) => box(x + dx, y + 0.04 * i, z + 0.14, 0.12, 0.62, 0.03, `lm-slide lm-s${i}`)).join('');
    case 'languages':
      return box(x, y, z, 0.6, 0.6, 0.55, 'lm-glass') + [-0.15, 0, 0.15].map((dx, i) => box(x + dx, y, z + 0.3, 0.06, 0.06, 0.75 - i * 0.1, `lm-strip lm-st${i}`)).join('');
    case 'contact':
      return box(x, y, z, 0.95, 0.8, 0.42, 'lm-dev') + `<polygon class="lm-paper" points="${pts([P(x - 0.3, y + 0.401, z + 0.3), P(x + 0.3, y + 0.401, z + 0.3), P(x + 0.3, y + 0.85, z + 0.05), P(x - 0.3, y + 0.85, z + 0.05)])}"/>` + quadTop(x + 0.3, y - 0.2, z + 0.421, 0.12, 0.12, 'lm-glow-ch');
    default:
      return box(x, y, z, 0.9, 0.8, 0.5, 'lm-dev') + quadTop(x, y, z + 0.501, 0.5, 0.4, 'lm-glow-ch');
  }
}

export function stationPositions(count: number): [number, number][] {
  // Evenly along a rounded loop around the lab floor (a tour), starting top-left.
  const corners: [number, number][] = [[1.8, 1.8], [8.2, 1.8], [8.2, 8.2], [1.8, 8.2]];
  const perimeter = 4 * 6.4;
  return Array.from({ length: count }, (_, i) => {
    let t = (i / count) * perimeter;
    for (let c = 0; c < 4; c++) {
      if (t <= 6.4) { const a = corners[c]!, b = corners[(c + 1) % 4]!; const f = t / 6.4; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
      t -= 6.4;
    }
    return corners[0]!;
  });
}

export function labMap(stations: { id: StationId; label: string; href: string }[]): string {
  const pos = stationPositions(stations.length);
  const floor = `<polygon class="lm-floor" points="${pts([P(0, 0), P(10, 0), P(10, 10), P(0, 10)])}"/>` +
    Array.from({ length: 9 }, (_, i) => `<line class="lm-floor-line" x1="${P(i + 1, 0)[0]}" y1="${P(i + 1, 0)[1]}" x2="${P(i + 1, 10)[0]}" y2="${P(i + 1, 10)[1]}"/><line class="lm-floor-line" x1="${P(0, i + 1)[0]}" y1="${P(0, i + 1)[1]}" x2="${P(10, i + 1)[0]}" y2="${P(10, i + 1)[1]}"/>`).join('') +
    `<polygon class="lm-wall lm-wall--l" points="${pts([P(0, 0, 0), P(0, 10, 0), P(0, 10, 2.2), P(0, 0, 2.2)])}"/><polygon class="lm-wall lm-wall--r" points="${pts([P(0, 0, 0), P(10, 0, 0), P(10, 0, 2.2), P(0, 0, 2.2)])}"/>` +
    `<polygon class="lm-window" points="${pts([P(2.2, 0, 1.0), P(7.8, 0, 1.0), P(7.8, 0, 1.9), P(2.2, 0, 1.9)])}"/>`;
  const route = pos.concat([pos[0]!]).map(([x, y]) => P(x, y, 0.02));
  const path = `<polyline class="lm-route" points="${pts(route)}"/>`;
  // Draw back-to-front so nearer stations overlap farther ones.
  const order = stations.map((s, i) => ({ s, i, depth: pos[i]![0] + pos[i]![1] })).sort((a, b) => a.depth - b.depth);
  const items = order.map(({ s, i }) => {
    const [x, y] = pos[i]!;
    const [lx, ly] = P(x, y, 0);
    return `<a class="lm-station" href="${s.href}" data-station-link="${s.id}" data-ch="${stationChannel[s.id]}" tabindex="-1" aria-hidden="true">
      <ellipse class="lm-ring" cx="${lx.toFixed(1)}" cy="${(ly).toFixed(1)}" rx="${(TW * 1.05).toFixed(1)}" ry="${(TH * 1.05).toFixed(1)}"/>
      ${box(x, y, 0, 1.55, 1.55, 0.42, 'lm-ped')}${quadTop(x, y, 0.421, 1.4, 1.4, 'lm-ped-top')}
      ${instrument(s.id, x, y)}
      <text class="lm-no" x="${(lx).toFixed(1)}" y="${(ly + TH * 1.55).toFixed(1)}">${String(i + 1).padStart(2, '0')}</text>
    </a>`;
  }).join('');
  return `<svg class="labmap-svg" viewBox="0 0 540 420" aria-hidden="true" focusable="false">${floor}${path}${items}</svg>`;
}
