/**
 * PPK DriveHub Leave Service
 * ระบบการลา/ป่วยของพนักงานขับรถ
 * - ยืดหยุด, ยกเลิก, แก้ไข, ด่วน, ฉุกเฉินได้
 */

/**
 * Create Leave - สร้างการลา/ป่วย
 * ลาด่วน/ป่วยกะทันหัน: ทำได้ทันที, ไม่ต้องกรอกยาว, mark = Emergency Leave
 */
function createLeave(leaveData) {
  try {
    validateRequired(leaveData, ['driver_id', 'leave_type', 'start_date', 'end_date']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.LEAVES, [
      'leave_id', 'driver_id', 'leave_type', 'start_date', 'end_date',
      'start_time', 'end_time', 'reason', 'priority', 'status',
      'approved_by', 'created_at', 'created_by', 'updated_at', 'notes', 'is_emergency'
    ]);
    
    // Validate dates
    var startDate = parseDate(leaveData.start_date);
    var endDate = parseDate(leaveData.end_date);
    
    if (endDate < startDate) {
      return errorResponse('วันที่สิ้นสุดต้องมากกว่าหรือเท่ากับวันที่เริ่มต้น', 'INVALID_DATE_RANGE');
    }
    
    // Priority: normal, urgent, emergency
    var priority = leaveData.priority || 'normal';
    var isEmergency = priority === 'emergency' || priority === 'urgent' || leaveData.is_emergency;
    
    // If emergency, auto-approve and cancel existing queues
    if (isEmergency) {
      // Cancel existing queues for this driver
      var today = formatDate(new Date());
      var queues = getQueues({ driver_id: leaveData.driver_id, date: leaveData.start_date });
      if (queues.success) {
        queues.data.queues.forEach(function(queue) {
          if (queue.status === 'pending' || queue.status === 'running') {
            cancelQueue(queue.queue_id, 'ยกเลิกเนื่องจากลาฉุกเฉิน/ด่วน');
          }
        });
      }
    }
    
    // Check for overlapping leaves (skip if emergency)
    if (!isEmergency) {
      var overlapping = checkLeaveOverlap(leaveData.driver_id, leaveData.start_date, leaveData.end_date);
      if (overlapping.has_overlap && !leaveData.allow_override) {
        return errorResponse('มีการลาซ้อนทับ: ' + overlapping.message, 'LEAVE_OVERLAP');
      }
    }
    
    var leaveId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'system';
    
    // Leave type: sick, vacation, personal, emergency
    var leaveType = leaveData.leave_type;
    
    // Auto-approve if emergency
    var initialStatus = isEmergency ? 'approved' : 'pending';
    var approvedBy = isEmergency ? currentUser : '';
    
    sheet.appendRow([
      leaveId,
      leaveData.driver_id,
      leaveType,
      leaveData.start_date,
      leaveData.end_date,
      leaveData.start_time || '',
      leaveData.end_time || '',
      leaveData.reason || '',
      priority,
      initialStatus, // pending, approved, rejected, cancelled
      approvedBy, // approved_by (auto if emergency)
      now,
      currentUser,
      now,
      leaveData.notes || '',
      isEmergency ? 'TRUE' : 'FALSE' // is_emergency
    ]);
    
    // Log creation (mark as emergency if needed)
    logAudit(currentUser, 'create', 'leave', leaveId, {
      driver_id: leaveData.driver_id,
      leave_type: leaveType,
      start_date: leaveData.start_date,
      end_date: leaveData.end_date,
      priority: priority,
      is_emergency: isEmergency,
      auto_approved: isEmergency
    }, isEmergency ? 'ลาฉุกเฉิน/ด่วน - อนุมัติอัตโนมัติ' : '');
    
    return successResponse({
      leave_id: leaveId,
      auto_approved: isEmergency
    }, isEmergency ? 'สร้างการลาฉุกเฉินสำเร็จ (อนุมัติอัตโนมัติ)' : 'สร้างการลาสำเร็จ');
    
  } catch (error) {
    Logger.log('Create leave error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการสร้างการลา: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Leaves - ดึงรายการลา
 */
function getLeaves(filters) {
  try {
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.LEAVES);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ leaves: [] });
    }
    
    var leaves = [];
    var headers = data[0];
    var today = formatDate(new Date());
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var leave = rowToObject(row, headers);
      
      // Apply filters
      if (filters.driver_id && leave.driver_id !== filters.driver_id) {
        continue;
      }
      if (filters.leave_type && leave.leave_type !== filters.leave_type) {
        continue;
      }
      if (filters.status && leave.status !== filters.status) {
        continue;
      }
      if (filters.priority && leave.priority !== priority) {
        continue;
      }
      if (filters.date_from && leave.end_date < filters.date_from) {
        continue;
      }
      if (filters.date_to && leave.start_date > filters.date_to) {
        continue;
      }
      if (filters.active_only) {
        // Only show leaves that are active (overlap with today)
        if (leave.end_date < today || leave.start_date > today) {
          continue;
        }
        if (leave.status !== 'approved') {
          continue;
        }
      }
      
      leaves.push(leave);
    }
    
    // Sort by start_date ascending
    leaves.sort(function(a, b) {
      return a.start_date.localeCompare(b.start_date);
    });
    
    return successResponse({ leaves: leaves });
    
  } catch (error) {
    Logger.log('Get leaves error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Leave - แก้ไขการลา (ยืดหยุด, แก้ไข)
 */
function updateLeave(leaveId, leaveData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.LEAVES);
    var rowIndex = findRowIndexById(sheet, 0, leaveId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบการลา', 'LEAVE_NOT_FOUND');
    }
    
    // Get old values for audit
    var oldRow = sheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
    var oldValues = {
      start_date: oldRow[3],
      end_date: oldRow[4],
      leave_type: oldRow[2],
      priority: oldRow[9],
      status: oldRow[10]
    };
    
    var currentUser = getCurrentUser() || 'system';
    var now = new Date();
    
    // Update fields
    if (leaveData.start_date !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(leaveData.start_date);
    }
    if (leaveData.end_date !== undefined) {
      sheet.getRange(rowIndex, 5).setValue(leaveData.end_date);
    }
    if (leaveData.start_time !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(leaveData.start_time);
    }
    if (leaveData.end_time !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(leaveData.end_time);
    }
    if (leaveData.leave_type !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(leaveData.leave_type);
    }
    if (leaveData.reason !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(leaveData.reason);
    }
    if (leaveData.priority !== undefined) {
      sheet.getRange(rowIndex, 10).setValue(leaveData.priority);
    }
    if (leaveData.status !== undefined) {
      sheet.getRange(rowIndex, 11).setValue(leaveData.status);
      if (leaveData.status === 'approved' && !oldRow[11]) {
        sheet.getRange(rowIndex, 12).setValue(currentUser); // approved_by
      }
    }
    if (leaveData.notes !== undefined) {
      sheet.getRange(rowIndex, 15).setValue(leaveData.notes);
    }
    
    sheet.getRange(rowIndex, 14).setValue(now); // updated_at
    
    // Log update with old/new values
    logUpdate(currentUser, 'update', 'leave', leaveId, oldValues, leaveData, {}, '');
    
    return successResponse({}, 'อัปเดตการลาสำเร็จ');
    
  } catch (error) {
    Logger.log('Update leave error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Extend Leave - ยืดหยุด
 * แก้ไขช่วงเวลาได้ → ระบบอัปเดตคิวแบบ real-time
 */
function extendLeave(leaveId, newEndDate, reason) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.LEAVES);
    var rowIndex = findRowIndexById(sheet, 0, leaveId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบการลา', 'LEAVE_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 16).getValues()[0];
    var oldEndDate = row[4];
    var driverId = row[1];
    var status = row[10];
    
    // Get old values for audit
    var oldValues = {
      end_date: oldEndDate,
      status: status
    };
    
    // Update end date
    sheet.getRange(rowIndex, 5).setValue(newEndDate);
    sheet.getRange(rowIndex, 14).setValue(new Date()); // updated_at
    
    // Add reason to notes
    var currentNotes = row[15] || '';
    var newNotes = currentNotes + '\n[ยืดหยุด: ' + formatDate(new Date()) + '] ' + (reason || '');
    sheet.getRange(rowIndex, 15).setValue(newNotes);
    
    // If leave is approved, check and cancel queues that now overlap
    if (status === 'approved') {
      var oldEnd = parseDate(oldEndDate);
      var newEnd = parseDate(newEndDate);
      
      if (newEnd > oldEnd) {
        // Extended - check queues in extended period
        var extendedStart = formatDate(new Date(oldEnd.getTime() + 24 * 60 * 60 * 1000)); // Next day after old end
        var queues = getQueues({
          driver_id: driverId,
          date_from: extendedStart,
          date_to: newEndDate
        });
        
        if (queues.success) {
          queues.data.queues.forEach(function(queue) {
            if (queue.status === 'pending') {
              cancelQueue(queue.queue_id, 'ยกเลิกเนื่องจากยืดหยุด');
            }
          });
        }
      }
    }
    
    // Log update with old/new values
    logUpdate(getCurrentUser() || 'system', 'update', 'leave', leaveId, oldValues, {
      end_date: newEndDate,
      action: 'extend'
    }, {}, reason || 'ยืดหยุด');
    
    return successResponse({}, 'ยืดหยุดสำเร็จ');
    
  } catch (error) {
    Logger.log('Extend leave error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการยืดหยุด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Cancel Leave - ยกเลิกการลา
 * เมื่อยกเลิก → ระบบอัปเดตคิวแบบ real-time (คนขับกลับมาใช้ได้)
 */
function cancelLeave(leaveId, reason) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.LEAVES);
    var rowIndex = findRowIndexById(sheet, 0, leaveId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบการลา', 'LEAVE_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 16).getValues()[0];
    var oldStatus = row[10];
    
    // Get old values for audit
    var oldValues = {
      status: oldStatus
    };
    
    // Update status to cancelled
    var result = updateLeave(leaveId, {
      status: 'cancelled',
      notes: reason ? (reason + ' [ยกเลิก: ' + formatDate(new Date()) + ']') : '',
      reason: reason || 'ยกเลิกการลา'
    });
    
    // Log cancellation
    logUpdate(getCurrentUser() || 'system', 'update', 'leave', leaveId, oldValues, {
      status: 'cancelled'
    }, {}, reason || 'ยกเลิกการลา');
    
    return result;
    
  } catch (error) {
    Logger.log('Cancel leave error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการยกเลิก: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Approve Leave - อนุมัติการลา
 * เมื่อสถานะ = อนุมัติ → พนักงานหายจากตัวเลือกจัดคิว
 * อัปเดตคิวแบบ real-time (ยกเลิกคิวที่ซ้อนทับ)
 */
function approveLeave(leaveId, approvedBy) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.LEAVES);
    var rowIndex = findRowIndexById(sheet, 0, leaveId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบการลา', 'LEAVE_NOT_FOUND');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 16).getValues()[0];
    var driverId = row[1];
    var startDate = row[3];
    var endDate = row[4];
    var oldStatus = row[10];
    
    // Get old values for audit
    var oldValues = {
      status: oldStatus
    };
    
    // Update status to approved
    var approver = approvedBy || getCurrentUser() || 'admin';
    sheet.getRange(rowIndex, 10).setValue('approved');
    sheet.getRange(rowIndex, 11).setValue(approver);
    sheet.getRange(rowIndex, 14).setValue(new Date());
    
    // Cancel overlapping queues
    var queues = getQueues({
      driver_id: driverId,
      date_from: startDate,
      date_to: endDate
    });
    
    if (queues.success) {
      queues.data.queues.forEach(function(queue) {
        if (queue.status === 'pending' || queue.status === 'running') {
          cancelQueue(queue.queue_id, 'ยกเลิกเนื่องจากคนขับลา');
        }
      });
    }
    
    // Log update with old/new values
    logUpdate(approver, 'update', 'leave', leaveId, oldValues, {
      status: 'approved',
      approved_by: approver
    }, {}, 'อนุมัติการลา');
    
    return successResponse({}, 'อนุมัติการลาสำเร็จ - คิวที่ซ้อนทับถูกยกเลิกแล้ว');
    
  } catch (error) {
    Logger.log('Approve leave error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอนุมัติ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Check Leave Overlap - ตรวจสอบการลาซ้อนทับ
 */
function checkLeaveOverlap(driverId, startDate, endDate, excludeLeaveId) {
  try {
    var leaves = getLeaves({
      driver_id: driverId,
      status: 'approved' // Only check approved leaves
    });
    
    if (!leaves.success) {
      return { has_overlap: false, message: '' };
    }
    
    var checkStart = parseDate(startDate);
    var checkEnd = parseDate(endDate);
    
    for (var i = 0; i < leaves.data.leaves.length; i++) {
      var leave = leaves.data.leaves;
      
      // Skip if this is the leave we're updating
      if (excludeLeaveId && leave.leave_id === excludeLeaveId) {
        continue;
      }
      
      // Skip cancelled leaves
      if (leave.status === 'cancelled') {
        continue;
      }
      
      var leaveStart = parseDate(leave.start_date);
      var leaveEnd = parseDate(leave.end_date);
      
      // Check overlap
      if (checkStart <= leaveEnd && checkEnd >= leaveStart) {
        return {
          has_overlap: true,
          message: 'ซ้อนทับกับการลา ' + formatDateThai(leave.start_date) + ' - ' + formatDateThai(leave.end_date),
          overlapping_leave: leave
        };
      }
    }
    
    return { has_overlap: false, message: '' };
    
  } catch (error) {
    Logger.log('Check leave overlap error: ' + error.toString());
    return { has_overlap: false, message: '' };
  }
}

/**
 * Check if Driver is on Leave - ตรวจสอบว่าคนขับลาหรือไม่
 * ตรวจสอบเฉพาะสถานะ = approved เท่านั้น
 * เมื่อสถานะ = อนุมัติ → พนักงานหายจากตัวเลือกจัดคิว
 */
function isDriverOnLeave(driverId, date) {
  try {
    // Only check approved leaves
    var leaves = getLeaves({
      driver_id: driverId,
      status: 'approved'
    });
    
    if (leaves.success && leaves.data.leaves.length > 0) {
      // Check if date falls within any approved leave
      var checkDate = parseDate(date);
      
      for (var i = 0; i < leaves.data.leaves.length; i++) {
        var leave = leaves.data.leaves[i];
        
        // Skip cancelled leaves
        if (leave.status === 'cancelled') {
          continue;
        }
        
        var leaveStart = parseDate(leave.start_date);
        var leaveEnd = parseDate(leave.end_date);
        
        if (checkDate >= leaveStart && checkDate <= leaveEnd) {
          return {
            on_leave: true,
            leave: leave,
            reason: 'ลาประเภท: ' + leave.leave_type + ' (' + formatDateThai(leave.start_date) + ' - ' + formatDateThai(leave.end_date) + ')'
          };
        }
      }
    }
    
    return { on_leave: false, leave: null };
    
  } catch (error) {
    Logger.log('Check driver on leave error: ' + error.toString());
    return { on_leave: false, leave: null };
  }
}
