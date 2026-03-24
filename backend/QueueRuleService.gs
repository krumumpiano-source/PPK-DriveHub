/**
 * PPK DriveHub Queue Rule Service
 * จัดการเงื่อนไขการจัดคิว (Admin only)
 * แอดมินกำหนดบทบาทคนขับ: งานนอกสถานที่ / งานภายในโรงเรียน / ประจำผู้บริหาร / สแตนด์บาย
 * ระบบเลือกคนขับตามกลุ่มก่อน; แอดมิน Override ได้เสมอ
 */

/** assignment_type ค่าที่รองรับ */
var QUEUE_ASSIGNMENT_TYPES = ['out_of_school', 'in_school', 'executive', 'standby_school'];

/**
 * Get Drivers For Queue - ดึงคนขับตามกลุ่ม (สำหรับสร้างคิว)
 * เลือกคนขับตามกลุ่มก่อน; ไม่เอาคนผิดกลุ่มโผล่ในคิวอัตโนมัติ; Override ได้
 */
function getDriversForQueue(date, assignment_type) {
  try {
    date = date || formatDate(new Date());
    var driversResult = getDrivers({ status: 'active' });
    if (!driversResult.success) return successResponse({ suggested_drivers: [], by_assignment: {}, on_leave: [] });
    var drivers = driversResult.data.drivers || [];
    var rulesResult = getQueueRules();
    var rules = rulesResult.success && rulesResult.data.rules ? rulesResult.data.rules : [];
    var byAssignment = { out_of_school: [], in_school: [], executive: [], standby_school: [] };
    var onLeave = [];
    for (var i = 0; i < drivers.length; i++) {
      var d = drivers[i];
      var onLeaveCheck = typeof isDriverOnLeave === 'function' ? isDriverOnLeave(d.driver_id, date) : { on_leave: false };
      if (onLeaveCheck.on_leave) {
        onLeave.push(d);
        continue;
      }
      var at = getDriverAssignmentTypeFromRules(d.driver_id, rules);
      if (byAssignment[at]) byAssignment[at].push(d);
      else byAssignment.out_of_school.push(d);
    }
    var suggested = assignment_type && byAssignment[assignment_type] ? byAssignment[assignment_type] : [];
    return successResponse({
      date: date,
      assignment_type: assignment_type || null,
      suggested_drivers: suggested,
      by_assignment: byAssignment,
      on_leave: onLeave
    });
  } catch (e) {
    Logger.log('getDriversForQueue error: ' + e.toString());
    return successResponse({ suggested_drivers: [], by_assignment: {}, on_leave: [] });
  }
}

function getDriverAssignmentTypeFromRules(driverId, rules) {
  for (var j = 0; j < (rules || []).length; j++) {
    if (rules[j].driver_id === driverId && (rules[j].active === true || rules[j].active === 'TRUE')) {
      var t = rules[j].assignment_type;
      if (t === 'in_school' || t === 'out_of_school' || t === 'executive' || t === 'standby_school') return t;
      return 'out_of_school';
    }
  }
  return 'out_of_school';
}

/**
 * Create Queue Rule - สร้างเงื่อนไขการจัดคิว
 */
function createQueueRule(ruleData) {
  try {
    validateRequired(ruleData, ['driver_id', 'assignment_type']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.QUEUE_RULES, [
      'rule_id', 'driver_id', 'assignment_type', 'description', 
      'active', 'created_at', 'created_by', 'updated_at', 'notes'
    ]);
    
    // Check if rule already exists for this driver
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === ruleData.driver_id && data[i][4] === 'TRUE') {
        return errorResponse('มีเงื่อนไขสำหรับคนขับนี้อยู่แล้ว', 'DUPLICATE_RULE');
      }
    }
    
    var ruleId = generateUUID();
    var now = new Date();
    var currentUser = getCurrentUser() || 'admin';
    
    sheet.appendRow([
      ruleId,
      ruleData.driver_id,
      ruleData.assignment_type, // out_of_school, in_school, executive, standby_school
      ruleData.description || '',
      'TRUE', // active
      now,
      currentUser,
      now,
      ruleData.notes || ''
    ]);
    
    // Log creation
    logAudit(currentUser, 'create', 'queue_rule', ruleId, ruleData);
    
    return successResponse({
      rule_id: ruleId
    }, 'สร้างเงื่อนไขการจัดคิวสำเร็จ');
    
  } catch (error) {
    Logger.log('Create queue rule error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการสร้างเงื่อนไข: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Queue Rules - ดึงเงื่อนไขการจัดคิวทั้งหมด
 */
function getQueueRules() {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.QUEUE_RULES, [
      'rule_id', 'driver_id', 'assignment_type', 'description', 
      'active', 'created_at', 'created_by', 'updated_at', 'notes'
    ]);
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return successResponse({ rules: [] });
    }
    
    var rules = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var rule = rowToObject(data[i], headers);
      rules.push(rule);
    }
    
    return successResponse({ rules: rules });
    
  } catch (error) {
    Logger.log('Get queue rules error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update Queue Rule - แก้ไขเงื่อนไข
 */
function updateQueueRule(ruleId, ruleData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.QUEUE_RULES);
    var rowIndex = findRowIndexById(sheet, 0, ruleId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบเงื่อนไข', 'RULE_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Update fields
    if (ruleData.driver_id !== undefined) {
      sheet.getRange(rowIndex, 2).setValue(ruleData.driver_id);
    }
    if (ruleData.assignment_type !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(ruleData.assignment_type);
    }
    if (ruleData.description !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(ruleData.description);
    }
    if (ruleData.active !== undefined) {
      sheet.getRange(rowIndex, 5).setValue(ruleData.active ? 'TRUE' : 'FALSE');
    }
    if (ruleData.notes !== undefined) {
      sheet.getRange(rowIndex, 9).setValue(ruleData.notes);
    }
    
    sheet.getRange(rowIndex, 8).setValue(now); // updated_at
    
    // Log update
    logAudit(currentUser, 'update', 'queue_rule', ruleId, ruleData);
    
    return successResponse({}, 'อัปเดตเงื่อนไขสำเร็จ');
    
  } catch (error) {
    Logger.log('Update queue rule error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Delete Queue Rule - ลบเงื่อนไข
 */
function deleteQueueRule(ruleId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.QUEUE_RULES);
    var rowIndex = findRowIndexById(sheet, 0, ruleId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบเงื่อนไข', 'RULE_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    
    // Delete row
    sheet.deleteRow(rowIndex);
    
    // Log deletion
    logAudit(currentUser, 'delete', 'queue_rule', ruleId, {});
    
    return successResponse({}, 'ลบเงื่อนไขสำเร็จ');
    
  } catch (error) {
    Logger.log('Delete queue rule error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการลบ: ' + error.toString(), 'SERVER_ERROR');
  }
}
