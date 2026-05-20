// Usage records — event-based (departure/return/refuel/inspection) + Auto-Heal
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, notifyAllAdmins, uploadToR2
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

  // PUBLIC — ดึงรายชื่อบุคลากรสำหรับ autocomplete ใน QR form
  if (path === '/api/usage/staff-names' && method === 'GET') {
    const row = await dbFirst(env.DB,
      "SELECT value FROM system_settings WHERE key = 'staff_names_list'", []);
    let names = [];
    if (row?.value) {
      try { names = JSON.parse(row.value); } catch { names = []; }
    }
    return success(names);
  }

  // PUBLIC — OCR อ่านเลขไมล์จากภาพมิเตอร์ (ใช้โดย QR form ไม่ต้อง login)
  if (path === '/api/usage/ocr-odometer' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.base64 || !body?.mime) return error('กรุณาส่ง base64 และ mime');
    const geminiKey = env.GEMINI_API_KEY;
    if (!geminiKey) return error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY', 500);

    const prompt = `อ่านตัวเลขระยะทางบนมิเตอร์รถยนต์ ไม่ว่าดิจิตอลหรือตัวเลขหมุนกลไก ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น: {"mileage": <ตัวเลขเต็ม ไม่มีจุลภาค>, "confidence": "high" หรือ "medium" หรือ "low" หรือ "unreadable"}`;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    const payload = {
      contents: [{ parts: [
        { text: prompt },
        { inline_data: { mime_type: body.mime, data: body.base64 } }
      ]}],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
    };
    let geminiResp;
    try {
      geminiResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      return error(`ไม่สามารถเชื่อมต่อ Gemini API ได้: ${e.message}`, 502);
    }
    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      return error(`Gemini API error ${geminiResp.status}: ${errText}`, 502);
    }
    const geminiData = await geminiResp.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let extracted = {};
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || rawText.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawText;
      extracted = JSON.parse(jsonStr.trim());
    } catch {
      return error('ไม่สามารถอ่านเลขไมล์จากภาพได้', 422);
    }
    return success({ mileage: extracted.mileage || null, confidence: extracted.confidence || 'low' });
  }

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

    // Upload odometer image to R2 if provided
    let odometerImagePath = null;
    if (body.odometer_image_base64 && body.odometer_image_mime) {
      odometerImagePath = await uploadToR2(
        env,
        body.odometer_image_base64,
        body.odometer_image_name || 'odometer.jpg',
        'ODOMETER',
        body.odometer_image_mime
      );
    }

    await dbRun(env.DB,
      `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, requester_name, record_source, purpose, destination, driver_name_manual, passengers, odometer_image, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, 'qr_manual', ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.record_type,
       body.datetime || ts, body.mileage || null,
       body.location || '', body.notes || '', body.queue_id || null,
       body.requester_name || null,
       body.purpose || null, body.destination || null, body.driver_name_manual || null,
       body.passengers || null, odometerImagePath, ts]
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

    // ── helper: resolve driver_id จาก body หรือ driver_name_manual ──────────
    async function resolveDriverId(driverId, driverNameManual) {
      if (driverId) return driverId;
      if (!driverNameManual) return null;
      const row = await dbFirst(env.DB,
        `SELECT id FROM drivers WHERE name = ? AND status = 'active' LIMIT 1`,
        [driverNameManual]);
      return row ? row.id : null;
    }

    // ── helper: สร้าง queue อัตโนมัติ ────────────────────────────────────────
    async function autoCreateQueue(queueId, qDate, qTimeStart, qTimeEnd, qStatus, driverId, mission, destination, note) {
      await dbRun(env.DB,
        `INSERT INTO queue (id, date, time_start, time_end, car_id, driver_id,
           mission, destination, status, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [queueId, qDate, qTimeStart, qTimeEnd, body.car_id, driverId,
         mission, destination, qStatus, note, ts, ts]
      );
    }

    // Auto-complete queue เมื่อสแกนกลับ
    let queueCompleted = false;
    let autoCreatedQueueId = null;

    if (body.record_type === 'return') {
      // หา queue ที่ผูกอยู่: ถ้ามี queue_id ตรงๆ ใช้เลย, ถ้าไม่มีให้ค้นจาก car_id ที่ยังไม่ปิด
      let targetQueueId = body.queue_id || null;
      if (!targetQueueId) {
        const openQ = await dbFirst(env.DB,
          `SELECT id FROM queue WHERE car_id = ? AND status IN ('ongoing','scheduled')
           ORDER BY date DESC, time_start DESC LIMIT 1`,
          [body.car_id]
        );
        if (openQ) targetQueueId = openQ.id;
      }
      if (targetQueueId) {
        // อัปเดต time_end ด้วยเวลาจริงที่กลับ
        const retTime = (body.datetime || ts).length >= 16 ? (body.datetime || ts).substr(11, 5) : '00:00';
        await dbRun(env.DB,
          `UPDATE queue SET status = 'completed', time_end = ?, updated_at = ?
           WHERE id = ? AND status IN ('ongoing','scheduled')`,
          [retTime, ts, targetQueueId]
        );
        // ผูก return record กับ queue
        await dbRun(env.DB, 'UPDATE usage_records SET queue_id = ? WHERE id = ?', [targetQueueId, id]);
        queueCompleted = true;
      } else {
        // ไม่มี open queue — หา departure record ล่าสุดของรถที่ยังไม่มี return
        const depRecord = await dbFirst(env.DB,
          `SELECT ur.id, ur.driver_id, ur.driver_name_manual, ur.datetime,
                  ur.destination, ur.purpose, ur.queue_id
           FROM usage_records ur
           WHERE ur.car_id = ? AND ur.record_type = 'departure'
             AND NOT EXISTS (
               SELECT 1 FROM usage_records r2
               WHERE r2.car_id = ur.car_id AND r2.record_type = 'return'
                 AND r2.datetime > ur.datetime
             )
           ORDER BY ur.datetime DESC LIMIT 1`,
          [body.car_id]
        );
        if (depRecord) {
          let linkedQueueId = depRecord.queue_id;
          if (!linkedQueueId) {
            // สร้าง queue ย้อนหลังจาก departure record
            const driverId = await resolveDriverId(depRecord.driver_id, depRecord.driver_name_manual);
            if (driverId) {
              const newQueueId = generateUUID();
              const depDate = depRecord.datetime.substr(0, 10);
              const depTime = depRecord.datetime.length >= 16 ? depRecord.datetime.substr(11, 5) : '00:00';
              const retTime = (body.datetime || ts).length >= 16 ? (body.datetime || ts).substr(11, 5) : '00:00';
              await autoCreateQueue(newQueueId, depDate, depTime, retTime, 'completed',
                driverId,
                depRecord.purpose || 'บันทึกผ่าน QR',
                depRecord.destination || '',
                'สร้างอัตโนมัติจากการสแกน QR (ย้อนหลัง)'
              );
              await dbRun(env.DB, 'UPDATE usage_records SET queue_id = ? WHERE id = ?', [newQueueId, depRecord.id]);
              linkedQueueId = newQueueId;
              autoCreatedQueueId = newQueueId;
            }
          } else {
            // departure มี queue แล้ว — complete มัน
            const retTime = (body.datetime || ts).length >= 16 ? (body.datetime || ts).substr(11, 5) : '00:00';
            await dbRun(env.DB,
              `UPDATE queue SET status = 'completed', time_end = ?, updated_at = ?
               WHERE id = ? AND status IN ('ongoing','scheduled')`,
              [retTime, ts, linkedQueueId]
            );
          }
          if (linkedQueueId) {
            await dbRun(env.DB, 'UPDATE usage_records SET queue_id = ? WHERE id = ?', [linkedQueueId, id]);
            queueCompleted = true;
          }
        }
      }
    }

    // Auto-set queue status = 'ongoing' เมื่อสแกนออก (ถ้ายังเป็น scheduled)
    // หรือสร้าง queue ใหม่อัตโนมัติถ้าไม่มีคิวเลย
    if (body.record_type === 'departure') {
      let targetQueueId = body.queue_id || null;
      if (!targetQueueId) {
        const schedQ = await dbFirst(env.DB,
          `SELECT id FROM queue WHERE car_id = ? AND status = 'scheduled'
           ORDER BY date DESC, time_start DESC LIMIT 1`,
          [body.car_id]
        );
        if (schedQ) targetQueueId = schedQ.id;
      }
      if (targetQueueId) {
        await dbRun(env.DB,
          `UPDATE queue SET status = 'ongoing', updated_at = ? WHERE id = ? AND status = 'scheduled'`,
          [ts, targetQueueId]
        );
        // ผูก departure record กับ queue ที่มีอยู่
        await dbRun(env.DB, 'UPDATE usage_records SET queue_id = ? WHERE id = ?', [targetQueueId, id]);
      } else {
        // ไม่มี queue เลย — สร้างใหม่อัตโนมัติ
        const driverId = await resolveDriverId(body.driver_id, body.driver_name_manual);
        if (driverId) {
          const newQueueId = generateUUID();
          const depDatetime = body.datetime || ts;
          const depDate = depDatetime.substr(0, 10);
          const depTime = depDatetime.length >= 16 ? depDatetime.substr(11, 5) : '00:00';
          await autoCreateQueue(newQueueId, depDate, depTime, depTime, 'ongoing',
            driverId,
            body.purpose || body.mission || 'บันทึกผ่าน QR',
            body.destination || '',
            'สร้างอัตโนมัติจากการสแกน QR'
          );
          await dbRun(env.DB, 'UPDATE usage_records SET queue_id = ? WHERE id = ?', [newQueueId, id]);
          autoCreatedQueueId = newQueueId;
        }
      }
    }

    return success({ id, message: 'บันทึกการใช้งานเรียบร้อย', auto_healed: healed, queue_completed: queueCompleted, auto_queue_id: autoCreatedQueueId }, 201);
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

  // PUBLIC — ดึงรายการรถที่ยังออกอยู่ (last record = departure, ไม่มี return ตามหลัง)
  // ใช้โดย dashboard ต้อง login (user required)
  if (path === '/api/usage/cars-out' && method === 'GET') {
    if (!env.user) return error('Unauthorized', 401);
    const rows = await dbAll(env.DB,
      `SELECT ur.car_id, ur.datetime AS last_departure, ur.driver_id,
              ur.driver_name_manual, ur.queue_id, ur.destination,
              c.license_plate, c.brand, c.model,
              COALESCE(d.name, ur.driver_name_manual) AS driver_name
       FROM usage_records ur
       JOIN cars c ON ur.car_id = c.id
       LEFT JOIN drivers d ON ur.driver_id = d.id
       WHERE ur.record_type = 'departure'
         AND ur.data_quality NOT IN ('gap_record','auto_departure')
         AND NOT EXISTS (
           SELECT 1 FROM usage_records ur2
           WHERE ur2.car_id = ur.car_id
             AND ur2.record_type = 'return'
             AND ur2.datetime >= ur.datetime
             AND ur2.data_quality != 'gap_record'
         )
         AND ur.datetime = (
           SELECT MAX(ur3.datetime) FROM usage_records ur3
           WHERE ur3.car_id = ur.car_id
             AND ur3.record_type = 'departure'
             AND ur3.data_quality NOT IN ('gap_record','auto_departure')
         )
       GROUP BY ur.car_id
       ORDER BY ur.datetime ASC`,
      []
    );
    return success(rows);
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
  if (path.match(/^\/api\/usage\/[^/]+$/) && !path.endsWith('/summary') && !path.endsWith('/batch-heal') && !path.endsWith('/backfill-queues') && method === 'GET') {
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

    // Upload odometer image to R2 if provided
    let odometerImagePathAuth = null;
    if (body.odometer_image_base64 && body.odometer_image_mime) {
      odometerImagePathAuth = await uploadToR2(
        env,
        body.odometer_image_base64,
        body.odometer_image_name || 'odometer.jpg',
        'ODOMETER',
        body.odometer_image_mime
      );
    }

    await dbRun(env.DB,
      `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, requester_name, record_source, purpose, destination, driver_name_manual, passengers, odometer_image, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.driver_id || null, body.record_type,
       body.datetime || ts, body.mileage || null,
       body.location || '', body.notes || '', body.queue_id || null,
       body.requester_name || null,
       body.record_source || 'qr_logged_in',
       body.purpose || null, body.destination || null, body.driver_name_manual || null,
       body.passengers || null, odometerImagePathAuth, ts]
    );
    if (body.mileage && body.mileage > 0) {
      await dbRun(env.DB,
        'UPDATE cars SET current_mileage = ? WHERE id = ? AND (current_mileage IS NULL OR current_mileage < ?)',
        [body.mileage, body.car_id, body.mileage]
      );
    }

    const healed = await autoHeal(env.DB, { id, car_id: body.car_id, driver_id: body.driver_id || null, record_type: body.record_type, datetime: body.datetime || ts, mileage: body.mileage || null, queue_id: body.queue_id || null }, env);

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

  // --- POST /api/usage/backfill-queues ---
  // สร้าง queue ย้อนหลังสำหรับ usage_records ที่ไม่มี queue_id (เคยสแกนตรงโดยไม่ผ่านคิว)
  if (path === '/api/usage/backfill-queues' && method === 'POST') {
    try { requirePermission(user, 'admin', 'manage'); } catch { return error('ต้องเป็นผู้ดูแลระบบ', 403); }
    const bfTs = now();
    let created = 0, skipped = 0;
    const details = [];

    // หา departure records ทั้งหมดที่ไม่มี queue_id
    const depRecords = await dbAll(env.DB,
      `SELECT ur.id, ur.car_id, ur.driver_id, ur.driver_name_manual,
              ur.datetime, ur.destination, ur.purpose, ur.mileage,
              c.license_plate
       FROM usage_records ur
       LEFT JOIN cars c ON ur.car_id = c.id
       WHERE ur.record_type = 'departure' AND ur.queue_id IS NULL
         AND ur.data_quality NOT IN ('gap_record','auto_departure')
       ORDER BY ur.datetime ASC`,
      []
    );

    for (const dep of depRecords) {
      // หา return record ที่ตามหลัง departure นี้ (ยังไม่มี queue_id ด้วยหรือมีก็ได้)
      const retRecord = await dbFirst(env.DB,
        `SELECT id, datetime, queue_id FROM usage_records
         WHERE car_id = ? AND record_type = 'return'
           AND datetime > ?
           AND NOT EXISTS (
             SELECT 1 FROM usage_records dep2
             WHERE dep2.car_id = ? AND dep2.record_type = 'departure'
               AND dep2.datetime > ? AND dep2.datetime < usage_records.datetime
           )
         ORDER BY datetime ASC LIMIT 1`,
        [dep.car_id, dep.datetime, dep.car_id, dep.datetime]
      );

      // resolve driver_id
      let driverId = dep.driver_id;
      if (!driverId && dep.driver_name_manual) {
        const dr = await dbFirst(env.DB,
          `SELECT id FROM drivers WHERE name = ? AND status = 'active' LIMIT 1`,
          [dep.driver_name_manual]);
        if (dr) driverId = dr.id;
      }

      if (!driverId) { skipped++; continue; }

      const newQueueId = generateUUID();
      const depDate = dep.datetime.substr(0, 10);
      const depTime = dep.datetime.length >= 16 ? dep.datetime.substr(11, 5) : '00:00';
      const retTime = retRecord ? (retRecord.datetime.length >= 16 ? retRecord.datetime.substr(11, 5) : '00:00') : depTime;
      const qStatus = retRecord ? 'completed' : 'ongoing';

      await dbRun(env.DB,
        `INSERT INTO queue (id, date, time_start, time_end, car_id, driver_id,
           mission, destination, status, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [newQueueId, depDate, depTime, retTime, dep.car_id, driverId,
         dep.purpose || 'บันทึกผ่าน QR', dep.destination || '',
         qStatus, 'สร้างอัตโนมัติ backfill จากการสแกน QR', bfTs, bfTs]
      );
      await dbRun(env.DB, 'UPDATE usage_records SET queue_id = ? WHERE id = ?', [newQueueId, dep.id]);
      if (retRecord && !retRecord.queue_id) {
        await dbRun(env.DB, 'UPDATE usage_records SET queue_id = ? WHERE id = ?', [newQueueId, retRecord.id]);
      }

      created++;
      details.push({ plate: dep.license_plate, date: depDate, status: qStatus });
    }

    return success({ created, skipped, details: details.slice(0, 200) });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}