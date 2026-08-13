import { dbAll, dbFirst, success, error, requirePermission } from '../../_helpers.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method;
    const user = env.user;
    if (!user) return error('Unauthorized', 401);

    if (method === 'GET') {
      try { requirePermission(user, 'queue', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }

      const date = url.searchParams.get('date');
      const timeStart = url.searchParams.get('time_start') || '00:00';
      const timeEnd = url.searchParams.get('time_end') || '23:59';

      if (!date) return error('กรุณาระบุวันที่');

      // Find available cars (not under repair, no queue overlap)
      const cars = await dbAll(env.DB, `
        SELECT id, license_plate, brand, model, vehicle_type, current_mileage 
        FROM cars 
        WHERE status NOT IN ('under_repair', 'retired', 'inactive') 
        AND id NOT IN (
          SELECT car_id FROM queue 
          WHERE date = ? AND status NOT IN ('cancelled', 'completed')
          AND time_start < ? AND time_end > ?
          AND car_id IS NOT NULL
        )
        ORDER BY current_mileage ASC
      `, [date, timeEnd, timeStart]);

      // Find available drivers (active, no queue overlap)
      const drivers = await dbAll(env.DB, `
        SELECT id, name, phone, fatigue_flag, discipline_score 
        FROM drivers 
        WHERE status = 'active' 
        AND (license_expiry IS NULL OR license_expiry >= ?)
        AND id NOT IN (
          SELECT driver_id FROM queue 
          WHERE date = ? AND status NOT IN ('cancelled', 'completed')
          AND time_start < ? AND time_end > ?
          AND driver_id IS NOT NULL
        )
        AND id NOT IN (
          SELECT driver_id FROM leaves
          WHERE status = 'approved' AND start_date <= ? AND end_date >= ?
        )
        ORDER BY fatigue_flag ASC, discipline_score DESC
      `, [date, date, timeEnd, timeStart, date, date]);

      const bestCar = cars.length > 0 ? cars[0] : null;
      const bestDriver = drivers.length > 0 ? drivers[0] : null;

      return success({
        best_car: bestCar,
        best_driver: bestDriver,
        available_cars: cars,
        available_drivers: drivers,
        available_cars_count: cars.length,
        available_drivers_count: drivers.length
      });
    }

    return error('Method not allowed', 405);
  } catch (err) {
    return error(err.message, 500);
  }
}
