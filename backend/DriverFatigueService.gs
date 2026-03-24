/**
 * PPK DriveHub Driver Fatigue Service
 * ระบบตรวจสอบความเมื่อยล้าของคนขับ (Soft Rule + Alert)
 * - ตรวจสอบระยะทางที่ขับในวันก่อนหน้า
 * - แจ้งเตือนเมื่อขับมากกว่า 400 กม. (ไม่บล็อค)
 * - แนะนำให้อยู่ในกลุ่มสแตนบายงานภายในโรงเรียนวันถัดไป
 * - สามารถ Override ได้ (แต่ต้องยืนยัน)
 */

/**
 * Daily Job - ประมวลผล Driver Fatigue ทุกวันเวลา 23:59
 * ตรวจสอบทุกคนขับว่าขับมากกว่า 400 กม. หรือไม่
 * Mark FatigueFlag = TRUE สำหรับคนขับที่ขับไกล
 */
function dailyDriverFatigueCheck() {
  try {
    var today = new Date();
    var todayStr = formatDate(today);
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = formatDate(yesterday);
    
    // Get all active drivers
    var driversResult = getDrivers({ status: 'active' });
    if (!driversResult.success) {
      Logger.log('Daily fatigue check: Cannot get drivers');
      return;
    }
    
    var drivers = driversResult.data.drivers;
    var processedCount = 0;
    var flaggedCount = 0;
    
    for (var i = 0; i < drivers.length; i++) {
      var driver = drivers[i];
      
      // Check distance yesterday
      var distanceCheck = checkDriverDistanceYesterday(driver.driver_id, todayStr);
      
      if (distanceCheck.has_data && distanceCheck.exceeded_limit) {
        // Mark driver with FatigueFlag
        markDriverFatigue(driver.driver_id, yesterdayStr, distanceCheck.total_distance);
        flaggedCount++;
      } else {
        // Clear fatigue flag if exists
        clearDriverFatigue(driver.driver_id);
      }
      
      processedCount++;
    }
    
    Logger.log('Daily fatigue check completed: Processed ' + processedCount + ' drivers, Flagged ' + flaggedCount + ' drivers');
    
    return {
      success: true,
      processed: processedCount,
      flagged: flaggedCount,
      date: yesterdayStr
    };
    
  } catch (error) {
    Logger.log('Daily driver fatigue check error: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Mark Driver Fatigue - Mark driver with FatigueFlag
 */
function markDriverFatigue(driverId, date, distance) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.DRIVERS);
    var rowIndex = findRowIndexById(sheet, 0, driverId);
    
    if (rowIndex === -1) {
      return { success: false };
    }
    
    var now = new Date();
    
    // Update fatigue flag
    sheet.getRange(rowIndex, 7).setValue('TRUE'); // fatigue_flag
    sheet.getRange(rowIndex, 8).setValue(date); // fatigue_date
    sheet.getRange(rowIndex, 9).setValue(distance); // fatigue_distance
    
    // Update status to 'fatigue' (but keep active for override)
    // Don't change status, just add flag
    
    // Log
    logAudit('system', 'update', 'driver', driverId, {
      fatigue_flag: false
    }, {
      fatigue_flag: true,
      fatigue_date: date,
      fatigue_distance: distance
    }, {}, 'Mark Fatigue Flag - ขับ ' + distance + ' กม.');
    
    return { success: true };
    
  } catch (error) {
    Logger.log('Mark driver fatigue error: ' + error.toString());
    return { success: false };
  }
}

/**
 * Clear Driver Fatigue - Clear fatigue flag
 */
