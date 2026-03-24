# PPK DriveHub
## ระบบจัดการยานพาหนะโรงเรียนพะเยาพิทยาคม 2569

ระบบจัดการยานพาหนะแบบครบวงจร สำหรับการทำงานบน GitHub + Google Apps Script (GAS)

---

## 📋 สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
3. [การติดตั้งและ Deploy](#การติดตั้งและ-deploy)
4. [การใช้งาน](#การใช้งาน)
5. [API Documentation](#api-documentation)
6. [Google Sheets Schema](#google-sheets-schema)

---

## 🎯 ภาพรวมระบบ

PPK DriveHub เป็นระบบจัดการยานพาหนะที่ครอบคลุมทุกขั้นตอน:
- ✅ การจัดคิวรถ
- ✅ การบันทึกการใช้งานจริง (QR Code)
- ✅ การตรวจเช็ครถ
- ✅ การบันทึกน้ำมันและค่าใช้จ่าย
- ✅ การซ่อมบำรุง
- ✅ รายงานและประวัติ
- ✅ การจัดการผู้ใช้และสิทธิ์

### คุณสมบัติหลัก

1. **ระบบ Login/Register แบบอนุมัติ**
   - ผู้ใช้ต้องสมัครและรออนุมัติจาก Admin
   - บังคับเปลี่ยนรหัสผ่านครั้งแรก

2. **QR Code Integration**
   - QR บันทึกใช้รถ (สแกนแล้วบันทึกการใช้งานจริง)
   - QR ตรวจเช็ครถ (บันทึกสภาพรถ)

3. **Role-Based Access Control**
   - `admin` - ผู้ดูแลระบบ (เห็นทุกเมนู)
   - `vehicle` - จัดการคิวรถ
   - `fuel` - บันทึกน้ำมัน
   - `repair` - บันทึกซ่อมบำรุง
   - `viewer` - ดูรายงานเท่านั้น

---

## 📁 โครงสร้างโปรเจกต์

```
ppk-drivehub/
├── backend/                    # Google Apps Script files
│   ├── Code.gs                 # Main API router
│   ├── Config.gs               # Configuration
│   ├── Utils.gs                # Utility functions
│   ├── AuthService.gs          # Authentication
│   ├── UserService.gs         # User management
│   ├── QueueService.gs        # Queue management
│   ├── VehicleService.gs      # Vehicle management
│   ├── DriverService.gs       # Driver management
│   ├── FuelService.gs         # Fuel logging
│   ├── RepairService.gs       # Repair logging
│   ├── CheckService.gs        # Vehicle check logging
│   ├── ReportService.gs       # Reports
│   └── AdminService.gs        # Admin functions
│
├── frontend/                   # Static HTML files
│   ├── common.html            # Common navigation & utilities
│   ├── login.html             # Login page
│   ├── register.html          # Registration page
│   ├── dashboard.html         # Dashboard
│   ├── queue.html             # Queue management
│   ├── vehicles.html          # Vehicle management
│   ├── drivers.html           # Driver management
│   ├── fuel.html              # Fuel logging
│   ├── repair.html            # Repair logging
│   ├── reports.html           # Reports
│   ├── settings.html          # System settings (Admin)
│   ├── qr-usage.html          # QR usage recording
│   └── qr-check.html          # QR vehicle check
│
├── SHEETS_SCHEMA.md           # Google Sheets schema documentation
└── README.md                  # This file
```

---

## 🚀 การติดตั้งและ Deploy

### 1. Deploy Backend (Google Apps Script)

1. เปิด [Google Apps Script](https://script.google.com)
2. สร้างโปรเจกต์ใหม่
3. อัปโหลดไฟล์ทั้งหมดจาก `/backend`:
   - `Code.gs`
   - `Config.gs`
   - `Utils.gs`
   - `AuthService.gs`
   - `UserService.gs`
   - `QueueService.gs`
   - `VehicleService.gs`
   - `DriverService.gs`
   - `FuelService.gs`
   - `RepairService.gs`
   - `CheckService.gs`
   - `ReportService.gs`
   - `AdminService.gs`

4. ตั้งค่า `Config.gs`:
   ```javascript
   SPREADSHEET_NAME: 'PPK-DriveHub-2569'
   ROOT_FOLDER_ID: 'YOUR_GOOGLE_DRIVE_FOLDER_ID'
   ```

5. สร้าง Google Spreadsheet:
   - ชื่อ: `PPK-DriveHub-2569`
   - สร้าง Sheets ตาม `SHEETS_SCHEMA.md`
   - ตั้งค่า `SPREADSHEET_ID` ใน `Config.gs`

6. สร้าง Google Drive Folders:
   ```
   PPK-DriveHub-Uploads/
   ├── FUEL/
   ├── REPAIR/
   └── CHECK/
   ```

7. Deploy as Web App:
   - คลิก "Deploy" > "New deployment"
   - เลือก type: "Web app"
   - Execute as: **Me**
   - Who has access: **Anyone** (สำคัญมาก!)
   - คลิก "Deploy"
   - **คัดลอก Web App URL**

### 2. Configure Frontend

1. เปิดไฟล์ HTML ทุกไฟล์ใน `/frontend`
2. แก้ไข `window.API_BASE_URL` ในทุกไฟล์:
   ```javascript
   window.API_BASE_URL = 'YOUR_GAS_WEB_APP_URL';
   ```

3. อัปโหลดไปยัง GitHub Pages หรือ static hosting

### 3. สร้าง Admin User แรก

1. เปิด Google Spreadsheet
2. ไปที่ Sheet `USERS`
3. เพิ่มแถวแรก (หลัง header):
   ```
   user_id: admin
   password_hash: [ใช้ hashPassword() ใน Utils.gs]
   full_name: ผู้ดูแลระบบ
   role: admin
   active: TRUE
   first_login: FALSE
   ```

---

## 📖 การใช้งาน

### สำหรับผู้ใช้ทั่วไป

1. **สมัครใช้งาน**
   - ไปที่หน้า Register
   - กรอกข้อมูลและส่งคำขอ
   - รอการอนุมัติจาก Admin

2. **เข้าสู่ระบบ**
   - ใช้ user_id และรหัสผ่านที่ Admin กำหนด
   - เปลี่ยนรหัสผ่านครั้งแรก (ถ้าจำเป็น)

3. **ใช้งานตามสิทธิ์**
   - Dashboard: ดูภาพรวม
   - คิวรถ: จัดการคิว (ถ้ามีสิทธิ์)
   - น้ำมัน/ซ่อม: บันทึกข้อมูล (ถ้ามีสิทธิ์)
   - รายงาน: ดูประวัติ

### สำหรับ Admin

1. **อนุมัติผู้ใช้**
   - ไปที่ ตั้งค่าระบบ > จัดการผู้ใช้
   - ดูคำขอสมัคร
   - อนุมัติและกำหนด role

2. **จัดการข้อมูลหลัก**
   - เพิ่ม/แก้ไข รถ
   - เพิ่ม/แก้ไข คนขับ

3. **ควบคุมระบบ**
   - ดู Dashboard Admin (มี alerts)
   - ตรวจสอบ Audit Logs
   - ตั้งค่าระบบ

### QR Code Usage

1. **QR บันทึกใช้รถ**
   - สแกน QR ที่ติดรถ
   - บันทึกเวลาและเลขไมล์
   - ระบบจะอัปเดตคิวอัตโนมัติ

2. **QR ตรวจเช็ครถ**
   - สแกน QR เดียวกัน
   - กรอกข้อมูลตรวจเช็ค
   - ถ้ามีปัญหา สามารถสร้างคำขอซ่อมอัตโนมัติ

---

## 🔌 API Documentation

### Request Format

```javascript
POST https://script.google.com/.../exec
Content-Type: application/json

{
  "action": "actionName",
  "data": { ... }
}
```

### Response Format

```javascript
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

### Available Actions

#### Authentication
- `login` - เข้าสู่ระบบ
- `register` - สมัครใช้งาน
- `changePassword` - เปลี่ยนรหัสผ่าน
- `getCurrentUserInfo` - ดึงข้อมูลผู้ใช้ปัจจุบัน

#### User Management (Admin)
- `getAllUsers` - ดึงรายการผู้ใช้ทั้งหมด
- `updateUser` - แก้ไขผู้ใช้
- `deactivateUser` - ระงับผู้ใช้
- `resetUserPassword` - รีเซ็ตรหัสผ่าน

#### User Requests (Admin)
- `getUserRequests` - ดึงคำขอสมัคร
- `approveUserRequest` - อนุมัติคำขอ
- `rejectUserRequest` - ปฏิเสธคำขอ

#### Queue
- `createQueue` - สร้างคิวรถ
- `getQueues` - ดึงรายการคิว
- `getQueueById` - ดึงคิวตาม ID
- `updateQueue` - แก้ไขคิว
- `cancelQueue` - ยกเลิกคิว
- `createManualQueue` - สร้างคิวย้อนหลัง (Admin)

#### Vehicles
- `createVehicle` - เพิ่มรถ
- `getVehicles` - ดึงรายการรถ
- `getVehicleById` - ดึงรถตาม ID
- `updateVehicle` - แก้ไขรถ
- `deactivateVehicle` - ปิดการใช้งานรถ

#### Drivers
- `createDriver` - เพิ่มคนขับ
- `getDrivers` - ดึงรายการคนขับ
- `getDriverById` - ดึงคนขับตาม ID
- `updateDriver` - แก้ไขคนขับ
- `deactivateDriver` - ปิดการใช้งานคนขับ

#### Fuel
- `createFuelLog` - บันทึกน้ำมัน
- `getFuelLogs` - ดึงรายการน้ำมัน
- `getFuelLogById` - ดึงบันทึกตาม ID
- `updateFuelLog` - แก้ไขบันทึก

#### Repair
- `createRepairLog` - แจ้งซ่อม
- `getRepairLogs` - ดึงรายการซ่อม
- `getRepairLogById` - ดึงบันทึกตาม ID
- `updateRepairLog` - แก้ไขบันทึก
- `completeRepair` - ปิดงานซ่อม

#### Check
- `createCheckLog` - บันทึกตรวจเช็ค
- `getCheckLogs` - ดึงรายการตรวจเช็ค
- `getCheckLogById` - ดึงบันทึกตาม ID

#### QR Code
- `scanQRUsage` - สแกน QR บันทึกใช้รถ
- `scanQRCheck` - สแกน QR ตรวจเช็ค

#### Dashboard
- `getDashboardStats` - สถิติ Dashboard ปกติ
- `getAdminDashboardStats` - สถิติ Dashboard Admin

#### Reports
- `getQueueReport` - รายงานคิว
- `getFuelReport` - รายงานน้ำมัน
- `getRepairReport` - รายงานซ่อม
- `getVehicleUsageReport` - รายงานการใช้รถรายคัน

#### Admin
- `getAuditLogs` - ดึง Audit Logs
- `getSystemSettings` - ดึงค่าตั้งค่าระบบ
- `updateSystemSetting` - อัปเดตค่าตั้งค่า

---

## 📊 Google Sheets Schema

ดูรายละเอียดใน `SHEETS_SCHEMA.md`

### Sheets ที่ใช้:

1. **USERS** - ผู้ใช้ที่ใช้งานได้
2. **USER_REQUESTS** - คำขอสมัคร
3. **QUEUE** - คิวรถ
4. **CARS** - รถ
5. **DRIVERS** - คนขับ
6. **FUEL_LOG** - บันทึกน้ำมัน
7. **REPAIR_LOG** - บันทึกซ่อม
8. **CHECK_LOG** - บันทึกตรวจเช็ค
9. **AUDIT_LOG** - Audit logs
10. **MASTER** - ตั้งค่าระบบ

---

## 🔒 Security Notes

1. **Password Hashing**: ใช้ MD5 hash (ควรอัปเกรดเป็น bcrypt ในอนาคต)
2. **Session Management**: ใช้ sessionStorage (ควรใช้ proper session management ใน production)
3. **CORS**: GAS Web App ต้องตั้งค่า "Anyone" สำหรับ CORS
4. **API Security**: พิจารณาเพิ่ม API key หรือ OAuth ในอนาคต

---

## 📝 Notes

- Frontend ต้องตั้งค่า `window.API_BASE_URL` ในทุกหน้า
- File uploads ใช้ base64 encoding
- GAS Web App ต้องตั้งค่า "Who has access" เป็น "Anyone"
- ทุก API call ควรมี error handling
- QR Code URLs ต้องตั้งค่า `CONFIG.QR_CODE_BASE_URL` ใน Config.gs

---

## 👨‍💻 Developer

ออกแบบและพัฒนาโดย **ครูพงศธร โพธิแก้ว**  
โรงเรียนพะเยาพิทยาคม 2569

---

## 📄 License

สำหรับใช้งานภายในโรงเรียนพะเยาพิทยาคมเท่านั้น
