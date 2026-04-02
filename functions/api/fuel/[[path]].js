// Fuel logs + fuel requests + fuel types + bill reconciliation
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, uploadToR2, writeAuditLog,
  sendTelegramMessage, createNotification, notifyAllAdmins
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  // ========== PUBLIC: GET /api/fuel/types ==========
  if (path === '/api/fuel/types' && method === 'GET') {
    const row = await dbFirst(env.DB,
      `SELECT value FROM system_settings WHERE key = 'fuel_types_list'`, []);
    let fuelTypes = [];
    if (row && row.value) {
      try { fuelTypes = JSON.parse(row.value); } catch {}
    }
    if (!fuelTypes.length) {
      fuelTypes = [
        { id: 'fuelSave_gasohol91', name: '\u0E1F\u0E34\u0E27\u0E40\u0E0B\u0E1F \u0E41\u0E01\u0E4A\u0E2A\u0E42\u0E0B\u0E2E\u0E2D\u0E25\u0E4C 91' },
        { id: 'vPower_gasohol95', name: '\u0E27\u0E35-\u0E40\u0E1E\u0E32\u0E27\u0E2D\u0E23\u0E4C\u0E41\u0E01\u0E4A\u0E2A\u0E42\u0E0B\u0E2E\u0E2D\u0E25\u0E4C 95' },
        { id: 'vPower_diesel_b7', name: '\u0E27\u0E35-\u0E40\u0E1E\u0E32\u0E40\u0E27\u0E2D\u0E23\u0E4C \u0E14\u0E35\u0E40\u0E0B\u0E25 B7' },
        { id: 'fuelSave_diesel_b7', name: '\u0E1F\u0E34\u0E27\u0E40\u0E0B\u0E1F\u0E14\u0E35\u0E40\u0E0B\u0E25 B7' },
        { id: 'e20', name: 'E20' },
        { id: 'fuelSave_diesel', name: '\u0E1F\u0E34\u0E27\u0E40\u0E0B\u0E1F\u0E14\u0E35\u0E40\u0E0B\u0E25' }
      ];
    }
    return success({ fuel_types: fuelTypes });
  }

  // ========== POST /api/fuel/record ==========
  if (path === '/api/fuel/record' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุ car_id');

    // --- Validation: receipt required ---
    if (!body.receipt_image_file && !body.receipt_image && !body.receipt_image_base64) {
      return error('กรุณาแนบรูปใบเสร็จ (บังคับตามระเบียบพัสดุ)');
    }

    // --- Validation: mileage required ---
    const mileageAfter = parseInt(body.mileage_after) || 0;
    const mileageBefore = parseInt(body.mileage_before) || 0;
    if (!mileageAfter || mileageAfter <= 0) {
      return error('กรุณากรอกเลขไมล์ (บังคับเด็ดขาด)');
    }

    // --- Validation: purpose required ---
    if (!body.purpose) return error('กรุณาระบุวัตถุประสงค์');
    if (body.purpose === 'other' && !body.purpose_detail) {
      return error('กรุณาระบุรายละเอียดวัตถุประสงค์ (เมื่อเลือกอื่นๆ)');
    }

    // --- Validation: driver required ---
    if (!body.driver_id && !body.driver_name_manual) {
      return error('กรุณาระบุผู้เบิกน้ำมัน (เลือกจากระบบ หรือ พิมพ์ชื่อ)');
    }

    // --- Mileage check: not less than previous ---
    const prevMileage = await dbFirst(env.DB,
      `SELECT MAX(mileage_after) AS max_km FROM fuel_log WHERE car_id = ? AND deleted_at IS NULL AND mileage_after > 0`,
      [body.car_id]);
    if (prevMileage?.max_km && mileageAfter < prevMileage.max_km) {
      return error('เลขไมล์ต่ำกว่ารายการก่อนหน้า (' + prevMileage.max_km + ' กม.) กรุณาตรวจสอบ');
    }

    const id = generateUUID();
    const ts = now();

    // --- Auto-generate document_number: FUL-{พ.ศ.}-{MM}-{NNN} ---
    const dateStr = body.date || ts.substr(0, 10);
    const yearBE = parseInt(dateStr.substr(0, 4)) + 543;
    const monthStr = dateStr.substr(5, 2);
    const prefix = `FUL-${yearBE}-${monthStr}-`;
    const lastDoc = await dbFirst(env.DB,
      `SELECT document_number FROM fuel_log WHERE document_number LIKE ? ORDER BY document_number DESC LIMIT 1`,
      [prefix + '%']);
    let seq = 1;
    if (lastDoc?.document_number) {
      const lastSeq = parseInt(lastDoc.document_number.split('-').pop());
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const documentNumber = prefix + String(seq).padStart(3, '0');

    // Upload receipt image if provided
    let receiptImage = body.receipt_image || null;
    if (body.receipt_image_file) {
      receiptImage = await uploadToR2(env, body.receipt_image_file, `fuel/${id}`);
    }
    let receiptPdf = body.receipt_pdf || null;

    // Calculate consumption rate
    let fuelConsumptionRate = body.fuel_consumption_rate || null;
    const liters = parseFloat(body.liters) || 0;
    if (mileageAfter > mileageBefore && mileageBefore > 0 && liters > 0) {
      fuelConsumptionRate = (mileageAfter - mileageBefore) / liters;
    }

    await dbRun(env.DB,
      `INSERT INTO fuel_log (id, date, time, car_id, driver_id,
        mileage_before, mileage_after, liters, price_per_liter, amount,
        fuel_type, gas_station_name, gas_station_address, gas_station_tax_id,
        receipt_number, pump_meter_number, receipt_image, receipt_pdf,
        fuel_consumption_rate, expense_type, notes, created_by, created_at, updated_at,
        document_number, anomaly_flag, purpose, purpose_detail, driver_name_manual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, 0, ?, ?, ?)`,
      [id, dateStr, body.time || ts.substr(11, 5),
       body.car_id, body.driver_id || null,
       mileageBefore, mileageAfter,
       liters, body.price_per_liter || 0, body.amount || 0,
       body.fuel_type || '', body.gas_station_name || body.station_name || '',
       body.gas_station_address || '', body.gas_station_tax_id || '',
       body.receipt_number || '', body.pump_meter_number || '',
       receiptImage, receiptPdf,
       fuelConsumptionRate, body.expense_type || 'procurement',
       body.notes || '', body.created_by || user?.id || 'qr', ts, ts,
       documentNumber, body.purpose, body.purpose_detail || null,
       body.driver_name_manual || null]
    );

    // --- Anomaly Detection ---
    let anomalyFlag = 0;
    let anomalyReason = '';

    // Check consumption rate
    if (fuelConsumptionRate !== null && fuelConsumptionRate > 0) {
      const baseline = await dbFirst(env.DB,
        `SELECT AVG(fuel_consumption_rate) AS avg_rate FROM (
          SELECT fuel_consumption_rate FROM fuel_log
          WHERE car_id = ? AND deleted_at IS NULL AND fuel_consumption_rate > 0 AND id != ?
          ORDER BY created_at DESC LIMIT 20
        )`, [body.car_id, id]);

      if (fuelConsumptionRate < 2) {
        anomalyFlag = 1;
        anomalyReason = 'อัตราสิ้นเปลืองต่ำผิดปกติ (' + fuelConsumptionRate.toFixed(2) + ' กม./ล.)';
      } else if (baseline?.avg_rate && baseline.avg_rate > 0 && fuelConsumptionRate > baseline.avg_rate * 1.5) {
        anomalyFlag = 1;
        anomalyReason = 'อัตราสิ้นเปลืองสูงผิดปกติ (' + fuelConsumptionRate.toFixed(2) + ' กม./ล. vs เฉลี่ย ' + baseline.avg_rate.toFixed(2) + ')';
      }
    }

    // Check frequency: >2 times same car same day
    const freqCheck = await dbFirst(env.DB,
      `SELECT COUNT(*) AS cnt FROM fuel_log WHERE car_id = ? AND date = ? AND deleted_at IS NULL`,
      [body.car_id, dateStr]);
    if (freqCheck?.cnt >= 3) {
      anomalyFlag = 1;
      anomalyReason = (anomalyReason ? anomalyReason + ' + ' : '') + 'เติมน้ำมันบ่อยผิดปกติ (' + freqCheck.cnt + ' ครั้ง/วัน)';
    }

    if (anomalyFlag) {
      await dbRun(env.DB, `UPDATE fuel_log SET anomaly_flag = 1 WHERE id = ?`, [id]);
    }

    // Update car mileage
    if (mileageAfter > 0) {
      await dbRun(env.DB,
        'UPDATE cars SET current_mileage = ? WHERE id = ? AND (current_mileage IS NULL OR current_mileage < ?)',
        [mileageAfter, body.car_id, mileageAfter]);
    }

    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [body.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : body.car_id;
    await writeAuditLog(env.DB, user?.id || null, user?.username || 'QR', 'create_fuel', 'fuel', id,
      { car: carLabel, document_number: documentNumber, liters, amount: body.amount });
    await notifyAllAdmins(env.DB, 'fuel', 'เติมน้ำมัน',
      `บันทึกเติมน้ำมัน ${carLabel} — ${liters} ลิตร, ${body.amount || 0} บาท (${documentNumber})`);

    let telegramMsg = `⛽ <b>เติมน้ำมัน</b> ${documentNumber}\n🚗 ${carLabel}\n🛢️ ${liters} ลิตร | ${body.amount || 0} บาท\n⛽ ${body.gas_station_name || body.station_name || '-'}\n📏 ${mileageBefore} → ${mileageAfter} กม.`;
    if (anomalyFlag) {
      telegramMsg += `\n⚠️ <b>ผิดปกติ:</b> ${anomalyReason}`;
    }
    await sendTelegramMessage(env, telegramMsg);

    return success({ id, document_number: documentNumber, anomaly_flag: anomalyFlag, message: 'บันทึกข้อมูลเชื้อเพลิงเรียบร้อย' }, 201);
  }

  if (!user) return error('Unauthorized', 401);

  // --- GET /api/fuel/log ---
  if (path === '/api/fuel/log' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const where = ['fl.deleted_at IS NULL'];
    const params = [];
    if (carId) { where.push('fl.car_id = ?'); params.push(carId); }
    if (dateFrom) { where.push('fl.date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('fl.date <= ?'); params.push(dateTo); }
    const rows = await dbAll(env.DB,
      `SELECT fl.*, c.license_plate, c.brand, d.name AS driver_name
       FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       LEFT JOIN drivers d ON fl.driver_id = d.id
       WHERE ${where.join(' AND ')}
       ORDER BY fl.date DESC, fl.time DESC LIMIT 500`,
      params
    );
    return success(rows);
  }

  // --- GET /api/fuel/log/:id ---
  if (path.match(/^\/api\/fuel\/log\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB,
      `SELECT fl.*, c.license_plate, c.brand, d.name AS driver_name
       FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       LEFT JOIN drivers d ON fl.driver_id = d.id
       WHERE fl.id = ? AND fl.deleted_at IS NULL`, [id]);
    if (!row) return error('ไม่พบข้อมูล', 404);
    return success(row);
  }

  // --- PUT /api/fuel/log/:id --- (with audit trail)
  if (path.match(/^\/api\/fuel\/log\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'fuel', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);

    // Get existing record for audit
    const before = await dbFirst(env.DB,
      `SELECT * FROM fuel_log WHERE id = ? AND deleted_at IS NULL`, [id]);
    if (!before) return error('ไม่พบรายการ หรือถูกลบแล้ว', 404);

    const sets = [];
    const params = [];
    const changedFields = {};
    const fields = ['date','time','car_id','driver_id','mileage_before','mileage_after',
      'liters','price_per_liter','amount','fuel_type','gas_station_name','gas_station_address',
      'gas_station_tax_id','receipt_number','pump_meter_number','receipt_image','receipt_pdf',
      'fuel_consumption_rate','expense_type','notes','purpose','purpose_detail','driver_name_manual'];
    for (const f of fields) {
      if (body[f] !== undefined) {
        sets.push(`${f} = ?`);
        params.push(body[f]);
        if (String(body[f]) !== String(before[f] || '')) {
          changedFields[f] = { from: before[f], to: body[f] };
        }
      }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE fuel_log SET ${sets.join(', ')} WHERE id = ?`, params);

    // Write audit log
    await writeAuditLog(env.DB, user.id, user.username, 'update_fuel', 'fuel', id,
      { document_number: before.document_number, changed_fields: changedFields });

    return success({ message: 'อัปเดตข้อมูลเชื้อเพลิงเรียบร้อย' });
  }

  // --- DELETE /api/fuel/log/:id --- (Soft Delete + Audit)
  if (path.match(/^\/api\/fuel\/log\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'fuel', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();

    // Get record for audit before soft-deleting
    const record = await dbFirst(env.DB,
      `SELECT * FROM fuel_log WHERE id = ? AND deleted_at IS NULL`, [id]);
    if (!record) return error('ไม่พบรายการ หรือถูกลบแล้ว', 404);

    await dbRun(env.DB,
      `UPDATE fuel_log SET deleted_at = ?, deleted_by = ? WHERE id = ?`,
      [now(), user.id, id]);

    await writeAuditLog(env.DB, user.id, user.username, 'delete_fuel', 'fuel', id,
      { document_number: record.document_number, date: record.date, car_id: record.car_id, amount: record.amount });

    return success({ message: 'ลบข้อมูลเชื้อเพลิงเรียบร้อย (Soft Delete)' });
  }

  // --- Fuel Requests ---
  if (path === '/api/fuel/requests' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const where = status ? 'WHERE fr.status = ?' : '';
    const params = status ? [status] : [];
    const rows = await dbAll(env.DB,
      `SELECT fr.*, c.license_plate, c.brand, u.display_name AS requester_name
       FROM fuel_requests fr
       LEFT JOIN cars c ON fr.car_id = c.id
       LEFT JOIN users u ON fr.requester_id = u.id
       ${where} ORDER BY fr.created_at DESC LIMIT 200`,
      params
    );
    return success(rows);
  }

  if (path === '/api/fuel/requests' && method === 'POST') {
    try { requirePermission(user, 'fuel', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุยานพาหนะ');
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO fuel_requests (id, car_id, requester_id, requested_amount, requested_liters, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, body.car_id, user.id, body.requested_amount || 0,
       body.requested_liters || 0, body.reason || '', now()]
    );
    return success({ id, message: 'สร้างคำขอเบิกเชื้อเพลิงเรียบร้อย' }, 201);
  }

  if (path.match(/\/api\/fuel\/requests\/[^/]+\/approve/) && method === 'PUT') {
    try { requirePermission(user, 'fuel', 'approve'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    await dbRun(env.DB,
      `UPDATE fuel_requests SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?`,
      [user.id, now(), id]
    );
    return success({ message: 'อนุมัติคำขอเบิกเชื้อเพลิงเรียบร้อย' });
  }

  if (path.match(/\/api\/fuel\/requests\/[^/]+\/reject/) && method === 'PUT') {
    try { requirePermission(user, 'fuel', 'approve'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    await dbRun(env.DB,
      `UPDATE fuel_requests SET status = 'rejected', approved_by = ?, approved_at = ? WHERE id = ?`,
      [user.id, now(), id]
    );
    return success({ message: 'ปฏิเสธคำขอเบิกเชื้อเพลิง' });
  }

  // --- Fuel summary ---
  if (path === '/api/fuel/summary' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const month = url.searchParams.get('month'); // YYYY-MM
    const where = ['deleted_at IS NULL'];
    const params = [];
    if (carId) { where.push('car_id = ?'); params.push(carId); }
    if (month) { where.push("date LIKE ?"); params.push(month + '%'); }
    const row = await dbFirst(env.DB,
      `SELECT COUNT(*) AS count, COALESCE(SUM(liters),0) AS total_liters,
       COALESCE(SUM(amount),0) AS total_amount,
       COALESCE(AVG(fuel_consumption_rate),0) AS avg_consumption
       FROM fuel_log WHERE ${where.join(' AND ')}`,
      params
    );
    return success(row);
  }

  // ========== BILL RECONCILIATION ==========

  // --- GET /api/fuel/invoices ---
  if (path === '/api/fuel/invoices' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const where = [];
    const params = [];
    if (status) { where.push('fi.status = ?'); params.push(status); }
    const rows = await dbAll(env.DB,
      `SELECT fi.*, u.display_name AS created_by_name
       FROM fuel_station_invoices fi
       LEFT JOIN users u ON fi.created_by = u.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY fi.created_at DESC LIMIT 200`, params);
    // Attach items
    for (const inv of rows) {
      inv.items = await dbAll(env.DB,
        `SELECT * FROM fuel_invoice_items WHERE invoice_id = ?`, [inv.id]);
    }
    return success(rows);
  }

  // --- GET /api/fuel/invoices/:id ---
  if (path.match(/^\/api\/fuel\/invoices\/[^/]+$/) && method === 'GET' && !path.includes('/reconcile') && !path.includes('/resolve')) {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const inv = await dbFirst(env.DB,
      `SELECT * FROM fuel_station_invoices WHERE id = ?`, [id]);
    if (!inv) return error('ไม่พบใบเบิก', 404);
    inv.items = await dbAll(env.DB,
      `SELECT * FROM fuel_invoice_items WHERE invoice_id = ?`, [id]);
    return success(inv);
  }

  // --- POST /api/fuel/invoices ---
  if (path === '/api/fuel/invoices' && method === 'POST') {
    try { requirePermission(user, 'fuel', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.station_name || !body?.date_from || !body?.date_to) {
      return error('กรุณาระบุชื่อปั๊ม และช่วงวันที่');
    }
    const id = generateUUID();
    const ts = now();

    let invoiceImage = null;
    if (body.invoice_image_file) {
      invoiceImage = await uploadToR2(env, body.invoice_image_file, `invoices/${id}`);
    }

    await dbRun(env.DB,
      `INSERT INTO fuel_station_invoices (id, invoice_number, station_name, date_from, date_to,
        invoice_date, total_amount, invoice_image, status, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [id, body.invoice_number || '', body.station_name, body.date_from, body.date_to,
       body.invoice_date || '', body.total_amount || 0, invoiceImage,
       body.notes || '', user.id, ts, ts]);

    // Insert items
    const items = body.items || [];
    for (const item of items) {
      await dbRun(env.DB,
        `INSERT INTO fuel_invoice_items (id, invoice_id, fuel_type, total_liters, total_amount)
         VALUES (?, ?, ?, ?, ?)`,
        [generateUUID(), id, item.fuel_type || '', item.total_liters || 0, item.total_amount || 0]);
    }

    await writeAuditLog(env.DB, user.id, user.username, 'create_invoice', 'fuel_invoice', id,
      { station: body.station_name, date_from: body.date_from, date_to: body.date_to });

    return success({ id, message: 'บันทึกใบเบิกจากปั๊มเรียบร้อย' }, 201);
  }

  // --- PUT /api/fuel/invoices/:id ---
  if (path.match(/^\/api\/fuel\/invoices\/[^/]+$/) && method === 'PUT' && !path.includes('/resolve')) {
    try { requirePermission(user, 'fuel', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['invoice_number','station_name','date_from','date_to','invoice_date','total_amount','notes'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    sets.push('updated_at = ?'); params.push(now());
    params.push(id);
    await dbRun(env.DB, `UPDATE fuel_station_invoices SET ${sets.join(', ')} WHERE id = ?`, params);

    // Update items if provided
    if (body.items) {
      await dbRun(env.DB, `DELETE FROM fuel_invoice_items WHERE invoice_id = ?`, [id]);
      for (const item of body.items) {
        await dbRun(env.DB,
          `INSERT INTO fuel_invoice_items (id, invoice_id, fuel_type, total_liters, total_amount)
           VALUES (?, ?, ?, ?, ?)`,
          [generateUUID(), id, item.fuel_type || '', item.total_liters || 0, item.total_amount || 0]);
      }
    }

    return success({ message: 'อัปเดตใบเบิกเรียบร้อย' });
  }

  // --- GET /api/fuel/invoices/:id/reconcile ---
  if (path.match(/\/api\/fuel\/invoices\/[^/]+\/reconcile/) && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const inv = await dbFirst(env.DB,
      `SELECT * FROM fuel_station_invoices WHERE id = ?`, [id]);
    if (!inv) return error('ไม่พบใบเบิก', 404);
    const invItems = await dbAll(env.DB,
      `SELECT * FROM fuel_invoice_items WHERE invoice_id = ?`, [id]);

    // Query system records in date range (procurement only)
    const systemByType = await dbAll(env.DB,
      `SELECT fuel_type, COUNT(*) AS count,
       COALESCE(SUM(liters),0) AS total_liters,
       COALESCE(SUM(amount),0) AS total_amount
       FROM fuel_log
       WHERE date >= ? AND date <= ? AND expense_type = 'procurement' AND deleted_at IS NULL
       GROUP BY fuel_type`,
      [inv.date_from, inv.date_to]);

    const systemTotal = await dbFirst(env.DB,
      `SELECT COALESCE(SUM(liters),0) AS total_liters, COALESCE(SUM(amount),0) AS total_amount
       FROM fuel_log
       WHERE date >= ? AND date <= ? AND expense_type = 'procurement' AND deleted_at IS NULL`,
      [inv.date_from, inv.date_to]);

    // Build comparison
    const comparison = [];
    for (const item of invItems) {
      const sysMatch = systemByType.find(s => s.fuel_type === item.fuel_type) || { total_liters: 0, total_amount: 0 };
      comparison.push({
        fuel_type: item.fuel_type,
        invoice_liters: item.total_liters || 0,
        system_liters: sysMatch.total_liters,
        diff_liters: (sysMatch.total_liters) - (item.total_liters || 0),
        invoice_amount: item.total_amount || 0,
        system_amount: sysMatch.total_amount,
        diff_amount: (sysMatch.total_amount) - (item.total_amount || 0)
      });
    }

    const totalDiffAmount = (systemTotal?.total_amount || 0) - (inv.total_amount || 0);
    const totalDiffPct = inv.total_amount > 0 ? Math.abs(totalDiffAmount / inv.total_amount * 100) : 0;
    const matchStatus = totalDiffPct <= 0.5 ? 'matched' : 'mismatched';

    // Auto-update invoice status
    if (inv.status === 'pending') {
      await dbRun(env.DB,
        `UPDATE fuel_station_invoices SET status = ? WHERE id = ?`,
        [matchStatus, id]);
    }

    // Get detail records for mismatch investigation
    const detailRecords = await dbAll(env.DB,
      `SELECT fl.id, fl.date, fl.document_number, fl.fuel_type, fl.liters, fl.amount,
       c.license_plate, COALESCE(d.name, fl.driver_name_manual) AS driver_name
       FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       LEFT JOIN drivers d ON fl.driver_id = d.id
       WHERE fl.date >= ? AND fl.date <= ? AND fl.expense_type = 'procurement' AND fl.deleted_at IS NULL
       ORDER BY fl.date, fl.time`,
      [inv.date_from, inv.date_to]);

    return success({
      invoice: inv,
      system_records: { by_fuel_type: systemByType, total_liters: systemTotal?.total_liters || 0, total_amount: systemTotal?.total_amount || 0 },
      comparison,
      total_diff_liters: (systemTotal?.total_liters || 0) - (inv.total_amount || 0),
      total_diff_amount: totalDiffAmount,
      total_diff_pct: totalDiffPct.toFixed(2),
      status: matchStatus,
      detail_records: detailRecords
    });
  }

  // --- PUT /api/fuel/invoices/:id/resolve ---
  if (path.match(/\/api\/fuel\/invoices\/[^/]+\/resolve/) && method === 'PUT') {
    try { requirePermission(user, 'fuel', 'approve'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE fuel_station_invoices SET status = 'resolved', notes = ?, reconciled_by = ?, reconciled_at = ?, updated_at = ? WHERE id = ?`,
      [body.notes || '', user.id, now(), now(), id]);
    await writeAuditLog(env.DB, user.id, user.username, 'resolve_invoice', 'fuel_invoice', id,
      { notes: body.notes });
    return success({ message: 'บันทึกผลตรวจสอบเรียบร้อย' });
  }

  // --- GET /api/fuel/ledger ---
  // ทะเบียนควบคุมการจัดซื้อน้ำมัน + รายงานสรุปประจำปี
  if (path === '/api/fuel/ledger' && method === 'GET') {
    try { requirePermission(user, 'fuel', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }

    // fiscal_year_be = ปีงบประมาณ พ.ศ. (เช่น 2568 = ต.ค. 2567 - ก.ย. 2568 = Oct 2024 - Sep 2025)
    const fyBE = parseInt(url.searchParams.get('fiscal_year_be')) || (new Date().getFullYear() + 543 + (new Date().getMonth() >= 9 ? 1 : 0));
    const fyStartCE = fyBE - 543 - 1; // CE year of October start
    const dateFrom = `${fyStartCE}-10-01`;
    const dateTo = `${fyStartCE + 1}-09-30`;

    // Monthly breakdown
    const monthly = await dbAll(env.DB,
      `SELECT strftime('%Y-%m', fl.date) AS month,
        COUNT(*) AS count,
        COALESCE(SUM(fl.liters), 0) AS total_liters,
        COALESCE(SUM(fl.amount), 0) AS total_amount
       FROM fuel_log fl
       WHERE fl.date >= ? AND fl.date <= ? AND fl.deleted_at IS NULL
       GROUP BY strftime('%Y-%m', fl.date)
       ORDER BY month`, [dateFrom, dateTo]);

    // By fuel type
    const byFuelType = await dbAll(env.DB,
      `SELECT fl.fuel_type,
        COUNT(*) AS count,
        COALESCE(SUM(fl.liters), 0) AS total_liters,
        COALESCE(SUM(fl.amount), 0) AS total_amount
       FROM fuel_log fl
       WHERE fl.date >= ? AND fl.date <= ? AND fl.deleted_at IS NULL
       GROUP BY fl.fuel_type
       ORDER BY total_amount DESC`, [dateFrom, dateTo]);

    // By vehicle
    const byVehicle = await dbAll(env.DB,
      `SELECT c.license_plate, c.brand,
        COUNT(*) AS count,
        COALESCE(SUM(fl.liters), 0) AS total_liters,
        COALESCE(SUM(fl.amount), 0) AS total_amount
       FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       WHERE fl.date >= ? AND fl.date <= ? AND fl.deleted_at IS NULL
       GROUP BY fl.car_id
       ORDER BY total_amount DESC`, [dateFrom, dateTo]);

    // Grand total
    const grand = await dbFirst(env.DB,
      `SELECT COUNT(*) AS count,
        COALESCE(SUM(liters), 0) AS total_liters,
        COALESCE(SUM(amount), 0) AS total_amount
       FROM fuel_log
       WHERE date >= ? AND date <= ? AND deleted_at IS NULL`,
      [dateFrom, dateTo]);

    return success({
      fiscal_year_be: fyBE,
      date_from: dateFrom,
      date_to: dateTo,
      monthly,
      by_fuel_type: byFuelType,
      by_vehicle: byVehicle,
      grand_total: grand
    });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}