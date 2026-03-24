/**
 * PPK DriveHub Comprehensive Report Service
 * รายงานผลที่ครอบคลุมทุกสถิติ (ตัวเลขงานดิบ + เปอร์เซ็นต์)
 * สำหรับทำรายงานประจำรอบหรือเช็คดูข้อมูล
 * 
 * สถิติที่รวม:
 * - การทำงานของคนขับรถ (ตัวเลข + %)
 * - การใช้งานของรถ (ตัวเลข + %)
 * - การซ่อม (ตัวเลข + %)
 * - การเติมน้ำมัน (ตัวเลข + %)
 * - อัตราสิ้นเปลือง (ตัวเลข + %)
 * - ความเสี่ยง (ตัวเลข + %)
 * - ความคุ้มค่า (ตัวเลข + %)
 */

/**
 * Get Comprehensive Report - รายงานผลครอบคลุมทุกสถิติ
 */
function getComprehensiveReport(filters) {
  try {
    filters = filters || {};
    var dateFrom = filters.date_from || Utilities.formatDate(new Date(new Date().setDate(new Date().getDate() - 30)), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var dateTo = filters.date_to || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    var report = {
      period: { date_from: dateFrom, date_to: dateTo },
      driver_performance: getDriverPerformanceStats(dateFrom, dateTo),
      vehicle_usage: getVehicleUsageStats(dateFrom, dateTo),
      repair_stats: getRepairStats(dateFrom, dateTo),
      fuel_stats: getFuelStats(dateFrom, dateTo),
      fuel_consumption: getFuelConsumptionStats(dateFrom, dateTo),
      risk_analysis: getRiskAnalysisStats(dateFrom, dateTo),
      cost_efficiency: getCostEfficiencyStats(dateFrom, dateTo)
    };
    
    return successResponse({ report: report });
    
  } catch (error) {
    Logger.log('Get comprehensive report error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการสร้างรายงาน: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * สถิติการทำงานของคนขับรถ (ตัวเลข + %)
 */
function getDriverPerformanceStats(dateFrom, dateTo) {
  try {
    var driversResult = getDrivers({ status: 'active' });
    var drivers = driversResult.success ? driversResult.data.drivers : [];
    var queuesResult = getQueues({ date_from: dateFrom, date_to: dateTo });
    var queues = queuesResult.success ? queuesResult.data.queues : [];
    var usageResult = getUsageRecordsRaw({ date_from: dateFrom, date_to: dateTo });
    var usageRecords = usageResult.success ? usageResult.data.records : [];
    
    var totalDays = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24)) + 1;
    var stats = {
      total_drivers: drivers.length,
      drivers_with_work: 0,
      drivers_with_work_percent: 0,
      total_work_days: 0,
      avg_work_days_per_driver: 0,
      total_distance: 0,
      avg_distance_per_driver: 0,
      total_hours: 0,
      avg_hours_per_driver: 0,
      heavy_jobs: 0,
      heavy_jobs_percent: 0,
      fatigue_overrides: 0,
      fatigue_overrides_percent: 0,
      by_driver: {}
    };
    
    var driverWorkDays = {};
    var driverDistance = {};
    var driverHours = {};
    var driverHeavyJobs = {};
    var driverFatigueOverrides = {};
    
    for (var i = 0; i < queues.length; i++) {
      var q = queues[i];
      if (!q.driver_id || q.status !== 'done') continue;
      if (!driverWorkDays[q.driver_id]) {
        driverWorkDays[q.driver_id] = {};
        driverDistance[q.driver_id] = 0;
        driverHours[q.driver_id] = 0;
        driverHeavyJobs[q.driver_id] = 0;
        driverFatigueOverrides[q.driver_id] = 0;
      }
      if (!driverWorkDays[q.driver_id][q.date]) {
        driverWorkDays[q.driver_id][q.date] = true;
        stats.total_work_days++;
      }
      if (q.mileage_start && q.mileage_end) {
        var dist = parseFloat(q.mileage_end) - parseFloat(q.mileage_start);
        driverDistance[q.driver_id] += dist;
        stats.total_distance += dist;
      }
      if (q.started_at && q.ended_at) {
        var hours = calculateHours(q.started_at, q.ended_at);
        driverHours[q.driver_id] += hours;
        stats.total_hours += hours;
      }
      if (q.mission && (q.mission.indexOf('ไกล') !== -1 || q.mission.indexOf('ต่างจังหวัด') !== -1)) {
        driverHeavyJobs[q.driver_id]++;
        stats.heavy_jobs++;
      }
      if (q.fatigue_override === true || q.fatigue_override === 'TRUE') {
        driverFatigueOverrides[q.driver_id]++;
        stats.fatigue_overrides++;
      }
    }
    
    stats.drivers_with_work = Object.keys(driverWorkDays).length;
    stats.drivers_with_work_percent = drivers.length > 0 ? (stats.drivers_with_work / drivers.length * 100).toFixed(2) : 0;
    stats.avg_work_days_per_driver = stats.drivers_with_work > 0 ? (stats.total_work_days / stats.drivers_with_work).toFixed(2) : 0;
    stats.avg_distance_per_driver = stats.drivers_with_work > 0 ? (stats.total_distance / stats.drivers_with_work).toFixed(2) : 0;
    stats.avg_hours_per_driver = stats.drivers_with_work > 0 ? (stats.total_hours / stats.drivers_with_work).toFixed(2) : 0;
    stats.heavy_jobs_percent = queues.length > 0 ? (stats.heavy_jobs / queues.length * 100).toFixed(2) : 0;
    stats.fatigue_overrides_percent = queues.length > 0 ? (stats.fatigue_overrides / queues.length * 100).toFixed(2) : 0;
    
    for (var i = 0; i < drivers.length; i++) {
      var d = drivers[i];
      var workDays = driverWorkDays[d.driver_id] ? Object.keys(driverWorkDays[d.driver_id]).length : 0;
      stats.by_driver[d.driver_id] = {
        driver_id: d.driver_id,
        full_name: d.full_name,
        work_days: workDays,
        work_days_percent: totalDays > 0 ? (workDays / totalDays * 100).toFixed(2) : 0,
        total_distance: driverDistance[d.driver_id] || 0,
        total_hours: driverHours[d.driver_id] || 0,
        heavy_jobs: driverHeavyJobs[d.driver_id] || 0,
        fatigue_overrides: driverFatigueOverrides[d.driver_id] || 0
      };
    }
    
    return stats;
  } catch (e) {
    Logger.log('getDriverPerformanceStats error: ' + e.toString());
    return { total_drivers: 0, drivers_with_work: 0, drivers_with_work_percent: 0 };
  }
}

/**
 * สถิติการใช้งานของรถ (ตัวเลข + %)
 */
function getVehicleUsageStats(dateFrom, dateTo) {
  try {
    var vehiclesResult = getVehicles({ active: true });
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    var queuesResult = getQueues({ date_from: dateFrom, date_to: dateTo });
    var queues = queuesResult.success ? queuesResult.data.queues : [];
    
    var totalDays = Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24)) + 1;
    var stats = {
      total_vehicles: vehicles.length,
      vehicles_used: 0,
      vehicles_used_percent: 0,
      total_usage_days: 0,
      avg_usage_days_per_vehicle: 0,
      availability_rate: 0,
      by_vehicle: {}
    };
    
    var vehicleUsageDays = {};
    var vehicleRepairDays = {};
    
    for (var i = 0; i < queues.length; i++) {
      var q = queues[i];
      if (!q.car_id || q.status !== 'done') continue;
      if (!vehicleUsageDays[q.car_id]) vehicleUsageDays[q.car_id] = {};
      if (!vehicleUsageDays[q.car_id][q.date]) {
        vehicleUsageDays[q.car_id][q.date] = true;
        stats.total_usage_days++;
      }
    }
    
    var repairResult = getRepairLogs({ date_from: dateFrom, date_to: dateTo });
    var repairs = repairResult.success ? repairResult.data.repair_logs : [];
    for (var i = 0; i < repairs.length; i++) {
      var r = repairs[i];
      if (r.status === 'in_progress' || r.status === 'completed') {
        var date = r.date_started || r.date_reported;
        if (date) {
          if (!vehicleRepairDays[r.car_id]) vehicleRepairDays[r.car_id] = {};
          vehicleRepairDays[r.car_id][date] = true;
        }
      }
    }
    
    stats.vehicles_used = Object.keys(vehicleUsageDays).length;
    stats.vehicles_used_percent = vehicles.length > 0 ? (stats.vehicles_used / vehicles.length * 100).toFixed(2) : 0;
    stats.avg_usage_days_per_vehicle = stats.vehicles_used > 0 ? (stats.total_usage_days / stats.vehicles_used).toFixed(2) : 0;
    
    var totalPossibleDays = vehicles.length * totalDays;
    var totalRepairDays = 0;
    for (var carId in vehicleRepairDays) {
      totalRepairDays += Object.keys(vehicleRepairDays[carId]).length;
    }
    stats.availability_rate = totalPossibleDays > 0 ? (((totalPossibleDays - totalRepairDays) / totalPossibleDays) * 100).toFixed(2) : 100;
    
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      var usageDays = vehicleUsageDays[v.car_id] ? Object.keys(vehicleUsageDays[v.car_id]).length : 0;
      var repairDays = vehicleRepairDays[v.car_id] ? Object.keys(vehicleRepairDays[v.car_id]).length : 0;
      stats.by_vehicle[v.car_id] = {
        car_id: v.car_id,
        license_plate: v.license_plate,
        usage_days: usageDays,
        usage_days_percent: totalDays > 0 ? (usageDays / totalDays * 100).toFixed(2) : 0,
        repair_days: repairDays,
        availability_rate: totalDays > 0 ? (((totalDays - repairDays) / totalDays) * 100).toFixed(2) : 100
      };
    }
    
    return stats;
  } catch (e) {
    Logger.log('getVehicleUsageStats error: ' + e.toString());
    return { total_vehicles: 0, vehicles_used: 0, vehicles_used_percent: 0 };
  }
}

