# เมนูตั้งค่าแอดมิน – ที่มาค่าและวิธีประมวลผลแจ้งเตือน

## ค่าตั้งค่ามาจากไหน

1. **แอดมินกรอกในหน้า "ตั้งค่าระบบ" (admin-settings.html)**  
   - การเวียนคิว (จำนวนครั้งสูงสุดต่อสัปดาห์)  
   - การพักทุกระยะ (ระยะทาง กม. / เปิดใช้การพัก)  
   - การแจ้งเตือนซ่อมบำรุง (แจ้งล่วงหน้ากี่วัน/กม. / ล็อครถเมื่อแจ้งฉุกเฉิน)  
   - รายการที่ต้องแจ้งเตือน (น้ำมันเครื่อง, น้ำมันเกียร์, … ระยะทาง กม. และ ระยะเวลา เดือน)  
   - การแจ้งเตือนภาษีและประกัน (แจ้งล่วงหน้ากี่เดือน)

2. **กด "บันทึกการตั้งค่า"**  
   - Frontend ส่งค่าทั้งหมดไปที่ Backend ผ่าน API `updateSystemSetting`  
   - แต่ละค่า (key) ถูกบันทึกลงชีต **MASTER** (key, value, description, updated_at, updated_by)  
   - ตัวอย่าง key: `max_car_usage_per_week`, `pm_advance_days`, `maintenance_engine_oil_km`, `maintenance_engine_oil_months`, `tax_alert_months` ฯลฯ

3. **เมื่อโหลดหน้า "ตั้งค่าระบบ" อีกครั้ง**  
   - เรียก API `getAdminSettings` (และถ้าต้องการ `getSystemSettings`)  
   - Backend อ่านจาก MASTER แล้วส่งกลับเป็น `settings.queue`, `settings.repair`, `settings.system`  
   - Frontend เติมฟอร์มด้วยค่าที่ได้ (รวมถึงรายการแจ้งเตือนซ่อมบำรุงจาก `system.data.settings`)

---

## Backend เอาไปใช้ประมวลผลแจ้งเตือนอย่างไร

| กลุ่มตั้งค่า | เก็บใน MASTER (key) | ใช้ที่ Backend |
|-------------|----------------------|----------------|
| การเวียนคิว | `max_car_usage_per_week`, `max_driver_long_jobs_per_week`, `fatigue_distance_threshold`, `recovery_day_enabled` | `AdminSettingsService.getQueueSettings()` → ใช้จัดคิว / กฎการพักรถ |
| การพักทุกระยะ | ข้างต้น | `DriverFatigueService` ฯลฯ |
| แจ้งเตือนซ่อมล่วงหน้า | `pm_advance_days`, `pm_advance_km`, `emergency_auto_lock` | `AdminSettingsService.getRepairSettings()` → ใช้ตัดสินว่าแจ้งเตือนเมื่อใกล้ครบกี่วัน/กม. และล็อครถเมื่อแจ้งฉุกเฉิน |
| รายการที่ต้องแจ้งเตือน | `maintenance_engine_oil_km`, `maintenance_engine_oil_months`, … (ทุกรายการ) | `AdminSettingsService.getMaintenanceThresholds()` → คืนค่า km / เดือน ต่อรายการ เพื่อเทียบกับเลขไมล์รถและเวลาที่ผ่าน แล้วสร้างแจ้งเตือนซ่อมบำรุง |
| ภาษี/ประกัน | `tax_alert_months`, `insurance_alert_months` | อ่านจาก `getSystemSettings()` → ใช้แจ้งเตือนภาษี/ประกันล่วงหน้ากี่เดือน |

---

## รายการแจ้งเตือนซ่อมบำรุง (ระยะทาง / ระยะเวลา)

- **การบันทึก:** แต่ละรายการ (เช่น น้ำมันเครื่อง) ถูกบันทึกเป็น 2 key ใน MASTER:  
  `maintenance_<key>_km` และ `maintenance_<key>_months`  
  ตัวอย่าง: `maintenance_engine_oil_km` = 5000, `maintenance_engine_oil_months` = 6  

- **การโหลด:** หน้าแอดมินโหลดจาก `getAdminSettings` / `getSystemSettings` แล้วเติมช่อง "ระยะทาง (กม.)" และ "ระยะเวลา (เดือน)" ของแต่ละรายการ  

- **การประมวลผลแจ้งเตือน:**  
  - Backend เรียก `getMaintenanceThresholds()` ใน `AdminSettingsService.gs` เพื่อดึงค่าที่แอดมินตั้งจาก MASTER (ถ้าไม่มีใช้ค่า default)  
  - Logic แจ้งเตือน (ใน MaintenanceScheduleService หรือ job ที่สร้างการแจ้งเตือน) จะเทียบ:  
    - **เลขไมล์รถ** กับ `maintenance_<รายการ>_km`  
    - **เวลาที่ผ่านตั้งแต่เปลี่ยน/ตรวจครั้งล่าสุด** กับ `maintenance_<รายการ>_months`  
  - เมื่อใกล้ครบหรือเกินเกณฑ์ (และอยู่ภายใน “แจ้งล่วงหน้า” ตาม `pm_advance_days` / `pm_advance_km`) ระบบจะสร้าง/แสดงแจ้งเตือน

---

## สรุป

- **ที่มาค่า:** แอดมินกรอกในเมนู "ตั้งค่าระบบ" → บันทึกลงชีต MASTER ผ่าน `updateSystemSetting`  
- **การประมวลผลแจ้งเตือน:** Backend อ่านจาก MASTER ผ่าน `getAdminSettings` / `getSystemSettings` / `getRepairSettings` / `getMaintenanceThresholds()` แล้วใช้ค่าที่ได้เทียบกับข้อมูลรถ (ไมล์, วันที่) เพื่อตัดสินใจสร้างแจ้งเตือน
