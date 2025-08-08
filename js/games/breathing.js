export function initBreathing() {
  const circle = document.getElementById('breath-circle');
  const phaseEl = document.getElementById('breath-phase');
  const speedInput = document.getElementById('breath-speed');
  const speedLabel = document.getElementById('breath-speed-label');
  const startBtn = document.getElementById('breath-start');
  const stopBtn = document.getElementById('breath-stop');

  let running = false;
  let controller = null;

  function setPhase(name) {
    phaseEl.textContent = name;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function run() {
    running = true;
    controller = new AbortController();
    const signal = controller.signal;
    while (!signal.aborted) {
      const multiplier = Number(speedInput.value) || 1;
      const inhale = Math.round(4000 / multiplier);
      const hold = Math.round(4000 / multiplier);
      const exhale = Math.round(6000 / multiplier);

      // Inhale
      setPhase('Вдох (4)');
      animateScale(1.0, 1.25, inhale);
      await sleep(inhale);
      if (signal.aborted) break;

      // Hold
      setPhase('Задержка (4)');
      animateScale(1.25, 1.25, hold);
      await sleep(hold);
      if (signal.aborted) break;

      // Exhale
      setPhase('Выдох (6)');
      animateScale(1.25, 1.0, exhale);
      await sleep(exhale);
    }
    setPhase('—');
  }

  function animateScale(from, to, duration) {
    circle.animate([
      { transform: `scale(${from})` },
      { transform: `scale(${to})` },
    ], { duration, fill: 'forwards', easing: 'ease-in-out' });
  }

  startBtn.addEventListener('click', () => {
    if (!running) run();
  });
  stopBtn.addEventListener('click', () => {
    if (controller) controller.abort();
    running = false;
    setPhase('—');
  });

  speedInput.addEventListener('input', () => {
    speedLabel.textContent = `${Number(speedInput.value).toFixed(1)}×`;
  });

  // init label
  speedLabel.textContent = `${Number(speedInput.value).toFixed(1)}×`;
}