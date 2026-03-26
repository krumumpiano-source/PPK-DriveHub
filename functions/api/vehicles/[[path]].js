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
      `SELECT id, license_plate, brand, model, status, vehicle_images FROM cars WHERE id = ? AND status != 'inactive'`, [car_id]
    );
    if (!car) {
      const carByPlate = await dbFirst(env.DB,
        `SELECT id, license_plate, brand, model, status, vehicle_images FROM cars WHERE license_plate = ? AND status != 'inactive'`, [car_id]
      );
      return carByPlate ? success(carByPlate) : error('ไม่พบยานพาหนะ', 404);
    }
    return success(car);
  }

  if (!user) return error('Unauthorized', 401);

  if (path === '/api/vehicles' && method === 'GET') {
    try { requirePermission(user, 'vehicles', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const params = [];
    const where = ["status != 'inactive'"];
    if (status) { where.push('status = ?'); params.push(status); }
    const vehicles = await dbAll(env.DB,
      `SELECT * FROM cars WHERE ${where.join(' AND ')} ORDER BY license_plate ASC`, params
    );
    return success(vehicles);
  }

  if (path === '/api/vehicles' && method === 'POST') {
    try { requirePermission(user, 'vehicles', 'create'); } catch { return error('ไม่มีสิทธิ์เพิ่มยานพาหนะ', 403); }
    const body = await parseBody(request);
    if (!body?.license_plate || !body?.brand) return error('กรุณากรอกข้อมูลให้ครบ');
    const id = generateUUID();
    const ts = now();
    let images = '[]';
    if (body.image_base64 && body.image_mime) {
      const imgUrl = await uploadToR2(env, body.image_base64, `vehicle_${id}.jpg`, 'VEHICLES', body.image_mime);
      images = JSON.stringify([imgUrl]);
    }
    await dbRun(env.DB,
      `INSERT INTO cars (id, license_plate, brand, model, year, color, fuel_type, seat_count,
        chassis_number, engine_number, registration_date, registration_expiry,
        owner_name, owner_address, status, current_mileage, qr_code,
        vehicle_images, registration_book_image, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.license_plate, body.brand, body.model || '', body.year || null,
       body.color || '', body.fuel_type || 'diesel', body.seat_count || 4,
       body.chassis_number || '', body.engine_number || '',
       body.registration_date || null, body.registration_expiry || null,
       body.owner_name || '', body.owner_address || '',
       body.status || 'active', body.current_mileage || 0, body.qr_code || '',
       images, body.registration_book_image || '', body.notes || '', user.id, ts, ts]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_vehicle', 'vehicles', id, { license_plate: body.license_plate });
    return success({ id, message: 'เพิ่มยานพาหนะเรียบร้อย' }, 201);
  }

  if (path.match(/^\/api\/vehicles\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'vehicles', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/vehicles/');
    const car = await dbFirst(env.DB, "SELECT * FROM cars WHERE id = ? AND status != 'inactive'", [id]);
    return car ? success(car) : error('ไม่พบยานพาหนะ', 404);
  }

  if (path.match(/^\/api\/vehicles\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'vehicles', 'edit'); } catch { return error('ไม่มีสิทธิ์แก้ไขยานพาหนะ', 403); }
    const id = extractParam(path, '/api/vehicles/');
    const body = await parseBody(request);
    const fields = ['license_plate', 'brand', 'model', 'year', 'color', 'fuel_type', 'seat_count',
      'chassis_number', 'engine_number', 'registration_date', 'registration_expiry',
      'owner_name', 'owner_address', 'status', 'current_mileage', 'qr_code',
      'registration_book_image', 'notes'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.image_base64 && body.image_mime) {
      const imgUrl = await uploadToR2(env, body.image_base64, `vehicle_${id}.jpg`, 'VEHICLES', body.image_mime);
      updates.push('vehicle_images = ?'); params.push(JSON.stringify([imgUrl]));
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
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE cars SET status = 'inactive', deactivated_reason = ?, deactivated_at = ?, updated_at = ? WHERE id = ?`,
      [body?.reason || '', now(), now(), id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'deactivate_vehicle', 'vehicles', id, null);
    return success({ message: 'ปิดการใช้งานยานพาหนะเรียบร้อย' });
  }

  if (path.match(/\/api\/vehicles\/[^/]+\/maintenance/) && method === 'GET') {
    try { requirePermission(user, 'vehicles', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const logs = await dbAll(env.DB,
      'SELECT * FROM vehicle_maintenance WHERE car_id = ? ORDER BY updated_at DESC', [id]
    );
    return success(logs);
  }

  if (path.match(/\/api\/vehicles\/[^/]+\/maintenance/) && method === 'POST') {
    try { requirePermission(user, 'maintenance', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = path.split('/')[3];
    const body = await parseBody(request);
    if (!body?.item_key) return error('กรุณาระบุ item_key');
    const ts = now();
    // Upsert: update if exists, insert if not
    const existing = await dbFirst(env.DB,
      'SELECT id FROM vehicle_maintenance WHERE car_id = ? AND item_key = ?', [carId, body.item_key]
    );
    if (existing) {
      await dbRun(env.DB,
        `UPDATE vehicle_maintenance SET last_km = ?, last_date = ?, next_km = ?, next_date = ?, updated_at = ? WHERE id = ?`,
        [body.last_km || null, body.last_date || null, body.next_km || null, body.next_date || null, ts, existing.id]
      );
      return success({ id: existing.id, message: 'อัปเดตข้อมูลบำรุงรักษาเรียบร้อย' });
    }
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, carId, body.item_key, body.last_km || null, body.last_date || null,
       body.next_km || null, body.next_date || null, ts]
    );
    return success({ id, message: 'บันทึกข้อมูลบำรุงรักษาเรียบร้อย' }, 201);
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}