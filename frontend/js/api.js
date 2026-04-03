const API = (() => {
  const BASE = '';  // relative paths — works on any domain

  function getToken() {
    return localStorage.getItem('ppk_token') || sessionStorage.getItem('ppk_token');
  }
  function setToken(t, remember = true) {
    if (t) {
      if (remember) localStorage.setItem('ppk_token', t);
      else sessionStorage.setItem('ppk_token', t);
    } else {
      localStorage.removeItem('ppk_token');
      sessionStorage.removeItem('ppk_token');
    }
  }
  function clearAuth() {
    setToken(null);
    localStorage.removeItem('ppk_user');
    sessionStorage.removeItem('ppk_user');
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem('ppk_user') || sessionStorage.getItem('ppk_user') || 'null'); }
    catch { return null; }
  }
  function setUser(u) {
    const s = JSON.stringify(u);
    if (localStorage.getItem('ppk_token')) localStorage.setItem('ppk_user', s);
    else sessionStorage.setItem('ppk_user', s);
  }

  async function request(path, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body && typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
    let resp;
    try {
      resp = await fetch(BASE + path, { ...options, headers });
    } catch (e) {
      throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเตอร์เน็ต');
    }
    const data = await resp.json().catch(() => ({ success: false, message: `HTTP ${resp.status}` }));
    if (resp.status === 401) {
      clearAuth();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login.html';
      }
      throw new Error(data.error || data.message || 'กรุณาเข้าสู่ระบบใหม่');
    }
    if (!resp.ok) throw new Error(data.message || data.error || `HTTP ${resp.status}`);
    return data;
  }

  function startImpersonate(token, userData) {
    // Save original admin credentials
    localStorage.setItem('ppk_orig_token', getToken());
    localStorage.setItem('ppk_orig_user', localStorage.getItem('ppk_user') || sessionStorage.getItem('ppk_user'));
    // Switch to impersonated user
    localStorage.setItem('ppk_token', token);
    setUser(userData);
  }

  function stopImpersonate() {
    var origToken = localStorage.getItem('ppk_orig_token');
    var origUser = localStorage.getItem('ppk_orig_user');
    if (origToken) {
      localStorage.setItem('ppk_token', origToken);
      localStorage.removeItem('ppk_orig_token');
    }
    if (origUser) {
      localStorage.setItem('ppk_user', origUser);
      localStorage.removeItem('ppk_orig_user');
    }
  }

  function isImpersonating() {
    return !!localStorage.getItem('ppk_orig_token');
  }

  return {
    getToken, setToken, clearAuth, getUser, setUser,
    startImpersonate, stopImpersonate, isImpersonating,
    get:  (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body }),
    put:  (path, body) => request(path, { method: 'PUT', body }),
    del:  (path) => request(path, { method: 'DELETE' }),
  };
})();

