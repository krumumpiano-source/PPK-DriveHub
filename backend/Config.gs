/**
 * PPK DriveHub Configuration
 * ระบบจัดการยานพาหนะโรงเรียนพะเยาพิทยาคม 2569
 * Centralized configuration for the entire system
 * Updated: 2026-02-11 (Advanced Multi-Database Structure)
 */

var CONFIG = {
  // Global Configuration
  SYSTEM_NAME: 'PPK DriveHub',
  SYSTEM_YEAR: '2569',
  
  // Google Drive Folder IDs
  ROOT_FOLDER_ID: '1nsPhgWEql2C7gqJfBoe8Gvez0kZQMead',
  
  FOLDERS: {
    ROOT: "1nsPhgWEql2C7gqJfBoe8Gvez0kZQMead",
    FUEL: "1V8paktjPyzKUkyGv8DGFPl6T1Tu8jLDa",
    REPAIR: "1OMVZOuafQXnGg55kBawdsRgtvn_QcLTM",
    CHECK: "1o7trTWCXzYqeYIYKCmgZj_s4KQMxdqmw",
    ACCIDENTS: "1CzEFR4jW53PbQ5J8rHZUICJ-2w33MCQg",
    TAX: "1tLvlbeqL-HBTchMiEU5n4gCLplmCou_0",
    INSURANCE: "1SudBr5k-e-E6CM0NEsiz0oOAHe5WmXpm",
    DOCUMENTS: "1dS8rzV8M_2GeBLr-Gsp7mIwQPF0hrvNV",
    VEHICLES: "1cgGzUJiJZajBDvisy6-eY2KWFBNPE30P",
    DRIVERS: "1kByvPCHvX2Zd1Op9sbdr4JaU9Vnz24qe"
  },
  
  // Sheet Names
  SHEETS: {
    USERS: 'USERS',
    USER_REQUESTS: 'USER_REQUESTS',
    QUEUE: 'QUEUE',
    CARS: 'CARS',
    DRIVERS: 'DRIVERS',
    FUEL_LOG: 'FUEL_LOG',
    REPAIR_LOG: 'REPAIR_LOG',
    CHECK_LOG: 'CHECK_LOG',
    INSPECTION_ALERTS: 'INSPECTION_ALERTS',
    SELF_REPORTED_FATIGUE: 'SELF_REPORTED_FATIGUE',
    USAGE_LOG: 'USAGE_RECORDS',
    NOTIFICATIONS: 'NOTIFICATIONS',
    AUDIT_LOG: 'AUDIT_LOG',
    PDPA_LOG: 'PDPA_LOG',
    MASTER: 'MASTER',
    QUEUE_RULES: 'QUEUE_RULES',
    VEHICLE_MAINTENANCE: 'VEHICLE_MAINTENANCE',
    SCHEDULED_REPAIRS: 'SCHEDULED_REPAIRS',
    LEAVES: 'LEAVES',
    MAINTENANCE_SETTINGS: 'MAINTENANCE_SETTINGS',
    PASSWORD_HISTORY: 'PASSWORD_HISTORY',
    SYSTEM_SNAPSHOT: 'SYSTEM_SNAPSHOT',
    RESET_PASSWORD_REQUESTS: 'RESET_PASSWORD_REQUESTS',
    TAX_RECORDS: 'TAX_RECORDS',
    INSURANCE_RECORDS: 'INSURANCE_RECORDS',
    FUEL_REQUESTS: 'FUEL_REQUESTS'
  },
  
  // Multi-Database Mapping (Sheet Name -> Spreadsheet ID)
  SHEET_TO_SS_ID: {
    "USERS": "1zKioNXYJbzP9mOU6Xevb7RKYyG2yxtVVAVwkrynfmZY",
    "USER_REQUESTS": "1zKioNXYJbzP9mOU6Xevb7RKYyG2yxtVVAVwkrynfmZY",
    "PASSWORD_HISTORY": "1zKioNXYJbzP9mOU6Xevb7RKYyG2yxtVVAVwkrynfmZY",
    "RESET_PASSWORD_REQUESTS": "1zKioNXYJbzP9mOU6Xevb7RKYyG2yxtVVAVwkrynfmZY",
    "PDPA_LOG": "1zKioNXYJbzP9mOU6Xevb7RKYyG2yxtVVAVwkrynfmZY",
    "NOTIFICATIONS": "1zKioNXYJbzP9mOU6Xevb7RKYyG2yxtVVAVwkrynfmZY",
    "CARS": "1mBKx9DigiiWZDq_CRnVG7Rw72AvKrjQ3qVLLxSfUSQg",
    "VEHICLE_MAINTENANCE": "1mBKx9DigiiWZDq_CRnVG7Rw72AvKrjQ3qVLLxSfUSQg",
    "MAINTENANCE_SETTINGS": "1mBKx9DigiiWZDq_CRnVG7Rw72AvKrjQ3qVLLxSfUSQg",
    "CHECK_LOG": "1mBKx9DigiiWZDq_CRnVG7Rw72AvKrjQ3qVLLxSfUSQg",
    "INSPECTION_ALERTS": "1mBKx9DigiiWZDq_CRnVG7Rw72AvKrjQ3qVLLxSfUSQg",
    "TAX_RECORDS": "1mBKx9DigiiWZDq_CRnVG7Rw72AvKrjQ3qVLLxSfUSQg",
    "INSURANCE_RECORDS": "1mBKx9DigiiWZDq_CRnVG7Rw72AvKrjQ3qVLLxSfUSQg",
    "DRIVERS": "17eqQCZhT9xOsbbWHtPQuH42yofsPSYu6-nOsybFlMfQ",
    "LEAVES": "17eqQCZhT9xOsbbWHtPQuH42yofsPSYu6-nOsybFlMfQ",
    "SELF_REPORTED_FATIGUE": "17eqQCZhT9xOsbbWHtPQuH42yofsPSYu6-nOsybFlMfQ",
    "QUEUE": "1P8VzlC5Ln_sW2FW11tum8_jPBOaeKuHyAkGpjxKSqzw",
    "USAGE_RECORDS": "1P8VzlC5Ln_sW2FW11tum8_jPBOaeKuHyAkGpjxKSqzw",
    "QUEUE_RULES": "1P8VzlC5Ln_sW2FW11tum8_jPBOaeKuHyAkGpjxKSqzw",
    "FUEL_LOG": "11J096gcfXQXObG1mZ8IqI0fPpzyd1s08Bq35cPdBWkw",
    "FUEL_REQUESTS": "11J096gcfXQXObG1mZ8IqI0fPpzyd1s08Bq35cPdBWkw",
    "REPAIR_LOG": "1jhJMxYe6iG8RphyKGOaPZsOPAoNMyLHDlF40Mfw0rDU",
    "SCHEDULED_REPAIRS": "1jhJMxYe6iG8RphyKGOaPZsOPAoNMyLHDlF40Mfw0rDU",
    "AUDIT_LOG": "1VofJbtwn8ETyVTlNb2wq0L7o8S1mLj4uYIFzF8CuOAI",
    "SYSTEM_SNAPSHOT": "1VofJbtwn8ETyVTlNb2wq0L7o8S1mLj4uYIFzF8CuOAI",
    "MASTER": "1VofJbtwn8ETyVTlNb2wq0L7o8S1mLj4uYIFzF8CuOAI"
  },
  
  // Sheet GIDs (Verified)
  SHEET_IDS: {
    USERS: 1568422213,
    USER_REQUESTS: 645333626,
    PASSWORD_HISTORY: 1584622986,
    RESET_PASSWORD_REQUESTS: 1974812088,
    PDPA_LOG: 2003882521,
    NOTIFICATIONS: 663187869,
    CARS: 1109414171,
    VEHICLE_MAINTENANCE: 2175275,
    MAINTENANCE_SETTINGS: 1167478794,
    CHECK_LOG: 527939197,
    INSPECTION_ALERTS: 791012364,
    TAX_RECORDS: 1888647062,
    INSURANCE_RECORDS: 1370642732,
    DRIVERS: 2024276849,
    LEAVES: 1742655687,
    SELF_REPORTED_FATIGUE: 340760857,
    QUEUE: 100164692,
    USAGE_RECORDS: 1089175760,
    QUEUE_RULES: 779310034,
    FUEL_LOG: 1794593741,
    FUEL_REQUESTS: 149539034,
    REPAIR_LOG: 1707882029,
    SCHEDULED_REPAIRS: 954342233,
    AUDIT_LOG: 232730274,
    SYSTEM_SNAPSHOT: 91257919,
    MASTER: 1982953118
  },
  
  // Telegram & Other Settings
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',
  TELEGRAM_ENDPOINT: 'https://api.telegram.org/bot<BOT_TOKEN>/sendMessage',
  
  FUEL_TYPES: {
    'gasoline_91': { name: 'เบนซิน 91', price_per_liter: 0 },
    'gasoline_95': { name: 'เบนซิน 95', price_per_liter: 0 },
    'gasoline_e20': { name: 'แก๊สโซฮอล์ E20', price_per_liter: 0 },
    'gasoline_e85': { name: 'แก๊สโซฮอล์ E85', price_per_liter: 0 },
    'diesel': { name: 'ดีเซล', price_per_liter: 0 },
    'diesel_b7': { name: 'ดีเซล B7', price_per_liter: 0 },
    'diesel_b20': { name: 'ดีเซล B20', price_per_liter: 0 },
    'electric': { name: 'ไฟฟ้า', price_per_liter: 0 }
  },
  
  DEFAULT_PASSWORD_LENGTH: 8,
  REQUIRE_PASSWORD_CHANGE_ON_FIRST_LOGIN: true,
  QR_CODE_BASE_URL: '',
  SESSION_TIMEOUT_MINUTES: 480,
  
  ROTATION_POLICY: {
    MAX_CAR_USAGE_PER_WEEK: 3,
    MAX_DRIVER_LONG_JOBS_PER_WEEK: 2
  },

  AUTO_RECOVERY: {
    PENDING_RETURN_HOUR: 18,
    PENDING_RETURN_MINUTE: 0,
    DEFAULT_OUT_TIME: '08:00',
    DEFAULT_IN_TIME: '17:30',
    AUDIT_TAG: 'AUTO_RECOVERY',
    CREATED_BY_SYSTEM: 'SYSTEM'
  }
};

