// Maintenance settings, schedules, profiles & alerts
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam
} from '../../_helpers.js';

// Resolve interval for a specific (brand, model, item_key)
// Priority: brand+model > brand+* > default from maintenance_settings
async function resolveInterval(db, brand, model, itemKey, defaultKm, defaultMonths) {
  // Try exact brand+model match
  if (brand && model && model !== '*') {
    const exact = await dbFirst(db,
      `SELECT interval_km, interval_months, notes FROM maintenance_profiles WHERE brand = ? AND model = ? AND item_key = ?`,
      [brand, model, itemKey]);
    if (exact) return { km: exact.interval_km, months: exact.interval_months, notes: exact.notes, source: `${brand} ${model}` };
  }
  // Try brand wildcard
  if (brand) {
    const brd = await dbFirst(db,
      `SELECT interval_km, interval_months, notes FROM maintenance_profiles WHERE brand = ? AND model = '*' AND item_key = ?`,
      [brand, itemKey]);
    if (brd) return { km: brd.interval_km, months: brd.interval_months, notes: brd.notes, source: brand };
  }
  return { km: defaultKm, months: defaultMonths, notes: null, source: 'default' };
}

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
    const rows = await dbAll(env.DB, 'SELECT * FROM maintenance_settings ORDER BY sort_order, item_key', []);
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
      `INSERT INTO maintenance_settings (id, item_key, item_name, interval_km, interval_months, enabled, category, fuel_type_filter, vehicle_class, sort_order, dlt_required, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.item_key, body.item_name,
       body.interval_km || null, body.interval_months || null,
       body.enabled ?? 1, body.category || 'general',
       body.fuel_type_filter || null, body.vehicle_class || null,
       body.sort_order || 0, body.dlt_required || 0,
       user.id, ts]
    );
    return success({ id, message: 'เพิ่มรายการบำรุงรักษาเรียบร้อย' }, 201);
  }

  // --- PUT /api/maintenance/settings/bulk --- (batch update from admin page)
  // MUST be before the :id route since regex would match 'bulk'
  if (path === '/api/maintenance/settings/bulk' && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!Array.isArray(body?.items)) return error('กรุณาส่ง items array');
    const ts = now();
    let updated = 0;
    for (const item of body.items) {
      if (!item.id) continue;
      await dbRun(env.DB,
        `UPDATE maintenance_settings SET interval_km = ?, interval_months = ?, enabled = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
        [item.interval_km ?? null, item.interval_months ?? null, item.enabled ?? 1, user.id, ts, item.id]);
      updated++;
    }
    return success({ message: `อัปเดต ${updated} รายการเรียบร้อย` });
  }

  // --- PUT /api/maintenance/settings/:id ---
  if (path.match(/^\/api\/maintenance\/settings\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['item_key','item_name','interval_km','interval_months','enabled','category','fuel_type_filter','vehicle_class','sort_order','dlt_required'];
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

  // ========== Maintenance Profiles (brand-specific) ==========

  // --- GET /api/maintenance/profiles ---
  if (path === '/api/maintenance/profiles' && method === 'GET') {
    try { requirePermission(user, 'maintenance', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const brand = url.searchParams.get('brand');
    let sql = 'SELECT mp.*, ms.item_name, ms.category FROM maintenance_profiles mp LEFT JOIN maintenance_settings ms ON mp.item_key = ms.item_key';
    const params = [];
    if (brand) { sql += ' WHERE mp.brand = ?'; params.push(brand); }
    sql += ' ORDER BY mp.brand, mp.model, ms.sort_order, mp.item_key';
    const rows = await dbAll(env.DB, sql, params);
    return success(rows);
  }

  // --- GET /api/maintenance/profiles/brands ---
  if (path === '/api/maintenance/profiles/brands' && method === 'GET') {
    try { requirePermission(user, 'maintenance', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const rows = await dbAll(env.DB,
      `SELECT brand, model, COUNT(*) as item_count FROM maintenance_profiles GROUP BY brand, model ORDER BY brand, model`, []);
    return success(rows);
  }

  // --- POST /api/maintenance/profiles ---
  if (path === '/api/maintenance/profiles' && method === 'POST') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.brand || !body?.item_key) return error('กรุณาระบุ brand และ item_key');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO maintenance_profiles (id, brand, model, item_key, interval_km, interval_months, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(brand, model, item_key) DO UPDATE SET
         interval_km = excluded.interval_km, interval_months = excluded.interval_months,
         notes = excluded.notes, updated_at = excluded.updated_at`,
      [id, body.brand, body.model || '*', body.item_key,
       body.interval_km || null, body.interval_months || null,
       body.notes || null, now()]);
    return success({ id, message: 'บันทึก profile เรียบร้อย' }, 201);
  }

  // --- PUT /api/maintenance/profiles/:id ---
  if (path.match(/^\/api\/maintenance\/profiles\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    for (const f of ['interval_km','interval_months','notes']) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE maintenance_profiles SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดต profile เรียบร้อย' });
  }

  // --- DELETE /api/maintenance/profiles/:id ---
  if (path.match(/^\/api\/maintenance\/profiles\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    await dbRun(env.DB, 'DELETE FROM maintenance_profiles WHERE id = ?', [id]);
    return success({ message: 'ลบ profile เรียบร้อย' });
  }

  // ========== Vehicle Maintenance Records ==========

  // --- GET /api/maintenance/vehicle/:carId ---
  if (path.match(/^\/api\/maintenance\/vehicle\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'maintenance', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = path.split('/').pop();
    // Get car info for profile resolution
    const car = await dbFirst(env.DB, 'SELECT brand, model, fuel_type FROM cars WHERE id = ?', [carId]);
    // Get all enabled maintenance items
    const allItems = await dbAll(env.DB, 'SELECT * FROM maintenance_settings WHERE enabled = 1 ORDER BY sort_order, item_key', []);
    // Get existing records
    const records = await dbAll(env.DB,
      `SELECT vm.*, ms.item_name, ms.interval_km AS default_km, ms.interval_months AS default_months,
        ms.category, ms.fuel_type_filter, ms.vehicle_class, ms.dlt_required,
        c.license_plate, c.current_mileage
       FROM vehicle_maintenance vm
       LEFT JOIN maintenance_settings ms ON vm.item_key = ms.item_key
       LEFT JOIN cars c ON vm.car_id = c.id
       WHERE vm.car_id = ?
       ORDER BY ms.sort_order, vm.item_key`, [carId]);
    // Resolve profiles for each record
    const result = [];
    const recordMap = {};
    for (const r of records) { recordMap[r.item_key] = r; }
    // Build full list: all applicable items (with or without records)
    for (const item of allItems) {
      // Filter by fuel type
      if (item.fuel_type_filter && car && car.fuel_type !== item.fuel_type_filter) continue;
      const resolved = await resolveInterval(env.DB, car?.brand, car?.model, item.item_key, item.interval_km, item.interval_months);
      const rec = recordMap[item.item_key];
      result.push({
        id: rec?.id || null,
        car_id: carId,
        item_key: item.item_key,
        item_name: item.item_name,
        category: item.category,
        dlt_required: item.dlt_required,
        last_km: rec?.last_km || null,
        last_date: rec?.last_date || null,
        next_km: rec?.next_km || null,
        next_date: rec?.next_date || null,
        interval_km: resolved.km,
        interval_months: resolved.months,
        profile_source: resolved.source,
        profile_notes: resolved.notes,
        license_plate: rec?.license_plate || null,
        current_mileage: rec?.current_mileage || null
      });
    }
    return success(result);
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
    const rows = await dbAll(env.DB,
      `SELECT c.id, c.license_plate, c.brand, c.model, c.fuel_type, c.current_mileage,
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