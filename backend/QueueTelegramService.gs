/**
 * PPK DriveHub Queue Telegram Notification Service
 * แจ้งเตือน Telegram สำหรับคิวรถ (สร้าง/แก้ไข/ยกเลิก)
 */

/**
 * Format Queue Telegram Message - สร้างข้อความ Telegram สำหรับคิว
 */
function formatQueueTelegramMessage(queue, action) {
  try {
    var car = getVehicleById(queue.car_id);
    var driver = getDriverById(queue.driver_id);
    var carInfo = (car.success && car.data && car.data.vehicle) ? car.data.vehicle : null;
    var driverInfo = (driver.success && driver.data && driver.data.driver) ? driver.data.driver : null;
    
    var carName = carInfo ? (carInfo.license_plate || '') + ' ' + (carInfo.brand || '') + ' ' + (carInfo.model || '') : queue.car_id;
    var driverName = driverInfo ? driverInfo.full_name : queue.driver_id;
    
    var emoji = '';
    var title = '';
    if (action === 'create') {
      emoji = '✅';
      title = 'แจ้งคิวรถ';
    } else if (action === 'update') {
      emoji = '⚠️';
      title = 'แจ้งแก้ไขคิวรถ';
    } else if (action === 'cancel') {
      emoji = '❌';
      title = 'แจ้งยกเลิกคิว';
    }
    
    var message = emoji + ' <b>' + title + '</b>\n\n';
    message += '🚗 <b>รถ:</b> ' + carName + '\n';
    message += '👤 <b>คนขับ:</b> ' + driverName + '\n';
    if (queue.requested_by) message += '👥 <b>ผู้ขอใช้:</b> ' + queue.requested_by + '\n';
    if (queue.destination) {
      message += '📍 <b>เส้นทาง:</b> โรงเรียน → ' + queue.destination + '\n';
    } else if (queue.mission) {
      message += '📍 <b>ภารกิจ:</b> ' + queue.mission + '\n';
    }
    message += '📅 <b>วันที่:</b> ' + formatDateThai(queue.date) + '\n';
    if (queue.time_start) {
      message += '🕐 <b>เวลา:</b> ' + queue.time_start;
      if (queue.time_end) message += ' - ' + queue.time_end;
      message += '\n';
    }
    if (queue.passenger_count) message += '👥 <b>ผู้โดยสาร:</b> ' + queue.passenger_count + ' คน\n';
    
    return message;
  } catch (error) {
    Logger.log('Format queue telegram message error: ' + error.toString());
    return 'แจ้งคิวรถ\n\nเกิดข้อผิดพลาดในการสร้างข้อความ';
  }
}

/**
 * Send Queue Create Telegram - แจ้งเตือนเมื่อสร้างคิว
 */
function sendQueueCreateTelegram(queue) {
  try {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
    var message = formatQueueTelegramMessage(queue, 'create');
    sendTelegramNotification(message);
  } catch (error) {
    Logger.log('Send queue create telegram error: ' + error.toString());
  }
}

/**
 * Send Queue Update Telegram - แจ้งเตือนเมื่อแก้ไขคิว
 */
function sendQueueUpdateTelegram(queue) {
  try {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
    var message = formatQueueTelegramMessage(queue, 'update');
    sendTelegramNotification(message);
  } catch (error) {
    Logger.log('Send queue update telegram error: ' + error.toString());
  }
}

/**
 * Send Queue Cancel Telegram - แจ้งเตือนเมื่อยกเลิกคิว
 */
function sendQueueCancelTelegram(queue) {
  try {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;
    var message = formatQueueTelegramMessage(queue, 'cancel');
    sendTelegramNotification(message);
  } catch (error) {
    Logger.log('Send queue cancel telegram error: ' + error.toString());
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
