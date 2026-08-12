# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\qr-scan.spec.mjs >> 4. Flow สมบูรณ์ — บันทึกออกและกลับ >> บันทึกกลับ (return) สมบูรณ์ — สำเร็จ ไม่มี auto_heal
- Location: tests\e2e\qr-scan.spec.mjs:348:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  258 |   test('ไม่มี car_id → error', async () => {
  259 |     const r = await apiPost('/api/usage/record', {
  260 |       record_type: 'departure',
  261 |       driver_id: ctx.driverId || 'x',
  262 |     });
  263 |     expect(r?.success).toBe(false);
  264 |     expect(r?.message || r?.error).toBeTruthy();
  265 |   });
  266 | 
  267 |   test('ไม่มี record_type → error', async () => {
  268 |     if (!ctx.carId) return;
  269 |     const r = await apiPost('/api/usage/record', {
  270 |       car_id: ctx.carId,
  271 |       driver_id: ctx.driverId || 'x',
  272 |     });
  273 |     expect(r?.success).toBe(false);
  274 |   });
  275 | 
  276 |   test('ไม่มี driver_id และ driver_name_manual → error', async () => {
  277 |     if (!ctx.carId) return;
  278 |     const r = await apiPost('/api/usage/record', {
  279 |       car_id: ctx.carId,
  280 |       record_type: 'departure',
  281 |       // ไม่มี driver_id และ driver_name_manual
  282 |     });
  283 |     expect(r?.success).toBe(false);
  284 |   });
  285 | 
  286 |   test('record_type ไม่ถูกต้อง → error', async () => {
  287 |     if (!ctx.carId) return;
  288 |     const r = await apiPost('/api/usage/record', {
  289 |       car_id: ctx.carId,
  290 |       record_type: 'invalid_type_xyz',
  291 |       driver_id: ctx.driverId || 'x',
  292 |     });
  293 |     expect(r?.success).toBe(false);
  294 |   });
  295 | 
  296 |   test('เลขไมล์ติดลบ → error', async () => {
  297 |     if (!ctx.carId) return;
  298 |     const r = await apiPost('/api/usage/record', {
  299 |       car_id: ctx.carId,
  300 |       record_type: 'departure',
  301 |       driver_id: ctx.driverId || 'x',
  302 |       mileage: -500,
  303 |     });
  304 |     expect(r?.success).toBe(false);
  305 |   });
  306 | });
  307 | 
  308 | // ══════════════════════════════════════════════════════════
  309 | // 4. Flow สมบูรณ์ — บันทึกออก (departure) → บันทึกกลับ (return)
  310 | // ใช้รถ ctx.carId + ctx.driverId
  311 | // ══════════════════════════════════════════════════════════
  312 | test.describe('4. Flow สมบูรณ์ — บันทึกออกและกลับ', () => {
  313 |   test('สถานะเริ่มต้นของรถ → unknown', async () => {
  314 |     if (!ctx.carId) return;
  315 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
  316 |     expect(r?.success).toBe(true);
  317 |     expect(r?.data?.status).toBe('unknown');
  318 |   });
  319 | 
  320 |   test('บันทึกออก (departure) สมบูรณ์ — สำเร็จ ไม่มี auto_heal', async () => {
  321 |     if (!ctx.carId || !ctx.driverId) return;
  322 |     const r = await apiPost('/api/usage/record', {
  323 |       car_id: ctx.carId,
  324 |       record_type: 'departure',
  325 |       driver_id: ctx.driverId,
  326 |       datetime: DT.DEP,
  327 |       mileage: 10000,
  328 |       destination: 'สำนักงานใหญ่',
  329 |       purpose: 'ราชการ',
  330 |       requester_name: 'ผู้บันทึกทดสอบ',
  331 |     });
  332 |     expect(r?.success).toBe(true);
  333 |     expect(r?.data?.id).toBeTruthy();
  334 |     // ออกครั้งแรก — ไม่ควรมี auto_heal
  335 |     expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
  336 |     expect(r?.data?.auto_healed?.length).toBe(0);
  337 |   });
  338 | 
  339 |   test('สถานะหลังบันทึกออก → out', async () => {
  340 |     if (!ctx.carId) return;
  341 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
  342 |     expect(r?.success).toBe(true);
  343 |     expect(r?.data?.status).toBe('out');
  344 |     expect(r?.data?.last_record_type).toBe('departure');
  345 |     expect(r?.data?.mileage).toBe(10000);
  346 |   });
  347 | 
  348 |   test('บันทึกกลับ (return) สมบูรณ์ — สำเร็จ ไม่มี auto_heal', async () => {
  349 |     if (!ctx.carId || !ctx.driverId) return;
  350 |     const r = await apiPost('/api/usage/record', {
  351 |       car_id: ctx.carId,
  352 |       record_type: 'return',
  353 |       driver_id: ctx.driverId,
  354 |       datetime: DT.RET,  // 14:00 > 08:00 — ชัดเจน
  355 |       mileage: 10120,
  356 |       notes: 'กลับเรียบร้อย',
  357 |     });
> 358 |     expect(r?.success).toBe(true);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  359 |     expect(r?.data?.id).toBeTruthy();
  360 |     // กลับหลัง departure → ไม่มี auto_heal
  361 |     expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
  362 |     expect(r?.data?.auto_healed?.length).toBe(0);
  363 |   });
  364 | 
  365 |   test('สถานะหลังบันทึกกลับ → in', async () => {
  366 |     if (!ctx.carId) return;
  367 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carId}`);
  368 |     expect(r?.success).toBe(true);
  369 |     expect(r?.data?.status).toBe('in');
  370 |     expect(r?.data?.last_record_type).toBe('return');
  371 |     expect(r?.data?.mileage).toBe(10120);
  372 |   });
  373 | 
  374 |   test('ดู usage records ผ่าน admin → มีทั้ง departure และ return', async () => {
  375 |     if (!ctx.carId || !ctx.adminToken) return;
  376 |     const r = await apiGet(`/api/usage?car_id=${ctx.carId}`, ctx.adminToken);
  377 |     expect(r?.success).toBe(true);
  378 |     const rows = r?.data || [];
  379 |     const depRows = rows.filter(x => x.record_type === 'departure');
  380 |     const retRows = rows.filter(x => x.record_type === 'return');
  381 |     expect(depRows.length).toBeGreaterThanOrEqual(1);
  382 |     expect(retRows.length).toBeGreaterThanOrEqual(1);
  383 |     // ตรวจสอบ driver_id ตรงกัน
  384 |     const dep = depRows[0];
  385 |     expect(dep.driver_id).toBe(ctx.driverId);
  386 |     expect(dep.destination).toBe('สำนักงานใหญ่');
  387 |     expect(dep.purpose).toBe('ราชการ');
  388 |   });
  389 | 
  390 |   test('บันทึก record_type: refuel สำเร็จ', async () => {
  391 |     if (!ctx.carId || !ctx.driverId) return;
  392 |     const r = await apiPost('/api/usage/record', {
  393 |       car_id: ctx.carId,
  394 |       record_type: 'refuel',
  395 |       driver_id: ctx.driverId,
  396 |       datetime: DT.REFUEL,
  397 |       mileage: 10150,
  398 |       notes: 'เติมน้ำมัน 40 ลิตร',
  399 |     });
  400 |     expect(r?.success).toBe(true);
  401 |     expect(r?.data?.id).toBeTruthy();
  402 |   });
  403 | 
  404 |   test('บันทึก record_type: inspection สำเร็จ', async () => {
  405 |     if (!ctx.carId || !ctx.driverId) return;
  406 |     const r = await apiPost('/api/usage/record', {
  407 |       car_id: ctx.carId,
  408 |       record_type: 'inspection',
  409 |       driver_id: ctx.driverId,
  410 |       datetime: DT.INSPECTION,
  411 |       notes: 'ตรวจสภาพรถประจำเดือน',
  412 |     });
  413 |     expect(r?.success).toBe(true);
  414 |   });
  415 | });
  416 | 
  417 | // ══════════════════════════════════════════════════════════
  418 | // 5. Flow ลืมบันทึกกลับ — Auto-Heal Return
  419 | //    departure → departure → auto-heal สร้าง return อัตโนมัติ
  420 | //    (ลด discipline_score ของพนักงาน)
  421 | // ══════════════════════════════════════════════════════════
  422 | test.describe('5. Flow ลืมบันทึกกลับ — Auto-Heal Return', () => {
  423 |   test('บันทึกออกครั้งที่ 1 สำเร็จ — ไม่มี auto_heal', async () => {
  424 |     if (!ctx.carAutoHealId || !ctx.driverAutoHealId) return;
  425 |     const r = await apiPost('/api/usage/record', {
  426 |       car_id: ctx.carAutoHealId,
  427 |       record_type: 'departure',
  428 |       driver_id: ctx.driverAutoHealId,
  429 |       datetime: DT.AH_DEP1,
  430 |       mileage: 20000,
  431 |       destination: 'ตลาด',
  432 |     });
  433 |     expect(r?.success).toBe(true);
  434 |     // บันทึกแรก ไม่มี auto_heal
  435 |     expect(r?.data?.auto_healed?.length).toBe(0);
  436 |   });
  437 | 
  438 |   test('สถานะหลังออกครั้งที่ 1 → out', async () => {
  439 |     if (!ctx.carAutoHealId) return;
  440 |     const r = await apiGet(`/api/usage/latest-status?car_id=${ctx.carAutoHealId}`);
  441 |     expect(r?.data?.status).toBe('out');
  442 |   });
  443 | 
  444 |   test('บันทึกออกครั้งที่ 2 (ลืมบันทึกกลับ) → auto-heal สร้าง return อัตโนมัติ', async () => {
  445 |     if (!ctx.carAutoHealId || !ctx.driverAutoHealId) return;
  446 |     const r = await apiPost('/api/usage/record', {
  447 |       car_id: ctx.carAutoHealId,
  448 |       record_type: 'departure',
  449 |       driver_id: ctx.driverAutoHealId,
  450 |       datetime: DT.AH_DEP2,  // 16:00 > 08:00 ชัดเจน
  451 |       mileage: 20200,
  452 |       destination: 'โรงเรียน',
  453 |     });
  454 |     expect(r?.success).toBe(true);
  455 |     // ต้องมี auto_heal!
  456 |     expect(Array.isArray(r?.data?.auto_healed)).toBe(true);
  457 |     expect(r?.data?.auto_healed?.length).toBeGreaterThan(0);
  458 |     const healTypes = (r?.data?.auto_healed || []).map(h => h.type);
```