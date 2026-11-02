import * as THREE from 'three';
import { METERS_TO_YARDS } from '../physics/ballFlight';
import { PIN, RANGE_LAYOUT, type SurfaceKind } from '../physics/surfaces';

// The driving range: ground, a fairway strip, a pin and yardage boards.
// Units are meters; +Z points down the range, away from the golfer.

export const SKY = 0x7ec8f0;
export const TEE_HEIGHT = 0.03;

const SURFACE_COLORS: Record<SurfaceKind, number> = {
  fairway: 0x5fb04f,
  rough: 0x3f8a3a,
  green: 0x7ccc63,
  sand: 0xe6d49a,
  water: 0x3d8fd1,
};

export interface Range {
  scene: THREE.Scene;
  /** Pivot at the top of the pole; the flag streams along its +X. */
  flag: THREE.Object3D;
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

  // Ground: rough everywhere, with the layout drawn on top
  const rough = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    groundMaterial(SURFACE_COLORS.rough),
  );
  rough.rotation.x = -Math.PI / 2;
  rough.receiveShadow = true;
  rough.renderOrder = -100;
  scene.add(rough);

  // Fairway, green, bunkers and water, from the same layout the physics reads.
  // A depth test can't separate layers this thin and this far apart, so they
  // paint in order, before everything else, and stay out of the depth buffer.
  RANGE_LAYOUT.forEach((patch, i) => {
    const geometry =
      patch.shape === 'rect'
        ? new THREE.PlaneGeometry(patch.width, patch.length)
        : new THREE.CircleGeometry(1, 48).scale(patch.rx, patch.rz, 1);
    const mesh = new THREE.Mesh(geometry, groundMaterial(SURFACE_COLORS[patch.kind]));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(patch.x, 0, patch.z);
    mesh.receiveShadow = true;
    mesh.renderOrder = -99 + i;
    scene.add(mesh);
  });

  const tee = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.002, TEE_HEIGHT),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
  );
  tee.position.y = TEE_HEIGHT / 2;
  scene.add(tee);

  // Pin, with the flag on a pivot at the top so it can swing with the wind
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 6),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
  );
  pole.position.set(PIN.x, 3, PIN.z);
  scene.add(pole);

  const flag = new THREE.Object3D();
  flag.position.set(PIN.x, 5.3, PIN.z);
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1.3),
    new THREE.MeshLambertMaterial({ color: 0xe8443a, side: THREE.DoubleSide }),
  );
  cloth.position.x = 1; // hangs off the pole along the pivot's +X
  flag.add(cloth);
  scene.add(flag);

  // Yardage: a white line across the fairway and a board on each side
  for (let yards = 50; yards <= 1500; yards += 50) {
    const z = yards / METERS_TO_YARDS;
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }),
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.02, z);
    scene.add(line);

    const board = yardageBoard(yards);
    for (const x of [-54, 54]) {
      const b = board.clone();
      b.position.set(x, 2.5, z);
      scene.add(b);
    }
  }

  return { scene, flag, sun };
}

function groundMaterial(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, depthWrite: false });
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
