export const Auth = (() => {
  async function request(path, options = {}) {
    const res = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) throw new Error((await res.json()).error || 'error');
    return res.json();
  }
  async function me() { try { const r = await request('/api/auth/me'); return r.user; } catch { return null; } }
  async function login(email, password) { const r = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); return r.user; }
  async function register({ name, email, password, role }) { return request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }); }
  async function logout() { return request('/api/auth/logout', { method: 'POST' }); }
  return { me, login, register, logout };
})();