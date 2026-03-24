/**
 * PPK DriveHub Scheduled Jobs
 * งานที่ต้องรันอัตโนมัติตามเวลา
 */

/**
 * Setup Daily Trigger - ตั้งค่า Trigger สำหรับ Daily Jobs
 * เรียกใช้ครั้งเดียวเพื่อตั้งค่า
 */
function setupDailyTrigger() {
  try {
    // Delete existing triggers
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      var handler = trigger.getHandlerFunction();
      if (handler === 'dailyDriverFatigueCheck' || 
          handler === 'checkAndFreezeQueues' || 
          handler === 'runAutoRecoveryPendingReturns' ||
          handler === 'dailyBackup' ||
          handler === 'createFiscalYearSheets') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create trigger for daily driver fatigue check (23:59)
    ScriptApp.newTrigger('dailyDriverFatigueCheck')
      .timeBased()
      .everyDays(1)
      .atHour(23)
      .nearMinute(59)
      .create();
    
    // Create trigger for auto-recovery pending returns (18:00)
    ScriptApp.newTrigger('runAutoRecoveryPendingReturns')
      .timeBased()
      .everyDays(1)
      .atHour(18)
      .nearMinute(0)
      .create();
    
    // Create trigger for check and freeze queues (ทุก 15 นาที)
    ScriptApp.newTrigger('checkAndFreezeQueues')
      .timeBased()
      .everyMinutes(15)
      .create();
    
    // Create trigger for daily backup (02:00)
    ScriptApp.newTrigger('dailyBackup')
      .timeBased()
      .everyDays(1)
      .atHour(2)
      .nearMinute(0)
      .create();
    
    // Create trigger for fiscal year sheets (00:00, checks if April 1st)
    ScriptApp.newTrigger('createFiscalYearSheets')
      .timeBased()
      .everyDays(1)
      .atHour(0)
      .nearMinute(0)
      .create();
    
    Logger.log('All daily triggers setup completed');
    return { success: true, message: 'ตั้งค่า Daily Triggers สำเร็จ' };
    
  } catch (error) {
    Logger.log('Setup daily trigger error: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Check and Freeze Queues - ตรวจสอบคิวที่ใกล้เวลาออกและ freeze อัตโนมัติ
 * เรียกทุก 15 นาที
 */
function checkAndFreezeQueues() {
  try {
    var today = formatDate(new Date());
    var now = new Date();
    var currentMinutes = now.getHours() * 60 + now.getMinutes();
    var freezeBeforeMinutes = 30; // Freeze 30 นาทีก่อนเวลาออก
    
    var queuesResult = getQueues({ date: today, status: 'pending' });
    if (!queuesResult.success) return;
    
    var queues = queuesResult.data.queues || [];
    var frozen = 0;
    
    for (var i = 0; i < queues.length; i++) {
      var q = queues[i];
      if (q.frozen === true || q.frozen === 'TRUE') continue; // Already frozen
      if (!q.time_start) continue;
      
      var timeParts = q.time_start.split(':');
      if (timeParts.length !== 2) continue;
      
      var queueMinutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
      var minutesUntilStart = queueMinutes - currentMinutes;
      
      if (minutesUntilStart > 0 && minutesUntilStart <= freezeBeforeMinutes) {
        var freezeResult = freezeQueue(q.queue_id);
        if (freezeResult.success) frozen++;
      }
    }
    
    Logger.log('Auto-freeze queues: ' + frozen + ' queues frozen');
    return { success: true, frozen: frozen };
    
  } catch (error) {
    Logger.log('Check and freeze queues error: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Test Daily Job - ทดสอบ Daily Job (เรียกใช้ได้ทันที)
 */
function testDailyDriverFatigueCheck() {
  return dailyDriverFatigueCheck();
}

/**
 * Fiscal Year Auto-Create Sheets - สร้าง sheets ใหม่เมื่อครบปีงบประมาณ (1 เมษายน)
 * เรียกใช้ทุกปีวันที่ 1 เมษายน เวลา 00:00
 */
function createFiscalYearSheets() {
  try {
    var today = new Date();
    var currentYear = today.getFullYear();
    var fiscalYear = currentYear + 543; // Convert to Buddhist year
    
    // Check if it's April 1st
    if (today.getMonth() !== 3 || today.getDate() !== 1) {
      Logger.log('Not April 1st, skipping fiscal year sheet creation');
      return { success: true, message: 'ไม่ใช่วันที่ 1 เมษายน' };
    }
    
    Logger.log('Creating fiscal year sheets for year ' + fiscalYear);
    
    var ss = getSpreadsheet();
    
    // Sheets ที่ต้องสร้างใหม่ (ถ้ายังไม่มี)
    var sheetsToCreate = [
      { name: 'QUEUE_' + fiscalYear, headers: getQueueHeaders() },
      { name: 'FUEL_LOG_' + fiscalYear, headers: getFuelLogHeaders() },
      { name: 'REPAIR_LOG_' + fiscalYear, headers: getRepairLogHeaders() },
      { name: 'USAGE_LOG_' + fiscalYear, headers: getUsageLogHeaders() },
      { name: 'CHECK_LOG_' + fiscalYear, headers: getCheckLogHeaders() }
    ];
    
    var created = [];
    var skipped = [];
    
    for (var i = 0; i < sheetsToCreate.length; i++) {
      var sheetInfo = sheetsToCreate[i];
      var existingSheet = ss.getSheetByName(sheetInfo.name);
      
      if (existingSheet) {
        skipped.push(sheetInfo.name);
        Logger.log('Sheet ' + sheetInfo.name + ' already exists, skipping');
      } else {
        var newSheet = ss.insertSheet(sheetInfo.name);
        if (sheetInfo.headers && sheetInfo.headers.length > 0) {
          newSheet.appendRow(sheetInfo.headers);
          // Format header row
          var headerRange = newSheet.getRange(1, 1, 1, sheetInfo.headers.length);
          headerRange.setFontWeight('bold');
          headerRange.setBackground('#4285f4');
          headerRange.setFontColor('#ffffff');
        }
        created.push(sheetInfo.name);
        Logger.log('Created sheet: ' + sheetInfo.name);
      }
    }
    
    // Archive old data (optional - keep old sheets but mark them)
    // Data is kept in old sheets, no need to move
    
    // Send notification to admin
    var adminEmails = getAdminEmails();
    if (adminEmails.length > 0) {
      var subject = 'สร้าง Sheets ปีงบประมาณ ' + fiscalYear + ' สำเร็จ';
      var body = 'ระบบได้สร้าง Sheets สำหรับปีงบประมาณ ' + fiscalYear + ' แล้ว:\n\n';
      body += 'สร้างใหม่: ' + created.join(', ') + '\n';
      body += 'ข้าม (มีอยู่แล้ว): ' + skipped.join(', ') + '\n\n';
      body += 'ข้อมูลเก่ายังคงอยู่ใน Sheets เดิม';
      
      adminEmails.forEach(function(email) {
        MailApp.sendEmail(email, subject, body);
      });
    }
    
    return {
      success: true,
      fiscal_year: fiscalYear,
      created: created,
      skipped: skipped,
      message: 'สร้าง Sheets ปีงบประมาณ ' + fiscalYear + ' สำเร็จ'
    };
    
  } catch (error) {
    Logger.log('Create fiscal year sheets error: ' + error.toString());
    
    // Send error notification
    try {
      var adminEmails = getAdminEmails();
      if (adminEmails.length > 0) {
        MailApp.sendEmail(
          adminEmails[0],
          'ข้อผิดพลาด: สร้าง Sheets ปีงบประมาณ',
          'เกิดข้อผิดพลาดในการสร้าง Sheets ปีงบประมาณ:\n\n' + error.toString()
        );
      }
    } catch (e) {
      Logger.log('Failed to send error email: ' + e.toString());
    }
    
    return { success: false, message: error.toString() };
  }
}

/**
 * Helper: Get Queue headers
 */
function getQueueHeaders() {
  return [
    'queue_id', 'date', 'time_start', 'time_end', 'car_id', 'driver_id', 'mission',
    'status', 'created_at', 'created_by', 'started_at', 'ended_at', 'mileage_start',
    'mileage_end', 'notes', 'qr_scan_id', 'allow_flexible', 'emergency_override',
    'fatigue_override', 'override_reason', 'passenger_count', 'requested_by',
    'destination', 'frozen', 'freeze_at'
  ];
}

/**
 * Helper: Get Fuel Log headers
 */
function getFuelLogHeaders() {
  return [
    'fuel_id', 'car_id', 'fuel_type', 'liters', 'price_per_liter', 'total_price',
    'mileage', 'receipt_image', 'filled_at', 'created_at', 'created_by', 'notes'
  ];
}

/**
 * Helper: Get Repair Log headers
 */
function getRepairLogHeaders() {
  return [
    'repair_id', 'car_id', 'repair_date', 'mileage', 'symptom', 'repair_location',
    'repair_items', 'total_cost', 'taken_by', 'status', 'completed_at', 'created_at',
    'created_by', 'notes'
  ];
}

/**
 * Helper: Get Usage Log headers
 */
function getUsageLogHeaders() {
  return [
    'record_id', 'car_id', 'driver_id', 'record_type', 'datetime', 'requested_by',
    'destination', 'mileage', 'created_at', 'created_by', 'notes', 'auto_generated',
    'auto_reason', 'original_user', 'audit_tag'
  ];
}

/**
 * Helper: Get Check Log headers
 */
function getCheckLogHeaders() {
  return [
    'check_id', 'car_id', 'check_date', 'fluid_levels', 'tire_pressure', 'tire_leaks',
    'engine_leaks', 'lighting_system', 'other_issues', 'images', 'created_at',
    'created_by', 'notes'
  ];
}

/**
 * Setup Fiscal Year Trigger - ตั้งค่า Trigger สำหรับสร้าง Sheets ปีงบประมาณ
 * เรียกใช้ครั้งเดียวเพื่อตั้งค่า (จะรันทุกปีวันที่ 1 เมษายน เวลา 00:00)
 */
function setupFiscalYearTrigger() {
  try {
    // Delete existing fiscal year trigger
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'createFiscalYearSheets') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create trigger for April 1st (00:00)
    // Note: GAS doesn't support specific date triggers, so we'll use monthly trigger
    // and check the date inside the function
    ScriptApp.newTrigger('createFiscalYearSheets')
      .timeBased()
      .everyDays(1)
      .atHour(0)
      .nearMinute(0)
      .create();
    
    Logger.log('Fiscal year trigger setup completed');
    return { success: true, message: 'ตั้งค่า Fiscal Year Trigger สำเร็จ' };
    
  } catch (error) {
    Logger.log('Setup fiscal year trigger error: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}
