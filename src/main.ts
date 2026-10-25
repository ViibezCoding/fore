import * as THREE from 'three';

// Phase 0 placeholder: a driving range seen from behind the tee.
// Units are meters; +Z points down the range, away from the golfer.

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const SKY = 0x7ec8f0;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 120, 420);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);

// Lighting
scene.add(new THREE.HemisphereLight(0xdff3ff, 0x4a7a3a, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(-20, 40, -10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5;
sun.shadow.camera.bottom = -5;
scene.add(sun);

// Ground: rough everywhere, a lighter fairway strip down the middle
const rough = new THREE.Mesh(
  new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshLambertMaterial({ color: 0x3f8a3a }),
);
rough.rotation.x = -Math.PI / 2;
rough.receiveShadow = true;
scene.add(rough);

const fairway = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 600),
  new THREE.MeshLambertMaterial({ color: 0x5fb04f }),
);
fairway.rotation.x = -Math.PI / 2;
fairway.position.set(0, 0.01, 300);
fairway.receiveShadow = true;
scene.add(fairway);

// Ball on a tee
const BALL_RADIUS = 0.0214;
const TEE_HEIGHT = 0.03;

const tee = new THREE.Mesh(
  new THREE.CylinderGeometry(0.004, 0.002, TEE_HEIGHT),
  new THREE.MeshLambertMaterial({ color: 0xffffff }),
);
tee.position.y = TEE_HEIGHT / 2;
scene.add(tee);

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_RADIUS, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
);
ball.position.y = TEE_HEIGHT + BALL_RADIUS;
ball.castShadow = true;
scene.add(ball);

// Pin and flag downrange
const PIN_DISTANCE = 150;
const pole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.05, 0.05, 6),
  new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
);
pole.position.set(6, 3, PIN_DISTANCE);
scene.add(pole);

const flag = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 1.3),
  new THREE.MeshLambertMaterial({ color: 0xe8443a, side: THREE.DoubleSide }),
);
flag.position.set(7, 5.3, PIN_DISTANCE);
scene.add(flag);

const green = new THREE.Mesh(
  new THREE.CircleGeometry(14, 48),
  new THREE.MeshLambertMaterial({ color: 0x7ccc63 }),
);
green.rotation.x = -Math.PI / 2;
green.position.set(6, 0.02, PIN_DISTANCE);
scene.add(green);

function resize() {
  const { clientWidth: w, clientHeight: h } = canvas;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Gentle idle sway behind the ball, so it's obvious the scene is live
const target = new THREE.Vector3(0, 0.5, 30);
renderer.setAnimationLoop((timeMs) => {
  const t = timeMs / 1000;
  camera.position.set(Math.sin(t * 0.3) * 0.2, 0.7, -1.6);
  camera.lookAt(target);
  flag.rotation.y = Math.sin(t * 2) * 0.15;
  renderer.render(scene, camera);
});
