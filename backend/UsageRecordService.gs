/**
 * PPK DriveHub Usage Record Service
 * บันทึกการใช้รถด้วย QR Code
 * - สแกน QR ที่ติดรถ
 * - กรอกข้อมูล: ชื่อพนักงานขับรถ, สถานะ (ก่อนออก/กลับมา), วันเดือนปี+เวลา, ผู้ขอใช้รถ, สถานที่ไป, เลขไมล์
 * - ข้อมูลใช้วิเคราะห์ร่วมกับการเติมน้ำมัน และระบบแจ้งเตือนซ่อมบำรุง
 */

/**
 * Create Usage Record - บันทึกการใช้รถ
 * Public API - ไม่ต้องล็อกอิน (Anyone can record usage by scanning QR)
 */
function createUsageRecord(recordData) {
  try {
    // This function does NOT require authentication
    // Anyone can record usage by scanning QR code
    
    validateRequired(recordData, ['car_id', 'driver_id', 'record_type', 'datetime', 'requested_by', 'mileage']);
    
    // Rate limit: same payload (car, driver, type, datetime) within 60s = reject (anti-replay/spam)
    var rlKey = 'usage_rl_' + [recordData.car_id, recordData.driver_id, recordData.record_type, (recordData.datetime || '')].join('|');
    try {
      var cache = CacheService.getScriptCache();
      if (cache.get(rlKey)) {
        return errorResponse('กรุณารอสักครู่ก่อนบันทึกอีกครั้ง', 'RATE_LIMIT');
      }
      cache.put(rlKey, '1', 60);
    } catch (e) {
      Logger.log('Usage record rate limit check error: ' + e.toString());
      // Continue if cache fails (e.g. quota)
    }
    
    // Validate record_type
    if (recordData.record_type !== 'before_trip' && recordData.record_type !== 'after_trip') {
      return errorResponse('ประเภทการบันทึกไม่ถูกต้อง (ต้องเป็น before_trip หรือ after_trip)', 'INVALID_RECORD_TYPE');
    }
    
    // Validate mileage (ตัวเลขเท่านั้น ไม่มีเว้นวรรคหรือว่าง)
    var mileage = String(recordData.mileage).replace(/\s/g, ''); // Remove spaces
    if (!/^\d+$/.test(mileage)) {
      return errorResponse('เลขไมล์ต้องเป็นตัวเลขเท่านั้น', 'INVALID_MILEAGE');
    }
    mileage = parseInt(mileage);
    
    // Validate mileage > 0
    if (mileage <= 0) {
      return errorResponse('เลขไมล์ต้องมากกว่า 0', 'INVALID_MILEAGE');
    }
    
    // Validate: mileage must be >= last mileage
    var lastMileage = getLastMileageForCar(recordData.car_id);
    if (lastMileage > 0 && mileage < lastMileage) {
      return errorResponse('เลขไมล์ต้องมากกว่าหรือเท่ากับ ' + lastMileage.toLocaleString() + ' (เลขไมล์ล่าสุด)', 'MILEAGE_TOO_LOW');
    }
    
    // Validate: ถ้าเป็น after_trip ไม่ต้องมี destination
    if (recordData.record_type === 'after_trip' && recordData.destination) {
      return errorResponse('การบันทึกกลับมาจากเดินทางไม่ต้องระบุสถานที่ไป', 'INVALID_DATA');
    }
    
    // Validate: ถ้าเป็น before_trip ต้องมี destination
    if (recordData.record_type === 'before_trip' && !recordData.destination) {
      return errorResponse('การบันทึกก่อนออกเดินทางต้องระบุสถานที่ไป', 'MISSING_DESTINATION');
    }
    
    // Validate: ถ้าเป็น after_trip ต้องมี before_trip ก่อน (same car, same driver, same date)
    // Auto-Recovery: ถ้าลืมบันทึกก่อนออก → ระบบสร้าง OUT อัตโนมัติ แล้วรับบันทึก "กลับ" ได้
    if (recordData.record_type === 'after_trip') {
      // SECURITY: Validate datetime before splitting
      if (!recordData.datetime || typeof recordData.datetime !== 'string') {
        return errorResponse('ต้องระบุ datetime', 'MISSING_DATETIME');
      }
      var dateStr = recordData.datetime.split(' ')[0];
      var hasBeforeTrip = checkHasBeforeTrip(recordData.car_id, recordData.driver_id, dateStr);
      if (!hasBeforeTrip) {
        var autoCreated = createAutoRecoveryBeforeTrip({
          car_id: recordData.car_id,
          driver_id: recordData.driver_id,
          dateStr: dateStr,
          requested_by: recordData.requested_by,
          after_trip_mileage: mileage,
          after_trip_datetime: recordData.datetime
        });
        if (!autoCreated.success) {
          return errorResponse(autoCreated.message || 'ยังไม่มีบันทึก "ก่อนออกเดินทาง" และระบบไม่สามารถสร้างแทนได้', 'NO_BEFORE_TRIP');
        }
      }
    }
    
    // Validate: vehicle exists and is valid
    var vehicle = getVehicleById(recordData.car_id);
    if (!vehicle.success) {
      return errorResponse('ไม่พบรถ', 'CAR_NOT_FOUND');
    }
    
    // Validate: driver exists and is active
    var driver = getDriverById(recordData.driver_id);
    if (!driver.success || !driver.data || !driver.data.driver) {
      return errorResponse('ไม่พบคนขับ', 'DRIVER_NOT_FOUND');
    }
    if (driver.data.driver.status !== 'active') {
      return errorResponse('คนขับไม่พร้อมใช้งาน', 'DRIVER_INACTIVE');
    }
    
    // Validate: prevent duplicate records (same car, driver, type, datetime within 5 minutes)
    var isDuplicate = checkDuplicateUsageRecord(recordData.car_id, recordData.driver_id, recordData.record_type, recordData.datetime);
    if (isDuplicate) {
      return errorResponse('มีการบันทึกข้อมูลนี้ไปแล้ว (ไม่สามารถบันทึกซ้ำได้)', 'DUPLICATE_RECORD');
    }
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.USAGE_LOG, [
      'record_id', 'car_id', 'driver_id', 'record_type', 'datetime',
      'requested_by', 'destination', 'mileage', 'created_at', 'created_by', 'notes',
      'auto_generated', 'auto_reason', 'original_user', 'audit_tag'
    ]);
    
    var recordId = generateUUID();
    var now = new Date();
    // QR Usage Record does NOT require authentication
    var currentUser = getCurrentUser() || 'public_qr_user';
    
    sheet.appendRow([
      recordId,
      recordData.car_id,
      recordData.driver_id,
      recordData.record_type,
      recordData.datetime,
      recordData.requested_by,
      recordData.record_type === 'before_trip' ? (recordData.destination || '') : '',
      mileage,
      now,
      currentUser,
      recordData.notes || '',
      false,  // auto_generated
      '',     // auto_reason
      '',     // original_user
      ''      // audit_tag
    ]);
    
    // Link to queue if exists (find matching queue by car_id, driver_id, and date)
    if (recordData.record_type === 'before_trip') {
      linkUsageRecordToQueue(recordId, recordData.car_id, recordData.driver_id, recordData.datetime);
    } else if (recordData.record_type === 'after_trip') {
      updateQueueFromUsageRecord(recordId, recordData.car_id, recordData.driver_id, mileage);
    }
    
    // Log creation
    logAudit(currentUser, 'create', 'usage_record', recordId, {
      car_id: recordData.car_id,
      driver_id: recordData.driver_id,
      record_type: recordData.record_type,
      mileage: mileage
    });
    
    // Send Telegram notification
    try {
      var recordForTelegram = {
        record_id: recordId,
        car_id: recordData.car_id,
        driver_id: recordData.driver_id,
        record_type: recordData.record_type,
        datetime: recordData.datetime,
        requested_by: recordData.requested_by,
        destination: recordData.destination,
        mileage: mileage
      };
      
      if (recordData.record_type === 'before_trip' && typeof sendUsageBeforeTripTelegram === 'function') {
        sendUsageBeforeTripTelegram(recordForTelegram);
      } else if (recordData.record_type === 'after_trip' && typeof sendUsageAfterTripTelegram === 'function') {
        sendUsageAfterTripTelegram(recordForTelegram);
      }
    } catch (telegramError) {
      Logger.log('Send usage telegram error: ' + telegramError.toString());
    }
    
    return successResponse({
      record_id: recordId
    }, 'บันทึกการใช้รถสำเร็จ');
    
  } catch (error) {
    Logger.log('Create usage record error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการบันทึก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Link usage record to queue
 */
function linkUsageRecordToQueue(recordId, carId, driverId, datetime) {
  try {
    if (!datetime || typeof datetime !== 'string') {
      return false;
    }
    var dateStr = datetime.split(' ')[0]; // Extract date
    var queuesResult = getQueues({ car_id: carId, date: dateStr });
    
    if (queuesResult.success && queuesResult.data.queues.length > 0) {
      // Find matching queue
      for (var i = 0; i < queuesResult.data.queues.length; i++) {
        var queue = queuesResult.data.queues[i];
        if (queue.driver_id === driverId && queue.status === 'pending') {
          // Update queue status to running
          updateQueue(queue.queue_id, {
            status: 'running',
            started_at: (datetime && typeof datetime === 'string' && datetime.split(' ').length > 1) ? datetime.split(' ')[1] : '',
            mileage_start: null // Will be updated from usage record
          });
          break;
        }
      }
    }
  } catch (error) {
    Logger.log('Link usage record to queue error: ' + error.toString());
  }
}

/**
 * Update queue from usage record (after trip)
 */
function updateQueueFromUsageRecord(recordId, carId, driverId, mileage) {
  try {
    var today = formatDate(new Date());
    var queuesResult = getQueues({ car_id: carId, date: today });
    
    if (queuesResult.success && queuesResult.data.queues.length > 0) {
      // Find matching running queue
      for (var i = 0; i < queuesResult.data.queues.length; i++) {
        var queue = queuesResult.data.queues[i];
        if (queue.driver_id === driverId && queue.status === 'running') {
          // Update queue with end mileage
          updateQueue(queue.queue_id, {
            status: 'done',
            ended_at: formatTime(new Date()),
            mileage_end: mileage
          });
          
          // Update car status back to available
          updateVehicle(carId, { status: 'available' });
          break;
        }
      }
    }
  } catch (error) {
    Logger.log('Update queue from usage record error: ' + error.toString());
  }
}

/**
 * Auto-Recovery: สร้างบันทึก "ก่อนออก" อัตโนมัติ เมื่อผู้ใช้บันทึกแค่ "กลับ" (ลืมบันทึกก่อนออก)
 * หลักคิด: ไม่ลงโทษ → ระบบช่วยอุดช่องว่าง
 */
function createAutoRecoveryBeforeTrip(opts) {
  try {
    var cfg = CONFIG.AUTO_RECOVERY || {};
    var defaultOutTime = cfg.DEFAULT_OUT_TIME || '08:00';
    var estimatedOutTime = getEstimatedOutTimeFromQueue(opts.car_id, opts.driver_id, opts.dateStr) || defaultOutTime;
    var estimatedMileage = getLastMileageForCarBeforeDate(opts.car_id, opts.dateStr);
    if (estimatedMileage <= 0 && opts.after_trip_mileage > 0) {
      estimatedMileage = Math.max(0, opts.after_trip_mileage - 1); // ใช้ค่าก่อนกลับลด 1 กม. ถ้าไม่มีประวัติ
    }
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.USAGE_LOG, [
      'record_id', 'car_id', 'driver_id', 'record_type', 'datetime',
      'requested_by', 'destination', 'mileage', 'created_at', 'created_by', 'notes',
      'auto_generated', 'auto_reason', 'original_user', 'audit_tag'
    ]);
    
    var recordId = generateUUID();
    var datetimeStr = opts.dateStr + ' ' + estimatedOutTime;
    var notes = 'ระบบบันทึกแทนอัตโนมัติ (ลืมบันทึกก่อนออก)';
    var destination = '(ระบบบันทึกแทน - ลืมบันทึกก่อนออก)';
    
    sheet.appendRow([
      recordId,
      opts.car_id,
      opts.driver_id,
      'before_trip',
      datetimeStr,
      opts.requested_by || '',
      destination,
      estimatedMileage,
      new Date(),
      cfg.CREATED_BY_SYSTEM || 'SYSTEM',
      notes,
      true,           // auto_generated
      'forgot_out',   // auto_reason
      opts.driver_id, // original_user
      cfg.AUDIT_TAG || 'AUTO_RECOVERY'
    ]);
    
    logAudit(cfg.CREATED_BY_SYSTEM || 'SYSTEM', 'create', 'usage_record', recordId, {
      car_id: opts.car_id,
      driver_id: opts.driver_id,
      record_type: 'before_trip',
      auto_reason: 'forgot_out',
      audit_tag: cfg.AUDIT_TAG || 'AUTO_RECOVERY'
    });
    
    // Send Telegram notification
    try {
      if (typeof sendUsageAutoRecoveryTelegram === 'function') {
        var recordForTelegram = {
          record_id: recordId,
          car_id: opts.car_id,
          driver_id: opts.driver_id,
          record_type: 'before_trip',
          datetime: datetimeStr,
          requested_by: opts.requested_by,
          destination: destination,
          mileage: estimatedMileage,
          auto_generated: true,
          auto_reason: 'forgot_out'
        };
        sendUsageAutoRecoveryTelegram(recordForTelegram);
      }
    } catch (telegramError) {
      Logger.log('Send auto-recovery telegram error: ' + telegramError.toString());
    }
    
    return successResponse({ record_id: recordId }, 'ระบบสร้างบันทึก "ก่อนออก" แทนอัตโนมัติแล้ว');
  } catch (error) {
    Logger.log('Create auto-recovery before_trip error: ' + error.toString());
    return errorResponse('ไม่สามารถสร้างบันทึกแทนอัตโนมัติได้: ' + error.toString(), 'AUTO_RECOVERY_ERROR');
  }
}

/**
 * ดึงเวลา "ออก" โดยประมาณจากคิว (เวลาเริ่มงาน)
 */
function getEstimatedOutTimeFromQueue(carId, driverId, dateStr) {
  try {
    var queuesResult = getQueues({ car_id: carId, date: dateStr });
    if (!queuesResult.success || !queuesResult.data.queues.length) return null;
    for (var i = 0; i < queuesResult.data.queues.length; i++) {
      var q = queuesResult.data.queues[i];
      if (q.driver_id === driverId && q.time_start) {
        return q.time_start;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * เลขไมล์ล่าสุดของรถก่อนวันที่กำหนด (ใช้สำหรับประมาณค่า OUT เมื่อลืมบันทึกก่อน)
 */
function getLastMileageForCarBeforeDate(carId, dateStr) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    if (!sheet) return 0;
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 0;
    var carIdCol = 1;
    var datetimeCol = 4;
    var mileageCol = 7;
    var lastMileage = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][carIdCol] !== carId) continue;
      var recDate = data[i][datetimeCol];
      var recDateStr = typeof recDate === 'string' ? recDate.split(' ')[0] : formatDate(recDate);
      if (recDateStr >= dateStr) continue;
      var m = parseInt(data[i][mileageCol]) || 0;
      if (m > lastMileage) lastMileage = m;
    }
    return lastMileage;
  } catch (e) {
    Logger.log('getLastMileageForCarBeforeDate error: ' + e.toString());
    return 0;
  }
}