function clearDriverFatigue(driverId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.DRIVERS);
    var rowIndex = findRowIndexById(sheet, 0, driverId);
    
    if (rowIndex === -1) {
      return { success: false };
    }
    
    var currentFlag = sheet.getRange(rowIndex, 7).getValue();
    
    // Only clear if flag exists
    if (currentFlag === true || currentFlag === 'TRUE') {
      sheet.getRange(rowIndex, 7).setValue('FALSE'); // fatigue_flag
      sheet.getRange(rowIndex, 8).setValue(''); // fatigue_date
      sheet.getRange(rowIndex, 9).setValue(''); // fatigue_distance
      
      // Log
      logAudit('system', 'update', 'driver', driverId, {
        fatigue_flag: true
      }, {
        fatigue_flag: false
      }, {}, 'Clear Fatigue Flag');
    }
    
    return { success: true };
    
  } catch (error) {
    Logger.log('Clear driver fatigue error: ' + error.toString());
    return { success: false };
  }
}

/**
 * Check Driver Fatigue Flag - ตรวจสอบ FatigueFlag จากฐานข้อมูล
 */
function checkDriverFatigueFlag(driverId) {
  try {
    var driver = getDriverById(driverId);
    if (!driver.success) {
      return { has_fatigue_flag: false };
    }
    
    if (!driver.success || !driver.data || !driver.data.driver) {
      return errorResponse('ไม่พบข้อมูลคนขับ', 'DRIVER_NOT_FOUND');
    }
    var driverData = driver.data.driver;
    var hasFlag = driverData.fatigue_flag === true || driverData.fatigue_flag === 'TRUE';
    
    if (hasFlag) {
      // Check if flag is still valid (for today)
      var today = formatDate(new Date());
      var fatigueDate = driverData.fatigue_date;
      
      // Flag is valid for the day after fatigue_date
      if (fatigueDate && today === fatigueDate) {
        // Same day - flag not yet effective
        return { has_fatigue_flag: false };
      }
      
      var fatigueDateObj = parseDate(fatigueDate);
      var todayObj = parseDate(today);
      var daysDiff = Math.floor((todayObj - fatigueDateObj) / (1000 * 60 * 60 * 24));
      
      // Flag is valid only for the next day (1 day)
      if (daysDiff === 1) {
        return {
          has_fatigue_flag: true,
          fatigue_date: fatigueDate,
          fatigue_distance: driverData.fatigue_distance,
          effective_date: today
        };
      } else if (daysDiff > 1) {
        // Flag expired, clear it
        clearDriverFatigue(driverId);
        return { has_fatigue_flag: false };
      }
    }
    
    return { has_fatigue_flag: false };
    
  } catch (error) {
    Logger.log('Check driver fatigue flag error: ' + error.toString());
    return { has_fatigue_flag: false };
  }
}

/**
 * Check Driver Distance Yesterday - ตรวจสอบระยะทางที่คนขับขับเมื่อวาน
 * คำนวณจาก Usage Records (before_trip และ after_trip)
 */
