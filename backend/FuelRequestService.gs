/**
 * PPK DriveHub Fuel Request Service
 * จัดการใบสั่งเติมน้ำมัน (ตามระเบียบ)
 * 
 * อ้างอิง:
 * - ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560
 * - ระเบียบกระทรวงศึกษาธิการว่าด้วยการเงิน การคลัง และการพัสดุของสถานศึกษา พ.ศ. 2562
 */

/**
 * Create Fuel Request - สร้างใบสั่งเติมน้ำมัน
 * พนักงานขับรถกรอกเพื่อขออนุมัติเติมน้ำมัน
 */
function createFuelRequest(requestData) {
  try {
    validateRequired(requestData, ['request_date', 'car_id', 'driver_id', 'fuel_type', 'liters_requested', 'purpose', 'mileage_before']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.FUEL_REQUESTS, [
      'request_id', 'request_date', 'car_id', 'driver_id', 'fuel_type',
      'liters_requested', 'purpose', 'mileage_before', 'status',
      'approved_by', 'approved_at', 'rejected_reason', 'created_at', 'created_by', 'notes'
    ]);
    
    var requestId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'system';
    
    // Validate fuel type
    if (!CONFIG.FUEL_TYPES[requestData.fuel_type]) {
      return errorResponse('ประเภทน้ำมันไม่ถูกต้อง', 'INVALID_FUEL_TYPE');
    }
    
    // Validate mileage
    var mileageBefore = parseInt(requestData.mileage_before) || 0;
    if (mileageBefore <= 0) {
      return errorResponse('เลขไมล์ก่อนเติมต้องมากกว่า 0', 'INVALID_MILEAGE');
    }
    
    sheet.appendRow([
      requestId,
      requestData.request_date,
      requestData.car_id,
      requestData.driver_id,
      requestData.fuel_type,
      parseFloat(requestData.liters_requested || 0),
      requestData.purpose || '',
      mileageBefore,
      'pending', // status
      '', // approved_by
      '', // approved_at
      '', // rejected_reason
      now,
      currentUser,
      requestData.notes || ''
    ]);
    
    // Log creation
    logAudit(currentUser, 'create', 'fuel_request', requestId, {
      car_id: requestData.car_id,
      driver_id: requestData.driver_id,
      fuel_type: requestData.fuel_type,
      liters_requested: requestData.liters_requested,
      purpose: requestData.purpose
    });
    
    return successResponse({
      request_id: requestId
    }, 'สร้างใบสั่งเติมน้ำมันสำเร็จ (รอการอนุมัติ)');
    
  } catch (error) {
    Logger.log('Create fuel request error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการสร้างใบสั่ง: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Approve Fuel Request - อนุมัติใบสั่งเติมน้ำมัน
 * กลุ่มงานยานพาหนะ/ผู้มีอำนาจอนุมัติ
 */
function approveFuelRequest(requestId, approvalData) {
  try {
    requireAdmin(); // หรือตรวจสอบสิทธิ์ผู้มีอำนาจอนุมัติ
    
    var sheet = getSheet(CONFIG.SHEETS.FUEL_REQUESTS);
    var rowIndex = findRowIndexById(sheet, 0, requestId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบใบสั่งเติมน้ำมัน', 'FUEL_REQUEST_NOT_FOUND');
    }
    
    var currentStatus = sheet.getRange(rowIndex, 9).getValue();
    if (currentStatus !== 'pending') {
      return errorResponse('ใบสั่งเติมน้ำมันนี้ได้รับการอนุมัติหรือปฏิเสธแล้ว', 'INVALID_STATUS');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Update status to approved
    sheet.getRange(rowIndex, 9).setValue('approved');
    sheet.getRange(rowIndex, 10).setValue(currentUser); // approved_by
    sheet.getRange(rowIndex, 11).setValue(now); // approved_at
    
    if (approvalData && approvalData.notes) {
      var currentNotes = sheet.getRange(rowIndex, 15).getValue();
      var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
      sheet.getRange(rowIndex, 15).setValue(currentNotes + '\n[อนุมัติ: ' + dateStr + '] ' + approvalData.notes);
    }
    
    // Log approval
    logAudit(currentUser, 'approve', 'fuel_request', requestId, {
      status: 'pending'
    }, {
      status: 'approved'
    }, {}, 'อนุมัติใบสั่งเติมน้ำมัน');
    
    return successResponse({
      request_id: requestId
    }, 'อนุมัติใบสั่งเติมน้ำมันสำเร็จ');
    
  } catch (error) {
    Logger.log('Approve fuel request error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอนุมัติ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Reject Fuel Request - ปฏิเสธใบสั่งเติมน้ำมัน
 */
function rejectFuelRequest(requestId, rejectionData) {
  try {
    requireAdmin();
    
    validateRequired(rejectionData, ['reason']);
    
    var sheet = getSheet(CONFIG.SHEETS.FUEL_REQUESTS);
    var rowIndex = findRowIndexById(sheet, 0, requestId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบใบสั่งเติมน้ำมัน', 'FUEL_REQUEST_NOT_FOUND');
    }
    
    var currentStatus = sheet.getRange(rowIndex, 9).getValue();
    if (currentStatus !== 'pending') {
      return errorResponse('ใบสั่งเติมน้ำมันนี้ได้รับการอนุมัติหรือปฏิเสธแล้ว', 'INVALID_STATUS');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Update status to rejected
    sheet.getRange(rowIndex, 9).setValue('rejected');
    sheet.getRange(rowIndex, 10).setValue(currentUser); // approved_by (rejecter)
    sheet.getRange(rowIndex, 11).setValue(now); // approved_at (rejected_at)
    sheet.getRange(rowIndex, 12).setValue(rejectionData.reason); // rejected_reason
    
    // Log rejection
    logAudit(currentUser, 'reject', 'fuel_request', requestId, {
      status: 'pending'
    }, {
      status: 'rejected',
      reason: rejectionData.reason
    }, {}, 'ปฏิเสธใบสั่งเติมน้ำมัน');
    
    return successResponse({
      request_id: requestId
    }, 'ปฏิเสธใบสั่งเติมน้ำมันสำเร็จ');
    
  } catch (error) {
    Logger.log('Reject fuel request error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการปฏิเสธ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Fuel Requests - ดึงรายการใบสั่งเติมน้ำมัน
 */
function getFuelRequests(filters) {
  try {
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.FUEL_REQUESTS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ requests: [] });
    }
    
    var requests = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var request = rowToObject(row, headers);
      
      // Apply filters
      if (filters.status && request.status !== filters.status) {
        continue;
      }
      if (filters.car_id && request.car_id !== filters.car_id) {
        continue;
      }
      if (filters.driver_id && request.driver_id !== filters.driver_id) {
        continue;
      }
      if (filters.date_from && request.request_date < filters.date_from) {
        continue;
      }
      if (filters.date_to && request.request_date > filters.date_to) {
        continue;
      }
      
      requests.push(request);
    }
    
    // Sort by date descending
    requests.sort(function(a, b) {
      return b.request_date.localeCompare(a.request_date);
    });
    
    return successResponse({ requests: requests });
    
  } catch (error) {
    Logger.log('Get fuel requests error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Fuel Request By ID
 */
function getFuelRequestById(requestId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.FUEL_REQUESTS);
    var rowIndex = findRowIndexById(sheet, 0, requestId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบใบสั่งเติมน้ำมัน', 'FUEL_REQUEST_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
    var headers = [
      'request_id', 'request_date', 'car_id', 'driver_id', 'fuel_type',
      'liters_requested', 'purpose', 'mileage_before', 'status',
      'approved_by', 'approved_at', 'rejected_reason', 'created_at', 'created_by', 'notes'
    ];
    
    var request = rowToObject(row, headers);
    
    return successResponse({ request: request });
    
  } catch (error) {
    Logger.log('Get fuel request by ID error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}
