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
        document.querySelectorAll('.sidebar-item').forEach(function (el) { el.classList.remove('active'); });
        var active = document.querySelector('.sidebar-item[data-page="' + currentPage + '"]');
        if (active) active.classList.add('active');
        // legacy support for QR pages
        document.querySelectorAll('.nav-btn').forEach(function (btn) { btn.classList.remove('active'); });
        var activeBtn = document.querySelector('.nav-btn[data-page="' + currentPage + '"]');
        if (activeBtn) activeBtn.classList.add('active');
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
        '<a class="nav-btn" href="login.html" style="background:rgba(30,136,229,0.5);color:white;border-color:#1e88e5;">🔐 เข้าสู่ระบบ</a>' +
        '</div>';
}

function _sidebarItem(href, page, icon, label) {
    return '<a class="sidebar-item" href="' + href + '" data-page="' + page + '">' +
        '<span class="si-icon">' + icon + '</span>' +
        '<span class="si-label">' + label + '</span>' +
        '</a>';
}

function _sidebarSection(title) {
    return '<div class="sidebar-section-title">' + title + '</div>';
}

function renderNavigation() {
    var user = getCurrentUser();
    if (!user) return '';

    var roleLabel = { super_admin: 'ผู้ดูแลสูงสุด', admin: 'ผู้ดูแลระบบ', manager: 'ผู้จัดการ', driver: 'พนักงานขับรถ', staff: 'เจ้าหน้าที่' };
    var initials = (user.full_name || user.username || '?').charAt(0).toUpperCase();

    var nav = '';
    // Brand
    nav += '<a class="sidebar-brand" href="dashboard.html">' +
        '<div class="sidebar-brand-icon">🚐</div>' +
        '<div class="sidebar-brand-text">' +
        '<div class="sidebar-brand-title">PPK DriveHub</div>' +
        '<div class="sidebar-brand-sub">ระบบจัดการยานพาหนะ</div>' +
        '</div></a>';

    // User info
    nav += '<div class="sidebar-user">' +
        '<div class="sidebar-user-avatar">' + initials + '</div>' +
        '<div class="sidebar-user-info">' +
        '<div class="sidebar-user-name">' + (user.full_name || user.username || '') + '</div>' +
        '<div class="sidebar-user-role">' + (roleLabel[user.role] || user.role || '') + '</div>' +
        '</div></div>';

    nav += '<nav class="sidebar-nav">';

    // ── ภาพรวม ──
    nav += _sidebarSection('ภาพรวม');
    nav += _sidebarItem('dashboard.html', 'dashboard', '🏠', 'หน้าแรก');
    nav += _sidebarItem('notifications.html', 'notifications', '🔔', 'การแจ้งเตือน');

    // ── การใช้รถ ──
    nav += _sidebarSection('การใช้รถ');
    if (hasModulePermission('queue', 'edit') || hasPermission(['admin'])) {
        nav += _sidebarItem('queue-manage.html', 'queue', '📅', 'จัดการคิวรถ');
    }
    if (hasModulePermission('usage_log', 'view') || hasPermission(['admin'])) {
        nav += _sidebarItem('usage-log.html', 'usage-log', '📝', 'บันทึกการใช้รถ');
    }
    if (user.driver_id || hasPermission(['admin'])) {
        nav += _sidebarItem('driver-history.html', 'driver-history', '📋', 'คิวและประวัติส่วนตัว');
    }

    // ── ยานพาหนะ ──
    nav += _sidebarSection('ยานพาหนะ');
    if (hasModulePermission('vehicles', 'view') || hasPermission(['admin'])) {
        nav += _sidebarItem('vehicles.html', 'vehicles', '🚙', 'ทะเบียนรถ');
    }
    if (hasModulePermission('vehicles', 'view') || hasPermission(['admin'])) {
        nav += _sidebarItem('tax-insurance.html', 'tax-insurance', '📄', 'ภาษีและประกันภัย');
    }

    // ── บำรุงรักษา ──
    nav += _sidebarSection('บำรุงรักษา');
    if (hasModulePermission('fuel', 'view') || hasPermission(['admin'])) {
        nav += _sidebarItem('fuel-record.html', 'fuel-record', '⛽', 'บันทึกเติมน้ำมัน');
    }
    if (hasModulePermission('repair', 'view') || hasPermission(['admin'])) {
        nav += _sidebarItem('repair.html', 'repair', '🔧', 'บันทึกการซ่อม');
    }

    // ── พนักงาน ──
    if (hasModulePermission('drivers', 'view') || hasPermission(['admin'])) {
        nav += _sidebarSection('พนักงาน');
        nav += _sidebarItem('drivers.html', 'drivers', '👷', 'ข้อมูลพนักงาน');
    }

    // ── รายงาน ──
    if (hasModulePermission('reports', 'view') || hasPermission(['admin'])) {
        nav += _sidebarSection('รายงาน');
        nav += _sidebarItem('reports.html', 'reports', '📊', 'รายงานและสถิติ');
    }

    // ── QR Code ──
    nav += _sidebarSection('สแกน QR Code');
    nav += _sidebarItem('qr-usage-record.html', 'qr-usage-record', '📷', 'บันทึกใช้รถ');
    nav += _sidebarItem('qr-fuel-record.html', 'qr-fuel-record', '🛢️', 'เติมน้ำมัน');
    nav += _sidebarItem('qr-daily-check.html', 'qr-daily-check', '✅', 'ตรวจสภาพ/แจ้งซ่อม');

    // ── ผู้ดูแลระบบ ──
    if (hasPermission(['admin', 'super_admin'])) {
        nav += _sidebarSection('ผู้ดูแลระบบ');
        nav += _sidebarItem('admin-settings.html', 'settings', '⚙️', 'ตั้งค่าระบบ');
        nav += _sidebarItem('audit-log.html', 'audit-log', '📜', 'บันทึกกิจกรรม');
        nav += _sidebarItem('backup-recovery.html', 'backup-recovery', '💾', 'สำรอง/กู้คืน');
    }

    // ── ส่วนตัว ──
    nav += '<div class="sidebar-divider"></div>';
    nav += _sidebarSection('ส่วนตัว');
    nav += _sidebarItem('profile.html', 'profile', '👤', 'โปรไฟล์ของฉัน');
    nav += _sidebarItem('user-guide.html', 'user-guide', '📖', 'วิธีใช้งาน');
    nav += _sidebarItem('about.html', 'about', 'ℹ️', 'เกี่ยวกับโปรแกรม');
    nav += '<div class="sidebar-divider"></div>';
    nav += '<a class="sidebar-item sidebar-item-logout" href="#" onclick="logout();return false;">' +
        '<span class="si-icon">🚪</span><span class="si-label">ออกจากระบบ</span></a>';

    nav += '</nav>';
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
    if (window.REQUIRE_AUTH === false) {
        // QR pages: inject simple bar nav into #navigation
        var navContainer = document.getElementById('navigation');
        if (navContainer) {
            navContainer.innerHTML = renderQROnlyNavigation();
            setActiveMenu();
        }
        return;
    }

    // Full sidebar layout — rebuild body structure
    var body = document.body;
    var oldContainer = body.querySelector('.container');
    if (!oldContainer) return;

    // Extract inner parts from old container
    var headerEl = oldContainer.querySelector('.header');
    var contentEl = oldContainer.querySelector('.content');
    var navEl = oldContainer.querySelector('#navigation');

    // Remove old #navigation placeholder (sidebar will live outside .container)
    if (navEl) navEl.parentNode.removeChild(navEl);

    // Build sidebar element
    var sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.id = 'sidebar';
    sidebar.innerHTML = renderNavigation();

    // Build overlay (mobile)
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.addEventListener('click', function () {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    });

    // Build topbar
    var user = getCurrentUser();
    var initials = user ? (user.full_name || user.username || '?').charAt(0).toUpperCase() : '?';
    var pageTitle = headerEl ? (headerEl.querySelector('h1') || {}).textContent || document.title : document.title;
    var topbar = document.createElement('div');
    topbar.className = 'topbar';
    topbar.innerHTML =
        '<button class="topbar-hamburger" id="topbar-hamburger" aria-label="เมนู">&#9776;</button>' +
        '<div class="topbar-title">' + pageTitle + '</div>' +
        '<div class="topbar-user">' +
        '<div class="topbar-avatar">' + initials + '</div>' +
        '</div>';

    // Build main-area: topbar + container (existing header + content)
    var mainArea = document.createElement('div');
    mainArea.className = 'main-area';
    mainArea.appendChild(topbar);
    mainArea.appendChild(oldContainer); // moves oldContainer out of body into mainArea

    // Insert: sidebar → overlay → mainArea at the top of body (before scripts etc.)
    body.insertBefore(mainArea, body.firstChild);
    body.insertBefore(overlay, body.firstChild);
    body.insertBefore(sidebar, body.firstChild);

    // Hamburger toggle
    var hamburger = document.getElementById('topbar-hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });
    }

    setActiveMenu();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderNav);
else renderNav();

/* ── Wrap all plain <table> elements in a scrollable div ── */
function wrapTablesForMobile() {
    document.querySelectorAll('table').forEach(function (tbl) {
        if (tbl.parentElement && tbl.parentElement.classList.contains('table-wrap')) return;
        var wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        tbl.parentNode.insertBefore(wrap, tbl);
        wrap.appendChild(tbl);
    });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrapTablesForMobile);
else wrapTablesForMobile();


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
