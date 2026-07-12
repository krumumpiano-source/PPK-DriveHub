import { json, success, error, generateUUID, now } from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env, params, data } = context;
  const path = params.path ? params.path.join('/') : '';
  const db = env.DB;

  try {
    // 1. GET /api/warnings/driver/:id - Get warnings for a specific driver
    if (request.method === 'GET' && path.startsWith('driver/')) {
      if (!env.user) return error('Unauthorized', 401);
      const driverId = path.split('/')[1];
      const url = new URL(request.url);
      const year = url.searchParams.get('year') || (new Date().getFullYear() + 543).toString();

      const { results } = await db.prepare(`
        SELECT w.*, u.display_name as issued_by_name
        FROM driver_warnings w
        LEFT JOIN users u ON w.issued_by = u.id
        WHERE w.driver_id = ? AND w.academic_year = ?
        ORDER BY w.created_at DESC
      `).bind(driverId, year).all();

      return success(results);
    }

    // 2. GET /api/warnings/pending - Get unacknowledged warnings for the currently logged-in driver
    if (request.method === 'GET' && path === 'pending') {
      if (!env.user) return error('Unauthorized', 401);
      const user = data.user;
      
      // First, get the driver_id associated with this user
      const driverStmt = await db.prepare(`SELECT driver_id FROM users WHERE id = ?`).bind(user.id).first();
      if (!driverStmt || !driverStmt.driver_id) {
          return success([]); // Not a driver or no driver linked
      }
      
      const { results } = await db.prepare(`
        SELECT w.*, u.display_name as issued_by_name
        FROM driver_warnings w
        LEFT JOIN users u ON w.issued_by = u.id
        WHERE w.driver_id = ? AND w.acknowledged_by_driver = 0
        ORDER BY w.created_at ASC
      `).bind(driverStmt.driver_id).all();

      return success(results);
    }

    // 3. POST /api/warnings - Issue a new warning
    if (request.method === 'POST' && path === '') {
      if (!env.user) return error('Unauthorized', 401);
      const user = data.user;
      const body = await request.json();

      const { driver_id, warning_type, reason, pip_start_date, pip_end_date, academic_year } = body;

      if (!driver_id || !warning_type || !reason) {
        return error('Missing required fields', 400);
      }

      // Check if user has permission (must be admin or committee chair)
      if (!['admin', 'super_admin', 'manager'].includes(user.role)) {
          return error('Unauthorized to issue warnings', 403);
      }

      const id = generateUUID();
      const createdAt = now();
      const currentYear = academic_year || (new Date().getFullYear() + 543).toString();

      await db.prepare(`
        INSERT INTO driver_warnings (
          id, driver_id, warning_type, reason, pip_start_date, pip_end_date,
          issued_by, academic_year, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, driver_id, warning_type, reason, pip_start_date || null, pip_end_date || null,
        user.id, currentYear, createdAt
      ).run();

      // Optionally, we could send a notification to the driver here if the notifications table is active
      const notifId = generateUUID();
      await db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, created_at)
        SELECT ?, id, 'warning', 'คุณมีหนังสือเตือนใหม่', 'กรุณากดรับทราบในระบบ', ?
        FROM users WHERE driver_id = ?
      `).bind(notifId, createdAt, driver_id).run();

      return success({ id, message: 'Warning issued successfully' });
    }

    // 4. POST /api/warnings/:id/acknowledge - Driver acknowledges a warning
    if (request.method === 'POST' && path.endsWith('/acknowledge')) {
        if (!env.user) return error('Unauthorized', 401);
        const user = data.user;
        const warningId = path.split('/')[0];

        // Verify the warning belongs to the logged-in driver
        const driverStmt = await db.prepare(`SELECT driver_id FROM users WHERE id = ?`).bind(user.id).first();
        if (!driverStmt || !driverStmt.driver_id) return error('Unauthorized', 403);

        const warning = await db.prepare(`SELECT * FROM driver_warnings WHERE id = ?`).bind(warningId).first();
        if (!warning) return error('Warning not found', 404);
        if (warning.driver_id !== driverStmt.driver_id) return error('Unauthorized to acknowledge this warning', 403);

        const acknowledgedAt = now();
        await db.prepare(`
            UPDATE driver_warnings 
            SET acknowledged_by_driver = 1, acknowledged_at = ?
            WHERE id = ?
        `).bind(acknowledgedAt, warningId).run();

        return success({ message: 'Warning acknowledged successfully', acknowledged_at: acknowledgedAt });
    }

    return error('Not Found', 404);
  } catch (err) {
    return error(err.message, 500);
  }
}
