import { describe, expect, it } from 'vitest';
import { shapeName, swingFromFlick } from './swing';

const DEG = Math.PI / 180;
const straight = { speed: 5.5, angle: 0, curve: 0 };

describe('swingFromFlick', () => {
  it('grades timing', () => {
    expect(swingFromFlick(straight, 0).strike).toBe('perfect');
    expect(swingFromFlick(straight, 80).strike).toBe('good');
    expect(swingFromFlick(straight, -200).strike).toBe('early');
    expect(swingFromFlick(straight, 200).strike).toBe('late');
  });

  it('gives the most ball speed for a Perfect strike', () => {
    const perfect = swingFromFlick(straight, 0).launch.speed;
    expect(swingFromFlick(straight, 80).launch.speed).toBeLessThan(perfect);
    expect(swingFromFlick(straight, 200).launch.speed).toBeLessThan(swingFromFlick(straight, 80).launch.speed);
  });

  it('pulls early strikes left and pushes late ones right', () => {
    expect(swingFromFlick(straight, -200).launch.aim).toBeLessThan(0);
    expect(swingFromFlick(straight, 200).launch.aim).toBeGreaterThan(0);
  });

  it('turns a faster flick into more club speed, up to a cap', () => {
    const slow = swingFromFlick({ ...straight, speed: 2 }, 0).clubSpeed;
    const fast = swingFromFlick(straight, 0).clubSpeed;
    expect(fast).toBeGreaterThan(slow);
    expect(swingFromFlick({ ...straight, speed: 50 }, 0).clubSpeed).toBe(fast);
  });

  it('ignores a tiny curve and caps a huge one', () => {
    expect(swingFromFlick({ ...straight, curve: 2 * DEG }, 0).launch.spinTilt).toBe(0);
    expect(swingFromFlick({ ...straight, curve: 40 * DEG }, 0).launch.spinTilt).toBeGreaterThan(0);
    expect(swingFromFlick({ ...straight, curve: -170 * DEG }, 0).launch.spinTilt).toBeCloseTo(-22 * DEG);
  });
});

describe('shapeName', () => {
  it('names curves for a right-handed golfer', () => {
    expect(shapeName(0)).toBe('Straight');
    expect(shapeName(-6 * DEG)).toBe('Draw');
    expect(shapeName(-20 * DEG)).toBe('Hook');
    expect(shapeName(6 * DEG)).toBe('Fade');
    expect(shapeName(20 * DEG)).toBe('Slice');
  });
});
