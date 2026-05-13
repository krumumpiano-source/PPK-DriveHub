// Google Service Account auth helper for Cloudflare Workers / Pages Functions
// ใช้ Web Crypto API (RS256 / SHA-256 with RSA) — ไม่ต้องพึ่งไลบรารี Node

// แปลง PEM private key → CryptoKey object
async function importPrivateKey(pem) {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(cleaned), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

// base64url encode (no padding)
function b64url(buf) {
  let str;
  if (typeof buf === 'string') {
    str = btoa(unescape(encodeURIComponent(buf)));
  } else {
    str = btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  return str.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// สร้าง JWT แล้วแลก access_token จาก Google OAuth2
// คืน { access_token, expires_in }
export async function getGoogleAccessToken(serviceAccountJson, scope) {
  let sa;
  try {
    sa = typeof serviceAccountJson === 'string'
      ? JSON.parse(serviceAccountJson)
      : serviceAccountJson;
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON ไม่ใช่ JSON ที่ถูกต้อง: ' + e.message);
  }
  if (!sa.client_email || !sa.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON ขาด client_email หรือ private_key');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;

  const key = await importPrivateKey(sa.private_key.replace(/\\n/g, '\n'));
  const sigBuf = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(data)
  );
  const jwt = `${data}.${b64url(sigBuf)}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(`Google OAuth2 error: ${json.error || ''} ${json.error_description || ''}`);
  }
  return json;
}

// อ่านข้อมูลจาก Google Sheets API v4
// range เช่น "Form_Responses1!A:H"
export async function readSheet(accessToken, spreadsheetId, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(`Sheets API error (${spreadsheetId}): ${json.error?.message || resp.status}`);
  }
  return json.values || [];
}
