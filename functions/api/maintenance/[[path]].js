// Maintenance schedules + alerts
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, requireAdmin
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);

  if (path === '/api/maintenance/settings' && method === 'GET') {
    const rows = await dbAll(env.DB, 'SELECT * FROM maintenance_settings ORDER BY maintenance_type');
    return success(rows);
  }

  if (path === '/api/maintenance/settings' && method === 'PUT') {
    try { requireAdmin(user); } catch { return error('ต้องเป็น Admin', 403); }
    const body = await parseBody(request);
    if (!Array.isArray(body?.settings)) return error('ต้องส่งอาร์เรย์ settings');
    for (const s of body.settings) {
      if (!s.id) continue;
      await dbRun(env.DB,
        `UPDATE maintenance_settings SET interval_km = ?, interval_days = ?, enabled = ?, notes = ?, updated_at = ? WHERE id = ?`,
        [s.interval_km || 0, s.interval_days || 0, s.enabled ? 1 : 0, s.notes || '', now(), s.id]
      );
    }
    return success({ message: 'อัปเดตการตั้งค่าบำรุงรักษาเรียบร้อย' });
  }

  if (path === '/api/maintenance/schedule' && method === 'GET') {
    const settings = await dbAll(env.DB, 'SELECT * FROM maintenance_settings WHERE enabled = 1');
    const vehicles = await dbAll(env.DB, 'SELECT id, car_id, brand, license_plate, mileage, last_check_date FROM cars WHERE active = 1');

    const schedule = [];
    for (const car of vehicles) {
      for (const s of settings) {
        // Find last maintenance of this type for this car
        const last = await dbFirst(env.DB,
          `SELECT service_date, mileage_at_service FROM vehicle_maintenance
           WHERE car_id = ? AND maintenance_type = ? ORDER BY service_date DESC LIMIT 1`,
          [car.id, s.maintenance_type]
        );
        const lastDate = last?.service_date ? new Date(last.service_date) : null;
        const lastKm = last?.mileage_at_service || 0;
        const today = new Date();

        let dueDays = null;
        let dueKm = null;
        let status = 'ok';

        if (s.interval_days && lastDate) {
          dueDays = Math.floor((lastDate.getTime() + s.interval_days * 86400000 - today.getTime()) / 86400000);
          if (dueDays < 0) status = 'overdue';
          else if (dueDays <= 7) status = 'due_soon';
        }
        if (s.interval_km && car.mileage) {
          dueKm = (lastKm + s.interval_km) - car.mileage;
          if (dueKm < 0) status = 'overdue';
          else if (dueKm <= 500) status = status === 'overdue' ? 'overdue' : 'due_soon';
        }
        if (status !== 'ok') {
          schedule.push({
            car_id: car.id, car_code: car.car_id, brand: car.brand, license_plate: car.license_plate,
            maintenance_type: s.maintenance_type, label: s.label,
            last_service_date: last?.service_date || null, last_mileage: lastKm,
            current_mileage: car.mileage, due_in_days: dueDays, due_in_km: dueKm, status
          });
        }
      }
    }
    schedule.sort((a, b) => (a.status === 'overdue' ? -1 : 1));
    return success(schedule);
  }

  if (path === '/api/maintenance/alerts' && method === 'GET') {
    const status = url.searchParams.get('status') || 'open';
    const rows = await dbAll(env.DB,
      `SELECT ia.*, c.car_id as car_code, c.brand, c.license_plate FROM inspection_alerts ia
       LEFT JOIN cars c ON ia.car_id = c.id
       WHERE ia.status = ? ORDER BY ia.created_at DESC`,
      [status]
    );
    return success(rows);
  }

  if (path === '/api/maintenance/alerts' && method === 'POST') {
    try { requirePermission(user, 'maintenance', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.description) return error('กรุณากรอกข้อมูลให้ครบ');
    const id = generateUUID();
    const ts = now();
    await dbRun(env.DB,
      `INSERT INTO inspection_alerts (id, car_id, alert_type, severity, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
      [id, body.car_id, body.alert_type || 'maintenance', body.severity || 'medium', body.description, ts]
    );
    return success({ id, message: 'สร้างการแจ้งเตือนเรียบร้อย' }, 201);
  }

  if (path.match(/\/api\/maintenance\/alerts\/[^/]+\/resolve/) && method === 'PUT') {
    try { requirePermission(user, 'maintenance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    await dbRun(env.DB,
      `UPDATE inspection_alerts SET status = 'resolved', resolved_by = ?, resolved_at = ?, resolution_notes = ? WHERE id = ?`,
      [user.id, now(), body?.notes || '', id]
    );
    return success({ message: 'ปิดการแจ้งเตือนเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}