function checkDriverDistanceYesterday(driverId, checkDate) {
  try {
    // Get yesterday's date
    var date = checkDate ? parseDate(checkDate) : new Date();
    var yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = formatDate(yesterday);
    
    // Get usage records for yesterday
    var usageRecords = getUsageRecordsRaw({
      driver_id: driverId,
      date_from: yesterdayStr,
      date_to: yesterdayStr
    });
    
    if (!usageRecords.success) {
      return {
        has_data: false,
        total_distance: 0,
        exceeded_limit: false
      };
    }
    
    var records = usageRecords.data.records;
    if (records.length === 0) {
      return {
        has_data: false,
        total_distance: 0,
        exceeded_limit: false
      };
    }
    
    // Calculate total distance driven yesterday
    // Group by car and calculate distance for each trip
    var tripsByCar = {};
    var totalDistance = 0;
    
    records.forEach(function(record) {
      if (!record.car_id || !record.mileage) return;
      
      if (!tripsByCar[record.car_id]) {
        tripsByCar[record.car_id] = {
          before_trips: [],
          after_trips: []
        };
      }
      
      if (record.record_type === 'before_trip') {
        tripsByCar[record.car_id].before_trips.push({
          mileage: parseFloat(record.mileage),
          datetime: record.datetime
        });
      } else if (record.record_type === 'after_trip') {
        tripsByCar[record.car_id].after_trips.push({
          mileage: parseFloat(record.mileage),
          datetime: record.datetime
        });
      }
    });
    
    // Calculate distance for each car
    for (var carId in tripsByCar) {
      var trips = tripsByCar[carId];
      
      // Match before_trip with after_trip by time
      trips.before_trips.forEach(function(beforeTrip) {
        // Find closest after_trip
        var closestAfter = null;
        var minTimeDiff = Infinity;
        
        trips.after_trips.forEach(function(afterTrip) {
          if (afterTrip.mileage > beforeTrip.mileage) {
            var timeDiff = Math.abs(new Date(afterTrip.datetime) - new Date(beforeTrip.datetime));
            if (timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff;
              closestAfter = afterTrip;
            }
          }
        });
        
        if (closestAfter) {
          var distance = closestAfter.mileage - beforeTrip.mileage;
          if (distance > 0) {
            totalDistance += distance;
          }
        }
      });
    }
    
    // If no matched trips, try to get from queues
    if (totalDistance === 0) {
      var queues = getQueues({
        driver_id: driverId,
        date: yesterdayStr,
        status: 'done'
      });
      
      if (queues.success) {
        queues.data.queues.forEach(function(queue) {
          if (queue.mileage_start && queue.mileage_end) {
            var distance = parseFloat(queue.mileage_end) - parseFloat(queue.mileage_start);
            if (distance > 0) {
              totalDistance += distance;
            }
          }
        });
      }
    }
    
    // Check if exceeded 400 km
    var exceededLimit = totalDistance > 400;
    
    return {
      has_data: totalDistance > 0,
      date: yesterdayStr,
      total_distance: totalDistance,
      exceeded_limit: exceededLimit,
      recommendation: exceededLimit ? 
        'ควรจัดให้อยู่ในกลุ่มสแตนบายงานภายในโรงเรียน' : 
        null
    };
    
  } catch (error) {
    Logger.log('Check driver distance yesterday error: ' + error.toString());
    return {
      has_data: false,
      total_distance: 0,
      exceeded_limit: false
    };
  }
}

/**
 * Check Driver Fatigue Status - ตรวจสอบสถานะความเมื่อยล้าของคนขับ
 * Soft Rule: แสดงคำเตือนแต่ไม่บล็อค
 */
