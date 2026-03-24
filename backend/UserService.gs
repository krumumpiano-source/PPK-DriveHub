/**
 * PPK DriveHub User Service
 * จัดการข้อมูลผู้ใช้ (Admin functions)
 */

/**
 * Get All Users - ดึงรายการผู้ใช้ทั้งหมด (Admin only)
 */
function getAllUsers(includeInactive) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return successResponse({ users: [] });
    }
    
    var users = [];
    var headers = data[0];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var active = row[7];
      
      // Filter inactive if not including them
      if (!includeInactive && active !== true && active !== 'TRUE') {
        continue;
      }
      
      var user = rowToObject(row, headers);
      // Remove sensitive data
      delete user.password_hash;
      // Parse permissions for frontend
      if (user.permissions && typeof user.permissions === 'string') {
        try { user.permissions = user.permissions ? JSON.parse(user.permissions) : {}; } catch (e) { user.permissions = {}; }
      }
      if (user.permissions === undefined || user.permissions === null) user.permissions = {};
      users.push(user);
    }
    
    return successResponse({ users: users });
    
  } catch (error) {
    Logger.log('Get all users error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update User - แก้ไขข้อมูลผู้ใช้ (Admin only)
 */
function updateUser(userId, userData) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var rowIndex = findRowIndexById(sheet, 0, userId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบผู้ใช้', 'USER_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Update fields
    if (userData.full_name !== undefined) {
      sheet.getRange(rowIndex, 3).setValue(userData.full_name);
    }
    if (userData.department !== undefined) {
      sheet.getRange(rowIndex, 4).setValue(userData.department);
    }
    if (userData.phone !== undefined) {
      sheet.getRange(rowIndex, 5).setValue(userData.phone);
    }
    if (userData.email !== undefined) {
      sheet.getRange(rowIndex, 6).setValue(userData.email);
    }
    if (userData.role !== undefined) {
      sheet.getRange(rowIndex, 7).setValue(userData.role);
    }
    if (userData.active !== undefined) {
      sheet.getRange(rowIndex, 8).setValue(userData.active ? 'TRUE' : 'FALSE');
    }
    if (userData.notes !== undefined) {
      sheet.getRange(rowIndex, 13).setValue(userData.notes);
    }
    if (userData.permissions !== undefined) {
      ensureUsersSheetPermissionsColumn(sheet);
      var permStr = (typeof userData.permissions === 'object')
        ? JSON.stringify(userData.permissions) : String(userData.permissions || '');
      sheet.getRange(rowIndex, 14).setValue(permStr);
    }
    if (userData.profile_image !== undefined) {
      // Ensure profile_image column exists (column 15)
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var profileImageColIndex = headers.indexOf('profile_image');
      if (profileImageColIndex === -1) {
        // Add profile_image column
        profileImageColIndex = sheet.getLastColumn() + 1;
        sheet.getRange(1, profileImageColIndex).setValue('profile_image');
      } else {
        profileImageColIndex = profileImageColIndex + 1; // Convert to 1-based index
      }
      sheet.getRange(rowIndex, profileImageColIndex).setValue(userData.profile_image);
    }
    
    // Update updated_at
    sheet.getRange(rowIndex, 12).setValue(now);
    
    // Log update
    logAudit(currentUser, 'update', 'user', userId, userData);
    
    return successResponse({}, 'อัปเดตข้อมูลผู้ใช้สำเร็จ');
    
  } catch (error) {
    Logger.log('Update user error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดต: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Deactivate User - ระงับการใช้งานผู้ใช้ (Admin only)
 */
function deactivateUser(userId, reason) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var rowIndex = findRowIndexById(sheet, 0, userId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบผู้ใช้', 'USER_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var now = new Date();
    
    // Set active to FALSE
    sheet.getRange(rowIndex, 8).setValue('FALSE');
    sheet.getRange(rowIndex, 12).setValue(now); // updated_at
    
    // Add reason to notes
    if (reason) {
      var currentNotes = sheet.getRange(rowIndex, 13).getValue();
      var newNotes = currentNotes + '\n[ระงับการใช้งาน: ' + formatDate(now) + '] ' + reason;
      sheet.getRange(rowIndex, 13).setValue(newNotes);
    }
    
    // Log deactivation
    logAudit(currentUser, 'update', 'user', userId, {
      action: 'deactivate',
      reason: reason
    });
    
    return successResponse({}, 'ระงับการใช้งานผู้ใช้สำเร็จ');
    
  } catch (error) {
    Logger.log('Deactivate user error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการระงับการใช้งาน: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Reset Password - รีเซ็ตรหัสผ่านผู้ใช้ (Admin only)
 */
function resetUserPassword(userId, newPassword) {
  try {
    if (!newPassword || newPassword.length < 6) {
      return errorResponse('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'INVALID_PASSWORD');
    }
    
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var rowIndex = findRowIndexById(sheet, 0, userId);
    
    if (rowIndex === -1) {
      return errorResponse('ไม่พบผู้ใช้', 'USER_NOT_FOUND');
    }
    
    var currentUser = getCurrentUser() || 'admin';
    var passwordHash = hashPassword(newPassword);
    var now = new Date();
    
    // Update password
    sheet.getRange(rowIndex, 2).setValue(passwordHash);
    sheet.getRange(rowIndex, 9).setValue('TRUE'); // first_login = TRUE (force change)
    sheet.getRange(rowIndex, 12).setValue(now); // updated_at
    
    // Log password reset
    logAudit(currentUser, 'update', 'user', userId, {
      action: 'reset_password'
    });
    
    return successResponse({
      new_password: newPassword
    }, 'รีเซ็ตรหัสผ่านสำเร็จ');
    
  } catch (error) {
    Logger.log('Reset password error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน: ' + error.toString(), 'SERVER_ERROR');
  }
}
