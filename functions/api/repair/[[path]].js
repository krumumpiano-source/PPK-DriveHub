// Repair logs + scheduled repairs
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, writeAuditLog,
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

  // ========== Helper: sync vehicle_maintenance from repair ==========
  async function syncMaintenanceFromRepair(carId, mileage, dateCompleted, repairItemsJson) {
    if (!carId || !mileage) return;
    try {
      const settings = await dbAll(env.DB, 'SELECT * FROM maintenance_settings WHERE enabled = 1', []);
      if (!settings || !settings.length) return;
      // Get car info for profile resolution
      const car = await dbFirst(env.DB, 'SELECT brand, model, fuel_type FROM cars WHERE id = ?', [carId]);

      // Parse repair items (could be JSON array of strings or detailed items)
      let itemTexts = [];
      try {
        const parsed = typeof repairItemsJson === 'string' ? JSON.parse(repairItemsJson) : repairItemsJson;
        if (Array.isArray(parsed)) {
          parsed.forEach(p => itemTexts.push(typeof p === 'string' ? p : (p.description || '')));
        }
      } catch(e) {}
      const fullText = itemTexts.join(' ').toLowerCase();

      // Comprehensive keyword mapping for all 34 maintenance items
      const keywordMap = {
        // Fluids
        engine_oil:            ['น้ำมันเครื่อง', 'เปลี่ยนน้ำมัน', 'oil change', 'engine oil', 'ถ่ายน้ำมัน'],
        oil_filter:            ['ไส้กรองน้ำมัน', 'กรองน้ำมัน', 'oil filter'],
        gear_oil:              ['น้ำมันเกียร์', 'gear oil', 'transmission oil', 'atf', 'เกียร์ออโต้'],
        brake_fluid:           ['น้ำมันเบรก', 'น้ำมันเบรค', 'brake fluid', 'dot 3', 'dot 4'],
        coolant:               ['น้ำหล่อเย็น', 'coolant', 'หม้อน้ำ', 'น้ำยาหล่อเย็น', 'radiator'],
        power_steering_fluid:  ['พวงมาลัยพาวเวอร์', 'power steering', 'น้ำมันพวงมาลัย'],
        differential_oil:      ['น้ำมันเฟืองท้าย', 'เฟืองท้าย', 'differential', 'หัวเพลา'],
        // Filters
        air_filter:            ['ไส้กรองอากาศ', 'กรองอากาศ', 'air filter'],
        fuel_filter:           ['กรองน้ำมันเชื้อเพลิง', 'กรองเชื้อเพลิง', 'fuel filter', 'กรองดีเซล', 'กรองโซล่า'],
        ac_filter:             ['กรองแอร์', 'ไส้กรองแอร์', 'cabin filter', 'แอร์'],
        fuel_water_separator:  ['กรองน้ำ', 'water separator', 'ระบายน้ำ'],
        // Belts
        timing_belt:           ['สายพานไทม์มิ่ง', 'timing belt', 'timing chain'],
        serpentine_belt:       ['สายพานหน้าเครื่อง', 'v-belt', 'serpentine', 'สายพาน'],
        // Brakes
        brake_pad:             ['ผ้าเบรก', 'ผ้าเบรค', 'brake pad', 'เบรค', 'เบรก'],
        brake_disc:            ['จานเบรก', 'จานเบรค', 'brake disc', 'brake rotor'],
        // Tires
        tire:                  ['เปลี่ยนยาง', 'ยางใหม่', 'ยางรถ', 'tire replacement'],
        tire_rotation:         ['สลับยาง', 'tire rotation', 'หมุนยาง'],
        wheel_alignment:       ['ตั้งศูนย์', 'alignment', 'ศูนย์ล้อ', 'บาลานซ์'],
        // Suspension
        shock_absorber:        ['โช้คอัพ', 'โช้ค', 'shock absorber', 'โชคอัพ'],
        ball_joint:            ['ลูกหมาก', 'ball joint'],
        bush:                  ['บูชยาง', 'บูช', 'ปีกนก', 'กันโคลง', 'bushing'],
        hub_grease:            ['จารบีดุมล้อ', 'จารบี', 'hub grease', 'bearing grease'],
        // Ignition
        spark_plug:            ['หัวเทียน', 'spark plug'],
        glow_plug:             ['หัวเผา', 'glow plug'],
        injector_cleaning:     ['หัวฉีด', 'ล้างหัวฉีด', 'injector', 'nozzle'],
        // Electrical
        battery:               ['แบตเตอรี่', 'battery', 'แบต', 'accu'],
        alternator_check:      ['ไดชาร์จ', 'alternator', 'ไดนาโม'],
        // Other
        wiper:                 ['ใบปัดน้ำฝน', 'wiper', 'ที่ปัดน้ำฝน'],
        clutch:                ['คลัทช์', 'clutch', 'คลัช'],
        ac_service:            ['ล้างแอร์', 'แอร์', 'a/c service', 'เติมน้ำยาแอร์'],
        // DLT
        dlt_inspection:        ['ตรวจสภาพ', 'ขนส่ง', 'ตรอ.'],
        emission_check:        ['ควันดำ', 'มลพิษ', 'emission', 'ไอเสีย'],
        fire_extinguisher:     ['ถังดับเพลิง', 'fire extinguisher'],
        safety_equipment:      ['อุปกรณ์ความปลอดภัย', 'ค้อนทุบกระจก', 'สามเหลี่ยม']
      };

      const dc = dateCompleted || new Date().toISOString().substr(0, 10);

      for (const ms of settings) {
        // Check if fuel_type_filter matches (skip diesel-only items for gasoline cars, etc.)
        if (ms.fuel_type_filter && car && car.fuel_type !== ms.fuel_type_filter) continue;

        // Check if any keyword matches
        const keywords = keywordMap[ms.item_key] || [ms.item_name.toLowerCase()];
        const matched = keywords.some(kw => fullText.includes(kw.toLowerCase()));
        if (!matched) continue;

        // Resolve brand-specific interval via profiles
        let intervalKm = ms.interval_km;
        let intervalMonths = ms.interval_months;
        if (car?.brand) {
          // Try exact brand+model
          const profile = await dbFirst(env.DB,
            `SELECT interval_km, interval_months FROM maintenance_profiles WHERE brand = ? AND (model = ? OR model = '*') AND item_key = ? ORDER BY CASE WHEN model = '*' THEN 1 ELSE 0 END LIMIT 1`,
            [car.brand, car.model || '*', ms.item_key]);
          if (profile) {
            intervalKm = profile.interval_km ?? intervalKm;
            intervalMonths = profile.interval_months ?? intervalMonths;
          }
        }

        // Calculate next service
        const nextKm = intervalKm ? (mileage + intervalKm) : null;
        let nextDate = null;
        if (intervalMonths) {
          const d = new Date(dc);
          d.setMonth(d.getMonth() + intervalMonths);
          nextDate = d.toISOString().substr(0, 10);
        }

        // Upsert vehicle_maintenance
        await dbRun(env.DB,
          `INSERT INTO vehicle_maintenance (id, car_id, item_key, last_km, last_date, next_km, next_date, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(car_id, item_key) DO UPDATE SET
             last_km = excluded.last_km, last_date = excluded.last_date,
             next_km = excluded.next_km, next_date = excluded.next_date,
             updated_at = excluded.updated_at`,
          [generateUUID(), carId, ms.item_key, mileage, dc, nextKm, nextDate, now()]
        );
      }
      // Also update car's current_mileage if higher
      await dbRun(env.DB,
        `UPDATE cars SET current_mileage = MAX(COALESCE(current_mileage, 0), ?), updated_at = ? WHERE id = ?`,
        [mileage, now(), carId]
      );
    } catch(e) { console.error('syncMaintenanceFromRepair error:', e); }
  }

  // --- GET /api/repair/log ---
  if (path === '/api/repair/log' && method === 'GET') {
    try { requirePermission(user, 'repair', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const status = url.searchParams.get('status');
    const where = [];
    const params = [];
    if (carId) { where.push('rl.car_id = ?'); params.push(carId); }
    if (status) { where.push('rl.status = ?'); params.push(status); }
    const rows = await dbAll(env.DB,
      `SELECT rl.*, c.license_plate, c.brand
       FROM repair_log rl
       LEFT JOIN cars c ON rl.car_id = c.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY rl.date_reported DESC LIMIT 300`,
      params
    );
    return success(rows);
  }

  // --- GET /api/repair/log/:id ---
  if (path.match(/^\/api\/repair\/log\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'repair', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const row = await dbFirst(env.DB,
      `SELECT rl.*, c.license_plate, c.brand FROM repair_log rl
       LEFT JOIN cars c ON rl.car_id = c.id WHERE rl.id = ?`, [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    // Attach itemized parts
    const items = await dbAll(env.DB,
      `SELECT * FROM repair_items WHERE repair_id = ? ORDER BY sort_order, created_at`, [id]);
    row.items_detail = items || [];
    return success(row);
  }

  // --- GET /api/repair/log/:id/items ---
  if (path.match(/^\/api\/repair\/log\/[^/]+\/items$/) && method === 'GET') {
    try { requirePermission(user, 'repair', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const items = await dbAll(env.DB,
      `SELECT * FROM repair_items WHERE repair_id = ? ORDER BY sort_order, created_at`, [id]);
    return success(items || []);
  }

  // --- POST /api/repair/log ---
  if (path === '/api/repair/log' && method === 'POST') {
    // ทุกคนแจ้งซ่อมได้ (driver, repair, admin)
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    const status = body.status || 'requested';
    await dbRun(env.DB,
      `INSERT INTO repair_log (id, car_id, date_reported, date_started, date_completed,
        status, mileage_at_repair, reporter_id, reporter_name, garage_name,
        repair_items, issue_description, cost, documents, notes,
        requested_by_driver_id, created_by, created_at, updated_at,
        invoice_number, work_order_number, service_type,
        labour_cost, parts_cost, discount_amount, vat_amount, grand_total,
        mileage_out, mechanic_name, taken_by, claim_number, insurance_company)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.date_reported || ts.substr(0,10),
       body.date_started || null, body.date_completed || null,
       status,
       body.mileage_at_repair || 0,
       body.reporter_id || user.id, body.reporter_name || user.display_name || '',
       body.garage_name || body.shop_name || '',
       JSON.stringify(body.repair_items || []),
       body.issue_description || body.description || '',
       body.cost || 0, JSON.stringify(body.documents || []),
       body.notes || '', body.requested_by_driver_id || null, user.id, ts, ts,
       body.invoice_number || null, body.work_order_number || null,
       body.service_type || 'repair',
       body.labour_cost || 0, body.parts_cost || 0,
       body.discount_amount || 0, body.vat_amount || 0, body.grand_total || 0,
       body.mileage_out || null, body.mechanic_name || null,
       body.taken_by || null, body.claim_number || null, body.insurance_company || null]
    );
    // Save itemized parts if provided
    if (body.items_detail && Array.isArray(body.items_detail) && body.items_detail.length) {
      for (let i = 0; i < body.items_detail.length; i++) {
        const it = body.items_detail[i];
        await dbRun(env.DB,
          `INSERT INTO repair_items (id, repair_id, part_code, description, brand_condition,
            quantity, unit_price, discount_percent, discount_amount, net_amount,
            item_type, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateUUID(), id, it.part_code || '', it.description || '',
           it.brand_condition || '', it.quantity || 1, it.unit_price || 0,
           it.discount_percent || 0, it.discount_amount || 0, it.net_amount || 0,
           it.item_type || 'part', i, ts]
        );
      }
    }

    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [body.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : body.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_repair', 'repair', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'repair', 'แจ้งซ่อม',
      `${user.displayName} แจ้งซ่อม ${carLabel} — ${body.issue_description || body.description || '-'}`);
    await sendTelegramMessage(env,
      `🔧 <b>แจ้งซ่อมใหม่</b>\n🚗 ${carLabel}\n📝 ${body.issue_description || body.description || '-'}\n👨‍💼 โดย: ${user.displayName}`);

    // Auto-sync maintenance schedule if completed
    if (status === 'completed') {
      const mil = body.mileage_at_repair || body.mileage_out || 0;
      const allItems = JSON.stringify([...(body.repair_items || []), body.issue_description || '']);
      await syncMaintenanceFromRepair(body.car_id, mil, body.date_completed || body.date_reported, allItems);
    }

    return success({ id, message: 'แจ้งซ่อมเรียบร้อย' }, 201);
  }

  // --- PUT /api/repair/log/:id ---
  if (path.match(/^\/api\/repair\/log\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['car_id','date_reported','date_started','date_completed','status',
      'mileage_at_repair','reporter_id','reporter_name','garage_name',
      'issue_description','cost','notes',
      'invoice_number','work_order_number','service_type',
      'labour_cost','parts_cost','discount_amount','vat_amount','grand_total',
      'mileage_out','mechanic_name','taken_by','claim_number','insurance_company'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.repair_items !== undefined) { sets.push('repair_items = ?'); params.push(JSON.stringify(body.repair_items)); }
    if (body.documents !== undefined) { sets.push('documents = ?'); params.push(JSON.stringify(body.documents)); }
    if (!sets.length && !(body.items_detail && body.items_detail.length)) return error('ไม่มีข้อมูลที่จะอัปเดต');
    if (sets.length) {
      sets.push('updated_at = ?'); params.push(now());
      params.push(id);
      await dbRun(env.DB, `UPDATE repair_log SET ${sets.join(', ')} WHERE id = ?`, params);
    }
    // Upsert itemized parts
    if (body.items_detail && Array.isArray(body.items_detail)) {
      await dbRun(env.DB, `DELETE FROM repair_items WHERE repair_id = ?`, [id]);
      const ts2 = now();
      for (let i = 0; i < body.items_detail.length; i++) {
        const it = body.items_detail[i];
        if (!it.description) continue;
        await dbRun(env.DB,
          `INSERT INTO repair_items (id, repair_id, part_code, description, brand_condition,
            quantity, unit_price, discount_percent, discount_amount, net_amount,
            item_type, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateUUID(), id, it.part_code || '', it.description || '',
           it.brand_condition || '', it.quantity || 1, it.unit_price || 0,
           it.discount_percent || 0, it.discount_amount || 0, it.net_amount || 0,
           it.item_type || 'part', i, ts2]
        );
      }
    }
    // Auto-sync maintenance schedule if status updated to completed
    if (body.status === 'completed') {
      const updated = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
      if (updated) {
        const mil = updated.mileage_out || updated.mileage_at_repair || 0;
        const allItems = JSON.stringify([...(function(){try{return JSON.parse(updated.repair_items||'[]')}catch(e){return[]}}()), updated.issue_description || '']);
        await syncMaintenanceFromRepair(updated.car_id, mil, updated.date_completed || updated.date_reported, allItems);
      }
    }

    return success({ message: 'อัปเดตข้อมูลซ่อมเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/approve --- อนุมัติแจ้งซ่อม
  if (path.match(/^\/api\/repair\/log\/[^/]+\/approve$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'requested') return error(`ไม่สามารถอนุมัติได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'approved', approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?`,
      [user.id, ts, ts, id]
    );
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'approve_repair', 'repair', id, { car: carLabel });
    await createNotification(env.DB, row.created_by, 'repair', 'อนุมัติแจ้งซ่อม', `แจ้งซ่อม ${carLabel} ได้รับอนุมัติแล้ว`);
    await sendTelegramMessage(env, `✅ <b>อนุมัติแจ้งซ่อม</b>\n🚗 ${carLabel}\n👨‍💼 อนุมัติโดย: ${user.displayName}`);
    return success({ message: 'อนุมัติแจ้งซ่อมเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/reject --- ปฏิเสธแจ้งซ่อม
  if (path.match(/^\/api\/repair\/log\/[^/]+\/reject$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'requested') return error(`ไม่สามารถปฏิเสธได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'rejected', rejected_by = ?, rejected_at = ?, rejection_reason = ?, updated_at = ? WHERE id = ?`,
      [user.id, ts, body?.reason || '', ts, id]
    );
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'reject_repair', 'repair', id, { car: carLabel, reason: body?.reason });
    await createNotification(env.DB, row.created_by, 'repair', 'ไม่อนุมัติแจ้งซ่อม', `แจ้งซ่อม ${carLabel} ไม่ได้รับอนุมัติ: ${body?.reason || '-'}`);
    await sendTelegramMessage(env, `❌ <b>ไม่อนุมัติแจ้งซ่อม</b>\n🚗 ${carLabel}\n📝 เหตุผล: ${body?.reason || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'ปฏิเสธแจ้งซ่อมเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/inspect --- บันทึกตรวจสภาพ+ใบเสนอราคา
  if (path.match(/^\/api\/repair\/log\/[^/]+\/inspect$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'approved') return error(`ไม่สามารถบันทึกตรวจสภาพได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'inspected', inspection_date = ?, inspection_notes = ?,
       quotation_documents = ?, garage_name = COALESCE(?, garage_name), updated_at = ? WHERE id = ?`,
      [body?.inspection_date || ts.substr(0,10), body?.inspection_notes || '',
       JSON.stringify(body?.quotation_documents || []),
       body?.garage_name || null, ts, id]
    );
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'inspect_repair', 'repair', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'repair', 'ตรวจสภาพเสร็จ', `ตรวจสภาพ ${carLabel} เรียบร้อย — รอทำบันทึกข้อความ`);
    await sendTelegramMessage(env, `🔍 <b>ตรวจสภาพเสร็จ</b>\n🚗 ${carLabel}\n📝 ${body?.inspection_notes || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'บันทึกตรวจสภาพเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/document --- ทำบันทึกข้อความ
  if (path.match(/^\/api\/repair\/log\/[^/]+\/document$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'inspected') return error(`ไม่สามารถทำบันทึกข้อความได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'documented', memo_documents = ?, memo_notes = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(body?.memo_documents || []), body?.memo_notes || '', ts, id]
    );
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'document_repair', 'repair', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'repair', 'บันทึกข้อความเสร็จ', `ทำบันทึกข้อความซ่อม ${carLabel} เรียบร้อย — รอดำเนินการซ่อม`);
    await sendTelegramMessage(env, `📄 <b>บันทึกข้อความเสร็จ</b>\n🚗 ${carLabel}\n📝 ${body?.memo_notes || '-'}\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'ทำบันทึกข้อความเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/start-repair --- เริ่มซ่อม
  if (path.match(/^\/api\/repair\/log\/[^/]+\/start-repair$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'documented') return error(`ไม่สามารถเริ่มซ่อมได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'repairing', date_started = ?, garage_name = COALESCE(?, garage_name),
       cost = COALESCE(?, cost), updated_at = ? WHERE id = ?`,
      [body?.date_started || ts.substr(0,10), body?.garage_name || null, body?.cost || null, ts, id]
    );
    // อัปเดตสถานะรถเป็น under_repair
    await dbRun(env.DB, `UPDATE cars SET status = 'under_repair', updated_at = ? WHERE id = ?`, [ts, row.car_id]);
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'start_repair', 'repair', id, { car: carLabel });
    await notifyAllAdmins(env.DB, 'repair', 'เริ่มซ่อม', `เริ่มดำเนินการซ่อม ${carLabel} แล้ว`);
    await sendTelegramMessage(env, `🔨 <b>เริ่มซ่อม</b>\n🚗 ${carLabel}\n🏪 ${body?.garage_name || row.garage_name || '-'}\n💰 ${body?.cost || row.cost || 0} บาท\n👨‍💼 โดย: ${user.displayName}`);
    return success({ message: 'เริ่มดำเนินการซ่อมเรียบร้อย' });
  }

  // --- PUT /api/repair/log/:id/complete --- ซ่อมเสร็จ
  if (path.match(/^\/api\/repair\/log\/[^/]+\/complete$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').slice(-2, -1)[0];
    const body = await parseBody(request);
    const row = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (!row) return error('ไม่พบข้อมูลซ่อม', 404);
    if (row.status !== 'repairing') return error(`ไม่สามารถบันทึกซ่อมเสร็จได้ สถานะปัจจุบัน: ${row.status}`);
    const ts = now();
    await dbRun(env.DB,
      `UPDATE repair_log SET status = 'completed', date_completed = ?,
       cost = COALESCE(?, cost), receipt_documents = ?, notes = COALESCE(?, notes),
       invoice_number = COALESCE(?, invoice_number), work_order_number = COALESCE(?, work_order_number),
       service_type = COALESCE(?, service_type),
       labour_cost = COALESCE(?, labour_cost), parts_cost = COALESCE(?, parts_cost),
       discount_amount = COALESCE(?, discount_amount), vat_amount = COALESCE(?, vat_amount),
       grand_total = COALESCE(?, grand_total), mileage_out = COALESCE(?, mileage_out),
       mechanic_name = COALESCE(?, mechanic_name),
       taken_by = COALESCE(?, taken_by), claim_number = COALESCE(?, claim_number),
       insurance_company = COALESCE(?, insurance_company),
       updated_at = ? WHERE id = ?`,
      [body?.date_completed || ts.substr(0,10), body?.cost || null,
       JSON.stringify(body?.receipt_documents || []), body?.notes || null,
       body?.invoice_number || null, body?.work_order_number || null,
       body?.service_type || null,
       body?.labour_cost || null, body?.parts_cost || null,
       body?.discount_amount || null, body?.vat_amount || null,
       body?.grand_total || null, body?.mileage_out || null,
       body?.mechanic_name || null,
       body?.taken_by || null, body?.claim_number || null,
       body?.insurance_company || null,
       ts, id]
    );
    // Save itemized parts if provided
    if (body?.items_detail && Array.isArray(body.items_detail) && body.items_detail.length) {
      await dbRun(env.DB, `DELETE FROM repair_items WHERE repair_id = ?`, [id]);
      for (let i = 0; i < body.items_detail.length; i++) {
        const it = body.items_detail[i];
        if (!it.description) continue;
        await dbRun(env.DB,
          `INSERT INTO repair_items (id, repair_id, part_code, description, brand_condition,
            quantity, unit_price, discount_percent, discount_amount, net_amount,
            item_type, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateUUID(), id, it.part_code || '', it.description || '',
           it.brand_condition || '', it.quantity || 1, it.unit_price || 0,
           it.discount_percent || 0, it.discount_amount || 0, it.net_amount || 0,
           it.item_type || 'part', i, ts]
        );
      }
    }
    // อัปเดตสถานะรถกลับเป็น active
    await dbRun(env.DB, `UPDATE cars SET status = 'active', updated_at = ? WHERE id = ?`, [ts, row.car_id]);
    const car = await dbFirst(env.DB, 'SELECT license_plate, brand FROM cars WHERE id = ?', [row.car_id]);
    const carLabel = car ? `${car.license_plate} ${car.brand || ''}`.trim() : row.car_id;
    await writeAuditLog(env.DB, user.id, user.displayName, 'complete_repair', 'repair', id, { car: carLabel, cost: body?.cost || row.cost });
    if (row.created_by) await createNotification(env.DB, row.created_by, 'repair', 'ซ่อมเสร็จ', `ซ่อม ${carLabel} เสร็จเรียบร้อยแล้ว`);
    if (row.requested_by_driver_id) {
      const driverUser = await dbFirst(env.DB, 'SELECT id FROM users WHERE driver_id = ?', [row.requested_by_driver_id]);
      if (driverUser) await createNotification(env.DB, driverUser.id, 'repair', 'ซ่อมเสร็จ', `ซ่อม ${carLabel} เสร็จเรียบร้อยแล้ว`);
    }
    await notifyAllAdmins(env.DB, 'repair', 'ซ่อมเสร็จ', `ซ่อม ${carLabel} เสร็จเรียบร้อย ค่าใช้จ่ายรวม ${body?.cost || row.cost || 0} บาท`);
    await sendTelegramMessage(env, `✅ <b>ซ่อมเสร็จ</b>\n🚗 ${carLabel}\n💰 ${body?.cost || row.cost || 0} บาท\n👨‍💼 โดย: ${user.displayName}`);

    // Auto-sync maintenance schedule
    const completedRow = await dbFirst(env.DB, 'SELECT * FROM repair_log WHERE id = ?', [id]);
    if (completedRow) {
      const mil = completedRow.mileage_out || completedRow.mileage_at_repair || 0;
      const allItems = JSON.stringify([...(function(){try{return JSON.parse(completedRow.repair_items||'[]')}catch(e){return[]}}()), completedRow.issue_description || '']);
      await syncMaintenanceFromRepair(completedRow.car_id, mil, completedRow.date_completed, allItems);
    }

    return success({ message: 'บันทึกซ่อมเสร็จเรียบร้อย' });
  }

  // --- DELETE /api/repair/log/:id ---
  if (path.match(/^\/api\/repair\/log\/[^/]+$/) && method === 'DELETE') {
    try { requirePermission(user, 'repair', 'delete'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    await dbRun(env.DB, 'DELETE FROM repair_items WHERE repair_id = ?', [id]);
    await dbRun(env.DB, 'DELETE FROM repair_log WHERE id = ?', [id]);
    return success({ message: 'ลบข้อมูลซ่อมเรียบร้อย' });
  }

  // --- Scheduled Repairs ---
  if (path === '/api/repair/scheduled' && method === 'GET') {
    try { requirePermission(user, 'repair', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const where = status ? 'WHERE sr.status = ?' : '';
    const params = status ? [status] : [];
    const rows = await dbAll(env.DB,
      `SELECT sr.*, c.license_plate, c.brand FROM scheduled_repairs sr
       LEFT JOIN cars c ON sr.car_id = c.id
       ${where} ORDER BY sr.scheduled_date ASC`,
      params
    );
    return success(rows);
  }

  if (path === '/api/repair/scheduled' && method === 'POST') {
    try { requirePermission(user, 'repair', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO scheduled_repairs (id, car_id, repair_type, scheduled_date, status, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [id, body.car_id, body.repair_type || '', body.scheduled_date || '',
       body.notes || '', user.id, ts]
    );
    return success({ id, message: 'สร้างกำหนดการซ่อมเรียบร้อย' }, 201);
  }

  if (path.match(/^\/api\/repair\/scheduled\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'repair', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/').pop();
    const body = await parseBody(request);
    const sets = [];
    const params = [];
    const fields = ['car_id','repair_type','scheduled_date','status','notes'];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.status === 'completed') { sets.push('completed_at = ?'); params.push(now()); }
    if (!sets.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(id);
    await dbRun(env.DB, `UPDATE scheduled_repairs SET ${sets.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตกำหนดการซ่อมเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}