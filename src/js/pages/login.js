import { apiCall, handleError } from '../api.js'
import { showAlert } from '../utils.js'
import { checkAuth } from '../auth.js'

// ถ้าล็อกอินแล้วให้ไป dashboard
if (checkAuth()) location.href = '/dashboard'

const form = document.getElementById('loginForm')
const btn  = document.getElementById('loginBtn')
const alertArea = document.getElementById('alert-area')

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value
  if (!username || !password) { showInlineAlert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error'); return }

  btn.disabled = true
  btn.textContent = 'กำลังเข้าสู่ระบบ...'
  alertArea.innerHTML = ''

  try {
    const result = await apiCall('login', { username, password })
    if (result.success) {
      if (result.data?.token) sessionStorage.setItem('ppk_drivehub_token', result.data.token)
      sessionStorage.setItem('ppk_drivehub_user', JSON.stringify({
        user_id: result.data.user_id,
        full_name: result.data.full_name,
        name: result.data.full_name,
        role: result.data.role,
        driver_id: result.data.driver_id || null,
        first_login: result.data.first_login,
        permissions: result.data.permissions || {}
      }))
      if (result.data.first_login) {
        alert('กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน')
        location.href = '/change-password'
      } else {
        location.href = '/dashboard'
      }
    }
  } catch (err) {
    showInlineAlert(handleError(err), 'error')
    btn.disabled = false
    btn.textContent = '🔐 เข้าสู่ระบบ'
  }
})

function showInlineAlert(msg, type) {
  const colors = { error: '#ffebee:#c62828:#f44336', success: '#e8f5e9:#2e7d32:#4caf50' }
  const [bg, clr, border] = (colors[type] || colors.error).split(':')
  alertArea.innerHTML = `<div style="padding:11px 14px;background:${bg};color:${clr};border-left:4px solid ${border};border-radius:7px;margin-bottom:14px;font-size:.9em">${msg}</div>`
}
