/**
 * PPK DriveHub Queue Helper Service
 * ฟังก์ชันช่วยเหลือสำหรับการจัดคิว
 * - ตรวจสอบรถที่พร้อมใช้งาน
 * - ตรวจสอบคนขับที่พร้อมใช้งาน
 * - แจ้งเตือนความเมื่อยล้า
 */

/**
 * Get Available Vehicles for Queue - ดึงรถที่พร้อมใช้งานสำหรับจัดคิว
 * กรอง: unavailable, repair, scheduled for repair
 */
function getAvailableVehiclesForQueue(date) {
  try {
    date = date || formatDate(new Date());
    
    // Get all active vehicles
    var vehiclesResult = getVehicles({ active: true, for_queue_selection: true });
    if (!vehiclesResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลรถได้', 'VEHICLE_FETCH_ERROR');
    }
    
    var vehicles = vehiclesResult.data.vehicles;
    var availableVehicles = [];
    
    for (var i = 0; i < vehicles.length; i++) {
      var vehicle = vehicles[i];
      
      // Skip unavailable vehicles
      if (vehicle.status === 'unavailable' || vehicle.status === 'repair') {
        continue;
      }
      
      // Check if scheduled for repair
      var scheduledRepair = isCarScheduledForRepair(vehicle.car_id, date);
      if (scheduledRepair.scheduled) {
        continue;
      }
      
      availableVehicles.push(vehicle);
    }
    
    return successResponse({
      vehicles: availableVehicles,
      date: date,
      total: availableVehicles.length
    });
    
  } catch (error) {
    Logger.log('Get available vehicles for queue error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Available Drivers for Queue - ดึงคนขับที่พร้อมใช้งานสำหรับจัดคิว
 * กรอง: inactive, on leave (approved), fatigue warning
 */
function getAvailableDriversForQueue(date) {
  try {
    date = date || formatDate(new Date());
    
    // Get all active drivers
    var driversResult = getDrivers({ status: 'active', for_queue_selection: true, check_date: date });
    if (!driversResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลคนขับได้', 'DRIVER_FETCH_ERROR');
    }
    
    var drivers = driversResult.data.drivers;
    var availableDrivers = [];
    var driversWithWarnings = [];
    
    for (var i = 0; i < drivers.length; i++) {
      var driver = drivers[i];
      
      // Check fatigue warning
      var fatigueWarning = checkDriverFatigueStatus(driver.driver_id, date);
      
      var driverInfo = {
        driver_id: driver.driver_id,
        full_name: driver.full_name,
        phone: driver.phone,
        license_number: driver.license_number,
        available: true
      };
      
      if (fatigueWarning.fatigued && fatigueWarning.warning) {
        driverInfo.fatigue_warning = {
          message: fatigueWarning.warning.message,
          recommendation: fatigueWarning.warning.recommendation,
          distance: fatigueWarning.warning.distance,
          allow_override: true
        };
        driversWithWarnings.push(driverInfo);
      } else {
        availableDrivers.push(driverInfo);
      }
    }
    
    return successResponse({
      drivers: availableDrivers,
      drivers_with_warnings: driversWithWarnings,
      date: date,
      total_available: availableDrivers.length,
      total_with_warnings: driversWithWarnings.length
    });
    
  } catch (error) {
    Logger.log('Get available drivers for queue error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Queue Creation Warnings - ดึงคำเตือนทั้งหมดก่อนสร้างคิว
 */
function getQueueCreationWarnings(carId, driverId, date) {
  try {
    var warnings = [];
    
    // Check car scheduled for repair
    var scheduledRepair = isCarScheduledForRepair(carId, date);
    if (scheduledRepair.scheduled) {
      warnings.push({
        type: 'car_scheduled_repair',
        severity: 'error',
        message: 'รถถูกจองซ่อมในวันที่ ' + formatDateThai(date),
        can_override: false
      });
    }
    
    // Check driver on leave
    var driverLeave = isDriverOnLeave(driverId, date);
    if (driverLeave.on_leave) {
      warnings.push({
        type: 'driver_on_leave',
        severity: 'error',
        message: driverLeave.reason,
        can_override: false
      });
    }
    
    // Check driver fatigue
    var fatigueWarning = checkDriverFatigueStatus(driverId, date);
    if (fatigueWarning.fatigued && fatigueWarning.warning) {
      warnings.push({
        type: 'driver_fatigue',
        severity: 'warning',
        message: fatigueWarning.warning.message,
        recommendation: fatigueWarning.warning.recommendation,
        distance: fatigueWarning.warning.distance,
        can_override: true,
        suggest_standby: true
      });
    }
    
    return successResponse({
      warnings: warnings,
      has_errors: warnings.filter(function(w) { return w.severity === 'error'; }).length > 0,
      has_warnings: warnings.filter(function(w) { return w.severity === 'warning'; }).length > 0
    });
    
  } catch (error) {
    Logger.log('Get queue creation warnings error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการตรวจสอบ: ' + error.toString(), 'SERVER_ERROR');
  }
}
