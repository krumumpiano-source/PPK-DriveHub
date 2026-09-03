# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qr-system.test.mjs >> 3. QR Usage Record >> Guest mode — submit usage for each vehicle
- Location: tests\qr-system.test.mjs:342:3

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 300
Received:   500
```

# Test source

```ts
  255 | });
  256 | 
  257 | // ══════════════════════════════════════════════════
  258 | // 1. QR-INFO — Public vehicle data endpoint
  259 | // ══════════════════════════════════════════════════
  260 | test.describe.serial('1. QR Vehicle Info (Public Endpoint)', () => {
  261 | 
  262 |   test('GET /api/vehicles/qr-info — returns vehicle data for each car', async () => {
  263 |     for (const v of vehicles) {
  264 |       const r = await get(`/api/vehicles/qr-info?car_id=${v.id}`);
  265 |       expect(r.status).toBe(200);
  266 |       expect(r.data.success).toBe(true);
  267 |       expect(r.data.data.license_plate).toBe(v.license_plate);
  268 |       expect(r.data.data.brand).toBeTruthy();
  269 |       expect(r.data.data.model).toBeTruthy();
  270 |     }
  271 |   });
  272 | 
  273 |   test('QR-info includes fuel_type (needed for daily-check)', async () => {
  274 |     for (const v of vehicles) {
  275 |       const r = await get(`/api/vehicles/qr-info?car_id=${v.id}`);
  276 |       expect(r.data.data).toHaveProperty('fuel_type');
  277 |       expect(r.data.data.fuel_type).toBe(v.fuel_type);
  278 |     }
  279 |   });
  280 | 
  281 |   test('QR-info by license plate fallback', async () => {
  282 |     if (!vehicles.length) { test.skip(); return; }
  283 |     const v = vehicles[0];
  284 |     const r = await get(`/api/vehicles/qr-info?car_id=${encodeURIComponent(v.license_plate)}`);
  285 |     expect(r.status).toBe(200);
  286 |     expect(r.data.success).toBe(true);
  287 |   });
  288 | 
  289 |   test('QR-info with invalid car_id returns 404', async () => {
  290 |     const r = await get('/api/vehicles/qr-info?car_id=nonexistent-id-xyz');
  291 |     expect(r.status).toBe(404);
  292 |   });
  293 | 
  294 |   test('QR-info without car_id returns error', async () => {
  295 |     const r = await get('/api/vehicles/qr-info');
  296 |     expect(r.data.success).toBe(false);
  297 |   });
  298 | });
  299 | 
  300 | // ══════════════════════════════════════════════════
  301 | // 2. QR URL GENERATION — Verify URL patterns per vehicle
  302 | // ══════════════════════════════════════════════════
  303 | test.describe.serial('2. QR URL Patterns', () => {
  304 | 
  305 |   test('QR URLs are correctly formed for each vehicle × function', async () => {
  306 |     const qrTypes = {
  307 |       usage: 'qr-usage-record.html',
  308 |       fuel: 'qr-fuel-record.html',
  309 |       check: 'qr-daily-check.html',
  310 |     };
  311 | 
  312 |     for (const v of vehicles) {
  313 |       for (const [type, page] of Object.entries(qrTypes)) {
  314 |         const expectedUrl = `${BASE}/${page}?car=${encodeURIComponent(v.id)}`;
  315 |         // Verify the page is accessible
  316 |         const res = await fetch(`${BASE}/${page}?car=${v.id}`);
  317 |         expect(res.status).toBe(200);
  318 |         const html = await res.text();
  319 |         expect(html).toContain('<!DOCTYPE html>');
  320 |       }
  321 |     }
  322 |   });
  323 | 
  324 |   test('QR scan page is accessible', async () => {
  325 |     const res = await fetch(`${BASE}/qr-scan.html`);
  326 |     expect(res.status).toBe(200);
  327 |     const html = await res.text();
  328 |     expect(html).toContain('<!DOCTYPE html>');
  329 |   });
  330 | 
  331 |   test('QR manage page is accessible (auth required for data)', async () => {
  332 |     const res = await fetch(`${BASE}/qr-manage.html`);
  333 |     expect(res.status).toBe(200);
  334 |   });
  335 | });
  336 | 
  337 | // ══════════════════════════════════════════════════
  338 | // 3. QR USAGE RECORD — All roles × All vehicles
  339 | // ══════════════════════════════════════════════════
  340 | test.describe.serial('3. QR Usage Record', () => {
  341 | 
  342 |   test('Guest mode — submit usage for each vehicle', async () => {
  343 |     for (const v of vehicles) {
  344 |       const r = await post('/api/usage/record', {
  345 |         car_id: v.id,
  346 |         record_type: 'departure',
  347 |         datetime: '2026-04-16 08:00',
  348 |         mileage: 10000 + vehicles.indexOf(v) * 1000,
  349 |         driver_name_manual: 'แขกทดสอบ ไม่มีบัญชี',
  350 |         requester_name: 'ผู้ขอใช้รถ',
  351 |         destination: 'สำนักงานเขต',
  352 |         purpose: 'official_document',
  353 |         record_source: 'qr_manual',
  354 |       });
> 355 |       expect(r.status).toBeLessThan(300);
      |                        ^ Error: expect(received).toBeLessThan(expected)
  356 |       expect(r.data.success).toBe(true);
  357 |     }
  358 |   });
  359 | 
  360 |   test('Guest mode — return trip', async () => {
  361 |     for (const v of vehicles) {
  362 |       const r = await post('/api/usage/record', {
  363 |         car_id: v.id,
  364 |         record_type: 'return',
  365 |         datetime: '2026-04-16 16:00',
  366 |         mileage: 10100 + vehicles.indexOf(v) * 1000,
  367 |         driver_name_manual: 'แขกทดสอบ ไม่มีบัญชี',
  368 |         requester_name: 'ผู้ขอใช้รถ',
  369 |         destination: 'สำนักงานเขต',
  370 |         purpose: 'official_document',
  371 |         record_source: 'qr_manual',
  372 |       });
  373 |       expect(r.status).toBeLessThan(300);
  374 |       expect(r.data.success).toBe(true);
  375 |     }
  376 |   });
  377 | 
  378 |   test('Logged-in driver (regular) — submit usage via auth API', async () => {
  379 |     if (!driverUser.token) { test.skip(); return; }
  380 |     const v = vehicles[0];
  381 |     const r = await post('/api/usage', {
  382 |       car_id: v.id,
  383 |       record_type: 'departure',
  384 |       datetime: '2026-04-16 09:00',
  385 |       mileage: 10200,
  386 |       driver_id: driverUser.driverId,
  387 |       requester_name: 'ผู้ขอใช้รถ (ล็อกอิน)',
  388 |       destination: 'โรงเรียน',
  389 |       purpose: 'school_passenger',
  390 |       record_source: 'qr_logged_in',
  391 |     }, driverUser.token);
  392 |     expect(r.status).toBeLessThan(300);
  393 |     expect(r.data.success).toBe(true);
  394 |   });
  395 | 
  396 |   test('Logged-in driver (reserve) — submit usage', async () => {
  397 |     if (!reserveDriverUser.token) { test.skip(); return; }
  398 |     const v = vehicles[1];
  399 |     const r = await post('/api/usage', {
  400 |       car_id: v.id,
  401 |       record_type: 'departure',
  402 |       datetime: '2026-04-16 09:30',
  403 |       mileage: 11200,
  404 |       driver_id: reserveDriverUser.driverId,
  405 |       requester_name: 'ผู้ขอใช้ (สำรอง)',
  406 |       destination: 'อำเภอเมือง',
  407 |       purpose: 'official_document',
  408 |       record_source: 'qr_logged_in',
  409 |     }, reserveDriverUser.token);
  410 |     expect(r.status).toBeLessThan(300);
  411 |     expect(r.data.success).toBe(true);
  412 |   });
  413 | 
  414 |   test('Logged-in driver (adhoc) — submit usage', async () => {
  415 |     if (!adhocDriverUser.token) { test.skip(); return; }
  416 |     const v = vehicles[2];
  417 |     const r = await post('/api/usage', {
  418 |       car_id: v.id,
  419 |       record_type: 'departure',
  420 |       datetime: '2026-04-16 10:00',
  421 |       mileage: 12200,
  422 |       driver_id: adhocDriverUser.driverId,
  423 |       requester_name: 'ผู้ขอใช้ (เฉพาะกิจ)',
  424 |       destination: 'จังหวัดเชียงราย',
  425 |       purpose: 'other',
  426 |       record_source: 'qr_logged_in',
  427 |     }, adhocDriverUser.token);
  428 |     expect(r.status).toBeLessThan(300);
  429 |     expect(r.data.success).toBe(true);
  430 |   });
  431 | 
  432 |   test('GET /api/usage/latest-status — verify status after departure', async () => {
  433 |     if (!vehicles.length) { test.skip(); return; }
  434 |     const v = vehicles[0];
  435 |     const r = await get(`/api/usage/latest-status?car_id=${v.id}`);
  436 |     expect(r.status).toBe(200);
  437 |     expect(r.data.success).toBe(true);
  438 |     // Car could be "out" or "in" depending on test order
  439 |     expect(['out', 'in', 'returned', 'active', 'unknown']).toContain(r.data.data?.status || r.data.data);
  440 |   });
  441 | });
  442 | 
  443 | // ══════════════════════════════════════════════════
  444 | // 4. QR FUEL RECORD — All roles × All vehicles
  445 | // ══════════════════════════════════════════════════
  446 | test.describe.serial('4. QR Fuel Record', () => {
  447 | 
  448 |   test('Guest mode — submit fuel for diesel vehicle', async () => {
  449 |     if (!vehicles.length) { test.skip(); return; }
  450 |     const v = vehicles[0]; // diesel
  451 |     const r = await post('/api/fuel/record', {
  452 |       car_id: v.id,
  453 |       driver_name_manual: 'แขกเติมน้ำมัน ทดสอบ',
  454 |       date: '2026-04-16',
  455 |       time: '10:30',
```