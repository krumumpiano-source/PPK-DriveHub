/**
 * PPK DriveHub Inspection Alert Service
 * ระบบแจ้งเตือนจากการตรวจสภาพรถประจำวัน
 * 
 * 3 ระดับความเสี่ยง:
 * - 🟡 Warning (เฝ้าระวัง)
 * - 🟠 Risk (เสี่ยง)
 * - 🔴 Critical (อันตราย)
 */

/**
 * Risk Weight Mapping - น้ำหนักความเสี่ยงของแต่ละรายการตรวจ
 */
var RISK_WEIGHTS = {
  // หมวด A: เครื่องยนต์
  'engine_oil': { warning: 1, abnormal: 2 },
  'engine_leak': { warning: 1, abnormal: 2 },
  'engine_sound': { warning: 1, abnormal: 3 },
  'engine_warning_light': { warning: 2, abnormal: 3 },
  
  // หมวด B: เชื้อเพลิง
  'fuel_level': { warning: 1, abnormal: 2 },
  'diesel_filter': { warning: 1, abnormal: 2 },
  'diesel_water': { warning: 2, abnormal: 3 },
  'fuel_smell': { warning: 1, abnormal: 2 },
  'fuel_start': { warning: 1, abnormal: 2 },
  
  // หมวด C: ของเหลว
  'coolant': { warning: 1, abnormal: 2 },
  'brake_fluid': { warning: 2, abnormal: 3 },
  'washer_fluid': { warning: 0, abnormal: 1 }, // ไม่กระทบความปลอดภัย
  'power_steering_fluid': { warning: 1, abnormal: 2 },
  
  // หมวด D: ยาง/ล้อ
  'tire_tread': { warning: 2, abnormal: 3 },
  'tire_pressure': { warning: 1, abnormal: 2 },
  'wheel_nuts': { warning: 2, abnormal: 3 },
  'suspension_sound': { warning: 1, abnormal: 2 },
  
  // หมวด E: เบรก
  'brake_distance': { warning: 2, abnormal: 3 },
  'brake_sound': { warning: 2, abnormal: 3 },
  'brake_warning_light': { warning: 2, abnormal: 3 },
  
  // หมวด F: ไฟ
  'lights_head': { warning: 1, abnormal: 2 },
  'lights_indicator': { warning: 1, abnormal: 2 },
  'lights_brake': { warning: 2, abnormal: 3 },
  'lights_emergency': { warning: 1, abnormal: 2 },
  
  // หมวด G: ความปลอดภัย
  'seatbelts': { warning: 2, abnormal: 3 },
  'fire_extinguisher': { warning: 1, abnormal: 2 },
  'emergency_hammer': { warning: 1, abnormal: 2 },
  'warning_triangle': { warning: 1, abnormal: 2 }
};

/**
 * Critical Items - รายการที่กระทบความปลอดภัยทันที (ระดับ 🔴)
 */
var CRITICAL_ITEMS = [
  'brake_distance',
  'brake_sound',
  'brake_warning_light',
  'brake_fluid',
  'tire_tread',
  'wheel_nuts',
  'engine_warning_light',
  'lights_brake',
  'seatbelts'
];

/**
 * Process Inspection Alerts - ประมวลผลและสร้างการแจ้งเตือน
 */
