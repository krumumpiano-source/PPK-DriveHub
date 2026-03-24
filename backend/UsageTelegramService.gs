/**
 * PPK DriveHub Usage Telegram Notification Service
 * แจ้งเตือน Telegram สำหรับบันทึกการใช้รถ (ออก/กลับ/auto-recovery)
 */

/**
 * Format Usage Telegram Message - สร้างข้อความ Telegram สำหรับบันทึกการใช้รถ
 */
function formatUsageTelegramMessage(record, action) {
  try {
    var car = getVehicleById(record.car_id);
    var driver = getDriverById(record.driver_id);
    var carInfo = (car.success && car.data && car.data.vehicle) ? car.data.vehicle : null;
    var driverInfo = (driver.success && driver.data && driver.data.driver) ? driver.data.driver : null;
    
    var carName = carInfo ? (carInfo.license_plate || '') : record.car_id;
    var driverName = driverInfo ? driverInfo.full_name : record.driver_id;
    
    var emoji = '';
    var title = '';
    if (action === 'before_trip') {
      emoji = '🚗';
      title = 'ออกเดินทาง';
    } else if (action === 'after_trip') {
      emoji = '🏁';
      title = 'กลับจากเดินทาง';
    } else if (action === 'auto_recovery') {
      emoji = '🤖';
      title = 'ระบบบันทึกอัตโนมัติ';
    }
    
    var message = emoji + ' <b>' + title + '</b>\n\n';
    message += '🚗 <b>รถ:</b> ' + carName + '\n';
    message += '👤 <b>คนขับ:</b> ' + driverName + '\n';
    
    if (record.datetime) {
      if (!record.datetime || typeof record.datetime !== 'string') {
        continue; // Skip invalid datetime
      }
      var dtParts = record.datetime.split(' ');
      if (dtParts.length >= 1) message += '📅 <b>วันที่:</b> ' + formatDateThai(dtParts[0]) + '\n';
      if (dtParts.length >= 2) message += '🕐 <b>เวลา:</b> ' + dtParts[1] + '\n';
    }
    
    if (record.requested_by) message += '👥 <b>ผู้ขอใช้:</b> ' + record.requested_by + '\n';
    if (record.destination && action === 'before_trip') {
      message += '📍 <b>จุดหมายปลายทาง:</b> ' + record.destination + '\n';
    }
    if (record.mileage) message += '📊 <b>เลขไมล์:</b> ' + record.mileage.toLocaleString() + ' กม.\n';
    
    if (action === 'auto_recovery') {
      message += '\nหมายเหตุ: ' + (record.auto_reason === 'forgot_out' ? 'ไม่พบบันทึกก่อนออก ระบบดำเนินการแทน' : 
                                    record.auto_reason === 'forgot_in' ? 'ไม่พบบันทึกกลับ ระบบดำเนินการแทน' : 
                                    'ระบบบันทึกอัตโนมัติ');
    }
    
    return message;
  } catch (error) {
    Logger.log('Format usage telegram message error: ' + error.toString());
    return 'แจ้งบันทึกการใช้รถ\n\nเกิดข้อผิดพลาดในการสร้างข้อความ';
  }
}

/**
 * Send Usage Before Trip Telegram - แจ้งเตือนเมื่อบันทึกก่อนออกเดินทาง
 */
function sendUsageBeforeTripTelegram(record) {
  try {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
    var message = formatUsageTelegramMessage(record, 'before_trip');
    sendTelegramNotification(message);
  } catch (error) {
    Logger.log('Send usage before trip telegram error: ' + error.toString());
  }
}

/**
 * Send Usage After Trip Telegram - แจ้งเตือนเมื่อบันทึกกลับจากเดินทาง
 */
function sendUsageAfterTripTelegram(record) {
  try {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
    var message = formatUsageTelegramMessage(record, 'after_trip');
    sendTelegramNotification(message);
  } catch (error) {
    Logger.log('Send usage after trip telegram error: ' + error.toString());
  }
}

/**
 * Send Usage Auto Recovery Telegram - แจ้งเตือนเมื่อระบบบันทึกอัตโนมัติ
 */
function sendUsageAutoRecoveryTelegram(record) {
  try {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
    var message = formatUsageTelegramMessage(record, 'auto_recovery');
    sendTelegramNotification(message);
  } catch (error) {
    Logger.log('Send usage auto recovery telegram error: ' + error.toString());
  }
}

/**
 * Format Date Thai - แปลงวันที่เป็นภาษาไทย
 */
function formatDateThai(dateStr) {
  try {
    if (!dateStr) return '';
    var date = new Date(dateStr + 'T00:00:00');
    var thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    var day = date.getDate();
    var month = thaiMonths[date.getMonth()];
    var year = date.getFullYear() + 543; // พ.ศ.
    return day + ' ' + month + ' ' + year;
  } catch (e) {
    return dateStr;
  }
}
