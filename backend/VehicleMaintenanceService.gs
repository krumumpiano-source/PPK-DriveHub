/**
 * PPK DriveHub Vehicle Maintenance Service
 * เก็บ "ครั้งล่าสุดที่เปลี่ยน/ตรวจ" แยกต่อคันต่อรายการ (น้ำมันเครื่อง, น้ำมันเกียร์ ฯลฯ)
 * เพื่อให้แจ้งเตือนตามระยะจริงของแต่ละคัน — รถแต่ละคันมีการเปลี่ยนในระยะที่ต่างกัน
 */

/**
 * Get or create VEHICLE_MAINTENANCE sheet
 */
function getVehicleMaintenanceSheet() {
  return getOrCreateSheet(CONFIG.SHEETS.VEHICLE_MAINTENANCE, [
    'car_id', 'item_key', 'last_km', 'last_date', 'notes', 'updated_at', 'updated_by'
  ]);
}

/**
 * Get last maintenance record per item for a vehicle
 * @returns {Object} e.g. { engine_oil: { last_km: 45000, last_date: '2024-01-15' }, ... }
 */
function getVehicleMaintenanceLast(carId) {
  try {
    var sheet = getVehicleMaintenanceSheet();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var carIdCol = headers.indexOf('car_id');
    var itemKeyCol = headers.indexOf('item_key');
    var lastKmCol = headers.indexOf('last_km');
    var lastDateCol = headers.indexOf('last_date');
    if (carIdCol === -1 || itemKeyCol === -1) return {};

    var out = {};
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[carIdCol] !== carId) continue;
      var key = String(row[itemKeyCol] || '').trim();
      if (!key) continue;
      var lastKm = row[lastKmCol];
      var lastDate = row[lastDateCol];
      if (lastKm !== undefined && lastKm !== null && lastKm !== '') {
        lastKm = parseInt(lastKm, 10);
        if (isNaN(lastKm)) lastKm = null;
      } else lastKm = null;
      if (lastDate) {
        if (typeof lastDate === 'object' && lastDate.getFullYear) {
          var y = lastDate.getFullYear();
          var m = (lastDate.getMonth() + 1);
          var d = lastDate.getDate();
          lastDate = y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
        } else {
          lastDate = String(lastDate).substring(0, 10);
        }
      } else lastDate = null;
      out[key] = { last_km: lastKm, last_date: lastDate };
    }
    return out;
  } catch (e) {
    Logger.log('getVehicleMaintenanceLast error: ' + e.toString());
    return {};
  }
}

/**
 * Set last maintenance for one item for a vehicle (create or update row)
 */
function setVehicleMaintenanceLast(carId, itemKey, last_km, last_date, notes) {
  try {
    requireAuth();
    var sheet = getVehicleMaintenanceSheet();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var carIdCol = headers.indexOf('car_id');
    var itemKeyCol = headers.indexOf('item_key');
    var lastKmCol = headers.indexOf('last_km');
    var lastDateCol = headers.indexOf('last_date');
    var notesCol = headers.indexOf('notes');
    var updatedAtCol = headers.indexOf('updated_at');
    var updatedByCol = headers.indexOf('updated_by');

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][carIdCol] === carId && data[i][itemKeyCol] === itemKey) {
        rowIndex = i + 1;
        break;
      }
    }

    var now = new Date();
    var user = getCurrentUser() || 'admin';
    var kmVal = last_km !== undefined && last_km !== null && last_km !== '' ? parseInt(last_km, 10) : '';
    var dateVal = last_date || '';
    if (dateVal && typeof dateVal === 'object' && dateVal.getFullYear) {
      var y = dateVal.getFullYear(), m = dateVal.getMonth() + 1, d = dateVal.getDate();
      dateVal = y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
    } else if (dateVal) dateVal = String(dateVal).substring(0, 10);

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, lastKmCol + 1).setValue(kmVal);
      sheet.getRange(rowIndex, lastDateCol + 1).setValue(dateVal);
      if (notesCol !== -1) sheet.getRange(rowIndex, notesCol + 1).setValue(notes || '');
      if (updatedAtCol !== -1) sheet.getRange(rowIndex, updatedAtCol + 1).setValue(now);
      if (updatedByCol !== -1) sheet.getRange(rowIndex, updatedByCol + 1).setValue(user);
    } else {
      sheet.appendRow([carId, itemKey, kmVal, dateVal, notes || '', now, user]);
    }
    return { success: true };
  } catch (e) {
    Logger.log('setVehicleMaintenanceLast error: ' + e.toString());
    throw e;
  }
}

/**
 * Record maintenance for multiple items at once (e.g. after repair)
 * @param {string} carId
 * @param {Array} updates e.g. [ { item_key: 'engine_oil', last_km: 45000, last_date: '2024-01-15' }, ... ]
 */
