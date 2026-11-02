import * as THREE from 'three';
import { seededRandom } from '../core/random';
import { BALL_RADIUS } from '../physics/ballFlight';

// Set dressing around the tee: a hitting mat, a golf bag on its stand, a
// tipped-over bucket of range balls and a ball washer. They don't affect the ball.
// Remember the golfer's right is -X.

const BAG_SPOT = new THREE.Vector3(1.85, 0, 0.8); // left of the mat
const BUCKET_SPOT = new THREE.Vector3(-1, 0, 0.55); // right of the mat
const WASHER_SPOT = new THREE.Vector3(-2.75, 0, 1.1); // far right of the screen
const SPILLED_BALLS = 16;
const MAT_HEIGHT = 0.012;

export function buildRangeProps(): THREE.Group {
  const props = new THREE.Group();
  const mat = hittingMat();
  props.add(mat, golfBag(), spilledBucket(), ballWasher());
  props.traverse((o) => {
    if (o instanceof THREE.Mesh && o !== mat) o.castShadow = true;
  });
  return props;
}

function hittingMat(): THREE.Mesh {
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, MAT_HEIGHT, 1.5),
    new THREE.MeshLambertMaterial({ color: 0x2f7d45 }),
  );
  mat.position.set(0, MAT_HEIGHT / 2, 0);
  mat.receiveShadow = true;
  return mat;
}

/** A cylinder running between two points. */
function rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 10), material);
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/** A shape spun around Y from [radius, height] pairs. */
function lathe(profile: [number, number][], material: THREE.Material, segments = 32) {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.Mesh(new THREE.LatheGeometry(points, segments), material);
}

const BAG_LEAN = 0.3; // radians the bag tips downrange onto its legs
const BAG_RADIUS = 0.13;

function golfBag(): THREE.Group {
  const bag = new THREE.Group();
  bag.position.copy(BAG_SPOT);

  const nylon = new THREE.MeshStandardMaterial({ color: 0x18253f, roughness: 0.62, side: THREE.DoubleSide });
  const accent = new THREE.MeshStandardMaterial({ color: 0xc8322b, roughness: 0.55, side: THREE.DoubleSide });
  const white = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.6, side: THREE.DoubleSide });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.85, side: THREE.DoubleSide });
  const stitch = new THREE.MeshStandardMaterial({ color: 0x0c1322, roughness: 0.9 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.4, metalness: 0.4 });

  // Everything in this group is built standing up, then tipped.
  const body = new THREE.Group();
  body.rotation.x = BAG_LEAN;
  bag.add(body);

  // Shell, flaring out into the padded top cuff
  body.add(
    lathe(
      [
        [0, 0.04],
        [0.115, 0.04],
        [BAG_RADIUS, 0.09],
        [BAG_RADIUS - 0.003, 0.45],
        [BAG_RADIUS + 0.002, 0.7],
        [0.15, 0.78],
        [0.152, 0.84],
        [0.142, 0.862],
        [0, 0.862],
      ],
      nylon,
    ),
  );
  body.add(lathe([[0, 0], [0.11, 0], [0.122, 0.03], [0.127, 0.075]], rubber)); // rubber base
  body.add(lathe([[0.1515, 0.782], [0.1545, 0.84], [0.1445, 0.864]], accent)); // cuff trim
  body.add(lathe([[BAG_RADIUS + 0.0035, 0.62], [BAG_RADIUS + 0.0045, 0.66]], white)); // pinstripe
  body.add(lathe([[0, 0.864], [0.14, 0.864]], rubber)); // top divider

  // Panel seams down the shell
  for (let i = 0; i < 8; i++) {
    const angle = ((i + 0.5) / 8) * Math.PI * 2;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.5, 0.004), stitch);
    seam.position.set(Math.sin(angle) * (BAG_RADIUS + 0.001), 0.35, Math.cos(angle) * (BAG_RADIUS + 0.001));
    body.add(seam);
  }

  // Pockets, facing the tee
  const ballPocket = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), nylon);
  ballPocket.scale.set(0.095, 0.15, 0.05);
  ballPocket.position.set(0, 0.42, -BAG_RADIUS + 0.005);
  body.add(ballPocket);

  const pocketTrim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 32), accent);
  pocketTrim.scale.set(0.09, 0.145, 1);
  pocketTrim.position.set(0, 0.42, -BAG_RADIUS - 0.012);
  body.add(pocketTrim);

  const sidePocket = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), nylon);
  sidePocket.scale.set(0.04, 0.17, 0.075);
  sidePocket.position.set(-BAG_RADIUS + 0.005, 0.36, -0.03);
  body.add(sidePocket);

  const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.26, 0.006), rubber);
  zipper.position.set(-BAG_RADIUS - 0.033, 0.36, -0.03);
  body.add(zipper);

  // The logo tapers with the shell so the flare doesn't swallow it, and turns
  // toward the camera at the tee.
  const brand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1395, 0.1345, 0.06, 24, 1, true, Math.PI + 0.5 - 0.575, 1.15),
    new THREE.MeshStandardMaterial({ map: brandTexture(), transparent: true, roughness: 0.6 }),
  );
  brand.position.y = 0.69;
  body.add(brand);

  // Shoulder strap looping down the side, with a pad, and a carry handle
  const strapPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(BAG_RADIUS, 0.72, 0.03),
    new THREE.Vector3(BAG_RADIUS + 0.06, 0.6, 0.0),
    new THREE.Vector3(BAG_RADIUS + 0.075, 0.42, -0.03),
    new THREE.Vector3(BAG_RADIUS + 0.03, 0.24, -0.02),
    new THREE.Vector3(BAG_RADIUS - 0.005, 0.18, 0.02),
  ]);
  body.add(new THREE.Mesh(new THREE.TubeGeometry(strapPath, 32, 0.009, 8), rubber));
  const strapPad = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), rubber);
  strapPad.scale.set(0.022, 0.11, 0.04);
  strapPad.position.set(BAG_RADIUS + 0.072, 0.46, -0.025);
  strapPad.rotation.x = -0.15;
  body.add(strapPad);

  addClubs(body);

  // Stand: two legs from a crossbar on the bag, each ending in a rubber foot
  const toBag = (x: number, y: number, z: number) =>
    new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(1, 0, 0), BAG_LEAN);
  bag.add(rod(toBag(-0.11, 0.64, 0.09), toBag(0.11, 0.64, 0.09), 0.008, carbon));
  for (const side of [-1, 1]) {
    const hip = toBag(0.11 * side, 0.64, 0.09);
    const foot = new THREE.Vector3(0.27 * side, 0.02, 0.62);
    bag.add(rod(hip, foot, 0.0075, carbon));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.03, 12), rubber);
    pad.position.copy(foot);
    bag.add(pad);
    // Spreader bar from the leg back to the base
    bag.add(rod(hip.clone().lerp(foot, 0.5), toBag(0.05 * side, 0.12, BAG_RADIUS - 0.03), 0.004, carbon));
  }
  return bag;
}

