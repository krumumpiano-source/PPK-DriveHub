/**
 * PPK DriveHub Check Service
 * จัดการบันทึกตรวจเช็ครถ
 */

/**
 * Create Daily Check - บันทึกการตรวจเช็คสภาพรถประจำวัน (Public API)
 * สำหรับ QR Code scanning
 * 
 * Logic:
 * - ถ้าพบ abnormal → สร้าง draft repair request
 * - ถ้าพบ warning ซ้ำ 3 วัน → แนะนำตรวจเชิงลึก
 * - อัปเดต Health Score
 * - เชื่อมกับระบบ PM
 */
function createDailyCheck(checkData) {
  try {
    validateRequired(checkData, ['car_id', 'inspector_name', 'date', 'time', 'overall_status']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.CHECK_LOG, [
      'check_id', 'car_id', 'inspector_name', 'date', 'time', 'check_type',
      'overall_status', 'checks_data', 'notes', 'created_at', 'created_by'
    ]);
    
    var checkId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'public_qr_user';
    
    // Validate car exists
    var vehicleResult = getVehicleById(checkData.car_id);
    if (!vehicleResult.success || !vehicleResult.data || !vehicleResult.data.vehicle) {
      return errorResponse('ไม่พบข้อมูลรถ', 'VEHICLE_NOT_FOUND');
    }
    
    var vehicle = vehicleResult.data.vehicle;
    var checks = checkData.checks || {};
    
    // Analyze checks for abnormal items
    var abnormalItems = [];
    var warningItems = [];
    
    for (var key in checks) {
      if (key.endsWith('_note')) continue; // Skip note fields
      var value = checks[key];
      if (value === 'abnormal') {
        abnormalItems.push(key);
      } else if (value === 'warning') {
        warningItems.push(key);
      }
    }
    
    // Store checks as JSON
    var checksDataJson = JSON.stringify(checks);
    
    sheet.appendRow([
      checkId,
      checkData.car_id,
      checkData.inspector_name,
      checkData.date,
      checkData.time,
      'daily', // check_type
      checkData.overall_status,
      checksDataJson,
      checkData.notes || '',
      now,
      currentUser
    ]);
    
    // Check for consecutive warnings (3 days)
    var consecutiveWarnings = checkConsecutiveWarnings(checkData.car_id, warningItems);
    
    // Create repair request if abnormal or overall_status = not_ready
    var repairRequestId = null;
    if (abnormalItems.length > 0 || checkData.overall_status === 'not_ready') {
      try {
        var repairData = {
          car_id: checkData.car_id,
          request_type: abnormalItems.length > 0 ? 'urgent' : 'planned',
          issue_description: 'พบความผิดปกติจากการตรวจเช็คประจำวัน:\n' + 
            abnormalItems.join(', ') + 
            (checkData.notes ? '\nหมายเหตุ: ' + checkData.notes : ''),
          status: 'pending',
          created_by: currentUser
        };
        
        // Try to create scheduled repair (if RepairService exists)
        if (typeof createScheduledRepair === 'function') {
          var repairResult = createScheduledRepair(repairData);
          if (repairResult && repairResult.success) {
            repairRequestId = repairResult.data.scheduled_repair_id;
          }
        }
      } catch (repairError) {
        Logger.log('Auto-create repair request error: ' + repairError.toString());
      }
    }
    
    // Update Health Score (if function exists)
    try {
      if (typeof updateVehicleHealthScore === 'function') {
        updateVehicleHealthScore(checkData.car_id, {
          check_status: checkData.overall_status,
          abnormal_count: abnormalItems.length,
          warning_count: warningItems.length
        });
      }
    } catch (healthError) {
      Logger.log('Update health score error: ' + healthError.toString());
    }
    
    // Process Inspection Alerts (NEW - Inspection Alert Engine)
    var alertResult = null;
    try {
      if (typeof processInspectionAlerts === 'function') {
        alertResult = processInspectionAlerts(
          checkId,
          checkData.car_id,
          checks,
          checkData.overall_status,
          checkData.inspector_name,
          vehicle
        );
      }
    } catch (alertError) {
      Logger.log('Process inspection alerts error: ' + alertError.toString());
    }
    
    // Log creation
    logAudit(currentUser, 'create', 'daily_check', checkId, {
      car_id: checkData.car_id,
      overall_status: checkData.overall_status,
      abnormal_items: abnormalItems.length,
      warning_items: warningItems.length,
      repair_request_id: repairRequestId,
      alert_level: alertResult ? alertResult.risk_level : null
    });
    
    var message = 'บันทึกผลการตรวจเช็คสำเร็จ';
    if (alertResult && alertResult.risk_level === 'critical') {
      message += ' (🔴 ระดับอันตราย - รถถูกตั้งสถานะงดใช้งาน)';
    } else if (alertResult && alertResult.risk_level === 'risk') {
      message += ' (🟠 ระดับเสี่ยง - แจ้งเตือนแอดมิน)';
    } else if (alertResult && alertResult.risk_level === 'warning') {
      message += ' (🟡 ระดับเฝ้าระวัง - บันทึกประวัติ)';
    } else if (abnormalItems.length > 0) {
      message += ' (พบความผิดปกติ ' + abnormalItems.length + ' รายการ - สร้างคำขอซ่อมอัตโนมัติ)';
    } else if (consecutiveWarnings.length > 0) {
      message += ' (พบอาการเตือนซ้ำ 3 วัน: ' + consecutiveWarnings.join(', ') + ' - แนะนำตรวจเชิงลึก)';
    }
    
    return successResponse({
      check_id: checkId,
      repair_request_id: repairRequestId,
      abnormal_items: abnormalItems,
      warning_items: warningItems,
      consecutive_warnings: consecutiveWarnings,
      alert: alertResult ? {
        risk_level: alertResult.risk_level,
        recommendations: alertResult.alerts && alertResult.alerts.length > 0 ? 
                         alertResult.alerts[0].recommendations : []
      } : null
    }, message);
    
  } catch (error) {
    Logger.log('Create daily check error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการบันทึก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Check for consecutive warnings (3 days)
 */
function checkConsecutiveWarnings(carId, currentWarnings) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.CHECK_LOG);
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    var headers = data[0];
    var carIdIndex = headers.indexOf('car_id');
    var dateIndex = headers.indexOf('date');
    var checksDataIndex = headers.indexOf('checks_data');
    
    if (carIdIndex === -1 || dateIndex === -1 || checksDataIndex === -1) return [];
    
    // Get last 3 days of checks for this car
    var today = new Date();
    var threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    
    var recentChecks = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[carIdIndex] !== carId) continue;
      if (row[dateIndex] < Utilities.formatDate(threeDaysAgo, Session.getScriptTimeZone(), 'yyyy-MM-dd')) continue;
      
      try {
        var checksData = JSON.parse(row[checksDataIndex] || '{}');
        recentChecks.push({
          date: row[dateIndex],
          checks: checksData
        });
      } catch (e) {
        // Skip invalid JSON
      }
    }
    
    // Check if same warning items appear in last 3 days
    var warningCounts = {};
    for (var i = 0; i < currentWarnings.length; i++) {
      var warning = currentWarnings[i];
      warningCounts[warning] = 1; // Count current day
      
      for (var j = 0; j < recentChecks.length; j++) {
        if (recentChecks[j].checks[warning] === 'warning') {
          warningCounts[warning] = (warningCounts[warning] || 0) + 1;
        }
      }
    }
    
    var consecutiveWarnings = [];
    for (var warning in warningCounts) {
      if (warningCounts[warning] >= 3) {
        consecutiveWarnings.push(warning);
      }
    }
    
    return consecutiveWarnings;
    
  } catch (error) {
    Logger.log('Check consecutive warnings error: ' + error.toString());
    return [];
  }
}

