# โปรแกรมอ่านโน้ตเพลงเพื่อการศึกษา

แพลตฟอร์มสำหรับการเรียนรู้ การฝึกซ้อม และการวิเคราะห์ทางดนตรี

## คุณสมบัติ

- ✅ โน้ตเพลงสาธารณะ (Public Domain / เพลงแต่งเอง)
- ✅ โน้ตเพลงส่วนบุคคล (Restricted Access)
- ✅ ระบบสิทธิ์การเข้าถึง (License-based)
- ✅ ระบบแจ้งละเมิดลิขสิทธิ์ (Takedown)
- ✅ Admin-only upload
- ✅ Logging และ Audit Trail

## สถาปัตยกรรม

- **Frontend**: GitHub Pages (HTML/CSS/JavaScript)
- **Backend**: Google Apps Script (GAS)
- **Database**: Google Sheets
- **Storage**: Google Drive

## โครงสร้างโปรเจกต์

```
music-score-reader/
├── index.html          # หน้าหลัก
├── login.html          # หน้าเข้าสู่ระบบ
├── library.html        # คลังโน้ต
├── viewer.html         # ดูโน้ต
├── terms.html          # เงื่อนไขการใช้งาน
├── css/
│   └── style.css      # Stylesheet
├── js/
│   ├── api.js         # API Client
│   ├── auth.js        # Authentication
│   └── viewer.js      # Score Viewer
├── backend/
│   ├── Code.gs        # Main Entry Point
│   ├── auth.gs        # Authentication Service
│   ├── scores.gs      # Scores Service
│   ├── license.gs     # License Service
│   ├── permission.gs  # Permission Logic (แกนกลาง)
│   ├── takedown.gs    # Takedown Service
│   └── utils.gs       # Utility Functions
└── docs/
    └── SHEETS_SCHEMA.md  # Database Schema
```

## การติดตั้ง

### 1. Frontend (GitHub Pages)

1. Fork หรือ Clone repository นี้
2. แก้ไข `js/api.js` ตั้งค่า `API_BASE_URL` เป็น URL ของ Google Apps Script Web App
3. Push ไปยัง GitHub
4. เปิด GitHub Pages ใน Settings > Pages

### 2. Backend (Google Apps Script)

1. เปิด [Google Apps Script](https://script.google.com)
2. สร้างโปรเจกต์ใหม่
3. คัดลอกไฟล์จาก `backend/` ไปยัง GAS
4. สร้าง Google Sheets ตาม Schema (ดู `docs/SHEETS_SCHEMA.md`)
5. แก้ไข `CONFIG.SHEET_ID` ใน `Code.gs`
6. Deploy เป็น Web App:
   - Execute as: Me
   - Who has access: Anyone (หรือ Anyone with Google account)
   - Copy Web App URL

### 3. Database Setup

1. สร้าง Google Spreadsheet
2. สร้าง Sheets ตาม Schema:
   - Users
   - Scores
   - Licenses
   - AccessLogs
   - TakedownReports
   - TakedownLogs
3. เพิ่ม Headers (แถวแรก)
4. สร้าง Admin User:
   ```
   user_id: [UUID]
   email: admin@yourdomain.com
   password: [hashed password]
   role: admin
   ```

### 4. Google Drive Setup

1. สร้างโฟลเดอร์สำหรับเก็บไฟล์โน้ต
2. อัปโหลดไฟล์โน้ต (PDF, Image)
3. ตั้งค่า File Permissions:
   - **ห้ามใช้ Share Link โดยตรง**
   - ใช้ File ID แทน
   - Backend จะสร้าง secure download URL

## การใช้งาน

### สำหรับ Admin

1. เข้าสู่ระบบด้วย Admin Account
2. อัปโหลดโน้ตผ่าน Backend API หรือ Google Sheets โดยตรง
3. ให้สิทธิ์ (License) แก่ผู้ใช้สำหรับโน้ต restricted

### สำหรับ User

1. เข้าสู่ระบบ
2. ดูโน้ตสาธารณะใน Library
3. ดูโน้ตส่วนบุคคลที่ได้รับสิทธิ์

## API Endpoints

### Authentication
- `POST /login` - เข้าสู่ระบบ

### Scores
- `GET /scores/public` - รายการโน้ตสาธารณะ
- `GET /scores/restricted` - รายการโน้ตส่วนบุคคล (ต้อง login)
- `GET /scores/get?id={score_id}` - ดูโน้ต (ตรวจสิทธิ์อัตโนมัติ)
- `POST /scores/add` - เพิ่มโน้ต (Admin only)

### Licenses
- `POST /licenses/grant` - ให้สิทธิ์ (Admin only)
- `GET /licenses/check?id={score_id}` - ตรวจสอบสิทธิ์

### Takedown
- `POST /takedown/report` - แจ้งละเมิดลิขสิทธิ์

## ความปลอดภัย

### กฎหมาย
- ✅ ชื่อระบบ: "โปรแกรมอ่านโน้ตเพลงเพื่อการศึกษา"
- ✅ Disclaimer ทุกหน้า
- ✅ Terms of Use แยกหน้า
- ✅ Takedown Policy
- ✅ ไม่มี Public Link สำหรับ restricted scores
- ✅ Noindex (ไม่ให้ Google index)

### เทคนิค
- ✅ Permission Logic อยู่ที่จุดเดียว (`permission.gs`)
- ✅ ไม่ใช้ Drive Share Link โดยตรง
- ✅ Admin-only upload
- ✅ Log การเข้าถึง restricted scores
- ✅ Cache สำหรับ public scores

## License

โปรเจกต์นี้จัดทำเพื่อการศึกษาเท่านั้น

## ติดต่อ

หากพบเนื้อหาที่ละเมิดลิขสิทธิ์ โปรดติดต่อ: admin@yourdomain.com
