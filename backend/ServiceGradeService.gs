/**
 * PPK DriveHub Service Grade Service
 * ประเมินระดับการบำรุงรักษา (Service Grade)
 * 
 * รถ A = สภาพเหมือนศูนย์
 * รถ B = ใช้งานปกติ
 * รถ C = เฝ้าระวัง
 */

/**
 * Calculate Service Grade - คำนวณระดับการบำรุงรักษา
 */
function calculateServiceGrade(carId) {
  try {
    var vehicleResult = getVehicleById(carId);
    if (!vehicleResult.success || !vehicleResult.data || !vehicleResult.data.vehicle) {
      return { grade: 'unknown', score: 0 };
    }
    
    var vehicle = vehicleResult.data.vehicle;
    
    // Get recent inspection results
    var inspectionResults = getRecentInspectionResults(carId, 30); // Last 30 days
    
    // Get recent repair history
    var repairHistory = getRecentRepairHistory(carId, 90); // Last 90 days
    
    // Get fuel consumption anomalies
    var fuelAnomalies = getFuelAnomaliesForVehicle(carId, 90);
    
    // Calculate score components (0-100 each)
    var inspectionScore = calculateInspectionScore(inspectionResults);
    var repairScore = calculateRepairScore(repairHistory);
    var fuelScore = calculateFuelScore(fuelAnomalies);
    var maintenanceScore = calculateMaintenanceScheduleScore(carId);
    
    // Weighted average
    var totalScore = (
      inspectionScore * 0.35 +
      repairScore * 0.25 +
      fuelScore * 0.20 +
      maintenanceScore * 0.20
    );
    
    // Determine grade
    var grade = 'C';
    var gradeLabel = 'เฝ้าระวัง';
    if (totalScore >= 85) {
      grade = 'A';
      gradeLabel = 'สภาพเหมือนศูนย์';
    } else if (totalScore >= 70) {
      grade = 'B';
      gradeLabel = 'ใช้งานปกติ';
    }
    
    return {
      car_id: carId,
      license_plate: vehicle.license_plate,
      grade: grade,
      grade_label: gradeLabel,
      score: Math.round(totalScore),
      components: {
        inspection_score: Math.round(inspectionScore),
        repair_score: Math.round(repairScore),
        fuel_score: Math.round(fuelScore),
        maintenance_score: Math.round(maintenanceScore)
      },
      recommendations: generateServiceGradeRecommendations(grade, totalScore, {
        inspectionResults: inspectionResults,
        repairHistory: repairHistory,
        fuelAnomalies: fuelAnomalies
      })
    };
    
  } catch (error) {
    Logger.log('Calculate service grade error: ' + error.toString());
    return {
      car_id: carId,
      grade: 'unknown',
      score: 0,
      error: error.toString()
    };
  }
}

/**
 * Get Recent Inspection Results - ดึงผลการตรวจเช็คล่าสุด
 */
function getRecentInspectionResults(carId, days) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.CHECK_LOG);
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    var headers = data[0];
    var carIdIndex = headers.indexOf('car_id');
    var dateIndex = headers.indexOf('date');
    var overallStatusIndex = headers.indexOf('overall_status');
    var checksDataIndex = headers.indexOf('checks_data');
    
    if (carIdIndex === -1 || dateIndex === -1) return [];
    
    var endDate = new Date();
    var startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    var startDateStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    var results = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[carIdIndex] !== carId) continue;
      if (row[dateIndex] < startDateStr) continue;
      
      var checksData = {};
      if (checksDataIndex !== -1 && row[checksDataIndex]) {
        try {
          checksData = JSON.parse(row[checksDataIndex]);
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      results.push({
        date: row[dateIndex],
        overall_status: overallStatusIndex !== -1 ? row[overallStatusIndex] : 'ready',
        checks_data: checksData
      });
    }
    
    return results;
    
  } catch (error) {
    Logger.log('Get recent inspection results error: ' + error.toString());
    return [];
  }
}

/**
 * Calculate Inspection Score - คำนวณคะแนนจากการตรวจเช็ค
 */
function calculateInspectionScore(inspectionResults) {
  if (!inspectionResults || inspectionResults.length === 0) {
    return 100; // No inspections = assume good
  }
  
  var totalScore = 0;
  var count = 0;
  
  for (var i = 0; i < inspectionResults.length; i++) {
    var result = inspectionResults[i];
    var score = 100;
    
    if (result.overall_status === 'not_ready') {
      score = 0;
    } else if (result.overall_status === 'warning') {
      score = 60;
    } else if (result.overall_status === 'ready') {
      score = 100;
    }
    
    // Check for abnormal items
    if (result.checks_data) {
      var abnormalCount = 0;
      for (var key in result.checks_data) {
        if (key.endsWith('_note')) continue;
        if (result.checks_data[key] === 'abnormal') {
          abnormalCount++;
        }
      }
      score -= abnormalCount * 10;
      score = Math.max(0, score);
    }
    
    totalScore += score;
    count++;
  }
  
  return count > 0 ? totalScore / count : 100;
}

/**
 * Calculate Repair Score - คำนวณคะแนนจากประวัติการซ่อม
 */