/**
 * Create Check Log - บันทึกการตรวจเช็ค
 */
function createCheckLog(checkData) {
  try {
    validateRequired(checkData, ['car_id', 'date', 'time', 'check_type']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.CHECK_LOG, [
      'check_id', 'car_id', 'date', 'time', 'check_type', 'engine', 'tires',
      'lights', 'brakes', 'cleanliness', 'mileage', 'photos', 'notes',
      'has_issue', 'repair_request_id', 'checked_by', 'created_at'
    ]);
    
    var checkId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'system';
    
    // Upload photos if provided
    var photos = [];
    if (checkData.photos_base64 && Array.isArray(checkData.photos_base64)) {
      for (var i = 0; i < checkData.photos_base64.length; i++) {
        var photo = checkData.photos_base64[i];
        try {
          var uploadResult = uploadBase64FileToDrive(
            photo.data,
            photo.name,
            'CHECK',
            photo.mime || 'image/jpeg'
          );
          photos.push(uploadResult.fileUrl);
        } catch (uploadError) {
          Logger.log('Photo upload error: ' + uploadError.toString());
        }
      }
    }
    
    // Determine if there's an issue
    var hasIssue = false;
    var checkFields = ['engine', 'tires', 'lights', 'brakes', 'cleanliness'];
    for (var i = 0; i < checkFields.length; i++) {
      if (checkData[checkFields[i]] === 'issue') {
        hasIssue = true;
        break;
      }
    }
    
    // Create repair request if has issue and requested
    var repairRequestId = '';
    if (hasIssue && checkData.create_repair_request) {
      try {
        var repairData = {
          car_id: checkData.car_id,
          date_reported: checkData.date,
          issue_description: 'พบปัญหาจากการตรวจเช็ค: ' + (checkData.notes || ''),
          notes: 'สร้างจาก Check Log: ' + checkId
        };
        var repairResult = createRepairLog(repairData);
        if (repairResult.success) {
          repairRequestId = repairResult.data.repair_id;
        }
      } catch (repairError) {
        Logger.log('Auto-create repair request error: ' + repairError.toString());
      }
    }
    
    sheet.appendRow([
      checkId,
      checkData.car_id,
      checkData.date,
      checkData.time,
      checkData.check_type,
      checkData.engine || 'n/a',
      checkData.tires || 'n/a',
      checkData.lights || 'n/a',
      checkData.brakes || 'n/a',
      checkData.cleanliness || 'n/a',
      checkData.mileage || '',
      JSON.stringify(photos),
      checkData.notes || '',
      hasIssue ? 'TRUE' : 'FALSE',
      repairRequestId,
      checkData.checked_by || currentUser,
      now
    ]);
    
    // Log creation
    logAudit(currentUser, 'create', 'check', checkId, {
      car_id: checkData.car_id,
      check_type: checkData.check_type,
      has_issue: hasIssue
    });
    
    return successResponse({
      check_id: checkId,
      repair_request_id: repairRequestId || null
    }, 'บันทึกการตรวจเช็คสำเร็จ' + (repairRequestId ? ' และสร้างคำขอซ่อมอัตโนมัติ' : ''));
    
  } catch (error) {
    Logger.log('Create check log error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการบันทึก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Check Logs - ดึงรายการตรวจเช็ค
 */
function getCheckLogs(filters) {
  try {
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.CHECK_LOG);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ check_logs: [] });
    }
    
    var checkLogs = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var checkLog = rowToObject(row, headers);
      
      // Parse checks_data JSON (for daily checks)
      if (checkLog.checks_data) {
        try {
          checkLog.checks_data = JSON.parse(checkLog.checks_data);
        } catch (e) {
          checkLog.checks_data = {};
        }
      } else {
        checkLog.checks_data = {};
      }
      
      // Parse photos JSON (for old format)
      if (checkLog.photos) {
        try {
          checkLog.photos = JSON.parse(checkLog.photos);
        } catch (e) {
          checkLog.photos = [];
        }
      } else {
        checkLog.photos = [];
      }
      
      // Apply filters
      if (filters.car_id && checkLog.car_id !== filters.car_id) {
        continue;
      }
      if (filters.check_type && checkLog.check_type !== filters.check_type) {
        continue;
      }
      if (filters.has_issue !== undefined) {
        var hasIssue = checkLog.has_issue === true || checkLog.has_issue === 'TRUE';
        if (filters.has_issue !== hasIssue) {
          continue;
        }
      }
      if (filters.date_from && checkLog.date < filters.date_from) {
        continue;
      }
      if (filters.date_to && checkLog.date > filters.date_to) {
        continue;
      }
      
      checkLogs.push(checkLog);
    }
    
    // Sort by date and time descending
    checkLogs.sort(function(a, b) {
      var dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.time || '').localeCompare(a.time || '');
    });
    
    return successResponse({ check_logs: checkLogs });
    
  } catch (error) {
    Logger.log('Get check logs error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Check Log By ID
 */
function getCheckLogById(checkId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.CHECK_LOG);
    var rowIndex = findRowIndexById(sheet, 0, checkId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบบันทึกตรวจเช็ค', 'CHECK_LOG_NOT_FOUND');
    }
    
    // Get headers from sheet
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    var checkLog = rowToObject(row, headers);
    
    // Parse checks_data JSON (for daily checks)
    if (checkLog.checks_data) {
      try {
        checkLog.checks_data = JSON.parse(checkLog.checks_data);
      } catch (e) {
        checkLog.checks_data = {};
      }
    } else {
      checkLog.checks_data = {};
    }
    
    // Parse photos JSON (for old format)
    if (checkLog.photos) {
      try {
        checkLog.photos = JSON.parse(checkLog.photos);
      } catch (e) {
        checkLog.photos = [];
      }
    } else {
      checkLog.photos = [];
    }
    
    return successResponse({ check_log: checkLog });
    
  } catch (error) {
    Logger.log('Get check log by ID error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Scan QR for Usage - สแกน QR บันทึกใช้รถ
 */
function scanQRUsage(qrData, usageData) {
  try {
    // qrData should contain car_id
    var carId = qrData.car_id || qrData;
    
    // Validate car exists
    var car = getVehicleById(carId);
    if (!car.success) {
      return errorResponse('ไม่พบรถ', 'CAR_NOT_FOUND');
    }
    
    // Find pending queue for this car (if any)
    var queues = getQueues({ car_id: carId, status: 'pending', today_only: true });
    var queueId = null;
    if (queues.success && queues.data.queues.length > 0) {
      queueId = queues.data.queues[0].queue_id;
    }
    
    var now = new Date();
    var currentUser = getCurrentUser() || 'driver';
    
    // Create audit log for QR scan
    var scanLogId = logAudit(currentUser, 'scan_qr', 'car', carId, {
      type: 'usage',
      queue_id: queueId,
      mileage: usageData.mileage,
      time: formatTime(now)
    });
    
    // Update queue if exists
    if (queueId) {
      var queueSheet = getSheet(CONFIG.SHEETS.QUEUE);
      var queueRowIndex = findRowIndexById(queueSheet, 0, queueId);
      if (queueRowIndex !== -1) {
        queueSheet.getRange(queueRowIndex, 8).setValue('running'); // status
        queueSheet.getRange(queueRowIndex, 11).setValue(formatTime(now)); // started_at
        queueSheet.getRange(queueRowIndex, 13).setValue(usageData.mileage || ''); // mileage_start
        queueSheet.getRange(queueRowIndex, 16).setValue(scanLogId); // qr_scan_id
      }
    }
    
    // Update car status
    updateVehicle(carId, { status: 'in_use' });
    
    return successResponse({
      queue_id: queueId,
      scan_log_id: scanLogId,
      car_id: carId
    }, 'บันทึกการใช้งานรถสำเร็จ');
    
  } catch (error) {
    Logger.log('Scan QR usage error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการบันทึก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Scan QR for Check - สแกน QR ตรวจเช็ครถ
 */
function scanQRCheck(qrData, checkData) {
  try {
    // qrData should contain car_id
    var carId = qrData.car_id || qrData;
    
    // Validate car exists
    var car = getVehicleById(carId);
    if (!car.success) {
      return errorResponse('ไม่พบรถ', 'CAR_NOT_FOUND');
    }
    
    // Use current date/time if not provided
    var now = new Date();
    checkData.date = checkData.date || formatDate(now);
    checkData.time = checkData.time || formatTime(now);
    checkData.car_id = carId;
    
    // Create check log
    var result = createCheckLog(checkData);
    
    return result;
    
  } catch (error) {
    Logger.log('Scan QR check error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการบันทึก: ' + error.toString(), 'SERVER_ERROR');
  }
}
