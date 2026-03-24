// PPK DriveHub - Vehicle/Car Management Handlers
import { ok, fail, uuid, nowThai, writeAudit, sanitize } from '../_helpers.js';
import { requireAdmin, requirePermission } from '../_middleware.js';

export async function handleVehicles(ctx) {
  const { action, body, user, DB } = ctx;

  // ── Create Vehicle ────────────────────────────────────────────────────────
  if (action === 'createVehicle') {
    const permErr = requirePermission(user, 'vehicles', 'create');
    if (permErr) return permErr;
    const d = body.data || body;
    if (!d.license_plate) return fail('กรุณาระบุทะเบียนรถ', 'INVALID_INPUT');
    const existing = await DB.prepare(`SELECT car_id FROM CARS WHERE license_plate=? AND active=1`)
      .bind(sanitize(d.license_plate)).first();
    if (existing) return fail('ทะเบียนรถนี้มีในระบบแล้ว', 'DUPLICATE');
    const cid = uuid();
    const qrCode = `/qr/car/${cid}`;
    await DB.prepare(
      `INSERT INTO CARS (car_id,license_plate,province,brand,model,year,color,fuel_type,vehicle_type,
       seat_count,status,qr_code,vehicle_images,registration_book_image,registration_number,
       chassis_number,engine_number,registration_date,registration_expiry,owner_name,owner_address,
       mileage,created_at,created_by,notes,active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(cid, sanitize(d.license_plate), sanitize(d.province), sanitize(d.brand),
      sanitize(d.model), sanitize(d.year), sanitize(d.color), sanitize(d.fuel_type),
      sanitize(d.vehicle_type || 'van'), d.seat_count || 5,
      sanitize(d.status || 'active'), qrCode,
      d.vehicle_images ? JSON.stringify(d.vehicle_images) : null,
      sanitize(d.registration_book_image), sanitize(d.registration_number),
      sanitize(d.chassis_number), sanitize(d.engine_number),
      sanitize(d.registration_date), sanitize(d.registration_expiry),
      sanitize(d.owner_name), sanitize(d.owner_address),
      d.mileage || 0, nowThai(), user.user_id, sanitize(d.notes), 1
    ).run();
    await writeAudit(DB, user.user_id, 'createVehicle', 'CARS', cid, sanitize(d.license_plate));
    return ok({ car_id: cid, qr_code: qrCode }, 'เพิ่มรถสำเร็จ');
  }

  // ── Get Vehicles ──────────────────────────────────────────────────────────
  if (action === 'getVehicles') {
    const permErr = requirePermission(user, 'vehicles', 'view');
    if (permErr) return permErr;
    const status = sanitize(body.status);
    let q = `SELECT * FROM CARS WHERE active=1`;
    const params = [];
    if (status) { q += ` AND status=?`; params.push(status); }
    q += ` ORDER BY license_plate`;
    const rows = await DB.prepare(q).bind(...params).all();
    const cars = rows.results.map(c => ({
      ...c,
      vehicle_images: c.vehicle_images ? JSON.parse(c.vehicle_images) : []
    }));
    return ok(cars);
  }

  // ── Get Vehicle By ID (public) ────────────────────────────────────────────
  if (action === 'getVehicleById') {
    const cid = sanitize(body.car_id || body.carId);
    if (!cid) return fail('กรุณาระบุ car_id', 'INVALID_INPUT');
    const car = await DB.prepare(`SELECT * FROM CARS WHERE car_id=? AND active=1`).bind(cid).first();
    if (!car) return fail('ไม่พบรถ', 'NOT_FOUND', 404);
    return ok({ ...car, vehicle_images: car.vehicle_images ? JSON.parse(car.vehicle_images) : [] });
  }

  // ── Update Vehicle ────────────────────────────────────────────────────────
  if (action === 'updateVehicle') {
    const permErr = requirePermission(user, 'vehicles', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const cid = sanitize(d.car_id || body.car_id);
    const fields = ['license_plate','province','brand','model','year','color','fuel_type','vehicle_type',
      'seat_count','status','registration_number','chassis_number','engine_number',
      'registration_date','registration_expiry','owner_name','owner_address','mileage','notes'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (d[f] !== undefined) {
        updates.push(`${f}=?`);
        params.push(f === 'seat_count' || f === 'mileage' ? d[f] : sanitize(d[f]));
      }
    }
    if (d.vehicle_images !== undefined) {
      updates.push('vehicle_images=?');
      params.push(JSON.stringify(d.vehicle_images));
    }
    if (d.registration_book_image !== undefined) {
      updates.push('registration_book_image=?');
      params.push(sanitize(d.registration_book_image));
    }
    updates.push('updated_at=?'); params.push(nowThai());
    params.push(cid);
    if (updates.length > 1) {
      await DB.prepare(`UPDATE CARS SET ${updates.join(',')} WHERE car_id=?`).bind(...params).run();
    }
    await writeAudit(DB, user.user_id, 'updateVehicle', 'CARS', cid, '');
    return ok(null, 'อัพเดทข้อมูลรถสำเร็จ');
  }

  // ── Deactivate Vehicle ────────────────────────────────────────────────────
  if (action === 'deactivateVehicle') {
    const permErr = requirePermission(user, 'vehicles', 'edit');
    if (permErr) return permErr;
    const cid = sanitize(body.car_id);
    await DB.prepare(`UPDATE CARS SET active=0,status='inactive',updated_at=? WHERE car_id=?`)
      .bind(nowThai(), cid).run();
    await writeAudit(DB, user.user_id, 'deactivateVehicle', 'CARS', cid, '');
    return ok(null, 'ปิดการใช้งานรถแล้ว');
  }

  // ── Upload Vehicle Image ──────────────────────────────────────────────────
  if (action === 'uploadVehicleImage') {
    const permErr = requirePermission(user, 'vehicles', 'edit');
    if (permErr) return permErr;
    const cid = sanitize(body.car_id);
    const imageData = sanitize(body.image_data); // base64 or URL
    const car = await DB.prepare(`SELECT vehicle_images FROM CARS WHERE car_id=?`).bind(cid).first();
    if (!car) return fail('ไม่พบรถ', 'NOT_FOUND', 404);
    const imgs = car.vehicle_images ? JSON.parse(car.vehicle_images) : [];
    imgs.push(imageData);
    await DB.prepare(`UPDATE CARS SET vehicle_images=?,updated_at=? WHERE car_id=?`)
      .bind(JSON.stringify(imgs), nowThai(), cid).run();
    return ok({ vehicle_images: imgs }, 'อัพโหลดรูปรถสำเร็จ');
  }

  if (action === 'uploadVehicleRegistrationBookImage') {
    const permErr = requirePermission(user, 'vehicles', 'edit');
    if (permErr) return permErr;
    const cid = sanitize(body.car_id);
    const imgData = sanitize(body.image_data);
    await DB.prepare(`UPDATE CARS SET registration_book_image=?,updated_at=? WHERE car_id=?`)
      .bind(imgData, nowThai(), cid).run();
    return ok(null, 'อัพโหลดเล่มทะเบียนสำเร็จ');
  }

  // ── Lock/Unlock Vehicle for Repair ────────────────────────────────────────
  if (action === 'lockVehicleForRepair') {
    const permErr = requirePermission(user, 'repair', 'edit');
    if (permErr) return permErr;
    await DB.prepare(`UPDATE CARS SET status='repair',updated_at=? WHERE car_id=?`)
      .bind(nowThai(), sanitize(body.car_id)).run();
    return ok(null, 'ล็อครถเพื่อซ่อมแล้ว');
  }

  if (action === 'unlockVehicleFromRepair') {
    const permErr = requirePermission(user, 'repair', 'edit');
    if (permErr) return permErr;
    await DB.prepare(`UPDATE CARS SET status='active',updated_at=? WHERE car_id=?`)
      .bind(nowThai(), sanitize(body.car_id)).run();
    return ok(null, 'ปลดล็อครถแล้ว');
  }

  if (action === 'isCarScheduledForRepair') {
    const cid = sanitize(body.car_id);
    const date = sanitize(body.date);
    const sr = await DB.prepare(
      `SELECT scheduled_repair_id FROM SCHEDULED_REPAIRS WHERE car_id=? AND status='approved'
       AND start_date<=? AND expected_return_date>=?`
    ).bind(cid, date, date).first();
    return ok({ is_scheduled: !!sr });
  }

  // ── Search Vehicles by License Plate ──────────────────────────────────────
  if (action === 'searchVehiclesByLicensePlate') {
    const q = sanitize(body.query || body.q) + '%';
    const rows = await DB.prepare(
      `SELECT car_id,license_plate,brand,model,vehicle_type FROM CARS WHERE license_plate LIKE ? AND active=1 LIMIT 10`
    ).bind(q).all();
    return ok(rows.results);
  }

  // ── Calculate Vehicle Health Score (simplified) ───────────────────────────
  if (action === 'calculateVehicleHealthScore') {
    const cid = sanitize(body.car_id);
    const score = await calcHealthScore(DB, cid);
    return ok({ car_id: cid, health_score: score });
  }

  if (action === 'getAllVehiclesHealthScores') {
    const permErr = requirePermission(user, 'vehicles', 'view');
    if (permErr) return permErr;
    const cars = await DB.prepare(`SELECT car_id,license_plate,brand,model FROM CARS WHERE active=1`).all();
    const scores = await Promise.all(cars.results.map(async c => ({
      ...c, health_score: await calcHealthScore(DB, c.car_id)
    })));
    return ok(scores);
  }

  // ── Vehicle Cost Analysis (simplified) ────────────────────────────────────
  if (action === 'calculateVehicleCostPerKm' || action === 'getVehicleCostAnalysis') {
    const cid = sanitize(body.car_id);
    const [repairs, fuels] = await Promise.all([
      DB.prepare(`SELECT SUM(cost) as total FROM REPAIR_LOG WHERE car_id=? AND status='completed'`).bind(cid).first(),
      DB.prepare(`SELECT SUM(amount) as total, SUM(COALESCE(mileage_after,0)-COALESCE(mileage_before,0)) as km FROM FUEL_LOG WHERE car_id=?`).bind(cid).first()
    ]);
    const totalCost = (repairs?.total || 0) + (fuels?.total || 0);
    const totalKm = fuels?.km || 1;
    return ok({ car_id: cid, total_cost: totalCost, total_km: totalKm, cost_per_km: totalCost / totalKm });
  }

  if (action === 'rankVehiclesByCostEfficiency') {
    const permErr = requirePermission(user, 'vehicles', 'view');
    if (permErr) return permErr;
    const cars = await DB.prepare(`SELECT car_id,license_plate,brand,model FROM CARS WHERE active=1`).all();
    const ranked = [];
    for (const c of cars.results) {
      const [repairs, fuels] = await Promise.all([
        DB.prepare(`SELECT SUM(cost) as total FROM REPAIR_LOG WHERE car_id=? AND status='completed'`).bind(c.car_id).first(),
        DB.prepare(`SELECT SUM(amount) as total, SUM(COALESCE(mileage_after,0)-COALESCE(mileage_before,0)) as km FROM FUEL_LOG WHERE car_id=?`).bind(c.car_id).first()
      ]);
      const totalCost = (repairs?.total || 0) + (fuels?.total || 0);
      const totalKm = (fuels?.km || 0) || 1;
      ranked.push({ ...c, cost_per_km: totalCost / totalKm, total_cost: totalCost });
    }
    ranked.sort((a, b) => a.cost_per_km - b.cost_per_km);
    return ok(ranked);
  }

  return fail(`Unknown vehicles action: ${action}`, 'UNKNOWN_ACTION');
}

async function calcHealthScore(DB, cid) {
  const [pendingRepairs, recentFuel, recentCheck] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) as cnt FROM REPAIR_LOG WHERE car_id=? AND status IN ('pending','in_progress')`).bind(cid).first(),
    DB.prepare(`SELECT COUNT(*) as cnt FROM FUEL_LOG WHERE car_id=? AND date >= date('now','-30 days')`).bind(cid).first(),
    DB.prepare(`SELECT overall_status FROM CHECK_LOG WHERE car_id=? ORDER BY date DESC,time DESC LIMIT 1`).bind(cid).first()
  ]);
  let score = 100;
  score -= (pendingRepairs?.cnt || 0) * 15;
  if (recentCheck?.overall_status === 'bad') score -= 20;
  if (recentCheck?.overall_status === 'warning') score -= 10;
  if (!recentFuel?.cnt) score -= 5;
  return Math.max(0, Math.min(100, score));
}