/**
 * Auto-Recovery Case B: สร้างบันทึก "กลับ" อัตโนมัติ เมื่อมี OUT ค้างเกินเวลาที่ตั้งไว้ (ลืมบันทึกหลัง)
 * เรียกจาก Trigger รายวัน (เช่น 18:00)
 */
function runAutoRecoveryPendingReturns() {
  try {
    var pending = getPendingBeforeTripsWithoutReturn();
    var cfg = CONFIG.AUTO_RECOVERY || {};
    var defaultInTime = cfg.DEFAULT_IN_TIME || '17:30';
    var created = 0;
    for (var i = 0; i < pending.length; i++) {
      var p = pending[i];
      var createdOne = createAutoRecoveryAfterTrip({
        car_id: p.car_id,
        driver_id: p.driver_id,
        dateStr: p.dateStr,
        requested_by: p.requested_by || '(ระบบบันทึกแทน)',
        mileage_start: p.mileage,
        default_in_time: defaultInTime
      });
      if (createdOne.success) created++;
    }
    return successResponse({ created: created, pending_count: pending.length }, 'Auto-Recovery ปิด OUT ค้าง ' + created + ' รายการ');
  } catch (error) {
    Logger.log('runAutoRecoveryPendingReturns error: ' + error.toString());
    return errorResponse('Auto-Recovery error: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * รายการ before_trip ที่ยังไม่มี after_trip คู่กัน (same car, driver, date) และเกินเวลา threshold
 */
function getPendingBeforeTripsWithoutReturn() {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var cfg = CONFIG.AUTO_RECOVERY || {};
    var thresholdHour = cfg.PENDING_RETURN_HOUR != null ? cfg.PENDING_RETURN_HOUR : 18;
    var thresholdMin = cfg.PENDING_RETURN_MINUTE != null ? cfg.PENDING_RETURN_MINUTE : 0;
    var now = new Date();
    var todayStr = formatDate(now);
    var yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = formatDate(yesterday);

    var carIdCol = 1, driverIdCol = 2, recordTypeCol = 3, datetimeCol = 4, requestedByCol = 5, mileageCol = 7;
    var autoGenCol = 11;
    var hasAutoCol = data[0].length > autoGenCol;

    var beforeTrips = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][recordTypeCol] !== 'before_trip') continue;
      if (hasAutoCol && (data[i][autoGenCol] === true || data[i][autoGenCol] === 'TRUE')) continue;
      var dt = data[i][datetimeCol];
      var dateStr = typeof dt === 'string' ? dt.split(' ')[0] : formatDate(dt);
      if (dateStr !== todayStr && dateStr !== yesterdayStr) continue;
      var carId = data[i][carIdCol];
      var driverId = data[i][driverIdCol];
      if (hasMatchingAfterTrip(sheet, data, carId, driverId, dateStr, i)) continue;
      var isToday = dateStr === todayStr;
      if (isToday) {
        var currentMinutes = now.getHours() * 60 + now.getMinutes();
        if (currentMinutes < thresholdHour * 60 + thresholdMin) continue;
      }
      beforeTrips.push({
        car_id: carId,
        driver_id: driverId,
        dateStr: dateStr,
        requested_by: data[i][requestedByCol],
        mileage: parseInt(data[i][mileageCol]) || 0
      });
    }
    return beforeTrips;
  } catch (e) {
    Logger.log('getPendingBeforeTripsWithoutReturn error: ' + e.toString());
    return [];
  }
}

