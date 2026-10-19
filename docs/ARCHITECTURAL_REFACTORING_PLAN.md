# PPK DriveHub — Architectural Refactoring & Modernization Plan
**Classification:** Engineering Architecture Blueprint & Migration Governance  
**Author:** Principal Staff Engineer & Chief Architect  
**Target Platform:** Cloudflare Pages Functions, Cloudflare D1 (SQLite), Cloudflare R2, Modern Frontend  
**Status:** Approved for Phased Execution (Strict Zero-Big-Bang Policy)  
**Last Updated:** 2026-10-19

---

## 1. Executive Summary & Core Tenets

PPK DriveHub เป็นระบบบริหารจัดการยานพาหนะ คิวรถ การใช้น้ำมัน และการซ่อมบำรุงของโรงเรียนพะเยาพิทยาคม ซึ่งมีการใช้งานจริงทุกวันโดยคณะครู บุคลากร แอดมิน และพนักงานขับรถ การปรับปรุงสถาปัตยกรรมระบบ (Refactoring / Modernization) ครั้งนี้มีเป้าหมายเพื่อยกระดับความปลอดภัย ประสิทธิภาพ และความง่ายในการดูแลรักษาในระยะยาว (5–10 ปี) 

### กฎเหล็ก 3 ประการ (The 3 Non-Negotiable Tenets):
1. **Never "Big Bang Rewrite" (ห้ามรื้อทำใหม่รวดเดียว):** บังคับใช้ **Strangler Fig Pattern** เท่านั้น ทุกการเปลี่ยนแปลงต้องทยอยปล่อยทีละส่วนและรันควบคู่กับระบบเดิมได้แบบไร้รอยต่อ
2. **Zero Downtime & Zero Data Loss:** การออกรถ การเบิกน้ำมัน และงานประจำวันของโรงเรียนต้องดำเนินต่อไปได้ 100% ห้ามมี Maintenance Window และข้อมูลทุกตารางต้องได้รับการคุ้มครองด้วย Zero-Data-Loss Migration
3. **Instant Rollback Capability (< 30s MTTR):** ทุกฟีเจอร์และสถาปัตยกรรมใหม่ต้องมี Kill Switch หรือ Feature Flag ที่สามารถสับสวิตช์ย้อนกลับไประบบเดิมได้ภายใน 30 วินาที โดยไม่ต้อง Re-deploy

---

## 2. Current Architecture & Tech Debt Matrix

| ส่วนประกอบ (Component) | สภาพปัจจุบัน (Current State) | หนี้ทางเทคนิค / ความเสี่ยง (Technical Debt / Risk) | สถาปัตยกรรมเป้าหมาย (Target Architecture) |
| :--- | :--- | :--- | :--- |
| **Frontend** | 61 ไฟล์ Vanilla HTML + Vanilla JS (`frontend/*.html`) รวมขนาดกว่า 2.2MB | โค้ดซ้ำซ้อนสูง, ไม่มี Component Reusability, DOM Scripting เสี่ยง XSS, ไฟล์ใหญ่เกินไป (`reports.html` 188KB, `queue-manage.html` 156KB) | **Modular Micro-Frontends / Modern ESM** ทยอยแปลงเป็นโมดูลาร์ ใช้ Component Design System เดียวกัน |
| **Backend Layer** | Cloudflare Pages Functions (`functions/api/*` 24 โดเมน) | `_helpers.js` มีขนาดใหญ่เกินไป (God Module 578 บรรทัด), ขาด Domain Service Abstraction, ขาด Schema Validation กลาง | **Domain-Driven Modular Services** แยก Helper เป็น Sub-modules พร้อม Zod/JSON Contract Validation |
| **Database** | Cloudflare D1 (SQLite 27 ตาราง) | เสี่ยงชนขีดจำกัด D1 Free Tier (Rows Read/Day), SQLite ไม่รองรับ Non-trivial DDL rollback ในคำสั่งเดียว | **Optimized D1 Schema + Indexed Queries** พร้อม Caching Layer (KV/Cache API) และ Expand/Contract Lifecycle |
| **File Storage** | Cloudflare R2 (`STORAGE` binding) + Base64 Upload fallback | โค้ดยังมี Fallback บางจุดที่จัดการ Buffer แบบ Sync, Token ใน URL query parameter | **R2 Direct Presigned URL / Chunked Stream** พร้อม CDN Caching |
| **Testing & QA** | Playwright Integration (API + E2E) ครอบคลุมระดับหนึ่ง | ขาด Contract Testing (API contract drift), ขาด Shadow Testing สำหรับขั้นตอนจัดคิวรถ | **Automated Contract Gates + Dual-Run Shadow Mode** |

