import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 3000;

async function createDb() {
  const db = await open({ filename: path.join(__dirname, 'data.db'), driver: sqlite3.Database });
  await db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('psychologist','parent')),
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      birthdate TEXT
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      psychologist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      UNIQUE(psychologist_id, child_id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      psychologist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      scheduled_at TEXT,
      join_url TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled'
    );
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      assigned_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS intakes (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
  `);

  // ensure games exist (idempotent upsert)
  const desiredGames = [
    { key: 'reaction', name: 'Реакция', description: 'Скорость реакции' },
    { key: 'stroop', name: 'Струп', description: 'Интерференция цвета-слова' },
    { key: 'nback', name: 'N-back', description: 'Рабочая память' },
    { key: 'memory', name: 'Память (сетка)', description: 'Зрительная память' },
    { key: 'breathing', name: 'Дыхание', description: 'Дыхательная тренировка' },
    { key: 'gonogo', name: 'Go/No-Go', description: 'Тормозный контроль' },
    { key: 'simon', name: 'Саймон', description: 'Последовательная память' },
  ];
  for (const g of desiredGames) {
    await db.run('INSERT OR IGNORE INTO games (id,key,name,description) VALUES (?,?,?,?)', uuidv4(), g.key, g.name, g.description);
  }

  return db;
}

function makeAuth(db) {
  return {
    sign(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); },
    verify(token) { return jwt.verify(token, JWT_SECRET); },
    async requireAuth(req, res, next) {
      const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'unauthorized' });
      try {
        const data = jwt.verify(token, JWT_SECRET);
        req.user = data;
        next();
      } catch (e) { return res.status(401).json({ error: 'invalid_token' }); }
    },
    async hash(p) { return bcrypt.hash(p, 10); },
    async compare(p, h) { return bcrypt.compare(p, h); },
  };
}

async function main() {
  const db = await createDb();
  const auth = makeAuth(db);
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Static site for games MVP
  app.use(express.static(__dirname));

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, role, name, childName, childBirthdate } = req.body;
    if (!email || !password || !role || !name) return res.status(400).json({ error: 'missing_fields' });
    if (!['psychologist', 'parent'].includes(role)) return res.status(400).json({ error: 'bad_role' });
    try {
      const id = uuidv4();
      const hash = await auth.hash(password);
      await db.run('INSERT INTO users (id,email,password_hash,role,name) VALUES (?,?,?,?,?)', id, email, hash, role, name);
      // If parent, create child automatically
      if (role === 'parent') {
        const childId = uuidv4();
        await db.run('INSERT INTO children (id,parent_id,name,birthdate) VALUES (?,?,?,?)', childId, id, childName || 'Ребёнок', childBirthdate || null);
      }
      const token = auth.sign({ id, role, email, name });
      res.cookie('token', token, { httpOnly: true });
      res.json({ ok: true, token });
    } catch (e) {
      if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'email_exists' });
      res.status(500).json({ error: 'server_error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await auth.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const token = auth.sign({ id: user.id, role: user.role, email: user.email, name: user.name });
    res.cookie('token', token, { httpOnly: true });
    res.json({ ok: true, token, role: user.role, name: user.name });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ ok: true });
  });

  app.post('/api/auth/forgot', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'missing_email' });
    const user = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (!user) return res.status(404).json({ error: 'not_found' });
    const token = uuidv4();
    await db.run('DELETE FROM password_resets WHERE user_id = ?', user.id);
    await db.run(
      'INSERT INTO password_resets (token, user_id, expires_at) VALUES (?,?,datetime("now", "+1 hour"))',
      token,
      user.id
    );
    const link = `http://localhost:${PORT}/reset.html?token=${token}`;
    console.log('Password reset link for', email, link);
    res.json({ ok: true });
  });

  app.post('/api/auth/reset', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'missing_fields' });
    const row = await db.get(
      'SELECT * FROM password_resets WHERE token = ? AND expires_at > datetime("now")',
      token
    );
    if (!row) return res.status(400).json({ error: 'bad_token' });
    const hash = await auth.hash(password);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', hash, row.user_id);
    await db.run('DELETE FROM password_resets WHERE token = ?', token);
    res.json({ ok: true });
  });

  // Psychologist endpoints
  app.get('/api/psych/students', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'forbidden' });
    const rows = await db.all(
      `SELECT c.*, u.name as parent_name FROM enrollments e
       JOIN children c ON c.id = e.child_id
       JOIN users u ON u.id = c.parent_id
       WHERE e.psychologist_id = ?
       ORDER BY c.name`,
      req.user.id
    );
    res.json(rows);
  });

  app.post('/api/psych/students', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'forbidden' });
    const { parentEmail, childName, childBirthdate } = req.body;
    const parent = await db.get('SELECT * FROM users WHERE email = ? AND role = "parent"', parentEmail);
    if (!parent) return res.status(404).json({ error: 'parent_not_found' });
    const child = await db.get('SELECT * FROM children WHERE parent_id = ? AND name = ?', parent.id, childName);
    const childId = child?.id || uuidv4();
    if (!child) {
      await db.run('INSERT INTO children (id,parent_id,name,birthdate) VALUES (?,?,?,?)', childId, parent.id, childName, childBirthdate || null);
    }
    try {
      await db.run('INSERT INTO enrollments (id,psychologist_id,child_id) VALUES (?,?,?)', uuidv4(), req.user.id, childId);
    } catch (e) {
      if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'already_enrolled' });
      throw e;
    }
    res.json({ ok: true });
  });

  app.delete('/api/psych/students/:childId', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'forbidden' });
    await db.run('DELETE FROM enrollments WHERE psychologist_id = ? AND child_id = ?', req.user.id, req.params.childId);
    res.json({ ok: true });
  });

  app.get('/api/psych/assignments', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'forbidden' });
    const rows = await db.all(
      `SELECT a.*, c.name as child_name, g.key as game_key, g.name as game_name
       FROM assignments a
       JOIN children c ON c.id = a.child_id
       JOIN games g ON g.id = a.game_id
       WHERE a.assigned_by = ?
       ORDER BY a.created_at DESC`,
      req.user.id
    );
    res.json(rows);
  });

  app.post('/api/psych/assignments', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'forbidden' });
    const { childId, gameKey, notes } = req.body;
    const game = await db.get('SELECT * FROM games WHERE key = ?', gameKey);
    if (!game) return res.status(400).json({ error: 'bad_game' });
    const enrollment = await db.get('SELECT * FROM enrollments WHERE psychologist_id = ? AND child_id = ?', req.user.id, childId);
    if (!enrollment) return res.status(403).json({ error: 'not_associated' });
    await db.run('INSERT INTO assignments (id, child_id, game_id, assigned_by, notes, created_at) VALUES (?,?,?,?,?,datetime("now"))', uuidv4(), childId, game.id, req.user.id, notes || null);
    res.json({ ok: true });
  });

  // Psychologist sessions
  app.get('/api/psych/sessions', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'forbidden' });
    const rows = await db.all(
      `SELECT s.*, c.name as child_name FROM sessions s
       JOIN children c ON c.id = s.child_id
       WHERE s.psychologist_id = ?
       ORDER BY datetime(s.scheduled_at) DESC`,
      req.user.id
    );
    res.json(rows);
  });

  app.post('/api/psych/sessions', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'forbidden' });
    const { childId, title, scheduledAt, joinUrl } = req.body;
    const enrollment = await db.get('SELECT 1 FROM enrollments WHERE psychologist_id = ? AND child_id = ?', req.user.id, childId);
    if (!enrollment) return res.status(403).json({ error: 'not_associated' });
    await db.run('INSERT INTO sessions (id, child_id, psychologist_id, title, scheduled_at, join_url, status) VALUES (?,?,?,?,?,?,"scheduled")', uuidv4(), childId, req.user.id, title || null, scheduledAt || null, joinUrl || null);
    res.json({ ok: true });
  });

  // Parent dashboard
  app.get('/api/parent/assignments', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'forbidden' });
    const rows = await db.all(
      `SELECT a.*, g.key as game_key, g.name as game_name, c.name as child_name
       FROM assignments a
       JOIN games g ON g.id = a.game_id
       JOIN children c ON c.id = a.child_id
       WHERE c.parent_id = ?
       ORDER BY a.created_at DESC`,
      req.user.id
    );
    res.json(rows);
  });

  app.get('/api/parent/sessions', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'forbidden' });
    const rows = await db.all(
      `SELECT s.*, c.name as child_name FROM sessions s
       JOIN children c ON c.id = s.child_id
       WHERE c.parent_id = ?
       ORDER BY datetime(s.scheduled_at) DESC`,
      req.user.id
    );
    res.json(rows);
  });

  app.get('/api/parent/results', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'forbidden' });
    const rows = await db.all(
      `SELECT r.*, g.key as game_key, g.name as game_name, c.name as child_name
       FROM results r
       JOIN games g ON g.id = r.game_id
       JOIN children c ON c.id = r.child_id
       WHERE c.parent_id = ?
       ORDER BY datetime(r.created_at) DESC
       LIMIT 50`,
      req.user.id
    );
    res.json(rows.map(r => ({ ...r, payload: JSON.parse(r.payload) })));
  });

  app.post('/api/parent/intake', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'forbidden' });
    const { childId, payload } = req.body;
    if (!childId || !payload) return res.status(400).json({ error: 'missing_fields' });
    const own = await db.get('SELECT 1 FROM children WHERE id = ? AND parent_id = ?', childId, req.user.id);
    if (!own) return res.status(403).json({ error: 'forbidden' });
    await db.run('INSERT INTO intakes (id, child_id, payload, created_at) VALUES (?,?,?,datetime("now"))', uuidv4(), childId, JSON.stringify(payload));
    res.json({ ok: true });
  });

  app.get('/api/parent/intake', auth.requireAuth, async (req, res) => {
    if (req.user.role !== 'parent') return res.status(403).json({ error: 'forbidden' });
    const rows = await db.all(
      `SELECT i.*, c.name as child_name FROM intakes i
       JOIN children c ON c.id = i.child_id
       WHERE c.parent_id = ?
       ORDER BY datetime(i.created_at) DESC`,
      req.user.id
    );
    res.json(rows.map(r => ({ ...r, payload: JSON.parse(r.payload) })));
  });

  // Results submission (from games)
  app.post('/api/results', auth.requireAuth, async (req, res) => {
    const { childId, gameKey, sessionId, result } = req.body;
    if (!childId || !gameKey || !result) return res.status(400).json({ error: 'missing_fields' });
    const game = await db.get('SELECT * FROM games WHERE key = ?', gameKey);
    if (!game) return res.status(400).json({ error: 'bad_game' });
    // authorization: psychologists can submit for any enrolled child; parents only for their own child
    if (req.user.role === 'parent') {
      const own = await db.get('SELECT 1 FROM children WHERE id = ? AND parent_id = ?', childId, req.user.id);
      if (!own) return res.status(403).json({ error: 'forbidden' });
    } else if (req.user.role === 'psychologist') {
      const enrolled = await db.get('SELECT 1 FROM enrollments WHERE psychologist_id = ? AND child_id = ?', req.user.id, childId);
      if (!enrolled) return res.status(403).json({ error: 'forbidden' });
    }
    await db.run('INSERT INTO results (id, child_id, game_id, session_id, payload, created_at) VALUES (?,?,?,?,?,datetime("now"))', uuidv4(), childId, game.id, sessionId || null, JSON.stringify(result));
    res.json({ ok: true });
  });

  // Simple HTML pages for login and dashboards
  app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
  });

  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  });

  app.get('/intake', (req, res) => {
    res.sendFile(path.join(__dirname, 'intake.html'));
  });

  app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '404.html')));

  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});