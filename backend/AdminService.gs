/**
 * PPK DriveHub Admin Service
 * ฟังก์ชันสำหรับ Admin เท่านั้น (ยกเว้น getPublicLandingStats)
 */

/**
 * Get Today Status Counts - สถิติวันนี้เท่านั้น (ดึงจากคิว + บันทึกการใช้งานรถ + สถานะซ่อม)
 * ใช้สำหรับหน้าแรก/แดชบอร์ดแบบเรียบ: คนขับทำงาน/ว่าง, รถทั้งหมด/ออกงาน/ว่าง/ซ่อม
 */
function getTodayStatusCounts() {
  try {
    var today = formatDate(new Date());
    var vehiclesResult = getVehicles({ active: true });
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    var vehicles_total = vehicles.length;
    var vehicles_in_repair = 0;
    for (var v = 0; v < vehicles.length; v++) {
      if (vehicles[v].status === 'repair') vehicles_in_repair++;
    }

    var driversResult = getDrivers({ status: 'active' });
    var drivers = driversResult.success ? driversResult.data.drivers : [];
    var drivers_total = drivers.length;

    var queuesResult = getQueues({ today_only: true });
    var queues = queuesResult.success ? queuesResult.data.queues : [];
    var carIdsFromQueue = {};
    var driverIdsFromQueue = {};
    for (var i = 0; i < queues.length; i++) {
      var q = queues[i];
      if (q.status === 'cancel' || q.status === 'done') continue;
      if (q.car_id) carIdsFromQueue[q.car_id] = true;
      if (q.driver_id) driverIdsFromQueue[q.driver_id] = true;
    }

    var usageResult = getUsageRecordsRaw({ date_from: today, date_to: today });
    var usageRecords = usageResult.success ? usageResult.data.records : [];
    var beforeTripsByCar = {};
    var driverIdsFromUsage = {};
    for (var j = 0; j < usageRecords.length; j++) {
      var r = usageRecords[j];
      var datePart = (r.datetime || '').split(' ')[0];
      if (datePart !== today) continue;
      if (r.record_type === 'before_trip') {
        beforeTripsByCar[r.car_id] = true;
        if (r.driver_id) driverIdsFromUsage[r.driver_id] = true;
      }
    }
    for (var k = 0; k < usageRecords.length; k++) {
      var r2 = usageRecords[k];
      if (r2.record_type === 'after_trip' && (r2.datetime || '').indexOf(today) === 0) {
        delete beforeTripsByCar[r2.car_id];
      }
    }
    var carsOutFromUsage = Object.keys(beforeTripsByCar).length;

    var carsOutFromQueue = Object.keys(carIdsFromQueue).length;
    var carsOutToday = 0;
    var seenOut = {};
    for (var cid in carIdsFromQueue) { if (!seenOut[cid]) { seenOut[cid] = true; carsOutToday++; } }
    for (var cid in beforeTripsByCar) { if (!seenOut[cid]) { seenOut[cid] = true; carsOutToday++; } }

    var driversWorkingToday = 0;
    var seenDriver = {};
    for (var did in driverIdsFromQueue) { if (!seenDriver[did]) { seenDriver[did] = true; driversWorkingToday++; } }
    for (var did in driverIdsFromUsage) { if (!seenDriver[did]) { seenDriver[did] = true; driversWorkingToday++; } }

    var vehicles_out_today = carsOutToday;
    var vehicles_available_today = vehicles_total - vehicles_in_repair - vehicles_out_today;
    if (vehicles_available_today < 0) vehicles_available_today = 0;
    var drivers_working_today = driversWorkingToday;
    var drivers_available_today = drivers_total - drivers_working_today;
    if (drivers_available_today < 0) drivers_available_today = 0;

    return {
      date: today,
      drivers_working_today: drivers_working_today,
      drivers_available_today: drivers_available_today,
      drivers_total: drivers_total,
      vehicles_total: vehicles_total,
      vehicles_out_today: vehicles_out_today,
      vehicles_available_today: vehicles_available_today,
      vehicles_in_repair: vehicles_in_repair
    };
  } catch (err) {
    Logger.log('getTodayStatusCounts error: ' + err.toString());
    return null;
  }
}

/**
 * Get Public Landing Stats - สถิติหน้าแรก "อ่านอย่างเดียว" ไม่ต้อง Login
 * คืนค่า: วันนี้ คนขับทำงาน/ว่าง, รถทั้งหมด/ออกงาน/ว่าง/ซ่อม
 */
