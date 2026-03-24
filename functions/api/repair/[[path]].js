// PPK DriveHub — Repair API
// GET    /api/repair
// POST   /api/repair
// GET    /api/repair/:id
// PUT    /api/repair/:id
// PUT    /api/repair/:id/complete
// DELETE /api/repair/:id  (admin)
// GET    /api/repair/scheduled
// POST   /api/repair/scheduled
// PUT    /api/repair/scheduled/:id

import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, requireAdmin, extractParam, writeAuditLog, uploadToR2
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);

  // GET /api/repair/scheduled
  if (path === '/api/repair/scheduled' && method === 'GET') {
    const status = url.searchParams.get('status');
    const where = status ? 'WHERE status = ?' : '';
    const rows = await dbAll(env.DB,
      `SELECT sr.*, c.car_id as car_code, c.brand, c.license_plate
       FROM scheduled_repairs sr LEFT JOIN cars c ON sr.car_id = c.id
       ${where} ORDER BY sr.scheduled_date ASC`,
      status ? [status] : []
    );
    return success(rows);
  }

  // POST /api/repair/scheduled
  if (path === '/api/repair/scheduled' && method === 'POST') {
    try { requirePermission(user, 'maintenance', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO scheduled_repairs (id, car_id, repair_type, description, scheduled_date, estimated_cost,
        shop_name, status, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [id, body.car_id, body.repair_type, body.description || '', body.scheduled_date,
       body.estimated_cost || 0, body.shop_name || '', body.notes || '', user.id, ts, ts]
    );
    return success({ id, message: 'บันทึกตารางซ่อมเรียบร้อย' }, 201);
  }

  // PUT /api/repair/scheduled/:id
  if (path.match(/\/api\/repair\/scheduled\/[^/]+/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    const fields = ['repair_type', 'description', 'scheduled_date', 'estimated_cost', 'actual_cost',
      'shop_name', 'status', 'notes', 'completed_date'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?'); params.push(now(), id);
    await dbRun(env.DB, `UPDATE scheduled_repairs SET ${updates.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตตารางซ่อมเรียบร้อย' });
  }

  // GET /api/repair
  if (path === '/api/repair' && method === 'GET') {
    const status = url.searchParams.get('status');
    const carId = url.searchParams.get('car_id');
    const where = [];
    const params = [];
    if (status) { where.push('rl.status = ?'); params.push(status); }
    if (carId) { where.push('rl.car_id = ?'); params.push(carId); }
    const rows = await dbAll(env.DB,
      `SELECT rl.*, c.car_id as car_code, c.brand, c.license_plate FROM repair_log rl
       LEFT JOIN cars c ON rl.car_id = c.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY rl.created_at DESC LIMIT 200`,
      params
    );
    return success(rows);
  }

  // POST /api/repair
  if (path === '/api/repair' && method === 'POST') {
    try { requirePermission(user, 'repair', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.repair_type) return error('กรุณากรอกข้อมูลให้ครบ');
    const id = generateUUID();
    const ts = now();
    let docUrl = '';
    if (body.doc_base64 && body.doc_mime) {
      docUrl = await uploadToR2(env, body.doc_base64, `repair_doc_${id}.jpg`, 'REPAIR', body.doc_mime);
    }
    await dbRun(env.DB,
      `INSERT INTO repair_log (id, car_id, repair_type, description, report_date, mileage_at_repair,
        damage_level, estimated_cost, actual_cost, shop_name, technician, status,
        doc_url, driver_id, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.repair_type, body.description || '', body.report_date || ts.split('T')[0],
       body.mileage_at_repair || 0, body.damage_level || 'minor', body.estimated_cost || 0, body.actual_cost || 0,
       body.shop_name || '', body.technician || '', body.status || 'pending',
       docUrl, body.driver_id || null, body.notes || '', user.id, ts, ts]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_repair', 'repair', id, { car_id: body.car_id });
    return success({ id, message: 'บันทึกการซ่อมเรียบร้อย' }, 201);
  }

  // GET /api/repair/:id
  if (path.match(/^\/api\/repair\/[^/]+$/) && method === 'GET') {
    const id = extractParam(path, '/api/repair/');
    const row = await dbFirst(env.DB,
      'SELECT rl.*, c.car_id as car_code, c.brand, c.license_plate FROM repair_log rl LEFT JOIN cars c ON rl.car_id = c.id WHERE rl.id = ?',
      [id]
    );
    return row ? success(row) : error('ไม่พบข้อมูลการซ่อม', 404);
  }

  // PUT /api/repair/:id (general update)
  if (path.match(/^\/api\/repair\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/repair/');
    const body = await parseBody(request);
    const fields = ['repair_type', 'description', 'damage_level', 'estimated_cost', 'actual_cost',
      'shop_name', 'technician', 'status', 'notes', 'completed_date'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.doc_base64 && body.doc_mime) {
      const docUrl = await uploadToR2(env, body.doc_base64, `repair_doc_${id}.jpg`, 'REPAIR', body.doc_mime);
      updates.push('doc_url = ?'); params.push(docUrl);
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?'); params.push(now(), id);
    await dbRun(env.DB, `UPDATE repair_log SET ${updates.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลการซ่อมเรียบร้อย' });
  }

  // PUT /api/repair/:id/complete
  if (path.match(/\/api\/repair\/[^/]+\/complete/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'completed', actual_cost = ?, completed_date = ?, updated_at = ? WHERE id = ?`,
      [body?.actual_cost || 0, body?.completed_date || now().split('T')[0], now(), id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'complete_repair', 'repair', id, null);
    return success({ message: 'ปิดงานซ่อมเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}
