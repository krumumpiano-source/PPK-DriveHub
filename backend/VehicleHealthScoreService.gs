/**
 * PPK DriveHub Vehicle Health Score Service
 * ระบบคะแนนสุขภาพรถ (0-100)
 * - น้ำมันกินปกติไหม
 * - ซ่อมถี่หรือเปล่า
 * - เลยระยะเช็คบ่อยไหม
 * - ใช้งานหนักผิดปกติหรือไม่
 */

/**
 * Calculate Vehicle Health Score - คำนวณคะแนนสุขภาพรถ (0-100)
 */
function calculateVehicleHealthScore(carId) {
  try {
    var car = getVehicleById(carId);
    if (!car.success) {
      return errorResponse('ไม่พบรถ', 'VEHICLE_NOT_FOUND');
    }
    
    if (!car.success || !car.data || !car.data.vehicle) {
      return errorResponse('ไม่พบข้อมูลรถ', 'CAR_NOT_FOUND');
    }
    var vehicle = car.data.vehicle;
    var score = 100; // Start with perfect score
    var factors = [];
    var warnings = [];
    
    // Factor 1: Fuel Consumption (30 points)
    var fuelScore = 30;
    var fuelAnalysis = analyzeFuelConsumption(carId);
    if (fuelAnalysis.abnormal) {
      fuelScore -= fuelAnalysis.severity * 10;
      if (fuelScore < 0) fuelScore = 0;
      warnings.push({
        type: 'fuel',
        message: 'อัตราสิ้นเปลืองน้ำมันผิดปกติ: ' + fuelAnalysis.message,
        severity: fuelAnalysis.severity
      });
    }
    score -= (30 - fuelScore);
    factors.push({
      name: 'อัตราสิ้นเปลืองน้ำมัน',
      score: fuelScore,
      max_score: 30,
      status: fuelAnalysis.abnormal ? 'warning' : 'good'
    });
    
    // Factor 2: Repair Frequency (25 points)
    var repairScore = 25;
    var repairAnalysis = analyzeRepairFrequency(carId);
    if (repairAnalysis.frequent) {
      repairScore -= repairAnalysis.severity * 8;
      if (repairScore < 0) repairScore = 0;
      warnings.push({
        type: 'repair',
        message: 'ซ่อมบ่อยผิดปกติ: ' + repairAnalysis.message,
        severity: repairAnalysis.severity
      });
    }
    score -= (25 - repairScore);
    factors.push({
      name: 'ความถี่ในการซ่อม',
      score: repairScore,
      max_score: 25,
      status: repairAnalysis.frequent ? 'warning' : 'good'
    });
    
    // Factor 3: Maintenance Schedule Compliance (25 points)
    var maintenanceScore = 25;
    var maintenanceAnalysis = analyzeMaintenanceCompliance(carId);
    if (maintenanceAnalysis.overdue) {
      maintenanceScore -= maintenanceAnalysis.severity * 10;
      if (maintenanceScore < 0) maintenanceScore = 0;
      warnings.push({
        type: 'maintenance',
        message: 'เลยระยะเช็คบำรุงรักษา: ' + maintenanceAnalysis.message,
        severity: maintenanceAnalysis.severity
      });
    }
    score -= (25 - maintenanceScore);
    factors.push({
      name: 'การปฏิบัติตามตารางบำรุงรักษา',
      score: maintenanceScore,
      max_score: 25,
      status: maintenanceAnalysis.overdue ? 'warning' : 'good'
    });
    
    // Factor 4: Usage Pattern (20 points)
    var usageScore = 20;
    var usageAnalysis = analyzeUsagePattern(carId);
    if (usageAnalysis.heavy_usage) {
      usageScore -= usageAnalysis.severity * 5;
      if (usageScore < 0) usageScore = 0;
      warnings.push({
        type: 'usage',
        message: 'ใช้งานหนักผิดปกติ: ' + usageAnalysis.message,
        severity: usageAnalysis.severity
      });
    }
    score -= (20 - usageScore);
    factors.push({
      name: 'รูปแบบการใช้งาน',
      score: usageScore,
      max_score: 20,
      status: usageAnalysis.heavy_usage ? 'warning' : 'good'
    });
    
    // Factor 5: Driver Fatigue Overrides (deduct from score if frequent)
    // Check if this vehicle's drivers have frequent fatigue overrides
    var fatigueOverridePenalty = 0;
    try {
      var auditLogs = getAuditLogs({
        action: 'create',
        entity_type: 'queue',
        date_from: formatDate(new Date(new Date().setDate(new Date().getDate() - 30)))
      });
      
      if (auditLogs.success) {
        var overrideCount = 0;
        auditLogs.data.logs.forEach(function(log) {
          if (log.details && log.details.car_id === carId && log.details.fatigue_override === true) {
            overrideCount++;
          }
        });
        
        if (overrideCount > 5) {
          fatigueOverridePenalty = Math.min(overrideCount * 2, 10); // Max 10 points
          warnings.push({
            type: 'fatigue_override',
            message: 'มีการ Override Fatigue Warning บ่อย (' + overrideCount + ' ครั้งใน 30 วัน)',
            severity: overrideCount > 10 ? 2 : 1
          });
        }
      }
    } catch (e) {
      Logger.log('Error checking fatigue overrides: ' + e.toString());
    }
    
    score -= fatigueOverridePenalty;
    if (score < 0) score = 0;
    
    // Ensure score is between 0-100
    if (score < 0) score = 0;
    if (score > 100) score = 100;
    
    // Determine status color
    var status = 'green'; // green, yellow, red
    var statusText = 'ใช้งานสบาย';
    
    if (score < 50) {
      status = 'red';
      statusText = 'ระวังงบแตก';
    } else if (score < 70) {
      status = 'yellow';
      statusText = 'เริ่มต้องดู';
    }
    
    return successResponse({
      car_id: carId,
      vehicle_info: {
        license_plate: vehicle.license_plate,
        brand: vehicle.brand,
        model: vehicle.model
      },
      health_score: Math.round(score),
      status: status,
      status_text: statusText,
      factors: factors,
      warnings: warnings,
      last_updated: new Date()
    });
    
  } catch (error) {
    Logger.log('Calculate vehicle health score error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการคำนวณ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Analyze Fuel Consumption - วิเคราะห์อัตราสิ้นเปลืองน้ำมัน
 */
function analyzeFuelConsumption(carId) {
  try {
    var fuelLogs = getFuelLogs({ car_id: carId });
    if (!fuelLogs.success || fuelLogs.data.fuel_logs.length < 2) {
      return { abnormal: false, severity: 0, message: 'ข้อมูลไม่เพียงพอ' };
    }
    
    var logs = fuelLogs.data.fuel_logs;
    var consumptionRates = [];
    
    // Calculate consumption rates
    for (var i = 1; i < logs.length; i++) {
      var prevLog = logs[i];
      var currLog = logs[i - 1];
      
      if (prevLog.mileage && currLog.mileage && prevLog.liters) {
        var kmDiff = parseFloat(currLog.mileage) - parseFloat(prevLog.mileage);
        var liters = parseFloat(prevLog.liters);
        
        if (kmDiff > 0 && liters > 0) {
          var rate = kmDiff / liters; // km/liter
          consumptionRates.push(rate);
        }
      }
    }
    
    if (consumptionRates.length === 0) {
      return { abnormal: false, severity: 0, message: 'ข้อมูลไม่เพียงพอ' };
    }
    
    // Calculate average
    var avgRate = consumptionRates.reduce(function(sum, r) { return sum + r; }, 0) / consumptionRates.length;
    
    // Check for abnormal consumption (less than 8 km/liter is considered poor)
    var threshold = 8; // km/liter
    var abnormal = avgRate < threshold;
    var severity = 0;
    
    if (abnormal) {
      if (avgRate < 5) {
        severity = 3; // Very poor
      } else if (avgRate < 6) {
        severity = 2; // Poor
      } else {
        severity = 1; // Below average
      }
    }
    
    return {
      abnormal: abnormal,
      severity: severity,
      message: 'อัตราสิ้นเปลืองเฉลี่ย ' + avgRate.toFixed(2) + ' กม./ลิตร',
      average_rate: avgRate,
      threshold: threshold
    };
    
  } catch (error) {
    Logger.log('Analyze fuel consumption error: ' + error.toString());
    return { abnormal: false, severity: 0, message: 'เกิดข้อผิดพลาด' };
  }
}

/**
 * Analyze Repair Frequency - วิเคราะห์ความถี่ในการซ่อม
 */
function analyzeRepairFrequency(carId) {
  try {
    // Get repairs in last 12 months
    var endDate = new Date();
    var startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    var repairLogs = getRepairLogs({
      car_id: carId,
      date_from: formatDate(startDate),
      date_to: formatDate(endDate)
    });
    
    if (!repairLogs.success) {
      return { frequent: false, severity: 0, message: 'ข้อมูลไม่เพียงพอ' };
    }
    
    var repairs = repairLogs.data.repair_logs.filter(function(r) {
      return r.status === 'completed';
    });
    
    var repairCount = repairs.length;
    var totalCost = repairs.reduce(function(sum, r) {
      return sum + parseFloat(r.cost || 0);
    }, 0);
    
    // Threshold: More than 4 repairs per year or total cost > 50,000 is considered frequent
    var frequent = repairCount > 4 || totalCost > 50000;
    var severity = 0;
    
    if (frequent) {
      if (repairCount > 8 || totalCost > 100000) {
        severity = 3; // Very frequent
      } else if (repairCount > 6 || totalCost > 75000) {
        severity = 2; // Frequent
      } else {
        severity = 1; // Somewhat frequent
      }
    }
    
    return {
      frequent: frequent,
      severity: severity,
      message: 'ซ่อม ' + repairCount + ' ครั้ง ใน 12 เดือน (ค่าใช้จ่าย ' + totalCost.toLocaleString() + ' บาท)',
      repair_count: repairCount,
      total_cost: totalCost
    };
    
  } catch (error) {
    Logger.log('Analyze repair frequency error: ' + error.toString());
    return { frequent: false, severity: 0, message: 'เกิดข้อผิดพลาด' };
  }
}

/**
 * Analyze Maintenance Compliance - วิเคราะห์การปฏิบัติตามตารางบำรุงรักษา
 */
function analyzeMaintenanceCompliance(carId) {
  try {
    var currentMileage = getCurrentMileage(carId);
    if (!currentMileage) {
      return { overdue: false, severity: 0, message: 'ไม่พบเลขไมล์ปัจจุบัน' };
    }
    
    var nextMaintenance = getNextMaintenanceSchedule(carId, currentMileage);
    if (!nextMaintenance) {
      return { overdue: false, severity: 0, message: 'ไม่พบตารางบำรุงรักษา' };
    }
    
    var remainingKm = nextMaintenance.remaining_km;
    var overdue = remainingKm < 0; // Negative means overdue
    var severity = 0;
    
    if (overdue) {
      var overdueKm = Math.abs(remainingKm);
      if (overdueKm > 5000) {
        severity = 3; // Very overdue
      } else if (overdueKm > 2000) {
        severity = 2; // Overdue
      } else {
        severity = 1; // Slightly overdue
      }
    } else if (remainingKm < 500) {
      // Approaching maintenance
      severity = 0.5;
    }
    
    return {
      overdue: overdue,
      severity: severity,
      message: overdue ? 
        'เลยระยะเช็ค ' + Math.abs(remainingKm).toLocaleString() + ' กม.' :
        'เหลืออีก ' + remainingKm.toLocaleString() + ' กม. ถึงการเช็คครั้งถัดไป',
      remaining_km: remainingKm,
      next_mileage: nextMaintenance.schedule.mileage
    };
    
  } catch (error) {
    Logger.log('Analyze maintenance compliance error: ' + error.toString());
    return { overdue: false, severity: 0, message: 'เกิดข้อผิดพลาด' };
  }
}

/**
 * Analyze Usage Pattern - วิเคราะห์รูปแบบการใช้งาน
 */
function analyzeUsagePattern(carId) {
  try {
    // Get usage records in last 30 days
    var endDate = new Date();
    var startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    var usageRecords = getUsageRecordsRaw({
      car_id: carId,
      date_from: formatDate(startDate),
      date_to: formatDate(endDate)
    });
    
    if (!usageRecords.success) {
      return { heavy_usage: false, severity: 0, message: 'ข้อมูลไม่เพียงพอ' };
    }
    
    var records = usageRecords.data.records;
    var usageDays = new Set();
    
    records.forEach(function(record) {
      if (record.datetime) {
        if (!record.datetime || typeof record.datetime !== 'string') {
          continue; // Skip invalid datetime
        }
        var date = record.datetime.split(' ')[0];
        usageDays.add(date);
      }
    });
    
    var usageFrequency = usageDays.size / 30; // Days used / Total days
    var heavyUsage = usageFrequency > 0.8; // Used more than 80% of days
    
    var severity = 0;
    if (heavyUsage) {
      if (usageFrequency > 0.95) {
        severity = 2; // Very heavy
      } else {
        severity = 1; // Heavy
      }
    }
    
    return {
      heavy_usage: heavyUsage,
      severity: severity,
      message: 'ใช้งาน ' + usageDays.size + ' วัน ใน 30 วัน (' + (usageFrequency * 100).toFixed(0) + '%)',
      usage_days: usageDays.size,
      usage_frequency: usageFrequency
    };
    
  } catch (error) {
    Logger.log('Analyze usage pattern error: ' + error.toString());
    return { heavy_usage: false, severity: 0, message: 'เกิดข้อผิดพลาด' };
  }
}

/**
 * Get All Vehicles Health Scores - ดึงคะแนนสุขภาพรถทั้งหมด
 */
function getAllVehiclesHealthScores() {
  try {
    var vehiclesResult = getVehicles({ active: true });
    if (!vehiclesResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลรถได้', 'VEHICLE_FETCH_ERROR');
    }
    
    var vehicles = vehiclesResult.data.vehicles;
    var healthScores = [];
    
    for (var i = 0; i < vehicles.length; i++) {
      var vehicle = vehicles[i];
      var healthResult = calculateVehicleHealthScore(vehicle.car_id);
      
      if (healthResult.success) {
        healthScores.push(healthResult.data);
      }
    }
    
    // Sort by health score (descending)
    healthScores.sort(function(a, b) {
      return b.health_score - a.health_score;
    });
    
    return successResponse({
      health_scores: healthScores,
      summary: {
        total: healthScores.length,
        green: healthScores.filter(function(h) { return h.status === 'green'; }).length,
        yellow: healthScores.filter(function(h) { return h.status === 'yellow'; }).length,
        red: healthScores.filter(function(h) { return h.status === 'red'; }).length
      }
    });
    
  } catch (error) {
    Logger.log('Get all vehicles health scores error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}
