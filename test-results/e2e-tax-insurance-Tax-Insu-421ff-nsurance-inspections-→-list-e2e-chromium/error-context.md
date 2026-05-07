# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tax-insurance.spec.mjs >> Tax & Insurance API >> GET /api/tax-insurance/inspections → list
- Location: tests\e2e\tax-insurance.spec.mjs:198:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 500
Received array: [200, 404]
```

# Test source

```ts
  100 |       car_id: ctx.carId,
  101 |       amount: 1500,
  102 |       expiry_date: FAR_FUTURE,
  103 |       tax_year: 2025,
  104 |     }, ctx.adminToken);
  105 |     expect([200, 201]).toContain(r.status);
  106 |     ctx.taxId = r.data?.data?.id || r.data?.data?.tax_id;
  107 |     expect(ctx.taxId).toBeTruthy();
  108 |   });
  109 | 
  110 |   test('GET /api/tax-insurance/tax — มี tax record ที่สร้าง', async () => {
  111 |     const r = await apiGet('/api/tax-insurance/tax', ctx.adminToken);
  112 |     const items = r.data?.data || [];
  113 |     const found = items.find((t) => t.id === ctx.taxId || t.id === Number(ctx.taxId));
  114 |     expect(found).toBeTruthy();
  115 |     expect(found.amount).toBe(1500);
  116 |   });
  117 | 
  118 |   test('PUT /api/tax-insurance/tax/:id → แก้ไข amount', async () => {
  119 |     const r = await apiPut(`/api/tax-insurance/tax/${ctx.taxId}`, {
  120 |       car_id: ctx.carId,
  121 |       amount: 2000,
  122 |       expiry_date: FAR_FUTURE,
  123 |       tax_year: 2025,
  124 |     }, ctx.adminToken);
  125 |     expect(r.status).toBe(200);
  126 |   });
  127 | 
  128 |   test('GET /api/tax-insurance/tax/:id → ดู tax record', async () => {
  129 |     const r = await apiGet(`/api/tax-insurance/tax/${ctx.taxId}`, ctx.adminToken);
  130 |     expect([200, 404]).toContain(r.status);
  131 |     if (r.status === 200) {
  132 |       expect(r.data?.data?.id === ctx.taxId || r.data?.data?.id === Number(ctx.taxId)).toBe(true);
  133 |     }
  134 |   });
  135 | 
  136 |   test('POST /api/tax-insurance/tax ไม่มี car_id → 400', async () => {
  137 |     const r = await apiPost('/api/tax-insurance/tax', {
  138 |       amount: 1000,
  139 |       expiry_date: FAR_FUTURE,
  140 |     }, ctx.adminToken);
  141 |     expect([400, 422]).toContain(r.status);
  142 |   });
  143 | 
  144 |   // ──────────────────────────────────────────
  145 |   // Insurance (ประกันภัย) CRUD
  146 |   // ──────────────────────────────────────────
  147 |   test('GET /api/tax-insurance/insurance → list', async () => {
  148 |     const r = await apiGet('/api/tax-insurance/insurance', ctx.adminToken);
  149 |     expect(r.status).toBe(200);
  150 |     expect(Array.isArray(r.data?.data)).toBe(true);
  151 |   });
  152 | 
  153 |   test('POST /api/tax-insurance/insurance → สร้าง insurance record', async () => {
  154 |     const r = await apiPost('/api/tax-insurance/insurance', {
  155 |       car_id: ctx.carId,
  156 |       insurance_type: 'voluntary',
  157 |       insurance_company: 'บริษัทประกันทดสอบ',
  158 |       amount: 15000,
  159 |       start_date: '2025-01-01',
  160 |       expiry_date: FAR_FUTURE,
  161 |     }, ctx.adminToken);
  162 |     expect([200, 201]).toContain(r.status);
  163 |     ctx.insuranceId = r.data?.data?.id || r.data?.data?.insurance_id;
  164 |     expect(ctx.insuranceId).toBeTruthy();
  165 |   });
  166 | 
  167 |   test('GET /api/tax-insurance/insurance — มี record ที่สร้าง', async () => {
  168 |     const r = await apiGet('/api/tax-insurance/insurance', ctx.adminToken);
  169 |     const items = r.data?.data || [];
  170 |     const found = items.find((i) => i.id === ctx.insuranceId || i.id === Number(ctx.insuranceId));
  171 |     expect(found).toBeTruthy();
  172 |     expect(found.insurance_company).toBe('บริษัทประกันทดสอบ');
  173 |   });
  174 | 
  175 |   test('PUT /api/tax-insurance/insurance/:id → แก้ไข', async () => {
  176 |     const r = await apiPut(`/api/tax-insurance/insurance/${ctx.insuranceId}`, {
  177 |       car_id: ctx.carId,
  178 |       insurance_type: 'voluntary',
  179 |       company: 'บริษัทประกันแก้ไข',
  180 |       amount: 18000,
  181 |       start_date: '2025-01-01',
  182 |       expiry_date: FAR_FUTURE,
  183 |     }, ctx.adminToken);
  184 |     expect(r.status).toBe(200);
  185 |   });
  186 | 
  187 |   test('POST /api/tax-insurance/insurance ไม่มี car_id → 400', async () => {
  188 |     const r = await apiPost('/api/tax-insurance/insurance', {
  189 |       amount: 10000,
  190 |       expiry_date: FAR_FUTURE,
  191 |     }, ctx.adminToken);
  192 |     expect([400, 422]).toContain(r.status);
  193 |   });
  194 | 
  195 |   // ──────────────────────────────────────────
  196 |   // ตรวจสภาพรถ (Inspections)
  197 |   // ──────────────────────────────────────────
  198 |   test('GET /api/tax-insurance/inspections → list', async () => {
  199 |     const r = await apiGet('/api/tax-insurance/inspections', ctx.adminToken);
> 200 |     expect([200, 404]).toContain(r.status);
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  201 |     if (r.status === 200) {
  202 |       expect(Array.isArray(r.data?.data)).toBe(true);
  203 |     }
  204 |   });
  205 | 
  206 |   test('POST /api/tax-insurance/inspections → สร้าง inspection', async () => {
  207 |     const r = await apiPost('/api/tax-insurance/inspections', {
  208 |       car_id: ctx.carId,
  209 |       center: 'ตรอ.ทดสอบ',
  210 |       cost: 500,
  211 |       expiry_date: FAR_FUTURE,
  212 |     }, ctx.adminToken);
  213 |     expect([200, 201, 404]).toContain(r.status);
  214 |     if ([200, 201].includes(r.status)) {
  215 |       ctx.inspectionId = r.data?.data?.id || r.data?.data?.inspection_id;
  216 |     }
  217 |   });
  218 | 
  219 |   test('GET /api/tax-insurance/inspections (by car_id) → filter', async () => {
  220 |     const r = await apiGet(`/api/tax-insurance/inspections?car_id=${ctx.carId}`, ctx.adminToken);
  221 |     expect([200, 404]).toContain(r.status);
  222 |   });
  223 | 
  224 |   test('PUT /api/tax-insurance/inspections/:id → update ถ้า created', async () => {
  225 |     if (!ctx.inspectionId) return;
  226 |     const r = await apiPut(`/api/tax-insurance/inspections/${ctx.inspectionId}`, {
  227 |       car_id: ctx.carId,
  228 |       center: 'ตรอ.แก้ไข',
  229 |       cost: 600,
  230 |       expiry_date: FAR_FUTURE,
  231 |     }, ctx.adminToken);
  232 |     expect(r.status).toBe(200);
  233 |   });
  234 | 
  235 |   test('DELETE /api/tax-insurance/inspections/:id → ลบ', async () => {
  236 |     if (!ctx.inspectionId) return;
  237 |     const r = await apiDelete(`/api/tax-insurance/inspections/${ctx.inspectionId}`, ctx.adminToken);
  238 |     expect([200, 204]).toContain(r.status);
  239 |   });
  240 | 
  241 |   // ──────────────────────────────────────────
  242 |   // Expiry Filter — แจ้งเตือนหมดอายุ
  243 |   // ──────────────────────────────────────────
  244 |   test('GET /api/tax-insurance/expiring?days=30 → ไม่ crash', async () => {
  245 |     const r = await apiGet('/api/tax-insurance/expiring?days=30', ctx.adminToken);
  246 |     expect([200, 404]).toContain(r.status);
  247 |     if (r.status === 200) {
  248 |       expect(r.data).toBeTruthy();
  249 |     }
  250 |   });
  251 | 
  252 |   test('POST tax record หมดอายุใน 15 วัน → notification ควรสร้าง', async () => {
  253 |     const r = await apiPost('/api/tax-insurance/tax', {
  254 |       car_id: ctx.carId,
  255 |       amount: 500,
  256 |       expiry_date: NEAR_FUTURE,
  257 |       tax_year: 2025,
  258 |     }, ctx.adminToken);
  259 |     expect([200, 201]).toContain(r.status);
  260 |     // หลัง create ตรวจ expiring
  261 |     const expiringR = await apiGet('/api/tax-insurance/expiring?days=30', ctx.adminToken);
  262 |     expect([200, 404]).toContain(expiringR.status);
  263 |   });
  264 | 
  265 |   // ──────────────────────────────────────────
  266 |   // Auth & Permissions
  267 |   // ──────────────────────────────────────────
  268 |   test('GET /api/tax-insurance/tax ไม่มี token → 401', async () => {
  269 |     const r = await apiGet('/api/tax-insurance/tax');
  270 |     expect([401, 403]).toContain(r.status);
  271 |   });
  272 | 
  273 |   test('POST /api/tax-insurance/insurance ไม่มี token → 401', async () => {
  274 |     const r = await apiPost('/api/tax-insurance/insurance', { car_id: ctx.carId });
  275 |     expect([401, 403]).toContain(r.status);
  276 |   });
  277 | 
  278 |   // ──────────────────────────────────────────
  279 |   // Cleanup
  280 |   // ──────────────────────────────────────────
  281 |   test('DELETE /api/tax-insurance/tax/:id → ลบได้', async () => {
  282 |     const r = await apiDelete(`/api/tax-insurance/tax/${ctx.taxId}`, ctx.adminToken);
  283 |     expect([200, 204]).toContain(r.status);
  284 |   });
  285 | 
  286 |   test('DELETE /api/tax-insurance/insurance/:id → ลบได้', async () => {
  287 |     const r = await apiDelete(`/api/tax-insurance/insurance/${ctx.insuranceId}`, ctx.adminToken);
  288 |     expect([200, 204]).toContain(r.status);
  289 |   });
  290 | });
  291 | 
```