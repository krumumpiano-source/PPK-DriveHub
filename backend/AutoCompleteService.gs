/**
 * PPK DriveHub Auto-Complete Service
 * ระบบจดจำการพิมพ์ (Auto-complete)
 * 
 * รองรับ:
 * - ชื่อพนักงานขับรถ
 * - ทะเบียนรถ
 * - ผู้ขอใช้รถ
 * - สถานที่ไป
 */

/**
 * Search Drivers by Name
 * ค้นหาชื่อพนักงานขับรถ (Auto-complete)
 */
function searchDriversByName(query) {
  try {
    query = (query || '').toLowerCase().trim();
    
    if (query.length < 1) {
      return successResponse({ results: [] });
    }
    
    var driversResult = getDrivers({ status: 'active' });
    if (!driversResult.success) {
      return successResponse({ results: [] });
    }
    
    var drivers = driversResult.data.drivers || [];
    var results = [];
    
    for (var i = 0; i < drivers.length; i++) {
      var driver = drivers[i];
      var fullName = (driver.full_name || '').toLowerCase();
      
      if (fullName.indexOf(query) !== -1) {
        results.push({
          driver_id: driver.driver_id,
          full_name: driver.full_name,
          phone: driver.phone,
          display: driver.full_name + (driver.phone ? ' (' + driver.phone + ')' : '')
        });
      }
    }
    
    // Sort by relevance (exact match first)
    results.sort(function(a, b) {
      var aStarts = a.full_name.toLowerCase().indexOf(query) === 0;
      var bStarts = b.full_name.toLowerCase().indexOf(query) === 0;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.full_name.localeCompare(b.full_name);
    });
    
    return successResponse({
      query: query,
      results: results.slice(0, 10) // Limit to 10 results
    });
    
  } catch (error) {
    Logger.log('Search drivers by name error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการค้นหา: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Search Vehicles by License Plate
 * ค้นหาทะเบียนรถ (Auto-complete)
 */
function searchVehiclesByLicensePlate(query) {
  try {
    query = (query || '').toLowerCase().trim();
    
    if (query.length < 1) {
      return successResponse({ results: [] });
    }
    
    var vehiclesResult = getVehicles({ active: true });
    if (!vehiclesResult.success) {
      return successResponse({ results: [] });
    }
    
    var vehicles = vehiclesResult.data.vehicles || [];
    var results = [];
    
    for (var i = 0; i < vehicles.length; i++) {
      var vehicle = vehicles[i];
      var licensePlate = (vehicle.license_plate || '').toLowerCase();
      
      if (licensePlate.indexOf(query) !== -1) {
        results.push({
          car_id: vehicle.car_id,
          license_plate: vehicle.license_plate,
          brand: vehicle.brand,
          model: vehicle.model,
          display: vehicle.license_plate + ' - ' + vehicle.brand + ' ' + vehicle.model
        });
      }
    }
    
    // Sort by relevance
    results.sort(function(a, b) {
      var aStarts = a.license_plate.toLowerCase().indexOf(query) === 0;
      var bStarts = b.license_plate.toLowerCase().indexOf(query) === 0;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.license_plate.localeCompare(b.license_plate);
    });
    
    return successResponse({
      query: query,
      results: results.slice(0, 10) // Limit to 10 results
    });
    
  } catch (error) {
    Logger.log('Search vehicles by license plate error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการค้นหา: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Search Requested By (from Usage Records)
 * ค้นหาผู้ขอใช้รถ (Auto-complete)
 */
function searchRequestedBy(query) {
  try {
    query = (query || '').toLowerCase().trim();
    
    if (query.length < 1) {
      return successResponse({ results: [] });
    }
    
    var usageRecordsResult = getUsageRecordsRaw({ limit: 1000 });
    if (!usageRecordsResult.success) {
      return successResponse({ results: [] });
    }
    
    var records = usageRecordsResult.data.records || [];
    var uniqueNames = {};
    
    for (var i = 0; i < records.length; i++) {
      var requestedBy = (records[i].requested_by || '').trim();
      if (requestedBy && requestedBy.toLowerCase().indexOf(query) !== -1) {
        if (!uniqueNames[requestedBy]) {
          uniqueNames[requestedBy] = true;
        }
      }
    }
    
    var results = Object.keys(uniqueNames).map(function(name) {
      return { name: name, display: name };
    });
    
    // Sort alphabetically
    results.sort(function(a, b) {
      var aStarts = a.name.toLowerCase().indexOf(query) === 0;
      var bStarts = b.name.toLowerCase().indexOf(query) === 0;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.localeCompare(b.name);
    });
    
    return successResponse({
      query: query,
      results: results.slice(0, 10) // Limit to 10 results
    });
    
  } catch (error) {
    Logger.log('Search requested by error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการค้นหา: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Search Destinations (from Usage Records)
 * ค้นหาสถานที่ไป (Auto-complete)
 */
function searchDestinations(query) {
  try {
    query = (query || '').toLowerCase().trim();
    
    if (query.length < 1) {
      return successResponse({ results: [] });
    }
    
    var usageRecordsResult = getUsageRecordsRaw({ limit: 1000 });
    if (!usageRecordsResult.success) {
      return successResponse({ results: [] });
    }
    
    var records = usageRecordsResult.data.records || [];
    var uniqueDestinations = {};
    
    for (var i = 0; i < records.length; i++) {
      var destination = (records[i].destination || '').trim();
      if (destination && destination.toLowerCase().indexOf(query) !== -1) {
        if (!uniqueDestinations[destination]) {
          uniqueDestinations[destination] = true;
        }
      }
    }
    
    var results = Object.keys(uniqueDestinations).map(function(dest) {
      return { destination: dest, display: dest };
    });
    
    // Sort alphabetically
    results.sort(function(a, b) {
      var aStarts = a.destination.toLowerCase().indexOf(query) === 0;
      var bStarts = b.destination.toLowerCase().indexOf(query) === 0;
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.destination.localeCompare(b.destination);
    });
    
    return successResponse({
      query: query,
      results: results.slice(0, 10) // Limit to 10 results
    });
    
  } catch (error) {
    Logger.log('Search destinations error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการค้นหา: ' + error.toString(), 'SERVER_ERROR');
  }
}
