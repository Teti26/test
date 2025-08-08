const COLORS = [
  { name: 'КРАСНЫЙ', css: '#ff4d4d' },
  { name: 'ЗЕЛЁНЫЙ', css: '#44dd77' },
  { name: 'СИНИЙ', css: '#5a7bff' },
  { name: 'ЖЁЛТЫЙ', css: '#ffd451' },
  { name: 'ФИОЛЕТОВЫЙ', css: '#c28bff' },
];

const STORAGE_KEY = 'pg:stroop:best';

export function initStroopGame() {
  const wordEl = document.getElementById('stroop-word');
  const optionsEl = document.getElementById('stroop-options');
  const startBtn = document.getElementById('stroop-start');
  const resetBtn = document.getElementById('stroop-reset');
  const statsEl = document.getElementById('stroop-stats');

  let trialIndex = 0;
  let numTrials = 20;
  let currentCorrectColor = null; // object from COLORS
  let trialStart = 0;
  let results = []; // {correct:boolean, rt:number}

  function shuffle(arr) { return arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(([,v])=>v); }

  function renderOptions() {
    optionsEl.innerHTML = '';
    COLORS.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.textContent = c.name;
      btn.style.borderColor = '#3a3f82';
      btn.style.color = c.css;
      btn.addEventListener('click', () => choose(idx));
      optionsEl.appendChild(btn);
    });
  }

  function nextTrial() {
    if (trialIndex >= numTrials) {
      finish();
      return;
    }
    trialIndex += 1;

    const [ink, text] = makeStimulus();
    currentCorrectColor = ink;
    wordEl.textContent = text.name;
    wordEl.style.color = ink.css;
    trialStart = performance.now();
    updateStats();
  }

  function makeStimulus() {
    // 50% congruent
    const congruent = Math.random() < 0.5;
    const ink = COLORS[Math.floor(Math.random() * COLORS.length)];
    let text = ink;
    if (!congruent) {
      const others = COLORS.filter(c => c !== ink);
      text = others[Math.floor(Math.random() * others.length)];
    }
    return [ink, text];
  }

  function choose(colorIndex) {
    if (!trialStart) return;
    const chosen = COLORS[colorIndex];
    const rt = Math.round(performance.now() - trialStart);
    const isCorrect = chosen === currentCorrectColor;
    results.push({ correct: isCorrect, rt });
    trialStart = 0;
    nextTrial();
  }

  function updateStats() {
    const best = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const n = results.length;
    const acc = n ? Math.round(100 * results.filter(r => r.correct).length / n) : 0;
    const avgRt = n ? Math.round(results.reduce((a, r) => a + r.rt, 0) / n) : 0;

    const bestAcc = best?.acc ?? null;
    const bestRt = best?.avgRt ?? null;

    const parts = [];
    parts.push(`Попытка: <strong>${Math.min(trialIndex, numTrials)}/${numTrials}</strong>`);
    parts.push(`Точность: <strong>${acc}%</strong>`);
    if (n) parts.push(`Среднее время: <strong>${avgRt} мс</strong>`);
    if (bestAcc != null) parts.push(`Лучшее: <strong>${bestAcc}%</strong>${bestRt ? `, ${bestRt} мс` : ''}`);
    statsEl.innerHTML = parts.join(' • ');
  }

  function finish() {
    wordEl.textContent = 'Готово!';
    wordEl.style.color = '#cbd1ff';
    const acc = Math.round(100 * results.filter(r => r.correct).length / results.length);
    const avgRt = Math.round(results.reduce((a, r) => a + r.rt, 0) / results.length);

    const best = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    // Update best if higher accuracy or equal accuracy with lower RT
    let shouldUpdate = false;
    if (!best) shouldUpdate = true; else if (acc > best.acc) shouldUpdate = true; else if (acc === best.acc && avgRt < best.avgRt) shouldUpdate = true;
    if (shouldUpdate) localStorage.setItem(STORAGE_KEY, JSON.stringify({ acc, avgRt }));

    updateStats();
  }

  function start() {
    trialIndex = 0;
    results = [];
    trialStart = 0;
    nextTrial();
  }

  function reset() {
    trialIndex = 0;
    results = [];
    trialStart = 0;
    wordEl.textContent = '—';
    wordEl.style.color = '#cbd1ff';
    updateStats();
  }

  startBtn.addEventListener('click', start);
  resetBtn.addEventListener('click', reset);
  renderOptions();
  updateStats();
}