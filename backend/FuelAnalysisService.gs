/**
 * PPK DriveHub Fuel Analysis Service
 * วิเคราะห์และป้องกันความผิดปกติในการใช้น้ำมัน
 * 
 * MODULE F5: วิเคราะห์ & ป้องกันความผิดปกติ
 * ตรงบทบาทกลุ่มงานยานพาหนะ
 */

/**
 * Analyze Fuel Consumption Anomalies
 * วิเคราะห์อัตราการสิ้นเปลืองน้ำมันที่ผิดปกติ
 */
function analyzeFuelConsumptionAnomalies(filters) {
  try {
    filters = filters || {};
    var carId = filters.car_id;
    var dateFrom = filters.date_from || (function() {
      var d = new Date();
      d.setMonth(d.getMonth() - 3);
      return formatDate(d);
    })();
    var dateTo = filters.date_to || formatDate(new Date());
    
    // Get fuel logs
    var fuelLogsResult = getFuelLogs({
      car_id: carId,
      date_from: dateFrom,
      date_to: dateTo
    });
    
    if (!fuelLogsResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลได้', 'FETCH_ERROR');
    }
    
    var fuelLogs = fuelLogsResult.data.fuel_logs || [];
    
    if (fuelLogs.length === 0) {
      return successResponse({
        anomalies: [],
        summary: {
          total_records: 0,
          message: 'ไม่มีข้อมูลการเติมน้ำมันในช่วงเวลานี้'
        }
      });
    }
    
    // Calculate average consumption rate per vehicle
    var vehicleStats = {};
    fuelLogs.forEach(function(log) {
      var vid = log.car_id;
      if (!vehicleStats[vid]) {
        vehicleStats[vid] = {
          car_id: vid,
          fuel_logs: [],
          total_distance: 0,
          total_liters: 0,
          consumption_rates: []
        };
      }
      
      vehicleStats[vid].fuel_logs.push(log);
      
      if (log.mileage_before && log.mileage_after && log.liters) {
        var distance = parseFloat(log.mileage_after) - parseFloat(log.mileage_before);
        var liters = parseFloat(log.liters);
        
        if (distance > 0 && liters > 0) {
          vehicleStats[vid].total_distance += distance;
          vehicleStats[vid].total_liters += liters;
          var rate = distance / liters;
          vehicleStats[vid].consumption_rates.push(rate);
        }
      }
    });
    
    // Calculate averages and detect anomalies
    var anomalies = [];
    var vehicleList = [];
    
    for (var vid in vehicleStats) {
      var stats = vehicleStats[vid];
      var avgConsumptionRate = stats.total_liters > 0 ? 
        stats.total_distance / stats.total_liters : 0;
      
      // Calculate standard deviation
      var rates = stats.consumption_rates;
      var mean = rates.length > 0 ? 
        rates.reduce(function(a, b) { return a + b; }, 0) / rates.length : 0;
      var variance = rates.length > 0 ?
        rates.reduce(function(sum, rate) {
          return sum + Math.pow(rate - mean, 2);
        }, 0) / rates.length : 0;
      var stdDev = Math.sqrt(variance);
      
      // Detect anomalies (more than 2 standard deviations from mean)
      var anomalyFlags = [];
      rates.forEach(function(rate, index) {
        if (Math.abs(rate - mean) > 2 * stdDev && stdDev > 0) {
          anomalyFlags.push({
            index: index,
            rate: rate,
            deviation: Math.abs(rate - mean) / stdDev
          });
        }
      });
      
      vehicleList.push({
        car_id: vid,
        total_fills: stats.fuel_logs.length,
        total_distance: Math.round(stats.total_distance),
        total_liters: Math.round(stats.total_liters * 100) / 100,
        average_consumption_rate: Math.round(avgConsumptionRate * 100) / 100,
        mean_rate: Math.round(mean * 100) / 100,
        std_deviation: Math.round(stdDev * 100) / 100,
        anomaly_count: anomalyFlags.length,
        anomalies: anomalyFlags
      });
      
      if (anomalyFlags.length > 0) {
        anomalies.push({
          car_id: vid,
          type: 'consumption_anomaly',
          severity: anomalyFlags.length > stats.fuel_logs.length * 0.3 ? 'high' : 'medium',
          message: 'พบอัตราการสิ้นเปลืองน้ำมันผิดปกติ ' + anomalyFlags.length + ' ครั้ง',
          details: anomalyFlags
        });
      }
    }
    
    return successResponse({
      period: { date_from: dateFrom, date_to: dateTo },
      vehicle_statistics: vehicleList,
      anomalies: anomalies,
      summary: {
        total_records: fuelLogs.length,
        total_vehicles: vehicleList.length,
        vehicles_with_anomalies: anomalies.length
      }
    });
    
  } catch (error) {
    Logger.log('Analyze fuel consumption anomalies error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการวิเคราะห์: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Detect Frequent Filling Anomalies
 * ตรวจสอบการเติมน้ำมันที่ถี่ผิดปกติ
 */
function detectFrequentFillingAnomalies(filters) {
  try {
    filters = filters || {};
    var carId = filters.car_id;
    var dateFrom = filters.date_from || (function() {
      var d = new Date();
      d.setMonth(d.getMonth() - 1);
      return formatDate(d);
    })();
    var dateTo = filters.date_to || formatDate(new Date());
    
    // Get fuel logs
    var fuelLogsResult = getFuelLogs({
      car_id: carId,
      date_from: dateFrom,
      date_to: dateTo,
      approval_status: 'approved'
    });
    
    if (!fuelLogsResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลได้', 'FETCH_ERROR');
    }
    
    var fuelLogs = fuelLogsResult.data.fuel_logs || [];
    
    // Group by vehicle and analyze filling frequency
    var vehicleFills = {};
    fuelLogs.forEach(function(log) {
      var vid = log.car_id;
      if (!vehicleFills[vid]) {
        vehicleFills[vid] = [];
      }
      vehicleFills[vid].push({
        date: log.date,
        liters: parseFloat(log.liters || 0),
        mileage_before: parseFloat(log.mileage_before || 0),
        mileage_after: parseFloat(log.mileage_after || 0)
      });
    });
    
    var anomalies = [];
    
    for (var vid in vehicleFills) {
      var fills = vehicleFills[vid];
      fills.sort(function(a, b) {
        return a.date.localeCompare(b.date);
      });
      
      // Check for fills within short time periods
      for (var i = 1; i < fills.length; i++) {
        var prevFill = fills[i - 1];
        var currFill = fills[i];
        
        var prevDate = new Date(prevFill.date);
        var currDate = new Date(currFill.date);
        var daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        
        // Check if filled too frequently (less than 3 days apart)
        if (daysDiff < 3) {
          var distance = currFill.mileage_before - prevFill.mileage_after;
          
          // If distance is very small, it's suspicious
          if (distance < 100) {
            anomalies.push({
              car_id: vid,
              type: 'frequent_filling',
              severity: 'high',
              message: 'เติมน้ำมันถี่ผิดปกติ: เติมอีกครั้งภายใน ' + Math.round(daysDiff * 10) / 10 + ' วัน แต่ขับรถเพียง ' + distance + ' กม.',
              fill_date: currFill.date,
              previous_fill_date: prevFill.date,
              days_between: Math.round(daysDiff * 10) / 10,
              distance_between: distance
            });
          }
        }
      }
      
      // Check total fills per month
      var fillsThisMonth = fills.filter(function(f) {
        var fillDate = new Date(f.date);
        var now = new Date();
        return fillDate.getMonth() === now.getMonth() && 
               fillDate.getFullYear() === now.getFullYear();
      }).length;
      
      if (fillsThisMonth > 10) {
        anomalies.push({
          car_id: vid,
          type: 'excessive_fills',
          severity: 'medium',
          message: 'เติมน้ำมันมากผิดปกติ: ' + fillsThisMonth + ' ครั้งในเดือนนี้',
          fills_this_month: fillsThisMonth
        });
      }
    }
    
    return successResponse({
      period: { date_from: dateFrom, date_to: dateTo },
      anomalies: anomalies,
      summary: {
        total_anomalies: anomalies.length,
        high_severity: anomalies.filter(a => a.severity === 'high').length,
        medium_severity: anomalies.filter(a => a.severity === 'medium').length
      }
    });
    
  } catch (error) {
    Logger.log('Detect frequent filling anomalies error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการตรวจสอบ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Compare Vehicle Consumption with Average
 * เปรียบเทียบอัตราการสิ้นเปลืองกับค่าเฉลี่ยรุ่นเดียวกัน
 */
function compareVehicleConsumptionWithAverage(carId, period) {
  try {
    period = period || {};
    var dateFrom = period.date_from || (function() {
      var d = new Date();
      d.setMonth(d.getMonth() - 6);
      return formatDate(d);
    })();
    var dateTo = period.date_to || formatDate(new Date());
    
    // Get vehicle info
    var vehicleResult = getVehicleById(carId);
    if (!vehicleResult.success) {
      return errorResponse('ไม่พบข้อมูลรถ', 'VEHICLE_NOT_FOUND');
    }
    
    var vehicle = vehicleResult.data.vehicle;
    var vehicleModel = vehicle.brand + ' ' + vehicle.model;
    
    // Get fuel logs for this vehicle
    var vehicleLogsResult = getFuelLogs({
      car_id: carId,
      date_from: dateFrom,
      date_to: dateTo
    });
    
    if (!vehicleLogsResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลได้', 'FETCH_ERROR');
    }
    
    var vehicleLogs = vehicleLogsResult.data.fuel_logs || [];
    
    // Calculate vehicle's average consumption
    var totalDistance = 0;
    var totalLiters = 0;
    
    vehicleLogs.forEach(function(log) {
      if (log.mileage_before && log.mileage_after && log.liters) {
        var distance = parseFloat(log.mileage_after) - parseFloat(log.mileage_before);
        var liters = parseFloat(log.liters);
        if (distance > 0 && liters > 0) {
          totalDistance += distance;
          totalLiters += liters;
        }
      }
    });
    
    var vehicleAvgConsumption = totalLiters > 0 ? totalDistance / totalLiters : 0;
    
    // Get all vehicles of same model
    var allVehiclesResult = getVehicles({});
    if (!allVehiclesResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลรถได้', 'FETCH_ERROR');
    }
    
    var allVehicles = allVehiclesResult.data.vehicles || [];
    var sameModelVehicles = allVehicles.filter(function(v) {
      return (v.brand + ' ' + v.model) === vehicleModel && v.car_id !== carId;
    });
    
    // Calculate average consumption for same model vehicles
    var modelTotalDistance = 0;
    var modelTotalLiters = 0;
    var modelVehicleCount = 0;
    
    for (var i = 0; i < sameModelVehicles.length; i++) {
      var v = sameModelVehicles[i];
      var vLogsResult = getFuelLogs({
        car_id: v.car_id,
        date_from: dateFrom,
        date_to: dateTo
      });
      
      if (vLogsResult.success) {
        var vLogs = vLogsResult.data.fuel_logs || [];
        vLogs.forEach(function(log) {
          if (log.mileage_before && log.mileage_after && log.liters) {
            var distance = parseFloat(log.mileage_after) - parseFloat(log.mileage_before);
            var liters = parseFloat(log.liters);
            if (distance > 0 && liters > 0) {
              modelTotalDistance += distance;
              modelTotalLiters += liters;
            }
          }
        });
        if (vLogs.length > 0) {
          modelVehicleCount++;
        }
      }
    }
    
    var modelAvgConsumption = modelTotalLiters > 0 ? 
      modelTotalDistance / modelTotalLiters : 0;
    
    // Compare
    var deviation = modelAvgConsumption > 0 ? 
      ((vehicleAvgConsumption - modelAvgConsumption) / modelAvgConsumption) * 100 : 0;
    
    var status = 'normal';
    if (deviation > 20) {
      status = 'warning'; // Uses more fuel than average
    } else if (deviation < -20) {
      status = 'good'; // Uses less fuel than average
    }
    
    return successResponse({
      vehicle: {
        car_id: carId,
        license_plate: vehicle.license_plate,
        model: vehicleModel,
        average_consumption_rate: Math.round(vehicleAvgConsumption * 100) / 100,
        total_distance: Math.round(totalDistance),
        total_liters: Math.round(totalLiters * 100) / 100
      },
      model_average: {
        model: vehicleModel,
        average_consumption_rate: Math.round(modelAvgConsumption * 100) / 100,
        vehicles_compared: modelVehicleCount,
        total_distance: Math.round(modelTotalDistance),
        total_liters: Math.round(modelTotalLiters * 100) / 100
      },
      comparison: {
        deviation_percent: Math.round(deviation * 100) / 100,
        status: status,
        message: deviation > 0 ? 
          'สิ้นเปลืองน้ำมันมากกว่าค่าเฉลี่ยรุ่นเดียวกัน ' + Math.round(deviation * 10) / 10 + '%' :
          'สิ้นเปลืองน้ำมันน้อยกว่าค่าเฉลี่ยรุ่นเดียวกัน ' + Math.round(Math.abs(deviation) * 10) / 10 + '%'
      },
      period: { date_from: dateFrom, date_to: dateTo }
    });
    
  } catch (error) {
    Logger.log('Compare vehicle consumption with average error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการเปรียบเทียบ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get All Fuel Anomalies
 * ดึงความผิดปกติทั้งหมด
 */
function getAllFuelAnomalies(filters) {
  try {
    filters = filters || {};
    
    var consumptionAnomalies = analyzeFuelConsumptionAnomalies(filters);
    var frequentFillingAnomalies = detectFrequentFillingAnomalies(filters);
    
    var allAnomalies = [];
    
    if (consumptionAnomalies.success && consumptionAnomalies.data.anomalies) {
      allAnomalies = allAnomalies.concat(consumptionAnomalies.data.anomalies);
    }
    
    if (frequentFillingAnomalies.success && frequentFillingAnomalies.data.anomalies) {
      allAnomalies = allAnomalies.concat(frequentFillingAnomalies.data.anomalies);
    }
    
    // Sort by severity
    allAnomalies.sort(function(a, b) {
      var severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });
    
    return successResponse({
      anomalies: allAnomalies,
      summary: {
        total: allAnomalies.length,
        high_severity: allAnomalies.filter(a => a.severity === 'high').length,
        medium_severity: allAnomalies.filter(a => a.severity === 'medium').length,
        low_severity: allAnomalies.filter(a => a.severity === 'low').length
      },
      period: filters.date_from && filters.date_to ? {
        date_from: filters.date_from,
        date_to: filters.date_to
      } : null
    });
    
  } catch (error) {
    Logger.log('Get all fuel anomalies error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}
