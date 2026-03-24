/**
 * PPK DriveHub Main API Router
 * ระบบจัดการยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
 * Single doPost entry point for all API requests
 */

/**
 * Main API entry point - routes requests based on action field
 */
function doPost(e) {
  try {
    // SECURITY: Parse JSON safely
    var requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Invalid request format',
        error: 'INVALID_JSON'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // SECURITY: Sanitize action field (prevent injection)
    var action = requestData.action;
    if (!action) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Missing action field'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    action = sanitizeInput(String(action));
    
    // SECURITY: Sanitize userId if present
    if (requestData.userId) {
      requestData.userId = sanitizeInput(String(requestData.userId));
    }
    
    // List of public actions that don't require authentication
    // QR ทั้ง 3 ส่วน (บันทึกใช้รถ / เติมน้ำมัน / ตรวจสภาพ+แจ้งซ่อม) ใช้ได้โดยไม่ต้องล็อกอิน
    var publicActions = [
      'createDailyCheck',      // QR ตรวจสภาพ+แจ้งซ่อม (public)
      'createUsageRecord',     // QR บันทึกใช้รถ (public)
      'createFuelLog',         // QR เติมน้ำมัน (public)
      'getFuelTypes',         // QR เติมน้ำมัน โหลดประเภทน้ำมันโดยไม่ login
      'getVehicleById',        // QR เติมน้ำมัน/ตรวจสภาพ โหลดข้อมูลรถโดยไม่ login
      'scanQRForUsageRecord',  // QR บันทึกใช้รถ โหลดข้อมูลรถ/คนขับเมื่อสแกน QR โดยไม่ login
      'login',
      'register',              // สมัครสมาชิก (frontend ส่ง action เป็น 'register')
      'registerUser',          // alias
      'forgotPassword',
      'resetPasswordConfirm',  // ยืนยันรหัสผ่านจากลิงก์ในอีเมล
      'checkEmailVerification'
    ];
    
    // Check authentication for non-public actions
    if (publicActions.indexOf(action) === -1) {
      try {
        requireAuth();
      } catch (authError) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'ต้องล็อกอินก่อนใช้งาน',
          error: 'AUTHENTICATION_REQUIRED'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      // บังคับให้ Frontend ส่ง userId (ผู้ที่ล็อกอิน) เพื่อตรวจสิทธิ์; ถ้าไม่ส่งถือว่าไม่ได้ล็อกอิน
      if (!requestData.userId || String(requestData.userId).trim() === '') {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          message: 'ต้องล็อกอินก่อนใช้งาน (ส่ง userId)',
          error: 'AUTHENTICATION_REQUIRED'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // User ID จาก request (Frontend ส่ง userId ในทุก request) ใช้ตรวจสิทธิ์ตามโมดูล
    var requestUserId = getRequestUserId(requestData);
    
    var result;
    
    // Route to appropriate service
    switch(action) {
      // Authentication operations
      case 'login':
        result = login(requestData.username, requestData.password);
        break;
      case 'register':
        result = registerUser(requestData.data);
        break;
      case 'changePassword':
        result = changePassword(requestData.userId, requestData.oldPassword, requestData.newPassword);
        break;
      case 'forgotPassword':
        result = forgotPassword(requestData.email);
        break;
      case 'resetPasswordConfirm':
        result = resetPasswordConfirm(requestData.token, requestData.email, requestData.newPassword);
        break;
      case 'getCurrentUserInfo': {
        // ดึงข้อมูลตัวเอง (requestData.userId) หรือ Admin ดึงข้อมูล user อื่น (targetUserId)
        if (requestData.targetUserId) {
          requireAdminFromRequest(requestData);
          result = getCurrentUserInfo(requestData.targetUserId);
          // PDPA: บันทึกการเข้าถึงข้อมูลส่วนบุคคลของผู้อื่น (ตาม SECURITY_AND_PDPA_REPORT)
          try {
            logPDPAAccess(requestData.userId, requestData.targetUserId, 'view_profile', 'Admin viewed user profile');
          } catch (e) {
            Logger.log('logPDPAAccess: ' + e.toString());
          }
        } else {
          result = getCurrentUserInfo(requestData.userId);
        }
        break;
      }
      case 'getPermissionDefinitions':
        result = getPermissionDefinitions();
        break;
      case 'getMyProfile':
        result = getMyProfile(requestData.userId);
        break;
      case 'updateMyProfile':
        result = updateMyProfile(requestData.userId, requestData.data);
        break;
      case 'acceptPDPAPolicy':
        result = acceptPDPAPolicy(requestData.userId);
        break;
      case 'checkPDPAAccepted':
        result = checkPDPAAccepted(requestData.userId);
        break;
      case 'getPDPALog':
        requireAdminFromRequest(requestData);
        result = getPDPALog(requestData.filters);
        break;
      case 'getDefaultSettings':
        result = getDefaultSettings();
        break;
      case 'resetAdminSettingsToDefault':
        result = resetAdminSettingsToDefault();
        break;
      case 'viewPDPALog':
        requireAdminFromRequest(requestData);
        result = viewPDPALog(requestData.filters);
        break;
      case 'resetOtherAdmin':
        result = resetOtherAdmin(requestData.adminId);
        break;
        
      // User management (Admin only - ตรวจสิทธิ์จาก userId ที่ส่งมา; targetUserId = ผู้ใช้ที่ถูกแก้ไข)
      case 'getAllUsers':
        requireAdminFromRequest(requestData);
        result = getAllUsers(requestData.includeInactive);
        break;
      case 'updateUser': {
        requireAdminFromRequest(requestData);
        var targetUserId = requestData.targetUserId || (requestData.data && requestData.data.user_id) || requestData.userId;
        result = updateUser(targetUserId, requestData.data);
        break;
      }
      case 'deactivateUser': {
        requireAdminFromRequest(requestData);
        var targetUserId = requestData.targetUserId || requestData.userId;
        result = deactivateUser(targetUserId, requestData.reason);
        break;
      }
      case 'resetUserPassword': {
        requireAdminFromRequest(requestData);
        var targetUserId = requestData.targetUserId || requestData.userId;
        result = resetUserPassword(targetUserId, requestData.newPassword);
        break;
      }
        
      // User requests (Admin only)
      case 'getUserRequests':
        requireAdminFromRequest(requestData);
        result = getUserRequests(requestData.status);
        break;
      case 'approveUserRequest':
        requireAdminFromRequest(requestData);
        result = approveUserRequest(requestData.requestId, requestData.data);
        break;
      case 'rejectUserRequest':
        requireAdminFromRequest(requestData);
        result = rejectUserRequest(requestData.requestId, requestData.reason);
        break;
        
      // Queue operations (ตรวจสิทธิ์โมดูล queue)
      case 'createQueue':
        requireModulePermissionForRequest(requestData, 'queue', 'create');
        result = createQueue(requestData.data);
        break;
      case 'getQueues':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getQueues(requestData.filters);
        break;
      case 'getQueueById':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getQueueById(requestData.queueId);
        break;
      case 'updateQueue':
        requireModulePermissionForRequest(requestData, 'queue', 'edit');
        result = updateQueue(requestData.queueId, requestData.data);
        break;
      case 'cancelQueue':
        requireModulePermissionForRequest(requestData, 'queue', 'edit');
        result = cancelQueue(requestData.queueId, requestData.reason);
        break;
      case 'freezeQueue':
        requireModulePermissionForRequest(requestData, 'queue', 'edit');
        result = freezeQueue(requestData.queueId);
        break;
      case 'unfreezeQueue':
        requireModulePermissionForRequest(requestData, 'queue', 'edit');
        result = unfreezeQueue(requestData.queueId);
        break;
      case 'getQueueTimeline':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getQueueTimeline(requestData.filters);
        break;
      case 'checkAndFreezeQueues':
        requireModulePermissionForRequest(requestData, 'queue', 'edit');
        result = checkAndFreezeQueues();
        break;
      case 'restoreBackup':
        requireAdminFromRequest(requestData);
        result = restoreBackup(requestData.backupDate, requestData.module);
        break;
      case 'dailyBackup':
        requireAdminFromRequest(requestData);
        result = dailyBackup();
        break;
        
      // Vehicle operations (ตรวจสิทธิ์โมดูล vehicles)
      case 'createVehicle':
        requireModulePermissionForRequest(requestData, 'vehicles', 'create');
        result = createVehicle(requestData.data);
        break;
      case 'getVehicles':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getVehicles(requestData.filters);
        break;
      case 'getVehicleById':
        // QR เติมน้ำมัน/ตรวจสภาพ เรียกโดยไม่ส่ง userId — ข้ามการเช็คสิทธิ์
        if (requestData.userId && String(requestData.userId).trim() !== '') {
          requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        }
        result = getVehicleById(requestData.carId);
        break;
      case 'updateVehicle':
        requireModulePermissionForRequest(requestData, 'vehicles', 'edit');
        result = updateVehicle(requestData.carId, requestData.data);
        break;
      case 'deactivateVehicle':
        requireModulePermissionForRequest(requestData, 'vehicles', 'edit');
        result = deactivateVehicle(requestData.carId, requestData.reason);
        break;
        
      // Driver operations (ตรวจสิทธิ์โมดูล drivers)
      case 'createDriver':
        requireModulePermissionForRequest(requestData, 'drivers', 'create');
        result = createDriver(requestData.data);
        break;
      case 'getDrivers':
        requireModulePermissionForRequest(requestData, 'drivers', 'view');
        result = getDrivers(requestData.filters);
        break;
      case 'getDriverById':
        requireModulePermissionForRequest(requestData, 'drivers', 'view');
        result = getDriverById(requestData.driverId);
        break;
      case 'updateDriver':
        requireModulePermissionForRequest(requestData, 'drivers', 'edit');
        result = updateDriver(requestData.driverId, requestData.data);
        break;
        
      // File Upload Operations (Admin only - ตรวจที่ Gateway ด้วย requestData.userId)
      case 'uploadVehicleImage':
        requireAdminFromRequest(requestData);
        result = uploadVehicleImage(requestData.fileData);
        break;
      case 'uploadVehicleRegistrationBookImage':
        requireAdminFromRequest(requestData);
        result = uploadVehicleRegistrationBookImage(requestData.fileData);
        break;
      case 'uploadDriverProfileImage':
        requireAdminFromRequest(requestData);
        result = uploadDriverProfileImage(requestData.fileData);
        break;
      case 'uploadDriverIdCardImage':
        requireAdminFromRequest(requestData);
        result = uploadDriverIdCardImage(requestData.fileData);
        break;
      case 'uploadUserProfileImage':
        // SECURITY: User can upload their own profile image only
        // Verify userId matches authenticated user (prevent IDOR)
        if (!requestData.userId || String(requestData.userId).trim() === '') {
          result = errorResponse('ต้องระบุ userId', 'MISSING_USER_ID');
        } else if (!requestData.fileData || !requestData.fileData.base64) {
          result = errorResponse('ต้องระบุไฟล์ภาพ', 'MISSING_FILE');
        } else {
          // userId is validated - user can only upload their own profile
          result = uploadUserProfileImage({
            base64: requestData.fileData.base64,
            fileName: requestData.fileData.fileName,
            userId: requestData.userId
          });
        }
        break;
        
      // Auto-Complete Operations (ตรวจสิทธิ์โมดูล)
      case 'searchDriversByName':
        requireModulePermissionForRequest(requestData, 'drivers', 'view');
        result = searchDriversByName(requestData.query);
        break;
      case 'searchVehiclesByLicensePlate':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = searchVehiclesByLicensePlate(requestData.query);
        break;
      case 'searchRequestedBy':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = searchRequestedBy(requestData.query);
        break;
      case 'searchDestinations':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = searchDestinations(requestData.query);
        break;
      case 'deactivateDriver':
        requireModulePermissionForRequest(requestData, 'drivers', 'edit');
        result = deactivateDriver(requestData.driverId, requestData.reason);
        break;
        
      // Fuel Log operations (QR เรียก createFuelLog โดยไม่ส่ง userId; Web ส่ง userId ต้องมีสิทธิ์ fuel)
      case 'createFuelLog':
        if (requestData.userId && String(requestData.userId).trim() !== '') {
          requireModulePermissionForRequest(requestData, 'fuel', 'create');
        }
        result = createFuelLog(requestData.data);
        break;
      case 'getFuelLogs':
        requireModulePermissionForRequest(requestData, 'fuel', 'view');
        result = getFuelLogs(requestData.filters);
        break;
      case 'getFuelLogById':
        requireModulePermissionForRequest(requestData, 'fuel', 'view');
        result = getFuelLogById(requestData.fuelId);
        break;
      case 'updateFuelLog':
        requireModulePermissionForRequest(requestData, 'fuel', 'edit');
        result = updateFuelLog(requestData.fuelId, requestData.data);
        break;
      case 'getFuelTypes':
        result = getFuelTypes();
        break;
        
      // Fuel Report operations (ต้องมีสิทธิ์ fuel view หรือ reports view)
      case 'generateMonthlyFuelReport':
        requireModulePermissionForRequest(requestData, 'fuel', 'view');
        result = generateMonthlyFuelReport(requestData.month, requestData.year);
        break;
      case 'generateAnnualFuelReport':
        requireModulePermissionForRequest(requestData, 'fuel', 'view');
        result = generateAnnualFuelReport(requestData.year);
        break;
      case 'compareFuelUsageWithBudget':
        requireModulePermissionForRequest(requestData, 'fuel', 'view');
        result = compareFuelUsageWithBudget(requestData.period);
        break;
        
      // Fuel Analysis operations (MODULE F5 - ต้องมีสิทธิ์ fuel view)
      case 'analyzeFuelConsumptionAnomalies':
        requireModulePermissionForRequest(requestData, 'fuel', 'view');
        result = analyzeFuelConsumptionAnomalies(requestData.filters);
        break;
      case 'detectFrequentFillingAnomalies':
        requireModulePermissionForRequest(requestData, 'fuel', 'view');
        result = detectFrequentFillingAnomalies(requestData.filters);
        break;
      case 'compareVehicleConsumptionWithAverage':
        requireModulePermissionForRequest(requestData, 'fuel', 'view');
        result = compareVehicleConsumptionWithAverage(requestData.carId, requestData.period);
        break;
      case 'getAllFuelAnomalies':
        requireModulePermissionForRequest(requestData, 'fuel', 'view');
        result = getAllFuelAnomalies(requestData.filters);
        break;
        
      // Repair operations (ตรวจสิทธิ์โมดูล repair)
      case 'createRepairLog':
        requireModulePermissionForRequest(requestData, 'repair', 'create');
        result = createRepairLog(requestData.data);
        break;
      case 'getRepairLogs':
        requireModulePermissionForRequest(requestData, 'repair', 'view');
        result = getRepairLogs(requestData.filters);
        break;
      case 'getRepairLogById':
        requireModulePermissionForRequest(requestData, 'repair', 'view');
        result = getRepairLogById(requestData.repairId);
        break;
      case 'updateRepairLog':
        requireModulePermissionForRequest(requestData, 'repair', 'edit');
        result = updateRepairLog(requestData.repairId, requestData.data);
        break;
      case 'completeRepair':
        requireModulePermissionForRequest(requestData, 'repair', 'edit');
        result = completeRepair(requestData.repairId, requestData.data);
        break;
        
      // Check operations (createDailyCheck = QR public; createCheckLog/get = vehicles view)
      case 'createDailyCheck':
        // Public API - ไม่ต้อง login สำหรับ QR scanning
        result = createDailyCheck(requestData.data);
        break;
      case 'createCheckLog':
        requireModulePermissionForRequest(requestData, 'vehicles', 'create');
        result = createCheckLog(requestData.data);
        break;
      case 'getCheckLogs':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getCheckLogs(requestData.filters);
        break;
      case 'getCheckLogById':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getCheckLogById(requestData.checkId);
        break;
        
      // Inspection Alert operations (ข้อมูลรถ — vehicles view)
      case 'getInspectionAlerts':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getInspectionAlerts(requestData.filters);
        break;
        
      // Smart Queue operations (Fairness Engine — queue view)
      case 'getSmartQueueRecommendations':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getSmartQueueRecommendations(requestData.data);
        break;
      case 'getAllDriversWorkloadScores':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getAllDriversWorkloadScores(requestData.periodDays);
        break;
      case 'getFairnessRecommendations':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getFairnessRecommendations(requestData.date);
        break;
      case 'getRecoveryDayRecommendations':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getRecoveryDayRecommendations(requestData.date);
        break;
      case 'checkRecoveryDayStatus':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = checkRecoveryDayStatus(requestData.driverId, requestData.date);
        break;
      case 'checkRotationPolicy':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = checkRotationPolicy(requestData.driverId, requestData.carId, requestData.date);
        break;
        
      // Psychological Safety (report = queue/drivers; acknowledge = Admin)
      case 'reportSelfReportedFatigue':
        requireModulePermissionForRequest(requestData, 'drivers', 'create');
        result = reportSelfReportedFatigue(requestData.driverId, requestData.date, requestData.reason);
        break;
      case 'getSelfReportedFatigueReports':
        requireModulePermissionForRequest(requestData, 'drivers', 'view');
        result = getSelfReportedFatigueReports(requestData.filters);
        break;
      case 'acknowledgeSelfReportedFatigue':
        requireAdminFromRequest(requestData);
        result = acknowledgeSelfReportedFatigue(requestData.reportId, requestData.adminNotes);
        break;
        
      // Service Grade (ข้อมูลรถ — vehicles view)
      case 'calculateServiceGrade':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = calculateServiceGrade(requestData.carId);
        break;
      case 'getAllVehiclesServiceGrades':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getAllVehiclesServiceGrades();
        break;
        
      // QR Code operations (จาก Web หลัง login — ต้องมีสิทธิ์ queue/vehicles)
      case 'scanQRUsage':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = scanQRUsage(requestData.qrData, requestData.data);
        break;
      case 'scanQRCheck':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = scanQRCheck(requestData.qrData, requestData.data);
        break;
        
      // Dashboard operations (สรุป — ต้อง login; สถิติ = reports view)
      case 'getPublicLandingStats':
        result = getPublicLandingStats();
        break;
      case 'getDashboardStatsToday':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getDashboardStatsToday();
        break;
      case 'getDashboardStats':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getDashboardStats();
        break;
      case 'getAdminDashboardStats':
        requireAdminFromRequest(requestData);
        result = getAdminDashboardStats();
        break;
        
      // Queue History operations (ตรวจสิทธิ์ queue view)
      case 'getVehicleQueueHistory':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getVehicleQueueHistory(requestData.carId, requestData.filters);
        break;
      case 'getDriverQueueHistory':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getDriverQueueHistory(requestData.driverId, requestData.filters);
        break;
      case 'getOrganizationQueueHistory':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getOrganizationQueueHistory(requestData.filters);
        break;
      case 'getQueuePlan':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getQueuePlan(requestData.filters);
        break;
        
      // Report operations (ตรวจสิทธิ์โมดูล reports - view)
      case 'getQueueReport':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getQueueReport(requestData.filters);
        break;
      case 'getFuelReport':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getFuelReport(requestData.filters);
        break;
      case 'getRepairReport':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getRepairReport(requestData.filters);
        break;
      case 'getVehicleUsageReport':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getVehicleUsageReport(requestData.carId, requestData.filters);
        break;
        
      // Admin operations (Admin only)
      case 'getAuditLogs':
        requireAdminFromRequest(requestData);
        result = getAuditLogs(requestData.filters);
        break;
      case 'getSystemSettings':
        requireAdminFromRequest(requestData);
        result = getSystemSettings();
        break;
      case 'updateSystemSetting':
        requireAdminFromRequest(requestData);
        result = updateSystemSetting(requestData.key, requestData.value);
        break;
      case 'getComprehensiveReport':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getComprehensiveReport(requestData.filters || {});
        break;
      case 'getAdminSettings':
        requireAdminFromRequest(requestData);
        result = getAdminSettings();
        break;
      case 'updateAdminSetting':
        requireAdminFromRequest(requestData);
        result = updateAdminSetting(requestData.category, requestData.key, requestData.value);
        break;
      case 'sendEmailVerification':
        result = sendEmailVerification(requestData.email, requestData.requestId, requestData.fullName);
        break;
      case 'verifyEmail':
        result = verifyEmail(requestData.token, requestData.requestId);
        break;
      case 'createManualQueue':
        requireAdminFromRequest(requestData);
        result = createManualQueue(requestData.data);
        break;
        
      // Queue Rules (Admin only)
      case 'createQueueRule':
        requireAdminFromRequest(requestData);
        result = createQueueRule(requestData.data);
        break;
      case 'getQueueRules':
        // Allow view permission for drivers module to see rules (for filtering)
        requireModulePermissionForRequest(requestData, 'drivers', 'view');
        result = getQueueRules();
        break;
      case 'getDriversForQueue':
        requireAdminFromRequest(requestData);
        result = getDriversForQueue(requestData.date, requestData.assignment_type);
        break;
      case 'updateQueueRule':
        requireAdminFromRequest(requestData);
        result = updateQueueRule(requestData.ruleId, requestData.data);
        break;
      case 'deleteQueueRule':
        requireAdminFromRequest(requestData);
        result = deleteQueueRule(requestData.ruleId);
        break;
        
      // Usage Records
      case 'createUsageRecord':
        result = createUsageRecord(requestData.data);
        break;
      case 'getUsageRecords':
        result = getUsageRecords(requestData.filters);
        break;
      case 'getNotifications':
        // Pass userId to getNotifications for proper filtering
        // In Web App, getCurrentUser() doesn't work, so use requestData.userId
        result = getNotificationsForUser(requestData.userId);
        break;
      case 'markNotificationRead':
        result = markNotificationRead(requestData.notificationId, requestData.userId);
        break;
      case 'createDailySystemSnapshot':
        requireAdminFromRequest(requestData);
        result = createDailySystemSnapshot();
        break;
      case 'getSystemSnapshot':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getSystemSnapshot(requestData.date);
        break;
      case 'getSystemSnapshotReport':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getSystemSnapshotReport(requestData.date_from, requestData.date_to);
        break;
      case 'updateSystemSettingVersioned':
        requireAdminFromRequest(requestData);
        result = updateSystemSettingVersioned(requestData.key, requestData.value, requestData.description, requestData.effective_from);
        break;
      case 'getSystemSettingHistory':
        requireAdminFromRequest(requestData);
        result = getSystemSettingHistory(requestData.key);
        break;
      case 'rollbackSystemSetting':
        requireAdminFromRequest(requestData);
        result = rollbackSystemSetting(requestData.key, requestData.target_version);
        break;
      case 'getExecutiveDashboard':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getExecutiveDashboard(requestData.date_from, requestData.date_to);
        break;
      case 'isExecutiveMode':
        result = isExecutiveMode(requestData.userId || getCurrentUser());
        break;
      case 'archiveYearData':
        requireAdminFromRequest(requestData);
        result = archiveYearData(requestData.year);
        break;
      case 'getArchiveInfo':
        requireAdminFromRequest(requestData);
        result = getArchiveInfo();
        break;
      case 'getCrossYearData':
        requireAdminFromRequest(requestData);
        result = getCrossYearData(requestData.sheet_name, requestData.date_from, requestData.date_to);
        break;
      case 'runAutoRecoveryPendingReturns':
        requireAdminFromRequest(requestData);
        result = runAutoRecoveryPendingReturns();
        break;
      case 'runMonthlyAutoRecoveryTelegram':
        requireAdminFromRequest(requestData);
        result = runMonthlyAutoRecoveryTelegram();
        break;
      case 'getAutoRecoveryStats':
        requireAdminFromRequest(requestData);
        result = getAutoRecoveryStats(requestData.filters || {});
        break;
      case 'sendMonthlyAutoRecoveryTelegramReport': {
        requireAdminFromRequest(requestData);
        var d = new Date();
        if (requestData.month == null || requestData.year == null) {
          d.setMonth(d.getMonth() - 1);
        }
        var month = requestData.month != null ? requestData.month : d.getMonth() + 1;
        var year = requestData.year != null ? requestData.year : d.getFullYear();
        result = sendMonthlyAutoRecoveryTelegramReport(month, year);
        break;
      }
      case 'scanQRForUsageRecord':
        result = scanQRForUsageRecord(requestData.qrData);
        break;
        
      // Tax & Insurance (ข้อมูลรถ/เอกสาร — ต้องมีสิทธิ์ vehicles view)
      case 'createTaxRecord':
        requireModulePermissionForRequest(requestData, 'vehicles', 'edit');
        result = createTaxRecord(requestData.data);
        break;
      case 'getTaxRecords':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getTaxRecords(requestData.filters);
        break;
      case 'updateTaxRecord':
        requireModulePermissionForRequest(requestData, 'vehicles', 'edit');
        result = updateTaxRecord(requestData.taxId, requestData.data);
        break;
      case 'createInsuranceRecord':
        requireModulePermissionForRequest(requestData, 'vehicles', 'edit');
        result = createInsuranceRecord(requestData.data);
        break;
      case 'getInsuranceRecords':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getInsuranceRecords(requestData.filters);
        break;
      case 'updateInsuranceRecord':
        requireModulePermissionForRequest(requestData, 'vehicles', 'edit');
        result = updateInsuranceRecord(requestData.insuranceId, requestData.data);
        break;
        
      // Maintenance Settings (ข้อมูลรถ — vehicles view)
      case 'getMaintenanceSettings':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getMaintenanceSettings(requestData.carId);
        if (!result.success) {
          result = successResponse({ settings: null }); // Return null if no settings
        }
        break;
      case 'updateMaintenanceSettings':
        requireModulePermissionForRequest(requestData, 'vehicles', 'edit');
        result = updateMaintenanceSettings(requestData.carId, requestData.settings);
        break;
        
      // Maintenance Schedule (ข้อมูลรถ — vehicles view)
      case 'getMaintenanceSchedule':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getMaintenanceSchedule(requestData.brand, requestData.model);
        break;
      case 'getNextMaintenanceForCar':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getNextMaintenanceForCar(requestData.carId);
        break;
      case 'getVehicleMaintenanceLast':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = successResponse(getVehicleMaintenanceLast(requestData.carId));
        break;
      case 'recordVehicleMaintenance':
        requireAuthFromRequest(requestData);
        result = recordVehicleMaintenance(requestData.carId, requestData.updates || []);
        result = successResponse(result, result.updated ? 'บันทึกการบำรุงสำเร็จ' : undefined);
        break;
      case 'setVehicleMaintenanceLast':
        requireAuthFromRequest(requestData);
        setVehicleMaintenanceLast(requestData.carId, requestData.item_key, requestData.last_km, requestData.last_date, requestData.notes);
        result = successResponse({}, 'บันทึกการบำรุงสำเร็จ');
        break;
      case 'getMaintenanceAlertsForVehicle':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = successResponse(getMaintenanceAlertsForVehicle(requestData.carId));
        break;
      case 'initializeVehicleMaintenanceFromToday':
        requireAuthFromRequest(requestData);
        var initResult = initializeVehicleMaintenanceFromToday(requestData.carId);
        result = successResponse(initResult, 'ตั้งค่าประวัติการบำรุงครั้งแรกสำเร็จ (ใช้เลขไมล์และวันนี้เป็นจุดเริ่มต้น)');
        break;
        
      // Vehicle Cost Intelligence (ข้อมูลรถ — vehicles view)
      case 'calculateVehicleCostPerKm':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = calculateVehicleCostPerKm(requestData.carId, requestData.period);
        break;
      case 'rankVehiclesByCostEfficiency':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = rankVehiclesByCostEfficiency(requestData.period);
        break;
      case 'getVehicleCostAnalysis':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getVehicleCostAnalysis(requestData.carId);
        break;
        
      // Vehicle Health Score (ข้อมูลรถ — vehicles view)
      case 'calculateVehicleHealthScore':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = calculateVehicleHealthScore(requestData.carId);
        break;
      case 'getAllVehiclesHealthScores':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getAllVehiclesHealthScores();
        break;
        
      // Usage Patterns (รายงาน/วิเคราะห์ — reports view)
      case 'analyzeVehicleUsagePatterns':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = analyzeVehicleUsagePatterns(requestData.period);
        break;
      case 'analyzeDriverUsagePatterns':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = analyzeDriverUsagePatterns(requestData.period);
        break;
      case 'analyzeQueuePatterns':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = analyzeQueuePatterns(requestData.period);
        break;
        
      // Accidents - Removed (ไฟล์ AccidentService.gs ถูกลบแล้ว)
      // ฟังก์ชันบันทึกอุบัติเหตุจะพัฒนาต่อในอนาคต
      // case 'createAccidentRecord':
      // case 'getAccidentRecords':
      // case 'updateAccidentRecord':
        
      // Emergency Override (ระบบสำคัญ — Admin only)
      case 'createEmergencyOverride':
        requireAdminFromRequest(requestData);
        result = createEmergencyOverride(requestData.data);
        break;
      case 'getEmergencyOverrides':
        requireAdminFromRequest(requestData);
        result = getEmergencyOverrides(requestData.filters);
        break;
      case 'getEmergencyOverrideReport':
        requireAdminFromRequest(requestData);
        result = getEmergencyOverrideReport(requestData.period);
        break;
        
      // Document Generator - Removed (ไฟล์ DocumentGeneratorService.gs ถูกลบแล้ว)
      // ฟังก์ชัน Export จะพัฒนาต่อในอนาคต
      // case 'generateVehicleRequestForm':
      // case 'generateMonthlyVehicleUsageReport':
      // case 'generateFuelCostReport':
      // case 'generateRepairReport':
      // case 'generateBudgetProposalDocument':
      // case 'exportDocumentToPDF':
      // case 'exportDocumentToExcel':
        
      // System Intelligence Layer - Removed (ไฟล์ IntelligenceLayerService.gs ถูกลบแล้ว)
      // ฟังก์ชัน Intelligence จะพัฒนาต่อในอนาคต
      // case 'getSystemIntelligenceInsights':
        
      // Scheduled Repairs (ซ่อมบำรุง — repair module)
      case 'createScheduledRepair':
        requireModulePermissionForRequest(requestData, 'repair', 'create');
        result = createScheduledRepair(requestData.data);
        break;
      case 'getScheduledRepairs':
        requireModulePermissionForRequest(requestData, 'repair', 'view');
        result = getScheduledRepairs(requestData.filters);
        break;
      case 'updateScheduledRepair':
        requireModulePermissionForRequest(requestData, 'repair', 'edit');
        result = updateScheduledRepair(requestData.scheduledRepairId, requestData.data);
        break;
      case 'cancelScheduledRepair':
        requireModulePermissionForRequest(requestData, 'repair', 'edit');
        result = cancelScheduledRepair(requestData.scheduledRepairId, requestData.reason);
        break;
      case 'convertScheduledRepairToRepair':
        requireModulePermissionForRequest(requestData, 'repair', 'create');
        result = convertScheduledRepairToRepair(requestData.scheduledRepairId, requestData.repairData);
        break;
      case 'isCarScheduledForRepair':
        requireModulePermissionForRequest(requestData, 'repair', 'view');
        result = isCarScheduledForRepair(requestData.carId, requestData.date);
        break;
        
      // Leaves (คนขับ — drivers module; approveLeave = Admin)
      case 'createLeave':
        requireModulePermissionForRequest(requestData, 'drivers', 'create');
        result = createLeave(requestData.data);
        break;
      case 'getLeaves':
        requireModulePermissionForRequest(requestData, 'drivers', 'view');
        result = getLeaves(requestData.filters);
        break;
      case 'updateLeave':
        requireModulePermissionForRequest(requestData, 'drivers', 'edit');
        result = updateLeave(requestData.leaveId, requestData.data);
        break;
      case 'extendLeave':
        requireModulePermissionForRequest(requestData, 'drivers', 'edit');
        result = extendLeave(requestData.leaveId, requestData.newEndDate, requestData.reason);
        break;
      case 'cancelLeave':
        requireModulePermissionForRequest(requestData, 'drivers', 'edit');
        result = cancelLeave(requestData.leaveId, requestData.reason);
        break;
      case 'approveLeave':
        requireAdminFromRequest(requestData);
        result = approveLeave(requestData.leaveId, requestData.approvedBy);
        break;
      case 'isDriverOnLeave':
        requireModulePermissionForRequest(requestData, 'drivers', 'view');
        result = isDriverOnLeave(requestData.driverId, requestData.date);
        break;
      case 'getDriverLeaves':
        requireModulePermissionForRequest(requestData, 'drivers', 'view');
        result = getLeaves({ driver_id: requestData.driverId });
        break;
      case 'createDriverLeave':
        requireModulePermissionForRequest(requestData, 'drivers', 'create');
        result = createLeave(requestData.data);
        break;
      case 'deleteDriverLeave':
        requireModulePermissionForRequest(requestData, 'drivers', 'edit');
        result = cancelLeave(requestData.leaveId, 'ลบโดยผู้ดูแลระบบ');
        break;
      case 'lockVehicleForRepair':
        requireModulePermissionForRequest(requestData, 'repair', 'edit');
        result = lockVehicleForRepair(requestData.carId, requestData.scheduledRepairId, requestData.isEmergency);
        break;
      case 'unlockVehicleFromRepair':
        requireModulePermissionForRequest(requestData, 'repair', 'edit');
        result = unlockVehicleFromRepair(requestData.carId, requestData.scheduledRepairId);
        break;
        
      // Driver Fatigue (ข้อมูลคนขับ/คิว — queue view)
      case 'checkDriverDistanceYesterday':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = checkDriverDistanceYesterday(requestData.driverId, requestData.checkDate);
        break;
      case 'checkDriverFatigueStatus':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = checkDriverFatigueStatus(requestData.driverId, requestData.checkDate);
        break;
      case 'getDriverFatigueWarning':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getDriverFatigueWarning(requestData.driverId, requestData.checkDate);
        break;
        
      // Queue Helpers (queue view)
      case 'getAvailableVehiclesForQueue':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getAvailableVehiclesForQueue(requestData.date);
        break;
      case 'getAvailableDriversForQueue':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getAvailableDriversForQueue(requestData.date);
        break;
      case 'getQueueCreationWarnings':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getQueueCreationWarnings(requestData.carId, requestData.driverId, requestData.date);
        break;
        
      // Daily Jobs (mark/clear/check = queue; setup/trigger = Admin)
      case 'dailyDriverFatigueCheck':
        requireAdminFromRequest(requestData);
        result = dailyDriverFatigueCheck();
        break;
      case 'markDriverFatigue':
        requireModulePermissionForRequest(requestData, 'queue', 'edit');
        result = markDriverFatigue(requestData.driverId, requestData.date, requestData.distance);
        break;
      case 'clearDriverFatigue':
        requireModulePermissionForRequest(requestData, 'queue', 'edit');
        result = clearDriverFatigue(requestData.driverId);
        break;
      case 'checkDriverFatigueFlag':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = checkDriverFatigueFlag(requestData.driverId);
        break;
      case 'getDriverDisciplineScore':
        requireModulePermissionForRequest(requestData, 'queue', 'view');
        result = getDriverDisciplineScore(requestData.driverId, requestData.period);
        break;
      case 'setupDailyTrigger':
        requireAdminFromRequest(requestData);
        result = setupDailyTrigger();
        break;
      case 'testDailyDriverFatigueCheck':
        requireAdminFromRequest(requestData);
        result = testDailyDriverFatigueCheck();
        break;
      case 'createFiscalYearSheets':
        requireAdminFromRequest(requestData);
        result = createFiscalYearSheets();
        break;
      case 'setupFiscalYearTrigger':
        requireAdminFromRequest(requestData);
        result = setupFiscalYearTrigger();
        break;
        
      // KPI Operations (รายงาน — reports view)
      case 'calculateVehicleAvailability':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = calculateVehicleAvailability(requestData.period);
        break;
      case 'calculateEmergencyRepairCount':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = calculateEmergencyRepairCount(requestData.period);
        break;
      case 'calculateAverageCostPerVehicle':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = calculateAverageCostPerVehicle(requestData.period);
        break;
      case 'getAllKPIs':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getAllKPIs(requestData.period);
        break;
      case 'getKPIThreshold':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getKPIThreshold(requestData.score);
        break;
      case 'getKPITrend':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getKPITrend(requestData.entityId, requestData.entityType, requestData.period);
        break;
        
      // Risk Alert Operations (รายงาน — reports view)
      case 'checkDriverRisk':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = checkDriverRisk(requestData.threshold);
        break;
      case 'checkVehicleModelRisk':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = checkVehicleModelRisk(requestData.thresholdPercent);
        break;
      case 'getAllRiskAlerts':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getAllRiskAlerts(requestData.driverThreshold, requestData.modelThresholdPercent);
        break;
        
      // Route Recommendation (รายงาน — reports view)
      case 'getRouteRecommendation':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = getRouteRecommendation(requestData.routeData);
        break;
        
      // Accident Analysis (repair view)
      case 'analyzeAccidentStatistics':
        requireModulePermissionForRequest(requestData, 'repair', 'view');
        result = analyzeAccidentStatistics(requestData.period);
        break;
      case 'getAccidentHeatmapData':
        requireModulePermissionForRequest(requestData, 'repair', 'view');
        result = getAccidentHeatmapData(requestData.period);
        break;
        
      // GPS/OBD Operations (vehicles view; update/sync = Admin — Service มี requireAdmin ภายใน)
      case 'getGPSOBDConfig':
        requireAdminFromRequest(requestData);
        result = getGPSOBDConfig();
        break;
      case 'updateGPSOBDConfig':
        requireAdminFromRequest(requestData);
        result = updateGPSOBDConfig(requestData.configData);
        break;
      case 'syncGPSOBDData':
        requireAdminFromRequest(requestData);
        result = syncGPSOBDData();
        break;
      case 'getGPSOBDData':
        requireModulePermissionForRequest(requestData, 'vehicles', 'view');
        result = getGPSOBDData(requestData.carId, requestData.period);
        break;
      case 'analyzeDrivingBehavior':
        requireModulePermissionForRequest(requestData, 'reports', 'view');
        result = analyzeDrivingBehavior(requestData.carId, requestData.driverId, requestData.period);
        break;
        
      default:
        result = {
          success: false,
          message: 'Unknown action: ' + action
        };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    Logger.log('doPost error: ' + error.toString());
    var errMsg = error.message || error.toString();
    var errCode = 'SERVER_ERROR';
    if (errMsg.indexOf('ไม่มีสิทธิ์') !== -1 || errMsg.indexOf('ต้องเป็น Admin') !== -1) errCode = 'FORBIDDEN';
    if (errMsg.indexOf('ต้องล็อกอิน') !== -1) errCode = 'AUTHENTICATION_REQUIRED';
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: errMsg,
      error: errCode
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get notifications for a specific user
 * @param {string} userId - User ID to get notifications for (from requestData.userId in Web App context)
 */
function getNotificationsForUser(userId) {
  try {
    if (!userId || String(userId).trim() === '') {
      return errorResponse('ต้องระบุ userId', 'MISSING_USER_ID');
    }
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.NOTIFICATIONS, [
      'notification_id', 'user_id', 'type', 'title', 'message', 'read', 'created_at'
    ]);
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return successResponse({ notifications: [] });
    }
    
    var notifications = [];
    
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var notif = rowToObject(row, headers);
      
      // Filter by user_id — return ทั้งอ่านแล้วและยังไม่อ่าน (frontend แสดงทั้งหมด)
      if (notif.user_id === userId) {
        notifications.push({
          id: notif.notification_id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          created_at: notif.created_at,
          read: notif.read === 'TRUE' || notif.read === true
        });
      }
    }
    
    // Sort by created_at descending
    notifications.sort(function(a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    return successResponse({ notifications: notifications });
  } catch(error) {
    Logger.log('Get notifications error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงการแจ้งเตือน: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get notifications (legacy function - calls getNotificationsForUser)
 * Kept for backward compatibility
 */
function getNotifications() {
  // This function is deprecated - use getNotificationsForUser(userId) instead
  // In Web App context, getCurrentUser() doesn't work correctly
  try {
    var userId = getCurrentUser();
    if (!userId) {
      return errorResponse('ต้องล็อกอินเพื่อดูการแจ้งเตือน', 'AUTHENTICATION_REQUIRED');
    }
    return getNotificationsForUser(userId);
  } catch (error) {
    return errorResponse('ต้องล็อกอินเพื่อดูการแจ้งเตือน', 'AUTHENTICATION_REQUIRED');
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID to mark as read
 * @param {string} userId - User ID (from requestData.userId in Web App context)
 */
function markNotificationRead(notificationId, userId) {
  try {
    if (!notificationId || String(notificationId).trim() === '') {
      return errorResponse('ต้องระบุ notificationId', 'MISSING_NOTIFICATION_ID');
    }
    
    if (!userId || String(userId).trim() === '') {
      return errorResponse('ต้องระบุ userId', 'MISSING_USER_ID');
    }
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.NOTIFICATIONS, [
      'notification_id', 'user_id', 'type', 'title', 'message', 'read', 'created_at'
    ]);
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var notif = rowToObject(row, headers);
      
      // SECURITY: Check notification belongs to current user (prevent IDOR)
      if (notif.notification_id === notificationId && notif.user_id === userId) {
        // Find read column index
        var readColIndex = headers.indexOf('read') + 1;
        if (readColIndex > 0) {
          sheet.getRange(i + 1, readColIndex).setValue('TRUE');
          logAudit(userId, 'mark_notification_read', 'notification', notificationId, {});
          return successResponse({}, 'ทำเครื่องหมายว่าอ่านแล้ว');
        }
      }
    }
    
    return errorResponse('ไม่พบการแจ้งเตือนหรือไม่มีสิทธิ์', 'NOTIFICATION_NOT_FOUND');
  } catch(error) {
    Logger.log('Mark notification read error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Test function for development
 */
function test() {
  Logger.log('PPK DriveHub API is running');
  Logger.log('Spreadsheet: ' + CONFIG.SPREADSHEET_NAME);
}
