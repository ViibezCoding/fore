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
  type FlightEnv,
} from './physics/ballFlight';
import { generateBoosters } from './physics/boosterLayout';
import { SURFACES, surfaceAt } from './physics/surfaces';
import { CALM, rollWind, windVector, type Wind } from './physics/wind';
import { seededRandom } from './core/random';
import { loadSave, writeSave } from './core/save';
import { LongDriveRound, MONSTER_LINE_YARDS } from './modes/longDrive';
import { BallTrail } from './scene/ballTrail';
import { BoosterMeshes } from './scene/boosterMeshes';
import { buildRangeProps } from './scene/rangeProps';
import { CameraRig } from './scene/cameraRig';
import { SUN_OFFSET, TEE_HEIGHT, buildRange } from './scene/range';
import { hud } from './ui/hud';
import { SwingOverlay, type OverlayView } from './ui/swingOverlay';

// Press and hold to start the backswing, flick up to swing, and release as
// the ring closes on the ball. Then the ball flies through the wind and
// bounces and rolls on whatever it lands on.

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

const { scene, flag, sun, monsterLine } = buildRange();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
const rig = new CameraRig(camera);

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_RADIUS, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
);
ball.castShadow = true;
scene.add(ball);

scene.add(buildRangeProps());

const boosterMeshes = new BoosterMeshes();
scene.add(boosterMeshes.group);

const trail = new BallTrail();
scene.add(trail.line);

// Every ball gets a new wind and booster layout. Add ?seed=123 to the URL to
// replay the same series, or ?wind=off for calm air while tuning.
const params = new URLSearchParams(window.location.search);
const random = seededRandom(Number(params.get('seed')) || Date.now());
const windOff = params.get('wind') === 'off';
let wind: Wind = CALM;
const env: FlightEnv = { wind: new THREE.Vector3(), surfaceAt: (x, z) => surfaceAt(x, z), boosters: [] };
let flagYaw = 0;

function newWind() {
  wind = windOff ? CALM : rollWind(random);
  env.wind.copy(windVector(wind));
  // The flag streams along its pivot's +X; turn that to point downwind.
  if (wind.speed > 0) flagYaw = Math.atan2(-env.wind.z, env.wind.x);
  hud.wind(wind);
}

type Mode = 'menu' | 'ready' | 'swinging' | 'flying' | 'result' | 'roundOver';
let mode: Mode = 'menu';

// Swing input
let pressAt: number | null = null;
let pointerId = -1;
let samples: PointerSample[] = [];
let released: OverlayView['released'] = null;

// Current shot
let shot: { ball: BallState; strike: Strike; ballSpeed: number; spinTilt: number } | null = null;
let resultAt = 0;
let accumulator = 0;
let boostsSeen = 0;
const save = loadSave();

// The Long Drive Competition in progress; null on the Driving Range.
let round: LongDriveRound | null = null;
let crossedMonsterLine = false;

function resetToTee() {
  mode = 'ready';
  shot = null;
  released = null;
  accumulator = 0;
  boostsSeen = 0;
  crossedMonsterLine = false;
  ball.position.copy(TEE_SPOT);
  ball.scale.setScalar(1);
  ball.visible = true;
  trail.clear();
  rig.toTee();
  newWind();
  env.boosters = generateBoosters(random).boosters;
  boosterMeshes.setLayout(env.boosters);
  hud.longestDrive(save.longestYards);
  hud.round(round);
  hud.hideResult();
  hud.showReset(false);
  hud.liveDistance(null);
  hud.showHint(DEFAULT_HINT);
}

function openMenu() {
  pressAt = null;
  samples = [];
  round = null;
  monsterLine.visible = false;
  hud.hideRoundOver();
  resetToTee();
  mode = 'menu';
  boosterMeshes.group.visible = false;
  hud.teeBalance(save.tees);
  hud.showMenu(true);
}

// The Driving Range is the free-play mode: swing as often as you like.
function startDrivingRange() {
  mode = 'ready';
  boosterMeshes.group.visible = true;
  hud.resetLabel('Reset');
  hud.showMenu(false);
}

function startLongDrive() {
  round = new LongDriveRound();
  resetToTee();
  boosterMeshes.group.visible = true;
  monsterLine.visible = true;
  hud.resetLabel('Skip');
  hud.hideRoundOver();
  hud.showMenu(false);
}

