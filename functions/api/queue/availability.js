import { dbAll, dbFirst, success, error, requirePermission } from '../../_helpers.js';

export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method;
    const user = env.user;
    
    if (!user) return error('Unauthorized', 401);
    if (method !== 'GET') return error('Method not allowed', 405);
    try { requirePermission(user, 'queue', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }

    const date = url.searchParams.get('date');
    const carId = url.searchParams.get('car_id');
    const driverId = url.searchParams.get('driver_id');
    const estKm = parseFloat(url.searchParams.get('estimated_km')) || 0;

    if (!date) return error('Missing date');

    let blockers = [];
    let warnings = [];

    // 1. Check Car
    if (carId) {
      const car = await dbFirst(env.DB, 'SELECT status, license_plate FROM cars WHERE id = ?', [carId]);
      if (car) {
        if (car.status === 'under_repair') {
          blockers.push(`🚗 รถทะเบียน ${car.license_plate} มีสถานะ 'อยู่ระหว่างซ่อม' ในระบบ`);
        } else if (car.status === 'inactive') {
          blockers.push(`🚗 รถทะเบียน ${car.license_plate} ถูกระงับการใช้งาน`);
        }
        
        const repair = await dbFirst(env.DB, `
          SELECT * FROM repair_log 
          WHERE car_id = ? 
          AND status IN ('requested', 'approved', 'inspected', 'documented', 'repairing')
          AND date_reported <= ? AND (date_completed IS NULL OR date_completed >= ?)
        `, [carId, date, date]);
        
        if (repair) {
          blockers.push(`🚗 รถทะเบียน ${car.license_plate} มีรายการแจ้งซ่อมค้างอยู่ (${repair.issue_description || 'กำลังดำเนินการ'})`);
        }
      }

      const carConflicts = await dbAll(env.DB, `
        SELECT q.time_start, q.time_end, q.destination 
        FROM queue q 
        WHERE q.car_id = ? AND q.date = ? AND q.status NOT IN ('cancelled', 'completed')
      `, [carId, date]);
      if (carConflicts.length > 0) {
        warnings.push(`🚗 รถคันนี้มีคิวถูกจัดไว้แล้วในวันนี้: ${carConflicts.map(c => `${c.time_start || '-'}-${c.time_end || '-'} (${c.destination || ''})`).join(', ')}`);
      }
    }

    // 2. Check Driver
    if (driverId) {
      const drv = await dbFirst(env.DB, 'SELECT name, status, license_expiry FROM drivers WHERE id = ?', [driverId]);
      if (drv) {
        if (drv.status === 'inactive') {
          blockers.push(`👤 พนักงานขับรถ '${drv.name}' ลางาน / ไม่พร้อมปฏิบัติงาน (Inactive)`);
        }
        if (drv.license_expiry && drv.license_expiry < new Date().toISOString().substr(0,10)) {
          blockers.push(`👤 ใบขับขี่ของ '${drv.name}' หมดอายุแล้ว`);
        }
      }

      const drvConflicts = await dbAll(env.DB, `
        SELECT q.time_start, q.time_end, q.destination 
        FROM queue q 
        WHERE q.driver_id = ? AND q.date = ? AND q.status NOT IN ('cancelled', 'completed')
      `, [driverId, date]);
      if (drvConflicts.length > 0) {
        warnings.push(`👤 คนขับมีคิวถูกจัดไว้แล้วในวันนี้: ${drvConflicts.map(c => `${c.time_start || '-'}-${c.time_end || '-'} (${c.destination || ''})`).join(', ')}`);
      }

      // Fatigue check: driven last 5 days
      const targetDate = new Date(date);
      if (!isNaN(targetDate)) {
        const past5Date = new Date(targetDate);
        past5Date.setDate(past5Date.getDate() - 5);
        const past5Str = past5Date.toISOString().substr(0,10);
        
        const pastQueues = await dbAll(env.DB, `
          SELECT DISTINCT date FROM queue 
          WHERE driver_id = ? AND date >= ? AND date < ? AND status NOT IN ('cancelled')
        `, [driverId, past5Str, date]);
        
        if (pastQueues.length >= 5) {
          warnings.push(`😴 คนขับรถออกงานติดต่อกันมาแล้ว ${pastQueues.length} วัน ควรพิจารณาให้พักผ่อน`);
        }
      }
    }

    // 3. Distance
    if (estKm >= 400) {
      warnings.push(`🛣️ ระยะทางประเมินในการเดินทางสูงถึง ${estKm} กม. ควรพิจารณาจัดพนักงานขับรถสำรอง (สับเปลี่ยน)`);
    }

    return success({ blockers, warnings });
  } catch (err) {
    return error(err.message, 500);
  }
}
