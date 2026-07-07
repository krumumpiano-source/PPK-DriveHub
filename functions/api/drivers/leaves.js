import { dbAll, dbFirst, dbRun, generateUUID, now, success, error, parseBody } from '../../_helpers.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const method = request.method;
    const url = new URL(request.url);
    const user = env.user;

    if (!user) return error('Unauthorized', 401);
    
    // We expect driver_id from the session, if they are a driver
    const driverId = user.driver_id;
    if (!driverId && (user.role === 'driver')) {
      return error('ไม่พบข้อมูลพนักงานขับรถที่ผูกกับบัญชีนี้', 403);
    }

    if (method === 'GET') {
      let queryDriverId = driverId;
      // Admins can query for any driver or all
      if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'vehicle') {
        const queryParam = url.searchParams.get('driver_id');
        if (queryParam) queryDriverId = queryParam;
        else queryDriverId = null; // null means all
      }

      let sql = `SELECT * FROM leaves WHERE 1=1`;
      const params = [];

      if (queryDriverId) {
        sql += ` AND driver_id = ?`;
        params.push(queryDriverId);
      }

      sql += ` ORDER BY created_at DESC`;
      const leaves = await dbAll(env.DB, sql, params);
      return success(leaves);
    }

    if (method === 'POST') {
      const body = await parseBody(request);
      if (!body.leave_type || !body.start_date || !body.end_date) {
        return error('ข้อมูลไม่ครบถ้วน');
      }

      // Check if start_date is before end_date
      if (body.start_date > body.end_date) {
        return error('วันที่เริ่มต้นต้องก่อนหรือตรงกับวันที่สิ้นสุด');
      }

      // If user is admin creating leave for someone else
      let targetDriverId = driverId;
      if (body.driver_id && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'vehicle')) {
        targetDriverId = body.driver_id;
      }
      
      if (!targetDriverId) return error('ไม่พบข้อมูลพนักงานขับรถ', 400);

      const ts = now();
      const id = generateUUID();

      await dbRun(env.DB,
        `INSERT INTO leaves (id, driver_id, leave_type, start_date, end_date, reason, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, targetDriverId, body.leave_type, body.start_date, body.end_date, body.reason || '', ts]
      );

      return success({ id, message: 'ส่งคำขอลางานเรียบร้อย' });
    }
    
    // Admins can approve/reject via PUT
    if (method === 'PUT') {
      if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'vehicle') {
        return error('ไม่มีสิทธิ์อนุมัติการลางาน', 403);
      }
      const body = await parseBody(request);
      if (!body.id || !body.status) return error('ข้อมูลไม่ครบถ้วน');
      
      const ts = now();
      await dbRun(env.DB,
        `UPDATE leaves SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?`,
        [body.status, user.id, ts, body.id]
      );
      return success({ message: 'อัปเดตสถานะลางานเรียบร้อย' });
    }

    return error('Method not allowed', 405);
  } catch (err) {
    return error(err.message, 500);
  }
}
