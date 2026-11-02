import { Vector3 } from 'three';
import { applyPad, applyRing, type Booster, type BouncePad, type BoostRing } from './boosters';
import { surfaceAt, type Surface, type SurfaceKind } from './surfaces';

// Ball flight, bounce and roll. Units are meters, seconds and radians.
// World axes: +Z down the range, +Y up, and -X is the golfer's right
// (the camera stands behind the ball looking down +Z).

export const FORWARD = new Vector3(0, 0, 1);
export const UP = new Vector3(0, 1, 0);
export const RIGHT = new Vector3().crossVectors(FORWARD, UP); // (-1, 0, 0)

export const BALL_RADIUS = 0.02135;
const BALL_MASS = 0.04593;
const AIR_DENSITY = 1.225;
const AREA = Math.PI * BALL_RADIUS ** 2;
const AERO = (0.5 * AIR_DENSITY * AREA) / BALL_MASS; // force-to-acceleration factor
const GRAVITY = 9.81;

const DRAG_COEFF = 0.245;
const SPIN_DECAY_SECONDS = 25; // spin halves roughly every 17 s

export const PHYSICS_DT = 1 / 120;

/** Lift coefficient from the spin factor S = r·ω / v. */
function liftCoeff(spinFactor: number): number {
  return Math.min(0.3, 1.6 * spinFactor);
}

const ROLL_BELOW_BOUNCE_SPEED = 1.2; // m/s of vertical speed
const STOP_SPEED = 0.15;

export interface LaunchParams {
  /** Ball speed in m/s. */
  speed: number;
  /** Vertical launch angle. */
  launchAngle: number;
  /** Horizontal start direction; positive is right. */
  aim: number;
  spinRpm: number;
  /** Tilt of the spin axis; positive curves the ball right. */
  spinTilt: number;
}

export type BallPhase = 'air' | 'rolling' | 'stopped';

export interface BallState {
  pos: Vector3;
  vel: Vector3;
  /** Angular velocity in rad/s. */
  spin: Vector3;
  phase: BallPhase;
  start: Vector3;
  /** Horizontal distance to the first landing, once it has landed. */
  carry: number | null;
  apex: number;
  /** The surface it last touched; null while it hasn't landed yet. */
  lie: SurfaceKind | null;
  /** Boosters this ball has already used, in order. */
  used: Booster[];
}

export function launchBall(p: LaunchParams, start: Vector3): BallState {
  const dirH = FORWARD.clone()
    .multiplyScalar(Math.cos(p.aim))
    .addScaledVector(RIGHT, Math.sin(p.aim));
  const vel = dirH
    .clone()
    .multiplyScalar(Math.cos(p.launchAngle))
    .addScaledVector(UP, Math.sin(p.launchAngle))
    .multiplyScalar(p.speed);

  // Backspin spins about the ball's own right-hand axis. Tilting that axis
  // down on the right tips the lift sideways, so the ball curves right.
  const rightH = new Vector3().crossVectors(dirH, UP);
  const spin = rightH
    .multiplyScalar(Math.cos(p.spinTilt))
    .addScaledVector(UP, -Math.sin(p.spinTilt))
    .multiplyScalar((p.spinRpm * 2 * Math.PI) / 60);

  return {
    pos: start.clone(),
    vel,
    spin,
    phase: 'air',
    start: start.clone(),
    carry: null,
    apex: start.y,
    lie: null,
    used: [],
  };
}

/** The world the ball flies through. */
export interface FlightEnv {
  /** Wind velocity in m/s. */
  wind: Vector3;
  surfaceAt(x: number, z: number): Surface;
  boosters: Booster[];
}

export const DEFAULT_ENV: FlightEnv = { wind: new Vector3(), surfaceAt: (x, z) => surfaceAt(x, z), boosters: [] };

const accel = new Vector3();
const magnus = new Vector3();
const airflow = new Vector3();
const previous = new Vector3();

