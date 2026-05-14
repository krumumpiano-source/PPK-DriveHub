// Auth: login, register, password management
import {
  dbFirst, dbRun, dbAll, generateUUID, now, success, error,
  parseBody, hashPassword, verifyPassword, generateSalt, generateToken,
  writeAuditLog, validatePasswordComplexity, checkPasswordReuse,
  sendTelegramMessage, notifyAllAdmins
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.username || !body?.password) return error('กรุณากรอก username และ password');

    const user = await dbFirst(env.DB,
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND active = 1',
      [body.username, body.username]
    );
    if (!user) return error('username/email หรือ password ไม่ถูกต้อง', 401);

    const valid = await verifyPassword(body.password, user.salt, user.password_hash);
    if (!valid) return error('username/email หรือ password ไม่ถูกต้อง', 401);

    // Create session (8 hours)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    await dbRun(env.DB,
      'INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [generateUUID(), user.id, token, expiresAt, now()]
    );

    // Update last login
    await dbRun(env.DB, 'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?',
      [now(), now(), user.id]);

    await writeAuditLog(env.DB, user.id, user.username, 'login', 'auth', user.id, null);

    return success({
      token,
      user_id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      permissions: JSON.parse(user.permissions || '{}'),
      must_change_password: user.must_change_password === 1,
      pdpa_accepted: user.pdpa_accepted === 1
    });
  }

  if (path === '/api/auth/register' && method === 'POST') {
    const raw = await parseBody(request);
    const body = (raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object') ? raw.data : raw;

    if (!body?.email) return error('กรุณากรอก email');

    const hasFirstLast = !!(body.first_name && body.last_name);
    const hasFullName = !!(body.full_name || body.fullName || body.name);
    if (!hasFirstLast && !hasFullName) return error('กรุณากรอกชื่อ-นามสกุล');

    if (!body?.password) return error('กรุณาตั้งรหัสผ่าน');

    const email = String(body.email).trim();
    const fullName = String(body.full_name || body.fullName || body.name || '').trim();
    const firstName = String(body.first_name || '').trim();
    const lastName = String(body.last_name || '').trim();
    const title = String(body.title || '').trim();
    const department = String(body.department || '').trim();
    const phone = String(body.phone || '').trim();
    const reason = String(body.reason || '').trim();

    const cleanName = hasFirstLast ? `${firstName} ${lastName}`.trim() : fullName;

    // Check email not already in use
    const existingUser = await dbFirst(env.DB, 'SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) return error('ไม่สามารถใช้ email นี้ได้ หาก email นี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ', 409);

    // Validate and hash password
    const complexityErr = validatePasswordComplexity(body.password);
    if (complexityErr) return error(complexityErr);
    const pwSalt = generateSalt();
    const pwHash = await hashPassword(body.password, pwSalt);

    // Build name parts
    const nameParts = cleanName.split(/\s+/);
    const fnFirst = hasFirstLast ? firstName : (nameParts[0] || cleanName);
    const fnLast = hasFirstLast ? lastName : (nameParts.slice(1).join(' ') || '');
    const displayName = (title ? title : '') + cleanName;
    const userId = generateUUID();
    const ts = now();

    // Viewer permissions — view all modules, no edit
    const viewerPerms = JSON.stringify({ queue: 'view', usage_log: 'view', vehicles: 'view', fuel: 'view', repair: 'view', drivers: 'view', reports: 'view' });

    await dbRun(env.DB,
      `INSERT INTO users (id, username, email, password_hash, salt, role, permissions, title, first_name, last_name, display_name, phone, active, pdpa_accepted, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'viewer', ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)`,
      [userId, email, email, pwHash, pwSalt, viewerPerms,
       title || null, fnFirst, fnLast, displayName, phone || null, ts, ts]
    );

    const displayForNotify = title ? `${title}${cleanName}` : cleanName;
    await notifyAllAdmins(env.DB, 'system', 'สมาชิกใหม่ลงทะเบียน',
      `${displayForNotify} (${email}) สมัครเข้าใช้งานสำเร็จ สิทธิ์เริ่มต้น: ผู้ขอใช้รถ`);
    await sendTelegramMessage(env,
      `👤 <b>สมาชิกใหม่</b>\n📛 ${displayForNotify}\n📧 ${email}\n🏢 ${department || '-'}\n📞 ${phone || '-'}\n📝 ${reason || '-'}\n✅ เข้าระบบได้ทันที (สิทธิ์: ผู้ขอใช้รถ)`);

    return success({ message: 'สมัครสมาชิกสำเร็จ เข้าสู่ระบบได้ทันทีด้วยอีเมลและรหัสผ่านที่ตั้งไว้' });
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      await dbRun(env.DB, 'DELETE FROM sessions WHERE token = ?', [token]);
    }
    return success({ message: 'ออกจากระบบเรียบร้อย' });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    if (!env.user) return error('กรุณาเข้าสู่ระบบ', 401);
    const user = await dbFirst(env.DB,
      'SELECT id, username, email, role, permissions, title, first_name, last_name, display_name, phone, profile_image, driver_id, pdpa_accepted, must_change_password, last_login FROM users WHERE id = ?',
      [env.user.id]
    );
    if (!user) return error('ไม่พบข้อมูลผู้ใช้', 404);
    return success({ ...user, permissions: JSON.parse(user.permissions || '{}') });
  }

  if (path === '/api/auth/change-password' && method === 'POST') {
    if (!env.user) return error('กรุณาเข้าสู่ระบบ', 401);
    const body = await parseBody(request);
    if (!body?.new_password) return error('กรุณาระบุรหัสผ่านใหม่');
    if (!body?.old_password) return error('กรุณาระบุรหัสผ่านเดิม');

    // Password complexity validation
    const complexityErr = validatePasswordComplexity(body.new_password);
    if (complexityErr) return error(complexityErr);

    const user = await dbFirst(env.DB, 'SELECT * FROM users WHERE id = ?', [env.user.id]);

    // Verify old password — always required
    const valid = await verifyPassword(body.old_password, user.salt, user.password_hash);
    if (!valid) return error('รหัสผ่านเดิมไม่ถูกต้อง');

    // Check password reuse
    const reused = await checkPasswordReuse(env.DB, user.id, body.new_password);
    if (reused) return error('รหัสผ่านนี้เคยใช้แล้ว กรุณาตั้งรหัสผ่านใหม่ที่ไม่ซ้ำกับ 5 ครั้งหลังสุด');

    const salt = generateSalt();
    const hash = await hashPassword(body.new_password, salt);

    // Save old password to history
    await dbRun(env.DB,
      'INSERT INTO password_history (id, user_id, password_hash, salt, changed_at) VALUES (?, ?, ?, ?, ?)',
      [generateUUID(), user.id, user.password_hash, user.salt, now()]
    );

    await dbRun(env.DB,
      'UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
      [hash, salt, now(), user.id]
    );

    await writeAuditLog(env.DB, user.id, user.username, 'change_password', 'auth', user.id, null);
    return success({ message: 'เปลี่ยนรหัสผ่านเรียบร้อย' });
  }

  if (path === '/api/auth/forgot-password' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.email) return error('กรุณาระบุ email');
    const user = await dbFirst(env.DB, 'SELECT id, email, first_name FROM users WHERE email = ?', [body.email]);
    // Don't reveal if email exists
    if (!user) return success({ message: 'ถ้า email นี้มีในระบบ จะได้รับลิงก์รีเซ็ตรหัสผ่านทางอีเมล' });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    await dbRun(env.DB,
      `INSERT INTO reset_password_requests (id, user_id, email, token, expires_at, used, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [generateUUID(), user.id, user.email, token, expiresAt, now()]
    );

    return success({ message: 'ถ้า email นี้มีในระบบ จะได้รับลิงก์รีเซ็ตรหัสผ่านทางอีเมล' });
  }

  if (path === '/api/auth/reset-password' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.token || !body?.new_password) return error('กรุณาระบุ token และรหัสผ่านใหม่');

    const complexityErr = validatePasswordComplexity(body.new_password);
    if (complexityErr) return error(complexityErr);

    const req = await dbFirst(env.DB,
      'SELECT * FROM reset_password_requests WHERE token = ? AND used = 0 AND expires_at > ?',
      [body.token, new Date().toISOString()]
    );
    if (!req) return error('Token ไม่ถูกต้องหรือหมดอายุแล้ว', 400);

    const salt = generateSalt();
    const hash = await hashPassword(body.new_password, salt);

    await dbRun(env.DB,
      'UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
      [hash, salt, now(), req.user_id]
    );
    await dbRun(env.DB,
      'UPDATE reset_password_requests SET used = 1 WHERE id = ?', [req.id]
    );

    return success({ message: 'รีเซ็ตรหัสผ่านเรียบร้อย กรุณาเข้าสู่ระบบด้วยรหัสใหม่' });
  }

  if (path === '/api/auth/accept-pdpa' && method === 'POST') {
    if (!env.user) return error('กรุณาเข้าสู่ระบบ', 401);
    await dbRun(env.DB,
      'UPDATE users SET pdpa_accepted = 1, pdpa_accepted_at = ?, updated_at = ? WHERE id = ?',
      [now(), now(), env.user.id]
    );
    return success({ message: 'ยอมรับนโยบาย PDPA เรียบร้อย' });
  }

  if (path === '/api/auth/profile' && method === 'PUT') {
    if (!env.user) return error('กรุณาเข้าสู่ระบบ', 401);
    const body = await parseBody(request);
    const allowed = ['title', 'first_name', 'last_name', 'phone'];
    const updates = [];
    const params = [];
    for (const field of allowed) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');

    if (body.first_name || body.last_name) {
      const user = await dbFirst(env.DB, 'SELECT first_name, last_name FROM users WHERE id = ?', [env.user.id]);
      const fn = body.first_name || user.first_name;
      const ln = body.last_name || user.last_name;
      updates.push('display_name = ?');
      params.push(`${fn} ${ln}`);
    }

    updates.push('updated_at = ?');
    params.push(now(), env.user.id);
    await dbRun(env.DB, `UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตโปรไฟล์เรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}