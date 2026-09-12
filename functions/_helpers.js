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

  // Read-only 'view' access is granted to all authenticated users
  if (level === 'view') return true;

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

// Helper for UPDATE statements: returns SQL fragment + params for updated_by/updated_at
// Usage: const a = auditUpdate(user); sets.push(a.sql); params.push(...a.params);
export function auditUpdate(user) {
  return {
    sql: 'updated_by = ?, updated_at = ?',
    params: [user?.id || null, now()]
  };
}

// SQL fragments for SELECT queries to JOIN user names for created_by + updated_by
// Use with table alias 't' (or replace via .replace(/\bt\./g, 'yourAlias.'))
export const AUDIT_NAME_SELECT = `t.created_by AS created_by, t.updated_by AS updated_by,
  uc.display_name AS created_by_name,
  uu.display_name AS updated_by_name`;

export const AUDIT_NAME_JOIN = `LEFT JOIN users uc ON t.created_by = uc.id
  LEFT JOIN users uu ON t.updated_by = uu.id`;

export async function writeAuditLog(db, userId, username, action, module, entityId, details, ipAddress) {
  try {
    await dbRun(db,
      `INSERT INTO audit_log (id, user_id, username, action, module, entity_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateUUID(), userId || null, username || null, action, module || null, entityId || null,
       details ? JSON.stringify(details) : null, ipAddress || null, now()]
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

export async function sendLineMessage(env, lineId, message) {
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !lineId) return;
  try {
    // Using LINE Messaging API push message
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        to: lineId,
        messages: [{ type: 'text', text: message }]
      })
    });
  } catch {
    // Line failures are non-critical
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

export async function sendEmailViaGAS(env, to, subject, body) {
  return sendNotificationEmail(env, { to, subject, text: body });
}

export async function sendNotificationEmail(env, { to, subject, html, text }) {
  if (!to) return false;
  const webhookUrl = env.EMAIL_WEBHOOK_URL;
  const resendKey = env.RESEND_API_KEY;

  const emailText = text || '';
  const emailHtml = html || `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">${emailText.replace(/\n/g, '<br>')}</div>`;

  // 1. Google Apps Script Webhook (MailApp.sendEmail - Free)
  if (webhookUrl) {
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          text: emailText,
          html: emailHtml,
          body: emailText
        })
      });
      if (resp.ok) return true;
    } catch (e) {
      console.error('GAS Webhook Email Error:', e);
    }
  }

  // 2. Resend REST API (if configured)
  if (resendKey) {
    try {
      const fromAddr = env.EMAIL_FROM || 'PPK DriveHub <onboarding@resend.dev>';
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [to],
          subject,
          text: emailText,
          html: emailHtml
        })
      });
      if (resp.ok) return true;
    } catch (e) {
      console.error('Resend API Email Error:', e);
    }
  }

  return false;
}