/** Clubs sit grip-down, so the heads are what you see above the cuff. */
function addClubs(body: THREE.Group): void {
  const steel = new THREE.MeshStandardMaterial({ color: 0xd3d9df, metalness: 0.55, roughness: 0.28 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe4e8ec, metalness: 0.45, roughness: 0.22 });
  const ferrule = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5 });
  const cotton = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.DoubleSide });

  const TOP = 0.86;
  const irons = [
    { x: -0.1, z: -0.03, length: 0.2, yaw: 2.7 },
    { x: -0.055, z: -0.085, length: 0.215, yaw: 2.9 },
    { x: 0.0, z: -0.1, length: 0.23, yaw: 3.1 },
    { x: 0.055, z: -0.085, length: 0.245, yaw: 3.3 },
    { x: 0.1, z: -0.03, length: 0.26, yaw: 3.5 },
  ];
  for (const iron of irons) {
    const start = new THREE.Vector3(iron.x, TOP, iron.z);
    const end = start.clone().add(new THREE.Vector3(iron.x * 0.35, iron.length, iron.z * 0.2));
    body.add(rod(start, end, 0.0055, steel));

    const head = new THREE.Mesh(ironHeadGeometry(), chrome);
    head.position.copy(end);
    head.rotation.y = iron.yaw;
    head.rotation.z = 0.12; // loft
    body.add(head);

    body.add(rod(end.clone().setY(end.y - 0.07), end.clone().setY(end.y - 0.045), 0.0075, ferrule));
  }

  const woods = [
    { x: -0.07, z: 0.05, length: 0.34, color: 0x18253f, stripe: 0xe9ecef },
    { x: 0.0, z: 0.08, length: 0.39, color: 0xc8322b, stripe: 0xe9ecef },
    { x: 0.075, z: 0.05, length: 0.31, color: 0xe9ecef, stripe: 0x18253f },
  ];
  for (const wood of woods) {
    const start = new THREE.Vector3(wood.x, TOP, wood.z);
    const lean = new THREE.Vector3(wood.x * 0.8, 1, wood.z * 0.6).normalize();
    const end = start.clone().addScaledVector(lean, wood.length);
    body.add(rod(start, end.clone().addScaledVector(lean, -0.14), 0.0055, steel));

    // Head cover: a sleeve down the shaft swelling into the padded head
    const cover = new THREE.Group();
    cover.position.copy(end);
    cover.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lean);
    const shape = lathe(
      [
        [0.016, -0.17],
        [0.019, -0.13],
        [0.03, -0.08],
        [0.05, -0.04],
        [0.058, 0.0],
        [0.052, 0.035],
        [0.03, 0.058],
        [0, 0.066],
      ],
      cotton(wood.color),
      20,
    );
    shape.scale.z = 1.22;
    cover.add(shape);
    const stripe = lathe([[0.0245, -0.112], [0.03, -0.086]], cotton(wood.stripe), 20);
    stripe.scale.z = 1.22;
    cover.add(stripe);
    body.add(cover);
  }
}

