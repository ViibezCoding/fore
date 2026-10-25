import * as THREE from 'three';
import { analyzeFlick, type PointerSample } from './core/flick';
import { MIN_FLICK_SPEED, RING_MS, shapeName, swingFromFlick, type Strike } from './core/swing';
import {
  BALL_RADIUS,
  METERS_TO_YARDS,
  PHYSICS_DT,
  horizontalDistance,
  launchBall,
  stepBall,
  type BallState,
} from './physics/ballFlight';
import { BallTrail } from './scene/ballTrail';
import { CameraRig } from './scene/cameraRig';
import { SUN_OFFSET, TEE_HEIGHT, buildRange } from './scene/range';
import { hud } from './ui/hud';
import { SwingOverlay, type OverlayView } from './ui/swingOverlay';

// Phase 1 swing prototype: press and hold to start the backswing, flick up
// to swing, and release as the ring closes on the ball.

const DEFAULT_HINT = 'Press and hold, then flick up as the ring closes';
const MPS_TO_MPH = 2.23694;
const FLIGHT_SCALE = 2.5; // draw the ball bigger in flight so it's easy to follow
const TEE_SPOT = new THREE.Vector3(0, TEE_HEIGHT + BALL_RADIUS, 0);
const DEG = 180 / Math.PI;

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const overlay = new SwingOverlay(document.querySelector<HTMLCanvasElement>('#overlay')!);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const { scene, flag, sun } = buildRange();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
const rig = new CameraRig(camera);

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_RADIUS, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
);
ball.castShadow = true;
scene.add(ball);

const trail = new BallTrail();
scene.add(trail.line);

type Mode = 'ready' | 'swinging' | 'flying' | 'result';
let mode: Mode = 'ready';

// Swing input
let pressAt: number | null = null;
let pointerId = -1;
let samples: PointerSample[] = [];
let released: OverlayView['released'] = null;

// Current shot
let shot: { ball: BallState; strike: Strike; ballSpeed: number; spinTilt: number } | null = null;
let resultAt = 0;
let accumulator = 0;

function resetToTee() {
  mode = 'ready';
  shot = null;
  released = null;
  accumulator = 0;
  ball.position.copy(TEE_SPOT);
  ball.scale.setScalar(1);
  trail.clear();
  rig.toTee();
  hud.hideResult();
  hud.showReset(false);
  hud.liveDistance(null);
  hud.showHint(DEFAULT_HINT);
}

function cancelSwing(hint: string) {
  mode = 'ready';
  pressAt = null;
  samples = [];
  hud.showHint(hint);
}

canvas.addEventListener('pointerdown', (e) => {
  if (mode === 'result') {
    if (e.timeStamp - resultAt > 300) resetToTee();
    return;
  }
  if (mode !== 'ready') return;
  mode = 'swinging';
  pressAt = e.timeStamp;
  pointerId = e.pointerId;
  samples = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
  released = null;
  canvas.setPointerCapture(e.pointerId);
  hud.hideHint();
});

canvas.addEventListener('pointermove', (e) => {
  if (mode !== 'swinging' || e.pointerId !== pointerId) return;
  const events = e.getCoalescedEvents?.() ?? [];
  for (const c of events.length ? events : [e]) {
    samples.push({ x: c.clientX, y: c.clientY, t: c.timeStamp });
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (mode !== 'swinging' || e.pointerId !== pointerId) return;
  samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
  releaseSwing(e.timeStamp);
});

canvas.addEventListener('pointercancel', (e) => {
  if (mode === 'swinging' && e.pointerId === pointerId) cancelSwing(DEFAULT_HINT);
});

// Bring the ball back to the tee mid-shot, from the button or the R key.
function resetShot() {
  if (mode === 'flying' || mode === 'result') resetToTee();
}
hud.onReset(resetShot);
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) resetShot();
});

function releaseSwing(at: number) {
  const flick = analyzeFlick(samples, Math.min(window.innerWidth, window.innerHeight));
  if (!flick || flick.speed < MIN_FLICK_SPEED) {
    cancelSwing('Flick faster! Hold, then flick up as the ring closes');
    return;
  }
  if (Math.abs(flick.angle) > Math.PI / 2) {
    cancelSwing('Flick up, toward the range');
    return;
  }

  const sincePress = at - pressAt!;
  const swing = swingFromFlick(flick, sincePress - RING_MS);
  released = { at, ringScale: SwingOverlay.ringScale(sincePress), strike: swing.strike };
  pressAt = null;
  samples = [];

  const b = launchBall(swing.launch, TEE_SPOT);
  shot = { ball: b, strike: swing.strike, ballSpeed: swing.launch.speed, spinTilt: swing.launch.spinTilt };
  rig.startChase(b.vel);
  trail.clear();
  trail.add(b.pos);
  ball.scale.setScalar(FLIGHT_SCALE);
  mode = 'flying';

  hud.showReset(true);
  hud.strike(swing.strike);
  const signed = (v: number, digits = 0) => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
  hud.debug(
    `flick ${flick.speed.toFixed(1)} screens/s · club ${Math.round(swing.clubSpeed * MPS_TO_MPH)} mph · ` +
      `timing ${signed(swing.timingMs)} ms · aim ${signed(swing.launch.aim * DEG, 1)}° · ` +
      `curve ${signed(flick.curve * DEG)}° → tilt ${signed(swing.launch.spinTilt * DEG, 1)}°`,
  );
}

function finishShot(s: NonNullable<typeof shot>) {
  mode = 'result';
  resultAt = performance.now();
  hud.liveDistance(null);
  hud.showResult({
    strike: s.strike,
    carryYards: (s.ball.carry ?? 0) * METERS_TO_YARDS,
    totalYards: horizontalDistance(TEE_SPOT, s.ball.pos) * METERS_TO_YARDS,
    ballMph: s.ballSpeed * MPS_TO_MPH,
    shape: shapeName(s.spinTilt),
  });
}

function resize() {
  const { clientWidth: w, clientHeight: h } = canvas;
  renderer.setSize(w, h, false);
  overlay.resize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
resetToTee();

const teeScreen = new THREE.Vector3();
let lastFrame = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (mode === 'flying' && shot) {
    accumulator += dt;
    while (accumulator >= PHYSICS_DT && shot.ball.phase !== 'stopped') {
      stepBall(shot.ball, PHYSICS_DT);
      trail.add(shot.ball.pos);
      accumulator -= PHYSICS_DT;
    }
    // The ball is drawn scaled up in flight; lift it so it still sits on the grass.
    ball.position.copy(shot.ball.pos);
    ball.position.y += BALL_RADIUS * (FLIGHT_SCALE - 1);
    hud.liveDistance(horizontalDistance(TEE_SPOT, shot.ball.pos) * METERS_TO_YARDS);
    if (shot.ball.phase === 'stopped') finishShot(shot);
  }

  if (mode === 'flying' || mode === 'result') rig.follow(ball.position, dt);

  sun.target.position.copy(ball.position);
  sun.position.copy(ball.position).add(SUN_OFFSET);
  flag.rotation.y = Math.sin(now / 500) * 0.15;
  renderer.render(scene, camera);

  teeScreen.copy(TEE_SPOT).project(camera);
  overlay.render({
    now,
    ball: {
      x: ((teeScreen.x + 1) / 2) * canvas.clientWidth,
      y: ((1 - teeScreen.y) / 2) * canvas.clientHeight,
    },
    pressAt,
    samples,
    released,
  });
});
