// ===== Utils Module =====

export function formatDateThai(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString + 'T00:00:00')
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return '0.00'
  return parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function showAlert(message, type = 'info', duration = 3500) {
  const colors = { error: '#f44336', success: '#4caf50', warning: '#ff9800', info: '#2196f3' }
  const el = document.createElement('div')
  el.style.cssText = `position:fixed;top:20px;right:20px;padding:14px 20px;background:${colors[type]||colors.info};
    color:white;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:10000;max-width:380px;
    font-size:.93em;opacity:0;transform:translateX(100%);transition:all .3s ease;font-family:inherit;line-height:1.4`
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateX(0)' }, 10)
  setTimeout(() => {
    el.style.opacity = '0'; el.style.transform = 'translateX(100%)'
    setTimeout(() => el.parentNode?.removeChild(el), 300)
  }, duration)
}

export function showConfirm(message, onConfirm, onCancel) {
  const ok = confirm(message)
  if (ok && onConfirm) onConfirm()
  else if (!ok && onCancel) onCancel()
  return ok
}

export function showLoading(id) {
  const el = document.getElementById(id)
  if (el) { el.style.display = 'block'; el.innerHTML = '<div class="spinner-center"><div class="spinner"></div><p>กำลังโหลด...</p></div>' }
}

export function hideLoading(id) {
  const el = document.getElementById(id)
  if (el) el.style.display = 'none'
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')
}

export function validatePasswordPolicy(password) {
  if (!password || password.length < 8) return 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร'
  if (!/[a-zA-Z]/.test(password)) return 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว'
  if (!/[0-9]/.test(password)) return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'
  return null
}

// ตั้งค่า Flatpickr ภาษาไทย
export function initThaiDatePicker(selector, options = {}) {
  if (typeof flatpickr === 'undefined') return null
  return flatpickr(selector, { dateFormat: 'Y-m-d', allowInput: true, ...options })
}

export function initThaiTimePicker(selector, options = {}) {
  if (typeof flatpickr === 'undefined') return null
  return flatpickr(selector, { enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, allowInput: true, ...options })
}

export function initThaiDateTimePicker(selector, options = {}) {
  if (typeof flatpickr === 'undefined') return null
  return flatpickr(selector, { enableTime: true, dateFormat: 'Y-m-d H:i', time_24hr: true, allowInput: true, ...options })
}
