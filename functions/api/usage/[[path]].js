// PPK DriveHub — Usage Records API
// GET  /api/usage                (auth)
// POST /api/usage                (auth)
// POST /api/usage/qr             (public — QR submit)
// GET  /api/usage/:id            (auth)
// PUT  /api/usage/:id            (auth)

import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, writeAuditLog
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  // PUBLIC — QR submit
  if (path === '/api/usage/qr' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.car_id || !body?.purpose) return error('กรุณากรอกข้อมูลให้ครบ');
    const car = await dbFirst(env.DB, 'SELECT id, car_id FROM cars WHERE car_id = ? AND active = 1', [body.car_id]);
    if (!car) return error('ไม่พบยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO usage_records (id, car_id, driver_id, driver_name, purpose, destination,
        departure_date, departure_time, return_date, mileage_start, mileage_end, passenger_count,
        status, notes, submitted_by_qr, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, 1, ?, ?, ?)`,
      [id, car.id, body.driver_id || null, body.driver_name || '', body.purpose, body.destination || '',
       body.departure_date || ts.split('T')[0], body.departure_time || ts.split('T')[1]?.slice(0,5),
       body.return_date || null, body.mileage_start || 0, body.mileage_end || null,
       body.passenger_count || 1, body.notes || '', body.submitter_name || 'QR', ts, ts]
    );
    return success({ id, message: 'บันทึกการใช้รถเรียบร้อย' }, 201);
  }

  if (!user) return error('Unauthorized', 401);

  // GET /api/usage
  if (path === '/api/usage' && method === 'GET') {
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const carId = url.searchParams.get('car_id');
    const status = url.searchParams.get('status');
    const where = [];
    const params = [];
    if (dateFrom) { where.push('ur.departure_date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('ur.departure_date <= ?'); params.push(dateTo); }
    if (carId) { where.push('ur.car_id = ?'); params.push(carId); }
    if (status) { where.push('ur.status = ?'); params.push(status); }
    const rows = await dbAll(env.DB,
      `SELECT ur.*, c.car_id as car_code, c.brand, c.license_plate FROM usage_records ur
       LEFT JOIN cars c ON ur.car_id = c.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY ur.departure_date DESC, ur.departure_time DESC LIMIT 200`,
      params
    );
    return success(rows);
  }

  // POST /api/usage
  if (path === '/api/usage' && method === 'POST') {
    try { requirePermission(user, 'usage', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.purpose) return error('กรุณากรอกข้อมูลให้ครบ');
    const car = await dbFirst(env.DB, 'SELECT id FROM cars WHERE id = ? AND active = 1', [body.car_id]);
    if (!car) return error('ไม่พบยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO usage_records (id, car_id, driver_id, driver_name, purpose, destination,
        departure_date, departure_time, return_date, mileage_start, mileage_end, passenger_count,
        status, notes, submitted_by_qr, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, 0, ?, ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.driver_name || '', body.purpose, body.destination || '',
       body.departure_date || ts.split('T')[0], body.departure_time || '08:00',
       body.return_date || null, body.mileage_start || 0, body.mileage_end || null,
       body.passenger_count || 1, body.notes || '', user.id, ts, ts]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_usage', 'usage', id, null);
    return success({ id, message: 'บันทึกการใช้รถเรียบร้อย' }, 201);
  }

  // GET /api/usage/:id
  if (path.match(/^\/api\/usage\/[^/]+$/) && method === 'GET') {
    const id = extractParam(path, '/api/usage/');
    const row = await dbFirst(env.DB,
      'SELECT ur.*, c.car_id as car_code, c.brand, c.license_plate FROM usage_records ur LEFT JOIN cars c ON ur.car_id = c.id WHERE ur.id = ?',
      [id]
    );
    return row ? success(row) : error('ไม่พบข้อมูลการใช้รถ', 404);
  }

  // PUT /api/usage/:id
  if (path.match(/^\/api\/usage\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'usage', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/usage/');
    const body = await parseBody(request);
    const fields = ['driver_id', 'driver_name', 'purpose', 'destination', 'departure_date',
      'departure_time', 'return_date', 'return_time', 'mileage_start', 'mileage_end', 'passenger_count', 'status', 'notes'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?'); params.push(now(), id);
    await dbRun(env.DB, `UPDATE usage_records SET ${updates.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตการใช้รถเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}
