# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\reports.spec.mjs >> Reports API >> GET /api/reports/vehicle-timeline/:carId → 200 หรือ 404
- Location: tests\e2e\reports.spec.mjs:256:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 500
Received array: [200, 404]
```

# Test source

```ts
  158 | 
  159 |   // ──────────────────────────────────────────
  160 |   // Basic Reports
  161 |   // ──────────────────────────────────────────
  162 |   test('GET /api/reports/vehicles → 200', async () => {
  163 |     const r = await apiGet('/api/reports/vehicles', ctx.adminToken);
  164 |     expect(r.status).toBe(200);
  165 |     expect(r.data?.data !== undefined).toBe(true);
  166 |   });
  167 | 
  168 |   test('GET /api/reports/drivers → 200', async () => {
  169 |     const r = await apiGet('/api/reports/drivers', ctx.adminToken);
  170 |     expect([200, 404]).toContain(r.status);
  171 |   });
  172 | 
  173 |   test('GET /api/reports/repairs → 200', async () => {
  174 |     const r = await apiGet('/api/reports/repairs', ctx.adminToken);
  175 |     expect([200, 404]).toContain(r.status);
  176 |   });
  177 | 
  178 |   test('GET /api/reports/maintenance → 200', async () => {
  179 |     const r = await apiGet('/api/reports/maintenance', ctx.adminToken);
  180 |     expect([200, 404]).toContain(r.status);
  181 |   });
  182 | 
  183 |   test('GET /api/reports/expiry → 200', async () => {
  184 |     const r = await apiGet('/api/reports/expiry', ctx.adminToken);
  185 |     expect([200, 404]).toContain(r.status);
  186 |   });
  187 | 
  188 |   test('Reports endpoints ทุกตัวต้อง auth', async () => {
  189 |     for (const endpoint of ['/api/reports/vehicles', '/api/reports/drivers', '/api/reports/repairs']) {
  190 |       const r = await apiGet(endpoint);
  191 |       expect([401, 403]).toContain(r.status);
  192 |     }
  193 |   });
  194 | 
  195 |   // ──────────────────────────────────────────
  196 |   // Fuel Report
  197 |   // ──────────────────────────────────────────
  198 |   test('GET /api/reports/fuel → 200', async () => {
  199 |     const r = await apiGet('/api/reports/fuel', ctx.adminToken);
  200 |     expect([200, 404]).toContain(r.status);
  201 |   });
  202 | 
  203 |   test('GET /api/reports/fuel?car_id=:id → filter by car', async () => {
  204 |     const r = await apiGet(`/api/reports/fuel?car_id=${ctx.carId}`, ctx.adminToken);
  205 |     expect([200, 404]).toContain(r.status);
  206 |     if (r.status === 200 && Array.isArray(r.data?.data)) {
  207 |       const wrongCar = r.data.data.filter((f) => f.car_id !== ctx.carId && f.car_id !== Number(ctx.carId));
  208 |       expect(wrongCar.length).toBe(0);
  209 |     }
  210 |   });
  211 | 
  212 |   test('GET /api/reports/fuel?date_from=&date_to= → date range filter', async () => {
  213 |     const r = await apiGet(`/api/reports/fuel?date_from=${YEAR_START}&date_to=${TODAY}`, ctx.adminToken);
  214 |     expect([200, 404]).toContain(r.status);
  215 |   });
  216 | 
  217 |   test('GET /api/reports/fuel?expense_type=cash → filter expense type', async () => {
  218 |     const r = await apiGet('/api/reports/fuel?expense_type=cash', ctx.adminToken);
  219 |     expect([200, 404]).toContain(r.status);
  220 |   });
  221 | 
  222 |   // ──────────────────────────────────────────
  223 |   // Usage Report
  224 |   // ──────────────────────────────────────────
  225 |   test('GET /api/reports/usage → 200', async () => {
  226 |     const r = await apiGet('/api/reports/usage', ctx.adminToken);
  227 |     expect([200, 404]).toContain(r.status);
  228 |   });
  229 | 
  230 |   test('GET /api/reports/usage?car_id=:id → usage by car', async () => {
  231 |     const r = await apiGet(`/api/reports/usage?car_id=${ctx.carId}`, ctx.adminToken);
  232 |     expect([200, 404]).toContain(r.status);
  233 |   });
  234 | 
  235 |   // ──────────────────────────────────────────
  236 |   // Data Quality
  237 |   // ──────────────────────────────────────────
  238 |   test('GET /api/reports/data-quality → 200', async () => {
  239 |     const r = await apiGet('/api/reports/data-quality', ctx.adminToken);
  240 |     expect([200, 404]).toContain(r.status);
  241 |   });
  242 | 
  243 |   test('GET /api/reports/data-quality?date_from=&date_to= → with date range', async () => {
  244 |     const r = await apiGet(`/api/reports/data-quality?date_from=${YEAR_START}&date_to=${TODAY}`, ctx.adminToken);
  245 |     expect([200, 404]).toContain(r.status);
  246 |   });
  247 | 
  248 |   test('data-quality ไม่มี token → 401', async () => {
  249 |     const r = await apiGet('/api/reports/data-quality');
  250 |     expect([401, 403]).toContain(r.status);
  251 |   });
  252 | 
  253 |   // ──────────────────────────────────────────
  254 |   // Vehicle Timeline
  255 |   // ──────────────────────────────────────────
  256 |   test('GET /api/reports/vehicle-timeline/:carId → 200 หรือ 404', async () => {
  257 |     const r = await apiGet(`/api/reports/vehicle-timeline/${ctx.carId}`, ctx.adminToken);
> 258 |     expect([200, 404]).toContain(r.status);
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  259 |     if (r.status === 200) {
  260 |       expect(r.data?.data !== undefined).toBe(true);
  261 |     }
  262 |   });
  263 | 
  264 |   test('GET /api/reports/vehicle-timeline/:carId?type=fuel → filter type', async () => {
  265 |     const r = await apiGet(`/api/reports/vehicle-timeline/${ctx.carId}?type=fuel`, ctx.adminToken);
  266 |     expect([200, 404]).toContain(r.status);
  267 |   });
  268 | 
  269 |   test('GET /api/reports/vehicle-timeline/:carId?date_from=&date_to= → filter dates', async () => {
  270 |     const r = await apiGet(`/api/reports/vehicle-timeline/${ctx.carId}?date_from=${YEAR_START}&date_to=${TODAY}`, ctx.adminToken);
  271 |     expect([200, 404]).toContain(r.status);
  272 |   });
  273 | 
  274 |   test('vehicle-timeline ไม่มี token → 401', async () => {
  275 |     const r = await apiGet(`/api/reports/vehicle-timeline/${ctx.carId}`);
  276 |     expect([401, 403]).toContain(r.status);
  277 |   });
  278 | 
  279 |   test('vehicle-timeline invalid car → 404', async () => {
  280 |     const r = await apiGet('/api/reports/vehicle-timeline/999999', ctx.adminToken);
  281 |     expect([404, 200]).toContain(r.status);
  282 |   });
  283 | 
  284 |   // ──────────────────────────────────────────
  285 |   // Vehicle Cost
  286 |   // ──────────────────────────────────────────
  287 |   test('GET /api/reports/vehicle-cost/:carId → 200 หรือ 404', async () => {
  288 |     const r = await apiGet(`/api/reports/vehicle-cost/${ctx.carId}`, ctx.adminToken);
  289 |     expect([200, 404]).toContain(r.status);
  290 |   });
  291 | 
  292 |   test('GET /api/reports/vehicle-cost/:carId?date_from=&date_to= → with date', async () => {
  293 |     const r = await apiGet(`/api/reports/vehicle-cost/${ctx.carId}?date_from=${YEAR_START}&date_to=${TODAY}`, ctx.adminToken);
  294 |     expect([200, 404]).toContain(r.status);
  295 |   });
  296 | 
  297 |   // ──────────────────────────────────────────
  298 |   // Driver Performance
  299 |   // ──────────────────────────────────────────
  300 |   test('GET /api/reports/driver-performance → 200', async () => {
  301 |     const r = await apiGet('/api/reports/driver-performance', ctx.adminToken);
  302 |     expect([200, 404]).toContain(r.status);
  303 |     if (r.status === 200) {
  304 |       expect(r.data?.data !== undefined).toBe(true);
  305 |     }
  306 |   });
  307 | 
  308 |   test('GET /api/reports/driver-performance/:driverId → 200 หรือ 404', async () => {
  309 |     const r = await apiGet(`/api/reports/driver-performance/${ctx.driverId}`, ctx.adminToken);
  310 |     expect([200, 404]).toContain(r.status);
  311 |   });
  312 | 
  313 |   test('GET /api/reports/driver-scores?month=YYYY-MM → 200', async () => {
  314 |     const r = await apiGet(`/api/reports/driver-scores?month=${MONTH}`, ctx.adminToken);
  315 |     expect([200, 404]).toContain(r.status);
  316 |   });
  317 | 
  318 |   test('driver-performance ไม่มี token → 401', async () => {
  319 |     const r = await apiGet('/api/reports/driver-performance');
  320 |     expect([401, 403]).toContain(r.status);
  321 |   });
  322 | });
  323 | 
```