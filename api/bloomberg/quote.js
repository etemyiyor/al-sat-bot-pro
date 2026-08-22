const { cors, upstream, sendError } = require('./_shared');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const { market, symbol } = req.query || {};
  if (!market || !symbol) return res.status(400).json({ ok: false, error: 'market ve symbol gerekli' });
  try {
    const data = await upstream('/quote', { market, symbol });
    res.status(200).json({ ok: true, data });
  } catch (err) {
    sendError(res, err);
  }
};
