/**
 * Scores Service
 * จัดการโน้ตเพลง
 */

const ScoresService = {
  /**
   * List Public Scores
   * @return {Object} {success, scores: []}
   */
  listPublicScores: function() {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.SCORES_SHEET);
      
      if (!sheet) {
        return { success: false, message: 'Database error' };
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      const scores = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const scoreType = row[headers.indexOf('score_type')];
        const visibility = row[headers.indexOf('visibility')];
        
        // เฉพาะ public scores
        if (visibility === 'public' && scoreType === 'admin_public') {
          scores.push({
            score_id: row[headers.indexOf('score_id')],
            title: row[headers.indexOf('title')],
            score_type: scoreType,
            visibility: visibility,
            owner_id: row[headers.indexOf('owner_id')],
            file_id: row[headers.indexOf('file_id')],
            created_at: row[headers.indexOf('created_at')]
          });
        }
      }
      
      return { success: true, scores: scores };
      
    } catch (error) {
      Logger.log('List public scores error: ' + error.toString());
      return { success: false, message: 'Failed to load scores', error: error.toString() };
    }
  },
  
  /**
   * List Restricted Scores for User
   * @param {string} userId
   * @return {Object} {success, scores: []}
   */
  listRestrictedScores: function(userId) {
    try {
      // ใช้ Permission Service เพื่อตรวจสอบสิทธิ์
      const allScores = this.getAllScores();
      const restrictedScores = [];
      
      for (const score of allScores) {
        if (score.visibility === 'restricted') {
          const hasAccess = PermissionService.canViewScore(
            { user_id: userId },
            score
          );
          
          if (hasAccess) {
            restrictedScores.push(score);
          }
        }
      }
      
      return { success: true, scores: restrictedScores };
      
    } catch (error) {
      Logger.log('List restricted scores error: ' + error.toString());
      return { success: false, message: 'Failed to load scores', error: error.toString() };
    }
  },
  
  /**
   * Get Score by ID (with permission check)
   * @param {string} scoreId
   * @param {Object} user
   * @return {Object} {success, hasAccess, score}
   */
  getScoreById: function(scoreId, user) {
    try {
      const score = this.getScore(scoreId);
      
      if (!score) {
        return { success: false, message: 'Score not found' };
      }
      
      // ตรวจสอบสิทธิ์
      const hasAccess = PermissionService.canViewScore(user, score);
      
      if (!hasAccess) {
        return { 
          success: true, 
          hasAccess: false, 
          message: 'Access denied' 
        };
      }
      
      // สร้าง file URL (ไม่ใช้ direct Drive share link)
      const fileUrl = this.getSecureFileUrl(score.file_id);
      
      // Log access for restricted scores
      if (score.visibility === 'restricted') {
        Utils.logAccess(user.user_id, score.score_id);
      }
      
      return {
        success: true,
        hasAccess: true,
        score: {
          score_id: score.score_id,
          title: score.title,
          score_type: score.score_type,
          visibility: score.visibility,
          file_url: fileUrl,
          owner_id: score.owner_id
        }
      };
      
    } catch (error) {
      Logger.log('Get score error: ' + error.toString());
      return { success: false, message: 'Failed to load score', error: error.toString() };
    }
  },
  
  /**
   * Get All Scores (internal)
   * @return {Array}
   */
  getAllScores: function() {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
      .getSheetByName(CONFIG.SCORES_SHEET);
    
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const scores = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      scores.push({
        score_id: row[headers.indexOf('score_id')],
        title: row[headers.indexOf('title')],
        score_type: row[headers.indexOf('score_type')],
        visibility: row[headers.indexOf('visibility')],
        owner_id: row[headers.indexOf('owner_id')],
        file_id: row[headers.indexOf('file_id')],
        created_at: row[headers.indexOf('created_at')]
      });
    }
    
    return scores;
  },
  
  /**
   * Get Single Score (internal)
   * @param {string} scoreId
   * @return {Object|null}
   */
  getScore: function(scoreId) {
    const scores = this.getAllScores();
    return scores.find(s => s.score_id === scoreId) || null;
  },
  
  /**
   * Add Score (Admin Only)
   * @param {Object} params
   * @return {Object} {success, score_id}
   */
  addScore: function(params) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.SCORES_SHEET);
      
      if (!sheet) {
        return { success: false, message: 'Database error' };
      }
      
      const scoreId = Utilities.getUuid();
      const now = new Date();
      
      const newRow = [
        scoreId,
        params.title || '',
        params.score_type || 'admin_public',
        params.visibility || 'public',
        params.owner_id || '',
        params.file_id || '',
        now.toISOString()
      ];
      
      sheet.appendRow(newRow);
      
      return { success: true, score_id: scoreId };
      
    } catch (error) {
      Logger.log('Add score error: ' + error.toString());
      return { success: false, message: 'Failed to add score', error: error.toString() };
    }
  },
  
  /**
   * Get Secure File URL
   * ไม่ใช้ Drive share link โดยตรง แต่ใช้การดาวน์โหลดผ่าน backend
   * @param {string} fileId
   * @return {string}
   */
  getSecureFileUrl: function(fileId) {
    if (!fileId) return '';
    
    // สร้าง URL สำหรับดาวน์โหลดผ่าน GAS (ไม่ใช่ direct Drive link)
    // ใน production ควรใช้ blob service หรือ signed URL
    const file = DriveApp.getFileById(fileId);
    return file.getDownloadUrl();
  },
  
  /**
   * Hide Score (for takedown)
   * @param {string} scoreId
   * @return {boolean}
   */
  hideScore: function(scoreId) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.SCORES_SHEET);
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const scoreIdCol = headers.indexOf('score_id');
      const visibilityCol = headers.indexOf('visibility');
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][scoreIdCol] === scoreId) {
          sheet.getRange(i + 1, visibilityCol + 1).setValue('hidden');
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      Logger.log('Hide score error: ' + error.toString());
      return false;
    }
  }
};
