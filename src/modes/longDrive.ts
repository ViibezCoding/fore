import type { Strike } from '../core/swing';

// Long Drive Competition: ten balls, and the longest one is your score.
// Drives that finish past the Monster Line pay a bonus.

export const BALLS_PER_ROUND = 10;
export const MONSTER_LINE_YARDS = 600;

const YARDS_PER_TEE = 10;
const PERFECT_TEES = 5;
const MONSTER_TEES = 15;

export interface Drive {
  yards: number;
  strike: Strike;
  /** In the water: it scores nothing. */
  lost: boolean;
}

export interface ScoredDrive {
  yards: number;
  monster: boolean;
  tees: number;
}

export class LongDriveRound {
  readonly scored: ScoredDrive[] = [];
  perfects = 0;

  /** The ball being played, counting from 1. */
  get ballNumber(): number {
    return Math.min(this.scored.length + 1, BALLS_PER_ROUND);
  }

  get finished(): boolean {
    return this.scored.length >= BALLS_PER_ROUND;
  }

  get bestYards(): number {
    return Math.max(0, ...this.scored.map((d) => d.yards));
  }

  get monsters(): number {
    return this.scored.filter((d) => d.monster).length;
  }

  get tees(): number {
    return this.scored.reduce((sum, d) => sum + d.tees, 0);
  }

  record(drive: Drive): ScoredDrive {
    const yards = drive.lost ? 0 : drive.yards;
    const monster = yards >= MONSTER_LINE_YARDS;
    const perfect = !drive.lost && drive.strike === 'perfect';
    if (perfect) this.perfects++;
    const tees = Math.floor(yards / YARDS_PER_TEE) + (perfect ? PERFECT_TEES : 0) + (monster ? MONSTER_TEES : 0);
    const scored = { yards, monster, tees };
    this.scored.push(scored);
    return scored;
  }
}
