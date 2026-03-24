// Flatpickr Thai Locale
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

// API Base URL - will be set by each page (window.API_BASE_URL = CONFIG.API_BASE_URL)
var API_BASE_URL = window.API_BASE_URL || '';

// Current user session
var currentUser = null;

/**
 * Check if user is logged in
 */
function checkAuth() {
    var userStr = sessionStorage.getItem('ppk_drivehub_user');
    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
            return true;
        } catch (e) {
            sessionStorage.removeItem('ppk_drivehub_user');
            return false;
        }
    }
    return false;
}

/**
 * Get current user
 */
function getCurrentUser() {
    if (!currentUser) {
        checkAuth();
    }
    return currentUser;
}

/**
 * Check if user has permission (legacy: role-based)
 */
function hasPermission(requiredRoles) {
    var user = getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.indexOf(user.role) !== -1;
}

/**
 * Check if user has module permission (module-based)
 * module: 'queue', 'fuel', 'repair', 'reports', 'vehicles', 'drivers', 'usage_log'
 * level: 'view', 'create', 'edit', 'delete'
 */
function hasModulePermission(module, level) {
    var user = getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has full access

    // Check module permissions
    if (!user.permissions || typeof user.permissions !== 'object') {
        return false;
    }

    var userLevel = user.permissions[module];
    if (!userLevel) return false;

    // Permission level order: view < create < edit < delete
    var levelOrder = { view: 1, create: 2, edit: 3, delete: 4 };
    var requiredOrder = levelOrder[level] || 0;
    var userOrder = levelOrder[userLevel] || 0;

    return userOrder >= requiredOrder;
}

/**
 * Validate password policy
 * Min 8 chars, at least 1 letter and 1 number
 */
function validatePasswordPolicy(password) {
    if (!password || password.length < 8) {
        return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
    }
    if (!/[a-zA-Z]/.test(password)) {
        return 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว';
    }
    if (!/[0-9]/.test(password)) {
        return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว';
    }
    return null; // Valid
}

/**
 * ตรวจสอบว่ามี session หรือไม่ (ไม่ redirect — ให้แต่ละหน้าแสดงเนื้อหาได้ แม้ยังไม่ล็อกอิน)
 * ถ้าต้องการบังคับไป login ให้เรียก redirectToLogin() เอง
 */
function requireAuth() {
    return checkAuth();
}

/**
 * ไปหน้า login (ใช้เมื่อต้องการบังคับให้ผู้ใช้ล็อกอิน เช่น ก่อนทำรายการสำคัญ)
 */
function redirectToLogin() {
    window.location.href = 'login.html';
}

/**
 * ตรวจสอบว่าเป็น admin หรือไม่ (ถ้าไม่ล็อกอินจะ redirect ไป login)
 */
function requireAdmin() {
    if (!requireAuth()) {
        redirectToLogin();
        return false;
    }
    if (!hasPermission(['admin'])) {
        alert('คุณไม่มีสิทธิ์เปิดหน้านี้ กรุณาติดต่อผู้ดูแลระบบถ้าต้องการใช้งาน');
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

/**
 * Set active menu based on current page
 */
function setActiveMenu() {
    try {
        var currentPage = window.currentPage || 'dashboard';
        var navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(function (btn) {
            btn.classList.remove('active');
        });

        var activeButton = document.querySelector('.nav-btn[data-page="' + currentPage + '"]');
        if (activeButton) {
            activeButton.classList.add('active');
        }
    } catch (error) {
        console.error('Error setting active menu:', error);
    }
}

/**
 * Initialize menu when DOM is ready
 */
function initMenu() {
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setActiveMenu);
        } else {
            setActiveMenu();
        }
    } catch (error) {
        console.error('Error initializing menu:', error);
    }
}

initMenu();

/**
 * Standard Error Handler - แปลง error เป็นข้อความภาษาไทยที่คนอ่านแล้วเข้าใจ (ไม่แสดงภาษาระบบ)
 */
