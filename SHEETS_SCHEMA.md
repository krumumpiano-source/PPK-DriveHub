# PPK DriveHub - System Data Structure & Schema
เอกสารนี้ระบุรายละเอียดของ Folder และ Google Sheets ที่ต้องสร้างสำหรับระบบ PPK DriveHub (อัปเดตล่าสุด)

---

## 📂 1. Google Drive Structure
กรุณาสร้าง Folder ตามโครงสร้างนี้:

**ROOT Folder:** `PPK-DriveHub-Uploads` (หรือชื่ออื่นตามต้องการ)
*ภายใน ROOT Folder ให้สร้าง Sub-folders ดังนี้:*

1.  `FUEL` - เก็บรูปสลิปน้ำมัน
2.  `REPAIR` - เก็บเอกสารการซ่อม
3.  `CHECK` - เก็บรูปการตรวจเช็คสภาพรถ
4.  `ACCIDENTS` - เก็บรูปอุบัติเหตุ
5.  `TAX` - เก็บไฟล์ภาษีรถยนต์
6.  `INSURANCE` - เก็บไฟล์ประกันภัย
7.  `DOCUMENTS` - เก็บเอกสารทั่วไป
8.  `VEHICLES` - เก็บรูปรถ/เล่มทะเบียน
9.  `DRIVERS` - เก็บรูปโปรไฟล์/ใบขับขี่คนขับ

*(เมื่อสร้างเสร็จแล้ว ให้นำ ID ของแต่ละ Folder ไปใส่ใน `Config.gs`)*

---

## 📊 2. Google Sheets Schema
ระบบต้องการ **1 ไฟล์ Google Sheets** ประกอบด้วยแผ่นงาน (Sheets) ดังต่อไปนี้:
*(ชื่อแผ่นงานต้องตรงตามภาษาอังกฤษตัวพิมพ์ใหญ่เป๊ะๆ)*

### 1. USERS
เก็บข้อมูลผู้ใช้ที่ได้รับอนุมัติ
- **Columns (A-P):**
    0. `user_id`
    1. `password_hash`
    2. `title`
    3. `full_name`
    4. `department`
    5. `phone`
    6. `email`
    7. `role`
    8. `active`
    9. `first_login`
    10. `created_at`
    11. `created_by`
    12. `updated_at`
    13. `notes`
    14. `permissions`
    15. `password_changed_at`

### 2. USER_REQUESTS
เก็บคำขอสมัครสมาชิก
- **Columns (A-N):**
    0. `request_id`
    1. `title`
    2. `full_name`
    3. `department`
    4. `phone`
    5. `email`
    6. `reason`
    7. `status`
    8. `requested_at`
    9. `reviewed_at`
    10. `reviewed_by`
    11. `assigned_role`
    12. `initial_password`
    13. `notes`

### 3. QUEUE
เก็บข้อมูลคิวรถ
- **Columns (A-Y):**
    0. `queue_id`
    1. `date`
    2. `time_start`
    3. `time_end`
    4. `car_id`
    5. `driver_id`
    6. `mission`
    7. `status`
    8. `created_at`
    9. `created_by`
    10. `started_at`
    11. `ended_at`
    12. `mileage_start`
    13. `mileage_end`
    14. `notes`
    15. `qr_scan_id`
    16. `allow_flexible`
    17. `emergency_override`
    18. `fatigue_override`
    19. `override_reason`
    20. `passenger_count`
    21. `requested_by`
    22. `destination`
    23. `frozen`
    24. `freeze_at`

### 4. CARS
เก็บข้อมูลรถและการต่อภาษี/ทะเบียน
- **Columns (A-AA):**
    0. `car_id`
    1. `license_plate`
    2. `province`
    3. `brand`
    4. `model`
    5. `year`
    6. `color`
    7. `fuel_type`
    8. `vehicle_type`
    9. `seat_count`
    10. `status`
    11. `qr_code`
    12. `vehicle_images`
    13. `registration_book_image`
    14. `registration_number`
    15. `chassis_number`
    16. `engine_number`
    17. `registration_date`
    18. `registration_expiry`
    19. `owner_name`
    20. `owner_address`
    21. `mileage`
    22. `created_at`
    23. `created_by`
    24. `updated_at`
    25. `notes`
    26. `active`

