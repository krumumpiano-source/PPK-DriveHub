# คู่มือการ Setup PPK DriveHub
## การสร้างโฟลเดอร์, ชีท, แผ่นงาน และคอลัมน์ทั้งหมด

**วันที่สร้าง:** 29 มกราคม 2569  
**เวอร์ชัน:** 1.0

---

## ขั้นตอนการ Setup

### 1. เตรียมการ

1. เปิด Google Drive: https://drive.google.com
2. เปิด Google Apps Script: https://script.google.com
3. สร้างโปรเจกต์ใหม่ชื่อ "PPK-DriveHub-Setup"

### 2. สร้างไฟล์ Google Apps Script

1. ใน Google Apps Script Editor:
   - คลิก **"ไฟล์"** → **"ใหม่"** → **"ไฟล์สคริปต์"**
   - ตั้งชื่อไฟล์: `Setup Folder Sheet Goole AppScript`

2. Copy โค้ดทั้งหมดจากไฟล์ `Setup Folder Sheet Goole AppScript.gs` ไปวางในไฟล์นี้

### 3. ตั้งค่า Configuration

แก้ไขบรรทัดนี้ในไฟล์:

```javascript
var TARGET_FOLDER_ID = '1Wak-_Iw_cXabyMF765YVbFbQEJ-BeNtA';
```

**วิธีหา Folder ID:**
1. เปิด Google Drive folder ที่ต้องการเก็บเอกสารสรุป
2. Copy URL จาก address bar
3. URL จะเป็นแบบ: `https://drive.google.com/drive/folders/1Wak-_Iw_cXabyMF765YVbFbQEJ-BeNtA?usp=sharing`
4. Copy ส่วน `1Wak-_Iw_cXabyMF765YVbFbQEJ-BeNtA` (ส่วนหลัง `/folders/`)

### 4. รัน Setup Script

1. เลือกฟังก์ชัน `setupPPKDriveHub` จาก dropdown "เลือกฟังก์ชัน"
2. คลิกปุ่ม **"รัน"** (▶️)
3. อนุญาตสิทธิ์ (Authorization):
   - คลิก **"ตรวจสอบสิทธิ์"**
   - เลือกบัญชี Google ที่ต้องการใช้
   - คลิก **"อนุญาต"** (อาจต้องคลิกหลายครั้ง)
   - อนุญาตการเข้าถึง:
     - Google Drive
     - Google Sheets
     - Google Docs

### 5. ตรวจสอบผลลัพธ์

หลังจากรันเสร็จ:

1. **ตรวจสอบ Logs:**
   - ดูที่ **"ดู"** → **"Logs"** (หรือกด `Ctrl+Enter`)
   - ควรเห็นข้อความ:
     ```
     === เริ่มต้น Setup PPK DriveHub ===
     1. สร้างโฟลเดอร์...
     2. สร้าง Spreadsheet...
     3. สร้างชีททั้งหมด...
     4. สร้างเอกสารสรุป...
     === Setup เสร็จสิ้น ===
     ```

2. **ตรวจสอบ Google Drive:**
   - เปิด Google Drive
   - ควรเห็นโฟลเดอร์ `PPK-DriveHub-Uploads` พร้อมโฟลเดอร์ย่อยทั้งหมด
   - ควรเห็น Spreadsheet `PPK-DriveHub-2569`

3. **ตรวจสอบ Spreadsheet:**
   - เปิด Spreadsheet `PPK-DriveHub-2569`
   - ควรเห็นชีททั้งหมด 22 ชีท:
     - USERS
     - USER_REQUESTS
     - QUEUE
     - CARS
     - DRIVERS
     - FUEL_LOG
     - REPAIR_LOG
     - CHECK_LOG
     - INSPECTION_ALERTS
     - SELF_REPORTED_FATIGUE
     - USAGE_RECORDS
     - NOTIFICATIONS
     - AUDIT_LOG
     - PDPA_LOG
     - MASTER
     - QUEUE_RULES
     - SCHEDULED_REPAIRS
     - LEAVES
     - MAINTENANCE_SETTINGS
     - PASSWORD_HISTORY
     - SYSTEM_SNAPSHOT
     - RESET_PASSWORD_REQUESTS

4. **ตรวจสอบเอกสารสรุป:**
   - ไปที่ Google Drive folder ที่ตั้งค่าไว้ (`TARGET_FOLDER_ID`)
   - ควรเห็นเอกสารชื่อ `PPK-DriveHub-Setup-Summary-YYYYMMDD-HHMMSS`
   - เอกสารนี้มีข้อมูล:
     - โครงสร้างโฟลเดอร์ทั้งหมด (พร้อม Folder ID และ URL)
     - ข้อมูล Spreadsheet (พร้อม Spreadsheet ID และ URL)
     - รายการชีททั้งหมด (พร้อม Sheet ID)
     - รายละเอียดคอลัมน์แต่ละชีท

---

## โครงสร้างที่สร้างขึ้น

### Google Drive Folders (10 โฟลเดอร์)

```
PPK-DriveHub-Uploads/ (ROOT)
├── FUEL/                    # ใบเสร็จการเติมน้ำมัน
├── REPAIR/                  # เอกสารการซ่อมบำรุง
├── CHECK/                   # ไฟล์การตรวจเช็ค
├── ACCIDENTS/               # เอกสารอุบัติเหตุ
├── TAX/                     # เอกสารภาษีรถยนต์
├── INSURANCE/               # เอกสารประกันภัย
├── DOCUMENTS/               # เอกสารทั่วไป
├── VEHICLES/                # รูปรถ, เล่มทะเบียน
└── DRIVERS/                 # รูปคนขับ, บัตรประชาชน
```

