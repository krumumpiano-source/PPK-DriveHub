// Repair logs + scheduled repairs
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

  // --- GET /api/repair/log ---
  if (path === '/api/repair/log' && method === 'GET') {
    try { requirePermission(user, 'repair', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const status = url.searchParams.get('status');
    const where = [];
    const params = [];
    if (carId) { where.push('rl.car_id = ?'); params.push(carId); }
    if (status) { where.push('rl.status = ?'); params.push(status); }
    const rows = await dbAll(env.DB,
      `SELECT rl.*, c.license_plate, c.brand
       FROM repair_log rl
       LEFT JOIN cars c ON rl.car_id = c.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY rl.date_reported DESC LIMIT 300`,
      params
    );
    return success(rows);
  }

  // --- GET /api/repair/log/:id ---
  if (path.match(/^\/api\/repair\/log\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'repair', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB,
      `SELECT rl.*, c.license_plate, c.brand FROM repair_log rl
       LEFT JOIN cars c ON rl.car_id = c.id WHERE rl.id = ?`, [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    return success(row);
  }

  // --- POST /api/repair/log ---
  if (path === '/api/repair/log' && method === 'POST') {
    // ทุกคนแจ้งซ่อมได้ (driver, repair, admin)
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO repair_log (id, car_id, date_reported, date_started, date_completed,
        status, mileage_at_repair, reporter_id, reporter_name, garage_name,
        repair_items, issue_description, cost, documents, notes,
        requested_by_driver_id, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.date_reported || ts.substr(0,10),
       body.date_started || null, body.date_completed || null,
       body.mileage_at_repair || 0,
       body.reporter_id || user.id, body.reporter_name || user.display_name || '',
       body.garage_name || body.shop_name || '',
       JSON.stringify(body.repair_items || []),
       body.issue_description || body.description || '',
       body.cost || 0, JSON.stringify(body.documents || []),
       body.notes || '', body.requested_by_driver_id || null, user.id, ts, ts]
    );

    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [body.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : body.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_repair', 'repair', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'repair', 'แจ้งซ่อม',
      `${user.displayName} แจ้งซ่อม ${carLabel} — ${body.issue_description || body.description || '-'}`);
    await sendTelegramMessage(env,
      `🔧 <b>แจ้งซ่อมใหม่</b>\n🚗 ${carLabel}\n📝 ${body.issue_description || body.description || '-'}\n👨‍💼 โดย: ${user.displayName}`);

    return success({ id, message: 'แจ้งซ่อมเรียบร้อย' }, 201);
  }

  // --- PUT /api/repair/log/:id ---
  if (path.match(/^\/api\/repair\/log\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['car_id','date_reported','date_started','date_completed','status',
      'mileage_at_repair','reporter_id','reporter_name','garage_name',
      'issue_description','cost','notes'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.repair_items !== undefined) { sets.push('repair_items = ?'); params.push(JSON.stringify(body.repair_items)); }
    if (body.documents !== undefined) { sets.push('documents = ?'); params.push(JSON.stringify(body.documents)); }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE repair_log SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลซ่อมเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/approve --- อนุมัติแจ้งซ่อม
  if (path.match(/^\/api\/repair\/log\/[^/]+\/approve$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'requested') return error(`ไม่สามารถอนุมัติได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?`,
      [user.id, ts, ts, id]
    );
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'approve_repair', 'repair', id, { car: carLabel });
    await createNotification(env.DB, row.created_by, 'repair', 'อนุมัติแจ้งซ่อม', `แจ้งซ่อม ${carLabel} ได้รับอนุมัติแล้ว`);
    await sendTelegramMessage(env, `✅ <b>อนุมัติแจ้งซ่อม</b>\n🚗 ${carLabel}\n👨‍💼 อนุมัติโดย: ${user.displayName}`);
    return success({ message: 'อนุมัติแจ้งซ่อมเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/reject --- ปฏิเสธแจ้งซ่อม
  if (path.match(/^\/api\/repair\/log\/[^/]+\/reject$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'requested') return error(`ไม่สามารถปฏิเสธได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'rejected', rejected_by = ?, rejected_at = ?, rejection_reason = ?, updated_at = ? WHERE id = ?`,
      [user.id, ts, body?.reason || '', ts, id]
    );
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'reject_repair', 'repair', id, { car: carLabel, reason: body?.reason });
    await createNotification(env.DB, row.created_by, 'repair', 'ไม่อนุมัติแจ้งซ่อม', `แจ้งซ่อม ${carLabel} ไม่ได้รับอนุมัติ: ${body?.reason || '-'}`);
    await sendTelegramMessage(env, `❌ <b>ไม่อนุมัติแจ้งซ่อม</b>\n🚗 ${carLabel}\n📝 เหตุผล: ${body?.reason || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'ปฏิเสธแจ้งซ่อมเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/inspect --- บันทึกตรวจสภาพ+ใบเสนอราคา
  if (path.match(/^\/api\/repair\/log\/[^/]+\/inspect$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'approved') return error(`ไม่สามารถบันทึกตรวจสภาพได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'inspected', inspection_date = ?, inspection_notes = ?,
       quotation_documents = ?, garage_name = COALESCE(?, garage_name), updated_at = ? WHERE id = ?`,
      [body?.inspection_date || ts.substr(0,10), body?.inspection_notes || '',
       JSON.stringify(body?.quotation_documents || []),
       body?.garage_name || null, ts, id]
    );
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'inspect_repair', 'repair', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'repair', 'ตรวจสภาพเสร็จ', `ตรวจสภาพ ${carLabel} เรียบร้อย — รอทำบันทึกข้อความ`);
    await sendTelegramMessage(env, `🔍 <b>ตรวจสภาพเสร็จ</b>\n🚗 ${carLabel}\n📝 ${body?.inspection_notes || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'บันทึกตรวจสภาพเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/document --- ทำบันทึกข้อความ
  if (path.match(/^\/api\/repair\/log\/[^/]+\/document$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'inspected') return error(`ไม่สามารถทำบันทึกข้อความได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'documented', memo_documents = ?, memo_notes = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(body?.memo_documents || []), body?.memo_notes || '', ts, id]
    );
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'document_repair', 'repair', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'repair', 'บันทึกข้อความเสร็จ', `ทำบันทึกข้อความซ่อม ${carLabel} เรียบร้อย — รอดำเนินการซ่อม`);
    await sendTelegramMessage(env, `📄 <b>บันทึกข้อความเสร็จ</b>\n🚗 ${carLabel}\n📝 ${body?.memo_notes || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'ทำบันทึกข้อความเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/start-repair --- เริ่มซ่อม
  if (path.match(/^\/api\/repair\/log\/[^/]+\/start-repair$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'documented') return error(`ไม่สามารถเริ่มซ่อมได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'repairing', date_started = ?, garage_name = COALESCE(?, garage_name),
       cost = COALESCE(?, cost), updated_at = ? WHERE id = ?`,
      [body?.date_started || ts.substr(0,10), body?.garage_name || null, body?.cost || null, ts, id]
    );
    // อัปเดตสถานะรถเป็น under_repair
    await dbRun(env.DB, `UPDATE cars SET status = 'under_repair', updated_at = ? WHERE id = ?`, [ts, row.car_id]);
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'start_repair', 'repair', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'repair', 'เริ่มซ่อม', `เริ่มดำเนินการซ่อม ${carLabel} แล้ว`);
    await sendTelegramMessage(env, `🔨 <b>เริ่มซ่อม</b>\n🚗 ${carLabel}\n🏪 ${body?.garage_name || row.garage_name || '-'}\n💰 ${body?.cost || row.cost || 0} บาท\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'เริ่มดำเนินการซ่อมเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/complete --- ซ่อมเสร็จ
  if (path.match(/^\/api\/repair\/log\/[^/]+\/complete$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'repairing') return error(`ไม่สามารถบันทึกซ่อมเสร็จได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'completed', date_completed = ?,
       cost = COALESCE(?, cost), receipt_documents = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?`,
      [body?.date_completed || ts.substr(0,10), body?.cost || null,
       JSON.stringify(body?.receipt_documents || []), body?.notes || null, ts, id]
    );
    // อัปเดตสถานะรถกลับเป็น active
    await dbRun(env.DB, `UPDATE cars SET status = 'active', updated_at = ? WHERE id = ?`, [ts, row.car_id]);
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'complete_repair', 'repair', id, { car: carLabel, cost: body?.cost || row.cost });
    if (row.created_by) await createNotification(env.DB, row.created_by, 'repair', 'ซ่อมเสร็จ', `ซ่อม ${carLabel} เสร็จเรียบร้อยแล้ว`);
    if (row.requested_by_driver_id) {
      const driverUser = await dbFirst(env.DB, 'SELECT id FROM users WHERE driver_id = ?', [row.requested_by_driver_id]);
      if (driverUser) await createNotification(env.DB, driverUser.id, 'repair', 'ซ่อมเสร็จ', `ซ่อม ${carLabel} เสร็จเรียบร้อยแล้ว`);
    }
    await notifyAllAdmins(env.DB, 'repair', 'ซ่อมเสร็จ', `ซ่อม ${carLabel} เสร็จเรียบร้อย ค่าใช้จ่ายรวม ${body?.cost || row.cost || 0} บาท`);
    await sendTelegramMessage(env, `✅ <b>ซ่อมเสร็จ</b>\n🚗 ${carLabel}\n💰 ${body?.cost || row.cost || 0} บาท\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'บันทึกซ่อมเสร็จเรียบร้อย' });
  }

  // --- DELETE /api/repair/log/:id ---
  if (path.match(/^\/api\/repair\/log\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'repair', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    await dbRun(env.DB, 'DELETE FROM repair_log WHERE id = ?', [id]);
    return success({ message: 'ลบข้อมูลซ่อมเรียบร้อย' });
  }

  // --- Scheduled Repairs ---
  if (path === '/api/repair/scheduled' && method === 'GET') {
    try { requirePermission(user, 'repair', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const where = status ? 'WHERE sr.status = ?' : '';
    const params = status ? [status] : [];
    const rows = await dbAll(env.DB,
      `SELECT sr.*, c.license_plate, c.brand FROM scheduled_repairs sr
       LEFT JOIN cars c ON sr.car_id = c.id
       ${where} ORDER BY sr.scheduled_date ASC`,
      params
    );
    return success(rows);
  }

  if (path === '/api/repair/scheduled' && method === 'POST') {
    try { requirePermission(user, 'repair', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO scheduled_repairs (id, car_id, repair_type, scheduled_date, status, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [id, body.car_id, body.repair_type || '', body.scheduled_date || '',
       body.notes || '', user.id, ts]
    );
    return success({ id, message: 'สร้างกำหนดการซ่อมเรียบร้อย' }, 201);
  }

  if (path.match(/^\/api\/repair\/scheduled\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['car_id','repair_type','scheduled_date','status','notes'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.status === 'completed') { sets.push('completed_at = ?'); params.push(now()); }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(id);
    await dbRun(env.DB, `UPDATE scheduled_repairs SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตกำหนดการซ่อมเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}