export function stepBall(b: BallState, dt: number, env: FlightEnv = DEFAULT_ENV): void {
  if (b.phase === 'stopped') return;

  if (b.phase === 'rolling') {
    if (bounceOffPad(b, env)) return;
    const surface = env.surfaceAt(b.pos.x, b.pos.z);
    b.lie = surface.kind;
    const speed = Math.hypot(b.vel.x, b.vel.z);
    const next = speed - surface.rollDecel * dt;
    if (surface.kind === 'water' || next <= STOP_SPEED) {
      b.vel.set(0, 0, 0);
      b.phase = 'stopped';
      return;
    }
    b.vel.multiplyScalar(next / speed);
    b.pos.addScaledVector(b.vel, dt);
    return;
  }

  // Drag and lift come from the ball's motion through the air, so wind counts.
  airflow.subVectors(b.vel, env.wind);
  const speed = airflow.length();
  accel.set(0, -GRAVITY, 0);
  if (speed > 0) {
    accel.addScaledVector(airflow, -AERO * DRAG_COEFF * speed);
    const omega = b.spin.length();
    if (omega > 0) {
      const lift = liftCoeff((BALL_RADIUS * omega) / speed);
      // Magnus force points along ω × v, scaled to v².
      magnus.crossVectors(b.spin, airflow).multiplyScalar((AERO * lift * speed) / omega);
      accel.add(magnus);
    }
  }
  b.vel.addScaledVector(accel, dt);
  previous.copy(b.pos);
  b.pos.addScaledVector(b.vel, dt);
  b.spin.multiplyScalar(Math.exp(-dt / SPIN_DECAY_SECONDS));
  b.apex = Math.max(b.apex, b.pos.y);
  flyThroughRings(b, env);

  if (b.pos.y <= BALL_RADIUS && b.vel.y < 0) {
    b.pos.y = BALL_RADIUS;
    b.carry ??= horizontalDistance(b.start, b.pos);
    if (bounceOffPad(b, env)) return;
    const surface = env.surfaceAt(b.pos.x, b.pos.z);
    b.lie = surface.kind;
    if (surface.kind === 'water') {
      b.vel.set(0, 0, 0);
      b.phase = 'stopped';
      return;
    }
    b.vel.y *= -surface.restitution;
    b.vel.x *= 1 - surface.impactFriction;
    b.vel.z *= 1 - surface.impactFriction;
    b.spin.multiplyScalar(0.4); // the turf scrubs most of the spin off
    if (b.vel.y < ROLL_BELOW_BOUNCE_SPEED) {
      b.vel.y = 0;
      b.phase = 'rolling';
    }
  }
}

// The ball can move half a meter in a step, so this checks the path between
// steps, not just where the ball ended up.
function flyThroughRings(b: BallState, env: FlightEnv): void {
  for (const ring of env.boosters) {
    if (ring.kind !== 'ring' || b.used.includes(ring) || !crossesRing(ring, previous, b.pos)) continue;
    applyRing(ring, b.vel);
    b.used.push(ring);
  }
}

function crossesRing(ring: BoostRing, from: Vector3, to: Vector3): boolean {
  if (from.z === to.z || (from.z - ring.z) * (to.z - ring.z) > 0) return false;
  const t = (ring.z - from.z) / (to.z - from.z);
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t;
  return Math.hypot(x - ring.x, y - ring.y) <= ring.radius;
}

function bounceOffPad(b: BallState, env: FlightEnv): boolean {
  const pad = env.boosters.find((p): p is BouncePad => p.kind === 'pad' && isOnPad(p, b) && !b.used.includes(p));
  if (!pad) return false;
  applyPad(pad, b.vel);
  b.used.push(pad);
  b.phase = 'air';
  return true;
}

function isOnPad(pad: BouncePad, b: BallState): boolean {
  return Math.abs(b.pos.x) <= pad.width / 2 && Math.abs(b.pos.z - pad.z) <= pad.depth / 2;
}

export function horizontalDistance(a: Vector3, b: Vector3): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

export interface ShotSummary {
  carry: number;
  total: number;
  apex: number;
  rest: Vector3;
  lie: SurfaceKind | null;
  /** Boosters this ball has already used, in order. */
  used: Booster[];
  seconds: number;
}

/** Runs a whole shot to rest. Used by tests and tuning. */
export function simulateShot(p: LaunchParams, env: FlightEnv = DEFAULT_ENV, maxSeconds = 60): ShotSummary {
  const start = new Vector3(0, BALL_RADIUS, 0);
  const b = launchBall(p, start);
  let t = 0;
  while (b.phase !== 'stopped' && t < maxSeconds) {
    stepBall(b, PHYSICS_DT, env);
    t += PHYSICS_DT;
  }
  return {
    carry: b.carry ?? 0,
    total: horizontalDistance(start, b.pos),
    apex: b.apex,
    rest: b.pos,
    lie: b.lie,
    used: b.used,
    seconds: t,
  };
}

export const METERS_TO_YARDS = 1.09361;
