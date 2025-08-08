import { initReactionGame } from './games/reaction.js';
import { initStroopGame } from './games/stroop.js';
import { initNBackGame } from './games/nback.js';
import { initMemoryGridGame } from './games/memorygrid.js';
import { initBreathing } from './games/breathing.js';

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
  initReactionGame();
  initStroopGame();
  initNBackGame();
  initMemoryGridGame();
  initBreathing();
}

window.addEventListener('DOMContentLoaded', init);