---

## 3. Migration Strategy: Strangler Fig Pattern

เราจะไม่สร้าง Repository ใหม่ และจะไม่สร้างโฟลเดอร์แยกเพื่อรอสลับในวันเดียว แต่จะใช้ **Cloudflare Pages Routing (`functions/_middleware.js`)** ทำหน้าที่เป็น Reverse Proxy Interceptor คัดแยกทราฟฟิก

```
                                [ Incoming User Request ]
                                           │
                                           ▼
                     ┌───────────────────────────────────────────┐
                     │ Cloudflare Edge Router (_middleware.js)   │
                     └─────────────────────┬─────────────────────┘
                                           │
                  ┌────────────────────────┴────────────────────────┐
                  ▼                                                 ▼
        [ Path starts with /api/v2/ ]                    [ Path is Legacy Route ]
                  │                                                 │
                  ▼                                                 ▼
     ┌────────────────────────┐                        ┌────────────────────────┐
     │ Modern Modular Domain  │                        │ Legacy API / HTML Pages│
     │ Controller (ESM + Zod) │                        │ (Existing Functions)   │
     └───────────┬────────────┘                        └───────────┬────────────┘
                 │                                                 │
                 └─────────────────────────┬───────────────────────┘
                                           ▼
                         ┌───────────────────────────────────┐
                         │ Cloudflare D1 Database (Single SSOT)
                         └───────────────────────────────────┘
```

### 3.1 แผนการย้ายระบบ 4 ระลอก (The 4 Migration Waves)

การแบ่ง Wave คำนวณจาก **Blast Radius (รัศมีความเสียหาย)** และ **Business Criticality**:

```
Wave 1: Low Risk (Standalone)      Wave 2: Operational Data           Wave 3: Mission Critical           Wave 4: Reporting & Ledger
- evaluate-trip.html               - fuel-record.html                 - vehicle-request.html             - reports.html
- about.html, glossary.html        - qr-scan.html, qr-hub.html        - queue-manage.html                - fuel-ledger.html
- profile.html, change-pwd.html    - repair.html, repair-history.html - dashboard.html                   - audit-log.html
- user-guide.html                  - maintenance-alerts.html          - drivers.html, vehicles.html      - tax-insurance.html
```

* **Wave 1: Low Risk (Standalone)**
  * ขอบเขต: หน้าแบบประเมิน, หน้าเอกสารทั่วไป, โปรไฟล์ผู้ใช้
  * ผลกระทบต่อธุรกิจ: ต่ำมาก (หากพังไม่กระทบการจัดรถหรือความปลอดภัย)
  * วัตถุประสงค์: เพื่อทดสอบ Build Pipeline, Design System ใหม่ และ Edge Routing
* **Wave 2: Operational Data**
  * ขอบเขต: การบันทึกน้ำมัน, การสแกน QR, การแจ้งซ่อม
  * ผลกระทบต่อธุรกิจ: ปานกลาง (ข้อมูลการทำงานของคนขับรถ)
  * วัตถุประสงค์: ยืนยันการทำงานของ Offline Sync, Service Worker Invalidation, และ R2 File Uploads
* **Wave 3: Mission Critical**
  * ขอบเขต: การขอใช้รถยนต์, ระบบจัดคิวรถ (Queue Dispatch), แดชบอร์ดหลัก
  * ผลกระทบต่อธุรกิจ: สูงที่สุด (หัวใจหลักของโรงเรียน)
  * วัตถุประสงค์: ใช้งานร่วมกับ Shadow Testing (รันคู่ขนาน 14 วัน ก่อนตัดระบบเก่า)
