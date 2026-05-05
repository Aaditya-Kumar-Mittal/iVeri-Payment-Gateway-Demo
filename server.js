/**
 * iVeri Nedbank Enterprise – Pre-Authorization Demo
 * Backend proxy to avoid CORS issues when calling the iVeri gateway from a browser.
 *
 * Start: npm install && npm start
 * Opens on: http://localhost:3000
 */

const express = require('express');
const axios   = require('axios');
const cors    = require('cors');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = 3000;

/* ── Middleware ──────────────────────────────────────────────────── */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // serve index.html

/* ── iVeri gateway endpoints by acquirer ─────────────────────────── */
const GATEWAY_URLS = {
  nedbank : 'https://portal.nedsecure.co.za/api/transactions',
  csc     : 'https://portal.cscacquiring.com/api/transactions',
  cbz     : 'https://portal.host.iveri.com/api/transactions',
  fnb     : 'https://portal.fnb.iveri.com/api/transactions',
};

/* ── Proxy route ─────────────────────────────────────────────────── */
app.post('/api/iveri', async (req, res) => {
  const acquirer = (req.query.acquirer || 'nedbank').toLowerCase();
  const gwUrl    = GATEWAY_URLS[acquirer] || GATEWAY_URLS.nedbank;

  console.log('\n─────────────────────────────────────────');
  console.log('[REQUEST →]', gwUrl);
  console.log(JSON.stringify(req.body, null, 2));

  /* ── Build gateway request headers ─────────────────────────────── */
  const gwHeaders = {
    'Content-Type': 'application/json',
    'Accept'      : 'application/json',
  };

  const authSecret = req.headers['x-iveri-auth-secret'];
  const certId     = req.headers['x-iveri-cert-id'];

  if (authSecret && certId) {
    // AuthenticationKey: "certificateid {base64(certId)}"
    const authKey = `certificateid ${Buffer.from(certId, 'utf8').toString('base64')}`;

    // AuthenticationToken: HMAC-SHA256 hex of (timestamp + resource + queryString + data)
    // Implementation matches iVeri C# reference: time+resource+queryString+data concatenated as UTF-8 bytes
    const timestamp   = Math.floor(Date.now() / 1000).toString();
    const resource    = gwUrl;
    const queryString = '';
    const data        = JSON.stringify(req.body);

    const source = Buffer.concat([
      Buffer.from(timestamp,   'utf8'),
      Buffer.from(resource,    'utf8'),
      Buffer.from(queryString, 'utf8'),
      Buffer.from(data,        'utf8'),
    ]);

    const hmac      = crypto.createHmac('sha256', Buffer.from(authSecret, 'ascii'));
    const authToken = hmac.update(source).digest('hex');

    gwHeaders['AuthenticationKey']   = authKey;
    gwHeaders['AuthenticationToken'] = authToken;

    console.log('[DIGEST AUTH] AuthenticationKey:', authKey);
    console.log('[DIGEST AUTH] AuthenticationToken:', authToken);
  }

  try {
    const response = await axios.post(gwUrl, req.body, {
      headers: gwHeaders,
      timeout: 30000,
    });

    console.log('[RESPONSE ←]');
    console.log(JSON.stringify(response.data, null, 2));
    res.json(response.data);

  } catch (err) {
    const errBody = err.response?.data || { error: err.message };
    console.error('[ERROR]', err.message);
    res.status(err.response?.status || 500).json(errBody);
  }
});

/* ── Start ───────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n✅  iVeri Pre-Auth Demo running at  http://localhost:${PORT}\n`);
});
