// Auto-Heal shared logic — ใช้ร่วมกันระหว่าง usage API และ gform-sync
import { dbFirst, dbRun, generateUUID, now, notifyAllAdmins, sendTelegramMessage } from '../_helpers.js';

const SCORE_DEDUCT_AUTO = 1;

async function deductScore(db, driverId) {
  if (!driverId) return;
  await dbRun(db,
    `UPDATE drivers SET discipline_score = MAX(0, COALESCE(discipline_score, 100) - ?) WHERE id = ?`,
    [SCORE_DEDUCT_AUTO, driverId]
  );
}

export async function autoHeal(db, newRecord, env) {
  const healed = [];
  const ts = now();

  const gapSetting = await dbFirst(db,
    "SELECT value FROM system_settings WHERE key = 'gap_minimum_km'", []);
  const gapMinKm = parseInt(gapSetting?.value || '50');

  if (newRecord.record_type === 'departure') {
    const lastRecord = await dbFirst(db,
      `SELECT * FROM usage_records
       WHERE car_id = ? AND record_type IN ('departure','return') AND id != ?
       ORDER BY datetime DESC LIMIT 1`,
      [newRecord.car_id, newRecord.id]
    );

    if (lastRecord && lastRecord.record_type === 'departure') {
      const autoReturnId = generateUUID();
      const autoMileage = newRecord.mileage || null;
      await dbRun(db,
        `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, created_at)
         VALUES (?, ?, ?, 'return', ?, ?, '', '', ?, 'auto_return', ?, ?)`,
        [autoReturnId, lastRecord.car_id, lastRecord.driver_id,
         newRecord.datetime, autoMileage,
         lastRecord.queue_id,
         'ระบบสร้างอัตโนมัติ — ไม่พบบันทึกกลับจาก departure ' + lastRecord.datetime.substring(0, 10),
         ts]
      );
      healed.push({ type: 'auto_return', id: autoReturnId, for_departure: lastRecord.id });
      await deductScore(db, lastRecord.driver_id);

      if (autoMileage && lastRecord.mileage) {
        const gap = autoMileage - lastRecord.mileage;
        if (gap > gapMinKm) {
          const gapId = generateUUID();
          await dbRun(db,
            `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, created_at)
             VALUES (?, ?, ?, 'departure', ?, NULL, '', '', NULL, 'gap_record', ?, ?)`,
            [gapId, lastRecord.car_id, lastRecord.driver_id,
             lastRecord.datetime,
             'ช่องว่างข้อมูล ' + gap + ' กม. ระหว่าง ' + lastRecord.datetime.substring(0, 10) + ' ถึง ' + newRecord.datetime.substring(0, 10),
             ts]
          );
          healed.push({ type: 'gap_record', id: gapId, gap_km: gap });
        }
      }
    }
  } else if (newRecord.record_type === 'return') {
    const lastRecord = await dbFirst(db,
      `SELECT * FROM usage_records
       WHERE car_id = ? AND record_type IN ('departure','return') AND id != ?
       ORDER BY datetime DESC LIMIT 1`,
      [newRecord.car_id, newRecord.id]
    );

    if (lastRecord && lastRecord.record_type === 'return') {
      const autoDepId = generateUUID();
      const autoMileage = lastRecord.mileage || null;
      await dbRun(db,
        `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, created_at)
         VALUES (?, ?, ?, 'departure', ?, ?, '', '', ?, 'auto_departure', ?, ?)`,
        [autoDepId, newRecord.car_id, newRecord.driver_id,
         lastRecord.datetime, autoMileage,
         newRecord.queue_id,
         'ระบบสร้างอัตโนมัติ — ไม่พบบันทึกออกก่อน return ' + newRecord.datetime.substring(0, 10),
         ts]
      );
      healed.push({ type: 'auto_departure', id: autoDepId, for_return: newRecord.id });
      await deductScore(db, newRecord.driver_id);

      if (newRecord.mileage && lastRecord.mileage) {
        const gap = newRecord.mileage - lastRecord.mileage;
        if (gap > gapMinKm) {
          const gapId = generateUUID();
          await dbRun(db,
            `INSERT INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id, data_quality, auto_notes, created_at)
             VALUES (?, ?, ?, 'departure', ?, NULL, '', '', NULL, 'gap_record', ?, ?)`,
            [gapId, newRecord.car_id, newRecord.driver_id,
             lastRecord.datetime,
             'ช่องว่างข้อมูล ' + gap + ' กม. ระหว่าง ' + lastRecord.datetime.substring(0, 10) + ' ถึง ' + newRecord.datetime.substring(0, 10),
             ts]
          );
          healed.push({ type: 'gap_record', id: gapId, gap_km: gap });
        }
      }
    }
  }

  if (healed.length > 0) {
    const car = await dbFirst(db, 'SELECT license_plate FROM cars WHERE id = ?', [newRecord.car_id]);
    const carLabel = car?.license_plate || newRecord.car_id;
    const types = healed.map(h => h.type).join(', ');
    await notifyAllAdmins(db, 'data_quality',
      'Auto-Heal: ' + carLabel,
      'ระบบสร้างข้อมูลอัตโนมัติ (' + types + ') สำหรับรถ ' + carLabel + ' — กรุณาตรวจสอบในบันทึกการใช้งาน'
    );

    // Telegram notification
    if (env) {
      for (const h of healed) {
        let driverId = null;
        let msg = '';
        if (h.type === 'auto_return') {
          // driver forgot to record return
          const dep = await dbFirst(db, 'SELECT driver_id, datetime FROM usage_records WHERE id = ?', [h.for_departure]);
          driverId = dep?.driver_id;
          const driver = driverId ? await dbFirst(db, 'SELECT COALESCE(name, first_name || \' \' || last_name) AS name FROM drivers WHERE id = ?', [driverId]) : null;
          msg = `⚠️ <b>ลืมบันทึกกลับจากเดินทาง</b>\n🚗 รถ: ${carLabel}\n👤 พนักงาน: ${driver?.name || '-'}\n📅 วันออก: ${(dep?.datetime || '').substring(0, 10)}\n📌 ระบบสร้าง "กลับ" อัตโนมัติแล้ว — กรุณาตรวจสอบ`;
        } else if (h.type === 'auto_departure') {
          // driver forgot to record departure
          driverId = newRecord.driver_id;
          const driver = driverId ? await dbFirst(db, 'SELECT COALESCE(name, first_name || \' \' || last_name) AS name FROM drivers WHERE id = ?', [driverId]) : null;
          msg = `⚠️ <b>ลืมบันทึกก่อนออกเดินทาง</b>\n🚗 รถ: ${carLabel}\n👤 พนักงาน: ${driver?.name || '-'}\n📅 วันกลับ: ${(newRecord.datetime || '').substring(0, 10)}\n📌 ระบบสร้าง "ออก" อัตโนมัติแล้ว — กรุณาตรวจสอบ`;
        } else if (h.type === 'gap_record') {
          msg = `🔍 <b>พบการใช้รถที่ไม่มีบันทึก</b>\n🚗 รถ: ${carLabel}\n📏 ช่วงห่าง: ${h.gap_km} กม.\n📌 ระบบสร้าง gap record อัตโนมัติแล้ว — กรุณาตรวจสอบ`;
        }
        if (msg) await sendTelegramMessage(env, msg);
      }
    }
  }
  return healed;
}
