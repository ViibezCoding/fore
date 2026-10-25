import * as THREE from 'three';

// Tee view while lining up, then a chase camera that trails the ball.

const TEE_POSITION = new THREE.Vector3(0, 1.1, -2.6);
const TEE_LOOK = new THREE.Vector3(0, 0, 8);

const CHASE_BACK = 7; // meters behind the ball
const CHASE_UP = 2.4;
const CHASE_FOLLOW = 3.5; // higher catches up faster
const LOOK_FOLLOW = 12;

export class CameraRig {
  private look = TEE_LOOK.clone();
  private desired = new THREE.Vector3();
  private chaseDir = new THREE.Vector3(0, 0, 1);

  constructor(readonly camera: THREE.PerspectiveCamera) {
    this.toTee();
  }

  toTee(): void {
    this.camera.position.copy(TEE_POSITION);
    this.look.copy(TEE_LOOK);
    this.camera.lookAt(this.look);
  }

  /** Chase along this horizontal direction (the shot's start line). */
  startChase(direction: THREE.Vector3): void {
    this.chaseDir.set(direction.x, 0, direction.z).normalize();
  }

  follow(target: THREE.Vector3, dt: number): void {
    this.desired.copy(target).addScaledVector(this.chaseDir, -CHASE_BACK);
    this.desired.y = target.y + CHASE_UP;
    this.camera.position.lerp(this.desired, 1 - Math.exp(-CHASE_FOLLOW * dt));
    this.look.lerp(target, 1 - Math.exp(-LOOK_FOLLOW * dt));
    this.camera.lookAt(this.look);
  }
}
