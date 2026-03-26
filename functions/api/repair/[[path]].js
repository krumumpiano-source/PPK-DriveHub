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
    try { requirePermission(user, 'repair', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO repair_log (id, car_id, date_reported, date_started, date_completed,
        status, mileage_at_repair, reporter_id, reporter_name, garage_name,
        repair_items, issue_description, cost, documents, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.date_reported || ts.substr(0,10),
       body.date_started || null, body.date_completed || null,
       body.status || 'pending', body.mileage_at_repair || 0,
       body.reporter_id || user.id, body.reporter_name || user.display_name || '',
       body.garage_name || body.shop_name || '',
       JSON.stringify(body.repair_items || []),
       body.issue_description || body.description || '',
       body.cost || 0, JSON.stringify(body.documents || []),
       body.notes || '', user.id, ts, ts]
    );

    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [body.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : body.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_repair', 'repair', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'repair', 'แจ้งซ่อม',
      `${user.displayName} แจ้งซ่อม ${carLabel} — ${body.issue_description || body.description || '-'}`);
    await sendTelegramMessage(env,
      `🔧 <b>แจ้งซ่อม</b>\n🚗 ${carLabel}\n📝 ${body.issue_description || body.description || '-'}\n🏪 ${body.garage_name || body.shop_name || '-'}\n💰 ${body.cost || 0} บาท\n👨‍💼 โดย: ${user.displayName}`);

    return success({ id, message: 'บันทึกข้อมูลซ่อมเรียบร้อย' }, 201);
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