function handleError(error, context) {
    try {
        console.error('Error in ' + (context || 'unknown') + ':', error);
        var defaultMessage = 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';

        function isThaiText(str) {
            if (!str || typeof str !== 'string') return false;
            return /[\u0E00-\u0E7F]/.test(str);
        }

        if (typeof error === 'string') {
            return isThaiText(error) ? error : defaultMessage;
        }

        var message = error && error.message ? error.message : '';

        var errorTranslations = {
            'Authentication required': 'กรุณาล็อกอินก่อนใช้งาน',
            'AUTHENTICATION_REQUIRED': 'กรุณาล็อกอินก่อนใช้งาน',
            'LOGIN_REQUIRED': 'กรุณาล็อกอินก่อนใช้งาน',
            'NO_PERMISSION': 'คุณไม่มีสิทธิ์ดำเนินการนี้',
            'Missing action field': 'ข้อมูลไม่ครบ กรุณารีเฟรชหน้าแล้วลองใหม่',
            'Network request failed': 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต',
            'Failed to fetch': 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต',
            'Invalid credentials': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
            'User is not active': 'บัญชีนี้ยังไม่ได้รับอนุมัติหรือถูกระงับ',
            'Missing required fields': 'กรุณากรอกข้อมูลให้ครบถ้วน',
            'CAR_NOT_FOUND': 'ไม่พบข้อมูลรถ',
            'DRIVER_NOT_FOUND': 'ไม่พบข้อมูลคนขับ',
            'CAR_NOT_AVAILABLE': 'รถไม่พร้อมใช้งานในขณะนี้',
            'CAR_SCHEDULED_FOR_REPAIR': 'รถคันนี้ถูกจองซ่อมในวันดังกล่าว',
            'SERVER_ERROR': defaultMessage
        };

        if (errorTranslations[message]) {
            return errorTranslations[message];
        }
        if (message.indexOf('HTTP error! status:') !== -1) {
            var statusMatch = message.match(/status: (\d+)/);
            if (statusMatch) {
                var status = parseInt(statusMatch[1], 10);
                if (status === 401) return 'กรุณาล็อกอินใหม่ (การเข้าสู่ระบบหมดอายุ)';
                if (status === 403) return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
                if (status === 404) return 'ไม่พบข้อมูลที่ต้องการ';
                if (status === 500) return 'เซิร์ฟเวอร์ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง';
            }
        }
        // ไม่ redirect อัตโนมัติใน handleError — ให้แต่ละหน้าใช้ requireAuth() ตอนโหลดเท่านั้น
        if (error && error.error === 'AUTHENTICATION_REQUIRED') {
            return 'กรุณาล็อกอินก่อนใช้งาน';
        }
        if (error && error.message && isThaiText(error.message)) {
            return error.message;
        }
        return defaultMessage;
    } catch (e) {
        return 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
    }
}

/**
 * แปลงข้อความจาก API (result.message) เป็นภาษาไทยที่แสดงให้ผู้ใช้เห็น
 */
function getUserMessage(apiMessage) {
    if (!apiMessage || typeof apiMessage !== 'string') return 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
    if (/[\u0E00-\u0E7F]/.test(apiMessage)) return apiMessage;
    var map = {
        'SERVER_ERROR': 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        'AUTHENTICATION_REQUIRED': 'กรุณาล็อกอินก่อนใช้งาน',
        'NO_PERMISSION': 'คุณไม่มีสิทธิ์ดำเนินการนี้',
        'CAR_NOT_AVAILABLE': 'รถไม่พร้อมใช้งานในขณะนี้',
        'CAR_SCHEDULED_FOR_REPAIR': 'รถคันนี้ถูกจองซ่อมในวันดังกล่าว'
    };
    return map[apiMessage] || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
}

/**
 * Show Loading State
 */
function showLoading(elementId) {
    try {
        var element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
            element.innerHTML = '<div style="text-align: center; padding: 40px;"><div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4285f4; border-radius: 50%; animation: spin 1s linear infinite;"></div><p style="margin-top: 20px; color: #666;">กำลังโหลด...</p></div>';
        }
    } catch (error) {
        console.error('Error showing loading:', error);
    }
}

/**
 * Hide Loading State
 */
function hideLoading(elementId) {
    try {
        var element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    } catch (error) {
        console.error('Error hiding loading:', error);
    }
}

/**
 * API Call Helper
 */
