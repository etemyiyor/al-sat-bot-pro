const { cors, cfg } = require('./_shared');

module.exports = async function handler(req, res) {
  if (cors(req, res)) return;
  const { base, mode } = cfg();
  res.status(200).json({
    ok: true,
    service: 'AL-SAT BOT PRO Bloomberg Backend',
    mode,
    upstreamConfigured: !!base,
    time: new Date().toISOString()
  });
};
