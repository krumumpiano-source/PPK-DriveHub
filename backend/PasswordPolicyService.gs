/**
 * PPK DriveHub Password Policy Service
 * นโยบายรหัสผ่าน: อย่างน้อย 8 ตัว, มีอักษร+ตัวเลข+เครื่องหมาย, ไม่ซ้ำของเดิม
 */

/**
 * Validate Password Policy - ตรวจสอบว่ารหัสผ่านตรงตามนโยบาย
 */
function validatePasswordPolicy(password, userId) {
  try {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'รหัสผ่านไม่ถูกต้อง' };
    }
    
    // 1. อย่างน้อย 8 ตัวอักษร
    if (password.length < 8) {
      return { valid: false, message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' };
    }
    
    // 2. มีอักษรภาษาอังกฤษ (เล็กหรือใหญ่)
    var hasLetter = /[a-zA-Z]/.test(password);
    if (!hasLetter) {
      return { valid: false, message: 'รหัสผ่านต้องมีอักษรภาษาอังกฤษอย่างน้อย 1 ตัว' };
    }
    
    // 3. มีตัวเลข
    var hasNumber = /[0-9]/.test(password);
    if (!hasNumber) {
      return { valid: false, message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว' };
    }
    
    // 4. มีเครื่องหมายพิเศษ
    var hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasSpecial) {
      return { valid: false, message: 'รหัสผ่านต้องมีเครื่องหมายพิเศษอย่างน้อย 1 ตัว (!@#$%^&*()_+-=[]{}|;:,.<>?)' };
    }
    
    // 5. ไม่ซ้ำของเดิม (ถ้ามี userId)
    if (userId) {
      var historyCheck = checkPasswordHistory(userId, password);
      if (!historyCheck.allowed) {
        return { valid: false, message: historyCheck.message || 'รหัสผ่านนี้เคยใช้แล้ว กรุณาใช้รหัสผ่านใหม่' };
      }
    }
    
    return { valid: true, message: 'รหัสผ่านตรงตามนโยบาย' };
    
  } catch (error) {
    Logger.log('Validate password policy error: ' + error.toString());
    return { valid: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน' };
  }
}

/**
 * Check Password History - ตรวจสอบว่ารหัสผ่านซ้ำกับของเดิมหรือไม่
 */
function checkPasswordHistory(userId, newPassword) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.PASSWORD_HISTORY, [
      'history_id', 'user_id', 'password_hash', 'changed_at', 'changed_by'
    ]);
    
    var newHash = hashPassword(newPassword);
    var data = sheet.getDataRange().getValues();
    
    // ตรวจสอบรหัสผ่านปัจจุบัน
    var userSheet = getSheet(CONFIG.SHEETS.USERS);
    var userRowIndex = findRowIndexById(userSheet, 0, userId);
    if (userRowIndex > 0) {
      var currentHash = userSheet.getRange(userRowIndex, 2).getValue(); // password_hash column
      if (newHash === currentHash) {
        return { allowed: false, message: 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน' };
      }
    }
    
    // ตรวจสอบประวัติรหัสผ่าน (เก็บย้อนหลัง 5 รหัสผ่านล่าสุด)
    var userHistory = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === userId) { // user_id column
        userHistory.push(data[i][2]); // password_hash
      }
    }
    
    // เรียงตาม changed_at ล่าสุด (ถ้ามี)
    userHistory = userHistory.slice(-5); // เก็บแค่ 5 รหัสผ่านล่าสุด
    
    for (var j = 0; j < userHistory.length; j++) {
      if (userHistory[j] === newHash) {
        return { allowed: false, message: 'รหัสผ่านนี้เคยใช้แล้ว กรุณาใช้รหัสผ่านใหม่' };
      }
    }
    
    return { allowed: true };
    
  } catch (error) {
    Logger.log('Check password history error: ' + error.toString());
    return { allowed: true }; // ถ้า error ให้อนุญาต (ไม่บล็อก)
  }
}

/**
 * Save Password to History - บันทึกรหัสผ่านลงประวัติ
 */
function savePasswordToHistory(userId, passwordHash, changedBy) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.PASSWORD_HISTORY, [
      'history_id', 'user_id', 'password_hash', 'changed_at', 'changed_by'
    ]);
    
    var historyId = generateUUID();
    var now = new Date();
    
    sheet.appendRow([
      historyId,
      userId,
      passwordHash,
      now,
      changedBy || userId
    ]);
    
    // ลบประวัติเก่าเกิน 5 รายการต่อ user (เก็บแค่ 5 ล่าสุด)
    var data = sheet.getDataRange().getValues();
    var userHistoryRows = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === userId) {
        userHistoryRows.push({ row: i + 1, changedAt: data[i][3] });
      }
    }
    
    if (userHistoryRows.length > 5) {
      // เรียงตาม changed_at (เก่าที่สุดก่อน)
      userHistoryRows.sort(function(a, b) {
        return new Date(a.changedAt) - new Date(b.changedAt);
      });
      
      // ลบแถวเก่าที่เกิน 5
      for (var j = 0; j < userHistoryRows.length - 5; j++) {
        sheet.deleteRow(userHistoryRows[j].row - j); // -j เพราะลบแล้ว index เลื่อน
      }
    }
    
  } catch (error) {
    Logger.log('Save password to history error: ' + error.toString());
    // ไม่ throw error เพราะไม่ใช่ critical
  }
}

/**
 * Forgot Password - ขอลืมรหัสผ่าน
 */
