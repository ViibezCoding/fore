import type { Flick } from './flick';
import type { LaunchParams } from '../physics/ballFlight';

// Turns a flick and its release timing into a launch. Every number here is
// a tuning knob; Phase 1 is about getting these to feel right.

const DEG = Math.PI / 180;

/** Time from pressing down until the sweet-spot ring lines up with the ball. */
export const RING_MS = 800;
export const PERFECT_MS = 40;
const GOOD_MS = 110;
const WORST_MS = 260; // timing errors beyond this are as bad as it gets

/** Flicks slower than this (screens/s) don't count as a swing. */
export const MIN_FLICK_SPEED = 1.2;
const FULL_FLICK_SPEED = 5.5;
const MIN_CLUB_SPEED = 18; // m/s
const MAX_CLUB_SPEED = 48; // m/s, about 107 mph

const SMASH_PERFECT = 1.5;
const SMASH_GOOD = 1.44;
const SMASH_WORST = 1.15;

const AIM_SCALE = 0.5; // share of the flick's angle that becomes aim
const MAX_AIM = 15 * DEG;
const MISHIT_PUSH = 6 * DEG; // early pulls left, late pushes right
const LAUNCH_ANGLE = 12 * DEG;
const MISHIT_LAUNCH = 4 * DEG; // early flies low, late balloons
const BASE_SPIN_RPM = 2600;
const MISHIT_SPIN_RPM = 900;

const CURVE_DEAD_ZONE = 4 * DEG;
const CURVE_TO_TILT = 0.4;
const MAX_TILT = 22 * DEG;

export type Strike = 'perfect' | 'good' | 'early' | 'late';

export interface Swing {
  launch: LaunchParams;
  strike: Strike;
  timingMs: number;
  clubSpeed: number;
}

/** timingMs is release time minus the moment the ring lines up. */
export function swingFromFlick(flick: Flick, timingMs: number): Swing {
  const abs = Math.abs(timingMs);
  const strike: Strike =
    abs <= PERFECT_MS ? 'perfect' : abs <= GOOD_MS ? 'good' : timingMs < 0 ? 'early' : 'late';

  // 0 inside the Perfect window, 1 at the worst timing.
  const miss = clamp01((abs - PERFECT_MS) / (WORST_MS - PERFECT_MS));
  const signedMiss = Math.sign(timingMs) * miss;

  const power = clamp01((flick.speed - MIN_FLICK_SPEED) / (FULL_FLICK_SPEED - MIN_FLICK_SPEED));
  const clubSpeed = MIN_CLUB_SPEED + (MAX_CLUB_SPEED - MIN_CLUB_SPEED) * power;

  const goodShare = clamp01((abs - PERFECT_MS) / (GOOD_MS - PERFECT_MS));
  const smash =
    abs <= GOOD_MS
      ? SMASH_PERFECT + (SMASH_GOOD - SMASH_PERFECT) * goodShare
      : SMASH_GOOD + (SMASH_WORST - SMASH_GOOD) * clamp01((abs - GOOD_MS) / (WORST_MS - GOOD_MS));

  const curveBeyondDeadZone = Math.max(0, Math.abs(flick.curve) - CURVE_DEAD_ZONE);
  const spinTilt = Math.sign(flick.curve) * Math.min(MAX_TILT, curveBeyondDeadZone * CURVE_TO_TILT);

  return {
    strike,
    timingMs,
    clubSpeed,
    launch: {
      speed: clubSpeed * smash,
      launchAngle: LAUNCH_ANGLE + signedMiss * MISHIT_LAUNCH,
      aim: clamp(flick.angle * AIM_SCALE, -MAX_AIM, MAX_AIM) + signedMiss * MISHIT_PUSH,
      spinRpm: BASE_SPIN_RPM + miss * MISHIT_SPIN_RPM,
      spinTilt,
    },
  };
}

/** Golfer's name for the curve, for a right-handed golfer. */
export function shapeName(spinTilt: number): string {
  const a = Math.abs(spinTilt);
  if (a < 3 * DEG) return 'Straight';
  if (spinTilt < 0) return a < 12 * DEG ? 'Draw' : 'Hook';
  return a < 12 * DEG ? 'Fade' : 'Slice';
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}
