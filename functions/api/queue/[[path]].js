// Vehicle dispatch queue management
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, writeAuditLog,
  sendTelegramMessage, createNotification, notifyAllAdmins, sendLineMessage,
  formatQueueLineMessage, sendAdminManualQueueEmail
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
    if (user.role !== 'driver') {
      try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    }
    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');
    const carId = url.searchParams.get('car_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const driverIdParam = url.searchParams.get('driver_id');
    const where = [];
    const params = [];
    if (status) { where.push('q.status = ?'); params.push(status); }
    if (date) { where.push('q.date = ?'); params.push(date); }
    if (carId) { where.push('q.car_id = ?'); params.push(carId); }
    if (dateFrom) { where.push('q.date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('q.date <= ?'); params.push(dateTo); }
    if (driverIdParam) { where.push('q.driver_id = ?'); params.push(driverIdParam); }
    const rows = await dbAll(env.DB,
      `SELECT q.*, c.license_plate, c.brand, c.model,
       d.name AS driver_name, d.line_id AS driver_line_id, d.phone AS driver_phone,
       bd.name AS backup_driver_name,
       u.display_name AS requester_display_name,
       COALESCE(u.phone, uc.phone) AS requester_phone,
       uc.display_name AS created_by_name,
       uu.display_name AS updated_by_name
       FROM queue q
       LEFT JOIN cars c ON q.car_id = c.id
       LEFT JOIN drivers d ON q.driver_id = d.id
       LEFT JOIN drivers bd ON q.backup_driver_id = bd.id
       LEFT JOIN users u ON q.requester_id = u.id
       LEFT JOIN users uc ON q.created_by = uc.id
       LEFT JOIN users uu ON q.updated_by = uu.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY q.date DESC, q.time_start ASC`,
      params
    );
    return success(rows);
  }

  // --- GET /api/queue/rules ---
  if (path === '/api/queue/rules' && method === 'GET') {
    try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const rules = await dbAll(env.DB, 'SELECT * FROM queue_rules ORDER BY key', []);
    return success({ rules });
  }

  // --- GET /api/queue/:id ---
  if (path.match(/^\/api\/queue\/[^/]+$/) && !path.includes('/freeze') && !path.includes('/cancel') && !path.includes('/complete') && !path.includes('/rules') && method === 'GET') {
    try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/queue/');
    const row = await dbFirst(env.DB,
      `SELECT q.*, c.license_plate, c.brand, c.model,
       d.name AS driver_name, d.line_id AS driver_line_id, d.phone AS driver_phone,
       bd.name AS backup_driver_name,
       u.display_name AS requester_display_name,
       COALESCE(u.phone, uc.phone) AS requester_phone,
       uc.display_name AS created_by_name,
       uu.display_name AS updated_by_name
       FROM queue q
       LEFT JOIN cars c ON q.car_id = c.id
       LEFT JOIN drivers d ON q.driver_id = d.id
       LEFT JOIN drivers bd ON q.backup_driver_id = bd.id
       LEFT JOIN users u ON q.requester_id = u.id
       LEFT JOIN users uc ON q.created_by = uc.id
       LEFT JOIN users uu ON q.updated_by = uu.id
       WHERE q.id = ?`, [id]);
    if (!row) return error('ไม่พบคิว', 404);
    return success(row);
  }

  // --- POST /api/queue ---
  if (path === '/api/queue' && method === 'POST') {
    try { requirePermission(user, 'queue', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.date) return error('กรุณาระบุยานพาหนะและวันที่');

    const returnDate = body.return_date || body.date;
    const timeStart = body.time_start || body.departure_time || '00:00';
    const timeEnd = body.time_end || body.return_time || '23:59';
    const estKm = parseFloat(body.estimated_km) || 0;

    const blockers = [];
    const isOverride = !!(body.override || body.emergency_override);
    const overrideReason = (body.override_reason || '').trim();

    // 1. Validation: ตรวจสอบสถานะรถ
    const carCheck = await dbFirst(env.DB, 'SELECT id, status, license_plate, brand, model FROM cars WHERE id = ?', [body.car_id]);
    if (!carCheck) return error('ไม่พบข้อมูลยานพาหนะ');
    if (carCheck.status === 'under_repair' || carCheck.status === 'maintenance') {
      blockers.push(`🚗 รถทะเบียน ${carCheck.license_plate} อยู่ระหว่างซ่อมหรือเช็คระยะ`);
    } else if (carCheck.status === 'inactive') {
      blockers.push(`🚗 รถทะเบียน ${carCheck.license_plate} ถูกระงับการใช้งาน`);
    }

    // ตรวจสอบรายการแจ้งซ่อมค้าง
    const activeRepair = await dbFirst(env.DB, `
      SELECT id, issue_description, service_type FROM repair_log 
      WHERE car_id = ? 
      AND status IN ('requested', 'approved', 'inspected', 'documented', 'repairing')
      AND date_reported <= ? AND (date_completed IS NULL OR date_completed >= ?)
    `, [body.car_id, returnDate, body.date]);
    if (activeRepair) {
      blockers.push(`🚗 รถทะเบียน ${carCheck.license_plate} มีรายการแจ้งซ่อม/เช็คระยะค้างอยู่ (${activeRepair.issue_description || activeRepair.service_type || 'กำลังซ่อม'})`);
    }

    // 2. Validation: ตรวจสอบพนักงานขับรถ
    let driverCheck = null;
    if (body.driver_id) {
      driverCheck = await dbFirst(env.DB, 'SELECT id, name, status, license_expiry, phone, line_id FROM drivers WHERE id = ?', [body.driver_id]);
      if (!driverCheck) return error('ไม่พบข้อมูลพนักงานขับรถ');
      if (driverCheck.status === 'inactive') {
        blockers.push(`👤 พนักงานขับรถ '${driverCheck.name}' ถูกระงับการปฏิบัติงาน`);
      } else if (driverCheck.status === 'on_leave') {
        blockers.push(`👤 พนักงานขับรถ '${driverCheck.name}' อยู่ระหว่างการลา`);
      }
      if (driverCheck.license_expiry && driverCheck.license_expiry < new Date().toISOString().substr(0, 10)) {
        blockers.push(`👤 ใบขับขี่พนักงานขับรถ '${driverCheck.name}' หมดอายุแล้ว (${driverCheck.license_expiry})`);
      }

      // ตรวจสอบตารางการลา (leaves)
      const activeLeave = await dbFirst(env.DB, `
        SELECT leave_type, start_date, end_date FROM leaves
        WHERE driver_id = ? AND status IN ('approved', 'pending')
        AND start_date <= ? AND end_date >= ?
      `, [body.driver_id, returnDate, body.date]);
      if (activeLeave) {
        const ltype = activeLeave.leave_type === 'sick' ? 'ลาป่วย' : (activeLeave.leave_type === 'personal' ? 'ลากิจ' : (activeLeave.leave_type === 'vacation' ? 'ลาพักผ่อน' : 'ลา'));
        blockers.push(`👤 พนักงานขับรถ '${driverCheck.name}' ลางาน (${ltype} วันที่ ${activeLeave.start_date} ถึง ${activeLeave.end_date})`);
      }

      // 3. กฎความล้า (Fatigue Rule): ขับสะสม >= 400 กม. ในวันก่อนหน้า
      try {
        const targetD = new Date(body.date + 'T00:00:00');
        if (!isNaN(targetD.getTime())) {
          const prevD = new Date(targetD);
          prevD.setDate(prevD.getDate() - 1);
          const prevDateStr = prevD.toISOString().substr(0, 10);

          const prevQueues = await dbAll(env.DB, `
            SELECT estimated_km FROM queue
            WHERE driver_id = ? AND (date = ? OR return_date = ?) AND status NOT IN ('cancelled')
          `, [body.driver_id, prevDateStr, prevDateStr]);

          let totalPrevKm = 0;
          for (const pq of prevQueues) totalPrevKm += (pq.estimated_km || 0);

          if (totalPrevKm >= 400 && estKm > 100) {
            blockers.push(`😴 [กฎความล้า] พนักงานขับรถ '${driverCheck.name}' ขับรถสะสมมากกว่า 400 กม. (${totalPrevKm} กม.) ในวันก่อนหน้า (${prevDateStr}) ไม่อนุญาตให้จัดคิวขับรถทางไกลในวันนี้ (ควรได้พัก หรือวิ่งงานระยะสั้นในพื้นที่เท่านั้น)`);
          }
        }
      } catch (fatigueErr) {
        console.error('Fatigue check error:', fatigueErr);
      }
    }

    // 4. ตรวจสอบคิวซ้อนทับ (Conflict detection)
    if (!body.allow_flexible && !isOverride && !body.force_queue) {
      const conflicts = await dbAll(env.DB,
        `SELECT q.id, q.time_start, q.time_end, q.date, q.return_date, c.license_plate, d.name AS driver_name
         FROM queue q
         LEFT JOIN cars c ON q.car_id = c.id
         LEFT JOIN drivers d ON q.driver_id = d.id
         WHERE q.status NOT IN ('cancelled','completed')
         AND q.date <= ? AND COALESCE(q.return_date, q.date) >= ?
         AND ((q.car_id = ?) OR (q.driver_id = ? AND ? IS NOT NULL))`,
        [returnDate, body.date, body.car_id, body.driver_id || null, body.driver_id || null]
      );

      for (const conf of conflicts) {
        const isMulti = (body.date !== returnDate) || (conf.date !== (conf.return_date || conf.date));
        if (isMulti || (conf.time_start < timeEnd && conf.time_end > timeStart)) {
          blockers.push(`คิวซ้อนทับ: ${conf.license_plate || ''} ${conf.driver_name || ''} (${conf.date} เวลา ${conf.time_start}-${conf.time_end})`);
        }
      }
    }

    // ตรวจสอบเงื่อนไขข้อห้าม และการ Override
    if (blockers.length > 0) {
      if (!isOverride || !overrideReason) {
        return error(`ไม่สามารถจัดคิวได้เนื่องจากติดเงื่อนไข:\n- ${blockers.join('\n- ')}\n(หากจำเป็นต้องจัดคิวเป็นกรณีพิเศษ กรุณากรอกเหตุผลและความจำเป็นในการ Override)`, 409, { blockers, can_override: true });
      }
    }

    const id = generateUUID();
    const ts = now();
    const notesStr = overrideReason
      ? `[Override เหตุผล: ${overrideReason}] ${body.notes || ''}`.trim()
      : (body.notes || '');

    await dbRun(env.DB,
      `INSERT INTO queue (id, date, return_date, time_start, time_end, car_id, driver_id,
        requester_id, requested_by, mission, destination, passengers,
        status, notes, backup_driver_id, estimated_km, waypoints, estimated_fuel_cost,
        travel_order_number, purpose_category, distance_justification,
        signed_vehicle_chief, signed_deputy_director, signed_director,
        created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.date, returnDate, timeStart, timeEnd,
       body.car_id, body.driver_id || null,
       body.requester_id || user.id, body.requested_by || body.requester_name || user.displayName || user.username || '',
       body.mission || body.purpose || '', body.destination || '',
       body.passengers || body.passenger_count || 1,
       notesStr, body.backup_driver_id || null, body.estimated_km || null, body.waypoints || null, body.estimated_fuel_cost || null,
       body.travel_order_number || null, body.purpose_category || null, overrideReason || null,
       body.signed_vehicle_chief || null, body.signed_deputy_director || null, body.signed_director || null,
       user.id, ts, ts]
    );

    const carLabel = `${carCheck.license_plate} ${carCheck.brand || ''}`.trim();
    const driverLabel = driverCheck ? driverCheck.name : '-';
    const mission = body.mission || body.purpose || '-';

    // บันทึก Audit Log (กรณี Override บันทึกรายละเอียดอย่างชัดเจน)
    if (isOverride && overrideReason) {
      await writeAuditLog(env.DB, user.id, user.displayName || user.username, 'queue_override', 'queue', id, {
        override_reason: overrideReason,
        violations: blockers,
        car: carLabel,
        driver: driverLabel
      });
    } else {
      await writeAuditLog(env.DB, user.id, user.displayName || user.username, 'create_queue', 'queue', id, { date: body.date, car: carLabel });
    }

    await notifyAllAdmins(env.DB, 'queue', 'สร้างคิวใหม่',
      `${user.displayName || user.username} สร้างคิววันที่ ${body.date} | ${carLabel} | ${driverLabel} | ${mission}`);

    // ส่งอีเมลยืนยันไปยังแอดมินผู้จัดคิว (Manual / Walk-in Queue Confirmation)
    if (user && user.email) {
      try {
        await sendAdminManualQueueEmail(env, {
          date: body.date,
          return_date: returnDate,
          time_start: timeStart,
          time_end: timeEnd,
          car_id: carLabel,
          requested_by: body.requested_by || body.requester_name || user.displayName || user.username,
          destination: body.destination,
          mission: mission,
          passengers: body.passengers || 1
        }, user, carCheck, driverCheck);
      } catch (emailErr) {
        console.error('Error sending admin manual queue email:', emailErr);
      }
    }

    // สร้างรูปแบบข้อความสำหรับคัดลอกส่ง LINE
    const lineMessage = formatQueueLineMessage({
      driverName: driverCheck?.name,
      driverPhone: driverCheck?.phone,
      carLabel: carLabel,
      requesterName: body.requested_by || body.requester_name || user.displayName || user.username,
      requesterPhone: body.requester_phone || user.phone || '',
      dates: body.date !== returnDate ? `${body.date} ถึง ${returnDate}` : body.date,
      times: `${timeStart} - ${timeEnd} น.`,
      destination: body.destination || '-',
      purpose: mission,
      passengers: body.passengers || 1
    });

    return success({ id, message: 'สร้างคิวเรียบร้อย', lineMessage }, 201);
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

    const fields = ['date','return_date','time_start','time_end','car_id','driver_id',
      'requester_id','requested_by','mission','destination','passengers',
      'status','cancel_reason','notes','backup_driver_id','estimated_km','waypoints','estimated_fuel_cost','distance_justification',
      'travel_order_number','purpose_category',
      'signed_vehicle_chief','signed_deputy_director','signed_director'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_by = ?'); params.push(user.id);
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

  // --- PUT /api/queue/:id/justification ---
  if (path.match(/\/api\/queue\/[^/]+\/justification/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE queue SET distance_justification = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
      [body.justification || '', user.id, now(), id]
    );
    return success({ message: 'บันทึกคำชี้แจงเรียบร้อย' });
  }

  // --- PUT /api/queue/:id/freeze ---
  if (path.match(/\/api\/queue\/[^/]+\/freeze/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE queue SET status = 'frozen', frozen_by = ?, frozen_at = ?,
       frozen_reason = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
      [user.id, now(), body.frozen_reason || body.reason || '', user.id, now(), id]
    );
    return success({ message: 'อายัดคิวเรียบร้อย' });
  }

  // --- PUT /api/queue/:id/unfreeze ---
  if (path.match(/\/api\/queue\/[^/]+\/unfreeze/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    await dbRun(env.DB,
      `UPDATE queue SET status = 'scheduled', frozen_by = NULL, frozen_at = NULL,
       frozen_reason = NULL, updated_by = ?, updated_at = ? WHERE id = ?`,
      [user.id, now(), id]
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
      `UPDATE queue SET status = 'cancelled', cancel_reason = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
      [body.cancel_reason || body.reason || '', user.id, now(), id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'cancel_queue', 'queue', id, null);
    if (q) {
      await notifyAllAdmins(env.DB, 'queue', 'ยกเลิกคิว',
        `${user.displayName} ยกเลิกคิววันที่ ${q.date} | ${q.license_plate || ''} | ${q.driver_name || ''}`);
      // await sendTelegramMessage(env,
      //   `❌ <b>ยกเลิกคิว</b>\n📅 ${q.date} (${q.time_start})\n🚗 ${q.license_plate || ''}\n👤 ${q.driver_name || ''}\n💬 ${body.cancel_reason || body.reason || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    }
    return success({ message: 'ยกเลิกคิวเรียบร้อย' });
  }

  // --- PUT /api/queue/:id/complete ---
  if (path.match(/\/api\/queue\/[^/]+\/complete/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    await dbRun(env.DB,
      `UPDATE queue SET status = 'completed', updated_by = ?, updated_at = ? WHERE id = ?`,
      [user.id, now(), id]
    );
    return success({ message: 'ดำเนินการคิวเสร็จสิ้น' });
  }

  // --- PUT /api/queue/:id/ongoing ---
  if (path.match(/\/api\/queue\/[^/]+\/ongoing/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    await dbRun(env.DB,
      `UPDATE queue SET status = 'ongoing', updated_by = ?, updated_at = ? WHERE id = ?`,
      [user.id, now(), id]
    );
    return success({ message: 'เริ่มดำเนินการคิว' });
  }

  // --- POST /api/queue/:id/evaluate --- ผู้ขอใช้รถกรอกประเมินหลังเดินทาง
  if (path.match(/\/api\/queue\/[^/]+\/evaluate/) && method === 'POST') {
    const id = path.split('/')[3];
    const q = await dbFirst(env.DB, 'SELECT * FROM queue WHERE id = ?', [id]);
    if (!q) return error('ไม่พบคิว', 404);
    if (q.status !== 'completed') return error('ประเมินได้เฉพาะคิวที่เสร็จสิ้นแล้ว');
    // ตรวจสอบว่ายังไม่เคยประเมิน
    const existing = await dbFirst(env.DB, 'SELECT id FROM trip_evaluations WHERE queue_id = ? AND evaluator_id = ?', [id, user.id]);
    if (existing) return error('คุณได้ประเมินคิวนี้ไปแล้ว');
    const body = await parseBody(request);
    const evalId = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO trip_evaluations (id, queue_id, evaluator_id,
        driver_behavior_score, vehicle_condition_score, punctuality_score,
        overall_score, problems, suggestions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [evalId, id, user.id,
       body?.driver_behavior_score || null, body?.vehicle_condition_score || null,
       body?.punctuality_score || null, body?.overall_score || null,
       body?.problems || '', body?.suggestions || '', now()]
    );
    return success({ id: evalId, message: 'ประเมินการเดินทางเรียบร้อย' }, 201);
  }

  // --- GET /api/queue/:id/evaluation --- ดูผลประเมิน
  if (path.match(/\/api\/queue\/[^/]+\/evaluation/) && method === 'GET') {
    const id = path.split('/')[3];
    const rows = await dbAll(env.DB,
      `SELECT te.*, u.display_name AS evaluator_name
       FROM trip_evaluations te
       LEFT JOIN users u ON te.evaluator_id = u.id
       WHERE te.queue_id = ?`, [id]);
    return success(rows);
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}