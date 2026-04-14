import * as THREE from 'three';

// Attendre que le site soit visible avant d'init
function waitForVisible(el, cb) {
  if (el.offsetHeight > 0) { cb(); return; }
  const obs = new MutationObserver(() => {
    if (el.offsetHeight > 0) { obs.disconnect(); cb(); }
  });
  obs.observe(el, { attributes: true, attributeFilter: ['class'] });
}

const siteEl = document.getElementById('site');
waitForVisible(siteEl, initEgg);

function initEgg() {

  const container   = document.getElementById('three-container');
  const stageLabel  = document.getElementById('egg-stage-label');
  const progressFill = document.getElementById('egg-progress-fill');
  const eggSection  = document.getElementById('egg');

  const STAGES = ['Dormant', 'Awakening', 'Stirring', 'Breaking', 'Born'];

  // ─── RENDERER ───────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 5;

  function resize() {
    const w = container.clientWidth  || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ─── LIGHTS ─────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 4, 3);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x6699ff, 0.5);
  rim.position.set(-3, -1, -2);
  scene.add(rim);

  const glow = new THREE.PointLight(0xff3300, 0, 4);
  scene.add(glow);

  // ─── EGG ────────────────────────────────────────────────────
  function eggGeo(segs = 48) {
    const g = new THREE.SphereGeometry(1, segs, segs);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y  = p.getY(i);
      const t  = (y + 1) / 2;
      const sx = 1 - 0.2 * t;
      p.setXYZ(i, p.getX(i) * sx, y * 1.35, p.getZ(i) * sx);
    }
    g.computeVertexNormals();
    return g;
  }

  const geo = eggGeo();

  const clipKeepBottom = new THREE.Plane(new THREE.Vector3(0, -1, 0),  0.2);
  const clipKeepTop    = new THREE.Plane(new THREE.Vector3(0,  1, 0), -0.2);

  const matTop = new THREE.MeshStandardMaterial({
    color: 0xe0e0e0, roughness: 0.3, metalness: 0.0,
    clippingPlanes: [clipKeepBottom],
    emissive: 0xff2200, emissiveIntensity: 0,
  });
  const matBot = new THREE.MeshStandardMaterial({
    color: 0xcccccc, roughness: 0.4, metalness: 0.0,
    clippingPlanes: [clipKeepTop],
    emissive: 0xff2200, emissiveIntensity: 0,
  });

  const shellTop = new THREE.Mesh(geo, matTop);
  const shellBot = new THREE.Mesh(geo, matBot);

  const eggGroup = new THREE.Group();
  eggGroup.add(shellTop, shellBot);
  scene.add(eggGroup);

  // ─── CRACKS ─────────────────────────────────────────────────
  const crackDefs = [
    [[0, 1.2, 0.5],  [0.1, 0.9, 0.7],  [-0.1, 0.55, 0.75]],
    [[0, 1.2, 0.5],  [-0.15, 1.0, -0.45], [0, 0.75, -0.7]],
    [[-0.1, 0.55, 0.75], [-0.25, 0.2, 0.6],  [-0.2, -0.1, 0.75]],
    [[0, 0.75, -0.7], [0.2, 0.4, -0.6], [0.15, 0.05, -0.75]],
    [[-0.15, 1.0, -0.45], [0, 0.85, 0], [0.1, 0.9, 0.7]],
  ];

  const crackLines = crackDefs.map(pts => {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
    const m = new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0 });
    const l = new THREE.Line(g, m);
    eggGroup.add(l);
    return l;
  });

  // ─── MONSTER ────────────────────────────────────────────────
  const monsterGroup = new THREE.Group();
  scene.add(monsterGroup);

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x110500, roughness: 0.85,
    emissive: 0xff2200, emissiveIntensity: 0,
  });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 32), darkMat.clone());
  body.position.y = -0.15;
  monsterGroup.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 32), darkMat.clone());
  head.position.y = 0.68;
  monsterGroup.add(head);

  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3, roughness: 0,
  });
  [-0.13, 0.13].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), eyeMat);
    eye.position.set(x, 0.76, 0.27);
    monsterGroup.add(eye);
  });

  // Horns
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x2a0000, roughness: 0.6 });
  [[-0.16, 0.4], [0.16, -0.4]].forEach(([x, rz]) => {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.32, 8), hornMat);
    h.position.set(x, 1.08, 0.05);
    h.rotation.z = rz;
    monsterGroup.add(h);
  });

  // Arms + claws
  [[-1, 0.65], [1, -0.65]].forEach(([side, rz]) => {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 0.45, 8),
      darkMat.clone()
    );
    arm.position.set(side * 0.75, 0.05, 0);
    arm.rotation.z = rz;
    monsterGroup.add(arm);
    [-0.07, 0, 0.07].forEach((off, i) => {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.17, 6), hornMat);
      claw.position.set(side * 1.0 + off, -0.2, 0.05);
      claw.rotation.z = (i - 1) * 0.3 + rz * 0.4;
      monsterGroup.add(claw);
    });
  });

  // Tail
  const tailGeo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, -0.55, 0),
      new THREE.Vector3(-0.35, -0.85, 0.2),
      new THREE.Vector3(-0.65, -0.85, 0),
      new THREE.Vector3(-0.8, -0.5, -0.1),
    ]),
    20, 0.04, 8, false
  );
  monsterGroup.add(new THREE.Mesh(tailGeo, darkMat.clone()));

  monsterGroup.scale.setScalar(0);

  // ─── SCROLL ─────────────────────────────────────────────────
  let targetT = 0, scrollT = 0;

  function onScroll() {
    const rect     = eggSection.getBoundingClientRect();
    const sectionH = eggSection.offsetHeight - window.innerHeight;
    if (sectionH <= 0) return;
    targetT = Math.max(0, Math.min(1, -rect.top / sectionH));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── LOOP ───────────────────────────────────────────────────
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const e = clock.getElapsedTime();
    scrollT += (targetT - scrollT) * 0.1;
    const t = scrollT;

    // Label + progress
    stageLabel.textContent = STAGES[Math.min(4, Math.floor(t * 5))];
    progressFill.style.width = (t * 100) + '%';

    // Idle rotation
    eggGroup.rotation.y = e * 0.5;

    // Wobble : monte en t=0.25→0.6, s'arrête à l'éclosion
    const wobble = t < 0.6 ? Math.max(0, (t - 0.2) / 0.4) : 0;
    eggGroup.rotation.z = Math.sin(e * (2 + wobble * 10)) * (0.03 + wobble * 0.14);
    eggGroup.position.y = Math.sin(e * 0.9) * 0.04;

    // Cracks
    crackLines.forEach((l, i) => {
      l.material.opacity = Math.max(0, Math.min(1, (t - i * 0.08) / 0.12));
    });

    // Glow intérieur
    glow.intensity = Math.max(0, (t - 0.25) / 0.75) * 5;

    // Shell emissive
    const em = Math.max(0, (t - 0.35) / 0.65);
    matTop.emissiveIntensity = em * 0.35;
    matBot.emissiveIntensity = em * 0.2;

    // Éclosion : top s'envole, bottom descend
    const hatch = Math.max(0, (t - 0.6) / 0.4);
    shellTop.position.y = hatch * 2.4;
    shellTop.rotation.z = hatch * 0.7;
    shellBot.position.y = -hatch * 0.6;

    // Monstre
    const mt = Math.max(0, (t - 0.62) / 0.38);
    monsterGroup.scale.setScalar(mt);
    monsterGroup.position.y = -0.9 + mt * 0.6;
    monsterGroup.rotation.y = e * 0.7;

    if (mt > 0) {
      monsterGroup.children.forEach(c => {
        if (c.isMesh && c.material.emissive) {
          c.material.emissiveIntensity = mt * (0.1 + Math.sin(e * 2.5) * 0.05);
        }
      });
      eyeMat.emissiveIntensity = mt * (2.5 + Math.sin(e * 4) * 0.8);
    }

    renderer.render(scene, camera);
  });
}
