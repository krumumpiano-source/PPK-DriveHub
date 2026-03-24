/**
 * PPK DriveHub Fuel Service
 * จัดการบันทึกน้ำมัน
 */

/**
 * Create Fuel Log - บันทึกการเติมน้ำมัน
 * ใช้สำหรับบันทึกข้อมูลเพื่อคำนวณอัตราการสิ้นเปลืองและวิเคราะห์
 */
function createFuelLog(fuelData) {
  try {
    validateRequired(fuelData, ['date', 'car_id', 'driver_id', 'mileage_before', 'liters', 'fuel_type']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.FUEL_LOG, [
      'fuel_id', 'date', 'time', 'car_id', 'driver_id',
      'mileage_before', 'mileage_after', 'liters', 'price_per_liter', 'amount',
      'fuel_type', 'gas_station_name', 'gas_station_address', 'gas_station_tax_id',
      'receipt_number', 'receipt_image', 'receipt_pdf',
      'fuel_consumption_rate', 'created_at', 'created_by', 'updated_at', 'notes', 'expense_type'
    ]);
    
    var fuelId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'system';
    
    // Validate fuel type
    if (!CONFIG.FUEL_TYPES[fuelData.fuel_type]) {
      return errorResponse('ประเภทน้ำมันไม่ถูกต้อง', 'INVALID_FUEL_TYPE');
    }
    
    // Validate mileage (เลขไมล์รถขณะเติมน้ำมัน; mileage_after ไม่บังคับ — ถ้าไม่ส่งให้ใช้ค่าเดียวกับ mileage_before)
    var mileageBefore = parseInt(fuelData.mileage_before) || 0;
    var mileageAfter = (fuelData.mileage_after !== undefined && fuelData.mileage_after !== '') ? parseInt(fuelData.mileage_after) : mileageBefore;
    if (mileageBefore < 0) {
      return errorResponse('เลขไมล์รถขณะเติมน้ำมันต้องไม่ต่ำกว่า 0', 'INVALID_MILEAGE');
    }
    if (mileageAfter < mileageBefore) {
      return errorResponse('เลขไมล์หลังเติมต้องมากกว่าหรือเท่ากับเลขไมล์ขณะเติม', 'INVALID_MILEAGE');
    }
    
    // Calculate price per liter and total amount
    var pricePerLiter = parseFloat(fuelData.price_per_liter || 0);
    var liters = parseFloat(fuelData.liters || 0);
    var amount = fuelData.amount || (pricePerLiter * liters);
    
    if (liters <= 0) {
      return errorResponse('ปริมาณน้ำมันต้องมากกว่า 0', 'INVALID_LITERS');
    }
    
    // Calculate fuel consumption rate
    var fuelConsumptionRate = calculateFuelConsumptionRate(fuelData.car_id, mileageBefore, mileageAfter, liters);
    
    // Upload receipt image if provided
    var receiptImageUrl = '';
    var receiptPdfUrl = '';
    if (fuelData.receipt_image_base64 && fuelData.receipt_image_name) {
      try {
        var uploadResult = uploadBase64FileToDrive(
          fuelData.receipt_image_base64,
          fuelData.receipt_image_name,
          'FUEL',
          fuelData.receipt_image_mime || 'image/jpeg'
        );
        receiptImageUrl = uploadResult.fileUrl;
      } catch (uploadError) {
        Logger.log('Receipt image upload error: ' + uploadError.toString());
      }
    }
    if (fuelData.receipt_pdf_base64 && fuelData.receipt_pdf_name) {
      try {
        var pdfUploadResult = uploadBase64FileToDrive(
          fuelData.receipt_pdf_base64,
          fuelData.receipt_pdf_name,
          'FUEL',
          'application/pdf'
        );
        receiptPdfUrl = pdfUploadResult.fileUrl;
      } catch (uploadError) {
        Logger.log('Receipt PDF upload error: ' + uploadError.toString());
      }
    }
    
    // Extract time from datetime or use current time
    var fillTime = fuelData.time || (function() {
      var hours = String(now.getHours()).padStart(2, '0');
      var minutes = String(now.getMinutes()).padStart(2, '0');
      return hours + ':' + minutes;
    })();
    
    sheet.appendRow([
      fuelId,
      fuelData.date,
      fillTime, // time
      fuelData.car_id,
      fuelData.driver_id,
      mileageBefore, // mileage_before
      mileageAfter, // mileage_after (ถ้าไม่ส่ง = mileage_before)
      liters,
      pricePerLiter,
      amount,
      fuelData.fuel_type,
      fuelData.gas_station_name || '',
      fuelData.gas_station_address || '',
      fuelData.gas_station_tax_id || '',
      fuelData.receipt_number || '',
      receiptImageUrl,
      receiptPdfUrl,
      fuelConsumptionRate || '',
      now,
      currentUser,
      now,
      fuelData.notes || '',
      fuelData.expense_type || '' // เบิกจ่ายจากงานพัสดุ (procurement) / งบไปราชการ (official_travel)
    ]);
    
    // Log creation
    logAudit(currentUser, 'create', 'fuel', fuelId, {
      car_id: fuelData.car_id,
      driver_id: fuelData.driver_id,
      amount: amount,
      liters: liters,
      fuel_type: fuelData.fuel_type
    });
    
    return successResponse({
      fuel_id: fuelId,
      fuel_consumption_rate: fuelConsumptionRate,
      message: 'บันทึกการเติมน้ำมันสำเร็จ'
    }, 'บันทึกการเติมน้ำมันสำเร็จ');
    
  } catch (error) {
    Logger.log('Create fuel log error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการบันทึก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Calculate fuel consumption rate (km/liter)
 * คำนวณจากเลขไมล์ก่อนและหลังเติมน้ำมัน
 */
function calculateFuelConsumptionRate(carId, mileageBefore, mileageAfter, liters) {
  try {
    if (!mileageBefore || !mileageAfter || !liters) {
      return null;
    }
    
    var mileageDiff = parseFloat(mileageAfter) - parseFloat(mileageBefore);
    if (mileageDiff > 0 && liters > 0) {
      var rate = mileageDiff / parseFloat(liters);
      return Math.round(rate * 100) / 100; // Round to 2 decimal places
    }
    
    return null;
  } catch (error) {
    Logger.log('Calculate fuel consumption error: ' + error.toString());
    return null;
  }
}

/**
 * Get Fuel Types - ดึงประเภทน้ำมันทั้งหมด
 */
function getFuelTypes() {
  try {
    var fuelTypes = [];
    for (var key in CONFIG.FUEL_TYPES) {
      fuelTypes.push({
        id: key,
        name: CONFIG.FUEL_TYPES[key].name,
        price_per_liter: CONFIG.FUEL_TYPES[key].price_per_liter
      });
    }
    return successResponse({ fuel_types: fuelTypes });
  } catch (error) {
    Logger.log('Get fuel types error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Fuel Logs - ดึงรายการบันทึกน้ำมัน
 */
function getFuelLogs(filters) {
  try {
    // Require authentication
    requireAuth();
    var currentUserId = getCurrentUser();
    if (!currentUserId) {
      return errorResponse('ต้องล็อกอินก่อนใช้งาน', 'AUTHENTICATION_REQUIRED');
    }
    
    // Check if user is admin or has module permission
    var canViewAll = false;
    var driverId = null;
    
    try {
      var userResult = getCurrentUserInfo(currentUserId);
      if (userResult.success && userResult.data.user) {
        var user = userResult.data.user;
        if (user.role === 'admin') {
          canViewAll = true;
        } else if (hasModulePermission(currentUserId, 'fuel', 'view')) {
          canViewAll = true;
        } else {
          // Try to find driver_id by matching name with driver
          var driversResult = getDrivers({});
          if (driversResult.success) {
            var drivers = driversResult.data.drivers;
            for (var d = 0; d < drivers.length; d++) {
              if (drivers[d].full_name === user.full_name) {
                driverId = drivers[d].driver_id;
                break;
              }
            }
          }
          // If no driver_id found, return empty (no permission)
          if (!driverId) {
            return errorResponse('ไม่มีสิทธิ์ดูรายการน้ำมัน', 'NO_PERMISSION');
          }
        }
      }
    } catch (permError) {
      Logger.log('Error checking permissions in getFuelLogs: ' + permError.toString());
    }
    
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.FUEL_LOG);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ fuel_logs: [] });
    }
    
    var fuelLogs = [];
    var headers = data[0];
    
    // Find driver_id column index
    var driverIdColIndex = headers.indexOf('driver_id');
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var fuelLog = rowToObject(row, headers);
      
      // Apply permission filter: if user is driver (not admin), filter by driver_id
      if (!canViewAll && driverId && driverIdColIndex >= 0) {
        var logDriverId = row[driverIdColIndex];
        if (logDriverId !== driverId) {
          continue; // Skip records not belonging to this driver
        }
      }
      
      // Apply filters
      if (filters.car_id && fuelLog.car_id !== filters.car_id) {
        continue;
      }
      if (filters.driver_id && fuelLog.driver_id !== filters.driver_id) {
        continue;
      }
      if (filters.date_from && fuelLog.date < filters.date_from) {
        continue;
      }
      if (filters.date_to && fuelLog.date > filters.date_to) {
        continue;
      }
      
      fuelLogs.push(fuelLog);
    }
    
    // Sort by date descending
    fuelLogs.sort(function(a, b) {
      return b.date.localeCompare(a.date);
    });
    
    return successResponse({ fuel_logs: fuelLogs });
    
  } catch (error) {
    Logger.log('Get fuel logs error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Fuel Log By ID
 */
function getFuelLogById(fuelId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.FUEL_LOG);
    var rowIndex = findRowIndexById(sheet, 0, fuelId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบบันทึกน้ำมัน', 'FUEL_LOG_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 23).getValues()[0];
    var headers = [
      'fuel_id', 'date', 'time', 'car_id', 'driver_id',
      'mileage_before', 'mileage_after', 'liters', 'price_per_liter', 'amount',
      'fuel_type', 'gas_station_name', 'gas_station_address', 'gas_station_tax_id',
      'receipt_number', 'receipt_image', 'receipt_pdf',
      'fuel_consumption_rate', 'created_at', 'created_by', 'updated_at', 'notes', 'expense_type'
    ];
    
    var fuelLog = rowToObject(row, headers);
    
    return successResponse({ fuel_log: fuelLog });
    
  } catch (error) {
    Logger.log('Get fuel log by ID error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Fuel Log - แก้ไขบันทึกน้ำมัน (Admin only)
 */
function updateFuelLog(fuelId, fuelData) {
  try {
    requireAdmin();
    
    var sheet = getSheet(CONFIG.SHEETS.FUEL_LOG);
    var rowIndex = findRowIndexById(sheet, 0, fuelId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบบันทึกน้ำมัน', 'FUEL_LOG_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Get old values for audit
    var oldRow = sheet.getRange(rowIndex, 1, 1, 23).getValues()[0];
    var oldValues = {
      liters: oldRow[7],
      amount: oldRow[9],
      mileage_before: oldRow[5],
      mileage_after: oldRow[6]
    };
    
    // Update fields
    if (fuelData.date !== undefined) {
      sheet.getRange(rowIndex, 2).setValue(fuelData.date);
    }
    if (fuelData.time !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(fuelData.time);
    }
    if (fuelData.mileage_before !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(fuelData.mileage_before);
    }
    if (fuelData.mileage_after !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(fuelData.mileage_after);
    }
    if (fuelData.liters !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(fuelData.liters);
    }
    if (fuelData.price_per_liter !== undefined) {
      sheet.getRange(rowIndex, 9).setValue(fuelData.price_per_liter);
    }
    if (fuelData.amount !== undefined) {
      sheet.getRange(rowIndex, 10).setValue(fuelData.amount);
    }
    if (fuelData.gas_station_name !== undefined) {
      sheet.getRange(rowIndex, 12).setValue(fuelData.gas_station_name);
    }
    if (fuelData.gas_station_address !== undefined) {
      sheet.getRange(rowIndex, 13).setValue(fuelData.gas_station_address);
    }
    if (fuelData.gas_station_tax_id !== undefined) {
      sheet.getRange(rowIndex, 14).setValue(fuelData.gas_station_tax_id);
    }
    if (fuelData.receipt_number !== undefined) {
      sheet.getRange(rowIndex, 15).setValue(fuelData.receipt_number);
    }
    if (fuelData.notes !== undefined) {
      sheet.getRange(rowIndex, 22).setValue(fuelData.notes);
    }
    if (fuelData.expense_type !== undefined) {
      sheet.getRange(rowIndex, 23).setValue(fuelData.expense_type);
    }
    
    // Recalculate fuel consumption rate if mileage changed
    if (fuelData.mileage_before !== undefined || fuelData.mileage_after !== undefined || fuelData.liters !== undefined) {
      var mileageBefore = fuelData.mileage_before !== undefined ? fuelData.mileage_before : oldRow[6];
      var mileageAfter = fuelData.mileage_after !== undefined ? fuelData.mileage_after : oldRow[7];
      var liters = fuelData.liters !== undefined ? fuelData.liters : oldRow[8];
      var carId = oldRow[4];
      
      var fuelConsumptionRate = calculateFuelConsumptionRate(carId, mileageBefore, mileageAfter, liters);
      if (fuelConsumptionRate) {
        sheet.getRange(rowIndex, 18).setValue(fuelConsumptionRate);
      }
    }
    
    // Handle receipt image update
    if (fuelData.receipt_image_base64 && fuelData.receipt_image_name) {
      try {
        var uploadResult = uploadBase64FileToDrive(
          fuelData.receipt_image_base64,
          fuelData.receipt_image_name,
          'FUEL',
          fuelData.receipt_image_mime || 'image/jpeg'
        );
        sheet.getRange(rowIndex, 16).setValue(uploadResult.fileUrl);
      } catch (uploadError) {
        Logger.log('Receipt upload error: ' + uploadError.toString());
      }
    }
    
    // Update updated_at
    sheet.getRange(rowIndex, 21).setValue(now);
    
    // Log update with old/new values
    logAudit(currentUser, 'update', 'fuel', fuelId, oldValues, fuelData);
    
    return successResponse({}, 'อัปเดตบันทึกน้ำมันสำเร็จ');
    
  } catch (error) {
    Logger.log('Update fuel log error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}