function hasMatchingAfterTrip(sheet, data, carId, driverId, dateStr, excludeRowIndex) {
  var carIdCol = 1, driverIdCol = 2, recordTypeCol = 3, datetimeCol = 4;
  for (var i = 1; i < data.length; i++) {
    if (i === excludeRowIndex) continue;
    if (data[i][carIdCol] !== carId || data[i][driverIdCol] !== driverId || data[i][recordTypeCol] !== 'after_trip') continue;
    var dt = data[i][datetimeCol];
    var recDate = typeof dt === 'string' ? dt.split(' ')[0] : formatDate(dt);
    if (recDate === dateStr) return true;
  }
  return false;
}

/**
 * สร้างบันทึก "กลับ" อัตโนมัติ (ลืมบันทึกหลัง) — ระยะทาง = 0 กม., เวลา = default_in_time
 */
function createAutoRecoveryAfterTrip(opts) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.USAGE_LOG, [
      'record_id', 'car_id', 'driver_id', 'record_type', 'datetime',
      'requested_by', 'destination', 'mileage', 'created_at', 'created_by', 'notes',
      'auto_generated', 'auto_reason', 'original_user', 'audit_tag'
    ]);
    var cfg = CONFIG.AUTO_RECOVERY || {};
    var recordId = generateUUID();
    var datetimeStr = opts.dateStr + ' ' + (opts.default_in_time || cfg.DEFAULT_IN_TIME || '17:30');
    var notes = 'ระบบบันทึกแทนอัตโนมัติ (ลืมบันทึกหลัง)';
    var mileage = opts.mileage_start != null ? opts.mileage_start : 0;

    sheet.appendRow([
      recordId,
      opts.car_id,
      opts.driver_id,
      'after_trip',
      datetimeStr,
      opts.requested_by || '',
      '',
      mileage,
      new Date(),
      cfg.CREATED_BY_SYSTEM || 'SYSTEM',
      notes,
      true,
      'forgot_in',
      opts.driver_id,
      cfg.AUDIT_TAG || 'AUTO_RECOVERY'
    ]);

    updateQueueFromUsageRecord(recordId, opts.car_id, opts.driver_id, mileage);
    logAudit(cfg.CREATED_BY_SYSTEM || 'SYSTEM', 'create', 'usage_record', recordId, {
      car_id: opts.car_id,
      driver_id: opts.driver_id,
      record_type: 'after_trip',
      auto_reason: 'forgot_in',
      audit_tag: cfg.AUDIT_TAG || 'AUTO_RECOVERY'
    });
    
    // Send Telegram notification
    try {
      if (typeof sendUsageAutoRecoveryTelegram === 'function') {
        var recordForTelegram = {
          record_id: recordId,
          car_id: opts.car_id,
          driver_id: opts.driver_id,
          record_type: 'after_trip',
          datetime: datetimeStr,
          requested_by: opts.requested_by,
          mileage: mileage,
          auto_generated: true,
          auto_reason: 'forgot_in'
        };
        sendUsageAutoRecoveryTelegram(recordForTelegram);
      }
    } catch (telegramError) {
      Logger.log('Send auto-recovery telegram error: ' + telegramError.toString());
    }
    
    return successResponse({ record_id: recordId });
  } catch (error) {
    Logger.log('createAutoRecoveryAfterTrip error: ' + error.toString());
    return errorResponse('ไม่สามารถสร้างบันทึกแทนได้: ' + error.toString(), 'AUTO_RECOVERY_ERROR');
  }
}