/**
 * สถิติการซ่อม (ตัวเลข + %)
 */
function getRepairStats(dateFrom, dateTo) {
  try {
    var repairResult = getRepairLogs({ date_from: dateFrom, date_to: dateTo });
    var repairs = repairResult.success ? repairResult.data.repair_logs : [];
    var vehiclesResult = getVehicles({ active: true });
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    
    var stats = {
      total_repairs: repairs.length,
      emergency_repairs: 0,
      emergency_repairs_percent: 0,
      completed_repairs: 0,
      completed_repairs_percent: 0,
      total_cost: 0,
      avg_cost_per_repair: 0,
      vehicles_with_repairs: 0,
      vehicles_with_repairs_percent: 0,
      by_vehicle: {}
    };
    
    var vehicleRepairs = {};
    var vehicleCosts = {};
    
    for (var i = 0; i < repairs.length; i++) {
      var r = repairs[i];
      var cost = parseFloat(r.cost || 0);
      stats.total_cost += cost;
      
      if (r.priority === 'emergency' || r.priority === 'urgent') stats.emergency_repairs++;
      if (r.status === 'completed') stats.completed_repairs++;
      
      if (!vehicleRepairs[r.car_id]) {
        vehicleRepairs[r.car_id] = 0;
        vehicleCosts[r.car_id] = 0;
      }
      vehicleRepairs[r.car_id]++;
      vehicleCosts[r.car_id] += cost;
    }
    
    stats.emergency_repairs_percent = repairs.length > 0 ? (stats.emergency_repairs / repairs.length * 100).toFixed(2) : 0;
    stats.completed_repairs_percent = repairs.length > 0 ? (stats.completed_repairs / repairs.length * 100).toFixed(2) : 0;
    stats.avg_cost_per_repair = repairs.length > 0 ? (stats.total_cost / repairs.length).toFixed(2) : 0;
    stats.vehicles_with_repairs = Object.keys(vehicleRepairs).length;
    stats.vehicles_with_repairs_percent = vehicles.length > 0 ? (stats.vehicles_with_repairs / vehicles.length * 100).toFixed(2) : 0;
    
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      var count = vehicleRepairs[v.car_id] || 0;
      var cost = vehicleCosts[v.car_id] || 0;
      stats.by_vehicle[v.car_id] = {
        car_id: v.car_id,
        license_plate: v.license_plate,
        repair_count: count,
        total_cost: cost,
        avg_cost: count > 0 ? (cost / count).toFixed(2) : 0
      };
    }
    
    return stats;
  } catch (e) {
    Logger.log('getRepairStats error: ' + e.toString());
    return { total_repairs: 0, emergency_repairs: 0, emergency_repairs_percent: 0 };
  }
}

