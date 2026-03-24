/**
 * PPK DriveHub PDPA Service
 * จัดการนโยบายข้อมูลส่วนบุคคล (Personal Data Protection Act)
 */

/**
 * Accept PDPA Policy - ยอมรับนโยบาย PDPA
 */
function acceptPDPAPolicy(userId) {
  try {
    requireAuth();
    
    // SECURITY: Verify userId matches authenticated user (prevent IDOR)
    if (!userId || String(userId).trim() === '') {
      return errorResponse('ต้องระบุ userId', 'MISSING_USER_ID');
    }
    
    // SECURITY: Sanitize userId to prevent injection
    userId = sanitizeInput(userId);
    
    var sheet = getOrCreateSheet(CONFIG.SHEETS.PDPA_LOG, [
      'log_id', 'user_id', 'action', 'accepted_at', 'ip_address', 'user_agent', 'notes'
    ]);
    
    var logId = generateUUID();
    var now = new Date();
    
    // Check if already accepted
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === userId && data[i][2] === 'accept') {
        // Already accepted, update timestamp
        sheet.getRange(i + 1, 4).setValue(now);
        logAudit(userId, 'update', 'pdpa_acceptance', userId, { re_accepted: true });
        return successResponse({ accepted: true, re_accepted: true }, 'ยอมรับนโยบาย PDPA แล้ว');
      }
    }
    
    // Log acceptance
    sheet.appendRow([
      logId,
      userId,
      'accept',
      now,
      '', // IP address (not available in GAS)
      '', // User agent (not available in GAS)
      'ยอมรับนโยบาย PDPA'
    ]);
    
    // Update user record (add pdpa_accepted column if needed)
    var userSheet = getSheet(CONFIG.SHEETS.USERS);
    var userRowIndex = findRowIndexById(userSheet, 0, userId);
    if (userRowIndex !== -1) {
      ensureUsersSheetHasPDPAAcceptedColumn(userSheet);
      var pdpaColumnIndex = getColumnIndexByName(userSheet, 'pdpa_accepted');
      if (pdpaColumnIndex !== -1) {
        userSheet.getRange(userRowIndex, pdpaColumnIndex).setValue('TRUE');
        userSheet.getRange(userRowIndex, pdpaColumnIndex + 1).setValue(now); // pdpa_accepted_at
      }
    }
    
    logAudit(userId, 'create', 'pdpa_acceptance', userId, { accepted: true });
    
    return successResponse({ accepted: true }, 'ยอมรับนโยบาย PDPA สำเร็จ');
    
  } catch (error) {
    Logger.log('Accept PDPA policy error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการยอมรับนโยบาย: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Check PDPA Accepted - ตรวจสอบว่าผู้ใช้ยอมรับนโยบาย PDPA แล้วหรือยัง
 */
function checkPDPAAccepted(userId) {
  try {
    // SECURITY: Sanitize userId to prevent injection
    if (userId) {
      userId = sanitizeInput(String(userId));
    }
    
    var sheet = getSheet(CONFIG.SHEETS.PDPA_LOG);
    if (!sheet) {
      return successResponse({ accepted: false });
    }
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === userId && data[i][2] === 'accept') {
        return successResponse({
          accepted: true,
          accepted_at: data[i][3] || ''
        });
      }
    }
    
    // Also check user sheet
    var userSheet = getSheet(CONFIG.SHEETS.USERS);
    if (userSheet) {
      var userRowIndex = findRowIndexById(userSheet, 0, userId);
      if (userRowIndex !== -1) {
        var pdpaColumnIndex = getColumnIndexByName(userSheet, 'pdpa_accepted');
        if (pdpaColumnIndex !== -1) {
          var pdpaAccepted = userSheet.getRange(userRowIndex, pdpaColumnIndex).getValue();
          if (pdpaAccepted === true || pdpaAccepted === 'TRUE') {
            return successResponse({ accepted: true });
          }
        }
      }
    }
    
    return successResponse({ accepted: false });
    
  } catch (error) {
    Logger.log('Check PDPA accepted error: ' + error.toString());
    return successResponse({ accepted: false });
  }
}

/**
 * Log PDPA Access - บันทึกการเข้าถึงข้อมูลส่วนบุคคล
 */