/**
 * สรุป Auto-Recovery รายเดือน (สำหรับส่ง Telegram)
 * ไม่รวมชื่อคนขับ — ใช้เฉพาะหลังบ้าน
 */
function getMonthlyAutoRecoverySummary(month, year) {
  try {
    var sheet;
    try {
      sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    } catch (e) {
      return { forgot_out: 0, forgot_in: 0, by_car: {} };
    }
    ensureUsageRecordsAutoRecoveryColumns(sheet);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { forgot_out: 0, forgot_in: 0, by_car: {} };

    var carIdCol = 1, recordTypeCol = 3, datetimeCol = 4, autoGenCol = 11, autoReasonCol = 12;
    var hasAutoCol = data[0].length > autoGenCol;
    var yearBuddhist = year + 543;
    var monthStr = String(month).padStart(2, '0');
    var dateFrom = year + '-' + monthStr + '-01';
    var lastDay = new Date(year, month, 0).getDate();
    var dateTo = year + '-' + monthStr + '-' + String(lastDay).padStart(2, '0');

    var forgotOut = 0, forgotIn = 0;
    var byCar = {};

    for (var i = 1; i < data.length; i++) {
      if (!hasAutoCol) break;
      var isAuto = data[i][autoGenCol] === true || data[i][autoGenCol] === 'TRUE';
      if (!isAuto) continue;
      var reason = data[i][autoReasonCol];
      if (reason !== 'forgot_out' && reason !== 'forgot_in') continue;
      var dt = data[i][datetimeCol];
      var recDate = typeof dt === 'string' ? dt.split(' ')[0] : formatDate(dt);
      if (recDate < dateFrom || recDate > dateTo) continue;
      if (reason === 'forgot_out') forgotOut++;
      else forgotIn++;
      var carId = data[i][carIdCol];
      if (carId) {
        byCar[carId] = (byCar[carId] || 0) + 1;
      }
    }

    return { forgot_out: forgotOut, forgot_in: forgotIn, by_car: byCar };
  } catch (e) {
    Logger.log('getMonthlyAutoRecoverySummary error: ' + e.toString());
    return { forgot_out: 0, forgot_in: 0, by_car: {} };
  }
}

