const STORAGE_KEY = 'pg:gonogo:bestAcc';

export function initGoNoGoGame() {
  const stim = document.getElementById('gonogo-stimulus');
  const startBtn = document.getElementById('gonogo-start');
  const stopBtn = document.getElementById('gonogo-stop');
  const resetBtn = document.getElementById('gonogo-reset');
  const statsEl = document.getElementById('gonogo-stats');

  if (!stim) return;

  const TRIALS = 30;
  const NOGO_PROB = 0.3; // 30% no-go
  const ISI = 1000; // inter-stimulus interval
  const STIM_MS = 800; // stimulus duration

  let scheduleId = null;
  let running = false;
  let trialIndex = -1;
  let currentType = null; // 'go' | 'nogo'
  let responded = false;
  let hits = 0, falseAlarms = 0, misses = 0, correctInhibitions = 0;

  function setStim(type) {
    currentType = type;
    responded = false;
    if (type === 'go') {
      stim.textContent = '';
      stim.style.background = '#1c2a1c';
      stim.style.borderColor = '#3f8a3f';
      stim.style.display = 'grid';
      stim.style.placeItems = 'center';
      stim.innerHTML = '<div style="width:80px;height:80px;border-radius:999px;background:#43c79a;border:3px solid #5de4c7;"></div>';
    } else if (type === 'nogo') {
      stim.textContent = '';
      stim.style.background = '#2a1c1c';
      stim.style.borderColor = '#8a3c3c';
      stim.style.display = 'grid';
      stim.style.placeItems = 'center';
      stim.innerHTML = '<div style="width:80px;height:80px;border-radius:999px;background:#ff7474;border:3px solid #ff9b9b;"></div>';
    } else {
      stim.innerHTML = 'Отдых…';
      stim.style.background = '#1a1f4a';
      stim.style.borderColor = '#4a50a6';
    }
  }

  function updateStats() {
    const total = Math.max(1, trialIndex + 1);
    const acc = (hits + correctInhibitions) / total;
    const accPct = Math.round(acc * 100);
    const best = Number(localStorage.getItem(STORAGE_KEY)) || null;
    statsEl.innerHTML = [
      `Испытание: <strong>${Math.min(total, TRIALS)}/${TRIALS}</strong>`,
      `Попадания: <strong>${hits}</strong>`,
      `Ложные срабатывания: <strong>${falseAlarms}</strong>`,
      `Пропуски: <strong>${misses}</strong>`,
      `Правильные ингибиции: <strong>${correctInhibitions}</strong>`,
      best != null ? `Лучшее: <strong>${best}%</strong>` : null,
    ].filter(Boolean).join(' • ');
  }

  function finish() {
    running = false;
    if (scheduleId) clearTimeout(scheduleId);
    scheduleId = null;
    const total = Math.max(1, TRIALS);
    const accPct = Math.round(((hits + correctInhibitions) / total) * 100);
    const best = Number(localStorage.getItem(STORAGE_KEY)) || null;
    if (best == null || accPct > best) localStorage.setItem(STORAGE_KEY, String(accPct));
    if (window.pgReport) window.pgReport('gonogo', { accPct, hits, falseAlarms, misses, correctInhibitions });
    setStim(null);
  }

  function scheduleNext() {
    scheduleId = setTimeout(next, ISI);
  }

  function next() {
    if (!running) return;
    trialIndex += 1;
    if (trialIndex >= TRIALS) { finish(); return; }
    const isNoGo = Math.random() < NOGO_PROB;
    setStim(isNoGo ? 'nogo' : 'go');
    // hide after STIM_MS and evaluate if no response on go
    scheduleId = setTimeout(() => {
      if (currentType === 'go' && !responded) misses += 1;
      if (currentType === 'nogo' && !responded) correctInhibitions += 1;
      setStim(null);
      updateStats();
      scheduleNext();
    }, STIM_MS);
    updateStats();
  }

  function respond() {
    if (!running) return;
    if (currentType === 'go' && !responded) { hits += 1; responded = true; }
    else if (currentType === 'nogo' && !responded) { falseAlarms += 1; responded = true; }
    updateStats();
  }

  function start() {
    if (running) return;
    running = true;
    trialIndex = -1;
    hits = falseAlarms = misses = correctInhibitions = 0;
    setStim(null);
    updateStats();
    scheduleNext();
  }

  function stop() {
    running = false;
    if (scheduleId) clearTimeout(scheduleId);
    scheduleId = null;
    setStim(null);
  }

  function reset() {
    stop();
    trialIndex = -1;
    hits = falseAlarms = misses = correctInhibitions = 0;
    updateStats();
    stim.textContent = 'Нажмите «Старт»';
  }

  stim.addEventListener('click', respond);
  stim.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); respond(); } });
  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);
  resetBtn.addEventListener('click', reset);
  updateStats();
}