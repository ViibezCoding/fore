// Reads a flick from raw pointer samples. Distances are measured in
// "screens" (the shorter side of the viewport) so a flick feels the same
// on a phone and a desktop.

export interface PointerSample {
  x: number; // px
  y: number; // px, down is positive
  t: number; // ms
}

export interface Flick {
  /** Peak speed in screens per second. */
  speed: number;
  /** Direction of the stroke in radians from straight up; positive is right. */
  angle: number;
  /** How much the stroke turned, start half to end half; positive is clockwise. */
  curve: number;
}

const PEAK_WINDOW_MS = 50;
const STILL_SPEED = 0.4; // screens/s; slower than this is holding, not flicking

/** Returns null when there's nothing to read (fewer than two samples). */
export function analyzeFlick(samples: PointerSample[], screenSize: number): Flick | null {
  if (samples.length < 2) return null;
  const pts = samples.map((s) => ({ x: s.x / screenSize, y: s.y / screenSize, t: s.t / 1000 }));

  // Peak speed, averaged over a short window so one jittery sample can't spike it.
  let peak = 0;
  let peakIndex = 1;
  let j = 0;
  for (let i = 1; i < pts.length; i++) {
    while (j < i - 1 && pts[i].t - pts[j + 1].t >= PEAK_WINDOW_MS / 1000) j++;
    const dt = pts[i].t - pts[j].t;
    if (dt <= 0) continue;
    const v = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) / dt;
    if (v > peak) {
      peak = v;
      peakIndex = i;
    }
  }

  // The stroke is the run of moving samples around the peak.
  const segSpeed = (i: number) => {
    const dt = pts[i].t - pts[i - 1].t;
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return dt > 0 ? d / dt : Infinity;
  };
  let start = peakIndex - 1;
  while (start > 0 && segSpeed(start) >= STILL_SPEED) start--;
  let end = peakIndex;
  while (end < pts.length - 1 && segSpeed(end + 1) >= STILL_SPEED) end++;
  const stroke = pts.slice(start, end + 1);

  const first = stroke[0];
  const last = stroke[stroke.length - 1];
  const angle = heading(first, last);

  // Split the stroke at half its path length and compare the two headings.
  let curve = 0;
  if (stroke.length >= 3) {
    const lengths = [0];
    for (let i = 1; i < stroke.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y));
    }
    const half = lengths[lengths.length - 1] / 2;
    let m = 1;
    while (m < stroke.length - 2 && lengths[m] < half) m++;
    curve = wrapAngle(heading(stroke[m], last) - heading(first, stroke[m]));
  }

  return { speed: peak, angle, curve };
}

function heading(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.atan2(b.x - a.x, a.y - b.y);
}

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