/** ชื่อเดือนไทย (ย่อ) สำหรับสรุป Telegram */
var THAI_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/**
 * สร้างข้อความสรุป Auto-Recovery รายเดือน (สุภาพ, ไม่ระบุชื่อคนขับ)
 */
function formatMonthlyAutoRecoveryTelegramMessage(summary, month, year) {
  var buddhistYear = year + 543;
  var monthName = (month >= 1 && month <= 12) ? THAI_MONTH_SHORT[month - 1] : month + '';
  var title = '📊 สรุปการบันทึกการใช้รถ (ระบบอัตโนมัติ)';
  var period = 'ประจำเดือน ' + monthName + ' ' + buddhistYear;
  var lines = [title, period, ''];
  lines.push('• ระบบบันทึกแทน (ลืมก่อนออก): ' + (summary.forgot_out || 0) + ' ครั้ง');
  lines.push('• ระบบบันทึกแทน (ลืมหลังกลับ): ' + (summary.forgot_in || 0) + ' ครั้ง');
  var byCar = summary.by_car || {};
  var carIds = Object.keys(byCar);
  if (carIds.length > 0) {
    carIds.sort(function (a, b) { return byCar[b] - byCar[a]; });
    lines.push('');
    lines.push('รถที่พบมาก:');
    for (var i = 0; i < carIds.length; i++) {
      lines.push('- ' + carIds[i] + ' : ' + byCar[carIds[i]] + ' ครั้ง');
    }
  }
  lines.push('');
  lines.push('หมายเหตุ:');
  lines.push('ข้อมูลนี้ใช้เพื่อปรับปรุงระบบ');
  lines.push('ไม่ใช่การลงโทษ');
  lines.push('');
  lines.push('❗ ไม่ระบุชื่อคนขับใน Telegram');
  lines.push('ดูรายละเอียดเชิงลึก → หลังบ้านเท่านั้น');
  return lines.join('\n');
}

/**
 * ส่งสรุป Auto-Recovery รายเดือนทาง Telegram (รายเดือน)
 * ไม่ระบุชื่อคนขับในข้อความ
 */
function sendMonthlyAutoRecoveryTelegramReport(month, year) {
  try {
    var summary = getMonthlyAutoRecoverySummary(month, year);
    var total = (summary.forgot_out || 0) + (summary.forgot_in || 0);
    if (total === 0) {
      return successResponse({ sent: false, message: 'ไม่มีข้อมูล Auto-Recovery ในเดือนดังกล่าว' });
    }
    var message = formatMonthlyAutoRecoveryTelegramMessage(summary, month, year);
    if (typeof sendTelegramNotification === 'function') {
      sendTelegramNotification(message);
    }
    return successResponse({ sent: true, total: total });
  } catch (e) {
    Logger.log('sendMonthlyAutoRecoveryTelegramReport error: ' + e.toString());
    return errorResponse('ส่ง Telegram ไม่สำเร็จ: ' + e.toString(), 'TELEGRAM_ERROR');
  }
}

/**
 * เรียกโดย Trigger รายเดือน (เช่น วันที่ 1 เวลา 08:00) — ส่งสรุปเดือนที่แล้ว
 */
function runMonthlyAutoRecoveryTelegram() {
  var now = new Date();
  var prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var month = prev.getMonth() + 1;
  var year = prev.getFullYear();
  return sendMonthlyAutoRecoveryTelegramReport(month, year);
}

/**
 * ระบบสถิติ "การลืมบันทึก" — สำหรับหลังบ้านเท่านั้น
 * สิ่งที่ระบบนับ: ลืมก่อนออก (forgot_out), ลืมหลังกลับ (forgot_in)
 * จำนวนครั้ง / เดือน / คน / รถ (ไม่แจ้งรายวัน, สรุปรายเดือน)
 * by_driver ใช้เฉพาะในระบบ ไม่ส่งไป Telegram
 */