// Moves on from a finished shot: the next ball, or the end of the round.
function advance() {
  if (!round?.finished) {
    resetToTee();
    return;
  }
  mode = 'roundOver';
  const isNew = round.bestYards > save.bestRoundYards;
  save.bestRoundYards = Math.max(save.bestRoundYards, round.bestYards);
  save.mostMonsters = Math.max(save.mostMonsters, round.monsters);
  save.tees += round.tees;
  writeSave(save);
  hud.round(null);
  hud.hideResult();
  hud.showReset(false);
  hud.showRoundOver(round, { yards: save.bestRoundYards, isNew, teesTotal: save.tees });
}

hud.onPlayRange(startDrivingRange);
hud.onPlayLongDrive(startLongDrive);
hud.onPlayAgain(startLongDrive);
hud.onBackToMenu(openMenu);
hud.onRoundOverMenu(openMenu);

function cancelSwing(hint: string) {
  mode = 'ready';
  pressAt = null;
  samples = [];
  hud.showHint(hint);
}

canvas.addEventListener('pointerdown', (e) => {
  if (mode === 'result') {
    if (e.timeStamp - resultAt > 300) advance();
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

// The button or R key. On the Driving Range it brings the ball back. In a
// round every ball counts, so it plays the shot out instantly instead.
function resetShot() {
  if (mode === 'result') {
    advance();
  } else if (mode === 'flying' && !round) {
    resetToTee();
  } else if (mode === 'flying' && shot) {
    while (shot.ball.phase !== 'stopped') {
      stepBall(shot.ball, PHYSICS_DT, env);
      trail.add(shot.ball.pos);
    }
  }
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
      `curve ${signed(flick.curve * DEG)}° → tilt ${signed(swing.launch.spinTilt * DEG, 1)}° · ` +
      `wind ${(wind.speed * MPS_TO_MPH).toFixed(1)} mph at ${signed(wind.direction * DEG)}°`,
  );
}

function finishShot(s: NonNullable<typeof shot>) {
  mode = 'result';
  resultAt = performance.now();
  hud.liveDistance(null);
  const totalYards = horizontalDistance(TEE_SPOT, s.ball.pos) * METERS_TO_YARDS;
  // A ball in the water is lost, so it can't be the longest drive.
  const lost = s.ball.lie === 'water';
  if (!lost && totalYards > save.longestYards) {
    save.longestYards = totalYards;
    writeSave(save);
    hud.longestDrive(totalYards, true);
  }
  const scored = round?.record({ yards: totalYards, strike: s.strike, lost });
  hud.round(round, round?.scored.length); // still the ball just played
  hud.showResult({
    strike: s.strike,
    carryYards: (s.ball.carry ?? 0) * METERS_TO_YARDS,
    totalYards,
    ballMph: s.ballSpeed * MPS_TO_MPH,
    shape: shapeName(s.spinTilt),
    lie: s.ball.lie ? SURFACES[s.ball.lie].label : '—',
    boosts: s.ball.used.length,
    tees: scored?.tees,
    next: !round ? 'Tap to hit again' : round.finished ? 'Tap for results' : 'Tap for the next ball',
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
openMenu();

const teeScreen = new THREE.Vector3();
let lastFrame = performance.now();

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (mode === 'flying' && shot) {
    accumulator += dt;
    while (accumulator >= PHYSICS_DT && shot.ball.phase !== 'stopped') {
      stepBall(shot.ball, PHYSICS_DT, env);
      trail.add(shot.ball.pos);
      accumulator -= PHYSICS_DT;
    }
    // The ball is drawn scaled up in flight; lift it so it still sits on the grass.
    ball.position.copy(shot.ball.pos);
    ball.position.y += BALL_RADIUS * (FLIGHT_SCALE - 1);
    const yards = horizontalDistance(TEE_SPOT, shot.ball.pos) * METERS_TO_YARDS;
    hud.liveDistance(yards);
    if (round && !crossedMonsterLine && yards >= MONSTER_LINE_YARDS) {
      crossedMonsterLine = true;
      hud.monster();
    }
    while (boostsSeen < shot.ball.used.length) {
      const booster = shot.ball.used[boostsSeen++];
      boosterMeshes.markUsed(booster);
      hud.boost(booster.kind);
    }
    // A ball in the water is gone.
    ball.visible = shot.ball.lie !== 'water';
    if (shot.ball.phase === 'stopped') finishShot(shot);
  }

  if (mode === 'flying' || mode === 'result') rig.follow(ball.position, dt);

  sun.target.position.copy(ball.position);
  sun.position.copy(ball.position).add(SUN_OFFSET);
  boosterMeshes.animate(now);
  flag.rotation.y = flagYaw + Math.sin(now / (wind.speed > 3 ? 180 : 500)) * 0.15;
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
