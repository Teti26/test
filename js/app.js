import { initReactionGame } from './games/reaction.js';
import { initStroopGame } from './games/stroop.js';
import { initNBackGame } from './games/nback.js';
import { initMemoryGridGame } from './games/memorygrid.js';
import { initBreathing } from './games/breathing.js';
import { initDashboards } from './dashboard.js';
import { initEntryTest } from './entrytest.js';

async function postStat(module, metrics) {
  try {
    await fetch('/api/stats', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ module, metrics }) });
  } catch {}
}

function setupNavigation() {
  const buttons = Array.from(document.querySelectorAll('.nav-btn'));
  const views = Array.from(document.querySelectorAll('.view'));
  function activate(id) {
    views.forEach(v => v.classList.toggle('active', v.id === id));
    // Move focus to content area for a11y
    document.getElementById('content')?.focus();
    // Persist last view
    localStorage.setItem('pg:lastView', id);
  }
  buttons.forEach(btn => btn.addEventListener('click', () => activate(btn.dataset.target)));

  // Restore last view
  const last = localStorage.getItem('pg:lastView') || 'home';
  activate(last);

  // To top link
  document.getElementById('to-top')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function init() {
  setupNavigation();
  initReactionGame({ onResult: (ms) => postStat('reaction', { reactionMs: ms }) });
  initStroopGame({ onFinish: (summary) => postStat('stroop', { stroop: summary }) });
  initNBackGame({ onUpdate: (summary) => postStat('nback', { nback: summary }) });
  initMemoryGridGame({ onLevel: (level) => postStat('memory', { memory: { level } }) });
  initBreathing();
  initDashboards();
  initEntryTest();
}

window.addEventListener('DOMContentLoaded', init);