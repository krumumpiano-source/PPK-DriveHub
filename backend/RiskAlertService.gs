/**
 * PPK DriveHub Risk Alert Service
 * ระบบแจ้งเตือนความเสี่ยง
 * 
 * B1. ความเสี่ยงด้านคนขับ (Override ความล้าบ่อย)
 * B2. ความเสี่ยงด้านรถรุ่น (ค่าซ่อมสูงกว่าค่าเฉลี่ย)
 */

/**
 * B1. Check Driver Risk (Override Fatigue บ่อย)
 * เงื่อนไข: คนขับถูก Override ความล้า > X ครั้ง/เดือน
 */
function checkDriverRisk(threshold) {
  try {
    threshold = threshold || 3; // Default 3 ครั้ง/เดือน
    
    var endDate = formatDate(new Date());
    var startDate = formatDate(new Date(new Date().setDate(new Date().getDate() - 30)));
    
    // Get audit logs for fatigue overrides
    var auditLogs = getAuditLogs({
      action: 'create',
      entity_type: 'queue',
      date_from: startDate,
      date_to: endDate
    });
    
    if (!auditLogs.success) {
      return errorResponse('ไม่สามารถดึงข้อมูล Audit Log ได้', 'AUDIT_FETCH_ERROR');
    }
    
    // Count overrides by driver
    var overrideCounts = {};
    auditLogs.data.logs.forEach(function(log) {
      if (log.details && log.details.fatigue_override === true && log.details.driver_id) {
        var driverId = log.details.driver_id;
        if (!overrideCounts[driverId]) {
          overrideCounts[driverId] = {
            count: 0,
            overrides: []
          };
        }
        overrideCounts[driverId].count++;
        overrideCounts[driverId].overrides.push({
          date: log.created_at,
          queue_id: log.entity_id,
          reason: log.details.fatigue_override_reason || '',
          approved_by: log.user_id
        });
      }
    });
    
    // Get driver info
    var driversResult = getDrivers({ status: 'active' });
    var drivers = driversResult.success ? driversResult.data.drivers : [];
    var driverMap = {};
    drivers.forEach(function(d) {
      driverMap[d.driver_id] = d;
    });
    
    // Build risk alerts
    var riskAlerts = [];
    for (var driverId in overrideCounts) {
      if (overrideCounts[driverId].count > threshold) {
        var driver = driverMap[driverId] || {};
        var riskLevel = overrideCounts[driverId].count > 10 ? 'high' : 
                       overrideCounts[driverId].count > 5 ? 'medium' : 'low';
        
        riskAlerts.push({
          type: 'driver_fatigue_override',
          driver_id: driverId,
          driver_name: driver.full_name || '',
          override_count: overrideCounts[driverId].count,
          threshold: threshold,
          risk_level: riskLevel,
          period_days: 30,
          message: 'พนักงาน: ' + (driver.full_name || driverId) + ' ถูก Override ความล้า ' + 
                   overrideCounts[driverId].count + ' ครั้ง ใน 30 วัน',
          detail: 'ควรพิจารณาให้พนักงานพักผ่อนหรือจัดให้อยู่ในกลุ่มสแตนบายงานภายใน',
          overrides: overrideCounts[driverId].overrides,
          recommendation: riskLevel === 'high' ? 
            '⚠️ ความเสี่ยงสูง: พิจารณาให้พักผ่อนหรือตรวจสอบสุขภาพ' :
            '⚠️ ความเสี่ยงปานกลาง: ติดตามและพิจารณาให้พักผ่อน'
        });
      }
    }
    
    // Sort by override count (descending)
    riskAlerts.sort(function(a, b) { return b.override_count - a.override_count; });
    
    return successResponse({
      threshold: threshold,
      period: { date_from: startDate, date_to: endDate },
      total_at_risk: riskAlerts.length,
      high_risk: riskAlerts.filter(function(a) { return a.risk_level === 'high'; }).length,
      medium_risk: riskAlerts.filter(function(a) { return a.risk_level === 'medium'; }).length,
      low_risk: riskAlerts.filter(function(a) { return a.risk_level === 'low'; }).length,
      alerts: riskAlerts
    });
    
  } catch (error) {
    Logger.log('Check driver risk error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการตรวจสอบ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * B2. Check Vehicle Model Risk (ค่าซ่อมสูงกว่าค่าเฉลี่ย)
 * เงื่อนไข: ค่าซ่อมรุ่นนี้ > ค่าเฉลี่ยระบบ + X%
 */
function checkVehicleModelRisk(thresholdPercent) {
  try {
    thresholdPercent = thresholdPercent || 20; // Default 20% สูงกว่าค่าเฉลี่ย
    
    var endDate = formatDate(new Date());
    var startDate = formatDate(new Date(new Date().setMonth(new Date().getMonth() - 12)));
    
    // Get repair logs
    var repairLogsResult = getRepairLogs({
      date_from: startDate,
      date_to: endDate,
      status: 'completed'
    });
    
    if (!repairLogsResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลการซ่อมได้', 'REPAIR_FETCH_ERROR');
    }
    
    var repairLogs = repairLogsResult.data.repairs;
    
    // Get vehicle info
    var vehiclesResult = getVehicles({ status: 'active' });
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    var vehicleMap = {};
    vehicles.forEach(function(v) {
      vehicleMap[v.car_id] = v;
    });
    
    // Calculate repair cost by model
    var repairCostByModel = {};
    var repairCountByModel = {};
    
    repairLogs.forEach(function(repair) {
      var vehicle = vehicleMap[repair.car_id];
      if (!vehicle) return;
      
      var modelKey = vehicle.brand + ' ' + vehicle.model;
      if (!repairCostByModel[modelKey]) {
        repairCostByModel[modelKey] = 0;
        repairCountByModel[modelKey] = 0;
      }
      
      repairCostByModel[modelKey] += repair.cost || 0;
      repairCountByModel[modelKey]++;
    });
    
    // Calculate average cost per repair by model
    var avgCostByModel = {};
    for (var modelKey in repairCostByModel) {
      var totalCost = repairCostByModel[modelKey];
      var count = repairCountByModel[modelKey];
      avgCostByModel[modelKey] = count > 0 ? totalCost / count : 0;
    }
    
    // Calculate overall average
    var totalRepairCost = repairLogs.reduce(function(sum, r) { return sum + (r.cost || 0); }, 0);
    var totalRepairCount = repairLogs.length;
    var overallAvgCost = totalRepairCount > 0 ? totalRepairCost / totalRepairCount : 0;
    
    // Find models above threshold
    var riskAlerts = [];
    for (var modelKey in avgCostByModel) {
      var modelAvgCost = avgCostByModel[modelKey];
      var thresholdValue = overallAvgCost * (1 + thresholdPercent / 100);
      
      if (modelAvgCost > thresholdValue) {
        var excessPercent = ((modelAvgCost - overallAvgCost) / overallAvgCost) * 100;
        var riskLevel = excessPercent > 50 ? 'high' : excessPercent > 30 ? 'medium' : 'low';
        
        // Count vehicles of this model
        var vehiclesOfModel = vehicles.filter(function(v) {
          return (v.brand + ' ' + v.model) === modelKey;
        });
        
        riskAlerts.push({
          type: 'vehicle_model_repair_cost',
          model: modelKey,
          vehicle_count: vehiclesOfModel.length,
          average_repair_cost: Math.round(modelAvgCost * 100) / 100,
          overall_average_cost: Math.round(overallAvgCost * 100) / 100,
          excess_percent: Math.round(excessPercent * 100) / 100,
          threshold_percent: thresholdPercent,
          risk_level: riskLevel,
          repair_count: repairCountByModel[modelKey],
          total_repair_cost: Math.round(repairCostByModel[modelKey] * 100) / 100,
          message: 'รถรุ่นมีความเสี่ยงสูง: ' + modelKey + ' ค่าซ่อมเฉลี่ยสูงกว่าระบบ ' + 
                   Math.round(excessPercent) + '%',
          detail: 'ควรพิจารณาแผนการบำรุงรักษาหรือการเปลี่ยนรถ',
          recommendation: riskLevel === 'high' ?
            '⚠️ ความเสี่ยงสูง: พิจารณาแผนการเปลี่ยนรถหรือการบำรุงรักษาเชิงรุก' :
            '⚠️ ความเสี่ยงปานกลาง: ติดตามและพิจารณาแผนการบำรุงรักษา',
          vehicles: vehiclesOfModel.map(function(v) {
            return {
              car_id: v.car_id,
              license_plate: v.license_plate
            };
          })
        });
      }
    }
    
    // Sort by excess percent (descending)
    riskAlerts.sort(function(a, b) { return b.excess_percent - a.excess_percent; });
    
    return successResponse({
      threshold_percent: thresholdPercent,
      period: { date_from: startDate, date_to: endDate },
      overall_average_repair_cost: Math.round(overallAvgCost * 100) / 100,
      total_at_risk: riskAlerts.length,
      high_risk: riskAlerts.filter(function(a) { return a.risk_level === 'high'; }).length,
      medium_risk: riskAlerts.filter(function(a) { return a.risk_level === 'medium'; }).length,
      low_risk: riskAlerts.filter(function(a) { return a.risk_level === 'low'; }).length,
      alerts: riskAlerts
    });
    
  } catch (error) {
    Logger.log('Check vehicle model risk error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการตรวจสอบ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get All Risk Alerts
 */
function getAllRiskAlerts(driverThreshold, modelThresholdPercent) {
  try {
    var driverRisk = checkDriverRisk(driverThreshold);
    var modelRisk = checkVehicleModelRisk(modelThresholdPercent);
    
    return successResponse({
      driver_risk: driverRisk.success ? driverRisk.data : null,
      vehicle_model_risk: modelRisk.success ? modelRisk.data : null,
      total_alerts: (driverRisk.success ? driverRisk.data.total_at_risk : 0) + 
                    (modelRisk.success ? modelRisk.data.total_at_risk : 0)
    });
    
  } catch (error) {
    Logger.log('Get all risk alerts error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}