function getAutoRecoveryStats(filters) {
  try {
    filters = filters || {};
    var sheet;
    try {
      sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    } catch (e) {
      return successResponse({
        forgot_out: 0,
        forgot_in: 0,
        by_car: {},
        by_driver: {},
        period: {}
      });
    }
    ensureUsageRecordsAutoRecoveryColumns(sheet);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return successResponse({
        forgot_out: 0,
        forgot_in: 0,
        by_car: {},
        by_driver: {},
        period: filters
      });
    }

    var carIdCol = 1, driverIdCol = 2, datetimeCol = 4, autoGenCol = 11, autoReasonCol = 12;
    var hasAutoCol = data[0].length > autoGenCol;
    var dateFrom = filters.date_from || null;
    var dateTo = filters.date_to || null;
    if (filters.month != null && filters.year != null) {
      var m = filters.month;
      var y = filters.year;
      var monthStr = String(m).padStart(2, '0');
      dateFrom = y + '-' + monthStr + '-01';
      var lastDay = new Date(y, m, 0).getDate();
      dateTo = y + '-' + monthStr + '-' + String(lastDay).padStart(2, '0');
    }

    var forgotOut = 0, forgotIn = 0;
    var byCar = {};
    var byDriver = {};

    for (var i = 1; i < data.length; i++) {
      if (!hasAutoCol) break;
      var isAuto = data[i][autoGenCol] === true || data[i][autoGenCol] === 'TRUE';
      if (!isAuto) continue;
      var reason = data[i][autoReasonCol];
      if (reason !== 'forgot_out' && reason !== 'forgot_in') continue;
      var dt = data[i][datetimeCol];
      var recDate = typeof dt === 'string' ? dt.split(' ')[0] : formatDate(dt);
      if (dateFrom && recDate < dateFrom) continue;
      if (dateTo && recDate > dateTo) continue;
      if (reason === 'forgot_out') forgotOut++;
      else forgotIn++;
      var carId = data[i][carIdCol];
      var driverId = data[i][driverIdCol];
      if (carId) {
        byCar[carId] = (byCar[carId] || 0) + 1;
      }
      if (driverId) {
        byDriver[driverId] = (byDriver[driverId] || 0) + 1;
      }
    }

    return successResponse({
      forgot_out: forgotOut,
      forgot_in: forgotIn,
      by_car: byCar,
      by_driver: byDriver,
      period: { date_from: dateFrom, date_to: dateTo }
    });
  } catch (e) {
    Logger.log('getAutoRecoveryStats error: ' + e.toString());
    return errorResponse('ดึงสถิติไม่สำเร็จ: ' + e.toString(), 'SERVER_ERROR');
  }
}

/**
 * ให้แน่ใจว่า USAGE_RECORDS มีคอลัมน์ Auto-Recovery (สำหรับ sheet ที่สร้างก่อนเพิ่มฟีเจอร์)
 */
function ensureUsageRecordsAutoRecoveryColumns(sheet) {
  try {
    var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headerRow.length >= 15) return;
    var extra = ['auto_generated', 'auto_reason', 'original_user', 'audit_tag'];
    var startCol = headerRow.length + 1;
    for (var i = 0; i < extra.length; i++) {
      sheet.getRange(1, startCol + i).setValue(extra[i]);
    }
  } catch (e) {
    Logger.log('ensureUsageRecordsAutoRecoveryColumns: ' + e.toString());
  }
}

/**
 * Get Usage Records Raw - อ่านรายการบันทึกการใช้รถ (ใช้ภายใน ไม่เช็คสิทธิ์)
 */
function getUsageRecordsRaw(filters) {
  try {
    filters = filters || {};
    var sheet;
    try {
      sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    } catch (e) {
      return successResponse({ records: [] });
    }
    ensureUsageRecordsAutoRecoveryColumns(sheet);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return successResponse({ records: [] });
    var records = [];
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var record = rowToObject(row, headers);
      if (filters.car_id && record.car_id !== filters.car_id) continue;
      if (filters.driver_id && record.driver_id !== filters.driver_id) continue;
      if (filters.record_type && record.record_type !== filters.record_type) continue;
      if (filters.date_from) {
        var rd = (record.datetime || '').split(' ')[0];
        if (rd < filters.date_from) continue;
      }
      if (filters.date_to) {
        var rd2 = (record.datetime || '').split(' ')[0];
        if (rd2 > filters.date_to) continue;
      }
      if (record.auto_generated === true || record.auto_generated === 'TRUE') {
        record.is_auto_recovery = true;
        record.display_auto_tooltip = 'รายการนี้ระบบบันทึกแทนอัตโนมัติ';
      }
      records.push(record);
    }
    records.sort(function(a, b) { return b.datetime.localeCompare(a.datetime); });
    return successResponse({ records: records });
  } catch (error) {
    Logger.log('Get usage records raw error: ' + error.toString());
    return successResponse({ records: [] });
  }
}

/**
 * Get Usage Records - ดึงรายการบันทึกการใช้รถ
 * ต้อง Login; เฉพาะ Admin หรือผู้ที่มีสิทธิ์ usage_log (view) จึงเห็นทั้งหมด
 * Driver จะเห็นเฉพาะของตัวเอง
 */