function forgotPassword(email) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USERS);
    var data = sheet.getDataRange().getValues();
    
    var userFound = null;
    for (var i = 1; i < data.length; i++) {
      if (data[i][5] === email) { // email column
        userFound = {
          user_id: data[i][0],
          full_name: data[i][2],
          email: data[i][5],
          active: data[i][7]
        };
        break;
      }
    }
    
    if (!userFound) {
      // ไม่บอกว่า email ไม่มีในระบบ (เพื่อความปลอดภัย)
      return successResponse({}, 'หากอีเมล์นี้มีในระบบ จะได้รับอีเมล์รีเซ็ตรหัสผ่าน');
    }
    
    if (userFound.active !== true && userFound.active !== 'TRUE') {
      return errorResponse('บัญชีนี้ยังไม่ได้รับอนุมัติหรือถูกระงับการใช้งาน', 'INACTIVE');
    }
    
    // สร้าง reset token
    var resetToken = generateUUID();
    var resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 24); // หมดอายุ 24 ชั่วโมง
    
    // เก็บ token ใน RESET_PASSWORD_REQUESTS sheet
    var resetSheet = getOrCreateSheet(CONFIG.SHEETS.RESET_PASSWORD_REQUESTS, [
      'request_id', 'user_id', 'email', 'reset_token', 'expires_at', 'status', 'requested_at', 'reset_at', 'reset_by'
    ]);
    
    resetSheet.appendRow([
      generateUUID(),
      userFound.user_id,
      email,
      resetToken,
      resetExpiry,
      'pending',
      new Date(),
      '',
      ''
    ]);
    
    // ส่งอีเมล์
    var resetUrl = CONFIG.QR_CODE_BASE_URL + '/reset-password?token=' + resetToken + '&email=' + encodeURIComponent(email);
    var subject = 'รีเซ็ตรหัสผ่าน - PPK DriveHub';
    var body = 'สวัสดี ' + userFound.full_name + ',\n\n' +
               'คุณได้ขอรีเซ็ตรหัสผ่าน กรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:\n\n' +
               resetUrl + '\n\n' +
               'ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง\n' +
               'หากคุณไม่ได้ขอลืมรหัสผ่าน กรุณาเพิกเฉยอีเมล์นี้\n\n' +
               'PPK DriveHub';
    
    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: body
      });
    } catch (emailError) {
      Logger.log('Send reset password email error: ' + emailError.toString());
      return errorResponse('ไม่สามารถส่งอีเมล์ได้ กรุณาติดต่อผู้ดูแลระบบ', 'EMAIL_ERROR');
    }
    
    // Log
    logAudit(userFound.user_id, 'forgot_password_request', 'user', userFound.user_id, {
      email: email
    });
    
    return successResponse({}, 'หากอีเมล์นี้มีในระบบ จะได้รับอีเมล์รีเซ็ตรหัสผ่าน');
    
  } catch (error) {
    Logger.log('Forgot password error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Reset Password Confirm - ยืนยันรีเซ็ตรหัสผ่าน
 */
function resetPasswordConfirm(token, email, newPassword) {
  try {
    // Validate password policy
    var policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      return errorResponse(policyCheck.message, 'INVALID_PASSWORD');
    }
    
    var resetSheet = getOrCreateSheet(CONFIG.SHEETS.RESET_PASSWORD_REQUESTS, [
      'request_id', 'user_id', 'email', 'reset_token', 'expires_at', 'status', 'requested_at', 'reset_at', 'reset_by'
    ]);
    
    var data = resetSheet.getDataRange().getValues();
    var requestFound = null;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][3] === token && data[i][2] === email && data[i][5] === 'pending') {
        var expiresAt = new Date(data[i][4]);
        if (expiresAt > new Date()) {
          requestFound = {
            row: i + 1,
            user_id: data[i][1],
            request_id: data[i][0]
          };
          break;
        }
      }
    }
    
    if (!requestFound) {
      return errorResponse('Token ไม่ถูกต้องหรือหมดอายุ', 'INVALID_TOKEN');
    }
    
    // Update password
    var userSheet = getSheet(CONFIG.SHEETS.USERS);
    var userRowIndex = findRowIndexById(userSheet, 0, requestFound.user_id);
    
    if (userRowIndex === -1) {
      return errorResponse('ไม่พบผู้ใช้', 'USER_NOT_FOUND');
    }
    
    var oldHash = userSheet.getRange(userRowIndex, 2).getValue();
    var newHash = hashPassword(newPassword);
    
    // Save old password to history
    savePasswordToHistory(requestFound.user_id, oldHash, 'SYSTEM');
    
    // Update password
    userSheet.getRange(userRowIndex, 2).setValue(newHash);
    userSheet.getRange(userRowIndex, 8).setValue('FALSE'); // first_login = FALSE
    userSheet.getRange(userRowIndex, 11).setValue(new Date()); // updated_at
    
    // Mark reset request as completed
    resetSheet.getRange(requestFound.row, 6).setValue('completed');
    resetSheet.getRange(requestFound.row, 7).setValue(new Date()); // reset_at
    resetSheet.getRange(requestFound.row, 8).setValue('SYSTEM'); // reset_by
    
    // Save new password to history
    savePasswordToHistory(requestFound.user_id, newHash, 'SYSTEM');
    
    // Log
    logAudit(requestFound.user_id, 'reset_password', 'user', requestFound.user_id, {
      method: 'forgot_password'
    });
    
    return successResponse({}, 'รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
    
  } catch (error) {
    Logger.log('Reset password confirm error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}
