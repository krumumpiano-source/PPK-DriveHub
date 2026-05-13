// Admin: users, settings, requests
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, hashPassword, generateSalt, requireAdmin,
  extractParam, writeAuditLog, validatePasswordComplexity,
  sendTelegramMessage, createNotification
} from '../../_helpers.js';
import { runGoogleFormSync } from '../../_lib/gform-sync.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  try { requireAdmin(user); } catch { return error('ต้องเป็น Admin เท่านั้น', 403); }

  // ============================================================
  // Google Form sync
  // ============================================================
  if (path === '/api/admin/gform-sync/run' && method === 'POST') {
    try {
      const result = await runGoogleFormSync(env, 'manual', user.email || user.id || null);
      await writeAuditLog(env.DB, user.id, user.displayName, 'gform_sync_run', 'admin', result.logId, {
        inserted: result.rows_inserted, skipped: result.rows_skipped, failed: result.rows_failed,
      });
      return success(result);
    } catch (e) {
      return error('Sync failed: ' + e.message, 500);
    }
  }

  if (path === '/api/admin/gform-sync/log' && method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const logs = await dbAll(env.DB,
      `SELECT id, started_at, finished_at, status, trigger_source, triggered_by,
              sheets_processed, rows_fetched, rows_inserted, rows_skipped, rows_failed,
              error_message, details
       FROM gform_sync_log ORDER BY started_at DESC LIMIT ?`,
      [limit]
    );
    return success(logs.map(l => ({ ...l, details: l.details ? JSON.parse(l.details) : null })));
  }

  if (path === '/api/admin/gform-sync/config' && method === 'GET') {
    // คืนสถานะ config (ไม่เปิดเผย service account JSON)
    let sheetMap = null, sheetMapError = null;
    if (env.GFORM_SHEET_MAP) {
      try { sheetMap = JSON.parse(env.GFORM_SHEET_MAP); }
      catch (e) { sheetMapError = e.message; }
    }
    return success({
      has_service_account: !!env.GOOGLE_SERVICE_ACCOUNT_JSON,
      has_cron_token: !!env.SYNC_CRON_TOKEN,
      sheet_map: sheetMap,
      sheet_map_error: sheetMapError,
    });
  }

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
    // Parse legacy "(แผนก:... | โทร:... | เหตุผล:...)" payloads from name column
    // so the UI can show clean values for older requests.
    for (const r of reqs) {
      const raw = String(r.name || '').trim();
      const m = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      if (m && /(แผนก|โทร|เหตุผล)[:：]/.test(m[2])) {
        r.name = m[1].trim();
        const bits = m[2].split('|').map(s => s.trim());
        for (const b of bits) {
          const mm = b.match(/^(แผนก|โทร|เหตุผล)[:：]\s*(.*)$/);
          if (mm) {
            const v = mm[2].trim();
            if (mm[1] === 'แผนก' && !r.department) r.department = v;
            else if (mm[1] === 'โทร' && !r.phone) r.phone = v;
            else if (mm[1] === 'เหตุผล' && !r.reason) r.reason = v;
          } else if (b && !r.title) {
            r.title = b;
          }
        }
      }
    }
    return success(reqs);
  }

  if (path.match(/\/api\/admin\/requests\/[^/]+\/approve/) && method === 'PUT') {
    const id = path.split('/')[4];
    const body = await parseBody(request);
    const req = await dbFirst(env.DB, 'SELECT * FROM user_requests WHERE id = ?', [id]);
    if (!req) return error('ไม่พบคำขอ', 404);
    if (req.status !== 'pending') return error('คำขอนี้ถูกดำเนินการแล้ว');

    // Strip legacy "(แผนก:... | โทร:... | เหตุผล:...)" suffix from older requests
    // that stored everything in the name column.
    let cleanName = String(req.name || '').trim();
    let legacyTitle = '', legacyPhone = '';
    const legacyMatch = cleanName.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    if (legacyMatch && /(แผนก|โทร|เหตุผล)[:：]/.test(legacyMatch[2])) {
      cleanName = legacyMatch[1].trim();
      const bits = legacyMatch[2].split('|').map(s => s.trim());
      for (const b of bits) {
        const m = b.match(/^(แผนก|โทร|เหตุผล)[:：]\s*(.*)$/);
        if (m) {
          if (m[1] === 'โทร') legacyPhone = m[2].trim();
        } else if (b && !legacyTitle) {
          legacyTitle = b;
        }
      }
    }

    const title = (req.title || legacyTitle || '').trim();
    const phone = (req.phone || legacyPhone || '').trim();

    // Create actual user account
    const nameParts = cleanName.split(/\s+/);
    const firstName = nameParts[0] || cleanName;
    const lastName = nameParts.slice(1).join(' ') || '';
    const displayName = (title ? title : '') + cleanName;
    const userId = generateUUID();
    const ts = now();

    // Use the password the user set during registration
    let hash, salt, mustChange;
    if (req.initial_password_hash && req.salt) {
      hash = req.initial_password_hash;
      salt = req.salt;
      mustChange = 0; // user already chose their password
    } else {
      // Fallback for legacy requests without stored password
      salt = generateSalt();
      const fallbackPwd = body.initial_password || 'Password@123';
      hash = await hashPassword(fallbackPwd, salt);
      mustChange = 1;
    }

    await dbRun(env.DB,
      `INSERT INTO users (id, username, email, password_hash, salt, role, permissions, title, first_name, last_name, display_name, phone, active, pdpa_accepted, must_change_password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)`,
      [userId, req.email, req.email, hash, salt,
       body.role || req.requested_role, body.permissions ? JSON.stringify(body.permissions) : (req.initial_permissions || '{}'),
       title || null, firstName, lastName, displayName, phone || null, mustChange, ts, ts]
    );

    await dbRun(env.DB,
      'UPDATE user_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
      ['approved', user.id, ts, id]
    );

    await writeAuditLog(env.DB, user.id, user.displayName, 'approve_user_request', 'admin', id, { user_id: userId });
    return success({ message: 'อนุมัติคำขอสมัครสมาชิกเรียบร้อย', user_id: userId });
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

  // ── Impersonate by Role: admin picks a role to preview ──
  if (path.match(/\/api\/admin\/impersonate-role\/[^/]+$/) && method === 'POST') {
    const targetRole = path.split('/').pop();
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return error('ต้องเป็น Admin เท่านั้น', 403);
    }
    const validRoles = ['admin', 'manager', 'driver', 'staff'];
    if (!validRoles.includes(targetRole)) {
      return error('บทบาทไม่ถูกต้อง', 400);
    }
    if (targetRole === 'super_admin') {
      return error('ไม่สามารถสวมรอยผู้ดูแลสูงสุดได้', 403);
    }
    const target = await dbFirst(env.DB,
      `SELECT id, username, email, role, permissions, first_name, last_name, display_name, phone, driver_id, active
       FROM users WHERE role = ? AND active = 1 ORDER BY id ASC LIMIT 1`, [targetRole]
    );
    if (!target) return error('ไม่พบผู้ใช้ที่มีบทบาท ' + targetRole, 404);

    const token = generateUUID() + '-' + generateUUID();
    const sessionId = generateUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await dbRun(env.DB,
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at, is_impersonated, impersonator_id)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [sessionId, target.id, token, expiresAt, now(), user.id]
    );
    const roleLabel = { admin: 'ผู้ดูแลระบบ', manager: 'ผู้จัดการ', driver: 'พนักงานขับรถ', staff: 'เจ้าหน้าที่' };
    await writeAuditLog(env.DB, user.id, user.displayName, 'impersonate_role', 'admin', target.id,
      { target_role: targetRole, target_name: target.display_name || target.username });

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

  // ── Delete User (hard delete) ──
  if (path.match(/^\/api\/admin\/users\/[^/]+$/) && method === 'DELETE') {
    const id = path.split('/').pop();

    // Cannot delete yourself
    if (id === user.id) return error('ไม่สามารถลบบัญชีของตัวเองได้', 400);

    const targetUser = await dbFirst(env.DB, 'SELECT id, username, role, first_name, last_name, display_name FROM users WHERE id = ?', [id]);
    if (!targetUser) return error('ไม่พบผู้ใช้', 404);

    // Only super_admin can delete another super_admin or admin
    if (targetUser.role === 'super_admin') return error('ไม่สามารถลบผู้ดูแลสูงสุดได้', 403);
    if (targetUser.role === 'admin' && user.role !== 'super_admin') return error('ต้องเป็น super_admin ถึงจะลบแอดมินได้', 403);

    const targetName = targetUser.display_name || ((targetUser.first_name || '') + ' ' + (targetUser.last_name || '')).trim() || targetUser.username;

    // Remove sessions first
    await dbRun(env.DB, 'DELETE FROM sessions WHERE user_id = ?', [id]);
    // Delete the user
    await dbRun(env.DB, 'DELETE FROM users WHERE id = ?', [id]);

    await writeAuditLog(env.DB, user.id, user.displayName, 'delete_user', 'admin', id, { username: targetUser.username, name: targetName });
    return success({ message: 'ลบผู้ใช้ "' + targetName + '" เรียบร้อยแล้ว' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}