function processInspectionAlerts(checkId, carId, checks, overallStatus, inspectorName, vehicleData) {
  try {
    // Analyze risk level
    var riskAnalysis = analyzeRiskLevel(checks, overallStatus, vehicleData);
    
    if (riskAnalysis.level === 'none') {
      return { success: true, alerts: [] };
    }
    
    // Check if alert already sent today for this car and level (prevent spam)
    if (hasAlertToday(carId, riskAnalysis.level)) {
      Logger.log('Alert already sent today for car ' + carId + ' level ' + riskAnalysis.level);
      return { success: true, alerts: [], skipped: true };
    }
    
    // Handle critical actions first
    var actionsTaken = [];
    if (riskAnalysis.level === 'critical') {
      handleCriticalAlert(carId, riskAnalysis);
      actionsTaken.push('lock_vehicle', 'create_repair_request');
    } else if (riskAnalysis.level === 'risk') {
      actionsTaken.push('warn_queue', 'recommend_inspection');
    } else if (riskAnalysis.level === 'warning') {
      actionsTaken.push('log_history', 'notify_admin');
    }
    
    // Create alert
    var alert = createInspectionAlert({
      check_id: checkId,
      car_id: carId,
      risk_level: riskAnalysis.level,
      items: riskAnalysis.items,
      recommendations: riskAnalysis.recommendations,
      inspector_name: inspectorName,
      vehicle_data: vehicleData,
      actions_taken: actionsTaken
    });
    
    // Send notifications
    sendInspectionNotifications(alert, riskAnalysis);
    
    return {
      success: true,
      alerts: [alert],
      risk_level: riskAnalysis.level,
      actions_taken: actionsTaken
    };
    
  } catch (error) {
    Logger.log('Process inspection alerts error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Analyze Risk Level - ประเมินระดับความเสี่ยง
 */
function analyzeRiskLevel(checks, overallStatus, vehicleData) {
  var riskScore = 0;
  var criticalItems = [];
  var riskItems = [];
  var warningItems = [];
  
  // Check for critical items first
  for (var item in checks) {
    if (item.endsWith('_note')) continue;
    
    var value = checks[item];
    if (value === 'abnormal' && CRITICAL_ITEMS.indexOf(item) !== -1) {
      criticalItems.push(item);
      riskScore += RISK_WEIGHTS[item] ? RISK_WEIGHTS[item].abnormal : 3;
    } else if (value === 'abnormal') {
      riskItems.push(item);
      riskScore += RISK_WEIGHTS[item] ? RISK_WEIGHTS[item].abnormal : 2;
    } else if (value === 'warning') {
      warningItems.push(item);
      riskScore += RISK_WEIGHTS[item] ? RISK_WEIGHTS[item].warning : 1;
    }
  }
  
  // Determine level
  var level = 'none';
  var items = [];
  var recommendations = [];
  var actions = [];
  
  if (criticalItems.length > 0 || overallStatus === 'not_ready') {
    level = 'critical';
    items = criticalItems.concat(riskItems);
    recommendations = generateRecommendations('critical', items, vehicleData);
    actions = ['lock_vehicle', 'create_repair_request'];
  } else if (riskItems.length > 0 || riskScore >= 3) {
    level = 'risk';
    items = riskItems.concat(warningItems);
    recommendations = generateRecommendations('risk', items, vehicleData);
    actions = ['warn_queue', 'recommend_inspection'];
  } else if (warningItems.length > 0 || overallStatus === 'warning') {
    level = 'warning';
    items = warningItems;
    recommendations = generateRecommendations('warning', items, vehicleData);
    actions = ['log_history', 'notify_admin'];
  }
  
  return {
    level: level,
    score: riskScore,
    items: items,
    critical_items: criticalItems,
    risk_items: riskItems,
    warning_items: warningItems,
    recommendations: recommendations,
    actions: actions
  };
}

/**
 * Generate Recommendations - สร้างคำแนะนำตามบริบท
 */
function generateRecommendations(level, items, vehicleData) {
  var recommendations = [];
  var vehicleType = vehicleData.vehicle_type || '';
  var fuelType = vehicleData.fuel_type || '';
  var isStudentTransport = vehicleType.includes('รับส่ง') || vehicleType.includes('นักเรียน');
  
  if (level === 'critical') {
    recommendations.push('❗ งดใช้งานทันที');
    recommendations.push('❗ แจ้งซ่อมด่วน');
    if (isStudentTransport) {
      recommendations.push('❗ ห้ามจัดคิวรับส่งนักเรียน');
    }
    
    // Specific recommendations based on items
    if (items.indexOf('brake_distance') !== -1 || items.indexOf('brake_sound') !== -1) {
      recommendations.push('⚠️ ระบบเบรกผิดปกติ - ห้ามใช้งานเด็ดขาด');
    }
    if (items.indexOf('tire_tread') !== -1 || items.indexOf('wheel_nuts') !== -1) {
      recommendations.push('⚠️ ยาง/ล้อผิดปกติ - เสี่ยงเกิดอุบัติเหตุ');
    }
    if (items.indexOf('engine_warning_light') !== -1) {
      recommendations.push('⚠️ ไฟเตือนเครื่องยนต์ - ตรวจสอบทันที');
    }
  } else if (level === 'risk') {
    recommendations.push('⚠️ หลีกเลี่ยงการใช้งานรับส่งนักเรียน');
    recommendations.push('⚠️ ควรแจ้งซ่อมภายใน 24 ชม.');
    recommendations.push('⚠️ ไม่แนะนำใช้งานงานไกล');
    
    if (items.indexOf('brake_fluid') !== -1) {
      recommendations.push('💡 ตรวจสอบระดับน้ำมันเบรก');
    }
    if (items.indexOf('tire_pressure') !== -1) {
      recommendations.push('💡 ตรวจสอบลมยาง');
    }
    if (fuelType.includes('diesel') && items.indexOf('diesel_filter') !== -1) {
      recommendations.push('💡 ตรวจสอบกรองดีเซล');
    }
  } else if (level === 'warning') {
    recommendations.push('📋 ตรวจซ้ำภายใน 7 วัน');
    recommendations.push('📋 บันทึกเป็นประวัติ');
    
    if (items.indexOf('washer_fluid') !== -1) {
      recommendations.push('💡 เติมน้ำฉีดกระจก');
    }
    if (items.indexOf('lights_head') !== -1) {
      recommendations.push('💡 ตรวจสอบไฟหน้า');
    }
  }
  
  return recommendations;
}

/**
 * Create Inspection Alert - สร้างบันทึกการแจ้งเตือน (พร้อม Explainable AI fields)
 */
function createInspectionAlert(alertData) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.INSPECTION_ALERTS || 'INSPECTION_ALERTS', [
      'alert_id', 'check_id', 'car_id', 'risk_level', 'items', 'recommendations',
      'inspector_name', 'vehicle_info', 'actions_taken', 'notification_sent',
      'created_at', 'resolved_at', 'resolved_by',
      'why_this_alert', 'data_used', 'recommendation'
    ]);
    
    // Ensure explainable columns exist
    ensureInspectionAlertsExplainableColumns(sheet);
    
    var alertId = generateUUID();
    var now = new Date();
    
    // SECURITY: Validate vehicle_data exists
    if (!alertData.vehicle_data) {
      return errorResponse('ต้องระบุ vehicle_data', 'MISSING_VEHICLE_DATA');
    }
    
    var vehicleInfo = (alertData.vehicle_data.license_plate || '') + ' - ' +
                     (alertData.vehicle_data.brand || '') + ' ' +
                     (alertData.vehicle_data.model || '');
    
    // Generate explainable fields
    var whyThisAlert = generateWhyThisAlert(alertData.risk_level, alertData.items, alertData.vehicle_data);
    var dataUsed = generateDataUsed(alertData.check_id, alertData.items, alertData.vehicle_data);
    var recommendation = generateRecommendation(alertData.risk_level, alertData.items, alertData.recommendations);
    
    sheet.appendRow([
      alertId,
      alertData.check_id,
      alertData.car_id,
      alertData.risk_level,
      JSON.stringify(alertData.items),
      JSON.stringify(alertData.recommendations),
      alertData.inspector_name,
      vehicleInfo,
      JSON.stringify(alertData.actions_taken || []),
      'FALSE',
      now,
      '', // resolved_at
      '', // resolved_by
      whyThisAlert, // why_this_alert
      dataUsed, // data_used
      recommendation // recommendation
    ]);
    
    // Log audit
    logAudit('system', 'create', 'inspection_alert', alertId, {
      car_id: alertData.car_id,
      risk_level: alertData.risk_level
    });
    
    return {
      alert_id: alertId,
      check_id: alertData.check_id,
      car_id: alertData.car_id,
      risk_level: alertData.risk_level,
      items: alertData.items,
      recommendations: alertData.recommendations,
      vehicle_data: alertData.vehicle_data,
      inspector_name: alertData.inspector_name,
      actions_taken: alertData.actions_taken || [],
      created_at: now,
      why_this_alert: whyThisAlert,
      data_used: dataUsed,
      recommendation: recommendation
    };
    
  } catch (error) {
    Logger.log('Create inspection alert error: ' + error.toString());
    throw error;
  }
}

