/**
 * PPK DriveHub Utilities
 * Shared utility functions
 */

/**
 * Generate UUID
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Hash password using SHA-256 + salt (Secure for 2569)
 * CRITICAL: MD5 is insecure and will fail IT audit
 */
function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  
  // Generate unique salt per password (store with hash)
  // Format: salt:hash (both base64 encoded)
  var salt = Utilities.getRandomString(32); // 32 character random salt
  var saltedPassword = password + salt + 'PPK-DriveHub-Salt-2569';
  
  // Use SHA-256 (secure for production)
  var hashBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    saltedPassword,
    Utilities.Charset.UTF_8
  );
  
  var hashHex = hashBytes.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
  
  // Return format: salt:hash (both hex encoded)
  // This allows us to verify passwords later
  return salt + ':' + hashHex;
}

/**
 * Verify password against stored hash
 * Supports both old MD5 format (for migration) and new SHA-256 format
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) {
    return false;
  }
  
  // Check if it's new format (salt:hash)
  if (storedHash.indexOf(':') !== -1) {
    var parts = storedHash.split(':');
    if (parts.length !== 2) {
      return false;
    }
    
    var salt = parts[0];
    var hash = parts[1];
    var saltedPassword = password + salt + 'PPK-DriveHub-Salt-2569';
    
    var hashBytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      saltedPassword,
      Utilities.Charset.UTF_8
    );
    
    var computedHash = hashBytes.map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    
    return computedHash === hash;
  } else {
    // Legacy MD5 format (for backward compatibility during migration)
    // TODO: Remove this after all passwords are migrated to SHA-256
    Logger.log('Warning: Verifying password using legacy MD5 format. User should reset password.');
    var legacyHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.MD5,
      password + 'PPK-DriveHub-Salt-2569',
      Utilities.Charset.UTF_8
    ).map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    
    if (legacyHash === storedHash) {
      // Auto-migrate to SHA-256 on next password change
      Logger.log('Legacy MD5 password detected. User should change password to upgrade to SHA-256.');
    }
    
    return legacyHash === storedHash;
  }
}

/**
 * Generate random password
 */
function generateRandomPassword(length) {
  length = length || CONFIG.DEFAULT_PASSWORD_LENGTH;
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  var password = '';
  for (var i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Format date to yyyy-MM-dd
 */
function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    date = new Date(date);
  }
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * Format time to HH:mm
 */
function formatTime(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    date = new Date(date);
  }
  var hours = String(date.getHours()).padStart(2, '0');
  var minutes = String(date.getMinutes()).padStart(2, '0');
  return hours + ':' + minutes;
}

/**
 * Parse date from yyyy-MM-dd
 */
function parseDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString + 'T00:00:00');
}

/**
 * Parse time from HH:mm
 */
function parseTime(timeString) {
  if (!timeString) return null;
  var parts = timeString.split(':');
  if (parts.length !== 2) return null;
  var date = new Date();
  date.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
  return date;
}

/**
 * Log to AUDIT_LOG - Enhanced with old_value and new_value
 */
function logAudit(userId, action, entityType, entityId, details, notes) {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.AUDIT_LOG, [
      'log_id', 'timestamp', 'user_id', 'action', 'entity_type', 
      'entity_id', 'old_value', 'new_value', 'details', 'ip_address', 'user_agent', 'notes'
    ]);
    
    var logId = generateUUID();
    var timestamp = new Date();
    
    // Extract old_value and new_value from details if available
    var oldValue = '';
    var newValue = '';
    var detailsJson = '';
    
    if (details) {
      if (details.old_value !== undefined) {
        oldValue = typeof details.old_value === 'object' ? JSON.stringify(details.old_value) : String(details.old_value);
      }
      if (details.new_value !== undefined) {
        newValue = typeof details.new_value === 'object' ? JSON.stringify(details.new_value) : String(details.new_value);
      }
      
      // Remove old_value and new_value from details for cleaner JSON
      var cleanDetails = {};
      for (var key in details) {
        if (key !== 'old_value' && key !== 'new_value') {
          cleanDetails[key] = details[key];
        }
      }
      detailsJson = JSON.stringify(cleanDetails);
    }
    
    sheet.appendRow([
      logId,
      timestamp,
      userId || '',
      action,
      entityType || '',
      entityId || '',
      oldValue,
      newValue,
      detailsJson,
      '', // IP address (can be added if available)
      '', // User agent (can be added if available)
      notes || ''
    ]);
    
    return logId;
  } catch (error) {
    Logger.log('Error logging audit: ' + error.toString());
    return null;
  }
}

/**
 * Log Update with Old/New Values - บันทึกการแก้ไขพร้อมค่าเดิมและค่าใหม่
 */
