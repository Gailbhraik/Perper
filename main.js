(function () {

  /* ─── CROSSHAIR ──────────────────────────────── */
  const crossH = document.getElementById('crosshair-h');
  const crossV = document.getElementById('crosshair-v');

  let mouseX = 0, mouseY = 0;
  let curX = 0, curY = 0;
  let rafCursor;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    document.body.classList.add('cursor-active');
  });

  document.addEventListener('mouseleave', () => {
    document.body.classList.remove('cursor-active');
  });

  function animateCursor() {
    // Smooth lag follow — same feel as hatom
    curX += (mouseX - curX) * 0.12;
    curY += (mouseY - curY) * 0.12;

    crossH.style.top = curY + 'px';
    crossV.style.left = curX + 'px';

    rafCursor = requestAnimationFrame(animateCursor);
  }
  animateCursor();

  /* ─── LOADER ─────────────────────────────────── */
  const counter = document.getElementById('counter');
  const loader = document.getElementById('loader');
  const site = document.getElementById('site');

  let current = 0;
  const target = 100;
  const duration = 3200;
  const startTime = performance.now();

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function updateCounter(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    const value = Math.floor(eased * target);

    if (value !== current) {
      current = value;
      counter.textContent = current;
    }

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      counter.textContent = 100;
      setTimeout(() => {
        loader.classList.add('fade-out');
        site.classList.add('visible');
        initEgg();
      }, 400);
    }
  }

  requestAnimationFrame(updateCounter);

  /* ─── EGG SCROLL EVOLUTION ───────────────────── */
  function initEgg() {
    const canvas = document.getElementById('egg-canvas');
    const ctx = canvas.getContext('2d');
    const stageLabel = document.getElementById('egg-stage-label');
    const progressFill = document.getElementById('egg-progress-fill');
    const eggSection = document.getElementById('egg');

    const DPR = window.devicePixelRatio || 1;
    const SIZE = 600;
    canvas.width = SIZE * DPR;
    canvas.height = SIZE * DPR;
    ctx.scale(DPR, DPR);

    const PHASES = [
      { label: 'Phase 1 — Dormant',   cracks: 0,  glow: 0,    wobble: 0,    hatch: 0   },
      { label: 'Phase 2 — Awakening', cracks: 1,  glow: 0.15, wobble: 0.3,  hatch: 0   },
      { label: 'Phase 3 — Stirring',  cracks: 2,  glow: 0.35, wobble: 0.6,  hatch: 0   },
      { label: 'Phase 4 — Breaking',  cracks: 3,  glow: 0.65, wobble: 1.0,  hatch: 0.4 },
      { label: 'Phase 5 — Born',      cracks: 4,  glow: 1.0,  wobble: 0,    hatch: 1.0 },
    ];

    const TOTAL_FRAMES = 300;
    let frame = 0;
    let targetFrame = 0;

    const CRACK_LINES = [
      [[0.50, 0.35], [0.48, 0.42], [0.46, 0.50]],
      [[0.50, 0.35], [0.53, 0.44], [0.55, 0.52]],
      [[0.46, 0.50], [0.42, 0.56], [0.44, 0.62]],
      [[0.55, 0.52], [0.58, 0.58], [0.56, 0.65]],
    ];

    function lerpPhase(t) {
      const scaled = t * (PHASES.length - 1);
      const idx = Math.floor(scaled);
      const frac = scaled - idx;
      const a = PHASES[Math.min(idx, PHASES.length - 1)];
      const b = PHASES[Math.min(idx + 1, PHASES.length - 1)];
      return {
        label:  frac < 0.5 ? a.label : b.label,
        cracks: a.cracks + (b.cracks - a.cracks) * frac,
        glow:   a.glow   + (b.glow   - a.glow)   * frac,
        wobble: a.wobble + (b.wobble - a.wobble)  * frac,
        hatch:  a.hatch  + (b.hatch  - a.hatch)   * frac,
      };
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function eggPath(ctx, cx, cy, rx, ry) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.moveTo(0, -ry);
      ctx.bezierCurveTo( rx * 1.1, -ry * 0.6,  rx * 1.1,  ry * 0.5,  0,  ry);
      ctx.bezierCurveTo(-rx * 1.1,  ry * 0.5, -rx * 1.1, -ry * 0.6,  0, -ry);
      ctx.restore();
    }

    function drawCrack(ctx, points, alpha, rx, ry) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const visibleLen = Math.max(1, Math.ceil(points.length * alpha));
      ctx.moveTo((points[0][0] - 0.5) * rx * 2, (points[0][1] - 0.5) * ry * 2);
      for (let i = 1; i < visibleLen; i++) {
        ctx.lineTo((points[i][0] - 0.5) * rx * 2, (points[i][1] - 0.5) * ry * 2);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawEgg(t, time) {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const p = lerpPhase(t);
      const cx = SIZE / 2;
      const cy = SIZE / 2;
      const rx = 110;
      const ry = 140;
      const wobbleAmt = p.wobble * Math.sin(time * 0.008) * 4;

      ctx.save();
      ctx.translate(cx + wobbleAmt, cy);

      if (p.glow > 0) {
        const grd = ctx.createRadialGradient(0, 0, rx * 0.5, 0, 0, rx * 1.8);
        grd.addColorStop(0, `rgba(255,255,255,${p.glow * 0.18})`);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 1.8, rx * 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const shellGrd = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 10, 0, 0, ry);
      shellGrd.addColorStop(0, `rgba(${lerp(60,200,p.glow)},${lerp(60,200,p.glow)},${lerp(60,200,p.glow)},1)`);
      shellGrd.addColorStop(1, `rgba(${lerp(20,80,p.glow)},${lerp(20,80,p.glow)},${lerp(20,80,p.glow)},1)`);

      ctx.beginPath();
      eggPath(ctx, 0, 0, rx, ry);
      ctx.fillStyle = shellGrd;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(-rx * 0.25, -ry * 0.3, rx * 0.2, ry * 0.12, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.06 + p.glow * 0.08})`;
      ctx.fill();

      const crackCount = Math.floor(p.cracks);
      const crackFrac  = p.cracks - crackCount;
      for (let i = 0; i < crackCount; i++) drawCrack(ctx, CRACK_LINES[i], 1.0, rx, ry);
      if (crackCount < CRACK_LINES.length) drawCrack(ctx, CRACK_LINES[crackCount], crackFrac, rx, ry);

      if (p.hatch > 0) {
        ctx.save();
        ctx.translate(0, -p.hatch * ry * 0.6);
        ctx.rotate(p.hatch * 0.3);
        ctx.beginPath();
        ctx.ellipse(0, -ry * 0.1, rx * 0.9, ry * 0.55, 0, Math.PI, Math.PI * 2);
        ctx.fillStyle = shellGrd;
        ctx.fill();
        ctx.restore();

        if (p.hatch > 0.3) {
          const innerGrd = ctx.createRadialGradient(0, ry * 0.1, 5, 0, ry * 0.1, rx);
          innerGrd.addColorStop(0, `rgba(255,255,255,${(p.hatch - 0.3) * 0.6})`);
          innerGrd.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          eggPath(ctx, 0, 0, rx, ry);
          ctx.fillStyle = innerGrd;
          ctx.fill();
        }
      }

      ctx.restore();
    }

    function animate(timestamp) {
      const diff = targetFrame - frame;
      if (Math.abs(diff) > 0.3) frame += diff * 0.12;
      else frame = targetFrame;

      const t = Math.max(0, Math.min(1, frame / TOTAL_FRAMES));
      drawEgg(t, timestamp);

      stageLabel.textContent = PHASES[Math.min(Math.floor(t * 5), 4)].label;
      progressFill.style.width = (t * 100) + '%';

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    function onScroll() {
      const rect = eggSection.getBoundingClientRect();
      const sectionH = eggSection.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      targetFrame = Math.max(0, Math.min(1, scrolled / sectionH)) * TOTAL_FRAMES;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

})();
