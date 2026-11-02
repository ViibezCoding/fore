import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { METERS_TO_YARDS, simulateShot, type FlightEnv, type LaunchParams } from './ballFlight';
import { SURFACES, surfaceAt, type SurfaceKind } from './surfaces';
import { rollWind, windVector } from './wind';
import { seededRandom } from '../core/random';

const DEG = Math.PI / 180;
const MPH = 0.44704;
const drive: LaunchParams = { speed: 160 * MPH, launchAngle: 12 * DEG, aim: 0, spinRpm: 2700, spinTilt: 0 };

/** Everything is one surface, with an optional wind (direction 0 = downrange). */
function env(kind: SurfaceKind, windMph = 0, direction = 0): FlightEnv {
  return { wind: windVector({ speed: windMph * MPH, direction }), surfaceAt: () => SURFACES[kind], boosters: [] };
}

const carryYards = (e: FlightEnv) => simulateShot(drive, e).carry * METERS_TO_YARDS;
const rollYards = (kind: SurfaceKind) => {
  const s = simulateShot(drive, env(kind));
  return (s.total - s.carry) * METERS_TO_YARDS;
};

describe('wind', () => {
  it('carries farther downwind and shorter into the wind', () => {
    const calm = carryYards(env('fairway'));
    expect(carryYards(env('fairway', 15, 0))).toBeGreaterThan(calm + 8);
    expect(carryYards(env('fairway', 15, Math.PI))).toBeLessThan(calm - 15);
  });

  it('hurts more into the wind than it helps downwind', () => {
    const calm = carryYards(env('fairway'));
    const helped = carryYards(env('fairway', 15, 0)) - calm;
    const hurt = calm - carryYards(env('fairway', 15, Math.PI));
    expect(hurt).toBeGreaterThan(helped);
  });

  it('pushes the ball the way it blows', () => {
    // The golfer's right is -X.
    expect(simulateShot(drive, env('fairway', 15, 90 * DEG)).rest.x).toBeLessThan(-8);
    expect(simulateShot(drive, env('fairway', 15, -90 * DEG)).rest.x).toBeGreaterThan(8);
  });

  it('rolls the same wind for the same seed', () => {
    expect(rollWind(seededRandom(42))).toEqual(rollWind(seededRandom(42)));
  });
});

describe('surfaces', () => {
  it('rolls out farthest on the green and stops fast in rough and sand', () => {
    expect(rollYards('green')).toBeGreaterThan(rollYards('fairway'));
    expect(rollYards('rough')).toBeLessThan(rollYards('fairway') / 2);
    expect(rollYards('sand')).toBeLessThan(2);
  });

  it('stops the ball where it lands in water', () => {
    const s = simulateShot(drive, env('water'));
    expect(s.lie).toBe('water');
    expect(s.total).toBeCloseTo(s.carry, 5);
  });

  it('records the surface the ball stops on', () => {
    expect(simulateShot(drive, env('rough')).lie).toBe('rough');
  });

  it('maps the range layout', () => {
    expect(surfaceAt(0, 100).kind).toBe('fairway');
    expect(surfaceAt(6, 150).kind).toBe('green');
    expect(surfaceAt(36, 245).kind).toBe('water');
    expect(surfaceAt(-60, 100).kind).toBe('rough');
  });
});

it('keeps a calm, all-fairway env the same as the default', () => {
  const plain = simulateShot(drive);
  const explicit = simulateShot(drive, { wind: new Vector3(), surfaceAt: () => SURFACES.fairway, boosters: [] });
  expect(explicit.total).toBeCloseTo(plain.total, 5);
});