function getUsageRecords(filters) {
  try {
    // Require authentication
    requireAuth();
    
    filters = filters || {};
    
    // Get current user info
    var currentUserId = getCurrentUser();
    if (currentUserId) {
      try {
        var userResult = getCurrentUserInfo(currentUserId);
        if (userResult.success && userResult.data.user) {
          var user = userResult.data.user;
          
          // If not admin, filter by driver_id
          if (user.role !== 'admin') {
            // Try to find driver_id from user
            if (user.driver_id) {
              filters.driver_id = user.driver_id;
            } else {
              // Try to match by name
              var driversResult = getDrivers({});
              if (driversResult.success && driversResult.data && driversResult.data.drivers) {
                var drivers = driversResult.data.drivers;
                for (var d = 0; d < drivers.length; d++) {
                  if (drivers[d].full_name === user.full_name) {
                    filters.driver_id = drivers[d].driver_id;
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        Logger.log('Error checking user permissions in getUsageRecords: ' + e.toString());
      }
    }
    
    var sheet;
    try {
      sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    } catch (e) {
      return successResponse({ records: [] });
    }
    ensureUsageRecordsAutoRecoveryColumns(sheet);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ records: [] });
    }
    
    var records = [];
    var headers = data[0];
    
    // Determine permission level
    var canViewAll = false;
    var driverId = null;
    
    if (currentUserId) {
      try {
        var userResult = getCurrentUserInfo(currentUserId);
        if (userResult.success && userResult.data.user) {
          var u = userResult.data.user;
          if (u.role === 'admin') {
            canViewAll = true;
          } else if (typeof hasModulePermission === 'function' && hasModulePermission(currentUserId, 'usage_log', 'view')) {
            canViewAll = true;
          }
          
          if (!canViewAll) {
            // Use driver_id from filters (already set above) or try to find it
            if (filters.driver_id) {
              driverId = filters.driver_id;
            } else if (u.driver_id) {
              driverId = u.driver_id;
            } else {
              var driversResult = getDrivers({});
              if (driversResult.success && driversResult.data && driversResult.data.drivers) {
                var drivers = driversResult.data.drivers;
                for (var d = 0; d < drivers.length; d++) {
                  if (drivers[d].full_name === u.full_name) {
                    driverId = drivers[d].driver_id;
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        Logger.log('Error getting user info in getUsageRecords: ' + e.toString());
      }
    }
    
    if (!currentUserId) {
      return errorResponse('ต้องล็อกอินเพื่อดูรายการบันทึกการใช้งานรถ', 'LOGIN_REQUIRED');
    }
    if (!canViewAll && !driverId) {
      return errorResponse('ไม่มีสิทธิ์ดูรายการบันทึกการใช้งานรถ', 'NO_PERMISSION');
    }
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var record = rowToObject(row, headers);
      
      // Filter by driver_id if not admin
      if (!canViewAll) {
        var filterDriverId = filters.driver_id || driverId;
        if (filterDriverId && record.driver_id !== filterDriverId) {
          continue;
        }
      }
      
      // Apply additional filters
      if (filters.car_id && record.car_id !== filters.car_id) {
        continue;
      }
      if (canViewAll && filters.driver_id && record.driver_id !== filters.driver_id) {
        continue;
      }
      if (filters.record_type && record.record_type !== filters.record_type) {
        continue;
      }
      if (filters.date_from) {
        var recordDate = record.datetime.split(' ')[0];
        if (recordDate < filters.date_from) {
          continue;
        }
      }
      if (filters.date_to) {
        var recordDate = record.datetime.split(' ')[0];
        if (recordDate > filters.date_to) {
          continue;
        }
      }
      
      // การแสดงผลในระบบ (หลังบ้าน): ไอคอน ⚙️ AUTO, สีจาง, Tooltip
      if (record.auto_generated === true || record.auto_generated === 'TRUE') {
        record.is_auto_recovery = true;
        record.display_auto_tooltip = 'รายการนี้ระบบบันทึกแทนอัตโนมัติ';
      }
      
      records.push(record);
    }
    
    // Sort by datetime descending
    records.sort(function(a, b) {
      return b.datetime.localeCompare(a.datetime);
    });
    
    return successResponse({ records: records });
    
  } catch (error) {
    Logger.log('Get usage records error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Scan QR for Usage Record - สแกน QR บันทึกการใช้รถ
 */
/**
 * Scan QR for Usage Record - Public API (No authentication required)
 * การสแกน QR Code เพื่อบันทึกการใช้รถสามารถทำได้โดยไม่ต้องล็อกอิน
 */
function scanQRForUsageRecord(qrData) {
  try {
    // This function does NOT require authentication
    // Anyone can scan QR code and record usage
    
    // qrData should contain car_id
    var carId = qrData.car_id || qrData;
    
    // Validate car exists
    var car = getVehicleById(carId);
    if (!car.success) {
      return errorResponse('ไม่พบรถ', 'CAR_NOT_FOUND');
    }
    
    // Get all active drivers for dropdown
    var driversResult = getDrivers({ status: 'active' });
    var drivers = (driversResult.success && driversResult.data && driversResult.data.drivers) ? driversResult.data.drivers : [];
    
    return successResponse({
      car_id: carId,
      car_info: (car.success && car.data && car.data.vehicle) ? car.data.vehicle : null,
      drivers: drivers
    }, 'พร้อมบันทึกการใช้รถ');
    
  } catch (error) {
    Logger.log('Scan QR for usage record error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Last Mileage for Car
 * ดึงเลขไมล์ล่าสุดของรถ
 */
function getLastMileageForCar(carId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    if (!sheet) return 0;
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 0; // No headers
    
    var lastMileage = 0;
    var carIdCol = 1; // car_id column
    
    // Find latest mileage for this car
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][carIdCol] === carId) {
        var mileageCol = 7; // mileage column
        var mileage = parseInt(data[i][mileageCol]) || 0;
        if (mileage > lastMileage) {
          lastMileage = mileage;
        }
      }
    }
    
    return lastMileage;
    
  } catch (error) {
    Logger.log('Get last mileage error: ' + error.toString());
    return 0;
  }
}

/**
 * Check if there's a before_trip record
 * ตรวจสอบว่ามีบันทึก "ก่อนออกเดินทาง" หรือไม่
 */
function checkHasBeforeTrip(carId, driverId, dateStr) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    if (!sheet) return false;
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    
    var carIdCol = 1;
    var driverIdCol = 2;
    var recordTypeCol = 3;
    var datetimeCol = 4;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][carIdCol] === carId && 
          data[i][driverIdCol] === driverId &&
          data[i][recordTypeCol] === 'before_trip') {
        var recordDate = data[i][datetimeCol];
        if (typeof recordDate === 'string') {
          var recordDateStr = recordDate.split(' ')[0];
          if (recordDateStr === dateStr) {
            return true;
          }
        } else if (recordDate instanceof Date) {
          var recordDateStr = formatDate(recordDate);
          if (recordDateStr === dateStr) {
            return true;
          }
        }
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log('Check has before trip error: ' + error.toString());
    return false;
  }
}

/**
 * Check for duplicate usage record
 * ตรวจสอบว่ามีการบันทึกซ้ำหรือไม่ (ภายใน 5 นาที)
 */
function checkDuplicateUsageRecord(carId, driverId, recordType, datetime) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    if (!sheet) return false;
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    
    var carIdCol = 1;
    var driverIdCol = 2;
    var recordTypeCol = 3;
    var datetimeCol = 4;
    
    var recordDateTime = parseDateTime(datetime);
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][carIdCol] === carId && 
          data[i][driverIdCol] === driverId &&
          data[i][recordTypeCol] === recordType) {
        var existingDateTime = data[i][datetimeCol];
        var existingDateObj = null;
        
        if (typeof existingDateTime === 'string') {
          existingDateObj = parseDateTime(existingDateTime);
        } else if (existingDateTime instanceof Date) {
          existingDateObj = existingDateTime;
        }
        
        if (existingDateObj) {
          var diffMinutes = Math.abs((recordDateTime - existingDateObj) / (1000 * 60));
          if (diffMinutes < 5) {
            return true; // Duplicate within 5 minutes
          }
        }
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log('Check duplicate usage record error: ' + error.toString());
    return false;
  }
}

/**
 * Parse DateTime string
 */
function parseDateTime(dateTimeStr) {
  try {
    // SECURITY: Validate input before processing
    if (!dateTimeStr || typeof dateTimeStr !== 'string') {
      return new Date(); // Return current date if invalid input
    }
    
    // Format: "yyyy-MM-dd HH:mm"
    var parts = dateTimeStr.split(' ');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return new Date(); // Return current date if invalid format
    }
    
    var dateParts = parts[0].split('-');
    var timeParts = parts[1].split(':');
    
    // SECURITY: Validate dateParts and timeParts before parsing
    if (!dateParts || dateParts.length < 3 || !timeParts || timeParts.length < 2) {
      return new Date(); // Return current date if invalid format
    }
    var year = parseInt(dateParts[0], 10);
    var month = parseInt(dateParts[1], 10) - 1;
    var day = parseInt(dateParts[2], 10);
    var hour = parseInt(timeParts[0], 10);
    var minute = parseInt(timeParts[1], 10);
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
      return new Date(); // Return current date if invalid numeric values
    }
    
    return new Date(year, month, day, hour, minute);
    
  } catch (error) {
    Logger.log('Parse datetime error: ' + error.toString());
    return new Date();
  }
}

/**
 * Get Last Mileage for Car
 * ดึงเลขไมล์ล่าสุดของรถ
 */
function getLastMileageForCar(carId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    if (!sheet) return 0;
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return 0; // No headers
    
    var lastMileage = 0;
    var carIdCol = 1; // car_id column
    
    // Find latest mileage for this car
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][carIdCol] === carId) {
        var mileageCol = 7; // mileage column
        var mileage = parseInt(data[i][mileageCol]) || 0;
        if (mileage > lastMileage) {
          lastMileage = mileage;
        }
      }
    }
    
    return lastMileage;
    
  } catch (error) {
    Logger.log('Get last mileage error: ' + error.toString());
    return 0;
  }
}

