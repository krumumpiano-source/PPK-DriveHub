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

    // ── หน้าแรก (ไม่มีหมวด) ──
    nav += _sidebarItem('dashboard.html', 'dashboard', '🏠', 'หน้าแรก');

    // ── 1. คิวและการใช้รถ ──
    var hasQueue = hasModulePermission('queue', 'edit') || hasPermission(['admin']);
    var hasUsage = hasModulePermission('usage_log', 'view') || hasPermission(['admin']);
    var hasHistory = user.driver_id || user.role === 'driver' || hasPermission(['admin']);
    if (true) {
        nav += _sidebarSection('คิวและการใช้รถ');
        // driver ไม่ต้องขอใช้รถ — แสดงเฉพาะ non-driver หรือ admin
        if (user.role !== 'driver') nav += _sidebarItem('vehicle-request.html', 'vehicle-request', '📝', 'ขอใช้รถ');
        if (hasQueue) nav += _sidebarItem('queue-manage.html', 'queue', '📅', 'จัดการคิวรถ');
        if (hasUsage) nav += _sidebarItem('usage-log.html', 'usage-log', '📝', 'บันทึกการใช้รถ');
        if (hasHistory) nav += _sidebarItem('driver-history.html', 'driver-history', '📋', 'คิวและประวัติส่วนตัว');
    }

    // ── 2. ระบบน้ำมัน ──
    if (hasModulePermission('fuel', 'view') || hasPermission(['admin'])) {
        nav += _sidebarSection('ระบบน้ำมัน');
        nav += _sidebarItem('fuel-record.html', 'fuel-record', '⛽', 'บันทึกเติมน้ำมัน');
        nav += _sidebarItem('fuel-reconcile.html', 'fuel-reconcile', '📄', 'เปรียบเทียบบิลน้ำมัน');
        nav += _sidebarItem('fuel-ledger.html', 'fuel-ledger', '📒', 'ทะเบียนควบคุมน้ำมัน');
    }

    // ── 3. ระบบซ่อม ──
    var hasRepair = hasModulePermission('repair', 'view') || hasPermission(['admin']);
    var hasTax = hasModulePermission('vehicles', 'view') || hasPermission(['admin']);
    var isDriver = user.role === 'driver' || !!user.driver_id;
    if (hasRepair || hasTax || isDriver) {
        nav += _sidebarSection('ระบบซ่อมและตรวจสภาพ');
        if (hasRepair) nav += _sidebarItem('repair.html', 'repair', '🔧', 'บันทึกการซ่อม');
        else if (isDriver) nav += _sidebarItem('repair.html', 'repair', '🔧', 'แจ้งซ่อม');
        if (hasTax) nav += _sidebarItem('tax-insurance.html', 'tax-insurance', '📄', 'ภาษี/ประกัน/ตรอ.');
        nav += _sidebarItem('incident.html', 'incident', '🚨', 'รายงานเหตุการณ์');
    }

    // ── 4. สแกน QR Code ──
    nav += _sidebarSection('สแกน QR Code');
    nav += _sidebarItem('qr-scan.html', 'qr-scan', '📱', 'สแกน QR Code');

    // ── 5. รายงานและสถิติ ──
    if (hasModulePermission('reports', 'view') || hasPermission(['admin'])) {
        nav += _sidebarSection('รายงานและสถิติ');
        nav += _sidebarItem('reports.html', 'reports', '📊', 'รายงานและสถิติ');
        nav += _sidebarItem('driver-performance.html', 'driver-performance', '🏆', 'ผลงานพนักงาน');
        nav += _sidebarItem('vehicle-timeline.html', 'vehicle-timeline', '🚗', 'ไทม์ไลน์รถ');
        nav += _sidebarItem('executive-dashboard.html', 'executive-dashboard', '📈', 'Dashboard ผู้บริหาร');
        nav += _sidebarItem('basic-info.html', 'basic-info', '📋', 'ข้อมูลรถและพนักงาน');
    }

    // ── 6. ตั้งค่าส่วนตัว ──
    nav += _sidebarSection('ตั้งค่าส่วนตัว');
    nav += _sidebarItem('profile.html', 'profile', '👤', 'โปรไฟล์ของฉัน');
    nav += _sidebarItem('notifications.html', 'notifications', '🔔', 'การแจ้งเตือน');
    nav += _sidebarItem('change-password.html', 'change-password', '🔑', 'เปลี่ยนรหัสผ่าน');
    nav += _sidebarItem('user-guide.html', 'user-guide', '📖', 'วิธีใช้งาน');
    nav += _sidebarItem('about.html', 'about', 'ℹ️', 'เกี่ยวกับโปรแกรม');

    // ── 7. ผู้ดูแลระบบ ──
    if (hasPermission(['admin', 'super_admin'])) {
        nav += _sidebarSection('ผู้ดูแลระบบ');
        nav += _sidebarItem('vehicles.html', 'vehicles', '🚙', 'จัดการข้อมูลรถ');
        nav += _sidebarItem('drivers.html', 'drivers', '👷', 'จัดการพนักงานขับรถ');
        nav += _sidebarItem('qr-manage.html', 'qr-manage', '📱', 'จัดการ QR Code');
        nav += _sidebarItem('user-management.html', 'user-management', '👥', 'จัดการผู้ใช้');
        nav += _sidebarItem('admin-settings.html', 'settings', '⚙️', 'ตั้งค่าระบบ');
        nav += _sidebarItem('audit-log.html', 'audit-log', '📜', 'บันทึกกิจกรรม');
        nav += _sidebarItem('backup-recovery.html', 'backup-recovery', '💾', 'สำรอง/กู้คืน');

        // ── ดูมุมมองตามบทบาท ──
        nav += '<div class="sidebar-divider"></div>';
        nav += '<div class="sidebar-section-title">ดูมุมมองตามบทบาท</div>';
        nav += '<div class="role-preview-group">';
        nav += '<button class="role-preview-btn" onclick="previewRole(\'admin\')"><span class="rp-icon">🛡️</span>ผู้ดูแลระบบ</button>';
        nav += '<button class="role-preview-btn" onclick="previewRole(\'manager\')"><span class="rp-icon">📋</span>ผู้จัดการ</button>';
        nav += '<button class="role-preview-btn" onclick="previewRole(\'driver\')"><span class="rp-icon">🚗</span>พนักงานขับรถ</button>';
        nav += '<button class="role-preview-btn" onclick="previewRole(\'staff\')"><span class="rp-icon">👤</span>เจ้าหน้าที่</button>';
        nav += '</div>';
    }

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
        // QR pages: if user is logged in, show full sidebar
        if (checkAuth()) {
            // Fall through to full sidebar layout below
        } else {
            // Not logged in: show simple QR-only nav bar
            var navContainer = document.getElementById('navigation');
            if (navContainer) {
                navContainer.innerHTML = renderQROnlyNavigation();
                setActiveMenu();
            }
            return;
        }
    }

    // Redirect to login if not authenticated on auth-required pages
    if (window.REQUIRE_AUTH === true && !checkAuth()) {
        window.location.href = 'login.html';
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

    // Move any remaining visible elements (e.g. .footer divs outside .container) into mainArea
    // But keep modal-overlay elements directly under body for proper position:fixed behavior
    Array.from(body.children).forEach(function(el) {
        if (el === sidebar || el === overlay || el === mainArea) return;
        if (['SCRIPT','LINK','STYLE','META','NOSCRIPT'].indexOf(el.tagName) !== -1) return;
        if (el.classList && el.classList.contains('modal-overlay')) return;
        mainArea.appendChild(el);
    });

    // Hamburger toggle
    var hamburger = document.getElementById('topbar-hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });
    }

    setActiveMenu();
    renderFloatingQR();
    renderImpersonationBanner();
}

