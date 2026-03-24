// PPK DriveHub - Reports & Dashboard Handlers
import { ok, fail, sanitize, nowThai, todayThai } from '../_helpers.js';
import { requirePermission } from '../_middleware.js';

export async function handleReports(ctx) {
  const { action, body, user, DB } = ctx;

  // ════════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getDashboardStatsToday') {
    const today = todayThai();
    const [q1, q2, q3, q4, q5, q6] = await Promise.all([
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE WHERE date=?`).bind(today).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE WHERE date=? AND status='ongoing'`).bind(today).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE WHERE date=? AND status='scheduled'`).bind(today).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE WHERE date=? AND status='cancelled'`).bind(today).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM CARS WHERE active=1 AND status='active'`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM DRIVERS WHERE status='active' AND fatigue_flag=0`).first(),
    ]);
    // Pending repairs
    const pendingRepairs = await DB.prepare(`SELECT COUNT(*) as cnt FROM REPAIR_LOG WHERE status IN ('pending','in_progress')`).first();
    // Alerts
    const alerts = await DB.prepare(`SELECT COUNT(*) as cnt FROM INSPECTION_ALERTS WHERE status='pending'`).first();
    // Today fuel total
    const fuelToday = await DB.prepare(`SELECT SUM(total_cost) as total FROM FUEL_LOG WHERE fuel_date=?`).bind(today).first();
    return ok({
      date: today,
      queues: q1?.cnt || 0,
      ongoing: q2?.cnt || 0,
      scheduled: q3?.cnt || 0,
      cancelled: q4?.cnt || 0,
      available_cars: q5?.cnt || 0,
      available_drivers: q6?.cnt || 0,
      pending_repairs: pendingRepairs?.cnt || 0,
      inspection_alerts: alerts?.cnt || 0,
      fuel_cost_today: fuelToday?.total || 0,
    });
  }

  if (action === 'getAdminDashboardStats') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const today = todayThai();
    const thisMonth = today.slice(0, 7);
    const lastMonth = new Date(new Date(thisMonth + '-01').getTime() - 1000);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);
    const [
      totalCars, activeCars, totalDrivers, activeDrivers,
      totalUsers, pendingRequests,
      thisMonthQueues, lastMonthQueues,
      thisMonthFuel, lastMonthFuel,
      pendingRepairs, pendingLeaves
    ] = await Promise.all([
      DB.prepare(`SELECT COUNT(*) as cnt FROM CARS WHERE active=1`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM CARS WHERE active=1 AND status='active'`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM DRIVERS`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM DRIVERS WHERE status='active'`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM USERS WHERE active=1`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM USER_REQUESTS WHERE status='pending'`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE WHERE date LIKE ?`).bind(`${thisMonth}%`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE WHERE date LIKE ?`).bind(`${lastMonthStr}%`).first(),
      DB.prepare(`SELECT SUM(total_cost) as total FROM FUEL_LOG WHERE fuel_date LIKE ?`).bind(`${thisMonth}%`).first(),
      DB.prepare(`SELECT SUM(total_cost) as total FROM FUEL_LOG WHERE fuel_date LIKE ?`).bind(`${lastMonthStr}%`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM REPAIR_LOG WHERE status IN ('pending','in_progress')`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM LEAVES WHERE status='pending'`).first(),
    ]);
    return ok({
      cars: { total: totalCars?.cnt || 0, active: activeCars?.cnt || 0 },
      drivers: { total: totalDrivers?.cnt || 0, active: activeDrivers?.cnt || 0 },
      users: { total: totalUsers?.cnt || 0, pending_requests: pendingRequests?.cnt || 0 },
      queues: { this_month: thisMonthQueues?.cnt || 0, last_month: lastMonthQueues?.cnt || 0 },
      fuel: { this_month_cost: thisMonthFuel?.total || 0, last_month_cost: lastMonthFuel?.total || 0 },
      repairs: { pending: pendingRepairs?.cnt || 0 },
      leaves: { pending: pendingLeaves?.cnt || 0 },
      generated_at: nowThai(),
    });
  }

  if (action === 'getPublicLandingStats') {
    const [cars, drivers, queues] = await Promise.all([
      DB.prepare(`SELECT COUNT(*) as cnt FROM CARS WHERE active=1`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM DRIVERS WHERE status='active'`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE`).first(),
    ]);
    return ok({ total_cars: cars?.cnt || 0, total_drivers: drivers?.cnt || 0, total_queues: queues?.cnt || 0 });
  }

  if (action === 'getExecutiveDashboard') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const year = sanitize(body.year || todayThai().slice(0, 4));
    const [monthlyQueues, monthlyFuel, topDrivers, topCars] = await Promise.all([
      DB.prepare(
        `SELECT SUBSTR(date,1,7) as month, COUNT(*) as count FROM QUEUE WHERE date LIKE ? AND status != 'cancelled' GROUP BY month ORDER BY month`
      ).bind(`${year}%`).all(),
      DB.prepare(
        `SELECT SUBSTR(fuel_date,1,7) as month, SUM(total_cost) as total FROM FUEL_LOG WHERE fuel_date LIKE ? GROUP BY month ORDER BY month`
      ).bind(`${year}%`).all(),
      DB.prepare(
        `SELECT d.full_name, COUNT(q.queue_id) as trips FROM QUEUE q LEFT JOIN DRIVERS d ON q.driver_id=d.driver_id WHERE q.date LIKE ? AND q.status != 'cancelled' GROUP BY q.driver_id ORDER BY trips DESC LIMIT 5`
      ).bind(`${year}%`).all(),
      DB.prepare(
        `SELECT c.license_plate, c.brand, c.model, COUNT(q.queue_id) as trips FROM QUEUE q LEFT JOIN CARS c ON q.car_id=c.car_id WHERE q.date LIKE ? AND q.status != 'cancelled' GROUP BY q.car_id ORDER BY trips DESC LIMIT 5`
      ).bind(`${year}%`).all(),
    ]);
    return ok({
      year,
      monthly_queues: monthlyQueues.results,
      monthly_fuel_cost: monthlyFuel.results,
      top_drivers: topDrivers.results,
      top_vehicles: topCars.results,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // QUEUE REPORT
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getQueueReport') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const from = sanitize(body.date_from || body.month || todayThai().slice(0, 7) + '-01');
    const to = sanitize(body.date_to || todayThai());
    const rows = await DB.prepare(
      `SELECT qu.*,c.license_plate,c.brand,c.model,d.full_name as driver_name
       FROM QUEUE qu LEFT JOIN CARS c ON qu.car_id=c.car_id LEFT JOIN DRIVERS d ON qu.driver_id=d.driver_id
       WHERE qu.date BETWEEN ? AND ? ORDER BY qu.date DESC, qu.time_start ASC`
    ).bind(from, to).all();
    const summary = await DB.prepare(
      `SELECT status, COUNT(*) as count FROM QUEUE WHERE date BETWEEN ? AND ? GROUP BY status`
    ).bind(from, to).all();
    const mileageRows = rows.results.filter(r => r.mileage_start && r.mileage_end);
    const totalKm = mileageRows.reduce((s, r) => s + (Number(r.mileage_end) - Number(r.mileage_start)), 0);
    return ok({
      from, to,
      total_records: rows.results.length,
      by_status: summary.results,
      total_km: totalKm,
      records: rows.results.slice(0, 500),
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FUEL REPORT
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getFuelReport') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const from = sanitize(body.date_from || body.month + '-01');
    const to = sanitize(body.date_to || todayThai());
    const rows = await DB.prepare(
      `SELECT fl.*,c.license_plate,c.brand FROM FUEL_LOG fl LEFT JOIN CARS c ON fl.car_id=c.car_id
       WHERE fl.fuel_date BETWEEN ? AND ? ORDER BY fl.fuel_date DESC`
    ).bind(from, to).all();
    const summary = await DB.prepare(
      `SELECT SUM(liters) as total_liters, SUM(total_cost) as total_cost, COUNT(*) as fill_count
       FROM FUEL_LOG WHERE fuel_date BETWEEN ? AND ?`
    ).bind(from, to).first();
    return ok({
      from, to,
      total_fills: summary?.fill_count || 0,
      total_liters: summary?.total_liters || 0,
      total_cost: summary?.total_cost || 0,
      records: rows.results,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REPAIR REPORT
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getRepairReport') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const from = sanitize(body.date_from || body.month + '-01');
    const to = sanitize(body.date_to || todayThai());
    const rows = await DB.prepare(
      `SELECT r.*,c.license_plate,c.brand FROM REPAIR_LOG r LEFT JOIN CARS c ON r.car_id=c.car_id
       WHERE r.repair_date BETWEEN ? AND ? ORDER BY r.repair_date DESC`
    ).bind(from, to).all();
    const summary = await DB.prepare(
      `SELECT SUM(total_cost) as total_cost, COUNT(*) as repair_count FROM REPAIR_LOG WHERE repair_date BETWEEN ? AND ?`
    ).bind(from, to).first();
    return ok({ from, to, total_repairs: summary?.repair_count || 0, total_cost: summary?.total_cost || 0, records: rows.results });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VEHICLE USAGE REPORT
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getVehicleUsageReport') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const from = sanitize(body.date_from || todayThai().slice(0, 7) + '-01');
    const to = sanitize(body.date_to || todayThai());
    const rows = await DB.prepare(
      `SELECT c.car_id,c.license_plate,c.brand,c.model,
       COUNT(q.queue_id) as trips,
       SUM(CASE WHEN q.mileage_end IS NOT NULL AND q.mileage_start IS NOT NULL THEN q.mileage_end - q.mileage_start ELSE 0 END) as total_km,
       SUM(fl.total_cost) as fuel_cost,
       SUM(r.total_cost) as repair_cost
       FROM CARS c
       LEFT JOIN QUEUE q ON c.car_id=q.car_id AND q.date BETWEEN ? AND ? AND q.status != 'cancelled'
       LEFT JOIN FUEL_LOG fl ON c.car_id=fl.car_id AND fl.fuel_date BETWEEN ? AND ?
       LEFT JOIN REPAIR_LOG r ON c.car_id=r.car_id AND r.repair_date BETWEEN ? AND ?
       WHERE c.active=1
       GROUP BY c.car_id ORDER BY trips DESC`
    ).bind(from, to, from, to, from, to).all();
    return ok({ from, to, by_vehicle: rows.results });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COMPREHENSIVE REPORT
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getComprehensiveReport') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const from = sanitize(body.date_from || todayThai().slice(0, 7) + '-01');
    const to = sanitize(body.date_to || todayThai());
    const [queueSummary, fuelSummary, repairSummary, topDrivers, topCars] = await Promise.all([
      DB.prepare(`SELECT status,COUNT(*) as count FROM QUEUE WHERE date BETWEEN ? AND ? GROUP BY status`).bind(from, to).all(),
      DB.prepare(`SELECT SUM(liters) as liters, SUM(total_cost) as cost FROM FUEL_LOG WHERE fuel_date BETWEEN ? AND ?`).bind(from, to).first(),
      DB.prepare(`SELECT SUM(total_cost) as cost, COUNT(*) as count FROM REPAIR_LOG WHERE repair_date BETWEEN ? AND ?`).bind(from, to).first(),
      DB.prepare(`SELECT d.full_name, COUNT(*) as trips FROM QUEUE q LEFT JOIN DRIVERS d ON q.driver_id=d.driver_id WHERE q.date BETWEEN ? AND ? AND q.status != 'cancelled' GROUP BY q.driver_id ORDER BY trips DESC LIMIT 5`).bind(from, to).all(),
      DB.prepare(`SELECT c.license_plate, c.brand, COUNT(*) as trips FROM QUEUE q LEFT JOIN CARS c ON q.car_id=c.car_id WHERE q.date BETWEEN ? AND ? AND q.status != 'cancelled' GROUP BY q.car_id ORDER BY trips DESC LIMIT 5`).bind(from, to).all(),
    ]);
    return ok({
      period: { from, to },
      queues: queueSummary.results,
      fuel: { total_liters: fuelSummary?.liters || 0, total_cost: fuelSummary?.cost || 0 },
      repairs: { count: repairSummary?.count || 0, total_cost: repairSummary?.cost || 0 },
      top_drivers: topDrivers.results,
      top_vehicles: topCars.results,
      generated_at: nowThai(),
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // KPIs
  // ════════════════════════════════════════════════════════════════════════════
  if (action === 'getAllKPIs') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const today = todayThai();
    const thisMonth = today.slice(0, 7);
    const [carsTotal, carsActive, driversActive, driversFatigue,
      queueMonth, queueCancelled, fuelMonth] = await Promise.all([
      DB.prepare(`SELECT COUNT(*) as cnt FROM CARS WHERE active=1`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM CARS WHERE active=1 AND status='active'`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM DRIVERS WHERE status='active'`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM DRIVERS WHERE fatigue_flag=1 AND status='active'`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE WHERE date LIKE ? AND status != 'cancelled'`).bind(`${thisMonth}%`).first(),
      DB.prepare(`SELECT COUNT(*) as cnt FROM QUEUE WHERE date LIKE ? AND status='cancelled'`).bind(`${thisMonth}%`).first(),
      DB.prepare(`SELECT SUM(total_cost) as total FROM FUEL_LOG WHERE fuel_date LIKE ?`).bind(`${thisMonth}%`).first(),
    ]);
    const totalQueues = (queueMonth?.cnt || 0) + (queueCancelled?.cnt || 0);
    const cancellationRate = totalQueues > 0 ? ((queueCancelled?.cnt || 0) / totalQueues * 100).toFixed(1) : '0';
    const carAvailability = (carsTotal?.cnt || 0) > 0 ? ((carsActive?.cnt || 0) / (carsTotal?.cnt || 1) * 100).toFixed(1) : '100';
    return ok({
      car_availability_pct: carAvailability,
      driver_fatigue_count: driversFatigue?.cnt || 0,
      queue_this_month: queueMonth?.cnt || 0,
      cancellation_rate_pct: cancellationRate,
      fuel_cost_this_month: fuelMonth?.total || 0,
      kpi_date: today,
    });
  }

  if (action === 'getKPIThreshold') {
    return ok({
      car_availability: { green: 90, yellow: 75, red: 0 },
      cancellation_rate: { green: 5, yellow: 15, red: 100 },
      fatigue_drivers: { green: 0, yellow: 2, red: 5 },
    });
  }

  if (action === 'calculateVehicleAvailability') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const cid = sanitize(body.car_id);
    const month = sanitize(body.month || todayThai().slice(0, 7));
    const totalDays = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate();
    const busyDays = await DB.prepare(
      `SELECT COUNT(DISTINCT date) as cnt FROM QUEUE WHERE car_id=? AND date LIKE ? AND status != 'cancelled'`
    ).bind(cid, `${month}%`).first();
    const repairDays = await DB.prepare(
      `SELECT COUNT(*) as cnt FROM REPAIR_LOG WHERE car_id=? AND repair_date LIKE ? AND status IN ('pending','in_progress')`
    ).bind(cid, `${month}%`).first();
    const available = totalDays - (repairDays?.cnt || 0);
    const utilized = busyDays?.cnt || 0;
    const utilization = available > 0 ? (utilized / available * 100).toFixed(1) : '0';
    return ok({ car_id: cid, month, total_days: totalDays, repair_days: repairDays?.cnt || 0, available_days: available, utilized_days: utilized, utilization_pct: utilization });
  }

  if (action === 'analyzeVehicleUsagePatterns') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const cid = sanitize(body.car_id);
    const rows = await DB.prepare(
      `SELECT SUBSTR(date,1,7) as month, COUNT(*) as trips,
       AVG(CASE WHEN mileage_end > 0 AND mileage_start > 0 THEN mileage_end - mileage_start END) as avg_km
       FROM QUEUE WHERE car_id=? AND status != 'cancelled' GROUP BY month ORDER BY month DESC LIMIT 12`
    ).bind(cid).all();
    return ok(rows.results);
  }

  if (action === 'getSystemSnapshot') {
    const permErr = requirePermission(user, 'reports', 'view');
    if (permErr) return permErr;
    const snaps = await DB.prepare(`SELECT snapshot_id,snapshot_date,created_at FROM SYSTEM_SNAPSHOT ORDER BY created_at DESC LIMIT 30`).all();
    return ok(snaps.results);
  }

  return fail(`Unknown report action: ${action}`, 'UNKNOWN_ACTION');
}
