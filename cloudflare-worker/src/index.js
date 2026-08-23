import { handleBilling } from './billing.js';

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

function bytesToHex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function bytesToB64(buf) { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s); }
function b64ToBytes(s) { const raw = atob(s); return Uint8Array.from(raw, c => c.charCodeAt(0)); }
async function sha256(value) { return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }

async function hashPassword(password, saltBytes) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 210000, hash: 'SHA-256' }, key, 256);
  return bytesToHex(bits);
}

async function requestBody(request) { try { return await request.json(); } catch { return {}; } }

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
  return row ? { id: row.id, username: row.username, email: row.email || null } : null;
}

async function createSession(env, userId, remember = true) {
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
  if (!env.DB) return json(request, { ok: false, error: 'Yerel giriş modu aktif', localAuth: true }, 503);
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
  const session = await createSession(env, id, true);
  return json(request, { ok: true, user: { id, username, email: email || null } }, 201, { 'Set-Cookie': cookie(SESSION_COOKIE, session.token, session.ttl) });
}

async function authLogin(request, env) {
  if (!env.DB) return json(request, { ok: false, error: 'Yerel giriş modu aktif', localAuth: true }, 503);
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
  const session = await createSession(env, user.id, remember);
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

function yahooSymbol(market, symbol) {
  let s = String(symbol || '').trim().toUpperCase();
  if (!/^[A-Z0-9.^_-]+$/.test(s)) throw Object.assign(new Error('Geçersiz sembol'), { status: 400 });
  if (market === 'bist' && !s.endsWith('.IS')) s += '.IS';
  return s;
}

function yahooPlan(interval) {
  const i = String(interval || '1d').toLowerCase();
  if (i === '15m') return { apiInterval: '15m', range: '1mo', aggregate: 1 };
  if (i === '1h' || i === '60m') return { apiInterval: '60m', range: '3mo', aggregate: 1 };
  if (i === '4h') return { apiInterval: '60m', range: '6mo', aggregate: 4 };
  if (i === '1w' || i === '1wk') return { apiInterval: '1wk', range: '5y', aggregate: 1 };
  return { apiInterval: '1d', range: '2y', aggregate: 1 };
}

function aggregateRows(rows, size) {
  if (size <= 1) return rows;
  const out = [];
  for (let i = 0; i < rows.length; i += size) {
    const g = rows.slice(i, i + size);
    if (!g.length) continue;
    out.push({
      time: g[0].time,
      open: g[0].open,
      high: Math.max(...g.map(x => x.high).filter(Number.isFinite)),
      low: Math.min(...g.map(x => x.low).filter(Number.isFinite)),
      close: g[g.length - 1].close,
      volume: g.reduce((a, x) => a + (Number(x.volume) || 0), 0)
    });
  }
  return out;
}

async function yahooChart(market, symbol, interval = '1d', limit = 200) {
  const ys = yahooSymbol(market, symbol);
  const plan = yahooPlan(interval);
  const u = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ys)}`);
  u.searchParams.set('interval', plan.apiInterval);
  u.searchParams.set('range', plan.range);
  u.searchParams.set('includePrePost', 'false');
  u.searchParams.set('events', 'div,splits');
  const r = await fetch(u.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 TradeXAI/1.0' },
    cf: { cacheTtl: 20, cacheEverything: false }
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.chart?.result?.[0]) {
    const msg = data?.chart?.error?.description || `Yahoo Finance veri hatası (${r.status})`;
    throw Object.assign(new Error(msg), { status: r.status || 502 });
  }
  const result = data.chart.result[0];
  const q = result.indicators?.quote?.[0] || {};
  const ts = result.timestamp || [];
  let rows = ts.map((t, i) => ({
    time: new Date(t * 1000).toISOString(),
    open: Number(q.open?.[i]), high: Number(q.high?.[i]), low: Number(q.low?.[i]),
    close: Number(q.close?.[i]), volume: Number(q.volume?.[i] || 0)
  })).filter(x => Number.isFinite(x.close));
  rows = aggregateRows(rows, plan.aggregate);
  const lim = Math.max(2, Math.min(Number(limit) || 200, 500));
  if (rows.length > lim) rows = rows.slice(-lim);
  return { meta: result.meta || {}, rows, yahooSymbol: ys };
}

async function yahooQuote(market, symbol) {
  const { meta, rows } = await yahooChart(market, symbol, '1d', 8);
  const last = rows[rows.length - 1];
  if (!last) throw Object.assign(new Error('Fiyat verisi bulunamadı'), { status: 404 });
  const price = Number(meta.regularMarketPrice ?? last.close);
  const prev = Number(meta.chartPreviousClose ?? meta.previousClose);
  const pct = Number.isFinite(prev) && prev !== 0 ? ((price - prev) / prev) * 100 : 0;
  return {
    price, change_percent: pct,
    open: Number.isFinite(last.open) ? last.open : price,
    high: Number.isFinite(last.high) ? last.high : price,
    low: Number.isFinite(last.low) ? last.low : price,
    volume: Number(last.volume || 0),
    currency: meta.currency || (market === 'bist' ? 'TRY' : 'USD'),
    exchange: meta.exchangeName || '', source: 'Yahoo Finance / Cloudflare'
  };
}

async function callMarketData(env, path, params = {}) {
  const base = String(env.BLOOMBERG_UPSTREAM_URL || '').replace(/\/$/, '');
  if (base) {
    const u = new URL(base + path);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    const headers = { Accept: 'application/json' };
    if (env.BLOOMBERG_UPSTREAM_TOKEN) headers.Authorization = `Bearer ${env.BLOOMBERG_UPSTREAM_TOKEN}`;
    const r = await fetch(u, { headers, cf: { cacheTtl: 0, cacheEverything: false } });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { message: text || 'Geçersiz upstream yanıtı' }; }
    if (!r.ok) throw Object.assign(new Error(data.message || data.error || `Piyasa veri kaynağı hatası (${r.status})`), { status: r.status });
    return data.data ?? data;
  }
  if (path === '/quote') return yahooQuote(params.market, params.symbol);
  if (path === '/series') { const { rows } = await yahooChart(params.market, params.symbol, params.interval, params.limit); return rows; }
  throw Object.assign(new Error('Desteklenmeyen piyasa veri isteği'), { status: 400 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const isApiPath = path === '/health' || path === '/quote' || path === '/series' || path.startsWith('/auth/') || path.startsWith('/billing/');
    if (!isApiPath) return env.ASSETS.fetch(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });

    try {
      if (path.startsWith('/billing/')) return handleBilling(request, env, url);

      if (path === '/health') {
        return json(request, {
          ok: true, service: 'TradeX AI Worker', marketDataReady: true,
          marketDataSource: env.BLOOMBERG_UPSTREAM_URL ? 'configured-upstream' : 'yahoo-finance-fallback',
          upstreamConfigured: !!env.BLOOMBERG_UPSTREAM_URL,
          authDatabaseConfigured: !!env.DB, authMode: env.DB ? 'd1' : 'local', apiAuthRequired: !!env.DB,
          billingProvider: 'iyzico',
          billingConfigured: !!env.IYZICO_API_KEY && !!env.IYZICO_SECRET_KEY && !!env.IYZICO_PLAN_STARTER && !!env.IYZICO_PLAN_PRO && !!env.IYZICO_PLAN_BUSINESS,
          assets: true, time: new Date().toISOString()
        });
      }

      if (path === '/auth/register' && request.method === 'POST') return authRegister(request, env);
      if (path === '/auth/login' && request.method === 'POST') return authLogin(request, env);
      if (path === '/auth/logout' && request.method === 'POST') return authLogout(request, env);
      if (path === '/auth/me' && request.method === 'GET') {
        if (!env.DB) return json(request, { ok: false, error: 'Yerel giriş modu aktif', localAuth: true }, 503);
        const user = await getSessionUser(request, env);
        return user ? json(request, { ok: true, user }) : json(request, { ok: false, error: 'Oturum yok' }, 401);
      }
      if (path.startsWith('/auth/')) return json(request, { ok: false, error: 'Method not allowed' }, 405);
      if (request.method !== 'GET') return json(request, { ok: false, error: 'Method not allowed' }, 405);

      if (env.DB) {
        const user = await getSessionUser(request, env);
        if (!user) return json(request, { ok: false, error: 'Giriş gerekli' }, 401);
      }

      if (path === '/quote') {
        const market = url.searchParams.get('market'), symbol = url.searchParams.get('symbol');
        if (!market || !symbol) return json(request, { ok: false, error: 'market ve symbol gerekli' }, 400);
        if (!['bist', 'us'].includes(market)) return json(request, { ok: false, error: 'Bu uç BIST/ABD içindir' }, 400);
        return json(request, { ok: true, data: await callMarketData(env, '/quote', { market, symbol }) });
      }

      if (path === '/series') {
        const market = url.searchParams.get('market'), symbol = url.searchParams.get('symbol');
        const interval = url.searchParams.get('interval') || '1d', limit = url.searchParams.get('limit') || '200';
        if (!market || !symbol) return json(request, { ok: false, error: 'market ve symbol gerekli' }, 400);
        if (!['bist', 'us'].includes(market)) return json(request, { ok: false, error: 'Bu uç BIST/ABD içindir' }, 400);
        return json(request, { ok: true, data: await callMarketData(env, '/series', { market, symbol, interval, limit }) });
      }

      return json(request, { ok: false, error: 'Not found' }, 404);
    } catch (err) {
      return json(request, { ok: false, error: err.message || 'Worker hatası' }, Number(err.status) || 500);
    }
  }
};
