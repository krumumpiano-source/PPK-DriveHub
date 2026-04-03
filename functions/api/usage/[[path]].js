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
  if (path.match(/^\/api\/usage\/[^/]+$/) && !path.endsWith('/summary') && !path.endsWith('/batch-heal') && method === 'GET') {
    try { requirePermission(user, 'usage', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/usage/');
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
    const id = extractParam(path, '/api/usage/');
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
    const id = extractParam(path, '/api/usage/');
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

  // --- POST /api/usage/batch-heal ---
  // Scans ALL records per car chronologically, creates missing departure/return
  if (path === '/api/usage/batch-heal' && method === 'POST') {
    try { requirePermission(user, 'admin', 'manage'); } catch { return error('ต้องเป็นผู้ดูแลระบบ', 403); }

    const gapSetting = await dbFirst(env.DB,
      "SELECT value FROM system_settings WHERE key = 'gap_minimum_km'", []);
    const gapMinKm = parseInt(gapSetting?.value || '50');
    const ts = now();

    // Get all cars
    const cars = await dbAll(env.DB, 'SELECT id, license_plate FROM cars', []);
    const summary = { cars_scanned: 0, auto_returns_created: 0, auto_departures_created: 0, gaps_detected: 0, departure_only_resolved: 0, total_healed: 0 };
    const details = [];

    for (const car of cars) {
      summary.cars_scanned++;

      // Get all departure/return records for this car, ordered chronologically
      const records = await dbAll(env.DB,
        `SELECT id, car_id, driver_id, record_type, datetime, mileage, queue_id, data_quality
         FROM usage_records
         WHERE car_id = ? AND record_type IN ('departure','return')
         ORDER BY datetime ASC, record_type ASC`,
        [car.id]
      );

      if (records.length < 2) {
        // Single record — check if departure_only
        if (records.length === 1 && records[0].record_type === 'departure' && records[0].data_quality === 'departure_only') {
          // Create auto_return with same mileage
          const autoId = generateUUID();
          await dbRun(env.DB,
            `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, is_historical, created_at)
             VALUES (?, ?, ?, 'return', ?, ?, '', '', ?, 'auto_return', ?, 1, ?)`,
            [autoId, car.id, records[0].driver_id,
             records[0].datetime.replace(/\d{2}:\d{2}/, '17:00'),
             records[0].mileage,
             records[0].queue_id,
             'Batch heal: สร้างอัตโนมัติ — ออกเดินทางแต่ไม่มีบันทึกกลับ ' + records[0].datetime.substring(0, 10),
             ts]
          );
          await dbRun(env.DB, "UPDATE usage_records SET data_quality = 'normal' WHERE id = ?", [records[0].id]);
          summary.auto_returns_created++;
          summary.departure_only_resolved++;
          summary.total_healed++;
          details.push({ car: car.license_plate, type: 'auto_return', date: records[0].datetime.substring(0, 10) });
        }
        continue;
      }

      // Walk through records sequentially
      for (let i = 0; i < records.length - 1; i++) {
        const curr = records[i];
        const next = records[i + 1];

        // Case 1: Two consecutive departures → missing return between them
        if (curr.record_type === 'departure' && next.record_type === 'departure') {
          // Check if auto_return already exists between them
          const existing = await dbFirst(env.DB,
            `SELECT id FROM usage_records
             WHERE car_id = ? AND record_type = 'return' AND data_quality IN ('auto_return','normal')
             AND datetime >= ? AND datetime <= ?`,
            [car.id, curr.datetime, next.datetime]
          );
          if (!existing) {
            const autoId = generateUUID();
            const autoMileage = next.mileage || curr.mileage || null;
            await dbRun(env.DB,
              `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, is_historical, created_at)
               VALUES (?, ?, ?, 'return', ?, ?, '', '', ?, 'auto_return', ?, 1, ?)`,
              [autoId, car.id, curr.driver_id,
               next.datetime,
               autoMileage,
               curr.queue_id,
               'Batch heal: ออก ' + curr.datetime.substring(0, 10) + ' แต่ไม่มีบันทึกกลับ → สร้างอัตโนมัติ',
               ts]
            );
            // If it was marked departure_only, change to normal
            if (curr.data_quality === 'departure_only') {
              await dbRun(env.DB, "UPDATE usage_records SET data_quality = 'normal' WHERE id = ?", [curr.id]);
              summary.departure_only_resolved++;
            }
            summary.auto_returns_created++;
            summary.total_healed++;
            details.push({ car: car.license_plate, type: 'auto_return', date: curr.datetime.substring(0, 10) });

            // Gap detection
            if (autoMileage && curr.mileage && (autoMileage - curr.mileage) > gapMinKm) {
              const gap = autoMileage - curr.mileage;
              const existingGap = await dbFirst(env.DB,
                `SELECT id FROM usage_records
                 WHERE car_id = ? AND data_quality = 'gap_record'
                 AND datetime >= ? AND datetime <= ?`,
                [car.id, curr.datetime, next.datetime]
              );
              if (!existingGap) {
                const gapId = generateUUID();
                await dbRun(env.DB,
                  `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, data_quality, auto_notes, is_historical, created_at)
                   VALUES (?, ?, ?, 'departure', ?, NULL, '', '', 'gap_record', ?, 1, ?)`,
                  [gapId, car.id, curr.driver_id, curr.datetime,
                   'Batch heal: ช่องว่าง ' + gap + ' กม. (' + curr.datetime.substring(0, 10) + ' → ' + next.datetime.substring(0, 10) + ')',
                   ts]
                );
                summary.gaps_detected++;
                summary.total_healed++;
              }
            }
          }
        }

        // Case 2: Two consecutive returns → missing departure between them
        if (curr.record_type === 'return' && next.record_type === 'return') {
          const existing = await dbFirst(env.DB,
            `SELECT id FROM usage_records
             WHERE car_id = ? AND record_type = 'departure' AND data_quality IN ('auto_departure','normal')
             AND datetime >= ? AND datetime <= ?`,
            [car.id, curr.datetime, next.datetime]
          );
          if (!existing) {
            const autoId = generateUUID();
            const autoMileage = curr.mileage || null;
            await dbRun(env.DB,
              `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, is_historical, created_at)
               VALUES (?, ?, ?, 'departure', ?, ?, '', '', ?, 'auto_departure', ?, 1, ?)`,
              [autoId, car.id, next.driver_id,
               curr.datetime,
               autoMileage,
               next.queue_id,
               'Batch heal: กลับ ' + next.datetime.substring(0, 10) + ' แต่ไม่มีบันทึกออก → สร้างอัตโนมัติ',
               ts]
            );
            summary.auto_departures_created++;
            summary.total_healed++;
            details.push({ car: car.license_plate, type: 'auto_departure', date: next.datetime.substring(0, 10) });
          }
        }
      }

      // Handle the last record — if it's a departure_only
      const lastRec = records[records.length - 1];
      if (lastRec.record_type === 'departure' && lastRec.data_quality === 'departure_only') {
        const existingReturn = await dbFirst(env.DB,
          `SELECT id FROM usage_records
           WHERE car_id = ? AND record_type = 'return'
           AND datetime >= ? AND data_quality IN ('auto_return','normal')`,
          [car.id, lastRec.datetime]
        );
        if (!existingReturn) {
          const autoId = generateUUID();
          await dbRun(env.DB,
            `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, is_historical, created_at)
             VALUES (?, ?, ?, 'return', ?, ?, '', '', ?, 'auto_return', ?, 1, ?)`,
            [autoId, car.id, lastRec.driver_id,
             lastRec.datetime.replace(/\d{2}:\d{2}/, '17:00'),
             lastRec.mileage,
             lastRec.queue_id,
             'Batch heal: ออก ' + lastRec.datetime.substring(0, 10) + ' แต่ไม่มีบันทึกกลับ → สร้างอัตโนมัติ',
             ts]
          );
          await dbRun(env.DB, "UPDATE usage_records SET data_quality = 'normal' WHERE id = ?", [lastRec.id]);
          summary.auto_returns_created++;
          summary.departure_only_resolved++;
          summary.total_healed++;
          details.push({ car: car.license_plate, type: 'auto_return (last)', date: lastRec.datetime.substring(0, 10) });
        }
      }
    }

    // Notify admins
    if (summary.total_healed > 0) {
      await notifyAllAdmins(env.DB, 'data_quality',
        'Batch Auto-Heal เสร็จสิ้น',
        'สแกน ' + summary.cars_scanned + ' คัน — สร้างอัตโนมัติ: กลับ ' + summary.auto_returns_created + ' | ออก ' + summary.auto_departures_created + ' | ช่องว่าง ' + summary.gaps_detected + ' | แก้ departure_only ' + summary.departure_only_resolved
      );
    }

    return success({ summary, details: details.slice(0, 100) });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}