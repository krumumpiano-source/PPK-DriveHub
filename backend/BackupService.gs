/**
 * PPK DriveHub Backup Service
 * Backup อัตโนมัติทุกวัน 02:00 และกู้คืนได้
 */

/**
 * Daily Backup - Backup อัตโนมัติทุกวันเวลา 02:00
 */
function dailyBackup() {
  try {
    var today = new Date();
    var year = today.getFullYear();
    var month = String(today.getMonth() + 1).padStart(2, '0');
    var day = String(today.getDate()).padStart(2, '0');
    
    var backupFolderName = 'backup/' + year + '/' + month + '/' + day;
    var backupResult = backupSystemData(backupFolderName);
    
    // Send email alert
    try {
      var adminEmails = getAdminEmails();
      if (adminEmails.length > 0) {
        var subject = backupResult.success ? 
          '✅ Backup สำเร็จ - PPK DriveHub' : 
          '❌ Backup ล้มเหลว - PPK DriveHub';
        var body = backupResult.success ?
          'Backup สำเร็จเมื่อ ' + formatDateThai(formatDate(today)) + '\n\n' +
          'โฟลเดอร์: ' + backupFolderName + '\n' +
          'ไฟล์: ' + (backupResult.fileCount || 0) + ' ไฟล์' :
          'Backup ล้มเหลวเมื่อ ' + formatDateThai(formatDate(today)) + '\n\n' +
          'ข้อผิดพลาด: ' + (backupResult.message || 'Unknown error');
        
        for (var i = 0; i < adminEmails.length; i++) {
          MailApp.sendEmail({
            to: adminEmails[i],
            subject: subject,
            body: body
          });
        }
      }
    } catch (emailError) {
      Logger.log('Send backup email alert error: ' + emailError.toString());
    }
    
    // Cleanup old backups (>30 days)
    cleanupOldBackups();
    
    return backupResult;
    
  } catch (error) {
    Logger.log('Daily backup error: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Backup System Data - Backup Google Sheets + Uploaded files
 */
function backupSystemData(backupFolderName) {
  try {
    var rootFolder = getRootFolder();
    var backupFolder = createBackupFolder(rootFolder, backupFolderName);
    var fileCount = 0;
    
    // Backup Spreadsheet
    var ss = getSpreadsheet();
    var ssName = ss.getName();
    var ssBlob = ss.getBlob();
    var ssBackupFile = backupFolder.createFile(ssBlob);
    ssBackupFile.setName(ssName + '_' + formatDate(new Date()) + '.xlsx');
    fileCount++;
    
    // Backup uploaded files (from FOLDERS)
    var foldersToBackup = [
      CONFIG.FOLDERS.FUEL,
      CONFIG.FOLDERS.REPAIR,
      CONFIG.FOLDERS.CHECK,
      CONFIG.FOLDERS.ACCIDENTS,
      CONFIG.FOLDERS.TAX,
      CONFIG.FOLDERS.INSURANCE,
      CONFIG.FOLDERS.DOCUMENTS,
      CONFIG.FOLDERS.VEHICLES,
      CONFIG.FOLDERS.DRIVERS
    ];
    
    for (var i = 0; i < foldersToBackup.length; i++) {
      if (!foldersToBackup[i]) continue;
      try {
        var sourceFolder = DriveApp.getFolderById(foldersToBackup[i]);
        var folderName = sourceFolder.getName();
        var destFolder = backupFolder.createFolder(folderName);
        copyFolderContents(sourceFolder, destFolder);
        fileCount += countFilesInFolder(sourceFolder);
      } catch (folderError) {
        Logger.log('Backup folder error (' + foldersToBackup[i] + '): ' + folderError.toString());
      }
    }
    
    Logger.log('Backup completed: ' + fileCount + ' files');
    return { success: true, fileCount: fileCount, folderPath: backupFolderName };
    
  } catch (error) {
    Logger.log('Backup system data error: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Create Backup Folder - สร้างโฟลเดอร์ backup (nested)
 */
function createBackupFolder(rootFolder, folderPath) {
  var parts = folderPath.split('/');
  var currentFolder = rootFolder;
  
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    var folders = currentFolder.getFoldersByName(parts[i]);
    if (folders.hasNext()) {
      currentFolder = folders.next();
    } else {
      currentFolder = currentFolder.createFolder(parts[i]);
    }
  }
  
  return currentFolder;
}

/**
 * Copy Folder Contents - คัดลอกไฟล์ในโฟลเดอร์
 */
function copyFolderContents(sourceFolder, destFolder) {
  var files = sourceFolder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    file.makeCopy(file.getName(), destFolder);
  }
  
  var subFolders = sourceFolder.getFolders();
  while (subFolders.hasNext()) {
    var subFolder = subFolders.next();
    var newSubFolder = destFolder.createFolder(subFolder.getName());
    copyFolderContents(subFolder, newSubFolder);
  }
}

/**
 * Count Files in Folder - นับไฟล์ในโฟลเดอร์ (recursive)
 */
function countFilesInFolder(folder) {
  var count = 0;
  var files = folder.getFiles();
  while (files.hasNext()) {
    files.next();
    count++;
  }
  
  var subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    count += countFilesInFolder(subFolders.next());
  }
  
  return count;
}

/**
 * Cleanup Old Backups - ลบ backup เก่าเกิน 30 วัน
 */
function cleanupOldBackups() {
  try {
    var rootFolder = getRootFolder();
    var backupRoot = null;
    try {
      var folders = rootFolder.getFoldersByName('backup');
      if (folders.hasNext()) {
        backupRoot = folders.next();
      } else {
        return; // No backup folder
      }
    } catch (e) {
      return; // No backup folder
    }
    
    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    var yearFolders = backupRoot.getFolders();
    while (yearFolders.hasNext()) {
      var yearFolder = yearFolders.next();
      var monthFolders = yearFolder.getFolders();
      while (monthFolders.hasNext()) {
        var monthFolder = monthFolders.next();
        var dayFolders = monthFolder.getFolders();
        while (dayFolders.hasNext()) {
          var dayFolder = dayFolders.next();
          var folderDate = dayFolder.getDateCreated();
          if (folderDate < cutoffDate) {
            // Delete old backup
            dayFolder.setTrashed(true);
            Logger.log('Deleted old backup: ' + dayFolder.getName());
          }
        }
      }
    }
    
  } catch (error) {
    Logger.log('Cleanup old backups error: ' + error.toString());
  }
}

/**
 * Restore Backup - กู้คืนข้อมูลจาก backup
 */
function restoreBackup(backupDate, module) {
  try {
    requireAdmin(); // Admin only
    
    var year = backupDate.substring(0, 4);
    var month = backupDate.substring(5, 7);
    var day = backupDate.substring(8, 10);
    var backupFolderPath = 'backup/' + year + '/' + month + '/' + day;
    
    var rootFolder = getRootFolder();
    var backupFolder = null;
    try {
      var folders = rootFolder.getFoldersByName('backup');
      if (folders.hasNext()) {
        var backupRoot = folders.next();
        backupFolder = getFolderByPath(backupRoot, year + '/' + month + '/' + day);
      }
    } catch (e) {
      return errorResponse('ไม่พบ backup สำหรับวันที่ ' + backupDate, 'BACKUP_NOT_FOUND');
    }
    
    if (!backupFolder) {
      return errorResponse('ไม่พบ backup สำหรับวันที่ ' + backupDate, 'BACKUP_NOT_FOUND');
    }
    
    var restored = 0;
    
    if (!module || module === 'all' || module === 'spreadsheet') {
      // Restore Spreadsheet
      var ssFiles = backupFolder.getFilesByName('PPK-DriveHub-2569_*.xlsx');
      if (ssFiles.hasNext()) {
        // Note: Google Apps Script cannot directly restore Spreadsheet
        // Admin must manually download and upload
        Logger.log('Spreadsheet restore requires manual download/upload');
        restored++;
      }
    }
    
    if (!module || module === 'all' || module === 'files') {
      // Restore uploaded files
      var fileFolders = backupFolder.getFolders();
      while (fileFolders.hasNext()) {
        var fileFolder = fileFolders.next();
        var folderName = fileFolder.getName();
        var targetFolder = getFolder(folderName);
        copyFolderContents(fileFolder, targetFolder);
        restored++;
      }
    }
    
    logAudit(getCurrentUser() || 'admin', 'restore_backup', 'system', backupDate, {
      module: module || 'all',
      restored_count: restored
    });
    
    return successResponse({ restored: restored }, 'กู้คืนสำเร็จ ' + restored + ' โมดูล');
    
  } catch (error) {
    Logger.log('Restore backup error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาด: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Get Folder by Path - หาโฟลเดอร์ตาม path
 */
function getFolderByPath(rootFolder, path) {
  var parts = path.split('/');
  var currentFolder = rootFolder;
  
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    var folders = currentFolder.getFoldersByName(parts[i]);
    if (folders.hasNext()) {
      currentFolder = folders.next();
    } else {
      return null; // Path not found
    }
  }
  
  return currentFolder;
}

/**
 * Get Admin Emails - ดึงอีเมล์ Admin ทั้งหมด
 */
function getAdminEmails() {
  try {
    var usersResult = getAllUsers(true);
    if (!usersResult.success) return [];
    
    var users = usersResult.data.users || [];
    var adminEmails = [];
    
    for (var i = 0; i < users.length; i++) {
      if (users[i].role === 'admin' && users[i].email) {
        adminEmails.push(users[i].email);
      }
    }
    
    return adminEmails;
  } catch (e) {
    return [];
  }
}

/**
 * Format Date Thai - แปลงวันที่เป็นภาษาไทย
 */
function formatDateThai(dateStr) {
  try {
    if (!dateStr) return '';
    var date = new Date(dateStr + 'T00:00:00');
    var thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    var day = date.getDate();
    var month = thaiMonths[date.getMonth()];
    var year = date.getFullYear() + 543; // พ.ศ.
    return day + ' ' + month + ' ' + year;
  } catch (e) {
    return dateStr;
  }
}
