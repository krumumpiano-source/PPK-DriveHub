// PPK DriveHub - Fuel Management Handlers
import { ok, fail, uuid, nowThai, todayThai, writeAudit, sanitize } from '../_helpers.js';
import { requirePermission } from '../_middleware.js';

export async function handleFuel(ctx) {
  const { action, body, user, DB } = ctx;

  // ── Fuel Types (from MASTER) ──────────────────────────────────────────────
  if (action === 'getFuelTypes') {
    const r = await DB.prepare(`SELECT value FROM MASTER WHERE key='fuel_types'`).first();
    try {
      return ok(r ? JSON.parse(r.value) : ['เบนซิน 91','เบนซิน 95','แก๊สโซฮอล์ E20','แก๊สโซฮอล์ E85','ดีเซล B7','ดีเซล B20','แก๊ส NGV','แก๊ส LPG','ไฟฟ้า','อื่นๆ']);
    } catch { return ok(['เบนซิน 91','เบนซิน 95','แก๊สโซฮอล์ E20','ดีเซล B7','แก๊ส NGV']); }
  }

  // ── Create Fuel Log ───────────────────────────────────────────────────────
  if (action === 'createFuelLog') {
    const d = body.data || body;
    if (!d.car_id || !d.fuel_date) return fail('กรุณาระบุ รถ และวันที่', 'INVALID_INPUT');

    const fid = uuid();
    // Calculate fuel_consumption_rate if mileage and liters are provided
    let consumption_rate = null;
    if (d.liters && d.current_mileage && d.previous_mileage) {
      const distance = Number(d.current_mileage) - Number(d.previous_mileage);
      if (distance > 0 && Number(d.liters) > 0) consumption_rate = (distance / Number(d.liters)).toFixed(2);
    }

    await DB.prepare(
      `INSERT INTO FUEL_LOG (fuel_id,car_id,driver_id,queue_id,fuel_date,fuel_type,liters,price_per_liter,
       total_cost,current_mileage,previous_mileage,fuel_consumption_rate,station_name,notes,created_at,created_by,
       receipt_image,fuel_full_tank,odometer_image)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(fid, sanitize(d.car_id), sanitize(d.driver_id),
      sanitize(d.queue_id), sanitize(d.fuel_date), sanitize(d.fuel_type),
      d.liters||null, d.price_per_liter||null, d.total_cost||null,
      d.current_mileage||null, d.previous_mileage||null, consumption_rate,
      sanitize(d.station_name), sanitize(d.notes), nowThai(), user.user_id,
      d.receipt_image||null, d.fuel_full_tank ? 1 : 0, d.odometer_image||null
    ).run();

    // Update car mileage if current_mileage provided
    if (d.current_mileage && d.car_id) {
      await DB.prepare(`UPDATE CARS SET mileage=?,updated_at=? WHERE car_id=? AND (mileage IS NULL OR mileage < ?)`)
        .bind(d.current_mileage, nowThai(), d.car_id, d.current_mileage).run();
    }

    await writeAudit(DB, user.user_id, 'createFuelLog', 'FUEL_LOG', fid, `${d.fuel_date} ${d.car_id}`);
    return ok({ fuel_id: fid }, 'บันทึกเชื้อเพลิงสำเร็จ');
  }

  // ── Get Fuel Logs ─────────────────────────────────────────────────────────
  if (action === 'getFuelLogs') {
    const permErr = requirePermission(user, 'fuel', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT fl.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
             FROM FUEL_LOG fl
             LEFT JOIN CARS c ON fl.car_id=c.car_id
             LEFT JOIN DRIVERS d ON fl.driver_id=d.driver_id WHERE 1=1`;
    if (body.car_id) { q += ' AND fl.car_id=?'; params.push(sanitize(body.car_id)); }
    if (body.driver_id) { q += ' AND fl.driver_id=?'; params.push(sanitize(body.driver_id)); }
    if (body.date_from) { q += ' AND fl.fuel_date>=?'; params.push(sanitize(body.date_from)); }
    if (body.date_to) { q += ' AND fl.fuel_date<=?'; params.push(sanitize(body.date_to)); }
    if (body.fuel_type) { q += ' AND fl.fuel_type=?'; params.push(sanitize(body.fuel_type)); }
    q += ` ORDER BY fl.fuel_date DESC, fl.created_at DESC LIMIT ${Math.min(body.limit||200, 500)}`;
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  // ── Get Fuel Log By ID ────────────────────────────────────────────────────
  if (action === 'getFuelLogById') {
    const permErr = requirePermission(user, 'fuel', 'view');
    if (permErr) return permErr;
    const r = await DB.prepare(
      `SELECT fl.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
       FROM FUEL_LOG fl
       LEFT JOIN CARS c ON fl.car_id=c.car_id
       LEFT JOIN DRIVERS d ON fl.driver_id=d.driver_id
       WHERE fl.fuel_id=?`
    ).bind(sanitize(body.fuel_id)).first();
    if (!r) return fail('ไม่พบรายการเชื้อเพลิง', 'NOT_FOUND', 404);
    return ok(r);
  }

  // ── Update Fuel Log ───────────────────────────────────────────────────────
  if (action === 'updateFuelLog') {
    const permErr = requirePermission(user, 'fuel', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const fid = sanitize(d.fuel_id || body.fuel_id);
    const fields = ['fuel_date','fuel_type','liters','price_per_liter','total_cost',
      'current_mileage','previous_mileage','station_name','notes'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (d[f] !== undefined) { updates.push(`${f}=?`); params.push(d[f]); }
    }
    updates.push('updated_at=?'); params.push(nowThai());
    params.push(fid);
    if (updates.length > 1) {
      await DB.prepare(`UPDATE FUEL_LOG SET ${updates.join(',')} WHERE fuel_id=?`).bind(...params).run();
    }
    await writeAudit(DB, user.user_id, 'updateFuelLog', 'FUEL_LOG', fid, '');
    return ok(null, 'อัพเดทรายการเชื้อเพลิงสำเร็จ');
  }

  // ── Fuel Requests (for drivers to request fuel) ───────────────────────────
  if (action === 'createFuelRequest') {
    const d = body.data || body;
    if (!d.car_id || !d.requested_liters) return fail('ระบุรถและปริมาณที่ต้องการ', 'INVALID_INPUT');
    const frid = uuid();
    await DB.prepare(
      `INSERT INTO FUEL_REQUESTS (request_id,car_id,driver_id,queue_id,requested_liters,
       fuel_type,request_date,status,notes,created_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(frid, sanitize(d.car_id), sanitize(d.driver_id), sanitize(d.queue_id),
      d.requested_liters, sanitize(d.fuel_type), sanitize(d.request_date || todayThai()),
      'pending', sanitize(d.notes), nowThai(), user.user_id).run();
    return ok({ request_id: frid }, 'ส่งคำขอเติมน้ำมันสำเร็จ');
  }

  if (action === 'getFuelRequests') {
    const permErr = requirePermission(user, 'fuel', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT fr.*,c.license_plate,d.full_name as driver_name FROM FUEL_REQUESTS fr
             LEFT JOIN CARS c ON fr.car_id=c.car_id
             LEFT JOIN DRIVERS d ON fr.driver_id=d.driver_id WHERE 1=1`;
    if (body.status) { q += ' AND fr.status=?'; params.push(sanitize(body.status)); }
    if (body.car_id) { q += ' AND fr.car_id=?'; params.push(sanitize(body.car_id)); }
    q += ' ORDER BY fr.created_at DESC LIMIT 200';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  if (action === 'approveFuelRequest') {
    const permErr = requirePermission(user, 'fuel', 'edit');
    if (permErr) return permErr;
    const rid = sanitize(body.request_id);
    await DB.prepare(`UPDATE FUEL_REQUESTS SET status='approved',approved_by=?,approved_at=?,notes=?,updated_at=? WHERE request_id=?`)
      .bind(user.user_id, nowThai(), sanitize(body.notes), nowThai(), rid).run();
    return ok(null, 'อนุมัติคำขอเชื้อเพลิงแล้ว');
  }

  if (action === 'rejectFuelRequest') {
    const permErr = requirePermission(user, 'fuel', 'edit');
    if (permErr) return permErr;
    await DB.prepare(`UPDATE FUEL_REQUESTS SET status='rejected',notes=?,updated_at=? WHERE request_id=?`)
      .bind(sanitize(body.reject_reason || body.notes), nowThai(), sanitize(body.request_id)).run();
    return ok(null, 'ปฏิเสธคำขอเชื้อเพลิงแล้ว');
  }

  // ── Monthly Fuel Report ───────────────────────────────────────────────────
  if (action === 'generateMonthlyFuelReport') {
    const permErr = requirePermission(user, 'fuel', 'view');
    if (permErr) return permErr;
    const month = sanitize(body.month || todayThai().slice(0, 7));
    const rows = await DB.prepare(
      `SELECT c.car_id,c.license_plate,c.brand,c.model,
       COUNT(*) as fill_count,
       SUM(fl.liters) as total_liters, SUM(fl.total_cost) as total_cost,
       AVG(fl.fuel_consumption_rate) as avg_consumption_rate,
       SUM(fl.current_mileage - fl.previous_mileage) as total_km
       FROM FUEL_LOG fl LEFT JOIN CARS c ON fl.car_id=c.car_id
       WHERE fl.fuel_date LIKE ?
       GROUP BY fl.car_id ORDER BY total_cost DESC`
    ).bind(`${month}%`).all();
    const summary = await DB.prepare(
      `SELECT COUNT(*) as total_fills, SUM(liters) as total_liters, SUM(total_cost) as total_cost
       FROM FUEL_LOG WHERE fuel_date LIKE ?`
    ).bind(`${month}%`).first();
    return ok({ month, summary, by_vehicle: rows.results });
  }

  // ── Annual Fuel Report ────────────────────────────────────────────────────
  if (action === 'generateAnnualFuelReport') {
    const permErr = requirePermission(user, 'fuel', 'view');
    if (permErr) return permErr;
    const year = sanitize(body.year || todayThai().slice(0, 4));
    const monthly = await DB.prepare(
      `SELECT SUBSTR(fuel_date,1,7) as month,
       COUNT(*) as fill_count, SUM(liters) as total_liters, SUM(total_cost) as total_cost
       FROM FUEL_LOG WHERE fuel_date LIKE ? GROUP BY month ORDER BY month`
    ).bind(`${year}%`).all();
    return ok({ year, monthly: monthly.results });
  }

  // ── Fuel Budget Comparison ────────────────────────────────────────────────
  if (action === 'compareFuelUsageWithBudget') {
    const permErr = requirePermission(user, 'fuel', 'view');
    if (permErr) return permErr;
    const month = sanitize(body.month);
    const budget = Number(body.budget_amount) || 0;
    const actual = await DB.prepare(`SELECT SUM(total_cost) as total FROM FUEL_LOG WHERE fuel_date LIKE ?`).bind(`${month}%`).first();
    const totalActual = actual?.total || 0;
    return ok({
      month, budget, actual: totalActual,
      difference: budget - totalActual,
      percent_used: budget > 0 ? ((totalActual / budget) * 100).toFixed(1) : null
    });
  }

  // ── Detect Anomalies (frequent fills) ────────────────────────────────────
  if (action === 'detectFrequentFillingAnomalies') {
    const permErr = requirePermission(user, 'fuel', 'view');
    if (permErr) return permErr;
    const month = sanitize(body.month || todayThai().slice(0, 7));
    const rows = await DB.prepare(
      `SELECT fl.car_id,c.license_plate,COUNT(*) as fill_count,SUM(fl.liters) as total_liters
       FROM FUEL_LOG fl LEFT JOIN CARS c ON fl.car_id=c.car_id
       WHERE fl.fuel_date LIKE ?
       GROUP BY fl.car_id HAVING fill_count > 8
       ORDER BY fill_count DESC`
    ).bind(`${month}%`).all();
    return ok({ month, anomalies: rows.results });
  }

  // ── Fuel Consumption Rate by Car ──────────────────────────────────────────
  if (action === 'getCarFuelConsumption') {
    const permErr = requirePermission(user, 'fuel', 'view');
    if (permErr) return permErr;
    const cid = sanitize(body.car_id);
    const rows = await DB.prepare(
      `SELECT fuel_date,liters,current_mileage,previous_mileage,fuel_consumption_rate,fuel_type
       FROM FUEL_LOG WHERE car_id=? ORDER BY fuel_date DESC LIMIT 50`
    ).bind(cid).all();
    return ok(rows.results);
  }

  if (action === 'getFuelConsumptionAnalysis') {
    const permErr = requirePermission(user, 'fuel', 'view');
    if (permErr) return permErr;
    const cid = sanitize(body.car_id);
    const rows = await DB.prepare(
      `SELECT SUBSTR(fuel_date,1,7) as month,
       AVG(fuel_consumption_rate) as avg_rate,
       SUM(liters) as total_liters, SUM(total_cost) as total_cost
       FROM FUEL_LOG WHERE car_id=? AND fuel_consumption_rate IS NOT NULL
       GROUP BY month ORDER BY month DESC LIMIT 12`
    ).bind(cid).all();
    return ok(rows.results);
  }

  return fail(`Unknown fuel action: ${action}`, 'UNKNOWN_ACTION');
}
