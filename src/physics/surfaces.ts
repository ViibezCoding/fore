// Ground surfaces and the range layout. The physics reads the surface
// under the ball, and the scene draws the same layout.
// Units are meters; +Z is down the range and +X is the golfer's left.

export type SurfaceKind = 'fairway' | 'rough' | 'green' | 'sand' | 'water';

export interface Surface {
  kind: SurfaceKind;
  /** Name shown to the player. */
  label: string;
  /** Share of vertical speed kept on a bounce. */
  restitution: number;
  /** Share of horizontal speed lost on a bounce. */
  impactFriction: number;
  /** Slowdown while rolling, in m/s². */
  rollDecel: number;
}

export const SURFACES: Record<SurfaceKind, Surface> = {
  fairway: { kind: 'fairway', label: 'Fairway', restitution: 0.32, impactFriction: 0.32, rollDecel: 2.6 },
  rough: { kind: 'rough', label: 'Rough', restitution: 0.2, impactFriction: 0.55, rollDecel: 6 },
  green: { kind: 'green', label: 'Green', restitution: 0.3, impactFriction: 0.25, rollDecel: 1.6 },
  sand: { kind: 'sand', label: 'Bunker', restitution: 0.04, impactFriction: 0.85, rollDecel: 16 },
  // Water swallows the ball, so its numbers are never used.
  water: { kind: 'water', label: 'Water', restitution: 0, impactFriction: 1, rollDecel: 0 },
};

export const FAIRWAY_WIDTH = 100;

export type Patch =
  | { kind: SurfaceKind; shape: 'rect'; x: number; z: number; width: number; length: number }
  | { kind: SurfaceKind; shape: 'ellipse'; x: number; z: number; rx: number; rz: number };

/** What sits on top of the rough, in drawing order. The last match wins. */
export const RANGE_LAYOUT: Patch[] = [
  { kind: 'fairway', shape: 'rect', x: 0, z: 790, width: FAIRWAY_WIDTH, length: 1620 },
  { kind: 'green', shape: 'ellipse', x: 6, z: 150, rx: 14, rz: 14 },
  { kind: 'sand', shape: 'ellipse', x: -8, z: 138, rx: 6, rz: 4 }, // front right of the green
  { kind: 'sand', shape: 'ellipse', x: 23, z: 158, rx: 5, rz: 8 }, // left of the green
  { kind: 'sand', shape: 'ellipse', x: -17, z: 212, rx: 5, rz: 10 }, // fairway bunker, right
  { kind: 'water', shape: 'ellipse', x: 36, z: 245, rx: 15, rz: 26 }, // pond, left
  { kind: 'sand', shape: 'ellipse', x: 8, z: 290, rx: 7, rz: 5 }, // long-hitter's bunker
];

export const PIN = { x: 6, z: 150 };

export function surfaceAt(x: number, z: number, layout: Patch[] = RANGE_LAYOUT): Surface {
  for (let i = layout.length - 1; i >= 0; i--) {
    if (contains(layout[i], x, z)) return SURFACES[layout[i].kind];
  }
  return SURFACES.rough;
}

function contains(p: Patch, x: number, z: number): boolean {
  if (p.shape === 'rect') {
    return Math.abs(x - p.x) <= p.width / 2 && Math.abs(z - p.z) <= p.length / 2;
  }
  return ((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2 <= 1;
}
