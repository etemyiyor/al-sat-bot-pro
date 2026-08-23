const ALLOWED_ORIGINS = new Set([
  'https://etemyiyor.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

const SESSION_COOKIE = 'asbp_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const h = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
  if (ALLOWED_ORIGINS.has(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(request, body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), ...extraHeaders } });
}

function cookie(name, value, maxAge = SESSION_SECONDS) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function parseCookies(request) {
  const out = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToB64(buf) {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(s) {
  const raw = atob(s);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function sha256(value) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hashPassword(password, saltBytes) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 210000, hash: 'SHA-256' }, key, 256);
  return bytesToHex(bits);
}

async function requestBody(request) {
  try { return await request.json(); } catch { return {}; }
}

async function getSessionUser(request, env) {
  if (!env.DB) return null;
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Date.now();
  const row = await env.DB.prepare(`
    SELECT u.id, u.username, u.email, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).bind(tokenHash, now).first();
  if (!row) return null;
  return { id: row.id, username: row.username, email: row.email || null };
}

async function createSession(request, env, userId, remember = true) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const tokenHash = await sha256(token);
  const ttl = remember ? SESSION_SECONDS : 60 * 60 * 12;
  const now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, userId, now + ttl * 1000, now).run();
  return { token, ttl };
}

async function authRegister(request, env) {
  if (!env.DB) return json(request, { ok: false, error: 'D1 veritabanı bağlı değil' }, 503);
  const body = await requestBody(request);
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) return json(request, { ok: false, error: 'Kullanıcı adı 3-32 karakter olmalı' }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(request, { ok: false, error: 'Geçerli e-posta gir' }, 400);
  if (password.length < 8) return json(request, { ok: false, error: 'Şifre en az 8 karakter olmalı' }, 400);

  const exists = await env.DB.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE OR (? <> "" AND email = ? COLLATE NOCASE) LIMIT 1')
    .bind(username, email, email).first();
  if (exists) return json(request, { ok: false, error: 'Bu kullanıcı adı veya e-posta zaten kayıtlı' }, 409);

  const id = crypto.randomUUID();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPassword(password, salt);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO users (id, username, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, username, email || null, passwordHash, bytesToB64(salt), now).run();
  const session = await createSession(request, env, id, true);
  return json(request, { ok: true, user: { id, username, email: email || null } }, 201, { 'Set-Cookie': cookie(SESSION_COOKIE, session.token, session.ttl) });
}

async function authLogin(request, env) {
  if (!env.DB) return json(request, { ok: false, error: 'D1 veritabanı bağlı değil' }, 503);
  const body = await requestBody(request);
  const identity = String(body.identity || '').trim();
  const password = String(body.password || '');
  const remember = body.remember !== false;
  if (!identity || !password) return json(request, { ok: false, error: 'Kullanıcı ve şifre gerekli' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE LIMIT 1')
    .bind(identity, identity.toLowerCase()).first();
  if (!user) return json(request, { ok: false, error: 'Kullanıcı adı/e-posta veya şifre hatalı' }, 401);
  const actual = await hashPassword(password, b64ToBytes(user.password_salt));
  if (actual !== user.password_hash) return json(request, { ok: false, error: 'Kullanıcı adı/e-posta veya şifre hatalı' }, 401);

  const session = await createSession(request, env, user.id, remember);
  await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(Date.now(), user.id).run();
  return json(request, { ok: true, user: { id: user.id, username: user.username, email: user.email || null } }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, session.token, session.ttl) });
}

async function authLogout(request, env) {
  if (env.DB) {
    const token = parseCookies(request)[SESSION_COOKIE];
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  }
  return json(request, { ok: true }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, '', 0) });
}

async function callUpstream(env, path, params = {}) {
  const base = String(env.BLOOMBERG_UPSTREAM_URL || '').replace(/\/$/, '');
  if (!base) throw Object.assign(new Error('Bloomberg upstream yapılandırılmadı. BLOOMBERG_UPSTREAM_URL gerekli.'), { status: 503 });
  const u = new URL(base + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  }
  const headers = { Accept: 'application/json' };
  if (env.BLOOMBERG_UPSTREAM_TOKEN) headers.Authorization = `Bearer ${env.BLOOMBERG_UPSTREAM_TOKEN}`;
  const r = await fetch(u, { headers, cf: { cacheTtl: 0, cacheEverything: false } });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text || 'Geçersiz upstream yanıtı' }; }
  if (!r.ok) throw Object.assign(new Error(data.message || data.error || `Bloomberg upstream hatası (${r.status})`), { status: r.status });
  return data.data ?? data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const isApiPath = path === '/health' || path === '/quote' || path === '/series' || path.startsWith('/auth/');

    if (!isApiPath) return env.ASSETS.fetch(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });

    try {
      if (path === '/health') {
        return json(request, {
          ok: true,
          service: 'TradeX AI Worker',
          upstreamConfigured: !!env.BLOOMBERG_UPSTREAM_URL,
          authDatabaseConfigured: !!env.DB,
          mode: env.BLOOMBERG_MODE || 'gateway',
          assets: true,
          time: new Date().toISOString()
        });
      }

      if (path === '/auth/register' && request.method === 'POST') return authRegister(request, env);
      if (path === '/auth/login' && request.method === 'POST') return authLogin(request, env);
      if (path === '/auth/logout' && request.method === 'POST') return authLogout(request, env);
      if (path === '/auth/me' && request.method === 'GET') {
        if (!env.DB) return json(request, { ok: false, error: 'D1 veritabanı bağlı değil' }, 503);
        const user = await getSessionUser(request, env);
        return user ? json(request, { ok: true, user }) : json(request, { ok: false, error: 'Oturum yok' }, 401);
      }

      if (path.startsWith('/auth/')) return json(request, { ok: false, error: 'Method not allowed' }, 405);

      if (request.method !== 'GET') return json(request, { ok: false, error: 'Method not allowed' }, 405);
      const user = await getSessionUser(request, env);
      if (!user) return json(request, { ok: false, error: 'Giriş gerekli' }, 401);

      if (path === '/quote') {
        const market = url.searchParams.get('market');
        const symbol = url.searchParams.get('symbol');
        if (!market || !symbol) return json(request, { ok: false, error: 'market ve symbol gerekli' }, 400);
        const data = await callUpstream(env, '/quote', { market, symbol });
        return json(request, { ok: true, data });
      }

      if (path === '/series') {
        const market = url.searchParams.get('market');
        const symbol = url.searchParams.get('symbol');
        const interval = url.searchParams.get('interval') || '1d';
        const limit = url.searchParams.get('limit') || '200';
        if (!market || !symbol) return json(request, { ok: false, error: 'market ve symbol gerekli' }, 400);
        const data = await callUpstream(env, '/series', { market, symbol, interval, limit });
        return json(request, { ok: true, data });
      }

      return json(request, { ok: false, error: 'Not found' }, 404);
    } catch (err) {
      return json(request, { ok: false, error: err.message || 'Worker hatası' }, Number(err.status) || 500);
    }
  }
};
