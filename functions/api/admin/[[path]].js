// Admin: users, settings, requests
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, hashPassword, generateSalt, requireAdmin,
  extractParam, writeAuditLog, validatePasswordComplexity,
  sendTelegramMessage, createNotification
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  try { requireAdmin(user); } catch { return error('ต้องเป็น Admin เท่านั้น', 403); }


  if (path === '/api/admin/users' && method === 'GET') {
    const includeInactive = url.searchParams.get('include_inactive') === 'true';
    const sql = includeInactive
      ? 'SELECT id, username, email, role, permissions, title, first_name, last_name, display_name, phone, active, driver_id, last_login, created_at FROM users ORDER BY created_at DESC'
      : 'SELECT id, username, email, role, permissions, title, first_name, last_name, display_name, phone, active, driver_id, last_login, created_at FROM users WHERE active = 1 ORDER BY created_at DESC';
    const users = await dbAll(env.DB, sql);
    return success(users.map(u => ({ ...u, permissions: JSON.parse(u.permissions || '{}') })));
  }

  if (path.startsWith('/api/admin/users/') && method === 'PUT' && !path.includes('/deactivate') && !path.includes('/reset-password')) {
    const id = extractParam(path, '/api/admin/users/');
    const body = await parseBody(request);

    // Super admin protection: only super_admin can modify another super_admin
    const targetUser = await dbFirst(env.DB, 'SELECT role FROM users WHERE id = ?', [id]);
    if (targetUser?.role === 'super_admin' && user.role !== 'super_admin') {
      return error('ไม่สามารถแก้ไขผู้ดูแลสูงสุดได้', 403);
    }

    const allowed = ['role', 'permissions', 'title', 'first_name', 'last_name', 'phone', 'email', 'active', 'driver_id'];
    const updates = [];
    const params = [];
    for (const field of allowed) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(field === 'permissions' ? JSON.stringify(body[field]) : body[field]);
      }
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?');
    params.push(now(), id);
    await dbRun(env.DB, `UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    await writeAuditLog(env.DB, user.id, user.displayName, 'update_user', 'admin', id, body);
    return success({ message: 'อัปเดตข้อมูลผู้ใช้เรียบร้อย' });
  }

  if (path.match(/\/api\/admin\/users\/[^/]+\/deactivate/) && method === 'PUT') {
    const id = path.split('/')[4];
    const body = await parseBody(request);

    // Super admin protection
    const targetUser = await dbFirst(env.DB, 'SELECT role FROM users WHERE id = ?', [id]);
    if (targetUser?.role === 'super_admin' && user.role !== 'super_admin') {
      return error('ไม่สามารถระงับผู้ดูแลสูงสุดได้', 403);
    }

    await dbRun(env.DB,
      'UPDATE users SET active = 0, updated_at = ? WHERE id = ?', [now(), id]
    );
    // Invalidate all sessions
    await dbRun(env.DB, 'DELETE FROM sessions WHERE user_id = ?', [id]);
    await writeAuditLog(env.DB, user.id, user.displayName, 'deactivate_user', 'admin', id, { reason: body?.reason });
    return success({ message: 'ระงับการใช้งานบัญชีเรียบร้อย' });
  }

  if (path.match(/\/api\/admin\/users\/[^/]+\/reset-password/) && method === 'PUT') {
    const id = path.split('/')[4];
    const body = await parseBody(request);
    if (!body?.new_password) return error('กรุณาระบุรหัสผ่านใหม่');

    const complexityErr = validatePasswordComplexity(body.new_password);
    if (complexityErr) return error(complexityErr);

    const salt = generateSalt();
    const hash = await hashPassword(body.new_password, salt);
    await dbRun(env.DB,
      'UPDATE users SET password_hash = ?, salt = ?, must_change_password = 1, updated_at = ? WHERE id = ?',
      [hash, salt, now(), id]
    );
    await dbRun(env.DB, 'DELETE FROM sessions WHERE user_id = ?', [id]);
    await writeAuditLog(env.DB, user.id, user.displayName, 'reset_user_password', 'admin', id, null);
    return success({ message: 'รีเซ็ตรหัสผ่านเรียบร้อย' });
  }


  if (path === '/api/admin/requests' && method === 'GET') {
    const status = url.searchParams.get('status') || 'pending';
    const reqs = await dbAll(env.DB,
      'SELECT * FROM user_requests WHERE status = ? ORDER BY created_at DESC', [status]
    );
    return success(reqs);
  }

  if (path.match(/\/api\/admin\/requests\/[^/]+\/approve/) && method === 'PUT') {
    const id = path.split('/')[4];
    const body = await parseBody(request);
    const req = await dbFirst(env.DB, 'SELECT * FROM user_requests WHERE id = ?', [id]);
    if (!req) return error('ไม่พบคำขอ', 404);
    if (req.status !== 'pending') return error('คำขอนี้ถูกดำเนินการแล้ว');

    // Create actual user account
    const salt = generateSalt();
    const { hashPassword: hp } = await import('../../_helpers.js');
    const initialPwd = body.initial_password || 'Password@123';
    const hash = await hashPassword(initialPwd, salt);
    const nameParts = req.name.split(' ');
    const firstName = nameParts[0] || req.name;
    const lastName = nameParts.slice(1).join(' ') || '';
    const userId = generateUUID();
    const ts = now();

    await dbRun(env.DB,
      `INSERT INTO users (id, username, email, password_hash, salt, role, permissions, first_name, last_name, display_name, active, pdpa_accepted, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1, ?, ?)`,
      [userId, req.email, req.email, hash, salt,
       body.role || req.requested_role, body.permissions ? JSON.stringify(body.permissions) : (req.initial_permissions || '{}'),
       firstName, lastName, req.name, ts, ts]
    );

    await dbRun(env.DB,
      'UPDATE user_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
      ['approved', user.id, ts, id]
    );

    await writeAuditLog(env.DB, user.id, user.displayName, 'approve_user_request', 'admin', id, { user_id: userId });
    return success({ message: 'อนุมัติคำขอสมัครสมาชิกเรียบร้อย', user_id: userId, initial_password: initialPwd });
  }

  if (path.match(/\/api\/admin\/requests\/[^/]+\/reject/) && method === 'PUT') {
    const id = path.split('/')[4];
    const body = await parseBody(request);
    await dbRun(env.DB,
      'UPDATE user_requests SET status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
      ['rejected', body?.reason || '', user.id, now(), id]
    );
    return success({ message: 'ปฏิเสธคำขอสมัครสมาชิกเรียบร้อย' });
  }


  if (path === '/api/admin/settings' && method === 'GET') {
    const settings = await dbAll(env.DB, 'SELECT key, value FROM system_settings ORDER BY key');
    const obj = {};
    for (const s of settings) obj[s.key] = s.value;
    return success(obj);
  }

  if (path === '/api/admin/settings' && method === 'PUT') {
    const body = await parseBody(request);
    if (!body || typeof body !== 'object') return error('ข้อมูลไม่ถูกต้อง');
    for (const [key, value] of Object.entries(body)) {
      const strVal = String(value);
      await dbRun(env.DB,
        `INSERT INTO system_settings (id, key, value, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
        [generateUUID(), key, strVal, user.id, now()]
      );
    }
    await writeAuditLog(env.DB, user.id, user.displayName, 'update_settings', 'admin', null, { keys: Object.keys(body) });
    return success({ message: 'บันทึกการตั้งค่าเรียบร้อย' });
  }

  if (path === '/api/admin/audit-log' && method === 'GET') {
    const limit = Math.min(500, parseInt(url.searchParams.get('limit') || '100'));
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const module = url.searchParams.get('module');
    let sql = 'SELECT * FROM audit_log';
    const params = [];
    if (module) { sql += ' WHERE module = ?'; params.push(module); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const logs = await dbAll(env.DB, sql, params);
    return success(logs);
  }

  // ── Impersonate: admin views system as another user (read-only) ──
  if (path.match(/\/api\/admin\/impersonate\/[^/]+$/) && method === 'POST') {
    const targetId = path.split('/').pop();
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return error('ต้องเป็น Admin เท่านั้น', 403);
    }
    const target = await dbFirst(env.DB,
      `SELECT id, username, email, role, permissions, first_name, last_name, display_name, phone, driver_id, active
       FROM users WHERE id = ?`, [targetId]
    );
    if (!target) return error('ไม่พบผู้ใช้', 404);
    if (!target.active) return error('ผู้ใช้ถูกระงับการใช้งาน', 400);
    if (target.role === 'super_admin' && user.role !== 'super_admin') {
      return error('ไม่สามารถสวมรอยผู้ดูแลสูงสุดได้', 403);
    }

    const token = generateUUID() + '-' + generateUUID();
    const sessionId = generateUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
    await dbRun(env.DB,
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at, is_impersonated, impersonator_id)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [sessionId, targetId, token, expiresAt, now(), user.id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'impersonate_user', 'admin', targetId,
      { target_name: target.display_name || target.username });

    return success({
      token,
      user: {
        user_id: target.id,
        username: target.username,
        display_name: target.display_name || ((target.first_name || '') + ' ' + (target.last_name || '')).trim(),
        full_name: ((target.first_name || '') + ' ' + (target.last_name || '')).trim(),
        role: target.role,
        email: target.email,
        phone: target.phone,
        driver_id: target.driver_id,
        permissions: JSON.parse(target.permissions || '{}'),
        is_impersonated: true
      }
    });
  }

  if (path === '/api/admin/stop-impersonate' && method === 'POST') {
    // Delete the current impersonated session
    await dbRun(env.DB, 'DELETE FROM sessions WHERE id = ? AND is_impersonated = 1', [user.sessionId]);
    return success({ message: 'หยุดสวมรอยเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}