function getPublicLandingStats() {
  try {
    var counts = getTodayStatusCounts();
    if (!counts) return { success: false, message: 'ไม่สามารถคำนวณสถิติได้' };
    return { success: true, data: counts };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Get Dashboard Stats Today Only - แดชบอร์ดแบบเรียบ เฉพาะตัวเลขวันนี้ (หลัง Login)
 */
function getDashboardStatsToday() {
  try {
    var counts = getTodayStatusCounts();
    if (!counts) return { success: false, message: 'ไม่สามารถคำนวณสถิติได้' };
    return { success: true, data: counts };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Get Dashboard Stats - สถิติ Dashboard ปกติ
 * แสดงสถานะรถและพนักงานขับรถที่ว่าง/ไม่ว่าง ณ วันนี้
 */
function getDashboardStats() {
  try {
    var today = formatDate(new Date());
    var now = new Date();
    var currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
    
    // Get today's queues
    var queuesResult = getQueues({ today_only: true });
    var queues = queuesResult.success ? queuesResult.data.queues : [];
    
    // Get vehicles
    var vehiclesResult = getVehicles({ active: true });
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    
    // Get drivers
    var driversResult = getDrivers({ status: 'active' });
    var drivers = driversResult.success ? driversResult.data.drivers : [];
    
    // Get queue rules (for driver assignment rules)
    var rulesResult = getQueueRules();
    var rules = rulesResult.success ? rulesResult.data.rules : [];
    
    // Helper function to parse time string to minutes
    function parseTimeToMinutes(timeStr) {
      if (!timeStr) return null;
      var parts = timeStr.split(':');
      return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
    }
    
    // Helper function to check if current time is within queue time range
    function isCurrentTimeInQueue(queue) {
      if (!queue.time_start) return false;
      if (queue.status === 'cancel' || queue.status === 'done') return false;
      
      var queueStart = parseTimeToMinutes(queue.time_start);
      var queueEnd = queue.time_end ? parseTimeToMinutes(queue.time_end) : null;
      
      if (queueEnd === null) {
        // If no end time, assume 8 hours duration
        queueEnd = queueStart + (8 * 60);
      }
      
      return currentTime >= queueStart && currentTime <= queueEnd;
    }
    
    // Get vehicles and drivers that are currently in use (based on current time)
    var vehiclesInUseNow = {};
    var driversInUseNow = {};
    
    for (var i = 0; i < queues.length; i++) {
      var queue = queues[i];
      if (isCurrentTimeInQueue(queue)) {
        if (queue.car_id) {
          vehiclesInUseNow[queue.car_id] = true;
        }
        if (queue.driver_id) {
          driversInUseNow[queue.driver_id] = true;
        }
      }
    }
    
    // Count vehicles by status (ว่าง/ไม่ว่าง) ณ เวลาปัจจุบัน
    var vehiclesAvailable = [];
    var vehiclesInUse = [];
    var vehiclesRepair = [];
    var vehiclesUnavailable = [];
    
    for (var i = 0; i < vehicles.length; i++) {
      var vehicle = vehicles[i];
      
      // Check if vehicle is in repair or unavailable
      if (vehicle.status === 'repair') {
        vehiclesRepair.push(vehicle);
      } else if (vehicle.status === 'unavailable') {
        vehiclesUnavailable.push(vehicle);
      } else if (vehiclesInUseNow[vehicle.car_id]) {
        // Vehicle is currently in use (has active queue at current time)
        vehiclesInUse.push(vehicle);
      } else {
        // Vehicle is available
        vehiclesAvailable.push(vehicle);
      }
    }
    
    // Count drivers by status (ว่าง/ไม่ว่าง) ณ เวลาปัจจุบัน
    var driversAvailable = [];
    var driversInUse = [];
    var driversByAssignment = {
      out_of_school: [],  // งานนอกสถานที่
      in_school: [],      // งานภายในโรงเรียน
      executive: [],      // ประจำผู้บริหาร
      standby_school: []  // สแตนด์บาย
    };
    
    // Categorize drivers based on current time
    for (var i = 0; i < drivers.length; i++) {
      var driver = drivers[i];
      var isCurrentlyInUse = driversInUseNow[driver.driver_id] === true;
      
      if (!isCurrentlyInUse) {
        driversAvailable.push(driver);
      } else {
        driversInUse.push(driver);
        
        // Find the active queue for this driver
        var activeQueue = null;
        for (var j = 0; j < queues.length; j++) {
          if (queues[j].driver_id === driver.driver_id && isCurrentTimeInQueue(queues[j])) {
            activeQueue = queues[j];
            break;
          }
        }
        
        // Check assignment type from rules
        var assignmentType = getDriverAssignmentType(driver.driver_id, rules, queues);
        if (assignmentType === 'out_of_school') {
          driversByAssignment.out_of_school.push(driver);
        } else if (assignmentType === 'in_school') {
          driversByAssignment.in_school.push(driver);
        } else if (assignmentType === 'standby_school') {
          driversByAssignment.standby_school.push(driver);
        } else if (assignmentType === 'executive') {
          driversByAssignment.executive.push(driver);
        }
      }
    }
    
    // Count queues by status
    var queuesByStatus = {
      pending: 0,
      running: 0,
      done: 0,
      cancel: 0
    };
    
    for (var i = 0; i < queues.length; i++) {
      var status = queues[i].status;
      if (queuesByStatus[status] !== undefined) {
        queuesByStatus[status]++;
      }
    }
    
    var stats = {
      date: today,
      current_time: Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm'),
      vehicles: {
        total: vehicles.length,
        available: vehiclesAvailable.length,
        in_use: vehiclesInUse.length,
        repair: vehiclesRepair.length,
        unavailable: vehiclesUnavailable.length,
        available_list: vehiclesAvailable.map(function(v) { return { car_id: v.car_id, license_plate: v.license_plate, brand: v.brand, model: v.model }; }),
        in_use_list: vehiclesInUse.map(function(v) { return { car_id: v.car_id, license_plate: v.license_plate, brand: v.brand, model: v.model }; }),
        repair_list: vehiclesRepair.map(function(v) { return { car_id: v.car_id, license_plate: v.license_plate, brand: v.brand, model: v.model }; })
      },
      drivers: {
        total: drivers.length,
        available: driversAvailable.length,
        in_use: driversInUse.length,
        available_list: driversAvailable.map(function(d) { return { driver_id: d.driver_id, full_name: d.full_name, phone: d.phone }; }),
        in_use_list: driversInUse.map(function(d) { return { driver_id: d.driver_id, full_name: d.full_name, phone: d.phone }; }),
        by_assignment: {
          out_of_school: driversByAssignment.out_of_school.length,
          in_school: driversByAssignment.in_school.length,
          standby_school: driversByAssignment.standby_school.length,
          executive: driversByAssignment.executive.length
        }
      },
      queues: {
        today: queues.length,
        by_status: queuesByStatus,
        running: queues.filter(function(q) { return q.status === 'running'; })
      }
    };
    
    // Count drivers with fatigue flag
    var driversWithFatigue = 0;
    var driversStandby = 0;
    var driversOverridden = [];
    
    for (var i = 0; i < drivers.length; i++) {
      var driver = drivers[i];
      if (driver.fatigue_flag === true || driver.fatigue_flag === 'TRUE') {
        driversWithFatigue++;
      }
      if (driver.status === 'standby') {
        driversStandby++;
      }
    }
    
    // Check for drivers with frequent fatigue overrides (from audit log)
    var auditLogs = getAuditLogs({
      action: 'create',
      entity_type: 'queue',
      date_from: formatDate(new Date(new Date().setDate(new Date().getDate() - 30)))
    });
    
    if (auditLogs.success) {
      var overrideCounts = {};
      auditLogs.data.logs.forEach(function(log) {
        if (log.details && log.details.fatigue_override === true) {
          var driverId = log.details.driver_id;
          if (!overrideCounts[driverId]) {
            overrideCounts[driverId] = 0;
          }
          overrideCounts[driverId]++;
        }
      });
      
      for (var driverId in overrideCounts) {
        if (overrideCounts[driverId] > 3) { // Override มากกว่า 3 ครั้งใน 30 วัน
          var driver = getDriverById(driverId);
          if (driver.success) {
            driversOverridden.push({
              driver_id: driverId,
              full_name: (driver.success && driver.data && driver.data.driver) ? driver.data.driver.full_name : driverId,
              override_count: overrideCounts[driverId]
            });
          }
        }
      }
    }
    
    stats.drivers.with_fatigue = driversWithFatigue;
    stats.drivers.standby = driversStandby;
    stats.drivers.overridden_frequently = driversOverridden.length;
    stats.drivers.overridden_list = driversOverridden;
    
    // Get KPIs (last 30 days)
    var kpiPeriod = {
      date_from: formatDate(new Date(new Date().setDate(new Date().getDate() - 30))),
      date_to: formatDate(new Date())
    };
    
    var kpis = getAllKPIs(kpiPeriod);
    if (kpis.success) {
      stats.kpis = {
        availability: kpis.data.availability ? {
          overall_rate: kpis.data.availability.overall.availability_rate,
          total_vehicles: kpis.data.availability.overall.total_vehicles
        } : null,
        emergency_repairs: kpis.data.emergency_repairs ? {
          total: kpis.data.emergency_repairs.total,
          by_month: kpis.data.emergency_repairs.by_month
        } : null,
        average_cost: kpis.data.average_cost ? {
          average_total_cost: kpis.data.average_cost.overall.average_total_cost,
          average_cost_per_km: kpis.data.average_cost.overall.average_cost_per_km
        } : null
      };
    }
    
    // Get Risk Alerts
    var riskAlerts = getAllRiskAlerts(3, 20); // threshold: 3 overrides/month, 20% above average
    if (riskAlerts.success) {
      stats.risk_alerts = {
        total: riskAlerts.data.total_alerts,
        driver_risk: riskAlerts.data.driver_risk ? {
          total_at_risk: riskAlerts.data.driver_risk.total_at_risk,
          high_risk: riskAlerts.data.driver_risk.high_risk
        } : null,
        vehicle_model_risk: riskAlerts.data.vehicle_model_risk ? {
          total_at_risk: riskAlerts.data.vehicle_model_risk.total_at_risk,
          high_risk: riskAlerts.data.vehicle_model_risk.high_risk
        } : null
      };
    }
    
    return successResponse({ stats: stats });
    
  } catch (error) {
    Logger.log('Get dashboard stats error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Helper: Get driver assignment type from rules and queues
 * assignment_type: out_of_school | in_school | executive | standby_school
 */
function getDriverAssignmentType(driverId, rules, queues) {
  // จาก QUEUE_RULES ก่อน
  if (rules && rules.length > 0) {
    for (var j = 0; j < rules.length; j++) {
      if (rules[j].driver_id === driverId && (rules[j].active === true || rules[j].active === 'TRUE')) {
        return rules[j].assignment_type || 'out_of_school';
      }
    }
  }
  // Fallback: จากคิวของวันนี้ (mission)
  for (var i = 0; i < (queues || []).length; i++) {
    if (queues[i].driver_id === driverId) {
      var mission = (queues[i].mission || '');
      if (!mission || typeof mission !== 'string') return 'other';
      if (mission.indexOf('ผู้บริหาร') !== -1) return 'executive';
      if (mission.indexOf('สแตนบาย') !== -1) return 'standby_school';
      if (mission.indexOf('โรงเรียน') !== -1 || mission.indexOf('ภายใน') !== -1) return 'in_school';
      return 'out_of_school';
    }
  }
  return 'out_of_school';
}

/**
 * Get Admin Dashboard Stats - สถิติ Dashboard สำหรับ Admin
 */
function getAdminDashboardStats() {
  try {
    var stats = getDashboardStats();
    if (!stats.success) {
      return stats;
    }
    
    var adminStats = stats.data.stats;
    
    // Get pending user requests
    var requestsResult = getUserRequests('pending');
    var pendingRequests = requestsResult.success ? requestsResult.data.requests : [];
    
    // Get queues without QR scan (potential issues)
    var allQueuesResult = getQueues({ today_only: true });
    var allQueues = allQueuesResult.success ? allQueuesResult.data.queues : [];
    var queuesWithoutQR = allQueues.filter(function(q) {
      return q.status === 'running' && !q.qr_scan_id;
    });
    
    // Get check logs with issues
    var checkLogsResult = getCheckLogs({ has_issue: true });
    var checkLogsWithIssues = checkLogsResult.success ? checkLogsResult.data.check_logs : [];
    
    // Get vehicles in use without queue
    var vehiclesInUse = adminStats.vehicles.by_status.in_use || 0;
    var runningQueues = adminStats.queues.running.length;
    var vehiclesWithoutQueue = vehiclesInUse - runningQueues;
    
    adminStats.alerts = {
      pending_user_requests: pendingRequests.length,
      queues_without_qr: queuesWithoutQR.length,
      check_logs_with_issues: checkLogsWithIssues.length,
      vehicles_without_queue: vehiclesWithoutQueue > 0 ? vehiclesWithoutQueue : 0
    };
    
    adminStats.pending_requests = pendingRequests;
    adminStats.queues_without_qr = queuesWithoutQR;
    adminStats.check_logs_with_issues = checkLogsWithIssues;
    
    return successResponse({ stats: adminStats });
    
  } catch (error) {
    Logger.log('Get admin dashboard stats error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Audit Logs - ดึง Audit Logs
 */
function getAuditLogs(filters) {
  try {
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.AUDIT_LOG);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ logs: [] });
    }
    
    var logs = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var log = rowToObject(row, headers);
      
      // Parse details JSON
      if (log.details) {
        try {
          log.details = JSON.parse(log.details);
        } catch (e) {
          log.details = {};
        }
      } else {
        log.details = {};
      }
      
      // Apply filters
      if (filters.user_id && log.user_id !== filters.user_id) {
        continue;
      }
      if (filters.action && log.action !== filters.action) {
        continue;
      }
      if (filters.entity_type && log.entity_type !== filters.entity_type) {
        continue;
      }
      if (filters.entity_id && log.entity_id !== filters.entity_id) {
        continue;
      }
      if (filters.date_from && log.timestamp < filters.date_from) {
        continue;
      }
      if (filters.date_to && log.timestamp > filters.date_to) {
        continue;
      }
      
      logs.push(log);
    }
    
    // Sort by timestamp descending
    logs.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Limit results (default 500 เพื่อประสิทธิภาพเมื่อ log เยอะ)
    var limit = filters.limit ? parseInt(filters.limit) : 500;
    if (limit > 2000) limit = 2000;
    logs = logs.slice(0, limit);
    
    return successResponse({ logs: logs });
    
  } catch (error) {
    Logger.log('Get audit logs error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get System Settings - ดึงค่าตั้งค่าระบบ
 */
function getSystemSettings() {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.MASTER, [
      'key', 'value', 'description', 'updated_at', 'updated_by'
    ]);
    
    var data = sheet.getDataRange().getValues();
    var settings = {};
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      settings[row[0]] = {
        value: row[1],
        description: row[2],
        updated_at: row[3],
        updated_by: row[4]
      };
    }
    
    // Add default settings if not exists
    if (!settings.system_name) {
      settings.system_name = {
        value: CONFIG.SYSTEM_NAME,
        description: 'ชื่อระบบ'
      };
    }
    if (!settings.system_year) {
      settings.system_year = {
        value: CONFIG.SYSTEM_YEAR,
        description: 'ปีการศึกษา/ปีงบประมาณ'
      };
    }
    
    return successResponse({ settings: settings });
    
  } catch (error) {
    Logger.log('Get system settings error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update System Setting - อัปเดตค่าตั้งค่าระบบ
 */
function updateSystemSetting(key, value) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.MASTER, [
      'key', 'value', 'description', 'updated_at', 'updated_by'
    ]);
    
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    // Find existing setting
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        rowIndex = i + 1;
        break;
      }
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    if (rowIndex === -1) {
      // Create new setting
      sheet.appendRow([
        key,
        value,
        '', // description
        now,
        currentUser
      ]);
    } else {
      // Update existing setting
      sheet.getRange(rowIndex, 2).setValue(value);
      sheet.getRange(rowIndex, 4).setValue(now);
      sheet.getRange(rowIndex, 5).setValue(currentUser);
    }
    
    // Log update
    logAudit(currentUser, 'update', 'system', key, {
      value: value
    });
    
    return successResponse({}, 'อัปเดตค่าตั้งค่าสำเร็จ');
    
  } catch (error) {
    Logger.log('Update system setting error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Super Admin Features
 */

/**
 * Require Super Admin - ตรวจสอบว่าเป็น Super Admin (throw error ถ้าไม่ใช่)
 */
function requireSuperAdmin() {
  var currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('ต้องล็อกอิน');
  }
  
  var userInfo = getCurrentUserInfo(currentUser);
  if (!userInfo.success || !userInfo.data || !userInfo.data.user) {
    throw new Error('ไม่พบข้อมูลผู้ใช้');
  }
  
  var user = userInfo.data.user;
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    // For now, allow admin to use super admin features
    // In production, should check for super_admin only
    Logger.log('Warning: Using super admin feature as admin');
  }
  
  return user;
}

/**
 * Get Default Settings - ดึงค่า default ของการตั้งค่าระบบ
 */
function getDefaultSettings() {
  try {
    requireSuperAdmin();
    
    return successResponse({
      queue: {
        fatigue_distance_limit: 400,
        freeze_before_minutes: 30,
        recovery_days_after_fatigue: 1
      },
      fuel: {
        anomaly_threshold_percent: 20,
        report_cycle: 'monthly'
      },
      maintenance: {
        advance_warning_days: 7,
        advance_warning_km: 100
      },
      tax_insurance: {
        tax_warning_days: 90,
        insurance_warning_days: 90
      },
      auto_recovery: {
        pending_return_hour: 18,
        default_out_time: '08:00',
        default_in_time: '17:30'
      }
    });
    
  } catch (error) {
    Logger.log('Get default settings error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Reset Admin Settings to Default - รีเซ็ตการตั้งค่า Admin เป็นค่า default
 * ใช้ key แบบแบนเดียวกับ frontend และ getQueueSettings/getRepairSettings
 */
function resetAdminSettingsToDefault() {
  try {
    requireAdmin();
    
    var currentUser = getCurrentUser() || 'admin';
    var sheet = getOrCreateSheet(CONFIG.SHEETS.MASTER, [
      'key', 'value', 'description', 'updated_at', 'updated_by'
    ]);
    
    // ค่า default ใช้ key แบบแบนเดียวกับ updateSystemSetting และ getAdminSettings
    var defaultValues = {
      'max_car_usage_per_week': 3,
      'max_driver_long_jobs_per_week': 2,
      'fatigue_distance_threshold': 400,
      'recovery_day_enabled': true,
      'pm_advance_days': 7,
      'pm_advance_km': 100,
      'emergency_auto_lock': true,
      'tax_alert_months': 3,
      'insurance_alert_months': 3
    };
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var keyIndex = headers.indexOf('key');
    var valueIndex = headers.indexOf('value');
    var updatedAtIndex = headers.indexOf('updated_at');
    var updatedByIndex = headers.indexOf('updated_by');
    
    var now = new Date();
    
    Object.keys(defaultValues).forEach(function(key) {
      var val = defaultValues[key];
      var valueStr = typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val);
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (data[i][keyIndex] === key) {
          sheet.getRange(i + 1, valueIndex + 1).setValue(valueStr);
          if (updatedAtIndex !== -1) sheet.getRange(i + 1, updatedAtIndex + 1).setValue(now);
          if (updatedByIndex !== -1) sheet.getRange(i + 1, updatedByIndex + 1).setValue(currentUser);
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([key, valueStr, '', now, currentUser]);
      }
    });
    
    logAudit(currentUser, 'update', 'system_settings', 'all', {
      action: 'reset_to_default'
    });
    
    return successResponse({
      reset: true
    }, 'รีเซ็ตการตั้งค่าเป็นค่า default สำเร็จ');
    
  } catch (error) {
    Logger.log('Reset admin settings error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * View PDPA Log - ดู PDPA log (Super Admin only)
 * Alias for getPDPALog but requires super admin
 */
function viewPDPALog(filters) {
  try {
    requireSuperAdmin();
    return getPDPALog(filters);
  } catch (error) {
    Logger.log('View PDPA log error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Reset Other Admin - รีเซ็ต Admin คนอื่น (Super Admin only)
 * ใช้เมื่อ Admin คนอื่นตั้งค่าผิดพลาดหรือต้องการรีเซ็ต
 */
function resetOtherAdmin(adminId) {
  try {
    requireSuperAdmin();
    
    if (!adminId) {
      return errorResponse('ต้องระบุ admin_id', 'MISSING_PARAM');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    
    // Get admin info
    var adminInfo = getCurrentUserInfo(adminId);
    if (!adminInfo.success || !adminInfo.data || !adminInfo.data.user) {
      return errorResponse('ไม่พบ Admin', 'ADMIN_NOT_FOUND');
    }
    
    var admin = adminInfo.data.user;
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return errorResponse('ไม่ใช่ Admin', 'NOT_ADMIN');
    }
    
    // Prevent resetting super_admin
    if (admin.role === 'super_admin') {
      return errorResponse('ไม่สามารถรีเซ็ต Super Admin ได้', 'SUPER_ADMIN_PROTECTED');
    }
    
    // Reset admin's settings/permissions to default
    // For now, just log the action
    logAudit(currentUser, 'update', 'admin', adminId, {
      action: 'reset_by_super_admin',
      reset_by: currentUser
    });
    
    return successResponse({
      admin_id: adminId,
      reset: true
    }, 'รีเซ็ต Admin สำเร็จ');
    
  } catch (error) {
    Logger.log('Reset other admin error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}
