import type { Strike } from '../core/swing';
import { BALLS_PER_ROUND, MONSTER_LINE_YARDS, type LongDriveRound } from '../modes/longDrive';
import type { Booster } from '../physics/boosters';
import { windName, type Wind } from '../physics/wind';

const MPS_TO_MPH = 2.23694;

// The HTML readouts over the canvas. Elements live in index.html.

const STRIKE_TEXT: Record<Strike, string> = {
  perfect: 'PERFECT!',
  good: 'Good',
  early: 'Early',
  late: 'Late',
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const hint = $('hint');
const callout = $('callout');
const live = $('live');
const liveYards = $('live-yards');
const card = $('card');
const debug = $('debug');
const reset = $<HTMLButtonElement>('reset');
const menu = $('menu');
const round = $('round');
const roundOver = $('round-over');
const longest = $('longest');
const longestYards = $('longest-yards');
const windBox = $('wind');
const windArrow = $('wind-arrow');
const windSpeed = $('wind-speed');

export interface ShotResult {
  strike: Strike;
  carryYards: number;
  totalYards: number;
  ballMph: number;
  shape: string;
  lie: string;
  boosts: number;
  /** Tees this shot earned, in a mode that pays them. */
  tees?: number;
  /** What tapping the card does. */
  next: string;
}

export interface RoundBest {
  yards: number;
  isNew: boolean;
  teesTotal: number;
}

export const hud = {
  showHint(text: string) {
    hint.textContent = text;
    hint.hidden = false;
  },

  hideHint() {
    hint.hidden = true;
  },

  strike(strike: Strike) {
    callout.textContent = STRIKE_TEXT[strike];
    callout.className = `callout ${strike}`;
    // Restart the pop animation
    void callout.offsetWidth;
    callout.classList.add('show');
  },

  boost(kind: Booster['kind']) {
    callout.textContent = kind === 'ring' ? 'BOOST!' : 'BOUNCE!';
    callout.className = `callout boost-${kind}`;
    void callout.offsetWidth;
    callout.classList.add('show');
  },

  liveDistance(yards: number | null) {
    live.hidden = yards === null;
    if (yards !== null) liveYards.textContent = String(Math.round(yards));
  },

  monster() {
    callout.textContent = 'MONSTER!';
    callout.className = 'callout monster';
    void callout.offsetWidth;
    callout.classList.add('show');
  },

  showResult(r: ShotResult) {
    $('r-strike').textContent = STRIKE_TEXT[r.strike];
    $('r-strike').className = `strike ${r.strike}`;
    $('r-carry').textContent = `${Math.round(r.carryYards)} yds`;
    $('r-total').textContent = `${Math.round(r.totalYards)} yds`;
    $('r-speed').textContent = `${Math.round(r.ballMph)} mph`;
    $('r-shape').textContent = r.shape;
    $('r-lie').textContent = r.lie;
    $('r-boosts').textContent = String(r.boosts);
    $('r-tees').textContent = `+${r.tees ?? 0}`;
    $('r-tees').hidden = $('r-tees-label').hidden = r.tees === undefined;
    $('r-again').textContent = r.next;
    card.hidden = false;
  },

  hideResult() {
    card.hidden = true;
  },

  teeBalance(tees: number) {
    $('tee-balance').textContent = tees.toLocaleString();
  },

  showMenu(visible: boolean) {
    menu.hidden = !visible;
    document.body.classList.toggle('in-menu', visible);
  },

  /** The scoreboard during a round; null hides it. */
  round(r: LongDriveRound | null, ball = r?.ballNumber) {
    round.hidden = r === null;
    if (!r) return;
    round.innerHTML =
      `Ball <b>${ball}</b>/${BALLS_PER_ROUND} · Best <b>${Math.round(r.bestYards)}</b> · ` +
      `Monsters <b>${r.monsters}</b> · Line ${MONSTER_LINE_YARDS}`;
  },

  showRoundOver(r: LongDriveRound, best: RoundBest) {
    $('o-best').textContent = String(Math.round(r.bestYards));
    $('o-new').hidden = !best.isNew;
    $('o-monsters').textContent = String(r.monsters);
    $('o-perfects').textContent = String(r.perfects);
    $('o-tees').textContent = `+${r.tees}`;
    $('o-record').textContent = `${Math.round(best.yards)} yds`;
    $('o-total').textContent = String(best.teesTotal);
    roundOver.hidden = false;
  },

  hideRoundOver() {
    roundOver.hidden = true;
  },

  onPlayAgain(handler: () => void) {
    $('o-again').addEventListener('click', handler);
  },

  onRoundOverMenu(handler: () => void) {
    $('o-menu').addEventListener('click', handler);
  },

  onPlayLongDrive(handler: () => void) {
    $('play-long-drive').addEventListener('click', handler);
  },

  resetLabel(text: string) {
    $('reset-label').textContent = text;
  },

  onPlayRange(handler: () => void) {
    $('play-range').addEventListener('click', handler);
  },

  onBackToMenu(handler: () => void) {
    $('to-menu').addEventListener('click', handler);
  },

  longestDrive(yards: number, isNew = false) {
    longestYards.textContent = yards > 0 ? `${Math.round(yards)} yds` : '—';
    longest.classList.toggle('record', isNew);
  },

  /** Up on screen is downrange, so the arrow turns clockwise toward the golfer's right. */
  wind(w: Wind) {
    const mph = Math.round(w.speed * MPS_TO_MPH);
    windSpeed.textContent = String(mph);
    windArrow.style.transform = `rotate(${w.direction}rad)`;
    windBox.classList.toggle('calm', mph === 0);
    windBox.title = windName(w);
    windBox.setAttribute('aria-label', `Wind: ${mph} mph, ${windName(w)}`);
  },

  showReset(visible: boolean) {
    reset.hidden = !visible;
  },

  onReset(handler: () => void) {
    reset.addEventListener('click', handler);
  },

  /** Raw swing numbers, to help tune the feel. */
  debug(text: string) {
    debug.textContent = text;
  },
};
