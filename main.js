(function () {
  const counter = document.getElementById('counter');
  const loader = document.getElementById('loader');
  const site = document.getElementById('site');

  let current = 0;
  const target = 100;
  // Non-linear easing: slow start, fast middle, slow end
  const duration = 3200; // ms
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
      }, 400);
    }
  }

  requestAnimationFrame(updateCounter);
})();
