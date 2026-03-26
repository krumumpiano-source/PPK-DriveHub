// Usage records — event-based (departure/return/refuel/inspection)
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  // PUBLIC QR usage record
  if (path === '/api/usage/record' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.car_id || !body?.record_type) return error('กรุณาระบุ car_id และ record_type');
    const validTypes = ['departure', 'return', 'refuel', 'inspection'];
    if (!validTypes.includes(body.record_type)) return error('record_type ต้องเป็น: ' + validTypes.join(', '));
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.record_type,
       body.datetime || ts, body.mileage || null,
       body.location || '', body.notes || '', body.queue_id || null, ts]
    );
    // Update car mileage if provided
    if (body.mileage && body.mileage > 0) {
      await dbRun(env.DB,
        'UPDATE cars SET current_mileage = ? WHERE id = ? AND (current_mileage IS NULL OR current_mileage < ?)',
        [body.mileage, body.car_id, body.mileage]
      );
    }
    return success({ id, message: 'บันทึกการใช้งานเรียบร้อย' }, 201);
  }

  if (!user) return error('Unauthorized', 401);

  // --- GET /api/usage ---
  if (path === '/api/usage' && method === 'GET') {
    try { requirePermission(user, 'usage', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const recordType = url.searchParams.get('record_type');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const queueId = url.searchParams.get('queue_id');
    const where = [];
    const params = [];
    if (carId) { where.push('ur.car_id = ?'); params.push(carId); }
    if (recordType) { where.push('ur.record_type = ?'); params.push(recordType); }
    if (dateFrom) { where.push('ur.datetime >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('ur.datetime <= ?'); params.push(dateTo + ' 23:59:59'); }
    if (queueId) { where.push('ur.queue_id = ?'); params.push(queueId); }
    const rows = await dbAll(env.DB,
      `SELECT ur.*, c.license_plate, c.brand, d.name AS driver_name
       FROM usage_records ur
       LEFT JOIN cars c ON ur.car_id = c.id
       LEFT JOIN drivers d ON ur.driver_id = d.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY ur.datetime DESC LIMIT 500`,
      params
    );
    return success(rows);
  }

  // --- GET /api/usage/:id ---
  if (path.match(/^\/api\/usage\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'usage', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, 'usage');
    const row = await dbFirst(env.DB,
      `SELECT ur.*, c.license_plate, c.brand, d.name AS driver_name
       FROM usage_records ur
       LEFT JOIN cars c ON ur.car_id = c.id
       LEFT JOIN drivers d ON ur.driver_id = d.id
       WHERE ur.id = ?`, [id]);
    if (!row) return error('ไม่พบข้อมูล', 404);
    return success(row);
  }

  // --- POST /api/usage ---
  if (path === '/api/usage' && method === 'POST') {
    try { requirePermission(user, 'usage', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.record_type) return error('กรุณาระบุยานพาหนะและประเภทการบันทึก');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.record_type,
       body.datetime || ts, body.mileage || null,
       body.location || '', body.notes || '', body.queue_id || null, ts]
    );
    if (body.mileage && body.mileage > 0) {
      await dbRun(env.DB,
        'UPDATE cars SET current_mileage = ? WHERE id = ? AND (current_mileage IS NULL OR current_mileage < ?)',
        [body.mileage, body.car_id, body.mileage]
      );
    }
    return success({ id, message: 'บันทึกการใช้งานเรียบร้อย' }, 201);
  }

  // --- PUT /api/usage/:id ---
  if (path.match(/^\/api\/usage\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'usage', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, 'usage');
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['car_id','driver_id','record_type','datetime','mileage','location','notes','queue_id'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(id);
    await dbRun(env.DB, `UPDATE usage_records SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลการใช้งานเรียบร้อย' });
  }

  // --- DELETE /api/usage/:id ---
  if (path.match(/^\/api\/usage\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'usage', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, 'usage');
    await dbRun(env.DB, 'DELETE FROM usage_records WHERE id = ?', [id]);
    return success({ message: 'ลบข้อมูลการใช้งานเรียบร้อย' });
  }

  // --- GET /api/usage/summary ---
  if (path === '/api/usage/summary' && method === 'GET') {
    try { requirePermission(user, 'usage', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const month = url.searchParams.get('month');
    const where = [];
    const params = [];
    if (carId) { where.push('car_id = ?'); params.push(carId); }
    if (month) { where.push("datetime LIKE ?"); params.push(month + '%'); }
    const row = await dbFirst(env.DB,
      `SELECT COUNT(*) AS total_records,
       SUM(CASE WHEN record_type = 'departure' THEN 1 ELSE 0 END) AS departures,
       SUM(CASE WHEN record_type = 'return' THEN 1 ELSE 0 END) AS returns,
       SUM(CASE WHEN record_type = 'refuel' THEN 1 ELSE 0 END) AS refuels,
       SUM(CASE WHEN record_type = 'inspection' THEN 1 ELSE 0 END) AS inspections
       FROM usage_records ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
      params
    );
    return success(row);
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}