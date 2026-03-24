if (typeof flatpickr !== 'undefined') {
    flatpickr.localize({
        weekdays: {
            shorthand: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
            longhand: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
        },
        months: {
            shorthand: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
            longhand: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
        },
        firstDayOfWeek: 1,
        rangeSeparator: ' ถึง ',
        weekAbbreviation: 'สป.',
        scrollTitle: 'เลื่อนเพื่อเพิ่มหรือลด',
        toggleTitle: 'คลิกเพื่อสลับ',
        amPM: ['AM', 'PM'],
        yearAriaLabel: 'ปี',
        monthAriaLabel: 'เดือน',
        hourAriaLabel: 'ชั่วโมง',
        minuteAriaLabel: 'นาที',
        time_24hr: true
    });
}


var currentUser = null;

function checkAuth() {
    // api.js provides API.getUser() — reads from localStorage or sessionStorage
    if (typeof API !== 'undefined') {
        currentUser = API.getUser();
        return !!API.getToken();
    }
    return false;
}

function getCurrentUser() {
    if (!currentUser) checkAuth();
    return currentUser;
}

function hasPermission(requiredRoles) {
    var user = getCurrentUser();
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.indexOf(user.role) !== -1;
}

function hasModulePermission(module, level) {
    var user = getCurrentUser();
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;
    var perms = user.permissions;
    if (!perms || typeof perms !== 'object') return false;
    var userLevel = perms[module];
    if (!userLevel) return false;
    var levelOrder = { view: 1, create: 2, edit: 3, delete: 4, admin: 5 };
    return (levelOrder[userLevel] || 0) >= (levelOrder[level] || 0);
}

function validatePasswordPolicy(password) {
    if (!password || password.length < 8) return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
    if (!/[a-zA-Z]/.test(password)) return 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว';
    if (!/[0-9]/.test(password)) return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว';
    return null;
}

function requireAuth() {
    return checkAuth();
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

function requireAdmin() {
    if (!requireAuth()) { redirectToLogin(); return false; }
    if (!hasPermission(['admin', 'super_admin'])) {
        alert('คุณไม่มีสิทธิ์เปิดหน้านี้');
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}


function setActiveMenu() {
    try {
        var currentPage = window.currentPage || 'dashboard';
        document.querySelectorAll('.nav-btn').forEach(function (btn) { btn.classList.remove('active'); });
        var active = document.querySelector('.nav-btn[data-page="' + currentPage + '"]');
        if (active) active.classList.add('active');
    } catch (e) {}
}

function initMenu() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setActiveMenu);
    else setActiveMenu();
}
initMenu();

function renderQROnlyNavigation() {
    return '<div class="nav">' +
        '<a class="nav-btn" href="qr-usage-record.html" data-page="qr-usage-record">📷 บันทึกใช้รถ</a>' +
        '<a class="nav-btn" href="qr-fuel-record.html" data-page="qr-fuel-record">⛽ เติมน้ำมัน</a>' +
        '<a class="nav-btn" href="qr-daily-check.html" data-page="qr-daily-check">🔧 ตรวจสภาพ+แจ้งซ่อม</a>' +
        '<a class="nav-btn" href="user-guide.html" data-page="user-guide">📖 วิธีใช้งาน</a>' +
        '<a class="nav-btn" href="login.html" style="background:#5c6bc0;color:white;border-color:#5c6bc0;">🔐 เข้าสู่ระบบ</a>' +
        '</div>';
}