/** An iron head seen upside down: sole on top, toe out to +X, hosel at the shaft. */
function ironHeadGeometry(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.007, -0.06);
  s.lineTo(-0.007, -0.002);
  s.quadraticCurveTo(0.03, 0.006, 0.072, 0.008); // sole
  s.quadraticCurveTo(0.086, 0.004, 0.082, -0.02); // toe
  s.quadraticCurveTo(0.074, -0.042, 0.06, -0.044); // top line
  s.lineTo(0.016, -0.026);
  s.lineTo(0.007, -0.06);
  s.closePath();
  const head = new THREE.ExtrudeGeometry(s, {
    depth: 0.008,
    bevelEnabled: true,
    bevelSize: 0.002,
    bevelThickness: 0.002,
    bevelSegments: 2,
  });
  head.translate(0, 0, -0.004);
  return head;
}

function brandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 900 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FORE!', 128, 52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One tile of black basket weave: strands passing over and under each other. */
function weaveTextures(): { color: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const SIZE = 128;
  const CELL = SIZE / 2;
  const STRANDS = 3;
  const WIDTH = CELL / STRANDS;

  // Strands run across in one cell and up in the next, so each passes over then under.
  const paintCell = (ctx: CanvasRenderingContext2D, across: boolean, x: number, y: number, shade: (t: number) => string) => {
    for (let i = 0; i < STRANDS; i++) {
      const offset = i * WIDTH + 1.5;
      const span = WIDTH - 3;
      const gradient = across
        ? ctx.createLinearGradient(0, y + offset, 0, y + offset + span)
        : ctx.createLinearGradient(x + offset, 0, x + offset + span, 0);
      gradient.addColorStop(0, shade(0.25));
      gradient.addColorStop(0.5, shade(1));
      gradient.addColorStop(1, shade(0.25));
      ctx.fillStyle = gradient;
      if (across) ctx.fillRect(x + 1, y + offset, CELL - 2, span);
      else ctx.fillRect(x + offset, y + 1, span, CELL - 2);
    }
  };

  const tile = (shade: (over: boolean, t: number) => string) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const over = (row + col) % 2 === 0;
        paintCell(ctx, over, col * CELL, row * CELL, (t) => shade(over, t));
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  };

  const color = tile((_, t) => `rgb(${10 + t * 34} ${10 + t * 34} ${11 + t * 36})`);
  color.colorSpace = THREE.SRGBColorSpace;
  const bump = tile((over, t) => {
    const v = Math.round((over ? 255 : 170) * t);
    return `rgb(${v} ${v} ${v})`;
  });
  return { color, bump };
}