function renderImpersonationBanner() {
    if (typeof API === 'undefined' || !API.isImpersonating()) return;
    var user = getCurrentUser();
    if (!user) return;

    var roleLabel = { super_admin: 'ผู้ดูแลสูงสุด', admin: 'ผู้ดูแลระบบ', manager: 'ผู้จัดการ', driver: 'พนักงานขับรถ', staff: 'เจ้าหน้าที่' };
    var name = user.full_name || user.display_name || user.username || '';
    var role = roleLabel[user.role] || user.role || '';

    var banner = document.createElement('div');
    banner.className = 'impersonate-banner';

    var impText = document.createElement('div');
    impText.className = 'imp-text';
    impText.textContent = '👁️ กำลังดูมุมมองของ ';
    var strong = document.createElement('strong');
    strong.textContent = name;
    impText.appendChild(strong);
    var badge = document.createElement('span');
    badge.className = 'imp-badge';
    badge.textContent = role;
    impText.appendChild(document.createTextNode(' '));
    impText.appendChild(badge);

    var stopBtn = document.createElement('button');
    stopBtn.className = 'imp-stop-btn';
    stopBtn.textContent = '⬅️ กลับเป็นแอดมิน';
    stopBtn.onclick = stopImpersonateMode;

    banner.appendChild(impText);
    banner.appendChild(stopBtn);

    // Insert banner at top of main-area (after topbar)
    var mainArea = document.querySelector('.main-area');
    if (mainArea) {
        var topbar = mainArea.querySelector('.topbar');
        if (topbar && topbar.nextSibling) {
            mainArea.insertBefore(banner, topbar.nextSibling);
        } else {
            mainArea.insertBefore(banner, mainArea.firstChild);
        }
    }
}

