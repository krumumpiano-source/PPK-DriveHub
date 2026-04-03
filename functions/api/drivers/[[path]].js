// Driver management + fatigue + leaves
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, uploadToR2, writeAuditLog
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;
  if (!user) return error('Unauthorized', 401);

  // --- GET /api/drivers ---
  if (path === '/api/drivers' && method === 'GET') {
    try { requirePermission(user, 'drivers', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const where = [];
    const params = [];
    if (status) { where.push('d.status = ?'); params.push(status); }
    if (search) { where.push("(d.name LIKE ? OR d.license_number LIKE ? OR d.phone LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const rows = await dbAll(env.DB,
      `SELECT d.* FROM drivers d
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY d.created_at DESC`,
      params
    );
    return success({ drivers: rows });
  }

  // --- GET /api/drivers/:id ---
  if (path.match(/^\/api\/drivers\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'drivers', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/drivers/');
    const row = await dbFirst(env.DB, 'SELECT * FROM drivers WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลพนักงานขับรถ', 404);
    return success(row);
  }

  // --- POST /api/drivers ---
  if (path === '/api/drivers' && method === 'POST') {
    try { requirePermission(user, 'drivers', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.name) return error('กรุณาระบุชื่อพนักงานขับรถ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO drivers (id, name, license_number, license_expiry, phone, status,
        profile_image, id_card_image, fatigue_flag, discipline_score, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.name, body.license_number || '', body.license_expiry || null,
       body.phone || '', body.status || 'active',
       body.profile_image || null, body.id_card_image || null,
       body.fatigue_flag || 0, body.discipline_score ?? 100,
       body.notes || '', user.id, ts, ts]
    );
    return success({ id, message: 'เพิ่มพนักงานขับรถเรียบร้อย' }, 201);
  }

  // --- PUT /api/drivers/:id ---
  if (path.match(/^\/api\/drivers\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'drivers', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/drivers/');
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['name', 'license_number', 'license_expiry', 'phone', 'status',
      'profile_image', 'id_card_image', 'fatigue_flag', 'discipline_score', 'notes',
      'deactivated_reason', 'deactivated_at'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE drivers SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลพนักงานขับรถเรียบร้อย' });
  }

  // --- DELETE /api/drivers/:id ---
  if (path.match(/^\/api\/drivers\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'drivers', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/drivers/');
    await dbRun(env.DB, "UPDATE drivers SET status = 'inactive', deactivated_at = ? WHERE id = ?", [now(), id]);
    return success({ message: 'ลบพนักงานขับรถเรียบร้อย' });
  }

  // --- Fatigue Reporting ---
  if (path === '/api/drivers/fatigue/report' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.driver_id) return error('กรุณาระบุ driver_id');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO self_reported_fatigue (id, driver_id, reason, reported_at)
       VALUES (?, ?, ?, ?)`,
      [id, body.driver_id, body.reason || '', ts]
    );
    // Flag driver
    await dbRun(env.DB, 'UPDATE drivers SET fatigue_flag = 1, updated_at = ? WHERE id = ?', [ts, body.driver_id]);
    return success({ id, message: 'บันทึกรายงานความเหนื่อยล้าเรียบร้อย' }, 201);
  }

  if (path === '/api/drivers/fatigue/list' && method === 'GET') {
    try { requirePermission(user, 'drivers', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const driverId = url.searchParams.get('driver_id');
    const where = [];
    const params = [];
    if (driverId) { where.push('f.driver_id = ?'); params.push(driverId); }
    const rows = await dbAll(env.DB,
      `SELECT f.*, d.name AS driver_name FROM self_reported_fatigue f
       LEFT JOIN drivers d ON f.driver_id = d.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY f.reported_at DESC LIMIT 100`,
      params
    );
    return success(rows);
  }

  if (path.match(/\/api\/drivers\/fatigue\/[^/]+\/acknowledge/) && method === 'PUT') {
    try { requirePermission(user, 'drivers', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE self_reported_fatigue SET acknowledged = 1, acknowledged_by = ?,
       admin_notes = ?, acknowledged_at = ? WHERE id = ?`,
      [user.id, body.admin_notes || '', now(), id]
    );
    return success({ message: 'รับทราบรายงานความเหนื่อยล้าเรียบร้อย' });
  }

  // --- Leaves CRUD ---
  // GET /api/drivers/:id/leaves
  if (path.match(/^\/api\/drivers\/[^/]+\/leaves$/) && method === 'GET') {
    try { requirePermission(user, 'drivers', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const driverId = path.split('/')[3];
    const rows = await dbAll(env.DB,
      `SELECT l.*, d.name AS driver_name FROM leaves l
       LEFT JOIN drivers d ON l.driver_id = d.id
       WHERE l.driver_id = ? ORDER BY l.start_date DESC`, [driverId]);
    return success(rows);
  }

  // POST /api/drivers/:id/leaves
  if (path.match(/^\/api\/drivers\/[^/]+\/leaves$/) && method === 'POST') {
    try { requirePermission(user, 'drivers', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const driverId = path.split('/')[3];
    const body = await parseBody(request);
    if (!body?.start_date || !body?.end_date) return error('กรุณาระบุวันที่เริ่มและสิ้นสุด');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO leaves (id, driver_id, leave_type, start_date, end_date, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, driverId, body.leave_type || 'personal', body.start_date, body.end_date,
       body.reason || '', now()]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_leave', 'drivers', id, { driver_id: driverId });
    return success({ id, message: 'บันทึกการลาเรียบร้อย' }, 201);
  }

  // PUT /api/drivers/leaves/:id (approve/reject/cancel)
  if (path.match(/^\/api\/drivers\/leaves\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'drivers', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    if (body.status) { sets.push('status = ?'); params.push(body.status); }
    if (body.status === 'approved') { sets.push('approved_by = ?', 'approved_at = ?'); params.push(user.id, now()); }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(id);
    await dbRun(env.DB, `UPDATE leaves SET ${sets.join(', ')} WHERE id = ?`, params);

    // Update driver status if leave is approved
    if (body.status === 'approved') {
      const leave = await dbFirst(env.DB, 'SELECT driver_id, start_date, end_date FROM leaves WHERE id = ?', [id]);
      if (leave) {
        const today = now().substr(0,10);
        if (today >= leave.start_date && today <= leave.end_date) {
          await dbRun(env.DB, "UPDATE drivers SET status = 'on_leave', updated_at = ? WHERE id = ?", [now(), leave.driver_id]);
        }
      }
    }

    return success({ message: 'อัปเดตการลาเรียบร้อย' });
  }

  // DELETE /api/drivers/leaves/:id
  if (path.match(/^\/api\/drivers\/leaves\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'drivers', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    await dbRun(env.DB, 'DELETE FROM leaves WHERE id = ?', [id]);
    return success({ message: 'ลบข้อมูลการลาเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}