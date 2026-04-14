import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const container = document.getElementById('three-container');
const stageLabel = document.getElementById('egg-stage-label');
const progressFill = document.getElementById('egg-progress-fill');
const eggSection = document.getElementById('egg');

// ─── SCENE ────────────────────────────────────────────────────
const W = container.clientWidth || window.innerWidth;
const H = container.clientHeight || window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
camera.position.set(0, 0, 5);

// ─── LIGHTS ───────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(3, 4, 3);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8888ff, 0.4);
rimLight.position.set(-3, -1, -2);
scene.add(rimLight);

// Inner glow point light (monster energy)
const innerGlow = new THREE.PointLight(0xff3300, 0, 3);
innerGlow.position.set(0, 0, 0);
scene.add(innerGlow);

// ─── EGG GEOMETRY ─────────────────────────────────────────────
function makeEggGeometry(rX, rY, rZ, segs = 64) {
  const geo = new THREE.SphereGeometry(1, segs, segs);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // pointy top, round bottom
    const t = (y + 1) / 2; // 0=bottom, 1=top
    const scaleX = rX * (1 - 0.18 * t);
    const scaleZ = rZ * (1 - 0.18 * t);
    const scaleY = rY;
    pos.setXYZ(i, pos.getX(i) * scaleX, y * scaleY, pos.getZ(i) * scaleZ);
  }
  geo.computeVertexNormals();
  return geo;
}

const eggGeo = makeEggGeometry(1, 1.35, 1, 64);

// Shell material — smooth white/grey ceramic
const shellMat = new THREE.MeshStandardMaterial({
  color: 0xdddddd,
  roughness: 0.35,
  metalness: 0.05,
  side: THREE.FrontSide,
});

// ─── EGG PIECES ───────────────────────────────────────────────
// We split the egg into TOP cap and BOTTOM base via clipping planes
const clipUp   = new THREE.Plane(new THREE.Vector3(0, -1, 0),  0.15); // keeps top
const clipDown = new THREE.Plane(new THREE.Vector3(0,  1, 0), -0.15); // keeps bottom

const shellTop = new THREE.Mesh(eggGeo, new THREE.MeshStandardMaterial({
  color: 0xdddddd, roughness: 0.35, metalness: 0.05,
  clippingPlanes: [clipDown],
  side: THREE.FrontSide,
}));

const shellBottom = new THREE.Mesh(eggGeo, new THREE.MeshStandardMaterial({
  color: 0xd0d0d0, roughness: 0.4, metalness: 0.05,
  clippingPlanes: [clipUp],
  side: THREE.FrontSide,
}));

renderer.localClippingEnabled = true;

const eggGroup = new THREE.Group();
eggGroup.add(shellTop);
eggGroup.add(shellBottom);
scene.add(eggGroup);

// ─── CRACKS (lines on egg surface) ────────────────────────────
const crackGroup = new THREE.Group();
eggGroup.add(crackGroup);

function makeCrackLine(points3D, color = 0x111111) {
  const geo = new THREE.BufferGeometry().setFromPoints(points3D.map(p => new THREE.Vector3(...p)));
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 1, transparent: true, opacity: 0 });
  return new THREE.Line(geo, mat);
}

// Crack paths on egg surface (spherical coords mapped)
const cracks = [
  makeCrackLine([[0.05,1.28,0.55],[0.02,0.95,0.72],[-0.08,0.6,0.78]]),
  makeCrackLine([[-0.1,1.1,-0.5],[0.0,0.8,-0.75],[0.12,0.45,-0.7]]),
  makeCrackLine([[0.05,1.28,0.55],[-0.1,1.1,-0.5],[0.0,0.9,-0.1]]),
  makeCrackLine([[-0.08,0.6,0.78],[-0.2,0.3,0.6],[-0.15,0.05,0.8]]),
  makeCrackLine([[0.12,0.45,-0.7],[0.25,0.15,-0.55],[0.18,-0.1,-0.72]]),
];
cracks.forEach(c => crackGroup.add(c));

// ─── MONSTER ──────────────────────────────────────────────────
const monsterGroup = new THREE.Group();
monsterGroup.visible = false;
scene.add(monsterGroup);

// Body
const bodyGeo = new THREE.SphereGeometry(0.55, 32, 32);
const monsterMat = new THREE.MeshStandardMaterial({
  color: 0x1a0a00,
  roughness: 0.8,
  metalness: 0.1,
  emissive: 0xff2200,
  emissiveIntensity: 0,
});
const body = new THREE.Mesh(bodyGeo, monsterMat);
body.position.y = -0.1;
monsterGroup.add(body);

// Head
const headGeo = new THREE.SphereGeometry(0.35, 32, 32);
const head = new THREE.Mesh(headGeo, monsterMat);
head.position.set(0, 0.7, 0);
monsterGroup.add(head);

// Eyes
function makeEye(x) {
  const eyeGeo = new THREE.SphereGeometry(0.07, 16, 16);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff2200,
    emissive: 0xff2200,
    emissiveIntensity: 2,
    roughness: 0.1,
  });
  const eye = new THREE.Mesh(eyeGeo, eyeMat);
  eye.position.set(x, 0.78, 0.28);
  return eye;
}
monsterGroup.add(makeEye(-0.12));
monsterGroup.add(makeEye(0.12));