function recordVehicleMaintenance(carId, updates) {
  try {
    if (!carId || !Array.isArray(updates) || updates.length === 0) {
      return { success: true, updated: 0 };
    }
    var updated = 0;
    for (var i = 0; i < updates.length; i++) {
      var u = updates[i];
      var key = u.item_key || u.itemKey;
      if (!key) continue;
      setVehicleMaintenanceLast(
        carId,
        key,
        u.last_km !== undefined ? u.last_km : u.lastKm,
        u.last_date || u.lastDate,
        u.notes
      );
      updated++;
    }
    return { success: true, updated: updated };
  } catch (e) {
    Logger.log('recordVehicleMaintenance error: ' + e.toString());
    throw e;
  }
}

/**
 * ตั้งค่าประวัติการบำรุงครั้งแรก — ใช้เลขไมล์ปัจจุบันและวันนี้เป็นจุดเริ่มต้น (สำหรับรถที่ยังไม่เคยทำ/ไม่ทราบประวัติ)
 * เรียกแล้ว ระบบจะตั้ง last_km = เลขไมล์ปัจจุบันของรถ และ last_date = วันนี้ ทุกรายการ
 * ครั้งถัดไปจะครบที่ (ไมล์ปัจจุบัน + เกณฑ์ กม.) และ (วันนี้ + เกณฑ์ เดือน)
 */
function initializeVehicleMaintenanceFromToday(carId) {
  try {
    requireAuth();
    var carRes = getVehicleById(carId);
    if (!carRes.success || !carRes.data || !carRes.data.vehicle) {
      throw new Error('ไม่พบข้อมูลรถ');
    }
    var vehicle = carRes.data.vehicle;
    var currentMileage = parseInt(vehicle.mileage, 10) || 0;
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + (today.getMonth() + 1 < 10 ? '0' : '') + (today.getMonth() + 1) + '-' + (today.getDate() < 10 ? '0' : '') + today.getDate();
    var thresholds = getMaintenanceThresholds();
    var keys = Object.keys(thresholds || {});
    var updated = 0;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      setVehicleMaintenanceLast(carId, key, currentMileage, todayStr, 'ตั้งค่าครั้งแรก - ใช้เลขไมล์และวันนี้เป็นจุดเริ่มต้น');
      updated++;
    }
    return { success: true, updated: updated };
  } catch (e) {
    Logger.log('initializeVehicleMaintenanceFromToday error: ' + e.toString());
    throw e;
  }
}

/**
 * Map Thai repair item text to admin item_key (for auto-update when completing repair)
 */
var REPAIR_ITEM_TO_KEY = {
  'น้ำมันเครื่อง': 'engine_oil', 'เปลี่ยนถ่ายน้ำมันเครื่อง': 'engine_oil', 'เปลี่ยนน้ำมันเครื่อง': 'engine_oil',
  'น้ำมันเกียร์': 'gear_oil', 'เปลี่ยนถ่ายน้ำมันเกียร์': 'gear_oil',
  'น้ำมันเบรก': 'brake_oil', 'เปลี่ยนถ่ายน้ำมันเบรก': 'brake_oil',
  'น้ำยาหล่อเย็น': 'coolant', 'เปลี่ยนน้ำยาหล่อเย็น': 'coolant',
  'พวงมาลัยพาวเวอร์': 'power_steering', 'น้ำมันพวงมาลัย': 'power_steering',
  'ไส้กรองอากาศ': 'air_filter', 'เปลี่ยนไส้กรองอากาศ': 'air_filter',
  'ไส้กรองแอร์': 'ac_filter', 'เปลี่ยนไส้กรองแอร์': 'ac_filter',
  'หัวเทียน': 'spark_plug', 'เปลี่ยนหัวเทียน': 'spark_plug',
  'สายพานไทม์': 'timing_belt', 'สายพานไทม์มิ่ง': 'timing_belt',
  'สายพานหน้าเครื่อง': 'serpentine_belt', 'สายพาน': 'serpentine_belt',
  'ผ้าเบรก': 'brake_pad', 'เปลี่ยนผ้าเบรก': 'brake_pad',
  'จานเบรก': 'brake_disc', 'เปลี่ยนจานเบรก': 'brake_disc',
  'ยางรถ': 'tire', 'ยาง': 'tire',
  'โช้ค': 'shock_absorber', 'โช้คอัพ': 'shock_absorber',
  'ลูกหมาก': 'ball_joint', 'บูช': 'bush', 'บูชยาง': 'bush',
  'แบตเตอรี่': 'battery', 'แบต': 'battery',
  'ใบปัดน้ำฝน': 'wiper', 'ที่ปัดน้ำฝน': 'wiper'
};

