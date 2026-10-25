import { Vector3 } from 'three';

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

// Phase 1 has a single surface. Phase 2 turns this into surfaces.ts.
const FAIRWAY = {
  restitution: 0.32, // share of vertical speed kept on a bounce
  impactFriction: 0.32, // share of horizontal speed lost on a bounce
  rollDecel: 2.6, // m/s² while rolling
};

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
  };
}

const accel = new Vector3();
const magnus = new Vector3();

export function stepBall(b: BallState, dt: number): void {
  if (b.phase === 'stopped') return;

  if (b.phase === 'rolling') {
    const speed = Math.hypot(b.vel.x, b.vel.z);
    const next = speed - FAIRWAY.rollDecel * dt;
    if (next <= STOP_SPEED) {
      b.vel.set(0, 0, 0);
      b.phase = 'stopped';
      return;
    }
    b.vel.multiplyScalar(next / speed);
    b.pos.addScaledVector(b.vel, dt);
    return;
  }

  const speed = b.vel.length();
  accel.set(0, -GRAVITY, 0);
  if (speed > 0) {
    accel.addScaledVector(b.vel, -AERO * DRAG_COEFF * speed);
    const omega = b.spin.length();
    if (omega > 0) {
      const lift = liftCoeff((BALL_RADIUS * omega) / speed);
      // Magnus force points along ω × v, scaled to v².
      magnus.crossVectors(b.spin, b.vel).multiplyScalar((AERO * lift * speed) / omega);
      accel.add(magnus);
    }
  }
  b.vel.addScaledVector(accel, dt);
  b.pos.addScaledVector(b.vel, dt);
  b.spin.multiplyScalar(Math.exp(-dt / SPIN_DECAY_SECONDS));
  b.apex = Math.max(b.apex, b.pos.y);

  if (b.pos.y <= BALL_RADIUS && b.vel.y < 0) {
    b.pos.y = BALL_RADIUS;
    b.carry ??= horizontalDistance(b.start, b.pos);
    b.vel.y *= -FAIRWAY.restitution;
    b.vel.x *= 1 - FAIRWAY.impactFriction;
    b.vel.z *= 1 - FAIRWAY.impactFriction;
    b.spin.multiplyScalar(0.4); // the turf scrubs most of the spin off
    if (b.vel.y < ROLL_BELOW_BOUNCE_SPEED) {
      b.vel.y = 0;
      b.phase = 'rolling';
    }
  }
}

export function horizontalDistance(a: Vector3, b: Vector3): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

export interface ShotSummary {
  carry: number;
  total: number;
  apex: number;
  rest: Vector3;
  seconds: number;
}

/** Runs a whole shot to rest. Used by tests and tuning. */
export function simulateShot(p: LaunchParams, maxSeconds = 60): ShotSummary {
  const start = new Vector3(0, BALL_RADIUS, 0);
  const b = launchBall(p, start);
  let t = 0;
  while (b.phase !== 'stopped' && t < maxSeconds) {
    stepBall(b, PHYSICS_DT);
    t += PHYSICS_DT;
  }
  return {
    carry: b.carry ?? 0,
    total: horizontalDistance(start, b.pos),
    apex: b.apex,
    rest: b.pos,
    seconds: t,
  };
}

export const METERS_TO_YARDS = 1.09361;
