const LETTERS = 'ABCDEFGHJKLMNPQRTUVWXYZ'.split('');
const STORAGE_KEY = 'pg:nback:best';

export function initNBackGame() {
  const streamEl = document.getElementById('nback-stream');
  const startBtn = document.getElementById('nback-start');
  const matchBtn = document.getElementById('nback-match');
  const resetBtn = document.getElementById('nback-reset');
  const statsEl = document.getElementById('nback-stats');

  let sequence = [];
  let index = -1;
  let timerId = null;
  let isRunning = false;
  const IS_MATCH_PROB = 0.28; // ~28% targets
  const INTERVAL_MS = 2000;
  let hits = 0, falseAlarms = 0, misses = 0, correctRejections = 0;

  function randLetter() { return LETTERS[Math.floor(Math.random() * LETTERS.length)]; }

  function scheduleNext() {
    timerId = setTimeout(next, INTERVAL_MS);
  }

  function next() {
    if (!isRunning) return;
    index += 1;
    const prev2 = index >= 2 ? sequence[index - 2] : null;
    let letter;
    if (prev2 && Math.random() < IS_MATCH_PROB) {
      letter = prev2; // force a target
    } else {
      // ensure not accidental match
      do { letter = randLetter(); } while (prev2 && letter === prev2);
    }
    sequence.push(letter);
    streamEl.textContent = letter;
    matchBtn.disabled = false;
    scheduleNext();
  }

  function pressMatch() {
    if (!isRunning) return;
    const current = sequence[index];
    const prev2 = index >= 2 ? sequence[index - 2] : null;
    const isTarget = prev2 && current === prev2;
    if (isTarget) hits += 1; else falseAlarms += 1;
    // Disable until next stimulus
    matchBtn.disabled = true;
    updateStats();
  }

  function onTickEnd() {
    // Called when next stimulus shown; count misses/correct rejections for previous
    const prevIdx = index - 1;
    if (prevIdx >= 0) {
      const curr = sequence[prevIdx];
      const prev2 = prevIdx >= 2 ? sequence[prevIdx - 2] : null;
      const wasTarget = prev2 && curr === prev2;
      // If last tick we didn't press match (button was enabled), that is either miss or correct rejection
      // Heuristic: we can't directly know press; but we disable button upon press. So if enabled at transition => no press.
      // We'll track via a flag instead for accuracy.
    }
  }

  // Track presses per index
  let pressedOnIndex = new Set();

  function start() {
    stop();
    sequence = [];
    index = -1;
    isRunning = true;
    hits = 0; falseAlarms = 0; misses = 0; correctRejections = 0;
    pressedOnIndex.clear();
    streamEl.textContent = '—';
    updateStats();
    scheduleNext();
  }

  function stop() {
    if (timerId) clearTimeout(timerId);
    timerId = null;
    isRunning = false;
  }

  function reset() {
    stop();
    sequence = [];
    index = -1;
    hits = falseAlarms = misses = correctRejections = 0;
    pressedOnIndex.clear();
    streamEl.textContent = '—';
    updateStats();
  }

  function updateStats() {
    const totalTargets = countTargets(sequence);
    const acc = (hits + correctRejections) / Math.max(1, sequence.length);
    const accPct = Math.round(acc * 100);
    const best = Number(localStorage.getItem(STORAGE_KEY)) || null;
    if (sequence.length >= 20) {
      // Save best accuracy percentage
      if (best == null || accPct > best) localStorage.setItem(STORAGE_KEY, String(accPct));
    }
    statsEl.innerHTML = [
      `Длина: <strong>${sequence.length}</strong>`,
      `Цели: <strong>${totalTargets}</strong>`,
      `Попадания: <strong>${hits}</strong>`,
      `Ложные тревоги: <strong>${falseAlarms}</strong>`,
      `Пропуски: <strong>${misses}</strong>`,
      `Точность: <strong>${accPct}%</strong>`,
      best != null ? `Лучшее: <strong>${best}%</strong>` : null,
    ].filter(Boolean).join(' • ');
  }

  function countTargets(seq) {
    let t = 0;
    for (let i = 2; i < seq.length; i++) if (seq[i] === seq[i-2]) t++;
    return t;
  }

  // handle per-tick finalization using a MutationObserver-like timing: we hook into the next() call
  const origNext = next;
  function wrappedNext() {
    // finalize previous index
    const prevIdx = index;
    const prevWasTarget = prevIdx >= 2 && sequence[prevIdx] === sequence[prevIdx - 2];
    if (prevIdx >= 0) {
      const pressed = pressedOnIndex.has(prevIdx);
      if (!pressed) {
        if (prevWasTarget) misses += 1; else correctRejections += 1;
      }
    }
    origNext();
  }

  // Replace next with wrappedNext
  // eslint-disable-next-line no-func-assign
  next = wrappedNext;

  matchBtn.addEventListener('click', () => {
    if (!isRunning) return;
    pressedOnIndex.add(index);
    pressMatch();
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      if (document.getElementById('nback').classList.contains('active')) {
        e.preventDefault();
        matchBtn.click();
      }
    }
  });

  startBtn.addEventListener('click', start);
  resetBtn.addEventListener('click', reset);
  updateStats();
}