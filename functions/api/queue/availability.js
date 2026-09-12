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
    const returnDate = url.searchParams.get('return_date') || date;
    const timeStart = url.searchParams.get('time_start') || '00:00';
    const timeEnd = url.searchParams.get('time_end') || '23:59';
    const carId = url.searchParams.get('car_id');
    const driverId = url.searchParams.get('driver_id');
    const estKm = parseFloat(url.searchParams.get('estimated_km')) || 0;

    if (!date) return error('Missing date');

    let blockers = [];
    let warnings = [];

    // 1. Check Car
    if (carId) {
      const car = await dbFirst(env.DB, 'SELECT status, license_plate, brand FROM cars WHERE id = ?', [carId]);
      if (car) {
        if (car.status === 'under_repair' || car.status === 'maintenance') {
          blockers.push(`🚗 รถทะเบียน ${car.license_plate} มีสถานะ '${car.status === 'under_repair' ? 'อยู่ระหว่างซ่อม' : 'ซ่อมบำรุง/เช็คระยะ'}' ในระบบ`);
        } else if (car.status === 'inactive') {
          blockers.push(`🚗 รถทะเบียน ${car.license_plate} ถูกระงับการใช้งาน`);
        }
        
        // Check pending/active repair logs
        const repair = await dbFirst(env.DB, `
          SELECT * FROM repair_log 
          WHERE car_id = ? 
          AND status IN ('requested', 'approved', 'inspected', 'documented', 'repairing')
          AND date_reported <= ? AND (date_completed IS NULL OR date_completed >= ?)
        `, [carId, returnDate, date]);
        
        if (repair) {
          blockers.push(`🚗 รถทะเบียน ${car.license_plate} มีรายการแจ้งซ่อม/เช็คระยะค้างอยู่ (${repair.issue_description || repair.service_type || 'กำลังดำเนินการ'})`);
        }
      }

      // Check Car Conflicts across date and time
      const carConflicts = await dbAll(env.DB, `
        SELECT q.time_start, q.time_end, q.destination, q.date, q.return_date
        FROM queue q 
        WHERE q.car_id = ? AND q.status NOT IN ('cancelled', 'completed')
        AND q.date <= ? AND COALESCE(q.return_date, q.date) >= ?
      `, [carId, returnDate, date]);

      // If single-day check time overlap, if multi-day it's a conflict
      for (const qc of carConflicts) {
        const isMultiDay = (date !== returnDate) || (qc.date !== (qc.return_date || qc.date));
        if (isMultiDay || (qc.time_start < timeEnd && qc.time_end > timeStart)) {
          blockers.push(`🚗 รถทะเบียน ${car?.license_plate || carId} มีคิวซ้อนทับ: วันที่ ${qc.date}${qc.return_date && qc.return_date !== qc.date ? ' ถึง ' + qc.return_date : ''} เวลา ${qc.time_start || '-'}-${qc.time_end || '-'} (${qc.destination || ''})`);
        }
      }
    }

    // 2. Check Driver
    if (driverId) {
      const drv = await dbFirst(env.DB, 'SELECT name, status, license_expiry FROM drivers WHERE id = ?', [driverId]);
      if (drv) {
        if (drv.status === 'inactive') {
          blockers.push(`👤 พนักงานขับรถ '${drv.name}' ถูกระงับการปฏิบัติงาน (Inactive)`);
        } else if (drv.status === 'on_leave') {
          blockers.push(`👤 พนักงานขับรถ '${drv.name}' อยู่ระหว่างการลา (On Leave)`);
        }

        if (drv.license_expiry && drv.license_expiry < new Date().toISOString().substr(0,10)) {
          blockers.push(`👤 ใบขับขี่ของ '${drv.name}' หมดอายุแล้ว (${drv.license_expiry})`);
        }

        // Check leaves table
        const activeLeave = await dbFirst(env.DB, `
          SELECT leave_type, start_date, end_date, reason FROM leaves
          WHERE driver_id = ?
          AND status IN ('approved', 'pending')
          AND start_date <= ? AND end_date >= ?
        `, [driverId, returnDate, date]);
        if (activeLeave) {
          const ltype = activeLeave.leave_type === 'sick' ? 'ลาป่วย' : (activeLeave.leave_type === 'personal' ? 'ลากิจ' : (activeLeave.leave_type === 'vacation' ? 'ลาพักผ่อน' : 'ลา'));
          blockers.push(`👤 พนักงานขับรถ '${drv.name}' ลางาน (${ltype} วันที่ ${activeLeave.start_date} ถึง ${activeLeave.end_date})`);
        }
      }

      // Check Driver Conflicts
      const drvConflicts = await dbAll(env.DB, `
        SELECT q.time_start, q.time_end, q.destination, q.date, q.return_date
        FROM queue q 
        WHERE q.driver_id = ? AND q.status NOT IN ('cancelled', 'completed')
        AND q.date <= ? AND COALESCE(q.return_date, q.date) >= ?
      `, [driverId, returnDate, date]);

      for (const qd of drvConflicts) {
        const isMultiDay = (date !== returnDate) || (qd.date !== (qd.return_date || qd.date));
        if (isMultiDay || (qd.time_start < timeEnd && qd.time_end > timeStart)) {
          blockers.push(`👤 คนขับ '${drv?.name || driverId}' มีคิวซ้อนทับ: วันที่ ${qd.date}${qd.return_date && qd.return_date !== qd.date ? ' ถึง ' + qd.return_date : ''} เวลา ${qd.time_start || '-'}-${qd.time_end || '-'} (${qd.destination || ''})`);
        }
      }

      // 3. Fatigue Rule (กฎความล้าสะสม 400 กิโลเมตรในวันก่อนหน้า)
      try {
        const targetD = new Date(date + 'T00:00:00');
        if (!isNaN(targetD.getTime())) {
          const prevD = new Date(targetD);
          prevD.setDate(prevD.getDate() - 1);
          const prevDateStr = prevD.toISOString().substr(0, 10);

          const prevQueues = await dbAll(env.DB, `
            SELECT estimated_km, destination FROM queue
            WHERE driver_id = ? AND date <= ? AND COALESCE(return_date, date) >= ? AND status NOT IN ('cancelled')
          `, [driverId, prevDateStr, prevDateStr]);

          let totalPrevKm = 0;
          for (const pq of prevQueues) {
            totalPrevKm += (pq.estimated_km || 0);
          }

          if (totalPrevKm >= 400) {
            if (estKm > 100) {
              blockers.push(`😴 [กฎความล้าสะสม] พนักงานขับรถ '${drv?.name || ''}' ขับรถสะสมมากกว่า 400 กม. (${totalPrevKm} กม.) ในวันก่อนหน้า (${prevDateStr}) ไม่อนุญาตให้จัดคิวขับรถทางไกลในวันนี้ (ควรได้พักผ่อน หรือจัดเฉพาะงานระยะสั้นในพื้นที่ไม่เกิน 100 กม.)`);
            } else {
              warnings.push(`😴 [เฝ้าระวังความล้า] พนักงานขับรถ '${drv?.name || ''}' ขับรถสะสม ${totalPrevKm} กม. เมื่อวานนี้ (${prevDateStr}) จัดได้เฉพาะงานระยะสั้นในพื้นที่เท่านั้น`);
            }
          }

          // Consecutive working days check
          const past5D = new Date(targetD);
          past5D.setDate(past5D.getDate() - 5);
          const past5Str = past5D.toISOString().substr(0, 10);
          const pastConsecutive = await dbAll(env.DB, `
            SELECT DISTINCT date FROM queue
            WHERE driver_id = ? AND date >= ? AND date < ? AND status NOT IN ('cancelled')
          `, [driverId, past5Str, date]);
          if (pastConsecutive.length >= 5) {
            warnings.push(`😴 พนักงานขับรถออกงานติดต่อกันมาแล้ว ${pastConsecutive.length} วัน ควรพิจารณาให้พักผ่อน`);
          }
        }
      } catch (fatigueErr) {
        console.error('Fatigue check error:', fatigueErr);
      }
    }

    // 4. Trip Distance Recommendation
    if (estKm >= 400) {
      warnings.push(`🛣️ ระยะทางประเมินในการเดินทางสูงถึง ${estKm} กม. ควรพิจารณาจัดพนักงานขับรถสำรอง (สับเปลี่ยน) เพื่อความปลอดภัย`);
    }

    return success({ blockers, warnings, can_override: blockers.length > 0 });
  } catch (err) {
    return error(err.message, 500);
  }
}
