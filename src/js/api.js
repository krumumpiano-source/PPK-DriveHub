// ===== API Module =====
import { getCurrentUser } from './auth.js'

export async function apiCall(action, data = {}, options = {}) {
  const baseUrl = window.CONFIG?.API_BASE_URL ?? '/api'
  const timeout = options.timeout ?? window.CONFIG?.REQUEST_TIMEOUT ?? 30000
  const btn = options.submitButtonId ? document.getElementById(options.submitButtonId) : null
  if (btn) btn.disabled = true

  // Offline mode
  if (!baseUrl && typeof mockApiCall === 'function') {
    try {
      const r = await mockApiCall(action, data)
      if (btn) btn.disabled = false
      return r
    } catch (e) { if (btn) btn.disabled = false; throw e }
  }

  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), timeout)

  try {
    const user = getCurrentUser()
    const token = sessionStorage.getItem('ppk_drivehub_token')
    const payload = { action, ...data }
    if (user?.user_id) payload.userId = user.user_id

    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    clearTimeout(tid)

    if (!res.ok) {
      let errData = null
      try { errData = await res.json() } catch {}
      const err = new Error(`HTTP error! status: ${res.status}`)
      err.status = res.status
      err.error = errData?.error
      throw err
    }

    const result = await res.json()
    if (result.success === false) {
      const err = new Error(toThai(result.message))
      err.error = result.error
      throw err
    }
    return result
  } catch (error) {
    clearTimeout(tid)
    if (error.name === 'AbortError') throw new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่')
    // Offline fallback
    if (typeof mockApiCall === 'function' && error.message?.includes('fetch')) {
      try { return await mockApiCall(action, data) } catch {}
    }
    throw error
  } finally {
    if (btn) btn.disabled = false
  }
}

function toThai(msg) {
  if (!msg) return 'ดำเนินการไม่สำเร็จ'
  if (/[\u0E00-\u0E7F]/.test(msg)) return msg
  const map = {
    SERVER_ERROR: 'ดำเนินการไม่สำเร็จ',
    AUTHENTICATION_REQUIRED: 'กรุณาล็อกอินก่อนใช้งาน',
    NO_PERMISSION: 'คุณไม่มีสิทธิ์ดำเนินการนี้',
    CAR_NOT_AVAILABLE: 'รถไม่พร้อมใช้งาน',
    CAR_SCHEDULED_FOR_REPAIR: 'รถคันนี้ถูกจองซ่อม',
    'Invalid credentials': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'User is not active': 'บัญชีนี้ยังไม่ได้รับอนุมัติ',
    'Missing required fields': 'กรุณากรอกข้อมูลให้ครบ',
  }
  return map[msg] || 'ดำเนินการไม่สำเร็จ'
}

export function handleError(error) {
  if (!error) return 'ดำเนินการไม่สำเร็จ'
  if (typeof error === 'string') return /[\u0E00-\u0E7F]/.test(error) ? error : 'ดำเนินการไม่สำเร็จ'
  if (error.status === 401) return 'กรุณาล็อกอินใหม่'
  if (error.status === 403) return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
  if (error.status === 404) return 'ไม่พบข้อมูลที่ต้องการ'
  if (error.status === 500) return 'เซิร์ฟเวอร์ขัดข้องชั่วคราว'
  const msg = error.message || ''
  if (/[\u0E00-\u0E7F]/.test(msg)) return msg
  return 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่'
}
