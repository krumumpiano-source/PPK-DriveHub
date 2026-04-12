// Reports & dashboard analytics
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
  const user = env.user;
  if (!user) return error('Unauthorized', 401);

  // ========== Dashboard Summary ==========
  if (path === '/api/reports/dashboard' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }

    const today = now().substr(0, 10);
    const monthStart = today.substr(0, 7);

    const [vehicles, drivers, queueToday, fuelMonth, repairsActive, alerts] = await Promise.all([
      dbFirst(env.DB,
        `SELECT COUNT(*) AS total,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS in_maintenance,
         SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive
         FROM cars`, []),
      dbFirst(env.DB,
        `SELECT COUNT(*) AS total,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN fatigue_flag = 1 THEN 1 ELSE 0 END) AS fatigued
         FROM drivers`, []),
      dbFirst(env.DB,
        `SELECT COUNT(*) AS total,
         SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
         SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) AS ongoing,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
         FROM queue WHERE date = ?`, [today]),
      dbFirst(env.DB,
        `SELECT COUNT(*) AS count,
         COALESCE(SUM(liters), 0) AS total_liters,
         COALESCE(SUM(amount), 0) AS total_amount
         FROM fuel_log WHERE date LIKE ? AND deleted_at IS NULL`, [monthStart + '%']),
      dbFirst(env.DB,
        `SELECT COUNT(*) AS total,
         SUM(CASE WHEN status = 'reported' THEN 1 ELSE 0 END) AS reported,
         SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress
         FROM repair_log WHERE status NOT IN ('completed','cancelled')`, []),
      dbFirst(env.DB,
        `SELECT COUNT(*) AS unresolved FROM inspection_alerts WHERE resolved = 0`, [])
    ]);

    return success({
      vehicles, drivers, queue_today: queueToday,
      fuel_month: fuelMonth, repairs_active: repairsActive,
      alerts_unresolved: alerts?.unresolved || 0,
      generated_at: now()
    });
  }

  // ========== Vehicle Report ==========
  if (path === '/api/reports/vehicles' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const rows = await dbAll(env.DB,
      `SELECT c.id, c.license_plate, c.brand, c.model, c.year, c.status,
       c.current_mileage, c.fuel_type,
       (SELECT COUNT(*) FROM queue q WHERE q.car_id = c.id AND q.status = 'completed') AS trip_count,
       (SELECT COALESCE(SUM(fl.liters),0) FROM fuel_log fl WHERE fl.car_id = c.id AND fl.deleted_at IS NULL) AS total_fuel_liters,
       (SELECT COALESCE(SUM(fl.amount),0) FROM fuel_log fl WHERE fl.car_id = c.id AND fl.deleted_at IS NULL) AS total_fuel_cost,
       (SELECT COUNT(*) FROM repair_log rl WHERE rl.car_id = c.id) AS repair_count,
       (SELECT COALESCE(SUM(rl.cost),0) FROM repair_log rl WHERE rl.car_id = c.id) AS total_repair_cost
       FROM cars c ORDER BY c.license_plate`, []
    );
    return success(rows);
  }

  // ========== Fuel Report (Enhanced) ==========
  if (path === '/api/reports/fuel' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const carId = url.searchParams.get('car_id');
    const driverId = url.searchParams.get('driver_id');
    const expenseType = url.searchParams.get('expense_type');
    const where = ['fl.deleted_at IS NULL'];
    const params = [];
    if (dateFrom) { where.push('fl.date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('fl.date <= ?'); params.push(dateTo); }
    if (carId) { where.push('fl.car_id = ?'); params.push(carId); }
    if (driverId) { where.push('fl.driver_id = ?'); params.push(driverId); }
    if (expenseType) { where.push('fl.expense_type = ?'); params.push(expenseType); }
    const whereClause = 'WHERE ' + where.join(' AND ');

    const rows = await dbAll(env.DB,
      `SELECT fl.id, fl.date, fl.car_id, c.license_plate, c.brand,
       COALESCE(d.name, fl.driver_name_manual) AS driver_name, fl.driver_id,
       fl.liters, fl.price_per_liter, fl.amount,
       fl.fuel_type, fl.gas_station_name, fl.mileage_before, fl.mileage_after,
       fl.fuel_consumption_rate, fl.expense_type, fl.document_number,
       fl.purpose, fl.purpose_detail, fl.driver_name_manual, fl.anomaly_flag,
       fl.receipt_number, fl.receipt_image
       FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       LEFT JOIN drivers d ON fl.driver_id = d.id
       ${whereClause}
       ORDER BY fl.date DESC LIMIT 1000`,
      params
    );

    // Summary (reuse same where params but without fl. prefix for subquery)
    const summaryWhere = where.map(w => w.replace(/fl\./g, ''));
    const summary = await dbFirst(env.DB,
      `SELECT COUNT(*) AS count, COALESCE(SUM(liters),0) AS total_liters,
       COALESCE(SUM(amount),0) AS total_amount,
       COALESCE(AVG(fuel_consumption_rate),0) AS avg_consumption,
       COALESCE(SUM(anomaly_flag),0) AS anomaly_count
       FROM fuel_log
       WHERE ${summaryWhere.join(' AND ')}`,
      params
    );

    // Breakdown by expense_type (by_source)
    const bySource = await dbAll(env.DB,
      `SELECT expense_type, COUNT(*) AS count,
       COALESCE(SUM(liters),0) AS total_liters,
       COALESCE(SUM(amount),0) AS total_amount
       FROM fuel_log fl ${whereClause}
       GROUP BY expense_type`,
      params
    );

    // Stats by vehicle (by_vehicle)
    const byVehicle = await dbAll(env.DB,
      `SELECT fl.car_id, c.license_plate, c.brand, COUNT(*) AS count,
       COALESCE(SUM(fl.liters),0) AS total_liters,
       COALESCE(SUM(fl.amount),0) AS total_amount,
       COALESCE(AVG(fl.fuel_consumption_rate),0) AS avg_consumption,
       COALESCE(SUM(fl.anomaly_flag),0) AS anomaly_count
       FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       ${whereClause}
       GROUP BY fl.car_id
       ORDER BY total_amount DESC`,
      params
    );

    // Stats by driver (by_driver)
    const byDriver = await dbAll(env.DB,
      `SELECT COALESCE(d.name, fl.driver_name_manual, 'ไม่ระบุ') AS driver_name,
       fl.driver_id, COUNT(*) AS count,
       COALESCE(SUM(fl.liters),0) AS total_liters,
       COALESCE(SUM(fl.amount),0) AS total_amount,
       COALESCE(AVG(fl.fuel_consumption_rate),0) AS avg_consumption,
       COALESCE(SUM(fl.anomaly_flag),0) AS anomaly_count
       FROM fuel_log fl
       LEFT JOIN drivers d ON fl.driver_id = d.id
       ${whereClause}
       GROUP BY COALESCE(fl.driver_id, fl.driver_name_manual)
       ORDER BY total_amount DESC`,
      params
    );

    return success({ records: rows, summary, by_source: bySource, by_vehicle: byVehicle, by_driver: byDriver });
  }

  // ========== Usage Report ==========
  if (path === '/api/reports/usage' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const carId = url.searchParams.get('car_id');
    const where = [];
    const params = [];
    if (dateFrom) { where.push('ur.datetime >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('ur.datetime <= ?'); params.push(dateTo + ' 23:59:59'); }
    if (carId) { where.push('ur.car_id = ?'); params.push(carId); }
    const rows = await dbAll(env.DB,
      `SELECT ur.*, c.license_plate, c.brand, d.name AS driver_name
       FROM usage_records ur
       LEFT JOIN cars c ON ur.car_id = c.id
       LEFT JOIN drivers d ON ur.driver_id = d.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY ur.datetime DESC LIMIT 1000`,
      params
    );

    const summary = await dbFirst(env.DB,
      `SELECT COUNT(*) AS total_records,
       SUM(CASE WHEN record_type = 'departure' THEN 1 ELSE 0 END) AS departures,
       SUM(CASE WHEN record_type = 'return' THEN 1 ELSE 0 END) AS returns
       FROM usage_records ur
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
      params
    );

    return success({ records: rows, summary });
  }

  // ========== Driver Report ==========
  if (path === '/api/reports/drivers' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const rows = await dbAll(env.DB,
      `SELECT d.id, d.name, d.license_number, d.license_expiry, d.phone,
       d.status, d.fatigue_flag, d.discipline_score,
       (SELECT COUNT(*) FROM queue q WHERE q.driver_id = d.id AND q.status = 'completed') AS trip_count,
       (SELECT COUNT(*) FROM self_reported_fatigue f WHERE f.driver_id = d.id) AS fatigue_reports
       FROM drivers d ORDER BY d.name`, []
    );
    return success(rows);
  }

  // ========== Repair Report ==========
  if (path === '/api/reports/repairs' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const where = [];
    const params = [];
    if (dateFrom) { where.push('rl.date_reported >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('rl.date_reported <= ?'); params.push(dateTo); }
    const rows = await dbAll(env.DB,
      `SELECT rl.*, c.license_plate, c.brand
       FROM repair_log rl
       LEFT JOIN cars c ON rl.car_id = c.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY rl.date_reported DESC LIMIT 500`,
      params
    );

    const summary = await dbFirst(env.DB,
      `SELECT COUNT(*) AS total, COALESCE(SUM(cost),0) AS total_cost,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status NOT IN ('completed','cancelled') THEN 1 ELSE 0 END) AS active
       FROM repair_log rl
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
      params
    );

    return success({ records: rows, summary });
  }

  // ========== Maintenance Report ==========
  if (path === '/api/reports/maintenance' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const rows = await dbAll(env.DB,
      `SELECT c.id AS car_id, c.license_plate, c.brand, c.current_mileage,
       vm.item_key, ms.item_name, vm.last_km, vm.last_date, vm.next_km, vm.next_date,
       COALESCE(mvp.interval_km, mpe.interval_km, mpw.interval_km, ms.interval_km) AS interval_km,
       COALESCE(mvp.interval_months, mpe.interval_months, mpw.interval_months, ms.interval_months) AS interval_months,
       CASE
         WHEN vm.next_km IS NOT NULL AND c.current_mileage >= vm.next_km THEN 'overdue'
         WHEN vm.next_date IS NOT NULL AND vm.next_date <= date('now') THEN 'overdue'
         WHEN vm.next_km IS NOT NULL AND COALESCE(mvp.interval_km, mpe.interval_km, mpw.interval_km, ms.interval_km) IS NOT NULL
              AND c.current_mileage >= (vm.next_km - COALESCE(mvp.interval_km, mpe.interval_km, mpw.interval_km, ms.interval_km) * 0.1) THEN 'upcoming'
         WHEN vm.next_date IS NOT NULL AND vm.next_date <= date('now', '+30 days') THEN 'upcoming'
         ELSE 'ok'
       END AS maintenance_status
       FROM vehicle_maintenance vm
       LEFT JOIN cars c ON vm.car_id = c.id
       LEFT JOIN maintenance_settings ms ON vm.item_key = ms.item_key
       LEFT JOIN maintenance_vehicle_profiles mvp ON mvp.car_id = vm.car_id AND mvp.item_key = vm.item_key
       LEFT JOIN maintenance_profiles mpe ON mpe.brand = c.brand AND mpe.model = c.model AND mpe.item_key = vm.item_key
       LEFT JOIN maintenance_profiles mpw ON mpw.brand = c.brand AND mpw.model = '*' AND mpw.item_key = vm.item_key
       WHERE c.status != 'inactive'
       ORDER BY c.license_plate, vm.item_key`, []
    );
    return success(rows);
  }

  // ========== Tax & Insurance Expiry Report ==========
  if (path === '/api/reports/expiry' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const days = parseInt(url.searchParams.get('days') || '90');
    const futureDate = new Date(Date.now() + days * 86400000).toISOString().substr(0, 10);

    const [tax, insurance] = await Promise.all([
      dbAll(env.DB,
        `SELECT tr.*, c.license_plate, c.brand FROM tax_records tr
         LEFT JOIN cars c ON tr.car_id = c.id
         WHERE tr.expiry_date <= ? AND tr.expiry_date >= date('now')
         ORDER BY tr.expiry_date ASC`, [futureDate]),
      dbAll(env.DB,
        `SELECT ir.*, c.license_plate, c.brand FROM insurance_records ir
         LEFT JOIN cars c ON ir.car_id = c.id
         WHERE ir.expiry_date <= ? AND ir.expiry_date >= date('now')
         ORDER BY ir.expiry_date ASC`, [futureDate])
    ]);

    return success({ tax_expiring: tax, insurance_expiring: insurance });
  }

  // ========== Driver Achievement Scores ==========
  // Formula: score = Σ(completed) / Σ(expected) × 100 — per month, weighted by workload
  if (path === '/api/reports/driver-scores' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }

    const month = url.searchParams.get('month') || new Date().toISOString().substr(0, 7);
    const monthStart = month + '-01';
    const monthEnd = month + '-31 23:59:59';

    const drivers = await dbAll(env.DB,
      "SELECT id, name, status FROM drivers ORDER BY name", []);

    const scores = [];
    for (const driver of drivers) {
      // Dimension 1: Usage records (departure + return)
      const usageTotal = await dbFirst(env.DB,
        `SELECT COUNT(*) AS cnt FROM usage_records
         WHERE driver_id = ? AND record_type IN ('departure','return')
         AND datetime >= ? AND datetime <= ?`,
        [driver.id, monthStart, monthEnd]);
      const usageGood = await dbFirst(env.DB,
        `SELECT COUNT(*) AS cnt FROM usage_records
         WHERE driver_id = ? AND record_type IN ('departure','return')
         AND datetime >= ? AND datetime <= ?
         AND data_quality = 'normal'`,
        [driver.id, monthStart, monthEnd]);

      // Dimension 2: Daily checks (expected = distinct driving days)
      const drivingDays = await dbFirst(env.DB,
        `SELECT COUNT(DISTINCT DATE(datetime)) AS cnt FROM usage_records
         WHERE driver_id = ? AND record_type = 'departure'
         AND datetime >= ? AND datetime <= ? AND data_quality = 'normal'`,
        [driver.id, monthStart, monthEnd]);
      const checksCompleted = await dbFirst(env.DB,
        `SELECT COUNT(*) AS cnt FROM check_log
         WHERE inspector LIKE ? AND created_at >= ? AND created_at <= ?`,
        ['%' + driver.name.split(' ')[0] + '%', monthStart, monthEnd]);

      // Dimension 3: Fuel records completeness
      const fuelTotal = await dbFirst(env.DB,
        `SELECT COUNT(*) AS cnt FROM fuel_log
         WHERE driver_id = ? AND date >= ? AND date <= ?`,
        [driver.id, monthStart, month + '-31']);
      const fuelGood = await dbFirst(env.DB,
        `SELECT COUNT(*) AS cnt FROM fuel_log
         WHERE driver_id = ? AND date >= ? AND date <= ?
         AND mileage_before IS NOT NULL`,
        [driver.id, monthStart, month + '-31']);

      // Dimension 4: Repair reports (expected = checks with issues)
      const issueChecks = await dbFirst(env.DB,
        `SELECT COUNT(*) AS cnt FROM check_log
         WHERE inspector LIKE ? AND created_at >= ? AND created_at <= ?
         AND overall_status IN ('warning','critical')`,
        ['%' + driver.name.split(' ')[0] + '%', monthStart, monthEnd]);
      const repairsFiled = await dbFirst(env.DB,
        `SELECT COUNT(*) AS cnt FROM repair_log
         WHERE reporter_name LIKE ? AND date_reported >= ? AND date_reported <= ?`,
        ['%' + driver.name.split(' ')[0] + '%', monthStart, month + '-31']);

      // Calculate score
      let totalExpected = 0;
      let totalCompleted = 0;
      const dimensions = [];

      if ((usageTotal?.cnt || 0) > 0) {
        totalExpected += usageTotal.cnt;
        totalCompleted += usageGood?.cnt || 0;
        dimensions.push({ name: 'usage', expected: usageTotal.cnt, completed: usageGood?.cnt || 0 });
      }
      if ((drivingDays?.cnt || 0) > 0) {
        totalExpected += drivingDays.cnt;
        totalCompleted += Math.min(checksCompleted?.cnt || 0, drivingDays.cnt);
        dimensions.push({ name: 'daily_check', expected: drivingDays.cnt, completed: Math.min(checksCompleted?.cnt || 0, drivingDays.cnt) });
      }
      if ((fuelTotal?.cnt || 0) > 0) {
        totalExpected += fuelTotal.cnt;
        totalCompleted += fuelGood?.cnt || 0;
        dimensions.push({ name: 'fuel', expected: fuelTotal.cnt, completed: fuelGood?.cnt || 0 });
      }
      if ((issueChecks?.cnt || 0) > 0) {
        totalExpected += issueChecks.cnt;
        totalCompleted += Math.min(repairsFiled?.cnt || 0, issueChecks.cnt);
        dimensions.push({ name: 'repair', expected: issueChecks.cnt, completed: Math.min(repairsFiled?.cnt || 0, issueChecks.cnt) });
      }

      const score = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 100;

      scores.push({
        driver_id: driver.id,
        driver_name: driver.name,
        driver_status: driver.status,
        score,
        total_expected: totalExpected,
        total_completed: totalCompleted,
        dimensions,
        month
      });
    }

    return success(scores);
  }

  // ========== Driver Performance — 9-Dimension Score ==========
  if (path === '/api/reports/driver-performance' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const dpDateFrom = url.searchParams.get('date_from') || new Date(Date.now() - 90 * 86400000).toISOString().substr(0, 10);
    const dpDateTo = url.searchParams.get('date_to') || now().substr(0, 10);
    const dpDrivers = await dbAll(env.DB, "SELECT id, name, status FROM drivers ORDER BY name", []);
    const dpResults = [];

    for (const drv of dpDrivers) {
      const did = drv.id;
      const sv = await dbFirst(env.DB, `SELECT AVG((politeness_score+safety_score+punctuality_score+cleanliness_score+appearance_score+overall_score)/6.0) AS avg_score, COUNT(*) AS cnt FROM survey_responses WHERE driver_id=? AND created_at>=? AND created_at<=?`, [did, dpDateFrom, dpDateTo+' 23:59:59']);
      const uAll = await dbFirst(env.DB, `SELECT COUNT(*) AS total FROM usage_records WHERE driver_id=? AND datetime>=? AND datetime<=?`, [did, dpDateFrom, dpDateTo+' 23:59:59']);
      const uGood = await dbFirst(env.DB, `SELECT COUNT(*) AS cnt FROM usage_records WHERE driver_id=? AND datetime>=? AND datetime<=? AND data_quality='normal'`, [did, dpDateFrom, dpDateTo+' 23:59:59']);
      const dd = await dbFirst(env.DB, `SELECT COUNT(DISTINCT date) AS cnt FROM queue WHERE driver_id=? AND date>=? AND date<=? AND status IN ('completed','ongoing')`, [did, dpDateFrom, dpDateTo]);
      const cd = await dbFirst(env.DB, `SELECT COUNT(DISTINCT DATE(created_at)) AS cnt FROM check_log WHERE car_id IN (SELECT car_id FROM queue WHERE driver_id=? AND date>=? AND date<=?) AND created_at>=? AND created_at<=?`, [did, dpDateFrom, dpDateTo, dpDateFrom, dpDateTo+' 23:59:59']);
      const qs = await dbAll(env.DB, `SELECT q.id, q.date, q.time_start, ur.datetime AS dep FROM queue q LEFT JOIN usage_records ur ON ur.queue_id=q.id AND ur.record_type='departure' WHERE q.driver_id=? AND q.date>=? AND q.date<=? AND q.status IN ('completed','ongoing')`, [did, dpDateFrom, dpDateTo]);
      let ot=0; for(const s of qs){if(!s.dep||!s.time_start)continue;if((new Date(s.dep)-new Date(s.date+'T'+s.time_start))/60000<=15)ot++;}
      const rc = await dbFirst(env.DB, `SELECT COALESCE(SUM(rl.cost),0) AS tc, COUNT(*) AS cnt FROM repair_log rl JOIN queue q ON rl.car_id=q.car_id WHERE q.driver_id=? AND rl.date_reported>=? AND rl.date_reported<=?`, [did, dpDateFrom, dpDateTo]);
      const tk = await dbFirst(env.DB, `SELECT COALESCE(SUM(mileage_end-mileage_start),0) AS km FROM usage_records WHERE driver_id=? AND record_type='return' AND datetime>=? AND datetime<=? AND mileage_end>mileage_start`, [did, dpDateFrom, dpDateTo+' 23:59:59']);
      const fa = await dbFirst(env.DB, `SELECT COUNT(*) AS total FROM fuel_log WHERE driver_id=? AND date>=? AND date<=? AND deleted_at IS NULL`, [did, dpDateFrom, dpDateTo]);
      const fg = await dbFirst(env.DB, `SELECT COUNT(*) AS cnt FROM fuel_log WHERE driver_id=? AND date>=? AND date<=? AND deleted_at IS NULL AND mileage_before IS NOT NULL AND mileage_after IS NOT NULL`, [did, dpDateFrom, dpDateTo]);
      const fe = await dbFirst(env.DB, `SELECT AVG(fuel_consumption_rate) AS avg_rate FROM fuel_log WHERE driver_id=? AND date>=? AND date<=? AND fuel_consumption_rate>0 AND deleted_at IS NULL`, [did, dpDateFrom, dpDateTo]);
      const al = await dbFirst(env.DB, `SELECT COUNT(*) AS cnt FROM inspection_alerts WHERE car_id IN (SELECT car_id FROM queue WHERE driver_id=? AND date>=? AND date<=?) AND created_at>=? AND created_at<=?`, [did, dpDateFrom, dpDateTo, dpDateFrom, dpDateTo+' 23:59:59']);
      const rf = await dbFirst(env.DB, `SELECT COUNT(*) AS cnt FROM repair_log WHERE reporter_name LIKE ? AND date_reported>=? AND date_reported<=?`, ['%'+(drv.name||'').split(' ')[0]+'%', dpDateFrom, dpDateTo]);
      const rt = await dbFirst(env.DB, `SELECT AVG(JULIANDAY(COALESCE(date_completed,date_reported))-JULIANDAY(date_reported)) AS avg_days FROM repair_log WHERE car_id IN (SELECT car_id FROM queue WHERE driver_id=? AND date>=? AND date<=?) AND date_reported>=?`, [did, dpDateFrom, dpDateTo, dpDateFrom]);

      const dims=[];
      dims.push({name:'survey',score:Math.min(sv?.avg_score||0,5),count:sv?.cnt||0});
      dims.push({name:'usage_quality',score:uAll?.total>0?((uGood?.cnt||0)/uAll.total)*5:0,count:uAll?.total||0});
      dims.push({name:'daily_check',score:dd?.cnt>0?Math.min(((cd?.cnt||0)/dd.cnt)*5,5):0,count:dd?.cnt||0});
      dims.push({name:'punctuality',score:qs.length>0?(ot/qs.length)*5:0,count:qs.length});
      const cpk=(tk?.km||0)>0?(rc?.tc||0)/tk.km:0;
      dims.push({name:'vehicle_care',score:Math.min(cpk===0?5:Math.max(5-cpk,0),5)});
      dims.push({name:'fuel_records',score:fa?.total>0?((fg?.cnt||0)/fa.total)*5:0,count:fa?.total||0});
      const er=fe?.avg_rate||0;
      dims.push({name:'fuel_efficiency',score:er>0?Math.min((er/8)*5,5):0});
      dims.push({name:'repair_reporting',score:al?.cnt>0?Math.min(((rf?.cnt||0)/al.cnt)*5,5):(rf?.cnt>0?5:0)});
      const atd=rt?.avg_days||0;
      dims.push({name:'repair_turnaround',score:rc?.cnt>0?(atd<=1?5:atd<=3?4:atd<=7?3:atd<=14?2:1):0});
      const avg=dims.reduce((s,d)=>s+d.score,0)/9;
      dpResults.push({driver_id:drv.id,driver_name:drv.name,driver_status:drv.status,avg_score:Math.round(avg*100)/100,dimensions:dims,date_from:dpDateFrom,date_to:dpDateTo});
    }
    return success(dpResults);
  }

  // ========== Driver Performance — Single Driver ==========
  if (path.match(/^\/api\/reports\/driver-performance\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const dpId = path.split('/').pop();
    const dpDF = url.searchParams.get('date_from') || new Date(Date.now()-90*86400000).toISOString().substr(0,10);
    const dpDT = url.searchParams.get('date_to') || now().substr(0,10);
    const dpDrv = await dbFirst(env.DB, "SELECT id, name, status FROM drivers WHERE id=?", [dpId]);
    if (!dpDrv) return error('ไม่พบพนักงาน', 404);
    const did=dpDrv.id;
    const sv=await dbFirst(env.DB,`SELECT AVG((politeness_score+safety_score+punctuality_score+cleanliness_score+appearance_score+overall_score)/6.0) AS avg_score,COUNT(*) AS cnt FROM survey_responses WHERE driver_id=? AND created_at>=? AND created_at<=?`,[did,dpDF,dpDT+' 23:59:59']);
    const uAll=await dbFirst(env.DB,`SELECT COUNT(*) AS total FROM usage_records WHERE driver_id=? AND datetime>=? AND datetime<=?`,[did,dpDF,dpDT+' 23:59:59']);
    const uGood=await dbFirst(env.DB,`SELECT COUNT(*) AS cnt FROM usage_records WHERE driver_id=? AND datetime>=? AND datetime<=? AND data_quality='normal'`,[did,dpDF,dpDT+' 23:59:59']);
    const dd=await dbFirst(env.DB,`SELECT COUNT(DISTINCT date) AS cnt FROM queue WHERE driver_id=? AND date>=? AND date<=? AND status IN ('completed','ongoing')`,[did,dpDF,dpDT]);
    const cd=await dbFirst(env.DB,`SELECT COUNT(DISTINCT DATE(created_at)) AS cnt FROM check_log WHERE car_id IN (SELECT car_id FROM queue WHERE driver_id=? AND date>=? AND date<=?) AND created_at>=? AND created_at<=?`,[did,dpDF,dpDT,dpDF,dpDT+' 23:59:59']);
    const qs=await dbAll(env.DB,`SELECT q.date,q.time_start,ur.datetime AS dep FROM queue q LEFT JOIN usage_records ur ON ur.queue_id=q.id AND ur.record_type='departure' WHERE q.driver_id=? AND q.date>=? AND q.date<=? AND q.status IN ('completed','ongoing')`,[did,dpDF,dpDT]);
    let ot=0;for(const s of qs){if(!s.dep||!s.time_start)continue;if((new Date(s.dep)-new Date(s.date+'T'+s.time_start))/60000<=15)ot++;}
    const rc=await dbFirst(env.DB,`SELECT COALESCE(SUM(rl.cost),0) AS tc,COUNT(*) AS cnt FROM repair_log rl JOIN queue q ON rl.car_id=q.car_id WHERE q.driver_id=? AND rl.date_reported>=? AND rl.date_reported<=?`,[did,dpDF,dpDT]);
    const tk=await dbFirst(env.DB,`SELECT COALESCE(SUM(mileage_end-mileage_start),0) AS km FROM usage_records WHERE driver_id=? AND record_type='return' AND datetime>=? AND datetime<=? AND mileage_end>mileage_start`,[did,dpDF,dpDT+' 23:59:59']);
    const fa=await dbFirst(env.DB,`SELECT COUNT(*) AS total FROM fuel_log WHERE driver_id=? AND date>=? AND date<=? AND deleted_at IS NULL`,[did,dpDF,dpDT]);
    const fg=await dbFirst(env.DB,`SELECT COUNT(*) AS cnt FROM fuel_log WHERE driver_id=? AND date>=? AND date<=? AND deleted_at IS NULL AND mileage_before IS NOT NULL AND mileage_after IS NOT NULL`,[did,dpDF,dpDT]);
    const fe=await dbFirst(env.DB,`SELECT AVG(fuel_consumption_rate) AS avg_rate FROM fuel_log WHERE driver_id=? AND date>=? AND date<=? AND fuel_consumption_rate>0 AND deleted_at IS NULL`,[did,dpDF,dpDT]);
    const al=await dbFirst(env.DB,`SELECT COUNT(*) AS cnt FROM inspection_alerts WHERE car_id IN (SELECT car_id FROM queue WHERE driver_id=? AND date>=? AND date<=?) AND created_at>=? AND created_at<=?`,[did,dpDF,dpDT,dpDF,dpDT+' 23:59:59']);
    const rf=await dbFirst(env.DB,`SELECT COUNT(*) AS cnt FROM repair_log WHERE reporter_name LIKE ? AND date_reported>=? AND date_reported<=?`,['%'+(dpDrv.name||'').split(' ')[0]+'%',dpDF,dpDT]);
    const rtd=await dbFirst(env.DB,`SELECT AVG(JULIANDAY(COALESCE(date_completed,date_reported))-JULIANDAY(date_reported)) AS avg_days FROM repair_log WHERE car_id IN (SELECT car_id FROM queue WHERE driver_id=? AND date>=? AND date<=?) AND date_reported>=?`,[did,dpDF,dpDT,dpDF]);
    const dims=[];
    dims.push({name:'survey',score:Math.min(sv?.avg_score||0,5),count:sv?.cnt||0});
    dims.push({name:'usage_quality',score:uAll?.total>0?((uGood?.cnt||0)/uAll.total)*5:0});
    dims.push({name:'daily_check',score:dd?.cnt>0?Math.min(((cd?.cnt||0)/dd.cnt)*5,5):0});
    dims.push({name:'punctuality',score:qs.length>0?(ot/qs.length)*5:0});
    const cpk2=(tk?.km||0)>0?(rc?.tc||0)/tk.km:0;
    dims.push({name:'vehicle_care',score:Math.min(cpk2===0?5:Math.max(5-cpk2,0),5)});
    dims.push({name:'fuel_records',score:fa?.total>0?((fg?.cnt||0)/fa.total)*5:0});
    dims.push({name:'fuel_efficiency',score:(fe?.avg_rate||0)>0?Math.min((fe.avg_rate/8)*5,5):0});
    dims.push({name:'repair_reporting',score:al?.cnt>0?Math.min(((rf?.cnt||0)/al.cnt)*5,5):(rf?.cnt>0?5:0)});
    const atd2=rtd?.avg_days||0;
    dims.push({name:'repair_turnaround',score:rc?.cnt>0?(atd2<=1?5:atd2<=3?4:atd2<=7?3:atd2<=14?2:1):0});
    const avg2=dims.reduce((s,d)=>s+d.score,0)/9;
    return success({driver_id:dpDrv.id,driver_name:dpDrv.name,driver_status:dpDrv.status,avg_score:Math.round(avg2*100)/100,dimensions:dims,date_from:dpDF,date_to:dpDT});
  }

  // ========== Vehicle Timeline ==========
  if (path.match(/^\/api\/reports\/vehicle-timeline\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const vtCarId = path.split('/').pop();
    const vtFrom = url.searchParams.get('date_from') || '2020-01-01';
    const vtTo = url.searchParams.get('date_to') || now().substr(0, 10);
    const vtType = url.searchParams.get('type');
    const events = [];
    if (!vtType || vtType === 'queue') { const r = await dbAll(env.DB, `SELECT q.id,q.date,q.time_start,q.time_end,q.destination,q.purpose,q.status,d.name AS driver_name FROM queue q LEFT JOIN drivers d ON q.driver_id=d.id WHERE q.car_id=? AND q.date>=? AND q.date<=? ORDER BY q.date DESC`, [vtCarId,vtFrom,vtTo]); r.forEach(x=>events.push({type:'queue',date:x.date,data:x})); }
    if (!vtType || vtType === 'usage') { const r = await dbAll(env.DB, `SELECT id,datetime,record_type,mileage_start,mileage_end,data_quality FROM usage_records WHERE car_id=? AND datetime>=? AND datetime<=? ORDER BY datetime DESC`, [vtCarId,vtFrom,vtTo+' 23:59:59']); r.forEach(x=>events.push({type:'usage',date:x.datetime?.substr(0,10),data:x})); }
    if (!vtType || vtType === 'fuel') { const r = await dbAll(env.DB, `SELECT id,date,liters,amount,fuel_type,gas_station_name FROM fuel_log WHERE car_id=? AND date>=? AND date<=? AND deleted_at IS NULL ORDER BY date DESC`, [vtCarId,vtFrom,vtTo]); r.forEach(x=>events.push({type:'fuel',date:x.date,data:x})); }
    if (!vtType || vtType === 'repair') { const r = await dbAll(env.DB, `SELECT id,date_reported,description,cost,status FROM repair_log WHERE car_id=? AND date_reported>=? AND date_reported<=? ORDER BY date_reported DESC`, [vtCarId,vtFrom,vtTo]); r.forEach(x=>events.push({type:'repair',date:x.date_reported,data:x})); }
    if (!vtType || vtType === 'check') { const r = await dbAll(env.DB, `SELECT id,created_at,overall_status,inspector FROM check_log WHERE car_id=? AND created_at>=? AND created_at<=? ORDER BY created_at DESC`, [vtCarId,vtFrom,vtTo+' 23:59:59']); r.forEach(x=>events.push({type:'check',date:x.created_at?.substr(0,10),data:x})); }
    if (!vtType || vtType === 'tax') { const r = await dbAll(env.DB, `SELECT id,paid_date,expiry_date,amount,tax_type FROM tax_records WHERE car_id=? ORDER BY paid_date DESC`, [vtCarId]); r.forEach(x=>events.push({type:'tax',date:x.paid_date,data:x})); }
    if (!vtType || vtType === 'insurance') { const r = await dbAll(env.DB, `SELECT id,paid_date,expiry_date,amount,insurance_type,insurance_company FROM insurance_records WHERE car_id=? ORDER BY paid_date DESC`, [vtCarId]); r.forEach(x=>events.push({type:'insurance',date:x.paid_date,data:x})); }
    if (!vtType || vtType === 'inspection') { const r = await dbAll(env.DB, `SELECT id,inspection_date,expiry_date,result,cost,station_name FROM inspection_records WHERE car_id=? ORDER BY inspection_date DESC`, [vtCarId]); r.forEach(x=>events.push({type:'inspection',date:x.inspection_date,data:x})); }
    if (!vtType || vtType === 'incident') { const r = await dbAll(env.DB, `SELECT id,incident_date,incident_type,description,damage_cost,status FROM incidents WHERE car_id=? ORDER BY incident_date DESC`, [vtCarId]); r.forEach(x=>events.push({type:'incident',date:x.incident_date,data:x})); }
    events.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    return success(events);
  }

  // ========== Vehicle Cost Summary ==========
  if (path.match(/^\/api\/reports\/vehicle-cost\/[^/]+$/) && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const vcCarId = path.split('/').pop();
    const vcFrom = url.searchParams.get('date_from') || '2020-01-01';
    const vcTo = url.searchParams.get('date_to') || now().substr(0, 10);
    const [vcFuel,vcRepair,vcTax,vcIns,vcInsp] = await Promise.all([
      dbFirst(env.DB, `SELECT COALESCE(SUM(amount),0) AS total FROM fuel_log WHERE car_id=? AND date>=? AND date<=? AND deleted_at IS NULL`, [vcCarId,vcFrom,vcTo]),
      dbFirst(env.DB, `SELECT COALESCE(SUM(cost),0) AS total FROM repair_log WHERE car_id=? AND date_reported>=? AND date_reported<=?`, [vcCarId,vcFrom,vcTo]),
      dbFirst(env.DB, `SELECT COALESCE(SUM(amount),0) AS total FROM tax_records WHERE car_id=?`, [vcCarId]),
      dbFirst(env.DB, `SELECT COALESCE(SUM(amount),0) AS total FROM insurance_records WHERE car_id=?`, [vcCarId]),
      dbFirst(env.DB, `SELECT COALESCE(SUM(cost),0) AS total FROM inspection_records WHERE car_id=?`, [vcCarId])
    ]);
    return success({ car_id:vcCarId, fuel:vcFuel?.total||0, repair:vcRepair?.total||0, tax:vcTax?.total||0, insurance:vcIns?.total||0, inspection:vcInsp?.total||0, grand_total:(vcFuel?.total||0)+(vcRepair?.total||0)+(vcTax?.total||0)+(vcIns?.total||0)+(vcInsp?.total||0), date_from:vcFrom, date_to:vcTo });
  }

  // ========== Data Quality Report ==========
  if (path === '/api/reports/data-quality' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }

    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const where = [];
    const params = [];
    if (dateFrom) { where.push('ur.datetime >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('ur.datetime <= ?'); params.push(dateTo + ' 23:59:59'); }

    // Overview counts
    const overview = await dbFirst(env.DB,
      `SELECT
       COUNT(*) AS total_records,
       SUM(CASE WHEN data_quality = 'normal' THEN 1 ELSE 0 END) AS normal,
       SUM(CASE WHEN data_quality = 'auto_departure' THEN 1 ELSE 0 END) AS auto_departure,
       SUM(CASE WHEN data_quality = 'auto_return' THEN 1 ELSE 0 END) AS auto_return,
       SUM(CASE WHEN data_quality = 'auto_unresolved' THEN 1 ELSE 0 END) AS auto_unresolved,
       SUM(CASE WHEN data_quality = 'gap_record' THEN 1 ELSE 0 END) AS gap_record,
       SUM(CASE WHEN data_quality = 'late_return' THEN 1 ELSE 0 END) AS late_return,
       SUM(CASE WHEN data_quality = 'departure_only' THEN 1 ELSE 0 END) AS departure_only,
       SUM(CASE WHEN is_historical = 1 THEN 1 ELSE 0 END) AS historical
       FROM usage_records ur
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
      params
    );

    // Per-vehicle gap analysis
    const vehicleGaps = await dbAll(env.DB,
      `SELECT c.license_plate, c.brand,
       COUNT(*) AS gap_count,
       GROUP_CONCAT(ur.auto_notes, ' | ') AS gap_details
       FROM usage_records ur
       LEFT JOIN cars c ON ur.car_id = c.id
       WHERE ur.data_quality = 'gap_record'
       ${where.length ? 'AND ' + where.join(' AND ') : ''}
       GROUP BY ur.car_id
       ORDER BY gap_count DESC`,
      params
    );

    // Per-driver missing record stats
    const driverStats = await dbAll(env.DB,
      `SELECT d.name AS driver_name,
       SUM(CASE WHEN ur.data_quality = 'auto_departure' THEN 1 ELSE 0 END) AS missed_departures,
       SUM(CASE WHEN ur.data_quality = 'auto_return' THEN 1 ELSE 0 END) AS missed_returns,
       SUM(CASE WHEN ur.data_quality = 'late_return' THEN 1 ELSE 0 END) AS late_returns,
       SUM(CASE WHEN ur.data_quality = 'gap_record' THEN 1 ELSE 0 END) AS gaps,
       COUNT(*) AS total_issues
       FROM usage_records ur
       LEFT JOIN drivers d ON ur.driver_id = d.id
       WHERE ur.data_quality != 'normal'
       ${where.length ? 'AND ' + where.join(' AND ') : ''}
       GROUP BY ur.driver_id
       ORDER BY total_issues DESC`,
      params
    );

    // Gap cost estimation
    const defaultRate = await dbFirst(env.DB,
      "SELECT value FROM system_settings WHERE key = 'default_fuel_consumption_rate'", []);
    const fuelRate = parseFloat(defaultRate?.value || '8'); // km/liter

    // Get average fuel price from fuel_log
    const avgPrice = await dbFirst(env.DB,
      `SELECT AVG(price_per_liter) AS avg_price FROM fuel_log
       WHERE price_per_liter IS NOT NULL AND price_per_liter > 0`, []);

    return success({
      overview,
      vehicle_gaps: vehicleGaps,
      driver_stats: driverStats,
      estimation: {
        fuel_consumption_rate: fuelRate,
        avg_fuel_price: Math.round((avgPrice?.avg_price || 0) * 100) / 100
      }
    });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}