const STORAGE_KEY = 'pg:memory:bestLevel';

export function initMemoryGridGame(hooks = {}) {
  const gridEl = document.getElementById('memory-grid');
  const startBtn = document.getElementById('memory-start');
  const resetBtn = document.getElementById('memory-reset');
  const sizeSelect = document.getElementById('memory-size');
  const statsEl = document.getElementById('memory-stats');

  let gridSize = Number(sizeSelect.value);
  let level = 1;
  let pattern = new Set();
  let userSet = new Set();
  let inputEnabled = false;

  function buildGrid() {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 56px)`;
    gridEl.style.gridTemplateRows = `repeat(${gridSize}, 56px)`;
    for (let i = 0; i < gridSize * gridSize; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Клетка ${i+1}`);
      cell.addEventListener('click', () => onCell(i, cell));
      gridEl.appendChild(cell);
    }
  }

  function randomPattern(size) {
    const total = gridSize * gridSize;
    const set = new Set();
    while (set.size < size) {
      const i = Math.floor(Math.random() * total);
      set.add(i);
    }
    return set;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function showPattern() {
    inputEnabled = false;
    const cells = Array.from(gridEl.children);
    // Highlight sequence
    for (const idx of pattern) {
      const cell = cells[idx];
      cell.classList.add('on');
    }
    await sleep(1200 + Math.min(2000, level * 200));
    for (const idx of pattern) {
      const cell = cells[idx];
      cell.classList.remove('on');
    }
    inputEnabled = true;
  }

  function onCell(index, cellEl) {
    if (!inputEnabled) return;
    if (userSet.has(index)) {
      userSet.delete(index);
      cellEl.classList.remove('user-on');
    } else {
      userSet.add(index);
      cellEl.classList.add('user-on');
    }
    checkIfComplete();
  }

  function checkIfComplete() {
    if (userSet.size !== pattern.size) return;
    // Verify
    for (const idx of userSet) if (!pattern.has(idx)) return fail();
    // success
    level += 1;
    const best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
    if (level - 1 > best) localStorage.setItem(STORAGE_KEY, String(level - 1));
    updateStats(true);
    if (hooks.onLevel) hooks.onLevel(level - 1);
    // Next level
    prepareLevel();
  }

  function prepareLevel() {
    userSet.clear();
    Array.from(gridEl.children).forEach(c => c.classList.remove('user-on'));
    const patternSize = Math.min(gridSize * gridSize - 1, Math.max(2, Math.floor(gridSize + level / 2)));
    pattern = randomPattern(patternSize);
  }

  async function startRound() {
    prepareLevel();
    await showPattern();
  }

  function fail() {
    inputEnabled = false;
    updateStats(false);
  }

  function updateStats(success = null) {
    const best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
    const parts = [];
    parts.push(`Уровень: <strong>${level}</strong>`);
    if (success === true) parts.push(`<span style="color: var(--accent-2)">Верно!</span>`);
    if (success === false) parts.push(`<span style="color: var(--danger)">Ошибка. Попробуйте снова.</span>`);
    if (best) parts.push(`Лучший уровень: <strong>${best}</strong>`);
    statsEl.innerHTML = parts.join(' • ');
  }

  function reset() {
    inputEnabled = false;
    level = 1;
    userSet.clear();
    Array.from(gridEl.children).forEach(c => c.classList.remove('user-on', 'on'));
    updateStats();
  }

  sizeSelect.addEventListener('change', () => {
    gridSize = Number(sizeSelect.value);
    buildGrid();
    reset();
  });
  startBtn.addEventListener('click', startRound);
  resetBtn.addEventListener('click', reset);

  buildGrid();
  updateStats();
}