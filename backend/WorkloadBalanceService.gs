/**
 * PPK DriveHub Workload Balance Service
 * คำนวณ Workload Balance Score และ Fairness Engine
 * 
 * เป้าหมาย: ทำให้ผู้บริหาร "เห็นความเหนื่อย" เป็นตัวเลข
 * และกระจายภาระงานอย่างยุติธรรม
 */

/**
 * Calculate Workload Balance Score - คำนวณคะแนนภาระงานคนขับ
 * 
 * Score 0-100:
 * - 0-30: เบา (Light)
 * - 31-60: ปานกลาง (Moderate)
 * - 61-80: หนัก (Heavy)
 * - 81-100: หนักมาก (Very Heavy)
 */
function calculateWorkloadBalanceScore(driverId, periodDays) {
  try {
    periodDays = periodDays || 30; // Default 30 days
    
    var endDate = new Date();
    var startDate = new Date();
    startDate.setDate(endDate.getDate() - periodDays);
    
    // Get usage logs
    var usageLogs = getDriverUsageLogs(driverId, startDate, endDate);
    
    // Calculate metrics
    var totalDistance = 0;
    var totalHours = 0;
    var heavyJobs = 0; // งานไกล (>200 km) หรือรถใหญ่
    var overrideCount = 0;
    var consecutiveDays = 0;
    
    var dailyDistance = {};
    var lastDate = null;
    var currentConsecutive = 0;
    
    for (var i = 0; i < usageLogs.length; i++) {
      var log = usageLogs[i];
      var logDate = log.date;
      
      // Distance
      if (log.distance) {
        totalDistance += log.distance;
        dailyDistance[logDate] = (dailyDistance[logDate] || 0) + log.distance;
      }
      
      // Hours
      if (log.hours) {
        totalHours += log.hours;
      }
      
      // Heavy jobs
      if (log.distance > 200 || log.vehicle_type === 'large') {
        heavyJobs++;
      }
      
      // Override count
      if (log.fatigue_override || log.emergency_override) {
        overrideCount++;
      }
      
      // Consecutive days
      if (lastDate) {
        var daysDiff = Math.floor((new Date(logDate) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          currentConsecutive++;
        } else {
          currentConsecutive = 1;
        }
      } else {
        currentConsecutive = 1;
      }
      consecutiveDays = Math.max(consecutiveDays, currentConsecutive);
      lastDate = logDate;
    }
    
    // Calculate average daily distance
    var daysWorked = Object.keys(dailyDistance).length;
    var avgDailyDistance = daysWorked > 0 ? totalDistance / daysWorked : 0;
    
    // Calculate score components (0-100 each)
    var distanceScore = Math.min(100, (avgDailyDistance / 400) * 100); // 400 km = 100 points
    var hoursScore = Math.min(100, (totalHours / (periodDays * 8)) * 100); // 8 hours/day = 100 points
    var heavyJobsScore = Math.min(100, (heavyJobs / periodDays) * 100); // 1 heavy job/day = 100 points
    var overrideScore = Math.min(100, (overrideCount / periodDays) * 100); // 1 override/day = 100 points
    var consecutiveScore = Math.min(100, (consecutiveDays / 7) * 100); // 7 days = 100 points
    
    // Weighted average
    var totalScore = (
      distanceScore * 0.3 +
      hoursScore * 0.25 +
      heavyJobsScore * 0.2 +
      overrideScore * 0.15 +
      consecutiveScore * 0.1
    );
    
    // Determine level
    var level = 'light';
    if (totalScore >= 81) {
      level = 'very_heavy';
    } else if (totalScore >= 61) {
      level = 'heavy';
    } else if (totalScore >= 31) {
      level = 'moderate';
    }
    
    return {
      driver_id: driverId,
      score: Math.round(totalScore),
      level: level,
      period_days: periodDays,
      metrics: {
        total_distance: totalDistance,
        total_hours: totalHours,
        avg_daily_distance: Math.round(avgDailyDistance),
        days_worked: daysWorked,
        heavy_jobs: heavyJobs,
        override_count: overrideCount,
        consecutive_days: consecutiveDays
      },
      components: {
        distance_score: Math.round(distanceScore),
        hours_score: Math.round(hoursScore),
        heavy_jobs_score: Math.round(heavyJobsScore),
        override_score: Math.round(overrideScore),
        consecutive_score: Math.round(consecutiveScore)
      },
      recommendations: generateWorkloadRecommendations(totalScore, level, {
        avgDailyDistance: avgDailyDistance,
        consecutiveDays: consecutiveDays,
        overrideCount: overrideCount
      })
    };
    
  } catch (error) {
    Logger.log('Calculate workload balance score error: ' + error.toString());
    return {
      driver_id: driverId,
      score: 0,
      level: 'unknown',
      error: error.toString()
    };
  }
}

/**
 * Get Driver Usage Logs - ดึงข้อมูลการใช้งานของคนขับจาก QUEUE และ QR Log
 */
function getDriverUsageLogs(driverId, startDate, endDate) {
  try {
    var startDateStr = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var endDateStr = Utilities.formatDate(endDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Get queues for this driver
    var queueSheet = getSheet(CONFIG.SHEETS.QUEUE);
    if (!queueSheet) return [];
    
    var queueData = queueSheet.getDataRange().getValues();
    if (queueData.length <= 1) return [];
    
    var headers = queueData[0];
    var driverIdIndex = headers.indexOf('driver_id');
    var dateIndex = headers.indexOf('date');
    var carIdIndex = headers.indexOf('car_id');
    var mileageStartIndex = headers.indexOf('mileage_start');
    var mileageEndIndex = headers.indexOf('mileage_end');
    var timeStartIndex = headers.indexOf('time_start');
    var timeEndIndex = headers.indexOf('time_end');
    var fatigueOverrideIndex = headers.indexOf('fatigue_override');
    var emergencyOverrideIndex = headers.indexOf('emergency_override');
    var statusIndex = headers.indexOf('status');
    
    if (driverIdIndex === -1 || dateIndex === -1) return [];
    
    var logs = [];
    var dailyDistance = {}; // Group by date
    
    for (var i = 1; i < queueData.length; i++) {
      var row = queueData[i];
      if (row[driverIdIndex] !== driverId) continue;
      
      var queueDate = row[dateIndex];
      if (queueDate < startDateStr || queueDate > endDateStr) continue;
      
      // Only count completed queues
      var status = row[statusIndex];
      if (status !== 'done' && status !== 'running') continue;
      
      // Calculate distance from mileage
      var mileageStart = mileageStartIndex !== -1 ? (parseFloat(row[mileageStartIndex]) || 0) : 0;
      var mileageEnd = mileageEndIndex !== -1 ? (parseFloat(row[mileageEndIndex]) || 0) : 0;
      var distance = mileageEnd > mileageStart ? mileageEnd - mileageStart : 0;
      
      // Calculate hours from time
      var hours = 0;
      if (timeStartIndex !== -1 && timeEndIndex !== -1 && row[timeStartIndex] && row[timeEndIndex]) {
        var startTime = row[timeStartIndex];
        var endTime = row[timeEndIndex];
        try {
          var startParts = startTime.split(':');
          var endParts = endTime.split(':');
          if (startParts.length === 2 && endParts.length === 2) {
            var startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
            var endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
            hours = (endMinutes - startMinutes) / 60;
            if (hours < 0) hours += 24; // Handle overnight
          }
        } catch (e) {
          // Ignore time calculation errors
        }
      }
      
      // Get vehicle type
      var vehicleType = '';
      if (carIdIndex !== -1 && row[carIdIndex]) {
        var vehicleResult = getVehicleById(row[carIdIndex]);
        if (vehicleResult.success && vehicleResult.data && vehicleResult.data.vehicle) {
          vehicleType = vehicleResult.data.vehicle.vehicle_type || '';
        }
      }
      
      // Check if heavy job (distance > 200 km or large vehicle)
      var isHeavy = distance > 200 || (vehicleType && (vehicleType.includes('bus') || vehicleType.includes('van')));
      
      // Accumulate daily distance
      if (!dailyDistance[queueDate]) {
        dailyDistance[queueDate] = {
          date: queueDate,
          distance: 0,
          hours: 0,
          heavy_jobs: 0,
          fatigue_override: false,
          emergency_override: false,
          vehicle_type: vehicleType
        };
      }
      
      dailyDistance[queueDate].distance += distance;
      dailyDistance[queueDate].hours += hours;
      if (isHeavy) {
        dailyDistance[queueDate].heavy_jobs++;
      }
      
      // Check overrides
      if (fatigueOverrideIndex !== -1 && (row[fatigueOverrideIndex] === true || row[fatigueOverrideIndex] === 'TRUE')) {
        dailyDistance[queueDate].fatigue_override = true;
      }
      if (emergencyOverrideIndex !== -1 && (row[emergencyOverrideIndex] === true || row[emergencyOverrideIndex] === 'TRUE')) {
        dailyDistance[queueDate].emergency_override = true;
      }
    }
    
    // Convert to array
    for (var date in dailyDistance) {
      logs.push(dailyDistance[date]);
    }
    
    // Sort by date
    logs.sort(function(a, b) {
      return a.date.localeCompare(b.date);
    });
    
    return logs;
    
  } catch (error) {
    Logger.log('Get driver usage logs error: ' + error.toString());
    return [];
  }
}

/**
 * Generate Workload Recommendations - สร้างคำแนะนำตาม Workload Score
 */
function generateWorkloadRecommendations(score, level, metrics) {
  var recommendations = [];
  
  if (level === 'very_heavy' || score >= 81) {
    recommendations.push('⚠️ พนักงานขับรถที่ภาระงานสูงมาก');
    recommendations.push('แนะนำหลีกเลี่ยงงานไกล 3-5 วัน');
    recommendations.push('แนะนำพัก 1-2 วัน');
    if (metrics.consecutiveDays >= 5) {
      recommendations.push('⚠️ ขับต่อเนื่อง ' + metrics.consecutiveDays + ' วัน - แนะนำพักทันที');
    }
  } else if (level === 'heavy' || score >= 61) {
    recommendations.push('⚠️ พนักงานขับรถที่ภาระงานสูง');
    recommendations.push('แนะนำหลีกเลี่ยงงานไกล 2-3 วัน');
    if (metrics.avgDailyDistance > 300) {
      recommendations.push('💡 ระยะทางเฉลี่ย ' + Math.round(metrics.avgDailyDistance) + ' กม./วัน - สูงกว่าค่าเฉลี่ย');
    }
    if (metrics.overrideCount > 3) {
      recommendations.push('⚠️ ถูก Override ความล้า ' + metrics.overrideCount + ' ครั้ง - เสี่ยงต่อความปลอดภัย');
    }
  } else if (level === 'moderate' || score >= 31) {
    recommendations.push('📋 ภาระงานอยู่ในระดับปานกลาง');
    recommendations.push('สามารถรับงานได้ตามปกติ');
  } else {
    recommendations.push('✅ ภาระงานเบา');
    recommendations.push('สามารถรับงานเพิ่มเติมได้');
  }
  
  return recommendations;
}

/**
 * Get All Drivers Workload Scores - ดึงคะแนนภาระงานของคนขับทั้งหมด
 */
function getAllDriversWorkloadScores(periodDays) {
  try {
    periodDays = periodDays || 30;
    
    var drivers = getDrivers({ active: true });
    if (!drivers.success) {
      return successResponse({ drivers: [] });
    }
    
    var driverScores = [];
    for (var i = 0; i < drivers.data.drivers.length; i++) {
      var driver = drivers.data.drivers[i];
      var score = calculateWorkloadBalanceScore(driver.driver_id, periodDays);
      driverScores.push({
        driver_id: driver.driver_id,
        driver_name: driver.full_name || driver.first_name + ' ' + driver.last_name,
        score: score.score,
        level: score.level,
        metrics: score.metrics,
        recommendations: score.recommendations
      });
    }
    
    // Sort by score descending (heaviest first)
    driverScores.sort(function(a, b) {
      return b.score - a.score;
    });
    
    return successResponse({
      drivers: driverScores,
      period_days: periodDays,
      summary: {
        very_heavy: driverScores.filter(function(d) { return d.level === 'very_heavy'; }).length,
        heavy: driverScores.filter(function(d) { return d.level === 'heavy'; }).length,
        moderate: driverScores.filter(function(d) { return d.level === 'moderate'; }).length,
        light: driverScores.filter(function(d) { return d.level === 'light'; }).length
      }
    });
    
  } catch (error) {
    Logger.log('Get all drivers workload scores error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการคำนวณ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Fairness Recommendations - แนะนำการกระจายภาระงานอย่างยุติธรรม
 */
function getFairnessRecommendations(date) {
  try {
    date = date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Get all drivers workload scores (7 days)
    var scores7Days = getAllDriversWorkloadScores(7);
    if (!scores7Days.success) {
      return successResponse({ recommendations: [] });
    }
    
    var drivers = scores7Days.data.drivers;
    var recommendations = [];
    
    // Find drivers who should rest
    var heavyDrivers = drivers.filter(function(d) {
      return d.level === 'heavy' || d.level === 'very_heavy';
    });
    
    if (heavyDrivers.length > 0) {
      recommendations.push({
        type: 'rest_recommendation',
        priority: 'high',
        message: 'แนะนำให้พนักงานขับรถที่ภาระงานสูงได้พัก',
        drivers: heavyDrivers.map(function(d) {
          return {
            driver_id: d.driver_id,
            driver_name: d.driver_name,
            score: d.score,
            level: d.level,
            recommendation: 'แนะนำงานภายใน / สแตนบาย'
          };
        })
      });
    }
    
    // Find drivers who can take more work
    var lightDrivers = drivers.filter(function(d) {
      return d.level === 'light' || d.level === 'moderate';
    });
    
    if (lightDrivers.length > 0 && heavyDrivers.length > 0) {
      recommendations.push({
        type: 'workload_balance',
        priority: 'medium',
        message: 'แนะนำกระจายภาระงานให้พนักงานขับรถที่ภาระงานเบา',
        suggestion: 'พิจารณาให้พนักงานขับรถที่ภาระงานเบารับงานแทน',
        available_drivers: lightDrivers.map(function(d) {
          return {
            driver_id: d.driver_id,
            driver_name: d.driver_name,
            score: d.score,
            level: d.level
          };
        })
      });
    }
    
    return successResponse({
      date: date,
      recommendations: recommendations,
      summary: {
        total_drivers: drivers.length,
        heavy_drivers: heavyDrivers.length,
        light_drivers: lightDrivers.length
      }
    });
    
  } catch (error) {
    Logger.log('Get fairness recommendations error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}
