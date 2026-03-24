// Vehicle dispatch queue + scheduling rules
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, requireAdmin, extractParam, writeAuditLog
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);

  if (path === '/api/queue/timeline' && method === 'GET') {
    try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const startDate = url.searchParams.get('start') || now().split('T')[0];
    const endDate = url.searchParams.get('end') || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const rows = await dbAll(env.DB,
      `SELECT q.*, c.brand, c.model, c.license_plate, c.car_type,
              d.display_name as driver_name
       FROM queue q
       LEFT JOIN cars c ON q.car_id = c.id
       LEFT JOIN drivers d ON q.driver_id = d.id
       WHERE q.departure_date BETWEEN ? AND ? AND q.status NOT IN ('cancelled')
       ORDER BY q.departure_date ASC, q.departure_time ASC`,
      [startDate, endDate]
    );
    return success(rows);
  }

  if (path === '/api/queue/rules' && method === 'GET') {
    try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const rules = await dbAll(env.DB, 'SELECT * FROM queue_rules ORDER BY priority DESC');
    return success(rules);
  }

  if (path === '/api/queue/rules' && method === 'PUT') {
    try { requireAdmin(user); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!Array.isArray(body?.rules)) return error('ต้องส่งอาร์เรย์ rules');
    for (const r of body.rules) {
      if (!r.id) continue;
      await dbRun(env.DB,
        `UPDATE queue_rules SET enabled = ?, priority = ?, notes = ?, updated_at = ? WHERE id = ?`,
        [r.enabled ? 1 : 0, r.priority || 0, r.notes || '', now(), r.id]
      );
    }
    return success({ message: 'อัปเดต Queue Rules เรียบร้อย' });
  }

  if (path === '/api/queue' && method === 'GET') {
    try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const status = url.searchParams.get('status');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const where = [];
    const params = [];
    if (status) { where.push('q.status = ?'); params.push(status); }
    if (dateFrom) { where.push('q.departure_date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('q.departure_date <= ?'); params.push(dateTo); }
    const sql = `SELECT q.*, c.brand, c.model, c.license_plate, d.display_name as driver_name
                 FROM queue q
                 LEFT JOIN cars c ON q.car_id = c.id
                 LEFT JOIN drivers d ON q.driver_id = d.id
                 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY q.departure_date DESC, q.departure_time DESC`;
    const rows = await dbAll(env.DB, sql, params);
    return success(rows);
  }

  if (path === '/api/queue' && method === 'POST') {
    try { requirePermission(user, 'queue', 'create'); } catch { return error('ไม่มีสิทธิ์สร้างคิว', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.departure_date) return error('กรุณาระบุยานพาหนะและวันที่');

    // Check conflicts (same car, overlapping date/time, not cancelled)
    const conflict = await dbFirst(env.DB,
      `SELECT id FROM queue WHERE car_id = ? AND departure_date = ? AND status NOT IN ('cancelled', 'frozen')`,
      [body.car_id, body.departure_date]
    );
    if (conflict) return error('ยานพาหนะนี้มีคิวในวันที่เดียวกันแล้ว กรุณาตรวจสอบ');

    const id = generateUUID();
    const ts = now();
    // Generate queue_number: Q + yyyymmdd + seq
    const seq = await dbFirst(env.DB,
      `SELECT COUNT(*) as cnt FROM queue WHERE departure_date = ?`, [body.departure_date]
    );
    const qnum = `Q${body.departure_date.replace(/-/g, '')}${String((seq?.cnt || 0) + 1).padStart(3, '0')}`;

    await dbRun(env.DB,
      `INSERT INTO queue (id, queue_number, car_id, driver_id, requester_id, requester_name,
        purpose, destination, departure_date, departure_time, return_date, return_time,
        passenger_count, status, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [id, qnum, body.car_id, body.driver_id || null, body.requester_id || user.id,
       body.requester_name || user.displayName, body.purpose || '', body.destination || '',
       body.departure_date, body.departure_time || '08:00', body.return_date || body.departure_date,
       body.return_time || '17:00', body.passenger_count || 1, body.notes || '', user.id, ts, ts]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_queue', 'queue', id, { queue_number: qnum });
    return success({ id, queue_number: qnum, message: 'สร้างคิวเรียบร้อย' }, 201);
  }

  if (path.match(/^\/api\/queue\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = extractParam(path, '/api/queue/');
    const row = await dbFirst(env.DB,
      `SELECT q.*, c.brand, c.model, c.license_plate, d.display_name as driver_name
       FROM queue q
       LEFT JOIN cars c ON q.car_id = c.id
       LEFT JOIN drivers d ON q.driver_id = d.id
       WHERE q.id = ?`, [id]
    );
    return row ? success(row) : error('ไม่พบคิว', 404);
  }

  if (path.match(/^\/api\/queue\/[^/]+$/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์แก้ไขคิว', 403); }
    const id = extractParam(path, '/api/queue/');
    const body = await parseBody(request);
    const fields = ['car_id', 'driver_id', 'purpose', 'destination', 'departure_date', 'departure_time',
      'return_date', 'return_time', 'passenger_count', 'status', 'notes', 'requester_name', 'requester_id'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?'); params.push(now(), id);
    await dbRun(env.DB, `UPDATE queue SET ${updates.join(', ')} WHERE id = ?`, params);
    await writeAuditLog(env.DB, user.id, user.displayName, 'update_queue', 'queue', id, null);
    return success({ message: 'อัปเดตคิวเรียบร้อย' });
  }

  if (path.match(/\/api\/queue\/[^/]+\/cancel/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์ยกเลิกคิว', 403); }
    const id = path.split('/')[3];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE queue SET status = 'cancelled', cancel_reason = ?, cancelled_by = ?, updated_at = ? WHERE id = ?`,
      [body?.reason || '', user.id, now(), id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'cancel_queue', 'queue', id, { reason: body?.reason });
    return success({ message: 'ยกเลิกคิวเรียบร้อย' });
  }

  if (path.match(/\/api\/queue\/[^/]+\/freeze/) && method === 'PUT') {
    try { requireAdmin(user); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE queue SET status = 'frozen', freeze_reason = ?, frozen_by = ?, updated_at = ? WHERE id = ?`,
      [body?.reason || '', user.id, now(), id]
    );
    return success({ message: 'ระงับคิวเรียบร้อย' });
  }

  if (path.match(/\/api\/queue\/[^/]+\/unfreeze/) && method === 'PUT') {
    try { requireAdmin(user); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    await dbRun(env.DB,
      `UPDATE queue SET status = 'pending', freeze_reason = NULL, frozen_by = NULL, updated_at = ? WHERE id = ?`,
      [now(), id]
    );
    return success({ message: 'คืนสถานะคิวเรียบร้อย' });
  }

  if (path.match(/\/api\/queue\/[^/]+\/complete/) && method === 'PUT') {
    try { requirePermission(user, 'queue', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[3];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE queue SET status = 'completed', actual_return_date = ?, actual_mileage = ?, updated_at = ? WHERE id = ?`,
      [body?.actual_return_date || now(), body?.actual_mileage || null, now(), id]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'complete_queue', 'queue', id, null);
    return success({ message: 'ปิดคิวเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}