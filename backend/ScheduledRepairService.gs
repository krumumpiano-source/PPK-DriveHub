/**
 * PPK DriveHub Scheduled Repair Service
 * ระบบแจ้งซ่อมล่วงหน้า
 * - บันทึกว่าจะเอาไปซ่อมเมื่อไหร่
 * - เพื่อไม่ให้ใช้รถคันนี้ในการจัดคิว
 */

/**
 * Create Scheduled Repair - แจ้งซ่อมล่วงหน้า
 * ทันทีที่บันทึก → รถสถานะ = งดใช้งาน
 * ไม่ปรากฏในรายการเลือกรถ, ไม่ถูก auto-assign
 */
function createScheduledRepair(repairData) {
  try {
    validateRequired(repairData, ['car_id', 'request_type', 'start_date', 'issue_description']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.SCHEDULED_REPAIRS, [
      'scheduled_repair_id', 'car_id', 'request_type', 'start_date', 'start_time',
      'expected_return_date', 'expected_return_time', 'issue_description',
      'garage_name', 'status', 'created_at', 'created_by', 'updated_at', 'actual_repair_id', 'notes'
    ]);
    
    var scheduledRepairId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'system';
    
    // Request type: planned, urgent, emergency
    var requestType = repairData.request_type || 'planned';
    
    // Check if emergency - can override existing queues
    var isEmergency = requestType === 'emergency' || requestType === 'urgent';
    
    // If emergency, cancel existing queues for this car
    if (isEmergency) {
      var today = formatDate(new Date());
      var queues = getQueues({ car_id: repairData.car_id, date: repairData.start_date });
      if (queues.success) {
        queues.data.queues.forEach(function(queue) {
          if (queue.status === 'pending' || queue.status === 'running') {
            cancelQueue(queue.queue_id, 'ยกเลิกเนื่องจากแจ้งซ่อมฉุกเฉิน/ด่วน');
          }
        });
      }
    }
    
    sheet.appendRow([
      scheduledRepairId,
      repairData.car_id,
      requestType, // planned, urgent, emergency
      repairData.start_date, // วันที่เริ่มงดใช้
      repairData.start_time || '',
      repairData.expected_return_date || '', // วันที่คาดว่าจะกลับมาใช้
      repairData.expected_return_time || '',
      repairData.issue_description, // สาเหตุการซ่อม
      repairData.garage_name || '', // สถานที่ซ่อม (ถ้าทราบ)
      'pending', // pending, in_progress, completed, cancelled
      now,
      currentUser,
      now,
      '', // actual_repair_id (จะเชื่อมเมื่อสร้าง repair log จริง)
      repairData.notes || ''
    ]);
    
    // 🔧 Lock Vehicle - เปลี่ยนสถานะรถเป็น "งดใช้งาน" ทันที
    var lockResult = lockVehicleForRepair(repairData.car_id, scheduledRepairId, isEmergency);
    
    // Log creation
    logAudit(currentUser, 'create', 'scheduled_repair', scheduledRepairId, {
      car_id: repairData.car_id,
      request_type: requestType,
      start_date: repairData.start_date,
      is_emergency: isEmergency
    });
    
    return successResponse({
      scheduled_repair_id: scheduledRepairId,
      vehicle_locked: lockResult.success
    }, 'แจ้งซ่อมล่วงหน้าสำเร็จ - รถถูกงดใช้งานแล้ว');
    
  } catch (error) {
    Logger.log('Create scheduled repair error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการแจ้งซ่อมล่วงหน้า: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Lock Vehicle for Repair - งดใช้งานรถ (เปลี่ยนสถานะ)
 */
function lockVehicleForRepair(carId, scheduledRepairId, isEmergency) {
  try {
    var car = getVehicleById(carId);
    if (!car.success) {
      return { success: false, message: 'ไม่พบรถ' };
    }
    
    if (!car.success || !car.data || !car.data.vehicle) {
      return errorResponse('ไม่พบข้อมูลรถ', 'CAR_NOT_FOUND');
    }
    var oldStatus = car.data.vehicle.status;
    
    // Change status to 'unavailable' (งดใช้งาน)
    var updateResult = updateVehicle(carId, {
      status: 'unavailable',
      notes: 'งดใช้งานเนื่องจากแจ้งซ่อม (ID: ' + scheduledRepairId + ')' + 
             (isEmergency ? ' [ฉุกเฉิน]' : '')
    });
    
    // Log vehicle lock
    logUpdate(getCurrentUser() || 'system', 'update', 'car', carId, {
      status: oldStatus
    }, {
      status: 'unavailable',
      reason: 'scheduled_repair',
      scheduled_repair_id: scheduledRepairId
    }, {}, 'งดใช้งานเนื่องจากแจ้งซ่อม');
    
    return { success: true, old_status: oldStatus };
    
  } catch (error) {
    Logger.log('Lock vehicle for repair error: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Unlock Vehicle from Repair - ปลดล็อครถ (เมื่อยกเลิกหรือเสร็จซ่อม)
 */
function unlockVehicleFromRepair(carId, scheduledRepairId) {
  try {
    var car = getVehicleById(carId);
    if (!car.success) {
      return { success: false, message: 'ไม่พบรถ' };
    }
    
    // Check if there are other scheduled repairs
    var otherRepairs = getScheduledRepairs({
      car_id: carId,
      status: 'pending'
    });
    
    if (otherRepairs.success && otherRepairs.data.scheduled_repairs.length > 0) {
      // Still has other scheduled repairs, keep locked
      return { success: false, message: 'ยังมีการแจ้งซ่อมอื่นอยู่' };
    }
    
    // Change status back to 'available'
    var updateResult = updateVehicle(carId, {
      status: 'available',
      notes: 'ปลดล็อคจากการซ่อม (Scheduled Repair ID: ' + scheduledRepairId + ')'
    });
    
    // Log vehicle unlock
    logUpdate(getCurrentUser() || 'system', 'update', 'car', carId, {
      status: 'unavailable'
    }, {
      status: 'available',
      reason: 'repair_completed',
      scheduled_repair_id: scheduledRepairId
    }, {}, 'ปลดล็อครถจากการซ่อม');
    
    return { success: true };
    
  } catch (error) {
    Logger.log('Unlock vehicle from repair error: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Get Scheduled Repairs - ดึงรายการแจ้งซ่อมล่วงหน้า
 */
function getScheduledRepairs(filters) {
  try {
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.SCHEDULED_REPAIRS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ scheduled_repairs: [] });
    }
    
    var scheduledRepairs = [];
    var headers = data[0];
    var today = formatDate(new Date());
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var scheduledRepair = rowToObject(row, headers);
      
      // Apply filters
      if (filters.car_id && scheduledRepair.car_id !== filters.car_id) {
        continue;
      }
      if (filters.status && scheduledRepair.status !== filters.status) {
        continue;
      }
      if (filters.priority && scheduledRepair.priority !== filters.priority) {
        continue;
      }
      if (filters.date_from && scheduledRepair.scheduled_date < filters.date_from) {
        continue;
      }
      if (filters.date_to && scheduledRepair.scheduled_date > filters.date_to) {
        continue;
      }
      if (filters.upcoming_only && scheduledRepair.scheduled_date < today) {
        continue;
      }
      
      scheduledRepairs.push(scheduledRepair);
    }
    
    // Sort by scheduled_date ascending
    scheduledRepairs.sort(function(a, b) {
      return a.scheduled_date.localeCompare(b.scheduled_date);
    });
    
    return successResponse({ scheduled_repairs: scheduledRepairs });
    
  } catch (error) {
    Logger.log('Get scheduled repairs error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Scheduled Repair - แก้ไขแจ้งซ่อมล่วงหน้า
 * แก้ไขได้, ยกเลิกได้, เปลี่ยนช่วงเวลาได้, ด่วนได้, ฉุกเฉินได้
 */
function updateScheduledRepair(scheduledRepairId, repairData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.SCHEDULED_REPAIRS);
    var rowIndex = findRowIndexById(sheet, 0, scheduledRepairId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบการแจ้งซ่อมล่วงหน้า', 'SCHEDULED_REPAIR_NOT_FOUND');
    }
    
    // Get old values for audit
    var oldRow = sheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
    var carId = oldRow[1];
    var oldValues = {
      request_type: oldRow[2],
      start_date: oldRow[3],
      expected_return_date: oldRow[6],
      status: oldRow[10]
    };
    
    var currentUser = getCurrentUser() || 'system';
    var now = new Date();
    
    // Update fields
    if (repairData.request_type !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(repairData.request_type);
    }
    if (repairData.start_date !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(repairData.start_date);
    }
    if (repairData.start_time !== undefined) {
      sheet.getRange(rowIndex, 5).setValue(repairData.start_time);
    }
    if (repairData.expected_return_date !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(repairData.expected_return_date);
    }
    if (repairData.expected_return_time !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(repairData.expected_return_time);
    }
    if (repairData.issue_description !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(repairData.issue_description);
    }
    if (repairData.garage_name !== undefined) {
      sheet.getRange(rowIndex, 9).setValue(repairData.garage_name);
    }
    if (repairData.status !== undefined) {
      var newStatus = repairData.status;
      sheet.getRange(rowIndex, 10).setValue(newStatus);
      
      // If cancelled or completed, unlock vehicle
      if (newStatus === 'cancelled' || newStatus === 'completed') {
        unlockVehicleFromRepair(carId, scheduledRepairId);
      }
    }
    if (repairData.notes !== undefined) {
      sheet.getRange(rowIndex, 15).setValue(repairData.notes);
    }
    
    sheet.getRange(rowIndex, 13).setValue(now); // updated_at
    
    // Log update with old/new values
    logUpdate(currentUser, 'update', 'scheduled_repair', scheduledRepairId, oldValues, repairData, {}, 
      repairData.reason || '');
    
    return successResponse({}, 'อัปเดตการแจ้งซ่อมล่วงหน้าสำเร็จ');
    
  } catch (error) {
    Logger.log('Update scheduled repair error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Cancel Scheduled Repair - ยกเลิกแจ้งซ่อมล่วงหน้า
 * เมื่อยกเลิก → รถกลับเข้า "คิวปกติ" อัตโนมัติ
 */
function cancelScheduledRepair(scheduledRepairId, reason) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.SCHEDULED_REPAIRS);
    var rowIndex = findRowIndexById(sheet, 0, scheduledRepairId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบการแจ้งซ่อมล่วงหน้า', 'SCHEDULED_REPAIR_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
    var carId = row[1];
    
    // Update status to cancelled
    var result = updateScheduledRepair(scheduledRepairId, {
      status: 'cancelled',
      notes: reason ? (reason + ' [ยกเลิก: ' + formatDate(new Date()) + ']') : '',
      reason: reason || 'ยกเลิกการแจ้งซ่อม'
    });
    
    // Unlock vehicle (will be done in updateScheduledRepair)
    
    return result;
    
  } catch (error) {
    Logger.log('Cancel scheduled repair error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการยกเลิก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Convert Scheduled Repair to Actual Repair - แปลงเป็น repair log จริง
 * เมื่อปิดงานซ่อม → รถกลับเข้า "คิวปกติ" อัตโนมัติ
 */
function convertScheduledRepairToRepair(scheduledRepairId, repairData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.SCHEDULED_REPAIRS);
    var rowIndex = findRowIndexById(sheet, 0, scheduledRepairId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบการแจ้งซ่อมล่วงหน้า', 'SCHEDULED_REPAIR_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
    var carId = row[1];
    var scheduledDate = row[3]; // start_date
    
    // Get current mileage
    var currentMileage = getCurrentMileage(carId) || 0;
    
    // Create actual repair log
    var actualRepairData = {
      car_id: carId,
      date_reported: scheduledDate,
      mileage_at_repair: currentMileage,
      taken_by: repairData.taken_by || '',
      garage_name: row[9] || repairData.garage_name || '',
      repair_items: '',
      issue_description: row[8] || repairData.issue_description || '',
      notes: 'แปลงจาก Scheduled Repair: ' + scheduledRepairId + '\n' + (repairData.notes || '')
    };
    
    var repairResult = createRepairLog(actualRepairData);
    
    if (!repairResult.success) {
      return repairResult;
    }
    
    // Update scheduled repair status to completed
    sheet.getRange(rowIndex, 10).setValue('completed'); // status
    sheet.getRange(rowIndex, 14).setValue(repairResult.data.repair_id); // actual_repair_id
    sheet.getRange(rowIndex, 13).setValue(new Date()); // updated_at
    
    // Unlock vehicle (รถจะถูก unlock เมื่อปิดงานซ่อมจริงใน completeRepair)
    // แต่ถ้าซ่อมเสร็จแล้ว ให้ unlock ทันที
    if (repairData.completed) {
      unlockVehicleFromRepair(carId, scheduledRepairId);
    }
    
    return successResponse({
      scheduled_repair_id: scheduledRepairId,
      repair_id: repairResult.data.repair_id
    }, 'แปลงเป็น repair log สำเร็จ');
    
  } catch (error) {
    Logger.log('Convert scheduled repair to repair error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการแปลง: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Check if Car is Scheduled for Repair - ตรวจสอบว่ารถถูกจองซ่อมหรือไม่
 * ตรวจสอบจากสถานะรถ (unavailable) และ scheduled repairs
 */
function isCarScheduledForRepair(carId, date) {
  try {
    // First check car status
    var car = getVehicleById(carId);
    if (car.success && car.data && car.data.vehicle && car.data.vehicle.status === 'unavailable') {
      // Check if it's due to scheduled repair
      var scheduledRepairs = getScheduledRepairs({
        car_id: carId,
        status: 'pending'
      });
      
      if (scheduledRepairs.success && scheduledRepairs.data.scheduled_repairs.length > 0) {
        // Check if date falls within any scheduled repair period
        var checkDate = parseDate(date);
        
        for (var i = 0; i < scheduledRepairs.data.scheduled_repairs.length; i++) {
          var sr = scheduledRepairs.data.scheduled_repairs[i];
          var startDate = parseDate(sr.start_date);
          var endDate = sr.expected_return_date ? parseDate(sr.expected_return_date) : null;
          
          // If no expected return date, assume 1 day
          if (!endDate) {
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
          }
          
          if (checkDate >= startDate && checkDate <= endDate) {
            return {
              scheduled: true,
              scheduled_repairs: [sr],
              reason: 'รถถูกงดใช้งานเนื่องจากแจ้งซ่อม'
            };
          }
        }
      }
    }
    
    // Also check scheduled repairs directly
    var allScheduled = getScheduledRepairs({
      car_id: carId,
      status: 'pending'
    });
    
    if (allScheduled.success) {
      var checkDate = parseDate(date);
      for (var i = 0; i < allScheduled.data.scheduled_repairs.length; i++) {
        var sr = allScheduled.data.scheduled_repairs[i];
        var startDate = parseDate(sr.start_date);
        var endDate = sr.expected_return_date ? parseDate(sr.expected_return_date) : null;
        
        if (!endDate) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        }
        
        if (checkDate >= startDate && checkDate <= endDate) {
          return {
            scheduled: true,
            scheduled_repairs: [sr],
            reason: 'รถถูกจองซ่อม'
          };
        }
      }
    }
    
    return { scheduled: false, scheduled_repairs: [] };
    
  } catch (error) {
    Logger.log('Check car scheduled for repair error: ' + error.toString());
    return { scheduled: false, scheduled_repairs: [] };
  }
}