// Backward-Compat Bridge: apiCall(action, data)
// Maps old GAS action names → new REST endpoints
const ACTION_MAP = {
  // Auth
  'login':               (d) => API.post('/api/auth/login', d),
  'register':            (d) => API.post('/api/auth/register', d),
  'logout':              ()  => API.post('/api/auth/logout'),
  'getMe':               ()  => API.get('/api/auth/me'),
  'changePassword':      (d) => API.post('/api/auth/change-password', d),
  'forgotPassword':      (d) => API.post('/api/auth/forgot-password', d),
  'resetPassword':       (d) => API.post('/api/auth/reset-password', d),
  'acceptPdpa':          (d) => API.post('/api/auth/accept-pdpa', d),
  'updateProfile':       (d) => API.put('/api/auth/profile', d),

  // Vehicles
  'getVehicles':         (d) => API.get('/api/vehicles' + _q(d)),
  'getVehicle':          (d) => API.get(`/api/vehicles/${d.id}`),
  'createVehicle':       (d) => API.post('/api/vehicles', d),
  'updateVehicle':       (d) => API.put(`/api/vehicles/${d.id}`, d),
  'deactivateVehicle':   (d) => API.put(`/api/vehicles/${d.id}/deactivate`, d),
  'getInactiveVehicles': ()  => API.get('/api/vehicles/inactive'),
  'reactivateVehicle':   (d) => API.put(`/api/vehicles/${d.id}/reactivate`, d),

  // Drivers
  'getDrivers':          (d) => API.get('/api/drivers' + _q(d)),
  'getDriver':           (d) => API.get(`/api/drivers/${d.id}`),
  'createDriver':        (d) => API.post('/api/drivers', d),
  'updateDriver':        (d) => API.put(`/api/drivers/${d.id}`, d),
  'deactivateDriver':    (d) => API.put(`/api/drivers/${d.id}/deactivate`, d),
  'reportFatigue':       (d) => API.post('/api/drivers/fatigue', d),
  'getDriverLeaves':     (d) => API.get(`/api/drivers/${d.id}/leaves`),
  'createDriverLeave':   (d) => API.post(`/api/drivers/${d.id}/leaves`, d),
  'deleteDriverLeave':   (d) => API.del(`/api/drivers/${d.id}/leaves/${d.leaveId}`),

  // Queue
  'getQueue':            (d) => API.get('/api/queue' + _q(d)),
  'getQueueItem':        (d) => API.get(`/api/queue/${d.id}`),
  'createQueue':         (d) => API.post('/api/queue', d),
  'updateQueue':         (d) => API.put(`/api/queue/${d.id}`, d),
  'cancelQueue':         (d) => API.put(`/api/queue/${d.id}/cancel`, d),
  'freezeQueue':         (d) => API.put(`/api/queue/${d.id}/freeze`, d),
  'unfreezeQueue':       (d) => API.put(`/api/queue/${d.id}/unfreeze`, d),
  'completeQueue':       (d) => API.put(`/api/queue/${d.id}/complete`, d),
  'getQueueTimeline':    (d) => API.get('/api/queue/timeline' + _q(d)),
  'getQueueRules':       ()  => API.get('/api/queue/rules'),
  'updateQueueRules':    (d) => API.put('/api/queue/rules', d),

  // Fuel
  'getFuelLog':          (d) => API.get('/api/fuel/log' + _q(d)),
  'getFuelItem':         (d) => API.get(`/api/fuel/${d.id}`),
  'createFuel':          (d) => API.post('/api/fuel', d),
  'updateFuel':          (d) => API.put(`/api/fuel/${d.id}`, d),
  'getFuelTypes':        ()  => API.get('/api/fuel/types'),
  'getFuelReports':      (d) => API.get('/api/fuel/reports' + _q(d)),
  'getFuelRequests':     (d) => API.get('/api/fuel/requests' + _q(d)),
  'createFuelRequest':   (d) => API.post('/api/fuel/requests', d),
  'approveFuelRequest':  (d) => API.put(`/api/fuel/requests/${d.id}/approve`, d),
  'rejectFuelRequest':   (d) => API.put(`/api/fuel/requests/${d.id}/reject`, d),
  'getFuelInvoices':     (d) => API.get('/api/fuel/invoices' + _q(d)),
  'createFuelInvoice':   (d) => API.post('/api/fuel/invoices', d),
  'getFuelInvoiceReconcile': (d) => API.get(`/api/fuel/invoices/${d.id}/reconcile`),
  'resolveFuelInvoice':  (d) => API.put(`/api/fuel/invoices/${d.id}/resolve`, d),
  'getFuelLedger':        (d) => API.get('/api/fuel/ledger' + _q(d)),
  'getFuelMonthlySummary': (d) => API.get('/api/fuel/monthly-summary' + _q(d)),

  // Repair
  'getRepairs':          (d) => API.get('/api/repair' + _q(d)),
  'getRepair':           (d) => API.get(`/api/repair/${d.id}`),
  'createRepair':        (d) => API.post('/api/repair', d),
  'updateRepair':        (d) => API.put(`/api/repair/${d.id}`, d),
  'completeRepair':      (d) => API.put(`/api/repair/${d.id}/complete`, d),
  'getScheduledRepairs': (d) => API.get('/api/repair/scheduled' + _q(d)),
  'createScheduledRepair':(d) => API.post('/api/repair/scheduled', d),

  // Usage
  'getUsageLog':         (d) => API.get('/api/usage' + _q(d)),
  'getUsageItem':        (d) => API.get(`/api/usage/${d.id}`),
  'createUsage':         (d) => API.post('/api/usage', d),
  'updateUsage':         (d) => API.put(`/api/usage/${d.id}`, d),

  // Daily Check
  'getCheckLog':         (d) => API.get('/api/check/log' + _q(d)),
  'getCheckAlerts':      (d) => API.get('/api/check/alerts' + _q(d)),
  'resolveAlert':        (d) => API.put(`/api/check/alerts/${d.id}/resolve`, d),

  // Tax & Insurance
  'getTaxRecords':       (d) => API.get('/api/tax-insurance/tax' + _q(d)),
  'createTaxRecord':     (d) => API.post('/api/tax-insurance/tax', d),
  'updateTaxRecord':     (d) => API.put(`/api/tax-insurance/tax/${d.id}`, d),
  'getInsuranceRecords': (d) => API.get('/api/tax-insurance/insurance' + _q(d)),
  'createInsurance':     (d) => API.post('/api/tax-insurance/insurance', d),
  'updateInsurance':     (d) => API.put(`/api/tax-insurance/insurance/${d.id}`, d),
  'getExpiringDocs':     (d) => API.get('/api/tax-insurance/expiring' + _q(d)),

  // Reports
  'getDashboard':        ()  => API.get('/api/reports/dashboard'),
  'getFuelAnalysis':     (d) => API.get('/api/reports/fuel' + _q(d)),
  'getUsageReport':      (d) => API.get('/api/reports/usage' + _q(d)),
  'getRepairReport':     (d) => API.get('/api/reports/repair' + _q(d)),
  'getHealthReport':     ()  => API.get('/api/reports/health'),
  'getDriversReport':    (d) => API.get('/api/reports/drivers' + _q(d)),

  // Maintenance
  'getMaintenanceSettings': () => API.get('/api/maintenance/settings'),
  'updateMaintenanceSettings': (d) => API.put('/api/maintenance/settings', d),
  'getMaintenanceSchedule': () => API.get('/api/maintenance/schedule'),
  'getMaintenanceAlerts':  (d) => API.get('/api/maintenance/alerts' + _q(d)),
  'createMaintenanceAlert':(d) => API.post('/api/maintenance/alerts', d),
  'resolveMaintenanceAlert':(d) => API.put(`/api/maintenance/alerts/${d.id}/resolve`, d),

  // Notifications
  'getNotifications':    (d) => API.get('/api/notifications' + _q(d)),
  'markNotificationRead':(d) => API.put(`/api/notifications/${d.id}/read`),
  'markAllRead':         ()  => API.put('/api/notifications/read-all'),

  // Admin
  'getUsers':            (d) => API.get('/api/admin/users' + _q(d)),
  'updateUser':          (d) => API.put(`/api/admin/users/${d.id}`, d),
  'deactivateUser':      (d) => API.put(`/api/admin/users/${d.id}/deactivate`, d),
  'adminResetPassword':  (d) => API.put(`/api/admin/users/${d.id}/reset-password`, d),
  'getUserRequests':     (d) => API.get('/api/admin/requests' + _q(d)),
  'approveUserRequest':  (d) => API.put(`/api/admin/requests/${d.id}/approve`, d),
  'rejectUserRequest':   (d) => API.put(`/api/admin/requests/${d.id}/reject`, d),
  'impersonateUser':     (d) => API.post(`/api/admin/impersonate/${d.id}`),
  'stopImpersonate':     ()  => API.post('/api/admin/stop-impersonate'),
  'getSettings':         ()  => API.get('/api/admin/settings'),
  'updateSettings':      (d) => API.put('/api/admin/settings', d),
  'getAuditLog':         (d) => API.get('/api/admin/audit-log' + _q(d)),

  // Backup
  'getBackups':          ()  => API.get('/api/backup'),
  'listBackups':         ()  => API.get('/api/backup'),
  'createBackup':        (d) => API.post('/api/backup', d),
  'restoreBackup':       (d) => API.post(`/api/backup/${d.id}/restore`, d),

  // OCR
  'ocrExtract':          (d) => API.post('/api/ocr/extract', d),

  // Backward-Compatible Aliases
  'getVehicleById':      (d) => API.get(`/api/vehicles/${d.id || d.carId}`),
  'getAllUsers':         (d) => API.get('/api/admin/users' + _q(d)),
  'createDailyCheck':    (d) => API.post('/api/check/daily', d),
  'createFuelLog':       (d) => API.post('/api/fuel', d),
  'getFuelLogs':         (d) => API.get('/api/fuel/log' + _q(d)),
  'getRepairLogs':       (d) => API.get('/api/repair' + _q(d)),
  'getRepairLogById':    (d) => API.get(`/api/repair/${d.id}`),
  'updateRepairLog':     (d) => API.put(`/api/repair/${d.id}`, d),
  'createRepairLog':     (d) => API.post('/api/repair', d),
  'updateInsuranceRecord':(d) => API.put(`/api/tax-insurance/insurance/${d.id}`, d),
  'createInsuranceRecord':(d) => API.post('/api/tax-insurance/insurance', d),
  'getMyProfile':        ()  => API.get('/api/auth/me'),
  'updateMyProfile':     (d) => API.put('/api/auth/profile', d),
  'getAuditLogs':        (d) => API.get('/api/admin/audit-log' + _q(d)),
  'updateSystemSetting': (d) => API.put('/api/admin/settings', { [d.key]: d.value }),
  'resetAdminSettingsToDefault': () => API.put('/api/admin/settings', {}),
  'getUsageRecords':     (d) => API.get('/api/usage' + _q(d)),
  'createUsageRecord':   (d) => API.post('/api/usage', d),
  'submitUsageQR':       (d) => API.post('/api/usage/qr', d),
  'initializeVehicleMaintenanceFromToday': () => API.get('/api/maintenance/schedule'),
  'getAdminSettings':    () => API.get('/api/admin/settings'),
  'getSystemSettings':   () => API.get('/api/admin/settings'),
  'checkPDPAAccepted':   () => API.get('/api/auth/me'),
  'acceptPDPAPolicy':    (d) => API.post('/api/auth/accept-pdpa', d),
  'getCurrentUserInfo':  () => API.get('/api/auth/me'),
  'getQueues':           (d) => API.get('/api/queue' + _q(d)),
};

/** Convert object to query string: { status: 'active' } → '?status=active' */
function _q(obj) {
  if (!obj) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && k !== 'id') p.append(k, v);
  }
  const s = p.toString();
  return s ? '?' + s : '';
}

/**
 * Legacy-compatible apiCall(action, data)
 * Returns the full envelope { success, data, message } — same interface as original GAS version
 * Throws on network/server error
 */
async function apiCall(action, data) {
  const fn = ACTION_MAP[action];
  if (!fn) throw new Error(`Unknown action: ${action}`);
  const result = await fn(data);
  // result is already the JSON body from the server
  // On success the server returns { success: true, data: ... }
  // API.get/post/put throws on non-2xx, so result.success should always be true here
  return result;
}