### Google Spreadsheet

- **ชื่อ:** `PPK-DriveHub-2569`
- **จำนวนชีท:** 22 ชีท
- **จำนวนคอลัมน์รวม:** 318 คอลัมน์

### รายการชีททั้งหมด

| ลำดับ | ชื่อชีท | จำนวนคอลัมน์ |
|------|---------|-------------|
| 1 | USERS | 16 |
| 2 | USER_REQUESTS | 14 |
| 3 | QUEUE | 25 |
| 4 | CARS | 27 |
| 5 | DRIVERS | 28 |
| 6 | FUEL_LOG | 22 |
| 7 | REPAIR_LOG | 18 |
| 8 | CHECK_LOG | 11 |
| 9 | INSPECTION_ALERTS | 16 |
| 10 | SELF_REPORTED_FATIGUE | 9 |
| 11 | USAGE_RECORDS | 15 |
| 12 | NOTIFICATIONS | 7 |
| 13 | AUDIT_LOG | 12 |
| 14 | PDPA_LOG | 7 |
| 15 | MASTER | 8 |
| 16 | QUEUE_RULES | 12 |
| 17 | SCHEDULED_REPAIRS | 14 |
| 18 | LEAVES | 16 |
| 19 | MAINTENANCE_SETTINGS | 10 |
| 20 | PASSWORD_HISTORY | 5 |
| 21 | SYSTEM_SNAPSHOT | 13 |
| 22 | RESET_PASSWORD_REQUESTS | 9 |

---

## การแก้ไขปัญหา

### ปัญหา: ไม่สามารถรันได้

**สาเหตุ:** ยังไม่อนุญาตสิทธิ์

**วิธีแก้:**
1. คลิก **"ตรวจสอบสิทธิ์"** อีกครั้ง
2. เลือกบัญชี Google
3. คลิก **"อนุญาต"** (อาจต้องคลิกหลายครั้ง)
4. อนุญาตการเข้าถึง Google Drive, Sheets, Docs

---

### ปัญหา: ไม่พบโฟลเดอร์

**สาเหตุ:** โฟลเดอร์อาจถูกสร้างไว้แล้ว

**วิธีแก้:**
- Script จะไม่สร้างโฟลเดอร์ซ้ำ ถ้ามีอยู่แล้วจะใช้โฟลเดอร์เดิม
- ตรวจสอบใน Google Drive ว่ามีโฟลเดอร์ `PPK-DriveHub-Uploads` อยู่แล้วหรือไม่

---

### ปัญหา: ไม่พบ Spreadsheet

**สาเหตุ:** Spreadsheet อาจถูกสร้างไว้แล้ว

**วิธีแก้:**
- Script จะไม่สร้าง Spreadsheet ซ้ำ ถ้ามีอยู่แล้วจะใช้ Spreadsheet เดิม
- ตรวจสอบใน Google Drive ว่ามี Spreadsheet `PPK-DriveHub-2569` อยู่แล้วหรือไม่

---

### ปัญหา: ชีทไม่ครบ

**สาเหตุ:** อาจเกิด error ระหว่างการสร้างชีท

**วิธีแก้:**
1. ดู Logs เพื่อดู error message
2. ลบชีทที่สร้างผิดพลาด (ถ้ามี)
3. รัน script อีกครั้ง (จะสร้างเฉพาะชีทที่ยังไม่มี)

---

### ปัญหา: เอกสารสรุปไม่ถูกสร้าง

**สาเหตุ:** `TARGET_FOLDER_ID` ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง folder

**วิธีแก้:**
1. ตรวจสอบว่า `TARGET_FOLDER_ID` ถูกต้อง
2. ตรวจสอบว่ามีสิทธิ์เข้าถึง folder นั้น
3. ดู Logs เพื่อดู error message

---

## ขั้นตอนถัดไป

หลังจาก Setup เสร็จแล้ว:

1. **ตั้งค่า Config.gs:**
   - เปิดไฟล์ `Config.gs` ในโปรเจกต์หลัก
   - ตั้งค่า `SPREADSHEET_ID` = Spreadsheet ID จากเอกสารสรุป
   - ตั้งค่า `ROOT_FOLDER_ID` = Folder ID ของ `PPK-DriveHub-Uploads` จากเอกสารสรุป
   - ตั้งค่า `FOLDERS.*` = Folder IDs ของแต่ละโฟลเดอร์ย่อย

2. **ตรวจสอบโครงสร้าง:**
   - เปิด Spreadsheet `PPK-DriveHub-2569`
   - ตรวจสอบว่าทุกชีทมี headers ครบถ้วน
   - ตรวจสอบว่าคอลัมน์ถูกต้องตามเอกสาร `SYSTEM_STRUCTURE_DOCUMENTATION.md`

3. **ทดสอบระบบ:**
   - ทดสอบการสร้างข้อมูลในแต่ละชีท
   - ทดสอบการอัปโหลดไฟล์ไปยังโฟลเดอร์ต่างๆ

---

## ข้อมูลเพิ่มเติม

- **เอกสารโครงสร้างระบบ:** `SYSTEM_STRUCTURE_DOCUMENTATION.md`
- **เอกสารการปรับปรุงความปลอดภัย:** `SECURITY_AND_IMPROVEMENTS.md`
- **Google Drive Folder:** https://drive.google.com/drive/folders/1Wak-_Iw_cXabyMF765YVbFbQEJ-BeNtA?usp=sharing

---

**เอกสารนี้สร้างขึ้นเมื่อ:** 29 มกราคม 2569  
**อัปเดตล่าสุด:** 29 มกราคม 2569  
**เวอร์ชัน:** 1.0