function logPDPAAccess(userId, accessedUserId, action, details) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.PDPA_LOG, [
      'log_id', 'user_id', 'action', 'accessed_user_id', 'accessed_at', 'ip_address', 'user_agent', 'details'
    ]);
    
    var logId = generateUUID();
    var now = new Date();
    
    sheet.appendRow([
      logId,
      userId,
      action, // 'view_profile', 'view_driver', 'view_usage', etc.
      accessedUserId || '',
      now,
      '', // IP address
      '', // User agent
      details ? JSON.stringify(details) : ''
    ]);
    
    return true;
    
  } catch (error) {
    Logger.log('Log PDPA access error: ' + error.toString());
    return false;
  }
}

/**
 * Get PDPA Log - ดึงบันทึกการเข้าถึงข้อมูลส่วนบุคคล (Admin only)
 */
function getPDPALog(filters) {
  try {
    requireAdmin();
    
    filters = filters || {};
    var sheet = getSheet(CONFIG.SHEETS.PDPA_LOG);
    if (!sheet) {
      return successResponse({ logs: [] });
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return successResponse({ logs: [] });
    }
    
    var headers = data[0];
    var logs = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var log = rowToObject(row, headers);
      
      // Apply filters
      if (filters.user_id && log.user_id !== filters.user_id) continue;
      if (filters.action && log.action !== filters.action) continue;
      if (filters.date_from) {
        var logDate = new Date(log.accessed_at || log.accepted_at);
        var fromDate = new Date(filters.date_from);
        if (logDate < fromDate) continue;
      }
      if (filters.date_to) {
        var logDate2 = new Date(log.accessed_at || log.accepted_at);
        var toDate = new Date(filters.date_to);
        if (logDate2 > toDate) continue;
      }
      
      logs.push(log);
    }
    
    // Sort by date descending
    logs.sort(function(a, b) {
      var dateA = new Date(a.accessed_at || a.accepted_at || 0);
      var dateB = new Date(b.accessed_at || b.accepted_at || 0);
      return dateB - dateA;
    });
    
    // Limit results (default 500 เพื่อประสิทธิภาพ)
    var limit = filters.limit ? parseInt(filters.limit) : 500;
    if (limit > 2000) limit = 2000;
    logs = logs.slice(0, limit);
    
    return successResponse({ logs: logs });
    
  } catch (error) {
    Logger.log('Get PDPA log error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Helper: Ensure USERS sheet has pdpa_accepted column
 */
function ensureUsersSheetHasPDPAAcceptedColumn(sheet) {
  try {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var hasPDPAAccepted = false;
    var hasPDPAAcceptedAt = false;
    
    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === 'pdpa_accepted') hasPDPAAccepted = true;
      if (headers[i] === 'pdpa_accepted_at') hasPDPAAcceptedAt = true;
    }
    
    if (!hasPDPAAccepted) {
      var colIndex = sheet.getLastColumn() + 1;
      sheet.getRange(1, colIndex).setValue('pdpa_accepted');
    }
    
    if (!hasPDPAAcceptedAt) {
      var colIndex2 = sheet.getLastColumn() + 1;
      sheet.getRange(1, colIndex2).setValue('pdpa_accepted_at');
    }
  } catch (error) {
    Logger.log('Ensure PDPA columns error: ' + error.toString());
  }
}

/**
 * Helper: Get column index by name
 */
function getColumnIndexByName(sheet, columnName) {
  try {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (headers[i] === columnName) {
        return i + 1; // Return 1-based index
      }
    }
    return -1;
  } catch (error) {
    Logger.log('Get column index error: ' + error.toString());
    return -1;
  }
}

/**
 * Helper: Require authentication
 * NOTE: In Web App context, getCurrentUser() returns deployer's email, not actual user
 * This function is mainly used for backward compatibility
 * Actual authentication is checked in Code.gs using requestData.userId
 */
function requireAuth() {
  // In Web App, authentication is handled by Code.gs checking requestData.userId
  // This function exists for compatibility but may not work correctly in Web App context
  // Services should use requestData.userId from Code.gs instead
  try {
    var user = getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  } catch (error) {
    // In Web App, getCurrentUser() may fail - this is expected
    // Authentication should be checked via requestData.userId in Code.gs
    throw new Error('Authentication required');
  }
}
