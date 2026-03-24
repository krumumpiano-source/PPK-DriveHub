// Fuel logs, requests, reports
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, requireAdmin, extractParam, writeAuditLog, uploadToR2
} from '../../_helpers.js';

// Fuel types config (matches original Config.gs)
const FUEL_TYPES = [
  { id: 'gasohol_95', label: 'แก๊สโซฮอล์ 95' },
  { id: 'gasohol_91', label: 'แก๊สโซฮอล์ 91' },
  { id: 'e20',        label: 'E20' },
  { id: 'e85',        label: 'E85' },
  { id: 'diesel',     label: 'ดีเซล' },
  { id: 'diesel_b7',  label: 'ดีเซล B7' },
  { id: 'ngv',        label: 'NGV' },
  { id: 'lpg',        label: 'LPG' },
];

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;


  if (path === '/api/fuel/types' && method === 'GET') {
    // Also return price per litre from system_settings
    const prices = {};
    const settings = await dbAll(env.DB,
      `SELECT key, value FROM system_settings WHERE key LIKE 'fuel_price_%'`
    );
    for (const s of settings) {
      const fuelId = s.key.replace('fuel_price_', '');
      prices[fuelId] = parseFloat(s.value) || 0;
    }
    return success(FUEL_TYPES.map(f => ({ ...f, price_per_litre: prices[f.id] || 0 })));
  }

  if (path === '/api/fuel/qr' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.car_id || !body?.fuel_type || !body?.liters) return error('กรุณากรอกข้อมูลให้ครบ');
    const car = await dbFirst(env.DB, 'SELECT id, car_id FROM cars WHERE car_id = ? AND active = 1', [body.car_id]);
    if (!car) return error('ไม่พบยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    let receiptUrl = '';
    if (body.receipt_base64 && body.receipt_mime) {
      receiptUrl = await uploadToR2(env, body.receipt_base64, `fuel_receipt_${id}.jpg`, 'FUEL', body.receipt_mime);
    }
    let meterUrl = '';
    if (body.meter_base64 && body.meter_mime) {
      meterUrl = await uploadToR2(env, body.meter_base64, `fuel_meter_${id}.jpg`, 'FUEL', body.meter_mime);
    }
    const fuelType = FUEL_TYPES.find(f => f.id === body.fuel_type);
    const priceRow = await dbFirst(env.DB, 'SELECT value FROM system_settings WHERE key = ?', [`fuel_price_${body.fuel_type}`]);
    const pricePerL = parseFloat(priceRow?.value || '0');
    const liters = parseFloat(body.liters) || 0;
    const totalCost = body.total_cost ? parseFloat(body.total_cost) : liters * pricePerL;

    await dbRun(env.DB,
      `INSERT INTO fuel_log (id, car_id, fuel_type, fuel_type_label, liters, price_per_litre, total_cost,
        mileage, station_name, receipt_url, meter_image_url, pump_meter_number,
        driver_id, driver_name, notes, submitted_by_qr, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [id, car.id, body.fuel_type, fuelType?.label || body.fuel_type,
       liters, pricePerL, totalCost, body.mileage || 0, body.station_name || '',
       receiptUrl, meterUrl, body.pump_meter_number || '',
       body.driver_id || null, body.driver_name || 'QR', body.notes || '',
       body.submitter_name || 'QR', ts, ts]
    );
    return success({ id, message: 'บันทึกการเติมน้ำมันเรียบร้อย' }, 201);
  }

  if (!user) return error('Unauthorized', 401);

  if (path === '/api/fuel' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const carId = url.searchParams.get('car_id');
    const where = [];
    const params = [];
    if (dateFrom) { where.push('fl.created_at >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('fl.created_at <= ?'); params.push(dateTo + ' 23:59:59'); }
    if (carId) { where.push('fl.car_id = ?'); params.push(carId); }
    const rows = await dbAll(env.DB,
      `SELECT fl.*, c.car_id as car_code, c.brand, c.license_plate FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY fl.created_at DESC LIMIT 200`,
      params
    );
    return success(rows);
  }

  if (path === '/api/fuel' && method === 'POST') {
    try { requirePermission(user, 'fuel', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.fuel_type || !body?.liters) return error('กรุณากรอกข้อมูลให้ครบ');
    const id = generateUUID();
    const ts = now();
    let receiptUrl = '';
    if (body.receipt_base64 && body.receipt_mime) {
      receiptUrl = await uploadToR2(env, body.receipt_base64, `fuel_receipt_${id}.jpg`, 'FUEL', body.receipt_mime);
    }
    let meterUrl = '';
    if (body.meter_base64 && body.meter_mime) {
      meterUrl = await uploadToR2(env, body.meter_base64, `fuel_meter_${id}.jpg`, 'FUEL', body.meter_mime);
    }
    const fuelType = FUEL_TYPES.find(f => f.id === body.fuel_type);
    const liters = parseFloat(body.liters) || 0;
    const total = parseFloat(body.total_cost) || liters * (parseFloat(body.price_per_litre) || 0);
    await dbRun(env.DB,
      `INSERT INTO fuel_log (id, car_id, fuel_type, fuel_type_label, liters, price_per_litre, total_cost,
        mileage, station_name, receipt_url, meter_image_url, pump_meter_number,
        driver_id, driver_name, notes, submitted_by_qr, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [id, body.car_id, body.fuel_type, fuelType?.label || body.fuel_type,
       liters, parseFloat(body.price_per_litre) || 0, total,
       body.mileage || 0, body.station_name || '', receiptUrl, meterUrl,
       body.pump_meter_number || '', body.driver_id || null, body.driver_name || '',
       body.notes || '', user.id, ts, ts]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_fuel', 'fuel', id, null);
    return success({ id, message: 'บันทึกการเติมน้ำมันเรียบร้อย' }, 201);
  }

  if (path === '/api/fuel/reports' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const year = url.searchParams.get('year') || new Date().getFullYear().toString();
    const month = url.searchParams.get('month');
    let sql, params;
    if (month) {
      const ym = `${year}-${String(month).padStart(2, '0')}`;
      sql = `SELECT c.car_id as car_code, c.brand, c.license_plate,
             SUM(fl.liters) as total_liters, SUM(fl.total_cost) as total_cost, COUNT(*) as fill_count
             FROM fuel_log fl JOIN cars c ON fl.car_id = c.id
             WHERE strftime('%Y-%m', fl.created_at) = ?
             GROUP BY fl.car_id ORDER BY total_cost DESC`;
      params = [ym];
    } else {
      sql = `SELECT strftime('%Y-%m', fl.created_at) as month,
             SUM(fl.liters) as total_liters, SUM(fl.total_cost) as total_cost, COUNT(*) as fill_count
             FROM fuel_log fl
             WHERE strftime('%Y', fl.created_at) = ?
             GROUP BY month ORDER BY month`;
      params = [year];
    }
    const rows = await dbAll(env.DB, sql, params);
    return success(rows);
  }

  if (path === '/api/fuel/requests' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status') || 'pending';
    const rows = await dbAll(env.DB,
      'SELECT * FROM fuel_requests WHERE status = ? ORDER BY created_at DESC', [status]
    );
    return success(rows);
  }

  if (path === '/api/fuel/requests' && method === 'POST') {
    try { requirePermission(user, 'fuel', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.liters) return error('กรุณากรอกข้อมูลให้ครบ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO fuel_requests (id, car_id, driver_id, fuel_type, liters, purpose, requested_date, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.fuel_type || 'diesel', body.liters,
       body.purpose || '', body.requested_date || ts.split('T')[0], user.id, ts]
    );
    return success({ id, message: 'ส่งคำขอเติมน้ำมันเรียบร้อย' }, 201);
  }

  if (path.match(/\/api\/fuel\/requests\/[^/]+\/approve/) && method === 'PUT') {
    try { requireAdmin(user); } catch { return error('ต้องเป็น Admin', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    await dbRun(env.DB,
      'UPDATE fuel_requests SET status = ?, approved_by = ?, approved_at = ?, notes = ? WHERE id = ?',
      ['approved', user.id, now(), body?.notes || '', id]
    );
    return success({ message: 'อนุมัติคำขอเติมน้ำมันเรียบร้อย' });
  }

  if (path.match(/\/api\/fuel\/requests\/[^/]+\/reject/) && method === 'PUT') {
    try { requireAdmin(user); } catch { return error('ต้องเป็น Admin', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    await dbRun(env.DB,
      'UPDATE fuel_requests SET status = ?, rejection_reason = ?, approved_by = ?, approved_at = ? WHERE id = ?',
      ['rejected', body?.reason || '', user.id, now(), id]
    );
    return success({ message: 'ปฏิเสธคำขอเติมน้ำมัน' });
  }

  if (path.match(/^\/api\/fuel\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/fuel/');
    const row = await dbFirst(env.DB,
      'SELECT fl.*, c.car_id as car_code, c.brand, c.license_plate FROM fuel_log fl LEFT JOIN cars c ON fl.car_id = c.id WHERE fl.id = ?',
      [id]
    );
    return row ? success(row) : error('ไม่พบข้อมูล', 404);
  }

  if (path.match(/^\/api\/fuel\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'fuel', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/fuel/');
    const body = await parseBody(request);
    const fields = ['fuel_type', 'liters', 'price_per_litre', 'total_cost', 'mileage', 'station_name',
      'driver_id', 'driver_name', 'notes', 'pump_meter_number'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?'); params.push(now(), id);
    await dbRun(env.DB, `UPDATE fuel_log SET ${updates.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลน้ำมันเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}