function renderNavigation() {
    var user = getCurrentUser();
    if (!user) return '';
    var nav = '<div class="nav">';
    nav += '<a class="nav-btn" href="dashboard.html" data-page="dashboard">🏠 หน้าแรก</a>';
    if (user.driver_id) nav += '<a class="nav-btn" href="driver-history.html" data-page="driver-history">🚗 คิวและประวัติ</a>';
    if (hasModulePermission('queue', 'edit') || hasPermission(['admin'])) nav += '<a class="nav-btn" href="queue-manage.html" data-page="queue">✏️ จัดคิว</a>';
    if (hasModulePermission('vehicles', 'view') || hasPermission(['admin'])) nav += '<a class="nav-btn" href="vehicles.html" data-page="vehicles">🚙 รถ</a>';
    if (hasModulePermission('drivers', 'view') || hasPermission(['admin'])) nav += '<a class="nav-btn" href="drivers.html" data-page="drivers">👤 คนขับ</a>';
    if (hasModulePermission('fuel', 'view') || hasPermission(['admin'])) nav += '<a class="nav-btn" href="fuel-record.html" data-page="fuel-record">⛽ น้ำมัน</a>';
    if (hasModulePermission('repair', 'view') || hasPermission(['admin'])) nav += '<a class="nav-btn" href="repair.html" data-page="repair">🔧 ซ่อมบำรุง</a>';
    if (hasModulePermission('vehicles', 'view') || hasPermission(['admin'])) nav += '<a class="nav-btn" href="tax-insurance.html" data-page="tax-insurance">📋 ภาษี/ประกัน</a>';
    if (hasModulePermission('reports', 'view') || hasPermission(['admin'])) nav += '<a class="nav-btn" href="reports.html" data-page="reports">📊 รายงาน</a>';
    if (hasModulePermission('usage_log', 'view') || hasPermission(['admin'])) nav += '<a class="nav-btn" href="usage-log.html" data-page="usage-log">📝 บันทึกการใช้งาน</a>';
    nav += '<a class="nav-btn" href="qr-usage-record.html" data-page="qr-usage-record">📷 สแกน QR บันทึกใช้รถ</a>';
    nav += '<a class="nav-btn" href="qr-fuel-record.html" data-page="qr-fuel-record">⛽ สแกน QR เติมน้ำมัน</a>';
    nav += '<a class="nav-btn" href="qr-daily-check.html" data-page="qr-daily-check">🔧 สแกน QR ตรวจสภาพ+แจ้งซ่อม</a>';
    nav += '<a class="nav-btn" href="notifications.html" data-page="notifications">🔔 การแจ้งเตือน</a>';
    if (hasPermission(['admin', 'super_admin'])) {
        nav += '<a class="nav-btn" href="admin-settings.html" data-page="settings">⚙️ ตั้งค่าระบบ</a>';
        nav += '<a class="nav-btn" href="audit-log.html" data-page="audit-log">📜 บันทึกกิจกรรม</a>';
        nav += '<a class="nav-btn" href="backup-recovery.html" data-page="backup-recovery">💾 สำรอง/กู้คืน</a>';
    }
    nav += '<a class="nav-btn" href="user-guide.html" data-page="user-guide">📖 วิธีใช้งาน</a>';
    nav += '<a class="nav-btn" href="glossary.html" data-page="glossary">📚 คำศัพท์</a>';
    nav += '<a class="nav-btn" href="about.html" data-page="about">ℹ️ เกี่ยวกับ</a>';
    nav += '<a class="nav-btn" href="profile.html" data-page="profile">👤 ตั้งค่าส่วนตัว</a>';
    nav += '<a class="nav-btn" href="#" onclick="logout();return false;" style="background:#f44336;color:white;border-color:#f44336;">🚪 ออกจากระบบ</a>';
    nav += '</div>';
    return nav;
}

function logout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        if (typeof API !== 'undefined') {
            API.post('/api/auth/logout').catch(() => {});
            API.clearAuth();
        }
        window.location.href = 'login.html';
    }
}

function renderNav() {
    var navContainer = document.getElementById('navigation');
    if (!navContainer) return;
    navContainer.innerHTML = window.REQUIRE_AUTH === false ? renderQROnlyNavigation() : renderNavigation();
    setActiveMenu();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderNav);
else renderNav();


