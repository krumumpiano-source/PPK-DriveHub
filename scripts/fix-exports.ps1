$enc = [System.Text.UTF8Encoding]::new($true)
$path = "frontend\reports.html"
$text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# ── exportTrips ──────────────────────────────────────────────────────
$idxTStart = $text.IndexOf("    function exportTrips() {")
$idxTEnd   = $text.IndexOf("    // ========== Tab: ค่าใช้จ่ายรวม")
$oldTrips  = $text.Substring($idxTStart, $idxTEnd - $idxTStart)
$newTrips  = "    function exportTrips() {`r`n" + `
"      if (!_lastTripsPayload) return;`r`n" + `
"      var records = _lastTripsPayload.records || [];`r`n" + `
"      if (records.length === 0) { alert('ไม่มีข้อมูล'); return; }`r`n" + `
"      var weekdays = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];`r`n" + `
"      var headers = ['วันที่','วัน','เวลาเริ่ม','เวลาจบ','ทะเบียนรถ','ยี่ห้อ/รุ่น','คนขับ','ภารกิจ','จุดหมาย','ผู้โดยสาร','ออกจริง','กลับจริง','ไมล์เริ่ม','ไมล์จบ','กม.','คุณภาพออก','คุณภาพกลับ','สถานะ','เหตุยกเลิก','ผู้ขอ','บันทึก'];`r`n" + `
"      var dateFrom = document.getElementById('dateFrom').value || 'all';`r`n" + `
"      var dateTo = document.getElementById('dateTo').value || 'all';`r`n" + `
"      var rows = records.map(function(r) {`r`n" + `
"        var d = new Date(r.date);`r`n" + `
"        return [`r`n" + `
"          r.date||'', isNaN(d)?'':weekdays[d.getDay()],`r`n" + `
"          r.time_start||'', r.time_end||'',`r`n" + `
"          r.license_plate||'', (r.brand||'')+' '+(r.model||''),`r`n" + `
"          r.driver_name||'', r.mission||'', r.destination||'', r.passengers||'',`r`n" + `
"          r.actual_departure||'', r.actual_return||'',`r`n" + `
"          r.mileage_start||'', r.mileage_end||'', r.km_used||'',`r`n" + `
"          r.dep_quality||'', r.ret_quality||'',`r`n" + `
"          _statusTH[r.status]||r.status||'', r.cancel_reason||'',`r`n" + `
"          r.requester_display_name||r.requested_by||'', r.notes||''`r`n" + `
"        ];`r`n" + `
"      });`r`n" + `
"      ExportUtils.exportExcel({ filename: 'รายงานการใช้รถรายเที่ยว_' + dateFrom + '_' + dateTo, sheetName: 'รายเที่ยว', headers: headers, rows: rows });`r`n" + `
"    }`r`n`r`n    "
$text = $text.Replace($oldTrips, $newTrips)
Write-Host "exportTrips: $($text.Contains("รายงานการใช้รถรายเที่ยว_' + dateFrom"))"

# ── exportExpenses ───────────────────────────────────────────────────
$idxEStart = $text.IndexOf("    function exportExpenses() {")
$idxEEnd   = $text.IndexOf("    // ========== Tab: นอกเวลาราชการ")
$oldExp    = $text.Substring($idxEStart, $idxEEnd - $idxEStart)
$newExp    = "    function exportExpenses() {`r`n" + `
"      if (!_lastExpensesPayload) return;`r`n" + `
"      var cars = _lastExpensesPayload.cars || [];`r`n" + `
"      if (cars.length === 0) { alert('ไม่มีข้อมูล'); return; }`r`n" + `
"      var headers = ['ทะเบียน','ยี่ห้อ','รุ่น','ปี','ค่าน้ำมัน(บาท)','จำนวนเติม','ค่าซ่อม(บาท)','จำนวนซ่อม','ภาษี(บาท)','ประกัน(บาท)','ตรวจสภาพ(บาท)','รวม(บาท)','ระยะทาง(กม.)','บาท/กม.','สถานะ'];`r`n" + `
"      var dateFrom = document.getElementById('dateFrom').value || 'all';`r`n" + `
"      var dateTo = document.getElementById('dateTo').value || 'all';`r`n" + `
"      var rows = cars.map(function(c) {`r`n" + `
"        var cpkm = (c.total_km||0) > 0 ? ((c.grand_total||0) / c.total_km).toFixed(2) : '';`r`n" + `
"        return [c.license_plate||'', c.brand||'', c.model||'', c.year||'',`r`n" + `
"          c.total_fuel||0, c.fuel_count||0, c.total_repair||0, c.repair_count||0,`r`n" + `
"          c.total_tax||0, c.total_insurance||0, c.total_inspection||0, c.grand_total||0,`r`n" + `
"          c.total_km||0, cpkm, _statusTH[c.status]||c.status||''];`r`n" + `
"      });`r`n" + `
"      var g = _lastExpensesPayload.grand_total || {};`r`n" + `
"      var gkm = (g.total_km||0) > 0 ? ((g.grand_total||0) / g.total_km).toFixed(2) : '';`r`n" + `
"      rows.push(['รวมทั้งหมด','','','', g.total_fuel||0,'', g.total_repair||0,'', g.total_tax||0, g.total_insurance||0, g.total_inspection||0, g.grand_total||0, g.total_km||0, gkm,'']);`r`n" + `
"      ExportUtils.exportExcel({ filename: 'ค่าใช้จ่ายรวม_' + dateFrom + '_' + dateTo, sheetName: 'ค่าใช้จ่าย', headers: headers, rows: rows });`r`n" + `
"    }`r`n`r`n    "
$text = $text.Replace($oldExp, $newExp)
Write-Host "exportExpenses: $($text.Contains("ค่าใช้จ่ายรวม_' + dateFrom"))"

# ── exportAudit ──────────────────────────────────────────────────────
$idxAStart = $text.IndexOf("    function exportAudit() {")
$idxAEnd   = $text.IndexOf("    async function renderScores()")
$oldAudit  = $text.Substring($idxAStart, $idxAEnd - $idxAStart)
$newAudit  = "    function exportAudit() {`r`n" + `
"      if (!_lastAuditPayload) return;`r`n" + `
"      var records = _lastAuditPayload.records || [];`r`n" + `
"      if (records.length === 0) { alert('ไม่มีข้อมูล'); return; }`r`n" + `
"      var headers = ['วันเวลา','ผู้กระทำ','username','การกระทำ','ตาราง','ID รายการ','รายละเอียด','IP'];`r`n" + `
"      var dateFrom = document.getElementById('dateFrom').value || 'all';`r`n" + `
"      var dateTo = document.getElementById('dateTo').value || 'all';`r`n" + `
"      var rows = records.map(function(r) {`r`n" + `
"        var detail = '';`r`n" + `
"        try { detail = JSON.stringify(JSON.parse(r.new_values || '{}')); } catch(e) { detail = r.changed_fields || ''; }`r`n" + `
"        return [`r`n" + `
"          (r.created_at||'').replace('T',' ').substr(0,19), r.actor_name||'',`r`n" + `
"          r.actor_username||'', r.action||'', r.table_name||'',`r`n" + `
"          r.record_id||'', detail, r.ip_address||''`r`n" + `
"        ];`r`n" + `
"      });`r`n" + `
"      ExportUtils.exportExcel({ filename: 'ประวัติการแก้ไข_' + dateFrom + '_' + dateTo, sheetName: 'ประวัติแก้ไข', headers: headers, rows: rows });`r`n" + `
"    }`r`n`r`n    "
$text = $text.Replace($oldAudit, $newAudit)
Write-Host "exportAudit: $($text.Contains("ประวัติการแก้ไข_' + dateFrom"))"

# ── Save ─────────────────────────────────────────────────────────────
[System.IO.File]::WriteAllText($path, $text, $enc)
Write-Host "=== DONE ==="
Write-Host "CSV blobs remaining: $([regex]::Matches($text,'createObjectURL').Count)"
Write-Host "ExportUtils.exportExcel calls: $([regex]::Matches($text,'ExportUtils\.exportExcel').Count)"
