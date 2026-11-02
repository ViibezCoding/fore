import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { METERS_TO_YARDS, simulateShot, type FlightEnv, type LaunchParams } from './ballFlight';
import { generateBoosters } from './boosterLayout';
import type { Booster } from './boosters';
import { seededRandom } from '../core/random';
import { SURFACES } from './surfaces';

const DEG = Math.PI / 180;
// A perfect, full-power, straight swing.
const full: LaunchParams = { speed: 72, launchAngle: 12 * DEG, aim: 0, spinRpm: 2600, spinTilt: 0 };

const env = (boosters: Booster[]): FlightEnv => ({
  wind: new Vector3(),
  surfaceAt: () => SURFACES.fairway,
  boosters,
});
const ring = (x: number, y: number, z: number): Booster => ({ kind: 'ring', x, y, z, radius: 6, boost: 25 });
const pad = (z: number): Booster => ({ kind: 'pad', width: 100, z, depth: 20, launch: 24, speedScale: 1.35, minSpeed: 32 });

describe('boost rings', () => {
  it('sends the ball much farther', () => {
    const plain = simulateShot(full, env([]));
    const boosted = simulateShot(full, env([ring(0, 21, 100)]));
    expect(boosted.used).toHaveLength(1);
    expect(boosted.total).toBeGreaterThan(plain.total + 80);
  });

  it('does nothing if the ball misses', () => {
    const missed = simulateShot(full, env([ring(30, 21, 100)]));
    expect(missed.used).toHaveLength(0);
    expect(missed.total).toBeCloseTo(simulateShot(full, env([])).total, 5);
  });
});

describe('bounce pads', () => {
  it('launches a landing ball back into the air', () => {
    const plain = simulateShot(full, env([]));
    const bounced = simulateShot(full, env([pad(241)]));
    expect(bounced.used).toHaveLength(1);
    expect(bounced.total).toBeGreaterThan(plain.total + 80);
  });

  it('covers the fairway width but not the rough', () => {
    const wide: LaunchParams = { ...full, aim: 10 * DEG };
    const plain = simulateShot(wide, env([]));
    expect(Math.abs(plain.rest.x)).toBeLessThan(50);
    expect(simulateShot(wide, env([pad(plain.carry * Math.cos(wide.aim))])).used).toHaveLength(1);
    const outside: LaunchParams = { ...full, aim: 15 * DEG };
    const off = simulateShot(outside, env([]));
    expect(Math.abs(off.carry * Math.sin(outside.aim))).toBeGreaterThan(50);
    expect(simulateShot(outside, env([pad(off.carry * Math.cos(outside.aim))])).used).toHaveLength(0);
  });

  it('keeps the first landing as the carry', () => {
    expect(simulateShot(full, env([pad(241)])).carry).toBeCloseTo(simulateShot(full, env([])).carry, 5);
  });

  it('catches a ball rolling onto it', () => {
    const plain = simulateShot(full, env([]));
    const rolled = simulateShot(full, env([pad(plain.total - 12)]));
    expect(rolled.used).toHaveLength(1);
    expect(rolled.total).toBeGreaterThan(plain.total + 50);
  });
});

describe('generateBoosters', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => i + 1);

  it('always leaves a shot that chains three rings and a pad', () => {
    for (const seed of seeds) {
      const { boosters, chainShot } = generateBoosters(seededRandom(seed));
      const s = simulateShot(chainShot, env(boosters));
      expect(s.used.slice(0, 3).map((b) => b.kind)).toEqual(['ring', 'ring', 'ring']);
      expect(s.used.length).toBeGreaterThanOrEqual(4);
      expect(s.total * METERS_TO_YARDS).toBeGreaterThan(550);
    }
  });

  it('only asks for shots a swing can make', () => {
    for (const seed of seeds) {
      const { chainShot } = generateBoosters(seededRandom(seed));
      expect(chainShot.speed).toBeLessThanOrEqual(72);
      expect(Math.abs(chainShot.aim)).toBeLessThanOrEqual(15 * DEG);
    }
  });

  it('makes a different layout each time, and the same one for the same seed', () => {
    const random = seededRandom(7);
    expect(generateBoosters(random).boosters).not.toEqual(generateBoosters(random).boosters);
    expect(generateBoosters(seededRandom(7))).toEqual(generateBoosters(seededRandom(7)));
  });

  it('keeps rings above the ground', () => {
    for (const seed of seeds) {
      for (const b of generateBoosters(seededRandom(seed)).boosters) {
        if (b.kind === 'ring') expect(b.y).toBeGreaterThan(b.radius);
      }
    }
  });
});
