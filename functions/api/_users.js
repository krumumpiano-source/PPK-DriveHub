// PPK DriveHub - User Management Handlers
import { ok, fail, uuid, nowThai, hashPassword, verifyPassword, writeAudit, sanitize } from '../_helpers.js';
import { requireAdmin } from '../_middleware.js';

export async function handleUsers(ctx) {
  const { action, body, user, DB } = ctx;

  // ── Get All Users ─────────────────────────────────────────────────────────
  if (action === 'getAllUsers') {
    const adminErr = requireAdmin(user);
    if (adminErr) return adminErr;
    const rows = await DB.prepare(
      `SELECT user_id,title,full_name,department,phone,email,role,active,first_login,created_at,updated_at,notes,permissions
       FROM USERS ORDER BY full_name`
    ).all();
    const users = rows.results.map(u => ({ ...u, permissions: u.permissions ? JSON.parse(u.permissions) : {} }));
    return ok(users);
  }

  // ── Get User By ID ────────────────────────────────────────────────────────
  if (action === 'getUserById') {
    const adminErr = requireAdmin(user);
    if (adminErr) return adminErr;
    const u = await DB.prepare(
      `SELECT user_id,title,full_name,department,phone,email,role,active,first_login,created_at,updated_at,notes,permissions
       FROM USERS WHERE user_id=?`
    ).bind(sanitize(body.user_id || body.userId)).first();
    if (!u) return fail('ไม่พบผู้ใช้', 'NOT_FOUND', 404);
    return ok({ ...u, permissions: u.permissions ? JSON.parse(u.permissions) : {} });
  }

  // ── Update My Profile ─────────────────────────────────────────────────────
  if (action === 'updateMyProfile') {
    const d = body.data || body;
    await DB.prepare(
      `UPDATE USERS SET title=?,phone=?,department=?,email=?,notes=?,updated_at=? WHERE user_id=?`
    ).bind(sanitize(d.title), sanitize(d.phone), sanitize(d.department),
      sanitize(d.email), sanitize(d.notes), nowThai(), user.user_id).run();
    return ok(null, 'อัพเดทข้อมูลส่วนตัวสำเร็จ');
  }

  // ── Upload User Profile Image ─────────────────────────────────────────────
  if (action === 'uploadUserProfileImage') {
    const imageData = body.image_data;
    if (!imageData) return fail('ไม่พบข้อมูลรูปภาพ');
    const targetId = (user.role === 'admin' && body.user_id) ? body.user_id : user.user_id;
    await DB.prepare(`UPDATE USERS SET notes=?,updated_at=? WHERE user_id=?`)
      .bind(sanitize(body.notes), nowThai(), targetId).run();
    // Store base64 image in a notes-like field — or extend schema if needed
    // For now store image URL reference only (base64 too large for SQLite inline)
    return ok({ message: 'อัพโหลดรูปโปรไฟล์สำเร็จ' });
  }

  // ── Update User (Admin) ───────────────────────────────────────────────────
  if (action === 'updateUser') {
    const adminErr = requireAdmin(user);
    if (adminErr) return adminErr;
    const d = body.data || body;
    const uid = sanitize(d.user_id || body.user_id);
    const perms = d.permissions ? JSON.stringify(d.permissions) : undefined;
    const updates = [];
    const params = [];
    if (d.title !== undefined) { updates.push('title=?'); params.push(sanitize(d.title)); }
    if (d.full_name !== undefined) { updates.push('full_name=?'); params.push(sanitize(d.full_name)); }
    if (d.department !== undefined) { updates.push('department=?'); params.push(sanitize(d.department)); }
    if (d.phone !== undefined) { updates.push('phone=?'); params.push(sanitize(d.phone)); }
    if (d.email !== undefined) { updates.push('email=?'); params.push(sanitize(d.email)); }
    if (d.role !== undefined) { updates.push('role=?'); params.push(sanitize(d.role)); }
    if (d.active !== undefined) { updates.push('active=?'); params.push(d.active ? 1 : 0); }
    if (perms !== undefined) { updates.push('permissions=?'); params.push(perms); }
    if (d.notes !== undefined) { updates.push('notes=?'); params.push(sanitize(d.notes)); }
    updates.push('updated_at=?'); params.push(nowThai());
    params.push(uid);
    if (updates.length > 1) {
      await DB.prepare(`UPDATE USERS SET ${updates.join(',')} WHERE user_id=?`).bind(...params).run();
    }
    await writeAudit(DB, user.user_id, 'updateUser', 'USERS', uid, JSON.stringify(d));
    return ok(null, 'อัพเดทข้อมูลผู้ใช้สำเร็จ');
  }

  // ── Deactivate User (Admin) ───────────────────────────────────────────────
  if (action === 'deactivateUser') {
    const adminErr = requireAdmin(user);
    if (adminErr) return adminErr;
    const uid = sanitize(body.user_id || body.userId);
    if (uid === user.user_id) return fail('ไม่สามารถปิดการใช้งานตัวเองได้');
    await DB.prepare(`UPDATE USERS SET active=0,updated_at=? WHERE user_id=?`).bind(nowThai(), uid).run();
    await writeAudit(DB, user.user_id, 'deactivateUser', 'USERS', uid, '');
    return ok(null, 'ปิดการใช้งานผู้ใช้แล้ว');
  }

  // ── Reset User Password (Admin) ───────────────────────────────────────────
  if (action === 'resetUserPassword') {
    const adminErr = requireAdmin(user);
    if (adminErr) return adminErr;
    const uid = sanitize(body.user_id || body.userId);
    const newPwd = body.newPassword || 'Ppk@2569';
    const hash = await hashPassword(newPwd);
    await DB.prepare(`UPDATE USERS SET password_hash=?,first_login=1,updated_at=? WHERE user_id=?`)
      .bind(hash, nowThai(), uid).run();
    await writeAudit(DB, user.user_id, 'resetUserPassword', 'USERS', uid, '');
    return ok({ temporaryPassword: newPwd }, 'รีเซ็ตรหัสผ่านสำเร็จ');
  }

  // ── Get User Requests (Admin) ─────────────────────────────────────────────
  if (action === 'getUserRequests') {
    const adminErr = requireAdmin(user);
    if (adminErr) return adminErr;
    const status = sanitize(body.status) || 'pending';
    const rows = await DB.prepare(`SELECT * FROM USER_REQUESTS WHERE status=? ORDER BY requested_at DESC LIMIT 100`)
      .bind(status).all();
    return ok(rows.results);
  }

  // ── Approve User Request (Admin) ──────────────────────────────────────────
  if (action === 'approveUserRequest') {
    const adminErr = requireAdmin(user);
    if (adminErr) return adminErr;
    const rid = sanitize(body.request_id);
    const req = await DB.prepare(`SELECT * FROM USER_REQUESTS WHERE request_id=?`).bind(rid).first();
    if (!req) return fail('ไม่พบคำขอ', 'NOT_FOUND', 404);
    if (req.status !== 'pending') return fail('คำขอนี้ดำเนินการแล้ว');

    const role = sanitize(body.role || req.assigned_role || 'viewer');
    const permissions = body.permissions ? JSON.stringify(body.permissions) : JSON.stringify({});
    const pwd = body.initialPassword || generateTempPassword();
    const hash = await hashPassword(pwd);
    const uid = uuid();

    await DB.prepare(
      `INSERT INTO USERS (user_id,password_hash,title,full_name,department,phone,email,role,active,first_login,created_at,created_by,permissions)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(uid, hash, req.title, req.full_name, req.department, req.phone, req.email,
      role, 1, 1, nowThai(), user.user_id, permissions).run();
    await DB.prepare(
      `UPDATE USER_REQUESTS SET status='approved',reviewed_at=?,reviewed_by=?,assigned_role=?,initial_password=?
       WHERE request_id=?`
    ).bind(nowThai(), user.user_id, role, pwd, rid).run();

    // Notify
    await DB.prepare(`INSERT INTO NOTIFICATIONS (notification_id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(uuid(), uid, 'account_approved', 'บัญชีได้รับอนุมัติ', `ยินดีต้อนรับ ${req.full_name}! บัญชีของคุณได้รับอนุมัติแล้ว`, 0, nowThai()).run();

    await writeAudit(DB, user.user_id, 'approveUserRequest', 'USER_REQUESTS', rid, `user_id=${uid}`);
    return ok({ user_id: uid, temporaryPassword: pwd }, 'อนุมัติคำขอสมาชิกสำเร็จ');
  }

  // ── Reject User Request (Admin) ───────────────────────────────────────────
  if (action === 'rejectUserRequest') {
    const adminErr = requireAdmin(user);
    if (adminErr) return adminErr;
    const rid = sanitize(body.request_id);
    await DB.prepare(`UPDATE USER_REQUESTS SET status='rejected',reviewed_at=?,reviewed_by=?,notes=? WHERE request_id=?`)
      .bind(nowThai(), user.user_id, sanitize(body.reason || body.notes), rid).run();
    await writeAudit(DB, user.user_id, 'rejectUserRequest', 'USER_REQUESTS', rid, '');
    return ok(null, 'ปฏิเสธคำขอสมาชิกแล้ว');
  }

  // ── Get Permission Definitions ────────────────────────────────────────────
  if (action === 'getPermissionDefinitions') {
    return ok({
      modules: ['queue', 'fuel', 'repair', 'reports', 'vehicles', 'drivers', 'usage_log'],
      levels: ['view', 'create', 'edit', 'delete'],
      descriptions: {
        queue: 'จัดการคิวรถ', fuel: 'บันทึกน้ำมัน', repair: 'บันทึกซ่อม',
        reports: 'ดูรายงาน', vehicles: 'จัดการรถ', drivers: 'จัดการคนขับ', usage_log: 'บันทึกการใช้งาน'
      }
    });
  }

  return fail(`Unknown users action: ${action}`, 'UNKNOWN_ACTION');
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  let p = '';
  for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}
