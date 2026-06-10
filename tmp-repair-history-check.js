
    globalThis.API_BASE_URL = CONFIG.API_BASE_URL;
    globalThis.currentPage = 'repair-history';
    globalThis.REQUIRE_AUTH = true;
  

    var PAGE_SIZE = 50;
    var state = { vehicles: [], drivers: [], historyData: [], filteredData: [], page: 0, loading: false, reqSeq: 0, editingId: null, itemRowCount: 0, search: '' };

    var SERVICE_TYPE_MAP = {
      repair: { label: 'ซ่อมทั่วไป', css: 'h-s-repair', icon: '🔧' },
      scheduled_service: { label: 'เช็คระยะ/บำรุงรักษา', css: 'h-s-scheduled', icon: '🔩' },
      scheduled_maintenance: { label: 'เช็คระยะ/บำรุงรักษา', css: 'h-s-scheduled', icon: '🔩' },
      inspection: { label: 'ตรวจสภาพ', css: 'h-s-inspection', icon: '🔍' },
      accident: { label: 'ซ่อมอุบัติเหตุ', css: 'h-s-accident', icon: '⚠️' },
      insurance: { label: 'เคลมประกัน', css: 'h-s-insurance', icon: '🛡️' },
      other: { label: 'อื่นๆ', css: 'h-s-other', icon: '📋' }
    };

    function byId(id){ return document.getElementById(id); }
    function escHtml(s){
      if (s === null || s === undefined) {
        return '';
      }
      return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#039;');
    }

    function escAttr(s){
      return escHtml(s).replace(/`/g, '&#096;');
    }

    function toNum(v){
      var n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }

    function fmtDate(s){
      if (!s) return '-';
      try {
        var p = String(s).split(/[T ]/); var dd = p[0].split('-');
        var months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
        return Number.parseInt(dd[2],10) + ' ' + months[Number.parseInt(dd[1],10)-1] + ' ' + (Number.parseInt(dd[0],10)+543);
      } catch (_) { return String(s); }
    }

    function showAlert(msg,type){
      var c = byId('alertContainer');
      c.innerHTML = '<div class="alert alert-' + escAttr(type || 'info') + '">' + escHtml(msg || '') + '</div>';
      setTimeout(function(){ c.innerHTML = ''; }, 5000);
    }

    function getCurrentUserSafe(){ try { return (typeof getCurrentUser === 'function') ? getCurrentUser() : null; } catch (_) { return null; } }
    function canEditRepair(){
      var u = getCurrentUserSafe();
      if (!u) {
        return false;
      }
      if (u.role === 'admin') {
        return true;
      }
      return (typeof hasModulePermission === 'function') && hasModulePermission('repair','edit');
    }

    function withTimeout(promise, ms, label){
      return Promise.race([
        promise,
        new Promise(function(_, reject){ setTimeout(function(){ reject(new Error(label || 'หมดเวลาเชื่อมต่อ API')); }, ms); })
      ]);
    }

    async function waitForDeps(){
      var i = 0;
      while (i < 80) {
        if (typeof apiCall === 'function') return true;
        await new Promise(function(r){ setTimeout(r, 100); });
        i += 1;
      }
      return false;
    }

    function initYearFilter(){
      var sel = byId('hFilterYear');
      var thisYear = new Date().getFullYear() + 543;
      var html = '<option value="">ทุกปี</option>';
      for (var y = thisYear; y >= 2552; y -= 1) html += '<option value="' + (y - 543) + '">พ.ศ. ' + y + '</option>';
      sel.innerHTML = html;
    }

    function vehicleLabel(carId,row){
      if (row && (row.license_plate || row.brand || row.model)) {
        return ((row.license_plate || '') + ' ' + (row.brand || '') + ' ' + (row.model || '')).trim() || carId || '-';
      }
      var v = state.vehicles.find(function(x){ return String(x.id || x.car_id) === String(carId); });
      return v ? ((v.license_plate || '') + ' ' + (v.brand || '') + ' ' + (v.model || '')).trim() : (carId || '-');
    }

    function driverLabel(driverId){
      var d = state.drivers.find(function(x){ return String(x.driver_id) === String(driverId); });
      return d ? ((d.title || '') + ' ' + (d.first_name || '') + ' ' + (d.last_name || '')).trim() : (driverId || '-');
    }

    function bindEvents(){
      byId('btnAddCompleted').addEventListener('click', openAddCompletedModal);
      byId('btnRefresh').addEventListener('click', function(){ loadHistory(true); });
      byId('btnExport').addEventListener('click', exportExcel);

      byId('hFilterCar').addEventListener('change', function(){ state.reqSeq += 1; state.loading = false; loadHistory(false); });
      byId('hFilterType').addEventListener('change', function(){ applySearchAndRender(); });
      byId('hFilterYear').addEventListener('change', function(){ state.reqSeq += 1; state.loading = false; loadHistory(false); });

      byId('hSearch').addEventListener('input', function(e){ state.search = String(e.target.value || '').trim().toLowerCase(); applySearchAndRender(); });

      byId('hTableBody').addEventListener('click', function(e){
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var id = btn.dataset.id;
        if (!id) return;
        if (btn.dataset.action === 'view') showDetail(id);
        if (btn.dataset.action === 'edit') editCompleted(id);
      });

      byId('hPagination').addEventListener('click', function(e){
        var btn = e.target.closest('button[data-page]');
        if (!btn) return;
        gotoPage(Number.parseInt(btn.dataset.page, 10));
      });

      byId('cmpClose').addEventListener('click', closeCompletedModal);
      byId('detailClose').addEventListener('click', closeDetailModal);

      byId('cmp_service_type').addEventListener('change', function(){
        var v = byId('cmp_service_type').value;
        byId('cmp_insurance_section').style.display = (v === 'accident' || v === 'insurance') ? '' : 'none';
      });

      byId('btnAddItem').addEventListener('click', function(){ addItemRow(); });

      ['cmp_labour','cmp_parts','cmp_discount','cmp_vat'].forEach(function(id){ byId(id).addEventListener('input', calcTotal); });

      byId('cmp_items_list').addEventListener('click', function(e){
        var btn = e.target.closest('button[data-remove]');
        if (!btn) return;
        var row = byId('cmp-item-' + btn.dataset.remove);
        if (row) row.remove();
      });

      byId('completedForm').addEventListener('submit', submitCompleted);
    }

    async function loadVehicles(){
      try {
        var r = await withTimeout(apiCall('getVehicles', {}), 10000, 'โหลดข้อมูลรถไม่สำเร็จ');
        if (r && r.success && r.data && Array.isArray(r.data.vehicles)) state.vehicles = r.data.vehicles;
      } catch (e) { console.error('loadVehicles:', e); }

      var filterHtml = '<option value="">รถทั้งหมด</option>';
      var modalHtml = '<option value="">เลือกรถ</option>';
      state.vehicles.forEach(function(v){
        var txt = escHtml((v.license_plate || '-') + ' - ' + (v.brand || '') + ' ' + (v.model || ''));
        var id = escAttr(v.id || v.car_id || '');
        filterHtml += '<option value="' + id + '">' + txt + '</option>';
        modalHtml += '<option value="' + id + '">' + txt + '</option>';
      });

      var oldFilter = byId('hFilterCar').value;
      var oldModal = byId('cmp_car_id').value;
      byId('hFilterCar').innerHTML = filterHtml;
      byId('cmp_car_id').innerHTML = modalHtml;
      if (oldFilter) byId('hFilterCar').value = oldFilter;
      if (oldModal) byId('cmp_car_id').value = oldModal;
    }

    async function loadDrivers(){
      try {
        var r = await withTimeout(apiCall('getDrivers', { status:'active' }), 10000, 'โหลดข้อมูลพนักงานขับรถไม่สำเร็จ');
        if (r && r.success && r.data && Array.isArray(r.data.drivers)) state.drivers = r.data.drivers;
      } catch (e) { console.error('loadDrivers:', e); }

      var html = '<option value="">-- เลือก --</option>';
      state.drivers.forEach(function(d){
        html += '<option value="' + escAttr(d.driver_id || '') + '">' + escHtml(((d.title || '') + ' ' + (d.first_name || '') + ' ' + (d.last_name || '')).trim()) + '</option>';
      });
      byId('cmp_taken_by').innerHTML = html;
    }

    async function loadHistory(showNotice){
      if (state.loading) return;
      state.loading = true;
      state.reqSeq += 1;
      var reqId = state.reqSeq;

      byId('hLoading').style.display = 'block';
      byId('hSummaryStats').style.display = 'none';

      try {
        var filters = { status:'completed' };
        if (byId('hFilterCar').value) filters.car_id = byId('hFilterCar').value;

        var r = await withTimeout(apiCall('getRepairs', filters), 30000, 'หมดเวลาเชื่อมต่อ API');
        if (reqId !== state.reqSeq) return;
        if (!r || !r.success) throw new Error((r && r.message) || 'โหลดข้อมูลไม่สำเร็จ');

        var list = Array.isArray(r.data) ? r.data.slice() : [];

        list.sort(function(a,b){
          var da = String(a.date_completed || a.date_reported || '');
          var db = String(b.date_completed || b.date_reported || '');
          if (da < db) return 1;
          if (da > db) return -1;
          return 0;
        });

        state.historyData = list;
        applySearchAndRender();
        if (showNotice) showAlert('รีเฟรชข้อมูลเรียบร้อย', 'success');
      } catch (e) {
        console.error('loadHistory error:', e);
        byId('hTableBody').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--color-danger)">❌ <strong>โหลดข้อมูลไม่สำเร็จ</strong><br><small>' + escHtml(e.message || 'กรุณาตรวจสอบการเชื่อมต่อ') + '</small></td></tr>';
        byId('hPagination').style.display = 'none';
      } finally {
        state.loading = false;
        byId('hLoading').style.display = 'none';
      }
    }

    function applySearchAndRender(){
      var list = state.historyData.slice();

      // กรองประเภท (client-side — ไม่ต้องเรียก API ใหม่)
      var type = byId('hFilterType').value;
      if (type) {
        list = list.filter(function(rp){
          if (type === 'scheduled_service') return rp.service_type === 'scheduled_service' || rp.service_type === 'scheduled_maintenance';
          return rp.service_type === type;
        });
      }

      var year = byId('hFilterYear').value;
      if (year) {
        list = list.filter(function(rp){
          var d = String(rp.date_completed || rp.date_reported || '');
          return d.substring(0, 4) === year;
        });
      }

      // กรองคำค้นหา
      var q = state.search;
      if (q) {
        list = list.filter(function(rp){
          return vehicleLabel(rp.car_id,rp).toLowerCase().includes(q) ||
            String(rp.issue_description || '').toLowerCase().includes(q) ||
            String(rp.invoice_number || '').toLowerCase().includes(q) ||
            String(rp.garage_name || '').toLowerCase().includes(q) ||
            String(rp.mechanic_name || '').toLowerCase().includes(q);
        });
      }
      state.filteredData = list;
      state.page = 0;
      renderSummary(list);
      renderPage();
    }

    function renderSummary(list){
      var wrap = byId('hSummaryStats');
      if (!list.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }

      var totalCost = 0;
      var garages = {};
      list.forEach(function(rp){
        totalCost += toNum(rp.grand_total || rp.cost || 0);
        if (rp.garage_name) garages[rp.garage_name] = (garages[rp.garage_name] || 0) + 1;
      });

      var topGarage = '-'; var topCount = 0;
      Object.keys(garages).forEach(function(k){ if (garages[k] > topCount) { topCount = garages[k]; topGarage = k; } });
      var latest = list[0] ? fmtDate(list[0].date_completed || list[0].date_reported) : '-';

      wrap.innerHTML = '' +
        '<div class="h-stat"><div class="h-stat-val">' + list.length + '</div><div class="h-stat-lbl">รายการซ่อม</div></div>' +
        '<div class="h-stat"><div class="h-stat-val">' + totalCost.toLocaleString() + ' ฿</div><div class="h-stat-lbl">ค่าซ่อมรวม</div></div>' +
        '<div class="h-stat"><div class="h-stat-val">' + escHtml(latest) + '</div><div class="h-stat-lbl">ซ่อมล่าสุด</div></div>' +
        '<div class="h-stat"><div class="h-stat-val">' + escHtml(topGarage) + '</div><div class="h-stat-lbl">อู่ที่ใช้บ่อย</div></div>';
      wrap.style.display = 'flex';
    }

    function renderPage(){
      var body = byId('hTableBody');
      var total = state.filteredData.length;
      if (!total) {
        body.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--color-text-muted)">🔧 ไม่มีบันทึกซ่อมเสร็จ</td></tr>';
        byId('hPagination').style.display = 'none';
        return;
      }

      var start = state.page * PAGE_SIZE;
      var pageList = state.filteredData.slice(start, start + PAGE_SIZE);
      var canEdit = canEditRepair();

      var html = '';
      pageList.forEach(function(rp){
        var st = SERVICE_TYPE_MAP[rp.service_type] || SERVICE_TYPE_MAP.repair;
        var totalCost = toNum(rp.grand_total || rp.cost || 0);
        var mileIn = rp.mileage_at_repair ? Number(rp.mileage_at_repair).toLocaleString() : '—';

        html += '<tr>';
        html += '<td style="white-space:nowrap">' + escHtml(fmtDate(rp.date_completed || rp.date_reported)) + '</td>';
        html += '<td class="t-veh">' + escHtml(vehicleLabel(rp.car_id, rp)) + '</td>';
        html += '<td><span class="h-service ' + st.css + '">' + escHtml(st.icon) + ' ' + escHtml(st.label) + '</span></td>';
        html += '<td class="t-desc" title="' + escAttr(rp.issue_description || '-') + '">' + escHtml(rp.issue_description || '-') + '</td>';
        html += '<td class="h-hide-sm t-muted">' + escHtml(rp.garage_name || '—') + '</td>';
        html += '<td class="h-hide-sm t-muted">' + escHtml(rp.invoice_number || '—') + '</td>';
        html += '<td class="h-hide-sm t-mile">' + escHtml(mileIn) + '</td>';
        html += '<td class="t-cost">' + (totalCost ? totalCost.toLocaleString() : '—') + '</td>';
        html += '<td class="t-action">';
        html += '<button class="btn btn-ghost" style="padding:3px 8px;font-size:.78rem" data-action="view" data-id="' + escAttr(rp.id || '') + '">📄 ดู</button>';
        if (canEdit) html += '<button class="btn btn-ghost" style="padding:3px 8px;font-size:.78rem" data-action="edit" data-id="' + escAttr(rp.id || '') + '">✏️</button>';
        html += '</td></tr>';
      });

      body.innerHTML = html;
      renderPagination(total);
    }

    function renderPagination(total){
      var wrap = byId('hPagination');
      var pages = Math.ceil(total / PAGE_SIZE);
      if (pages <= 1) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }

      var startIdx = (state.page * PAGE_SIZE) + 1;
      var endIdx = Math.min((state.page + 1) * PAGE_SIZE, total);
      var pStart = Math.max(0, state.page - 2);
      var pEnd = Math.min(pages - 1, pStart + 4);
      if (pEnd - pStart < 4) pStart = Math.max(0, pEnd - 4);

      var html = '<span style="font-size:.82rem;color:var(--color-text-muted);margin-right:4px">แสดง ' + startIdx + '-' + endIdx + ' / ' + total + ' รายการ</span>';
      html += '<button class="btn btn-secondary" style="padding:3px 10px;font-size:.82rem" data-page="' + (state.page - 1) + '" ' + (state.page === 0 ? 'disabled' : '') + '>◀</button>';
      for (var p = pStart; p <= pEnd; p += 1) html += '<button class="btn ' + (p === state.page ? 'btn-primary' : 'btn-secondary') + '" style="padding:3px 8px;font-size:.82rem" data-page="' + p + '">' + (p + 1) + '</button>';
      html += '<button class="btn btn-secondary" style="padding:3px 10px;font-size:.82rem" data-page="' + (state.page + 1) + '" ' + (state.page === pages - 1 ? 'disabled' : '') + '>▶</button>';

      wrap.innerHTML = html;
      wrap.style.display = 'block';
    }

    function gotoPage(n){
      var pages = Math.ceil(state.filteredData.length / PAGE_SIZE);
      if (Number.isNaN(n) || n < 0 || n >= pages) return;
      state.page = n;
      renderPage();
      var wrap = document.querySelector('.h-tbl-wrap');
      if (wrap) wrap.scrollIntoView({ behavior:'smooth', block:'start' });
    }

    function parseDocs(raw){
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      try { var arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch (_) { return []; }
    }

    async function showDetail(id){
      byId('detailBody').innerHTML = '<div class="loading">กำลังโหลด...</div>';
      byId('detailModal').classList.add('show');

      try {
        var r = await withTimeout(apiCall('getRepair', { id:id }), 15000, 'โหลดรายละเอียดไม่สำเร็จ');
        if (!r || !r.success || !r.data) throw new Error((r && r.message) || 'ไม่พบข้อมูล');

        var rp = r.data;
        var st = SERVICE_TYPE_MAP[rp.service_type] || SERVICE_TYPE_MAP.repair;
        var total = toNum(rp.grand_total || rp.cost || 0);

        var html = '';
        html += '<div style="margin-bottom:.75rem;display:flex;gap:8px;flex-wrap:wrap">';
        html += '<span class="h-service ' + st.css + '">' + escHtml(st.icon) + ' ' + escHtml(st.label) + '</span></div>';

        html += '<div class="h-detail-grid">';
        html += '<div class="h-detail-item"><label>รถ</label><span>' + escHtml(vehicleLabel(rp.car_id, rp)) + '</span></div>';
        html += '<div class="h-detail-item"><label>วันที่ซ่อมเสร็จ</label><span>' + escHtml(fmtDate(rp.date_completed || rp.date_reported)) + '</span></div>';
        html += '<div class="h-detail-item"><label>เลขที่ใบซ่อม</label><span>' + escHtml(rp.invoice_number || '-') + '</span></div>';
        html += '<div class="h-detail-item"><label>เลขไมล์เข้า</label><span>' + escHtml(rp.mileage_at_repair ? Number(rp.mileage_at_repair).toLocaleString() + ' กม.' : '-') + '</span></div>';
        html += '<div class="h-detail-item"><label>เลขไมล์ออก</label><span>' + escHtml(rp.mileage_out ? Number(rp.mileage_out).toLocaleString() + ' กม.' : '-') + '</span></div>';
        html += '<div class="h-detail-item"><label>อู่</label><span>' + escHtml(rp.garage_name || '-') + '</span></div>';
        html += '</div>';

        html += '<hr style="margin:1rem 0;border-color:var(--color-border)"><strong>💰 ค่าใช้จ่าย</strong>';
        html += '<div class="h-detail-grid" style="margin-top:.5rem">';
        html += '<div class="h-detail-item"><label>ค่าแรง</label><span>' + toNum(rp.labour_cost).toLocaleString() + ' บาท</span></div>';
        html += '<div class="h-detail-item"><label>ค่าอะไหล่</label><span>' + toNum(rp.parts_cost).toLocaleString() + ' บาท</span></div>';
        html += '<div class="h-detail-item"><label>ส่วนลด</label><span>-' + toNum(rp.discount_amount).toLocaleString() + ' บาท</span></div>';
        html += '<div class="h-detail-item"><label>VAT 7%</label><span>' + toNum(rp.vat_amount).toLocaleString() + ' บาท</span></div>';
        html += '<div class="h-detail-item"><label>ยอดรวมทั้งสิ้น</label><span style="font-weight:700;color:var(--color-primary)">' + total.toLocaleString() + ' บาท</span></div>';
        html += '</div>';

        if (Array.isArray(rp.items_detail) && rp.items_detail.length) {
          html += '<hr style="margin:1rem 0;border-color:var(--color-border)"><strong>🔩 รายการอะไหล่/ค่าแรง</strong>';
          html += '<div style="overflow-x:auto;margin-top:.5rem"><table class="table" style="font-size:.82rem"><thead><tr><th>รหัส</th><th>รายการ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>ส่วนลด</th><th>สุทธิ</th></tr></thead><tbody>';
          rp.items_detail.forEach(function(it){
            html += '<tr><td>' + escHtml(it.part_code || '-') + '</td><td>' + escHtml(it.description || '-') + '</td><td>' + escHtml(String(it.quantity || 1)) + '</td><td>' + escHtml(toNum(it.unit_price).toLocaleString()) + '</td><td>' + escHtml(toNum(it.discount_amount).toLocaleString()) + '</td><td>' + escHtml(toNum(it.net_amount).toLocaleString()) + '</td></tr>';
          });
          html += '</tbody></table></div>';
        }

        html += '<hr style="margin:1rem 0;border-color:var(--color-border)"><p><strong>อาการ:</strong> ' + escHtml(rp.issue_description || '-') + '</p>';
        if (rp.notes) html += '<p><strong>หมายเหตุ:</strong> ' + escHtml(rp.notes) + '</p>';

        [
          { label:'ใบเสนอราคา', key:'quotation_documents' },
          { label:'บันทึกข้อความ', key:'memo_documents' },
          { label:'ใบเสร็จ', key:'receipt_documents' },
          { label:'เอกสาร', key:'documents' }
        ].forEach(function(d){
          var arr = parseDocs(rp[d.key]);
          if (!arr.length) return;
          html += '<p style="margin-top:8px"><strong>' + escHtml(d.label) + ':</strong></p><div class="h-files">';
          arr.forEach(function(url, i){ html += '<a class="h-file-chip" href="' + escAttr(url || '#') + '" target="_blank" rel="noopener noreferrer">📎 ไฟล์ ' + (i + 1) + '</a>'; });
          html += '</div>';
        });

        if (typeof renderAuditMeta === 'function') {
          html += '<hr style="margin:1rem 0;border-color:var(--color-border)">';
          html += renderAuditMeta(rp);
        }

        byId('detailBody').innerHTML = html;
      } catch (e) {
        byId('detailBody').innerHTML = '<p style="color:var(--color-danger)">เกิดข้อผิดพลาด: ' + escHtml(e.message || 'โหลดรายละเอียดไม่สำเร็จ') + '</p>';
      }
    }

    function closeDetailModal(){ byId('detailModal').classList.remove('show'); }

    function resetCompletedForm(){
      state.editingId = null;
      state.itemRowCount = 0;
      byId('cmpTitle').textContent = '📝 บันทึกซ่อมย้อนหลัง';
      byId('completedForm').reset();
      byId('cmp_taken_by').removeAttribute('data-original-taken-by');
      byId('cmp_items_list').innerHTML = '';
      byId('cmp_insurance_section').style.display = 'none';
      if (byId('cmp_date')._flatpickr) byId('cmp_date')._flatpickr.clear();
      if (byId('cmp_time')._flatpickr) byId('cmp_time')._flatpickr.clear();
    }

    function openAddCompletedModal(){
      resetCompletedForm();
      byId('completedModal').classList.add('show');
      setTimeout(function(){ if (typeof initAllThaiDateTimePickers === 'function') initAllThaiDateTimePickers(); }, 100);
    }

    function closeCompletedModal(){ byId('completedModal').classList.remove('show'); }

    function addItemRow(data){
      state.itemRowCount += 1;
      var key = String(state.itemRowCount);
      var d = data || {};
      var html = '';
      html += '<div class="cmp-item" id="cmp-item-' + escAttr(key) + '"><div class="cmp-item-row">';
      html += '<input type="text" class="ir-code" placeholder="รหัส" value="' + escAttr(d.part_code || '') + '" style="width:100px">';
      html += '<input type="text" class="ir-desc" placeholder="รายการ *" value="' + escAttr(d.description || '') + '" style="flex:1;min-width:120px">';
      html += '<input type="number" class="ir-qty" placeholder="จำนวน" value="' + escAttr(d.quantity || 1) + '" style="width:60px" step="any">';
      html += '<input type="number" class="ir-price" placeholder="ราคา/หน่วย" value="' + escAttr(d.unit_price || '') + '" style="width:90px" step="0.01">';
      html += '<input type="number" class="ir-disc" placeholder="ส่วนลด" value="' + escAttr(d.discount_amount || '') + '" style="width:80px" step="0.01">';
      html += '<input type="number" class="ir-net" placeholder="สุทธิ" value="' + escAttr(d.net_amount || '') + '" style="width:90px;font-weight:600" step="0.01">';
      html += '<select class="ir-type" style="padding:4px"><option value="part"' + (d.item_type === 'part' ? ' selected' : '') + '>อะไหล่</option><option value="labour"' + (d.item_type === 'labour' ? ' selected' : '') + '>ค่าแรง</option><option value="service"' + (d.item_type === 'service' ? ' selected' : '') + '>บริการ</option></select>';
      html += '<button type="button" class="cmp-danger-btn" data-remove="' + escAttr(key) + '">🗑️</button></div></div>';
      byId('cmp_items_list').insertAdjacentHTML('beforeend', html);
    }

    function collectItemRows(){
      var items = [];
      byId('cmp_items_list').querySelectorAll('.cmp-item').forEach(function(row){
        var desc = String(row.querySelector('.ir-desc').value || '').trim();
        if (!desc) return;
        items.push({
          part_code: String(row.querySelector('.ir-code').value || '').trim(),
          description: desc,
          quantity: toNum(row.querySelector('.ir-qty').value) || 1,
          unit_price: toNum(row.querySelector('.ir-price').value),
          discount_amount: toNum(row.querySelector('.ir-disc').value),
          net_amount: toNum(row.querySelector('.ir-net').value),
          item_type: row.querySelector('.ir-type').value || 'part'
        });
      });
      return items;
    }

    function calcTotal(){
      var l = toNum(byId('cmp_labour').value);
      var p = toNum(byId('cmp_parts').value);
      var d = toNum(byId('cmp_discount').value);
      var v = toNum(byId('cmp_vat').value);
      byId('cmp_grand_total').value = (l + p - d + v).toFixed(2);
    }

    async function editCompleted(id){
      try {
        var r = await withTimeout(apiCall('getRepair', { id:id }), 15000, 'โหลดข้อมูลรายการซ่อมไม่สำเร็จ');
        if (!r || !r.success || !r.data) throw new Error((r && r.message) || 'ไม่พบข้อมูล');
        var rp = r.data;

        state.editingId = id;
        byId('cmpTitle').textContent = '✏️ แก้ไขบันทึกซ่อม';

        byId('cmp_car_id').value = rp.car_id || '';
        byId('cmp_issue').value = rp.issue_description || '';
        byId('cmp_mileage').value = rp.mileage_at_repair || '';
        byId('cmp_garage').value = rp.garage_name || '';
        byId('cmp_notes').value = rp.notes || '';
        byId('cmp_service_type').value = rp.service_type || 'repair';
        byId('cmp_invoice').value = rp.invoice_number || '';
        byId('cmp_mechanic').value = rp.mechanic_name || '';
        byId('cmp_labour').value = rp.labour_cost || '';
        byId('cmp_parts').value = rp.parts_cost || '';
        byId('cmp_discount').value = rp.discount_amount || '';
        byId('cmp_vat').value = rp.vat_amount || '';
        byId('cmp_grand_total').value = rp.grand_total || rp.cost || '';
        byId('cmp_mileage_out').value = rp.mileage_out || '';
        byId('cmp_claim').value = rp.claim_number || '';
        byId('cmp_insurance').value = rp.insurance_company || '';

        var takenBySel = byId('cmp_taken_by');
        takenBySel.removeAttribute('data-original-taken-by');
        if (rp.taken_by) {
          var found = state.drivers.find(function(d){ return driverLabel(d.driver_id).trim() === String(rp.taken_by).trim(); });
          if (found) takenBySel.value = found.driver_id;
          else { takenBySel.value = ''; takenBySel.setAttribute('data-original-taken-by', rp.taken_by); }
        } else takenBySel.value = '';

        var dc = String(rp.date_completed || rp.date_reported || '');
        if (dc) {
          var parts = dc.split(/[T ]/);
          var dateStr = parts[0] || '';
          var timeStr = parts[1] ? parts[1].substring(0,5) : '';
          if (byId('cmp_date')._flatpickr) byId('cmp_date')._flatpickr.setDate(dateStr, false);
          else byId('cmp_date').value = dateStr;
          if (timeStr) {
            if (byId('cmp_time')._flatpickr) byId('cmp_time')._flatpickr.setDate(timeStr, false);
            else byId('cmp_time').value = timeStr;
          }
        }

        byId('cmp_items_list').innerHTML = '';
        state.itemRowCount = 0;
        if (Array.isArray(rp.items_detail) && rp.items_detail.length) rp.items_detail.forEach(function(it){ addItemRow(it); });

        byId('cmp_insurance_section').style.display = (rp.service_type === 'accident' || rp.service_type === 'insurance') ? '' : 'none';
        byId('completedModal').classList.add('show');
      } catch (e) {
        showAlert(e.message || 'เกิดข้อผิดพลาด', 'error');
      }
    }

    async function submitCompleted(e){
      e.preventDefault();
      var btn = byId('cmpSubmitBtn');
      btn.disabled = true;
      btn.textContent = 'กำลังบันทึก...';

      try {
        var carId = byId('cmp_car_id').value;
        var dateVal = byId('cmp_date').value;
        var issue = String(byId('cmp_issue').value || '').trim();
        if (!carId) throw new Error('กรุณาเลือกรถ');
        if (!dateVal) throw new Error('กรุณาระบุวันที่ซ่อมเสร็จ');
        if (!issue) throw new Error('กรุณาระบุอาการ/รายการซ่อม');

        var timeVal = String(byId('cmp_time').value || '').trim();
        var dateCompleted = dateVal + (timeVal ? (' ' + timeVal + ':00') : ' 00:00:00');

        var takenBySel = byId('cmp_taken_by');
        var takenBy = null;
        if (takenBySel.value) {
          takenBy = driverLabel(takenBySel.value);
          if (takenBy === '-') takenBy = takenBySel.value;
        } else if (state.editingId) {
          takenBy = takenBySel.getAttribute('data-original-taken-by') || null;
        }

        var itemsDetail = collectItemRows();
        var repairItems = itemsDetail.map(function(it){ return it.description; }).filter(Boolean);

        var payload = {
          car_id: carId,
          date_reported: dateCompleted,
          date_completed: dateCompleted,
          issue_description: issue,
          repair_items: repairItems,
          items_detail: itemsDetail,
          mileage_at_repair: Number.parseInt(byId('cmp_mileage').value || '0', 10) || 0,
          garage_name: String(byId('cmp_garage').value || '').trim(),
          taken_by: takenBy || null,
          notes: String(byId('cmp_notes').value || '').trim(),
          status: 'completed',
          service_type: byId('cmp_service_type').value,
          invoice_number: String(byId('cmp_invoice').value || '').trim() || null,
          mechanic_name: String(byId('cmp_mechanic').value || '').trim() || null,
          labour_cost: toNum(byId('cmp_labour').value),
          parts_cost: toNum(byId('cmp_parts').value),
          discount_amount: toNum(byId('cmp_discount').value),
          vat_amount: toNum(byId('cmp_vat').value),
          grand_total: toNum(byId('cmp_grand_total').value),
          cost: toNum(byId('cmp_grand_total').value),
          mileage_out: Number.parseInt(byId('cmp_mileage_out').value || '0', 10) || null,
          claim_number: String(byId('cmp_claim').value || '').trim() || null,
          insurance_company: String(byId('cmp_insurance').value || '').trim() || null
        };

        var r;
        if (state.editingId) {
          payload.id = state.editingId;
          r = await withTimeout(apiCall('updateRepair', payload), 20000, 'บันทึกข้อมูลไม่สำเร็จ');
        } else {
          r = await withTimeout(apiCall('createRepair', payload), 20000, 'บันทึกข้อมูลไม่สำเร็จ');
        }

        if (!r || !r.success) throw new Error((r && r.message) || 'ดำเนินการไม่สำเร็จ');

        showAlert(state.editingId ? 'แก้ไขสำเร็จ' : 'บันทึกสำเร็จ', 'success');
        closeCompletedModal();
        await loadHistory(false);
      } catch (err) {
        showAlert(err.message || 'เกิดข้อผิดพลาด', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '💾 บันทึก';
      }
    }

    function exportExcel(){
      if (!Array.isArray(state.historyData) || !state.historyData.length) {
        alert('ไม่มีข้อมูลสำหรับส่งออก');
        return;
      }

      var headers = ['วันที่','ทะเบียน / รถ','ประเภท','อาการ / รายการ','อู่','เลขที่ใบซ่อม','ไมล์เข้า','ไมล์ออก','รวม (บาท)','ช่างผู้ดูแล','ผู้นำไปซ่อม','หมายเหตุ'];

      function mapRow(rp){
        var st = SERVICE_TYPE_MAP[rp.service_type] || SERVICE_TYPE_MAP.repair;
        return [
          fmtDate(rp.date_completed || rp.date_reported),
          vehicleLabel(rp.car_id, rp),
          st.label,
          rp.issue_description || '-',
          rp.garage_name || '-',
          rp.invoice_number || '-',
          rp.mileage_at_repair || 0,
          rp.mileage_out || '-',
          toNum(rp.grand_total || rp.cost || 0),
          rp.mechanic_name || '-',
          rp.taken_by || '-',
          rp.notes || '-'
        ];
      }

      var groups = {};
      state.historyData.forEach(function(rp){
        var label = (SERVICE_TYPE_MAP[rp.service_type] || SERVICE_TYPE_MAP.repair).label;
        if (!groups[label]) groups[label] = [];
        groups[label].push(rp);
      });

      var sheets = [{ sheetName:'ทั้งหมด', headers:headers, rows:state.historyData.map(mapRow) }];
      Object.keys(groups).forEach(function(label){
        var sheetName = label.substring(0,30).replace(/[\\/?*\[\]]/g, ' ');
        sheets.push({ sheetName:sheetName, headers:headers, rows:groups[label].map(mapRow) });
      });

      if (typeof ExportUtils !== 'undefined' && ExportUtils.exportExcelSheets) {
        ExportUtils.exportExcelSheets({ filename:'ประวัติการซ่อมบำรุง_' + new Date().toISOString().substring(0,10), sheets:sheets });
      } else {
        alert('ระบบ Export ยังไม่พร้อมใช้งาน กรุณาตรวจสอบไฟล์ js/export-utils.js');
      }
    }

    document.addEventListener('DOMContentLoaded', async function(){
      var depsReady = await waitForDeps();
      if (!depsReady) {
        byId('hTableBody').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--color-danger)">❌ ไม่สามารถเริ่มระบบได้ (โหลด API ไม่สำเร็จ)</td></tr>';
        return;
      }

      if (typeof requireAuth === 'function' && !requireAuth()) return;

      bindEvents();
      initYearFilter();

      if (!canEditRepair()) byId('btnAddCompleted').style.display = 'none';

      // โหลดข้อมูลรถ/คนขับพร้อมกับประวัติซ่อม — ไม่รอต่อกัน
      var params = new URLSearchParams(location.search);
      var carId = params.get('car_id');
      if (carId) byId('hFilterCar').value = carId;

      // เริ่มทุก API call พร้อมกัน
      await Promise.allSettled([
        loadVehicles(),
        loadDrivers(),
        loadHistory(false)
      ]);

      setTimeout(function(){ if (typeof initAllThaiDateTimePickers === 'function') initAllThaiDateTimePickers(); }, 120);
    });
  
