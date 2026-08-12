# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\repair-comprehensive.spec.mjs >> 2. Maintenance Sync หลังซ่อมเสร็จ >> สร้างและดำเนิน repair workflow จนถึง complete พร้อมรายการน้ำมันเครื่อง
- Location: tests\e2e\repair-comprehensive.spec.mjs:249:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  198 |   });
  199 | 
  200 |   test('GET /api/notifications?limit=5 → คืนไม่เกิน 5 รายการ', async () => {
  201 |     if (!ctx.adminToken) return;
  202 |     const r = await apiGet('/api/notifications?limit=5', ctx.adminToken);
  203 |     expect(r?.success).toBe(true);
  204 |     const notis = r?.notifications || r?.data?.notifications || [];
  205 |     expect(notis.length).toBeLessThanOrEqual(5);
  206 |   });
  207 | 
  208 |   test('PUT /api/notifications/read-all → สำเร็จ', async () => {
  209 |     if (!ctx.adminToken) return;
  210 |     const r = await apiPut('/api/notifications/read-all', {}, ctx.adminToken);
  211 |     expect(r?.success).toBe(true);
  212 |   });
  213 | 
  214 |   test('หลัง read-all → unread_count = 0', async () => {
  215 |     if (!ctx.adminToken) return;
  216 |     const r = await apiGet('/api/notifications?unread=true', ctx.adminToken);
  217 |     expect(r?.success).toBe(true);
  218 |     const unreadCount = r?.unread_count ?? r?.data?.unread_count ?? 0;
  219 |     expect(unreadCount).toBe(0);
  220 |   });
  221 | 
  222 |   test('approve repair → notification ถูกสร้างให้ผู้แจ้งซ่อม', async () => {
  223 |     if (!ctx.notiRepairId || !ctx.adminToken) return;
  224 |     const rApprove = await apiPut(`/api/repair/log/${ctx.notiRepairId}/approve`, {}, ctx.adminToken);
  225 |     expect(rApprove?.success).toBe(true);
  226 |     // notifications endpoint ต้อง respond ได้ (approval sends to created_by)
  227 |     const rNoti = await apiGet('/api/notifications', ctx.adminToken);
  228 |     expect(rNoti?.success).toBe(true);
  229 |   });
  230 | 
  231 |   test('ไม่มี token → GET /api/notifications คืน 401', async () => {
  232 |     const r = await apiGet('/api/notifications');
  233 |     expect(r?.success).toBe(false);
  234 |   });
  235 | 
  236 |   test('ไม่มี token → PUT /api/notifications/read-all คืน 401', async () => {
  237 |     const r = await apiPut('/api/notifications/read-all', {});
  238 |     expect(r?.success).toBe(false);
  239 |   });
  240 | });
  241 | 
  242 | // ══════════════════════════════════════════════════════════
  243 | // Group 2: Maintenance Sync — vehicle_maintenance อัปเดตหลังซ่อมเสร็จ
  244 | // ══════════════════════════════════════════════════════════
  245 | test.describe('2. Maintenance Sync หลังซ่อมเสร็จ', () => {
  246 |   let syncRepairId = '';
  247 |   const OIL_MILEAGE = 75000;
  248 | 
  249 |   test('สร้างและดำเนิน repair workflow จนถึง complete พร้อมรายการน้ำมันเครื่อง', async () => {
  250 |     if (!ctx.syncCarId || !ctx.adminToken) return;
  251 |     // POST create
  252 |     const rCreate = await apiPost('/api/repair/log', {
  253 |       car_id: ctx.syncCarId,
  254 |       issue_description: 'เช็คระยะ — เปลี่ยนน้ำมันเครื่องและไส้กรอง',
  255 |       mileage_at_repair: OIL_MILEAGE,
  256 |       service_type: 'scheduled_maintenance',
  257 |       date_reported: '2020-04-01',
  258 |     }, ctx.adminToken);
  259 |     expect(rCreate?.success).toBe(true);
  260 |     syncRepairId = rCreate?.data?.id || '';
  261 |     expect(syncRepairId).toBeTruthy();
  262 | 
  263 |     // approve → inspect → document → start-repair → complete
  264 |     await apiPut(`/api/repair/log/${syncRepairId}/approve`, {}, ctx.adminToken);
  265 |     await apiPut(`/api/repair/log/${syncRepairId}/inspect`, {
  266 |       inspection_date: '2020-04-02',
  267 |       garage_name: 'ศูนย์ Toyota Sync Test',
  268 |     }, ctx.adminToken);
  269 |     await apiPut(`/api/repair/log/${syncRepairId}/document`, {
  270 |       memo_notes: 'อนุมัติซ่อมตามรายการ',
  271 |     }, ctx.adminToken);
  272 |     await apiPut(`/api/repair/log/${syncRepairId}/start-repair`, {
  273 |       date_started: '2020-04-03',
  274 |     }, ctx.adminToken);
  275 |     const rComplete = await apiPut(`/api/repair/log/${syncRepairId}/complete`, {
  276 |       date_completed: '2020-04-04',
  277 |       cost: 2500,
  278 |       mileage_out: OIL_MILEAGE + 5,
  279 |       items_detail: [
  280 |         {
  281 |           description: 'น้ำมันเครื่อง 10W-30',
  282 |           part_code: '08880-01806',
  283 |           quantity: 4,
  284 |           unit_price: 220,
  285 |           net_amount: 880,
  286 |           item_type: 'part',
  287 |         },
  288 |         {
  289 |           description: 'ไส้กรองน้ำมันเครื่อง',
  290 |           part_code: '90915-YZZD2',
  291 |           quantity: 1,
  292 |           unit_price: 180,
  293 |           net_amount: 180,
  294 |           item_type: 'part',
  295 |         },
  296 |       ],
  297 |     }, ctx.adminToken);
> 298 |     expect(rComplete?.success).toBe(true);
      |                                ^ Error: expect(received).toBe(expected) // Object.is equality
  299 |   });
  300 | 
  301 |   test('GET /api/maintenance/vehicle/:car_id → พบ engine_oil last_km อัปเดตแล้ว', async () => {
  302 |     if (!ctx.syncCarId || !ctx.adminToken) return;
  303 |     // ตรวจสอบว่า vehicle_maintenance ถูก sync
  304 |     const r = await apiGet(`/api/maintenance/vehicle/${ctx.syncCarId}`, ctx.adminToken);
  305 |     // ถ้า endpoint ไม่มี → ข้าม (ระบบอาจใช้ /api/maintenance/status/:car_id)
  306 |     if (!r?.success) {
  307 |       const r2 = await apiGet(`/api/maintenance/status?car_id=${ctx.syncCarId}`, ctx.adminToken);
  308 |       if (!r2?.success) return; // endpoint ไม่รองรับ — skip
  309 |       const items = r2?.data || [];
  310 |       const oilItem = items.find(it => it.item_key === 'engine_oil' || it.item_name?.includes('น้ำมันเครื่อง'));
  311 |       if (oilItem) {
  312 |         expect(oilItem.last_km).toBeGreaterThanOrEqual(OIL_MILEAGE);
  313 |       }
  314 |       return;
  315 |     }
  316 |     const items = r?.data || [];
  317 |     const oilItem = items.find(it =>
  318 |       it.item_key === 'engine_oil' || it.item_name?.includes('น้ำมันเครื่อง')
  319 |     );
  320 |     if (oilItem) {
  321 |       expect(oilItem.last_km).toBeGreaterThanOrEqual(OIL_MILEAGE);
  322 |     }
  323 |   });
  324 | 
  325 |   test('ตรวจสอบสถานะรถ SYNC-001 กลับเป็น active หลังซ่อมเสร็จ', async () => {
  326 |     if (!ctx.syncCarId || !ctx.adminToken) return;
  327 |     const r = await apiGet(`/api/vehicles/${ctx.syncCarId}`, ctx.adminToken);
  328 |     expect(r?.success).toBe(true);
  329 |     expect(r?.data?.status).toBe('active');
  330 |   });
  331 | 
  332 |   test('complete repair โดยตรง (POST status=completed) → maintenance sync ทำงาน', async () => {
  333 |     if (!ctx.syncCarId || !ctx.adminToken) return;
  334 |     const r = await apiPost('/api/repair/log', {
  335 |       car_id: ctx.syncCarId,
  336 |       issue_description: 'เปลี่ยนไส้กรองอากาศ',
  337 |       mileage_at_repair: 76000,
  338 |       status: 'completed',
  339 |       date_reported: '2020-04-05',
  340 |       date_completed: '2020-04-05',
  341 |       items_detail: [
  342 |         {
  343 |           description: 'ไส้กรองอากาศ',
  344 |           quantity: 1,
  345 |           unit_price: 350,
  346 |           net_amount: 350,
  347 |         },
  348 |       ],
  349 |     }, ctx.adminToken);
  350 |     expect(r?.success).toBe(true);
  351 |     expect(r?.data?.id).toBeTruthy();
  352 |   });
  353 | });
  354 | 
  355 | // ══════════════════════════════════════════════════════════
  356 | // Group 3: Edge Cases — ข้อมูลผิดปกติจากผู้ใช้
  357 | // ══════════════════════════════════════════════════════════
  358 | test.describe('3. Edge Cases — ข้อมูลผิดปกติจากผู้ใช้', () => {
  359 | 
  360 |   // -- Daily Check edge cases --
  361 | 
  362 |   test('daily check: mileage เป็น string "abc" → success (normalize เป็น 0)', async () => {
  363 |     if (!ctx.edgeCar1Id) return;
  364 |     const r = await apiPost('/api/check/daily', {
  365 |       car_id: ctx.edgeCar1Id,
  366 |       mileage: 'abc',
  367 |       inspector_name: 'ทดสอบ mileage string',
  368 |     });
  369 |     expect(r?.success).toBe(true);
  370 |   });
  371 | 
  372 |   test('daily check: mileage เป็น -999 (ลบ) → success (ไม่ reject)', async () => {
  373 |     if (!ctx.edgeCar1Id) return;
  374 |     const r = await apiPost('/api/check/daily', {
  375 |       car_id: ctx.edgeCar1Id,
  376 |       mileage: -999,
  377 |       inspector_name: 'ช่างทดสอบ mileage ลบ',
  378 |     });
  379 |     expect(r?.success).toBe(true);
  380 |   });
  381 | 
  382 |   test('daily check: notes ยาวมาก (1000 ตัวอักษร) → success', async () => {
  383 |     if (!ctx.edgeCar1Id) return;
  384 |     const longNotes = 'ก'.repeat(1000);
  385 |     const r = await apiPost('/api/check/daily', {
  386 |       car_id: ctx.edgeCar1Id,
  387 |       notes: longNotes,
  388 |       inspector_name: 'ทดสอบ notes ยาว',
  389 |     });
  390 |     expect(r?.success).toBe(true);
  391 |   });
  392 | 
  393 |   test('daily check: inspector_name ว่าง → success (default เป็น QR)', async () => {
  394 |     if (!ctx.edgeCar1Id) return;
  395 |     const r = await apiPost('/api/check/daily', {
  396 |       car_id: ctx.edgeCar1Id,
  397 |       inspector_name: '',
  398 |     });
```