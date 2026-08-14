import { dbAll, dbFirst, success, error } from '../../_helpers.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method;
    const user = env.user;
    if (!user) return error('Unauthorized', 401);

    if (method === 'GET') {
      // All authenticated users can check availability (needed for requester dashboard)

      const date = url.searchParams.get('date');
      const timeStart = url.searchParams.get('time_start') || '00:00';
      const timeEnd   = url.searchParams.get('time_end')   || '23:59';

      if (!date) return error('กรุณาระบุวันที่');

      // ── ขั้นตอนที่ 1: รวบรวม car_id / driver_id ที่ "ไม่ว่าง" ──────────────
      //
      // Source A: คิวในวันเดียวกัน ที่ยังไม่ cancelled/completed
      //   → ใช้ time-overlap ถ้ามีเวลา, ถ้า NULL time = ครอบทั้งวัน (ถือว่าชนเสมอ)
      //   → status = 'ongoing' หมายถึงออกไปแล้วจริง → ชนทุกกรณี
      //
      // Source B: usage_records — รถที่สแกน QR ออกแล้วยังไม่มี return (ข้ามวัน)
      //   → ดึงจาก /api/usage/cars-out pattern: departure ไม่มี return ที่ match

      const busyCarsFromQueue = await dbAll(env.DB, `
        SELECT DISTINCT car_id FROM queue
        WHERE date = ?
          AND car_id IS NOT NULL
          AND status NOT IN ('cancelled', 'completed')
          AND (
            status = 'ongoing'
            OR time_start IS NULL
            OR time_end   IS NULL
            OR (time_start < ? AND time_end > ?)
          )
      `, [date, timeEnd, timeStart]);

      const busyDriversFromQueue = await dbAll(env.DB, `
        SELECT DISTINCT driver_id FROM queue
        WHERE date = ?
          AND driver_id IS NOT NULL
          AND status NOT IN ('cancelled', 'completed')
          AND (
            status = 'ongoing'
            OR time_start IS NULL
            OR time_end   IS NULL
            OR (time_start < ? AND time_end > ?)
          )
      `, [date, timeEnd, timeStart]);

      // Source B: รถที่ออกไปแล้ว (departure scan) และยังไม่มี return scan ← ข้ามวัน
      const carsPhysicallyOut = await dbAll(env.DB, `
        SELECT DISTINCT dep.car_id
        FROM usage_records dep
        WHERE dep.record_type = 'departure'
          AND dep.datetime < ?
          AND NOT EXISTS (
            SELECT 1 FROM usage_records ret
            WHERE ret.car_id    = dep.car_id
              AND ret.record_type = 'return'
              AND ret.datetime   >= dep.datetime
          )
      `, [date + ' 23:59:59']);

      // รวม set ที่ "ไม่ว่าง"
      const busyCarIds    = new Set([
        ...busyCarsFromQueue.map(r => r.car_id).filter(Boolean),
        ...carsPhysicallyOut.map(r => r.car_id).filter(Boolean)
      ]);
      const busyDriverIds = new Set(
        busyDriversFromQueue.map(r => r.driver_id).filter(Boolean)
      );

      // ── ขั้นตอนที่ 2: ดึงรถ/คนขับที่ active แล้ว filter ออก ──────────────

      // รถทุกคันที่ active (primary) — filter busy ด้วย JS Set (ไม่ใช้ SQL subquery เพื่อหลีกเลี่ยง NULL bug)
      const allCars = await dbAll(env.DB, `
        SELECT id, license_plate, brand, model, vehicle_type, current_mileage
        FROM cars
        WHERE status NOT IN ('under_repair', 'retired', 'inactive')
          AND (vehicle_category = 'primary' OR vehicle_category IS NULL OR vehicle_category = '')
        ORDER BY current_mileage ASC
      `, []);

      const cars = allCars.filter(c => !busyCarIds.has(c.id));

      // คนขับทุกคนที่ active (primary) — filter busy + ลาพักอนุมัติ + ใบขับขี่หมด
      const leaveDriverIds = await dbAll(env.DB, `
        SELECT DISTINCT driver_id FROM leaves
        WHERE status = 'approved' AND start_date <= ? AND end_date >= ?
      `, [date, date]);
      const onLeaveSet = new Set(leaveDriverIds.map(r => r.driver_id).filter(Boolean));

      const allDrivers = await dbAll(env.DB, `
        SELECT id, name, phone, fatigue_flag, discipline_score, license_expiry
        FROM drivers
        WHERE status = 'active'
          AND (assignment_type = 'primary' OR assignment_type IS NULL OR assignment_type = '')
        ORDER BY fatigue_flag ASC, discipline_score DESC
      `, []);

      const drivers = allDrivers.filter(d => {
        if (busyDriverIds.has(d.id)) return false;
        if (onLeaveSet.has(d.id)) return false;
        if (d.license_expiry && d.license_expiry < date) return false;
        return true;
      });

      const bestCar    = cars.length    > 0 ? cars[0]    : null;
      const bestDriver = drivers.length > 0 ? drivers[0] : null;

      return success({
        best_car:               bestCar,
        best_driver:            bestDriver,
        available_cars:         cars,
        available_drivers:      drivers,
        available_cars_count:   cars.length,
        available_drivers_count: drivers.length
      });
    }

    return error('Method not allowed', 405);
  } catch (err) {
    return error(err.message, 500);
  }
}
