import { describe, expect, it } from 'vitest';
import { METERS_TO_YARDS, simulateShot, type LaunchParams } from './ballFlight';

const DEG = Math.PI / 180;
const MPH = 0.44704;

// A typical tour driver: 167 mph ball speed, 10.9° launch, 2686 rpm.
const tourDrive: LaunchParams = { speed: 167 * MPH, launchAngle: 10.9 * DEG, aim: 0, spinRpm: 2686, spinTilt: 0 };

describe('simulateShot', () => {
  it('carries a tour drive about 275 yards', () => {
    const carry = simulateShot(tourDrive).carry * METERS_TO_YARDS;
    expect(carry).toBeGreaterThan(260);
    expect(carry).toBeLessThan(290);
  });

  it('rolls a little after landing', () => {
    const s = simulateShot(tourDrive);
    const roll = (s.total - s.carry) * METERS_TO_YARDS;
    expect(roll).toBeGreaterThan(5);
    expect(roll).toBeLessThan(45);
  });

  it('flies a straight shot straight', () => {
    expect(Math.abs(simulateShot(tourDrive).rest.x)).toBeLessThan(0.01);
  });

  it('goes farther with more ball speed', () => {
    const slow = simulateShot({ ...tourDrive, speed: 100 * MPH });
    expect(simulateShot(tourDrive).carry).toBeGreaterThan(slow.carry + 50);
  });

  it('curves right with positive tilt and left with negative tilt', () => {
    // The golfer's right is -X.
    expect(simulateShot({ ...tourDrive, spinTilt: 15 * DEG }).rest.x).toBeLessThan(-10);
    expect(simulateShot({ ...tourDrive, spinTilt: -15 * DEG }).rest.x).toBeGreaterThan(10);
  });

  it('starts right when aimed right', () => {
    expect(simulateShot({ ...tourDrive, aim: 5 * DEG }).rest.x).toBeLessThan(-10);
  });

  it('comes to rest', () => {
    expect(simulateShot(tourDrive).seconds).toBeLessThan(30);
  });
});