/** The classic course washer: a drum on a post, a plunger on top and a towel on the side. */
function ballWasher(): THREE.Group {
  const washer = new THREE.Group();
  washer.position.copy(WASHER_SPOT);
  washer.rotation.y = -0.6; // turned toward the tee

  const paint = new THREE.MeshStandardMaterial({ color: 0x1f5f3a, roughness: 0.42 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc9d0d6, metalness: 0.55, roughness: 0.3 });
  const towel = new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.95, side: THREE.DoubleSide });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xc8322b, roughness: 0.95, side: THREE.DoubleSide });

  const POST_TOP = 0.78;
  const DRUM_RADIUS = 0.115;
  const DRUM_WIDTH = 0.14;
  const DRUM_Y = POST_TOP + DRUM_RADIUS - 0.015;

  washer.add(lathe([[0, 0.03], [0.09, 0.03], [0.13, 0.008], [0.13, 0]], dark)); // base plate
  washer.add(rod(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, POST_TOP, 0), 0.028, paint));

  // Drum, its round face toward the tee, with a bolted rim on each side
  const front = new THREE.Vector3(0, DRUM_Y, -DRUM_WIDTH / 2);
  const back = new THREE.Vector3(0, DRUM_Y, DRUM_WIDTH / 2);
  washer.add(rod(front, back, DRUM_RADIUS, paint));
  for (const face of [front, back]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(DRUM_RADIUS, 0.008, 8, 32), steel);
    rim.position.copy(face);
    washer.add(rim);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.012, 16), steel);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, DRUM_Y, -DRUM_WIDTH / 2 - 0.005);
  washer.add(hub);

  // Plunger: the rod you pump, capped by a T handle
  const drumTop = DRUM_Y + DRUM_RADIUS;
  const handleY = drumTop + 0.13;
  washer.add(rod(new THREE.Vector3(0, drumTop - 0.01, 0), new THREE.Vector3(0, handleY, 0), 0.009, steel));
  washer.add(rod(new THREE.Vector3(-0.065, handleY, 0), new THREE.Vector3(0.065, handleY, 0), 0.014, dark));

  // Towel over a hook on the post, hanging in soft folds
  const hook = new THREE.Vector3(-0.03, POST_TOP - 0.1, -0.03);
  washer.add(rod(hook, hook.clone().add(new THREE.Vector3(-0.05, 0, 0)), 0.005, steel));
  const cloth = (height: number, top: number, material: THREE.Material) => {
    const geometry = new THREE.PlaneGeometry(0.13, height, 12, 1);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      positions.setZ(i, Math.sin(positions.getX(i) * 75) * 0.006);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-0.08, top - height / 2, -0.042);
    return mesh;
  };
  washer.add(cloth(0.3, hook.y + 0.01, towel));
  washer.add(cloth(0.022, hook.y - 0.215, stripe));
  washer.children.at(-1)!.position.z -= 0.002;
  return washer;
}

function spilledBucket(): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(BUCKET_SPOT);
  group.rotation.y = Math.PI; // built spilling toward -X; turn it to face the tee

  const OPEN_RADIUS = 0.15;
  const CLOSED_RADIUS = 0.115;
  const LENGTH = 0.26;

  const { color, bump } = weaveTextures();
  color.repeat.set(16, 5);
  bump.repeat.set(16, 5);
  const woven = new THREE.MeshStandardMaterial({
    map: color,
    bumpMap: bump,
    bumpScale: 2.5,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x101113, roughness: 0.42, side: THREE.DoubleSide });

  // On its side with the open end toward the tee. The body's +Y points at -X.
  const bucket = new THREE.Group();
  bucket.rotation.z = Math.PI / 2 - 0.15;
  bucket.position.y = OPEN_RADIUS;
  bucket.add(new THREE.Mesh(new THREE.CylinderGeometry(OPEN_RADIUS, CLOSED_RADIUS, LENGTH, 36, 1, true), woven));

  const bottom = new THREE.Mesh(new THREE.CircleGeometry(CLOSED_RADIUS, 36), plastic);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -LENGTH / 2;
  bucket.add(bottom);

  // Solid plastic bands hold the weave at each end
  for (const [radius, y] of [
    [OPEN_RADIUS, LENGTH / 2],
    [OPEN_RADIUS - 0.012, LENGTH * 0.25],
    [CLOSED_RADIUS, -LENGTH / 2],
  ]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.008, 8, 36), plastic);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    bucket.add(band);
  }

  // Wire handle flopped to one side
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(OPEN_RADIUS, 0.004, 6, 36, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.5, roughness: 0.4 }),
  );
  handle.rotation.y = 0.5;
  handle.position.y = LENGTH / 2 - 0.01;
  bucket.add(handle);
  group.add(bucket);

  // Balls trail out of the mouth and fan across the grass
  const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 14, 10);
  const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
  const random = seededRandom(11);
  for (let i = 0; i < SPILLED_BALLS; i++) {
    const t = i / (SPILLED_BALLS - 1);
    const spill = new THREE.Mesh(ballGeometry, ballMaterial);
    spill.position.set(-0.12 - t * t * 0.62, BALL_RADIUS + MAT_HEIGHT, (random() - 0.5) * (0.14 + t * 0.55));
    group.add(spill);
  }
  return group;
}
