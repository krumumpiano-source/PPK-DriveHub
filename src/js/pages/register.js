// Public page - no auth required
import { apiCall } from '../api.js'

let isFirstAdmin = false
let setupChecked = false

// Disable submit until we finish checking setup status
const _submitBtn = document.getElementById('submitBtn')
if (_submitBtn) _submitBtn.disabled = true

// ── ตรวจสอบว่ามีผู้ใช้ในระบบแล้วหรือยัง ──────────────────────────────────
async function checkSetupStatus() {
  try {
    const r = await apiCall('checkSetupStatus', {})
    isFirstAdmin = r.data?.isFirstAdmin === true
  } catch (_) {
    isFirstAdmin = false
  }

  setupChecked = true
  const checkBanner = document.getElementById('checkBanner')
  const firstBanner = document.getElementById('firstAdminBanner')
  const normalBanner = document.getElementById('normalBanner')
  const reasonGroup = document.getElementById('reasonGroup')
  const submitBtn = document.getElementById('submitBtn')
  const pageTitle = document.getElementById('pageTitle')

  if (checkBanner) checkBanner.style.display = 'none'

  if (isFirstAdmin) {
    if (firstBanner) firstBanner.style.display = 'block'
    if (reasonGroup) reasonGroup.style.display = 'none'
    if (submitBtn) submitBtn.textContent = '🚀 สร้างบัญชีผู้ดูแลระบบ'
    if (pageTitle) pageTitle.textContent = '🔑 ตั้งค่าระบบครั้งแรก'
  } else {
    if (normalBanner) normalBanner.style.display = 'block'
    if (submitBtn) submitBtn.textContent = '📤 ส่งคำขอสมัคร'
  }

  if (submitBtn) submitBtn.disabled = false
}

checkSetupStatus()

// ── ส่งฟอร์ม ───────────────────────────────────────────────────────────────
document.getElementById('regForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError()

  if (!setupChecked) {
    showError('⏳ กำลังตรวจสอบสถานะระบบ กรุณารอสักครู่')
    return
  }

  // ── prefix ──
  const prefixSel = document.getElementById('fPrefix').value
  const prefixCustom = document.getElementById('fPrefixCustom').value.trim()
  const title = prefixSel === 'อื่นๆ' ? prefixCustom : prefixSel
  if (!title) { showError('กรุณาเลือกหรือระบุคำนำหน้าชื่อ'); return }

  const firstname = document.getElementById('fFirstname').value.trim()
  const lastname  = document.getElementById('fLastname').value.trim()
  const full_name = firstname + (lastname ? ' ' + lastname : '')
  const department = document.getElementById('fDept').value
  const position   = document.getElementById('fPosition').value
  const phone   = document.getElementById('fPhone').value.trim()
  const email   = document.getElementById('fEmail').value.trim()
  const password = document.getElementById('fPw').value
  const passwordConfirm = document.getElementById('fPwConfirm').value
  const reason = document.getElementById('fReason').value.trim()
  const pdpa = document.getElementById('fPdpa').checked

  if (!firstname || !department || !position || !phone || !email || !password) {
    showError('กรุณากรอกข้อมูลให้ครบถ้วน'); return
  }
  if (!isFirstAdmin && !reason) {
    showError('กรุณาระบุเหตุผลการขอใช้งาน'); return
  }
  if (password !== passwordConfirm) {
    showError('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return
  }
  if (!pdpa) {
    showError('กรุณายินยอมรับนโยบายความเป็นส่วนตัว (PDPA)'); return
  }

  const btn = document.getElementById('submitBtn')
  btn.disabled = true
  btn.textContent = isFirstAdmin ? '⏳ กำลังสร้างบัญชี...' : '⏳ กำลังส่งคำขอ...'

  try {
    const result = await apiCall('register', {
      data: { title, full_name, department, phone, email, password, reason,
              firstname, lastname, position }
    })
    if (result.success) {
      if (result.data?.autoLogin && result.data?.token) {
        sessionStorage.setItem('ppk_drivehub_token', result.data.token)
        sessionStorage.setItem('ppk_drivehub_user', JSON.stringify({
          user_id: result.data.user_id,
          full_name: result.data.full_name,
          name: result.data.full_name,
          role: 'admin',
          first_login: 0,
          permissions: result.data.permissions || {}
        }))
        showSuccess('✅ สร้างบัญชีสำเร็จ! กำลังเข้าสู่ระบบ...')
        setTimeout(() => { location.href = '/dashboard' }, 1200)
      } else {
        showSuccess('✅ ' + result.message)
        document.getElementById('regForm').reset()
        setTimeout(() => { location.href = '/login' }, 2500)
      }
    } else {
      showError(result.message || 'เกิดข้อผิดพลาด')
      btn.disabled = false
      btn.textContent = isFirstAdmin ? '🚀 สร้างบัญชีผู้ดูแลระบบ' : '📤 ส่งคำขอสมัคร'
    }
  } catch (err) {
    showError(err?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    btn.disabled = false
    btn.textContent = isFirstAdmin ? '🚀 สร้างบัญชีผู้ดูแลระบบ' : '📤 ส่งคำขอสมัคร'
  }
})

function showError(msg) {
  const el = document.getElementById('errorMsg')
  el.textContent = msg; el.style.display = 'block'
  el.style.background = '#FEF2F2'
  el.style.color = '#DC2626'
  el.scrollIntoView({behavior:'smooth', block:'center'})
}
function hideError() {
  const el = document.getElementById('errorMsg')
  el.style.display = 'none'
  el.style.background = '#FEF2F2'
  el.style.color = '#DC2626'
  el.textContent = ''
}
function showSuccess(msg) {
  const el = document.getElementById('errorMsg')
  el.textContent = msg; el.style.display = 'block'
  el.style.background = '#F0FDF4'; el.style.color = '#166534'
  el.scrollIntoView({behavior:'smooth', block:'center'})
}