// Horns
function makeHorn(x, rotZ) {
  const hornGeo = new THREE.ConeGeometry(0.06, 0.35, 8);
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x330000, roughness: 0.6 });
  const horn = new THREE.Mesh(hornGeo, hornMat);
  horn.position.set(x, 1.1, 0);
  horn.rotation.z = rotZ;
  return horn;
}
monsterGroup.add(makeHorn(-0.18, 0.35));
monsterGroup.add(makeHorn(0.18, -0.35));

// Claws / arms
function makeClaw(x, rotZ) {
  const g = new THREE.Group();
  const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 0.8 });
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.rotation.z = rotZ;
  g.add(arm);
  // 3 claws
  [-0.06, 0, 0.06].forEach((offset, i) => {
    const clawGeo = new THREE.ConeGeometry(0.025, 0.18, 6);
    const claw = new THREE.Mesh(clawGeo, new THREE.MeshStandardMaterial({ color: 0x440000, roughness: 0.5 }));
    claw.position.set(offset + x * 0.35, -0.28, 0.05);
    claw.rotation.z = (i - 1) * 0.25;
    g.add(claw);
  });
  g.position.set(x * 0.9, 0.05, 0);
  return g;
}
monsterGroup.add(makeClaw(-0.7, 0.7));
monsterGroup.add(makeClaw(0.7, -0.7));

// Tail
const tailCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, -0.5, 0),
  new THREE.Vector3(-0.3, -0.8, 0.2),
  new THREE.Vector3(-0.6, -0.9, 0),
  new THREE.Vector3(-0.8, -0.6, -0.2),
  new THREE.Vector3(-0.7, -0.3, 0),
]);
const tailGeo = new THREE.TubeGeometry(tailCurve, 20, 0.04, 8, false);
const tail = new THREE.Mesh(tailGeo, monsterMat);
monsterGroup.add(tail);

monsterGroup.scale.setScalar(0);

// ─── SCROLL STATE ─────────────────────────────────────────────
const STAGES = [
  'Dormant',
  'Awakening',
  'Stirring',
  'Breaking',
  'Born'
];

let scrollT = 0;
let targetT = 0;

function onScroll() {
  const rect = eggSection.getBoundingClientRect();
  const sectionH = eggSection.offsetHeight - window.innerHeight;
  const scrolled = -rect.top;
  targetT = Math.max(0, Math.min(1, scrolled / sectionH));
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ─── ANIMATE ──────────────────────────────────────────────────
const clock = new THREE.Clock();

function lerp(a, b, t) { return a + (b - a) * t; }

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  // Smooth scroll
  scrollT += (targetT - scrollT) * 0.08;
  const t = scrollT;

  // Stage label
  const si = Math.min(4, Math.floor(t * 5));
  stageLabel.textContent = STAGES[si];
  progressFill.style.width = (t * 100) + '%';

  // ── Phase 0→0.2 : idle wobble ──
  eggGroup.rotation.y = elapsed * 0.4;
  eggGroup.rotation.z = Math.sin(elapsed * 1.2) * 0.04;
  eggGroup.position.y = Math.sin(elapsed * 0.8) * 0.04;

  // ── Phase 0→0.5 : cracks appear ──
  cracks.forEach((c, i) => {
    const crackStart = i * 0.08;
    const crackT = Math.max(0, Math.min(1, (t - crackStart) / 0.15));
    c.material.opacity = crackT;
  });

  // ── Phase 0.3+ : inner glow grows ──
  innerGlow.intensity = Math.max(0, (t - 0.3) / 0.7) * 4;
  innerGlow.color.setHSL(0.03 - t * 0.03, 1, 0.5);

  // Shell emissive from glow
  const glowEmissive = Math.max(0, (t - 0.4) / 0.6);
  shellTop.material.emissive = new THREE.Color(0xff2200);
  shellTop.material.emissiveIntensity = glowEmissive * 0.3;
  shellBottom.material.emissive = new THREE.Color(0xff2200);
  shellBottom.material.emissiveIntensity = glowEmissive * 0.15;

  // ── Phase 0.6→1 : shell opens ──
  const hatchT = Math.max(0, (t - 0.6) / 0.4);
  shellTop.position.y    = hatchT * 2.2;
  shellTop.rotation.z    = hatchT * 0.6;
  shellBottom.position.y = -hatchT * 0.5;

  // Wobble intensifies before hatch
  const wobbleAmt = t < 0.6 ? Math.max(0, (t - 0.25) / 0.35) : 0;
  eggGroup.rotation.z = Math.sin(elapsed * (3 + wobbleAmt * 8)) * (0.04 + wobbleAmt * 0.12);

  // ── Phase 0.6→1 : monster appears ──
  if (t > 0.6) {
    monsterGroup.visible = true;
    const monsterT = Math.min(1, (t - 0.6) / 0.4);
    monsterGroup.scale.setScalar(monsterT);
    monsterGroup.position.y = -0.8 + monsterT * 0.5;
    monsterGroup.rotation.y = elapsed * 0.6;

    // Monster breathing
    const breathe = 1 + Math.sin(elapsed * 2) * 0.03 * monsterT;
    body.scale.setScalar(breathe);

    // Eye glow pulse
    monsterGroup.children.forEach(c => {
      if (c.material && c.material.emissive) {
        c.material.emissiveIntensity = monsterT * (1.5 + Math.sin(elapsed * 3) * 0.5);
      }
    });

    monsterMat.emissiveIntensity = monsterT * 0.15;
  } else {
    monsterGroup.visible = false;
  }

  renderer.render(scene, camera);
});

// ─── RESIZE ───────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
