// PPK DriveHub - Driver Management Handlers
import { ok, fail, uuid, nowThai, writeAudit, sanitize } from '../_helpers.js';
import { requirePermission } from '../_middleware.js';

export async function handleDrivers(ctx) {
  const { action, body, user, DB } = ctx;

  // ── Create Driver ─────────────────────────────────────────────────────────
  if (action === 'createDriver') {
    const permErr = requirePermission(user, 'drivers', 'create');
    if (permErr) return permErr;
    const d = body.data || body;
    if (!d.full_name) return fail('กรุณาระบุชื่อ-สกุลคนขับ', 'INVALID_INPUT');
    const did = uuid();
    await DB.prepare(
      `INSERT INTO DRIVERS (driver_id,title,first_name,last_name,full_name,phone,line_id,position,
       start_date,license_number,license_expiry,status,fatigue_flag,profile_image,id_card_image,
       id_card_number,id_card_issue_date,id_card_expiry_date,date_of_birth,address,
       emergency_contact,emergency_phone,created_at,created_by,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(did, sanitize(d.title), sanitize(d.first_name), sanitize(d.last_name),
      sanitize(d.full_name), sanitize(d.phone), sanitize(d.line_id),
      sanitize(d.position), sanitize(d.start_date),
      sanitize(d.license_number), sanitize(d.license_expiry),
      sanitize(d.status || 'active'), 0,
      sanitize(d.profile_image), sanitize(d.id_card_image),
      sanitize(d.id_card_number), sanitize(d.id_card_issue_date), sanitize(d.id_card_expiry_date),
      sanitize(d.date_of_birth), sanitize(d.address),
      sanitize(d.emergency_contact), sanitize(d.emergency_phone),
      nowThai(), user.user_id, sanitize(d.notes)
    ).run();
    await writeAudit(DB, user.user_id, 'createDriver', 'DRIVERS', did, sanitize(d.full_name));
    return ok({ driver_id: did }, 'เพิ่มคนขับสำเร็จ');
  }

  // ── Get Drivers ───────────────────────────────────────────────────────────
  if (action === 'getDrivers') {
    const permErr = requirePermission(user, 'drivers', 'view');
    if (permErr) return permErr;
    const status = sanitize(body.status);
    let q = `SELECT * FROM DRIVERS`;
    const params = [];
    if (status) { q += ` WHERE status=?`; params.push(status); }
    else { q += ` WHERE status != 'inactive'`; }
    q += ` ORDER BY full_name`;
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  // ── Get Driver By ID ──────────────────────────────────────────────────────
  if (action === 'getDriverById') {
    const permErr = requirePermission(user, 'drivers', 'view');
    if (permErr) return permErr;
    const did = sanitize(body.driver_id || body.driverId);
    const d = await DB.prepare(`SELECT * FROM DRIVERS WHERE driver_id=?`).bind(did).first();
    if (!d) return fail('ไม่พบคนขับ', 'NOT_FOUND', 404);
    return ok(d);
  }

  // ── Update Driver ─────────────────────────────────────────────────────────
  if (action === 'updateDriver') {
    const permErr = requirePermission(user, 'drivers', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const did = sanitize(d.driver_id || body.driver_id);
    const fields = ['title','first_name','last_name','full_name','phone','line_id','position',
      'start_date','license_number','license_expiry','status','date_of_birth','address',
      'emergency_contact','emergency_phone','id_card_number','id_card_issue_date',
      'id_card_expiry_date','notes'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (d[f] !== undefined) { updates.push(`${f}=?`); params.push(sanitize(d[f])); }
    }
    if (d.profile_image !== undefined) { updates.push('profile_image=?'); params.push(sanitize(d.profile_image)); }
    if (d.id_card_image !== undefined) { updates.push('id_card_image=?'); params.push(sanitize(d.id_card_image)); }
    updates.push('updated_at=?'); params.push(nowThai());
    params.push(did);
    if (updates.length > 1) {
      await DB.prepare(`UPDATE DRIVERS SET ${updates.join(',')} WHERE driver_id=?`).bind(...params).run();
    }
    await writeAudit(DB, user.user_id, 'updateDriver', 'DRIVERS', did, '');
    return ok(null, 'อัพเดทข้อมูลคนขับสำเร็จ');
  }

  // ── Deactivate Driver ─────────────────────────────────────────────────────
  if (action === 'deactivateDriver') {
    const permErr = requirePermission(user, 'drivers', 'edit');
    if (permErr) return permErr;
    const did = sanitize(body.driver_id);
    await DB.prepare(`UPDATE DRIVERS SET status='inactive',updated_at=? WHERE driver_id=?`)
      .bind(nowThai(), did).run();
    await writeAudit(DB, user.user_id, 'deactivateDriver', 'DRIVERS', did, '');
    return ok(null, 'ปิดการใช้งานคนขับแล้ว');
  }

  // ── Search Drivers by Name ────────────────────────────────────────────────
  if (action === 'searchDriversByName') {
    const q = '%' + sanitize(body.query || body.q) + '%';
    const rows = await DB.prepare(
      `SELECT driver_id,title,full_name,phone,status,fatigue_flag FROM DRIVERS
       WHERE full_name LIKE ? AND status='active' LIMIT 10`
    ).bind(q).all();
    return ok(rows.results);
  }

  // ── Upload Driver Images ──────────────────────────────────────────────────
  if (action === 'uploadDriverProfileImage') {
    const permErr = requirePermission(user, 'drivers', 'edit');
    if (permErr) return permErr;
    await DB.prepare(`UPDATE DRIVERS SET profile_image=?,updated_at=? WHERE driver_id=?`)
      .bind(sanitize(body.image_data), nowThai(), sanitize(body.driver_id)).run();
    return ok(null, 'อัพโหลดรูปโปรไฟล์คนขับสำเร็จ');
  }

  if (action === 'uploadDriverIdCardImage') {
    const permErr = requirePermission(user, 'drivers', 'edit');
    if (permErr) return permErr;
    await DB.prepare(`UPDATE DRIVERS SET id_card_image=?,updated_at=? WHERE driver_id=?`)
      .bind(sanitize(body.image_data), nowThai(), sanitize(body.driver_id)).run();
    return ok(null, 'อัพโหลดรูปบัตรประชาชนสำเร็จ');
  }

  // ── Fatigue Management ────────────────────────────────────────────────────
  if (action === 'markDriverFatigue') {
    const permErr = requirePermission(user, 'queue', 'edit');
    if (permErr) return permErr;
    const did = sanitize(body.driver_id);
    await DB.prepare(`UPDATE DRIVERS SET fatigue_flag=1,fatigue_date=?,fatigue_distance=?,updated_at=? WHERE driver_id=?`)
      .bind(nowThai(), body.distance || 0, nowThai(), did).run();
    return ok(null, 'บันทึกความเหนื่อยล้าของคนขับแล้ว');
  }

  if (action === 'clearDriverFatigue') {
    const permErr = requirePermission(user, 'queue', 'edit');
    if (permErr) return permErr;
    const did = sanitize(body.driver_id);
    await DB.prepare(`UPDATE DRIVERS SET fatigue_flag=0,fatigue_date=NULL,fatigue_distance=NULL,updated_at=? WHERE driver_id=?`)
      .bind(nowThai(), did).run();
    return ok(null, 'ล้างสถานะความเหนื่อยล้าแล้ว');
  }

  if (action === 'checkDriverFatigueFlag') {
    const did = sanitize(body.driver_id);
    const d = await DB.prepare(`SELECT fatigue_flag,fatigue_date,fatigue_distance FROM DRIVERS WHERE driver_id=?`).bind(did).first();
    return ok({ driver_id: did, fatigue_flag: d?.fatigue_flag || 0, fatigue_date: d?.fatigue_date });
  }

  if (action === 'checkDriverFatigueStatus') {
    const did = sanitize(body.driver_id);
    const date = sanitize(body.date) || new Date().toISOString().slice(0, 10);
    const d = await DB.prepare(`SELECT fatigue_flag,fatigue_date FROM DRIVERS WHERE driver_id=?`).bind(did).first();
    return ok({ driver_id: did, is_fatigued: d?.fatigue_flag === 1 || d?.fatigue_flag === '1', fatigue_date: d?.fatigue_date });
  }

  if (action === 'getDriverFatigueWarning') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const rows = await DB.prepare(
      `SELECT driver_id,full_name,fatigue_flag,fatigue_date FROM DRIVERS WHERE fatigue_flag=1 AND status='active'`
    ).all();
    return ok(rows.results);
  }

  // ── Self-Reported Fatigue ─────────────────────────────────────────────────
  if (action === 'reportSelfReportedFatigue') {
    const permErr = requirePermission(user, 'drivers', 'create');
    if (permErr) return permErr;
    const rid = uuid();
    await DB.prepare(
      `INSERT INTO SELF_REPORTED_FATIGUE (report_id,driver_id,date,reason,status,created_at)
       VALUES (?,?,?,?,?,?)`
    ).bind(rid, sanitize(body.driver_id), nowThai().slice(0, 10), sanitize(body.reason), 'pending', nowThai()).run();
    return ok({ report_id: rid }, 'รายงานความเหนื่อยล้าส่งแล้ว');
  }

  if (action === 'getSelfReportedFatigueReports') {
    const permErr = requirePermission(user, 'drivers', 'view');
    if (permErr) return permErr;
    const rows = await DB.prepare(
      `SELECT f.*,d.full_name FROM SELF_REPORTED_FATIGUE f
       LEFT JOIN DRIVERS d ON f.driver_id=d.driver_id
       ORDER BY f.created_at DESC LIMIT 100`
    ).all();
    return ok(rows.results);
  }

  if (action === 'acknowledgeSelfReportedFatigue') {
    const permErr = requirePermission(user, 'drivers', 'edit');
    if (permErr) return permErr;
    await DB.prepare(
      `UPDATE SELF_REPORTED_FATIGUE SET status='acknowledged',admin_notes=?,resolved_at=?,resolved_by=? WHERE report_id=?`
    ).bind(sanitize(body.admin_notes), nowThai(), user.user_id, sanitize(body.report_id)).run();
    return ok(null, 'รับทราบรายงานแล้ว');
  }

  // ── Driver History ────────────────────────────────────────────────────────
  if (action === 'getDriverQueueHistory') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const did = sanitize(body.driver_id);
    const rows = await DB.prepare(
      `SELECT q.*,c.license_plate,c.brand,c.model FROM QUEUE q
       LEFT JOIN CARS c ON q.car_id=c.car_id
       WHERE q.driver_id=? ORDER BY q.date DESC LIMIT 100`
    ).bind(did).all();
    return ok(rows.results);
  }

  // ── Discipline Score (simplified) ─────────────────────────────────────────
  if (action === 'getDriverDisciplineScore') {
    const did = sanitize(body.driver_id);
    const [overrides, fatigues, leaves] = await Promise.all([
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE WHERE driver_id=? AND fatigue_override=1`).bind(did).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM SELF_REPORTED_FATIGUE WHERE driver_id=?`).bind(did).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM LEAVES WHERE driver_id=? AND status='approved'`).bind(did).first()
    ]);
    const score = 100 - (overrides?.cnt || 0) * 5 - (fatigues?.cnt || 0) * 2;
    return ok({ driver_id: did, discipline_score: Math.max(0, score) });
  }

  if (action === 'getAllDriversWorkloadScores') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const drivers = await DB.prepare(`SELECT driver_id,full_name FROM DRIVERS WHERE status='active'`).all();
    const scores = await Promise.all(drivers.results.map(async d => {
      const month = new Date().toISOString().slice(0, 7);
      const queues = await DB.prepare(
        `SELECT COUNT(*) as cnt FROM QUEUE WHERE driver_id=? AND date LIKE ? AND status != 'cancelled'`
      ).bind(d.driver_id, `${month}%`).first();
      return { ...d, monthly_queues: queues?.cnt || 0 };
    }));
    scores.sort((a, b) => a.monthly_queues - b.monthly_queues);
    return ok(scores);
  }

  return fail(`Unknown drivers action: ${action}`, 'UNKNOWN_ACTION');
}