/**
 * Load Secrets
 */
(function loadConfigSecrets() {
  try {
    var sp = PropertiesService.getScriptProperties();
    var token = sp.getProperty('TELEGRAM_BOT_TOKEN');
    var chatId = sp.getProperty('TELEGRAM_CHAT_ID');
    if (token) CONFIG.TELEGRAM_BOT_TOKEN = token;
    if (chatId) CONFIG.TELEGRAM_CHAT_ID = chatId;
  } catch (e) {
    Logger.log('Config: Could not load script properties: ' + e.toString());
  }
})();

/**
 * Get Spreadsheet object (Auto-selects based on sheet name)
 */
function getSpreadsheet(sheetName) {
  var ssId = null;
  
  // 1. Try mapping first
  if (sheetName && CONFIG.SHEET_TO_SS_ID && CONFIG.SHEET_TO_SS_ID[sheetName]) {
    ssId = CONFIG.SHEET_TO_SS_ID[sheetName];
  }
  
  // 2. Fallback to default SPREADSHEET_ID if exists (Legacy support)
  if (!ssId && CONFIG.SPREADSHEET_ID) {
    ssId = CONFIG.SPREADSHEET_ID;
  }
  
  if (ssId) {
    return SpreadsheetApp.openById(ssId);
  }
  
  throw new Error('Spreadsheet ID not found for sheet: ' + sheetName + '. Check Config.gs');
}