/**
 * Generate Why This Alert - สร้างคำอธิบายว่าทำไมถึงเกิด alert นี้
 */
function generateWhyThisAlert(riskLevel, items, vehicleData) {
  var why = '';
  
  if (riskLevel === 'critical') {
    why = '🔴 ระดับอันตราย: พบความผิดปกติที่กระทบความปลอดภัยทันที';
    if (items && items.length > 0) {
      why += ' ได้แก่ ' + items.join(', ');
    }
    why += ' ตามมาตรฐานการตรวจเช็ค รถไม่ควรใช้งานจนกว่าจะแก้ไข';
  } else if (riskLevel === 'risk') {
    why = '🟠 ระดับเสี่ยง: พบความผิดปกติที่อาจส่งผลกระทบต่อความปลอดภัย';
    if (items && items.length > 0) {
      why += ' ได้แก่ ' + items.join(', ');
    }
    why += ' แนะนำให้ตรวจสอบและแก้ไขก่อนใช้งานงานไกล';
  } else if (riskLevel === 'warning') {
    why = '🟡 ระดับเฝ้าระวัง: พบอาการที่ควรติดตาม';
    if (items && items.length > 0) {
      why += ' ได้แก่ ' + items.join(', ');
    }
    why += ' ควรตรวจซ้ำภายใน 7 วัน';
  }
  
  return why;
}