function checkDriverFatigueStatus(driverId, checkDate) {
  try {
    // First check FatigueFlag from database (from daily job)
    var fatigueFlag = checkDriverFatigueFlag(driverId);
    
    if (fatigueFlag.has_fatigue_flag) {
      // Driver has fatigue flag
      var driver = getDriverById(driverId);
      var driverName = (driver.success && driver.data && driver.data.driver) ? driver.data.driver.full_name : driverId;
      
      // Check if driver has standby rule
      var rules = getQueueRules();
      var hasStandbyRule = false;
      
      if (rules.success) {
        for (var i = 0; i < rules.data.rules.length; i++) {
          var rule = rules.data.rules[i];
          if (rule.driver_id === driverId && 
              rule.assignment_type === 'standby_school' && 
              rule.active === true) {
            hasStandbyRule = true;
            break;
          }
        }
      }
      
      return {
        fatigued: true,
        warning: {
          message: 'พนักงานคนนี้เมื่อวานขับรถ ' + fatigueFlag.fatigue_distance.toLocaleString() + ' กม.',
          recommendation: 'ระบบแนะนำให้ปฏิบัติงานภายในวันนี้',
          detail: 'ควรจัดให้อยู่ในกลุ่มสแตนบายงานภายในโรงเรียน',
          has_standby_rule: hasStandbyRule,
          distance: fatigueFlag.fatigue_distance,
          fatigue_date: fatigueFlag.fatigue_date,
          allow_override: true, // สามารถ Override ได้
          severity: 'warning' // Warning ไม่ใช่ Error
        }
      };
    }
    
    // Fallback: Check distance manually (for real-time check)
    var distanceCheck = checkDriverDistanceYesterday(driverId, checkDate);
    
    if (distanceCheck.has_data && distanceCheck.exceeded_limit) {
      // Check if driver has standby rule
      var rules = getQueueRules();
      var hasStandbyRule = false;
      
      if (rules.success) {
        for (var i = 0; i < rules.data.rules.length; i++) {
          var rule = rules.data.rules[i];
          if (rule.driver_id === driverId && 
              rule.assignment_type === 'standby_school' && 
              rule.active === true) {
            hasStandbyRule = true;
            break;
          }
        }
      }
      
      return {
        fatigued: true,
        warning: {
          message: 'พนักงานคนนี้เมื่อวานขับรถ ' + distanceCheck.total_distance.toLocaleString() + ' กม.',
          recommendation: 'ระบบแนะนำให้ปฏิบัติงานภายในวันนี้',
          detail: 'ควรจัดให้อยู่ในกลุ่มสแตนบายงานภายในโรงเรียน',
          has_standby_rule: hasStandbyRule,
          distance: distanceCheck.total_distance,
          allow_override: true,
          severity: 'warning'
        }
      };
    }
    
    return {
      fatigued: false,
      warning: null
    };
    
  } catch (error) {
    Logger.log('Check driver fatigue status error: ' + error.toString());
    return {
      fatigued: false,
      warning: null
    };
  }
}

/**
 * Get Driver Fatigue Warning - ดึงคำเตือนความเมื่อยล้า (สำหรับ UI)
 */
function getDriverFatigueWarning(driverId, checkDate) {
  try {
    var fatigueStatus = checkDriverFatigueStatus(driverId, checkDate);
    
    if (fatigueStatus.fatigued && fatigueStatus.warning) {
      return successResponse({
        warning: fatigueStatus.warning,
        allow_override: true // ยืดหยุ่นได้
      });
    }
    
    return successResponse({
      warning: null,
      allow_override: false
    });
    
  } catch (error) {
    Logger.log('Get driver fatigue warning error: ' + error.toString());
    return successResponse({
      warning: null,
      allow_override: false
    });
  }
}

/**
 * Get Driver Discipline Score - คะแนนวินัยการใช้งานรถ
 * ใช้ประเมินบุคลากรแบบยุติธรรม คะแนนใช้เพื่อ "พัฒนา" ไม่ใช่ลงโทษ
 * 
 * พิจารณาจาก:
 * - ความครบถ้วนการบันทึก (ลืมบันทึกน้อย = คะแนนสูง)
 * - ความสม่ำเสมอ
 * - จำนวน Flag / เดือน
 * - Auto-recovery events
 */
