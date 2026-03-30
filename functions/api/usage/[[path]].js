// Usage records — event-based (departure/return/refuel/inspection) + Auto-Heal
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, notifyAllAdmins
} from '../../_helpers.js';

// ============================================================
// AUTO-HEAL: Detects and auto-creates missing usage records
// ============================================================
async function autoHeal(db, newRecord) {
  const healed = [];
  const ts = now();

  // Get gap_minimum_km from system_settings
  const gapSetting = await dbFirst(db,
    "SELECT value FROM system_settings WHERE key = 'gap_minimum_km'", []);
  const gapMinKm = parseInt(gapSetting?.value || '50');

  if (newRecord.record_type === 'departure') {
    // Check: was the last record for this car also a departure? (missed return)
    const lastRecord = await dbFirst(db,
      `SELECT * FROM usage_records
       WHERE car_id = ? AND record_type IN ('departure','return') AND id != ?
       ORDER BY datetime DESC LIMIT 1`,
      [newRecord.car_id, newRecord.id]
    );

    if (lastRecord && lastRecord.record_type === 'departure') {
      // Previous departure has no return → auto-create return
      const autoReturnId = generateUUID();
      const autoMileage = newRecord.mileage || null; // use new departure mileage as the return mileage
      await dbRun(db,
        `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, created_at)
         VALUES (?, ?, ?, 'return', ?, ?, '', '', ?, 'auto_return', ?, ?)`,
        [autoReturnId, lastRecord.car_id, lastRecord.driver_id,
         newRecord.datetime, autoMileage,
         lastRecord.queue_id,
         'ระบบสร้างอัตโนมัติ — ไม่พบบันทึกกลับจาก departure ' + lastRecord.datetime.substring(0, 10),
         ts]
      );
      healed.push({ type: 'auto_return', id: autoReturnId, for_departure: lastRecord.id });

      // Detect gap
      if (autoMileage && lastRecord.mileage) {
        const gap = autoMileage - lastRecord.mileage;
        if (gap > gapMinKm) {
          const gapId = generateUUID();
          await dbRun(db,
            `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, created_at)
             VALUES (?, ?, ?, 'departure', ?, NULL, '', '', NULL, 'gap_record', ?, ?)`,
            [gapId, lastRecord.car_id, lastRecord.driver_id,
             lastRecord.datetime,
             'ช่องว่างข้อมูล ' + gap + ' กม. ระหว่าง ' + lastRecord.datetime.substring(0, 10) + ' ถึง ' + newRecord.datetime.substring(0, 10),
             ts]
          );
          healed.push({ type: 'gap_record', id: gapId, gap_km: gap });
        }
      }
    }
  } else if (newRecord.record_type === 'return') {
    // Check: was the last record for this car also a return? (missed departure)
    const lastRecord = await dbFirst(db,
      `SELECT * FROM usage_records
       WHERE car_id = ? AND record_type IN ('departure','return') AND id != ?
       ORDER BY datetime DESC LIMIT 1`,
      [newRecord.car_id, newRecord.id]
    );

    if (lastRecord && lastRecord.record_type === 'return') {
      // Double return — no matching departure → auto-create departure
      const autoDepId = generateUUID();
      const autoMileage = lastRecord.mileage || null;
      await dbRun(db,
        `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, created_at)
         VALUES (?, ?, ?, 'departure', ?, ?, '', '', ?, 'auto_departure', ?, ?)`,
        [autoDepId, newRecord.car_id, newRecord.driver_id,
         lastRecord.datetime, autoMileage,
         newRecord.queue_id,
         'ระบบสร้างอัตโนมัติ — ไม่พบบันทึกออกก่อน return ' + newRecord.datetime.substring(0, 10),
         ts]
      );
      healed.push({ type: 'auto_departure', id: autoDepId, for_return: newRecord.id });

      // Gap detection
      if (newRecord.mileage && lastRecord.mileage) {
        const gap = newRecord.mileage - lastRecord.mileage;
        if (gap > gapMinKm) {
          const gapId = generateUUID();
          await dbRun(db,
            `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, created_at)
             VALUES (?, ?, ?, 'departure', ?, NULL, '', '', NULL, 'gap_record', ?, ?)`,
            [gapId, newRecord.car_id, newRecord.driver_id,
             lastRecord.datetime,
             'ช่องว่างข้อมูล ' + gap + ' กม. ระหว่าง ' + lastRecord.datetime.substring(0, 10) + ' ถึง ' + newRecord.datetime.substring(0, 10),
             ts]
          );
          healed.push({ type: 'gap_record', id: gapId, gap_km: gap });
        }
      }
    }
    // Check for double-miss: last record is departure but from a DIFFERENT trip (no return + no departure)
    // This case is handled by the departure check above — consecutive departures catch the previous miss
  }

  // Notify admins if any auto-heal happened
  if (healed.length > 0) {
    const car = await dbFirst(db, 'SELECT license_plate FROM cars WHERE id = ?', [newRecord.car_id]);
    const types = healed.map(h => h.type).join(', ');
    await notifyAllAdmins(db, 'data_quality',
      'Auto-Heal: ' + (car?.license_plate || newRecord.car_id),
      'ระบบสร้างข้อมูลอัตโนมัติ (' + types + ') สำหรับรถ ' + (car?.license_plate || '') + ' — กรุณาตรวจสอบในบันทึกการใช้งาน'
    );
  }

  return healed;
}

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  // PUBLIC QR usage record
  if (path === '/api/usage/record' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.car_id || !body?.record_type) return error('กรุณาระบุ car_id และ record_type');
    const validTypes = ['departure', 'return', 'refuel', 'inspection'];
    if (!validTypes.includes(body.record_type)) return error('record_type ต้องเป็น: ' + validTypes.join(', '));

    // Validate mileage is positive
    if (body.mileage !== undefined && body.mileage !== null && body.mileage < 0) {
      return error('เลขไมล์ต้องเป็นค่าบวก');
    }

    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, requester_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.record_type,
       body.datetime || ts, body.mileage || null,
       body.location || '', body.notes || '', body.queue_id || null,
       body.requester_name || null, ts]
    );
    // Update car mileage if provided
    if (body.mileage && body.mileage > 0) {
      await dbRun(env.DB,
        'UPDATE cars SET current_mileage = ? WHERE id = ? AND (current_mileage IS NULL OR current_mileage < ?)',
        [body.mileage, body.car_id, body.mileage]
      );
    }

    // Auto-heal: detect and fix missing records
    const healed = await autoHeal(env.DB, { id, car_id: body.car_id, driver_id: body.driver_id || null, record_type: body.record_type, datetime: body.datetime || ts, mileage: body.mileage || null, queue_id: body.queue_id || null });

    return success({ id, message: 'บันทึกการใช้งานเรียบร้อย', auto_healed: healed }, 201);
  }

  if (!user) return error('Unauthorized', 401);

  // --- GET /api/usage ---
  if (path === '/api/usage' && method === 'GET') {
    try { requirePermission(user, 'usage', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const recordType = url.searchParams.get('record_type');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const queueId = url.searchParams.get('queue_id');
    const dataQuality = url.searchParams.get('data_quality');
    const where = [];
    const params = [];
    if (carId) { where.push('ur.car_id = ?'); params.push(carId); }
    if (recordType) { where.push('ur.record_type = ?'); params.push(recordType); }
    if (dateFrom) { where.push('ur.datetime >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('ur.datetime <= ?'); params.push(dateTo + ' 23:59:59'); }
    if (queueId) { where.push('ur.queue_id = ?'); params.push(queueId); }
    if (dataQuality) { where.push('ur.data_quality = ?'); params.push(dataQuality); }
    const rows = await dbAll(env.DB,
      `SELECT ur.*, c.license_plate, c.brand, d.name AS driver_name
       FROM usage_records ur
       LEFT JOIN cars c ON ur.car_id = c.id
       LEFT JOIN drivers d ON ur.driver_id = d.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY ur.datetime DESC LIMIT 500`,
      params
    );
    return success(rows);
  }

  // --- GET /api/usage/:id ---
  if (path.match(/^\/api\/usage\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'usage', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, 'usage');
    const row = await dbFirst(env.DB,
      `SELECT ur.*, c.license_plate, c.brand, d.name AS driver_name
       FROM usage_records ur
       LEFT JOIN cars c ON ur.car_id = c.id
       LEFT JOIN drivers d ON ur.driver_id = d.id
       WHERE ur.id = ?`, [id]);
    if (!row) return error('ไม่พบข้อมูล', 404);
    return success(row);
  }

  // --- POST /api/usage ---
  if (path === '/api/usage' && method === 'POST') {
    try { requirePermission(user, 'usage', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.record_type) return error('กรุณาระบุยานพาหนะและประเภทการบันทึก');

    if (body.mileage !== undefined && body.mileage !== null && body.mileage < 0) {
      return error('เลขไมล์ต้องเป็นค่าบวก');
    }

    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, requester_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.record_type,
       body.datetime || ts, body.mileage || null,
       body.location || '', body.notes || '', body.queue_id || null,
       body.requester_name || null, ts]
    );
    if (body.mileage && body.mileage > 0) {
      await dbRun(env.DB,
        'UPDATE cars SET current_mileage = ? WHERE id = ? AND (current_mileage IS NULL OR current_mileage < ?)',
        [body.mileage, body.car_id, body.mileage]
      );
    }

    const healed = await autoHeal(env.DB, { id, car_id: body.car_id, driver_id: body.driver_id || null, record_type: body.record_type, datetime: body.datetime || ts, mileage: body.mileage || null, queue_id: body.queue_id || null });

    return success({ id, message: 'บันทึกการใช้งานเรียบร้อย', auto_healed: healed }, 201);
  }

  // --- PUT /api/usage/:id ---
  if (path.match(/^\/api\/usage\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'usage', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, 'usage');
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['car_id','driver_id','record_type','datetime','mileage','location','notes','queue_id'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(id);
    await dbRun(env.DB, `UPDATE usage_records SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลการใช้งานเรียบร้อย' });
  }

  // --- DELETE /api/usage/:id ---
  if (path.match(/^\/api\/usage\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'usage', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, 'usage');
    await dbRun(env.DB, 'DELETE FROM usage_records WHERE id = ?', [id]);
    return success({ message: 'ลบข้อมูลการใช้งานเรียบร้อย' });
  }

  // --- GET /api/usage/summary ---
  if (path === '/api/usage/summary' && method === 'GET') {
    try { requirePermission(user, 'usage', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const month = url.searchParams.get('month');
    const where = [];
    const params = [];
    if (carId) { where.push('car_id = ?'); params.push(carId); }
    if (month) { where.push("datetime LIKE ?"); params.push(month + '%'); }
    const row = await dbFirst(env.DB,
      `SELECT COUNT(*) AS total_records,
       SUM(CASE WHEN record_type = 'departure' THEN 1 ELSE 0 END) AS departures,
       SUM(CASE WHEN record_type = 'return' THEN 1 ELSE 0 END) AS returns,
       SUM(CASE WHEN record_type = 'refuel' THEN 1 ELSE 0 END) AS refuels,
       SUM(CASE WHEN record_type = 'inspection' THEN 1 ELSE 0 END) AS inspections
       FROM usage_records ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
      params
    );
    return success(row);
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}