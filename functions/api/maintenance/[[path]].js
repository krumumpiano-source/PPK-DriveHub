// Maintenance settings, schedules & alerts
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;
  if (!user) return error('Unauthorized', 401);

  // ========== Maintenance Settings ==========

  // --- GET /api/maintenance/settings ---
  if (path === '/api/maintenance/settings' && method === 'GET') {
    try { requirePermission(user, 'maintenance', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const rows = await dbAll(env.DB, 'SELECT * FROM maintenance_settings ORDER BY item_key', []);
    return success(rows);
  }

  // --- POST /api/maintenance/settings ---
  if (path === '/api/maintenance/settings' && method === 'POST') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.item_key || !body?.item_name) return error('กรุณาระบุ item_key และ item_name');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.item_key, body.item_name,
       body.interval_km || null, body.interval_months || null,
       body.enabled ?? 1, user.id, ts]
    );
    return success({ id, message: 'เพิ่มรายการบำรุงรักษาเรียบร้อย' }, 201);
  }

  // --- PUT /api/maintenance/settings/:id ---
  if (path.match(/^\/api\/maintenance\/settings\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['item_key','item_name','interval_km','interval_months','enabled'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_by = ?'); params.push(user.id);
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE maintenance_settings SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตรายการบำรุงรักษาเรียบร้อย' });
  }

  // --- DELETE /api/maintenance/settings/:id ---
  if (path.match(/^\/api\/maintenance\/settings\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    await dbRun(env.DB, 'DELETE FROM maintenance_settings WHERE id = ?', [id]);
    return success({ message: 'ลบรายการบำรุงรักษาเรียบร้อย' });
  }

  // ========== Vehicle Maintenance Records ==========

  // --- GET /api/maintenance/vehicle/:carId ---
  if (path.match(/^\/api\/maintenance\/vehicle\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'maintenance', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = path.split('/').pop();
    // Get vehicle maintenance records with settings info
    const rows = await dbAll(env.DB,
      `SELECT vm.*, ms.item_name, ms.interval_km, ms.interval_months,
       c.license_plate, c.current_mileage
       FROM vehicle_maintenance vm
       LEFT JOIN maintenance_settings ms ON vm.item_key = ms.item_key
       LEFT JOIN cars c ON vm.car_id = c.id
       WHERE vm.car_id = ?
       ORDER BY vm.item_key`, [carId]
    );
    return success(rows);
  }

  // --- POST /api/maintenance/vehicle ---
  if (path === '/api/maintenance/vehicle' && method === 'POST') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.item_key) return error('กรุณาระบุ car_id และ item_key');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(car_id, item_key) DO UPDATE SET
         last_km = excluded.last_km, last_date = excluded.last_date,
         next_km = excluded.next_km, next_date = excluded.next_date,
         updated_at = excluded.updated_at`,
      [id, body.car_id, body.item_key,
       body.last_km || null, body.last_date || null,
       body.next_km || null, body.next_date || null, ts]
    );
    return success({ id, message: 'บันทึกข้อมูลบำรุงรักษาเรียบร้อย' }, 201);
  }

  // --- PUT /api/maintenance/vehicle/:id ---
  if (path.match(/^\/api\/maintenance\/vehicle\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['last_km','last_date','next_km','next_date'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE vehicle_maintenance SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลบำรุงรักษาเรียบร้อย' });
  }

  // ========== Maintenance Status Overview ==========

  // --- GET /api/maintenance/status ---
  if (path === '/api/maintenance/status' && method === 'GET') {
    try { requirePermission(user, 'maintenance', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    // All cars with their maintenance status
    const rows = await dbAll(env.DB,
      `SELECT c.id, c.license_plate, c.brand, c.model, c.current_mileage,
       (SELECT COUNT(*) FROM vehicle_maintenance vm WHERE vm.car_id = c.id
        AND vm.next_km IS NOT NULL AND c.current_mileage >= vm.next_km) AS overdue_km_count,
       (SELECT COUNT(*) FROM vehicle_maintenance vm WHERE vm.car_id = c.id
        AND vm.next_date IS NOT NULL AND vm.next_date <= date('now')) AS overdue_date_count
       FROM cars c WHERE c.status != 'inactive'
       ORDER BY c.license_plate`, []
    );
    return success(rows);
  }

  // ========== Inspection Alerts ==========

  // --- GET /api/maintenance/alerts ---
  if (path === '/api/maintenance/alerts' && method === 'GET') {
    try { requirePermission(user, 'maintenance', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const resolved = url.searchParams.get('resolved');
    const carId = url.searchParams.get('car_id');
    const where = [];
    const params = [];
    if (resolved !== null) { where.push('ia.resolved = ?'); params.push(resolved === '1' ? 1 : 0); }
    if (carId) { where.push('ia.car_id = ?'); params.push(carId); }
    const rows = await dbAll(env.DB,
      `SELECT ia.*, c.license_plate, c.brand FROM inspection_alerts ia
       LEFT JOIN cars c ON ia.car_id = c.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY ia.created_at DESC`,
      params
    );
    return success(rows);
  }

  // --- PUT /api/maintenance/alerts/:id/resolve ---
  if (path.match(/\/api\/maintenance\/alerts\/[^/]+\/resolve/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    await dbRun(env.DB,
      `UPDATE inspection_alerts SET resolved = 1, resolved_by = ?, resolved_at = ? WHERE id = ?`,
      [user.id, now(), id]
    );
    return success({ message: 'ปิดแจ้งเตือนเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}