function stopImpersonateMode() {
    if (typeof API === 'undefined') return;
    // If this was a real backend impersonation, clean up session
    if (!localStorage.getItem('ppk_role_preview')) {
        apiCall('stopImpersonate', {}).catch(function() {});
    }
    // Remove role preview flag
    localStorage.removeItem('ppk_role_preview');
    // Restore original admin token/user
    API.stopImpersonate();
    window.location.href = 'dashboard.html';
}

function previewRole(role) {
    if (typeof API === 'undefined') return;
    // Client-side role preview — no backend needed
    var currentUser = API.getUser();
    if (!currentUser) return;

    // Save original credentials (same keys as impersonation)
    if (!API.isImpersonating()) {
        localStorage.setItem('ppk_orig_token', API.getToken());
        localStorage.setItem('ppk_orig_user', JSON.stringify(currentUser));
    }

    // Create preview user with target role + empty permissions
    var previewUser = JSON.parse(JSON.stringify(currentUser));
    previewUser.role = role;
    previewUser.permissions = {};
    previewUser.is_impersonated = true;
    API.setUser(previewUser);

    // Flag so we know it's a client-side preview (not real impersonation)
    localStorage.setItem('ppk_role_preview', '1');

    window.location.href = 'dashboard.html';
}

function renderFloatingQR() {
    // Removed — QR scan accessible via sidebar menu
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderNav);
else renderNav();

/* ── PWA: register service worker + inject manifest ── */
(function(){
  if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW registration failed',e)})}
  if(!document.querySelector('link[rel="manifest"]')){var l=document.createElement('link');l.rel='manifest';l.href='/manifest.json';document.head.appendChild(l)}
  if(!document.querySelector('meta[name="theme-color"]')){var m=document.createElement('meta');m.name='theme-color';m.content='#6366f1';document.head.appendChild(m)}
})();

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

// ===== Audit Meta Display: บันทึกโดย/แก้ไขโดย =====
function _formatAuditTime(ts) {
    if (!ts) return '';
    try {
        var d = new Date(ts);
        if (isNaN(d.getTime())) return ts;
        var months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + (d.getFullYear() + 543) +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return ts; }
}

function _displayCreator(name) {
    if (!name || name === '-') return 'ไม่ระบุ';
    if (name === 'qr' || name === 'QR') return 'ผ่าน QR (ไม่ระบุตัวตน)';
    return name;
}

// แสดง "บันทึกโดย ... / แก้ไขล่าสุด ..." สำหรับ row ที่มี created_by_name, created_at, updated_by_name, updated_at
function renderAuditMeta(row) {
    if (!row) return '';
    var created = _displayCreator(row.created_by_name);
    var createdAt = _formatAuditTime(row.created_at);
    var html = '<small style="color:#666;display:block;margin-top:4px">' +
        '📝 บันทึกโดย: <b>' + created + '</b>' +
        (createdAt ? ' <span style="color:#999">(' + createdAt + ')</span>' : '') +
        '</small>';
    if (row.updated_by_name && row.updated_at && row.updated_at !== row.created_at) {
        html += '<small style="color:#e67e22;display:block">' +
            '✏️ แก้ไขล่าสุด: <b>' + _displayCreator(row.updated_by_name) + '</b>' +
            ' <span style="color:#999">(' + _formatAuditTime(row.updated_at) + ')</span>' +
            '</small>';
    }
    return html;
}

// แบบสั้นบรรทัดเดียว สำหรับใส่ในตาราง
function renderAuditMetaInline(row) {
    if (!row) return '-';
    var created = _displayCreator(row.created_by_name);
    var s = '<small>' + created;
    if (row.updated_by_name && row.updated_at && row.updated_at !== row.created_at) {
        s += ' <span style="color:#e67e22">/ แก้: ' + _displayCreator(row.updated_by_name) + '</span>';
    }
    s += '</small>';
    return s;
}

