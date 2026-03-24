// PPK DriveHub - Auth Handlers
import { ok, fail, uuid, nowThai, hashPassword, verifyPassword, validatePasswordPolicy, signJWT, writeAudit, sanitize } from '../_helpers.js';

const JWT_EXPIRY = 60 * 60 * 24; // 24 hours

export async function handleAuth(ctx) {
  const { action, body, env, DB } = ctx;

  // ── Setup (initial admin creation) ─────────────────────────────────────
  if (action === 'setup') {
    const done = await DB.prepare(`SELECT value FROM MASTER WHERE key='setup_completed'`).first();
    if (done && done.value === '1') return fail('ระบบถูกตั้งค่าแล้ว', 'ALREADY_SETUP');
    const hash = await hashPassword('Admin@2569');
    const uid = uuid();
    await DB.prepare(
      `INSERT OR REPLACE INTO USERS (user_id,password_hash,title,full_name,department,role,active,first_login,created_at,created_by,permissions)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(uid, hash, 'นาย', 'ผู้ดูแลระบบ', 'ฝ่ายบริหาร', 'admin', 1, 0, nowThai(), 'system',
      JSON.stringify({ queue:'delete',fuel:'delete',repair:'delete',reports:'delete',vehicles:'delete',drivers:'delete',usage_log:'delete' })
    ).run();
    // Also store username->user_id mapping
    await DB.prepare(`INSERT OR REPLACE INTO MASTER (key,value,description,updated_at,updated_by,version) VALUES (?,?,?,?,?,?)`)
      .bind('admin_username', 'admin', 'Admin login username', nowThai(), 'system', 1).run();
    await DB.prepare(`INSERT OR REPLACE INTO MASTER (key,value,description,updated_at,updated_by,version) VALUES (?,?,?,?,?,?)`)
      .bind('admin_user_id', uid, 'Admin user ID', nowThai(), 'system', 1).run();
    await DB.prepare(`INSERT OR REPLACE INTO MASTER (key,value,updated_at,updated_by,version) VALUES (?,?,?,?,?)`)
      .bind('setup_completed', '1', nowThai(), 'system', 1).run();
    return ok({ message: 'ตั้งค่าระบบสำเร็จ', username: 'admin', password: 'Admin@2569', user_id: uid });
  }

  // ── Login ────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const username = sanitize(body.username);
    const password = body.password;
    if (!username || !password) return fail('กรุณากรอก username และ password');

    // Rate limiting check
    const rlKey = `login_fail_${username}`;
    const rlRow = await DB.prepare(`SELECT value FROM MASTER WHERE key=?`).bind(rlKey).first();
    if (rlRow) {
      const rl = JSON.parse(rlRow.value || '{}');
      if (rl.count >= 5 && Date.now() - rl.lastFail < 15 * 60 * 1000) {
        return fail('ล็อกอินผิดเกิน 5 ครั้ง กรุณารอ 15 นาที', 'RATE_LIMIT', 429);
      }
    }

    // Find user by username (full_name used as username OR look up admin_username)
    let user = null;
    // Check admin_username mapping first
    const adminUidRow = await DB.prepare(`SELECT value FROM MASTER WHERE key='admin_user_id'`).first();
    const adminUsernameRow = await DB.prepare(`SELECT value FROM MASTER WHERE key='admin_username'`).first();
    if (adminUsernameRow && adminUsernameRow.value === username && adminUidRow) {
      user = await DB.prepare(`SELECT * FROM USERS WHERE user_id=?`).bind(adminUidRow.value).first();
    }
    if (!user) {
      user = await DB.prepare(`SELECT * FROM USERS WHERE email=? AND active=1`).bind(username).first();
    }
    if (!user) {
      user = await DB.prepare(`SELECT * FROM USERS WHERE full_name=? AND active=1`).bind(username).first();
    }

    if (!user) {
      await updateRateLimit(DB, rlKey);
      return fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'INVALID_CREDENTIALS', 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await updateRateLimit(DB, rlKey);
      return fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'INVALID_CREDENTIALS', 401);
    }

    // Clear rate limit
    await DB.prepare(`DELETE FROM MASTER WHERE key=?`).bind(rlKey).run();

    const permissions = user.permissions ? JSON.parse(user.permissions) : {};
    const secret = env.JWT_SECRET || 'ppk-drivehub-secret-2569-change-in-production';
    const token = await signJWT({
      user_id: user.user_id, role: user.role,
      full_name: user.full_name, permissions,
      exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY
    }, secret);

    await writeAudit(DB, user.user_id, 'login', 'USERS', user.user_id, 'เข้าสู่ระบบ');

    return ok({
      token,
      user_id: user.user_id,
      full_name: user.full_name,
      title: user.title,
      role: user.role,
      permissions,
      first_login: user.first_login === 1 || user.first_login === '1',
      department: user.department,
      email: user.email,
      phone: user.phone
    }, 'เข้าสู่ระบบสำเร็จ');
  }

  // ── Register ─────────────────────────────────────────────────────────────
  if (action === 'register' || action === 'registerUser') {
    const d = body.data || body;
    if (!d.full_name || !d.email) return fail('กรุณากรอกชื่อและอีเมล');
    const existing = await DB.prepare(`SELECT request_id FROM USER_REQUESTS WHERE email=? AND status='pending'`)
      .bind(sanitize(d.email)).first();
    if (existing) return fail('อีเมลนี้มีคำขอรออนุมัติแล้ว', 'DUPLICATE');
    const rid = uuid();
    await DB.prepare(
      `INSERT INTO USER_REQUESTS (request_id,title,full_name,department,phone,email,reason,status,requested_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(rid, sanitize(d.title), sanitize(d.full_name), sanitize(d.department),
      sanitize(d.phone), sanitize(d.email), sanitize(d.reason), 'pending', nowThai()).run();
    return ok({ request_id: rid }, 'ส่งคำขอสมัครสมาชิกแล้ว รออนุมัติจาก Admin');
  }

  // ── Change Password ───────────────────────────────────────────────────────
  if (action === 'changePassword') {
    const { user } = ctx;
    if (!user) return fail('ต้องล็อกอินก่อน', 'AUTHENTICATION_REQUIRED', 401);
    const { oldPassword, newPassword } = body;
    const validMsg = validatePasswordPolicy(newPassword);
    if (validMsg) return fail(validMsg, 'INVALID_INPUT');

    const dbUser = await DB.prepare(`SELECT password_hash FROM USERS WHERE user_id=?`)
      .bind(user.user_id).first();
    if (!dbUser) return fail('ไม่พบผู้ใช้', 'NOT_FOUND', 404);

    const valid = await verifyPassword(oldPassword, dbUser.password_hash);
    if (!valid) return fail('รหัสผ่านเดิมไม่ถูกต้อง', 'INVALID_CREDENTIALS');

    // Check password history
    const hist = await DB.prepare(`SELECT password_hash FROM PASSWORD_HISTORY WHERE user_id=? ORDER BY changed_at DESC LIMIT 5`)
      .bind(user.user_id).all();
    for (const h of hist.results) {
      if (await verifyPassword(newPassword, h.password_hash)) {
        return fail('ไม่สามารถใช้รหัสผ่านเดิมที่ผ่านมา 5 ครั้งล่าสุด', 'INVALID_INPUT');
      }
    }

    const hash = await hashPassword(newPassword);
    await DB.prepare(`UPDATE USERS SET password_hash=?,first_login=0,password_changed_at=?,updated_at=? WHERE user_id=?`)
      .bind(hash, nowThai(), nowThai(), user.user_id).run();
    await DB.prepare(`INSERT INTO PASSWORD_HISTORY (history_id,user_id,password_hash,changed_at,changed_by) VALUES (?,?,?,?,?)`)
      .bind(uuid(), user.user_id, hash, nowThai(), user.user_id).run();
    await writeAudit(DB, user.user_id, 'changePassword', 'USERS', user.user_id, 'เปลี่ยนรหัสผ่าน');
    return ok(null, 'เปลี่ยนรหัสผ่านสำเร็จ');
  }

  // ── Forgot Password (Admin resets — token returned directly) ─────────────
  if (action === 'forgotPassword') {
    const email = sanitize(body.email);
    const u = await DB.prepare(`SELECT user_id FROM USERS WHERE email=? AND active=1`).bind(email).first();
    // Always return success to prevent email enumeration
    if (!u) return ok(null, 'หากอีเมลถูกต้อง Admin จะรีเซ็ตรหัสผ่านให้');
    const token = uuid();
    const exp = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h
    await DB.prepare(
      `INSERT INTO RESET_PASSWORD_REQUESTS (request_id,user_id,email,reset_token,expires_at,status,requested_at)
       VALUES (?,?,?,?,?,?,?)`
    ).bind(uuid(), u.user_id, email, token, exp, 'pending', nowThai()).run();
    return ok({ reset_token: token }, 'สร้าง token สำหรับ Admin รีเซ็ตรหัสผ่านแล้ว');
  }

  // ── Reset Password Confirm ────────────────────────────────────────────────
  if (action === 'resetPasswordConfirm') {
    const { reset_token, newPassword } = body;
    const validMsg = validatePasswordPolicy(newPassword);
    if (validMsg) return fail(validMsg, 'INVALID_INPUT');
    const req = await DB.prepare(`SELECT * FROM RESET_PASSWORD_REQUESTS WHERE reset_token=? AND status='pending'`)
      .bind(sanitize(reset_token)).first();
    if (!req) return fail('Token ไม่ถูกต้องหรือหมดอายุ', 'TOKEN_INVALID');
    if (new Date(req.expires_at) < new Date()) return fail('Token หมดอายุแล้ว', 'TOKEN_EXPIRED');
    const hash = await hashPassword(newPassword);
    await DB.prepare(`UPDATE USERS SET password_hash=?,first_login=0,password_changed_at=?,updated_at=? WHERE user_id=?`)
      .bind(hash, nowThai(), nowThai(), req.user_id).run();
    await DB.prepare(`UPDATE RESET_PASSWORD_REQUESTS SET status='used',reset_at=? WHERE reset_token=?`)
      .bind(nowThai(), reset_token).run();
    return ok(null, 'รีเซ็ตรหัสผ่านสำเร็จ');
  }

  // ── Get Current User Info ─────────────────────────────────────────────────
  if (action === 'getCurrentUserInfo' || action === 'getMyProfile') {
    const { user } = ctx;
    const targetId = (ctx.user?.role === 'admin' && body.userId) ? body.userId : user.user_id;
    const u = await DB.prepare(`SELECT user_id,title,full_name,department,phone,email,role,active,first_login,created_at,notes,permissions,password_changed_at FROM USERS WHERE user_id=?`)
      .bind(targetId).first();
    if (!u) return fail('ไม่พบผู้ใช้', 'NOT_FOUND', 404);
    const perms = u.permissions ? JSON.parse(u.permissions) : {};
    return ok({ ...u, permissions: perms });
  }

  // ── Accept PDPA ───────────────────────────────────────────────────────────
  if (action === 'acceptPDPAPolicy') {
    const { user } = ctx;
    const ip = ctx.request?.headers?.get('CF-Connecting-IP') || '';
    const ua = ctx.request?.headers?.get('User-Agent') || '';
    await DB.prepare(`INSERT INTO PDPA_LOG (log_id,user_id,action,accepted_at,ip_address,user_agent) VALUES (?,?,?,?,?,?)`)
      .bind(uuid(), user.user_id, 'accept', nowThai(), ip, ua).run();
    return ok(null, 'ยอมรับนโยบาย PDPA สำเร็จ');
  }

  if (action === 'checkPDPAAccepted') {
    const { user } = ctx;
    const log = await DB.prepare(`SELECT * FROM PDPA_LOG WHERE user_id=? AND action='accept' ORDER BY accepted_at DESC LIMIT 1`)
      .bind(user.user_id).first();
    return ok({ accepted: !!log, accepted_at: log?.accepted_at || null });
  }

  if (action === 'getPDPALog') {
    const from = sanitize(body.date_from);
    const to = sanitize(body.date_to);
    let q = `SELECT * FROM PDPA_LOG ORDER BY accepted_at DESC LIMIT 200`;
    const rows = await DB.prepare(q).all();
    return ok(rows.results);
  }

  return fail(`Unknown auth action: ${action}`, 'UNKNOWN_ACTION');
}

async function updateRateLimit(DB, key) {
  const row = await DB.prepare(`SELECT value FROM MASTER WHERE key=?`).bind(key).first();
  const rl = row ? JSON.parse(row.value || '{}') : { count: 0 };
  rl.count = (rl.count || 0) + 1;
  rl.lastFail = Date.now();
  await DB.prepare(`INSERT OR REPLACE INTO MASTER (key,value,updated_at,updated_by,version) VALUES (?,?,?,?,?)`)
    .bind(key, JSON.stringify(rl), new Date().toISOString(), 'system', 1).run();
}
