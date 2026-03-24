/**
 * PPK DriveHub Driver Service
 * จัดการข้อมูลคนขับ
 */

/**
 * Create Driver - เพิ่มคนขับใหม่
 */
function createDriver(driverData) {
  try {
    validateRequired(driverData, ['first_name', 'last_name', 'phone']);
    
    // SECURITY: Sanitize string inputs to prevent XSS/injection
    var title = driverData.title ? sanitizeInput(String(driverData.title)) : '';
    var firstName = driverData.first_name ? sanitizeInput(String(driverData.first_name)) : '';
    var lastName = driverData.last_name ? sanitizeInput(String(driverData.last_name)) : '';
    if (driverData.phone) driverData.phone = sanitizeInput(String(driverData.phone));
    if (driverData.notes) driverData.notes = sanitizeInput(String(driverData.notes));
    
    // Build full_name from title + first_name + last_name
    var fullName = (title + ' ' + firstName + ' ' + lastName).trim();
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.DRIVERS, [
      'driver_id', 'title', 'first_name', 'last_name', 'full_name', 'phone', 'line_id',
      'position', 'start_date', 'license_number', 'license_expiry', 'status',
      'fatigue_flag', 'fatigue_date', 'fatigue_distance', 'profile_image',
      'id_card_image', 'id_card_number', 'id_card_issue_date', 'id_card_expiry_date',
      'date_of_birth', 'address', 'emergency_contact', 'emergency_phone',
      'created_at', 'created_by', 'updated_at', 'notes'
    ]);
    
    var driverId = driverData.driver_id || generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'admin';
    
    sheet.appendRow([
      driverId,
      driverData.title || '', // คำนำหน้า
      firstName, // ชื่อ
      lastName, // นามสกุล
      fullName, // ชื่อ-สกุลเต็ม
      driverData.phone,
      driverData.line_id || '', // LINE ID
      driverData.position || '', // ตำแหน่ง
      driverData.start_date || '', // วันที่เริ่มงาน
      driverData.license_number || '',
      driverData.license_expiry || '',
      'active',
      'FALSE', // fatigue_flag
      '', // fatigue_date
      '', // fatigue_distance
      driverData.profile_image || '', // รูปโปรไฟล์
      driverData.id_card_image || '', // รูปบัตรประชาชน
      driverData.id_card_number || '', // เลขบัตรประชาชน
      driverData.id_card_issue_date || '', // วันที่ออกบัตร
      driverData.id_card_expiry_date || '', // วันหมดอายุบัตร
      driverData.date_of_birth || '', // วันเกิด
      driverData.address || '', // ที่อยู่
      driverData.emergency_contact || '', // ผู้ติดต่อฉุกเฉิน
      driverData.emergency_phone || '', // เบอร์โทรฉุกเฉิน
      now,
      currentUser,
      now,
      driverData.notes || ''
    ]);
    
    // Log creation
    logAudit(currentUser, 'create', 'driver', driverId, driverData);
    
    return successResponse({
      driver_id: driverId
    }, 'เพิ่มคนขับสำเร็จ');
    
  } catch (error) {
    Logger.log('Create driver error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการเพิ่มคนขับ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Drivers - ดึงรายการคนขับ
 * สำหรับจัดคิว: กรองคนขับที่ลา (approved) ออก
 */
function getDrivers(filters) {
  try {
    // Require authentication (except for public QR endpoints)
    // Note: Some endpoints like QR scanning may not require auth
    // This is a read-only operation, so we allow it but log it
    try {
      requireAuth();
    } catch (e) {
      // If auth fails, allow but log (for QR public access)
      Logger.log('getDrivers called without auth - may be public QR access');
    }
    
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.DRIVERS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ drivers: [] });
    }
    
    var drivers = [];
    var headers = data[0];
    var checkDate = filters.check_date || formatDate(new Date());
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var driver = rowToObject(row, headers);
      
      // Build full_name if not exists (for backward compatibility)
      if (!driver.full_name && driver.first_name && driver.last_name) {
        driver.full_name = ((driver.title || '') + ' ' + driver.first_name + ' ' + driver.last_name).trim();
      }
      
      // Apply filters
      if (filters.status && driver.status !== filters.status) {
        continue;
      }
      
      // For queue selection: exclude drivers on leave (unless explicitly requested)
      if (filters.for_queue_selection !== false) {
        var driverLeave = isDriverOnLeave(driver.driver_id, checkDate);
        if (driverLeave.on_leave) {
          continue; // Don't show drivers on leave in queue selection
        }
      }
      
      drivers.push(driver);
    }
    
    return successResponse({ drivers: drivers });
    
  } catch (error) {
    Logger.log('Get drivers error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Driver By ID
 */
function getDriverById(driverId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.DRIVERS);
    var rowIndex = findRowIndexById(sheet, 0, driverId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบคนขับ', 'DRIVER_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 28).getValues()[0];
    var headers = [
      'driver_id', 'title', 'first_name', 'last_name', 'full_name', 'phone', 'line_id',
      'position', 'start_date', 'license_number', 'license_expiry', 'status',
      'fatigue_flag', 'fatigue_date', 'fatigue_distance', 'profile_image',
      'id_card_image', 'id_card_number', 'id_card_issue_date', 'id_card_expiry_date',
      'date_of_birth', 'address', 'emergency_contact', 'emergency_phone',
      'created_at', 'created_by', 'updated_at', 'notes'
    ];
    
    var driver = rowToObject(row, headers);
    
    return successResponse({ driver: driver });
    
  } catch (error) {
    Logger.log('Get driver by ID error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Driver - แก้ไขข้อมูลคนขับ
 */
function updateDriver(driverId, driverData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.DRIVERS);
    var rowIndex = findRowIndexById(sheet, 0, driverId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบคนขับ', 'DRIVER_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Get old values for audit
    var oldRow = sheet.getRange(rowIndex, 1, 1, 28).getValues()[0];
    var oldValues = {
      status: oldRow[11],
      fatigue_flag: oldRow[12]
    };
    
    // Update fields
    if (driverData.title !== undefined) {
      sheet.getRange(rowIndex, 2).setValue(driverData.title);
    }
    if (driverData.first_name !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(driverData.first_name);
    }
    if (driverData.last_name !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(driverData.last_name);
    }
    // Rebuild full_name if name fields changed
    if (driverData.title !== undefined || driverData.first_name !== undefined || driverData.last_name !== undefined) {
      var title = driverData.title !== undefined ? driverData.title : oldRow[1];
      var firstName = driverData.first_name !== undefined ? driverData.first_name : oldRow[2];
      var lastName = driverData.last_name !== undefined ? driverData.last_name : oldRow[3];
      var fullName = (title + ' ' + firstName + ' ' + lastName).trim();
      sheet.getRange(rowIndex, 5).setValue(fullName);
    }
    if (driverData.phone !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(driverData.phone);
    }
    if (driverData.line_id !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(driverData.line_id);
    }
    if (driverData.position !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(driverData.position);
    }
    if (driverData.start_date !== undefined) {
      sheet.getRange(rowIndex, 9).setValue(driverData.start_date);
    }
    if (driverData.license_number !== undefined) {
      sheet.getRange(rowIndex, 10).setValue(driverData.license_number);
    }
    if (driverData.license_expiry !== undefined) {
      sheet.getRange(rowIndex, 11).setValue(driverData.license_expiry);
    }
    if (driverData.status !== undefined) {
      sheet.getRange(rowIndex, 12).setValue(driverData.status);
    }
    if (driverData.profile_image !== undefined) {
      sheet.getRange(rowIndex, 16).setValue(driverData.profile_image);
    }
    if (driverData.id_card_image !== undefined) {
      sheet.getRange(rowIndex, 17).setValue(driverData.id_card_image);
    }
    if (driverData.id_card_number !== undefined) {
      sheet.getRange(rowIndex, 18).setValue(driverData.id_card_number);
    }
    if (driverData.id_card_issue_date !== undefined) {
      sheet.getRange(rowIndex, 19).setValue(driverData.id_card_issue_date);
    }
    if (driverData.id_card_expiry_date !== undefined) {
      sheet.getRange(rowIndex, 20).setValue(driverData.id_card_expiry_date);
    }
    if (driverData.date_of_birth !== undefined) {
      sheet.getRange(rowIndex, 21).setValue(driverData.date_of_birth);
    }
    if (driverData.address !== undefined) {
      sheet.getRange(rowIndex, 22).setValue(driverData.address);
    }
    if (driverData.emergency_contact !== undefined) {
      sheet.getRange(rowIndex, 23).setValue(driverData.emergency_contact);
    }
    if (driverData.emergency_phone !== undefined) {
      sheet.getRange(rowIndex, 24).setValue(driverData.emergency_phone);
    }
    if (driverData.notes !== undefined) {
      sheet.getRange(rowIndex, 28).setValue(driverData.notes);
    }
    
    // Update updated_at
    sheet.getRange(rowIndex, 27).setValue(now);
    
    // Log update with old/new values
    logUpdate(currentUser, 'update', 'driver', driverId, oldValues, driverData, {}, '');
    
    // Log update
    logAudit(currentUser, 'update', 'driver', driverId, driverData);
    
    return successResponse({}, 'อัปเดตข้อมูลคนขับสำเร็จ');
    
  } catch (error) {
    Logger.log('Update driver error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Deactivate Driver - ปิดการใช้งานคนขับ
 */
function deactivateDriver(driverId, reason) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.DRIVERS);
    var rowIndex = findRowIndexById(sheet, 0, driverId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบคนขับ', 'DRIVER_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Set status to inactive
    sheet.getRange(rowIndex, 12).setValue('inactive'); // status column
    sheet.getRange(rowIndex, 27).setValue(now); // updated_at column
    
    // Add reason to notes
    if (reason) {
      var currentNotes = sheet.getRange(rowIndex, 28).getValue(); // notes column
      var newNotes = currentNotes + '\n[ปิดการใช้งาน: ' + formatDate(now) + '] ' + reason;
      sheet.getRange(rowIndex, 28).setValue(newNotes);
    }
    
    // Log deactivation
    logAudit(currentUser, 'update', 'driver', driverId, {
      action: 'deactivate',
      reason: reason
    });
    
    return successResponse({}, 'ปิดการใช้งานคนขับสำเร็จ');
    
  } catch (error) {
    Logger.log('Deactivate driver error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการปิดการใช้งาน: ' + error.toString(), 'SERVER_ERROR');
  }
}