/**
 * สถิติการเติมน้ำมัน (ตัวเลข + %)
 */
function getFuelStats(dateFrom, dateTo) {
  try {
    var fuelResult = getFuelLogs({ date_from: dateFrom, date_to: dateTo });
    var fuelLogs = fuelResult.success ? fuelResult.data.fuel_logs : [];
    var vehiclesResult = getVehicles({ active: true });
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    
    var stats = {
      total_refills: fuelLogs.length,
      total_liters: 0,
      total_amount: 0,
      avg_price_per_liter: 0,
      vehicles_refueled: 0,
      vehicles_refueled_percent: 0,
      by_vehicle: {}
    };
    
    var vehicleRefills = {};
    var vehicleLiters = {};
    var vehicleAmount = {};
    
    for (var i = 0; i < fuelLogs.length; i++) {
      var f = fuelLogs[i];
      var liters = parseFloat(f.liters || 0);
      var amount = parseFloat(f.amount || 0);
      stats.total_liters += liters;
      stats.total_amount += amount;
      
      if (!vehicleRefills[f.car_id]) {
        vehicleRefills[f.car_id] = 0;
        vehicleLiters[f.car_id] = 0;
        vehicleAmount[f.car_id] = 0;
      }
      vehicleRefills[f.car_id]++;
      vehicleLiters[f.car_id] += liters;
      vehicleAmount[f.car_id] += amount;
    }
    
    stats.avg_price_per_liter = stats.total_liters > 0 ? (stats.total_amount / stats.total_liters).toFixed(2) : 0;
    stats.vehicles_refueled = Object.keys(vehicleRefills).length;
    stats.vehicles_refueled_percent = vehicles.length > 0 ? (stats.vehicles_refueled / vehicles.length * 100).toFixed(2) : 0;
    
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      stats.by_vehicle[v.car_id] = {
        car_id: v.car_id,
        license_plate: v.license_plate,
        refill_count: vehicleRefills[v.car_id] || 0,
        total_liters: vehicleLiters[v.car_id] || 0,
        total_amount: vehicleAmount[v.car_id] || 0
      };
    }
    
    return stats;
  } catch (e) {
    Logger.log('getFuelStats error: ' + e.toString());
    return { total_refills: 0, total_liters: 0, total_amount: 0 };
  }
}

