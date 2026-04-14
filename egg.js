import * as THREE from 'three';

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

  const container    = document.getElementById('three-container');
  const stageLabel   = document.getElementById('egg-stage-label');
  const progressFill = document.getElementById('egg-progress-fill');
  const eggSection   = document.getElementById('egg');

  const STAGES = ['Dormant', 'Awakening', 'Stirring', 'Breaking', 'Born'];

  // ─── RENDERER ─────────────────────────────────────────────
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

  // ─── LIGHTS ───────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6699ff, 0.5);
  rim.position.set(-3, -1, -2);
  scene.add(rim);
  const innerGlow = new THREE.PointLight(0xff3300, 0, 4);
  scene.add(innerGlow);

  // ─── EGG ─────────────────────────────────────────────────────
  function buildEggGeo(segs = 48) {
    const g = new THREE.SphereGeometry(1, segs, segs);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const sx = 1 - 0.2 * ((y + 1) / 2);
      p.setXYZ(i, p.getX(i) * sx, y * 1.35, p.getZ(i) * sx);
    }
    g.computeVertexNormals();
    return g;
  }

  const geo = buildEggGeo();
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
    [[0,1.2,0.5],[0.1,0.9,0.7],[-0.1,0.55,0.75]],
    [[0,1.2,0.5],[-0.15,1.0,-0.45],[0,0.75,-0.7]],
    [[-0.1,0.55,0.75],[-0.25,0.2,0.6],[-0.2,-0.1,0.75]],
    [[0,0.75,-0.7],[0.2,0.4,-0.6],[0.15,0.05,-0.75]],
    [[-0.15,1.0,-0.45],[0,0.85,0],[0.1,0.9,0.7]],
    // Extra cracks pour les coups de marteau
    [[0.3,0.8,0.5],[0.5,0.5,0.4],[0.6,0.1,0.5]],
    [[-0.4,0.6,-0.4],[-0.6,0.3,-0.3],[-0.5,-0.1,-0.5]],
    [[0.2,1.1,-0.3],[0.4,0.7,-0.2],[0.5,0.2,-0.4]],
  ];

  const crackLines = crackDefs.map(pts => {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
    const m = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0 });
    const l = new THREE.Line(g, m);
    eggGroup.add(l);
    return l;
  });

  // ─── HAMMER ─────────────────────────────────────────────────
  const hammerGroup = new THREE.Group();
  scene.add(hammerGroup);

  // Handle (manche)
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.0 });
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.055, 0.9, 10),
    handleMat
  );
  handle.rotation.z = Math.PI / 4;
  handle.position.set(0.22, -0.22, 0);
  hammerGroup.add(handle);

  // Head (tête du marteau)
  const headMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });
  const hammerHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.35, 0.18),
    headMat
  );
  hammerHead.rotation.z = Math.PI / 4;
  hammerHead.position.set(-0.18, 0.18, 0);
  hammerGroup.add(hammerHead);

  // Bande métallique sur le manche
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.2, metalness: 1.0 });
  [-0.15, 0.15].forEach(offset => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.04, 10), bandMat);
    band.rotation.z = Math.PI / 4;
    band.position.set(0.22 + offset * Math.cos(Math.PI/4), -0.22 + offset * Math.sin(Math.PI/4) * -1, 0);
    hammerGroup.add(band);
  });

  // Taille globale
  hammerGroup.scale.setScalar(0.9);

  // ─── HAMMER STATE ───────────────────────────────────────────
  let hammerX = 0, hammerY = 0;         // position monde suivie
  let hammerTargetX = 3, hammerTargetY = 2; // hors écran au début
  let swingProgress = 0;                // 0→1 animation du coup
  let isSwinging = false;
  let hammerHits = 0;                   // nombre de coups donnés
  const MAX_HITS = crackDefs.length;    // max cracks
  let hammerActive = false;             // le marteau est actif (section visible)

  // Hint "Click to smash"
  const hintEl = document.createElement('div');
  hintEl.id = 'hammer-hint';
  hintEl.textContent = 'Click to smash';
  hintEl.style.cssText = `
    position:absolute; bottom:70px; left:50%; transform:translateX(-50%);
    font-size:0.62rem; letter-spacing:0.35em; text-transform:uppercase;
    color:#555; pointer-events:none; z-index:10;
    transition: opacity 0.5s ease;
    opacity: 0;
  `;
  eggSection.querySelector('.egg-sticky').appendChild(hintEl);

  // Convertir mouse NDC → world plane z=0
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const worldPos = new THREE.Vector3();

  function mouseToWorld(e) {
    const rect = container.getBoundingClientRect();
    mouse.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(planeZ, worldPos);
    return worldPos;
  }

  container.addEventListener('mousemove', (e) => {
    if (!hammerActive) return;
    const w = mouseToWorld(e);
    hammerTargetX = w.x;
    hammerTargetY = w.y;
  });

  container.addEventListener('click', (e) => {
    if (!hammerActive || isSwinging) return;
    if (hammerHits >= MAX_HITS) return;
    isSwinging = true;
    swingProgress = 0;

    // Screen-shake
    setTimeout(() => {
      container.style.transform = 'translate(-3px, -4px)';
      setTimeout(() => container.style.transform = 'translate(3px, 2px)', 60);
      setTimeout(() => container.style.transform = 'translate(0,0)', 120);
    }, 180); // au moment de l'impact
  });

  // ─── MONSTER ───────────────────────────────────────────────
  const monsterGroup = new THREE.Group();
  scene.add(monsterGroup);

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x110500, roughness: 0.85,
    emissive: 0xff2200, emissiveIntensity: 0,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3, roughness: 0,
  });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x2a0000, roughness: 0.6 });

  const mBody = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 32), darkMat.clone());
  mBody.position.y = -0.15;
  monsterGroup.add(mBody);

  const mHead = new THREE.Mesh(new THREE.SphereGeometry(0.33, 32, 32), darkMat.clone());
  mHead.position.y = 0.68;
  monsterGroup.add(mHead);

  [-0.13, 0.13].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), eyeMat);
    eye.position.set(x, 0.76, 0.27);
    monsterGroup.add(eye);
  });

  [[-0.16, 0.4], [0.16, -0.4]].forEach(([x, rz]) => {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.32, 8), hornMat);
    h.position.set(x, 1.08, 0.05);
    h.rotation.z = rz;
    monsterGroup.add(h);
  });

  [[-1, 0.65], [1, -0.65]].forEach(([side, rz]) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.45, 8), darkMat.clone());
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

  monsterGroup.add(new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.1, -0.55, 0),
        new THREE.Vector3(-0.35, -0.85, 0.2),
        new THREE.Vector3(-0.65, -0.85, 0),
        new THREE.Vector3(-0.8, -0.5, -0.1),
      ]), 20, 0.04, 8, false),
    darkMat.clone()
  ));

  monsterGroup.scale.setScalar(0);

  // ─── SCROLL ──────────────────────────────────────────────────
  let targetT = 0, scrollT = 0;

  function onScroll() {
    const rect     = eggSection.getBoundingClientRect();
    const sectionH = eggSection.offsetHeight - window.innerHeight;
    if (sectionH <= 0) return;
    const raw = Math.max(0, Math.min(1, -rect.top / sectionH));
    // Le scroll contrib aussi aux cracks (séparément des coups de marteau)
    targetT = raw;

    // Marteau actif seulement quand la section est visible à l'écran
    hammerActive = rect.top < window.innerHeight && rect.bottom > 0;
    hintEl.style.opacity = (hammerActive && hammerHits < MAX_HITS) ? '1' : '0';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── LOOP ─────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    const e = clock.getElapsedTime();
    scrollT += (targetT - scrollT) * 0.1;
    const t = scrollT;

    // Progression combinée : scroll + coups de marteau
    const hammerContrib = hammerHits / MAX_HITS * 0.6; // max 60% via marteau
    const combined = Math.min(1, t + hammerContrib);

    stageLabel.textContent = STAGES[Math.min(4, Math.floor(combined * 5))];
    progressFill.style.width = (combined * 100) + '%';

    // ── EGG ──
    eggGroup.rotation.y = e * 0.5;
    const wobble = combined < 0.6 ? Math.max(0, (combined - 0.2) / 0.4) : 0;
    eggGroup.rotation.z = Math.sin(e * (2 + wobble * 10)) * (0.03 + wobble * 0.14);
    eggGroup.position.y = Math.sin(e * 0.9) * 0.04;

    // Cracks : les 5 premières via scroll, les 3 suivantes via marteau
    crackLines.forEach((l, i) => {
      if (i < 5) {
        l.material.opacity = Math.max(0, Math.min(1, (t - i * 0.08) / 0.12));
      } else {
        // Crack de marteau : apparait quand hammerHits dépasse le seuil
        l.material.opacity = hammerHits > (i - 5) ? 1 : 0;
      }
    });

    innerGlow.intensity = Math.max(0, (combined - 0.25) / 0.75) * 5;
    const em = Math.max(0, (combined - 0.35) / 0.65);
    matTop.emissiveIntensity = em * 0.35;
    matBot.emissiveIntensity = em * 0.2;

    const hatch = Math.max(0, (combined - 0.6) / 0.4);
    shellTop.position.y = hatch * 2.4;
    shellTop.rotation.z = hatch * 0.7;
    shellBot.position.y = -hatch * 0.6;

    // ── MONSTER ──
    const mt = Math.max(0, (combined - 0.62) / 0.38);
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

    // ── HAMMER ──
    // Smooth follow
    hammerX += (hammerTargetX - hammerX) * 0.15;
    hammerY += (hammerTargetY - hammerY) * 0.15;

    // Animation du coup
    if (isSwinging) {
      swingProgress += 0.06;
      if (swingProgress >= 1) {
        swingProgress = 0;
        isSwinging = false;
        hammerHits = Math.min(MAX_HITS, hammerHits + 1);
        hintEl.style.opacity = hammerHits < MAX_HITS ? '1' : '0';
      }
    }

    // Rotation du marteau selon la phase
    // 0 = repos, 0→0.5 = levée, 0.5→1 = frappe
    const swingAngle = isSwinging
      ? (swingProgress < 0.5
          ? -Math.PI * 0.5 * (swingProgress / 0.5)          // levée
          : -Math.PI * 0.5 + Math.PI * 0.7 * ((swingProgress - 0.5) / 0.5)) // frappe
      : 0;

    hammerGroup.position.set(hammerX, hammerY, 0.5);
    hammerGroup.rotation.z = swingAngle;

    // Inclinaison naturelle selon la direction de déplacement
    hammerGroup.rotation.y = -0.3;

    renderer.render(scene, camera);
  });
}