function getDriverDisciplineScore(driverId, period) {
  try {
    period = period || {};
    var endDate = period.date_to || formatDate(new Date());
    var startDate = period.date_from || (function() {
      var d = new Date();
      d.setMonth(d.getMonth() - 1); // 1 เดือนย้อนหลัง
      return formatDate(d);
    })();
    
    // Get usage records for this driver
    var usageResult = getUsageRecordsRaw({
      driver_id: driverId,
      date_from: startDate,
      date_to: endDate
    });
    
    if (!usageResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลการใช้งานได้', 'FETCH_ERROR');
    }
    
    var records = usageResult.data.records || [];
    
    // Count total trips (before_trip records)
    var totalTrips = 0;
    var completedTrips = 0; // มีทั้ง before และ after
    var forgotOut = 0; // ลืมบันทึกก่อนออก
    var forgotIn = 0; // ลืมบันทึกหลังกลับ
    var autoGenerated = 0; // บันทึกโดยระบบ
    
    var tripsByDate = {}; // Group by date
    
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      var datePart = (record.datetime || '').split(' ')[0];
      
      if (!tripsByDate[datePart]) {
        tripsByDate[datePart] = {
          before: [],
          after: [],
          auto_before: 0,
          auto_after: 0
        };
      }
      
      if (record.record_type === 'before_trip') {
        totalTrips++;
        tripsByDate[datePart].before.push(record);
        if (record.auto_generated === true || record.auto_generated === 'TRUE') {
          forgotOut++;
          autoGenerated++;
          tripsByDate[datePart].auto_before++;
        }
      } else if (record.record_type === 'after_trip') {
        tripsByDate[datePart].after.push(record);
        if (record.auto_generated === true || record.auto_generated === 'TRUE') {
          forgotIn++;
          autoGenerated++;
          tripsByDate[datePart].auto_after++;
        }
      }
    }
    
    // Count completed trips (มีทั้ง before และ after ในวันเดียวกัน)
    for (var date in tripsByDate) {
      var dayTrips = tripsByDate[date];
      if (dayTrips.before.length > 0 && dayTrips.after.length > 0) {
        completedTrips += Math.min(dayTrips.before.length, dayTrips.after.length);
      }
    }
    
    // Calculate score (0-100)
    // Base score: 100
    // Deduct points for:
    // - ลืมบันทึกก่อนออก: -5 points each
    // - ลืมบันทึกหลังกลับ: -3 points each
    // - ไม่มี after_trip: -10 points per trip
    
    var score = 100;
    var deductions = [];
    
    // Deduct for forgot out
    if (forgotOut > 0) {
      var deductOut = forgotOut * 5;
      score -= deductOut;
      deductions.push({
        reason: 'ลืมบันทึกก่อนออก',
        count: forgotOut,
        points_deducted: deductOut
      });
    }
    
    // Deduct for forgot in
    if (forgotIn > 0) {
      var deductIn = forgotIn * 3;
      score -= deductIn;
      deductions.push({
        reason: 'ลืมบันทึกหลังกลับ',
        count: forgotIn,
        points_deducted: deductIn
      });
    }
    
    // Deduct for incomplete trips (มี before แต่ไม่มี after)
    var incompleteTrips = totalTrips - completedTrips;
    if (incompleteTrips > 0) {
      var deductIncomplete = incompleteTrips * 10;
      score -= deductIncomplete;
      deductions.push({
        reason: 'บันทึกไม่ครบ (มีก่อนออกแต่ไม่มีหลังกลับ)',
        count: incompleteTrips,
        points_deducted: deductIncomplete
      });
    }
    
    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));
    
    // Get threshold
    var threshold = getKPIThreshold(score);
    
    // Calculate consistency (ความสม่ำเสมอ)
    var totalDays = Object.keys(tripsByDate).length;
    var daysWithTrips = 0;
    for (var d in tripsByDate) {
      if (tripsByDate[d].before.length > 0) {
        daysWithTrips++;
      }
    }
    var consistencyRate = totalDays > 0 ? (daysWithTrips / totalDays) * 100 : 0;
    
    return successResponse({
      driver_id: driverId,
      period: { date_from: startDate, date_to: endDate },
      score: Math.round(score * 100) / 100,
      threshold: threshold,
      statistics: {
        total_trips: totalTrips,
        completed_trips: completedTrips,
        incomplete_trips: incompleteTrips,
        forgot_out: forgotOut,
        forgot_in: forgotIn,
        auto_generated: autoGenerated,
        consistency_rate: Math.round(consistencyRate * 100) / 100,
        days_with_trips: daysWithTrips,
        total_days: totalDays
      },
      deductions: deductions,
      message: 'คะแนนนี้ใช้เพื่อการพัฒนา ไม่ใช่การลงโทษ'
    });
    
  } catch (error) {
    Logger.log('Get driver discipline score error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการคำนวณคะแนน: ' + error.toString(), 'SERVER_ERROR');
  }
}
