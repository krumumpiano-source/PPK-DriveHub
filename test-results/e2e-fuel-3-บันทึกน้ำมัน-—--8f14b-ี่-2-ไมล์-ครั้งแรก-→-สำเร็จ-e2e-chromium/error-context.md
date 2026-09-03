# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\fuel.spec.mjs >> 3. บันทึกน้ำมัน — บริบทพนักงานขับรถ (QR, ไม่มี token) >> เติมน้ำมันครั้งที่ 2 ไมล์ > ครั้งแรก → สำเร็จ
- Location: tests\e2e\fuel.spec.mjs:336:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  250 |       driver_name_manual: 'คนทดสอบ',
  251 |     });
  252 |     expect(r?.success).toBe(false);
  253 |     expect(r?.error).toMatch(/รายละเอียด/);
  254 |   });
  255 | 
  256 |   test('ไม่ส่ง driver_id และ driver_name_manual → error', async () => {
  257 |     if (!ctx.fuelCar1Id) return;
  258 |     const r = await apiPost('/api/fuel/record', {
  259 |       car_id: ctx.fuelCar1Id,
  260 |       receipt_image: MOCK_RECEIPT,
  261 |       mileage_after: 10000,
  262 |       purpose: 'business',
  263 |     });
  264 |     expect(r?.success).toBe(false);
  265 |     expect(r?.error).toMatch(/ผู้เบิก/);
  266 |   });
  267 | });
  268 | 
  269 | // ══════════════════════════════════════════════════════════
  270 | // 3. บันทึกน้ำมัน — บริบทพนักงานขับรถ
  271 | //    (QR scan — ไม่มี token, ใช้ driver_id หรือ driver_name_manual)
  272 | // ══════════════════════════════════════════════════════════
  273 | test.describe('3. บันทึกน้ำมัน — บริบทพนักงานขับรถ (QR, ไม่มี token)', () => {
  274 |   test('บันทึกน้ำมัน minimal ด้วย driver_id (QR scan) → สำเร็จ', async () => {
  275 |     if (!ctx.fuelCar1Id || !ctx.driverId) return;
  276 |     const r = await apiPost('/api/fuel/record', {
  277 |       car_id: ctx.fuelCar1Id,
  278 |       driver_id: ctx.driverId,
  279 |       mileage_after: 10000,
  280 |       liters: 40,
  281 |       purpose: 'business',
  282 |       receipt_image: MOCK_RECEIPT,
  283 |     });
  284 |     expect(r?.success).toBe(true);
  285 |     expect(r?.data?.id).toBeTruthy();
  286 |     expect(r?.data?.document_number).toBeTruthy();
  287 |     ctx.fuelLogId = r.data.id;
  288 |     ctx.docNumber = r.data.document_number;
  289 |   });
  290 | 
  291 |   test('document_number มีรูปแบบ FUL-{BE}-{MM}-{NNN}', async () => {
  292 |     expect(ctx.docNumber).toMatch(/^FUL-\d{4}-\d{2}-\d{3}$/);
  293 |   });
  294 | 
  295 |   test('บันทึกน้ำมัน ด้วย driver_name_manual (ไม่มีในระบบ) → สำเร็จ', async () => {
  296 |     if (!ctx.fuelCar1Id) return;
  297 |     const r = await apiPost('/api/fuel/record', {
  298 |       car_id: ctx.fuelCar1Id,
  299 |       driver_name_manual: 'นายสมชาย ใจดี',
  300 |       mileage_before: 10000,
  301 |       mileage_after: 10300,
  302 |       liters: 35,
  303 |       price_per_liter: 29.95,
  304 |       amount: 1048,
  305 |       purpose: 'government_task',
  306 |       fuel_type: 'fuelSave_diesel_b7',
  307 |       receipt_image: MOCK_RECEIPT,
  308 |       date: '2020-03-01',
  309 |       time: '09:30',
  310 |     });
  311 |     expect(r?.success).toBe(true);
  312 |     expect(r?.data?.id).toBeTruthy();
  313 |     expect(r?.data?.document_number).toMatch(/^FUL-2563-03-/);
  314 |   });
  315 | 
  316 |   test('ไม่ต้องมี Authorization header (PUBLIC) → สำเร็จ', async () => {
  317 |     if (!ctx.fuelCar1Id || !ctx.driverId) return;
  318 |     const r = await fetch(`${BASE}/api/fuel/record`, {
  319 |       method: 'POST',
  320 |       headers: { 'Content-Type': 'application/json' },
  321 |       body: JSON.stringify({
  322 |         car_id: ctx.fuelCar1Id,
  323 |         driver_id: ctx.driverId,
  324 |         mileage_before: 10300,
  325 |         mileage_after: 10600,
  326 |         liters: 38,
  327 |         purpose: 'government_task',
  328 |         receipt_image: MOCK_RECEIPT,
  329 |         date: '2020-03-02',
  330 |         time: '10:00',
  331 |       }),
  332 |     }).then(x => x.json()).catch(() => null);
  333 |     expect(r?.success).toBe(true);
  334 |   });
  335 | 
  336 |   test('เติมน้ำมันครั้งที่ 2 ไมล์ > ครั้งแรก → สำเร็จ', async () => {
  337 |     if (!ctx.fuelCar1Id || !ctx.driverId) return;
  338 |     const r = await apiPost('/api/fuel/record', {
  339 |       car_id: ctx.fuelCar1Id,
  340 |       driver_id: ctx.driverId,
  341 |       mileage_before: 10600,
  342 |       mileage_after: 10900,
  343 |       liters: 42,
  344 |       amount: 1260,
  345 |       purpose: 'business',
  346 |       receipt_image: MOCK_RECEIPT,
  347 |       date: '2020-03-03',
  348 |       time: '11:00',
  349 |     });
> 350 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  351 |     expect(r?.data?.id).toBeTruthy();
  352 |   });
  353 | 
  354 |   test('purpose: other + purpose_detail → สำเร็จ', async () => {
  355 |     if (!ctx.fuelCar1Id || !ctx.driverId) return;
  356 |     const r = await apiPost('/api/fuel/record', {
  357 |       car_id: ctx.fuelCar1Id,
  358 |       driver_id: ctx.driverId,
  359 |       mileage_before: 10900,
  360 |       mileage_after: 11200,
  361 |       liters: 30,
  362 |       purpose: 'other',
  363 |       purpose_detail: 'ส่งเอกสารฉุกเฉินนอกพื้นที่',
  364 |       receipt_image: MOCK_RECEIPT,
  365 |       date: '2020-03-04',
  366 |       time: '08:00',
  367 |     });
  368 |     expect(r?.success).toBe(true);
  369 |     expect(r?.data?.id).toBeTruthy();
  370 |   });
  371 | });
  372 | 
  373 | // ══════════════════════════════════════════════════════════
  374 | // 4. บันทึกน้ำมัน — บริบทคณะทำงาน (Admin/Staff, มี token)
  375 | //    เจ้าหน้าที่บันทึกพร้อมรายละเอียดเต็มรูปแบบ
  376 | // ══════════════════════════════════════════════════════════
  377 | test.describe('4. บันทึกน้ำมัน — บริบทคณะทำงาน (Admin/Staff, มี token)', () => {
  378 |   test('บันทึกน้ำมันพร้อมข้อมูลครบทุก field → สำเร็จ', async () => {
  379 |     if (!ctx.fuelCar1Id || !ctx.driverId || !ctx.adminToken) return;
  380 |     const r = await apiPost('/api/fuel/record', {
  381 |       car_id: ctx.fuelCar1Id,
  382 |       driver_id: ctx.driverId,
  383 |       mileage_before: 11200,
  384 |       mileage_after: 11500,
  385 |       liters: 45,
  386 |       price_per_liter: 30.25,
  387 |       amount: 1361.25,
  388 |       fuel_type: 'fuelSave_diesel_b7',
  389 |       gas_station_name: 'ปั๊มน้ำมัน PTT สาขาทดสอบ',
  390 |       gas_station_address: '999 ถ.ทดสอบ กรุงเทพ',
  391 |       gas_station_tax_id: '0105559123456',
  392 |       receipt_number: 'REC-2020-001',
  393 |       pump_meter_number: 'PUMP-01',
  394 |       expense_type: 'procurement',
  395 |       notes: 'เติมน้ำมันก่อนออกปฏิบัติงาน',
  396 |       purpose: 'government_task',
  397 |       receipt_image: MOCK_RECEIPT,
  398 |       date: '2020-03-10',
  399 |       time: '07:30',
  400 |     }, ctx.adminToken);
  401 |     expect(r?.success).toBe(true);
  402 |     expect(r?.data?.id).toBeTruthy();
  403 |     expect(r?.data?.document_number).toMatch(/^FUL-2563-03-/);
  404 |     ctx.fuelLogId2 = r.data.id;
  405 |   });
  406 | 
  407 |   test('GET /api/fuel/log/:id → ข้อมูลครบถ้วน', async () => {
  408 |     if (!ctx.fuelLogId2 || !ctx.adminToken) return;
  409 |     const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId2}`, ctx.adminToken);
  410 |     expect(r?.success).toBe(true);
  411 |     expect(r?.data?.id).toBe(ctx.fuelLogId2);
  412 |     expect(r?.data?.gas_station_name).toBe('ปั๊มน้ำมัน PTT สาขาทดสอบ');
  413 |     expect(r?.data?.gas_station_tax_id).toBe('0105559123456');
  414 |     expect(r?.data?.receipt_number).toBe('REC-2020-001');
  415 |     expect(r?.data?.liters).toBe(45);
  416 |     expect(r?.data?.expense_type).toBe('procurement');
  417 |   });
  418 | 
  419 |   test('ระบบคำนวณ fuel_consumption_rate อัตโนมัติ', async () => {
  420 |     if (!ctx.fuelLogId2 || !ctx.adminToken) return;
  421 |     const r = await apiGet(`/api/fuel/log/${ctx.fuelLogId2}`, ctx.adminToken);
  422 |     // (11500 - 11200) / 45 = 300 / 45 ≈ 6.67 km/L
  423 |     expect(r?.data?.fuel_consumption_rate).toBeGreaterThan(0);
  424 |     expect(r?.data?.fuel_consumption_rate).toBeCloseTo(300 / 45, 1);
  425 |   });
  426 | 
  427 |   test('บันทึกน้ำมันด้วย expense_type: private → สำเร็จ', async () => {
  428 |     if (!ctx.fuelCar2Id || !ctx.driverId || !ctx.adminToken) return;
  429 |     const r = await apiPost('/api/fuel/record', {
  430 |       car_id: ctx.fuelCar2Id,
  431 |       driver_id: ctx.driverId,
  432 |       mileage_before: 20000,
  433 |       mileage_after: 20300,
  434 |       liters: 30,
  435 |       amount: 900,
  436 |       expense_type: 'official_travel',
  437 |       purpose: 'business',
  438 |       gas_station_name: 'ปั๊มใกล้บ้าน',
  439 |       receipt_image: MOCK_RECEIPT,
  440 |       date: '2020-03-10',
  441 |     }, ctx.adminToken);
  442 |     expect(r?.success).toBe(true);
  443 |     expect(r?.data?.id).toBeTruthy();
  444 |     ctx.fuelDeleteId = r.data.id;
  445 |   });
  446 | 
  447 |   test('อัปเดตไมล์รถอัตโนมัติหลังเติมน้ำมัน', async () => {
  448 |     if (!ctx.fuelCar1Id || !ctx.adminToken) return;
  449 |     const car = await apiGet(`/api/vehicles/${ctx.fuelCar1Id}`, ctx.adminToken);
  450 |     // หลังจาก POST หลายครั้ง current_mileage ควร = mileage_after ล่าสุด
```