/**
 * สถิติอัตราสิ้นเปลือง (ตัวเลข + %)
 */
function getFuelConsumptionStats(dateFrom, dateTo) {
  try {
    var fuelResult = getFuelLogs({ date_from: dateFrom, date_to: dateTo });
    var fuelLogs = fuelResult.success ? fuelResult.data.fuel_logs : [];
    var usageResult = getUsageRecordsRaw({ date_from: dateFrom, date_to: dateTo });
    var usageRecords = usageResult.success ? usageResult.data.records : [];
    
    var stats = {
      total_distance: 0,
      total_liters: 0,
      overall_km_per_liter: 0,
      vehicles_analyzed: 0,
      vehicles_analyzed_percent: 0,
      by_vehicle: {}
    };
    
    var vehicleDistance = {};
    var vehicleLiters = {};
    
    for (var i = 0; i < fuelLogs.length; i++) {
      var f = fuelLogs[i];
      var liters = parseFloat(f.liters || 0);
      stats.total_liters += liters;
      if (!vehicleLiters[f.car_id]) vehicleLiters[f.car_id] = 0;
      vehicleLiters[f.car_id] += liters;
    }
    
    for (var i = 0; i < usageRecords.length; i++) {
      var u = usageRecords[i];
      if (u.record_type === 'after_trip' && u.mileage) {
        var beforeTrip = findBeforeTrip(usageRecords, u.car_id, u.driver_id, u.datetime);
        if (beforeTrip && beforeTrip.mileage) {
          var dist = parseFloat(u.mileage) - parseFloat(beforeTrip.mileage);
          if (!vehicleDistance[u.car_id]) vehicleDistance[u.car_id] = 0;
          vehicleDistance[u.car_id] += dist;
          stats.total_distance += dist;
        }
      }
    }
    
    stats.overall_km_per_liter = stats.total_liters > 0 ? (stats.total_distance / stats.total_liters).toFixed(2) : 0;
    stats.vehicles_analyzed = Object.keys(vehicleDistance).length;
    
    var vehiclesResult = getVehicles({ active: true });
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    stats.vehicles_analyzed_percent = vehicles.length > 0 ? (stats.vehicles_analyzed / vehicles.length * 100).toFixed(2) : 0;
    
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      var dist = vehicleDistance[v.car_id] || 0;
      var liters = vehicleLiters[v.car_id] || 0;
      var kmPerLiter = liters > 0 ? (dist / liters).toFixed(2) : 0;
      stats.by_vehicle[v.car_id] = {
        car_id: v.car_id,
        license_plate: v.license_plate,
        total_distance: dist,
        total_liters: liters,
        km_per_liter: kmPerLiter
      };
    }
    
    return stats;
  } catch (e) {
    Logger.log('getFuelConsumptionStats error: ' + e.toString());
    return { total_distance: 0, total_liters: 0, overall_km_per_liter: 0 };
  }
}

