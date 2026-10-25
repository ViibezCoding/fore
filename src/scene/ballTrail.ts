import * as THREE from 'three';

// A line traced behind the ball so you can read the shot's shape.

const MAX_POINTS = 6000; // 50 s of flight at 120 Hz

export class BallTrail {
  readonly line: THREE.Line;
  private positions = new Float32Array(MAX_POINTS * 3);
  private count = 0;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setDrawRange(0, 0);
    this.line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xfff6c2 }));
    this.line.frustumCulled = false;
  }

  clear(): void {
    this.count = 0;
    this.line.geometry.setDrawRange(0, 0);
  }

  add(p: THREE.Vector3): void {
    if (this.count >= MAX_POINTS) return;
    this.positions.set([p.x, p.y, p.z], this.count * 3);
    this.count++;
    const attr = this.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
    this.line.geometry.setDrawRange(0, this.count);
  }
}
