// Fuel logs + fuel requests
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, uploadToR2, writeAuditLog,
  sendTelegramMessage, createNotification, notifyAllAdmins
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  // PUBLIC QR fuel record
  if (path === '/api/fuel/record' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุ car_id');
    const id = generateUUID();
    const ts = now();

    // Upload receipt image if provided
    let receiptImage = body.receipt_image || null;
    if (body.receipt_image_file) {
      receiptImage = await uploadToR2(env, body.receipt_image_file, `fuel/${id}`);
    }
    let receiptPdf = body.receipt_pdf || null;

    await dbRun(env.DB,
      `INSERT INTO fuel_log (id, date, time, car_id, driver_id,
        mileage_before, mileage_after, liters, price_per_liter, amount,
        fuel_type, gas_station_name, gas_station_address, gas_station_tax_id,
        receipt_number, pump_meter_number, receipt_image, receipt_pdf,
        fuel_consumption_rate, expense_type, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.date || ts.substr(0,10), body.time || ts.substr(11,5),
       body.car_id, body.driver_id || null,
       body.mileage_before || 0, body.mileage_after || 0,
       body.liters || 0, body.price_per_liter || 0, body.amount || 0,
       body.fuel_type || '', body.gas_station_name || body.station_name || '',
       body.gas_station_address || '', body.gas_station_tax_id || '',
       body.receipt_number || '', body.pump_meter_number || '',
       receiptImage, receiptPdf,
       body.fuel_consumption_rate || null, body.expense_type || 'procurement',
       body.notes || '', body.created_by || user?.id || 'qr', ts, ts]
    );

    // Update car mileage if provided
    if (body.mileage_after && body.mileage_after > 0) {
      await dbRun(env.DB,
        'UPDATE cars SET current_mileage = ? WHERE id = ? AND (current_mileage IS NULL OR current_mileage < ?)',
        [body.mileage_after, body.car_id, body.mileage_after]
      );
    }

    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [body.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : body.car_id;
    await writeAuditLog(env.DB, null, 'QR', 'create_fuel', 'fuel', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'fuel', 'เติมน้ำมัน',
      `บันทึกเติมน้ำมัน ${carLabel} — ${body.liters || 0} ลิตร, ${body.amount || 0} บาท`);
    await sendTelegramMessage(env,
      `⛽ <b>เติมน้ำมัน</b>\n🚗 ${carLabel}\n🛢️ ${body.liters || 0} ลิตร | ${body.amount || 0} บาท\n⛽ ${body.gas_station_name || body.station_name || '-'}\n📏 ${body.mileage_before || '-'} → ${body.mileage_after || '-'} กม.`);

    return success({ id, message: 'บันทึกข้อมูลเชื้อเพลิงเรียบร้อย' }, 201);
  }

  if (!user) return error('Unauthorized', 401);

  // --- GET /api/fuel/log ---
  if (path === '/api/fuel/log' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const where = [];
    const params = [];
    if (carId) { where.push('fl.car_id = ?'); params.push(carId); }
    if (dateFrom) { where.push('fl.date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('fl.date <= ?'); params.push(dateTo); }
    const rows = await dbAll(env.DB,
      `SELECT fl.*, c.license_plate, c.brand, d.name AS driver_name
       FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       LEFT JOIN drivers d ON fl.driver_id = d.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY fl.date DESC, fl.time DESC LIMIT 500`,
      params
    );
    return success(rows);
  }

  // --- GET /api/fuel/log/:id ---
  if (path.match(/^\/api\/fuel\/log\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB,
      `SELECT fl.*, c.license_plate, c.brand, d.name AS driver_name
       FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       LEFT JOIN drivers d ON fl.driver_id = d.id
       WHERE fl.id = ?`, [id]);
    if (!row) return error('ไม่พบข้อมูล', 404);
    return success(row);
  }

  // --- PUT /api/fuel/log/:id ---
  if (path.match(/^\/api\/fuel\/log\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'fuel', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['date','time','car_id','driver_id','mileage_before','mileage_after',
      'liters','price_per_liter','amount','fuel_type','gas_station_name','gas_station_address',
      'gas_station_tax_id','receipt_number','pump_meter_number','receipt_image','receipt_pdf',
      'fuel_consumption_rate','expense_type','notes'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE fuel_log SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลเชื้อเพลิงเรียบร้อย' });
  }

  // --- DELETE /api/fuel/log/:id ---
  if (path.match(/^\/api\/fuel\/log\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'fuel', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    await dbRun(env.DB, 'DELETE FROM fuel_log WHERE id = ?', [id]);
    return success({ message: 'ลบข้อมูลเชื้อเพลิงเรียบร้อย' });
  }

  // --- Fuel Requests ---
  if (path === '/api/fuel/requests' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const where = status ? 'WHERE fr.status = ?' : '';
    const params = status ? [status] : [];
    const rows = await dbAll(env.DB,
      `SELECT fr.*, c.license_plate, c.brand, u.display_name AS requester_name
       FROM fuel_requests fr
       LEFT JOIN cars c ON fr.car_id = c.id
       LEFT JOIN users u ON fr.requester_id = u.id
       ${where} ORDER BY fr.created_at DESC LIMIT 200`,
      params
    );
    return success(rows);
  }

  if (path === '/api/fuel/requests' && method === 'POST') {
    try { requirePermission(user, 'fuel', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุยานพาหนะ');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO fuel_requests (id, car_id, requester_id, requested_amount, requested_liters, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, body.car_id, user.id, body.requested_amount || 0,
       body.requested_liters || 0, body.reason || '', now()]
    );
    return success({ id, message: 'สร้างคำขอเบิกเชื้อเพลิงเรียบร้อย' }, 201);
  }

  if (path.match(/\/api\/fuel\/requests\/[^/]+\/approve/) && method === 'PUT') {
    try { requirePermission(user, 'fuel', 'approve'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    await dbRun(env.DB,
      `UPDATE fuel_requests SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`,
      [user.id, now(), id]
    );
    return success({ message: 'อนุมัติคำขอเบิกเชื้อเพลิงเรียบร้อย' });
  }

  if (path.match(/\/api\/fuel\/requests\/[^/]+\/reject/) && method === 'PUT') {
    try { requirePermission(user, 'fuel', 'approve'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    await dbRun(env.DB,
      `UPDATE fuel_requests SET status = 'rejected', approved_by = ?, approved_at = ? WHERE id = ?`,
      [user.id, now(), id]
    );
    return success({ message: 'ปฏิเสธคำขอเบิกเชื้อเพลิง' });
  }

  // --- Fuel summary ---
  if (path === '/api/fuel/summary' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const month = url.searchParams.get('month'); // YYYY-MM
    const where = [];
    const params = [];
    if (carId) { where.push('car_id = ?'); params.push(carId); }
    if (month) { where.push("date LIKE ?"); params.push(month + '%'); }
    const row = await dbFirst(env.DB,
      `SELECT COUNT(*) AS count, COALESCE(SUM(liters),0) AS total_liters,
       COALESCE(SUM(amount),0) AS total_amount,
       COALESCE(AVG(fuel_consumption_rate),0) AS avg_consumption
       FROM fuel_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
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