/**
 * Check if there's a before_trip record
 * ตรวจสอบว่ามีบันทึก "ก่อนออกเดินทาง" หรือไม่
 */
function checkHasBeforeTrip(carId, driverId, dateStr) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    if (!sheet) return false;
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    
    var carIdCol = 1;
    var driverIdCol = 2;
    var recordTypeCol = 3;
    var datetimeCol = 4;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][carIdCol] === carId && 
          data[i][driverIdCol] === driverId &&
          data[i][recordTypeCol] === 'before_trip') {
        var recordDate = data[i][datetimeCol];
        if (typeof recordDate === 'string') {
          var recordDateStr = recordDate.split(' ')[0];
          if (recordDateStr === dateStr) {
            return true;
          }
        } else if (recordDate instanceof Date) {
          var recordDateStr = formatDate(recordDate);
          if (recordDateStr === dateStr) {
            return true;
          }
        }
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log('Check has before trip error: ' + error.toString());
    return false;
  }
}

/**
 * Check for duplicate usage record
 * ตรวจสอบว่ามีการบันทึกซ้ำหรือไม่ (ภายใน 5 นาที)
 */
function checkDuplicateUsageRecord(carId, driverId, recordType, datetime) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USAGE_LOG);
    if (!sheet) return false;
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    
    var carIdCol = 1;
    var driverIdCol = 2;
    var recordTypeCol = 3;
    var datetimeCol = 4;
    
    var recordDateTime = parseDateTime(datetime);
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][carIdCol] === carId && 
          data[i][driverIdCol] === driverId &&
          data[i][recordTypeCol] === recordType) {
        var existingDateTime = data[i][datetimeCol];
        var existingDateObj = null;
        
        if (typeof existingDateTime === 'string') {
          existingDateObj = parseDateTime(existingDateTime);
        } else if (existingDateTime instanceof Date) {
          existingDateObj = existingDateTime;
        }
        
        if (existingDateObj) {
          var diffMinutes = Math.abs((recordDateTime - existingDateObj) / (1000 * 60));
          if (diffMinutes < 5) {
            return true; // Duplicate within 5 minutes
          }
        }
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log('Check duplicate usage record error: ' + error.toString());
    return false;
  }
}

/**
 * Parse DateTime string
 */
function parseDateTime(dateTimeStr) {
  try {
    // SECURITY: Validate input before processing
    if (!dateTimeStr || typeof dateTimeStr !== 'string') {
      return new Date(); // Return current date if invalid input
    }
    
    // Format: "yyyy-MM-dd HH:mm"
    var parts = dateTimeStr.split(' ');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return new Date(); // Return current date if invalid format
    }
    
    var dateParts = parts[0].split('-');
    var timeParts = parts[1].split(':');
    
    // SECURITY: Validate dateParts and timeParts before parsing
    if (!dateParts || dateParts.length < 3 || !timeParts || timeParts.length < 2) {
      return new Date(); // Return current date if invalid format
    }
    var year = parseInt(dateParts[0], 10);
    var month = parseInt(dateParts[1], 10) - 1;
    var day = parseInt(dateParts[2], 10);
    var hour = parseInt(timeParts[0], 10);
    var minute = parseInt(timeParts[1], 10);
    
    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
      return new Date(); // Return current date if invalid numeric values
    }
    
    return new Date(year, month, day, hour, minute);
    
  } catch (error) {
    Logger.log('Parse datetime error: ' + error.toString());
    return new Date();
  }
}
