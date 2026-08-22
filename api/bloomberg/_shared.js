const ALLOWED_ORIGINS = new Set([
  'https://etemyiyor.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

function cfg() {
  return {
    base: (process.env.BLOOMBERG_UPSTREAM_URL || '').replace(/\/$/, ''),
    token: process.env.BLOOMBERG_UPSTREAM_TOKEN || '',
    mode: process.env.BLOOMBERG_MODE || 'gateway'
  };
}

async function upstream(path, params = {}) {
  const { base, token } = cfg();
  if (!base) {
    const err = new Error('Bloomberg upstream yapılandırılmadı. BLOOMBERG_UPSTREAM_URL gerekli.');
    err.status = 503;
    throw err;
  }
  const u = new URL(base + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  }
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(u, { headers, cache: 'no-store' });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text || 'Geçersiz upstream yanıtı' }; }
  if (!r.ok) {
    const err = new Error(data.message || data.error || `Bloomberg upstream hatası (${r.status})`);
    err.status = r.status;
    throw err;
  }
  return data.data ?? data;
}

function sendError(res, err) {
  const status = Number(err.status) || 500;
  res.status(status).json({ ok: false, error: err.message || 'Bloomberg backend hatası' });
}

module.exports = { cors, cfg, upstream, sendError };