function logUpdate(userId, action, entityType, entityId, oldValue, newValue, additionalDetails, notes) {
  try {
    var details = {
      old_value: oldValue,
      new_value: newValue
    };
    
    if (additionalDetails) {
      for (var key in additionalDetails) {
        details[key] = additionalDetails[key];
      }
    }
    
    return logAudit(userId, action, entityType, entityId, details, notes);
  } catch (error) {
    Logger.log('Error logging update: ' + error.toString());
    return null;
  }
}

/**
 * Get current user from session (simplified - in production use proper session management)
 * 
 * WARNING: In Google Apps Script Web App context, this function returns the email
 * of the user who deployed the script, NOT the actual user making the request.
 * 
 * For Web App authentication, always use requestData.userId from Code.gs instead.
 * This function is kept for backward compatibility and may not work correctly in Web App.
 */
function getCurrentUser() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (error) {
    return null;
  }
}

/**
 * Permission modules (Modular access - Admin กำหนดเป็นรายคน)
 */
var PERMISSION_MODULES = {
  queue: { key: 'queue', label_th: 'จัดคิวรถ', description: 'ดูคิว / เพิ่ม-แก้ไขคิว' },
  fuel: { key: 'fuel', label_th: 'บันทึกน้ำมัน', description: 'เข้าหน้าบันทึกน้ำมัน ดูข้อมูลน้ำมัน รายงานน้ำมัน' },
  repair: { key: 'repair', label_th: 'บันทึกซ่อมบำรุง', description: 'เพิ่ม/แก้ไขซ่อม ดูประวัติซ่อม' },
  reports: { key: 'reports', label_th: 'ดูรายงาน', description: 'Dashboard, KPI, สถิติ ดูอย่างเดียว' },
  vehicles: { key: 'vehicles', label_th: 'จัดการข้อมูลรถ', description: 'เพิ่ม/แก้ไขข้อมูลรถ อัปโหลดรูปรถ' },
  drivers: { key: 'drivers', label_th: 'จัดการข้อมูลคนขับ', description: 'เพิ่ม/แก้ไขคนขับ ตั้งสถานะ ลา/ป่วย/กลุ่มงาน' },
  usage_log: { key: 'usage_log', label_th: 'บันทึกการใช้งานรถ (ดู/ตรวจสอบ)', description: 'ดูรายการเข้า–ออก เรียลไทม์ และย้อนหลัง ตรวจสอบคุณภาพข้อมูล' }
};

/**
 * Permission levels (ในแต่ละโมดูล: ดู / ทำ / แก้ / ลบ; ลบมีเฉพาะ Admin)
 */
var PERMISSION_LEVELS = [
  { key: 'view', label_th: 'ดูอย่างเดียว', order: 1 },
  { key: 'create', label_th: 'บันทึกใหม่', order: 2 },
  { key: 'edit', label_th: 'แก้ไข', order: 3 },
  { key: 'delete', label_th: 'ลบ (เฉพาะ Admin)', order: 4 }
];

/**
 * Legacy role → permissions (เมื่อไม่มี permissions column)
 */
function legacyRoleToPermissions(role) {
  if (!role) return {};
  switch (String(role).toLowerCase()) {
    case 'admin': return null; // full access, no object needed
    case 'super_admin': return null; // full access (same as admin)
    case 'vehicle': return { queue: 'edit', vehicles: 'edit', drivers: 'edit' };
    case 'fuel': return { fuel: 'edit', reports: 'view' };
    case 'repair': return { repair: 'edit' };
    case 'viewer': return { reports: 'view' };
    default: return {};
  }
}

/**
 * Level order for comparison (higher = more power)
 */
function permissionLevelOrder(level) {
  var order = { view: 1, create: 2, edit: 3, delete: 4 };
  return order[level] || 0;
}

/**
 * Get permissions object for user (from USERS sheet or legacy role)
 */
function getPermissions(userId) {
  try {
    var userResult = getCurrentUserInfo(userId);
    if (!userResult.success || !userResult.data || !userResult.data.user) return {};
    var user = userResult.data.user;
    if (user.role === 'admin' || user.role === 'super_admin') return null; // null = full access
    if (user.permissions !== undefined && user.permissions !== null && user.permissions !== '') {
      if (typeof user.permissions === 'string') {
        try { return JSON.parse(user.permissions); } catch (e) { return {}; }
      }
      return user.permissions;
    }
    return legacyRoleToPermissions(user.role) || {};
  } catch (e) {
    return {};
  }
}

/**
 * Check if user has at least the required level for a module.
 * Admin always has full access. Level: view | create | edit | delete.
 */
function hasModulePermission(userId, module, level) {
  if (!userId || !module) return false;
  var perms = getPermissions(userId);
  if (perms === null) return true; // admin
  var userLevel = perms[module];
  if (!userLevel) return false;
  return permissionLevelOrder(userLevel) >= permissionLevelOrder(level);
}

