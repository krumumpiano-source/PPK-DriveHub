/**
 * PPK DriveHub Vehicle Service
 * จัดการข้อมูลรถ
 */

/**
 * Create Vehicle - เพิ่มรถใหม่
 */
function createVehicle(vehicleData) {
  try {
    validateRequired(vehicleData, ['license_plate', 'brand', 'model']);
    
    // SECURITY: Sanitize string inputs to prevent XSS/injection
    if (vehicleData.license_plate) vehicleData.license_plate = sanitizeInput(String(vehicleData.license_plate));
    if (vehicleData.brand) vehicleData.brand = sanitizeInput(String(vehicleData.brand));
    if (vehicleData.model) vehicleData.model = sanitizeInput(String(vehicleData.model));
    if (vehicleData.color) vehicleData.color = sanitizeInput(String(vehicleData.color));
    if (vehicleData.notes) vehicleData.notes = sanitizeInput(String(vehicleData.notes));
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.CARS, [
      'car_id', 'license_plate', 'province', 'brand', 'model', 'year', 'color',
      'fuel_type', 'vehicle_type', 'seat_count', 'vehicle_category', 'status', 'qr_code',
      'vehicle_images', 'registration_book_image', 'registration_number',
      'chassis_number', 'engine_number', 'registration_date', 'registration_expiry',
      'owner_name', 'owner_address', 'mileage', 'created_at', 'created_by',
      'updated_at', 'notes', 'active'
    ]);
    
    // Check if license plate already exists
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === vehicleData.license_plate) {
        return errorResponse('ทะเบียนรถนี้มีอยู่ในระบบแล้ว', 'DUPLICATE_LICENSE');
      }
    }
    
    var carId = vehicleData.car_id || generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'admin';
    
    // Generate QR code data (URL to QR page)
    var qrCode = CONFIG.QR_CODE_BASE_URL + '?car=' + carId;
    
    // Convert vehicle_images array to JSON string or comma-separated
    var vehicleImages = '';
    if (vehicleData.vehicle_images) {
      if (Array.isArray(vehicleData.vehicle_images)) {
        vehicleImages = JSON.stringify(vehicleData.vehicle_images);
      } else {
        vehicleImages = vehicleData.vehicle_images;
      }
    }
    
    sheet.appendRow([
      carId,
      vehicleData.license_plate,
      vehicleData.province || '', // จังหวัด
      vehicleData.brand,
      vehicleData.model,
      vehicleData.year || '',
      vehicleData.color || '',
      vehicleData.fuel_type || 'gasoline',
      vehicleData.vehicle_type || '', // ประเภทรถ
      vehicleData.seat_count || '', // จำนวนที่นั่ง
      vehicleData.vehicle_category || 'primary', // vehicle_category: 'primary' / 'support'
      'available',
      qrCode,
      vehicleImages, // รูปรถ (JSON array หรือ comma-separated)
      vehicleData.registration_book_image || '', // รูปเล่มทะเบียน
      vehicleData.registration_number || '', // เลขทะเบียน
      vehicleData.chassis_number || '', // เลขตัวถัง (VIN)
      vehicleData.engine_number || '', // เลขเครื่องยนต์
      vehicleData.registration_date || '', // วันที่จดทะเบียน
      vehicleData.registration_expiry || '', // วันหมดอายุทะเบียน
      vehicleData.owner_name || '', // ชื่อเจ้าของรถ
      vehicleData.owner_address || '', // ที่อยู่เจ้าของรถ
      vehicleData.mileage || 0, // เลขไมล์ปัจจุบัน
      now,
      currentUser,
      now,
      vehicleData.notes || '',
      'TRUE'
    ]);
    
    // Log creation
    logAudit(currentUser, 'create', 'car', carId, vehicleData);
    
    // Get maintenance schedule for this vehicle
    var schedule = getMaintenanceScheduleForVehicle(vehicleData.brand, vehicleData.model);
    var scheduleInfo = '';
    if (schedule) {
      scheduleInfo = ' (พบตารางการบำรุงรักษาจากคู่มือรถ)';
    }
    
    return successResponse({
      car_id: carId,
      qr_code: qrCode,
      maintenance_schedule: schedule ? {
        default_interval_km: schedule.default_interval_km,
        default_interval_months: schedule.default_interval_months,
        has_schedule: true
      } : null
    }, 'เพิ่มรถสำเร็จ' + scheduleInfo);
    
  } catch (error) {
    Logger.log('Create vehicle error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการเพิ่มรถ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Vehicles - ดึงรายการรถ
 * สำหรับจัดคิว: กรองรถที่ status = unavailable (งดใช้งาน) ออก
 */
function getVehicles(filters) {
  try {
    // Require authentication (except for public QR endpoints)
    // Note: Some endpoints like QR scanning may not require auth
    // This is a read-only operation, so we allow it but log it
    try {
      requireAuth();
    } catch (e) {
      // If auth fails, allow but log (for QR public access)
      Logger.log('getVehicles called without auth - may be public QR access');
    }
    
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.CARS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ vehicles: [] });
    }
    
    var vehicles = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var vehicle = rowToObject(row, headers);
      
      // Parse vehicle_images if it's JSON string
      if (vehicle.vehicle_images) {
        try {
          if (typeof vehicle.vehicle_images === 'string' && vehicle.vehicle_images.startsWith('[')) {
            vehicle.vehicle_images = JSON.parse(vehicle.vehicle_images);
          } else if (typeof vehicle.vehicle_images === 'string' && vehicle.vehicle_images.includes(',')) {
            vehicle.vehicle_images = vehicle.vehicle_images.split(',').map(function(url) { return url.trim(); });
          } else if (typeof vehicle.vehicle_images === 'string') {
            vehicle.vehicle_images = [vehicle.vehicle_images];
          }
        } catch (e) {
          vehicle.vehicle_images = [];
        }
      } else {
        vehicle.vehicle_images = [];
      }
      
      // Apply filters
      if (filters.status && vehicle.status !== filters.status) {
        continue;
      }
      if (filters.active !== undefined) {
        var active = vehicle.active === true || vehicle.active === 'TRUE';
        if (filters.active !== active) {
          continue;
        }
      }
      if (filters.fuel_type && vehicle.fuel_type !== filters.fuel_type) {
        continue;
      }
      
      // For queue selection: exclude unavailable vehicles (unless explicitly requested)
      if (filters.for_queue_selection !== false && vehicle.status === 'unavailable') {
        continue; // Don't show unavailable vehicles in queue selection
      }
      
      vehicles.push(vehicle);
    }
    
    return successResponse({ vehicles: vehicles });
    
  } catch (error) {
    Logger.log('Get vehicles error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Vehicle By ID
 */
function getVehicleById(carId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.CARS);
    var rowIndex = findRowIndexById(sheet, 0, carId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบรถ', 'VEHICLE_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 28).getValues()[0];
    var headers = [
      'car_id', 'license_plate', 'province', 'brand', 'model', 'year', 'color',
      'fuel_type', 'vehicle_type', 'seat_count', 'vehicle_category', 'status', 'qr_code',
      'vehicle_images', 'registration_book_image', 'registration_number',
      'chassis_number', 'engine_number', 'registration_date', 'registration_expiry',
      'owner_name', 'owner_address', 'mileage', 'created_at', 'created_by',
      'updated_at', 'notes', 'active'
    ];
    
    // Parse vehicle_images if it's JSON string
    var vehicle = rowToObject(row, headers);
    if (vehicle.vehicle_images) {
      try {
        if (typeof vehicle.vehicle_images === 'string' && vehicle.vehicle_images.startsWith('[')) {
          vehicle.vehicle_images = JSON.parse(vehicle.vehicle_images);
        } else if (typeof vehicle.vehicle_images === 'string' && vehicle.vehicle_images.includes(',')) {
          vehicle.vehicle_images = vehicle.vehicle_images.split(',').map(function(url) { return url.trim(); });
        } else if (typeof vehicle.vehicle_images === 'string') {
          vehicle.vehicle_images = [vehicle.vehicle_images];
        }
      } catch (e) {
        vehicle.vehicle_images = [];
      }
    } else {
      vehicle.vehicle_images = [];
    }
    
    // vehicle already parsed above
    
    return successResponse({ vehicle: vehicle });
    
  } catch (error) {
    Logger.log('Get vehicle by ID error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Vehicle - แก้ไขข้อมูลรถ
 */
function updateVehicle(carId, vehicleData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.CARS);
    var rowIndex = findRowIndexById(sheet, 0, carId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบรถ', 'VEHICLE_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Update fields
    if (vehicleData.license_plate !== undefined) {
      sheet.getRange(rowIndex, 2).setValue(vehicleData.license_plate);
    }
    if (vehicleData.province !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(vehicleData.province);
    }
    if (vehicleData.brand !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(vehicleData.brand);
    }
    if (vehicleData.model !== undefined) {
      sheet.getRange(rowIndex, 5).setValue(vehicleData.model);
    }
    if (vehicleData.year !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(vehicleData.year);
    }
    if (vehicleData.color !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(vehicleData.color);
    }
    if (vehicleData.fuel_type !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(vehicleData.fuel_type);
    }
    if (vehicleData.vehicle_type !== undefined) {
      sheet.getRange(rowIndex, 9).setValue(vehicleData.vehicle_type);
    }
    if (vehicleData.seat_count !== undefined) {
      sheet.getRange(rowIndex, 10).setValue(vehicleData.seat_count);
    }
    if (vehicleData.vehicle_category !== undefined) {
      sheet.getRange(rowIndex, 11).setValue(vehicleData.vehicle_category);
    }
    if (vehicleData.status !== undefined) {
      sheet.getRange(rowIndex, 12).setValue(vehicleData.status);
    }
    if (vehicleData.vehicle_images !== undefined) {
      var vehicleImages = '';
      if (Array.isArray(vehicleData.vehicle_images)) {
        vehicleImages = JSON.stringify(vehicleData.vehicle_images);
      } else {
        vehicleImages = vehicleData.vehicle_images;
      }
      sheet.getRange(rowIndex, 14).setValue(vehicleImages);
    }
    if (vehicleData.registration_book_image !== undefined) {
      sheet.getRange(rowIndex, 15).setValue(vehicleData.registration_book_image);
    }
    if (vehicleData.registration_number !== undefined) {
      sheet.getRange(rowIndex, 16).setValue(vehicleData.registration_number);
    }
    if (vehicleData.chassis_number !== undefined) {
      sheet.getRange(rowIndex, 17).setValue(vehicleData.chassis_number);
    }
    if (vehicleData.engine_number !== undefined) {
      sheet.getRange(rowIndex, 18).setValue(vehicleData.engine_number);
    }
    if (vehicleData.registration_date !== undefined) {
      sheet.getRange(rowIndex, 19).setValue(vehicleData.registration_date);
    }
    if (vehicleData.registration_expiry !== undefined) {
      sheet.getRange(rowIndex, 20).setValue(vehicleData.registration_expiry);
    }
    if (vehicleData.owner_name !== undefined) {
      sheet.getRange(rowIndex, 21).setValue(vehicleData.owner_name);
    }
    if (vehicleData.owner_address !== undefined) {
      sheet.getRange(rowIndex, 22).setValue(vehicleData.owner_address);
    }
    if (vehicleData.mileage !== undefined) {
      sheet.getRange(rowIndex, 23).setValue(vehicleData.mileage);
    }
    if (vehicleData.notes !== undefined) {
      sheet.getRange(rowIndex, 27).setValue(vehicleData.notes);
    }
    if (vehicleData.active !== undefined) {
      sheet.getRange(rowIndex, 28).setValue(vehicleData.active ? 'TRUE' : 'FALSE');
    }
    
    // Update updated_at
    sheet.getRange(rowIndex, 26).setValue(now);
    
    // Log update
    logAudit(currentUser, 'update', 'car', carId, vehicleData);
    
    return successResponse({}, 'อัปเดตข้อมูลรถสำเร็จ');
    
  } catch (error) {
    Logger.log('Update vehicle error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Deactivate Vehicle - ปิดการใช้งานรถ
 */
function deactivateVehicle(carId, reason) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.CARS);
    var rowIndex = findRowIndexById(sheet, 0, carId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบรถ', 'VEHICLE_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Set active to FALSE
    sheet.getRange(rowIndex, 27).setValue('FALSE'); // active column
    sheet.getRange(rowIndex, 11).setValue('unavailable'); // status column
    sheet.getRange(rowIndex, 25).setValue(now); // updated_at column
    
    // Add reason to notes
    if (reason) {
      var currentNotes = sheet.getRange(rowIndex, 26).getValue(); // notes column
      var newNotes = currentNotes + '\n[ปิดการใช้งาน: ' + formatDate(now) + '] ' + reason;
      sheet.getRange(rowIndex, 26).setValue(newNotes);
    }
    
    // Log deactivation
    logAudit(currentUser, 'update', 'car', carId, {
      action: 'deactivate',
      reason: reason
    });
    
    return successResponse({}, 'ปิดการใช้งานรถสำเร็จ');
    
  } catch (error) {
    Logger.log('Deactivate vehicle error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการปิดการใช้งาน: ' + error.toString(), 'SERVER_ERROR');
  }
}
