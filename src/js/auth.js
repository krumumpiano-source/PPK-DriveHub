// ===== Auth Module =====
let _currentUser = null

export function checkAuth() {
  const s = sessionStorage.getItem('ppk_drivehub_user')
  if (s) {
    try { _currentUser = JSON.parse(s); return true }
    catch { sessionStorage.removeItem('ppk_drivehub_user') }
  }
  return false
}

export function getCurrentUser() {
  if (!_currentUser) checkAuth()
  return _currentUser
}

export function hasPermission(roles) {
  const u = getCurrentUser()
  if (!u) return false
  if (u.role === 'admin') return true
  if (!roles || roles.length === 0) return true
  return roles.includes(u.role)
}

export function hasModulePermission(module, level) {
  const u = getCurrentUser()
  if (!u) return false
  if (u.role === 'admin') return true
  if (!u.permissions || typeof u.permissions !== 'object') return false
  const order = { view: 1, create: 2, edit: 3, delete: 4 }
  return (order[u.permissions[module]] || 0) >= (order[level] || 0)
}

export function requireAuth() {
  return checkAuth()
}

export function requireAdmin() {
  if (!requireAuth()) { redirectToLogin(); return false }
  if (!hasPermission(['admin'])) {
    alert('คุณไม่มีสิทธิ์เปิดหน้านี้')
    window.location.href = '/dashboard'
    return false
  }
  return true
}

export function redirectToLogin() {
  window.location.href = '/login'
}

export function logout() {
  if (confirm('ต้องการออกจากระบบหรือไม่?')) {
    sessionStorage.removeItem('ppk_drivehub_user')
    sessionStorage.removeItem('ppk_drivehub_token')
    window.location.href = '/login'
  }
}
