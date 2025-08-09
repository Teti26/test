const STORAGE_KEY = 'pg:simon:bestLevel';

export function initSimonGame() {
  const board = document.getElementById('simon-board');
  const startBtn = document.getElementById('simon-start');
  const resetBtn = document.getElementById('simon-reset');
  const statsEl = document.getElementById('simon-stats');

  if (!board) return; // page not on DOM

  const COLORS = [
    { key: 'g', name: 'green', color: '#5de4c7' },
    { key: 'r', name: 'red', color: '#ff7474' },
    { key: 'b', name: 'blue', color: '#7b8cff' },
    { key: 'y', name: 'yellow', color: '#ffd36e' },
  ];

  let sequence = [];
  let userIndex = 0;
  let level = 0;
  let accepting = false;

  function buildBoard() {
    board.innerHTML = '';
    board.style.display = 'grid';
    board.style.gridTemplateColumns = 'repeat(2, 120px)';
    board.style.gridTemplateRows = 'repeat(2, 120px)';
    board.style.gap = '12px';
    for (const c of COLORS) {
      const btn = document.createElement('button');
      btn.className = 'simon-btn';
      btn.style.width = '120px';
      btn.style.height = '120px';
      btn.style.borderRadius = '16px';
      btn.style.border = '2px solid rgba(255,255,255,0.2)';
      btn.style.background = c.color;
      btn.style.boxShadow = '0 6px 16px rgba(0,0,0,.25)';
      btn.setAttribute('aria-label', c.name);
      btn.addEventListener('click', () => press(c.key, btn));
      board.appendChild(btn);
      c.el = btn;
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function flash(btn, duration = 350) {
    const orig = btn.style.filter || 'brightness(1)';
    btn.style.filter = 'brightness(1.35)';
    await sleep(duration);
    btn.style.filter = orig;
  }

  async function playSequence() {
    accepting = false;
    for (const key of sequence) {
      const c = COLORS.find(c => c.key === key);
      if (c?.el) await flash(c.el);
      await sleep(200);
    }
    accepting = true;
  }

  async function nextLevel() {
    level += 1;
    const keys = COLORS.map(c => c.key);
    const next = keys[Math.floor(Math.random() * keys.length)];
    sequence.push(next);
    userIndex = 0;
    updateStats();
    await sleep(400);
    await playSequence();
  }

  function press(key, btnEl) {
    if (!accepting) return;
    const expected = sequence[userIndex];
    if (key === expected) {
      userIndex += 1;
      flash(btnEl, 200);
      if (userIndex === sequence.length) {
        // success level
        const best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
        if (level > best) localStorage.setItem(STORAGE_KEY, String(level));
        if (window.pgReport) window.pgReport('simon', { level });
        nextLevel();
      }
    } else {
      // fail
      accepting = false;
      statsEl.innerHTML += ' • <span style="color: var(--danger)">Ошибка</span>';
      if (window.pgReport) window.pgReport('simon', { failAtLevel: level });
    }
  }

  function updateStats() {
    const best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
    const parts = [
      `Уровень: <strong>${level}</strong>`,
      best ? `Лучший уровень: <strong>${best}</strong>` : null,
    ].filter(Boolean);
    statsEl.innerHTML = parts.join(' • ');
  }

  async function start() {
    sequence = [];
    userIndex = 0;
    level = 0;
    updateStats();
    await nextLevel();
  }

  function reset() {
    sequence = [];
    userIndex = 0;
    level = 0;
    accepting = false;
    updateStats();
  }

  startBtn.addEventListener('click', start);
  resetBtn.addEventListener('click', reset);
  buildBoard();
  updateStats();
}