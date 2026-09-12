// Auth: login, register, password management
import {
  dbFirst, dbRun, dbAll, generateUUID, now, success, error,
  parseBody, hashPassword, verifyPassword, generateSalt, generateToken,
  writeAuditLog, validatePasswordComplexity, checkPasswordReuse,
  sendTelegramMessage, notifyAllAdmins, sendPasswordResetEmail
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

    const inputUsername = body.username.toLowerCase().trim();
    const inputPassword = body.password.trim();

    let user = await dbFirst(env.DB,
      'SELECT * FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND active = 1',
      [inputUsername, inputUsername]
    );

    let isFirstTimePhoneLogin = false;

    if (user) {
      // User exists, verify password
      // If user is pending onboarding (onboarding_completed = 0), test with raw or digits
      let valid = await verifyPassword(inputPassword, user.salt, user.password_hash);
      if (!valid && inputPassword.replace(/\D/g, '').length >= 9) {
        valid = await verifyPassword(inputPassword.replace(/\D/g, ''), user.salt, user.password_hash);
      }

      if (!valid) {
        return error('username/email หรือ password ไม่ถูกต้อง', 401);
      }
    } else {
      // User not found. Check if it's a new @ppk.ac.th registration & first login attempt
      if (inputUsername.endsWith('@ppk.ac.th')) {
        isFirstTimePhoneLogin = true;
        const cleanPhone = inputPassword.replace(/\D/g, '');
        if (cleanPhone.length < 9 || cleanPhone.length > 10) {
          return error('กรุณากรอกเบอร์โทรศัพท์มือถือ 9-10 หลัก เป็นรหัสผ่านสำหรับการเข้าสู่ระบบครั้งแรก');
        }

        const ts = now();
        const userId = generateUUID();
        const defaultPerms = JSON.stringify({});
        const pwSalt = generateSalt();
        const pwHash = await hashPassword(cleanPhone, pwSalt); // Save cleaned phone number as initial password
        const generatedUsername = inputUsername.split('@')[0];
        
        await dbRun(env.DB,
          `INSERT INTO users (id, username, email, phone, password_hash, salt, role, permissions, first_name, last_name, display_name, active, pdpa_accepted, must_change_password, onboarding_completed, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'staff', ?, ?, '', ?, 1, 0, 0, 0, ?, ?)`,
          [userId, inputUsername, inputUsername, cleanPhone, pwHash, pwSalt, defaultPerms, generatedUsername, generatedUsername, ts, ts]
        );
        
        user = await dbFirst(env.DB, 'SELECT * FROM users WHERE id = ?', [userId]);
        await notifyAllAdmins(env.DB, 'system', 'ผู้ขอใช้รถล็อกอินครั้งแรกด้วยเบอร์โทรศัพท์', `${generatedUsername} (${inputUsername}) เข้าสู่ระบบด้วยเบอร์โทรศัพท์สำเร็จ กำลังกรอกข้อมูล Onboarding`);
      } else {
        return error('username/email หรือ password ไม่ถูกต้อง', 401);
      }
    }

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

    const auditAction = isFirstTimePhoneLogin ? 'login_first_time_phone' : 'login';
    await writeAuditLog(env.DB, user.id, user.username, auditAction, 'auth', user.id, null);

    const needsOnboarding = user.onboarding_completed === 0;

    return success({
      token,
      user_id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      permissions: JSON.parse(user.permissions || '{}'),
      must_change_password: user.must_change_password === 1,
      pdpa_accepted: user.pdpa_accepted === 1,
      needs_onboarding: needsOnboarding,
      onboarding_completed: !needsOnboarding,
      department: user.department || '',
      phone: user.phone || '',
      email: user.email || user.username
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

    // Default permissions for new users (requesters) — no module access, only request vehicle & calendar
    const defaultPerms = JSON.stringify({});

    await dbRun(env.DB,
      `INSERT INTO users (id, username, email, department, password_hash, salt, role, permissions, title, first_name, last_name, display_name, phone, active, pdpa_accepted, must_change_password, onboarding_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'staff', ?, ?, ?, ?, ?, ?, 1, 0, 0, 1, ?, ?)`,
      [userId, email, email, department || null, pwHash, pwSalt, defaultPerms,
       title || null, fnFirst, fnLast, displayName, phone || null, ts, ts]
    );

    // Generate session token for instant auto-login
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    await dbRun(env.DB,
      'INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [generateUUID(), userId, token, expiresAt, now()]
    );

    const displayForNotify = title ? `${title}${cleanName}` : cleanName;
    await notifyAllAdmins(env.DB, 'system', 'สมาชิกใหม่ลงทะเบียน',
      `${displayForNotify} (${email}) สมัครเข้าใช้งานสำเร็จ สิทธิ์เริ่มต้น: ผู้ขอใช้รถ`);

    return success({
      message: 'สมัครสมาชิกและเข้าสู่ระบบสำเร็จ',
      token,
      user_id: userId,
      username: email,
      display_name: displayName,
      role: 'staff',
      permissions: {},
      onboarding_completed: true,
      needs_onboarding: false
    });
  }

  if (path === '/api/auth/complete-onboarding' && method === 'POST') {
    if (!env.user) return error('กรุณาเข้าสู่ระบบ', 401);
    const body = await parseBody(request);
    const title = String(body?.title || '').trim();
    const firstName = String(body?.first_name || '').trim();
    const lastName = String(body?.last_name || '').trim();
    const department = String(body?.department || '').trim();
    const rawPhone = String(body?.phone || '').trim();
    const phone = rawPhone.replace(/\D/g, '');

    if (!firstName || !lastName) return error('กรุณากรอกชื่อจริงและนามสกุล');
    if (!department) return error('กรุณาเลือกกลุ่มสาระการเรียนรู้ หรือกลุ่มงาน');
    if (!phone || phone.length < 9) return error('กรุณากรอกเบอร์โทรศัพท์ติดต่อที่ถูกต้อง (9-10 หลัก)');

    const displayName = (title ? `${title}${firstName} ${lastName}` : `${firstName} ${lastName}`).trim();
    const ts = now();

    // If phone was updated by user, also update password_hash to the new phone so phone stays as initial password
    const currentUser = await dbFirst(env.DB, 'SELECT phone, salt, password_hash FROM users WHERE id = ?', [env.user.id]);
    let pwUpdateSql = '';
    let pwParams = [];
    if (currentUser && phone && currentUser.phone !== phone) {
      const newSalt = generateSalt();
      const newHash = await hashPassword(phone, newSalt);
      pwUpdateSql = ', password_hash = ?, salt = ?';
      pwParams = [newHash, newSalt];
    }

    await dbRun(env.DB,
      `UPDATE users SET title = ?, first_name = ?, last_name = ?, display_name = ?, department = ?, phone = ?, onboarding_completed = 1, updated_at = ?${pwUpdateSql} WHERE id = ?`,
      [title || null, firstName, lastName, displayName, department, phone, ts, ...pwParams, env.user.id]
    );

    const updated = await dbFirst(env.DB,
      'SELECT id, username, email, role, permissions, title, first_name, last_name, display_name, department, phone, profile_image, pdpa_accepted, must_change_password, onboarding_completed FROM users WHERE id = ?',
      [env.user.id]
    );

    await writeAuditLog(env.DB, env.user.id, updated.display_name || updated.username, 'complete_onboarding', 'auth', env.user.id, null);

    return success({
      message: 'บันทึกข้อมูลและเข้าสู่ระบบเรียบร้อย',
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        display_name: updated.display_name,
        title: updated.title,
        first_name: updated.first_name,
        last_name: updated.last_name,
        department: updated.department,
        phone: updated.phone,
        role: updated.role,
        permissions: JSON.parse(updated.permissions || '{}'),
        onboarding_completed: true,
        needs_onboarding: false
      }
    });
  }

  if (path === '/api/auth/check-identity' && method === 'POST') {
    const body = await parseBody(request);
    const rawIdentity = (body?.identity || body?.username || body?.email || '').toString().trim().toLowerCase();
    if (!rawIdentity) {
      return error('กรุณาระบุอีเมลหรือชื่อผู้ใช้งาน', 400);
    }

    const isSchoolEmail = rawIdentity.endsWith('@ppk.ac.th');

    const user = await dbFirst(env.DB,
      'SELECT id, username, email, display_name, first_name, last_name, role, department, phone, onboarding_completed FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND active = 1',
      [rawIdentity, rawIdentity]
    );

    if (user) {
      const isFirstTime = user.onboarding_completed === 0;
      const name = user.display_name || (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username);
      return success({
        exists: true,
        is_school_email: isSchoolEmail,
        is_first_time: isFirstTime,
        user: {
          username: user.username,
          email: user.email || user.username,
          display_name: name,
          role: user.role,
          phone: user.phone || '',
          department: user.department || '',
          onboarding_completed: user.onboarding_completed === 1
        }
      });
    }

    let suggestedFirstName = '';
    let suggestedLastName = '';
    if (rawIdentity.includes('@')) {
      const prefix = rawIdentity.split('@')[0];
      const nameParts = prefix.split(/[._-]/);
      suggestedFirstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : '';
      suggestedLastName = nameParts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }

    return success({
      exists: false,
      is_school_email: isSchoolEmail,
      is_first_time: isSchoolEmail,
      suggested_username: rawIdentity,
      suggested_first_name: suggestedFirstName,
      suggested_last_name: suggestedLastName,
      suggested_name: `${suggestedFirstName} ${suggestedLastName}`.trim()
    });
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
      'SELECT id, username, email, role, permissions, title, first_name, last_name, display_name, department, phone, profile_image, driver_id, pdpa_accepted, must_change_password, onboarding_completed, last_login FROM users WHERE id = ?',
      [env.user.id]
    );
    if (!user) return error('ไม่พบข้อมูลผู้ใช้', 404);
    return success({
      ...user,
      permissions: JSON.parse(user.permissions || '{}'),
      onboarding_completed: user.onboarding_completed === 1,
      needs_onboarding: user.onboarding_completed === 0
    });
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
    const user = await dbFirst(env.DB, 'SELECT id, email, first_name, display_name FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND active = 1', [body.email.toLowerCase().trim(), body.email.toLowerCase().trim()]);
    // Don't reveal if email exists
    if (!user) return success({ message: 'ถ้า email นี้มีในระบบ จะได้รับลิงก์รีเซ็ตรหัสผ่านทางอีเมล' });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    await dbRun(env.DB,
      `INSERT INTO reset_password_requests (id, user_id, email, token, expires_at, used, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [generateUUID(), user.id, user.email, token, expiresAt, now()]
    );

    const origin = request.headers.get('Origin') || new URL(request.url).origin;
    await sendPasswordResetEmail(env, user, token, origin);

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
    const allowed = ['title', 'first_name', 'last_name', 'phone', 'department'];
    const updates = [];
    const params = [];
    for (const field of allowed) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');

    if (body.first_name || body.last_name || body.title !== undefined) {
      const user = await dbFirst(env.DB, 'SELECT title, first_name, last_name FROM users WHERE id = ?', [env.user.id]);
      const t = body.title !== undefined ? body.title : (user.title || '');
      const fn = body.first_name !== undefined ? body.first_name : user.first_name;
      const ln = body.last_name !== undefined ? body.last_name : user.last_name;
      updates.push('display_name = ?');
      params.push((t ? `${t}${fn} ${ln}` : `${fn} ${ln}`).trim());
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