// Vehicle dispatch queue management
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, writeAuditLog,
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

  // --- GET /api/queue ---
  if (path === '/api/queue' && method === 'GET') {
    try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');
    const carId = url.searchParams.get('car_id');
    const where = [];
    const params = [];
    if (status) { where.push('q.status = ?'); params.push(status); }
    if (date) { where.push('q.date = ?'); params.push(date); }
    if (carId) { where.push('q.car_id = ?'); params.push(carId); }
    const rows = await dbAll(env.DB,
      `SELECT q.*, c.license_plate, c.brand, c.model,
       d.name AS driver_name, bd.name AS backup_driver_name,
       u.display_name AS requester_display_name
       FROM queue q
       LEFT JOIN cars c ON q.car_id = c.id
       LEFT JOIN drivers d ON q.driver_id = d.id
       LEFT JOIN drivers bd ON q.backup_driver_id = bd.id
       LEFT JOIN users u ON q.requester_id = u.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY q.date DESC, q.time_start ASC`,
      params
    );
    return success(rows);
  }

  // --- GET /api/queue/:id ---
  if (path.match(/^\/api\/queue\/[^/]+$/) && !path.includes('/freeze') && !path.includes('/cancel') && !path.includes('/complete') && method === 'GET') {
    try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/queue/');
    const row = await dbFirst(env.DB,
      `SELECT q.*, c.license_plate, c.brand, c.model,
       d.name AS driver_name, bd.name AS backup_driver_name,
       u.display_name AS requester_display_name
       FROM queue q
       LEFT JOIN cars c ON q.car_id = c.id
       LEFT JOIN drivers d ON q.driver_id = d.id
       LEFT JOIN drivers bd ON q.backup_driver_id = bd.id
       LEFT JOIN users u ON q.requester_id = u.id
       WHERE q.id = ?`, [id]);
    if (!row) return error('ไม่พบคิว', 404);
    return success(row);
  }

  // --- POST /api/queue ---
  if (path === '/api/queue' && method === 'POST') {
    try { requirePermission(user, 'queue', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.date) return error('กรุณาระบุยานพาหนะและวันที่');

    // Validation: ตรวจสอบสถานะรถ (ห้ามจองรถที่อยู่ระหว่างซ่อม)
    const carCheck = await dbFirst(env.DB, 'SELECT status FROM cars WHERE id = ?', [body.car_id]);
    if (carCheck && carCheck.status === 'under_repair') return error('รถคันนี้อยู่ระหว่างซ่อม ไม่สามารถจองได้');

    // Validation: ตรวจสอบใบขับขี่พนักงาน
    if (body.driver_id) {
      const driverCheck = await dbFirst(env.DB, 'SELECT license_expiry, status FROM drivers WHERE id = ?', [body.driver_id]);
      if (driverCheck?.license_expiry && driverCheck.license_expiry < new Date().toISOString().substr(0,10)) return error('ใบขับขี่พนักงานขับรถหมดอายุ');
      if (driverCheck?.status === 'inactive') return error('พนักงานขับรถถูกปิดใช้งาน');
    }
    // Validation: ตรวจสอบใบขับขี่พนักงานสำรอง
    if (body.backup_driver_id) {
      const backupCheck = await dbFirst(env.DB, 'SELECT license_expiry, status FROM drivers WHERE id = ?', [body.backup_driver_id]);
      if (backupCheck?.license_expiry && backupCheck.license_expiry < new Date().toISOString().substr(0,10)) return error('ใบขับขี่พนักงานสำรองหมดอายุ');
    }

    // Backend conflict detection — prevent double-booking
    const timeStart = body.time_start || body.departure_time || '00:00';
    const timeEnd = body.time_end || body.return_time || '23:59';
    const conflicts = await dbAll(env.DB,
      `SELECT q.id, q.time_start, q.time_end, c.license_plate, d.name AS driver_name
       FROM queue q
       LEFT JOIN cars c ON q.car_id = c.id
       LEFT JOIN drivers d ON q.driver_id = d.id
       WHERE q.date = ? AND q.status NOT IN ('cancelled','completed')
       AND ((q.car_id = ?) OR (q.driver_id = ? AND ? IS NOT NULL))
       AND q.time_start < ? AND q.time_end > ?`,
      [body.date, body.car_id, body.driver_id || null, body.driver_id || null, timeEnd, timeStart]
    );
    if (conflicts.length > 0) {
      const labels = conflicts.map(c => `${c.license_plate || ''} ${c.driver_name || ''} (${c.time_start}-${c.time_end})`).join(', ');
      return error(`คิวซ้อนกัน: ${labels}`, 409);
    }

    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO queue (id, date, time_start, time_end, car_id, driver_id,
        requester_id, requested_by, mission, destination, passengers,
        status, notes, backup_driver_id, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?)`,
      [id, body.date, timeStart, timeEnd,
       body.car_id, body.driver_id || null,
       body.requester_id || user.id, body.requested_by || body.requester_name || user.displayName || '',
       body.mission || body.purpose || '', body.destination || '',
       body.passengers || body.passenger_count || '',
       body.notes || '', body.backup_driver_id || null, user.id, ts, ts]
    );

    // Resolve names for notifications
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [body.car_id]);
    const driver = body.driver_id ? await dbFirst(env.DB, 'SELECT name FROM drivers WHERE id = ?', [body.driver_id]) : null;
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : body.car_id;
    const driverLabel = driver ? driver.name : '-';
    const mission = body.mission || body.purpose || '-';

    await writeAuditLog(env.DB, user.id, user.displayName, 'create_queue', 'queue', id, { date: body.date, car: carLabel });
    await notifyAllAdmins(env.DB, 'queue', 'สร้างคิวใหม่',
      `${user.displayName} สร้างคิววันที่ ${body.date} | ${carLabel} | ${driverLabel} | ${mission}`);
    await sendTelegramMessage(env,
      `🚐 <b>คิวใหม่</b>\n📅 ${body.date} (${timeStart}-${timeEnd})\n🚗 ${carLabel}\n👤 ${driverLabel}\n📋 ${mission}\n👨‍💼 สร้างโดย: ${user.displayName}`);

    return success({ id, message: 'สร้างคิวเรียบร้อย' }, 201);
  }

  // --- PUT /api/queue/:id ---
  if (path.match(/^\/api\/queue\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/queue/');
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    // Validation: ถ้าเปลี่ยนรถ → เช็คสถานะรถใหม่
    if (body.car_id) {
      const carCheck = await dbFirst(env.DB, 'SELECT status FROM cars WHERE id = ?', [body.car_id]);
      if (carCheck && carCheck.status === 'under_repair') return error('รถคันนี้อยู่ระหว่างซ่อม ไม่สามารถจองได้');
    }
    // Validation: ถ้าเปลี่ยนพนักงาน → เช็คใบขับขี่
    if (body.driver_id) {
      const driverCheck = await dbFirst(env.DB, 'SELECT license_expiry, status FROM drivers WHERE id = ?', [body.driver_id]);
      if (driverCheck?.license_expiry && driverCheck.license_expiry < new Date().toISOString().substr(0,10)) return error('ใบขับขี่พนักงานขับรถหมดอายุ');
      if (driverCheck?.status === 'inactive') return error('พนักงานขับรถถูกปิดใช้งาน');
    }
    if (body.backup_driver_id) {
      const backupCheck = await dbFirst(env.DB, 'SELECT license_expiry, status FROM drivers WHERE id = ?', [body.backup_driver_id]);
      if (backupCheck?.license_expiry && backupCheck.license_expiry < new Date().toISOString().substr(0,10)) return error('ใบขับขี่พนักงานสำรองหมดอายุ');
    }

    const fields = ['date','time_start','time_end','car_id','driver_id',
      'requester_id','requested_by','mission','destination','passengers',
      'status','cancel_reason','notes','backup_driver_id'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE queue SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตคิวเรียบร้อย' });
  }

  // --- DELETE /api/queue/:id ---
  if (path.match(/^\/api\/queue\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'queue', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/queue/');
    await dbRun(env.DB, 'DELETE FROM queue WHERE id = ?', [id]);
    return success({ message: 'ลบคิวเรียบร้อย' });
  }

  // --- PUT /api/queue/:id/freeze ---
  if (path.match(/\/api\/queue\/[^/]+\/freeze/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE queue SET status = 'frozen', frozen_by = ?, frozen_at = ?,
       frozen_reason = ?, updated_at = ? WHERE id = ?`,
      [user.id, now(), body.frozen_reason || body.reason || '', now(), id]
    );
    return success({ message: 'อายัดคิวเรียบร้อย' });
  }

  // --- PUT /api/queue/:id/unfreeze ---
  if (path.match(/\/api\/queue\/[^/]+\/unfreeze/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    await dbRun(env.DB,
      `UPDATE queue SET status = 'scheduled', frozen_by = NULL, frozen_at = NULL,
       frozen_reason = NULL, updated_at = ? WHERE id = ?`,
      [now(), id]
    );
    return success({ message: 'ปลดอายัดคิวเรียบร้อย' });
  }

  // --- PUT /api/queue/:id/cancel ---
  if (path.match(/\/api\/queue\/[^/]+\/cancel/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const body = await parseBody(request);
    const q = await dbFirst(env.DB,
      `SELECT q.date, q.time_start, c.license_plate, d.name AS driver_name
       FROM queue q LEFT JOIN cars c ON q.car_id = c.id LEFT JOIN drivers d ON q.driver_id = d.id WHERE q.id = ?`, [id]);
    await dbRun(env.DB,
      `UPDATE queue SET status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE id = ?`,
      [body.cancel_reason || body.reason || '', now(), id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'cancel_queue', 'queue', id, null);
    if (q) {
      await notifyAllAdmins(env.DB, 'queue', 'ยกเลิกคิว',
        `${user.displayName} ยกเลิกคิววันที่ ${q.date} | ${q.license_plate || ''} | ${q.driver_name || ''}`);
      await sendTelegramMessage(env,
        `❌ <b>ยกเลิกคิว</b>\n📅 ${q.date} (${q.time_start})\n🚗 ${q.license_plate || ''}\n👤 ${q.driver_name || ''}\n💬 ${body.cancel_reason || body.reason || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    }
    return success({ message: 'ยกเลิกคิวเรียบร้อย' });
  }

  // --- PUT /api/queue/:id/complete ---
  if (path.match(/\/api\/queue\/[^/]+\/complete/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    await dbRun(env.DB,
      `UPDATE queue SET status = 'completed', updated_at = ? WHERE id = ?`,
      [now(), id]
    );
    return success({ message: 'ดำเนินการคิวเสร็จสิ้น' });
  }

  // --- PUT /api/queue/:id/ongoing ---
  if (path.match(/\/api\/queue\/[^/]+\/ongoing/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    await dbRun(env.DB,
      `UPDATE queue SET status = 'ongoing', updated_at = ? WHERE id = ?`,
      [now(), id]
    );
    return success({ message: 'เริ่มดำเนินการคิว' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}