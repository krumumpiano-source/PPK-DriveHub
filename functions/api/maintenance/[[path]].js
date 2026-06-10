// Maintenance settings, schedules, profiles & alerts
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, checkPermission, extractParam
} from '../../_helpers.js';

// Resolve interval for a specific vehicle/item.
// Priority: vehicle override > brand+model > brand+* > default from maintenance_settings
async function resolveInterval(db, brand, model, itemKey, defaultKm, defaultMonths, carId = null) {
  if (carId) {
    const vehicle = await dbFirst(db,
      `SELECT interval_km, interval_months, notes FROM maintenance_vehicle_profiles WHERE car_id = ? AND item_key = ?`,
      [carId, itemKey]);
    if (vehicle) return { km: vehicle.interval_km, months: vehicle.interval_months, notes: vehicle.notes, source: 'vehicle' };
  }
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

// Batch-resolve intervals for ALL items at once (3 queries total instead of N*3)
async function batchResolveIntervals(db, brand, model, items, carId) {
  // 1) Batch-load vehicle overrides
  const vehicleOverrides = {};
  if (carId) {
    const vRows = await dbAll(db,
      `SELECT item_key, interval_km, interval_months, notes FROM maintenance_vehicle_profiles WHERE car_id = ?`,
      [carId]);
    for (const r of vRows) vehicleOverrides[r.item_key] = r;
  }
  // 2) Batch-load brand+model profiles
  const brandModelProfiles = {};
  if (brand && model && model !== '*') {
    const bRows = await dbAll(db,
      `SELECT item_key, interval_km, interval_months, notes FROM maintenance_profiles WHERE brand = ? AND model = ?`,
      [brand, model]);
    for (const r of bRows) brandModelProfiles[r.item_key] = r;
  }
  // 3) Batch-load brand wildcard profiles
  const brandWildcardProfiles = {};
  if (brand) {
    const wRows = await dbAll(db,
      `SELECT item_key, interval_km, interval_months, notes FROM maintenance_profiles WHERE brand = ? AND model = '*'`,
      [brand]);
    for (const r of wRows) brandWildcardProfiles[r.item_key] = r;
  }
  // Resolve each item from in-memory maps
  const results = {};
  for (const item of items) {
    const key = item.item_key;
    const vo = vehicleOverrides[key];
    if (vo) { results[key] = { km: vo.interval_km, months: vo.interval_months, notes: vo.notes, source: 'vehicle' }; continue; }
    const bm = brandModelProfiles[key];
    if (bm) { results[key] = { km: bm.interval_km, months: bm.interval_months, notes: bm.notes, source: `${brand} ${model}` }; continue; }
    const bw = brandWildcardProfiles[key];
    if (bw) { results[key] = { km: bw.interval_km, months: bw.interval_months, notes: bw.notes, source: brand }; continue; }
    results[key] = { km: item.interval_km, months: item.interval_months, notes: null, source: 'default' };
  }
  return { results, vehicleOverrides, brandModelProfiles, brandWildcardProfiles };
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

  // ========== Vehicle-specific Maintenance Profiles ==========

  // --- GET /api/maintenance/profiles/vehicle/:carId ---
  if (path.match(/^\/api\/maintenance\/profiles\/vehicle\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'maintenance', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = path.split('/').pop();
    const car = await dbFirst(env.DB,
      'SELECT id, license_plate, brand, model, fuel_type FROM cars WHERE id = ? AND status != \'inactive\'',
      [carId]);
    if (!car) return error('ไม่พบรถ', 404);

    const items = await dbAll(env.DB,
      'SELECT * FROM maintenance_settings WHERE enabled = 1 ORDER BY sort_order, item_key', []);
    const overrides = await dbAll(env.DB,
      'SELECT * FROM maintenance_vehicle_profiles WHERE car_id = ?', [carId]);
    const overrideMap = {};
    for (const row of overrides) overrideMap[row.item_key] = row;

    // Batch-load brand profiles (2 queries instead of N*3)
    const brandModelProfiles = {};
    if (car.brand && car.model && car.model !== '*') {
      const bRows = await dbAll(env.DB,
        `SELECT item_key, interval_km, interval_months, notes FROM maintenance_profiles WHERE brand = ? AND model = ?`,
        [car.brand, car.model]);
      for (const r of bRows) brandModelProfiles[r.item_key] = r;
    }
    const brandWildcardProfiles = {};
    if (car.brand) {
      const wRows = await dbAll(env.DB,
        `SELECT item_key, interval_km, interval_months, notes FROM maintenance_profiles WHERE brand = ? AND model = '*'`,
        [car.brand]);
      for (const r of wRows) brandWildcardProfiles[r.item_key] = r;
    }

    const result = [];
    for (const item of items) {
      if (item.fuel_type_filter && car.fuel_type !== item.fuel_type_filter) continue;
      const exactProfile = brandModelProfiles[item.item_key] || null;
      const brandProfile = exactProfile ? null : (brandWildcardProfiles[item.item_key] || null);
      // Resolve: vehicle override > brand+model > brand+* > default
      const vo = overrideMap[item.item_key];
      let resolved;
      if (vo) { resolved = { km: vo.interval_km, months: vo.interval_months, source: 'vehicle' }; }
      else if (exactProfile) { resolved = { km: exactProfile.interval_km, months: exactProfile.interval_months, source: `${car.brand} ${car.model}` }; }
      else if (brandProfile) { resolved = { km: brandProfile.interval_km, months: brandProfile.interval_months, source: car.brand }; }
      else { resolved = { km: item.interval_km, months: item.interval_months, source: 'default' }; }
      const override = overrideMap[item.item_key] || null;
      result.push({
        item_key: item.item_key,
        item_name: item.item_name,
        category: item.category,
        default_km: item.interval_km,
        default_months: item.interval_months,
        brand_profile_km: (exactProfile || brandProfile)?.interval_km ?? null,
        brand_profile_months: (exactProfile || brandProfile)?.interval_months ?? null,
        brand_profile_source: exactProfile ? `${car.brand} ${car.model || '*'}` : (brandProfile ? car.brand : 'default'),
        override_id: override?.id || null,
        override_km: override?.interval_km ?? null,
        override_months: override?.interval_months ?? null,
        override_notes: override?.notes || null,
        effective_km: resolved.km,
        effective_months: resolved.months,
        profile_source: resolved.source
      });
    }

    return success({ car, items: result });
  }

  // --- PUT /api/maintenance/profiles/vehicle/:carId/bulk ---
  if (path.match(/^\/api\/maintenance\/profiles\/vehicle\/[^/]+\/bulk$/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const parts = path.split('/');
    const carId = parts[5];
    const car = await dbFirst(env.DB, 'SELECT id FROM cars WHERE id = ? AND status != \'inactive\'', [carId]);
    if (!car) return error('ไม่พบรถ', 404);

    const body = await parseBody(request);
    if (!Array.isArray(body?.items)) return error('กรุณาส่ง items array');

    const ts = now();
    let updated = 0;
    for (const item of body.items) {
      if (!item?.item_key) continue;
      const km = item.interval_km === null ? null : (item.interval_km ?? null);
      const months = item.interval_months === null ? null : (item.interval_months ?? null);
      const hasOverride = km !== null || months !== null || (item.notes && String(item.notes).trim());
      if (hasOverride) {
        await dbRun(env.DB,
          `INSERT INTO maintenance_vehicle_profiles (id, car_id, item_key, interval_km, interval_months, notes, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(car_id, item_key) DO UPDATE SET
             interval_km = excluded.interval_km,
             interval_months = excluded.interval_months,
             notes = excluded.notes,
             updated_at = excluded.updated_at`,
          [generateUUID(), carId, item.item_key, km, months, item.notes || null, ts]);
      } else {
        await dbRun(env.DB,
          'DELETE FROM maintenance_vehicle_profiles WHERE car_id = ? AND item_key = ?',
          [carId, item.item_key]);
      }
      updated++;
    }

    return success({ message: `บันทึกการตั้งค่ารายคัน ${updated} รายการเรียบร้อย` });
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
    if (!checkPermission(user, 'maintenance', 'view') && !checkPermission(user, 'repair', 'view')) return error('ไม่มีสิทธิ์', 403);
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
    // Batch-resolve all intervals (3 queries instead of N*3)
    const { results: resolvedMap } = await batchResolveIntervals(env.DB, car?.brand, car?.model, allItems, carId);
    // Build lookup maps
    const result = [];
    const recordMap = {};
    for (const r of records) { recordMap[r.item_key] = r; }
    // Build full list: all applicable items (with or without records)
    for (const item of allItems) {
      // Filter by fuel type
      if (item.fuel_type_filter && car && car.fuel_type !== item.fuel_type_filter) continue;
      const resolved = resolvedMap[item.item_key] || { km: item.interval_km, months: item.interval_months, notes: null, source: 'default' };
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
        override_km: resolved.source === 'vehicle' ? resolved.km : null,
        override_months: resolved.source === 'vehicle' ? resolved.months : null,
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