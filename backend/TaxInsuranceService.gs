/**
 * PPK DriveHub Tax & Insurance Service
 * ระบบเสียภาษีและประกันภัยภาคสมัครใจ
 * - Admin สามารถให้สิทธิ์ใครก็ได้
 * - กรอกข้อมูลการเสียภาษีและประกันภัยได้อย่างครบถ้วน
 * - แจ้งเตือนล่วงหน้าใน Telegram 3 เดือน
 */

/**
 * Create Tax Record - บันทึกการเสียภาษี
 */
function createTaxRecord(taxData) {
  try {
    validateRequired(taxData, ['car_id', 'tax_type', 'amount', 'paid_date', 'expiry_date']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.TAX_RECORDS, [
      'tax_id', 'car_id', 'tax_type', 'amount', 'paid_date', 'expiry_date',
      'receipt_image', 'created_at', 'created_by', 'notes'
    ]);
    
    var taxId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'system';
    
    // Upload receipt if provided
    var receiptImageUrl = '';
    if (taxData.receipt_image_base64 && taxData.receipt_image_name) {
      try {
        var uploadResult = uploadBase64FileToDrive(
          taxData.receipt_image_base64,
          taxData.receipt_image_name,
          'TAX',
          taxData.receipt_image_mime || 'image/jpeg'
        );
        receiptImageUrl = uploadResult.fileUrl;
      } catch (uploadError) {
        Logger.log('Receipt upload error: ' + uploadError.toString());
      }
    }
    
    sheet.appendRow([
      taxId,
      taxData.car_id,
      taxData.tax_type, // annual_tax, etc.
      taxData.amount,
      taxData.paid_date,
      taxData.expiry_date,
      receiptImageUrl,
      now,
      currentUser,
      taxData.notes || ''
    ]);
    
    // Schedule notification (3 months before expiry)
    scheduleTaxNotification(taxId, taxData.car_id, taxData.expiry_date);
    
    // Log creation
    logAudit(currentUser, 'create', 'tax', taxId, {
      car_id: taxData.car_id,
      tax_type: taxData.tax_type,
      expiry_date: taxData.expiry_date
    });
    
    return successResponse({
      tax_id: taxId
    }, 'บันทึกการเสียภาษีสำเร็จ');
    
  } catch (error) {
    Logger.log('Create tax record error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการบันทึก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Create Insurance Record - บันทึกการเสียประกันภัย
 */
function createInsuranceRecord(insuranceData) {
  try {
    validateRequired(insuranceData, ['car_id', 'insurance_type', 'amount', 'paid_date', 'expiry_date', 'insurance_company']);
    
    var sheet = getOrCreateSheet('INSURANCE_RECORDS', [
      'insurance_id', 'car_id', 'insurance_type', 'insurance_company', 'policy_number',
      'amount', 'paid_date', 'expiry_date', 'coverage_details', 'receipt_image',
      'created_at', 'created_by', 'notes'
    ]);
    
    var insuranceId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'system';
    
    // Upload receipt if provided
    var receiptImageUrl = '';
    if (insuranceData.receipt_image_base64 && insuranceData.receipt_image_name) {
      try {
        var uploadResult = uploadBase64FileToDrive(
          insuranceData.receipt_image_base64,
          insuranceData.receipt_image_name,
          'INSURANCE',
          insuranceData.receipt_image_mime || 'image/jpeg'
        );
        receiptImageUrl = uploadResult.fileUrl;
      } catch (uploadError) {
        Logger.log('Receipt upload error: ' + uploadError.toString());
      }
    }
    
    sheet.appendRow([
      insuranceId,
      insuranceData.car_id,
      insuranceData.insurance_type, // voluntary, etc.
      insuranceData.insurance_company,
      insuranceData.policy_number || '',
      insuranceData.amount,
      insuranceData.paid_date,
      insuranceData.expiry_date,
      insuranceData.coverage_details || '',
      receiptImageUrl,
      now,
      currentUser,
      insuranceData.notes || ''
    ]);
    
    // Schedule notification (3 months before expiry)
    scheduleInsuranceNotification(insuranceId, insuranceData.car_id, insuranceData.expiry_date);
    
    // Log creation
    logAudit(currentUser, 'create', 'insurance', insuranceId, {
      car_id: insuranceData.car_id,
      insurance_type: insuranceData.insurance_type,
      expiry_date: insuranceData.expiry_date
    });
    
    return successResponse({
      insurance_id: insuranceId
    }, 'บันทึกการเสียประกันภัยสำเร็จ');
    
  } catch (error) {
    Logger.log('Create insurance record error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการบันทึก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Schedule Tax Notification - ตั้งเวลาแจ้งเตือนภาษี (3 เดือนก่อนหมดอายุ)
 */
function scheduleTaxNotification(taxId, carId, expiryDate) {
  try {
    var expiry = parseDate(expiryDate);
    var notificationDate = new Date(expiry);
    notificationDate.setMonth(notificationDate.getMonth() - 3); // 3 months before
    
    // Store in NOTIFICATIONS sheet (will be checked daily)
    var sheet = getOrCreateSheet('NOTIFICATIONS', [
      'notification_id', 'type', 'entity_type', 'entity_id', 'car_id',
      'message', 'scheduled_date', 'sent', 'created_at'
    ]);
    
    var notificationId = generateUUID();
    var car = getVehicleById(carId);
    var carInfo = (car.success && car.data && car.data.vehicle) ? car.data.vehicle : null;
    var message = 'ภาษีรถ ' + (carInfo ? carInfo.license_plate : carId) + ' หมดอายุวันที่ ' + formatDateThai(expiryDate) + ' (อีก 3 เดือน)';
    
    sheet.appendRow([
      notificationId,
      'tax_expiry',
      'tax',
      taxId,
      carId,
      message,
      formatDate(notificationDate),
      'FALSE',
      new Date()
    ]);
    
  } catch (error) {
    Logger.log('Schedule tax notification error: ' + error.toString());
  }
}

/**
 * Schedule Insurance Notification - ตั้งเวลาแจ้งเตือนประกันภัย (3 เดือนก่อนหมดอายุ)
 */
function scheduleInsuranceNotification(insuranceId, carId, expiryDate) {
  try {
    var expiry = parseDate(expiryDate);
    var notificationDate = new Date(expiry);
    notificationDate.setMonth(notificationDate.getMonth() - 3); // 3 months before
    
    // Store in NOTIFICATIONS sheet
    var sheet = getOrCreateSheet('NOTIFICATIONS', [
      'notification_id', 'type', 'entity_type', 'entity_id', 'car_id',
      'message', 'scheduled_date', 'sent', 'created_at'
    ]);
    
    var notificationId = generateUUID();
    var car = getVehicleById(carId);
    var carInfo = (car.success && car.data && car.data.vehicle) ? car.data.vehicle : null;
    var message = 'ประกันภัยรถ ' + (carInfo ? carInfo.license_plate : carId) + ' หมดอายุวันที่ ' + formatDateThai(expiryDate) + ' (อีก 3 เดือน)';
    
    sheet.appendRow([
      notificationId,
      'insurance_expiry',
      'insurance',
      insuranceId,
      carId,
      message,
      formatDate(notificationDate),
      'FALSE',
      new Date()
    ]);
    
  } catch (error) {
    Logger.log('Schedule insurance notification error: ' + error.toString());
  }
}

/**
 * Get Tax Records - ดึงรายการภาษี
 */
function getTaxRecords(filters) {
  try {
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.TAX_RECORDS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ records: [] });
    }
    
    var records = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var record = rowToObject(row, headers);
      
      if (filters.car_id && record.car_id !== filters.car_id) {
        continue;
      }
      
      records.push(record);
    }
    
    // Sort by expiry_date ascending (closest expiry first)
    records.sort(function(a, b) {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    });
    
    return successResponse({ records: records });
    
  } catch (error) {
    Logger.log('Get tax records error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Insurance Records - ดึงรายการประกันภัย
 */
function getInsuranceRecords(filters) {
  try {
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.INSURANCE_RECORDS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ records: [] });
    }
    
    var records = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var record = rowToObject(row, headers);
      
      if (filters.car_id && record.car_id !== filters.car_id) {
        continue;
      }
      
      records.push(record);
    }
    
    // Sort by expiry_date ascending (closest expiry first)
    records.sort(function(a, b) {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    });
    
    return successResponse({ records: records });
    
  } catch (error) {
    Logger.log('Get insurance records error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Tax Record - แก้ไขบันทึกภาษี
 */
function updateTaxRecord(taxId, taxData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.TAX_RECORDS);
    var rowIndex = findRowIndexById(sheet, 0, taxId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบข้อมูลภาษี', 'TAX_RECORD_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'system';
    
    // Update fields (column indices: 1=tax_id, 2=car_id, 3=tax_type, 4=amount, 5=paid_date, 6=expiry_date, 7=receipt_image, 8=created_at, 9=created_by, 10=notes)
    if (taxData.car_id !== undefined) {
      sheet.getRange(rowIndex, 2).setValue(taxData.car_id);
    }
    if (taxData.tax_type !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(taxData.tax_type);
    }
    if (taxData.amount !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(taxData.amount);
    }
    if (taxData.paid_date !== undefined) {
      sheet.getRange(rowIndex, 5).setValue(taxData.paid_date);
    }
    if (taxData.expiry_date !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(taxData.expiry_date);
    }
    if (taxData.notes !== undefined) {
      sheet.getRange(rowIndex, 10).setValue(taxData.notes);
    }
    
    // Handle receipt image update
    if (taxData.receipt_image_base64 && taxData.receipt_image_name) {
      try {
        var uploadResult = uploadBase64FileToDrive(
          taxData.receipt_image_base64,
          taxData.receipt_image_name,
          'TAX',
          taxData.receipt_image_mime || 'image/jpeg'
        );
        sheet.getRange(rowIndex, 7).setValue(uploadResult.fileUrl);
      } catch (uploadError) {
        Logger.log('Receipt upload error: ' + uploadError.toString());
      }
    }
    
    // Update notification if expiry date changed
    if (taxData.expiry_date !== undefined) {
      var row = sheet.getRange(rowIndex, 1, 1, 10).getValues()[0];
      var carId = row[1]; // column 2
      scheduleTaxNotification(taxId, carId, taxData.expiry_date);
    }
    
    // Log update
    logAudit(currentUser, 'update', 'tax', taxId, taxData);
    
    return successResponse({}, 'อัปเดตบันทึกภาษีสำเร็จ');
    
  } catch (error) {
    Logger.log('Update tax record error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Insurance Record - แก้ไขบันทึกประกันภัย
 */
function updateInsuranceRecord(insuranceId, insuranceData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.INSURANCE_RECORDS);
    var rowIndex = findRowIndexById(sheet, 0, insuranceId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบข้อมูลประกันภัย', 'INSURANCE_RECORD_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'system';
    
    // Update fields (column indices: 1=insurance_id, 2=car_id, 3=insurance_type, 4=insurance_company, 5=policy_number,
    // 6=amount, 7=paid_date, 8=expiry_date, 9=coverage_details, 10=receipt_image, 11=created_at, 12=created_by, 13=notes)
    if (insuranceData.car_id !== undefined) {
      sheet.getRange(rowIndex, 2).setValue(insuranceData.car_id);
    }
    if (insuranceData.insurance_type !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(insuranceData.insurance_type);
    }
    if (insuranceData.insurance_company !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(insuranceData.insurance_company);
    }
    if (insuranceData.policy_number !== undefined) {
      sheet.getRange(rowIndex, 5).setValue(insuranceData.policy_number);
    }
    if (insuranceData.amount !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(insuranceData.amount);
    }
    if (insuranceData.paid_date !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(insuranceData.paid_date);
    }
    if (insuranceData.expiry_date !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(insuranceData.expiry_date);
    }
    if (insuranceData.coverage_details !== undefined) {
      sheet.getRange(rowIndex, 9).setValue(insuranceData.coverage_details);
    }
    if (insuranceData.notes !== undefined) {
      sheet.getRange(rowIndex, 13).setValue(insuranceData.notes);
    }
    
    // Handle receipt image update
    if (insuranceData.receipt_image_base64 && insuranceData.receipt_image_name) {
      try {
        var uploadResult = uploadBase64FileToDrive(
          insuranceData.receipt_image_base64,
          insuranceData.receipt_image_name,
          'INSURANCE',
          insuranceData.receipt_image_mime || 'image/jpeg'
        );
        sheet.getRange(rowIndex, 10).setValue(uploadResult.fileUrl);
      } catch (uploadError) {
        Logger.log('Receipt upload error: ' + uploadError.toString());
      }
    }
    
    // Update notification if expiry date changed
    if (insuranceData.expiry_date !== undefined) {
      var row = sheet.getRange(rowIndex, 1, 1, 13).getValues()[0];
      var carId = row[1]; // column 2
      scheduleInsuranceNotification(insuranceId, carId, insuranceData.expiry_date);
    }
    
    // Log update
    logAudit(currentUser, 'update', 'insurance', insuranceId, insuranceData);
    
    return successResponse({}, 'อัปเดตบันทึกประกันภัยสำเร็จ');
    
  } catch (error) {
    Logger.log('Update insurance record error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}
