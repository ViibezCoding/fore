import { describe, expect, it } from 'vitest';
import { BALLS_PER_ROUND, LongDriveRound, MONSTER_LINE_YARDS } from './longDrive';

const drive = (yards: number, strike: 'perfect' | 'good' = 'good', lost = false) => ({ yards, strike, lost });

describe('LongDriveRound', () => {
  it('runs ten balls, then finishes', () => {
    const round = new LongDriveRound();
    expect(round.ballNumber).toBe(1);
    for (let i = 0; i < BALLS_PER_ROUND - 1; i++) round.record(drive(300));
    expect(round.ballNumber).toBe(10);
    expect(round.finished).toBe(false);
    round.record(drive(300));
    expect(round.finished).toBe(true);
    expect(round.ballNumber).toBe(10);
  });

  it('keeps the longest drive as the score', () => {
    const round = new LongDriveRound();
    [250, 512, 300].forEach((y) => round.record(drive(y)));
    expect(round.bestYards).toBe(512);
  });

  it('counts drives that finish past the Monster Line', () => {
    const round = new LongDriveRound();
    round.record(drive(MONSTER_LINE_YARDS - 1));
    round.record(drive(MONSTER_LINE_YARDS));
    round.record(drive(800));
    expect(round.monsters).toBe(2);
  });

  it('pays Tees for distance, Perfect strikes and monsters', () => {
    const round = new LongDriveRound();
    expect(round.record(drive(305)).tees).toBe(30);
    expect(round.record(drive(305, 'perfect')).tees).toBe(35);
    expect(round.record(drive(700, 'perfect')).tees).toBe(70 + 5 + 15);
    expect(round.tees).toBe(30 + 35 + 90);
    expect(round.perfects).toBe(2);
  });

  it('scores nothing for a ball in the water', () => {
    const round = new LongDriveRound();
    expect(round.record(drive(900, 'perfect', true))).toEqual({ yards: 0, monster: false, tees: 0 });
    expect(round.perfects).toBe(0);
    expect(round.bestYards).toBe(0);
  });
});
