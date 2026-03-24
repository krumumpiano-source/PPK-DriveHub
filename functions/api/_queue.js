// PPK DriveHub - Queue Management Handlers
import { ok, fail, uuid, nowThai, todayThai, writeAudit, sanitize } from '../_helpers.js';
import { requirePermission } from '../_middleware.js';

export async function handleQueue(ctx) {
  const { action, body, user, DB } = ctx;

  // ── Create Queue ──────────────────────────────────────────────────────────
  if (action === 'createQueue' || action === 'createManualQueue') {
    const permErr = requirePermission(user, 'queue', 'create');
    if (permErr) return permErr;
    const d = body.data || body;
    if (!d.date || !d.car_id || !d.driver_id) return fail('กรุณาระบุวันที่ รถ และคนขับ', 'INVALID_INPUT');

    // Check car conflict
    if (!d.allow_flexible) {
      const carConflict = await DB.prepare(
        `SELECT queue_id FROM QUEUE WHERE car_id=? AND date=? AND status NOT IN ('cancelled','completed')
         AND ((time_start<=? AND time_end>=?) OR (time_start>=? AND time_start<=?))`
      ).bind(d.car_id, d.date, d.time_end||'23:59', d.time_start||'00:00', d.time_start||'00:00', d.time_end||'23:59')
        .first();
      if (carConflict) return fail('รถถูกจองในช่วงเวลาดังกล่าวแล้ว', 'CONFLICT');

      // Check driver conflict
      const driverConflict = await DB.prepare(
        `SELECT queue_id FROM QUEUE WHERE driver_id=? AND date=? AND status NOT IN ('cancelled','completed')
         AND ((time_start<=? AND time_end>=?) OR (time_start>=? AND time_start<=?))`
      ).bind(d.driver_id, d.date, d.time_end||'23:59', d.time_start||'00:00', d.time_start||'00:00', d.time_end||'23:59')
        .first();
      if (driverConflict) return fail('คนขับถูกจองในช่วงเวลาดังกล่าวแล้ว', 'CONFLICT');
    }

    // Check driver fatigue
    if (!d.fatigue_override) {
      const driver = await DB.prepare(`SELECT fatigue_flag FROM DRIVERS WHERE driver_id=?`).bind(d.driver_id).first();
      if (driver?.fatigue_flag === 1 || driver?.fatigue_flag === '1') {
        return fail('คนขับมีสถานะเหนื่อยล้า ไม่สามารถจองคิวได้ (ใช้ fatigue_override=true เพื่อข้าม)', 'FATIGUE');
      }
    }

    // Check driver leave
    const onLeave = await DB.prepare(
      `SELECT leave_id FROM LEAVES WHERE driver_id=? AND status='approved'
       AND start_date<=? AND end_date>=?`
    ).bind(d.driver_id, d.date, d.date).first();
    if (onLeave && !d.emergency_override) {
      return fail('คนขับลาในวันดังกล่าว (ใช้ emergency_override=true เพื่อข้าม)', 'ON_LEAVE');
    }

    const qid = uuid();
    await DB.prepare(
      `INSERT INTO QUEUE (queue_id,date,time_start,time_end,car_id,driver_id,mission,status,
       created_at,created_by,allow_flexible,emergency_override,fatigue_override,override_reason,
       passenger_count,requested_by,destination,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(qid, sanitize(d.date), sanitize(d.time_start), sanitize(d.time_end),
      sanitize(d.car_id), sanitize(d.driver_id), sanitize(d.mission),
      'scheduled', nowThai(), user.user_id,
      d.allow_flexible ? 1 : 0, d.emergency_override ? 1 : 0, d.fatigue_override ? 1 : 0,
      sanitize(d.override_reason), d.passenger_count || 0,
      sanitize(d.requested_by), sanitize(d.destination), sanitize(d.notes)
    ).run();

    // Auto-create notification for driver
    await DB.prepare(`INSERT INTO NOTIFICATIONS (notification_id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(uuid(), d.driver_id, 'queue_assigned', 'ได้รับมอบหมายคิวรถ',
        `วันที่ ${d.date} ${d.time_start||''}-${d.time_end||''} ภารกิจ: ${d.mission||'ไม่ระบุ'}`, 0, nowThai()).run();

    await writeAudit(DB, user.user_id, 'createQueue', 'QUEUE', qid, `${d.date} ${d.car_id}`);
    return ok({ queue_id: qid }, 'สร้างคิวสำเร็จ');
  }

  // ── Get Queues ────────────────────────────────────────────────────────────
  if (action === 'getQueues') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT qu.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
             FROM QUEUE qu
             LEFT JOIN CARS c ON qu.car_id=c.car_id
             LEFT JOIN DRIVERS d ON qu.driver_id=d.driver_id WHERE 1=1`;
    if (body.date) { q += ' AND qu.date=?'; params.push(sanitize(body.date)); }
    if (body.date_from) { q += ' AND qu.date>=?'; params.push(sanitize(body.date_from)); }
    if (body.date_to) { q += ' AND qu.date<=?'; params.push(sanitize(body.date_to)); }
    if (body.car_id) { q += ' AND qu.car_id=?'; params.push(sanitize(body.car_id)); }
    if (body.driver_id) { q += ' AND qu.driver_id=?'; params.push(sanitize(body.driver_id)); }
    if (body.status) { q += ' AND qu.status=?'; params.push(sanitize(body.status)); }
    q += ' ORDER BY qu.date DESC, qu.time_start ASC LIMIT 200';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  // ── Get Queue By ID ───────────────────────────────────────────────────────
  if (action === 'getQueueById') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const qid = sanitize(body.queue_id);
    const row = await DB.prepare(
      `SELECT qu.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
       FROM QUEUE qu 
       LEFT JOIN CARS c ON qu.car_id=c.car_id
       LEFT JOIN DRIVERS d ON qu.driver_id=d.driver_id
       WHERE qu.queue_id=?`
    ).bind(qid).first();
    if (!row) return fail('ไม่พบคิว', 'NOT_FOUND', 404);
    return ok(row);
  }

  // ── Update Queue ──────────────────────────────────────────────────────────
  if (action === 'updateQueue') {
    const permErr = requirePermission(user, 'queue', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const qid = sanitize(d.queue_id || body.queue_id);
    const fields = ['date','time_start','time_end','car_id','driver_id','mission','status',
      'started_at','ended_at','mileage_start','mileage_end','notes','passenger_count','destination'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (d[f] !== undefined) {
        updates.push(`${f}=?`);
        params.push(['mileage_start','mileage_end','passenger_count'].includes(f) ? d[f] : sanitize(d[f]));
      }
    }
    updates.push('updated_at=?'); params.push(nowThai());
    params.push(qid);
    if (updates.length > 1) {
      await DB.prepare(`UPDATE QUEUE SET ${updates.join(',')} WHERE queue_id=?`).bind(...params).run();
    }
    await writeAudit(DB, user.user_id, 'updateQueue', 'QUEUE', qid, '');
    return ok(null, 'อัพเดทคิวสำเร็จ');
  }

  // ── Cancel Queue ──────────────────────────────────────────────────────────
  if (action === 'cancelQueue') {
    const permErr = requirePermission(user, 'queue', 'edit');
    if (permErr) return permErr;
    const qid = sanitize(body.queue_id);
    await DB.prepare(`UPDATE QUEUE SET status='cancelled',notes=?,updated_at=? WHERE queue_id=?`)
      .bind(sanitize(body.cancel_reason || body.reason || 'ยกเลิก'), nowThai(), qid).run();
    await writeAudit(DB, user.user_id, 'cancelQueue', 'QUEUE', qid, sanitize(body.cancel_reason));
    return ok(null, 'ยกเลิกคิวแล้ว');
  }

  // ── Freeze / Unfreeze Queue ───────────────────────────────────────────────
  if (action === 'freezeQueue') {
    const permErr = requirePermission(user, 'queue', 'edit');
    if (permErr) return permErr;
    const qid = sanitize(body.queue_id);
    await DB.prepare(`UPDATE QUEUE SET frozen=1,freeze_at=?,notes=?,updated_at=? WHERE queue_id=?`)
      .bind(nowThai(), sanitize(body.reason), nowThai(), qid).run();
    return ok(null, 'หยุดคิวชั่วคราวแล้ว');
  }

  if (action === 'unfreezeQueue') {
    const permErr = requirePermission(user, 'queue', 'edit');
    if (permErr) return permErr;
    const qid = sanitize(body.queue_id);
    await DB.prepare(`UPDATE QUEUE SET frozen=0,freeze_at=NULL,updated_at=? WHERE queue_id=?`)
      .bind(nowThai(), qid).run();
    return ok(null, 'เปิดคิวแล้ว');
  }

  // ── Get Available Vehicles for Queue ──────────────────────────────────────
  if (action === 'getAvailableVehiclesForQueue') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const date = sanitize(body.date);
    const ts = sanitize(body.time_start);
    const te = sanitize(body.time_end);
    let q = `SELECT c.* FROM CARS c WHERE c.active=1 AND c.status='active'
             AND c.car_id NOT IN (
               SELECT car_id FROM QUEUE
               WHERE date=? AND status NOT IN ('cancelled','completed')
               AND ((time_start<=? AND time_end>=?) OR (time_start>=? AND time_start<=?))
             )`;
    const rows = await DB.prepare(q).bind(date, te||'23:59', ts||'00:00', ts||'00:00', te||'23:59').all();
    return ok(rows.results.map(c => ({ ...c, vehicle_images: c.vehicle_images ? JSON.parse(c.vehicle_images) : [] })));
  }

  // ── Get Available Drivers for Queue ───────────────────────────────────────
  if (action === 'getAvailableDriversForQueue') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const date = sanitize(body.date);
    const ts = sanitize(body.time_start);
    const te = sanitize(body.time_end);
    const rows = await DB.prepare(
      `SELECT d.* FROM DRIVERS d WHERE d.status='active' AND d.fatigue_flag=0
       AND d.driver_id NOT IN (
         SELECT driver_id FROM QUEUE
         WHERE date=? AND status NOT IN ('cancelled','completed')
         AND ((time_start<=? AND time_end>=?) OR (time_start>=? AND time_start<=?))
       )
       AND d.driver_id NOT IN (
         SELECT driver_id FROM LEAVES WHERE status='approved' AND start_date<=? AND end_date>=?
       )
       ORDER BY d.full_name`
    ).bind(date, te||'23:59', ts||'00:00', ts||'00:00', te||'23:59', date, date).all();
    return ok(rows.results);
  }

  // ── Get Queue Plan (calendar view) ────────────────────────────────────────
  if (action === 'getQueuePlan') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const from = sanitize(body.date_from || body.month);
    const to = sanitize(body.date_to);
    let q = `SELECT qu.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
             FROM QUEUE qu
             LEFT JOIN CARS c ON qu.car_id=c.car_id
             LEFT JOIN DRIVERS d ON qu.driver_id=d.driver_id
             WHERE qu.status != 'cancelled'`;
    const params = [];
    if (from && to) { q += ` AND qu.date BETWEEN ? AND ?`; params.push(from, to); }
    else if (from) { q += ` AND qu.date LIKE ?`; params.push(`${from}%`); }
    q += ` ORDER BY qu.date ASC, qu.time_start ASC LIMIT 500`;
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  // ── Get Queue Timeline ────────────────────────────────────────────────────
  if (action === 'getQueueTimeline') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const qid = sanitize(body.queue_id);
    const q = await DB.prepare(`SELECT * FROM QUEUE WHERE queue_id=?`).bind(qid).first();
    if (!q) return fail('ไม่พบคิว', 'NOT_FOUND', 404);
    const usages = await DB.prepare(`SELECT * FROM USAGE_RECORDS WHERE queue_id=? OR car_id=? ORDER BY datetime ASC`)
      .bind(qid, q.car_id).all();
    return ok({ queue: q, usage_records: usages.results });
  }

  // ── Get Vehicle Queue History ─────────────────────────────────────────────
  if (action === 'getVehicleQueueHistory') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const rows = await DB.prepare(
      `SELECT qu.*,d.full_name as driver_name FROM QUEUE qu
       LEFT JOIN DRIVERS d ON qu.driver_id=d.driver_id
       WHERE qu.car_id=? ORDER BY qu.date DESC LIMIT 100`
    ).bind(sanitize(body.car_id)).all();
    return ok(rows.results);
  }

  // ── Queue Creation Warnings ───────────────────────────────────────────────
  if (action === 'getQueueCreationWarnings') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const warnings = [];
    const { driver_id, car_id, date } = body;
    if (driver_id) {
      const fatigue = await DB.prepare(`SELECT fatigue_flag FROM DRIVERS WHERE driver_id=?`).bind(driver_id).first();
      if (fatigue?.fatigue_flag) warnings.push({ type: 'fatigue', message: 'คนขับมีสถานะเหนื่อยล้า' });
      const leave = await DB.prepare(`SELECT leave_id FROM LEAVES WHERE driver_id=? AND status='approved' AND start_date<=? AND end_date>=?`)
        .bind(driver_id, date, date).first();
      if (leave) warnings.push({ type: 'leave', message: 'คนขับลาในวันดังกล่าว' });
    }
    if (car_id) {
      const repair = await DB.prepare(`SELECT car_id FROM CARS WHERE car_id=? AND status='repair'`).bind(car_id).first();
      if (repair) warnings.push({ type: 'repair', message: 'รถอยู่ระหว่างซ่อมบำรุง' });
    }
    return ok({ warnings });
  }

  // ── Check and Auto-freeze queues ──────────────────────────────────────────
  if (action === 'checkAndFreezeQueues') {
    const adminErr = requirePermission(user, 'queue', 'edit');
    if (adminErr) return adminErr;
    const bufferHours = 2;
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const todayStr = now.toISOString().slice(0, 10);
    const timeNow = now.toISOString().slice(11, 16);
    const bufferTime = new Date(now.getTime() - bufferHours * 60 * 60 * 1000).toISOString().slice(11, 16);
    const rows = await DB.prepare(
      `UPDATE QUEUE SET frozen=1,freeze_at=? WHERE date=? AND status='scheduled'
       AND time_start<=? AND time_start>=? AND frozen=0`
    ).bind(nowThai(), todayStr, timeNow, bufferTime).run();
    return ok({ frozen: rows.changes }, `หยุดคิวล่วงหน้า ${rows.changes} รายการ`);
  }

  // ── Smart Queue Recommendations (simplified) ──────────────────────────────
  if (action === 'getSmartQueueRecommendations') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const date = sanitize(body.date) || todayThai();
    const [drivers, cars] = await Promise.all([
      DB.prepare(
        `SELECT d.driver_id,d.full_name,d.fatigue_flag,
         (SELECT COUNT(*) FROM QUEUE WHERE driver_id=d.driver_id AND date LIKE ? AND status != 'cancelled') as month_count
         FROM DRIVERS d WHERE d.status='active' AND d.fatigue_flag=0
         AND d.driver_id NOT IN (SELECT driver_id FROM LEAVES WHERE status='approved' AND start_date<=? AND end_date>=?)
         ORDER BY month_count ASC LIMIT 5`
      ).bind(`${date.slice(0,7)}%`, date, date).all(),
      DB.prepare(`SELECT car_id,license_plate,brand,model FROM CARS WHERE active=1 AND status='active' LIMIT 10`).all()
    ]);
    return ok({ recommended_drivers: drivers.results, available_cars: cars.results });
  }

  if (action === 'getFairnessRecommendations') {
    return ctx.action === 'getFairnessRecommendations' ? handleQueue({ ...ctx, action: 'getSmartQueueRecommendations' }) : fail('error');
  }

  // ── Organization Queue History ────────────────────────────────────────────
  if (action === 'getOrganizationQueueHistory') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const from = sanitize(body.date_from);
    const to = sanitize(body.date_to);
    const rows = await DB.prepare(
      `SELECT qu.*,c.license_plate,d.full_name as driver_name FROM QUEUE qu
       LEFT JOIN CARS c ON qu.car_id=c.car_id
       LEFT JOIN DRIVERS d ON qu.driver_id=d.driver_id
       WHERE qu.date BETWEEN ? AND ? ORDER BY qu.date DESC LIMIT 500`
    ).bind(from || '2020-01-01', to || todayThai()).all();
    return ok(rows.results);
  }

  // ── Run Auto Recovery ─────────────────────────────────────────────────────
  if (action === 'runAutoRecoveryPendingReturns') {
    const today = todayThai();
    const pending = await DB.prepare(
      `SELECT queue_id FROM QUEUE WHERE status='ongoing' AND date < ? AND ended_at IS NULL`
    ).bind(today).all();
    for (const r of pending.results) {
      await DB.prepare(`UPDATE QUEUE SET status='completed',ended_at=?,notes=? WHERE queue_id=?`)
        .bind(nowThai(), 'Auto-completed by system', r.queue_id).run();
    }
    return ok({ recovered: pending.results.length }, `Auto-recovered ${pending.results.length} queues`);
  }

  if (action === 'getRecoveryDayRecommendations') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const rows = await DB.prepare(`SELECT driver_id,full_name FROM DRIVERS WHERE fatigue_flag=1 AND status='active'`).all();
    return ok({ needs_recovery: rows.results });
  }

  if (action === 'checkRecoveryDayStatus') {
    const did = sanitize(body.driver_id);
    const d = await DB.prepare(`SELECT fatigue_flag,fatigue_date FROM DRIVERS WHERE driver_id=?`).bind(did).first();
    return ok({ needs_recovery: d?.fatigue_flag === 1 || d?.fatigue_flag === '1', since: d?.fatigue_date });
  }

  if (action === 'checkRotationPolicy') {
    const did = sanitize(body.driver_id);
    const date = sanitize(body.date);
    const recentQueues = await DB.prepare(
      `SELECT COUNT(*) as cnt FROM QUEUE WHERE driver_id=? AND date BETWEEN ? AND ? AND status != 'cancelled'`
    ).bind(did, new Date(new Date(date).getTime() - 7*24*60*60*1000).toISOString().slice(0,10), date).first();
    return ok({ driver_id: did, queues_last_7_days: recentQueues?.cnt || 0, policy_ok: (recentQueues?.cnt || 0) < 5 });
  }

  if (action === 'checkDriverDistanceYesterday') {
    const did = sanitize(body.driver_id);
    const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().slice(0,10);
    const q = await DB.prepare(
      `SELECT SUM(mileage_end - mileage_start) as total_km FROM QUEUE WHERE driver_id=? AND date=? AND status='completed'`
    ).bind(did, yesterday).first();
    return ok({ driver_id: did, yesterday_km: q?.total_km || 0 });
  }

  // ── Emergency Overrides ───────────────────────────────────────────────────
  if (action === 'createEmergencyOverride') {
    const adminErr = requirePermission(user, 'queue', 'edit');
    if (adminErr) return adminErr;
    await DB.prepare(`UPDATE QUEUE SET emergency_override=1,override_reason=?,updated_at=? WHERE queue_id=?`)
      .bind(sanitize(body.reason), nowThai(), sanitize(body.queue_id)).run();
    return ok(null, 'บันทึก Emergency Override สำเร็จ');
  }

  if (action === 'getEmergencyOverrides') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const rows = await DB.prepare(`SELECT * FROM QUEUE WHERE emergency_override=1 ORDER BY date DESC LIMIT 100`).all();
    return ok(rows.results);
  }

  if (action === 'getEmergencyOverrideReport') {
    const permErr = requirePermission(user, 'queue', 'view');
    if (permErr) return permErr;
    const rows = await DB.prepare(
      `SELECT qu.*,c.license_plate,d.full_name as driver_name FROM QUEUE qu
       LEFT JOIN CARS c ON qu.car_id=c.car_id
       LEFT JOIN DRIVERS d ON qu.driver_id=d.driver_id
       WHERE qu.emergency_override=1 ORDER BY qu.date DESC LIMIT 200`
    ).all();
    return ok(rows.results);
  }

  // ── Queue Rules ───────────────────────────────────────────────────────────
  if (action === 'getQueueRules') {
    const rules = await DB.prepare(`SELECT * FROM QUEUE_RULES WHERE active=1 ORDER BY created_at DESC`).all();
    return ok(rules.results);
  }

  if (action === 'createQueueRule') {
    const adminErr = requirePermission(user, 'queue', 'create');
    if (adminErr) return adminErr;
    const rid = uuid();
    const d = body.data || body;
    await DB.prepare(
      `INSERT INTO QUEUE_RULES (rule_id,driver_id,assignment_type,description,active,created_at,created_by,notes)
       VALUES (?,?,?,?,?,?,?,?)`
    ).bind(rid, sanitize(d.driver_id), sanitize(d.assignment_type), sanitize(d.description),
      1, nowThai(), user.user_id, sanitize(d.notes)).run();
    return ok({ rule_id: rid }, 'สร้างกฎคิวสำเร็จ');
  }

  if (action === 'updateQueueRule') {
    const adminErr = requirePermission(user, 'queue', 'edit');
    if (adminErr) return adminErr;
    const d = body.data || body;
    await DB.prepare(
      `UPDATE QUEUE_RULES SET assignment_type=?,description=?,active=?,notes=?,updated_at=? WHERE rule_id=?`
    ).bind(sanitize(d.assignment_type), sanitize(d.description), d.active ? 1 : 0,
      sanitize(d.notes), nowThai(), sanitize(d.rule_id || body.rule_id)).run();
    return ok(null, 'อัพเดทกฎคิวสำเร็จ');
  }

  if (action === 'deleteQueueRule') {
    const adminErr = requirePermission(user, 'queue', 'edit');
    if (adminErr) return adminErr;
    await DB.prepare(`UPDATE QUEUE_RULES SET active=0,updated_at=? WHERE rule_id=?`)
      .bind(nowThai(), sanitize(body.rule_id)).run();
    return ok(null, 'ลบกฎคิวแล้ว');
  }

  if (action === 'getDriversForQueue') {
    const rows = await DB.prepare(
      `SELECT d.driver_id,d.full_name,r.assignment_type,r.description
       FROM DRIVERS d LEFT JOIN QUEUE_RULES r ON d.driver_id=r.driver_id AND r.active=1
       WHERE d.status='active' ORDER BY d.full_name`
    ).all();
    return ok(rows.results);
  }

  // ── Autocomplete helpers ──────────────────────────────────────────────────
  if (action === 'searchDestinations') {
    const q = '%' + sanitize(body.query || '') + '%';
    const rows = await DB.prepare(
      `SELECT DISTINCT destination FROM QUEUE WHERE destination LIKE ? AND destination IS NOT NULL LIMIT 10`
    ).bind(q).all();
    return ok(rows.results.map(r => r.destination));
  }

  if (action === 'searchRequestedBy') {
    const q = '%' + sanitize(body.query || '') + '%';
    const rows = await DB.prepare(
      `SELECT DISTINCT requested_by FROM QUEUE WHERE requested_by LIKE ? AND requested_by IS NOT NULL LIMIT 10`
    ).bind(q).all();
    return ok(rows.results.map(r => r.requested_by));
  }

  return fail(`Unknown queue action: ${action}`, 'UNKNOWN_ACTION');
}