/**
 * Generate Data Used - สร้างรายการข้อมูลที่ใช้ในการประเมิน
 */
function generateDataUsed(checkId, items, vehicleData) {
  var dataUsed = [];
  
  dataUsed.push('Check ID: ' + checkId);
  dataUsed.push('Vehicle: ' + (vehicleData.license_plate || '') + ' ' + 
                (vehicleData.brand || '') + ' ' + (vehicleData.model || ''));
  
  if (items && items.length > 0) {
    dataUsed.push('Abnormal Items: ' + items.join(', '));
  }
  
  // Add risk weights used
  if (items && items.length > 0) {
    var riskWeightsUsed = [];
    for (var i = 0; i < items.length; i++) {
      if (RISK_WEIGHTS[items[i]]) {
        riskWeightsUsed.push(items[i] + '=' + 
          (RISK_WEIGHTS[items[i]].abnormal || RISK_WEIGHTS[items[i]].warning));
      }
    }
    if (riskWeightsUsed.length > 0) {
      dataUsed.push('Risk Weights: ' + riskWeightsUsed.join(', '));
    }
  }
  
  return JSON.stringify(dataUsed);
}

/**
 * Generate Recommendation - สร้างคำแนะนำที่ชัดเจน
 */
function generateRecommendation(riskLevel, items, recommendations) {
  var recommendation = '';
  
  if (riskLevel === 'critical') {
    recommendation = '🚫 งดใช้งานทันที - แจ้งซ่อมด่วน - ห้ามจัดคิวจนกว่าจะแก้ไข';
  } else if (riskLevel === 'risk') {
    recommendation = '⚠️ หลีกเลี่ยงงานไกล - แนะนำแจ้งซ่อมภายใน 24 ชม. - ตรวจสอบก่อนใช้งาน';
  } else if (riskLevel === 'warning') {
    recommendation = '📋 ตรวจซ้ำภายใน 7 วัน - บันทึกเป็นประวัติ - ติดตามอาการ';
  }
  
  if (recommendations && recommendations.length > 0) {
    recommendation += '\n\nรายละเอียด:\n' + recommendations.join('\n');
  }
  
  return recommendation;
}

/**
 * Ensure INSPECTION_ALERTS sheet has explainable columns
 */
function ensureInspectionAlertsExplainableColumns(sheet) {
  if (!sheet) sheet = getOrCreateSheet(CONFIG.SHEETS.INSPECTION_ALERTS || 'INSPECTION_ALERTS', []);
  if (sheet.getLastColumn() < 14) {
    sheet.getRange(1, 14).setValue('why_this_alert');
  }
  if (sheet.getLastColumn() < 15) {
    sheet.getRange(1, 15).setValue('data_used');
  }
  if (sheet.getLastColumn() < 16) {
    sheet.getRange(1, 16).setValue('recommendation');
  }
}

/**
 * Handle Critical Alert - จัดการการแจ้งเตือนระดับ Critical
 */
function handleCriticalAlert(carId, riskAnalysis) {
  try {
    // Lock vehicle (set status to unavailable)
    var vehicleResult = getVehicleById(carId);
    if (vehicleResult.success) {
      var vehicle = vehicleResult.data.vehicle;
      if (vehicle.status !== 'unavailable') {
        updateVehicle(carId, { status: 'unavailable' });
        Logger.log('Vehicle ' + carId + ' locked due to critical inspection alert');
      }
    }
    
    // Create scheduled repair request
    try {
      if (typeof createScheduledRepair === 'function') {
        var repairData = {
          car_id: carId,
          request_type: 'emergency',
          issue_description: 'พบความผิดปกติจากการตรวจเช็คประจำวัน (ระดับ Critical):\n' +
                             alert.items.join(', '),
          status: 'pending',
          created_by: 'system'
        };
        createScheduledRepair(repairData);
      }
    } catch (repairError) {
      Logger.log('Auto-create repair request error: ' + repairError.toString());
    }
    
  } catch (error) {
    Logger.log('Handle critical alert error: ' + error.toString());
  }
}

