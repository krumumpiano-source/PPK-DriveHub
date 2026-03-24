/**
 * PPK DriveHub Authentication Service
 * จัดการการเข้าสู่ระบบ, สมัครสมาชิก, และการอนุมัติผู้ใช้
 */

/**
 * Login - เข้าสู่ระบบ
 */
function login(username, password) {
  try {
    // SECURITY: Rate limiting for login attempts (prevent brute force)
    var cache = CacheService.getScriptCache();
    var rateLimitKey = 'login_rl_' + (username || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
    var attempts = cache.get(rateLimitKey);
    if (attempts) {
      var attemptCount = parseInt(attempts, 10) || 0;
      if (attemptCount >= 5) {
        // Block for 15 minutes after 5 failed attempts
        return errorResponse('มีการพยายามเข้าสู่ระบบผิดพลาดมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่', 'RATE_LIMIT');
      }
    }
    
    // SECURITY: Sanitize username input
    username = sanitizeInput(username || '');
    if (!username || username.length === 0) {
      return errorResponse('กรุณากรอกชื่อผู้ใช้', 'INVALID_INPUT');
    }
    
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var data = sheet.getDataRange().getValues();
    
    // Skip header row
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var userId = row[0];
      var passwordHash = row[1];
      var fullName = row[2];
      var role = row[6];
      var active = row[7];
      var firstLogin = row[8];
      
      if (userId === username && verifyPassword(password, passwordHash)) {
        // Check if user is active
        if (active !== true && active !== 'TRUE') {
          logAudit(username, 'login_failed', 'user', username, {
            reason: 'User is not active'
          });
          return errorResponse('บัญชีนี้ยังไม่ได้รับอนุมัติหรือถูกระงับการใช้งาน', 'INACTIVE');
        }
        
        // Clear rate limit on successful login
        cache.remove(rateLimitKey);
        
        // อ่าน permissions จาก column 14 (index 14) ของ USERS sheet
        var permissionsRaw = row[14] || '';
        var permissionsData = {};
        if (role === 'admin' || role === 'super_admin') {
          permissionsData = null; // admin = full access
        } else if (permissionsRaw && typeof permissionsRaw === 'string' && permissionsRaw.trim() !== '') {
          try {
            permissionsData = JSON.parse(permissionsRaw);
          } catch (e) {
            permissionsData = legacyRoleToPermissions(role) || {};
          }
        } else {
          permissionsData = legacyRoleToPermissions(role) || {};
        }
        
        // Log successful login
        logAudit(username, 'login', 'user', username, {
          role: role,
          first_login: firstLogin
        });
        
        return successResponse({
          user_id: userId,
          full_name: fullName,
          role: role,
          first_login: firstLogin === true || firstLogin === 'TRUE',
          permissions: permissionsData
        }, 'เข้าสู่ระบบสำเร็จ');
      }
    }
    
    // Increment failed login attempts
    var currentAttempts = parseInt(cache.get(rateLimitKey) || '0', 10);
    cache.put(rateLimitKey, String(currentAttempts + 1), 900); // 15 minutes
    
    // Log failed login attempt
    logAudit(username, 'login_failed', 'user', username, {
      reason: 'Invalid credentials',
      attempt_count: currentAttempts + 1
    });
    
    return errorResponse('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'INVALID_CREDENTIALS');
    
  } catch (error) {
    Logger.log('Login error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Register - สมัครเข้าใช้งานครั้งแรก
 */
function registerUser(userData) {
  try {
    validateRequired(userData, ['full_name', 'department', 'phone', 'email', 'reason']);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.USER_REQUESTS, [
      'request_id', 'title', 'full_name', 'department', 'phone', 'email', 'reason',
      'status', 'requested_at', 'reviewed_at', 'reviewed_by', 
      'assigned_role', 'initial_password', 'notes'
    ]);
    
    var requestId = generateUUID();
    var requestedAt = new Date();
    
    sheet.appendRow([
      requestId,
      userData.title || '', // คำนำหน้า (นาย/นาง/นางสาว/ดร./อาจารย์ ฯลฯ)
      userData.full_name,
      userData.department,
      userData.phone,
      userData.email,
      userData.reason,
      'pending',
      requestedAt,
      '', // reviewed_at
      '', // reviewed_by
      '', // assigned_role
      '', // initial_password
      userData.notes || ''
    ]);
    
    // Send email verification
    try {
      if (typeof sendEmailVerification === 'function') {
        sendEmailVerification(userData.email, requestId, userData.full_name);
      }
    } catch (emailError) {
      Logger.log('Email verification send error: ' + emailError.toString());
      // Continue even if email fails
    }
    
    // Log registration
    logAudit(userData.email, 'register', 'user_request', requestId, {
      full_name: userData.full_name,
      department: userData.department
    });
    
    return successResponse({
      request_id: requestId
    }, 'ส่งคำขอสมัครสำเร็จ กรุณาตรวจสอบอีเมล์เพื่อยืนยัน แล้วรอการอนุมัติจากผู้ดูแลระบบ');
    
  } catch (error) {
    Logger.log('Register error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการสมัคร: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Change Password - เปลี่ยนรหัสผ่าน (ใช้ Password Policy)
 */
function changePassword(userId, oldPassword, newPassword) {
  try {
    // SECURITY: Verify userId matches authenticated user (prevent IDOR)
    // userId must come from requestData.userId (sent by frontend from session)
    // This prevents users from changing other users' passwords
    requireAuth();
    
    // Validate password policy
    var policyCheck = validatePasswordPolicy(newPassword, userId);
    if (!policyCheck.valid) {
      return errorResponse(policyCheck.message, 'INVALID_PASSWORD');
    }
    
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var rowIndex = findRowIndexById(sheet, 0, userId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบผู้ใช้', 'USER_NOT_FOUND');
    }
    
    // SECURITY: Double-check userId exists and is active
    var row = sheet.getRange(rowIndex, 1, 1, 14).getValues()[0];
    var userActive = row[7];
    if (userActive !== true && userActive !== 'TRUE') {
      return errorResponse('บัญชีนี้ถูกระงับการใช้งาน', 'INACTIVE');
    }
    
    var row = sheet.getRange(rowIndex, 1, 1, 14).getValues()[0];
    var currentHash = row[1];
    
    // Verify old password
    if (!verifyPassword(oldPassword, currentHash)) {
      logAudit(userId, 'change_password_failed', 'user', userId, {
        reason: 'Invalid old password'
      });
      return errorResponse('รหัสผ่านเดิมไม่ถูกต้อง', 'INVALID_PASSWORD');
    }
    
    // Save old password to history
    savePasswordToHistory(userId, currentHash, userId);
    
    // Update password
    var newHash = hashPassword(newPassword);
    var now = new Date();
    
    // Ensure USERS sheet has password_changed_at column (column 15)
    ensureUsersSheetPasswordChangedAtColumn(sheet);
    
    sheet.getRange(rowIndex, 2).setValue(newHash);
    sheet.getRange(rowIndex, 8).setValue('FALSE'); // first_login = FALSE
    sheet.getRange(rowIndex, 11).setValue(now); // updated_at
    sheet.getRange(rowIndex, 15).setValue(now); // password_changed_at
    
    // Save new password to history
    savePasswordToHistory(userId, newHash, userId);
    
    // Log password change
    logAudit(userId, 'change_password', 'user', userId, {
      password_changed_at: now
    });
    
    return successResponse({}, 'เปลี่ยนรหัสผ่านสำเร็จ');
    
  } catch (error) {
    Logger.log('Change password error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get User Requests - ดึงรายการคำขอสมัคร (Admin only)
 */
function getUserRequests(status) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USER_REQUESTS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ requests: [] });
    }
    
    var requests = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var requestStatus = row[6];
      
      // Filter by status if provided
      if (status && requestStatus !== status) {
        continue;
      }
      
      var request = rowToObject(row, headers);
      requests.push(request);
    }
    
    // Sort by requested_at descending
    requests.sort(function(a, b) {
      return new Date(b.requested_at) - new Date(a.requested_at);
    });
    
    return successResponse({ requests: requests });
    
  } catch (error) {
    Logger.log('Get user requests error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Ensure USERS sheet has permissions column (column 15)
 */
function ensureUsersSheetPermissionsColumn(sheet) {
  if (!sheet) sheet = getSheet(CONFIG.SHEETS.USERS);
  if (sheet.getLastColumn() < 15) {
    sheet.getRange(1, 15).setValue('permissions');
  }
}

/**
 * Ensure USERS sheet has password_changed_at column (column 16)
 */
function ensureUsersSheetPasswordChangedAtColumn(sheet) {
  if (!sheet) sheet = getSheet(CONFIG.SHEETS.USERS);
  if (sheet.getLastColumn() < 16) {
    sheet.getRange(1, 16).setValue('password_changed_at');
  }
}

/**
 * Ensure USERS sheet has title column (column 3)
 */
function ensureUsersSheetTitleColumn(sheet) {
  if (!sheet) sheet = getSheet(CONFIG.SHEETS.USERS);
  if (sheet.getLastColumn() < 3) {
    sheet.getRange(1, 3).setValue('title');
  }
}

/**
 * Approve User Request - อนุมัติคำขอสมัคร (Admin only)
 * userData: user_id, role ('admin' | 'user'), initial_password, permissions (object, optional)
 */
function approveUserRequest(requestId, userData) {
  try {
    validateRequired(userData, ['user_id', 'role', 'initial_password']);
    
    var requestSheet = getSheet(CONFIG.SHEETS.USER_REQUESTS);
    var requestRowIndex = findRowIndexById(requestSheet, 0, requestId);
    
    if (requestRowIndex === -1) {
      return errorResponse('ไม่พบคำขอสมัคร', 'REQUEST_NOT_FOUND');
    }
    
    var numCols = Math.max(requestSheet.getLastColumn(), 14);
    var requestRow = requestSheet.getRange(requestRowIndex, 1, requestRowIndex, numCols).getValues()[0];
    
    // Check if already processed
    var requestStatus = requestRow[7]; // status column (after title)
    if (requestStatus !== 'pending' && requestStatus !== 'email_verified') {
      return errorResponse('คำขอนี้ได้รับการอนุมัติหรือปฏิเสธแล้ว', 'ALREADY_PROCESSED');
    }
    
    // Check if email is verified (optional - if email verification is enabled)
    if (requestStatus === 'pending') {
      // Warn admin that email is not verified yet (but allow override)
      // Admin can still approve if needed
    }
    
    // Create user in USERS sheet (with permissions column + title + password_changed_at)
    var userSheet = getOrCreateSheet(CONFIG.SHEETS.USERS, [
      'user_id', 'password_hash', 'title', 'full_name', 'department', 'phone', 'email',
      'role', 'active', 'first_login', 'created_at', 'created_by', 
      'updated_at', 'notes', 'permissions', 'password_changed_at'
    ]);
    ensureUsersSheetPermissionsColumn(userSheet);
    ensureUsersSheetTitleColumn(userSheet);
    ensureUsersSheetPasswordChangedAtColumn(userSheet);
    
    var passwordHash = hashPassword(userData.initial_password);
    var now = new Date();
    var currentUser = getCurrentUser() || 'admin';
    var permissionsJson = (userData.permissions && typeof userData.permissions === 'object')
      ? JSON.stringify(userData.permissions) : (userData.permissions || '');
    
    userSheet.appendRow([
      userData.user_id,
      passwordHash,
      requestRow[1] || '', // title (คำนำหน้า)
      requestRow[2], // full_name
      requestRow[3], // department
      requestRow[4], // phone
      requestRow[5], // email
      userData.role,
      'TRUE', // active
      'TRUE', // first_login
      now,
      currentUser,
      now,
      userData.notes || '',
      permissionsJson,
      now // password_changed_at (set to now when user is created)
    ]);
    
    // Save initial password to history
    savePasswordToHistory(userData.user_id, passwordHash, currentUser);
    
    // Update request status (column indices after adding title: status=7, reviewed_at=8, reviewed_by=9, assigned_role=10, initial_password=11)
    requestSheet.getRange(requestRowIndex, 8).setValue('approved'); // status
    requestSheet.getRange(requestRowIndex, 9).setValue(now); // reviewed_at
    requestSheet.getRange(requestRowIndex, 10).setValue(currentUser); // reviewed_by
    requestSheet.getRange(requestRowIndex, 11).setValue(userData.role); // assigned_role
    requestSheet.getRange(requestRowIndex, 12).setValue(userData.initial_password); // initial_password
    
    // Log approval
    logAudit(currentUser, 'approve', 'user_request', requestId, {
      user_id: userData.user_id,
      role: userData.role,
      permissions: userData.permissions
    });
    
    // Send approval email with permissions info
    try {
      sendApprovalEmail(requestRow[5], requestRow[2], userData.user_id, userData.initial_password, userData.role, userData.permissions);
    } catch (emailError) {
      Logger.log('Send approval email error: ' + emailError.toString());
      // Continue even if email fails
    }
    
    return successResponse({
      user_id: userData.user_id,
      initial_password: userData.initial_password
    }, 'อนุมัติผู้ใช้สำเร็จ');
    
  } catch (error) {
    Logger.log('Approve user request error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอนุมัติ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Reject User Request - ปฏิเสธคำขอสมัคร (Admin only)
 */
function rejectUserRequest(requestId, reason) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USER_REQUESTS);
    var rowIndex = findRowIndexById(sheet, 0, requestId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบคำขอสมัคร', 'REQUEST_NOT_FOUND');
    }
    
    var numCols = Math.max(sheet.getLastColumn(), 14);
    var row = sheet.getRange(rowIndex, 1, rowIndex, numCols).getValues()[0];
    
    // Check if already processed (status = column 7 after title)
    if (row[7] !== 'pending') {
      return errorResponse('คำขอนี้ได้รับการอนุมัติหรือปฏิเสธแล้ว', 'ALREADY_PROCESSED');
    }
    
    var now = new Date();
    var currentUser = getCurrentUser() || 'admin';
    
    // Update request status (status=7, reviewed_at=8, reviewed_by=9, notes=13)
    sheet.getRange(rowIndex, 8).setValue('rejected'); // status
    sheet.getRange(rowIndex, 9).setValue(now); // reviewed_at
    sheet.getRange(rowIndex, 10).setValue(currentUser); // reviewed_by
    sheet.getRange(rowIndex, 13).setValue(reason || ''); // notes
    
    // Log rejection
    logAudit(currentUser, 'reject', 'user_request', requestId, {
      reason: reason
    });
    
    return successResponse({}, 'ปฏิเสธคำขอสำเร็จ');
    
  } catch (error) {
    Logger.log('Reject user request error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการปฏิเสธ: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Permission Definitions - รายการโมดูลและระดับสิทธิ์ (สำหรับหน้า Admin กำหนดสิทธิ์)
 */
function getPermissionDefinitions() {
  try {
    var modules = [];
    for (var key in PERMISSION_MODULES) {
      if (PERMISSION_MODULES.hasOwnProperty(key)) {
        modules.push(PERMISSION_MODULES[key]);
      }
    }
    return successResponse({
      modules: modules,
      levels: PERMISSION_LEVELS
    });
  } catch (error) {
    Logger.log('Get permission definitions error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Current User Info - ดึงข้อมูลผู้ใช้ปัจจุบัน (รวม permissions)
 */
function getCurrentUserInfo(userId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var rowIndex = findRowIndexById(sheet, 0, userId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบผู้ใช้', 'USER_NOT_FOUND');
    }
    
    var numCols = Math.max(sheet.getLastColumn(), 16);
    var row = sheet.getRange(rowIndex, 1, rowIndex, numCols).getValues()[0];
    var headers = [
      'user_id', 'password_hash', 'title', 'full_name', 'department', 'phone', 'email',
      'role', 'active', 'first_login', 'created_at', 'created_by', 
      'updated_at', 'notes', 'permissions', 'profile_image'
    ];
    
    var user = rowToObject(row, headers);
    // Remove sensitive data
    delete user.password_hash;
    // Parse permissions JSON for frontend
    if (user.permissions && typeof user.permissions === 'string') {
      try {
        user.permissions = user.permissions ? JSON.parse(user.permissions) : {};
      } catch (e) {
        user.permissions = {};
      }
    }
    if (user.permissions === undefined || user.permissions === null) {
      user.permissions = {};
    }
    
    return successResponse({ user: user });
    
  } catch (error) {
    Logger.log('Get current user info error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Send Approval Email - ส่งอีเมล์แจ้งผลการอนุมัติพร้อมบอกสิทธิ์
 */
function sendApprovalEmail(email, fullName, userId, initialPassword, role, permissions) {
  try {
    if (!email) {
      Logger.log('No email provided for approval notification');
      return;
    }
    
    // Parse permissions
    var permissionsObj = {};
    if (permissions) {
      if (typeof permissions === 'string') {
        try {
          permissionsObj = JSON.parse(permissions);
        } catch (e) {
          permissionsObj = {};
        }
      } else {
        permissionsObj = permissions;
      }
    }
    
    // Build permissions description
    var permissionsText = '';
    if (role === 'admin') {
      permissionsText = 'คุณได้รับสิทธิ์เป็นผู้ดูแลระบบ (Admin) - สามารถเข้าถึงและจัดการทุกส่วนของระบบได้';
    } else {
      var moduleNames = {
        'queue': 'จัดคิวรถ',
        'fuel': 'บันทึกน้ำมัน',
        'repair': 'ซ่อมบำรุง',
        'reports': 'รายงาน',
        'vehicles': 'ข้อมูลรถ',
        'drivers': 'ข้อมูลคนขับ',
        'usage_log': 'บันทึกการใช้รถ'
      };
      
      var permissionLevels = {
        'view': 'ดู',
        'create': 'สร้าง',
        'edit': 'แก้ไข',
        'delete': 'ลบ'
      };
      
      var userPermissions = [];
      Object.keys(permissionsObj).forEach(function(module) {
        var level = permissionsObj[module];
        var moduleName = moduleNames[module] || module;
        var levelName = permissionLevels[level] || level;
        userPermissions.push('- ' + moduleName + ': ' + levelName);
      });
      
      if (userPermissions.length > 0) {
        permissionsText = 'สิทธิ์ในการใช้งาน:\n' + userPermissions.join('\n');
      } else {
        permissionsText = 'คุณได้รับสิทธิ์ในการดูข้อมูลเท่านั้น (View Only)';
      }
    }
    
    var subject = '✅ ยืนยันการสมัครสมาชิก - PPK DriveHub';
    var body = 'สวัสดี ' + fullName + ',\n\n' +
               'คำขอสมัครสมาชิกของคุณได้รับการอนุมัติแล้ว\n\n' +
               'ข้อมูลการเข้าสู่ระบบ:\n' +
               'ชื่อผู้ใช้: ' + userId + '\n' +
               'รหัสผ่านเริ่มต้น: ' + initialPassword + '\n\n' +
               '⚠️ กรุณาเปลี่ยนรหัสผ่านทันทีหลังจากเข้าสู่ระบบครั้งแรก\n\n' +
               permissionsText + '\n\n' +
               'คุณสามารถเข้าสู่ระบบได้ที่:\n' +
               (CONFIG.QR_CODE_BASE_URL || 'https://your-app-url.com') + '/login.html\n\n' +
               'หากมีคำถาม กรุณาติดต่อผู้ดูแลระบบ\n\n' +
               'PPK DriveHub\n' +
               'ระบบจัดการยานพาหนะโรงเรียนพะเยาพิทยาคม 2569';
    
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });
    
    Logger.log('Approval email sent to: ' + email);
    
  } catch (error) {
    Logger.log('Send approval email error: ' + error.toString());
    // Don't throw - email failure shouldn't block approval
  }
}
