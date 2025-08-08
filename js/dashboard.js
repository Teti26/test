import { Auth } from './auth.js';

export async function initDashboards() {
  const authBox = document.getElementById('auth-box');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const logoutBtn = document.getElementById('logout-btn');
  const userInfoEl = document.getElementById('user-info');

  const psychoView = document.getElementById('psychologist');
  const studentView = document.getElementById('student');

  const eventsListP = document.getElementById('events-list-psy');
  const eventsListS = document.getElementById('events-list-stu');
  const createEventForm = document.getElementById('create-event-form');
  const studentsSelect = document.getElementById('students-select');

  async function updateUiByAuth() {
    const user = await Auth.me();
    if (user) {
      authBox.style.display = 'none';
      logoutBtn.style.display = '';
      userInfoEl.textContent = `${user.name} (${user.role === 'psychologist' ? 'Психолог' : 'Ученик'})`;
      if (user.role === 'psychologist') {
        psychoView.style.display = '';
        studentView.style.display = 'none';
        await loadPsychologist(user);
      } else {
        psychoView.style.display = 'none';
        studentView.style.display = '';
        await loadStudent(user);
      }
    } else {
      authBox.style.display = '';
      logoutBtn.style.display = 'none';
      userInfoEl.textContent = '';
      psychoView.style.display = 'none';
      studentView.style.display = 'none';
    }
  }

  async function loadPsychologist(user) {
    // Fill students
    const resStudents = await fetch('/api/users', { credentials: 'include' });
    const { students } = await resStudents.json();
    studentsSelect.innerHTML = students.map(s => `<option value="${s.id}">${s.name} (${s.email})</option>`).join('');
    // Load events
    const rEvents = await fetch('/api/events', { credentials: 'include' });
    const { events } = await rEvents.json();
    eventsListP.innerHTML = renderEvents(events, students);
  }

  async function loadStudent(user) {
    const rEvents = await fetch('/api/events', { credentials: 'include' });
    const { events } = await rEvents.json();
    eventsListS.innerHTML = renderEvents(events);
    // Load recent stats summary
    const statsEl = document.getElementById('stats-list-stu');
    const rStats = await fetch('/api/stats', { credentials: 'include' });
    const { stats } = await rStats.json();
    statsEl.innerHTML = stats.slice(-10).reverse().map(s => `<li>${new Date(s.createdAt).toLocaleString()} • ${s.module}: ${renderMetrics(s.metrics)}</li>`).join('');
  }

  function renderEvents(events, students=[]) {
    const studentById = new Map(students.map(s => [s.id, s]));
    if (!events.length) return '<li>Пока нет событий</li>';
    return events.sort((a,b)=>a.datetime.localeCompare(b.datetime)).map(e => {
      const stu = studentById.get(e.studentId);
      const stuLabel = stu ? `${stu.name} (${stu.email})` : '';
      const link = e.link ? `<a href="${e.link}" target="_blank">Ссылка на занятие</a>` : '';
      return `<li>${new Date(e.datetime).toLocaleString()} • ${e.durationMin} мин • ${stuLabel} ${link}</li>`;
    }).join('');
  }

  function renderMetrics(m) {
    if (m.reactionMs) return `реакция ${m.reactionMs} мс`;
    if (m.stroop) return `струп ${m.stroop.acc}%`; 
    if (m.nback) return `n-back ${m.nback.acc}%`;
    if (m.memory) return `память ур. ${m.memory.level}`;
    return Object.keys(m).join(', ');
  }

  // Auth handlers
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    try {
      await Auth.login(fd.get('email'), fd.get('password'));
      loginForm.reset();
      await updateUiByAuth();
      // Jump to кабинет view
      document.querySelector('.nav-btn[data-target="dashboard"]').click();
    } catch (err) {
      alert('Ошибка входа');
    }
  });
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    try {
      await Auth.register({ name: fd.get('name'), email: fd.get('email'), password: fd.get('password'), role: fd.get('role') });
      alert('Регистрация успешна. Теперь войдите.');
      registerForm.reset();
    } catch (err) { alert('Ошибка регистрации'); }
  });
  logoutBtn.addEventListener('click', async () => {
    await Auth.logout();
    await updateUiByAuth();
  });

  createEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(createEventForm);
    const body = {
      studentId: fd.get('studentId'),
      datetime: fd.get('datetime'),
      durationMin: Number(fd.get('duration')) || 60,
      link: fd.get('link') || ''
    };
    const res = await fetch('/api/events', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { alert('Ошибка создания события'); return; }
    createEventForm.reset();
    await updateUiByAuth();
  });

  await updateUiByAuth();
}