if (typeof window !== 'undefined') {
    window.renderAuditMeta = renderAuditMeta;
    window.renderAuditMetaInline = renderAuditMetaInline;
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

var THAI_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
var THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
var THAI_WEEKDAYS_SHORT = ['อา','จ','อ','พ','พฤ','ศ','ส'];
var THAI_WEEKDAYS_LONG = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function getThaiLocale() {
    return {
        weekdays: { shorthand: THAI_WEEKDAYS_SHORT, longhand: THAI_WEEKDAYS_LONG },
        months: { shorthand: THAI_MONTHS_SHORT, longhand: THAI_MONTHS_FULL },
        firstDayOfWeek: 0,
        rangeSeparator: ' ถึง ',
        weekAbbreviation: 'สัปดาห์',
        scrollTitle: 'เลื่อนเพื่อเปลี่ยน',
        toggleTitle: 'คลิกเพื่อสลับ'
    };
}

// Update flatpickr year input to show BE year (year + 543)
function _patchBEYear(fpInstance) {
    if (!fpInstance || !fpInstance.calendarContainer) return;
    var yearEls = fpInstance.calendarContainer.querySelectorAll('.cur-year');
    yearEls.forEach(function (el) {
        var ce = parseInt(el.value, 10);
        if (!isNaN(ce) && ce < 2500) {
            el.value = ce + 543;
            el.setAttribute('data-ce-year', ce);
            // Disable arrow inputs to avoid corruption (BE display is read-only)
        }
    });
}

function initThaiDatePicker(selector, options) {
    if (typeof flatpickr === 'undefined') return null;
    var baseOpts = {
        dateFormat: 'Y-m-d',
        allowInput: false,
        altInput: true,
        altFormat: 'j F Y',
        locale: getThaiLocale(),
        formatDate: function(date, format) {
            if (format === 'Y-m-d') {
                var y = date.getFullYear(), m = date.getMonth()+1, d = date.getDate();
                return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
            }
            // any other format (altFormat) → full Thai date with BE year
            return date.getDate() + ' ' + THAI_MONTHS_FULL[date.getMonth()] + ' ' + (date.getFullYear() + 543);
        },
        parseDate: function(dateStr, format) {
            if (!dateStr) return null;
            var iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2])-1, parseInt(iso[3]));
            var parts = dateStr.trim().split(/\s+/);
            if (parts.length === 3) {
                var day = parseInt(parts[0]);
                var month = THAI_MONTHS_FULL.indexOf(parts[1]);
                if (month < 0) month = THAI_MONTHS_SHORT.indexOf(parts[1]);
                var yr = parseInt(parts[2]);
                if (!isNaN(yr) && yr > 2400) yr -= 543;
                if (!isNaN(day) && month >= 0 && !isNaN(yr)) return new Date(yr, month, day);
            }
            return null;
        },
        onReady: function(selDates, dStr, inst) { _patchBEYear(inst); _attachScrollClose(inst); },
        onMonthChange: function(selDates, dStr, inst) { _patchBEYear(inst); },
        onYearChange: function(selDates, dStr, inst) { _patchBEYear(inst); },
        onOpen: function(selDates, dStr, inst) { _patchBEYear(inst); _attachScrollClose(inst); }
    };
    return flatpickr(selector, Object.assign(baseOpts, options || {}));
}

function initThaiTimePicker(selector, options) {
    if (typeof flatpickr === 'undefined') return null;
    var fp = flatpickr(selector, Object.assign({
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        allowInput: true,
        minuteIncrement: 1,
        locale: getThaiLocale(),
        onReady: function(selDates, dStr, inst) { _attachTimeWheel(inst); _attachScrollClose(inst); },
        onOpen: function(selDates, dStr, inst) { _attachTimeWheel(inst); _attachScrollClose(inst); }
    }, options || {}));
    return fp;
}

// Close picker when user scrolls outside the picker (so popup doesn't stick on screen)
function _attachScrollClose(inst) {
    if (!inst || inst._scrollCloseAttached) return;
    inst._scrollCloseAttached = true;
    var handler = function(e) {
        if (!inst.isOpen) return;
        if (inst.calendarContainer && inst.calendarContainer.contains(e.target)) return;
        inst.close();
    };
    inst._scrollCloseHandler = handler;
    window.addEventListener('scroll', handler, true);
}