function calculateRepairScore(repairHistory) {
  if (!repairHistory || repairHistory.length === 0) {
    return 100; // No repairs = good
  }
  
  var totalCost = 0;
  var emergencyCount = 0;
  
  for (var i = 0; i < repairHistory.length; i++) {
    var repair = repairHistory[i];
    totalCost += parseFloat(repair.cost || 0);
    if (repair.request_type === 'emergency' || repair.request_type === 'urgent') {
      emergencyCount++;
    }
  }
  
  var avgCost = totalCost / repairHistory.length;
  
  // Score decreases with high cost and emergency repairs
  var score = 100;
  if (avgCost > 50000) score -= 30;
  else if (avgCost > 20000) score -= 15;
  
  if (emergencyCount > 2) score -= 20;
  else if (emergencyCount > 0) score -= 10;
  
  return Math.max(0, score);
}

/**
 * Get Recent Repair History - ดึงประวัติการซ่อมล่าสุด
 */
function getRecentRepairHistory(carId, days) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.REPAIR_LOG);
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    var headers = data[0];
    var carIdIndex = headers.indexOf('car_id');
    var dateReportedIndex = headers.indexOf('date_reported');
    var costIndex = headers.indexOf('cost');
    var requestTypeIndex = headers.indexOf('request_type');
    
    if (carIdIndex === -1 || dateReportedIndex === -1) return [];
    
    var endDate = new Date();
    var startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    var startDateStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    var repairs = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[carIdIndex] !== carId) continue;
      if (row[dateReportedIndex] < startDateStr) continue;
      
      repairs.push({
        date: row[dateReportedIndex],
        cost: costIndex !== -1 ? (parseFloat(row[costIndex]) || 0) : 0,
        request_type: requestTypeIndex !== -1 ? row[requestTypeIndex] : 'planned'
      });
    }
    
    return repairs;
    
  } catch (error) {
    Logger.log('Get recent repair history error: ' + error.toString());
    return [];
  }
}

/**
 * Calculate Fuel Score - คำนวณคะแนนจากข้อมูลน้ำมัน
 */
function calculateFuelScore(fuelAnomalies) {
  if (!fuelAnomalies || fuelAnomalies.length === 0) {
    return 100; // No anomalies = good
  }
  
  var score = 100;
  score -= fuelAnomalies.length * 5; // Each anomaly reduces score
  
  return Math.max(0, score);
}

/**
 * Get Fuel Anomalies For Vehicle - ดึงความผิดปกติของน้ำมันสำหรับรถคันนี้
 */
function getFuelAnomaliesForVehicle(carId, days) {
  try {
    // Use FuelService for fuel analysis
    if (typeof getAllFuelAnomalies === 'function') {
      var result = getAllFuelAnomalies({
        car_id: carId,
        days: days
      });
      if (result && result.success && result.data && result.data.anomalies) {
        return result.data.anomalies;
      }
    }
    
    // Fallback: Empty array
    return [];
  } catch (error) {
    Logger.log('Get fuel anomalies error: ' + error.toString());
    return [];
  }
}

/**
 * Calculate Maintenance Schedule Score - คำนวณคะแนนจากตารางบำรุงรักษา
 */
function calculateMaintenanceScheduleScore(carId) {
  try {
    // Check if maintenance is up to date
    // This should integrate with PM system
    return 100; // Default
  } catch (error) {
    Logger.log('Calculate maintenance schedule score error: ' + error.toString());
    return 100;
  }
}

/**
 * Generate Service Grade Recommendations - สร้างคำแนะนำตาม Service Grade
 */
function generateServiceGradeRecommendations(grade, score, data) {
  var recommendations = [];
  
  if (grade === 'A') {
    recommendations.push('✅ สภาพดีเยี่ยม - เหมาะกับงานสำคัญ');
    recommendations.push('✅ บำรุงรักษาตามกำหนด');
  } else if (grade === 'B') {
    recommendations.push('✅ ใช้งานได้ตามปกติ');
    recommendations.push('💡 ควรตรวจเช็คตามกำหนด');
  } else if (grade === 'C') {
    recommendations.push('⚠️ ควรเฝ้าระวัง');
    recommendations.push('⚠️ แนะนำตรวจเช็คเชิงลึก');
    recommendations.push('⚠️ พิจารณาบำรุงรักษาเพิ่มเติม');
    
    if (data.repairHistory && data.repairHistory.length > 3) {
      recommendations.push('⚠️ ซ่อมบ่อย - พิจารณาเปลี่ยนรถ');
    }
  }
  
  return recommendations;
}

/**
 * Get All Vehicles Service Grades - ดึง Service Grade ของรถทั้งหมด
 */
function getAllVehiclesServiceGrades() {
  try {
    var vehicles = getVehicles({ active: true });
    if (!vehicles.success) {
      return successResponse({ vehicles: [] });
    }
    
    var vehicleGrades = [];
    for (var i = 0; i < vehicles.data.vehicles.length; i++) {
      var vehicle = vehicles.data.vehicles[i];
      var grade = calculateServiceGrade(vehicle.car_id);
      vehicleGrades.push(grade);
    }
    
    // Sort by grade (A first) then by score
    vehicleGrades.sort(function(a, b) {
      var gradeOrder = { 'A': 1, 'B': 2, 'C': 3, 'unknown': 4 };
      var gradeCompare = (gradeOrder[a.grade] || 4) - (gradeOrder[b.grade] || 4);
      if (gradeCompare !== 0) return gradeCompare;
      return a.score - b.score;
    });
    
    return successResponse({
      vehicles: vehicleGrades,
      summary: {
        grade_a: vehicleGrades.filter(function(v) { return v.grade === 'A'; }).length,
        grade_b: vehicleGrades.filter(function(v) { return v.grade === 'B'; }).length,
        grade_c: vehicleGrades.filter(function(v) { return v.grade === 'C'; }).length
      }
    });
    
  } catch (error) {
    Logger.log('Get all vehicles service grades error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}
