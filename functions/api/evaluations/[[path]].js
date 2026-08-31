import { json, success, error, generateUUID, now } from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env, params, data } = context;
  const path = params.path ? params.path.join('/') : '';
  const db = env.DB;

  try {
    // 0. GET /api/evaluations/summary - Fast summary for all 4 main drivers in a single call
    if (request.method === 'GET' && (path === 'summary' || path === '')) {
      if (!env.user) return error('Unauthorized', 401);
      const url = new URL(request.url);
      const year = url.searchParams.get('year') || (new Date().getFullYear() + 543).toString();
      const fiscalGregorianYear = parseInt(year) - 543;
      const fiscalStart = `${fiscalGregorianYear - 1}-10-01`;
      const fiscalEnd = `${fiscalGregorianYear}-09-30`;

      // Get 4 main drivers
      const drivers = await db.prepare(`
        SELECT id, name, first_name, last_name, title, status FROM drivers 
        WHERE status = 'active' AND (name LIKE '%ชารี%' OR name LIKE '%ณัฐวุฒิ%' OR name LIKE '%สมชาย%' OR name LIKE '%สุรเชษฐ์%')
      `).all();

      const summaryList = [];
      const driverList = drivers.results || [];

      for (const d of driverList) {
        // Passenger stats
        const pStats = await db.prepare(`
          SELECT 
            AVG(score_driving) as avg_driving,
            AVG(score_service) as avg_service,
            AVG(score_punctuality) as avg_punctuality,
            AVG(total_score) as avg_total_score,
            COUNT(id) as total_trips
          FROM driver_evaluations
          WHERE driver_id = ? AND evaluation_type = 'passenger' AND academic_year = ?
        `).bind(d.id, year).first();

        // Committee stats
        const cStats = await db.prepare(`
          SELECT 
            AVG(score_maintenance) as avg_maintenance,
            AVG(score_discipline) as avg_discipline,
            AVG(score_contribution) as avg_contribution,
            AVG(total_score) as avg_total_score,
            COUNT(id) as committee_count
          FROM driver_evaluations
          WHERE driver_id = ? AND evaluation_type = 'committee' AND academic_year = ?
        `).bind(d.id, year).first();

        const pAvg = pStats?.avg_total_score || 0;
        const cAvg = cStats?.avg_total_score || 0;
        const pWeighted = (pAvg / 5) * 40;
        const cWeighted = (cAvg / 100) * 60;
        const totalScore = pWeighted + cWeighted;
        const hasEval = (pStats?.total_trips || 0) > 0 || (cStats?.committee_count || 0) > 0 || totalScore > 0;

        let grade = 'ยังไม่ประเมิน';
        if (hasEval) {
          if (totalScore >= 90) grade = 'ดีเด่น';
          else if (totalScore >= 80) grade = 'ดีมาก';
          else if (totalScore >= 70) grade = 'ดี';
          else if (totalScore >= 60) grade = 'พอใช้';
          else grade = 'ต้องปรับปรุง';
        }

        summaryList.push({
          driver: d,
          passenger: {
            count: pStats?.total_trips || 0,
            avg_score: pStats?.avg_total_score || 0,
            avg_driving: pStats?.avg_driving || 0,
            avg_service: pStats?.avg_service || 0,
            avg_punctuality: pStats?.avg_punctuality || 0,
            weighted_score: pWeighted
          },
          committee: {
            count: cStats?.committee_count || 0,
            avg_maintenance: cStats?.avg_maintenance || 0,
            avg_discipline: cStats?.avg_discipline || 0,
            avg_contribution: cStats?.avg_contribution || 0,
            avg_total: cStats?.avg_total_score || 0,
            weighted_score: cWeighted
          },
          passengerScore: pWeighted,
          committeeScore: cWeighted,
          totalScore: totalScore,
          hasEval: hasEval,
          grade: grade
        });
      }

      return success({
        academic_year: year,
        drivers: summaryList
      });
    }

    // 1. GET /api/evaluations/driver/:id - Get aggregated scores for a driver
    if (request.method === 'GET' && path.startsWith('driver/')) {
      if (!env.user) return error('Unauthorized', 401);
      const driverId = path.split('/')[1];
      const url = new URL(request.url);
      const year = url.searchParams.get('year') || (new Date().getFullYear() + 543).toString();

      // Get passenger average
      const passengerStmt = await db.prepare(`
        SELECT 
          AVG(score_driving) as avg_driving,
          AVG(score_service) as avg_service,
          AVG(score_punctuality) as avg_punctuality,
          AVG(total_score) as avg_total_score,
          COUNT(id) as total_trips
        FROM driver_evaluations 
        WHERE driver_id = ? AND evaluation_type = 'passenger' AND academic_year = ?
      `).bind(driverId, year).first();

      // Get committee average
      const committeeStmt = await db.prepare(`
        SELECT 
          AVG(score_maintenance) as avg_maintenance,
          AVG(score_discipline) as avg_discipline,
          AVG(score_contribution) as avg_contribution,
          AVG(total_score) as avg_total_score,
          COUNT(id) as committee_count
        FROM driver_evaluations 
        WHERE driver_id = ? AND evaluation_type = 'committee' AND academic_year = ?
      `).bind(driverId, year).first();

      // Get all evaluations (history)
      const { results: history } = await db.prepare(`
        SELECT e.*, u.display_name as evaluator_name
        FROM driver_evaluations e
        LEFT JOIN users u ON e.evaluator_id = u.id
        WHERE e.driver_id = ? AND e.academic_year = ?
        ORDER BY e.created_at DESC
      `).bind(driverId, year).all();

      const fiscalGregorianYear = parseInt(year) - 543;
      const fiscalStart = `${fiscalGregorianYear - 1}-10-01`;
      const fiscalEnd = `${fiscalGregorianYear}-09-30`;

      // Check queues and usage records with single fast join
      const anomalyCheck = await db.prepare(`
        SELECT 
          q.id as queue_id,
          ur_dep.mileage as dep_mileage,
          ur_ret.mileage as ret_mileage,
          CASE WHEN ur_dep.id IS NULL THEN 1 ELSE 0 END as missed_dep,
          CASE WHEN ur_ret.id IS NULL THEN 1 ELSE 0 END as missed_ret
        FROM queue q
        LEFT JOIN usage_records ur_dep ON q.id = ur_dep.queue_id AND ur_dep.record_type = 'departure'
        LEFT JOIN usage_records ur_ret ON q.id = ur_ret.queue_id AND ur_ret.record_type = 'return'
        WHERE q.driver_id = ? AND q.status = 'completed' AND q.date >= ? AND q.date <= ?
        ORDER BY q.date ASC
      `).bind(driverId, fiscalStart, fiscalEnd).all();

      let anomalousCount = 0;
      let missedCount = 0;
      const totalCompleted = anomalyCheck.results ? anomalyCheck.results.length : 0;

      if (anomalyCheck.results) {
        anomalyCheck.results.forEach(trip => {
          missedCount += (trip.missed_dep || 0) + (trip.missed_ret || 0);
          const dep = trip.dep_mileage;
          const ret = trip.ret_mileage;
          if (dep !== null && ret !== null && dep !== undefined && ret !== undefined) {
            if (ret < dep) {
              anomalousCount++;
            }
          }
        });
      }

      const usageStats = {
          total_completed_trips: totalCompleted,
          total_logs: (totalCompleted * 2) - missedCount,
          missed_logs: missedCount,
          missed_fuel_mileage: 0,
          anomalous_logs: anomalousCount
      };

      // Calculate combined score
      const passengerAvg = passengerStmt?.avg_total_score || 0;
      const committeeAvg = committeeStmt?.avg_total_score || 0;

      const passengerWeighted = (passengerAvg / 5) * 40;
      const committeeWeighted = (committeeAvg / 100) * 60;
      const combinedScore = passengerWeighted + committeeWeighted;

      const hasEvaluations = (passengerStmt?.total_trips || 0) > 0 || (committeeStmt?.committee_count || 0) > 0 || combinedScore > 0;
      let grade = 'ยังไม่ประเมิน';
      if (hasEvaluations) {
          if (combinedScore >= 90) grade = 'ดีเด่น';
          else if (combinedScore >= 80) grade = 'ดีมาก';
          else if (combinedScore >= 70) grade = 'ดี';
          else if (combinedScore >= 60) grade = 'พอใช้';
          else grade = 'ต้องปรับปรุง';
      }

      return success({
        driver_id: driverId,
        academic_year: year,
        passenger_stats: passengerStmt,
        committee_stats: committeeStmt,
        combined_score: combinedScore,
        passenger_weighted: passengerWeighted,
        committee_weighted: committeeWeighted,
        grade: grade,
        history: history || [],
        usage_stats: usageStats
      });
    }

    // 2. GET /api/evaluations/pip/:driverId - Get scores within a specific date range (for PIP re-evaluation)
    if (request.method === 'GET' && path.startsWith('pip/')) {
        if (!env.user) return error('Unauthorized', 401);
        const driverId = path.split('/')[1];
        const url = new URL(request.url);
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');
        if(!start || !end) return error('Start and End dates are required', 400);

        const stmt = await db.prepare(`
          SELECT 
            AVG(total_score) as avg_total_score,
            COUNT(id) as total_trips
          FROM driver_evaluations 
          WHERE driver_id = ? AND evaluation_type = 'passenger' AND created_at >= ? AND created_at <= ?
        `).bind(driverId, start, end).first();

        return success({
            driver_id: driverId,
            pip_average: stmt.avg_total_score || 0,
            trip_count: stmt.total_trips || 0
        });
    }

    // 2.5 GET /api/evaluations/empirical/:driverId - Get detailed empirical data for the year
    if (request.method === 'GET' && path.startsWith('empirical/')) {
        if (!env.user) return error('Unauthorized', 401);
        const driverId = path.split('/')[1];
        const url = new URL(request.url);
        const year = url.searchParams.get('year') || (new Date().getFullYear() + 543).toString();
        // Determine date range for the fiscal year (Oct 1 to Sep 30)
        // ปีงบประมาณ 2569 = 1 ต.ค. 2568 (2025) ถึง 30 ก.ย. 2569 (2026)
        const gregorianYear = parseInt(year) - 543;
        const startDate = `${gregorianYear - 1}-10-01`;
        const endDate = `${gregorianYear}-09-30`;

        const queues = await db.prepare(`
            SELECT 
                q.id as queue_id,
                q.date,
                q.mission,
                q.destination,
                c.license_plate,
                ur_dep.mileage as dep_mileage,
                ur_ret.mileage as ret_mileage,
                MAX(CASE WHEN u.record_type = 'departure' THEN 1 ELSE 0 END) as has_departure,
                MAX(CASE WHEN u.record_type = 'return' THEN 1 ELSE 0 END) as has_return
            FROM queue q
            LEFT JOIN cars c ON q.car_id = c.id
            LEFT JOIN usage_records u ON q.id = u.queue_id
            LEFT JOIN usage_records ur_dep ON q.id = ur_dep.queue_id AND ur_dep.record_type = 'departure'
            LEFT JOIN usage_records ur_ret ON q.id = ur_ret.queue_id AND ur_ret.record_type = 'return'
            WHERE q.driver_id = ? AND q.status = 'completed' AND q.date >= ? AND q.date <= ?
            GROUP BY q.id
            ORDER BY q.date ASC
        `).bind(driverId, startDate, endDate).all();

        const monthlyStats = {};
        const missedDetails = [];
        const anomalousDetails = [];

        if (queues.results) {
            queues.results.forEach(q => {
                const monthKey = q.date.substring(0, 7); // YYYY-MM
                if (!monthlyStats[monthKey]) {
                    monthlyStats[monthKey] = { month: monthKey, completed: 0, has_logs: 0, missed_logs: 0, anomalous_logs: 0 };
                }
                
                monthlyStats[monthKey].completed += 1;
                let logsForThisTrip = 0;
                let missedForThisTrip = 0;
                let missedParts = [];

                if (q.has_departure) logsForThisTrip++; else { missedForThisTrip++; missedParts.push('ไม่บันทึกก่อนออกเดินทาง'); }
                if (q.has_return) logsForThisTrip++; else { missedForThisTrip++; missedParts.push('ไม่บันทึกกลับมาจากเดินทาง'); }

                monthlyStats[monthKey].has_logs += logsForThisTrip;
                monthlyStats[monthKey].missed_logs += missedForThisTrip;

                let displayMission = q.mission || 'ปฏิบัติงานตามคิว';
                if (q.mission === 'บันทึกผ่าน QR') {
                    displayMission = q.destination ? q.destination : 'ไม่ระบุสถานที่';
                } else if (q.destination) {
                    displayMission = `${q.mission} (${q.destination})`;
                }

                if (missedForThisTrip > 0) {
                    missedDetails.push({
                        date: q.date,
                        queue_id: q.queue_id,
                        mission: displayMission,
                        car: q.license_plate || '-',
                        missed: missedParts.join(', ')
                    });
                }

                // Check Anomalous Mileage (Retrograde / Negative Mileage only)
                const dep = q.dep_mileage;
                const ret = q.ret_mileage;
                let anomalyReasons = [];

                if (dep !== null && ret !== null && dep !== undefined && ret !== undefined) {
                    if (ret < dep) {
                        anomalyReasons.push(`เลขไมล์ขากลับน้อยกว่าขาออก (ขาออก: ${dep.toLocaleString()} กม. / ขากลับ: ${ret.toLocaleString()} กม.)`);
                    }
                }

                if (anomalyReasons.length > 0) {
                    monthlyStats[monthKey].anomalous_logs = (monthlyStats[monthKey].anomalous_logs || 0) + 1;
                    anomalousDetails.push({
                        date: q.date,
                        queue_id: q.queue_id,
                        mission: displayMission,
                        car: q.license_plate || '-',
                        reason: anomalyReasons.join(', ')
                    });
                }
            });
        }

        // === Comparative stats: all drivers combined in the same fiscal year ===
        // Total queues for ALL drivers
        const allQueuesTotal = await db.prepare(`
            SELECT COUNT(id) as total FROM queue WHERE status = 'completed' AND date >= ? AND date <= ?
        `).bind(startDate, endDate).first();

        // This driver's queue count
        const driverQueueCount = queues.results ? queues.results.length : 0;

        // Total mileage for ALL drivers (sum of return mileage - departure mileage per queue)
        const allMileage = await db.prepare(`
            SELECT 
                q.driver_id,
                SUM(COALESCE(ur_ret.mileage, 0) - COALESCE(ur_dep.mileage, 0)) as total_km
            FROM queue q
            LEFT JOIN usage_records ur_dep ON q.id = ur_dep.queue_id AND ur_dep.record_type = 'departure'
            LEFT JOIN usage_records ur_ret ON q.id = ur_ret.queue_id AND ur_ret.record_type = 'return'
            WHERE q.status = 'completed' AND q.date >= ? AND q.date <= ?
            GROUP BY q.driver_id
        `).bind(startDate, endDate).all();

        let allDriversKm = 0;
        let thisDriverKm = 0;
        if (allMileage.results) {
            allMileage.results.forEach(r => {
                const km = Math.max(0, r.total_km || 0);
                allDriversKm += km;
                if (r.driver_id === driverId) thisDriverKm = km;
            });
        }

        // Total missed logs for ALL drivers
        const allMissed = await db.prepare(`
            SELECT 
                q.driver_id,
                COUNT(q.id) as total_queues,
                SUM(CASE WHEN ur_dep.id IS NULL THEN 1 ELSE 0 END) as missed_dep,
                SUM(CASE WHEN ur_ret.id IS NULL THEN 1 ELSE 0 END) as missed_ret
            FROM queue q
            LEFT JOIN usage_records ur_dep ON q.id = ur_dep.queue_id AND ur_dep.record_type = 'departure'
            LEFT JOIN usage_records ur_ret ON q.id = ur_ret.queue_id AND ur_ret.record_type = 'return'
            WHERE q.status = 'completed' AND q.date >= ? AND q.date <= ?
            GROUP BY q.driver_id
        `).bind(startDate, endDate).all();

        let allDriversMissed = 0;
        let thisDriverMissed = 0;
        let allDriversQueues = allQueuesTotal.total || 0;
        if (allMissed.results) {
            allMissed.results.forEach(r => {
                const missed = (r.missed_dep || 0) + (r.missed_ret || 0);
                allDriversMissed += missed;
                if (r.driver_id === driverId) thisDriverMissed = missed;
            });
        }

        return success({
            driver_id: driverId,
            academic_year: year,
            monthly_stats: Object.values(monthlyStats),
            missed_details: missedDetails,
            anomalous_count: anomalousDetails.length,
            anomalous_details: anomalousDetails,
            comparative: {
                all_queues: allDriversQueues,
                driver_queues: driverQueueCount,
                queue_pct: allDriversQueues > 0 ? ((driverQueueCount / allDriversQueues) * 100).toFixed(1) : '0.0',
                all_km: Math.round(allDriversKm),
                driver_km: Math.round(thisDriverKm),
                km_pct: allDriversKm > 0 ? ((thisDriverKm / allDriversKm) * 100).toFixed(1) : '0.0',
                all_missed: allDriversMissed,
                driver_missed: thisDriverMissed,
                missed_pct: allDriversQueues > 0 ? ((thisDriverMissed / (allDriversQueues * 2)) * 100).toFixed(1) : '0.0'
            }
        });
    }

    // 3. POST /api/evaluations - Submit an evaluation
    if (request.method === 'POST' && path === '') {
      if (!env.user) return error('Unauthorized', 401);
      const user = data.user;
      const body = await request.json();

      const { 
        driver_id, queue_id, evaluation_type, 
        score_driving, score_service, score_punctuality, 
        score_maintenance, score_discipline, score_contribution,
        comments, academic_year
      } = body;

      if (!driver_id || !evaluation_type) {
        return error('Missing required fields', 400);
      }

      const id = generateUUID();
      const createdAt = now();
      const currentYear = academic_year || (new Date().getFullYear() + 543).toString();
      let totalScore = 0;

      if (evaluation_type === 'passenger') {
        if (!score_driving || !score_service || !score_punctuality) return error('All passenger scores are required', 400);
        totalScore = (score_driving + score_service + score_punctuality) / 3;

        await db.prepare(`
          INSERT INTO driver_evaluations (
            id, driver_id, queue_id, evaluator_id, evaluation_type,
            score_driving, score_service, score_punctuality, total_score, comments, academic_year, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, driver_id, queue_id || null, user.id, evaluation_type,
          score_driving, score_service, score_punctuality, totalScore, comments || null, currentYear, createdAt
        ).run();
      } else if (evaluation_type === 'committee') {
        if (!score_maintenance || !score_discipline || !score_contribution) return error('All committee scores are required', 400);
        totalScore = score_maintenance + score_discipline + score_contribution; // Max 100

        await db.prepare(`
          INSERT INTO driver_evaluations (
            id, driver_id, evaluator_id, evaluation_type,
            score_maintenance, score_discipline, score_contribution, total_score, comments, academic_year, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, driver_id, user.id, evaluation_type,
          score_maintenance, score_discipline, score_contribution, totalScore, comments || null, currentYear, createdAt
        ).run();
      } else {
        return error('Invalid evaluation type', 400);
      }

      return success({ id, total_score: totalScore, message: 'Evaluation submitted successfully' });
    }

    // 4. DELETE /api/evaluations/:id - Delete evaluation record
    if (request.method === 'DELETE' && path) {
      if (!env.user) return error('Unauthorized', 401);
      const evalId = path;
      await db.prepare(`DELETE FROM driver_evaluations WHERE id = ?`).bind(evalId).run();
      return success({ message: 'ลบผลการประเมินเรียบร้อยแล้ว' });
    }

    return error('Not Found', 404);
  } catch (err) {
    return error(err.message, 500);
  }
}
