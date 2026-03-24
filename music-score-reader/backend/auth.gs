/**
 * Authentication Service
 * จัดการการยืนยันตัวตนและบทบาทผู้ใช้
 */

const AuthService = {
  /**
   * Login
   * @param {string} email
   * @param {string} password
   * @return {Object} {success, token, user_id, email, role}
   */
  login: function(email, password) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.USERS_SHEET);
      
      if (!sheet) {
        return { success: false, message: 'Database error' };
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // หา user
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const userEmail = row[headers.indexOf('email')];
        const userPassword = row[headers.indexOf('password')];
        const userId = row[headers.indexOf('user_id')];
        const userRole = row[headers.indexOf('role')];
        
        if (userEmail === email && userPassword === password) {
          // สร้าง token (ใน production ควรใช้ JWT หรือวิธีที่ปลอดภัยกว่า)
          const token = Utilities.base64Encode(`${userId}:${Date.now()}`);
          
          return {
            success: true,
            token: token,
            user_id: userId,
            email: userEmail,
            role: userRole
          };
        }
      }
      
      return { success: false, message: 'Invalid email or password' };
      
    } catch (error) {
      Logger.log('Login error: ' + error.toString());
      return { success: false, message: 'Login failed', error: error.toString() };
    }
  },
  
  /**
   * Get Current User from Token
   * @param {string} token
   * @return {Object|null} {user_id, email, role}
   */
  getCurrentUser: function(token) {
    if (!token) return null;
    
    try {
      // Decode token (ใน production ควรใช้ JWT)
      const decoded = Utilities.base64Decode(token);
      const parts = Utilities.newBlob(decoded).getDataAsString().split(':');
      const userId = parts[0];
      
      const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheetByName(CONFIG.USERS_SHEET);
      
      if (!sheet) return null;
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[headers.indexOf('user_id')] === userId) {
          return {
            user_id: row[headers.indexOf('user_id')],
            email: row[headers.indexOf('email')],
            role: row[headers.indexOf('role')]
          };
        }
      }
      
      return null;
      
    } catch (error) {
      Logger.log('Get user error: ' + error.toString());
      return null;
    }
  },
  
  /**
   * Verify Admin Role
   * @param {string} token
   * @return {boolean}
   */
  isAdmin: function(token) {
    const user = this.getCurrentUser(token);
    return user && user.role === 'admin';
  }
};