async function apiCall(action, data, options) {
    options = options || {};
    var timeout = options.timeout || 30000; // 30 seconds default
    var timeoutId;
    var submitBtn = options.submitButtonId ? document.getElementById(options.submitButtonId) : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('data-prev-disabled', submitBtn.getAttribute('disabled'));
    }

    // OFFLINE-FIRST: ตรวจสอบว่า API_BASE_URL ว่างหรือไม่
    var baseUrl = window.API_BASE_URL || API_BASE_URL || '';
    var useOfflineMode = !baseUrl || baseUrl.trim() === '';

    // ถ้าใช้ offline mode หรือมี mockApiCall function ให้ใช้ mock
    if (useOfflineMode || (typeof mockApiCall !== 'undefined')) {
        try {
            if (typeof mockApiCall === 'function') {
                // console.log('[OFFLINE MODE] Using mock API for action:', action);
                var mockResult = await mockApiCall(action, data || {});
                if (submitBtn) submitBtn.disabled = false;
                return mockResult;
            } else {
                console.warn('[OFFLINE MODE] mockApiCall not available.');
                throw new Error('Offline mode requires offline-mock.js');
            }
        } catch (mockError) {
            console.error('[OFFLINE MODE] Mock API error:', mockError);
            if (submitBtn) submitBtn.disabled = false;
            throw mockError;
        }
    }

    // ONLINE MODE
    try {
        var payload = { action: action };
        Object.keys(data || {}).forEach(function (k) { payload[k] = data[k]; });

        var controller = new AbortController();
        timeoutId = setTimeout(function () {
            controller.abort();
        }, timeout);

        // Build request headers — add JWT Bearer token if available
        var headers = { 'Content-Type': 'application/json' };
        var token = sessionStorage.getItem('ppk_drivehub_token');
        if (token) headers['Authorization'] = 'Bearer ' + token;

        var response = await fetch(baseUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            var errorData = null;
            try { errorData = await response.json(); } catch (e) { }
            var error = new Error('HTTP error! status: ' + response.status);
            error.status = response.status;
            error.error = errorData ? errorData.error : null;
            error.message = errorData ? errorData.message : error.message;
            throw error;
        }

        var result = await response.json();

        if (result.success === false) {
            var msg = (typeof getUserMessage !== 'undefined' ? getUserMessage(result.message) : null) || 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
            var apiError = new Error(msg);
            apiError.error = result.error;
            throw apiError;
        }

        return result;
    } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            var timeoutError = new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
            timeoutError.isTimeout = true;
            throw timeoutError;
        }

        // OFFLINE-FIRST FALLBACK
        if (typeof mockApiCall === 'function' && (error.message.indexOf('Failed to fetch') !== -1 ||
            error.message.indexOf('NetworkError') !== -1 || error.message.indexOf('CORS') !== -1)) {
            console.warn('[OFFLINE MODE] Network error detected, falling back to mock API:', error.message);
            try {
                var mockResult = await mockApiCall(action, data || {});
                if (submitBtn) submitBtn.disabled = false;
                return mockResult;
            } catch (mockError) {
                console.error('[OFFLINE MODE] Mock API fallback also failed:', mockError);
            }
        }

        console.error('API call error:', error);
        throw error;
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

/**
 * Show alert message
 */
