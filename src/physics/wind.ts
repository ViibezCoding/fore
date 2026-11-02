import { Vector3 } from 'three';
import { FORWARD, RIGHT } from './ballFlight';

// Steady wind. Direction is where the wind blows toward, measured from
// straight down the range; positive is toward the golfer's right.

export interface Wind {
  /** m/s */
  speed: number;
  direction: number;
}

export const CALM: Wind = { speed: 0, direction: 0 };
const MAX_WIND = 7; // m/s, about 16 mph

export function windVector(w: Wind): Vector3 {
  return FORWARD.clone()
    .multiplyScalar(Math.cos(w.direction))
    .addScaledVector(RIGHT, Math.sin(w.direction))
    .multiplyScalar(w.speed);
}

/** A random wind; random() returns values in [0, 1). */
export function rollWind(random: () => number): Wind {
  // Squaring favors lighter winds, so a gale is a rare event.
  return { speed: MAX_WIND * random() ** 2, direction: (random() * 2 - 1) * Math.PI };
}

export function windName(w: Wind): string {
  if (w.speed < 0.5) return 'Calm';
  const a = Math.abs(w.direction);
  if (a < Math.PI / 6) return 'Helping';
  if (a > (5 * Math.PI) / 6) return 'Into you';
  const side = w.direction > 0 ? 'right' : 'left';
  if (a < Math.PI / 3) return `Helping, to the ${side}`;
  if (a > (2 * Math.PI) / 3) return `Into you, to the ${side}`;
  return `To the ${side}`;
}
