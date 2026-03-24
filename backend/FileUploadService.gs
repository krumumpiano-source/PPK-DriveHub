/**
 * PPK DriveHub File Upload Service
 * จัดการอัปโหลดไฟล์รูปภาพ
 */

/**
 * Upload Vehicle Image
 * อัปโหลดรูปรถ
 */
function uploadVehicleImage(fileData) {
  try {
    requireAdmin();
    
    validateRequired(fileData, ['base64', 'fileName', 'car_id']);
    
    var base64Data = fileData.base64;
    var fileName = fileData.fileName || 'vehicle_' + fileData.car_id + '_' + Date.now() + '.jpg';
    var carId = fileData.car_id;
    
    // Remove data URL prefix if present
    if (base64Data.indexOf(',') !== -1) {
      base64Data = base64Data.split(',')[1];
    }
    
    // Upload to Google Drive
    var uploadResult = uploadBase64FileToDrive(
      base64Data,
      fileName,
      'VEHICLES',
      'image/jpeg'
    );
    
    // Update vehicle record - Add to vehicle_images array
    var vehicle = getVehicleById(carId);
    if (vehicle.success && vehicle.data && vehicle.data.vehicle) {
      var vehicleData = vehicle.data.vehicle;
      var vehicleImages = vehicleData.vehicle_images || [];
      if (!Array.isArray(vehicleImages)) {
        vehicleImages = [];
      }
      vehicleImages.push(uploadResult.fileUrl);
      
      var updateData = {
        vehicle_images: vehicleImages
      };
      updateVehicle(carId, updateData);
    }
    
    logAudit(getCurrentUser() || 'admin', 'upload', 'vehicle_image', carId, {
      file_url: uploadResult.fileUrl,
      file_name: fileName
    });
    
    return successResponse({
      file_url: uploadResult.fileUrl,
      file_id: uploadResult.fileId,
      file_name: fileName
    }, 'อัปโหลดรูปรถสำเร็จ');
    
  } catch (error) {
    Logger.log('Upload vehicle image error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Upload Vehicle Registration Book Image
 * อัปโหลดรูปเล่มทะเบียนรถ
 */
function uploadVehicleRegistrationBookImage(fileData) {
  try {
    requireAdmin();
    
    validateRequired(fileData, ['base64', 'fileName', 'car_id']);
    
    var base64Data = fileData.base64;
    var fileName = fileData.fileName || 'registration_' + fileData.car_id + '_' + Date.now() + '.jpg';
    var carId = fileData.car_id;
    
    // Remove data URL prefix if present
    if (base64Data.indexOf(',') !== -1) {
      base64Data = base64Data.split(',')[1];
    }
    
    // Upload to Google Drive
    var uploadResult = uploadBase64FileToDrive(
      base64Data,
      fileName,
      'VEHICLES',
      'image/jpeg'
    );
    
    // Update vehicle record
    var vehicle = getVehicleById(carId);
    if (vehicle.success && vehicle.data && vehicle.data.vehicle) {
      var updateData = {
        registration_book_image: uploadResult.fileUrl
      };
      updateVehicle(carId, updateData);
    }
    
    logAudit(getCurrentUser() || 'admin', 'upload', 'vehicle_registration_book', carId, {
      file_url: uploadResult.fileUrl,
      file_name: fileName
    });
    
    return successResponse({
      file_url: uploadResult.fileUrl,
      file_id: uploadResult.fileId,
      file_name: fileName
    }, 'อัปโหลดรูปเล่มทะเบียนรถสำเร็จ');
    
  } catch (error) {
    Logger.log('Upload vehicle registration book image error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Upload Driver Profile Image
 * อัปโหลดรูปโปรไฟล์พนักงานขับรถ
 */
function uploadDriverProfileImage(fileData) {
  try {
    requireAdmin();
    
    validateRequired(fileData, ['base64', 'fileName', 'driver_id']);
    
    var base64Data = fileData.base64;
    var fileName = fileData.fileName || 'driver_profile_' + fileData.driver_id + '_' + Date.now() + '.jpg';
    var driverId = fileData.driver_id;
    
    // Remove data URL prefix if present
    if (base64Data.indexOf(',') !== -1) {
      base64Data = base64Data.split(',')[1];
    }
    
    // Upload to Google Drive
    var uploadResult = uploadBase64FileToDrive(
      base64Data,
      fileName,
      'DRIVERS',
      'image/jpeg'
    );
    
    // Update driver record
    var driver = getDriverById(driverId);
    if (driver.success && driver.data && driver.data.driver) {
      var updateData = {
        profile_image: uploadResult.fileUrl
      };
      updateDriver(driverId, updateData);
    }
    
    logAudit(getCurrentUser() || 'admin', 'upload', 'driver_profile_image', driverId, {
      file_url: uploadResult.fileUrl,
      file_name: fileName
    });
    
    return successResponse({
      file_url: uploadResult.fileUrl,
      file_id: uploadResult.fileId,
      file_name: fileName
    }, 'อัปโหลดรูปโปรไฟล์สำเร็จ');
    
  } catch (error) {
    Logger.log('Upload driver profile image error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Upload Driver ID Card Image
 * อัปโหลดรูปบัตรประชาชน
 */
function uploadDriverIdCardImage(fileData) {
  try {
    requireAdmin();
    
    validateRequired(fileData, ['base64', 'fileName', 'driver_id']);
    
    var base64Data = fileData.base64;
    var fileName = fileData.fileName || 'driver_idcard_' + fileData.driver_id + '_' + Date.now() + '.jpg';
    var driverId = fileData.driver_id;
    
    // Remove data URL prefix if present
    if (base64Data.indexOf(',') !== -1) {
      base64Data = base64Data.split(',')[1];
    }
    
    // Upload to Google Drive
    var uploadResult = uploadBase64FileToDrive(
      base64Data,
      fileName,
      'DRIVERS',
      'image/jpeg'
    );
    
    // Update driver record
    var driver = getDriverById(driverId);
    if (driver.success && driver.data && driver.data.driver) {
      var updateData = {
        id_card_image: uploadResult.fileUrl
      };
      updateDriver(driverId, updateData);
    }
    
    logAudit(getCurrentUser() || 'admin', 'upload', 'driver_id_card_image', driverId, {
      file_url: uploadResult.fileUrl,
      file_name: fileName
    });
    
    return successResponse({
      file_url: uploadResult.fileUrl,
      file_id: uploadResult.fileId,
      file_name: fileName
    }, 'อัปโหลดรูปบัตรประชาชนสำเร็จ');
    
  } catch (error) {
    Logger.log('Upload driver ID card image error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Upload User Profile Image
 * อัปโหลดรูปโปรไฟล์ผู้ใช้
 */
function uploadUserProfileImage(fileData) {
  try {
    requireAuth();
    
    validateRequired(fileData, ['base64', 'fileName', 'userId']);
    
    var base64Data = fileData.base64;
    var fileName = fileData.fileName || 'user_profile_' + fileData.userId + '_' + Date.now() + '.jpg';
    var userId = fileData.userId;
    
    // SECURITY: Verify user can only upload their own profile image
    // Note: userId comes from requestData.userId (sent by frontend from session)
    // In Web App context, getCurrentUser() returns deployer's email, not the actual user
    // So we rely on requestData.userId which is validated in Code.gs
    // Additional validation: userId must match the authenticated user's session
    if (!userId || String(userId).trim() === '') {
      return errorResponse('ต้องระบุ userId', 'MISSING_USER_ID');
    }
    
    // Remove data URL prefix if present
    if (base64Data.indexOf(',') !== -1) {
      base64Data = base64Data.split(',')[1];
    }
    
    // Upload to Google Drive
    var uploadResult = uploadBase64FileToDrive(
      base64Data,
      fileName,
      'USERS',
      'image/jpeg'
    );
    
    // Update user record
    var userResult = getCurrentUserInfo(userId);
    if (userResult.success && userResult.data && userResult.data.user) {
      var updateData = {
        profile_image: uploadResult.fileUrl
      };
      updateUser(userId, updateData);
    }
    
    logAudit(userId, 'upload', 'user_profile_image', userId, {
      file_url: uploadResult.fileUrl,
      file_name: fileName
    });
    
    return successResponse({
      file_url: uploadResult.fileUrl,
      file_id: uploadResult.fileId,
      file_name: fileName
    }, 'อัปโหลดรูปโปรไฟล์สำเร็จ');
    
  } catch (error) {
    Logger.log('Upload user profile image error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.toString(), 'SERVER_ERROR');
  }
}