function showAlert(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;

    var alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-' + type;

    var colors = {
        'error': '#f44336',
        'success': '#4caf50',
        'warning': '#ff9800',
        'info': '#2196f3'
    };

    alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; background: ' +
        (colors[type] || colors.info) +
        '; color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; max-width: 400px; font-size: 0.95em; ' +
        'opacity: 0; transform: translateX(100%); transition: all 0.3s ease;';

    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(function () {
        alertDiv.style.opacity = '1';
        alertDiv.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(function () {
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateX(100%)';
        setTimeout(function () {
            if (alertDiv.parentNode) {
                document.body.removeChild(alertDiv);
            }
        }, 300);
    }, duration);
}

/**
 * Show confirmation dialog
 */
function showConfirm(message, onConfirm, onCancel) {
    var confirmed = confirm(message);
    if (confirmed && onConfirm) {
        onConfirm();
    } else if (!confirmed && onCancel) {
        onCancel();
    }
    return confirmed;
}

/**
 * Format date to Thai format
 */
function formatDateThai(dateString) {
    if (!dateString) return '';
    var date = new Date(dateString + 'T00:00:00');
    var months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return date.getDate() + ' ' + months[date.getMonth()] + ' ' + (date.getFullYear() + 543);
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    if (!amount) return '0.00';
    return parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Validate Email Format
 */
function validateEmail(email) {
    if (!email) return false;
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Date Range
 */
function validateDateRange(date, minDate, maxDate) {
    if (!date) return { valid: false, message: 'กรุณาเลือกวันที่' };

    var dateObj = new Date(date + 'T00:00:00');
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    if (minDate) {
        var minDateObj = new Date(minDate + 'T00:00:00');
        if (dateObj < minDateObj) { return { valid: false, message: 'วันที่ต้องไม่น้อยกว่า ' + formatDateThai(minDate) }; }
    }
    if (maxDate) {
        var maxDateObj = new Date(maxDate + 'T00:00:00');
        if (dateObj > maxDateObj) {
            return { valid: false, message: 'วันที่ต้องไม่มากกว่า ' + formatDateThai(maxDate) };
        }
    }

    return { valid: true };
}

/**
 * Validate File Upload (size and type)
 */
function validateFileUpload(file, maxSizeMB, allowedTypes) {
    maxSizeMB = maxSizeMB || 10; // Default 10MB
    allowedTypes = allowedTypes || ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

    if (!file) {
        return { valid: false, message: 'กรุณาเลือกไฟล์' };
    }

    var maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return { valid: false, message: 'ขนาดไฟล์ต้องไม่เกิน ' + maxSizeMB + ' MB' };
    }

    if (allowedTypes.indexOf(file.type) === -1) {
        return { valid: false, message: 'ประเภทไฟล์ไม่ถูกต้อง (รองรับ: ' + allowedTypes.join(', ') + ')' };
    }

    return { valid: true };
}

/**
 * CSS Animation for loading spinner
 */
function initLoadingSpinnerStyle() {
    try {
        if (!document.getElementById('loading-spinner-style')) {
            var style = document.createElement('style');
            style.id = 'loading-spinner-style';
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            if (document.head) {
                document.head.appendChild(style);
            }
        }
    } catch (error) {
        console.error('Error adding loading spinner style:', error);
    }
}

initLoadingSpinnerStyle();

/** เมนูเฉพาะ QR — ใช้เมื่อเปิดหน้าจากสแกน QR โดยไม่ล็อกอิน */
function renderQROnlyNavigation() {
    var nav = '<div class="nav">';
    nav += '<a class="nav-btn" href="qr-usage-record.html" data-page="qr-usage-record">📷 บันทึกใช้รถ</a>';
    nav += '<a class="nav-btn" href="qr-fuel-record.html" data-page="qr-fuel-record">⛽ เติมน้ำมัน</a>';
    nav += '<a class="nav-btn" href="qr-daily-check.html" data-page="qr-daily-check">🔧 ตรวจสภาพ+แจ้งซ่อม</a>';
    nav += '<a class="nav-btn" href="user-guide.html" data-page="user-guide">📖 วิธีใช้งาน</a>';
    nav += '<a class="nav-btn" href="login.html" style="background: #5c6bc0; color: white; border-color: #5c6bc0;">🔐 เข้าสู่ระบบ</a>';
    nav += '</div>';
    return nav;
}

function renderNavigation() {
    var user = getCurrentUser();
    if (!user) return '';

    var nav = '<div class="nav">';
    nav += '<a class="nav-btn" href="dashboard.html" data-page="dashboard">🏠 หน้าแรก</a>';

    if (user && user.driver_id) {
        nav += '<a class="nav-btn" href="driver-history.html" data-page="driver-history">🚗 คิวและประวัติ</a>';
    }

    if (hasModulePermission('queue', 'edit') || hasPermission(['admin'])) {
        nav += '<a class="nav-btn" href="queue-manage.html" data-page="queue">✏️ จัดคิว</a>';
    }

    if (hasModulePermission('vehicles', 'view') || hasPermission(['admin'])) {
        nav += '<a class="nav-btn" href="vehicles.html" data-page="vehicles">🚙 รถ</a>';
    }

    if (hasModulePermission('drivers', 'view') || hasPermission(['admin'])) {
        nav += '<a class="nav-btn" href="drivers.html" data-page="drivers">👤 คนขับ</a>';
    }

    if (hasModulePermission('fuel', 'view') || hasPermission(['admin', 'fuel'])) {
        nav += '<a class="nav-btn" href="fuel-record.html" data-page="fuel">⛽ น้ำมัน</a>';
    }

    if (hasModulePermission('repair', 'view') || hasPermission(['admin', 'repair'])) {
        nav += '<a class="nav-btn" href="repair.html" data-page="repair">🔧 ซ่อมบำรุง</a>';
    }

    if (hasModulePermission('reports', 'view') || hasPermission(['admin', 'viewer', 'vehicle', 'fuel', 'repair'])) {
        nav += '<a class="nav-btn" href="reports.html" data-page="reports">📊 รายงาน</a>';
    }

    if (hasModulePermission('usage_log', 'view')) {
        nav += '<a class="nav-btn" href="usage-log.html" data-page="usage-log">📝 บันทึกการใช้งาน</a>';
    }

    nav += '<a class="nav-btn" href="qr-usage-record.html" data-page="qr-usage-record">📷 สแกน QR บันทึกใช้รถ</a>';
    nav += '<a class="nav-btn" href="qr-fuel-record.html" data-page="qr-fuel-record">⛽ สแกน QR เติมน้ำมัน</a>';
    nav += '<a class="nav-btn" href="qr-daily-check.html" data-page="qr-daily-check">🔧 สแกน QR ตรวจสภาพ+แจ้งซ่อม</a>';

    if (user) {
        nav += '<a class="nav-btn" href="notifications.html" data-page="notifications">🔔 การแจ้งเตือน</a>';
    }

    if (hasPermission(['admin'])) {
        nav += '<a class="nav-btn" href="admin-settings.html" data-page="settings">⚙️ ตั้งค่าระบบ</a>';
    }

    nav += '<a class="nav-btn" href="user-guide.html" data-page="user-guide">📖 วิธีใช้งาน</a>';
    nav += '<a class="nav-btn" href="profile.html" data-page="profile">👤 ตั้งค่าส่วนตัว</a>';
    nav += '<a class="nav-btn" href="#" onclick="logout(); return false;" style="background: #f44336; color: white; border-color: #f44336;">🚪 ออกจากระบบ</a>';
    nav += '</div>';

    return nav;
}

function logout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        sessionStorage.removeItem('ppk_drivehub_user');
        sessionStorage.removeItem('ppk_drivehub_token');
        window.location.href = 'login.html';
    }
}

function renderNav() {
    var navContainer = document.getElementById('navigation');
    if (!navContainer) return;
    if (window.REQUIRE_AUTH === false) {
        navContainer.innerHTML = renderQROnlyNavigation();
    } else {
        navContainer.innerHTML = renderNavigation();
    }
    setActiveMenu();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNav);
} else {
    renderNav();
}

