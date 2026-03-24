// PPK DriveHub - Admin / Settings / Maintenance / Leaves / Notifications / Audit handlers
import { ok, fail, uuid, nowThai, todayThai, writeAudit, sanitize } from '../_helpers.js';
import { requirePermission } from '../_middleware.js';

export async function handleAdmin(ctx) {
  const { action, body, user, DB } = ctx;

  // ════════════════════════════════════════════════════════════════════════════
  // SYSTEM SETTINGS (MASTER table)
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getSystemSettings') {
    const rows = await DB.prepare(`SELECT key,value,description,updated_at FROM MASTER ORDER BY key`).all();
    const settings = {};
    for (const r of rows.results) {
      try { settings[r.key] = JSON.parse(r.value); }
      catch { settings[r.key] = r.value; }
    }
    return ok(settings);
  }

  if (action === 'getSystemSetting' || action === 'getSettingByKey') {
    const r = await DB.prepare(`SELECT key,value FROM MASTER WHERE key=?`).bind(sanitize(body.key)).first();
    if (!r) return fail('ไม่พบ setting', 'NOT_FOUND', 404);
    try { return ok({ key: r.key, value: JSON.parse(r.value) }); }
    catch { return ok({ key: r.key, value: r.value }); }
  }

  if (action === 'updateSystemSetting') {
    const permErr = requirePermission(user, 'settings', 'edit');
    if (permErr) return permErr;
    const val = typeof body.value === 'object' ? JSON.stringify(body.value) : String(body.value);
    await DB.prepare(`INSERT OR REPLACE INTO MASTER (key,value,updated_at,updated_by) VALUES (?,?,?,?)`)
      .bind(sanitize(body.key), val, nowThai(), user.user_id).run();
    await writeAudit(DB, user.user_id, 'updateSystemSetting', 'MASTER', body.key, '');
    return ok(null, 'บันทึก setting สำเร็จ');
  }

  if (action === 'getDefaultSettings') {
    return ok({
      fuel_types: ['เบนซิน 91','เบนซิน 95','แก๊สโซฮอล์ E20','แก๊สโซฮอล์ E85','ดีเซล B7','ดีเซล B20','แก๊ส NGV','แก๊ส LPG','ไฟฟ้า','อื่นๆ'],
      max_queue_per_day: 10, fatigue_distance_limit: 500, fatigue_hours_limit: 10,
      recovery_day_count: 1, min_password_length: 8, require_pdpa: true,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN SETTINGS (advanced — same MASTER table with 'admin_' prefix)
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getAdminSettings') {
    const rows = await DB.prepare(`SELECT key,value FROM MASTER WHERE key LIKE 'admin_%' ORDER BY key`).all();
    const settings = {};
    for (const r of rows.results) {
      try { settings[r.key.replace('admin_','')] = JSON.parse(r.value); }
      catch { settings[r.key.replace('admin_','')] = r.value; }
    }
    return ok(settings);
  }

  if (action === 'updateAdminSetting') {
    const permErr = requirePermission(user, 'settings', 'edit');
    if (permErr) return permErr;
    const key = 'admin_' + sanitize(body.key).replace(/^admin_/, '');
    const val = typeof body.value === 'object' ? JSON.stringify(body.value) : String(body.value);
    await DB.prepare(`INSERT OR REPLACE INTO MASTER (key,value,updated_at,updated_by) VALUES (?,?,?,?)`)
      .bind(key, val, nowThai(), user.user_id).run();
    return ok(null, 'บันทึก admin setting สำเร็จ');
  }

  if (action === 'resetAdminSettingsToDefault') {
    const permErr = requirePermission(user, 'settings', 'edit');
    if (permErr) return permErr;
    await DB.prepare(`DELETE FROM MASTER WHERE key LIKE 'admin_%'`).run();
    return ok(null, 'รีเซ็ต admin settings แล้ว');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MAINTENANCE SETTINGS
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getMaintenanceSettings') {
    const rows = await DB.prepare(`SELECT * FROM MAINTENANCE_SETTINGS WHERE active=1 ORDER BY maintenance_type`).all();
    return ok(rows.results);
  }

  if (action === 'updateMaintenanceSettings' || action === 'setMaintenanceSetting') {
    const permErr = requirePermission(user, 'maintenance', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const existing = await DB.prepare(`SELECT setting_id FROM MAINTENANCE_SETTINGS WHERE maintenance_type=?`)
      .bind(sanitize(d.maintenance_type)).first();
    if (existing) {
      await DB.prepare(
        `UPDATE MAINTENANCE_SETTINGS SET interval_km=?,interval_days=?,warning_km=?,warning_days=?,active=?,updated_at=? WHERE maintenance_type=?`
      ).bind(d.interval_km||null, d.interval_days||null, d.warning_km||null, d.warning_days||null,
        d.active===false ? 0 : 1, nowThai(), sanitize(d.maintenance_type)).run();
    } else {
      await DB.prepare(
        `INSERT INTO MAINTENANCE_SETTINGS (setting_id,maintenance_type,interval_km,interval_days,warning_km,warning_days,active,created_at,description)
         VALUES (?,?,?,?,?,?,?,?,?)`
      ).bind(uuid(), sanitize(d.maintenance_type), d.interval_km||null, d.interval_days||null,
        d.warning_km||null, d.warning_days||null, 1, nowThai(), sanitize(d.description)).run();
    }
    return ok(null, 'บันทึกการตั้งค่าการบำรุงรักษาสำเร็จ');
  }

  if (action === 'getNextMaintenanceForCar') {
    const cid = sanitize(body.car_id);
    const car = await DB.prepare(`SELECT mileage FROM CARS WHERE car_id=?`).bind(cid).first();
    const lastMaint = await DB.prepare(
      `SELECT * FROM VEHICLE_MAINTENANCE WHERE car_id=? ORDER BY maintenance_date DESC LIMIT 1`
    ).bind(cid).first();
    const settings = await DB.prepare(`SELECT * FROM MAINTENANCE_SETTINGS WHERE active=1`).all();
    const results = [];
    for (const s of settings.results) {
      let next_km = null, next_date = null, overdue = false;
      if (lastMaint?.mileage && s.interval_km) {
        next_km = Number(lastMaint.mileage) + s.interval_km;
        overdue = car?.mileage && Number(car.mileage) >= next_km;
      }
      if (lastMaint?.maintenance_date && s.interval_days) {
        const nextDate = new Date(lastMaint.maintenance_date);
        nextDate.setDate(nextDate.getDate() + s.interval_days);
        next_date = nextDate.toISOString().slice(0, 10);
        overdue = overdue || next_date <= todayThai();
      }
      results.push({ ...s, next_km, next_date, overdue, last_maintenance: lastMaint });
    }
    return ok(results);
  }

  if (action === 'getVehicleMaintenanceLast') {
    const rows = await DB.prepare(`SELECT * FROM VEHICLE_MAINTENANCE WHERE car_id=? ORDER BY maintenance_date DESC LIMIT 10`)
      .bind(sanitize(body.car_id)).all();
    return ok(rows.results);
  }

  if (action === 'recordVehicleMaintenance' || action === 'setVehicleMaintenanceLast') {
    const permErr = requirePermission(user, 'maintenance', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const mid = uuid();
    await DB.prepare(
      `INSERT INTO VEHICLE_MAINTENANCE (maintenance_id,car_id,maintenance_date,maintenance_type,
       mileage,cost,description,notes,created_at,created_by,next_maintenance_km,next_maintenance_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(mid, sanitize(d.car_id), sanitize(d.maintenance_date || todayThai()),
      sanitize(d.maintenance_type), d.mileage||null, d.cost||null,
      sanitize(d.description), sanitize(d.notes), nowThai(), user.user_id,
      d.next_maintenance_km||null, sanitize(d.next_maintenance_date)).run();
    await writeAudit(DB, user.user_id, 'recordVehicleMaintenance', 'VEHICLE_MAINTENANCE', mid, d.car_id);
    return ok({ maintenance_id: mid }, 'บันทึกการบำรุงรักษาสำเร็จ');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LEAVES
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'createLeave' || action === 'createDriverLeave') {
    const d = body.data || body;
    if (!d.driver_id || !d.start_date || !d.end_date) return fail('กรุณาระบุข้อมูลการลา', 'INVALID_INPUT');
    const lid = uuid();
    await DB.prepare(
      `INSERT INTO LEAVES (leave_id,driver_id,leave_type,start_date,end_date,reason,status,notes,created_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(lid, sanitize(d.driver_id), sanitize(d.leave_type || 'annual'),
      sanitize(d.start_date), sanitize(d.end_date), sanitize(d.reason),
      'pending', sanitize(d.notes), nowThai(), user.user_id).run();
    return ok({ leave_id: lid }, 'ส่งใบลาสำเร็จ');
  }

  if (action === 'getLeaves') {
    const permErr = requirePermission(user, 'leaves', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT l.*,d.full_name as driver_name FROM LEAVES l
             LEFT JOIN DRIVERS d ON l.driver_id=d.driver_id WHERE 1=1`;
    if (body.driver_id) { q += ' AND l.driver_id=?'; params.push(sanitize(body.driver_id)); }
    if (body.status) { q += ' AND l.status=?'; params.push(sanitize(body.status)); }
    if (body.date_from) { q += ' AND l.start_date>=?'; params.push(sanitize(body.date_from)); }
    q += ' ORDER BY l.start_date DESC LIMIT 200';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  if (action === 'getDriverLeaves') {
    const rows = await DB.prepare(
      `SELECT * FROM LEAVES WHERE driver_id=? ORDER BY start_date DESC LIMIT 50`
    ).bind(sanitize(body.driver_id)).all();
    return ok(rows.results);
  }

  if (action === 'updateLeave') {
    const d = body.data || body;
    const lid = sanitize(d.leave_id || body.leave_id);
    await DB.prepare(`UPDATE LEAVES SET leave_type=?,start_date=?,end_date=?,reason=?,notes=?,updated_at=? WHERE leave_id=?`)
      .bind(sanitize(d.leave_type), sanitize(d.start_date), sanitize(d.end_date),
        sanitize(d.reason), sanitize(d.notes), nowThai(), lid).run();
    return ok(null, 'อัพเดทใบลาสำเร็จ');
  }

  if (action === 'cancelLeave' || action === 'deleteDriverLeave') {
    await DB.prepare(`UPDATE LEAVES SET status='cancelled',updated_at=? WHERE leave_id=?`)
      .bind(nowThai(), sanitize(body.leave_id)).run();
    return ok(null, 'ยกเลิกใบลาแล้ว');
  }

  if (action === 'approveLeave') {
    const permErr = requirePermission(user, 'leaves', 'edit');
    if (permErr) return permErr;
    await DB.prepare(`UPDATE LEAVES SET status='approved',approved_by=?,approved_at=?,notes=?,updated_at=? WHERE leave_id=?`)
      .bind(user.user_id, nowThai(), sanitize(body.notes), nowThai(), sanitize(body.leave_id)).run();
    return ok(null, 'อนุมัติใบลาแล้ว');
  }

  if (action === 'rejectLeave') {
    const permErr = requirePermission(user, 'leaves', 'edit');
    if (permErr) return permErr;
    await DB.prepare(`UPDATE LEAVES SET status='rejected',notes=?,updated_at=? WHERE leave_id=?`)
      .bind(sanitize(body.reason || body.notes), nowThai(), sanitize(body.leave_id)).run();
    return ok(null, 'ปฏิเสธใบลาแล้ว');
  }

  if (action === 'isDriverOnLeave') {
    const did = sanitize(body.driver_id);
    const date = sanitize(body.date || todayThai());
    const r = await DB.prepare(
      `SELECT leave_id,leave_type,start_date,end_date FROM LEAVES WHERE driver_id=? AND status='approved' AND start_date<=? AND end_date>=?`
    ).bind(did, date, date).first();
    return ok({ on_leave: !!r, leave_info: r || null });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getNotifications') {
    const uid = sanitize(body.user_id || user.user_id);
    // If admin, can get all, else only own
    const target = (user.role === 'admin' || user.role === 'superadmin') && body.user_id ? uid : user.user_id;
    const params = [target];
    let q = `SELECT * FROM NOTIFICATIONS WHERE user_id=?`;
    if (body.unread_only) { q += ' AND read=0'; }
    q += ' ORDER BY created_at DESC LIMIT 50';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  if (action === 'markNotificationRead') {
    const nid = sanitize(body.notification_id);
    await DB.prepare(`UPDATE NOTIFICATIONS SET read=1,read_at=? WHERE notification_id=? AND user_id=?`)
      .bind(nowThai(), nid, user.user_id).run();
    return ok(null, 'อ่านการแจ้งเตือนแล้ว');
  }

  if (action === 'markAllNotificationsRead') {
    await DB.prepare(`UPDATE NOTIFICATIONS SET read=1,read_at=? WHERE user_id=? AND read=0`)
      .bind(nowThai(), user.user_id).run();
    return ok(null, 'อ่านการแจ้งเตือนทั้งหมดแล้ว');
  }

  if (action === 'createNotification') {
    const permErr = requirePermission(user, 'notifications', 'create');
    if (permErr) return permErr;
    const nid = uuid();
    await DB.prepare(`INSERT INTO NOTIFICATIONS (notification_id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(nid, sanitize(body.user_id), sanitize(body.type), sanitize(body.title), sanitize(body.message), 0, nowThai()).run();
    return ok({ notification_id: nid }, 'ส่งการแจ้งเตือนสำเร็จ');
  }

  if (action === 'getUnreadCount') {
    const r = await DB.prepare(`SELECT COUNT(*) as cnt FROM NOTIFICATIONS WHERE user_id=? AND read=0`).bind(user.user_id).first();
    return ok({ count: r?.cnt || 0 });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AUDIT LOG
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getAuditLogs') {
    const permErr = requirePermission(user, 'audit', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT al.*,u.full_name FROM AUDIT_LOG al LEFT JOIN USERS u ON al.user_id=u.user_id WHERE 1=1`;
    if (body.entity_type) { q += ' AND al.entity_type=?'; params.push(sanitize(body.entity_type)); }
    if (body.user_id) { q += ' AND al.user_id=?'; params.push(sanitize(body.user_id)); }
    if (body.date_from) { q += ' AND DATE(al.created_at)>=?'; params.push(sanitize(body.date_from)); }
    if (body.date_to) { q += ' AND DATE(al.created_at)<=?'; params.push(sanitize(body.date_to)); }
    q += ' ORDER BY al.created_at DESC LIMIT 500';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TAX & INSURANCE
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'createTaxRecord') {
    const permErr = requirePermission(user, 'tax', 'create');
    if (permErr) return permErr;
    const d = body.data || body;
    const tid = uuid();
    await DB.prepare(
      `INSERT INTO TAX_RECORDS (tax_id,car_id,tax_year,tax_amount,payment_date,expiry_date,
       receipt_image,notes,created_at,created_by,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(tid, sanitize(d.car_id), sanitize(d.tax_year),
      d.tax_amount||null, sanitize(d.payment_date), sanitize(d.expiry_date),
      d.receipt_image||null, sanitize(d.notes), nowThai(), user.user_id, 'active').run();
    return ok({ tax_id: tid }, 'บันทึกภาษีรถสำเร็จ');
  }

  if (action === 'getTaxRecords') {
    const permErr = requirePermission(user, 'tax', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT t.*,c.license_plate FROM TAX_RECORDS t LEFT JOIN CARS c ON t.car_id=c.car_id WHERE 1=1`;
    if (body.car_id) { q += ' AND t.car_id=?'; params.push(sanitize(body.car_id)); }
    if (body.tax_year) { q += ' AND t.tax_year=?'; params.push(sanitize(body.tax_year)); }
    q += ' ORDER BY t.expiry_date ASC LIMIT 100';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  if (action === 'updateTaxRecord') {
    const permErr = requirePermission(user, 'tax', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const tid = sanitize(d.tax_id || body.tax_id);
    await DB.prepare(`UPDATE TAX_RECORDS SET tax_year=?,tax_amount=?,payment_date=?,expiry_date=?,notes=?,updated_at=? WHERE tax_id=?`)
      .bind(sanitize(d.tax_year), d.tax_amount||null, sanitize(d.payment_date), sanitize(d.expiry_date), sanitize(d.notes), nowThai(), tid).run();
    return ok(null, 'อัพเดทข้อมูลภาษีสำเร็จ');
  }

  if (action === 'getExpiringTaxRecords') {
    const permErr = requirePermission(user, 'tax', 'view');
    if (permErr) return permErr;
    const days = Number(body.days || 30);
    const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = await DB.prepare(
      `SELECT t.*,c.license_plate FROM TAX_RECORDS t LEFT JOIN CARS c ON t.car_id=c.car_id
       WHERE t.expiry_date<=? AND t.status='active' ORDER BY t.expiry_date ASC`
    ).bind(limit).all();
    return ok(rows.results);
  }

  if (action === 'createInsuranceRecord') {
    const permErr = requirePermission(user, 'insurance', 'create');
    if (permErr) return permErr;
    const d = body.data || body;
    const iid = uuid();
    await DB.prepare(
      `INSERT INTO INSURANCE_RECORDS (insurance_id,car_id,insurance_company,policy_number,
       insurance_type,coverage_amount,premium_amount,payment_date,start_date,end_date,
       policy_image,notes,created_at,created_by,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(iid, sanitize(d.car_id), sanitize(d.insurance_company), sanitize(d.policy_number),
      sanitize(d.insurance_type), d.coverage_amount||null, d.premium_amount||null,
      sanitize(d.payment_date), sanitize(d.start_date), sanitize(d.end_date),
      d.policy_image||null, sanitize(d.notes), nowThai(), user.user_id, 'active').run();
    return ok({ insurance_id: iid }, 'บันทึกประกันรถสำเร็จ');
  }

  if (action === 'getInsuranceRecords') {
    const permErr = requirePermission(user, 'insurance', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT i.*,c.license_plate FROM INSURANCE_RECORDS i LEFT JOIN CARS c ON i.car_id=c.car_id WHERE 1=1`;
    if (body.car_id) { q += ' AND i.car_id=?'; params.push(sanitize(body.car_id)); }
    q += ' ORDER BY i.end_date ASC LIMIT 100';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  if (action === 'updateInsuranceRecord') {
    const permErr = requirePermission(user, 'insurance', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const iid = sanitize(d.insurance_id || body.insurance_id);
    await DB.prepare(
      `UPDATE INSURANCE_RECORDS SET insurance_company=?,policy_number=?,insurance_type=?,coverage_amount=?,
       premium_amount=?,payment_date=?,start_date=?,end_date=?,notes=?,updated_at=? WHERE insurance_id=?`
    ).bind(sanitize(d.insurance_company), sanitize(d.policy_number), sanitize(d.insurance_type),
      d.coverage_amount||null, d.premium_amount||null, sanitize(d.payment_date),
      sanitize(d.start_date), sanitize(d.end_date), sanitize(d.notes), nowThai(), iid).run();
    return ok(null, 'อัพเดทประกันรถสำเร็จ');
  }

  if (action === 'getExpiringInsuranceRecords') {
    const permErr = requirePermission(user, 'insurance', 'view');
    if (permErr) return permErr;
    const days = Number(body.days || 30);
    const limit = new Date(Date.now() + days * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = await DB.prepare(
      `SELECT i.*,c.license_plate FROM INSURANCE_RECORDS i LEFT JOIN CARS c ON i.car_id=c.car_id
       WHERE i.end_date<=? AND i.status='active' ORDER BY i.end_date ASC`
    ).bind(limit).all();
    return ok(rows.results);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BACKUP / RESTORE
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'dailyBackup' || action === 'createSystemSnapshot') {
    if (user.role !== 'admin' && user.role !== 'superadmin') return fail('เฉพาะ admin', 'FORBIDDEN', 403);
    const sid = uuid();
    const tables = ['USERS','CARS','DRIVERS','QUEUE','FUEL_LOG','REPAIR_LOG','CHECK_LOG',
      'MAINTENANCE_SETTINGS','VEHICLE_MAINTENANCE','LEAVES','NOTIFICATIONS','AUDIT_LOG',
      'TAX_RECORDS','INSURANCE_RECORDS','USAGE_RECORDS','SCHEDULED_REPAIRS'];
    const snapshot = {};
    for (const t of tables) {
      try {
        const rows = await DB.prepare(`SELECT * FROM ${t} LIMIT 5000`).all();
        snapshot[t] = rows.results;
      } catch { snapshot[t] = []; }
    }
    await DB.prepare(
      `INSERT INTO SYSTEM_SNAPSHOT (snapshot_id,snapshot_date,data,created_at,created_by)
       VALUES (?,?,?,?,?)`
    ).bind(sid, todayThai(), JSON.stringify(snapshot), nowThai(), user.user_id).run();
    await writeAudit(DB, user.user_id, 'dailyBackup', 'SYSTEM_SNAPSHOT', sid, '');
    return ok({ snapshot_id: sid, tables_backed_up: tables.length }, 'สำรองข้อมูลสำเร็จ');
  }

  if (action === 'getSystemSnapshots') {
    if (user.role !== 'admin' && user.role !== 'superadmin') return fail('เฉพาะ admin', 'FORBIDDEN', 403);
    const rows = await DB.prepare(`SELECT snapshot_id,snapshot_date,created_at,created_by FROM SYSTEM_SNAPSHOT ORDER BY created_at DESC LIMIT 20`).all();
    return ok(rows.results);
  }

  if (action === 'restoreBackup') {
    if (user.role !== 'superadmin') return fail('เฉพาะ superadmin เท่านั้น', 'FORBIDDEN', 403);
    const snap = await DB.prepare(`SELECT data FROM SYSTEM_SNAPSHOT WHERE snapshot_id=?`)
      .bind(sanitize(body.snapshot_id)).first();
    if (!snap) return fail('ไม่พบ snapshot', 'NOT_FOUND', 404);
    // Note: restore is provided as info only — actual restore requires manual DB operation
    return ok({ snapshot_id: body.snapshot_id, message: 'กรุณา restore ผ่าน Cloudflare D1 console โดยตรง (safety measure)' });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PDPA (admin view)
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'viewPDPALog') {
    const permErr = requirePermission(user, 'audit', 'view');
    if (permErr) return permErr;
    const rows = await DB.prepare(`SELECT pl.*,u.full_name FROM PDPA_LOG pl LEFT JOIN USERS u ON pl.user_id=u.user_id ORDER BY pl.accepted_at DESC LIMIT 200`).all();
    return ok(rows.results);
  }

  if (action === 'getPDPAStats') {
    const total = await DB.prepare(`SELECT COUNT(DISTINCT user_id) as cnt FROM PDPA_LOG`).first();
    return ok({ total_accepted: total?.cnt || 0 });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SYSTEM CRON — scheduled daily at 01:00 UTC (08:00 Thai time)
  // ════════════════════════════════════════════════════════════════════════════
  if (action === '_cronDailyJob') {
    // Auto-complete overdue queues
    const yesterday = new Date(Date.now() + 7 * 60 * 60 * 1000 - 86400000).toISOString().slice(0, 10);
    await DB.prepare(
      `UPDATE QUEUE SET status='completed',ended_at=?,notes='Auto-completed: overdue',updated_at=? 
       WHERE status='ongoing' AND date < ?`
    ).bind(nowThai(), nowThai(), yesterday).run();

    // Clean up expired rate limiting
    const cutoff = new Date(Date.now() + 7 * 60 * 60 * 1000 - 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    const rl = await DB.prepare(`SELECT value FROM MASTER WHERE key='rate_limit_cache'`).first();
    if (rl) {
      try {
        const cache = JSON.parse(rl.value);
        const cleaned = {};
        for (const [k, v] of Object.entries(cache)) {
          if (v.reset_at > cutoff) cleaned[k] = v;
        }
        await DB.prepare(`UPDATE MASTER SET value=?,updated_at=? WHERE key='rate_limit_cache'`)
          .bind(JSON.stringify(cleaned), nowThai()).run();
      } catch { /* ignore */ }
    }

    // Daily snapshot
    const sid = uuid();
    const countRows = await DB.prepare(
      `SELECT 
        (SELECT COUNT(*) FROM QUEUE WHERE date=?) as queue_today,
        (SELECT COUNT(*) FROM CARS WHERE active=1) as total_cars,
        (SELECT COUNT(*) FROM DRIVERS WHERE status='active') as total_drivers,
        (SELECT COUNT(*) FROM REPAIR_LOG WHERE status IN ('pending','in_progress')) as pending_repairs`
    ).bind(yesterday).first();
    await DB.prepare(`INSERT INTO SYSTEM_SNAPSHOT (snapshot_id,snapshot_date,data,created_at,created_by) VALUES (?,?,?,?,?)`)
      .bind(sid, yesterday, JSON.stringify(countRows), nowThai(), 'system').run();

    return ok({ success: true, snapshot_id: sid }, 'Daily job completed');
  }

  return fail(`Unknown admin action: ${action}`, 'UNKNOWN_ACTION');
}
