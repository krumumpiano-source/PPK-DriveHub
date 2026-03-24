/**
 * PPK DriveHub Repair Service
 * จัดการบันทึกซ่อมบำรุง
 */

/**
 * Create Repair Log - แจ้งซ่อม
 * เลือกรถ, เลขไมล์ตอนเข้าซ่อม, วันเดือนปีไทย, ผู้นำรถไปซ่อม, สถานที่ซ่อม, รายการซ่อม, อาการเสียก่อนซ่อม, ค่าใช้จ่ายรวม
 */
function createRepairLog(repairData) {
  try {
    // Require authentication and module permission
    requireAuth();
    var currentUserId = getCurrentUser();
    if (!currentUserId) {
      return errorResponse('ต้องล็อกอินก่อนใช้งาน', 'AUTHENTICATION_REQUIRED');
    }
    
    // Check module permission (admin has full access)
    try {
      var userResult = getCurrentUserInfo(currentUserId);
      if (userResult.success && userResult.data.user) {
        var user = userResult.data.user;
        if (user.role !== 'admin') {
          requireModulePermission(currentUserId, 'repair', 'create');
        }
      }
    } catch (permError) {
      return errorResponse('ไม่มีสิทธิ์ในการแจ้งซ่อม', 'NO_PERMISSION');
    }
    
    // Required fields for completed repair: car_id, date_completed (or date_reported), mileage_at_repair, taken_by, garage_name, repair_items, issue_description, cost
    validateRequired(repairData, ['car_id', 'mileage_at_repair', 'taken_by', 'garage_name', 'repair_items', 'issue_description', 'cost']);
    
    // Use date_completed if provided, otherwise use date_reported
    var completedDate = repairData.date_completed || repairData.date_reported;
    if (!completedDate) {
      return errorResponse('ต้องระบุวันที่ซ่อมเสร็จ', 'MISSING_REQUIRED_FIELD');
    }
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.REPAIR_LOG, [
      'repair_id', 'car_id', 'date_reported', 'date_started', 'date_completed',
      'mileage_at_repair', 'taken_by', 'garage_name', 'repair_items',
      'issue_description', 'repair_description', 'cost',
      'status', 'documents', 'created_at', 'created_by', 'completed_by', 'notes'
    ]);
    
    var repairId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'system';
    
    // Upload documents if provided
    var documents = [];
    if (repairData.documents_base64 && Array.isArray(repairData.documents_base64)) {
      for (var i = 0; i < repairData.documents_base64.length; i++) {
        var doc = repairData.documents_base64[i];
        try {
          var uploadResult = uploadBase64FileToDrive(
            doc.data,
            doc.name,
            'REPAIR',
            doc.mime || 'application/pdf'
          );
          documents.push(uploadResult.fileUrl);
        } catch (uploadError) {
          Logger.log('Document upload error: ' + uploadError.toString());
        }
      }
    }
    
    // Parse repair_items if it's an array
    var repairItemsStr = '';
    if (Array.isArray(repairData.repair_items)) {
      repairItemsStr = repairData.repair_items.join(', ');
    } else {
      repairItemsStr = repairData.repair_items || '';
    }
    
    // Use date_completed if provided, otherwise use date_reported
    var completedDate = repairData.date_completed || repairData.date_reported;
    var reportedDate = repairData.date_reported || completedDate; // For backward compatibility
    
    sheet.appendRow([
      repairId,
      repairData.car_id,
      reportedDate, // date_reported (for backward compatibility)
      '', // date_started (removed from form)
      completedDate, // date_completed (primary field)
      repairData.mileage_at_repair,
      repairData.taken_by, // ผู้นำรถไปซ่อม (ปกติเป็นพนักงานขับรถ แต่สามารถใส่ชื่อคนอื่นได้)
      repairData.garage_name, // สถานที่ซ่อม
      repairItemsStr, // รายการซ่อม
      repairData.issue_description, // อาการเสียก่อนซ่อม
      '', // repair_description (removed from form)
      repairData.cost || 0, // ค่าใช้จ่ายรวม (required for completed repair)
      repairData.status || 'completed', // Always completed when creating new record
      JSON.stringify(documents),
      now,
      currentUser,
      currentUser, // completed_by (same as created_by since it's completed when created)
      repairData.notes || ''
    ]);
    
    // If linked to scheduled repair, update it and unlock vehicle
    if (repairData.scheduled_repair_id) {
      try {
        // Update scheduled repair to link with actual repair
        if (typeof updateScheduledRepair === 'function') {
          updateScheduledRepair(repairData.scheduled_repair_id, {
            status: 'completed',
            actual_repair_id: repairId,
            notes: (repairData.notes || '') + ' [เชื่อมกับ Repair Log: ' + repairId + ']'
          });
        }
        
        // Unlock vehicle from scheduled repair
        if (typeof unlockVehicleFromRepair === 'function') {
          unlockVehicleFromRepair(repairData.car_id, repairData.scheduled_repair_id);
        }
      } catch (linkError) {
        Logger.log('Error linking scheduled repair: ' + linkError.toString());
        // Continue even if linking fails
      }
    }
    
    // Don't update car status to repair since repair is already completed
    // Car should remain available or in its current status
    
    // อัปเดตประวัติการบำรุงต่อคัน — เมื่อบันทึกซ่อมเสร็จ ระบบจับคำในรายการซ่อม (เช่น น้ำมันเครื่อง ไส้กรองอากาศ) แล้วอัปเดต last_km / last_date
    try {
      var maintenanceKeys = typeof parseRepairItemsToMaintenanceKeys === 'function' ? parseRepairItemsToMaintenanceKeys(repairItemsStr) : [];
      if (maintenanceKeys.length > 0 && repairData.mileage_at_repair > 0) {
        var completedDateStr = completedDate;
        if (typeof completedDateStr === 'object' && completedDateStr.getFullYear) {
          var y = completedDateStr.getFullYear(), m = completedDateStr.getMonth() + 1, d = completedDateStr.getDate();
          completedDateStr = y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
        } else if (completedDateStr) completedDateStr = String(completedDateStr).substring(0, 10);
        var updates = maintenanceKeys.map(function(key) {
          return { item_key: key, last_km: repairData.mileage_at_repair, last_date: completedDateStr };
        });
        if (typeof recordVehicleMaintenance === 'function') {
          recordVehicleMaintenance(repairData.car_id, updates);
        }
      }
    } catch (maintErr) {
      Logger.log('Update vehicle maintenance from createRepairLog: ' + maintErr.toString());
    }
    
    // Log creation
    logAudit(currentUser, 'create', 'repair', repairId, {
      car_id: repairData.car_id,
      issue: repairData.issue_description,
      cost: repairData.cost
    });
    
    return successResponse({
      repair_id: repairId
    }, 'แจ้งซ่อมสำเร็จ');
    
  } catch (error) {
    Logger.log('Create repair log error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการแจ้งซ่อม: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Repair Logs - ดึงรายการซ่อม
 */
function getRepairLogs(filters) {
  try {
    // Require authentication
    requireAuth();
    var currentUserId = getCurrentUser();
    if (!currentUserId) {
      return errorResponse('ต้องล็อกอินก่อนใช้งาน', 'AUTHENTICATION_REQUIRED');
    }
    
    // Check module permission and determine access level
    var canViewAll = false;
    var canViewOwnOnly = false;
    
    try {
      var userResult = getCurrentUserInfo(currentUserId);
      if (userResult.success && userResult.data.user) {
        var user = userResult.data.user;
        if (user.role === 'admin') {
          canViewAll = true;
        } else if (hasModulePermission(currentUserId, 'repair', 'view')) {
          // Check if user has edit permission (can view all) or only view (own only)
          if (hasModulePermission(currentUserId, 'repair', 'edit')) {
            canViewAll = true;
          } else {
            canViewOwnOnly = true;
          }
        } else {
          return errorResponse('ไม่มีสิทธิ์ดูรายการซ่อม', 'NO_PERMISSION');
        }
      }
    } catch (permError) {
      return errorResponse('ไม่มีสิทธิ์ดูรายการซ่อม', 'NO_PERMISSION');
    }
    
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.REPAIR_LOG);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ repair_logs: [] });
    }
    
    var repairLogs = [];
    var headers = data[0];
    
    // Find created_by column index
    var createdByColIndex = headers.indexOf('created_by');
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var repairLog = rowToObject(row, headers);
      
      // Apply permission filter: if user can only view own, filter by created_by
      if (canViewOwnOnly && createdByColIndex >= 0) {
        var createdBy = row[createdByColIndex];
        if (createdBy !== currentUserId) {
          continue; // Skip records not created by current user
        }
      }
      
      // Parse documents JSON
      if (repairLog.documents) {
        try {
          repairLog.documents = JSON.parse(repairLog.documents);
        } catch (e) {
          repairLog.documents = [];
        }
      } else {
        repairLog.documents = [];
      }
      
      // Apply filters
      if (filters.car_id && repairLog.car_id !== filters.car_id) {
        continue;
      }
      if (filters.status && repairLog.status !== filters.status) {
        continue;
      }
      if (filters.date_from && repairLog.date_reported < filters.date_from) {
        continue;
      }
      if (filters.date_to && repairLog.date_reported > filters.date_to) {
        continue;
      }
      
      repairLogs.push(repairLog);
    }
    
    // Sort by date_reported descending
    repairLogs.sort(function(a, b) {
      return b.date_reported.localeCompare(a.date_reported);
    });
    
    return successResponse({ repair_logs: repairLogs });
    
  } catch (error) {
    Logger.log('Get repair logs error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Repair Log By ID
 */
function getRepairLogById(repairId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.REPAIR_LOG);
    var rowIndex = findRowIndexById(sheet, 0, repairId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบบันทึกซ่อม', 'REPAIR_LOG_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 18).getValues()[0];
    var headers = [
      'repair_id', 'car_id', 'date_reported', 'date_started', 'date_completed',
      'mileage_at_repair', 'taken_by', 'garage_name', 'repair_items',
      'issue_description', 'repair_description', 'cost',
      'status', 'documents', 'created_at', 'created_by', 'completed_by', 'notes'
    ];
    
    var repairLog = rowToObject(row, headers);
    
    // Parse documents JSON
    if (repairLog.documents) {
      try {
        repairLog.documents = JSON.parse(repairLog.documents);
      } catch (e) {
        repairLog.documents = [];
      }
    } else {
      repairLog.documents = [];
    }
    
    return successResponse({ repair_log: repairLog });
    
  } catch (error) {
    Logger.log('Get repair log by ID error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Repair Log - แก้ไขบันทึกซ่อม
 */
function updateRepairLog(repairId, repairData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.REPAIR_LOG);
    var rowIndex = findRowIndexById(sheet, 0, repairId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบบันทึกซ่อม', 'REPAIR_LOG_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'system';
    
    // Update fields (column indices in Google Sheets: 1=repair_id, 2=car_id, 3=date_reported, 4=date_started, 5=date_completed,
    // 6=mileage_at_repair, 7=taken_by, 8=garage_name, 9=repair_items, 10=issue_description,
    // 11=repair_description, 12=cost, 13=status, 14=documents, 15=created_at, 16=created_by, 17=completed_by, 18=notes)
    
    if (repairData.date_reported !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(repairData.date_reported);
    }
    if (repairData.date_completed !== undefined) {
      sheet.getRange(rowIndex, 5).setValue(repairData.date_completed);
    }
    if (repairData.date_started !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(repairData.date_started);
    }
    if (repairData.car_id !== undefined) {
      sheet.getRange(rowIndex, 2).setValue(repairData.car_id);
    }
    if (repairData.mileage_at_repair !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(repairData.mileage_at_repair);
    }
    if (repairData.taken_by !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(repairData.taken_by);
    }
    if (repairData.garage_name !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(repairData.garage_name);
    }
    if (repairData.repair_items !== undefined) {
      var repairItemsStr = Array.isArray(repairData.repair_items) ? repairData.repair_items.join(', ') : repairData.repair_items;
      sheet.getRange(rowIndex, 9).setValue(repairItemsStr);
    }
    if (repairData.issue_description !== undefined) {
      sheet.getRange(rowIndex, 10).setValue(repairData.issue_description);
    }
    if (repairData.repair_description !== undefined) {
      sheet.getRange(rowIndex, 11).setValue(repairData.repair_description);
    }
    if (repairData.cost !== undefined) {
      sheet.getRange(rowIndex, 12).setValue(repairData.cost);
    }
    if (repairData.status !== undefined) {
      sheet.getRange(rowIndex, 13).setValue(repairData.status);
    }
    if (repairData.notes !== undefined) {
      sheet.getRange(rowIndex, 18).setValue(repairData.notes);
    }
    
    // Handle documents update
    if (repairData.documents_base64 && Array.isArray(repairData.documents_base64)) {
      var documents = [];
      var existingDocs = sheet.getRange(rowIndex, 14).getValue();
      if (existingDocs) {
        try {
          documents = JSON.parse(existingDocs);
        } catch (e) {}
      }
      
      for (var i = 0; i < repairData.documents_base64.length; i++) {
        var doc = repairData.documents_base64[i];
        try {
          var uploadResult = uploadBase64FileToDrive(
            doc.data,
            doc.name,
            'REPAIR',
            doc.mime || 'application/pdf'
          );
          documents.push(uploadResult.fileUrl);
        } catch (uploadError) {
          Logger.log('Document upload error: ' + uploadError.toString());
        }
      }
      
      sheet.getRange(rowIndex, 14).setValue(JSON.stringify(documents));
    }
    
    // Log update
    logAudit(currentUser, 'update', 'repair', repairId, repairData);
    
    return successResponse({}, 'อัปเดตบันทึกซ่อมสำเร็จ');
    
  } catch (error) {
    Logger.log('Update repair log error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Complete Repair - ปิดงานซ่อม
 * ถ้ามีการบันทึกเปลี่ยนถ่ายน้ำมันเครื่อง, เปลี่ยนน้ำมันเครื่อง, หรือเช็คระยะ
 * จะแจ้งเตือนล่วงหน้า 7 วัน และสามารถตั้งค่าได้ว่าให้เตือนทุกกี่กิโลเมตรหรือกี่เดือน
 */
function completeRepair(repairId, repairData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.REPAIR_LOG);
    var rowIndex = findRowIndexById(sheet, 0, repairId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบบันทึกซ่อม', 'REPAIR_LOG_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 18).getValues()[0];
    var carId = row[1]; // column 2
    var repairItems = row[8] || ''; // column 9 (repair_items)
    var mileageAtRepair = parseFloat(row[5] || 0); // column 6 (mileage_at_repair)
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Update repair log (column indices: 1=repair_id, 2=car_id, 3=date_reported, 4=date_started, 5=date_completed,
    // 6=mileage_at_repair, 7=taken_by, 8=garage_name, 9=repair_items, 10=issue_description,
    // 11=repair_description, 12=cost, 13=status, 14=documents, 15=created_at, 16=created_by, 17=completed_by, 18=notes)
    sheet.getRange(rowIndex, 5).setValue(repairData.date_completed || formatDate(now));
    sheet.getRange(rowIndex, 11).setValue(repairData.repair_description || row[10]);
    if (repairData.garage_name !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(repairData.garage_name);
    }
    if (repairData.cost !== undefined) {
      sheet.getRange(rowIndex, 12).setValue(repairData.cost);
    } else {
      sheet.getRange(rowIndex, 12).setValue(row[11] || 0);
    }
    sheet.getRange(rowIndex, 13).setValue('completed');
    sheet.getRange(rowIndex, 17).setValue(currentUser); // completed_by
    if (repairData.notes !== undefined) {
      sheet.getRange(rowIndex, 18).setValue(repairData.notes);
    }
    
    // Check if repair items include maintenance items that need periodic checks
    var maintenanceKeywords = ['เปลี่ยนถ่ายน้ำมันเครื่อง', 'เปลี่ยนน้ำมันเครื่อง', 'เช็คระยะ', 'เปลี่ยนถ่าย', 'น้ำมันเครื่อง'];
    var isMaintenanceRepair = false;
    for (var i = 0; i < maintenanceKeywords.length; i++) {
      if (repairItems.indexOf(maintenanceKeywords[i]) !== -1) {
        isMaintenanceRepair = true;
        break;
      }
    }
    
    // Schedule maintenance check notification if needed
    if (isMaintenanceRepair && mileageAtRepair > 0) {
      scheduleMaintenanceCheckNotification(carId, mileageAtRepair, repairId);
    }
    
    // อัปเดต "ครั้งล่าสุดที่เปลี่ยน" ต่อคันต่อรายการ — รถแต่ละคันมีการเปลี่ยนในระยะที่ต่างกัน
    try {
      var maintenanceKeys = parseRepairItemsToMaintenanceKeys(repairItems);
      if (maintenanceKeys.length > 0 && mileageAtRepair > 0) {
        var completedDateStr = completedDate;
        if (typeof completedDateStr === 'object' && completedDateStr.getFullYear) {
          var y = completedDateStr.getFullYear(), m = completedDateStr.getMonth() + 1, d = completedDateStr.getDate();
          completedDateStr = y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
        } else if (completedDateStr) completedDateStr = String(completedDateStr).substring(0, 10);
        var updates = maintenanceKeys.map(function(key) {
          return { item_key: key, last_km: mileageAtRepair, last_date: completedDateStr };
        });
        recordVehicleMaintenance(carId, updates);
      }
    } catch (maintenanceErr) {
      Logger.log('Update vehicle maintenance last error: ' + maintenanceErr.toString());
    }
    
    // Update car status back to available
    // Also unlock from scheduled repair if exists
    var scheduledRepairs = getScheduledRepairs({ car_id: carId, status: 'pending' });
    if (scheduledRepairs.success && scheduledRepairs.data.scheduled_repairs.length > 0) {
      // Find matching scheduled repair
      for (var i = 0; i < scheduledRepairs.data.scheduled_repairs.length; i++) {
        var sr = scheduledRepairs.data.scheduled_repairs[i];
        if (sr.actual_repair_id === repairId) {
          // Update scheduled repair status
          updateScheduledRepair(sr.scheduled_repair_id, { status: 'completed' });
          break;
        }
      }
    }
    
    // Unlock vehicle
    unlockVehicleFromRepair(carId, '');
    updateVehicle(carId, { status: 'available' });
    
    // Log completion
    logAudit(currentUser, 'update', 'repair', repairId, {
      action: 'complete',
      cost: repairData.cost,
      is_maintenance: isMaintenanceRepair
    });
    
    return successResponse({}, 'ปิดงานซ่อมสำเร็จ' + (isMaintenanceRepair ? ' (ตั้งเวลาแจ้งเตือนเช็คระยะแล้ว)' : ''));
    
  } catch (error) {
    Logger.log('Complete repair error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการปิดงานซ่อม: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Schedule Maintenance Check Notification - ตั้งเวลาแจ้งเตือนเช็คระยะ
 * อ้างอิงจากคู่มือรถของโตโยต้าและมาสด้า
 * เตือนล่วงหน้า 7 วัน
 * ถ้าเป็นกิโลเมตร จะเตือนล่วงหน้าก่อนถึงระยะ 100 กิโลเมตร
 */
function scheduleMaintenanceCheckNotification(carId, currentMileage, repairId) {
  try {
    var car = getVehicleById(carId);
    if (!car.success || !car.data || !car.data.vehicle) {
      return;
    }
    
    var carInfo = car.data.vehicle;
    var carName = carInfo ? carInfo.license_plate : carId;
    
    // Get maintenance schedule from manual (Toyota/Mazda)
    var nextMaintenance = getNextMaintenanceSchedule(carId, currentMileage);
    
    if (!nextMaintenance) {
      // Fallback to manual settings if schedule not found
      var settings = getMaintenanceSettings(carId);
      if (!settings || !settings.enabled) {
        return;
      }
      
      scheduleMaintenanceCheckNotificationManual(settings, carId, currentMileage, repairId, carName);
      return;
    }
    
    // Use schedule from manual
    var nextMileage = nextMaintenance.schedule.mileage;
    var remainingKm = nextMaintenance.remaining_km;
    var nextMonths = nextMaintenance.schedule.months;
    var maintenanceItems = nextMaintenance.schedule.items.join(', ');
    
    var notificationDate = null;
    var message = '';
    
    // Calculate notification date
    // If remaining km < 1000, use month-based notification
    if (remainingKm < 1000) {
      // Use month-based: เตือนล่วงหน้า 7 วัน
      var notificationDateObj = new Date();
      notificationDateObj.setMonth(notificationDateObj.getMonth() + nextMonths);
      notificationDateObj.setDate(notificationDateObj.getDate() - 7); // 7 days before
      notificationDate = formatDate(notificationDateObj);
      
      message = 'รถ ' + carName + ' (' + carInfo.brand + ' ' + carInfo.model + ') ควรเช็คระยะที่ ' + nextMileage.toLocaleString() + ' km (อีก ' + nextMonths + ' เดือน - เตือนล่วงหน้า 7 วัน)\nรายการ: ' + maintenanceItems;
      
    } else {
      // Use kilometer-based: เตือนล่วงหน้าก่อนถึงระยะ 100 km
      var notificationMileage = nextMileage - 100;
      var avgDailyKm = 50; // Default, can be customized
      
      // Try to get from settings
      var settings = getMaintenanceSettings(carId);
      if (settings && settings.average_daily_km) {
        avgDailyKm = settings.average_daily_km;
      }
      
      var daysUntilNotification = Math.ceil((notificationMileage - currentMileage) / avgDailyKm);
      var notificationDateObj = new Date();
      notificationDateObj.setDate(notificationDateObj.getDate() + daysUntilNotification);
      notificationDate = formatDate(notificationDateObj);
      
      message = 'รถ ' + carName + ' (' + carInfo.brand + ' ' + carInfo.model + ') ควรเช็คระยะที่ ' + nextMileage.toLocaleString() + ' km (อีกประมาณ ' + daysUntilNotification + ' วัน - เตือนล่วงหน้า 100 km)\nรายการ: ' + maintenanceItems;
    }
    
    if (notificationDate) {
      // Store in NOTIFICATIONS sheet
      var notifSheet = getOrCreateSheet(CONFIG.SHEETS.NOTIFICATIONS, [
        'notification_id', 'type', 'entity_type', 'entity_id', 'car_id',
        'message', 'scheduled_date', 'sent', 'created_at'
      ]);
      
      var notificationId = generateUUID();
      notifSheet.appendRow([
        notificationId,
        'maintenance_check',
        'repair',
        repairId,
        carId,
        message,
        notificationDate,
        'FALSE',
        new Date()
      ]);
    }
    
  } catch (error) {
    Logger.log('Schedule maintenance check notification error: ' + error.toString());
  }
}

/**
 * Schedule Maintenance Check Notification (Manual Settings) - สำหรับกรณีที่ไม่มีตารางจากคู่มือ
 */
function scheduleMaintenanceCheckNotificationManual(settings, carId, currentMileage, repairId, carName) {
  try {
    var notificationDate = null;
    var message = '';
    
    if (settings.check_type === 'kilometer') {
      // Check by kilometer: เตือนก่อนถึงระยะ 100 km
      var nextCheckMileage = currentMileage + parseFloat(settings.check_interval);
      var notificationMileage = nextCheckMileage - 100; // เตือนล่วงหน้า 100 km
      
      var avgDailyKm = settings.average_daily_km || 50; // Default 50 km/day
      var daysUntilNotification = Math.ceil((notificationMileage - currentMileage) / avgDailyKm);
      var notificationDateObj = new Date();
      notificationDateObj.setDate(notificationDateObj.getDate() + daysUntilNotification);
      notificationDate = formatDate(notificationDateObj);
      
      message = 'รถ ' + carName + ' ควรเช็คระยะที่เลขไมล์ ' + nextCheckMileage.toLocaleString() + ' km (อีกประมาณ ' + daysUntilNotification + ' วัน)';
      
    } else if (settings.check_type === 'month') {
      // Check by month: เตือนล่วงหน้า 7 วัน
      var monthsUntilCheck = parseFloat(settings.check_interval);
      var notificationDateObj = new Date();
      notificationDateObj.setMonth(notificationDateObj.getMonth() + monthsUntilCheck);
      notificationDateObj.setDate(notificationDateObj.getDate() - 7); // 7 days before
      notificationDate = formatDate(notificationDateObj);
      
      message = 'รถ ' + carName + ' ควรเช็คระยะ (อีก ' + monthsUntilCheck + ' เดือน - เตือนล่วงหน้า 7 วัน)';
    }
    
    if (notificationDate) {
      var notifSheet = getOrCreateSheet(CONFIG.SHEETS.NOTIFICATIONS, [
        'notification_id', 'type', 'entity_type', 'entity_id', 'car_id',
        'message', 'scheduled_date', 'sent', 'created_at'
      ]);
      
      var notificationId = generateUUID();
      notifSheet.appendRow([
        notificationId,
        'maintenance_check',
        'repair',
        repairId,
        carId,
        message,
        notificationDate,
        'FALSE',
        new Date()
      ]);
    }
    
  } catch (error) {
    Logger.log('Schedule maintenance check notification manual error: ' + error.toString());
  }
}

/**
 * Get Maintenance Settings - ดึงการตั้งค่าเช็คระยะ
 * ถ้าไม่มีตั้งค่า จะใช้ค่าจากคู่มือรถอัตโนมัติ
 */
function getMaintenanceSettings(carId) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.MAINTENANCE_SETTINGS, [
      'setting_id', 'car_id', 'check_type', 'check_interval', 'average_daily_km', 'enabled', 'updated_at'
    ]);
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === carId && data[i][5] === 'TRUE') {
        return {
          car_id: data[i][1],
          check_type: data[i][2], // 'kilometer' or 'month'
          check_interval: data[i][3],
          average_daily_km: data[i][4] || 50,
          enabled: true,
          manual: true // Indicates manual settings
        };
      }
    }
    
    // If no manual settings, try to get from vehicle manual
    var car = getVehicleById(carId);
    if (car.success) {
      if (!car.success || !car.data || !car.data.vehicle) {
        return errorResponse('ไม่พบข้อมูลรถ', 'CAR_NOT_FOUND');
      }
      var vehicle = car.data.vehicle;
      var schedule = getMaintenanceScheduleForVehicle(vehicle.brand, vehicle.model);
      
      if (schedule) {
        return {
          car_id: carId,
          check_type: 'kilometer',
          check_interval: schedule.default_interval_km,
          average_daily_km: 50,
          enabled: true,
          manual: false, // From manual
          schedule: schedule
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log('Get maintenance settings error: ' + error.toString());
    return null;
  }
}

/**
 * Update Maintenance Settings - อัปเดตการตั้งค่าเช็คระยะ
 */
function updateMaintenanceSettings(carId, settings) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.MAINTENANCE_SETTINGS, [
      'setting_id', 'car_id', 'check_type', 'check_interval', 'average_daily_km', 'enabled', 'updated_at'
    ]);
    
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    // Find existing setting
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === carId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    if (rowIndex === -1) {
      // Create new setting
      var settingId = generateUUID();
      sheet.appendRow([
        settingId,
        carId,
        settings.check_type || 'kilometer',
        settings.check_interval || 5000,
        settings.average_daily_km || 50,
        settings.enabled !== false ? 'TRUE' : 'FALSE',
        now
      ]);
    } else {
      // Update existing setting
      if (settings.check_type !== undefined) {
        sheet.getRange(rowIndex, 3).setValue(settings.check_type);
      }
      if (settings.check_interval !== undefined) {
        sheet.getRange(rowIndex, 4).setValue(settings.check_interval);
      }
      if (settings.average_daily_km !== undefined) {
        sheet.getRange(rowIndex, 5).setValue(settings.average_daily_km);
      }
      if (settings.enabled !== undefined) {
        sheet.getRange(rowIndex, 6).setValue(settings.enabled ? 'TRUE' : 'FALSE');
      }
      sheet.getRange(rowIndex, 7).setValue(now);
    }
    
    return successResponse({}, 'อัปเดตการตั้งค่าเช็คระยะสำเร็จ');
    
  } catch (error) {
    Logger.log('Update maintenance settings error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}
