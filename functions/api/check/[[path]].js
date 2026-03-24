// PPK DriveHub — Daily Check API
// POST /api/check/daily   (public — QR daily check-in)
// GET  /api/check/log     (auth)
// GET  /api/check/alerts  (auth)
// PUT  /api/check/alerts/:id/resolve

import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, uploadToR2
} from '../../_helpers.js';

const ALERT_THRESHOLDS = {
  tire: 30,       // days before scheduled check
  brake: 20000,   // km overdue
  oil: 5000,      // km or 30 days
};

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  // PUBLIC — QR daily check submit
  if (path === '/api/check/daily' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุ car_id');
    const car = await dbFirst(env.DB,
      'SELECT id, car_id FROM cars WHERE car_id = ? AND active = 1', [body.car_id]
    );
    if (!car) return error('ไม่พบยานพาหนะ');

    const id = generateUUID();
    const ts = now();

    // Handle multiple images (dashboard, exterior etc.)
    let dashboardUrl = '';
    if (body.dashboard_base64 && body.dashboard_mime) {
      dashboardUrl = await uploadToR2(env, body.dashboard_base64, `check_dashboard_${id}.jpg`, 'CHECK', body.dashboard_mime);
    }

    const checklist = JSON.stringify(body.checklist || {});

    await dbRun(env.DB,
      `INSERT INTO check_log (id, car_id, check_date, checker_name, checker_phone,
        mileage, fuel_level, tire_condition, brake_condition, light_condition,
        dashboard_url, checklist, issues_found, issue_description, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, car.id, body.check_date || ts.split('T')[0],
       body.checker_name || '', body.checker_phone || '',
       body.mileage || 0, body.fuel_level || '',
       body.tire_condition || 'ok', body.brake_condition || 'ok', body.light_condition || 'ok',
       dashboardUrl, checklist,
       body.issues_found ? 1 : 0, body.issue_description || '',
       body.issues_found ? 'has_issues' : 'ok', body.notes || '', ts]
    );

    // Auto-create inspection alert if issues found
    if (body.issues_found && body.issue_description) {
      await dbRun(env.DB,
        `INSERT INTO inspection_alerts (id, car_id, alert_type, severity, description, source_check_id, status, created_at)
         VALUES (?, ?, 'inspection', 'medium', ?, ?, 'open', ?)`,
        [generateUUID(), car.id, body.issue_description, id, ts]
      );
    }

    return success({ id, message: 'บันทึกการตรวจสอบรถเรียบร้อย' }, 201);
  }

  if (!user) return error('Unauthorized', 401);

  // GET /api/check/log
  if (path === '/api/check/log' && method === 'GET') {
    const carId = url.searchParams.get('car_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const where = [];
    const params = [];
    if (carId) { where.push('cl.car_id = ?'); params.push(carId); }
    if (dateFrom) { where.push('cl.check_date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('cl.check_date <= ?'); params.push(dateTo); }
    const rows = await dbAll(env.DB,
      `SELECT cl.*, c.car_id as car_code, c.brand, c.license_plate FROM check_log cl
       LEFT JOIN cars c ON cl.car_id = c.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY cl.check_date DESC, cl.created_at DESC LIMIT 200`,
      params
    );
    return success(rows);
  }

  // GET /api/check/alerts
  if (path === '/api/check/alerts' && method === 'GET') {
    const status = url.searchParams.get('status') || 'open';
    const rows = await dbAll(env.DB,
      `SELECT ia.*, c.car_id as car_code, c.brand, c.license_plate FROM inspection_alerts ia
       LEFT JOIN cars c ON ia.car_id = c.id
       WHERE ia.status = ? ORDER BY ia.created_at DESC`,
      [status]
    );
    return success(rows);
  }

  // PUT /api/check/alerts/:id/resolve
  if (path.match(/\/api\/check\/alerts\/[^/]+\/resolve/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE inspection_alerts SET status = 'resolved', resolved_by = ?, resolved_at = ?, resolution_notes = ? WHERE id = ?`,
      [user.id, now(), body?.notes || '', id]
    );
    return success({ message: 'ปิดแจ้งเตือนเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}
