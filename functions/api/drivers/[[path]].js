// PPK DriveHub — Drivers API
// GET    /api/drivers
// POST   /api/drivers
// GET    /api/drivers/:id
// PUT    /api/drivers/:id
// PUT    /api/drivers/:id/deactivate
// GET    /api/drivers/:id/fatigue
// POST   /api/drivers/fatigue  (for logged-in user self-report)
// GET    /api/drivers/:id/leaves
// POST   /api/drivers/:id/leaves

import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, writeAuditLog, uploadToR2
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);

  // GET /api/drivers
  if (path === '/api/drivers' && method === 'GET') {
    const status = url.searchParams.get('status');
    const where = ['active = 1'];
    const params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    const drivers = await dbAll(env.DB,
      `SELECT * FROM drivers WHERE ${where.join(' AND ')} ORDER BY last_name ASC`, params
    );
    return success(drivers);
  }

  // POST /api/drivers
  if (path === '/api/drivers' && method === 'POST') {
    try { requirePermission(user, 'drivers', 'create'); } catch { return error('ไม่มีสิทธิ์เพิ่มคนขับ', 403); }
    const body = await parseBody(request);
    if (!body?.first_name || !body?.license_number) return error('กรุณากรอกชื่อและหมายเลขใบขับขี่');
    const id = generateUUID();
    const ts = now();
    let imageUrl = '';
    if (body.image_base64 && body.image_mime) {
      imageUrl = await uploadToR2(env, body.image_base64, `driver_${id}.jpg`, 'DRIVERS', body.image_mime);
    }
    await dbRun(env.DB,
      `INSERT INTO drivers (id, employee_id, title, first_name, last_name, display_name, phone, license_number,
        license_type, license_expiry, department, position, status, active, image_url, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      [id, body.employee_id || '', body.title || '', body.first_name, body.last_name || '',
       body.display_name || `${body.title || ''}${body.first_name} ${body.last_name || ''}`.trim(),
       body.phone || '', body.license_number, body.license_type || 'ท.2',
       body.license_expiry || null, body.department || '', body.position || '',
       body.status || 'active', imageUrl, body.notes || '', user.id, ts, ts]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_driver', 'drivers', id, { name: body.first_name });
    return success({ id, message: 'เพิ่มคนขับเรียบร้อย' }, 201);
  }

  // POST /api/drivers/fatigue — self-report for logged-in user
  if (path === '/api/drivers/fatigue' && method === 'POST') {
    const body = await parseBody(request);
    // find driver linked to current user
    const driver = await dbFirst(env.DB, 'SELECT id FROM drivers WHERE user_id = ? AND active = 1', [user.id]);
    const driverId = driver?.id || body?.driver_id;
    if (!driverId) return error('ไม่พบข้อมูลคนขับ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO self_reported_fatigue (id, driver_id, report_date, fatigue_level, symptoms, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, driverId, body.report_date || ts, body.fatigue_level || 1, body.symptoms || '', body.notes || '', ts]
    );
    return success({ id, message: 'บันทึกรายงานความเหนื่อยล้าเรียบร้อย' }, 201);
  }

  // GET /api/drivers/:id
  if (path.match(/^\/api\/drivers\/[^/]+$/) && method === 'GET') {
    const id = extractParam(path, '/api/drivers/');
    const driver = await dbFirst(env.DB, 'SELECT * FROM drivers WHERE id = ? AND active = 1', [id]);
    return driver ? success(driver) : error('ไม่พบคนขับ', 404);
  }

  // PUT /api/drivers/:id
  if (path.match(/^\/api\/drivers\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'drivers', 'edit'); } catch { return error('ไม่มีสิทธิ์แก้ไข', 403); }
    const id = extractParam(path, '/api/drivers/');
    const body = await parseBody(request);
    const fields = ['employee_id', 'title', 'first_name', 'last_name', 'display_name', 'phone',
      'license_number', 'license_type', 'license_expiry', 'department', 'position', 'status', 'notes', 'user_id'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.image_base64 && body.image_mime) {
      const imgUrl = await uploadToR2(env, body.image_base64, `driver_${id}.jpg`, 'DRIVERS', body.image_mime);
      updates.push('image_url = ?'); params.push(imgUrl);
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?'); params.push(now(), id);
    await dbRun(env.DB, `UPDATE drivers SET ${updates.join(', ')} WHERE id = ?`, params);
    await writeAuditLog(env.DB, user.id, user.displayName, 'update_driver', 'drivers', id, null);
    return success({ message: 'อัปเดตข้อมูลคนขับเรียบร้อย' });
  }

  // PUT /api/drivers/:id/deactivate
  if (path.match(/\/api\/drivers\/[^/]+\/deactivate/) && method === 'PUT') {
    try { requirePermission(user, 'drivers', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    await dbRun(env.DB, 'UPDATE drivers SET active = 0, updated_at = ? WHERE id = ?', [now(), id]);
    await writeAuditLog(env.DB, user.id, user.displayName, 'deactivate_driver', 'drivers', id, null);
    return success({ message: 'ปิดการใช้งานคนขับเรียบร้อย' });
  }

  // GET /api/drivers/:id/fatigue
  if (path.match(/\/api\/drivers\/[^/]+\/fatigue/) && method === 'GET') {
    const id = path.split('/')[3];
    const logs = await dbAll(env.DB,
      'SELECT * FROM self_reported_fatigue WHERE driver_id = ? ORDER BY created_at DESC LIMIT 30', [id]
    );
    return success(logs);
  }

  // GET /api/drivers/:id/leaves
  if (path.match(/\/api\/drivers\/[^/]+\/leaves/) && method === 'GET') {
    const id = path.split('/')[3];
    const leaves = await dbAll(env.DB,
      'SELECT * FROM leaves WHERE driver_id = ? ORDER BY start_date DESC', [id]
    );
    return success(leaves);
  }

  // POST /api/drivers/:id/leaves
  if (path.match(/\/api\/drivers\/[^/]+\/leaves/) && method === 'POST') {
    const id = path.split('/')[3];
    const body = await parseBody(request);
    if (!body?.start_date || !body?.end_date) return error('กรุณาระบุวันที่');
    const lid = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO leaves (id, driver_id, leave_type, start_date, end_date, reason, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [lid, id, body.leave_type || 'sick', body.start_date, body.end_date, body.reason || '', user.id, ts]
    );
    return success({ id: lid, message: 'ยื่นคำขอลาเรียบร้อย' }, 201);
  }

  return error('Not Found', 404);
}