// Flatpickr Helper Functions
function initThaiDatePicker(selector, options) {
    options = options || {};
    return flatpickr(selector, {
        dateFormat: 'Y-m-d',
        allowInput: true,
        ...options
    });
}

function initThaiTimePicker(selector, options) {
    options = options || {};
    return flatpickr(selector, {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        allowInput: true,
        ...options
    });
}

function initThaiDateTimePicker(selector, options) {
    options = options || {};
    return flatpickr(selector, {
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        time_24hr: true,
        allowInput: true,
        ...options
    });
}

function initAllThaiDateTimePickers() {
    if (typeof flatpickr === 'undefined') {
        return;
    }
    document.querySelectorAll('input[type="date"]').forEach(function (input) {
        if (!input.hasAttribute('data-flatpickr-initialized') && input.offsetParent !== null) {
            try {
                initThaiDatePicker(input);
                input.setAttribute('data-flatpickr-initialized', 'true');
            } catch (e) { }
        }
    });
    document.querySelectorAll('input[type="time"]').forEach(function (input) {
        if (!input.hasAttribute('data-flatpickr-initialized') && input.offsetParent !== null) {
            try {
                initThaiTimePicker(input);
                input.setAttribute('data-flatpickr-initialized', 'true');
            } catch (e) { }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(initAllThaiDateTimePickers, 300);
    });
} else {
    setTimeout(initAllThaiDateTimePickers, 300);
}
