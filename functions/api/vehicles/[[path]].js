// Vehicle CRUD, health scores, images
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, writeAuditLog, uploadToR2
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  // PUBLIC — QR info (no auth)
  if (path === '/api/vehicles/qr-info' && method === 'GET') {
    const car_id = url.searchParams.get('car_id');
    if (!car_id) return error('กรุณาระบุ car_id');
    const car = await dbFirst(env.DB,
      'SELECT id, car_id, brand, model, license_plate, car_type, status, image_url FROM cars WHERE car_id = ? AND active = 1', [car_id]
    );
    return car ? success(car) : error('ไม่พบยานพาหนะ', 404);
  }

  if (!user) return error('Unauthorized', 401);

  if (path === '/api/vehicles' && method === 'GET') {
    try { requirePermission(user, 'vehicles', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('car_type');
    const params = [];
    const where = ['active = 1'];
    if (status) { where.push('status = ?'); params.push(status); }
    if (type) { where.push('car_type = ?'); params.push(type); }
    const vehicles = await dbAll(env.DB,
      `SELECT * FROM cars WHERE ${where.join(' AND ')} ORDER BY car_id ASC`, params
    );
    return success(vehicles);
  }

  if (path === '/api/vehicles' && method === 'POST') {
    try { requirePermission(user, 'vehicles', 'create'); } catch { return error('ไม่มีสิทธิ์เพิ่มยานพาหนะ', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.brand || !body?.license_plate) return error('กรุณากรอกข้อมูลให้ครบ');
    const id = generateUUID();
    const ts = now();
    let imageUrl = '';
    if (body.image_base64 && body.image_mime) {
      imageUrl = await uploadToR2(env, body.image_base64, `vehicle_${id}.jpg`, 'VEHICLES', body.image_mime);
    }
    await dbRun(env.DB,
      `INSERT INTO cars (id, car_id, brand, model, license_plate, car_type, color, year, fuel_type, mileage,
        status, active, image_url, last_check_date, registration_expiry, insurance_expiry, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.brand, body.model || '', body.license_plate,
       body.car_type || 'sedan', body.color || '', body.year || null, body.fuel_type || 'เบนซิน',
       body.mileage || 0, body.status || 'active', imageUrl,
       body.last_check_date || null, body.registration_expiry || null, body.insurance_expiry || null,
       body.notes || '', user.id, ts, ts]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_vehicle', 'vehicles', id, { car_id: body.car_id });
    return success({ id, message: 'เพิ่มยานพาหนะเรียบร้อย' }, 201);
  }

  if (path.match(/^\/api\/vehicles\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'vehicles', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/vehicles/');
    const car = await dbFirst(env.DB, 'SELECT * FROM cars WHERE id = ? AND active = 1', [id]);
    return car ? success(car) : error('ไม่พบยานพาหนะ', 404);
  }

  if (path.match(/^\/api\/vehicles\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'vehicles', 'edit'); } catch { return error('ไม่มีสิทธิ์แก้ไขยานพาหนะ', 403); }
    const id = extractParam(path, '/api/vehicles/');
    const body = await parseBody(request);
    const fields = ['brand', 'model', 'license_plate', 'car_type', 'color', 'year', 'fuel_type', 'mileage',
      'status', 'notes', 'last_check_date', 'registration_expiry', 'insurance_expiry'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.image_base64 && body.image_mime) {
      const url = await uploadToR2(env, body.image_base64, `vehicle_${id}.jpg`, 'VEHICLES', body.image_mime);
      updates.push('image_url = ?'); params.push(url);
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?'); params.push(now(), id);
    await dbRun(env.DB, `UPDATE cars SET ${updates.join(', ')} WHERE id = ?`, params);
    await writeAuditLog(env.DB, user.id, user.displayName, 'update_vehicle', 'vehicles', id, null);
    return success({ message: 'อัปเดตยานพาหนะเรียบร้อย' });
  }

  if (path.match(/\/api\/vehicles\/[^/]+\/deactivate/) && method === 'PUT') {
    try { requirePermission(user, 'vehicles', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    await dbRun(env.DB, 'UPDATE cars SET active = 0, updated_at = ? WHERE id = ?', [now(), id]);
    await writeAuditLog(env.DB, user.id, user.displayName, 'deactivate_vehicle', 'vehicles', id, null);
    return success({ message: 'ปิดการใช้งานยานพาหนะเรียบร้อย' });
  }

  if (path.match(/\/api\/vehicles\/[^/]+\/maintenance/) && method === 'GET') {
    try { requirePermission(user, 'vehicles', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const logs = await dbAll(env.DB,
      'SELECT * FROM vehicle_maintenance WHERE car_id = ? ORDER BY service_date DESC', [id]
    );
    return success(logs);
  }

  if (path.match(/\/api\/vehicles\/[^/]+\/maintenance/) && method === 'POST') {
    try { requirePermission(user, 'maintenance', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const body = await parseBody(request);
    const mid = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO vehicle_maintenance (id, car_id, maintenance_type, description, service_date, mileage_at_service,
        cost, shop_name, technician, status, next_service_date, next_mileage, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [mid, id, body.maintenance_type, body.description || '', body.service_date || ts,
       body.mileage_at_service || 0, body.cost || 0, body.shop_name || '', body.technician || '',
       body.status || 'completed', body.next_service_date || null, body.next_mileage || null,
       body.notes || '', user.id, ts]
    );
    return success({ id: mid, message: 'บันทึกการซ่อมบำรุงเรียบร้อย' }, 201);
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}