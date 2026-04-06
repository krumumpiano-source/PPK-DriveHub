// QR Survey — แบบประเมินผู้โดยสาร (PUBLIC submit, AUTH view)
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // --- POST /api/survey/submit --- PUBLIC (ไม่ต้อง login)
  if (path === '/api/survey/submit' && method === 'POST') {
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุรถที่ต้องการประเมิน');
    // ค้นหาพนักงานขับรถจากคิวล่าสุดของรถคันนี้
    let driverId = body.driver_id || null;
    let queueId = body.queue_id || null;
    if (!driverId) {
      const latestQueue = await dbFirst(env.DB,
        `SELECT id, driver_id FROM queue WHERE car_id = ? AND status IN ('ongoing','completed','scheduled')
         ORDER BY date DESC, time_start DESC LIMIT 1`, [body.car_id]);
      if (latestQueue) {
        driverId = latestQueue.driver_id;
        queueId = queueId || latestQueue.id;
      }
    }
    const id = generateUUID();
    await dbRun(env.DB,
      `INSERT INTO survey_responses (id, car_id, queue_id, driver_id,
        politeness_score, safety_score, punctuality_score,
        cleanliness_score, appearance_score, overall_score,
        comment, respondent_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, queueId, driverId,
       body.politeness_score || null, body.safety_score || null,
       body.punctuality_score || null, body.cleanliness_score || null,
       body.appearance_score || null, body.overall_score || null,
       body.comment || '', body.respondent_name || '', now()]
    );
    return success({ id, message: 'ขอบคุณสำหรับการประเมิน' }, 201);
  }

  // ต่อจากนี้ต้อง login
  const user = env.user;
  if (!user) return error('Unauthorized', 401);

  // --- GET /api/survey/results ---
  if (path === '/api/survey/results' && method === 'GET') {
    const carId = url.searchParams.get('car_id');
    const driverId = url.searchParams.get('driver_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const where = [];
    const params = [];
    if (carId) { where.push('sr.car_id = ?'); params.push(carId); }
    if (driverId) { where.push('sr.driver_id = ?'); params.push(driverId); }
    if (dateFrom) { where.push('sr.created_at >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('sr.created_at <= ?'); params.push(dateTo + 'T23:59:59'); }
    const rows = await dbAll(env.DB,
      `SELECT sr.*, c.license_plate, c.brand, d.name AS driver_name
       FROM survey_responses sr
       LEFT JOIN cars c ON sr.car_id = c.id
       LEFT JOIN drivers d ON sr.driver_id = d.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY sr.created_at DESC LIMIT 500`,
      params
    );
    return success(rows);
  }

  // --- GET /api/survey/summary --- สรุปคะแนนเฉลี่ยรายพนักงาน
  if (path === '/api/survey/summary' && method === 'GET') {
    const rows = await dbAll(env.DB,
      `SELECT sr.driver_id, d.name AS driver_name,
       COUNT(*) AS total_responses,
       ROUND(AVG(sr.politeness_score), 2) AS avg_politeness,
       ROUND(AVG(sr.safety_score), 2) AS avg_safety,
       ROUND(AVG(sr.punctuality_score), 2) AS avg_punctuality,
       ROUND(AVG(sr.cleanliness_score), 2) AS avg_cleanliness,
       ROUND(AVG(sr.appearance_score), 2) AS avg_appearance,
       ROUND(AVG(sr.overall_score), 2) AS avg_overall
       FROM survey_responses sr
       LEFT JOIN drivers d ON sr.driver_id = d.id
       WHERE sr.driver_id IS NOT NULL
       GROUP BY sr.driver_id
       ORDER BY avg_overall DESC`
    );
    return success(rows);
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}
