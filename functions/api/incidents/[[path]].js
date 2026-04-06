// Incident Logging — อุบัติเหตุ/เหตุการณ์ผิดปกติ
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

  // --- GET /api/incidents ---
  if (path === '/api/incidents' && method === 'GET') {
    const carId = url.searchParams.get('car_id');
    const driverId = url.searchParams.get('driver_id');
    const status = url.searchParams.get('status');
    const where = [];
    const params = [];
    if (carId) { where.push('i.car_id = ?'); params.push(carId); }
    if (driverId) { where.push('i.driver_id = ?'); params.push(driverId); }
    if (status) { where.push('i.status = ?'); params.push(status); }
    const rows = await dbAll(env.DB,
      `SELECT i.*, c.license_plate, c.brand, d.name AS driver_name,
       u.display_name AS created_by_name
       FROM incidents i
       LEFT JOIN cars c ON i.car_id = c.id
       LEFT JOIN drivers d ON i.driver_id = d.id
       LEFT JOIN users u ON i.created_by = u.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY i.incident_date DESC LIMIT 300`,
      params
    );
    return success(rows);
  }

  // --- GET /api/incidents/:id ---
  if (path.match(/^\/api\/incidents\/[^/]+$/) && method === 'GET'
      && !path.includes('/resolve')) {
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB,
      `SELECT i.*, c.license_plate, c.brand, d.name AS driver_name,
       u.display_name AS created_by_name
       FROM incidents i
       LEFT JOIN cars c ON i.car_id = c.id
       LEFT JOIN drivers d ON i.driver_id = d.id
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = ?`, [id]);
    if (!row) return error('ไม่พบข้อมูลอุบัติเหตุ', 404);
    return success(row);
  }

  // --- POST /api/incidents ---
  if (path === '/api/incidents' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.car_id || !body?.incident_date || !body?.incident_type)
      return error('กรุณาระบุรถ วันที่ และประเภทเหตุการณ์');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO incidents (id, car_id, driver_id, incident_date, incident_type,
        description, location, damage_cost, photos, police_report_number,
        insurance_claim, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reported', ?, ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.incident_date, body.incident_type,
       body.description || '', body.location || '', body.damage_cost || 0,
       JSON.stringify(body.photos || []), body.police_report_number || '',
       body.insurance_claim || '', user.id, ts, ts]
    );
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [body.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : body.car_id;
    const typeLabels = { accident: 'อุบัติเหตุ', traffic_violation: 'ฝ่าฝืนจราจร', damage: 'ความเสียหาย', other: 'อื่นๆ' };
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_incident', 'incident', id, { car: carLabel, type: body.incident_type });
    await notifyAllAdmins(env.DB, 'incident', 'บันทึกอุบัติเหตุ',
      `${typeLabels[body.incident_type] || body.incident_type} — ${carLabel} วันที่ ${body.incident_date}`);
    await sendTelegramMessage(env,
      `⚠️ <b>บันทึกอุบัติเหตุ</b>\n🚗 ${carLabel}\n📅 ${body.incident_date}\n📌 ${typeLabels[body.incident_type] || body.incident_type}\n📍 ${body.location || '-'}\n💰 ค่าเสียหาย ${body.damage_cost || 0} บาท\n👨‍💼 โดย: ${user.displayName}`);
    return success({ id, message: 'บันทึกอุบัติเหตุเรียบร้อย' }, 201);
  }

  // --- PUT /api/incidents/:id ---
  if (path.match(/^\/api\/incidents\/[^/]+$/) && method === 'PUT'
      && !path.includes('/resolve')) {
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['car_id','driver_id','incident_date','incident_type',
      'description','location','damage_cost','police_report_number',
      'insurance_claim','status'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.photos !== undefined) { sets.push('photos = ?'); params.push(JSON.stringify(body.photos)); }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE incidents SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลอุบัติเหตุเรียบร้อย' });
  }

  // --- PUT /api/incidents/:id/resolve --- ปิดเรื่อง
  if (path.match(/^\/api\/incidents\/[^/]+\/resolve$/) && method === 'PUT') {
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM incidents WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลอุบัติเหตุ', 404);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE incidents SET status = 'resolved', resolved_by = ?, resolved_at = ?,
       resolution_notes = ?, updated_at = ? WHERE id = ?`,
      [user.id, ts, body?.resolution_notes || '', ts, id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'resolve_incident', 'incident', id, null);
    return success({ message: 'ปิดเรื่องเรียบร้อย' });
  }

  // --- DELETE /api/incidents/:id ---
  if (path.match(/^\/api\/incidents\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'repair', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    await dbRun(env.DB, 'DELETE FROM incidents WHERE id = ?', [id]);
    await writeAuditLog(env.DB, user.id, user.displayName, 'delete_incident', 'incident', id, null);
    return success({ message: 'ลบข้อมูลอุบัติเหตุเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}