/**
 * From repair_items text (e.g. "เปลี่ยนถ่ายน้ำมันเครื่อง, เปลี่ยนไส้กรองอากาศ") get list of item_key to update
 */
function parseRepairItemsToMaintenanceKeys(repairItemsStr) {
  if (!repairItemsStr) return [];
  var seen = {};
  var keys = [];
  var s = String(repairItemsStr);
  Object.keys(REPAIR_ITEM_TO_KEY).forEach(function(phrase) {
    if (s.indexOf(phrase) !== -1) {
      var key = REPAIR_ITEM_TO_KEY[phrase];
      if (key && !seen[key]) {
        seen[key] = true;
        keys.push(key);
      }
    }
  });
  return keys;
}

/**
 * Get maintenance alerts for one vehicle — ใช้ค่าต่อคัน (last_km/last_date) + เกณฑ์จากแอดมิน
 * @returns {Object} { alerts: [ { item_key, next_due_km, next_due_date, due_soon_km, due_soon_date, message } ], vehicle_mileage }
 */
function getMaintenanceAlertsForVehicle(carId) {
  try {
    var carRes = getVehicleById(carId);
    if (!carRes.success || !carRes.data || !carRes.data.vehicle) {
      return { alerts: [], vehicle_mileage: 0 };
    }
    var vehicle = carRes.data.vehicle;
    var currentMileage = parseInt(vehicle.mileage, 10) || 0;
    var thresholds = getMaintenanceThresholds();
    var lastByItem = getVehicleMaintenanceLast(carId);
    var repairSettings = getRepairSettings();
    var pmAdvanceKm = parseInt(repairSettings.pm_advance_km, 10) || 100;
    var pmAdvanceDays = parseInt(repairSettings.pm_advance_days, 10) || 7;

    var alerts = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    Object.keys(thresholds).forEach(function(itemKey) {
      var th = thresholds[itemKey];
      var kmInterval = (th && th.km != null) ? parseInt(th.km, 10) : 0;
      var moInterval = (th && th.months != null) ? parseInt(th.months, 10) : 0;
      if (!kmInterval && !moInterval) return;

      var last = lastByItem[itemKey] || {};
      var lastKm = (last.last_km != null) ? parseInt(last.last_km, 10) : null;
      var lastDate = last.last_date || null;
      if (lastDate && typeof lastDate === 'object' && lastDate.getFullYear) {
        var y = lastDate.getFullYear(), m = lastDate.getMonth() + 1, d = lastDate.getDate();
        lastDate = y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
      } else if (lastDate) lastDate = String(lastDate).substring(0, 10);

      var nextDueKm = null;
      var nextDueDate = null;
      if (lastKm != null && !isNaN(lastKm) && kmInterval > 0) {
        nextDueKm = lastKm + kmInterval;
      } else if (kmInterval > 0) {
        nextDueKm = kmInterval;
      }
      if (lastDate && moInterval > 0) {
        var parts = lastDate.split('-');
        if (parts.length === 3) {
          var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          d.setMonth(d.getMonth() + moInterval);
          nextDueDate = d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
        }
      } else if (moInterval > 0 && vehicle.registration_date) {
        var reg = String(vehicle.registration_date).substring(0, 10);
        var p = reg.split('-');
        if (p.length === 3) {
          var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
          d.setMonth(d.getMonth() + moInterval);
          nextDueDate = d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
        }
      }

      var dueSoonKm = false;
      var dueSoonDate = false;
      if (nextDueKm != null && currentMileage >= nextDueKm - pmAdvanceKm) dueSoonKm = true;
      if (nextDueDate) {
        var dueDate = new Date(nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        var diffDays = Math.ceil((dueDate - today) / (24 * 60 * 60 * 1000));
        if (diffDays <= pmAdvanceDays) dueSoonDate = true;
      }
      if (dueSoonKm || dueSoonDate) {
        var msg = 'รายการ ' + itemKey + ': ครบกำหนดตามระยะทางหรือเวลา';
        if (nextDueKm != null) msg += ' (ครบที่ ' + nextDueKm.toLocaleString() + ' กม.)';
        if (nextDueDate) msg += ' (ครบประมาณ ' + nextDueDate + ')';
        alerts.push({
          item_key: itemKey,
          next_due_km: nextDueKm,
          next_due_date: nextDueDate,
          current_mileage: currentMileage,
          due_soon_km: dueSoonKm,
          due_soon_date: dueSoonDate,
          message: msg
        });
      }
    });

    return {
      alerts: alerts,
      vehicle_mileage: currentMileage
    };
  } catch (e) {
    Logger.log('getMaintenanceAlertsForVehicle error: ' + e.toString());
    return { alerts: [], vehicle_mileage: 0 };
  }
}