function handleError(error, context) {
    try {
        console.error('Error in ' + (context || 'unknown') + ':', error);
        var def = 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
        function isThai(s) { return s && /[\u0E00-\u0E7F]/.test(s); }
        if (typeof error === 'string') return isThai(error) ? error : def;
        var msg = (error && error.message) ? error.message : '';
        if (isThai(msg)) return msg;
        var map = {
            'Authentication required': 'กรุณาล็อกอินก่อนใช้งาน',
            'Failed to fetch': 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต',
            'Invalid credentials': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
        };
        return map[msg] || def;
    } catch (e) { return 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'; }
}

function getUserMessage(m) {
    if (!m) return 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
    if (/[\u0E00-\u0E7F]/.test(m)) return m;
    return 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
}

function showLoading(elementId) {
    var el = document.getElementById(elementId);
    if (el) {
        el.style.display = 'block';
        el.innerHTML = '<div style="text-align:center;padding:40px;"><div style="display:inline-block;width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #4285f4;border-radius:50%;animation:spin 1s linear infinite;"></div><p style="margin-top:20px;color:#666;">กำลังโหลด...</p></div>';
    }
}

function hideLoading(elementId) {
    var el = document.getElementById(elementId);
    if (el) el.style.display = 'none';
}

function showAlert(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    var colors = { error: '#f44336', success: '#4caf50', warning: '#ff9800', info: '#2196f3' };
    var div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 20px;background:' + (colors[type] || colors.info) + ';color:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:10000;max-width:400px;font-size:.95em;opacity:0;transform:translateX(100%);transition:all .3s ease;';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(function () { div.style.opacity = '1'; div.style.transform = 'translateX(0)'; }, 10);
    setTimeout(function () {
        div.style.opacity = '0'; div.style.transform = 'translateX(100%)';
        setTimeout(function () { if (div.parentNode) div.parentNode.removeChild(div); }, 300);
    }, duration);
}

function showConfirm(message, onConfirm, onCancel) {
    var c = confirm(message);
    if (c && onConfirm) onConfirm();
    else if (!c && onCancel) onCancel();
    return c;
}


function formatDateThai(dateString) {
    if (!dateString) return '';
    var d = new Date(dateString + 'T00:00:00');
    var months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + (d.getFullYear() + 543);
}

function formatCurrency(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function validateEmail(email) {
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateDateRange(date, minDate, maxDate) {
    if (!date) return { valid: false, message: 'กรุณาเลือกวันที่' };
    var d = new Date(date + 'T00:00:00');
    if (minDate && d < new Date(minDate + 'T00:00:00')) return { valid: false, message: 'วันที่ต้องไม่น้อยกว่า ' + formatDateThai(minDate) };
    if (maxDate && d > new Date(maxDate + 'T00:00:00')) return { valid: false, message: 'วันที่ต้องไม่มากกว่า ' + formatDateThai(maxDate) };
    return { valid: true };
}

function validateFileUpload(file, maxSizeMB, allowedTypes) {
    maxSizeMB = maxSizeMB || 10;
    allowedTypes = allowedTypes || ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!file) return { valid: false, message: 'กรุณาเลือกไฟล์' };
    if (file.size > maxSizeMB * 1024 * 1024) return { valid: false, message: 'ขนาดไฟล์ต้องไม่เกิน ' + maxSizeMB + ' MB' };
    if (allowedTypes.indexOf(file.type) === -1) return { valid: false, message: 'ประเภทไฟล์ไม่ถูกต้อง' };
    return { valid: true };
}


function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var b64 = e.target.result.split(',')[1];
            resolve({ base64: b64, mime: file.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


function initLoadingSpinnerStyle() {
    if (!document.getElementById('loading-spinner-style')) {
        var s = document.createElement('style');
        s.id = 'loading-spinner-style';
        s.textContent = '@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
        document.head && document.head.appendChild(s);
    }
}
initLoadingSpinnerStyle();

function initThaiDatePicker(selector, options) {
    if (typeof flatpickr === 'undefined') return null;
    return flatpickr(selector, Object.assign({ dateFormat: 'Y-m-d', allowInput: true }, options || {}));
}

function initThaiTimePicker(selector, options) {
    if (typeof flatpickr === 'undefined') return null;
    return flatpickr(selector, Object.assign({ enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, allowInput: true }, options || {}));
}

function initThaiDateTimePicker(selector, options) {
    if (typeof flatpickr === 'undefined') return null;
    return flatpickr(selector, Object.assign({ enableTime: true, dateFormat: 'Y-m-d H:i', time_24hr: true, allowInput: true }, options || {}));
}

function initAllThaiDateTimePickers() {
    if (typeof flatpickr === 'undefined') return;
    document.querySelectorAll('input[type="date"]:not([data-flatpickr-initialized])').forEach(function (el) {
        if (el.offsetParent !== null) { try { initThaiDatePicker(el); el.setAttribute('data-flatpickr-initialized', 'true'); } catch (e) {} }
    });
    document.querySelectorAll('input[type="time"]:not([data-flatpickr-initialized])').forEach(function (el) {
        if (el.offsetParent !== null) { try { initThaiTimePicker(el); el.setAttribute('data-flatpickr-initialized', 'true'); } catch (e) {} }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(initAllThaiDateTimePickers, 300); });
} else {
    setTimeout(initAllThaiDateTimePickers, 300);
}