function emailCardWrapper(title, contentHtml) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #3730a3, #4f46e5); color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.88; }
    .body { padding: 24px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .info-table td.label { width: 35%; color: #64748b; font-weight: 600; background: #f8fafc; }
    .info-table td.val { color: #0f172a; font-weight: 500; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .btn { display: inline-block; padding: 12px 24px; background: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; }
    .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PPK DriveHub</h1>
      <p>ระบบบริหารจัดการยานพาหนะ โรงเรียนพะเยาพิทยาคม</p>
    </div>
    <div class="body">
      <h2 style="font-size: 17px; margin-top: 0; margin-bottom: 14px; color: #1e1b4b;">${title}</h2>
      ${contentHtml}
    </div>
    <div class="footer">
      งานยานพาหนะ กลุ่มบริหารทั่วไป โรงเรียนพะเยาพิทยาคม<br>
      อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ PPK DriveHub
    </div>
  </div>
</body>
</html>`;
}

export async function sendRequestCreatedEmail(env, req, requester) {
  const to = requester?.email;
  if (!to) return;

  const subject = `[PPK DriveHub] ยืนยันการส่งคำขอใช้รถราชการ - เลขที่ ${req.request_no}`;
  const dates = req.return_date && req.return_date !== req.date
    ? `${req.date} ถึง ${req.return_date}`
    : req.date;
  const times = req.time_start ? `${req.time_start} - ${req.time_end || ''} น.` : '-';

  const html = emailCardWrapper(
    '📝 ได้รับคำขอใช้รถราชการของท่านเรียบร้อยแล้ว',
    `<p style="font-size: 14px; margin-top: 0;">เรียนคุณ <b>${requester.display_name || requester.first_name || 'ผู้ขอใช้รถ'}</b>,</p>
     <p style="font-size: 14px; color: #334155;">ระบบได้บันทึกคำขอใช้รถราชการของท่านเข้าสู่ระบบเรียบร้อยแล้ว ขณะนี้อยู่ระหว่างรอการพิจารณาจัดรถจากผู้จัดคิว</p>
     <table class="info-table">
       <tr><td class="label">เลขที่คำขอ</td><td class="val"><b>${req.request_no}</b></td></tr>
       <tr><td class="label">วันเดินทาง</td><td class="val">${dates}</td></tr>
       <tr><td class="label">เวลาเดินทาง</td><td class="val">${times}</td></tr>
       <tr><td class="label">สถานที่ปลายทาง</td><td class="val">${req.destination || '-'}</td></tr>
       <tr><td class="label">วัตถุประสงค์</td><td class="val">${req.purpose || '-'}</td></tr>
       <tr><td class="label">จำนวนผู้โดยสาร</td><td class="val">${req.passengers || 1} คน</td></tr>
       <tr><td class="label">สถานะ</td><td class="val"><span class="badge badge-warning">รอพิจารณาจัดคิว</span></td></tr>
     </table>
     <p style="font-size: 13px; color: #64748b; margin-top: 14px;">เมื่อผู้จัดคิวอนุมัติและจัดรถเรียบร้อยแล้ว ระบบจะส่งอีเมลแจ้งรายละเอียดทะเบียนรถและพนักงานขับรถให้ท่านทราบอีกครั้ง</p>`
  );

  const text = `[PPK DriveHub] ยืนยันการส่งคำขอใช้รถราชการ
เลขที่คำขอ: ${req.request_no}
ผู้ขอใช้: ${requester.display_name || requester.first_name}
วันเดินทาง: ${dates} เวลา ${times}
สถานที่ปลายทาง: ${req.destination || '-'}
วัตถุประสงค์: ${req.purpose || '-'}
สถานะ: รอพิจารณาจัดคิว`;

  return sendNotificationEmail(env, { to, subject, html, text });
}

export async function sendRequestCancelledEmail(env, req, requester, cancelledByName) {
  const to = requester?.email;
  if (!to) return;

  const subject = `[PPK DriveHub] ยืนยันการยกเลิกคำขอใช้รถราชการ - เลขที่ ${req.request_no}`;
  const dates = req.return_date && req.return_date !== req.date
    ? `${req.date} ถึง ${req.return_date}`
    : req.date;

  const html = emailCardWrapper(
    '🚫 ยกเลิกคำขอใช้รถราชการเรียบร้อยแล้ว',
    `<p style="font-size: 14px; margin-top: 0;">เรียนคุณ <b>${requester.display_name || requester.first_name || 'ผู้ขอใช้รถ'}</b>,</p>
     <p style="font-size: 14px; color: #334155;">คำขอใช้รถราชการตามรายละเอียดด้านล่าง ได้ถูกยกเลิกในระบบเรียบร้อยแล้ว</p>
     <table class="info-table">
       <tr><td class="label">เลขที่คำขอ</td><td class="val"><b>${req.request_no}</b></td></tr>
       <tr><td class="label">วันเดินทางเดิม</td><td class="val">${dates}</td></tr>
       <tr><td class="label">สถานที่ปลายทาง</td><td class="val">${req.destination || '-'}</td></tr>
       <tr><td class="label">ผู้ดำเนินการยกเลิก</td><td class="val">${cancelledByName || 'ผู้ใช้งาน'}</td></tr>
       <tr><td class="label">สถานะ</td><td class="val"><span class="badge badge-danger">ยกเลิกแล้ว</span></td></tr>
     </table>`
  );

  const text = `[PPK DriveHub] แจ้งยกเลิกคำขอใช้รถราชการ
เลขที่คำขอ: ${req.request_no}
วันเดินทาง: ${dates}
ปลายทาง: ${req.destination || '-'}
ยกเลิกโดย: ${cancelledByName || 'ผู้ใช้งาน'}
สถานะ: ยกเลิกแล้ว`;

  return sendNotificationEmail(env, { to, subject, html, text });
}

export async function sendRequestApprovedEmail(env, req, requester, car, driver) {
  const to = requester?.email;
  if (!to) return;

  const subject = `[PPK DriveHub] คำขอใช้รถได้รับการอนุมัติและจัดรถแล้ว - เลขที่ ${req.request_no}`;
  const dates = req.return_date && req.return_date !== req.date
    ? `${req.date} ถึง ${req.return_date}`
    : req.date;
  const times = req.time_start ? `${req.time_start} - ${req.time_end || ''} น.` : '-';

  const carInfo = car ? `${car.license_plate} (${car.brand || ''} ${car.model || ''} ${car.color ? 'สี' + car.color : ''})`.trim() : 'จัดรถเรียบร้อย';
  const driverName = driver?.name || 'พนักงานขับรถประจำงานยานพาหนะ';
  const driverPhone = driver?.phone ? ` (โทร. ${driver.phone})` : '';

  const html = emailCardWrapper(
    '✅ คำขอใช้รถได้รับการอนุมัติและจัดรถเรียบร้อยแล้ว',
    `<p style="font-size: 14px; margin-top: 0;">เรียนคุณ <b>${requester.display_name || requester.first_name || 'ผู้ขอใช้รถ'}</b>,</p>
     <p style="font-size: 14px; color: #334155;">ผู้จัดคิวได้อนุมัติและจัดยานพาหนะพร้อมพนักงานขับรถสำหรับภารกิจของท่านเรียบร้อยแล้ว โดยมีรายละเอียดดังนี้:</p>
     <table class="info-table">
       <tr><td class="label">เลขที่คำขอ</td><td class="val"><b>${req.request_no}</b></td></tr>
       <tr><td class="label">วันเดินทาง</td><td class="val">${dates}</td></tr>
       <tr><td class="label">เวลา</td><td class="val">${times}</td></tr>
       <tr><td class="label">สถานที่ปลายทาง</td><td class="val">${req.destination || '-'}</td></tr>
       <tr><td class="label">🚗 ยานพาหนะ</td><td class="val"><b>${carInfo}</b></td></tr>
       <tr><td class="label">👤 พนักงานขับรถ</td><td class="val"><b>${driverName}</b>${driverPhone}</td></tr>
       <tr><td class="label">สถานะ</td><td class="val"><span class="badge badge-success">อนุมัติและจัดรถแล้ว</span></td></tr>
     </table>
     <p style="font-size: 13px; color: #64748b; margin-top: 14px;">กรุณาติดต่อประสานงานกับพนักงานขับรถก่อนเวลาออกเดินทาง</p>`
  );

  const text = `[PPK DriveHub] คำขอใช้รถได้รับการอนุมัติและจัดรถแล้ว
เลขที่คำขอ: ${req.request_no}
วันเดินทาง: ${dates} เวลา ${times}
ปลายทาง: ${req.destination || '-'}
ยานพาหนะ: ${carInfo}
พนักงานขับรถ: ${driverName}${driverPhone}
สถานะ: อนุมัติและจัดรถแล้ว`;

  return sendNotificationEmail(env, { to, subject, html, text });
}

export async function sendPasswordResetEmail(env, user, resetToken, origin) {
  const to = user?.email;
  if (!to) return;

  const baseOrigin = origin || 'https://ppk-drivehub.pages.dev';
  const resetUrl = `${baseOrigin}/reset-password.html?token=${encodeURIComponent(resetToken)}`;
  const subject = '[PPK DriveHub] ลิงก์สำหรับตั้งรหัสผ่านใหม่';

  const html = emailCardWrapper(
    '🔑 คำขอรีเซ็ตรหัสผ่านเข้าสู่ระบบ PPK DriveHub',
    `<p style="font-size: 14px; margin-top: 0;">เรียนคุณ <b>${user.display_name || user.first_name || 'ผู้ใช้งาน'}</b>,</p>
     <p style="font-size: 14px; color: #334155;">ระบบได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของท่าน หากท่านเป็นผู้ส่งคำขอนี้ กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
     <div style="text-align: center; margin: 24px 0;">
       <a href="${resetUrl}" class="btn" style="color:#ffffff;">ตั้งรหัสผ่านใหม่</a>
     </div>
     <p style="font-size: 13px; color: #64748b;">ลิงก์นี้มีอายุการใช้งาน 1 ชั่วโมง<br>หรือคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์: <a href="${resetUrl}" style="color:#4f46e5;word-break:break-all;">${resetUrl}</a></p>
     <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">หากท่านไม่ได้เป็นผู้ส่งคำขอนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้ รหัสผ่านเดิมของท่านจะยังคงปลอดภัย</p>`
  );

  const text = `[PPK DriveHub] ลิงก์สำหรับตั้งรหัสผ่านใหม่
เรียนคุณ ${user.display_name || user.first_name},
กรุณาเปิดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ (ลิงก์มีอายุ 1 ชั่วโมง):
${resetUrl}`;

  return sendNotificationEmail(env, { to, subject, html, text });
}
