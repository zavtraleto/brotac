import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const GRID = 10;
const TILE = 1;

const app = document.getElementById('app')!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1116);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(9, 11, 9);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.42;
controls.minDistance = 6;
controls.maxDistance = 30;

scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1d24, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(6, 12, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
scene.add(sun);

// Board: one mesh per tile so raycasting gives us the tile directly.
const tileGeo = new THREE.BoxGeometry(TILE * 0.96, 0.2, TILE * 0.96);
const tiles: THREE.Mesh[] = [];
const baseColor = (x: number, z: number) => ((x + z) % 2 === 0 ? 0x2a313c : 0x313945);

const toWorld = (x: number, z: number) =>
  new THREE.Vector3((x - (GRID - 1) / 2) * TILE, 0, (z - (GRID - 1) / 2) * TILE);

for (let x = 0; x < GRID; x++) {
  for (let z = 0; z < GRID; z++) {
    const mesh = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: baseColor(x, z) }));
    mesh.position.copy(toWorld(x, z)).setY(-0.1);
    mesh.receiveShadow = true;
    mesh.userData = { x, z };
    scene.add(mesh);
    tiles.push(mesh);
  }
}

// A single unit to prove input → board → movement works.
const unit = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.25, 0.5, 4, 12),
  new THREE.MeshStandardMaterial({ color: 0x4fa3ff }),
);
unit.castShadow = true;
const unitCell = { x: 2, z: 2 };
const unitTarget = toWorld(unitCell.x, unitCell.z).setY(0.5);
unit.position.copy(unitTarget);
scene.add(unit);

// Hover + click-to-move.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered: THREE.Mesh | null = null;
let downAt = { x: 0, y: 0 };

function pick(e: PointerEvent): THREE.Mesh | null {
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return (raycaster.intersectObjects(tiles, false)[0]?.object as THREE.Mesh) ?? null;
}

function setHover(tile: THREE.Mesh | null) {
  if (hovered === tile) return;
  if (hovered) {
    const { x, z } = hovered.userData;
    (hovered.material as THREE.MeshStandardMaterial).color.setHex(baseColor(x, z));
  }
  hovered = tile;
  if (hovered) (hovered.material as THREE.MeshStandardMaterial).color.setHex(0x55708f);
}

renderer.domElement.addEventListener('pointermove', (e) => setHover(pick(e)));
renderer.domElement.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY }));
renderer.domElement.addEventListener('pointerup', (e) => {
  // Ignore drags (camera orbit).
  if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
  const tile = pick(e);
  if (!tile) return;
  unitCell.x = tile.userData.x;
  unitCell.z = tile.userData.z;
  unitTarget.copy(toWorld(unitCell.x, unitCell.z)).setY(0.5);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  unit.position.lerp(unitTarget, 1 - Math.exp(-12 * dt));
  controls.update();
  renderer.render(scene, camera);
});
