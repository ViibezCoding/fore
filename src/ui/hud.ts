import type { Strike } from '../core/swing';

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

export interface ShotResult {
  strike: Strike;
  carryYards: number;
  totalYards: number;
  ballMph: number;
  shape: string;
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
    card.hidden = false;
  },

  hideResult() {
    card.hidden = true;
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
