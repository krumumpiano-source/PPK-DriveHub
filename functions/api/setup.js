// PPK DriveHub — First-time setup endpoint
// POST /api/setup → creates first admin user

import { dbFirst, dbRun, generateUUID, now, success, error, parseBody, hashPassword, generateSalt } from '../_helpers.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return error('Method not allowed', 405);

  // Only allow setup if no users exist
  const existing = await dbFirst(env.DB, 'SELECT id FROM users LIMIT 1');
  if (existing) return error('ระบบถูกตั้งค่าแล้ว ไม่สามารถสร้างผู้ดูแลซ้ำได้', 409);

  const body = await parseBody(request);
  if (!body?.username || !body?.password || !body?.first_name || !body?.last_name || !body?.email) {
    return error('กรุณากรอก username, password, first_name, last_name, email');
  }

  const salt = generateSalt();
  const hash = await hashPassword(body.password, salt);
  const id = generateUUID();
  const ts = now();
  const displayName = `${body.first_name} ${body.last_name}`;

  await dbRun(env.DB,
    `INSERT INTO users (id, username, email, password_hash, salt, role, permissions, title, first_name, last_name, display_name, active, pdpa_accepted, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'super_admin', '{}', ?, ?, ?, ?, 1, 1, 0, ?, ?)`,
    [id, body.username, body.email, hash, salt, body.title || '', body.first_name, body.last_name, displayName, ts, ts]
  );

  return success({ message: 'สร้างบัญชีผู้ดูแลระบบสำเร็จ', user_id: id });
}
