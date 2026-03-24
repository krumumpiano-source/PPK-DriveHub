/**
 * PPK DriveHub Fuel Report Service
 * รายงานการใช้น้ำมันตามระเบียบ
 * 
 * อ้างอิง:
 * - ระเบียบกระทรวงศึกษาธิการว่าด้วยการเงิน การคลัง และการพัสดุของสถานศึกษา พ.ศ. 2562
 * - หมวด 5 ข้อ 65 วรรคหนึ่ง: ต้องจัดทำรายงานสรุปพัสดุสิ้นเปลืองที่ใช้งาน
 * - ข้อ 66 (3): ต้องเปรียบเทียบข้อมูลน้ำมันที่ใช้กับงบประมาณที่ได้รับ
 */

/**
 * Generate Monthly Fuel Report
 * รายงานสรุปการใช้น้ำมันประจำเดือน
 */
function generateMonthlyFuelReport(month, year) {
  try {
    month = parseInt(month) || new Date().getMonth() + 1;
    year = parseInt(year) || new Date().getFullYear();
    
    var startDate = year + '-' + String(month).padStart(2, '0') + '-01';
    var endDate = year + '-' + String(month).padStart(2, '0') + '-' + 
                  new Date(year, month, 0).getDate();
    
    // Get fuel logs for the month
    var fuelLogsResult = getFuelLogs({
      date_from: startDate,
      date_to: endDate
    });
    
    if (!fuelLogsResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลได้', 'FETCH_ERROR');
    }
    
    var fuelLogs = fuelLogsResult.data.fuel_logs || [];
    
    // Group by vehicle
    var byVehicle = {};
    var totalLiters = 0;
    var totalAmount = 0;
    
    fuelLogs.forEach(function(log) {
      var carId = log.car_id;
      if (!byVehicle[carId]) {
        byVehicle[carId] = {
          car_id: carId,
          fuel_logs: [],
          total_liters: 0,
          total_amount: 0,
          fuel_types: {}
        };
      }
      
      byVehicle[carId].fuel_logs.push(log);
      byVehicle[carId].total_liters += parseFloat(log.liters || 0);
      byVehicle[carId].total_amount += parseFloat(log.amount || 0);
      
      var fuelType = log.fuel_type || 'unknown';
      if (!byVehicle[carId].fuel_types[fuelType]) {
        byVehicle[carId].fuel_types[fuelType] = {
          liters: 0,
          amount: 0
        };
      }
      byVehicle[carId].fuel_types[fuelType].liters += parseFloat(log.liters || 0);
      byVehicle[carId].fuel_types[fuelType].amount += parseFloat(log.amount || 0);
      
      totalLiters += parseFloat(log.liters || 0);
      totalAmount += parseFloat(log.amount || 0);
    });
    
    // Get vehicle info
    var vehiclesResult = getVehicles({});
    var vehicles = vehiclesResult.success ? vehiclesResult.data.vehicles : [];
    var vehicleMap = {};
    vehicles.forEach(function(v) {
      vehicleMap[v.car_id] = v;
    });
    
    // Build report data
    var vehicleReports = [];
    for (var carId in byVehicle) {
      var vehicle = vehicleMap[carId] || {};
      var vehicleData = byVehicle[carId];
      
      vehicleReports.push({
        car_id: carId,
        license_plate: vehicle.license_plate || '',
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        total_liters: Math.round(vehicleData.total_liters * 100) / 100,
        total_amount: Math.round(vehicleData.total_amount * 100) / 100,
        fuel_types: vehicleData.fuel_types,
        fill_count: vehicleData.fuel_logs.length
      });
    }
    
    // Sort by total amount (descending)
    vehicleReports.sort(function(a, b) {
      return b.total_amount - a.total_amount;
    });
    
    return successResponse({
      period: {
        month: month,
        year: year,
        date_from: startDate,
        date_to: endDate
      },
      summary: {
        total_liters: Math.round(totalLiters * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        total_vehicles: vehicleReports.length,
        total_fills: fuelLogs.length
      },
      by_vehicle: vehicleReports
    });
    
  } catch (error) {
    Logger.log('Generate monthly fuel report error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการสร้างรายงาน: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Generate Annual Fuel Report
 * รายงานสรุปการใช้น้ำมันประจำปี
 */
function generateAnnualFuelReport(year) {
  try {
    year = parseInt(year) || new Date().getFullYear();
    
    var startDate = year + '-01-01';
    var endDate = year + '-12-31';
    
    // Get fuel logs for the year
    var fuelLogsResult = getFuelLogs({
      date_from: startDate,
      date_to: endDate
    });
    
    if (!fuelLogsResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลได้', 'FETCH_ERROR');
    }
    
    var fuelLogs = fuelLogsResult.data.fuel_logs || [];
    
    // Group by month
    var byMonth = {};
    var totalLiters = 0;
    var totalAmount = 0;
    
    fuelLogs.forEach(function(log) {
      var month = parseInt(log.date.split('-')[1]);
      if (!byMonth[month]) {
        byMonth[month] = {
          month: month,
          fuel_logs: [],
          total_liters: 0,
          total_amount: 0
        };
      }
      
      byMonth[month].fuel_logs.push(log);
      byMonth[month].total_liters += parseFloat(log.liters || 0);
      byMonth[month].total_amount += parseFloat(log.amount || 0);
      
      totalLiters += parseFloat(log.liters || 0);
      totalAmount += parseFloat(log.amount || 0);
    });
    
    // Build monthly summary
    var monthlySummary = [];
    for (var m = 1; m <= 12; m++) {
      if (byMonth[m]) {
        monthlySummary.push({
          month: m,
          month_name: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][m - 1],
          total_liters: Math.round(byMonth[m].total_liters * 100) / 100,
          total_amount: Math.round(byMonth[m].total_amount * 100) / 100,
          fill_count: byMonth[m].fuel_logs.length
        });
      } else {
        monthlySummary.push({
          month: m,
          month_name: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][m - 1],
          total_liters: 0,
          total_amount: 0,
          fill_count: 0
        });
      }
    }
    
    return successResponse({
      period: {
        year: year,
        date_from: startDate,
        date_to: endDate
      },
      summary: {
        total_liters: Math.round(totalLiters * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        total_fills: fuelLogs.length,
        average_per_month: {
          liters: Math.round((totalLiters / 12) * 100) / 100,
          amount: Math.round((totalAmount / 12) * 100) / 100
        }
      },
      by_month: monthlySummary
    });
    
  } catch (error) {
    Logger.log('Generate annual fuel report error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการสร้างรายงาน: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Compare Fuel Usage with Budget
 * เปรียบเทียบการใช้น้ำมันกับงบประมาณ
 */
function compareFuelUsageWithBudget(period) {
  try {
    period = period || {};
    var startDate = period.date_from || (function() {
      var d = new Date();
      d.setMonth(d.getMonth() - 1);
      return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    })();
    var endDate = period.date_to || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var budget = parseFloat(period.budget || 0);
    
    // Get fuel logs
    var fuelLogsResult = getFuelLogs({
      date_from: startDate,
      date_to: endDate
    });
    
    if (!fuelLogsResult.success) {
      return errorResponse('ไม่สามารถดึงข้อมูลได้', 'FETCH_ERROR');
    }
    
    var fuelLogs = fuelLogsResult.data.fuel_logs || [];
    
    var totalAmount = 0;
    fuelLogs.forEach(function(log) {
      totalAmount += parseFloat(log.amount || 0);
    });
    
    var budgetUsed = Math.round(totalAmount * 100) / 100;
    var budgetRemaining = budget > 0 ? Math.round((budget - budgetUsed) * 100) / 100 : null;
    var budgetUsagePercent = budget > 0 ? Math.round((budgetUsed / budget) * 100 * 100) / 100 : null;
    
    return successResponse({
      period: { date_from: startDate, date_to: endDate },
      budget: budget,
      used: budgetUsed,
      remaining: budgetRemaining,
      usage_percent: budgetUsagePercent,
      status: budget > 0 ? 
        (budgetUsagePercent > 100 ? 'over_budget' : 
         budgetUsagePercent > 80 ? 'warning' : 'normal') : null
    });
    
  } catch (error) {
    Logger.log('Compare fuel usage with budget error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการเปรียบเทียบ: ' + error.toString(), 'SERVER_ERROR');
  }
}
