import { Vector3 } from 'three';
import { BALL_RADIUS, DEFAULT_ENV, launchBall, simulateShot, stepBall, PHYSICS_DT, type FlightEnv, type LaunchParams } from './ballFlight';
import { pad, ring, type Booster, type BoostRing } from './boosters';
import { FAIRWAY_WIDTH } from './surfaces';

// Builds a random booster layout from simulated shots, so everything sits
// where a real swing can reach it: rings on a shot's flight path, pads where
// a shot lands. Layouts assume calm air; wind is the player's problem.

const DEG = Math.PI / 180;
const LAUNCH_ANGLE = 12 * DEG;
const SPIN_RPM = 2600;
const CHAIN_RINGS = 3;
const MIN_CLEARANCE = 1; // meters between a ring's bottom edge and the ground
const SIDE_RING_ATTEMPTS = 8;
const CHAIN_MAX_SIDE = FAIRWAY_WIDTH / 2 - 6; // meters off center the chain may land

export interface BoosterLayout {
  boosters: Booster[];
  /** A shot that threads the rings; the layout is built around it. */
  chainShot: LaunchParams;
}

export function generateBoosters(random: () => number): BoosterLayout {
  const between = (lo: number, hi: number) => lo + (hi - lo) * random();
  const shot = (speedLo: number, speedHi: number, maxAim: number, maxTilt: number): LaunchParams => ({
    speed: between(speedLo, speedHi),
    launchAngle: LAUNCH_ANGLE,
    aim: between(-maxAim, maxAim) * DEG,
    spinRpm: SPIN_RPM,
    spinTilt: between(-maxTilt, maxTilt) * DEG,
  });
  const padAt = (spot: Vector3, lo: number, hi: number) => pad(spot.z + between(-2, 2), between(lo, hi));

  // The main chain: each ring goes on the path the last one sends the ball down.
  // Pads only cover the fairway, so a chain that ends past its edge is redone
  // with less aim and curve until it fits. Dead straight always does.
  let chainShot: LaunchParams;
  let rings: BoostRing[];
  let boosters: Booster[];
  let wildness = 1;
  do {
    chainShot = shot(62, 71, 6 * wildness, 5 * wildness);
    rings = [];
    boosters = [];
    let z = between(75, 130);
    for (let i = 0; i < CHAIN_RINGS; i++) {
      const radius = between(5.5, 7);
      const spot = traceTo(chainShot, rings, z) ?? traceTo(chainShot, rings, Infinity)!;
      const y = Math.max(spot.y, radius + MIN_CLEARANCE);
      // A pad where the chain lands if the player misses this ring.
      boosters.push(padAt(landing(chainShot, rings), 18, 24));
      rings.push(ring(spot.x, y, spot.z, radius));
      z = spot.z + between(120, 170);
    }
    wildness = Math.max(0, wildness - 0.25);
  } while (Math.abs(landing(chainShot, rings).x) > CHAIN_MAX_SIDE);
  boosters.push(padAt(landing(chainShot, rings), 22, 26), ...rings);

  // Softer and wider swings get something to land on, too.
  for (let i = 0; i < 3; i++) boosters.push(padAt(landing(shot(38, 60, 8, 3), []), 16, 20));

  // Side rings for other shots, kept out of the main chain's way.
  for (let added = 0, tries = 0; added < 2 && tries < SIDE_RING_ATTEMPTS; tries++) {
    const radius = between(5, 6);
    const spot = traceTo(shot(42, 68, 9, 3), [], between(60, 125));
    if (!spot || spot.y < radius + MIN_CLEARANCE) continue;
    const candidate = ring(spot.x, spot.y, spot.z, radius);
    if (keepsChain(chainShot, [...rings, candidate])) {
      boosters.push(candidate);
      added++;
    }
  }

  return { boosters, chainShot };
}

const envWith = (boosters: Booster[]): FlightEnv => ({ ...DEFAULT_ENV, boosters });

/** Where the shot is on reaching z, or null if it lands first. Infinity means last airborne spot. */
function traceTo(p: LaunchParams, rings: Booster[], z: number): Vector3 | null {
  const env = envWith(rings);
  const b = launchBall(p, new Vector3(0, BALL_RADIUS, 0));
  let last = b.pos.clone();
  while (b.carry === null) {
    last = b.pos.clone();
    stepBall(b, PHYSICS_DT, env);
    if (b.pos.z >= z) return b.pos.clone();
  }
  return z === Infinity ? last : null;
}

function landing(p: LaunchParams, rings: Booster[]): Vector3 {
  return traceTo(p, rings, Infinity)!;
}

function keepsChain(p: LaunchParams, rings: Booster[]): boolean {
  return simulateShot(p, envWith(rings)).used.every((b, i) => b === rings[i]);
}
