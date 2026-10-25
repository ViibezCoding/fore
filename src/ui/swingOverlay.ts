import type { PointerSample } from '../core/flick';
import { PERFECT_MS, RING_MS, type Strike } from '../core/swing';

// 2D layer over the 3D canvas: the sweet-spot ring and the flick trace.

const RING_START_SCALE = 3.2; // the ring starts this many times the target size
const RING_LINGER_MS = 350; // keep shrinking this long past the target
const RESULT_FADE_MS = 700;

const STRIKE_COLORS: Record<Strike, string> = {
  perfect: '#ffd84a',
  good: '#ffffff',
  early: '#ff7a59',
  late: '#ff7a59',
};

export interface OverlayView {
  now: number;
  /** Ball position in CSS pixels. */
  ball: { x: number; y: number };
  /** When the current swing started, if one is in progress. */
  pressAt: number | null;
  samples: PointerSample[];
  /** The last release, so the ring can flash its result. */
  released: { at: number; ringScale: number; strike: Strike } | null;
}

export class SwingOverlay {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  resize(width: number, height: number): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Radius of the target circle around the ball, in CSS pixels. */
  get targetRadius(): number {
    return Math.min(56, Math.max(26, Math.min(this.width, this.height) * 0.06));
  }

  /** Ring size relative to the target circle, given time since the press. */
  static ringScale(elapsedMs: number): number {
    return 1 + (RING_START_SCALE - 1) * (1 - elapsedMs / RING_MS);
  }

  render(v: OverlayView): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    const r = this.targetRadius;

    if (v.pressAt !== null) {
      const elapsed = v.now - v.pressAt;
      const inPerfect = Math.abs(elapsed - RING_MS) <= PERFECT_MS;

      // Target circle on the ball
      circle(ctx, v.ball.x, v.ball.y, r, inPerfect ? '#ffd84a' : 'rgb(255 255 255 / 55%)', inPerfect ? 4 : 2);

      // Shrinking ring
      if (elapsed < RING_MS + RING_LINGER_MS) {
        const fade = elapsed > RING_MS ? 1 - (elapsed - RING_MS) / RING_LINGER_MS : 1;
        ctx.globalAlpha = Math.max(0, fade);
        const scale = Math.max(0.2, SwingOverlay.ringScale(elapsed));
        circle(ctx, v.ball.x, v.ball.y, r * scale, inPerfect ? '#ffd84a' : '#ffffff', 5);
        ctx.globalAlpha = 1;
      }

      this.drawTrace(v.samples);
    }

    if (v.released) {
      const age = v.now - v.released.at;
      if (age < RESULT_FADE_MS) {
        const color = STRIKE_COLORS[v.released.strike];
        ctx.globalAlpha = 1 - age / RESULT_FADE_MS;
        circle(ctx, v.ball.x, v.ball.y, r * Math.max(0.2, v.released.ringScale), color, 6);
        circle(ctx, v.ball.x, v.ball.y, r + age * 0.15, color, 3); // burst outward
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawTrace(samples: PointerSample[]): void {
    if (samples.length < 2) return;
    const { ctx } = this;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgb(255 255 255 / 70%)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(samples[0].x, samples[0].y);
    for (const s of samples) ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
