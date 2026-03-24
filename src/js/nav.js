// ===== Navigation Module =====
import { getCurrentUser, hasPermission, hasModulePermission, logout as authLogout } from './auth.js'

export function renderNav(currentPage = '') {
  window._currentPage = currentPage
  const nav = document.getElementById('navigation')
  if (!nav) return
  const user = getCurrentUser()
  nav.innerHTML = !user
    ? renderQRNav()
    : window.REQUIRE_AUTH === false ? renderQRNav() : renderMainNav(user)
  setActiveMenu(currentPage)
}

function renderMainNav(user) {
  let html = '<nav class="ppk-nav">'
  html += '<button class="ppk-nav-toggle" onclick="window._ppkToggle()">&#9776; เมนูหลัก</button>'
  html += '<div class="ppk-nav-inner" id="ppk-nav-inner">'
  html += navLink('/dashboard', 'dashboard', '&#127968; หน้าแรก')

  if (user.driver_id)
    html += navLink('/driver-history', 'driver-history', '&#128663; คิวและประวัติ')

  // กลุ่ม: จัดการ
  const mgmt = [
    hasModulePermission('queue','edit') || hasPermission(['admin']) ? navDDLink('/queue-manage','queue','&#9999;&#65039; จัดคิว') : '',
    hasModulePermission('vehicles','view') || hasPermission(['admin']) ? navDDLink('/vehicles','vehicles','&#128652; ยานพาหนะ') : '',
    hasModulePermission('drivers','view') || hasPermission(['admin']) ? navDDLink('/drivers','drivers','&#128100; คนขับ') : '',
  ].join('')
  if (mgmt) html += navGroup('&#128652; จัดการ', mgmt)

  // กลุ่ม: บันทึก
  const rec = [
    hasModulePermission('fuel','view') || hasPermission(['admin','fuel']) ? navDDLink('/fuel-record','fuel','&#9981; น้ำมัน') : '',
    hasModulePermission('repair','view') || hasPermission(['admin','repair']) ? navDDLink('/repair','repair','&#128295; ซ่อมบำรุง') : '',
    hasModulePermission('usage_log','view') || hasPermission(['admin']) ? navDDLink('/usage-log','usage-log','&#128221; การใช้งาน') : '',
    hasModulePermission('reports','view') || hasPermission(['admin','viewer','vehicle','fuel','repair']) ? navDDLink('/reports','reports','&#128202; รายงาน') : '',
  ].join('')
  if (rec) html += navGroup('&#128203; บันทึก', rec)

  // กลุ่ม: สแกน QR
  const qr = navDDLink('/qr-usage-record','qr-usage-record','&#128247; บันทึกใช้รถ')
    + navDDLink('/qr-fuel-record','qr-fuel-record','&#9981; เติมน้ำมัน')
    + navDDLink('/qr-daily-check','qr-daily-check','&#128295; ตรวจสภาพ+แจ้งซ่อม')
  html += navGroup('&#128247; สแกน QR', qr)

  html += '<div class="ppk-nav-spacer"></div>'
  html += navLink('/notifications','notifications','&#128276;','ppk-nav-link ppk-nav-icon-btn')

  // User dropdown
  const name = (user.full_name || user.name || user.username || 'ผู้ใช้').substring(0, 14)
  let userDD = ''
  if (hasPermission(['admin'])) {
    userDD += '<span class="ppk-nav-section-label">ระบบ</span>'
    userDD += navDDLink('/admin-settings','settings','&#9881;&#65039; ตั้งค่าระบบ')
  }
  userDD += '<span class="ppk-nav-section-label">ช่วยเหลือ</span>'
  userDD += navDDLink('/user-guide','user-guide','&#128218; วิธีใช้งาน')
  userDD += '<span class="ppk-nav-section-label">บัญชีผู้ใช้</span>'
  userDD += navDDLink('/profile','profile','&#128100; ตั้งค่าส่วนตัว')
  userDD += '<hr class="ppk-nav-divider">'
  userDD += '<a class="ppk-nav-dd-link ppk-nav-logout" href="#" onclick="window._ppkLogout();return false">&#128682; ออกจากระบบ</a>'
  html += navGroup(`&#128100; ${name}`, userDD, 'ppk-nav-group ppk-nav-user-grp', 'ppk-nav-group-btn ppk-nav-user-btn', true)

  html += '</div></nav>'
  return html
}

function renderQRNav() {
  return `<nav class="ppk-nav">
    <button class="ppk-nav-toggle" onclick="window._ppkToggle()">&#9776; เมนู</button>
    <div class="ppk-nav-inner" id="ppk-nav-inner">
      ${navLink('/qr-usage-record','qr-usage-record','&#128247; บันทึกใช้รถ')}
      ${navLink('/qr-fuel-record','qr-fuel-record','&#9981; เติมน้ำมัน')}
      ${navLink('/qr-daily-check','qr-daily-check','&#128295; ตรวจสภาพ+แจ้งซ่อม')}
      ${navLink('/user-guide','user-guide','&#128218; วิธีใช้งาน')}
      <div class="ppk-nav-spacer"></div>
      <a class="ppk-nav-link ppk-nav-user-btn" href="/login">&#128272; เข้าสู่ระบบ</a>
    </div></nav>`
}

function navLink(href, page, label, cls = 'ppk-nav-link') {
  return `<a class="${cls}" href="${href}" data-page="${page}">${label}</a>`
}

function navDDLink(href, page, label) {
  return `<a class="ppk-nav-dd-link" href="${href}" data-page="${page}">${label}</a>`
}

function navGroup(label, items, grpCls = 'ppk-nav-group', btnCls = 'ppk-nav-group-btn', right = false) {
  const ddCls = right ? 'ppk-nav-dropdown ppk-nav-dropdown-right' : 'ppk-nav-dropdown'
  return `<div class="${grpCls}">
    <button class="${btnCls}" onclick="window._ppkGroupToggle(event)">${label} <span class="ppk-nav-arrow">&#9660;</span></button>
    <div class="${ddCls}">${items}</div>
  </div>`
}

export function setActiveMenu(currentPage) {
  document.querySelectorAll('.ppk-nav-link, .ppk-nav-dd-link').forEach(el => {
    el.classList.remove('active')
    el.closest('.ppk-nav-group')?.classList.remove('grp-active')
  })
  const active = document.querySelector(`[data-page="${currentPage}"]`)
  if (active) {
    active.classList.add('active')
    active.closest('.ppk-nav-group')?.classList.add('grp-active')
  }
}

// Mobile toggle handlers (global, called from inline onclick)
window._ppkToggle = () => document.getElementById('ppk-nav-inner')?.classList.toggle('open')
window._ppkGroupToggle = (e) => {
  if (window.innerWidth > 820) return
  e.stopPropagation()
  const g = e.currentTarget.closest('.ppk-nav-group')
  const open = g?.classList.contains('open')
  document.querySelectorAll('.ppk-nav-group').forEach(x => x.classList.remove('open'))
  if (!open) g?.classList.add('open')
}
window._ppkLogout = () => authLogout()
