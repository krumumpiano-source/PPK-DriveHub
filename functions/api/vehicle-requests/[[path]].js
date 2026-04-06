// Vehicle Request System — ขอใช้รถออนไลน์
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, writeAuditLog,
  sendTelegramMessage, createNotification, notifyAllAdmins
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;
  if (!user) return error('Unauthorized', 401);

  // --- GET /api/vehicle-requests ---
  if (path === '/api/vehicle-requests' && method === 'GET') {
    const status = url.searchParams.get('status');
    const requesterId = url.searchParams.get('requester_id');
    const date = url.searchParams.get('date');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const where = [];
    const params = [];
    if (status) { where.push('vr.status = ?'); params.push(status); }
    if (requesterId) { where.push('vr.requester_id = ?'); params.push(requesterId); }
    if (date) { where.push('vr.date = ?'); params.push(date); }
    if (dateFrom) { where.push('vr.date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('vr.date <= ?'); params.push(dateTo); }
    const rows = await dbAll(env.DB,
      `SELECT vr.*, c.license_plate, c.brand AS car_brand,
       d.name AS driver_name, u.display_name AS approved_by_name
       FROM vehicle_requests vr
       LEFT JOIN cars c ON vr.assigned_car_id = c.id
       LEFT JOIN drivers d ON vr.assigned_driver_id = d.id
       LEFT JOIN users u ON vr.approved_by = u.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY vr.created_at DESC LIMIT 500`,
      params
    );
    return success(rows);
  }

  // --- GET /api/vehicle-requests/:id ---
  if (path.match(/^\/api\/vehicle-requests\/[^/]+$/) && method === 'GET') {
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB,
      `SELECT vr.*, c.license_plate, c.brand AS car_brand,
       d.name AS driver_name, u.display_name AS approved_by_name
       FROM vehicle_requests vr
       LEFT JOIN cars c ON vr.assigned_car_id = c.id
       LEFT JOIN drivers d ON vr.assigned_driver_id = d.id
       LEFT JOIN users u ON vr.approved_by = u.id
       WHERE vr.id = ?`, [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    return success(row);
  }

  // --- POST /api/vehicle-requests --- สร้างคำขอใช้รถ
  if (path === '/api/vehicle-requests' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.date || !body?.destination) return error('กรุณาระบุวันที่และสถานที่ปลายทาง');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO vehicle_requests (id, requester_id, requester_name, requester_department,
        date, time_start, time_end, destination, route, purpose,
        passengers, passenger_names, priority, is_urgent,
        status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [id, user.id, body.requester_name || user.display_name || '',
       body.requester_department || body.department || '',
       body.date, body.time_start || null, body.time_end || null,
       body.destination, body.route || '',
       body.purpose || '', body.passengers || 1,
       JSON.stringify(body.passenger_names || []),
       body.priority || 'general', body.is_urgent ? 1 : 0,
       body.notes || '', ts, ts]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_vehicle_request', 'vehicle_request', id, { date: body.date, destination: body.destination });
    // แจ้งคนจัดคิว + admin
    const queueManagers = await dbAll(env.DB,
      `SELECT id FROM users WHERE active = 1 AND (role IN ('admin','super_admin') OR permissions LIKE '%"queue"%')`
    );
    for (const mgr of queueManagers) {
      await createNotification(env.DB, mgr.id, 'vehicle_request', 'คำขอใช้รถใหม่',
        `${body.requester_name || user.display_name || ''} ขอใช้รถวันที่ ${body.date} ไป${body.destination}`);
    }
    const urgentLabel = body.is_urgent ? ' 🚨 ฉุกเฉิน' : '';
    await sendTelegramMessage(env,
      `📋 <b>คำขอใช้รถใหม่${urgentLabel}</b>\n📅 ${body.date} (${body.time_start || '-'} - ${body.time_end || '-'})\n📍 ${body.destination}\n📝 ${body.purpose || '-'}\n👤 ${body.requester_name || user.display_name || ''}\n👥 ผู้ร่วมเดินทาง ${body.passengers || 1} คน`);
    return success({ id, message: 'สร้างคำขอใช้รถเรียบร้อย' }, 201);
  }

  // --- PUT /api/vehicle-requests/:id --- แก้ไขคำขอ (เฉพาะ pending)
  if (path.match(/^\/api\/vehicle-requests\/[^/]+$/) && method === 'PUT'
      && !path.includes('/approve') && !path.includes('/reject')) {
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB, 'SELECT * FROM vehicle_requests WHERE id = ?', [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    if (row.status !== 'pending') return error('แก้ไขได้เฉพาะคำขอที่ยังรออนุมัติ');
    if (row.requester_id !== user.id && user.role !== 'admin' && user.role !== 'super_admin')
      return error('ไม่มีสิทธิ์แก้ไขคำขอนี้', 403);
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['date','time_start','time_end','destination','route','purpose',
      'passengers','requester_department','priority','is_urgent','notes','requester_name'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.passenger_names !== undefined) { sets.push('passenger_names = ?'); params.push(JSON.stringify(body.passenger_names)); }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE vehicle_requests SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'แก้ไขคำขอเรียบร้อย' });
  }

  // --- DELETE /api/vehicle-requests/:id --- ยกเลิกคำขอ
  if (path.match(/^\/api\/vehicle-requests\/[^/]+$/) && method === 'DELETE') {
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB, 'SELECT * FROM vehicle_requests WHERE id = ?', [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    if (row.requester_id !== user.id && user.role !== 'admin' && user.role !== 'super_admin')
      return error('ไม่มีสิทธิ์ยกเลิกคำขอนี้', 403);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE vehicle_requests SET status = 'cancelled', updated_at = ? WHERE id = ?`, [ts, id]);
    await writeAuditLog(env.DB, user.id, user.displayName, 'cancel_vehicle_request', 'vehicle_request', id, null);
    return success({ message: 'ยกเลิกคำขอเรียบร้อย' });
  }

  // --- PUT /api/vehicle-requests/:id/approve --- คนจัดคิวกดอนุมัติ (หลัง ผอ.เซ็นกระดาษ)
  if (path.match(/^\/api\/vehicle-requests\/[^/]+\/approve$/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const row = await dbFirst(env.DB, 'SELECT * FROM vehicle_requests WHERE id = ?', [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    if (row.status !== 'pending') return error(`ไม่สามารถอนุมัติได้ สถานะปัจจุบัน: ${row.status}`);

    const body = await parseBody(request);
    if (!body?.assigned_car_id || !body?.assigned_driver_id) return error('กรุณาระบุรถและพนักงานขับรถ');

    // Validation: ตรวจสอบสถานะรถ
    const carCheck = await dbFirst(env.DB, 'SELECT status, license_plate, brand FROM cars WHERE id = ?', [body.assigned_car_id]);
    if (!carCheck) return error('ไม่พบข้อมูลรถ');
    if (carCheck.status === 'under_repair') return error('รถคันนี้อยู่ระหว่างซ่อม ไม่สามารถจัดให้ได้');

    // Validation: ตรวจสอบใบขับขี่
    const driverCheck = await dbFirst(env.DB, 'SELECT name, license_expiry, status FROM drivers WHERE id = ?', [body.assigned_driver_id]);
    if (!driverCheck) return error('ไม่พบข้อมูลพนักงานขับรถ');
    if (driverCheck.license_expiry && driverCheck.license_expiry < new Date().toISOString().substr(0,10))
      return error('ใบขับขี่พนักงานขับรถหมดอายุ');
    if (driverCheck.status === 'inactive') return error('พนักงานขับรถถูกปิดใช้งาน');

    const ts = now();
    const carLabel = `${carCheck.license_plate} ${carCheck.brand || ''}`.trim();

    // สร้างคิวอัตโนมัติ
    const queueId = generateUUID();
    const timeStart = row.time_start || '08:00';
    const timeEnd = row.time_end || '17:00';
    await dbRun(env.DB,
      `INSERT INTO queue (id, date, time_start, time_end, car_id, driver_id,
        requester_id, requested_by, mission, destination, passengers,
        status, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)`,
      [queueId, row.date, timeStart, timeEnd,
       body.assigned_car_id, body.assigned_driver_id,
       row.requester_id, row.requester_name,
       row.purpose || '', row.destination,
       row.passengers || 1, body.notes || row.notes || '', user.id, ts, ts]
    );

    // อัปเดตคำขอ
    await dbRun(env.DB,
      `UPDATE vehicle_requests SET status = 'approved', approved_by = ?, approved_at = ?,
       assigned_car_id = ?, assigned_driver_id = ?, assigned_queue_id = ?, updated_at = ? WHERE id = ?`,
      [user.id, ts, body.assigned_car_id, body.assigned_driver_id, queueId, ts, id]
    );

    await writeAuditLog(env.DB, user.id, user.displayName, 'approve_vehicle_request', 'vehicle_request', id,
      { car: carLabel, driver: driverCheck.name, queue_id: queueId });

    // แจ้งผู้ขอ
    await createNotification(env.DB, row.requester_id, 'vehicle_request', 'คำขอใช้รถได้รับอนุมัติ',
      `คำขอวันที่ ${row.date} ไป${row.destination} อนุมัติแล้ว — รถ: ${carLabel} พนักงาน: ${driverCheck.name}`);
    // แจ้งพนักงานขับรถ
    const driverUser = await dbFirst(env.DB, 'SELECT id FROM users WHERE driver_id = ?', [body.assigned_driver_id]);
    if (driverUser) {
      await createNotification(env.DB, driverUser.id, 'queue', 'มีคิวใหม่',
        `คิววันที่ ${row.date} ไป${row.destination} — รถ: ${carLabel}`);
    }
    await sendTelegramMessage(env,
      `✅ <b>อนุมัติคำขอใช้รถ</b>\n📅 ${row.date} (${timeStart}-${timeEnd})\n📍 ${row.destination}\n🚗 ${carLabel}\n👤 ${driverCheck.name}\n👨‍💼 อนุมัติโดย: ${user.displayName}\n📋 ขอโดย: ${row.requester_name}`);

    return success({ id, queue_id: queueId, message: 'อนุมัติคำขอและสร้างคิวเรียบร้อย' });
  }

  // --- PUT /api/vehicle-requests/:id/reject --- ปฏิเสธ
  if (path.match(/^\/api\/vehicle-requests\/[^/]+\/reject$/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const row = await dbFirst(env.DB, 'SELECT * FROM vehicle_requests WHERE id = ?', [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    if (row.status !== 'pending') return error(`ไม่สามารถปฏิเสธได้ สถานะปัจจุบัน: ${row.status}`);

    const body = await parseBody(request);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE vehicle_requests SET status = 'rejected', rejection_reason = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?`,
      [body?.reason || '', user.id, ts, ts, id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'reject_vehicle_request', 'vehicle_request', id, { reason: body?.reason });
    await createNotification(env.DB, row.requester_id, 'vehicle_request', 'คำขอใช้รถไม่ได้รับอนุมัติ',
      `คำขอวันที่ ${row.date} ไป${row.destination} ไม่อนุมัติ: ${body?.reason || '-'}`);
    await sendTelegramMessage(env,
      `❌ <b>ไม่อนุมัติคำขอใช้รถ</b>\n📅 ${row.date}\n📍 ${row.destination}\n📝 เหตุผล: ${body?.reason || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'ปฏิเสธคำขอเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}