* **Wave 4: Reporting & Ledger**
  * ขอบเขต: ทะเบียนคุมน้ำมัน, รายงานผู้บริหาร, แบบฟอร์มพิมพ์ราชการ
  * ผลกระทบต่อธุรกิจ: ปานกลาง-สูง (ด้านการตรวจสอบบัญชีและเอกสาร)
  * วัตถุประสงค์: ตรวจสอบความถูกต้องของตัวเลขและการพิมพ์ (Print Layout Parity)

---

## 4. Zero-Downtime Database Evolution: Expand & Contract

ห้ามรันคำสั่ง `ALTER TABLE ... DROP COLUMN` หรือ `RENAME COLUMN` ใน SQLite D1 โดยตรงเป็นอันขาด เพราะหากเกิดปัญหา โค้ดเก่าจะไม่สามารถทำงานต่อได้ การปรับเปลี่ยนโครงสร้างตารางทุกครั้งต้องดำเนินตาม **5-Phase Lifecycle**:

```
   Phase 1 (Expand)       Phase 2 (Dual-Write)      Phase 3 (Backfill)      Phase 4 (Read Switch)    Phase 5 (Contract)
┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│ Add new column     │──▶│ Write to both old  │──▶│ Batch job copies   │──▶│ Read exclusively   │──▶│ Drop old column    │
│ (Nullable/Default) │   │ and new columns    │   │ historic rows      │   │ from new column    │   │ after 30 days bake │
└────────────────────┘   └────────────────────┘   └────────────────────┘   └────────────────────┘   └────────────────────┘
```

### 4.1 รายละเอียดการทำงานของแต่ละ Phase:
1. **Phase 1 (Expand):** เพิ่มคอลัมน์ใหม่ที่อนุญาตให้เป็น `NULL` หรือมี `DEFAULT` ที่ปลอดภัย (ห้ามมี NOT NULL เด็ดขาดในขั้นแรก)
2. **Phase 2 (Dual-Write):** อัปเดต Backend Controller ให้บันทึกข้อมูลลงทั้งฟิลด์เดิมและฟิลด์ใหม่พร้อมกัน แต่ระบบยังอ่านจากฟิลด์เดิมเป็นหลัก
3. **Phase 3 (Backfill Cron):** รัน Scheduled Worker ในช่วงเวลาที่มีการใช้งานต่ำ (02:00 - 04:00 น.) ทยอย Update ข้อมูลเก่าย้อนหลัง ครั้งละไม่เกิน **100 แถว** (Batch Chunking) เพื่อไม่ให้ติดล็อกของ SQLite และไม่กระทบ D1 Rows Read Quota
4. **Phase 4 (Read Switch):** สลับโค้ดให้อ่านจากฟิลด์ใหม่ (ควบคุมผ่าน Feature Flag) หากพบปัญหา สามารถสลับกลับมาอ่านฟิลด์เดิมได้ทันที
5. **Phase 5 (Contract):** เมื่อระบบรันผ่านไปอย่างน้อย 30 วันโดยไม่มีข้อผิดพลาด จึงสร้างตารางใหม่เพื่อคัดลอกข้อมูลและลบฟิลด์เก่าทิ้งในรอบ Maintenance ถัดไป

### 4.2 SQLite D1 Foreign Key Enforcement
* ใน Cloudflare D1 คำสั่ง `PRAGMA foreign_keys = ON;` ต้องถูกเรียกใช้ในการเชื่อมต่อที่มีการทำ Data Integrity Check
* ก่อนรัน Migration ทุกครั้ง ต้องมีคำสั่งสำรองข้อมูล Snapshot เก็บไว้ใน Cloudflare R2 เสมอ

---

## 5. Rollback Runbook & Feature Flag Architecture

ระบบต้องไม่พึ่งพาการ Revert Git และ Deploy ทับเมื่อเกิดเหตุฉุกเฉิน เพราะกระบวนการ Deploy อาจใช้เวลา 2-5 นาที ซึ่งช้าเกินไปในชั่วโมงเร่งด่วน

