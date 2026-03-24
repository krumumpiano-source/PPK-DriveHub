/**
 * Utility Functions
 */

const Utils = {
  /**
   * Log Access (for restricted scores)
   * @param {string} userId
   * @param {string} scoreId
   */
  logAccess: function(userId, scoreId) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.ACCESS_LOGS_SHEET);
      
      if (!sheet) {
        // สร้าง sheet ถ้ายังไม่มี
        const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
        sheet = ss.insertSheet(CONFIG.ACCESS_LOGS_SHEET);
        sheet.appendRow(['timestamp', 'user_id', 'score_id', 'ip_address']);
      }
      
      const now = new Date();
      sheet.appendRow([
        now.toISOString(),
        userId,
        scoreId,
        '' // IP address (ถ้าต้องการ)
      ]);
      
    } catch (error) {
      Logger.log('Log access error: ' + error.toString());
    }
  },
  
  /**
   * Generate Unique ID
   * @return {string}
   */
  generateId: function() {
    return Utilities.getUuid();
  },
  
  /**
   * Validate Email
   * @param {string} email
   * @return {boolean}
   */
  isValidEmail: function(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};