### 5. DRIVERS
เก็บข้อมูลพนักงานขับรถ
- **Columns (A-AB):**
    0. `driver_id`
    1. `title`
    2. `first_name`
    3. `last_name`
    4. `full_name`
    5. `phone`
    6. `line_id`
    7. `position`
    8. `start_date`
    9. `license_number`
    10. `license_expiry`
    11. `status`
    12. `fatigue_flag`
    13. `fatigue_date`
    14. `fatigue_distance`
    15. `profile_image`
    16. `id_card_image`
    17. `id_card_number`
    18. `id_card_issue_date`
    19. `id_card_expiry_date`
    20. `date_of_birth`
    21. `address`
    22. `emergency_contact`
    23. `emergency_phone`
    24. `created_at`
    25. `created_by`
    26. `updated_at`
    27. `notes`

### 6. VEHICLE_MAINTENANCE (**สำคัญมาก - ต้องสร้างใหม่**)
เก็บประวัติการซ่อมบำรุงล่าสุดรายรายการ (เช่น น้ำมันเครื่องเปลี่ยนล่าสุดเมื่อไหร่)
- **Columns (A-G):**
    0. `car_id`
    1. `item_key`
    2. `last_km`
    3. `last_date`
    4. `notes`
    5. `updated_at`
    6. `updated_by`

### 7. MAINTENANCE_SETTINGS (**ต้องสร้าง**)
เก็บการตั้งค่าการแจ้งเตือนรายคัน
- **Columns (A-G):**
    0. `setting_id`
    1. `car_id`
    2. `check_type`
    3. `check_interval`
    4. `average_daily_km`
    5. `enabled`
    6. `updated_at`

### 8. FUEL_LOG
บันทึกการเติมน้ำมัน
- **Columns (A-V):**
    0. `fuel_id`
    1. `date`
    2. `time`
    3. `car_id`
    4. `driver_id`
    5. `mileage_before`
    6. `mileage_after`
    7. `liters`
    8. `price_per_liter`
    9. `amount`
    10. `fuel_type`
    11. `gas_station_name`
    12. `gas_station_address`
    13. `gas_station_tax_id`
    14. `receipt_number`
    15. `receipt_image`
    16. `receipt_pdf`
    17. `fuel_consumption_rate`
    18. `created_at`
    19. `created_by`
    20. `updated_at`
    21. `notes`

### 9. REPAIR_LOG
บันทึกการซ่อมบำรุง
- **Columns (A-R):**
    0. `repair_id`
    1. `car_id`
    2. `date_reported`
    3. `date_started`
    4. `date_completed`
    5. `mileage_at_repair`
    6. `taken_by`
    7. `garage_name`
    8. `repair_items`
    9. `issue_description`
    10. `repair_description`
    11. `cost`
    12. `status`
    13. `documents`
    14. `created_at`
    15. `created_by`
    16. `completed_by`
    17. `notes`

### 10. CHECK_LOG
บันทึกการตรวจเช็คสภาพรถ
- **Columns (A-K):**
    0. `check_id`
    1. `car_id`
    2. `inspector_name`
    3. `date`
    4. `time`
    5. `check_type`
    6. `overall_status`
    7. `checks_data`
    8. `notes`
    9. `created_at`
    10. `created_by`

### 11. INSPECTION_ALERTS
แจ้งเตือนความเสี่ยงจากการตรวจรถ
- **Columns (A-P):**
    0. `alert_id`
    1. `check_id`
    2. `car_id`
    3. `risk_level`
    4. `items`
    5. `recommendations`
    6. `inspector_name`
    7. `vehicle_info`
    8. `actions_taken`
    9. `notification_sent`
    10. `created_at`
    11. `resolved_at`
    12. `resolved_by`
    13. `why_this_alert`
    14. `data_used`
    15. `recommendation`

### 12. USAGE_RECORDS
บันทึกการสแกน QR Code
- **Columns (A-O):**
    0. `record_id`
    1. `car_id`
    2. `driver_id`
    3. `record_type`
    4. `datetime`
    5. `requested_by`
    6. `destination`
    7. `mileage`
    8. `created_at`
    9. `created_by`
    10. `notes`
    11. `auto_generated`
    12. `auto_reason`
    13. `original_user`
    14. `audit_tag`