/**
 * Send Inspection Notifications - ส่งการแจ้งเตือน
 */
function sendInspectionNotifications(alert, riskAnalysis) {
  try {
    var vehicleData = alert.vehicle_data || {};
    var vehicleInfo = (vehicleData.license_plate || '') + ' (' + 
                     (vehicleData.brand || '') + ' ' + (vehicleData.model || '') + ')';
    
    var message = '';
    var emoji = '';
    
    if (alert.risk_level === 'critical') {
      emoji = '🔴';
      message = emoji + ' <b>แจ้งเตือนอันตราย</b>\n\n';
      message += '🚗 <b>รถ:</b> ' + vehicleInfo + '\n';
      var itemsText = (alert.items && Array.isArray(alert.items)) ? alert.items.join(', ') : (alert.items || 'ไม่ระบุ');
      message += '⚠️ <b>พบ:</b> ' + itemsText + '\n';
      message += '👤 <b>ผู้ตรวจ:</b> ' + alert.inspector_name + '\n\n';
      message += '<b>การดำเนินการที่ระบบแนะนำ:</b>\n';
      if (alert.recommendations && Array.isArray(alert.recommendations)) {
        alert.recommendations.forEach(function(rec) {
          message += '• ' + (rec || '') + '\n';
        });
      }
    } else if (alert.risk_level === 'risk') {
      emoji = '🟠';
      message = emoji + ' <b>ความเสี่ยงจากการตรวจสภาพรถ</b>\n\n';
      message += '🚗 <b>รถ:</b> ' + vehicleInfo + '\n';
      var itemsText = (alert.items && Array.isArray(alert.items)) ? alert.items.join(', ') : (alert.items || 'ไม่ระบุ');
      message += '⚠️ <b>พบ:</b> ' + itemsText + '\n';
      message += '📅 <b>ตรวจพบวันที่:</b> ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy') + '\n';
      message += '👤 <b>ผู้ตรวจ:</b> ' + alert.inspector_name + '\n\n';
      message += '<b>คำแนะนำ:</b>\n';
      if (alert.recommendations && Array.isArray(alert.recommendations)) {
        alert.recommendations.forEach(function(rec) {
          message += '• ' + (rec || '') + '\n';
        });
      }
    } else if (alert.risk_level === 'warning') {
      emoji = '🟡';
      message = emoji + ' <b>แจ้งเตือนเฝ้าระวัง</b>\n\n';
      message += '🚗 <b>รถ:</b> ' + vehicleInfo + '\n';
      message += '📋 <b>รายการ:</b> ' + alert.items.join(', ') + '\n';
      message += '👤 <b>ผู้ตรวจ:</b> ' + alert.inspector_name + '\n\n';
      message += '<b>คำแนะนำ:</b>\n';
      if (alert.recommendations && Array.isArray(alert.recommendations)) {
        alert.recommendations.forEach(function(rec) {
          message += '• ' + (rec || '') + '\n';
        });
      }
    }
    
    // Create dashboard notification
    createDashboardNotification({
      type: 'inspection_alert',
      title: emoji + ' การแจ้งเตือนการตรวจสภาพรถ',
      message: message,
      risk_level: alert.risk_level,
      car_id: alert.car_id,
      alert_id: alert.alert_id
    });
    
    // Send Telegram notification (if configured)
    if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
      sendTelegramNotification(message);
    }
    
    // Mark notification as sent
    markAlertNotificationSent(alert.alert_id);
    
  } catch (error) {
    Logger.log('Send inspection notifications error: ' + error.toString());
  }
}

/**
 * Create Dashboard Notification
 */
function createDashboardNotification(notificationData) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.NOTIFICATIONS || 'NOTIFICATIONS', [
      'notification_id', 'user_id', 'type', 'title', 'message', 'read', 'created_at', 'metadata'
    ]);
    
    // Get admin users
    var adminUsers = getAdminUsers();
    
    adminUsers.forEach(function(adminId) {
      var notificationId = generateUUID();
      var now = new Date();
      
      sheet.appendRow([
        notificationId,
        adminId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        'FALSE',
        now,
        JSON.stringify({
          risk_level: notificationData.risk_level,
          car_id: notificationData.car_id,
          alert_id: notificationData.alert_id
        })
      ]);
    });
    
  } catch (error) {
    Logger.log('Create dashboard notification error: ' + error.toString());
  }
}

