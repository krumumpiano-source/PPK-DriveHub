# คู่มือการติดตั้งและตั้งค่า
โปรแกรมอ่านโน้ตเพลงเพื่อการศึกษา

## ขั้นตอนที่ 1: เตรียม Google Sheets Database

### 1.1 สร้าง Google Spreadsheet

1. ไปที่ [Google Sheets](https://sheets.google.com)
2. สร้าง Spreadsheet ใหม่
3. ตั้งชื่อ: "Music Score Reader Database"
4. คัดลอก Sheet ID จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```

### 1.2 สร้าง Sheets ตาม Schema

สร้าง Sheets ต่อไปนี้ (คลิกขวาที่แท็บ Sheet > Insert sheet):

#### Sheet: Users
| user_id | email | password | role | created_at |
|---------|-------|----------|------|------------|
| | | | | |

#### Sheet: Scores
| score_id | title | score_type | visibility | owner_id | file_id | created_at |
|----------|-------|------------|------------|----------|---------|------------|
| | | | | | | |

#### Sheet: Licenses
| license_id | score_id | user_id | granted_at |
|------------|----------|---------|------------|
| | | | |

#### Sheet: AccessLogs
| timestamp | user_id | score_id | ip_address |
|-----------|---------|----------|------------|
| | | | |

#### Sheet: TakedownReports
| report_id | score_id | reporter_email | reason | evidence | status | created_at |
|-----------|----------|----------------|--------|----------|--------|------------|
| | | | | | | |

#### Sheet: TakedownLogs
| timestamp | score_id | action | notes |
|-----------|----------|--------|-------|
| | | | |

### 1.3 สร้าง Admin User

ใน Sheet "Users" เพิ่มแถวแรก:

```
user_id: [ใช้ UUID Generator หรือ Utilities.getUuid() ใน GAS]
email: admin@yourdomain.com
password: [hash password - ใช้ Utilities.computeDigest หรือ bcrypt]
role: admin
created_at: [วันที่ปัจจุบัน ISO format]
```

**วิธี Hash Password:**
```javascript
// ใน Google Apps Script
const password = 'your_password';
const hash = Utilities.computeDigest(
  Utilities.DigestAlgorithm.MD5,
  password,
  Utilities.Charset.UTF_8
);
const hashString = hash.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
```

## ขั้นตอนที่ 2: ตั้งค่า Google Apps Script

### 2.1 สร้างโปรเจกต์ GAS

1. ไปที่ [Google Apps Script](https://script.google.com)
2. คลิก "New Project"
3. ตั้งชื่อ: "Music Score Reader Backend"

### 2.2 อัปโหลดไฟล์ Backend

คัดลอกโค้ดจากไฟล์ต่อไปนี้ไปยัง GAS:

1. `Code.gs` → ตั้งชื่อเป็น `Code.gs`
2. `auth.gs` → สร้างไฟล์ใหม่ชื่อ `auth.gs`
3. `scores.gs` → สร้างไฟล์ใหม่ชื่อ `scores.gs`
4. `license.gs` → สร้างไฟล์ใหม่ชื่อ `license.gs`
5. `permission.gs` → สร้างไฟล์ใหม่ชื่อ `permission.gs`
6. `takedown.gs` → สร้างไฟล์ใหม่ชื่อ `takedown.gs`
7. `utils.gs` → สร้างไฟล์ใหม่ชื่อ `utils.gs`

### 2.3 แก้ไข Configuration

ในไฟล์ `Code.gs` แก้ไข:

```javascript
const CONFIG = {
  SHEET_ID: 'YOUR_SHEET_ID', // ใส่ Sheet ID ที่คัดลอกมา
  USERS_SHEET: 'Users',
  SCORES_SHEET: 'Scores',
  LICENSES_SHEET: 'Licenses',
  ACCESS_LOGS_SHEET: 'AccessLogs',
  TAKEDOWN_SHEET: 'TakedownReports'
};
```

### 2.4 ตั้งค่า Permissions

1. คลิก "Deploy" > "New deployment"
2. เลือก Type: "Web app"
3. ตั้งค่า:
   - **Execute as**: Me
   - **Who has access**: Anyone (หรือ Anyone with Google account)
4. คลิก "Deploy"
5. **คัดลอก Web App URL** (จะใช้ใน Frontend)

### 2.5 ตั้งค่า OAuth (ถ้าต้องการ)

ถ้าใช้ Google Sign-In:
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่
3. เปิดใช้งาน Google Sheets API และ Google Drive API
4. สร้าง OAuth 2.0 Credentials
5. ตั้งค่าใน GAS

## ขั้นตอนที่ 3: เตรียม Google Drive

### 3.1 สร้างโฟลเดอร์

1. ไปที่ [Google Drive](https://drive.google.com)
2. สร้างโฟลเดอร์ใหม่: "Music Scores"
3. คลิกขวา > Share > ให้สิทธิ์ GAS Project:
   - Add people: [GAS Service Account Email]
   - Role: Viewer

### 3.2 อัปโหลดไฟล์โน้ต

1. อัปโหลดไฟล์โน้ต (PDF, JPG, PNG) ไปยังโฟลเดอร์
2. **สำคัญ**: อย่าใช้ Share Link โดยตรง
3. คัดลอก File ID จาก URL:
   ```
   https://drive.google.com/file/d/[FILE_ID]/view
   ```

### 3.3 เพิ่มโน้ตใน Database

ใน Sheet "Scores" เพิ่มแถว:

```
score_id: [UUID]
title: ชื่อโน้ต
score_type: admin_public (หรือ private_custom)
visibility: public (หรือ restricted)
owner_id: [Admin user_id]
file_id: [File ID จาก Drive]
created_at: [วันที่ปัจจุบัน]
```

## ขั้นตอนที่ 4: ตั้งค่า Frontend

### 4.1 แก้ไข API URL

ในไฟล์ `js/api.js` แก้ไข:

```javascript
const API_BASE_URL = 'YOUR_GAS_WEB_APP_URL'; // ใส่ Web App URL จาก GAS
```

### 4.2 แก้ไข Email ติดต่อ

ในไฟล์ต่อไปนี้ แก้ไข email ติดต่อ:
- `index.html`
- `terms.html`
- `login.html`

ค้นหา `admin@yourdomain.com` และแทนที่ด้วย email จริง

### 4.3 Deploy Frontend

#### วิธีที่ 1: GitHub Pages

1. Push โค้ดไปยัง GitHub Repository
2. ไปที่ Settings > Pages
3. เลือก Branch: `main` (หรือ `master`)
4. Folder: `/` (root)
5. คลิก Save
6. รอสักครู่ Frontend จะอยู่ที่: `https://[username].github.io/[repo-name]/`

#### วิธีที่ 2: Netlify / Vercel

1. Import repository
2. Deploy (auto-detect static site)
3. ตั้งค่า Environment Variables (ถ้ามี)

## ขั้นตอนที่ 5: ทดสอบระบบ

### 5.1 ทดสอบ Login

1. เปิด Frontend URL
2. ไปที่หน้า Login
3. ใส่ email และ password ของ Admin
4. ตรวจสอบว่าล็อกอินสำเร็จ

### 5.2 ทดสอบ Public Scores

1. หลังจากล็อกอิน ไปที่ Library
2. ตรวจสอบว่าเห็นโน้ต public
3. คลิกดูโน้ต ตรวจสอบว่าแสดงได้

### 5.3 ทดสอบ Restricted Scores

1. ใน Sheet "Licenses" เพิ่ม license:
   ```
   license_id: [UUID]
   score_id: [score_id ที่เป็น restricted]
   user_id: [user_id ของคุณ]
   granted_at: [วันที่ปัจจุบัน]
   ```
2. Refresh หน้า Library
3. ตรวจสอบว่าเห็นโน้ต restricted ในส่วน "โน้ตเพลงส่วนบุคคล"

### 5.4 ทดสอบ Permission

1. ลองเข้าถึง restricted score โดยไม่มี license
2. ตรวจสอบว่าแสดง "Access Denied"
3. ลองเข้าถึง score ที่มี license
4. ตรวจสอบว่าแสดงโน้ตได้

## Troubleshooting

### ปัญหา: Login ไม่ได้

- ตรวจสอบว่า password ใน Sheet ถูก hash แล้ว
- ตรวจสอบว่า email และ password ตรงกัน
- ดู Logs ใน GAS (View > Logs)

### ปัญหา: ไม่เห็นโน้ต

- ตรวจสอบว่า score_type และ visibility ถูกต้อง
- ตรวจสอบว่า file_id ใน Sheet ถูกต้อง
- ตรวจสอบว่า GAS มีสิทธิ์เข้าถึง Drive file

### ปัญหา: CORS Error

- ตรวจสอบว่า GAS Web App ตั้งค่า CORS headers แล้ว
- ตรวจสอบว่า API_BASE_URL ใน Frontend ถูกต้อง

### ปัญหา: File ไม่แสดง

- ตรวจสอบว่า File ID ถูกต้อง
- ตรวจสอบว่า GAS มีสิทธิ์เข้าถึง Drive
- ตรวจสอบว่าใช้ `getDownloadUrl()` ไม่ใช่ share link

## Checklist ก่อนเปิดใช้งานจริง

- [ ] แก้ไข email ติดต่อทั้งหมด
- [ ] ตั้งค่า CONFIG.SHEET_ID
- [ ] ตั้งค่า API_BASE_URL ใน Frontend
- [ ] สร้าง Admin User พร้อม hash password
- [ ] ทดสอบ Login
- [ ] ทดสอบ Public Scores
- [ ] ทดสอบ Restricted Scores
- [ ] ทดสอบ Permission Logic
- [ ] ตรวจสอบ Disclaimer และ Terms แสดงทุกหน้า
- [ ] ตรวจสอบว่าไม่มี public link สำหรับ restricted
- [ ] ตั้งค่า noindex (มีใน HTML แล้ว)
- [ ] ทดสอบ Takedown Report

## หมายเหตุ

- **Password Security**: ใน production ควรใช้ bcrypt หรือวิธีที่ปลอดภัยกว่า MD5
- **Token Security**: ใน production ควรใช้ JWT แทน base64 encoding
- **File Storage**: พิจารณาใช้ Cloud Storage อื่นถ้าต้องการความปลอดภัยสูงขึ้น
- **Rate Limiting**: พิจารณาเพิ่ม rate limiting สำหรับ API
