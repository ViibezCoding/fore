import type { Strike } from '../core/swing';
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

  showResult(r: ShotResult) {
    $('r-strike').textContent = STRIKE_TEXT[r.strike];
    $('r-strike').className = `strike ${r.strike}`;
    $('r-carry').textContent = `${Math.round(r.carryYards)} yds`;
    $('r-total').textContent = `${Math.round(r.totalYards)} yds`;
    $('r-speed').textContent = `${Math.round(r.ballMph)} mph`;
    $('r-shape').textContent = r.shape;
    $('r-lie').textContent = r.lie;
    $('r-boosts').textContent = String(r.boosts);
    card.hidden = false;
  },

  hideResult() {
    card.hidden = true;
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
