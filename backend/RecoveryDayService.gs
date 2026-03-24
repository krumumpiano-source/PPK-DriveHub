/**
 * PPK DriveHub Recovery Day Service
 * จัดการวันฟื้นตัว (Recovery Day) สำหรับคนขับ
 * 
 * เป้าหมาย: ให้คนขับได้พักอย่างเป็นระบบ ไม่ใช่ลา ไม่ใช่ลงโทษ
 */

/**
 * Check Recovery Day Status - ตรวจสอบสถานะวันฟื้นตัว
 */
function checkRecoveryDayStatus(driverId, date) {
  try {
    date = date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Get workload score (7 days)
    var workloadScore = calculateWorkloadBalanceScore(driverId, 7);
    
    // Check if driver drove >400 km yesterday
    var yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    var yesterdayStr = Utilities.formatDate(yesterday, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    var usageLogs = getDriverUsageLogs(driverId, yesterday, yesterday);
    var yesterdayDistance = 0;
    if (usageLogs.length > 0 && usageLogs[0].date === yesterdayStr) {
      yesterdayDistance = usageLogs[0].distance || 0;
    }
    
    // Check consecutive heavy days
    var last7DaysLogs = getDriverUsageLogs(driverId, 
      new Date(new Date(date).setDate(new Date(date).getDate() - 7)), 
      new Date(date)
    );
    
    var consecutiveHeavyDays = 0;
    var lastDate = null;
    for (var i = last7DaysLogs.length - 1; i >= 0; i--) {
      var log = last7DaysLogs[i];
      if (log.distance > 300 || log.heavy_jobs > 0) {
        if (lastDate) {
          var daysDiff = Math.floor((new Date(log.date) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            consecutiveHeavyDays++;
          } else {
            consecutiveHeavyDays = 1;
          }
        } else {
          consecutiveHeavyDays = 1;
        }
        lastDate = log.date;
      } else {
        consecutiveHeavyDays = 0;
        lastDate = null;
      }
    }
    
    var needsRecovery = false;
    var recoveryReason = '';
    var recoveryType = '';
    
    // Rule 1: Drove >400 km yesterday
    if (yesterdayDistance > 400) {
      needsRecovery = true;
      recoveryReason = 'ขับรถ ' + Math.round(yesterdayDistance) + ' กม. เมื่อวาน';
      recoveryType = 'fatigue_recovery';
    }
    
    // Rule 2: Consecutive heavy days (3+ days)
    if (consecutiveHeavyDays >= 3) {
      needsRecovery = true;
      recoveryReason = 'ขับหนักต่อเนื่อง ' + consecutiveHeavyDays + ' วัน';
      recoveryType = 'consecutive_recovery';
    }
    
    // Rule 3: High workload score
    if (workloadScore.score >= 70) {
      needsRecovery = true;
      recoveryReason = 'ภาระงานสูง (Score: ' + workloadScore.score + ')';
      recoveryType = 'workload_recovery';
    }
    
    return {
      driver_id: driverId,
      date: date,
      needs_recovery: needsRecovery,
      recovery_type: recoveryType,
      recovery_reason: recoveryReason,
      yesterday_distance: yesterdayDistance,
      consecutive_heavy_days: consecutiveHeavyDays,
      workload_score: workloadScore.score,
      recommendation: needsRecovery ? 
        'แนะนำงานภายใน / สแตนบาย' : 
        'สามารถรับงานได้ตามปกติ'
    };
    
  } catch (error) {
    Logger.log('Check recovery day status error: ' + error.toString());
    return {
      driver_id: driverId,
      date: date,
      needs_recovery: false,
      error: error.toString()
    };
  }
}

/**
 * Get Recovery Day Recommendations - แนะนำวันฟื้นตัวสำหรับคนขับทั้งหมด
 */
function getRecoveryDayRecommendations(date) {
  try {
    date = date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    var drivers = getDrivers({ active: true });
    if (!drivers.success) {
      return successResponse({ recommendations: [] });
    }
    
    var recommendations = [];
    
    for (var i = 0; i < drivers.data.drivers.length; i++) {
      var driver = drivers.data.drivers[i];
      var recoveryStatus = checkRecoveryDayStatus(driver.driver_id, date);
      
      if (recoveryStatus.needs_recovery) {
        recommendations.push({
          driver_id: driver.driver_id,
          driver_name: driver.full_name || driver.first_name + ' ' + driver.last_name,
          recovery_type: recoveryStatus.recovery_type,
          recovery_reason: recoveryStatus.recovery_reason,
          recommendation: recoveryStatus.recommendation,
          yesterday_distance: recoveryStatus.yesterday_distance,
          consecutive_heavy_days: recoveryStatus.consecutive_heavy_days,
          workload_score: recoveryStatus.workload_score
        });
      }
    }
    
    return successResponse({
      date: date,
      recommendations: recommendations,
      count: recommendations.length
    });
    
  } catch (error) {
    Logger.log('Get recovery day recommendations error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}
