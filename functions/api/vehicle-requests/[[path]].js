// Vehicle Request System — ขอใช้รถออนไลน์
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, writeAuditLog,
  sendTelegramMessage, createNotification, notifyAllAdmins, sendLineMessage, uploadToR2, sendEmailViaGAS
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
    const needsSignature = url.searchParams.get('needs_signature');
    const where = [];
    const params = [];
    if (status) { where.push('vr.status = ?'); params.push(status); }
    if (requesterId) { where.push('vr.requester_id = ?'); params.push(requesterId); }
    if (date) { where.push('vr.date = ?'); params.push(date); }
    if (dateFrom) { where.push('vr.date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('vr.date <= ?'); params.push(dateTo); }
    if (needsSignature === 'true') { where.push('vr.signature_image IS NULL'); }
    const rows = await dbAll(env.DB,
      `SELECT vr.*, c.license_plate, c.brand AS car_brand,
       d.name AS driver_name, u.display_name AS approved_by_name,
       uc.display_name AS requester_display_name,
       uc.display_name AS created_by_name
       FROM vehicle_requests vr
       LEFT JOIN cars c ON vr.assigned_car_id = c.id
       LEFT JOIN drivers d ON vr.assigned_driver_id = d.id
       LEFT JOIN users u ON vr.approved_by = u.id
       LEFT JOIN users uc ON vr.requester_id = uc.id
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
       d.name AS driver_name, u.display_name AS approved_by_name,
       uc.display_name AS requester_display_name,
       uc.display_name AS created_by_name
       FROM vehicle_requests vr
       LEFT JOIN cars c ON vr.assigned_car_id = c.id
       LEFT JOIN drivers d ON vr.assigned_driver_id = d.id
       LEFT JOIN users u ON vr.approved_by = u.id
       LEFT JOIN users uc ON vr.requester_id = uc.id
       WHERE vr.id = ?`, [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    return success(row);
  }

  // --- POST /api/vehicle-requests --- สร้างคำขอใช้รถ
  if (path === '/api/vehicle-requests' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.date || !body?.destination) return error('กรุณาระบุวันที่และสถานที่ปลายทาง');

    const reqDate = body.date;
    const reqReturnDate = body.return_date || reqDate;
    const timeStart = body.time_start || '00:00';
    const timeEnd = body.time_end || '23:59';

    // 1. Check available cars count during the period
    const activeCarsCount = await dbFirst(env.DB, "SELECT COUNT(*) as count FROM cars WHERE status NOT IN ('under_repair', 'retired', 'inactive')");
    const usedCarsCount = await dbFirst(env.DB, `
      SELECT COUNT(DISTINCT car_id) as used_cars 
      FROM queue 
      WHERE status NOT IN ('cancelled', 'completed')
      AND date <= ? AND return_date >= ?
      AND (time_start < ? AND time_end > ?)
    `, [reqReturnDate, reqDate, timeEnd, timeStart]);

    const totalCarsAvailable = (activeCarsCount ? activeCarsCount.count : 0) - (usedCarsCount ? usedCarsCount.used_cars : 0);

    // 2. Check available drivers count during the period
    const activeDriversCount = await dbFirst(env.DB, `
      SELECT COUNT(*) as count FROM drivers 
      WHERE status = 'active' 
      AND (license_expiry IS NULL OR license_expiry >= ?)
    `, [reqDate]);

    const usedDriversCount = await dbFirst(env.DB, `
      SELECT COUNT(DISTINCT driver_id) as used_drivers 
      FROM queue 
      WHERE status NOT IN ('cancelled', 'completed')
      AND driver_id IS NOT NULL
      AND date <= ? AND return_date >= ?
      AND (time_start < ? AND time_end > ?)
    `, [reqReturnDate, reqDate, timeEnd, timeStart]);

    const leaveDriversCount = await dbFirst(env.DB, `
      SELECT COUNT(DISTINCT driver_id) as leave_drivers
      FROM leaves
      WHERE status = 'approved' AND start_date <= ? AND end_date >= ?
    `, [reqReturnDate, reqDate]);

    const totalDriversAvailable = (activeDriversCount ? activeDriversCount.count : 0) - (usedDriversCount ? usedDriversCount.used_drivers : 0) - (leaveDriversCount ? leaveDriversCount.leave_drivers : 0);

    if (totalCarsAvailable <= 0 || totalDriversAvailable <= 0) {
      let reason = [];
      if (totalCarsAvailable <= 0) reason.push('ไม่มีรถว่าง');
      if (totalDriversAvailable <= 0) reason.push('ไม่มีพนักงานขับรถว่าง');
      return error(`ไม่สามารถขอใช้รถได้ เนื่องจาก${reason.join(' และ ')}ในช่วงเวลานี้`, 400);
    }

    const id = generateUUID();
    const ts = now();
    const reqDateObj = body.date ? new Date(body.date) : new Date();
    const yearBE = (reqDateObj.getFullYear() || new Date().getFullYear()) + 543;
    const prefixLike = `พค.(ยพ.) %/${yearBE}`;
    
    const maxRow = await dbFirst(env.DB, `SELECT MAX(request_no) as max_no FROM vehicle_requests WHERE request_no LIKE ?`, [prefixLike]);
    let nextNum = 1;
    if (maxRow && maxRow.max_no) {
      const match = maxRow.max_no.match(/พค\.\(ยพ\.\)\s+(\d+)\/\d{4}/);
      if (match && match[1]) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const requestNo = `พค.(ยพ.) ${nextNum.toString().padStart(4, '0')}/${yearBE}`;

    await dbRun(env.DB,
      `INSERT INTO vehicle_requests (id, request_no, requester_id, requester_name, requester_department,
        date, return_date, time_start, time_end, destination, route, purpose,
        passengers, passenger_names, priority, is_urgent,
        status, notes, waypoints, dest_lat, dest_lng, estimated_km, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_supervisor', ?, ?, ?, ?, ?, ?, ?)`,
      [id, requestNo, user.id, body.requester_name || user.display_name || '',
       body.requester_department || body.department || '',
       body.date, body.return_date || body.date, body.time_start || null, body.time_end || null,
       body.destination, body.route || '',
       body.purpose || '', body.passengers || 1,
       JSON.stringify(body.passenger_names || []),
       body.priority || 'general', body.is_urgent ? 1 : 0,
       body.notes || '', body.waypoints || null, body.dest_lat || null, body.dest_lng || null, body.estimated_km || null, ts, ts]
    );

    // Update user's display_name if provided to remember it for next time
    if (body.requester_name && body.requester_name !== user.display_name) {
      await dbRun(env.DB, 'UPDATE users SET display_name = ? WHERE id = ?', [body.requester_name, user.id]);
    }

    await writeAuditLog(env.DB, user.id, user.display_name || user.username, 'create_vehicle_request', 'vehicle_request', id, { date: body.date, destination: body.destination });
    
    // แจ้งคนจัดคิว + admin
    const queueManagers = await dbAll(env.DB,
      `SELECT id FROM users WHERE active = 1 AND (role IN ('admin','super_admin') OR permissions LIKE '%"queue"%')`
    );
    for (const mgr of queueManagers) {
      await createNotification(env.DB, mgr.id, 'vehicle_request', 'คำขอใช้รถใหม่',
        `${body.requester_name || user.display_name || ''} ขอใช้รถวันที่ ${body.date}${body.return_date && body.return_date !== body.date ? ' ถึง ' + body.return_date : ''} ไป${body.destination}`);
    }
    return success({ id, message: 'สร้างคำขอใช้รถเรียบร้อย' }, 201);
  }

  // --- PUT /api/vehicle-requests/:id --- แก้ไขคำขอ (เฉพาะ pending)
  if (path.match(/^\/api\/vehicle-requests\/[^/]+$/) && method === 'PUT'
      && !path.includes('/approve') && !path.includes('/reject')) {
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB, 'SELECT * FROM vehicle_requests WHERE id = ?', [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    if (row.status !== 'pending_supervisor') return error('แก้ไขได้เฉพาะคำขอที่ยังรอหัวหน้างานอนุมัติ');
    if (row.requester_id !== user.id && user.role !== 'admin' && user.role !== 'super_admin')
      return error('ไม่มีสิทธิ์แก้ไขคำขอนี้', 403);
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['date','return_date','time_start','time_end','destination','route','purpose',
      'passengers','requester_department','priority','is_urgent','notes','requester_name',
      'dest_lat','dest_lng','estimated_km'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.passenger_names !== undefined) { sets.push('passenger_names = ?'); params.push(JSON.stringify(body.passenger_names)); }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_by = ?'); params.push(user.id);
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE vehicle_requests SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'แก้ไขคำขอเรียบร้อย' });
  }

  // --- DELETE /api/vehicle-requests/:id --- ยกเลิกคำขอ (ต้องล่วงหน้าอย่างน้อย 3 วัน)
  if (path.match(/^\/api\/vehicle-requests\/[^/]+$/) && method === 'DELETE') {
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB, 'SELECT * FROM vehicle_requests WHERE id = ?', [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    if (row.requester_id !== user.id && user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager')
      return error('ไม่มีสิทธิ์ยกเลิกคำขอนี้', 403);

    // Rule 5: Cancellation must be at least 3 days in advance for normal requesters
    const isSpecialUser = (user.role === 'admin' || user.role === 'super_admin' || user.role === 'manager');
    if (!isSpecialUser && row.requester_id === user.id) {
      const todayStr = new Date().toISOString().substr(0, 10);
      const tripDate = new Date(row.date);
      const todayDate = new Date(todayStr);
      const diffTime = tripDate.getTime() - todayDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 3) {
        return error('สามารถยกเลิกคำขอใช้รถล่วงหน้าอย่างน้อย 3 วันทำการก่อนวันเดินทางเท่านั้น หากจำเป็นเร่งด่วนกรุณาติดต่อผู้จัดคิวโดยตรง', 400);
      }
    }

    const ts = now();
    await dbRun(env.DB,
      `UPDATE vehicle_requests SET status = 'cancelled', updated_by = ?, updated_at = ? WHERE id = ?`, [user.id, ts, id]);
    
    // Also cancel assigned queue if already queued
    if (row.assigned_queue_id) {
      await dbRun(env.DB, `UPDATE queue SET status = 'cancelled', updated_at = ? WHERE id = ?`, [ts, row.assigned_queue_id]);
    }

    await writeAuditLog(env.DB, user.id, user.display_name || user.username, 'cancel_vehicle_request', 'vehicle_request', id, null);
    
    // Get requester email
    const requester = await dbFirst(env.DB, 'SELECT email FROM users WHERE id = ?', [row.requester_id]);
    if (requester && requester.email) {
      await sendEmailViaGAS(env, requester.email, 'ยกเลิกการขอใช้รถ', `คำขอใช้รถเลขที่ ${row.request_no} วันที่ ${row.date} ไปยัง ${row.destination} ได้ถูกยกเลิกแล้ว`);
    }

    // Return line message template for frontend
    const lineMessage = `🚫 [แจ้งยกเลิกการใช้รถราชการ]\n📌 เลขที่คำขอ: ${row.request_no}\n📅 วันที่เดินทาง: ${row.date}\n📍 ปลายทาง: ${row.destination}\n👤 ผู้ขอใช้: ${row.requester_name}\n❌ ยกเลิกโดย: ${user.display_name || user.username}`;
    return success({ message: 'ยกเลิกคำขอเรียบร้อย', lineMessage });
  }

  // --- POST /api/vehicle-requests/bulk-approve ---
  if (path === '/api/vehicle-requests/bulk-approve' && method === 'POST') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body || !body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return error('ไม่มีรายการที่เลือก');
    }
    const ts = now();
    let signatureImagePath = null;
    if (body.signature_base64) {
      const b64Data = body.signature_base64.split(',')[1] || body.signature_base64;
      signatureImagePath = `signature_bulk_${ts.replace(/[: -]/g, '')}.png`;
      await uploadToR2(env, b64Data, signatureImagePath, 'SIGNATURES', 'image/png');
    }
    
    for (const id of body.ids) {
      await dbRun(env.DB,
        `UPDATE vehicle_requests SET signature_image = ?, updated_by = ?, updated_at = ? WHERE id = ? AND status = 'approved' AND signature_image IS NULL`,
        [signatureImagePath, user.id, ts, id]
      );
      // We don't update queue status here, just add signature.
      await writeAuditLog(env.DB, user.id, user.displayName, 'bulk_approve_vehicle_request', 'vehicle_request', id, { signature_image: signatureImagePath });
    }
    return success({ message: 'อนุมัติเรียบร้อย' });
  }

  // --- PUT /api/vehicle-requests/:id/approve-supervisor ---
  if (path.match(/^\/api\/vehicle-requests\/[^/]+\/approve-supervisor$/) && method === 'PUT') {
    const id = path.split('/').slice(-2, -1)[0];
    const row = await dbFirst(env.DB, 'SELECT * FROM vehicle_requests WHERE id = ?', [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    if (row.status !== 'pending_supervisor') return error('สถานะไม่ใช่รอหัวหน้างานอนุมัติ');
    
    // Authorization: Must have manager, admin, or super_admin role
    if (user.role !== 'manager' && user.role !== 'admin' && user.role !== 'super_admin') {
      return error('ไม่มีสิทธิ์หัวหน้างาน', 403);
    }
    
    const ts = now();
    await dbRun(env.DB,
      `UPDATE vehicle_requests SET status = 'pending_executive', supervisor_id = ?, supervisor_approved_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
      [user.id, ts, user.id, ts, id]
    );
    await writeAuditLog(env.DB, user.id, user.display_name || user.username, 'supervisor_approve_vehicle_request', 'vehicle_request', id, null);
    return success({ message: 'หัวหน้างานอนุมัติเรียบร้อย ส่งต่อให้ผู้บริหาร/งานยานพาหนะ' });
  }

  // --- PUT /api/vehicle-requests/:id/approve --- คนจัดคิวกดอนุมัติ (หลัง ผอ.เซ็นกระดาษ หรืออนุมัติขั้นสุดท้าย)
  if (path.match(/^\/api\/vehicle-requests\/[^/]+\/approve$/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    try {
    const id = path.split('/').slice(-2, -1)[0];
    const row = await dbFirst(env.DB, 'SELECT * FROM vehicle_requests WHERE id = ?', [id]);
    if (!row) return error('ไม่พบคำขอใช้รถ', 404);
    if (row.status !== 'pending_executive' && row.status !== 'pending_supervisor') return error(`ไม่สามารถอนุมัติได้ สถานะปัจจุบัน: ${row.status}`);

    const body = await parseBody(request);
    if (!body?.assigned_car_id || !body?.assigned_driver_id) return error('กรุณาระบุรถและพนักงานขับรถ');

    // Validation: ตรวจสอบสถานะรถ
    const carCheck = await dbFirst(env.DB, 'SELECT status, license_plate, brand FROM cars WHERE id = ?', [body.assigned_car_id]);
    if (!carCheck) return error('ไม่พบข้อมูลรถ');
    if (carCheck.status === 'under_repair') return error('รถคันนี้อยู่ระหว่างซ่อม ไม่สามารถจัดให้ได้');

    // Validation: ตรวจสอบใบขับขี่
    const driverCheck = await dbFirst(env.DB, 'SELECT name, license_expiry, status, line_id FROM drivers WHERE id = ?', [body.assigned_driver_id]);
    if (!driverCheck) return error('ไม่พบข้อมูลพนักงานขับรถ');
    if (driverCheck.license_expiry && driverCheck.license_expiry < new Date().toISOString().substr(0,10))
      return error('ใบขับขี่พนักงานขับรถหมดอายุ');
    if (driverCheck.status === 'inactive') return error('พนักงานขับรถถูกปิดใช้งาน');

    const ts = now();
    const carLabel = `${carCheck.license_plate} ${carCheck.brand || ''}`.trim();
    const timeStart = row.time_start || '08:00';
    const timeEnd = row.time_end || '17:00';

    // Validation: ตรวจสอบคิวซ้อน (Conflict detection)
    if (!body.force_queue) {
      const conflicts = await dbAll(env.DB,
        `SELECT q.id, q.time_start, q.time_end, c.license_plate, d.name AS driver_name
         FROM queue q
         LEFT JOIN cars c ON q.car_id = c.id
         LEFT JOIN drivers d ON q.driver_id = d.id
         WHERE q.date = ? AND q.status NOT IN ('cancelled','completed')
         AND (q.car_id = ? OR q.driver_id = ?)
         AND q.time_start < ? AND q.time_end > ?`,
        [row.date, body.assigned_car_id, body.assigned_driver_id, timeEnd, timeStart]
      );
      if (conflicts.length > 0) {
        const labels = conflicts.map(c => `${c.license_plate || ''} ${c.driver_name || ''} (${c.time_start}-${c.time_end})`).join(', ');
        return error(`คิวซ้อนกัน: ${labels}`, 409);
      }
    }

    // สร้างคิวอัตโนมัติ
    const queueId = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO queue (id, date, return_date, time_start, time_end, car_id, driver_id,
        requester_id, requested_by, mission, destination, passengers,
        status, notes, waypoints, estimated_km, estimated_fuel_cost, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?)`,
      [queueId, row.date, row.return_date || row.date, timeStart, timeEnd,
       body.assigned_car_id, body.assigned_driver_id,
       row.requester_id, row.requester_name,
       row.purpose || '', row.destination, row.passengers || 1,
       body.notes || row.notes || '', row.waypoints || null, row.estimated_km || null, body.estimated_fuel_cost || null, user.id, ts, ts]
    );

    let signatureImagePath = null;
    if (body.signature_base64) {
      const b64Data = body.signature_base64.split(',')[1] || body.signature_base64;
      signatureImagePath = `signature_${id}_${ts.replace(/[: -]/g, '')}.png`;
      await uploadToR2(env, b64Data, signatureImagePath, 'SIGNATURES', 'image/png');
    }

    // อัปเดตคำขอ
    await dbRun(env.DB,
      `UPDATE vehicle_requests SET status = 'approved', approved_by = ?, executive_id = ?, approved_at = ?,
       assigned_car_id = ?, assigned_driver_id = ?, assigned_queue_id = ?, signature_image = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
      [user.id, user.id, ts, body.assigned_car_id, body.assigned_driver_id, queueId, signatureImagePath, user.id, ts, id]
    );

    await writeAuditLog(env.DB, user.id, user.displayName, 'approve_vehicle_request', 'vehicle_request', id,
      { car: carLabel, driver: driverCheck.name, queue_id: queueId });

    const isPooled = body.force_queue ? ' [มีการจัดคิวร่วม/แชร์รถ]' : '';
    const notesStr = body.notes ? `\nหมายเหตุ: ${body.notes}` : '';

    // แจ้งผู้ขอ
    await createNotification(env.DB, row.requester_id, 'vehicle_request', `จัดรถและเสนออนุมัติเรียบร้อย${isPooled}`,
      `คำขอวันที่ ${row.date} ไป${row.destination} จัดคิวแล้ว (รอ ผอ.เซ็น) — รถ: ${carLabel} พนักงาน: ${driverCheck.name}${isPooled}${notesStr}`);
    // แจ้งพนักงานขับรถ
    const driverUser = await dbFirst(env.DB, 'SELECT id FROM users WHERE driver_id = ?', [body.assigned_driver_id]);
    if (driverUser) {
      await createNotification(env.DB, driverUser.id, 'queue', `มีคิวใหม่${isPooled}`,
        `คิววันที่ ${row.date} ไป${row.destination} — รถ: ${carLabel}${isPooled}${notesStr}`);
    }
    const closeQueueUrl = `https://ppk-drivehub.pages.dev/qr-usage-record.html?type=return&car_id=${body.assigned_car_id}&queue_id=${queueId}`;

    // await sendTelegramMessage(env,
    //   `✅ <b>จัดรถและเสนออนุมัติเรียบร้อย</b>${isPooled}\n📅 ${row.date} (${timeStart}-${timeEnd})\n📍 ${row.destination}\n🚗 ${carLabel}\n👤 @${driverCheck.name.replace(/\s+/g,'')} (คนขับ)\n👨‍💼 จัดรถโดย: ${user.displayName}\n📋 ขอโดย: ${row.requester_name}${notesStr}\n\n▶️ <a href="${closeQueueUrl}">กดที่นี่เพื่อบันทึกปิดคิวและกรอกเลขไมล์</a>`);

    if (driverCheck && driverCheck.line_id) {
      await sendLineMessage(env, driverCheck.line_id, 
        `🔔 จัดคิวงานเรียบร้อย${isPooled}\n📅 ${row.date} (${timeStart}-${timeEnd})\n🚗 รถ: ${carLabel}\n📍 ปลายทาง: ${row.destination}\n📋 ขอโดย: ${row.requester_name}${notesStr}`
      );
    }

    // Get requester email and send confirmation
    const requester = await dbFirst(env.DB, 'SELECT email FROM users WHERE id = ?', [row.requester_id]);
    const confirmationUrl = `${url.origin}/vehicle-request.html?id=${id}`;
    const lineMessage = `🚐 [คิวงานรถราชการ - โรงเรียนพะเยาพิทยาคม]\n📌 เลขที่คำขอ: ${row.request_no}\n📅 วันที่เดินทาง: ${row.date}${row.return_date && row.return_date !== row.date ? ' ถึง ' + row.return_date : ''} (${timeStart} - ${timeEnd} น.)\n📍 ปลายทาง: ${row.destination}\n📝 วัตถุประสงค์: ${row.purpose || '-'}\n🚗 รถที่มอบหมาย: ${carLabel}\n👤 พนักงานขับรถ: ${driverCheck.name}\n🙋‍♂️ ผู้ขอใช้รถ: ${row.requester_name} (${row.requester_department || '-'})\n👥 ผู้ร่วมเดินทาง: ${row.passengers || 1} คน\n🔗 รายละเอียด: ${confirmationUrl}`;
    
    if (requester && requester.email) {
      await sendEmailViaGAS(env, requester.email, 'อนุมัติการขอใช้รถ', lineMessage);
    }

    return success({ id, queue_id: queueId, message: 'อนุมัติคำขอและสร้างคิวเรียบร้อย', lineMessage, confirmation_url: confirmationUrl });
    } catch (e) {
      return error('Server Error: ' + e.message, 500);
    }
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
      `UPDATE vehicle_requests SET status = 'rejected', rejection_reason = ?, approved_by = ?, approved_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
      [body?.reason || '', user.id, ts, user.id, ts, id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'reject_vehicle_request', 'vehicle_request', id, { reason: body?.reason });
    await createNotification(env.DB, row.requester_id, 'vehicle_request', 'คำขอใช้รถไม่ได้รับอนุมัติ',
      `คำขอวันที่ ${row.date} ไป${row.destination} ไม่อนุมัติ: ${body?.reason || '-'}`);
    // await sendTelegramMessage(env,
    //   `❌ <b>ไม่อนุมัติคำขอใช้รถ</b>\n📅 ${row.date}\n📍 ${row.destination}\n📝 เหตุผล: ${body?.reason || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'ปฏิเสธคำขอเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}
