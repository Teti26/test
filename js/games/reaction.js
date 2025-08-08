const STORAGE_KEY = 'pg:reaction:bestMs';

export function initReactionGame() {
  const arena = document.getElementById('reaction-arena');
  const startBtn = document.getElementById('reaction-start');
  const resetBtn = document.getElementById('reaction-reset');
  const stats = document.getElementById('reaction-stats');

  let state = 'idle'; // 'idle' | 'waiting' | 'ready'
  let readyAt = 0;
  let timerId = null;
  let trials = [];

  function setArena(text, cls) {
    arena.textContent = text;
    arena.className = `reaction-arena ${cls || ''}`.trim();
  }

  function updateStats() {
    const best = Number(localStorage.getItem(STORAGE_KEY)) || null;
    const last = trials[trials.length - 1];
    const avg = trials.length ? Math.round(trials.reduce((a, b) => a + b, 0) / trials.length) : null;
    stats.innerHTML = [
      last != null ? `Последний: <strong>${last} мс</strong>` : null,
      avg != null ? `Средний (${trials.length}): <strong>${avg} мс</strong>` : null,
      best != null ? `Лучший: <strong>${best} мс</strong>` : null,
    ].filter(Boolean).join(' • ');
  }

  function scheduleReady() {
    const delay = 800 + Math.random() * 1800; // 0.8-2.6s
    state = 'waiting';
    setArena('Ждите…', 'wait');
    timerId = setTimeout(() => {
      state = 'ready';
      readyAt = performance.now();
      setArena('Клик!', 'ready');
    }, delay);
  }

  function handleClick() {
    if (state === 'waiting') {
      // too early
      setArena('Рано! Нажмите «Старт».', 'too-early');
      clearTimeout(timerId);
      timerId = null;
      state = 'idle';
    } else if (state === 'ready') {
      const rt = Math.round(performance.now() - readyAt);
      trials.push(rt);
      const best = Number(localStorage.getItem(STORAGE_KEY)) || Infinity;
      if (rt < best) {
        localStorage.setItem(STORAGE_KEY, String(rt));
      }
      setArena(`Результат: ${rt} мс. Ещё раз?`, '');
      updateStats();
      state = 'idle';
    }
  }

  function start() {
    if (state !== 'idle') return;
    scheduleReady();
  }

  function reset() {
    trials = [];
    setArena('Нажмите «Старт»', '');
    updateStats();
  }

  arena.addEventListener('click', handleClick);
  arena.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  });
  startBtn.addEventListener('click', start);
  resetBtn.addEventListener('click', reset);

  setArena('Нажмите «Старт»', '');
  updateStats();
}