/**
 * Require module permission; throw if not allowed.
 */
function requireModulePermission(userId, module, level) {
  if (hasModulePermission(userId, module, level)) return;
  throw new Error('ไม่มีสิทธิ์ในโมดูลนี้: ' + (PERMISSION_MODULES[module] ? PERMISSION_MODULES[module].label_th : module));
}

/**
 * Check if user has permission (legacy: role-based)
 */
function hasPermission(userRole, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (userRole === 'admin') return true;
  return requiredRoles.indexOf(userRole) !== -1;
}

/**
 * Require Admin - ตรวจสอบว่าเป็น Admin (throw error ถ้าไม่ใช่)
 */
function requireAdmin() {
  var currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('ต้องล็อกอิน');
  }
  try {
    var userResult = getCurrentUserInfo(currentUser);
    if (!userResult.success || !userResult.data || !userResult.data.user) throw new Error('ต้องเป็น Admin');
    var role = userResult.data.user.role;
    if (role !== 'admin' && role !== 'super_admin') throw new Error('ต้องเป็น Admin');
  } catch (e) {
    throw new Error('ต้องเป็น Admin');
  }
}

/**
 * Get request user ID (from request body or session). Use for permission checks.
 * Frontend should send userId in every authenticated request.
 */
function getRequestUserId(requestData) {
  if (requestData && requestData.userId) {
    return requestData.userId;
  }
  return getCurrentUser();
}

/**
 * Require module permission; throw if not allowed. Use getRequestUserId(requestData) for userId.
 */
function requireModulePermissionForRequest(requestData, module, level) {
  var userId = getRequestUserId(requestData);
  if (!userId) throw new Error('ต้องล็อกอิน');
  requireModulePermission(userId, module, level);
}

/**
 * Require Admin from request (ใช้ userId ที่ Frontend ส่งมา) - สำหรับตรวจสิทธิ์ใน doPost
 */
function requireAdminFromRequest(requestData) {
  var userId = getRequestUserId(requestData);
  if (!userId) throw new Error('ต้องล็อกอิน');
  var userResult = getCurrentUserInfo(userId);
  if (!userResult.success || !userResult.data || !userResult.data.user) throw new Error('ไม่พบผู้ใช้');
  var role = userResult.data.user.role;
  if (role !== 'admin' && role !== 'super_admin') throw new Error('ต้องเป็น Admin');
}

/**
 * Require Auth from request (ใช้ userId ที่ Frontend ส่งมา) - สำหรับตรวจสิทธิ์ใน doPost
 * Similar to requireAdminFromRequest but only checks authentication, not admin role
 */
function requireAuthFromRequest(requestData) {
  var userId = getRequestUserId(requestData);
  if (!userId || String(userId).trim() === '') {
    throw new Error('ต้องล็อกอิน');
  }
  // Verify user exists and is active
  var userResult = getCurrentUserInfo(userId);
  if (!userResult.success || !userResult.data || !userResult.data.user) {
    throw new Error('ไม่พบผู้ใช้หรือบัญชีถูกระงับ');
  }
  var user = userResult.data.user;
  if (user.active !== true && user.active !== 'TRUE') {
    throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
  }
}

/**
 * Validate required fields
 */
function validateRequired(data, requiredFields) {
  var missing = [];
  for (var i = 0; i < requiredFields.length; i++) {
    var field = requiredFields[i];
    if (!data[field] || data[field] === '') {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new Error('Missing required fields: ' + missing.join(', '));
  }
}

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags and dangerous characters
 */
function sanitizeInput(input) {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') {
    input = String(input);
  }
  // Remove HTML tags
  input = input.replace(/<[^>]*>/g, '');
  // Remove script tags and event handlers
  input = input.replace(/javascript:/gi, '');
  input = input.replace(/on\w+\s*=/gi, '');
  // Escape special characters
  input = input.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#x27;')
               .replace(/\//g, '&#x2F;');
  return input.trim();
}

/**
 * Sanitize object recursively (for nested objects)
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    return sanitizeInput(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(function(item) {
      return sanitizeObject(item);
    });
  }
  var sanitized = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

/**
 * Convert row data to object (based on headers)
 */
function rowToObject(row, headers) {
  var obj = {};
  for (var i = 0; i < headers.length && i < row.length; i++) {
    obj[headers[i]] = row[i];
  }
  return obj;
}

/**
 * Convert object to row (based on headers)
 */
function objectToRow(obj, headers) {
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    row.push(obj[headers[i]] || '');
  }
  return row;
}

/**
 * Find row index by ID
 */
function findRowIndexById(sheet, idColumnIndex, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][idColumnIndex] === id) {
      return i + 1; // Return 1-based row index
    }
  }
  return -1;
}

