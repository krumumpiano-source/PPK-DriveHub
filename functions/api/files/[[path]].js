// File storage proxy (R2)
import {
  success, error, parseBody, requirePermission, uploadToR2
} from '../../_helpers.js';

const FOLDER_MODULE = {
  FUEL: 'fuel',
  REPAIR: 'repair',
  VEHICLES: 'vehicles',
  DRIVERS: 'drivers',
  TAX: 'tax',
  INSURANCE: 'insurance',
  CHECK: 'check',
  SIGNATURES: 'queue'
};

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);

  if (path === '/api/files/upload' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.base64 || !body?.mime) return error('กรุณาส่ง base64 และ mime type');
    const folder = body.folder || 'MISC';
    const mod = FOLDER_MODULE[folder.toUpperCase()];
    if (mod) { try { requirePermission(user, mod, 'create'); } catch { return error('ไม่มีสิทธิ์อัปโหลดไฟล์', 403); } }
    const ext = body.mime.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
    const filename = body.filename || `file_${Date.now()}.${ext}`;
    const r2Url = await uploadToR2(env, body.base64, filename, folder, body.mime);
    if (!r2Url) return error('ไม่สามารถอัปโหลดไฟล์ได้ (R2 storage not configured or failed)');
    return success({ url: r2Url, filename });
  }

  if (method === 'GET' && path.startsWith('/api/files/')) {
    const key = decodeURIComponent(path.replace('/api/files/', ''));
    if (!key) return error('กรุณาระบุ key');
    const keyFolder = key.split('/')[0].toUpperCase();
    const mod = FOLDER_MODULE[keyFolder];
    if (mod) { try { requirePermission(user, mod, 'view'); } catch { return error('ไม่มีสิทธิ์เข้าถึงไฟล์', 403); } }

    if (!env.STORAGE) {
      return error('ระบบจัดเก็บไฟล์ (Cloudflare R2) ยังไม่ได้เปิดใช้งาน', 503);
    }

    let obj;
    try {
      obj = await env.STORAGE.get(key);
    } catch { return error('ไม่สามารถเข้าถึงไฟล์ได้', 500); }

    if (!obj) return error('ไม่พบไฟล์', 404);

    const contentType = obj.httpMetadata?.contentType || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
    };

    return new Response(obj.body, { status: 200, headers });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}