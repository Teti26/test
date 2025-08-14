async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) { window.location.href = '/login'; return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'error');
  return data;
}

document.getElementById('logout')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await api('POST', '/api/auth/logout');
  window.location.href = '/login';
});

document.getElementById('save-profile').addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const msg = document.getElementById('profile-msg');
  msg.textContent = 'Сохранение…';
  try {
    await api('PUT', '/api/user', { name, email });
    msg.textContent = 'Готово';
  } catch (e) {
    msg.textContent = 'Ошибка: ' + e.message;
  }
});

document.getElementById('change-password').addEventListener('click', async () => {
  const currentPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  const msg = document.getElementById('password-msg');
  msg.textContent = 'Сохранение…';
  try {
    await api('PUT', '/api/user/password', { currentPassword, newPassword });
    msg.textContent = 'Готово';
  } catch (e) {
    msg.textContent = 'Ошибка: ' + e.message;
  }
});
