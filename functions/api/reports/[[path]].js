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
         FROM fuel_log WHERE date LIKE ?`, [monthStart + '%']),
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
       (SELECT COALESCE(SUM(fl.liters),0) FROM fuel_log fl WHERE fl.car_id = c.id) AS total_fuel_liters,
       (SELECT COALESCE(SUM(fl.amount),0) FROM fuel_log fl WHERE fl.car_id = c.id) AS total_fuel_cost,
       (SELECT COUNT(*) FROM repair_log rl WHERE rl.car_id = c.id) AS repair_count,
       (SELECT COALESCE(SUM(rl.cost),0) FROM repair_log rl WHERE rl.car_id = c.id) AS total_repair_cost
       FROM cars c ORDER BY c.license_plate`, []
    );
    return success(rows);
  }

  // ========== Fuel Report ==========
  if (path === '/api/reports/fuel' && method === 'GET') {
    try { requirePermission(user, 'reports', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const carId = url.searchParams.get('car_id');
    const where = [];
    const params = [];
    if (dateFrom) { where.push('fl.date >= ?'); params.push(dateFrom); }
    if (dateTo) { where.push('fl.date <= ?'); params.push(dateTo); }
    if (carId) { where.push('fl.car_id = ?'); params.push(carId); }
    const rows = await dbAll(env.DB,
      `SELECT fl.id, fl.date, fl.car_id, c.license_plate, c.brand,
       d.name AS driver_name, fl.liters, fl.price_per_liter, fl.amount,
       fl.fuel_type, fl.gas_station_name, fl.mileage_before, fl.mileage_after,
       fl.fuel_consumption_rate, fl.expense_type
       FROM fuel_log fl
       LEFT JOIN cars c ON fl.car_id = c.id
       LEFT JOIN drivers d ON fl.driver_id = d.id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY fl.date DESC LIMIT 1000`,
      params
    );

    // Summary
    const summary = await dbFirst(env.DB,
      `SELECT COUNT(*) AS count, COALESCE(SUM(liters),0) AS total_liters,
       COALESCE(SUM(amount),0) AS total_amount,
       COALESCE(AVG(fuel_consumption_rate),0) AS avg_consumption
       FROM fuel_log fl
       ${where.length ? 'WHERE ' + where.map(w => w.replace('fl.','')).join(' AND ') : ''}`,
      params
    );

    return success({ records: rows, summary });
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
       CASE
         WHEN vm.next_km IS NOT NULL AND c.current_mileage >= vm.next_km THEN 'overdue'
         WHEN vm.next_date IS NOT NULL AND vm.next_date <= date('now') THEN 'overdue'
         WHEN vm.next_km IS NOT NULL AND c.current_mileage >= (vm.next_km - ms.interval_km * 0.1) THEN 'upcoming'
         WHEN vm.next_date IS NOT NULL AND vm.next_date <= date('now', '+30 days') THEN 'upcoming'
         ELSE 'ok'
       END AS maintenance_status
       FROM vehicle_maintenance vm
       LEFT JOIN cars c ON vm.car_id = c.id
       LEFT JOIN maintenance_settings ms ON vm.item_key = ms.item_key
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