/**
 * สถิติความเสี่ยง (ตัวเลข + %)
 */
function getRiskAnalysisStats(dateFrom, dateTo) {
  try {
    var alertsResult = typeof getInspectionAlerts === 'function' ? getInspectionAlerts({ date_from: dateFrom, date_to: dateTo }) : { success: false };
    var alerts = alertsResult.success && alertsResult.data.alerts ? alertsResult.data.alerts : [];
    var vehiclesResult = getVehicles({ active: true });
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    
    var stats = {
      total_alerts: alerts.length,
      critical_alerts: 0,
      critical_alerts_percent: 0,
      risk_alerts: 0,
      risk_alerts_percent: 0,
      warning_alerts: 0,
      warning_alerts_percent: 0,
      vehicles_with_alerts: 0,
      vehicles_with_alerts_percent: 0,
      by_vehicle: {}
    };
    
    var vehicleAlerts = {};
    
    for (var i = 0; i < alerts.length; i++) {
      var a = alerts[i];
      if (a.risk_level === 'critical') stats.critical_alerts++;
      else if (a.risk_level === 'risk') stats.risk_alerts++;
      else if (a.risk_level === 'warning') stats.warning_alerts++;
      
      if (!vehicleAlerts[a.car_id]) vehicleAlerts[a.car_id] = { critical: 0, risk: 0, warning: 0 };
      vehicleAlerts[a.car_id][a.risk_level]++;
    }
    
    stats.critical_alerts_percent = alerts.length > 0 ? (stats.critical_alerts / alerts.length * 100).toFixed(2) : 0;
    stats.risk_alerts_percent = alerts.length > 0 ? (stats.risk_alerts / alerts.length * 100).toFixed(2) : 0;
    stats.warning_alerts_percent = alerts.length > 0 ? (stats.warning_alerts / alerts.length * 100).toFixed(2) : 0;
    stats.vehicles_with_alerts = Object.keys(vehicleAlerts).length;
    stats.vehicles_with_alerts_percent = vehicles.length > 0 ? (stats.vehicles_with_alerts / vehicles.length * 100).toFixed(2) : 0;
    
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      var al = vehicleAlerts[v.car_id] || { critical: 0, risk: 0, warning: 0 };
      stats.by_vehicle[v.car_id] = {
        car_id: v.car_id,
        license_plate: v.license_plate,
        critical_count: al.critical,
        risk_count: al.risk,
        warning_count: al.warning,
        total_alerts: al.critical + al.risk + al.warning
      };
    }
    
    return stats;
  } catch (e) {
    Logger.log('getRiskAnalysisStats error: ' + e.toString());
    return { total_alerts: 0, critical_alerts: 0, critical_alerts_percent: 0 };
  }
}

/**
 * สถิติความคุ้มค่า (ตัวเลข + %)
 */
