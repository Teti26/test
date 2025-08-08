#!/usr/bin/env node
/* Minimal full-stack server using only Node built-ins. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const WORKSPACE_DIR = '/workspace';
const DB_PATH = path.join(__dirname, 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_COOKIE = 'pg_token';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function nowIso() { return new Date().toISOString(); }
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.connection.destroy(); });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
  });
}

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], events: [], stats: [], entryTests: [] }, null, 2));
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}
function saveDb(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }

function uuid() { return crypto.randomUUID ? crypto.randomUUID() : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.randomBytes(1)[0]&15>>c/4).toString(16)); }

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

function base64url(input) { return Buffer.from(JSON.stringify(input)).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
function signToken(payload, expSec=60*60*24*7) { // 7 days
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now()/1000);
  const body = { ...payload, iat: now, exp: now + expSec };
  const h = base64url(header);
  const p = base64url(body);
  const data = `${h}.${p}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sig}`;
}
function verifyToken(token) {
  const [h, p, s] = token.split('.');
  const data = `${h}.${p}`;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) return null;
  const payload = JSON.parse(Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString());
  if (payload.exp && Math.floor(Date.now()/1000) > payload.exp) return null;
  return payload;
}

function parseCookies(req) {
  const header = req.headers['cookie'];
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(part => {
    const [k,v] = part.split('=').map(s => s.trim());
    cookies[k] = decodeURIComponent(v || '');
  });
  return cookies;
}

function send(res, code, body, headers={}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(payload);
}

function setCookie(res, name, value, opts={}) {
  const attrs = [];
  attrs.push(`${name}=${encodeURIComponent(value)}`);
  attrs.push('Path=/');
  if (opts.httpOnly !== false) attrs.push('HttpOnly');
  if (opts.sameSite) attrs.push(`SameSite=${opts.sameSite}`); else attrs.push('SameSite=Lax');
  if (opts.maxAge) attrs.push(`Max-Age=${opts.maxAge}`);
  if (opts.secure) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url); 
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(WORKSPACE_DIR, pathname);
  if (!filePath.startsWith(WORKSPACE_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function requireAuth(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[TOKEN_COOKIE] || '';
  const user = token ? verifyToken(token) : null;
  if (!user) { send(res, 401, { error: 'unauthorized' }); return null; }
  return user; 
}

function onlyRole(user, role) { return user && user.role === role; }

async function handleApi(req, res) {
  const parsed = url.parse(req.url, true);
  const { pathname, query } = parsed;

  // CORS for dev tools
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    });
    return res.end();
  }
  const corsHeaders = {
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const { email, password, name, role } = await readJsonBody(req);
    if (!email || !password || !name || !role) return send(res, 400, { error: 'missing_fields' }, corsHeaders);
    if (!['psychologist','student'].includes(role)) return send(res, 400, { error: 'bad_role' }, corsHeaders);
    const db = loadDb();
    if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) return send(res, 409, { error: 'exists' }, corsHeaders);
    const user = {
      id: uuid(),
      createdAt: nowIso(),
      email: email.toLowerCase(),
      name,
      role,
      password: hashPassword(password),
    };
    db.users.push(user);
    saveDb(db);
    return send(res, 201, { ok: true }, corsHeaders);
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const { email, password } = await readJsonBody(req);
    const db = loadDb();
    const user = db.users.find(u => u.email === String(email).toLowerCase());
    if (!user || !verifyPassword(password, user.password)) return send(res, 401, { error: 'invalid_credentials' }, corsHeaders);
    const token = signToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
    setCookie(res, TOKEN_COOKIE, token, { httpOnly: true, sameSite: 'Lax', maxAge: 60*60*24*7 });
    return send(res, 200, { user: { id: user.id, email: user.email, name: user.name, role: user.role } }, corsHeaders);
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const me = requireAuth(req, res); if (!me) return;
    const db = loadDb();
    const user = db.users.find(u => u.id === me.sub);
    return send(res, 200, { user: { id: user.id, email: user.email, name: user.name, role: user.role } }, corsHeaders);
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    setCookie(res, TOKEN_COOKIE, '', { httpOnly: true, maxAge: 0 });
    return send(res, 200, { ok: true }, corsHeaders);
  }

  if (pathname === '/api/users' && req.method === 'GET') {
    const me = requireAuth(req, res); if (!me) return;
    if (!onlyRole(me, 'psychologist')) return send(res, 403, { error: 'forbidden' }, corsHeaders);
    const db = loadDb();
    const students = db.users.filter(u => u.role === 'student').map(u => ({ id: u.id, name: u.name, email: u.email }));
    return send(res, 200, { students }, corsHeaders);
  }

  if (pathname === '/api/events' && req.method === 'GET') {
    const me = requireAuth(req, res); if (!me) return;
    const db = loadDb();
    let events;
    if (me.role === 'psychologist') {
      events = db.events.filter(e => e.psychologistId === me.sub);
    } else {
      events = db.events.filter(e => e.studentId === me.sub);
    }
    return send(res, 200, { events }, corsHeaders);
  }

  if (pathname === '/api/events' && req.method === 'POST') {
    const me = requireAuth(req, res); if (!me) return;
    if (!onlyRole(me, 'psychologist')) return send(res, 403, { error: 'forbidden' }, corsHeaders);
    const { studentId, datetime, durationMin, link } = await readJsonBody(req);
    if (!studentId || !datetime) return send(res, 400, { error: 'missing_fields' }, corsHeaders);
    const db = loadDb();
    const ev = { id: uuid(), createdAt: nowIso(), psychologistId: me.sub, studentId, datetime, durationMin: durationMin || 60, link: link || '' };
    db.events.push(ev);
    saveDb(db);
    return send(res, 201, { event: ev }, corsHeaders);
  }

  if (pathname === '/api/stats' && req.method === 'GET') {
    const me = requireAuth(req, res); if (!me) return;
    const db = loadDb();
    const userId = query.userId || me.sub;
    if (me.role === 'student' && userId !== me.sub) return send(res, 403, { error: 'forbidden' }, corsHeaders);
    const moduleName = query.module;
    let stats = db.stats.filter(s => s.userId === userId);
    if (moduleName) stats = stats.filter(s => s.module === moduleName);
    return send(res, 200, { stats }, corsHeaders);
  }

  if (pathname === '/api/stats' && req.method === 'POST') {
    const me = requireAuth(req, res); if (!me) return;
    const body = await readJsonBody(req);
    const { module, metrics } = body;
    if (!module || !metrics) return send(res, 400, { error: 'missing_fields' }, corsHeaders);
    const db = loadDb();
    const rec = { id: uuid(), userId: me.sub, module, metrics, createdAt: nowIso() };
    db.stats.push(rec);
    saveDb(db);
    return send(res, 201, { stat: rec }, corsHeaders);
  }

  if (pathname === '/api/entry-test' && req.method === 'POST') {
    const me = requireAuth(req, res); if (!me) return;
    const { results } = await readJsonBody(req);
    if (!results) return send(res, 400, { error: 'missing_fields' }, corsHeaders);
    const db = loadDb();
    const score = computeCompositeScore(results);
    const rec = { id: uuid(), userId: me.sub, createdAt: nowIso(), results, score };
    db.entryTests.push(rec);
    saveDb(db);
    return send(res, 201, { entryTest: rec }, corsHeaders);
  }

  if (pathname === '/api/entry-test' && req.method === 'GET') {
    const me = requireAuth(req, res); if (!me) return;
    const db = loadDb();
    const list = db.entryTests.filter(t => t.userId === me.sub);
    return send(res, 200, { entryTests: list }, corsHeaders);
  }

  // Not found in API
  send(res, 404, { error: 'not_found' }, corsHeaders);
}

function computeCompositeScore(r) {
  // r: { reactionMsAvg, stroopAcc, nbackAcc, memoryLevel }
  const reactionScore = r.reactionMsAvg ? Math.max(0, 100 - Math.min(100, (r.reactionMsAvg - 150) / 3)) : 0;
  const stroopScore = (r.stroopAcc || 0);
  const nbackScore = (r.nbackAcc || 0);
  const memoryScore = Math.min(100, (r.memoryLevel || 0) * 10);
  const composite = Math.round(0.35*reactionScore + 0.25*stroopScore + 0.25*nbackScore + 0.15*memoryScore);
  let level = 'начальный';
  if (composite >= 80) level = 'высокий'; else if (composite >= 60) level = 'средний';
  return { composite, level };
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  if (parsed.pathname.startsWith('/api/')) {
    return handleApi(req, res).catch(err => { console.error(err); send(res, 500, { error: 'internal' }); });
  }
  return serveStatic(req, res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});