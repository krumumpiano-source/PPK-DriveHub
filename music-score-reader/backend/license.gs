/**
 * License Service
 * จัดการสิทธิ์การเข้าถึงโน้ต
 */

const LicenseService = {
  /**
   * Grant License to User
   * @param {string} userId
   * @param {string} scoreId
   * @return {Object} {success, license_id}
   */
  grantLicense: function(userId, scoreId) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.LICENSES_SHEET);
      
      if (!sheet) {
        return { success: false, message: 'Database error' };
      }
      
      // ตรวจสอบว่ามี license อยู่แล้วหรือไม่
      if (this.userHasLicense(userId, scoreId)) {
        return { success: false, message: 'License already exists' };
      }
      
      const licenseId = Utilities.getUuid();
      const now = new Date();
      
      const newRow = [
        licenseId,
        scoreId,
        userId,
        now.toISOString()
      ];
      
      sheet.appendRow(newRow);
      
      return { success: true, license_id: licenseId };
      
    } catch (error) {
      Logger.log('Grant license error: ' + error.toString());
      return { success: false, message: 'Failed to grant license', error: error.toString() };
    }
  },
  
  /**
   * Check if User Has License
   * @param {string} userId
   * @param {string} scoreId
   * @return {boolean}
   */
  userHasLicense: function(userId, scoreId) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.LICENSES_SHEET);
      
      if (!sheet) return false;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const userIdCol = headers.indexOf('user_id');
      const scoreIdCol = headers.indexOf('score_id');
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[userIdCol] === userId && row[scoreIdCol] === scoreId) {
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      Logger.log('Check license error: ' + error.toString());
      return false;
    }
  },
  
  /**
   * Get All Licenses for User
   * @param {string} userId
   * @return {Array} Array of score_ids
   */
  getUserLicenses: function(userId) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.LICENSES_SHEET);
      
      if (!sheet) return [];
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const userIdCol = headers.indexOf('user_id');
      const scoreIdCol = headers.indexOf('score_id');
      
      const licenses = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[userIdCol] === userId) {
          licenses.push(row[scoreIdCol]);
        }
      }
      
      return licenses;
      
    } catch (error) {
      Logger.log('Get user licenses error: ' + error.toString());
      return [];
    }
  }
};
