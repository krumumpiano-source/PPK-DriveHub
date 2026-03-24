/**
 * Takedown Service
 * จัดการการแจ้งละเมิดลิขสิทธิ์
 */

const TakedownService = {
  /**
   * Report Copyright Violation
   * @param {Object} params - {score_id, reporter_email, reason, evidence}
   * @return {Object} {success, report_id}
   */
  reportCopyright: function(params) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.TAKEDOWN_SHEET);
      
      if (!sheet) {
        return { success: false, message: 'Database error' };
      }
      
      const reportId = Utilities.getUuid();
      const now = new Date();
      
      const newRow = [
        reportId,
        params.score_id || '',
        params.reporter_email || '',
        params.reason || '',
        params.evidence || '',
        'pending', // status: pending, reviewed, resolved
        now.toISOString()
      ];
      
      sheet.appendRow(newRow);
      
      // ส่งอีเมลแจ้งเตือน admin (optional)
      this.notifyAdmin(reportId, params);
      
      return { success: true, report_id: reportId };
      
    } catch (error) {
      Logger.log('Report copyright error: ' + error.toString());
      return { success: false, message: 'Failed to submit report', error: error.toString() };
    }
  },
  
  /**
   * Hide Score Immediately (Admin Action)
   * @param {string} scoreId
   * @return {Object} {success}
   */
  hideScoreImmediately: function(scoreId) {
    try {
      const hidden = ScoresService.hideScore(scoreId);
      
      if (hidden) {
        // Log การดำเนินการ
        this.logAction(scoreId, 'hidden', 'Admin takedown action');
        return { success: true };
      }
      
      return { success: false, message: 'Score not found' };
      
    } catch (error) {
      Logger.log('Hide score immediately error: ' + error.toString());
      return { success: false, message: 'Failed to hide score', error: error.toString() };
    }
  },
  
  /**
   * Log Takedown Action
   * @param {string} scoreId
   * @param {string} action
   * @param {string} notes
   */
  logAction: function(scoreId, action, notes) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName('TakedownLogs');
      
      if (!sheet) {
        // สร้าง sheet ถ้ายังไม่มี
        const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
        sheet = ss.insertSheet('TakedownLogs');
        sheet.appendRow(['timestamp', 'score_id', 'action', 'notes']);
      }
      
      const now = new Date();
      sheet.appendRow([
        now.toISOString(),
        scoreId,
        action,
        notes
      ]);
      
    } catch (error) {
      Logger.log('Log action error: ' + error.toString());
    }
  },
  
  /**
   * Notify Admin (Optional)
   * @param {string} reportId
   * @param {Object} params
   */
  notifyAdmin: function(reportId, params) {
    try {
      // ใน production ควรส่งอีเมลแจ้งเตือน admin
      // const adminEmail = 'admin@yourdomain.com';
      // MailApp.sendEmail({
      //   to: adminEmail,
      //   subject: 'Copyright Violation Report',
      //   body: `Report ID: ${reportId}\nScore ID: ${params.score_id}\nReason: ${params.reason}`
      // });
    } catch (error) {
      Logger.log('Notify admin error: ' + error.toString());
    }
  }
};