// Make mouse wheel scroll change hour/minute on flatpickr time picker
function _attachTimeWheel(inst) {
    if (!inst || !inst.calendarContainer || inst._wheelAttached) return;
    inst._wheelAttached = true;
    var hourEl = inst.hourElement, minEl = inst.minuteElement;
    function bindWheel(el, isHour) {
        if (!el) return;
        el.addEventListener('wheel', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var dir = e.deltaY < 0 ? 1 : -1;
            var cur = parseInt(el.value, 10) || 0;
            var max = isHour ? 23 : 59;
            var next = cur + dir;
            if (next < 0) next = max;
            if (next > max) next = 0;
            el.value = (next < 10 ? '0' : '') + next;
            // trigger flatpickr to recalc
            var ev = new Event('input', { bubbles: true });
            el.dispatchEvent(ev);
            var changeEv = new Event('change', { bubbles: true });
            el.dispatchEvent(changeEv);
        }, { passive: false });
    }
    bindWheel(hourEl, true);
    bindWheel(minEl, false);
}

function initThaiDateTimePicker(selector, options) {
    if (typeof flatpickr === 'undefined') return null;
    return flatpickr(selector, Object.assign({
        enableTime: true,
        dateFormat: 'Y-m-d H:i',
        time_24hr: true,
        allowInput: false,
        altInput: true,
        altFormat: 'j F Y H:i',
        locale: getThaiLocale(),
        formatDate: function(date, format) {
            if (format === 'Y-m-d H:i') {
                var y=date.getFullYear(),m=date.getMonth()+1,d=date.getDate(),h=date.getHours(),mn=date.getMinutes();
                return y+'-'+(m<10?'0':'')+m+'-'+(d<10?'0':'')+d+' '+(h<10?'0':'')+h+':'+(mn<10?'0':'')+mn;
            }
            var hh = date.getHours(), mm = date.getMinutes();
            return date.getDate()+' '+THAI_MONTHS_FULL[date.getMonth()]+' '+(date.getFullYear()+543)+' '+(hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;
        },
        onReady: function(s,d,inst){ _patchBEYear(inst); _attachScrollClose(inst); },
        onMonthChange: function(s,d,inst){ _patchBEYear(inst); },
        onYearChange: function(s,d,inst){ _patchBEYear(inst); },
        onOpen: function(s,d,inst){ _patchBEYear(inst); _attachScrollClose(inst); }
    }, options || {}));
}

function initAllThaiDateTimePickers() {
    if (typeof flatpickr === 'undefined') return;
    document.querySelectorAll('input[type="date"]:not([data-flatpickr-initialized]), input.thai-datepicker:not([data-flatpickr-initialized])').forEach(function (el) {
        try { initThaiDatePicker(el); el.setAttribute('data-flatpickr-initialized', 'true'); }
        catch (e) { console.error('initThaiDatePicker failed for', el, e); }
    });
    document.querySelectorAll('input[type="time"]:not([data-flatpickr-initialized]), input.thai-timepicker:not([data-flatpickr-initialized])').forEach(function (el) {
        try { initThaiTimePicker(el); el.setAttribute('data-flatpickr-initialized', 'true'); }
        catch (e) { console.error('initThaiTimePicker failed for', el, e); }
    });
}

// Run init multiple times to catch:
// - inputs that exist at DOMContentLoaded (initial pass)
// - inputs whose values are set programmatically by page scripts after DOMContentLoaded
// - inputs that are dynamically inserted later (e.g., modals, lazy-rendered content)
function _scheduleThaiPickerInit() {
    // Pass 1: immediately after DOMContentLoaded — covers static inputs
    setTimeout(initAllThaiDateTimePickers, 50);
    // Pass 2: after page's own DOMContentLoaded handlers finish setting values
    setTimeout(initAllThaiDateTimePickers, 400);
    // Pass 3: late safety net — covers async loads
    setTimeout(initAllThaiDateTimePickers, 1500);

    // Pass 4: MutationObserver — catch dynamically inserted inputs (modals etc.)
    if (typeof MutationObserver !== 'undefined') {
        try {
            var obs = new MutationObserver(function (mutations) {
                var needsInit = false;
                for (var i = 0; i < mutations.length; i++) {
                    if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
                        needsInit = true; break;
                    }
                }
                if (needsInit) initAllThaiDateTimePickers();
            });
            obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
        } catch (e) { /* ignore */ }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _scheduleThaiPickerInit);
} else {
    _scheduleThaiPickerInit();
}
