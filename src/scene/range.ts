import * as THREE from 'three';
import { METERS_TO_YARDS } from '../physics/ballFlight';

// The driving range: ground, a fairway strip, a pin and yardage boards.
// Units are meters; +Z points down the range, away from the golfer.

export const SKY = 0x7ec8f0;
export const TEE_HEIGHT = 0.03;

export interface Range {
  scene: THREE.Scene;
  flag: THREE.Mesh;
  /** Casts the ball's shadow; keep it centered on the ball. */
  sun: THREE.DirectionalLight;
}

export const SUN_OFFSET = new THREE.Vector3(-20, 40, -10);

export function buildRange(): Range {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 150, 500);

  // Lighting
  scene.add(new THREE.HemisphereLight(0xdff3ff, 0x4a7a3a, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.copy(SUN_OFFSET);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 5;
  sun.shadow.camera.bottom = -5;
  scene.add(sun, sun.target);

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

  const tee = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.002, TEE_HEIGHT),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
  );
  tee.position.y = TEE_HEIGHT / 2;
  scene.add(tee);

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

  // Yardage: a white line across the fairway and a board on each side
  for (let yards = 50; yards <= 350; yards += 50) {
    const z = yards / METERS_TO_YARDS;
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }),
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.02, z);
    scene.add(line);

    const board = yardageBoard(yards);
    for (const x of [-24, 24]) {
      const b = board.clone();
      b.position.set(x, 2.5, z);
      scene.add(b);
    }
  }

  return { scene, flag, sun };
}

function yardageBoard(yards: number): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#2f6b2a';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(yards), 128, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  // Face back toward the tee
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 3),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  board.rotation.y = Math.PI;
  return board;
}