### 5.1 Dynamic Feature Flags via Edge Configuration
จัดเก็บการตั้งค่าสถานะสถาปัตยกรรมใน D1 ตาราง `system_settings` หรือผ่าน Environment Variables:

```json
{
  "FEATURE_MODERN_QUEUE_ENGINE": false,
  "FEATURE_MODERN_AUTH_V2": true,
  "FEATURE_VITE_FRONTEND_WAVE1": true,
  "CANARY_PERCENTAGE_QUEUE_V2": 0
}
```

### 5.2 การสลับวงจรฉุกเฉิน (Circuit Breaker Emergency Rollback)
หากหน้าเว็บหรือ API ใหม่เกิด Error Rate พุ่งสูงเกิน 0.5% ภายใน 5 นาที:
1. **Automated Rollback:** ระบบ Edge Monitoring หรือ Cloudflare Health Check สลับ Feature Flag เป็น `false` อัตโนมัติ
2. **Instant Route Reversion:** `_middleware.js` จะส่งทราฟฟิกทั้งหมดกลับไปยัง Legacy Endpoint ทันทีในระดับ Edge Sub-millisecond
3. **User Notification:** ระบบไม่ขึ้นจอขาวหรือหน้า 500 แต่จะแสดง Toast แจ้งเตือนสั้นๆ และโหลดหน้าสำรองที่ใช้งานได้

---

## 6. Testing, Verification & Shadow Mode (QA Strategy)

เพื่อให้มั่นใจ 100% ว่า "โค้ดใหม่ทำงานได้ถูกต้องเทียบเท่าโค้ดเดิม":

### 6.1 Shadow Traffic Execution (สำหรับ Logic ที่ซับซ้อน)
สำหรับฟังก์ชันการคำนวณที่สำคัญ เช่น `suggestVehiclesAndDrivers()` และ `checkFatigueRules()`:

```javascript
// ตัวอย่างสถาปัตยกรรม Shadowing ใน Worker
export async function handleQueueSuggest(request, env) {
  // 1. เรียกใช้งาน Legacy Engine (Primary Response)
  const legacyResult = await runLegacyQueueSuggest(request, env);
  
  // 2. เรียกใช้งาน Modern Engine ในพื้นหลัง (Shadow Execution - ไม่บล็อก User)
  env.ctx.waitUntil((async () => {
    try {
      const modernResult = await runModernQueueSuggest(request, env);
      const diff = compareSuggestResults(legacyResult, modernResult);
      if (diff.hasDiscrepancy) {
        await logShadowDiff(env.DB, 'queue_suggest', diff);
      }
    } catch (err) {
      await logShadowError(env.DB, 'queue_suggest', err);
    }
  })());

  // 3. คืนค่าผลลัพธ์จาก Legacy ให้ผู้ใช้ก่อนเสมอ จนกว่า Parity จะแตะ 100% ติดต่อกัน 14 วัน
  return json(legacyResult);
}
```

### 6.2 Verification CI/CD Gates
ก่อนที่โค้ดจะถูก Merge เข้าสู่ `main` ต้องผ่าน Automated Pipeline ดังนี้:
1. **ESLint & Static Analysis:** ตรวจจับ Syntax, Unused Imports, และ Strict Mode
2. **API Contract Integration:** รัน `npm run test:api` (ครอบคลุม Auth, Permissions, CRUD, D1 limits)
3. **E2E Golden Suite:** รัน `npm run test:e2e` ผ่าน Chromium Headless 20 ไฟล์สเปก
4. **Visual Regression Gate:** ใช้ Playwright Screenshot Comparison ตรวจสอบแบบฟอร์มใบขอใช้รถและรายงานการพิมพ์ว่าไม่มีการเหลื่อมล้ำของบรรทัดภาษาไทย

---

## 7. Performance & Caching Governance

