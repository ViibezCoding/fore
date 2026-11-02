import { FAIRWAY_WIDTH } from './surfaces';

// Things on the range that send the ball farther. Each one works once per ball.
// Units are meters; +Z is down the range and +X is the golfer's left.

export interface BoostRing {
  kind: 'ring';
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Speed added as the ball passes through, in m/s. */
  boost: number;
}

export interface BouncePad {
  kind: 'pad';
  /** Runs the full width of the fairway, centered on it. */
  width: number;
  z: number;
  /** Size down the range, in meters. */
  depth: number;
  /** Upward speed the ball leaves with, in m/s. */
  launch: number;
  /** Horizontal speed is multiplied by this... */
  speedScale: number;
  /** ...and never leaves slower than this, in m/s. */
  minSpeed: number;
}

export type Booster = BoostRing | BouncePad;

// A falling ball would be driven into the ground, so rings also lift it.
const RING_MIN_PITCH = (14 * Math.PI) / 180;

export const ring = (x: number, y: number, z: number, radius = 6, boost = 25): BoostRing => ({
  kind: 'ring',
  x,
  y,
  z,
  radius,
  boost,
});

export const pad = (z: number, depth: number): BouncePad => ({
  kind: 'pad',
  width: FAIRWAY_WIDTH,
  z,
  depth,
  launch: 24,
  speedScale: 1.35,
  minSpeed: 32,
});

/** Speeds the ball up along its heading, climbing at least RING_MIN_PITCH. */
export function applyRing(ring: BoostRing, vel: { x: number; y: number; z: number }): void {
  const horizontal = Math.hypot(vel.x, vel.z) || 1;
  const speed = Math.hypot(horizontal, vel.y) + ring.boost;
  const pitch = Math.max(Math.atan2(vel.y, horizontal), RING_MIN_PITCH);
  const scale = (speed * Math.cos(pitch)) / horizontal;
  vel.x *= scale;
  vel.z *= scale;
  vel.y = speed * Math.sin(pitch);
}

/** Springs the ball up and forward, keeping its heading. */
export function applyPad(pad: BouncePad, vel: { x: number; y: number; z: number }): void {
  const horizontal = Math.hypot(vel.x, vel.z);
  const next = Math.max(horizontal * pad.speedScale, pad.minSpeed);
  if (horizontal > 0) {
    vel.x *= next / horizontal;
    vel.z *= next / horizontal;
  } else {
    vel.z = next;
  }
  vel.y = pad.launch;
}
