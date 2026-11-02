import * as THREE from 'three';
import type { Booster } from '../physics/boosters';

// Placeholder shapes for the boosters. A used booster goes dim.

const RING_COLOR = 0xffc53d;
const PAD_COLOR = 0xff3d9a;
const USED_OPACITY = 0.25;

export class BoosterMeshes {
  readonly group = new THREE.Group();
  private meshes = new Map<Booster, THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>();

  /** Swaps in a new layout. */
  setLayout(boosters: Booster[]): void {
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.group.clear();
    this.meshes.clear();
    for (const b of boosters) {
      const mesh = b.kind === 'ring' ? ringMesh(b.radius) : padMesh(b.width, b.depth);
      if (b.kind === 'ring') mesh.position.set(b.x, b.y, b.z);
      else mesh.position.set(0, 0.12, b.z);
      this.meshes.set(b, mesh);
      this.group.add(mesh);
    }
  }

  markUsed(b: Booster): void {
    this.meshes.get(b)!.material.opacity = USED_OPACITY;
  }

  /** Gentle pulse on the pads so they read as live. */
  animate(nowMs: number): void {
    const scale = 1 + Math.sin(nowMs / 300) * 0.06;
    for (const [b, mesh] of this.meshes) {
      if (b.kind === 'pad') mesh.scale.z = scale;
    }
  }
}

function ringMesh(radius: number) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.35, 12, 48),
    new THREE.MeshBasicMaterial({ color: RING_COLOR, transparent: true }),
  );
}

function padMesh(width: number, depth: number) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.2, depth),
    new THREE.MeshBasicMaterial({ color: PAD_COLOR, transparent: true }),
  );
}
