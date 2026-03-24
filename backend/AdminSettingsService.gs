/**
 * PPK DriveHub Admin Settings Service
 * Admin ตั้งกฎเกณฑ์ในการจัดคิว/การเติมน้ำมัน/การซ่อมต่างๆ
 */

/**
 * Get Admin Settings - ดึงค่าตั้งค่าทั้งหมด (Admin only)
 */
function getAdminSettings() {
  try {
    requireAdmin();
    
    var settings = {
      queue: getQueueSettings(),
      fuel: getFuelSettings(),
      repair: getRepairSettings(),
      system: getSystemSettings()
    };
    
    return successResponse({ settings: settings });
    
  } catch (error) {
    Logger.log('Get admin settings error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Queue Settings - กฎเกณฑ์การจัดคิว
 */
function getQueueSettings() {
  try {
    var settings = {
      rotation_policy: {
        max_car_usage_per_week: CONFIG.ROTATION_POLICY?.MAX_CAR_USAGE_PER_WEEK || 3,
        max_driver_long_jobs_per_week: CONFIG.ROTATION_POLICY?.MAX_DRIVER_LONG_JOBS_PER_WEEK || 2
      },
      fatigue_rule: {
        distance_threshold: 400, // กม.
        recovery_day_enabled: true
      },
      auto_recovery: {
        pending_return_hour: CONFIG.AUTO_RECOVERY?.PENDING_RETURN_HOUR || 18,
        default_out_time: CONFIG.AUTO_RECOVERY?.DEFAULT_OUT_TIME || '08:00',
        default_in_time: CONFIG.AUTO_RECOVERY?.DEFAULT_IN_TIME || '17:30'
      }
    };
    
    // Load from MASTER sheet if exists
    var masterResult = getSystemSettings();
    if (masterResult.success && masterResult.data.settings) {
      var master = masterResult.data.settings;
      if (master.max_car_usage_per_week) settings.rotation_policy.max_car_usage_per_week = parseInt(master.max_car_usage_per_week.value) || 3;
      if (master.max_driver_long_jobs_per_week) settings.rotation_policy.max_driver_long_jobs_per_week = parseInt(master.max_driver_long_jobs_per_week.value) || 2;
      if (master.fatigue_distance_threshold) settings.fatigue_rule.distance_threshold = parseInt(master.fatigue_distance_threshold.value) || 400;
      if (master.recovery_day_enabled !== undefined) settings.fatigue_rule.recovery_day_enabled = master.recovery_day_enabled.value === true || master.recovery_day_enabled.value === 'true' || master.recovery_day_enabled.value === 'TRUE';
      if (master.pending_return_hour) settings.auto_recovery.pending_return_hour = parseInt(master.pending_return_hour.value) || 18;
    }
    
    return settings;
  } catch (e) {
    Logger.log('getQueueSettings error: ' + e.toString());
    return {
      rotation_policy: { max_car_usage_per_week: 3, max_driver_long_jobs_per_week: 2 },
      fatigue_rule: { distance_threshold: 400, recovery_day_enabled: true },
      auto_recovery: { pending_return_hour: 18, default_out_time: '08:00', default_in_time: '17:30' }
    };
  }
}

/**
 * Fuel Settings - กฎเกณฑ์การเติมน้ำมัน
 */
function getFuelSettings() {
  try {
    var settings = {
      abnormal_consumption_threshold: 0.2, // 20% ผิดปกติ
      alert_on_abnormal: true,
      require_receipt: false // ไม่บังคับ แต่แนะนำ
    };
    
    var masterResult = getSystemSettings();
    if (masterResult.success && masterResult.data.settings) {
      var master = masterResult.data.settings;
      if (master.abnormal_consumption_threshold) settings.abnormal_consumption_threshold = parseFloat(master.abnormal_consumption_threshold.value) || 0.2;
      if (master.alert_on_abnormal) settings.alert_on_abnormal = master.alert_on_abnormal.value === 'true' || master.alert_on_abnormal.value === 'TRUE';
    }
    
    return settings;
  } catch (e) {
    return { abnormal_consumption_threshold: 0.2, alert_on_abnormal: true, require_receipt: false };
  }
}

/**
 * Repair Settings - กฎเกณฑ์การซ่อม
 */
function getRepairSettings() {
  try {
    var settings = {
      pm_advance_days: 7,
      pm_advance_km: 100,
      emergency_auto_lock: true,
      require_approval: false // ไม่ต้องอนุมัติ แต่บันทึกได้
    };
    
    var masterResult = getSystemSettings();
    if (masterResult.success && masterResult.data.settings) {
      var master = masterResult.data.settings;
      if (master.pm_advance_days) settings.pm_advance_days = parseInt(master.pm_advance_days.value) || 7;
      if (master.pm_advance_km) settings.pm_advance_km = parseInt(master.pm_advance_km.value) || 100;
      if (master.emergency_auto_lock !== undefined) settings.emergency_auto_lock = master.emergency_auto_lock.value === true || master.emergency_auto_lock.value === 'true' || master.emergency_auto_lock.value === 'TRUE';
    }
    
    return settings;
  } catch (e) {
    return { pm_advance_days: 7, pm_advance_km: 100, emergency_auto_lock: true, require_approval: false };
  }
}

/**
 * Maintenance item keys - ตรงกับ frontend admin-settings รายการที่ต้องแจ้งเตือน
 */
var MAINTENANCE_ITEM_KEYS = [
  'engine_oil', 'gear_oil', 'brake_oil', 'coolant', 'power_steering', 'air_filter', 'ac_filter',
  'spark_plug', 'timing_belt', 'serpentine_belt', 'brake_pad', 'brake_disc', 'tire',
  'shock_absorber', 'ball_joint', 'bush', 'battery', 'wiper'
];

/**
 * Get Maintenance Thresholds - ดึงค่าระยะทาง/เดือนของรายการแจ้งเตือนจาก MASTER
 * ใช้สำหรับประมวลผลแจ้งเตือนซ่อมบำรุง (เทียบเลขไมล์รถ/เวลาที่ผ่านกับค่าที่แอดมินตั้ง)
 */
function getMaintenanceThresholds() {
  try {
    var result = getSystemSettings();
    if (!result.success || !result.data || !result.data.settings) {
      return getDefaultMaintenanceThresholds();
    }
    var master = result.data.settings;
    var out = {};
    MAINTENANCE_ITEM_KEYS.forEach(function(key) {
      var kmKey = 'maintenance_' + key + '_km';
      var moKey = 'maintenance_' + key + '_months';
      var km = (master[kmKey] && master[kmKey].value != null) ? parseInt(master[kmKey].value, 10) : null;
      var mo = (master[moKey] && master[moKey].value != null) ? parseInt(master[moKey].value, 10) : null;
      out[key] = { km: isNaN(km) ? null : km, months: isNaN(mo) ? null : mo };
    });
    return out;
  } catch (e) {
    Logger.log('getMaintenanceThresholds error: ' + e.toString());
    return getDefaultMaintenanceThresholds();
  }
}

function getDefaultMaintenanceThresholds() {
  var defaults = {
    engine_oil: { km: 5000, months: 6 }, gear_oil: { km: 40000, months: 48 }, brake_oil: { km: 60000, months: 60 },
    coolant: { km: 100000, months: 84 }, power_steering: { km: 40000, months: 48 }, air_filter: { km: 10000, months: 12 },
    ac_filter: { km: 20000, months: 24 }, spark_plug: { km: 60000, months: 60 }, timing_belt: { km: 80000, months: 72 },
    serpentine_belt: { km: 80000, months: 72 }, brake_pad: { km: 40000, months: 48 }, brake_disc: { km: 60000, months: 60 },
    tire: { km: 50000, months: 60 }, shock_absorber: { km: 80000, months: 72 }, ball_joint: { km: 100000, months: 84 },
    bush: { km: 100000, months: 84 }, battery: { km: 0, months: 36 }, wiper: { km: 0, months: 12 }
  };
  var out = {};
  MAINTENANCE_ITEM_KEYS.forEach(function(key) {
    out[key] = defaults[key] || { km: 0, months: 12 };
  });
  return out;
}

/**
 * Update Admin Setting - อัปเดตค่าตั้งค่า (Admin only)
 */
function updateAdminSetting(category, key, value) {
  try {
    requireAdmin();
    
    var masterKey = category + '_' + key;
    return updateSystemSetting(masterKey, value);
    
  } catch (error) {
    Logger.log('Update admin setting error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

// requireAdmin() is defined in Utils.gs - use that
