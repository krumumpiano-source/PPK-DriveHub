// PPK DriveHub - Repair & Maintenance Handlers
import { ok, fail, uuid, nowThai, todayThai, writeAudit, sanitize } from '../_helpers.js';
import { requirePermission } from '../_middleware.js';

export async function handleRepair(ctx) {
  const { action, body, user, DB } = ctx;

  // ── Create Repair Log ─────────────────────────────────────────────────────
  if (action === 'createRepairLog') {
    const permErr = requirePermission(user, 'repair', 'create');
    if (permErr) return permErr;
    const d = body.data || body;
    if (!d.car_id || !d.repair_date) return fail('กรุณาระบุรถและวันที่', 'INVALID_INPUT');
    const rid = uuid();
    await DB.prepare(
      `INSERT INTO REPAIR_LOG (repair_id,car_id,driver_id,queue_id,repair_date,repair_type,
       description,mechanic,garage_name,parts_cost,labor_cost,total_cost,mileage_at_repair,
       status,images,notes,created_at,created_by,completed_at,next_repair_km,next_repair_date)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(rid, sanitize(d.car_id), sanitize(d.driver_id), sanitize(d.queue_id),
      sanitize(d.repair_date), sanitize(d.repair_type), sanitize(d.description),
      sanitize(d.mechanic), sanitize(d.garage_name),
      d.parts_cost||null, d.labor_cost||null, d.total_cost||null,
      d.mileage_at_repair||null, d.status||'pending',
      d.images||null, sanitize(d.notes), nowThai(), user.user_id,
      null, d.next_repair_km||null, sanitize(d.next_repair_date)
    ).run();

    // If repair is complete, update car status
    if ((d.status || '') === 'completed') {
      await DB.prepare(`UPDATE CARS SET status='active',updated_at=? WHERE car_id=? AND status='repair'`)
        .bind(nowThai(), d.car_id).run();
    } else if (!d.status || d.status === 'pending') {
      await DB.prepare(`UPDATE CARS SET status='repair',updated_at=? WHERE car_id=?`)
        .bind(nowThai(), d.car_id).run();
    }

    await writeAudit(DB, user.user_id, 'createRepairLog', 'REPAIR_LOG', rid, `${d.car_id} ${d.repair_type}`);
    return ok({ repair_id: rid }, 'บันทึกการซ่อมสำเร็จ');
  }

  // ── Get Repair Logs ───────────────────────────────────────────────────────
  if (action === 'getRepairLogs') {
    const permErr = requirePermission(user, 'repair', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT r.*,c.license_plate,c.brand,c.model FROM REPAIR_LOG r
             LEFT JOIN CARS c ON r.car_id=c.car_id WHERE 1=1`;
    if (body.car_id) { q += ' AND r.car_id=?'; params.push(sanitize(body.car_id)); }
    if (body.status) { q += ' AND r.status=?'; params.push(sanitize(body.status)); }
    if (body.date_from) { q += ' AND r.repair_date>=?'; params.push(sanitize(body.date_from)); }
    if (body.date_to) { q += ' AND r.repair_date<=?'; params.push(sanitize(body.date_to)); }
    q += ' ORDER BY r.repair_date DESC, r.created_at DESC LIMIT 200';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  // ── Get Repair Log By ID ──────────────────────────────────────────────────
  if (action === 'getRepairLogById') {
    const permErr = requirePermission(user, 'repair', 'view');
    if (permErr) return permErr;
    const r = await DB.prepare(
      `SELECT r.*,c.license_plate,c.brand,c.model FROM REPAIR_LOG r
       LEFT JOIN CARS c ON r.car_id=c.car_id WHERE r.repair_id=?`
    ).bind(sanitize(body.repair_id)).first();
    if (!r) return fail('ไม่พบบันทึกการซ่อม', 'NOT_FOUND', 404);
    return ok(r);
  }

  // ── Update Repair Log ─────────────────────────────────────────────────────
  if (action === 'updateRepairLog') {
    const permErr = requirePermission(user, 'repair', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const rid = sanitize(d.repair_id || body.repair_id);
    const fields = ['repair_date','repair_type','description','mechanic','garage_name',
      'parts_cost','labor_cost','total_cost','mileage_at_repair','status','notes',
      'next_repair_km','next_repair_date'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (d[f] !== undefined) { updates.push(`${f}=?`); params.push(['parts_cost','labor_cost','total_cost','mileage_at_repair','next_repair_km'].includes(f) ? d[f] : sanitize(d[f])); }
    }
    updates.push('updated_at=?'); params.push(nowThai());
    params.push(rid);
    if (updates.length > 1) {
      await DB.prepare(`UPDATE REPAIR_LOG SET ${updates.join(',')} WHERE repair_id=?`).bind(...params).run();
    }
    await writeAudit(DB, user.user_id, 'updateRepairLog', 'REPAIR_LOG', rid, '');
    return ok(null, 'อัพเดทบันทึกการซ่อมสำเร็จ');
  }

  // ── Complete Repair ───────────────────────────────────────────────────────
  if (action === 'completeRepair') {
    const permErr = requirePermission(user, 'repair', 'edit');
    if (permErr) return permErr;
    const rid = sanitize(body.repair_id);
    const r = await DB.prepare(`SELECT car_id FROM REPAIR_LOG WHERE repair_id=?`).bind(rid).first();
    await DB.prepare(`UPDATE REPAIR_LOG SET status='completed',completed_at=?,notes=?,updated_at=? WHERE repair_id=?`)
      .bind(nowThai(), sanitize(body.notes), nowThai(), rid).run();
    if (r?.car_id) {
      // Only unlock if no other pending repairs remain
      const other = await DB.prepare(`SELECT repair_id FROM REPAIR_LOG WHERE car_id=? AND status IN ('pending','in_progress') AND repair_id!=?`)
        .bind(r.car_id, rid).first();
      if (!other) {
        await DB.prepare(`UPDATE CARS SET status='active',updated_at=? WHERE car_id=? AND status='repair'`)
          .bind(nowThai(), r.car_id).run();
      }
    }
    await writeAudit(DB, user.user_id, 'completeRepair', 'REPAIR_LOG', rid, '');
    return ok(null, 'ซ่อมเสร็จแล้ว');
  }

  // ── Scheduled Repairs ─────────────────────────────────────────────────────
  if (action === 'createScheduledRepair') {
    const permErr = requirePermission(user, 'repair', 'create');
    if (permErr) return permErr;
    const d = body.data || body;
    if (!d.car_id || !d.scheduled_date) return fail('กรุณาระบุรถและวันนัด', 'INVALID_INPUT');
    const sid = uuid();
    await DB.prepare(
      `INSERT INTO SCHEDULED_REPAIRS (scheduled_repair_id,car_id,scheduled_date,repair_type,
       description,estimated_cost,status,notes,created_at,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(sid, sanitize(d.car_id), sanitize(d.scheduled_date), sanitize(d.repair_type),
      sanitize(d.description), d.estimated_cost||null, 'scheduled',
      sanitize(d.notes), nowThai(), user.user_id).run();

    await writeAudit(DB, user.user_id, 'createScheduledRepair', 'SCHEDULED_REPAIRS', sid, `${d.car_id} ${d.scheduled_date}`);
    return ok({ scheduled_repair_id: sid }, 'สร้างนัดซ่อมสำเร็จ');
  }

  if (action === 'getScheduledRepairs') {
    const permErr = requirePermission(user, 'repair', 'view');
    if (permErr) return permErr;
    const params = [];
    let q = `SELECT sr.*,c.license_plate,c.brand,c.model FROM SCHEDULED_REPAIRS sr
             LEFT JOIN CARS c ON sr.car_id=c.car_id WHERE 1=1`;
    if (body.car_id) { q += ' AND sr.car_id=?'; params.push(sanitize(body.car_id)); }
    if (body.status) { q += ' AND sr.status=?'; params.push(sanitize(body.status)); }
    q += ' ORDER BY sr.scheduled_date ASC LIMIT 100';
    const rows = await DB.prepare(q).bind(...params).all();
    return ok(rows.results);
  }

  if (action === 'getScheduledRepairById') {
    const permErr = requirePermission(user, 'repair', 'view');
    if (permErr) return permErr;
    const r = await DB.prepare(
      `SELECT sr.*,c.license_plate FROM SCHEDULED_REPAIRS sr LEFT JOIN CARS c ON sr.car_id=c.car_id WHERE sr.scheduled_repair_id=?`
    ).bind(sanitize(body.scheduled_repair_id)).first();
    if (!r) return fail('ไม่พบนัดซ่อม', 'NOT_FOUND', 404);
    return ok(r);
  }

  if (action === 'updateScheduledRepair') {
    const permErr = requirePermission(user, 'repair', 'edit');
    if (permErr) return permErr;
    const d = body.data || body;
    const sid = sanitize(d.scheduled_repair_id || body.scheduled_repair_id);
    await DB.prepare(`UPDATE SCHEDULED_REPAIRS SET scheduled_date=?,repair_type=?,description=?,estimated_cost=?,status=?,notes=?,updated_at=? WHERE scheduled_repair_id=?`)
      .bind(sanitize(d.scheduled_date), sanitize(d.repair_type), sanitize(d.description),
        d.estimated_cost||null, sanitize(d.status), sanitize(d.notes), nowThai(), sid).run();
    return ok(null, 'อัพเดทนัดซ่อมสำเร็จ');
  }

  if (action === 'cancelScheduledRepair') {
    const permErr = requirePermission(user, 'repair', 'edit');
    if (permErr) return permErr;
    await DB.prepare(`UPDATE SCHEDULED_REPAIRS SET status='cancelled',notes=?,updated_at=? WHERE scheduled_repair_id=?`)
      .bind(sanitize(body.reason), nowThai(), sanitize(body.scheduled_repair_id)).run();
    return ok(null, 'ยกเลิกนัดซ่อมแล้ว');
  }

  // ── Convert Scheduled → Actual Repair ────────────────────────────────────
  if (action === 'convertScheduledRepairToRepair') {
    const permErr = requirePermission(user, 'repair', 'create');
    if (permErr) return permErr;
    const sid = sanitize(body.scheduled_repair_id);
    const sr = await DB.prepare(`SELECT * FROM SCHEDULED_REPAIRS WHERE scheduled_repair_id=?`).bind(sid).first();
    if (!sr) return fail('ไม่พบนัดซ่อม', 'NOT_FOUND', 404);
    const newRepair = await handleRepair({
      ...ctx, action: 'createRepairLog',
      body: {
        car_id: sr.car_id, repair_date: todayThai(),
        repair_type: sr.repair_type, description: sr.description,
        notes: `แปลงจากนัดซ่อม: ${sid}`, status: 'pending'
      }
    });
    await DB.prepare(`UPDATE SCHEDULED_REPAIRS SET status='converted',updated_at=? WHERE scheduled_repair_id=?`)
      .bind(nowThai(), sid).run();
    return newRepair;
  }

  if (action === 'getRepairTypes') {
    return ok(['เปลี่ยนน้ำมันเครื่อง','เปลี่ยนยาง','เปลี่ยนเบรก','ซ่อมเครื่องยนต์',
      'เปลี่ยนแบตเตอรี่','ซ่อมระบบไฟฟ้า','ซ่อมเครื่องปรับอากาศ','ตรวจสภาพรถ','อื่นๆ']);
  }

  // ── Repair statistics ─────────────────────────────────────────────────────
  if (action === 'getRepairSummaryByVehicle') {
    const permErr = requirePermission(user, 'repair', 'view');
    if (permErr) return permErr;
    const rows = await DB.prepare(
      `SELECT c.car_id,c.license_plate,c.brand,c.model,
       COUNT(r.repair_id) as repair_count, SUM(r.total_cost) as total_cost
       FROM CARS c LEFT JOIN REPAIR_LOG r ON c.car_id=r.car_id
       WHERE c.active=1 GROUP BY c.car_id ORDER BY total_cost DESC`
    ).all();
    return ok(rows.results);
  }

  if (action === 'getPendingRepairs') {
    const permErr = requirePermission(user, 'repair', 'view');
    if (permErr) return permErr;
    const rows = await DB.prepare(
      `SELECT r.*,c.license_plate,c.brand,c.model FROM REPAIR_LOG r
       LEFT JOIN CARS c ON r.car_id=c.car_id
       WHERE r.status IN ('pending','in_progress')
       ORDER BY r.repair_date ASC LIMIT 100`
    ).all();
    return ok(rows.results);
  }

  return fail(`Unknown repair action: ${action}`, 'UNKNOWN_ACTION');
}
