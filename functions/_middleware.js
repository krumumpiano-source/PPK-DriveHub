import { error, dbFirst } from './_helpers.js';

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/setup',
  '/api/check/daily',           // QR ตรวจสภาพ+แจ้งซ่อม
  '/api/usage/record',          // QR บันทึกใช้รถ
  '/api/fuel/record',           // QR เติมน้ำมัน
  '/api/vehicles/qr-info',      // QR โหลดข้อมูลรถ (ไม่ต้อง login)
];

const ALLOWED_ORIGINS = [
  'https://ppk-drivehub.pages.dev',
  'http://localhost:8788',         // wrangler dev
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',  // replaced at runtime by addCors()
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://generativelanguage.googleapis.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:"
].join('; ');

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  // Static files — pass through with CSP
  if (!url.pathname.startsWith('/api/')) {
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', CSP);
    return new Response(response.body, { status: response.status, headers });
  }

  // Check if path is public
  const isPublic = PUBLIC_PATHS.some(p =>
    url.pathname === p || url.pathname.startsWith(p + '/')
  );

  if (!isPublic) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return addCors(error('กรุณาเข้าสู่ระบบ', 401), request);
    }

    const token = authHeader.slice(7);
    try {
      const session = await dbFirst(env.DB,
        `SELECT s.*, u.role, u.display_name, u.first_name, u.last_name,
                u.id AS user_id, u.active, u.permissions, u.must_change_password
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = ? AND s.expires_at > ?`,
        [token, new Date().toISOString()]
      );

      if (!session) {
        return addCors(error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่', 401), request);
      }

      if (!session.active) {
        return addCors(error('บัญชีถูกระงับการใช้งาน', 403), request);
      }

      env.user = {
        id: session.user_id,
        role: session.role,
        displayName: session.display_name || `${session.first_name} ${session.last_name}`,
        sessionId: session.id,
        permissions: session.permissions || '{}',
        mustChangePassword: session.must_change_password === 1,
        isImpersonated: session.is_impersonated === 1,
        impersonatorId: session.impersonator_id || null
      };
    } catch (e) {
      return addCors(error('เกิดข้อผิดพลาดในการตรวจสอบ session', 500), request);
    }
  }

  // Impersonation: enforce read-only (GET only) except stop-impersonate
  if (env.user?.isImpersonated && request.method !== 'GET') {
    if (url.pathname !== '/api/admin/stop-impersonate') {
      return addCors(error('โหมดดูอย่างเดียว — ไม่สามารถแก้ไขข้อมูลได้', 403), request);
    }
  }

  try {
    const response = await next();
    return addCors(response, request);
  } catch (e) {
    return addCors(error('Internal Server Error', 500), request);
  }
}

function corsHeaders(request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': CORS_HEADERS['Access-Control-Allow-Methods'],
    'Access-Control-Allow-Headers': CORS_HEADERS['Access-Control-Allow-Headers'],
    'Access-Control-Max-Age': CORS_HEADERS['Access-Control-Max-Age']
  };
}

function addCors(response, request) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(request);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, headers });
}
