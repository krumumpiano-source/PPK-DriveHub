# Quick Start Guide
โปรแกรมอ่านโน้ตเพลงเพื่อการศึกษา

## ขั้นตอนด่วน (5 นาที)

### 1. สร้าง Google Sheets (2 นาที)

1. ไปที่ [Google Sheets](https://sheets.google.com)
2. สร้าง Spreadsheet ใหม่
3. สร้าง Sheets 5 แผ่น:
   - Users
   - Scores  
   - Licenses
   - AccessLogs
   - TakedownReports
4. เพิ่ม Headers ตาม `docs/SHEETS_SCHEMA.md`
5. คัดลอก Sheet ID จาก URL

### 2. สร้าง Admin User (1 นาที)

ใน Sheet "Users" เพิ่มแถว:
```
user_id: [ใช้ UUID Generator]
email: admin@yourdomain.com
password: [hash password - ใช้ MD5 หรือ bcrypt]
role: admin
created_at: [วันที่ปัจจุบัน]
```

**Hash Password ใน GAS:**
```javascript
function hashPassword() {
  const password = 'your_password';
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    password,
    Utilities.Charset.UTF_8
  );
  const hashString = hash.map(byte => 
    ('0' + (byte & 0xFF).toString(16)).slice(-2)
  ).join('');
  Logger.log(hashString);
}
```

### 3. ตั้งค่า Google Apps Script (2 นาที)

1. ไปที่ [Google Apps Script](https://script.google.com)
2. สร้างโปรเจกต์ใหม่
3. คัดลอกโค้ดจาก `backend/` ทั้งหมด
4. แก้ไข `CONFIG.SHEET_ID` ใน `Code.gs`
5. Deploy > New deployment > Web app
   - Execute as: Me
   - Who has access: Anyone
6. **คัดลอก Web App URL**

### 4. ตั้งค่า Frontend (1 นาที)

1. แก้ไข `js/api.js`:
   ```javascript
   const API_BASE_URL = 'YOUR_GAS_WEB_APP_URL';
   ```
2. แก้ไข email ใน HTML files:
   - ค้นหา `admin@yourdomain.com` → แทนที่ด้วย email จริง
3. Deploy:
   - **GitHub Pages**: Push ไป GitHub > Settings > Pages
   - **Netlify**: Import repo > Deploy

### 5. ทดสอบ (1 นาที)

1. เปิด Frontend URL
2. Login ด้วย Admin account
3. เพิ่มโน้ตใน Sheet "Scores":
   ```
   score_id: [UUID]
   title: โน้ตทดสอบ
   score_type: admin_public
   visibility: public
   owner_id: [admin user_id]
   file_id: [Google Drive File ID]
   created_at: [วันที่ปัจจุบัน]
   ```
4. Refresh Library → ควรเห็นโน้ต

## Checklist

- [ ] Google Sheets สร้างครบ 5 Sheets
- [ ] Headers ถูกต้องทุก Sheet
- [ ] Admin User สร้างแล้ว
- [ ] GAS Deploy แล้วและได้ Web App URL
- [ ] Frontend แก้ไข API_BASE_URL แล้ว
- [ ] Frontend แก้ไข email ติดต่อแล้ว
- [ ] Frontend Deploy แล้ว
- [ ] ทดสอบ Login สำเร็จ
- [ ] ทดสอบดูโน้ตได้

## ปัญหาที่พบบ่อย

**Login ไม่ได้**
- ตรวจสอบ password hash ถูกต้อง
- ตรวจสอบ email ตรงกัน

**ไม่เห็นโน้ต**
- ตรวจสอบ score_type = admin_public
- ตรวจสอบ visibility = public
- ตรวจสอบ file_id ถูกต้อง

**CORS Error**
- ตรวจสอบ API_BASE_URL ถูกต้อง
- ตรวจสอบ GAS Deploy settings

## ต่อไป

อ่าน `SETUP_GUIDE.md` สำหรับรายละเอียดเพิ่มเติม