/**
 * Get Sheet by name
 */
function getSheet(sheetName) {
  var ss = getSpreadsheet(sheetName);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" not found in Spreadsheet ' + ss.getId());
  }
  return sheet;
}

/**
 * Get or create Sheet by name
 */
function getOrCreateSheet(sheetName, headers) {
  var ss = getSpreadsheet(sheetName);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      var range = sheet.getRange(1, 1, 1, headers.length);
      range.setFontWeight('bold');
      range.setBackground('#4285f4');
      range.setFontColor('#ffffff');
    }
  }
  return sheet;
}

/**
 * Get Root Folder
 */
function getRootFolder() {
  if (CONFIG.ROOT_FOLDER_ID) {
    return DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  }
  throw new Error('ROOT_FOLDER_ID not configured');
}

/**
 * Get Folder by name/key
 */
function getFolder(folderNameOrKey) {
  // Check if it's a CONFIG key
  if (CONFIG.FOLDERS[folderNameOrKey]) {
    return DriveApp.getFolderById(CONFIG.FOLDERS[folderNameOrKey]);
  }
  
  // Otherwise, search by name within root
  var rootFolder = getRootFolder();
  var folders = rootFolder.getFoldersByName(folderNameOrKey);
  if (folders.hasNext()) {
    return folders.next();
  }
  // Create if not exists (Caution: this creates in Root if getRootFolder is used)
  return rootFolder.createFolder(folderNameOrKey);
}

function getFolderById(folderId) {
  try {
    return DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new Error('Folder not found with ID: ' + folderId);
  }
}

function getSheetById(sheetId) {
  // This is tricky with multi-SS. We need to iterate or find the SS that contains this sheetId?
  // Or if we know the sheetName, we can find the SS.
  // Generally, getSheetById is rarely used directly without context.
  // If needed, we might need a reverse map or search.
  // For now, let's assume sheetId is less important than sheetName in this architecture.
  throw new Error('getSheetById is not supported in multi-database mode. Use getSheet(sheetName) instead.'); 
}
