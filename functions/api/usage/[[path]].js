// Usage records — event-based (departure/return/refuel/inspection) + Auto-Heal
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, notifyAllAdmins
} from '../../_helpers.js';
import { autoHeal } from '../../_lib/auto-heal.js';

// Penalty points deducted per auto-heal event (auto_departure or auto_return)
const SCORE_DEDUCT_AUTO = 1;

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

    // ต้องมี driver_id หรือ driver_name_manual อย่างน้อยหนึ่งอย่าง
    if (!body.driver_id && !body.driver_name_manual) {
      return error('กรุณาระบุ driver_id หรือ driver_name_manual');
    }

    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, requester_name, record_source, purpose, destination, driver_name_manual, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, 'qr_manual', ?, ?, ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.record_type,
       body.datetime || ts, body.mileage || null,
       body.location || '', body.notes || '', body.queue_id || null,
       body.requester_name || null,
       body.purpose || null, body.destination || null, body.driver_name_manual || null, ts]
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

  // PUBLIC — ดึงสถานะล่าสุดของรถ (ใช้โดยหน้า QR ไม่ต้อง login)
  if (path === '/api/usage/latest-status' && method === 'GET') {
    const car_id = url.searchParams.get('car_id');
    if (!car_id) return error('กรุณาระบุ car_id');
    const lastRecord = await dbFirst(env.DB,
      `SELECT record_type, datetime, mileage FROM usage_records
       WHERE car_id = ? AND record_type IN ('departure', 'return') AND data_quality != 'gap_record'
       ORDER BY datetime DESC LIMIT 1`,
      [car_id]
    );
    if (!lastRecord) return success({ status: 'unknown', mileage: null, datetime: null });
    return success({
      status: lastRecord.record_type === 'departure' ? 'out' : 'in',
      last_record_type: lastRecord.record_type,
      mileage: lastRecord.mileage,
      datetime: lastRecord.datetime
    });
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
      `SELECT ur.*, c.license_plate, c.brand, COALESCE(d.name, ur.driver_name_manual) AS driver_name
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
      `SELECT ur.*, c.license_plate, c.brand, COALESCE(d.name, ur.driver_name_manual) AS driver_name
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
      `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, requester_name, record_source, purpose, destination, driver_name_manual, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.record_type,
       body.datetime || ts, body.mileage || null,
       body.location || '', body.notes || '', body.queue_id || null,
       body.requester_name || null,
       body.record_source || 'qr_logged_in',
       body.purpose || null, body.destination || null, body.driver_name_manual || null, ts]
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

    // Fetch old record for audit trail
    const oldRecord = await dbFirst(env.DB, 'SELECT * FROM usage_records WHERE id = ?', [id]);
    if (!oldRecord) return error('ไม่พบข้อมูลบันทึกการใช้งาน', 404);

    const sets = [];
    const params = [];
    const fields = ['car_id','driver_id','record_type','datetime','mileage','location','notes','queue_id'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.correction_note !== undefined) { sets.push('correction_note = ?'); params.push(body.correction_note); }
    sets.push('updated_by = ?'); params.push(user.id || user.user_id || '');
    sets.push('updated_at = ?'); params.push(now());
    if (sets.length <= 2) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(id);
    await dbRun(env.DB, `UPDATE usage_records SET ${sets.join(', ')} WHERE id = ?`, params);

    // Audit log — only if mileage was changed
    if (body.mileage !== undefined && body.mileage !== oldRecord.mileage) {
      const auditId = generateUUID();
      await dbRun(env.DB,
        `INSERT INTO audit_log (id, user_id, username, action, module, entity_id, details, created_at)
         VALUES (?, ?, ?, 'UPDATE', 'usage_records', ?, ?, ?)`,
        [auditId, user.id || '', user.username || '',
         id,
         JSON.stringify({
           field: 'mileage',
           old_value: oldRecord.mileage,
           new_value: body.mileage,
           correction_note: body.correction_note || '',
           car_id: oldRecord.car_id,
           record_type: oldRecord.record_type,
           datetime: oldRecord.datetime
         }),
         now()]
      );
    }

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