/**
 * Get Admin Users - ดึงรายชื่อ Admin
 */
function getAdminUsers() {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    var headers = data[0];
    var roleIndex = headers.indexOf('role');
    var emailIndex = headers.indexOf('email');
    var activeIndex = headers.indexOf('active');
    
    if (roleIndex === -1 || emailIndex === -1) return [];
    
    var admins = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var role = row[roleIndex];
      var email = row[emailIndex];
      var active = activeIndex !== -1 ? (row[activeIndex] === true || row[activeIndex] === 'TRUE') : true;
      
      if ((role === 'admin' || role === 'vehicle') && active && email) {
        admins.push(email);
      }
    }
    
    return admins.length > 0 ? admins : ['admin@ppk.ac.th']; // Fallback
    
  } catch (error) {
    Logger.log('Get admin users error: ' + error.toString());
    return ['admin@ppk.ac.th']; // Fallback
  }
}

/**
 * Send Telegram Notification
 */
function sendTelegramNotification(message) {
  try {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
      return; // Telegram not configured
    }
    
    var url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage';
    var payload = {
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    };
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    };
    
    UrlFetchApp.fetch(url, options);
    
  } catch (error) {
    Logger.log('Send Telegram notification error: ' + error.toString());
  }
}

/**
 * Check if alert already sent today (prevent spam)
 */
function hasAlertToday(carId, riskLevel) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.INSPECTION_ALERTS || 'INSPECTION_ALERTS');
    if (!sheet) return false;
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    
    var headers = data[0];
    var carIdIndex = headers.indexOf('car_id');
    var riskLevelIndex = headers.indexOf('risk_level');
    var createdAtIndex = headers.indexOf('created_at');
    
    if (carIdIndex === -1 || riskLevelIndex === -1 || createdAtIndex === -1) return false;
    
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[carIdIndex] === carId && row[riskLevelIndex] === riskLevel) {
        var createdDate = Utilities.formatDate(new Date(row[createdAtIndex]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        if (createdDate === today) {
          return true;
        }
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log('Has alert today error: ' + error.toString());
    return false;
  }
}

/**
 * Mark Alert Notification Sent
 */
function markAlertNotificationSent(alertId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.INSPECTION_ALERTS || 'INSPECTION_ALERTS');
    if (!sheet) return;
    
    var rowIndex = findRowIndexById(sheet, 0, alertId);
    if (rowIndex === -1) return;
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var notificationSentIndex = headers.indexOf('notification_sent');
    
    if (notificationSentIndex !== -1) {
      sheet.getRange(rowIndex, notificationSentIndex + 1).setValue('TRUE');
    }
    
  } catch (error) {
    Logger.log('Mark alert notification sent error: ' + error.toString());
  }
}

/**
 * Get Inspection Alerts - ดึงรายการการแจ้งเตือน
 */
function getInspectionAlerts(filters) {
  try {
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.INSPECTION_ALERTS || 'INSPECTION_ALERTS');
    if (!sheet) {
      return successResponse({ alerts: [] });
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return successResponse({ alerts: [] });
    }
    
    var alerts = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var alert = rowToObject(row, headers);
      
      // Parse JSON fields
      if (alert.items) {
        try {
          alert.items = JSON.parse(alert.items);
        } catch (e) {
          alert.items = [];
        }
      }
      if (alert.recommendations) {
        try {
          alert.recommendations = JSON.parse(alert.recommendations);
        } catch (e) {
          alert.recommendations = [];
        }
      }
      if (alert.actions_taken) {
        try {
          alert.actions_taken = JSON.parse(alert.actions_taken);
        } catch (e) {
          alert.actions_taken = [];
        }
      }
      
      // Apply filters
      if (filters.car_id && alert.car_id !== filters.car_id) continue;
      if (filters.risk_level && alert.risk_level !== filters.risk_level) continue;
      if (filters.resolved === false && alert.resolved_at) continue;
      if (filters.resolved === true && !alert.resolved_at) continue;
      
      alerts.push(alert);
    }
    
    // Sort by created_at descending
    alerts.sort(function(a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    return successResponse({ alerts: alerts });
    
  } catch (error) {
    Logger.log('Get inspection alerts error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}
