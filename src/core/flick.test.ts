import { describe, expect, it } from 'vitest';
import { analyzeFlick, type PointerSample } from './flick';

const DEG = Math.PI / 180;
const SCREEN = 800;

/** A held press, then a stroke along `path` (unit = screens) over `ms`. */
function flick(path: (u: number) => [number, number], ms: number, holdMs = 500): PointerSample[] {
  const samples: PointerSample[] = [];
  const [x0, y0] = path(0);
  for (let t = 0; t < holdMs; t += 16) samples.push({ x: x0 * SCREEN, y: y0 * SCREEN, t });
  for (let t = 0; t <= ms; t += 4) {
    const [x, y] = path(t / ms);
    samples.push({ x: x * SCREEN, y: y * SCREEN, t: holdMs + t });
  }
  return samples;
}

describe('analyzeFlick', () => {
  it('reads a straight flick up', () => {
    const f = analyzeFlick(flick((u) => [0.5, 0.8 - 0.5 * u], 100), SCREEN)!;
    expect(f.speed).toBeCloseTo(5, 0); // half a screen in 0.1 s
    expect(f.angle).toBeCloseTo(0, 2);
    expect(Math.abs(f.curve)).toBeLessThan(0.01);
  });

  it('reads the angle of a flick up and to the right', () => {
    const f = analyzeFlick(flick((u) => [0.5 + 0.2 * u, 0.8 - 0.4 * u], 100), SCREEN)!;
    expect(f.angle).toBeCloseTo(Math.atan2(0.2, 0.4), 2);
  });

  it('reads a stroke that bends right as positive curve', () => {
    // Quarter circle: starts heading up, ends heading right.
    const f = analyzeFlick(flick((u) => [0.3 + 0.4 * (1 - Math.cos((u * Math.PI) / 2)), 0.8 - 0.4 * Math.sin((u * Math.PI) / 2)], 150), SCREEN)!;
    expect(f.curve).toBeGreaterThan(30 * DEG);
    const mirrored = analyzeFlick(flick((u) => [0.7 - 0.4 * (1 - Math.cos((u * Math.PI) / 2)), 0.8 - 0.4 * Math.sin((u * Math.PI) / 2)], 150), SCREEN)!;
    expect(mirrored.curve).toBeCloseTo(-f.curve, 5);
  });

  it('ignores the held part of the press', () => {
    // A slow drift while holding shouldn't change the flick's direction.
    const samples = flick((u) => [0.5, 0.8 - 0.5 * u], 100);
    for (let i = 0; i < 20; i++) samples[i].x += i * 0.05;
    const f = analyzeFlick(samples, SCREEN)!;
    expect(f.angle).toBeCloseTo(0, 1);
  });

  it('scales with screen size', () => {
    const big = analyzeFlick(flick((u) => [0.5, 0.8 - 0.5 * u], 100), SCREEN)!;
    const samples = flick((u) => [0.5, 0.8 - 0.5 * u], 100).map((s) => ({ ...s, x: s.x / 2, y: s.y / 2 }));
    expect(analyzeFlick(samples, SCREEN / 2)!.speed).toBeCloseTo(big.speed, 5);
  });

  it('needs at least two samples', () => {
    expect(analyzeFlick([{ x: 0, y: 0, t: 0 }], SCREEN)).toBeNull();
  });
});
