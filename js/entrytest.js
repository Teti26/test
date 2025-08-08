import { Auth } from './auth.js';

export function initEntryTest() {
  const startBtn = document.getElementById('entry-start');
  const statusEl = document.getElementById('entry-status');

  startBtn.addEventListener('click', async () => {
    const user = await Auth.me();
    if (!user) { alert('Войдите, чтобы пройти тест'); return; }
    statusEl.textContent = 'Идёт тест… Выполните короткие раунды игр';
    const results = await runQuickBattery();
    try {
      const res = await fetch('/api/entry-test', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results }) });
      const data = await res.json();
      if (!res.ok) throw new Error('fail');
      statusEl.textContent = `Готово. Композит: ${data.entryTest.score.composite} (${data.entryTest.score.level})`;
    } catch {
      statusEl.textContent = 'Ошибка сохранения результата';
    }
  });
}

async function runQuickBattery() {
  // Simple heuristics: prompt user to perform specific counts; collect from localStorage/stats if possible
  const reactionMsAvg = await runReactionQuick();
  const stroopAcc = await runStroopQuick();
  const nbackAcc = await runNBackQuick();
  const memoryLevel = await runMemoryQuick();
  return { reactionMsAvg, stroopAcc, nbackAcc, memoryLevel };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runReactionQuick() {
  // Ask user to do 3 trials manually
  alert('Тест реакции: нажмите Старт и выполните 3 попытки');
  // Wait ~10s for user to finish
  await sleep(10000);
  const best = Number(localStorage.getItem('pg:reaction:bestMs')) || 0;
  return best || 300;
}
async function runStroopQuick() {
  alert('Тест Струпа: выполните один раунд (20 попыток)');
  await sleep(20000);
  const best = JSON.parse(localStorage.getItem('pg:stroop:best') || 'null');
  return best?.acc || 60;
}
async function runNBackQuick() {
  alert('Тест 2-back: сыграйте ~30 секунд, жмите Пробел на совпадениях');
  await sleep(30000);
  const best = Number(localStorage.getItem('pg:nback:best')) || 50;
  return best;
}
async function runMemoryQuick() {
  alert('Тест памяти: пройдите несколько уровней в сетке');
  await sleep(15000);
  const best = Number(localStorage.getItem('pg:memory:bestLevel')) || 1;
  return best;
}