/**
 * สร้างชื่อไฟล์อย่างเป็นระบบสำหรับอัปโหลด
 * รูปแบบ: {module}_{entityId}_{YYYYMMDD}_{suffix}.{ext}
 * @param {string} module - โมดูล เช่น VEHICLES, DRIVERS, FUEL, REPAIR, TAX, INSURANCE, CHECK
 * @param {string} entityId - รหัสหน่วยงาน เช่น car_id, driver_id, repair_id
 * @param {string} originalFileName - ชื่อไฟล์ต้นทาง (ใช้ดึงนามสกุล)
 * @param {string|number} suffix - คำต่อท้ายหรือลำดับ เช่น 001, 'receipt'
 * @return {string} ชื่อไฟล์ใหม่
 */
function makeSystematicFileName(module, entityId, originalFileName, suffix) {
  var ext = 'jpg';
  if (originalFileName && originalFileName.indexOf('.') !== -1) {
    ext = originalFileName.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ext) ext = 'jpg';
  }
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyyMMdd');
  var safeId = (entityId || 'unknown').toString().replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32);
  var suffixStr = (suffix !== undefined && suffix !== null) ? String(suffix) : '001';
  return (module || 'UPLOAD') + '_' + safeId + '_' + dateStr + '_' + suffixStr + '.' + ext;
}

/**
 * Upload file to Google Drive
 */
function uploadFileToDrive(fileData, fileName, folderName) {
  try {
    var folder = getFolder(folderName);
    var blob = Utilities.newBlob(fileData, 'application/octet-stream', fileName);
    var file = folder.createFile(blob);
    return {
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: fileName
    };
  } catch (error) {
    Logger.log('Error uploading file: ' + error.toString());
    throw new Error('Failed to upload file: ' + error.toString());
  }
}

/**
 * Upload base64 file to Google Drive
 * ใช้ชื่อไฟล์อย่างเป็นระบบ: ถ้า options.useSystematicName = true จะเรียก makeSystematicFileName
 * @param {Object} options - ถ้ารับ object แทน (base64Data, fileName, folderName, mimeType) ใช้ตามเดิม
 *   options.base64Data, options.fileName, options.folderName, options.mimeType
 *   options.module, options.entityId, options.suffix — ใช้กับ makeSystematicFileName เมื่อ useSystematicName = true
 */
function uploadBase64FileToDrive(base64Data, fileName, folderName, mimeType) {
  try {
    var finalFileName = fileName;
    if (typeof base64Data === 'object' && base64Data !== null && base64Data.base64Data !== undefined) {
      var opts = base64Data;
      base64Data = opts.base64Data;
      fileName = opts.fileName || 'upload';
      folderName = opts.folderName || folderName;
      mimeType = opts.mimeType || mimeType;
      if (opts.useSystematicName && opts.module && opts.entityId !== undefined) {
        finalFileName = makeSystematicFileName(opts.module, opts.entityId, opts.fileName, opts.suffix !== undefined ? opts.suffix : Date.now());
      } else {
        finalFileName = fileName;
      }
    }
    var folder = getFolder(folderName);
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      mimeType || 'application/octet-stream',
      finalFileName
    );
    var file = folder.createFile(blob);
    return {
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: finalFileName
    };
  } catch (error) {
    Logger.log('Error uploading base64 file: ' + error.toString());
    throw new Error('Failed to upload file: ' + error.toString());
  }
}

/**
 * Standard error response
 */
function errorResponse(message, code) {
  return {
    success: false,
    message: message,
    code: code || 'ERROR'
  };
}

/**
 * Standard success response
 */
function successResponse(data, message) {
  return {
    success: true,
    message: message || 'Success',
    data: data
  };
}

/**
 * Format date to Thai format (dd เดือน yyyy พ.ศ.)
 * @param {string|Date} dateStr - Date string (yyyy-MM-dd) or Date object
 * @return {string} Formatted date in Thai format
 */
function formatDateThai(dateStr) {
  try {
    if (!dateStr) return '';
    
    var date;
    if (typeof dateStr === 'string') {
      // Handle yyyy-MM-dd format
      if (dateStr.indexOf('-') !== -1) {
        var parts = dateStr.split('-');
        if (parts.length === 3) {
          date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          date = new Date(dateStr + 'T00:00:00');
        }
      } else {
        date = new Date(dateStr + 'T00:00:00');
      }
    } else if (dateStr instanceof Date) {
      date = dateStr;
    } else {
      return String(dateStr);
    }
    
    if (isNaN(date.getTime())) {
      return String(dateStr);
    }
    
    var thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    var day = date.getDate();
    var month = thaiMonths[date.getMonth()];
    var year = date.getFullYear() + 543; // พ.ศ.
    
    return day + ' ' + month + ' ' + year;
  } catch (error) {
    Logger.log('formatDateThai error: ' + error.toString());
    return String(dateStr);
  }
}
