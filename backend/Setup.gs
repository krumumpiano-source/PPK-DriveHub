/**
 * PPK DriveHub Installation Script (Advanced Structure)
 * สคริปต์สำหรับติดตั้งระบบครั้งแรก (สร้าง Folder, แยก Database ตามกลุ่มงาน, และสร้าง Config Report)
 * 
 * วิธีใช้งาน:
 * 1. เปิดไฟล์นี้ใน Google Apps Script Editor
 * 2. เลือกฟังก์ชัน "installSystem"
 * 3. กด Run
 * 4. รอจนเสร็จสิ้น (อาจใช้เวลา 2-3 นาที เนื่องจากมีการสร้างไฟล์จำนวนมาก)
 * 5. ระบบจะสร้าง Google Doc รายงานผล ให้เปิดไฟล์นั้นเพื่อนำ ID ไปใส่ใน Config.gs
 */

/**
 * Main Installation Function
 */
function installSystem() {
  try {
    var ui = SpreadsheetApp.getUi();
  } catch (e) {}

  Logger.log('Starting advanced installation...');

  // 1. Get Current Location (Parent Folder of this script)
  var scriptId = ScriptApp.getScriptId();
  var scriptFile = DriveApp.getFileById(scriptId);
  var parentFolder = scriptFile.getParents().next();
  Logger.log('Installing in folder: ' + parentFolder.getName());

  // 2. Create System Root Folder
  var timestamp = new Date().toISOString().slice(0, 10);
  var rootFolderName = 'PPK-DriveHub-System-' + timestamp;
  var rootFolder = parentFolder.createFolder(rootFolderName);
  var rootId = rootFolder.getId();
  Logger.log('Created System Root: ' + rootFolderName);

  // 3. Create Sub-structure Folders
  var databaseFolder = rootFolder.createFolder('Databases'); // เก็บ Spreadsheet แยกตามกลุ่ม
  var uploadsFolder = rootFolder.createFolder('PPK-DriveHub-Uploads'); // เก็บไฟล์อัปโหลด (รูป/เอกสาร)
  var uploadsId = uploadsFolder.getId();
  
  // 4. Create Upload Sub-folders
  var uploadFolders = [
    'FUEL', 'REPAIR', 'CHECK', 'ACCIDENTS', 'TAX', 
    'INSURANCE', 'DOCUMENTS', 'VEHICLES', 'DRIVERS'
  ];
  var uploadFolderIds = {
    'ROOT': uploadsId
  };
  
  uploadFolders.forEach(function(folderName) {
    var folder = uploadsFolder.createFolder(folderName);
    uploadFolderIds[folderName] = folder.getId();
    Logger.log('Created Upload Folder: ' + folderName);
  });

  // 5. Define Database Groups (Separation of Concerns)
  var dbGroups = {
    'Users_DB': ['USERS', 'USER_REQUESTS', 'PASSWORD_HISTORY', 'RESET_PASSWORD_REQUESTS', 'PDPA_LOG', 'NOTIFICATIONS'],
    'Vehicles_DB': ['CARS', 'VEHICLE_MAINTENANCE', 'MAINTENANCE_SETTINGS', 'CHECK_LOG', 'INSPECTION_ALERTS', 'TAX_RECORDS', 'INSURANCE_RECORDS'],
    'Drivers_DB': ['DRIVERS', 'LEAVES', 'SELF_REPORTED_FATIGUE'],
    'Operations_DB': ['QUEUE', 'USAGE_RECORDS', 'QUEUE_RULES'],
    'Fuel_DB': ['FUEL_LOG', 'FUEL_REQUESTS'],
    'Repair_DB': ['REPAIR_LOG', 'SCHEDULED_REPAIRS'],
    'System_Logs_DB': ['AUDIT_LOG', 'SYSTEM_SNAPSHOT', 'MASTER']
  };

  var sheetDefinitions = getSheetDefinitions();
  var createdSheetsMap = {}; // Map: SheetName -> { ssId: ..., sheetId: ... }
  var createdSpreadsheetsMap = {}; // Map: DbName -> ssId

  // 6. Create Spreadsheets and Sheets
  for (var dbName in dbGroups) {
    var sheetNames = dbGroups[dbName];
    
    // Create Spreadsheet for this group
    var ss = SpreadsheetApp.create('PPK-' + dbName + '-' + timestamp);
    var ssId = ss.getId();
    var ssFile = DriveApp.getFileById(ssId);
    ssFile.moveTo(databaseFolder); // Move to Database folder
    
    createdSpreadsheetsMap[dbName] = ssId;
    Logger.log('Created Database: ' + dbName + ' (ID: ' + ssId + ')');
    
    // Create Sheets inside this SS
    // Note: Creating a new SS comes with 'Sheet1'
    var defaultSheet = ss.getSheetByName('Sheet1');
    
    sheetNames.forEach(function(sheetName) {
      if (sheetDefinitions[sheetName]) {
        var sheet = ss.insertSheet(sheetName);
        var headers = sheetDefinitions[sheetName];
        
        if (headers.length > 0) {
          sheet.appendRow(headers);
          // Format Header
          var range = sheet.getRange(1, 1, 1, headers.length);
          range.setFontWeight('bold');
          range.setBackground('#4285f4');
          range.setFontColor('#ffffff');
          sheet.setFrozenRows(1);
        }
        
        createdSheetsMap[sheetName] = {
          ssId: ssId,
          sheetId: sheet.getSheetId(), // GID
          dbName: dbName
        };
        Logger.log('  - Created Sheet: ' + sheetName);
      }
    });
    
    // Delete default Sheet1 if other sheets exist
    if (defaultSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  }

  // 7. Generate Configuration Report (Google Doc)
  var docName = 'PPK-DriveHub-Configuration-Report';
  var doc = DocumentApp.create(docName);
  var docId = doc.getId();
  var docFile = DriveApp.getFileById(docId);
  docFile.moveTo(rootFolder); // Report stays in System Root
  
  var body = doc.getBody();
  
  // Title
  body.appendParagraph('PPK DriveHub - System Configuration Report').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Generated at: ' + new Date().toString());
  body.appendParagraph('System Root Location: ' + rootFolderName);
  body.appendHorizontalRule();

  // Folder IDs
  body.appendParagraph('1. FOLDERS Configuration (Copy to Config.gs -> FOLDERS)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Update `CONFIG.FOLDERS` with these IDs:');
  body.appendParagraph(JSON.stringify(uploadFolderIds, null, 2)).setFontFamily('Courier New');

  // Database Mapping
  body.appendParagraph('2. DATABASE Mapping (Advanced Configuration)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Since sheets are split across multiple files, you need to update `Config.gs` to support mapping sheet names to specific Spreadsheet IDs.');
  
  body.appendParagraph('DATABASE IDs:').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  body.appendParagraph(JSON.stringify(createdSpreadsheetsMap, null, 2)).setFontFamily('Courier New');

  body.appendParagraph('SHEET MAPPING (Sheet Name -> Spreadsheet ID):').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  var sheetToSsMap = {};
  for (var key in createdSheetsMap) {
    sheetToSsMap[key] = createdSheetsMap[key].ssId;
  }
  body.appendParagraph(JSON.stringify(sheetToSsMap, null, 2)).setFontFamily('Courier New');

  // Sheet IDs (GID)
  body.appendParagraph('3. SHEET GIDs (For direct linking/debugging)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  var gids = {};
  for (var key in createdSheetsMap) {
    gids[key] = createdSheetsMap[key].sheetId;
  }
  body.appendParagraph(JSON.stringify(gids, null, 2)).setFontFamily('Courier New');

  // Instructions
  body.appendParagraph('NEXT STEPS:').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('1. Copy the FOLDERS JSON content to `backend/Config.gs`.');
  body.appendParagraph('2. Update `backend/Config.gs` to handle multiple spreadsheets (or use the map provided above).');
  body.appendParagraph('3. Send this document URL to the developer for further configuration.');
  
  Logger.log('Installation Complete!');
  Logger.log('Configuration Report: ' + doc.getUrl());
  
  return doc.getUrl();
}

/**
 * Define all Sheet schemas here
 */
function getSheetDefinitions() {
  return {
    'USERS': [
      'user_id', 'password_hash', 'title', 'full_name', 'department', 'phone', 'email', 'role', 
      'active', 'first_login', 'created_at', 'created_by', 'updated_at', 'notes', 'permissions', 'password_changed_at'
    ],
    'USER_REQUESTS': [
      'request_id', 'title', 'full_name', 'department', 'phone', 'email', 'reason', 'status', 
      'requested_at', 'reviewed_at', 'reviewed_by', 'assigned_role', 'initial_password', 'notes'
    ],
    'QUEUE': [
      'queue_id', 'date', 'time_start', 'time_end', 'car_id', 'driver_id', 'mission', 'status', 
      'created_at', 'created_by', 'started_at', 'ended_at', 'mileage_start', 'mileage_end', 'notes', 
      'qr_scan_id', 'allow_flexible', 'emergency_override', 'fatigue_override', 'override_reason', 
      'passenger_count', 'requested_by', 'destination', 'frozen', 'freeze_at'
    ],
    'CARS': [
      'car_id', 'license_plate', 'province', 'brand', 'model', 'year', 'color', 'fuel_type', 'vehicle_type', 
      'seat_count', 'status', 'qr_code', 'vehicle_images', 'registration_book_image', 'registration_number', 
      'chassis_number', 'engine_number', 'registration_date', 'registration_expiry', 'owner_name', 
      'owner_address', 'mileage', 'created_at', 'created_by', 'updated_at', 'notes', 'active'
    ],
    'DRIVERS': [
      'driver_id', 'title', 'first_name', 'last_name', 'full_name', 'phone', 'line_id', 'position', 
      'start_date', 'license_number', 'license_expiry', 'status', 'fatigue_flag', 'fatigue_date', 
      'fatigue_distance', 'profile_image', 'id_card_image', 'id_card_number', 'id_card_issue_date', 
      'id_card_expiry_date', 'date_of_birth', 'address', 'emergency_contact', 'emergency_phone', 
      'created_at', 'created_by', 'updated_at', 'notes'
    ],
    'VEHICLE_MAINTENANCE': [
      'car_id', 'item_key', 'last_km', 'last_date', 'notes', 'updated_at', 'updated_by'
    ],
    'MAINTENANCE_SETTINGS': [
      'setting_id', 'car_id', 'check_type', 'check_interval', 'average_daily_km', 'enabled', 'updated_at'
    ],
    'FUEL_LOG': [
      'fuel_id', 'date', 'time', 'car_id', 'driver_id', 'mileage_before', 'mileage_after', 'liters', 
      'price_per_liter', 'amount', 'fuel_type', 'gas_station_name', 'gas_station_address', 'gas_station_tax_id', 
      'receipt_number', 'receipt_image', 'receipt_pdf', 'fuel_consumption_rate', 'created_at', 'created_by', 
      'updated_at', 'notes'
    ],
    'REPAIR_LOG': [
      'repair_id', 'car_id', 'date_reported', 'date_started', 'date_completed', 'mileage_at_repair', 'taken_by', 
      'garage_name', 'repair_items', 'issue_description', 'repair_description', 'cost', 'status', 'documents', 
      'created_at', 'created_by', 'completed_by', 'notes'
    ],
    'CHECK_LOG': [
      'check_id', 'car_id', 'inspector_name', 'date', 'time', 'check_type', 'overall_status', 'checks_data', 
      'notes', 'created_at', 'created_by'
    ],
    'INSPECTION_ALERTS': [
      'alert_id', 'check_id', 'car_id', 'risk_level', 'items', 'recommendations', 'inspector_name', 'vehicle_info', 
      'actions_taken', 'notification_sent', 'created_at', 'resolved_at', 'resolved_by', 'why_this_alert', 
      'data_used', 'recommendation'
    ],
    'USAGE_RECORDS': [
      'record_id', 'car_id', 'driver_id', 'record_type', 'datetime', 'requested_by', 'destination', 'mileage', 
      'created_at', 'created_by', 'notes', 'auto_generated', 'auto_reason', 'original_user', 'audit_tag'
    ],
    'SCHEDULED_REPAIRS': [
      'scheduled_repair_id', 'car_id', 'request_type', 'start_date', 'start_time', 'expected_return_date', 
      'expected_return_time', 'issue_description', 'garage_name', 'status', 'created_at', 'created_by', 
      'updated_at', 'actual_repair_id', 'notes'
    ],
    'LEAVES': [
      'leave_id', 'driver_id', 'leave_type', 'start_date', 'end_date', 'start_time', 'end_time', 'reason', 
      'priority', 'status', 'approved_by', 'created_at', 'created_by', 'updated_at', 'notes', 'is_emergency'
    ],
    'PASSWORD_HISTORY': [
      'history_id', 'user_id', 'password_hash', 'changed_at', 'changed_by'
    ],
    'RESET_PASSWORD_REQUESTS': [
      'request_id', 'user_id', 'email', 'reset_token', 'expires_at', 'status', 'requested_at', 'reset_at', 'reset_by'
    ],
    'NOTIFICATIONS': [
      'notification_id', 'user_id', 'type', 'title', 'message', 'read', 'created_at'
    ],
    'AUDIT_LOG': [
      'log_id', 'timestamp', 'user_id', 'action', 'entity_type', 'entity_id', 'old_value', 'new_value', 
      'details', 'ip_address', 'user_agent', 'notes'
    ],
    'PDPA_LOG': [
      'log_id', 'user_id', 'action', 'accepted_at', 'ip_address', 'user_agent', 'notes'
    ],
    'MASTER': [
      'key', 'value', 'description', 'updated_at', 'updated_by', 'version', 'effective_from', 'effective_to'
    ],
    'QUEUE_RULES': [
      'rule_id', 'driver_id', 'assignment_type', 'description', 'active', 'created_at', 'created_by', 
      'updated_at', 'notes', 'version', 'effective_from', 'effective_to'
    ],
    'SYSTEM_SNAPSHOT': [
      'snapshot_id', 'date', 'active_cars', 'cars_in_repair', 'active_drivers', 'queue_count', 'override_count', 
      'auto_recovery_count', 'fuel_logs_today', 'repair_logs_today', 'check_logs_today', 'created_at', 'created_by'
    ],
    'SELF_REPORTED_FATIGUE': [
      'report_id', 'driver_id', 'date', 'reason', 'status', 'admin_notes', 'created_at', 'resolved_at', 'resolved_by'
    ],
    'TAX_RECORDS': [],
    'INSURANCE_RECORDS': [],
    'FUEL_REQUESTS': []
  };
}

/**
 * Utility: Create Initial Admin (User must run this manually AFTER configuration)
 */
function createInitialAdmin() {
  try {
    var sheetName = CONFIG.SHEETS.USERS;
    var sheet = getSheet(sheetName);
    var data = sheet.getDataRange().getValues();
    
    // Check if admin exists
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == 'admin') { // user_id column
        Logger.log('Admin user already exists.');
        return;
      }
    }
    
    // Create admin
    // Column Order: user_id, password_hash, title, full_name, department, phone, email, role, active, first_login, created_at, created_by, updated_at, notes, permissions, password_changed_at
    
    // Hash password (requires Utils.gs libraries to be loaded in GAS environment)
    // If running in standalone script editor, ensure Utils.gs code is available
    var passwordHash = '';
    try {
      passwordHash = hashPassword('admin1234');
    } catch (e) {
      // Fallback simple hash for setup if Utils not available (Should be available in project)
      passwordHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'admin1234').map(function(b) {return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')}).join('');
    }

    var adminUser = [
      'admin', 
      passwordHash, 
      'นาย', 
      'ผู้ดูแลระบบ', 
      'ศูนย์คอมพิวเตอร์', 
      '000-000-0000', 
      'admin@ppk.ac.th', 
      'super_admin', 
      true, // active
      true, // first_login
      new Date(), // created_at
      'SYSTEM', // created_by
      new Date(), // updated_at
      'Initial Admin', // notes
      null, // permissions
      null // password_changed_at
    ];
    
    sheet.appendRow(adminUser);
    Logger.log('Admin user created successfully (User: admin / Pass: admin1234)');
  } catch (e) {
    Logger.log('Error creating admin: ' + e.toString());
  }
}
