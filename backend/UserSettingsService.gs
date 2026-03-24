/**
 * PPK DriveHub User Settings Service
 * จัดการข้อมูลส่วนตัวของผู้ใช้
 */

/**
 * Get My Profile - ดึงข้อมูลส่วนตัวของผู้ใช้ปัจจุบัน
 */
function getMyProfile(userId) {
  try {
    requireAuth();
    
    // SECURITY: Verify userId matches authenticated user (prevent IDOR)
    // userId must come from requestData.userId (sent by frontend from session)
    // This prevents users from viewing other users' profiles
    if (!userId || String(userId).trim() === '') {
      return errorResponse('ต้องระบุ userId', 'MISSING_USER_ID');
    }
    
    var userInfo = getCurrentUserInfo(userId);
    if (!userInfo.success) {
      return errorResponse('ไม่พบข้อมูลผู้ใช้', 'USER_NOT_FOUND');
    }
    
    // SECURITY: Verify user is active
    var user = userInfo.data.user;
    if (user.active !== true && user.active !== 'TRUE') {
      return errorResponse('บัญชีนี้ถูกระงับการใช้งาน', 'INACTIVE');
    }
    
    var user = userInfo.data.user;
    
    // Return only safe fields (exclude password_hash)
    return successResponse({
      user_id: user.user_id,
      title: user.title || '',
      full_name: user.full_name || '',
      department: user.department || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role || 'user',
      permissions: user.permissions || {},
      active: user.active !== false && user.active !== 'FALSE',
      profile_image: user.profile_image || '',
      created_at: user.created_at || '',
      updated_at: user.updated_at || ''
    });
    
  } catch (error) {
    Logger.log('Get my profile error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}

/**
 * Update My Profile - อัปเดตข้อมูลส่วนตัวของผู้ใช้ปัจจุบัน
 */
function updateMyProfile(userId, data) {
  try {
    requireAuth();
    
    // SECURITY: Verify userId matches authenticated user (prevent IDOR)
    // userId must come from requestData.userId (sent by frontend from session)
    // This prevents users from updating other users' profiles
    if (!userId || String(userId).trim() === '') {
      return errorResponse('ต้องระบุ userId', 'MISSING_USER_ID');
    }
    
    // Verify user exists and is active
    var userInfo = getCurrentUserInfo(userId);
    if (!userInfo.success) {
      return errorResponse('ไม่พบผู้ใช้', 'USER_NOT_FOUND');
    }
    var user = userInfo.data.user;
    if (user.active !== true && user.active !== 'TRUE') {
      return errorResponse('บัญชีนี้ถูกระงับการใช้งาน', 'INACTIVE');
    }
    
    // Only allow updating safe fields
    var allowedFields = ['title', 'full_name', 'department', 'phone'];
    var updateData = {};
    
    for (var i = 0; i < allowedFields.length; i++) {
      var field = allowedFields[i];
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return errorResponse('ไม่มีข้อมูลที่ต้องอัปเดต', 'NO_DATA');
    }
    
    // Update user
    var result = updateUser(userId, updateData);
    
    if (result.success) {
      // Log audit
      logAudit(userId, 'update', 'user_profile', userId, updateData);
    }
    
    return result;
    
  } catch (error) {
    Logger.log('Update my profile error: ' + error.toString());
    return errorResponse('เกิดข้อผิดพลาดในการอัปเดตข้อมูล: ' + error.toString(), 'SERVER_ERROR');
  }
}
