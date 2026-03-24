// Authentication Management

function checkAuthStatus() {
    const token = localStorage.getItem('auth_token');
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');
    
    const loginLink = document.getElementById('login-link');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    
    if (token && userEmail) {
        // แสดงข้อมูลผู้ใช้
        if (loginLink) loginLink.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'inline-flex';
            userInfo.style.alignItems = 'center';
            userInfo.style.gap = '1rem';
        }
        if (userName) {
            userName.textContent = `${userEmail} (${userRole || 'user'})`;
        }
        
        // เพิ่ม event listener สำหรับ logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
    } else {
        // แสดงลิงก์เข้าสู่ระบบ
        if (loginLink) loginLink.style.display = 'inline';
        if (userInfo) userInfo.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    window.location.href = 'index.html';
}

function requireAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function isAdmin() {
    const role = localStorage.getItem('user_role');
    return role === 'admin';
}

function getUserId() {
    return localStorage.getItem('user_id');
}

function getUserEmail() {
    return localStorage.getItem('user_email');
}