### 7.1 D1 Quota Safeguards
* **Composite Indexes:** ทุกตารางที่มีการค้นหาด้วยวันที่และสถานะ ต้องมี Index รองรับ (เช่น `CREATE INDEX idx_vehicle_req_status_date ON vehicle_requests(status, start_date)`)
* **Pagination & Row Limits:** ห้ามเขียน `SELECT *` โดยไม่มี `LIMIT` ในทุก API Endpoint กำหนดค่าเริ่มต้นสูงสุดไม่เกิน 100 รายการต่อหน้า
* **Query Deduplication:** ใช้ Cloudflare Cache API แคชผลลัพธ์ของข้อมูลที่ไม่ค่อยเปลี่ยนแปลง (เช่น รายการรถยนต์ที่พร้อมใช้งาน, รายชื่อคนขับ) ไว้ที่ Edge เป็นเวลา 60–300 วินาที พร้อมส่ง Header `stale-while-revalidate`

### 7.2 Client-Side Cache & Service Worker Sync
* มีกลยุทธ์ **Cache Busting** ที่แน่นอนสำหรับ Static Assets ด้วย Content Hashing (`asset.[hash].js`)
* ใน `sw.js` มีฟังก์ชัน `skipWaiting()` และการแจ้งเตือนผู้ใช้กดปุ่ม "อัปเดตระบบ" เมื่อมี Service Worker เวอร์ชันใหม่ เพื่อป้องกันปัญหา Browser แคชโค้ดเก่าตีกับ API ใหม่

---

## 8. Business Continuity & Timeline

### 8.1 No Feature Freeze Protocol
* **การพัฒนาฟีเจอร์ประจำวัน:** สามารถทำต่อได้ตามปกติในระหว่างการ Refactor โดยฟีเจอร์ที่ต้องเพิ่มใหม่จะต้องพัฒนาตามมาตรฐาน Target Architecture (เขียนเป็น Modular ESM Service)
* **การซิงค์โค้ด:** ทำ Continuous Integration เข้าสู่ Branch `dev` และ `main` สัปดาห์ละหลายครั้ง ป้องกันการเกิด Diverged Branch ยาวนาน

### 8.2 Execution Milestones

```
สัปดาห์ที่ 1 - 2: Foundation & Edge Routing Setup
├─ สร้าง Contract Validation (Zod Schemas)
├─ ตั้งค่า Dynamic Feature Flags ใน functions/_middleware.js
└─ รัน Wave 1 (evaluate-trip, about, profile)

สัปดาห์ที่ 3 - 5: Data Operations & Shadow Testing
├─ นำระบบ Shadowing มาใช้กับ Queue & Fuel calculation
├─ รัน Wave 2 (fuel-record, qr-scan, repair)
└─ Backfill ข้อมูลและตรวจสอบ D1 Rows Read Performance

สัปดาห์ที่ 6 - 8: Mission Critical & Modernization
├─ สลับทราฟฟิก Wave 3 (vehicle-request, queue-manage, dashboard)
├─ ตรวจสอบ Parity และปิด Shadow Mode
└─ รัน Wave 4 (reports, fuel-ledger, audit-log)

สัปดาห์ที่ 9: Contract & Cleanup
├─ ลบฟิลด์และโค้ด Legacy ที่ไม่ได้ใช้งาน
└─ ปิดรอบ Refactor อย่างเป็นทางการแบบ Zero Downtime
```

---

## 9. Definition of Done (DoD) สำหรับแต่ละ Wave

แต่ละหน้าหรือโมดูลจะถือว่า Refactor เสร็จสมบูรณ์ได้ ก็ต่อเมื่อ:
- [ ] มี Unit / Contract Test คลุม Endpoint ที่เกี่ยวข้อง 100%
- [ ] ผ่านการรัน E2E Test เดิมโดยไม่มีข้อผิดพลาด (Zero Regressions)
- [ ] มี Feature Flag สำหรับเปิด-ปิด หรือสลับกลับไปเวอร์ชันเดิมได้ทันที
- [ ] ผ่านการตรวจสอบความเข้ากันได้ของการแสดงผลภาษาไทย (Thai Typography & Print Forms)
- [ ] ไม่เพิ่ม D1 Read Quota เกินกว่าเกณฑ์ที่กำหนด (วัดผลผ่าน Cloudflare Analytics)
- [ ] มีการบันทึก Audit Log ลงในระบบทุกการเปลี่ยนแปลงตามมาตรฐานราชการและ PDPA
