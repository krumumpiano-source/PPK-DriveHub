// Daily vehicle inspections (incl. public QR)
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, uploadToR2
} from '../../_helpers.js';

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
    // Try finding car by id or license_plate
    let car = await dbFirst(env.DB,
      "SELECT id, license_plate FROM cars WHERE id = ? AND status != 'inactive'", [body.car_id]
    );
    if (!car) {
      car = await dbFirst(env.DB,
        "SELECT id, license_plate FROM cars WHERE license_plate = ? AND status != 'inactive'", [body.car_id]
      );
    }
    if (!car) return error('ไม่พบยานพาหนะ');

    const id = generateUUID();
    const ts = now();

    // Build checks_data JSON from individual check fields
    const checksData = JSON.stringify({
      tire: body.tire_condition || 'ok',
      brake: body.brake_condition || 'ok',
      light: body.light_condition || 'ok',
      fuel_level: body.fuel_level || '',
      mileage: body.mileage || 0,
      ...(body.checklist || {}),
      ...(body.checks_data || {})
    });

    // Determine overall_status
    let overallStatus = 'ok';
    if (body.issues_found || body.overall_status === 'critical') overallStatus = 'critical';
    else if (body.overall_status === 'warning') overallStatus = 'warning';

    const notes = [body.notes || '', body.issue_description || ''].filter(Boolean).join('; ');

    await dbRun(env.DB,
      `INSERT INTO check_log (id, car_id, inspector, check_type, overall_status, checks_data, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, car.id, body.checker_name || body.inspector || 'QR',
       body.check_type || 'daily', overallStatus, checksData, notes, ts]
    );

    // Auto-create inspection alert if issues found
    if (overallStatus !== 'ok' && (body.issue_description || body.issues_found)) {
      const alertItems = JSON.stringify([{
        type: 'inspection',
        description: body.issue_description || 'พบปัญหาจากการตรวจสภาพ'
      }]);
      await dbRun(env.DB,
        `INSERT INTO inspection_alerts (id, car_id, risk_level, items, recommendations, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [generateUUID(), car.id, overallStatus === 'critical' ? 'high' : 'medium',
         alertItems, body.issue_description || '', ts]
      );
    }

    return success({ id, message: 'บันทึกการตรวจสอบรถเรียบร้อย' }, 201);
  }

  if (!user) return error('Unauthorized', 401);

  if (path === '/api/check/log' && method === 'GET') {
    try { requirePermission(user, 'check', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const where = [];
    const params = [];
    if (carId) { where.push('cl.car_id = ?'); params.push(carId); }
    if (dateFrom) { where.push('cl.created_at >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('cl.created_at <= ?'); params.push(dateTo + ' 23:59:59'); }
    const rows = await dbAll(env.DB,
      `SELECT cl.*, c.license_plate, c.brand FROM check_log cl
       LEFT JOIN cars c ON cl.car_id = c.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY cl.created_at DESC LIMIT 200`,
      params
    );
    return success(rows);
  }

  if (path === '/api/check/alerts' && method === 'GET') {
    try { requirePermission(user, 'check', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const resolved = url.searchParams.get('resolved');
    const where = resolved === '1' ? 'WHERE ia.resolved = 1' : 'WHERE ia.resolved = 0';
    const rows = await dbAll(env.DB,
      `SELECT ia.*, c.license_plate, c.brand FROM inspection_alerts ia
       LEFT JOIN cars c ON ia.car_id = c.id
       ${where} ORDER BY ia.created_at DESC`,
      []
    );
    return success(rows);
  }

  if (path.match(/\/api\/check\/alerts\/[^/]+\/resolve/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE inspection_alerts SET resolved = 1, resolved_by = ?, resolved_at = ? WHERE id = ?`,
      [user.id, now(), id]
    );
    return success({ message: 'ปิดแจ้งเตือนเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}