function getCostEfficiencyStats(dateFrom, dateTo) {
  try {
    var fuelResult = getFuelLogs({ date_from: dateFrom, date_to: dateTo });
    var fuelLogs = fuelResult.success ? fuelResult.data.fuel_logs : [];
    var repairResult = getRepairLogs({ date_from: dateFrom, date_to: dateTo });
    var repairs = repairResult.success ? repairResult.data.repair_logs : [];
    var vehiclesResult = getVehicles({ active: true });
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    var usageResult = getUsageRecordsRaw({ date_from: dateFrom, date_to: dateTo });
    var usageRecords = usageResult.success ? usageResult.data.records : [];
    
    var stats = {
      total_cost: 0,
      fuel_cost: 0,
      repair_cost: 0,
      total_distance: 0,
      cost_per_km: 0,
      cost_per_vehicle: 0,
      by_vehicle: {}
    };
    
    for (var i = 0; i < fuelLogs.length; i++) {
      stats.fuel_cost += parseFloat(fuelLogs[i].amount || 0);
    }
    for (var i = 0; i < repairs.length; i++) {
      stats.repair_cost += parseFloat(repairs[i].cost || 0);
    }
    stats.total_cost = stats.fuel_cost + stats.repair_cost;
    
    for (var i = 0; i < usageRecords.length; i++) {
      var u = usageRecords[i];
      if (u.record_type === 'after_trip' && u.mileage) {
        var beforeTrip = findBeforeTrip(usageRecords, u.car_id, u.driver_id, u.datetime);
        if (beforeTrip && beforeTrip.mileage) {
          var dist = parseFloat(u.mileage) - parseFloat(beforeTrip.mileage);
          stats.total_distance += dist;
        }
      }
    }
    
    stats.cost_per_km = stats.total_distance > 0 ? (stats.total_cost / stats.total_distance).toFixed(2) : 0;
    stats.cost_per_vehicle = vehicles.length > 0 ? (stats.total_cost / vehicles.length).toFixed(2) : 0;
    
    var vehicleFuelCost = {};
    var vehicleRepairCost = {};
    var vehicleDistance = {};
    
    for (var i = 0; i < fuelLogs.length; i++) {
      var f = fuelLogs[i];
      if (!vehicleFuelCost[f.car_id]) vehicleFuelCost[f.car_id] = 0;
      vehicleFuelCost[f.car_id] += parseFloat(f.amount || 0);
    }
    for (var i = 0; i < repairs.length; i++) {
      var r = repairs[i];
      if (!vehicleRepairCost[r.car_id]) vehicleRepairCost[r.car_id] = 0;
      vehicleRepairCost[r.car_id] += parseFloat(r.cost || 0);
    }
    for (var i = 0; i < usageRecords.length; i++) {
      var u = usageRecords[i];
      if (u.record_type === 'after_trip' && u.mileage) {
        var beforeTrip = findBeforeTrip(usageRecords, u.car_id, u.driver_id, u.datetime);
        if (beforeTrip && beforeTrip.mileage) {
          var dist = parseFloat(u.mileage) - parseFloat(beforeTrip.mileage);
          if (!vehicleDistance[u.car_id]) vehicleDistance[u.car_id] = 0;
          vehicleDistance[u.car_id] += dist;
        }
      }
    }
    
    for (var i = 0; i < vehicles.length; i++) {
      var v = vehicles[i];
      var fuel = vehicleFuelCost[v.car_id] || 0;
      var repair = vehicleRepairCost[v.car_id] || 0;
      var dist = vehicleDistance[v.car_id] || 0;
      var total = fuel + repair;
      var costPerKm = dist > 0 ? (total / dist).toFixed(2) : 0;
      stats.by_vehicle[v.car_id] = {
        car_id: v.car_id,
        license_plate: v.license_plate,
        fuel_cost: fuel,
        repair_cost: repair,
        total_cost: total,
        total_distance: dist,
        cost_per_km: costPerKm
      };
    }
    
    return stats;
  } catch (e) {
    Logger.log('getCostEfficiencyStats error: ' + e.toString());
    return { total_cost: 0, cost_per_km: 0, cost_per_vehicle: 0 };
  }
}

function findBeforeTrip(records, carId, driverId, afterDatetime) {
  var afterDate = afterDatetime.split(' ')[0];
  for (var i = 0; i < records.length; i++) {
    if (records[i].car_id === carId && records[i].driver_id === driverId && 
        records[i].record_type === 'before_trip' && records[i].datetime.split(' ')[0] === afterDate) {
      return records[i];
    }
  }
  return null;
}

function calculateHours(startTime, endTime) {
  try {
    var start = startTime.split(':');
    var end = endTime.split(':');
    if (start.length === 2 && end.length === 2) {
      var startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
      var endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
      var hours = (endMin - startMin) / 60;
      return hours < 0 ? hours + 24 : hours;
    }
  } catch (e) {}
  return 0;
}
