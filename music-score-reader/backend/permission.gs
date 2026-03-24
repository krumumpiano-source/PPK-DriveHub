/**
 * Permission Service
 * Logic กลางสำหรับตรวจสอบสิทธิ์การเข้าถึง
 * ⚠️ ห้ามกระจาย logic นี้ไปที่อื่น - ต้องใช้ผ่าน service นี้เท่านั้น
 */

const PermissionService = {
  /**
   * Check if User Can View Score
   * Logic หลักของระบบ - ห้ามแก้ไขโดยไม่ระวัง
   * 
   * @param {Object} user - {user_id, email, role}
   * @param {Object} score - {score_id, visibility, score_type, owner_id}
   * @return {boolean}
   */
  canViewScore: function(user, score) {
    // ตรวจสอบ visibility
    if (score.visibility === 'public') {
      // Public scores - ทุกคนดูได้
      return true;
    }
    
    if (score.visibility === 'restricted') {
      // Restricted scores - ต้องมี license
      return LicenseService.userHasLicense(user.user_id, score.score_id);
    }
    
    if (score.visibility === 'hidden') {
      // Hidden scores - ไม่มีใครดูได้ (ยกเว้น admin)
      return user.role === 'admin';
    }
    
    // Default: ไม่มีสิทธิ์
    return false;
  },
  
  /**
   * Check if User Can Edit Score
   * @param {Object} user
   * @param {Object} score
   * @return {boolean}
   */
  canEditScore: function(user, score) {
    // เฉพาะ admin หรือ owner
    return user.role === 'admin' || score.owner_id === user.user_id;
  },
  
  /**
   * Check if User Can Delete Score
   * @param {Object} user
   * @param {Object} score
   * @return {boolean}
   */
  canDeleteScore: function(user, score) {
    // เฉพาะ admin
    return user.role === 'admin';
  },
  
  /**
   * Check if User Can Add Score
   * @param {Object} user
   * @return {boolean}
   */
  canAddScore: function(user) {
    // เฉพาะ admin (Phase 1)
    return user.role === 'admin';
  },
  
  /**
   * Check if User Can Grant License
   * @param {Object} user
   * @return {boolean}
   */
  canGrantLicense: function(user) {
    // เฉพาะ admin
    return user.role === 'admin';
  }
};
