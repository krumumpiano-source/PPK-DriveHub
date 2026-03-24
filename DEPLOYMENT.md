# PPK DriveHub - Deployment Guide

## ✅ Pre-Deploy Verification (ตรวจแล้ว)

- **API สาธารณะ**: `login`, `register`, `registerUser`, `forgotPassword`, `resetPasswordConfirm`, `getFuelTypes`, `getVehicleById`, `createFuelLog`, `createUsageRecord`, `createDailyCheck`, `scanQRForUsageRecord`, `checkEmailVerification` — ใช้ได้โดยไม่ส่ง userId
- **Frontend**: ทุก request ที่ต้องล็อกอินจะถูกใส่ `userId` อัตโนมัติจาก `common.html` (getCurrentUser)
- **การแจ้งเตือน**: แสดงทั้งที่อ่านแล้วและยังไม่อ่าน
- **ความปลอดภัย**: บังคับส่ง `userId` สำหรับ action ที่ต้องล็อกอิน; ใช้ sanitizeInput สำหรับ action และ userId

## 📋 Checklist ก่อน Deploy

### 1. Backend (Google Apps Script)

- [ ] อัปโหลดไฟล์ทั้งหมดจาก `/backend` ไปยัง GAS
- [ ] ตั้งค่า `Config.gs`:
  - [ ] `SPREADSHEET_NAME` ถูกต้อง
  - [ ] `SPREADSHEET_ID` ถูกต้อง (ถ้ามี)
  - [ ] `ROOT_FOLDER_ID` ถูกต้อง
  - [ ] `QR_CODE_BASE_URL` ถูกต้อง
- [ ] **ตั้งค่า Script Properties** (ความลับ — ดู `DEPLOYMENT_SECRETS.md`):
  - [ ] `TELEGRAM_BOT_TOKEN` (ถ้าใช้การแจ้งเตือน Telegram)
  - [ ] `TELEGRAM_CHAT_ID`
- [ ] สร้าง Google Spreadsheet พร้อม Sheets ทั้งหมด:
  - [ ] USERS
  - [ ] USER_REQUESTS
  - [ ] QUEUE
  - [ ] CARS
  - [ ] DRIVERS
  - [ ] FUEL_LOG
  - [ ] REPAIR_LOG
  - [ ] CHECK_LOG
  - [ ] AUDIT_LOG
  - [ ] MASTER
- [ ] สร้าง Google Drive Folders:
  - [ ] PPK-DriveHub-Uploads/FUEL
  - [ ] PPK-DriveHub-Uploads/REPAIR
  - [ ] PPK-DriveHub-Uploads/CHECK
- [ ] Deploy as Web App:
  - [ ] Execute as: **User accessing the web app** (ต้องใช้แบบนี้เพื่อให้ Session.getActiveUser() = ผู้ใช้ที่ล็อกอิน)
  - [ ] Who has access: **Anyone** (สำคัญมาก!)
- [ ] **คัดลอก Web App URL** (จะใช้ในขั้นตอนถัดไป)
- [ ] สร้าง Admin user แรกใน Sheet USERS

### 2. Frontend Configuration

- [ ] **แทนที่ `YOUR_GAS_WEB_APP_URL` ในทุกไฟล์ HTML**

#### วิธีตรวจสอบ:
```powershell
# ตรวจสอบว่ายังมี YOUR_GAS_WEB_APP_URL เหลืออยู่หรือไม่
Get-ChildItem -Path frontend -Filter *.html | Select-String "YOUR_GAS_WEB_APP_URL"
```

**ต้องไม่มีผลลัพธ์** (ไม่มีไฟล์ใดมี YOUR_GAS_WEB_APP_URL เหลืออยู่)

#### วิธีแทนที่:
```powershell
# ใช้ helper script (สร้างใหม่)
cd frontend
.\update-api-url.ps1 -ApiUrl "https://script.google.com/macros/s/YOUR_ID/exec"
```

หรือแก้ไขด้วยตนเองในทุกไฟล์:
```javascript
window.API_BASE_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
```

### 3. Testing

- [ ] ทดสอบสมัครใช้งาน
- [ ] ทดสอบ Login
- [ ] ทดสอบเปลี่ยนรหัสผ่านครั้งแรก
- [ ] ทดสอบอนุมัติผู้ใช้ (Admin)
- [ ] ทดสอบเพิ่มรถ
- [ ] ทดสอบเพิ่มคนขับ
- [ ] ทดสอบสร้างคิวรถ
- [ ] ทดสอบบันทึกน้ำมัน
- [ ] ทดสอบแจ้งซ่อม
- [ ] ทดสอบ QR Code (ถ้ามี)
- [ ] ทดสอบ Dashboard
- [ ] ทดสอบรายงาน

### 4. Deploy Frontend

- [ ] อัปโหลดไฟล์ทั้งหมดจาก `/frontend` ไปยัง GitHub Pages หรือ static hosting
- [ ] ตรวจสอบว่า URL ทำงานได้
- [ ] ตรวจสอบ Browser Console (F12) ว่าไม่มี errors

## ⚠️ ข้อผิดพลาดที่พบบ่อย

1. **CORS Error**: ตรวจสอบว่า GAS Web App ตั้งค่า "Who has access" เป็น "Anyone"
2. **404 Error**: ตรวจสอบว่า `window.API_BASE_URL` ตั้งค่าถูกต้อง
3. **Navigation ไม่ทำงาน**: ตรวจสอบว่า fetch('common.html') ทำงานได้
4. **Functions ไม่พบ**: ตรวจสอบว่า scripts จาก common.html ถูกโหลดแล้ว
5. **Sheet not found**: ตรวจสอบว่า Sheet names ใน Config.gs ตรงกับใน Spreadsheet
6. **Folder not found**: ตรวจสอบว่า Folder IDs ใน Config.gs ถูกต้อง

## 📝 Notes

- URL ต้องเป็น URL เต็มรูปแบบ (รวม `https://`)
- ต้องไม่มี trailing slash (`/`) ที่ท้าย URL
- ตรวจสอบ Browser Console เพื่อดู error messages
- ใช้ Network tab ใน DevTools เพื่อดู API calls

## 🔧 Helper Scripts

### update-api-url.ps1 (PowerShell)

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$ApiUrl
)

$files = Get-ChildItem -Path . -Filter *.html -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $content = $content -replace "YOUR_GAS_WEB_APP_URL", $ApiUrl
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "Updated: $($file.Name)"
}

Write-Host "Done! Updated $($files.Count) files."
```

### update-api-url.sh (Bash)

```bash
#!/bin/bash

API_URL="$1"

if [ -z "$API_URL" ]; then
    echo "Usage: ./update-api-url.sh <API_URL>"
    exit 1
fi

find . -name "*.html" -type f | while read file; do
    sed -i "s|YOUR_GAS_WEB_APP_URL|$API_URL|g" "$file"
    echo "Updated: $file"
done

echo "Done!"
```
