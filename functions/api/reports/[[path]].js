// Dashboard stats + analytics
import {
  dbAll, dbFirst, dbRun, success, error, requirePermission
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);
  if (method !== 'GET') return error('Method Not Allowed', 405);

  if (path === '/api/reports/dashboard') {
    const [
      totalVehicles, activeVehicles,
      totalDrivers, activeDrivers,
      queueToday, fuelThisMonth,
      openRepairs, expiringDocs
    ] = await Promise.all([
      dbFirst(env.DB, 'SELECT COUNT(*) as cnt FROM cars WHERE active = 1'),
      dbFirst(env.DB, "SELECT COUNT(*) as cnt FROM cars WHERE active = 1 AND status = 'active'"),
      dbFirst(env.DB, 'SELECT COUNT(*) as cnt FROM drivers WHERE active = 1'),
      dbFirst(env.DB, "SELECT COUNT(*) as cnt FROM drivers WHERE active = 1 AND status = 'active'"),
      dbFirst(env.DB, `SELECT COUNT(*) as cnt FROM queue WHERE departure_date = date('now') AND status NOT IN ('cancelled')`),
      dbFirst(env.DB, `SELECT COALESCE(SUM(total_cost),0) as total FROM fuel_log WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now')`),
      dbFirst(env.DB, "SELECT COUNT(*) as cnt FROM repair_log WHERE status NOT IN ('completed','cancelled')"),
      dbFirst(env.DB, `SELECT COUNT(*) as cnt FROM cars WHERE active = 1 AND (registration_expiry <= date('now','+30 days') OR insurance_expiry <= date('now','+30 days'))`)
    ]);

    return success({
      vehicles: { total: totalVehicles?.cnt || 0, active: activeVehicles?.cnt || 0 },
      drivers: { total: totalDrivers?.cnt || 0, active: activeDrivers?.cnt || 0 },
      queue_today: queueToday?.cnt || 0,
      fuel_cost_this_month: fuelThisMonth?.total || 0,
      open_repairs: openRepairs?.cnt || 0,
      expiring_documents: expiringDocs?.cnt || 0,
    });
  }

  if (path === '/api/reports/fuel') {
    const year = url.searchParams.get('year') || new Date().getFullYear().toString();
    const [monthly, byVehicle, byType] = await Promise.all([
      dbAll(env.DB,
        `SELECT strftime('%Y-%m', created_at) as month, SUM(liters) as total_liters,
         SUM(total_cost) as total_cost, COUNT(*) as fill_count
         FROM fuel_log WHERE strftime('%Y', created_at) = ? GROUP BY month ORDER BY month`,
        [year]
      ),
      dbAll(env.DB,
        `SELECT c.car_id as car_code, c.brand, c.license_plate,
         SUM(fl.liters) as total_liters, SUM(fl.total_cost) as total_cost, COUNT(*) as fill_count
         FROM fuel_log fl JOIN cars c ON fl.car_id = c.id
         WHERE strftime('%Y', fl.created_at) = ?
         GROUP BY fl.car_id ORDER BY total_cost DESC LIMIT 20`,
        [year]
      ),
      dbAll(env.DB,
        `SELECT fuel_type_label, SUM(liters) as total_liters, SUM(total_cost) as total_cost
         FROM fuel_log WHERE strftime('%Y', created_at) = ?
         GROUP BY fuel_type ORDER BY total_cost DESC`,
        [year]
      )
    ]);
    return success({ year, monthly, by_vehicle: byVehicle, by_type: byType });
  }

  if (path === '/api/reports/usage') {
    const year = url.searchParams.get('year') || new Date().getFullYear().toString();
    const [monthly, byVehicle] = await Promise.all([
      dbAll(env.DB,
        `SELECT strftime('%Y-%m', departure_date) as month, COUNT(*) as trip_count,
         SUM(passenger_count) as total_passengers,
         SUM(CASE WHEN mileage_end > 0 AND mileage_start > 0 THEN mileage_end - mileage_start ELSE 0 END) as total_km
         FROM usage_records WHERE strftime('%Y', departure_date) = ? GROUP BY month ORDER BY month`,
        [year]
      ),
      dbAll(env.DB,
        `SELECT c.car_id as car_code, c.brand, c.license_plate, COUNT(*) as trip_count,
         SUM(ur.passenger_count) as total_passengers
         FROM usage_records ur JOIN cars c ON ur.car_id = c.id
         WHERE strftime('%Y', ur.departure_date) = ?
         GROUP BY ur.car_id ORDER BY trip_count DESC LIMIT 20`,
        [year]
      )
    ]);
    return success({ year, monthly, by_vehicle: byVehicle });
  }

  if (path === '/api/reports/repair') {
    const year = url.searchParams.get('year') || new Date().getFullYear().toString();
    const [monthly, byVehicle, byType] = await Promise.all([
      dbAll(env.DB,
        `SELECT strftime('%Y-%m', report_date) as month, COUNT(*) as repair_count,
         SUM(actual_cost) as total_cost FROM repair_log
         WHERE strftime('%Y', report_date) = ? GROUP BY month ORDER BY month`,
        [year]
      ),
      dbAll(env.DB,
        `SELECT c.car_id as car_code, c.brand, c.license_plate,
         COUNT(*) as repair_count, SUM(rl.actual_cost) as total_cost
         FROM repair_log rl JOIN cars c ON rl.car_id = c.id
         WHERE strftime('%Y', rl.report_date) = ?
         GROUP BY rl.car_id ORDER BY total_cost DESC LIMIT 20`,
        [year]
      ),
      dbAll(env.DB,
        `SELECT repair_type, COUNT(*) as cnt, SUM(actual_cost) as total_cost
         FROM repair_log WHERE strftime('%Y', report_date) = ?
         GROUP BY repair_type ORDER BY cnt DESC`,
        [year]
      )
    ]);
    return success({ year, monthly, by_vehicle: byVehicle, by_type: byType });
  }

  if (path === '/api/reports/health') {
    // Simple health score: based on last check_log, pending repairs, expiry dates
    const vehicles = await dbAll(env.DB,
      `SELECT c.id, c.car_id, c.brand, c.license_plate, c.status,
       c.registration_expiry, c.insurance_expiry, c.last_check_date,
       (SELECT COUNT(*) FROM repair_log rl WHERE rl.car_id = c.id AND rl.status NOT IN ('completed','cancelled')) as open_repairs,
       (SELECT cl.status FROM check_log cl WHERE cl.car_id = c.id ORDER BY cl.check_date DESC LIMIT 1) as last_check_status
       FROM cars c WHERE c.active = 1 ORDER BY c.car_id`
    );
    const today = new Date();
    const scored = vehicles.map(v => {
      let score = 100;
      if (v.open_repairs > 0) score -= v.open_repairs * 10;
      if (v.last_check_status === 'has_issues') score -= 15;
      if (v.registration_expiry) {
        const days = Math.floor((new Date(v.registration_expiry) - today) / 86400000);
        if (days < 0) score -= 30;
        else if (days < 30) score -= 15;
      }
      if (v.insurance_expiry) {
        const days = Math.floor((new Date(v.insurance_expiry) - today) / 86400000);
        if (days < 0) score -= 30;
        else if (days < 30) score -= 15;
      }
      return { ...v, health_score: Math.max(0, score) };
    });
    return success(scored);
  }

  if (path === '/api/reports/drivers') {
    const year = url.searchParams.get('year') || new Date().getFullYear().toString();
    const drivers = await dbAll(env.DB,
      `SELECT d.id, d.display_name, d.license_type,
       COUNT(DISTINCT ur.id) as trip_count,
       COUNT(DISTINCT l.id) as leave_count,
       COUNT(DISTINCT sf.id) as fatigue_reports
       FROM drivers d
       LEFT JOIN usage_records ur ON ur.driver_id = d.id AND strftime('%Y', ur.departure_date) = ?
       LEFT JOIN leaves l ON l.driver_id = d.id AND strftime('%Y', l.start_date) = ?
       LEFT JOIN self_reported_fatigue sf ON sf.driver_id = d.id AND strftime('%Y', sf.report_date) = ?
       WHERE d.active = 1
       GROUP BY d.id ORDER BY trip_count DESC`,
      [year, year, year]
    );
    return success({ year, drivers });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}