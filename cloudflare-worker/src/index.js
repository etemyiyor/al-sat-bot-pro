const ALLOWED_ORIGINS = new Set([
  'https://etemyiyor.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const h = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (ALLOWED_ORIGINS.has(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

async function callUpstream(env, path, params = {}) {
  const base = String(env.BLOOMBERG_UPSTREAM_URL || '').replace(/\/$/, '');
  if (!base) throw Object.assign(new Error('Bloomberg upstream yapılandırılmadı. BLOOMBERG_UPSTREAM_URL gerekli.'), { status: 503 });
  const u = new URL(base + path);
  for (const [k,v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
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
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
    if (request.method !== 'GET') return json(request, { ok: false, error: 'Method not allowed' }, 405);

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/' || path === '/health') {
        return json(request, {
          ok: true,
          service: 'AL-SAT BOT PRO Bloomberg Worker',
          upstreamConfigured: !!env.BLOOMBERG_UPSTREAM_URL,
          mode: env.BLOOMBERG_MODE || 'gateway',
          time: new Date().toISOString()
        });
      }

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
      return json(request, { ok: false, error: err.message || 'Bloomberg Worker hatası' }, Number(err.status) || 500);
    }
  }
};
