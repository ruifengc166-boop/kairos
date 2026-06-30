'use strict';

const { readQuickTiming } = require('../src/kairos-timing-engine');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    let body = req.body;

    if (!body || typeof body === 'string') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf8');
      body = raw ? JSON.parse(raw) : {};
    }

    const reading = readQuickTiming({
      domain: body.domain,
      recentSignal: body.recentSignal,
      action: body.action,
      feeling: body.feeling,
      questionTime: body.questionTime || new Date().toISOString(),
      timezone: body.timezone,
    });

    sendJson(res, 200, { ok: true, reading });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error.message || 'Unable to read timing.',
    });
  }
};
