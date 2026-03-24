// PPK DriveHub — Shared Helpers
// D1 queries, PBKDF2 auth, R2 file storage, permission checks

// ============================================================
// UUID & Time
// ============================================================

export function generateUUID() {
  return crypto.randomUUID();
}

export function now() {
  return new Date().toISOString();
}

// ============================================================
// Password (PBKDF2-SHA256, 100k iterations)
// ============================================================

export async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function verifyPassword(password, salt, hash) {
  const computed = await hashPassword(password, salt);
  if (computed.length !== hash.length) return false;
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

export function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

export function generateToken() {
  return generateUUID() + '-' + generateUUID();
}

// ============================================================
// HTTP Response helpers
// ============================================================

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function success(data, status = 200) {
  return json({ success: true, data }, status);
}

export function error(message, status = 400) {
  return json({ success: false, error: message }, status);
}

export async function parseBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// ============================================================
// D1 Query helpers — always parameterized
// ============================================================

export async function dbAll(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.all();
  return result.results || [];
}

export async function dbFirst(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params);
  return await stmt.first();
}

export async function dbRun(db, sql, params = []) {
  const stmt = db.prepare(sql).bind(...params);
  return await stmt.run();
}

// ============================================================
// Pagination
// ============================================================

export function paginate(url) {
  const u = typeof url === 'string' ? new URL(url) : url;
  const page = Math.max(1, parseInt(u.searchParams.get('page') || '1'));
  const limit = Math.min(200, Math.max(1, parseInt(u.searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function extractParam(pathname, prefix) {
  const rest = pathname.slice(prefix.length);
  const slash = rest.indexOf('/');
  return slash === -1 ? rest : rest.slice(0, slash);
}

// ============================================================
// Permission checks
// ============================================================

const PERMISSION_LEVELS = { view: 1, create: 2, edit: 3, delete: 4 };

/**
 * Check if user has required permission level for a module.
 * Admins bypass all checks.
 * @param {object} user - env.user from middleware
 * @param {string} module - 'queue'|'fuel'|'repair'|'vehicles'|'drivers'|'reports'|'usage_log'
 * @param {string} level  - 'view'|'create'|'edit'|'delete'
 */
export function checkPermission(user, module, level) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;

  try {
    const perms = typeof user.permissions === 'string'
      ? JSON.parse(user.permissions)
      : (user.permissions || {});
    const userLevel = perms[module];
    if (!userLevel) return false;
    return (PERMISSION_LEVELS[userLevel] || 0) >= (PERMISSION_LEVELS[level] || 0);
  } catch {
    return false;
  }
}

export function requirePermission(user, module, level) {
  if (!checkPermission(user, module, level)) {
    throw new PermissionError(`ไม่มีสิทธิ์เข้าถึง (${module}:${level})`);
  }
}

export function requireAdmin(user) {
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    throw new PermissionError('ต้องเป็น Admin เท่านั้น');
  }
}

class PermissionError extends Error {
  constructor(msg) { super(msg); this.status = 403; }
}

// ============================================================
// Cloudflare R2 File Storage
// ============================================================

/**
 * Upload a base64-encoded file to R2.
 * @param {object} env         - Cloudflare env with STORAGE binding
 * @param {string} base64Data  - base64 string (without data: prefix)
 * @param {string} fileName    - original file name
 * @param {string} folder      - prefix: 'FUEL'|'REPAIR'|'CHECK'|'TAX'|'INSURANCE'|'VEHICLES'|'DRIVERS'
 * @param {string} mimeType    - e.g. 'image/jpeg'
 * @returns {{ key: string, url: string }}
 */
export async function uploadToR2(env, base64Data, fileName, folder, mimeType = 'image/jpeg') {
  // R2 is optional — if bucket not configured, skip silently
  if (!env.STORAGE) return '';
  if (!base64Data) return '';

  // Strip data URL prefix if present
  const clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  // Decode base64 → binary
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Build R2 key: FOLDER/YYYYMMDD_uuid.ext
  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const key = `${folder}/${dateStr}_${generateUUID()}.${ext}`;

  await env.STORAGE.put(key, bytes.buffer, {
    httpMetadata: { contentType: mimeType }
  });

  return `/api/files/${key}`;
}

// ============================================================
// Audit Log
// ============================================================

export async function writeAuditLog(db, userId, username, action, module, entityId, details) {
  try {
    await dbRun(db,
      `INSERT INTO audit_log (id, user_id, username, action, module, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateUUID(), userId || null, username || null, action, module || null, entityId || null,
       details ? JSON.stringify(details) : null, now()]
    );
  } catch {
    // Audit log failures should not crash the main request
  }
}

// ============================================================
// Telegram notifications
// ============================================================

export async function sendTelegramMessage(env, message) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
  } catch {
    // Telegram failures are non-critical
  }
}
