/**
 * PPK DriveHub Email Verification Service
 * ยืนยันอีเมล์เมื่อสมัครใช้งาน
 */

/**
 * Send Email Verification - ส่งอีเมล์ยืนยัน
 */
function sendEmailVerification(email, requestId, fullName) {
  try {
    var verificationToken = generateUUID();
    var verificationUrl = CONFIG.QR_CODE_BASE_URL + '/verify-email?token=' + verificationToken + '&request_id=' + requestId;
    
    // Store verification token (in USER_REQUESTS sheet or separate VERIFICATION_TOKENS sheet)
    var sheet = getSheet(CONFIG.SHEETS.USER_REQUESTS);
    var data = sheet.getDataRange().getValues();
    var requestIdCol = 0;
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][requestIdCol] === requestId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex > 0) {
      // Store token in notes or create VERIFICATION_TOKENS sheet
      var notesCol = 11; // notes column
      var currentNotes = sheet.getRange(rowIndex, notesCol).getValue() || '';
      sheet.getRange(rowIndex, notesCol).setValue(currentNotes + '\n[VERIFICATION_TOKEN: ' + verificationToken + ']');
    }
    
    // Send email
    var subject = 'ยืนยันอีเมล์ - PPK DriveHub';
    var body = 'สวัสดี ' + fullName + ',\n\n' +
               'กรุณาคลิกลิงก์ด้านล่างเพื่อยืนยันอีเมล์ของคุณ:\n\n' +
               verificationUrl + '\n\n' +
               'หากคุณไม่ได้สมัครใช้งานระบบนี้ กรุณาเพิกเฉยอีเมล์นี้\n\n' +
               'PPK DriveHub';
    
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: body
    });
    
    return successResponse({ verification_token: verificationToken }, 'ส่งอีเมล์ยืนยันสำเร็จ');
    
  } catch (error) {
    Logger.log('Send email verification error: ' + error.toString());
    return errorResponse('ไม่สามารถส่งอีเมล์ยืนยันได้: ' + error.toString(), 'EMAIL_ERROR');
  }
}

/**
 * Verify Email - ยืนยันอีเมล์
 */
function verifyEmail(token, requestId) {
  try {
    var sheet = getSheet(CONFIG.SHEETS.USER_REQUESTS);
    var data = sheet.getDataRange().getValues();
    var requestIdCol = 0;
    var statusCol = 6;
    var notesCol = 11;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][requestIdCol] === requestId) {
        var notes = data[i][notesCol] || '';
        if (notes.indexOf('[VERIFICATION_TOKEN: ' + token + ']') !== -1 || notes.indexOf('VERIFICATION_TOKEN: ' + token) !== -1) {
          // Mark as verified
          var currentStatus = data[i][statusCol];
          if (currentStatus === 'pending') {
            sheet.getRange(i + 1, statusCol + 1).setValue('email_verified');
            var newNotes = notes.replace(/\[VERIFICATION_TOKEN: [^\]]+\]/g, '[EMAIL_VERIFIED]');
            sheet.getRange(i + 1, notesCol + 1).setValue(newNotes);
            return successResponse({}, 'ยืนยันอีเมล์สำเร็จ กรุณารอการอนุมัติจากผู้ดูแลระบบ');
          } else if (currentStatus === 'email_verified') {
            return successResponse({}, 'อีเมล์ได้รับการยืนยันแล้ว กรุณารอการอนุมัติจากผู้ดูแลระบบ');
          } else {
            return errorResponse('คำขอนี้ได้รับการอนุมัติหรือปฏิเสธแล้ว', 'ALREADY_PROCESSED');
          }
        }
      }
    }
    
    return errorResponse('Token ไม่ถูกต้องหรือหมดอายุ', 'INVALID_TOKEN');
    
  } catch (error) {
    Logger.log('Verify email error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการยืนยันอีเมล์: ' + error.toString(), 'SERVER_ERROR');
  }
}
