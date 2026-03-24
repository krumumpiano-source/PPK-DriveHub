// PPK DriveHub - Usage Records Handlers  
import { ok, fail, uuid, nowThai, todayThai, writeAudit, sanitize } from '../_helpers.js';
import { requirePermission } from '../_middleware.js';

export async function handleUsage(ctx) {
  const { action, body, user, DB } = ctx;

  // ── Create Usage Record (often called from QR scan — public) ─────────────
  if (action === 'createUsageRecord') {
    const d = body.data || body;
    if (!d.car_id) return fail('กรุณาระบุรถ', 'INVALID_INPUT');
    const uid = uuid();
    await DB.prepare(
      `INSERT INTO USAGE_RECORDS (usage_id,car_id,driver_id,queue_id,datetime,action,
       mileage,location,fuel_level,odometer_image,notes,created_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(uid, sanitize(d.car_id), sanitize(d.driver_id), sanitize(d.queue_id),
      sanitize(d.datetime || nowThai()),
      sanitize(d.action || 'checkout'),
      d.mileage || null, sanitize(d.location), sanitize(d.fuel_level),
      d.odometer_image || null, sanitize(d.notes),
      nowThai(), user?.user_id || 'qr-scan'
    ).run();

    // Update car mileage if provided and it's a return action
    if (d.mileage && d.car_id && (d.action === 'return' || d.action === 'checkin')) {
      await DB.prepare(`UPDATE CARS SET mileage=?,updated_at=? WHERE car_id=? AND (mileage IS NULL OR CAST(mileage AS REAL) < ?)`)
        .bind(d.mileage, nowThai(), d.car_id, d.mileage).run();
    }

    // If checkout, update queue status to 'ongoing'
    if ((d.action === 'checkout' || d.action === 'start') && d.queue_id) {
      await DB.prepare(`UPDATE QUEUE SET status='ongoing',started_at=?,mileage_start=?,updated_at=? WHERE queue_id=? AND status='scheduled'`)
        .bind(nowThai(), d.mileage || null, nowThai(), d.queue_id).run();
    }

    // If return, update queue status to 'completed'
    if ((d.action === 'return' || d.action === 'checkin') && d.queue_id) {
      await DB.prepare(`UPDATE QUEUE SET status='completed',ended_at=?,mileage_end=?,updated_at=? WHERE queue_id=? AND status='ongoing'`)
        .bind(nowThai(), d.mileage || null, nowThai(), d.queue_id).run();
    }

    if (user?.user_id && user.user_id !== 'qr-scan') {
      await writeAudit(DB, user.user_id, 'createUsageRecord', 'USAGE_RECORDS', uid, `${d.car_id} ${d.action}`);
    }
    return ok({ usage_id: uid }, 'บันทึกการใช้รถสำเร็จ');
  }

  // ── Scan QR for Usage Record (public — QR page) ───────────────────────────
  if (action === 'scanQRForUsageRecord') {
    const qr_code = sanitize(body.qr_code);
    if (!qr_code) return fail('ไม่พบ QR Code', 'INVALID_INPUT');

    // Look up the car by qr_code
    const car = await DB.prepare(`SELECT car_id,license_plate,brand,model,status,mileage FROM CARS WHERE qr_code=? AND active=1`)
      .bind(qr_code).first();
    if (!car) return fail('ไม่พบรถจาก QR Code นี้', 'NOT_FOUND', 404);

    // Find the current scheduled or ongoing queue for this car
    const today = todayThai();
    const queue = await DB.prepare(
      `SELECT qu.*,d.full_name as driver_name FROM QUEUE qu
       LEFT JOIN DRIVERS d ON qu.driver_id=d.driver_id
       WHERE qu.car_id=? AND qu.date=? AND qu.status IN ('scheduled','ongoing')
       ORDER BY qu.time_start ASC LIMIT 1`
    ).bind(car.car_id, today).first();

    return ok({ car, queue, scan_datetime: nowThai() });
  }

  // ── Get Usage Records ─────────────────────────────────────────────────────
  if (action === 'getUsageRecords') {
    const permErr = requirePermission(user, 'usage', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT u.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
             FROM USAGE_RECORDS u
             LEFT JOIN CARS c ON u.car_id=c.car_id
             LEFT JOIN DRIVERS d ON u.driver_id=d.driver_id WHERE 1=1`;
    if (body.car_id) { q += ' AND u.car_id=?'; params.push(sanitize(body.car_id)); }
    if (body.driver_id) { q += ' AND u.driver_id=?'; params.push(sanitize(body.driver_id)); }
    if (body.queue_id) { q += ' AND u.queue_id=?'; params.push(sanitize(body.queue_id)); }
    if (body.date_from) { q += ' AND date(u.datetime)>=?'; params.push(sanitize(body.date_from)); }
    if (body.date_to) { q += ' AND date(u.datetime)<=?'; params.push(sanitize(body.date_to)); }
    if (body.action) { q += ' AND u.action=?'; params.push(sanitize(body.action)); }
    q += ' ORDER BY u.datetime DESC LIMIT 200';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  if (action === 'getUsageRecordById') {
    const permErr = requirePermission(user, 'usage', 'view');
    if (permErr) return permErr;
    const r = await DB.prepare(
      `SELECT u.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
       FROM USAGE_RECORDS u LEFT JOIN CARS c ON u.car_id=c.car_id
       LEFT JOIN DRIVERS d ON u.driver_id=d.driver_id WHERE u.usage_id=?`
    ).bind(sanitize(body.usage_id)).first();
    if (!r) return fail('ไม่พบบันทึกการใช้รถ', 'NOT_FOUND', 404);
    return ok(r);
  }

  // ── Auto-recovery pending returns ─────────────────────────────────────────
  if (action === 'runAutoRecoveryPendingReturns') {
    const today = todayThai();
    const pending = await DB.prepare(
      `SELECT qu.queue_id,qu.car_id,qu.driver_id FROM QUEUE qu
       WHERE qu.status='ongoing' AND qu.date < ? AND qu.ended_at IS NULL`
    ).bind(today).all();
    let recovered = 0;
    for (const q of pending.results) {
      await DB.prepare(`UPDATE QUEUE SET status='completed',ended_at=?,notes='Auto-completed by system',updated_at=? WHERE queue_id=?`)
        .bind(nowThai(), nowThai(), q.queue_id).run();
      recovered++;
    }
    return ok({ recovered }, `Auto-recovered ${recovered} queues`);
  }

  // ── Get car's current status (in use, available, etc.) ───────────────────
  if (action === 'getCarCurrentStatus') {
    const cid = sanitize(body.car_id);
    const today = todayThai();
    const ongoingQueue = await DB.prepare(
      `SELECT qu.*,d.full_name as driver_name FROM QUEUE qu
       LEFT JOIN DRIVERS d ON qu.driver_id=d.driver_id
       WHERE qu.car_id=? AND qu.date=? AND qu.status='ongoing' LIMIT 1`
    ).bind(cid, today).first();
    const lastUsage = await DB.prepare(
      `SELECT * FROM USAGE_RECORDS WHERE car_id=? ORDER BY datetime DESC LIMIT 1`
    ).bind(cid).first();
    return ok({ car_id: cid, ongoing_queue: ongoingQueue, last_usage: lastUsage });
  }

  // ── Usage summary for a driver ────────────────────────────────────────────
  if (action === 'getDriverUsageSummary') {
    const permErr = requirePermission(user, 'usage', 'view');
    if (permErr) return permErr;
    const did = sanitize(body.driver_id);
    const months = body.months || 3;
    const from = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = await DB.prepare(
      `SELECT SUBSTR(datetime,1,7) as month, COUNT(*) as trips, action
       FROM USAGE_RECORDS WHERE driver_id=? AND datetime >= ? AND action IN ('checkout','return')
       GROUP BY month, action ORDER BY month DESC`
    ).bind(did, from).all();
    return ok(rows.results);
  }

  // ── QR Usage record (alias for QR fuel + usage submission) ───────────────
  if (action === 'submitQRUsage') {
    return handleUsage({ ...ctx, action: 'createUsageRecord' });
  }

  return fail(`Unknown usage action: ${action}`, 'UNKNOWN_ACTION');
}
