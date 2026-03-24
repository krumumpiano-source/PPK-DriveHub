/**
 * PPK DriveHub Smart Queue Service
 * Fairness Engine และ Smart Pairing
 * 
 * เป้าหมาย: กระจายภาระงานอย่างยุติธรรม และจับคู่คน-รถอย่างฉลาด
 */

/**
 * Get Smart Queue Recommendations - แนะนำการจัดคิวแบบ Smart
 */
function getSmartQueueRecommendations(queueData) {
  try {
    // Get available drivers
    var drivers = getDrivers({ active: true, for_queue_selection: true });
    if (!drivers.success || drivers.data.drivers.length === 0) {
      return successResponse({ recommendations: [] });
    }
    
    // Get available vehicles
    var vehicles = getVehicles({ status: 'available', active: true });
    if (!vehicles.success || vehicles.data.vehicles.length === 0) {
      return successResponse({ recommendations: [] });
    }
    
    var date = queueData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var mission = queueData.mission || '';
    var estimatedDistance = queueData.estimated_distance || 0;
    var jobType = queueData.job_type || 'general'; // general/executive/heavy/urgent
    
    // Calculate workload scores for all drivers
    var driverScores = [];
    for (var i = 0; i < drivers.data.drivers.length; i++) {
      var driver = drivers.data.drivers[i];
      var workloadScore = calculateWorkloadBalanceScore(driver.driver_id, 7);
      var recoveryStatus = checkRecoveryDayStatus(driver.driver_id, date);
      
      driverScores.push({
        driver_id: driver.driver_id,
        driver_name: driver.full_name || driver.first_name + ' ' + driver.last_name,
        workload_score: workloadScore.score,
        workload_level: workloadScore.level,
        needs_recovery: recoveryStatus.needs_recovery,
        recovery_reason: recoveryStatus.recovery_reason,
        fatigue_flag: driver.fatigue_flag === true || driver.fatigue_flag === 'TRUE'
      });
    }
    
    // Calculate vehicle health scores
    var vehicleScores = [];
    for (var i = 0; i < vehicles.data.vehicles.length; i++) {
      var vehicle = vehicles.data.vehicles[i];
      var healthScore = getVehicleHealthScore(vehicle.car_id);
      
      vehicleScores.push({
        car_id: vehicle.car_id,
        license_plate: vehicle.license_plate,
        brand: vehicle.brand,
        model: vehicle.model,
        vehicle_type: vehicle.vehicle_type,
        health_score: healthScore.score || 100,
        health_level: healthScore.level || 'good'
      });
    }
    
    // Smart Pairing Logic
    var recommendations = [];
    
    // For long trips (>200 km) or heavy jobs
    if (estimatedDistance > 200 || jobType === 'heavy') {
      // Recommend: Low workload driver + High health vehicle
      var suitableDrivers = driverScores.filter(function(d) {
        return d.workload_score < 50 && !d.needs_recovery && !d.fatigue_flag;
      });
      
      var suitableVehicles = vehicleScores.filter(function(v) {
        return v.health_score >= 80;
      });
      
      if (suitableDrivers.length > 0 && suitableVehicles.length > 0) {
        recommendations.push({
          type: 'smart_pairing',
          priority: 'high',
          message: 'งานไกล/หนัก - แนะนำจับคู่คน-รถที่เหมาะสม',
          recommended_drivers: suitableDrivers.slice(0, 3).map(function(d) {
            return {
              driver_id: d.driver_id,
              driver_name: d.driver_name,
              workload_score: d.workload_score,
              reason: 'ภาระงานเบา, ไม่มี Fatigue Flag'
            };
          }),
          recommended_vehicles: suitableVehicles.slice(0, 3).map(function(v) {
            return {
              car_id: v.car_id,
              license_plate: v.license_plate,
              health_score: v.health_score,
              reason: 'Health Score สูง, เหมาะกับงานไกล'
            };
          })
        });
      }
    }
    
    // For executive jobs
    if (jobType === 'executive') {
      var executiveVehicles = vehicleScores.filter(function(v) {
        return v.vehicle_type && (v.vehicle_type.includes('sedan') || v.vehicle_type.includes('suv')) &&
               v.health_score >= 85;
      });
      
      if (executiveVehicles.length > 0) {
        recommendations.push({
          type: 'executive_pairing',
          priority: 'high',
          message: 'งานผู้บริหาร - แนะนำรถที่เหมาะสม',
          recommended_vehicles: executiveVehicles.slice(0, 3).map(function(v) {
            return {
              car_id: v.car_id,
              license_plate: v.license_plate,
              health_score: v.health_score,
              reason: 'รถประเภทเหมาะสม, Health Score สูง'
            };
          })
        });
      }
    }
    
    // Fairness recommendations
    var heavyDrivers = driverScores.filter(function(d) {
      return d.workload_score >= 70 || d.needs_recovery;
    });
    
    if (heavyDrivers.length > 0) {
      recommendations.push({
        type: 'fairness_warning',
        priority: 'medium',
        message: 'พนักงานขับรถที่ภาระงานสูง - แนะนำให้พัก',
        drivers: heavyDrivers.map(function(d) {
          return {
            driver_id: d.driver_id,
            driver_name: d.driver_name,
            workload_score: d.workload_score,
            recovery_reason: d.recovery_reason,
            recommendation: 'แนะนำงานภายใน / สแตนบาย'
          };
        })
      });
    }
    
    // Avoid pairing: Tired driver + Low health vehicle
    var avoidPairings = [];
    var tiredDrivers = driverScores.filter(function(d) {
      return d.workload_score >= 60 || d.needs_recovery || d.fatigue_flag;
    });
    var lowHealthVehicles = vehicleScores.filter(function(v) {
      return v.health_score < 70;
    });
    
    if (tiredDrivers.length > 0 && lowHealthVehicles.length > 0) {
      recommendations.push({
        type: 'avoid_pairing',
        priority: 'high',
        message: '⚠️ ไม่แนะนำจับคู่: คนขับล้า + รถ Health ต่ำ',
        avoid: {
          drivers: tiredDrivers.map(function(d) { return d.driver_name; }),
          vehicles: lowHealthVehicles.map(function(v) { return v.license_plate; })
        }
      });
    }
    
    return successResponse({
      date: date,
      mission: mission,
      estimated_distance: estimatedDistance,
      job_type: jobType,
      recommendations: recommendations,
      driver_scores: driverScores,
      vehicle_scores: vehicleScores
    });
    
  } catch (error) {
    Logger.log('Get smart queue recommendations error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Vehicle Health Score - ดึงคะแนน Health ของรถ
 */
function getVehicleHealthScore(carId) {
  try {
    // Get vehicle health score from VehicleHealthScoreService
    if (typeof calculateVehicleHealthScore === 'function') {
      var result = calculateVehicleHealthScore(carId);
      if (result && result.score) {
        return result;
      }
    }
    
    // Fallback: Calculate from service grade
    if (typeof calculateServiceGrade === 'function') {
      var grade = calculateServiceGrade(carId);
      if (grade && grade.score) {
        return {
          score: grade.score,
          level: grade.score >= 85 ? 'good' : (grade.score >= 70 ? 'moderate' : 'poor')
        };
      }
    }
    
    // Default
    return {
      score: 100,
      level: 'good'
    };
  } catch (error) {
    Logger.log('Get vehicle health score error: ' + error.toString());
    return {
      score: 100,
      level: 'unknown'
    };
  }
}

/**
 * Check Rotation Policy - ตรวจสอบนโยบายการหมุนเวียน
 */
function checkRotationPolicy(driverId, carId, date) {
  try {
    date = date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Get rotation policies from MASTER sheet or CONFIG
    var maxCarUsage = CONFIG.ROTATION_POLICY?.MAX_CAR_USAGE_PER_WEEK || 3;
    var maxDriverLongJobs = CONFIG.ROTATION_POLICY?.MAX_DRIVER_LONG_JOBS_PER_WEEK || 2;
    
    var warnings = [];
    
    // Check car usage frequency
    if (carId) {
      var carUsage = getCarUsageFrequency(carId, date, 7);
      if (carUsage.count >= maxCarUsage) {
        warnings.push({
          type: 'car_rotation',
          message: 'รถคันนี้ถูกใช้งาน ' + carUsage.count + ' ครั้งในสัปดาห์นี้ (เกิน ' + maxCarUsage + ' ครั้ง)',
          recommendation: 'แนะนำใช้รถคันอื่น'
        });
      }
    }
    
    // Check driver long job frequency
    if (driverId) {
      var driverLongJobs = getDriverLongJobFrequency(driverId, date, 7);
      if (driverLongJobs.count >= maxDriverLongJobs) {
        warnings.push({
          type: 'driver_rotation',
          message: 'คนขับนี้รับงานไกล ' + driverLongJobs.count + ' ครั้งในสัปดาห์นี้ (เกิน ' + maxDriverLongJobs + ' ครั้ง)',
          recommendation: 'แนะนำให้คนขับอื่นรับงานไกล'
        });
      }
    }
    
    return {
      driver_id: driverId,
      car_id: carId,
      date: date,
      warnings: warnings,
      policy_compliant: warnings.length === 0
    };
    
  } catch (error) {
    Logger.log('Check rotation policy error: ' + error.toString());
    return {
      driver_id: driverId,
      car_id: carId,
      date: date,
      warnings: [],
      policy_compliant: true,
      error: error.toString()
    };
  }
}

/**
 * Get Car Usage Frequency - นับความถี่การใช้งานรถ
 */
function getCarUsageFrequency(carId, date, days) {
  try {
    var endDate = new Date(date);
    var startDate = new Date(date);
    startDate.setDate(startDate.getDate() - days);
    
    var startDateStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var endDateStr = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    var sheet = getSheet(CONFIG.SHEETS.QUEUE);
    if (!sheet) return { count: 0 };
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { count: 0 };
    
    var headers = data[0];
    var carIdIndex = headers.indexOf('car_id');
    var dateIndex = headers.indexOf('date');
    
    if (carIdIndex === -1 || dateIndex === -1) return { count: 0 };
    
    var count = 0;
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[carIdIndex] === carId && row[dateIndex] >= startDateStr && row[dateIndex] <= endDateStr) {
        count++;
      }
    }
    
    return { count: count };
    
  } catch (error) {
    Logger.log('Get car usage frequency error: ' + error.toString());
    return { count: 0 };
  }
}

/**
 * Get Driver Long Job Frequency - นับความถี่งานไกลของคนขับ
 */
function getDriverLongJobFrequency(driverId, date, days) {
  try {
    var endDate = new Date(date);
    var startDate = new Date(date);
    startDate.setDate(startDate.getDate() - days);
    
    var usageLogs = getDriverUsageLogs(driverId, startDate, endDate);
    
    var longJobCount = 0;
    for (var i = 0; i < usageLogs.length; i++) {
      if (usageLogs[i].distance > 200 || usageLogs[i].heavy_jobs > 0) {
        longJobCount++;
      }
    }
    
    return { count: longJobCount };
    
  } catch (error) {
    Logger.log('Get driver long job frequency error: ' + error.toString());
    return { count: 0 };
  }
}
