/**
 * PPK DriveHub Queue Service
 * จัดการคิวรถ
 */

/**
 * Create Queue - สร้างคิวรถใหม่
 * ต้องไม่ซ้ำรถไม่ซ้ำคน แต่ยืดหยุ่นได้ (เช่น ถ้าคนขับมีคิว 08.00-16.30 แต่ปลายทางใกล้ สามารถวิ่งรอบในช่วงรอได้)
 * ตรวจสอบ: Scheduled Repairs และ Leaves
 */
function createQueue(queueData) {
  try {
    validateRequired(queueData, ['date', 'time_start', 'car_id', 'driver_id', 'mission', 'requested_by', 'passenger_count', 'destination']);
    
    // SECURITY: Sanitize string inputs to prevent XSS/injection
    if (queueData.mission) queueData.mission = sanitizeInput(String(queueData.mission));
    if (queueData.requested_by) queueData.requested_by = sanitizeInput(String(queueData.requested_by));
    if (queueData.destination) queueData.destination = sanitizeInput(String(queueData.destination));
    if (queueData.notes) queueData.notes = sanitizeInput(String(queueData.notes));
    if (queueData.car_id) queueData.car_id = sanitizeInput(String(queueData.car_id));
    if (queueData.driver_id) queueData.driver_id = sanitizeInput(String(queueData.driver_id));
    
    // Check if car is available (but allow flexibility)
    var car = getVehicleById(queueData.car_id);
    if (!car.success || !car.data || !car.data.vehicle) {
      return errorResponse('ไม่พบรถ', 'CAR_NOT_FOUND');
    }
    
    // Allow if car is available or in_use (flexible)
    if (car.data.vehicle.status === 'repair' || car.data.vehicle.status === 'unavailable') {
      return errorResponse('รถไม่พร้อมใช้งาน (กำลังซ่อมหรือไม่พร้อมใช้งาน)', 'CAR_NOT_AVAILABLE');
    }
    
    // Check if car is scheduled for repair (unless emergency override)
    if (!queueData.emergency_override) {
      var scheduledRepair = isCarScheduledForRepair(queueData.car_id, queueData.date);
      if (scheduledRepair.scheduled) {
        var repairInfo = scheduledRepair.scheduled_repairs[0];
        return errorResponse(
          'รถถูกจองซ่อมในวันที่ ' + formatDateThai(queueData.date) + 
          ' (แจ้งซ่อมล่วงหน้า: ' + repairInfo.issue_description + ')',
          'CAR_SCHEDULED_FOR_REPAIR'
        );
      }
    }
    
    // Check if driver is active
    var driver = getDriverById(queueData.driver_id);
    if (!driver.success || !driver.data || !driver.data.driver) {
      return errorResponse('ไม่พบคนขับ', 'DRIVER_NOT_FOUND');
    }
    if (driver.data.driver.status !== 'active') {
      return errorResponse('คนขับไม่พร้อมใช้งาน', 'DRIVER_NOT_AVAILABLE');
    }
    
    // Check if driver is on leave (unless emergency override)
    if (!queueData.emergency_override) {
      var driverLeave = isDriverOnLeave(queueData.driver_id, queueData.date);
      if (driverLeave.on_leave) {
        var leave = driverLeave.leave;
        return errorResponse(
          'คนขับลาตั้งแต่ ' + formatDateThai(leave.start_date) + ' ถึง ' + formatDateThai(leave.end_date) + 
          ' (' + leave.leave_type + ')',
          'DRIVER_ON_LEAVE'
        );
      }
    }
    
    // Check for conflicts (but allow flexibility)
    var conflicts = checkQueueConflicts(queueData, queueData.allow_flexible || false);
    if (conflicts.hasConflict && !queueData.allow_flexible) {
      return errorResponse(conflicts.message, 'QUEUE_CONFLICT');
    }
    
    // Check driver fatigue warning (Soft Rule - ไม่บล็อค แค่เตือน)
    // วันถัดไปควรถูกจัดไปอยู่ในกลุ่มสแตนบายงานภายในโรงเรียน
    // แต่ยืดหยุ่นได้ ถ้าจำเป็นต้องให้เขาขับต่อ (ต้องยืนยัน)
    var fatigueWarning = checkDriverFatigueStatus(queueData.driver_id, queueData.date);
    var warnings = [];
    
    if (fatigueWarning.fatigued && fatigueWarning.warning) {
      warnings.push({
        type: 'driver_fatigue',
        severity: 'warning', // Warning ไม่ใช่ Error
        message: fatigueWarning.warning.message,
        recommendation: fatigueWarning.warning.recommendation,
        detail: fatigueWarning.warning.detail,
        distance: fatigueWarning.warning.distance,
        allow_override: true,
        requires_confirmation: true, // ต้องยืนยันเมื่อ Override
        suggestion: 'แนะนำให้จัดให้อยู่ในกลุ่มสแตนบายงานภายในโรงเรียน แต่สามารถ override ได้'
      });
      
      // Check if driver already has standby rule
      if (!fatigueWarning.warning.has_standby_rule) {
        // Suggest creating standby rule
        warnings[0].suggest_create_standby_rule = true;
      }
      
      // Soft Rule: ไม่บล็อค แต่ต้องยืนยันถ้า Override
      // ถ้าไม่ยืนยัน Override → แสดงคำเตือนแต่ยังสร้างคิวได้ (ให้ผู้ใช้ตัดสินใจ)
      // ถ้ายืนยัน Override → บันทึกว่าเป็น Override
    }
    
    // Smart Queue Recommendations (NEW - Fairness Engine)
    var smartRecommendations = null;
    try {
      if (typeof getSmartQueueRecommendations === 'function') {
        smartRecommendations = getSmartQueueRecommendations({
          date: queueData.date,
          mission: queueData.mission,
          estimated_distance: queueData.estimated_distance || 0,
          job_type: queueData.job_type || 'general'
        });
        
        if (smartRecommendations.success && smartRecommendations.data.recommendations) {
          // Add fairness warnings
          for (var i = 0; i < smartRecommendations.data.recommendations.length; i++) {
            var rec = smartRecommendations.data.recommendations[i];
            if (rec.type === 'fairness_warning' || rec.type === 'avoid_pairing') {
              warnings.push({
                type: 'smart_queue_' + rec.type,
                severity: rec.priority === 'high' ? 'warning' : 'info',
                message: rec.message,
                recommendation: rec.recommendation || rec.avoid,
                allow_override: true,
                requires_confirmation: rec.priority === 'high'
              });
            }
          }
        }
      }
    } catch (smartError) {
      Logger.log('Smart queue recommendations error: ' + smartError.toString());
    }
    
    // Check Rotation Policy
    var rotationCheck = null;
    try {
      if (typeof checkRotationPolicy === 'function') {
        rotationCheck = checkRotationPolicy(queueData.driver_id, queueData.car_id, queueData.date);
        if (rotationCheck && rotationCheck.warnings && rotationCheck.warnings.length > 0) {
          for (var i = 0; i < rotationCheck.warnings.length; i++) {
            warnings.push({
              type: 'rotation_policy',
              severity: 'info',
              message: rotationCheck.warnings[i].message,
              recommendation: rotationCheck.warnings[i].recommendation,
              allow_override: true
            });
          }
        }
      }
    } catch (rotationError) {
      Logger.log('Rotation policy check error: ' + rotationError.toString());
    }
    
    // Check Recovery Day Status
    var recoveryStatus = null;
    try {
      if (typeof checkRecoveryDayStatus === 'function') {
        recoveryStatus = checkRecoveryDayStatus(queueData.driver_id, queueData.date);
        if (recoveryStatus && recoveryStatus.needs_recovery) {
          warnings.push({
            type: 'recovery_day',
            severity: 'warning',
            message: 'แนะนำวันฟื้นตัว: ' + recoveryStatus.recovery_reason,
            recommendation: recoveryStatus.recommendation,
            allow_override: true,
            requires_confirmation: true
          });
        }
      }
    } catch (recoveryError) {
      Logger.log('Recovery day check error: ' + recoveryError.toString());
    }
    
    // กำหนดบทบาทคนขับ: ถ้าคิวระบุ assignment_type แล้วคนขับไม่อยู่กลุ่มนี้ → เตือน (Override ได้)
    if (queueData.assignment_type && typeof getQueueRules === 'function') {
      try {
        var rulesRes = getQueueRules();
        var rules = rulesRes.success && rulesRes.data.rules ? rulesRes.data.rules : [];
        var driverAssignment = 'out_of_school';
        for (var r = 0; r < rules.length; r++) {
          if (rules[r].driver_id === queueData.driver_id && (rules[r].active === true || rules[r].active === 'TRUE')) {
            driverAssignment = rules[r].assignment_type || 'out_of_school';
            break;
          }
        }
        if (driverAssignment !== queueData.assignment_type) {
          warnings.push({
            type: 'driver_assignment_mismatch',
            severity: 'info',
            message: 'คนขับนี้อยู่ในกลุ่มอื่น (ไม่ตรงกับประเภทงานที่เลือก)',
            recommendation: 'สามารถ Override ได้หากจำเป็น',
            allow_override: true
          });
        }
      } catch (e) {
        Logger.log('Driver assignment check error: ' + e.toString());
      }
    }
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.QUEUE, [
      'queue_id', 'date', 'time_start', 'time_end', 'car_id', 'driver_id',
      'mission', 'status', 'created_at', 'created_by', 'started_at',
      'ended_at', 'mileage_start', 'mileage_end', 'notes', 'qr_scan_id', 
      'allow_flexible', 'emergency_override', 'fatigue_override', 
      'override_reason', 'passenger_count', 'requested_by', 'destination',
      'frozen', 'freeze_at'
    ]);
    
    var queueId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'system';
    
    // Validate passenger count vs vehicle seat count
    if (queueData.passenger_count) {
      var vehicle = getVehicleById(queueData.car_id);
      if (vehicle.success && vehicle.data && vehicle.data.vehicle && vehicle.data.vehicle.seat_count) {
        var seatCount = parseInt(vehicle.data.vehicle.seat_count) || 0;
        var passengerCount = parseInt(queueData.passenger_count) || 0;
        if (passengerCount > seatCount && !queueData.emergency_override) {
          warnings.push({
            type: 'passenger_exceed',
            severity: 'warning',
            message: 'จำนวนผู้โดยสาร (' + passengerCount + ') เกินจำนวนที่นั่งรถ (' + seatCount + ')',
            allow_override: true,
            requires_confirmation: true
          });
        }
      }
    }
    
    sheet.appendRow([
      queueId,
      queueData.date,
      queueData.time_start,
      queueData.time_end || '',
      queueData.car_id,
      queueData.driver_id,
      queueData.mission,
      'pending',
      now,
      currentUser,
      '', // started_at
      '', // ended_at
      '', // mileage_start
      '', // mileage_end
      queueData.notes || '',
      '', // qr_scan_id
      queueData.allow_flexible ? 'TRUE' : 'FALSE', // allow_flexible
      queueData.emergency_override ? 'TRUE' : 'FALSE', // emergency_override
      queueData.allow_fatigue_override ? 'TRUE' : 'FALSE', // fatigue_override
      queueData.override_reason || '', // override_reason
      queueData.passenger_count || '', // passenger_count
      queueData.requested_by || '', // requested_by
      queueData.destination || '', // destination
      'FALSE', // frozen
      '' // freeze_at
    ]);
    
    // Log creation
    logAudit(currentUser, 'create', 'queue', queueId, {
      car_id: queueData.car_id,
      driver_id: queueData.driver_id,
      date: queueData.date,
      mission: queueData.mission,
      allow_flexible: queueData.allow_flexible || false,
      emergency_override: queueData.emergency_override || false,
      fatigue_warning: fatigueWarning.fatigued,
      fatigue_override: queueData.allow_fatigue_override || false,
      fatigue_distance: fatigueWarning.fatigued ? fatigueWarning.warning.distance : null,
      override_reason: queueData.override_reason || '',
      passenger_count: queueData.passenger_count || '',
      requested_by: queueData.requested_by || '',
      destination: queueData.destination || ''
    });
    
    // Send Telegram notification
    try {
      if (typeof sendQueueCreateTelegram === 'function') {
        var queueForTelegram = {
          queue_id: queueId,
          car_id: queueData.car_id,
          driver_id: queueData.driver_id,
          date: queueData.date,
          time_start: queueData.time_start,
          time_end: queueData.time_end,
          mission: queueData.mission,
          requested_by: queueData.requested_by,
          destination: queueData.destination,
          passenger_count: queueData.passenger_count
        };
        sendQueueCreateTelegram(queueForTelegram);
      }
    } catch (telegramError) {
      Logger.log('Send queue create telegram error: ' + telegramError.toString());
    }
    
    // Prepare response message
    var message = 'สร้างคิวรถสำเร็จ';
    var responseWarnings = [];
    
    if (conflicts.hasConflict) {
      responseWarnings.push(conflicts.message);
    }
    
    if (fatigueWarning.fatigued && fatigueWarning.warning) {
      responseWarnings.push('⚠️ ' + fatigueWarning.warning.message + ' - ' + fatigueWarning.warning.recommendation);
      if (queueData.allow_fatigue_override) {
        responseWarnings.push('(Override: อนุญาตให้ขับต่อ - บันทึกใน Audit Log)');
        
        // Log override
        logAudit(currentUser, 'create', 'queue', queueId, {}, {
          fatigue_override: true,
          fatigue_distance: fatigueWarning.warning.distance,
          reason: queueData.fatigue_override_reason || 'Override Fatigue Warning'
        }, {}, 'Override Fatigue Warning - ' + (queueData.fatigue_override_reason || ''));
      } else {
        responseWarnings.push('(คำเตือน: แนะนำให้พัก แต่ยังสามารถใช้งานได้)');
      }
    }
    
    // Add Smart Queue warnings to response
    if (warnings.length > 0) {
      for (var i = 0; i < warnings.length; i++) {
        if (warnings[i].type.startsWith('smart_queue_') || warnings[i].type === 'recovery_day' || warnings[i].type === 'rotation_policy') {
          responseWarnings.push('💡 ' + warnings[i].message);
        }
      }
    }
    
    if (responseWarnings.length > 0) {
      message += ' (มีคำเตือน: ' + responseWarnings.join('; ') + ')';
    }
    
    return successResponse({
      queue_id: queueId,
      warnings: warnings.length > 0 ? warnings : null,
      conflicts: conflicts.hasConflict ? conflicts.message : null,
      fatigue_warning: fatigueWarning.fatigued ? {
        message: fatigueWarning.warning.message,
        recommendation: fatigueWarning.warning.recommendation,
        distance: fatigueWarning.warning.distance,
        override_applied: queueData.allow_fatigue_override || false
      } : null,
      smart_recommendations: smartRecommendations && smartRecommendations.success ? smartRecommendations.data : null,
      recovery_status: recoveryStatus,
      rotation_check: rotationCheck
    }, message);
    
  } catch (error) {
    Logger.log('Create queue error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการสร้างคิว: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Check Queue Conflicts - ตรวจสอบความขัดแย้งของคิว
 */
function checkQueueConflicts(queueData, allowFlexible) {
  try {
    var queuesResult = getQueues({ date: queueData.date });
    var queues = queuesResult.success ? queuesResult.data.queues : [];
    
    var timeStart = parseTime(queueData.time_start);
    var timeEnd = queueData.time_end ? parseTime(queueData.time_end) : null;
    
    var conflicts = [];
    
    for (var i = 0; i < queues.length; i++) {
      var q = queues[i];
      if (q.status === 'cancel' || q.status === 'done') continue;
      
      // Check car conflict
      if (q.car_id === queueData.car_id) {
        var qTimeStart = parseTime(q.time_start);
        var qTimeEnd = q.time_end ? parseTime(q.time_end) : null;
        
        if (isTimeOverlap(timeStart, timeEnd, qTimeStart, qTimeEnd)) {
          if (!allowFlexible) {
            conflicts.push('รถนี้มีคิวในช่วงเวลา ' + q.time_start + (q.time_end ? '-' + q.time_end : ''));
          } else {
            conflicts.push('รถนี้มีคิวในช่วงเวลา ' + q.time_start + (q.time_end ? '-' + q.time_end : '') + ' (ยืดหยุ่นได้)');
          }
        }
      }
      
      // Check driver conflict
      if (q.driver_id === queueData.driver_id) {
        var qTimeStart = parseTime(q.time_start);
        var qTimeEnd = q.time_end ? parseTime(q.time_end) : null;
        
        if (isTimeOverlap(timeStart, timeEnd, qTimeStart, qTimeEnd)) {
          if (!allowFlexible) {
            conflicts.push('คนขับนี้มีคิวในช่วงเวลา ' + q.time_start + (q.time_end ? '-' + q.time_end : ''));
          } else {
            conflicts.push('คนขับนี้มีคิวในช่วงเวลา ' + q.time_start + (q.time_end ? '-' + q.time_end : '') + ' (ยืดหยุ่นได้ - ปลายทางใกล้สามารถวิ่งรอบได้)');
          }
        }
      }
    }
    
    return {
      hasConflict: conflicts.length > 0 && !allowFlexible,
      message: conflicts.join('; '),
      conflicts: conflicts
    };
    
  } catch (error) {
    Logger.log('Check queue conflicts error: ' + error.toString());
    return { hasConflict: false, message: '', conflicts: [] };
  }
}

/**
 * Check if two time ranges overlap
 */
function isTimeOverlap(start1, end1, start2, end2) {
  if (!start1 || !start2) return false;
  
  var s1 = start1.getTime();
  var e1 = end1 ? end1.getTime() : start1.getTime() + (8 * 60 * 60 * 1000); // Default 8 hours
  var s2 = start2.getTime();
  var e2 = end2 ? end2.getTime() : start2.getTime() + (8 * 60 * 60 * 1000);
  
  return (s1 < e2 && s2 < e1);
}

/**
 * Get Queues - ดึงรายการคิว
 * พนักงานขับรถดูได้แค่ของตนเอง (ชื่อที่ลงทะเบียนต้องตรงกับชื่อพนักงานขับรถ)
 * Admin หรือคนที่ Admin อนุญาตดูได้หมด
 * เพิ่ม fatigue warnings สำหรับแต่ละคิว
 */
function getQueues(filters) {
  try {
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.QUEUE);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ queues: [] });
    }
    
    // Get current user info
    var currentUserId = getCurrentUser();
    var currentUserInfo = null;
    var isAdmin = false;
    
    if (currentUserId) {
      try {
        var userResult = getCurrentUserInfo(currentUserId);
        if (userResult.success) {
          currentUserInfo = userResult.data.user;
          isAdmin = currentUserInfo.role === 'admin';
        }
      } catch (e) {
        Logger.log('Error getting user info: ' + e.toString());
      }
    }
    
    // Check if user is driver (by matching name with driver name)
    var driverId = null;
    if (!isAdmin && currentUserInfo) {
      var driversResult = getDrivers({});
      if (driversResult.success) {
        var drivers = driversResult.data.drivers;
        for (var d = 0; d < drivers.length; d++) {
          // Match user full_name with driver full_name
          if (drivers[d].full_name === currentUserInfo.full_name) {
            driverId = drivers[d].driver_id;
            break;
          }
        }
      }
    }
    
    var queues = [];
    var headers = data[0];
    var today = formatDate(new Date());
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var queue = rowToObject(row, headers);
      
      // Apply permission filter: if user is driver, only show their queues
      if (!isAdmin && driverId) {
        if (queue.driver_id !== driverId) {
          continue; // Skip queues that don't belong to this driver
        }
      }
      
      // Apply filters
      if (filters.date && queue.date !== filters.date) {
        continue;
      }
      if (filters.status && queue.status !== filters.status) {
        continue;
      }
      if (filters.car_id && queue.car_id !== filters.car_id) {
        continue;
      }
      if (filters.driver_id && queue.driver_id !== filters.driver_id) {
        continue;
      }
      if (filters.today_only && queue.date !== today) {
        continue;
      }
      if (filters.date_from && queue.date < filters.date_from) {
        continue;
      }
      if (filters.date_to && queue.date > filters.date_to) {
        continue;
      }
      
      // Add fatigue warning if applicable
      if (queue.driver_id && queue.date) {
        var fatigueCheck = checkDriverFatigueStatus(queue.driver_id, queue.date);
        if (fatigueCheck.fatigued && fatigueCheck.warning) {
          queue.fatigue_warning = fatigueCheck.warning;
        }
      }
      
      queues.push(queue);
    }
    
    // Sort by date and time_start descending
    queues.sort(function(a, b) {
      var dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.time_start || '').localeCompare(a.time_start || '');
    });
    
    return successResponse({ queues: queues });
    
  } catch (error) {
    Logger.log('Get queues error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Queue By ID
 */
function getQueueById(queueId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.QUEUE);
    var rowIndex = findRowIndexById(sheet, 0, queueId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบคิว', 'QUEUE_NOT_FOUND');
    }
    
    var numCols = Math.max(sheet.getLastColumn(), 25);
    var row = sheet.getRange(rowIndex, 1, rowIndex, numCols).getValues()[0];
    var headers = [
      'queue_id', 'date', 'time_start', 'time_end', 'car_id', 'driver_id',
      'mission', 'status', 'created_at', 'created_by', 'started_at',
      'ended_at', 'mileage_start', 'mileage_end', 'notes', 'qr_scan_id',
      'allow_flexible', 'emergency_override', 'fatigue_override',
      'override_reason', 'passenger_count', 'requested_by', 'destination',
      'frozen', 'freeze_at'
    ];
    
    var queue = rowToObject(row, headers);
    
    // Add fatigue warning if applicable
    if (queue.driver_id && queue.date) {
      var fatigueCheck = checkDriverFatigueStatus(queue.driver_id, queue.date);
      if (fatigueCheck.fatigued && fatigueCheck.warning) {
        queue.fatigue_warning = fatigueCheck.warning;
      }
    }
    
    return successResponse({ queue: queue });
    
  } catch (error) {
    Logger.log('Get queue by ID error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Queue - แก้ไขคิว (ก่อนเริ่มงาน)
 */
function updateQueue(queueId, queueData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.QUEUE);
    var rowIndex = findRowIndexById(sheet, 0, queueId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบคิว', 'QUEUE_NOT_FOUND');
    }
    
    var numCols = Math.max(sheet.getLastColumn(), 25);
    var row = sheet.getRange(rowIndex, 1, rowIndex, numCols).getValues()[0];
    var status = row[7];
    var frozen = (numCols >= 24) && (row[23] === true || row[23] === 'TRUE');
    
    // Check if frozen (unless admin or high role)
    if (frozen) {
      var currentUser = getCurrentUser() || 'system';
      var userResult = getCurrentUserInfo(currentUser);
      var isAdmin = userResult.success && userResult.data.user && userResult.data.user.role === 'admin';
      if (!isAdmin) {
        return errorResponse('คิวนี้ถูก Freeze แล้ว ไม่สามารถแก้ไขได้ (กรุณาติดต่อผู้ดูแลระบบ)', 'QUEUE_FROZEN');
      }
    }
    
    // Can only update if status is pending (unless admin override)
    if (status !== 'pending') {
      var currentUser = getCurrentUser() || 'system';
      var userResult = getCurrentUserInfo(currentUser);
      var isAdmin = userResult.success && userResult.data.user && userResult.data.user.role === 'admin';
      if (!isAdmin) {
        return errorResponse('ไม่สามารถแก้ไขคิวที่เริ่มงานแล้ว', 'CANNOT_UPDATE');
      }
    }
    
    var currentUser = getCurrentUser() || 'system';
    
    // Update fields
    if (queueData.date !== undefined) sheet.getRange(rowIndex, 2).setValue(queueData.date);
    if (queueData.time_start !== undefined) sheet.getRange(rowIndex, 3).setValue(queueData.time_start);
    if (queueData.time_end !== undefined) sheet.getRange(rowIndex, 4).setValue(queueData.time_end);
    if (queueData.car_id !== undefined) sheet.getRange(rowIndex, 5).setValue(queueData.car_id);
    if (queueData.driver_id !== undefined) sheet.getRange(rowIndex, 6).setValue(queueData.driver_id);
    if (queueData.mission !== undefined) sheet.getRange(rowIndex, 7).setValue(queueData.mission);
    if (queueData.notes !== undefined) sheet.getRange(rowIndex, 15).setValue(queueData.notes);
    if (queueData.override_reason !== undefined) {
      ensureQueueSheetHasOverrideReasonColumn(sheet);
      sheet.getRange(rowIndex, 20).setValue(queueData.override_reason);
    }
    if (queueData.passenger_count !== undefined) {
      ensureQueueSheetHasPassengerCountColumn(sheet);
      sheet.getRange(rowIndex, 21).setValue(queueData.passenger_count);
    }
    if (queueData.requested_by !== undefined) {
      ensureQueueSheetHasRequestedByColumn(sheet);
      sheet.getRange(rowIndex, 22).setValue(queueData.requested_by);
    }
    if (queueData.destination !== undefined) {
      ensureQueueSheetHasDestinationColumn(sheet);
      sheet.getRange(rowIndex, 23).setValue(queueData.destination);
    }
    
    // Log update
    logAudit(currentUser, 'update', 'queue', queueId, queueData);
    
    // Send Telegram notification
    try {
      if (typeof sendQueueUpdateTelegram === 'function') {
        var updatedQueue = getQueueById(queueId);
        if (updatedQueue.success) {
          sendQueueUpdateTelegram(updatedQueue.data.queue);
        }
      }
    } catch (telegramError) {
      Logger.log('Send queue update telegram error: ' + telegramError.toString());
    }
    
    return successResponse({}, 'อัปเดตคิวสำเร็จ');
    
  } catch (error) {
    Logger.log('Update queue error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Cancel Queue - ยกเลิกคิว
 */
function cancelQueue(queueId, reason) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.QUEUE);
    var rowIndex = findRowIndexById(sheet, 0, queueId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบคิว', 'QUEUE_NOT_FOUND');
    }
    
    var numCols = Math.max(sheet.getLastColumn(), 25);
    var row = sheet.getRange(rowIndex, 1, rowIndex, numCols).getValues()[0];
    var status = row[7];
    var carId = row[4];
    var frozen = (numCols >= 24) && (row[23] === true || row[23] === 'TRUE');
    
    // Check if frozen (unless admin)
    if (frozen) {
      var currentUser = getCurrentUser() || 'system';
      var userResult = getCurrentUserInfo(currentUser);
      var isAdmin = userResult.success && userResult.data.user && userResult.data.user.role === 'admin';
      if (!isAdmin) {
        return errorResponse('คิวนี้ถูก Freeze แล้ว ไม่สามารถยกเลิกได้ (กรุณาติดต่อผู้ดูแลระบบ)', 'QUEUE_FROZEN');
      }
    }
    
    // Can cancel if pending or running
    if (status === 'done' || status === 'cancel') {
      return errorResponse('ไม่สามารถยกเลิกคิวที่เสร็จสิ้นหรือยกเลิกแล้ว', 'CANNOT_CANCEL');
    }
    
    var currentUser = getCurrentUser() || 'system';
    
    // Get queue data for Telegram before cancel
    var queueForTelegram = null;
    try {
      var queueResult = getQueueById(queueId);
      if (queueResult.success) {
        queueForTelegram = queueResult.data.queue;
      }
    } catch (e) {}
    
    // Update status
    sheet.getRange(rowIndex, 8).setValue('cancel');
    if (reason) {
      var currentNotes = sheet.getRange(rowIndex, 15).getValue();
      sheet.getRange(rowIndex, 15).setValue(currentNotes + '\n[ยกเลิก: ' + formatDate(new Date()) + '] ' + reason);
    }
    
    // If running, update car status back to available
    if (status === 'running' && carId) {
      updateVehicle(carId, { status: 'available' });
    }
    
    // Log cancellation
    logAudit(currentUser, 'update', 'queue', queueId, {
      action: 'cancel',
      reason: reason
    });
    
    // Send Telegram notification
    try {
      if (typeof sendQueueCancelTelegram === 'function' && queueForTelegram) {
        sendQueueCancelTelegram(queueForTelegram);
      }
    } catch (telegramError) {
      Logger.log('Send queue cancel telegram error: ' + telegramError.toString());
    }
    
    return successResponse({}, 'ยกเลิกคิวสำเร็จ');
    
  } catch (error) {
    Logger.log('Cancel queue error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการยกเลิก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Ensure Queue Sheet has override_reason column
 */
function ensureQueueSheetHasOverrideReasonColumn(sheet) {
  if (!sheet) sheet = getSheet(CONFIG.SHEETS.QUEUE);
  if (sheet.getLastColumn() < 20) {
    sheet.getRange(1, 20).setValue('override_reason');
  }
}

/**
 * Ensure Queue Sheet has passenger_count column
 */
function ensureQueueSheetHasPassengerCountColumn(sheet) {
  if (!sheet) sheet = getSheet(CONFIG.SHEETS.QUEUE);
  if (sheet.getLastColumn() < 21) {
    sheet.getRange(1, 21).setValue('passenger_count');
  }
}

/**
 * Ensure Queue Sheet has requested_by column
 */
function ensureQueueSheetHasRequestedByColumn(sheet) {
  if (!sheet) sheet = getSheet(CONFIG.SHEETS.QUEUE);
  if (sheet.getLastColumn() < 22) {
    sheet.getRange(1, 22).setValue('requested_by');
  }
}

/**
 * Ensure Queue Sheet has destination column
 */
function ensureQueueSheetHasDestinationColumn(sheet) {
  if (!sheet) sheet = getSheet(CONFIG.SHEETS.QUEUE);
  if (sheet.getLastColumn() < 23) {
    sheet.getRange(1, 23).setValue('destination');
  }
}

/**
 * Ensure Queue Sheet has frozen and freeze_at columns
 */
function ensureQueueSheetHasFreezeColumns(sheet) {
  if (!sheet) sheet = getSheet(CONFIG.SHEETS.QUEUE);
  if (sheet.getLastColumn() < 24) {
    sheet.getRange(1, 24).setValue('frozen');
  }
  if (sheet.getLastColumn() < 25) {
    sheet.getRange(1, 25).setValue('freeze_at');
  }
}

/**
 * Freeze Queue - ล็อกคิวเมื่อใกล้เวลาออก (ลดแก้มั่ว)
 */
function freezeQueue(queueId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.QUEUE);
    var rowIndex = findRowIndexById(sheet, 0, queueId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบคิว', 'QUEUE_NOT_FOUND');
    }
    
    ensureQueueSheetHasFreezeColumns(sheet);
    var currentUser = getCurrentUser() || 'system';
    
    sheet.getRange(rowIndex, 24).setValue('TRUE'); // frozen
    sheet.getRange(rowIndex, 25).setValue(new Date()); // freeze_at
    
    logAudit(currentUser, 'freeze', 'queue', queueId, {});
    
    return successResponse({}, 'Freeze คิวสำเร็จ');
    
  } catch (error) {
    Logger.log('Freeze queue error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Unfreeze Queue - ปลดล็อกคิว
 */
function unfreezeQueue(queueId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.QUEUE);
    var rowIndex = findRowIndexById(sheet, 0, queueId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบคิว', 'QUEUE_NOT_FOUND');
    }
    
    ensureQueueSheetHasFreezeColumns(sheet);
    var currentUser = getCurrentUser() || 'system';
    
    sheet.getRange(rowIndex, 24).setValue('FALSE'); // frozen
    sheet.getRange(rowIndex, 25).setValue(''); // freeze_at
    
    logAudit(currentUser, 'unfreeze', 'queue', queueId, {});
    
    return successResponse({}, 'Unfreeze คิวสำเร็จ');
    
  } catch (error) {
    Logger.log('Unfreeze queue error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Queue Timeline - มุมมอง Timeline สำหรับคิวรถ-คิวคน
 */
function getQueueTimeline(filters) {
  try {
    // Require authentication
    requireAuth();
    
    filters = filters || {};
    
    // If user is driver (not admin), filter by their driver_id
    var currentUserId = getCurrentUser();
    if (currentUserId) {
      try {
        var userResult = getCurrentUserInfo(currentUserId);
        if (userResult.success && userResult.data.user) {
          var user = userResult.data.user;
          // If not admin, filter by driver_id
          if (user.role !== 'admin' && user.driver_id) {
            filters.driver_id = user.driver_id;
          } else if (user.role !== 'admin') {
            // Try to find driver_id by matching name
            var driversResult = getDrivers({});
            if (driversResult.success) {
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
      } catch (e) {
        Logger.log('Error checking user permissions in getQueueTimeline: ' + e.toString());
      }
    }
    
    var queuesResult = getQueues(filters);
    if (!queuesResult.success) {
      return successResponse({ timeline: [] });
    }
    
    var queues = queuesResult.data.queues || [];
    var timeline = [];
    
    for (var i = 0; i < queues.length; i++) {
      var q = queues[i];
      var car = getVehicleById(q.car_id);
      var driver = getDriverById(q.driver_id);
      
      timeline.push({
        id: q.queue_id,
        type: 'queue',
        date: q.date,
        time_start: q.time_start,
        time_end: q.time_end,
        car: (car.success && car.data && car.data.vehicle) ? { id: q.car_id, name: car.data.vehicle.license_plate + ' ' + car.data.vehicle.brand + ' ' + car.data.vehicle.model } : { id: q.car_id },
        driver: (driver.success && driver.data && driver.data.driver) ? { id: q.driver_id, name: driver.data.driver.full_name } : { id: q.driver_id },
        mission: q.mission,
        status: q.status,
        frozen: q.frozen === true || q.frozen === 'TRUE',
        requested_by: q.requested_by,
        destination: q.destination,
        passenger_count: q.passenger_count
      });
    }
    
    // Sort by date and time_start
    timeline.sort(function(a, b) {
      var dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.time_start || '').localeCompare(b.time_start || '');
    });
    
    return successResponse({ timeline: timeline });
    
  } catch (error) {
    Logger.log('Get queue timeline error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Create Manual Queue - สร้างคิวย้อนหลัง (Admin only)
 */
function createManualQueue(queueData) {
  try {
    validateRequired(queueData, ['date', 'car_id', 'driver_id', 'mission']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.QUEUE, [
      'queue_id', 'date', 'time_start', 'time_end', 'car_id', 'driver_id',
      'mission', 'status', 'created_at', 'created_by', 'started_at',
      'ended_at', 'mileage_start', 'mileage_end', 'notes', 'qr_scan_id'
    ]);
    
    var queueId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'admin';
    
    sheet.appendRow([
      queueId,
      queueData.date,
      queueData.time_start || '',
      queueData.time_end || '',
      queueData.car_id,
      queueData.driver_id,
      queueData.mission,
      queueData.status || 'done', // Usually done for manual entries
      queueData.created_at || now,
      currentUser,
      queueData.started_at || '',
      queueData.ended_at || '',
      queueData.mileage_start || '',
      queueData.mileage_end || '',
      queueData.notes || '',
      '' // qr_scan_id
    ]);
    
    // Log creation
    logAudit(currentUser, 'create', 'queue', queueId, {
      ...queueData,
      manual: true
    });
    
    return successResponse({
      queue_id: queueId
    }, 'สร้างคิวย้อนหลังสำเร็จ');
    
  } catch (error) {
    Logger.log('Create manual queue error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการสร้างคิวย้อนหลัง: ' + error.toString(), 'SERVER_ERROR');
  }
}
