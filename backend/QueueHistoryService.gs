/**
 * PPK DriveHub Queue History Service
 * ดูคิวย้อนหลังและคิวอนาคต
 * 
 * 3 ชั้นข้อมูล:
 * 1. Planned Queue - คิวที่วาง
 * 2. Actual Usage - สิ่งที่เกิดจริง (อิง QR Log)
 * 3. Audit/Change Log - แก้ไข/Override/ยกเลิก
 */

/**
 * Get Vehicle Queue History - ดูคิวย้อนหลังรายรถ
 */
function getVehicleQueueHistory(carId, filters) {
  try {
    filters = filters || {};
    var startDate = filters.date_from || Utilities.formatDate(new Date(new Date().setDate(new Date().getDate() - 90)), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var endDate = filters.date_to || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Get queues
    var queues = getQueues({
      car_id: carId,
      date_from: startDate,
      date_to: endDate
    });
    
    if (!queues.success) {
      return successResponse({ history: [] });
    }
    
    // Enrich with actual usage data
    var history = [];
    for (var i = 0; i < queues.data.queues.length; i++) {
      var queue = queues.data.queues[i];
      var enriched = enrichQueueWithActualUsage(queue);
      history.push(enriched);
    }
    
    // Get inspection logs
    var inspections = { success: false, data: { check_logs: [] } };
    try {
      if (typeof getCheckLogs === 'function') {
        inspections = getCheckLogs({
          car_id: carId,
          date_from: startDate,
          date_to: endDate,
          check_type: 'daily'
        });
      }
    } catch (e) {
      Logger.log('Get inspection logs error: ' + e.toString());
    }
    
    // Get repair logs
    var repairs = { success: false, data: { repairs: [] } };
    try {
      if (typeof getRepairLogs === 'function') {
        repairs = getRepairLogs({
          car_id: carId,
          date_from: startDate,
          date_to: endDate
        });
      }
    } catch (e) {
      Logger.log('Get repair logs error: ' + e.toString());
    }
    
    // Calculate statistics
    var stats = calculateVehicleUsageStats(history, inspections, repairs);
    
    return successResponse({
      car_id: carId,
      period: {
        start: startDate,
        end: endDate
      },
      history: history,
      inspections: inspections.success ? inspections.data.check_logs : [],
      repairs: repairs.success ? repairs.data.repairs : [],
      statistics: stats
    });
    
  } catch (error) {
    Logger.log('Get vehicle queue history error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Driver Queue History - ดูคิวย้อนหลังรายพนักงานขับรถ
 */
function getDriverQueueHistory(driverId, filters) {
  try {
    filters = filters || {};
    var startDate = filters.date_from || Utilities.formatDate(new Date(new Date().setDate(new Date().getDate() - 90)), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var endDate = filters.date_to || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Get queues
    var queues = getQueues({
      driver_id: driverId,
      date_from: startDate,
      date_to: endDate
    });
    
    if (!queues.success) {
      return successResponse({ history: [] });
    }
    
    // Enrich with actual usage data
    var history = [];
    for (var i = 0; i < queues.data.queues.length; i++) {
      var queue = queues.data.queues[i];
      var enriched = enrichQueueWithActualUsage(queue);
      history.push(enriched);
    }
    
    // Calculate statistics
    var stats = calculateDriverUsageStats(history, driverId, startDate, endDate);
    
    return successResponse({
      driver_id: driverId,
      period: {
        start: startDate,
        end: endDate
      },
      history: history,
      statistics: stats
    });
    
  } catch (error) {
    Logger.log('Get driver queue history error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Organization Queue History - ดูคิวย้อนหลังระดับองค์กร
 */
function getOrganizationQueueHistory(filters) {
  try {
    filters = filters || {};
    var startDate = filters.date_from || Utilities.formatDate(new Date(new Date().setDate(new Date().getDate() - 30)), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var endDate = filters.date_to || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Get all queues
    var queues = getQueues({
      date_from: startDate,
      date_to: endDate
    });
    
    if (!queues.success) {
      return successResponse({ history: [], summary: {} });
    }
    
    // Enrich with actual usage data
    var history = [];
    for (var i = 0; i < queues.data.queues.length; i++) {
      var queue = queues.data.queues[i];
      var enriched = enrichQueueWithActualUsage(queue);
      history.push(enriched);
    }
    
    // Calculate organization statistics
    var summary = calculateOrganizationStats(history, startDate, endDate);
    
    return successResponse({
      period: {
        start: startDate,
        end: endDate
      },
      history: history,
      summary: summary
    });
    
  } catch (error) {
    Logger.log('Get organization queue history error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Enrich Queue With Actual Usage - เพิ่มข้อมูลการใช้งานจริงจาก QR Log
 */
function enrichQueueWithActualUsage(queue) {
  try {
    var enriched = JSON.parse(JSON.stringify(queue)); // Deep copy
    
    // Calculate distance if mileage available
    if (queue.mileage_start && queue.mileage_end) {
      enriched.actual_distance = parseFloat(queue.mileage_end) - parseFloat(queue.mileage_start);
    } else {
      enriched.actual_distance = null;
    }
    
    // Calculate hours if times available
    if (queue.started_at && queue.ended_at) {
      try {
        var startTime = queue.started_at.split(':');
        var endTime = queue.ended_at.split(':');
        if (startTime.length === 2 && endTime.length === 2) {
          var startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
          var endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
          var hours = (endMinutes - startMinutes) / 60;
          if (hours < 0) hours += 24; // Handle overnight
          enriched.actual_hours = hours;
        }
      } catch (e) {
        enriched.actual_hours = null;
      }
    } else {
      enriched.actual_hours = null;
    }
    
    // Determine job type
    enriched.job_type = 'near';
    if (enriched.actual_distance && enriched.actual_distance > 200) {
      enriched.job_type = 'far';
    } else if (enriched.mission && (enriched.mission.includes('ไกล') || enriched.mission.includes('ต่างจังหวัด'))) {
      enriched.job_type = 'far';
    }
    
    // Check if heavy job
    enriched.is_heavy_job = enriched.job_type === 'far' || 
                            (enriched.actual_distance && enriched.actual_distance > 200);
    
    // Get inspection results for this date
    if (queue.car_id && queue.date) {
      try {
        if (typeof getCheckLogs === 'function') {
          var inspections = getCheckLogs({
            car_id: queue.car_id,
            date: queue.date,
            check_type: 'daily'
          });
          
          if (inspections.success && inspections.data.check_logs && inspections.data.check_logs.length > 0) {
            var inspection = inspections.data.check_logs[0];
            enriched.inspection_status = inspection.overall_status;
            enriched.inspection_has_issues = inspection.overall_status === 'not_ready' || 
                                            inspection.overall_status === 'warning';
          }
        }
      } catch (e) {
        Logger.log('Get inspection for queue error: ' + e.toString());
      }
    }
    
    // Get audit log for changes
    enriched.changes = getQueueChanges(queue.queue_id);
    
    return enriched;
    
  } catch (error) {
    Logger.log('Enrich queue with actual usage error: ' + error.toString());
    return queue; // Return original if enrichment fails
  }
}

/**
 * Get Queue Changes - ดึงประวัติการเปลี่ยนแปลงของคิวจาก AUDIT_LOG
 */
function getQueueChanges(queueId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.AUDIT_LOG);
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    var headers = data[0];
    // AUDIT_LOG schema: log_id, timestamp, user_id, action, entity_type, entity_id, old_value, new_value, details, ip_address, user_agent, notes
    var entityIdIndex = headers.indexOf('entity_id');
    var entityTypeIndex = headers.indexOf('entity_type');
    var actionIndex = headers.indexOf('action');
    var timestampIndex = headers.indexOf('timestamp');
    var userIndex = headers.indexOf('user_id');
    var oldValueIndex = headers.indexOf('old_value');
    var newValueIndex = headers.indexOf('new_value');
    var notesIndex = headers.indexOf('notes');
    
    if (entityIdIndex === -1 || entityTypeIndex === -1) return [];
    
    var changes = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[entityIdIndex] === queueId && row[entityTypeIndex] === 'queue') {
        try {
          var oldValue = oldValueIndex !== -1 && row[oldValueIndex] ? 
            (typeof row[oldValueIndex] === 'string' ? JSON.parse(row[oldValueIndex]) : row[oldValueIndex]) : {};
          var newValue = newValueIndex !== -1 && row[newValueIndex] ? 
            (typeof row[newValueIndex] === 'string' ? JSON.parse(row[newValueIndex]) : row[newValueIndex]) : {};
        } catch (e) {
          var oldValue = {};
          var newValue = {};
        }
        
        changes.push({
          action: actionIndex !== -1 ? row[actionIndex] : '',
          timestamp: timestampIndex !== -1 ? row[timestampIndex] : '',
          user_id: userIndex !== -1 ? row[userIndex] : '',
          old_value: oldValue,
          new_value: newValue,
          notes: notesIndex !== -1 ? row[notesIndex] : ''
        });
      }
    }
    
    // Sort by timestamp descending
    changes.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    return changes;
    
  } catch (error) {
    Logger.log('Get queue changes error: ' + error.toString());
    return [];
  }
}

/**
 * Calculate Vehicle Usage Stats - คำนวณสถิติการใช้งานรถ
 */
function calculateVehicleUsageStats(history, inspections, repairs) {
  var stats = {
    total_days_used: 0,
    total_distance: 0,
    total_hours: 0,
    heavy_jobs: 0,
    inspection_issues: 0,
    repair_days: 0,
    availability_rate: 0
  };
  
  var daysUsed = {};
  var repairDays = {};
  
  // Count days used
  for (var i = 0; i < history.length; i++) {
    var queue = history[i];
    if (queue.status === 'done' || queue.status === 'running') {
      if (!daysUsed[queue.date]) {
        daysUsed[queue.date] = true;
        stats.total_days_used++;
      }
      
      if (queue.actual_distance) {
        stats.total_distance += queue.actual_distance;
      }
      if (queue.actual_hours) {
        stats.total_hours += queue.actual_hours;
      }
      if (queue.is_heavy_job) {
        stats.heavy_jobs++;
      }
      if (queue.inspection_has_issues) {
        stats.inspection_issues++;
      }
    }
  }
  
  // Count repair days
  if (repairs.success && repairs.data && repairs.data.repairs) {
    for (var i = 0; i < repairs.data.repairs.length; i++) {
      var repair = repairs.data.repairs[i];
      if (repair.status === 'in_progress' || repair.status === 'completed') {
        var repairDate = repair.date_started || repair.date_reported;
        if (repairDate && !repairDays[repairDate]) {
          repairDays[repairDate] = true;
          stats.repair_days++;
        }
      }
    }
  }
  
  // Calculate availability rate
  var totalDays = Math.ceil((new Date(history.length > 0 ? history[history.length - 1].date : new Date()) - 
                            new Date(history.length > 0 ? history[0].date : new Date())) / (1000 * 60 * 60 * 24));
  if (totalDays > 0) {
    stats.availability_rate = ((totalDays - stats.repair_days) / totalDays * 100).toFixed(2);
  }
  
  return stats;
}

/**
 * Calculate Driver Usage Stats - คำนวณสถิติการใช้งานของคนขับ
 */
function calculateDriverUsageStats(history, driverId, startDate, endDate) {
  var stats = {
    total_days_worked: 0,
    total_distance: 0,
    total_hours: 0,
    heavy_jobs: 0,
    standby_days: 0,
    fatigue_overrides: 0,
    consecutive_days: 0
  };
  
  var daysWorked = {};
  var lastDate = null;
  var currentConsecutive = 0;
  var maxConsecutive = 0;
  
  for (var i = 0; i < history.length; i++) {
    var queue = history[i];
    if (queue.status === 'done' || queue.status === 'running') {
      if (!daysWorked[queue.date]) {
        daysWorked[queue.date] = true;
        stats.total_days_worked++;
        
        // Check consecutive days
        if (lastDate) {
          var daysDiff = Math.floor((new Date(queue.date) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            currentConsecutive++;
          } else {
            currentConsecutive = 1;
          }
        } else {
          currentConsecutive = 1;
        }
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        lastDate = queue.date;
      }
      
      if (queue.actual_distance) {
        stats.total_distance += queue.actual_distance;
      }
      if (queue.actual_hours) {
        stats.total_hours += queue.actual_hours;
      }
      if (queue.is_heavy_job) {
        stats.heavy_jobs++;
      }
      if (queue.fatigue_override === true || queue.fatigue_override === 'TRUE') {
        stats.fatigue_overrides++;
      }
    }
  }
  
  stats.consecutive_days = maxConsecutive;
  
  // Get standby days from queue rules or usage logs
  // This would need integration with queue rules system
  
  return stats;
}

/**
 * Calculate Organization Stats - คำนวณสถิติระดับองค์กร
 */
function calculateOrganizationStats(history, startDate, endDate) {
  var stats = {
    total_queues: history.length,
    completed_queues: 0,
    cancelled_queues: 0,
    total_distance: 0,
    total_hours: 0,
    heavy_jobs: 0,
    near_jobs: 0,
    vehicles_used: {},
    drivers_used: {},
    fairness_score: 0
  };
  
  for (var i = 0; i < history.length; i++) {
    var queue = history[i];
    
    if (queue.status === 'done') {
      stats.completed_queues++;
    } else if (queue.status === 'cancel') {
      stats.cancelled_queues++;
    }
    
    if (queue.actual_distance) {
      stats.total_distance += queue.actual_distance;
    }
    if (queue.actual_hours) {
      stats.total_hours += queue.actual_hours;
    }
    if (queue.is_heavy_job) {
      stats.heavy_jobs++;
    } else {
      stats.near_jobs++;
    }
    
    if (queue.car_id) {
      stats.vehicles_used[queue.car_id] = (stats.vehicles_used[queue.car_id] || 0) + 1;
    }
    if (queue.driver_id) {
      stats.drivers_used[queue.driver_id] = (stats.drivers_used[queue.driver_id] || 0) + 1;
    }
  }
  
  // Calculate fairness score (variance in driver usage)
  var driverCounts = Object.values(stats.drivers_used);
  if (driverCounts.length > 0) {
    var avg = driverCounts.reduce(function(a, b) { return a + b; }, 0) / driverCounts.length;
    var variance = driverCounts.reduce(function(sum, count) {
      return sum + Math.pow(count - avg, 2);
    }, 0) / driverCounts.length;
    var stdDev = Math.sqrt(variance);
    stats.fairness_score = avg > 0 ? Math.max(0, 100 - (stdDev / avg * 100)) : 100;
  }
  
  stats.unique_vehicles = Object.keys(stats.vehicles_used).length;
  stats.unique_drivers = Object.keys(stats.drivers_used).length;
  
  return stats;
}

/**
 * Get Queue Plan - ดูคิวอนาคต (Planned Queue)
 */
function getQueuePlan(filters) {
  try {
    filters = filters || {};
    var startDate = filters.date_from || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var endDate = filters.date_to || Utilities.formatDate(new Date(new Date().setDate(new Date().getDate() + 30)), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Get future queues
    var queues = getQueues({
      date_from: startDate,
      date_to: endDate,
      status: filters.status || null // null = all statuses
    });
    
    if (!queues.success) {
      return successResponse({ plan: [] });
    }
    
    // Group by vehicle and driver
    var vehiclePlan = {};
    var driverPlan = {};
    
    for (var i = 0; i < queues.data.queues.length; i++) {
      var queue = queues.data.queues[i];
      
      // Vehicle plan
      if (queue.car_id) {
        if (!vehiclePlan[queue.car_id]) {
          vehiclePlan[queue.car_id] = [];
        }
        vehiclePlan[queue.car_id].push({
          date: queue.date,
          time_start: queue.time_start,
          time_end: queue.time_end,
          mission: queue.mission,
          status: queue.status,
          driver_id: queue.driver_id
        });
      }
      
      // Driver plan
      if (queue.driver_id) {
        if (!driverPlan[queue.driver_id]) {
          driverPlan[queue.driver_id] = [];
        }
        driverPlan[queue.driver_id].push({
          date: queue.date,
          time_start: queue.time_start,
          time_end: queue.time_end,
          mission: queue.mission,
          status: queue.status,
          car_id: queue.car_id
        });
      }
    }
    
    // Check for conflicts (emergency repairs, leaves)
    var conflicts = [];
    try {
      conflicts = checkFutureConflicts(queues.data.queues, startDate, endDate);
    } catch (e) {
      Logger.log('Check future conflicts error: ' + e.toString());
    }
    
    return successResponse({
      period: {
        start: startDate,
        end: endDate
      },
      plan: queues.data.queues,
      vehicle_plan: vehiclePlan,
      driver_plan: driverPlan,
      conflicts: conflicts
    });
    
  } catch (error) {
    Logger.log('Get queue plan error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Check Future Conflicts - ตรวจสอบความขัดแย้งในอนาคต
 */
function checkFutureConflicts(queues, startDate, endDate) {
  var conflicts = [];
  
  for (var i = 0; i < queues.length; i++) {
    var queue = queues[i];
    
    // Check scheduled repairs
    if (queue.car_id) {
      var scheduledRepair = isCarScheduledForRepair(queue.car_id, queue.date);
      if (scheduledRepair.scheduled) {
        conflicts.push({
          type: 'scheduled_repair',
          queue_id: queue.queue_id,
          car_id: queue.car_id,
          date: queue.date,
          message: 'รถถูกจองซ่อมในวันที่ ' + queue.date,
          repair_info: scheduledRepair.scheduled_repairs[0]
        });
      }
    }
    
    // Check driver leave
    if (queue.driver_id) {
      var driverLeave = isDriverOnLeave(queue.driver_id, queue.date);
      if (driverLeave.on_leave) {
        conflicts.push({
          type: 'driver_leave',
          queue_id: queue.queue_id,
          driver_id: queue.driver_id,
          date: queue.date,
          message: 'คนขับลาตั้งแต่ ' + driverLeave.leave.start_date + ' ถึง ' + driverLeave.leave.end_date,
          leave_info: driverLeave.leave
        });
      }
    }
    
    // Check inspection alerts
    if (queue.car_id && queue.date) {
      try {
        if (typeof getInspectionAlerts === 'function') {
          var alerts = getInspectionAlerts({
            car_id: queue.car_id,
            date_from: queue.date,
            date_to: queue.date,
            risk_level: 'critical'
          });
          
          if (alerts.success && alerts.data.alerts && alerts.data.alerts.length > 0) {
            conflicts.push({
              type: 'inspection_alert',
              queue_id: queue.queue_id,
              car_id: queue.car_id,
              date: queue.date,
              message: 'พบการแจ้งเตือนการตรวจสภาพรถระดับ Critical',
              alert_info: alerts.data.alerts[0]
            });
          }
        }
      } catch (e) {
        Logger.log('Check inspection alerts error: ' + e.toString());
      }
    }
  }
  
  return conflicts;
}

/**
 * Get Queue Report - สร้างรายงานคิว (สำหรับ Export)
 */
function getQueueReport(filters) {
  try {
    filters = filters || {};
    var reportType = filters.report_type || 'summary'; // summary/detailed/by_vehicle/by_driver
    
    var startDate = filters.date_from || Utilities.formatDate(new Date(new Date().setDate(new Date().getDate() - 30)), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var endDate = filters.date_to || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    if (reportType === 'by_vehicle' && filters.car_id) {
      return getVehicleQueueHistory(filters.car_id, { date_from: startDate, date_to: endDate });
    } else if (reportType === 'by_driver' && filters.driver_id) {
      return getDriverQueueHistory(filters.driver_id, { date_from: startDate, date_to: endDate });
    } else {
      return getOrganizationQueueHistory({ date_from: startDate, date_to: endDate });
    }
    
  } catch (error) {
    Logger.log('Get queue report error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}
