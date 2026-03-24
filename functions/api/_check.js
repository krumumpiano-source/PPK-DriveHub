// PPK DriveHub - Daily Check & Inspection Alert Handlers
import { ok, fail, uuid, nowThai, todayThai, writeAudit, sanitize } from '../_helpers.js';
import { requirePermission } from '../_middleware.js';

export async function handleCheck(ctx) {
  const { action, body, user, DB } = ctx;

  // ── Create Daily Check (public — from QR scan) ────────────────────────────
  if (action === 'createDailyCheck' || action === 'createCheckLog') {
    const d = body.data || body;
    if (!d.car_id) return fail('ระบุรถ', 'INVALID_INPUT');
    const cid = uuid();
    const score = Number(d.check_score ?? 100);
    const todayStr = todayThai();

    await DB.prepare(
      `INSERT INTO CHECK_LOG (check_id,car_id,driver_id,queue_id,check_date,check_type,
       check_score,check_items,issues_found,notes,images,signed_by,created_at,created_by,action_required)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(cid, sanitize(d.car_id), sanitize(d.driver_id), sanitize(d.queue_id),
      sanitize(d.check_date || todayStr), sanitize(d.check_type || 'daily'),
      score, d.check_items ? JSON.stringify(d.check_items) : null,
      d.issues_found ? JSON.stringify(d.issues_found) : null,
      sanitize(d.notes), d.images ? JSON.stringify(d.images) : null,
      sanitize(d.signed_by), nowThai(), user?.user_id || 'qr-scan',
      d.action_required ? 1 : 0
    ).run();

    // If score is bad (< 70) or action_required, create an inspection alert
    if (score < 70 || d.action_required) {
      const aid = uuid();
      await DB.prepare(
        `INSERT INTO INSPECTION_ALERTS (alert_id,car_id,check_id,alert_date,alert_type,
         severity,description,status,created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`
      ).bind(aid, sanitize(d.car_id), cid,
        sanitize(d.check_date || todayStr),
        'inspection', score < 50 ? 'critical' : 'warning',
        sanitize(d.notes || 'ผลการตรวจสอบต่ำกว่าเกณฑ์'),
        'pending', nowThai()
      ).run();
    }

    if (user?.user_id && user.user_id !== 'qr-scan') {
      await writeAudit(DB, user.user_id, 'createDailyCheck', 'CHECK_LOG', cid, `${d.car_id}`);
    }
    return ok({ check_id: cid }, 'บันทึกผลตรวจสอบสำเร็จ');
  }

  // ── Get Check Logs ────────────────────────────────────────────────────────
  if (action === 'getCheckLogs') {
    const permErr = requirePermission(user, 'check', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT cl.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
             FROM CHECK_LOG cl
             LEFT JOIN CARS c ON cl.car_id=c.car_id
             LEFT JOIN DRIVERS d ON cl.driver_id=d.driver_id WHERE 1=1`;
    if (body.car_id) { q += ' AND cl.car_id=?'; params.push(sanitize(body.car_id)); }
    if (body.driver_id) { q += ' AND cl.driver_id=?'; params.push(sanitize(body.driver_id)); }
    if (body.date) { q += ' AND cl.check_date=?'; params.push(sanitize(body.date)); }
    if (body.date_from) { q += ' AND cl.check_date>=?'; params.push(sanitize(body.date_from)); }
    if (body.date_to) { q += ' AND cl.check_date<=?'; params.push(sanitize(body.date_to)); }
    if (body.check_type) { q += ' AND cl.check_type=?'; params.push(sanitize(body.check_type)); }
    q += ' ORDER BY cl.check_date DESC, cl.created_at DESC LIMIT 200';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results.map(r => ({
      ...r,
      check_items: r.check_items ? JSON.parse(r.check_items) : null,
      issues_found: r.issues_found ? JSON.parse(r.issues_found) : null,
      images: r.images ? JSON.parse(r.images) : null
    })));
  }

  // ── Get Check Log By ID ───────────────────────────────────────────────────
  if (action === 'getCheckLogById') {
    const permErr = requirePermission(user, 'check', 'view');
    if (permErr) return permErr;
    const r = await DB.prepare(
      `SELECT cl.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
       FROM CHECK_LOG cl LEFT JOIN CARS c ON cl.car_id=c.car_id
       LEFT JOIN DRIVERS d ON cl.driver_id=d.driver_id
       WHERE cl.check_id=?`
    ).bind(sanitize(body.check_id)).first();
    if (!r) return fail('ไม่พบผลตรวจสอบ', 'NOT_FOUND', 404);
    return ok({
      ...r,
      check_items: r.check_items ? JSON.parse(r.check_items) : null,
      issues_found: r.issues_found ? JSON.parse(r.issues_found) : null,
      images: r.images ? JSON.parse(r.images) : null
    });
  }

  // ── Get Inspection Alerts ─────────────────────────────────────────────────
  if (action === 'getInspectionAlerts') {
    const permErr = requirePermission(user, 'check', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT ia.*,c.license_plate,c.brand,c.model FROM INSPECTION_ALERTS ia
             LEFT JOIN CARS c ON ia.car_id=c.car_id WHERE 1=1`;
    if (body.car_id) { q += ' AND ia.car_id=?'; params.push(sanitize(body.car_id)); }
    if (body.status) { q += ' AND ia.status=?'; params.push(sanitize(body.status)); }
    else { q += " AND ia.status='pending'"; }
    if (body.severity) { q += ' AND ia.severity=?'; params.push(sanitize(body.severity)); }
    q += ' ORDER BY ia.alert_date DESC LIMIT 100';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  if (action === 'acknowledgeInspectionAlert') {
    const permErr = requirePermission(user, 'check', 'edit');
    if (permErr) return permErr;
    await DB.prepare(
      `UPDATE INSPECTION_ALERTS SET status='resolved',resolved_at=?,notes=?,updated_at=? WHERE alert_id=?`
    ).bind(nowThai(), sanitize(body.notes || body.resolution), nowThai(), sanitize(body.alert_id)).run();
    return ok(null, 'รับทราบแจ้งเตือนแล้ว');
  }

  // ── Get Check Summary for a Vehicle ──────────────────────────────────────
  if (action === 'getVehicleCheckSummary') {
    const permErr = requirePermission(user, 'check', 'view');
    if (permErr) return permErr;
    const cid = sanitize(body.car_id);
    const rows = await DB.prepare(
      `SELECT check_date, check_score, check_type, action_required, notes
       FROM CHECK_LOG WHERE car_id=? ORDER BY check_date DESC LIMIT 30`
    ).bind(cid).all();
    const avgRow = await DB.prepare(`SELECT AVG(check_score) as avg FROM CHECK_LOG WHERE car_id=?`).bind(cid).first();
    return ok({ records: rows.results, avg_score: avgRow?.avg?.toFixed(1) });
  }

  // ── Check Items Definition (for frontend form) ────────────────────────────
  if (action === 'getCheckItemDefinitions') {
    return ok([
      { key: 'tires', label: 'ยางรถยนต์', category: 'exterior' },
      { key: 'brakes', label: 'ระบบเบรก', category: 'safety' },
      { key: 'lights', label: 'ไฟหน้า-หลัง', category: 'exterior' },
      { key: 'engine_oil', label: 'น้ำมันเครื่อง', category: 'engine' },
      { key: 'coolant', label: 'น้ำหล่อเย็น', category: 'engine' },
      { key: 'fuel', label: 'น้ำมันเชื้อเพลิง', category: 'fuel' },
      { key: 'ac', label: 'เครื่องปรับอากาศ', category: 'comfort' },
      { key: 'wipers', label: 'ที่ปัดน้ำฝน', category: 'safety' },
      { key: 'horn', label: 'แตร', category: 'safety' },
      { key: 'mirrors', label: 'กระจกมองหลัง', category: 'safety' },
      { key: 'seat_belts', label: 'เข็มขัดนิรภัย', category: 'safety' },
      { key: 'fire_ext', label: 'ถังดับเพลิง', category: 'safety' },
      { key: 'first_aid', label: 'ชุดปฐมพยาบาล', category: 'safety' },
      { key: 'cleanliness', label: 'ความสะอาดภายใน', category: 'comfort' },
    ]);
  }

  return fail(`Unknown check action: ${action}`, 'UNKNOWN_ACTION');
}
