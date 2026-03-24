import { requireAuth } from '../auth.js'
import { apiCall, handleError } from '../api.js'
import { showAlert } from '../utils.js'
import { renderNav } from '../nav.js'

if (!requireAuth()) { location.href = '/login' }

renderNav('dashboard')

// ---- State ----
let year = new Date().getFullYear()
let month = new Date().getMonth()
let queues = [], vehiclesMap = {}, driversMap = {}

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const THAI_DAYS   = ['อา','จ','อ','พ','พฤ','ศ','ส']

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

async function load() {
  document.getElementById('loading').style.display = 'block'
  document.getElementById('dashboardContent').style.display = 'none'
  const from = fmtDate(new Date(year, month, 1))
  const to   = fmtDate(new Date(year, month+1, 0))

  try {
    const [qR, vR, dR] = await Promise.allSettled([
      apiCall('getQueues', { filters: { date_from: from, date_to: to } }),
      apiCall('getVehicles', {}),
      apiCall('getDrivers', { status: 'active' })
    ])

    queues = qR.value?.data?.queues || []
    vehiclesMap = {}; driversMap = {}
    vR.value?.data?.vehicles?.forEach(v => vehiclesMap[v.car_id] = v)
    dR.value?.data?.drivers?.forEach(d => driversMap[d.driver_id] = d)
  } catch {}

  renderCalendar()
  await loadAvailability()
  document.getElementById('loading').style.display = 'none'
  document.getElementById('dashboardContent').style.display = 'block'
}

function renderCalendar() {
  document.getElementById('monthYear').textContent = `${THAI_MONTHS[month]} ${year + 543}`
  const first = new Date(year, month, 1).getDay()
  const days  = new Date(year, month+1, 0).getDate()
  const today = fmtDate(new Date())
  let html = THAI_DAYS.map(d => `<div class="calendar-day-header">${d}</div>`).join('')
  for (let i = 0; i < first; i++) html += '<div class="calendar-day other-month"></div>'
  for (let d = 1; d <= days; d++) {
    const dateStr = fmtDate(new Date(year, month, d))
    const isToday = dateStr === today
    const dayQ = queues.filter(q => q.date === dateStr)
    html += `<div class="calendar-day ${isToday ? 'today' : dateStr < today ? 'past' : 'future'}">`
    html += `<div class="calendar-day-number">${d}</div>`
    dayQ.slice(0, 3).forEach(q => {
      const plate = vehiclesMap[q.car_id]?.license_plate || q.car_id || '-'
      const driver = driversMap[q.driver_id]?.full_name || '-'
      html += `<div class="queue-item"><div class="queue-plate">${plate}</div><div class="queue-driver">${driver}</div><div class="queue-destination">${q.destination||q.mission||'-'}</div></div>`
    })
    if (dayQ.length > 3) html += `<div style="font-size:.7em;color:#999">+${dayQ.length-3} เพิ่มเติม</div>`
    html += '</div>'
  }
  document.getElementById('calendarGrid').innerHTML = html
}

async function loadAvailability() {
  const today = fmtDate(new Date())
  const [avD, avV] = await Promise.allSettled([
    apiCall('getAvailableDriversForQueue', { date: today }),
    apiCall('getAvailableVehiclesForQueue', { date: today })
  ])
  const drivers  = avD.value?.data?.drivers || []
  const vehicles = avV.value?.data?.vehicles || []
  document.getElementById('driversAvailableList').innerHTML = drivers.length
    ? drivers.map(d => `<div class="availability-item"><strong>${d.full_name||'-'}</strong><span>${d.phone||''}</span></div>`).join('')
    : '<div class="empty-availability">ไม่มีพนักงานขับรถว่าง</div>'
  document.getElementById('vehiclesAvailableList').innerHTML = vehicles.length
    ? vehicles.map(v => `<div class="availability-item"><strong>${v.license_plate}</strong><span>${v.brand||''} ${v.model||''}</span></div>`).join('')
    : '<div class="empty-availability">ไม่มีรถว่าง</div>'
}

// Controls
document.getElementById('btnPrev').onclick = () => { if (--month < 0) { month = 11; year-- }; load() }
document.getElementById('btnNext').onclick = () => { if (++month > 11) { month = 0; year++ }; load() }
document.getElementById('btnToday').onclick = () => { const n = new Date(); year = n.getFullYear(); month = n.getMonth(); load() }

load()
setInterval(load, 5 * 60 * 1000)