### 13. SCHEDULED_REPAIRS
แจ้งซ่อมล่วงหน้า
- **Columns (A-O):**
    0. `scheduled_repair_id`
    1. `car_id`
    2. `request_type`
    3. `start_date`
    4. `start_time`
    5. `expected_return_date`
    6. `expected_return_time`
    7. `issue_description`
    8. `garage_name`
    9. `status`
    10. `created_at`
    11. `created_by`
    12. `updated_at`
    13. `actual_repair_id`
    14. `notes`

### 14. LEAVES
การลาของพนักงาน
- **Columns (A-P):**
    0. `leave_id`
    1. `driver_id`
    2. `leave_type`
    3. `start_date`
    4. `end_date`
    5. `start_time`
    6. `end_time`
    7. `reason`
    8. `priority`
    9. `status`
    10. `approved_by`
    11. `created_at`
    12. `created_by`
    13. `updated_at`
    14. `notes`
    15. `is_emergency`

### 15. PASSWORD_HISTORY
ประวัติรหัสผ่าน (เพื่อไม่ให้ใช้ซ้ำ)
- **Columns (A-E):**
    0. `history_id`
    1. `user_id`
    2. `password_hash`
    3. `changed_at`
    4. `changed_by`

### 16. RESET_PASSWORD_REQUESTS
คำขอรีเซ็ตรหัสผ่าน
- **Columns (A-I):**
    0. `request_id`
    1. `user_id`
    2. `email`
    3. `reset_token`
    4. `expires_at`
    5. `status`
    6. `requested_at`
    7. `reset_at`
    8. `reset_by`

### 17. NOTIFICATIONS
การแจ้งเตือนต่างๆ
- **Columns (A-G):**
    0. `notification_id`
    1. `user_id`
    2. `type`
    3. `title`
    4. `message`
    5. `read`
    6. `created_at`

### 18. AUDIT_LOG
บันทึกกิจกรรมระบบ
- **Columns (A-L):**
    0. `log_id`
    1. `timestamp`
    2. `user_id`
    3. `action`
    4. `entity_type`
    5. `entity_id`
    6. `old_value`
    7. `new_value`
    8. `details`
    9. `ip_address`
    10. `user_agent`
    11. `notes`

### 19. PDPA_LOG
บันทึกการยอมรับ PDPA
- **Columns (A-G):**
    0. `log_id`
    1. `user_id`
    2. `action`
    3. `accepted_at`
    4. `ip_address`
    5. `user_agent`
    6. `notes`

### 20. MASTER
การตั้งค่าระบบส่วนกลาง
- **Columns (A-H):**
    0. `key`
    1. `value`
    2. `description`
    3. `updated_at`
    4. `updated_by`
    5. `version`
    6. `effective_from`
    7. `effective_to`

### 21. QUEUE_RULES
กฎการจัดคิว (Admin config)
- **Columns (A-L):**
    0. `rule_id`
    1. `driver_id`
    2. `assignment_type`
    3. `description`
    4. `active`
    5. `created_at`
    6. `created_by`
    7. `updated_at`
    8. `notes`
    9. `version`
    10. `effective_from`
    11. `effective_to`

### 22. SYSTEM_SNAPSHOT
สถิติรายวัน
- **Columns (A-M):**
    0. `snapshot_id`
    1. `date`
    2. `active_cars`
    3. `cars_in_repair`
    4. `active_drivers`
    5. `queue_count`
    6. `override_count`
    7. `auto_recovery_count`
    8. `fuel_logs_today`
    9. `repair_logs_today`
    10. `check_logs_today`
    11. `created_at`
    12. `created_by`

### 23. SELF_REPORTED_FATIGUE
รายงานความเหนื่อยล้า
- **Columns (A-I):**
    0. `report_id`
    1. `driver_id`
    2. `date`
    3. `reason`
    4. `status`
    5. `admin_notes`
    6. `created_at`
    7. `resolved_at`
    8. `resolved_by`
