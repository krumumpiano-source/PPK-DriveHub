export function generateUUID() {
  return crypto.randomUUID();
}

export function now() {
  return new Date().toISOString();
}

// PBKDF2-SHA256, 100k iterations — OWASP recommended minimum for password storage
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

// Timing-safe comparison to prevent side-channel attacks
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

const PERMISSION_LEVELS = { view: 1, create: 2, edit: 3, delete: 4 };

// Hierarchical: view < create < edit < delete — having 'edit' implies 'create' and 'view'
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

// R2 is optional — returns empty string if bucket not bound (local dev / free tier)
export async function uploadToR2(env, base64Data, fileName, folder, mimeType = 'image/jpeg') {
  if (!env.STORAGE || !base64Data) return '';

  const clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const key = `${folder}/${dateStr}_${generateUUID()}.${ext}`;

  await env.STORAGE.put(key, bytes.buffer, {
    httpMetadata: { contentType: mimeType }
  });

  return `/api/files/${key}`;
}

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

export async function createNotification(db, userId, type, title, message) {
  try {
    await dbRun(db,
      `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [generateUUID(), userId || null, type, title, message, now()]
    );
  } catch {
    // Notification failures should not crash the main request
  }
}

export async function notifyAllAdmins(db, type, title, message) {
  try {
    const admins = await dbAll(db,
      "SELECT id FROM users WHERE role IN ('admin','super_admin') AND active = 1"
    );
    for (const admin of admins) {
      await createNotification(db, admin.id, type, title, message);
    }
  } catch { /* non-critical */ }
}

export function validatePasswordComplexity(password) {
  if (!password || password.length < 8) return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
  if (!/[a-zA-Z]/.test(password)) return 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว';
  if (!/[0-9]/.test(password)) return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว';
  return null;
}

export async function checkPasswordReuse(db, userId, newPassword, limit = 5) {
  const history = await dbAll(db,
    'SELECT password_hash, salt FROM password_history WHERE user_id = ? ORDER BY changed_at DESC LIMIT ?',
    [userId, limit]
  );
  for (const h of history) {
    const match = await verifyPassword(newPassword, h.salt, h.password_hash);
    if (match) return true;
  }
  return false;
}
