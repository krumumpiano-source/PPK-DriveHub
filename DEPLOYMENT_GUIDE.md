# คู่มือการติดตั้งและเริ่มใช้งานระบบ PPK DriveHub (สำหรับผู้ดูแลระบบ)

เอกสารนี้อธิบายขั้นตอนการนำโค้ดขึ้นระบบ Google Apps Script (GAS) และการตั้งค่าเริ่มต้น

## 1. การเตรียมสภาพแวดล้อม (Prerequisites)
- บัญชี Google Account ของโรงเรียน (แนะนำให้ใช้บัญชีกลางสำหรับฝ่ายงาน)
- ไฟล์ Source Code ล่าสุดที่ได้รับจากทีมพัฒนา

## 2. การสร้างและตั้งค่า Google Drive Folder
**ขั้นตอน:**
1. สร้างโฟลเดอร์หลักใน Google Drive เช่น `PPK-DriveHub-System`
2. สร้างไฟล์ Google Apps Script ใหม่ในโฟลเดอร์นั้น
3. นำโค้ดจากโฟลเดอร์ `backend/Setup.gs` ไปวางใน Script Editor
4. เลือกฟังก์ชัน `installSystem` แล้วกด Run
5. ระบบจะสร้างโฟลเดอร์ย่อยและไฟล์ Google Sheets ทั้งหมดให้โดยอัตโนมัติ
6. **สำคัญ:** เมื่อรันเสร็จ ให้เปิดไฟล์ Google Doc รายงานผล และคัดลอกค่า ID ต่างๆ เก็บไว้

## 3. การอัปเดต Config.gs
**ขั้นตอน:**
1. เปิดไฟล์ `backend/Config.gs` ใน Script Editor
2. นำค่า Folder ID และ Spreadsheet ID ที่ได้จากข้อ 2 มาใส่ในตัวแปร `CONFIG`
   - `CONFIG.FOLDERS` (ใส่ ID ของโฟลเดอร์ต่างๆ)
   - `CONFIG.SHEET_TO_SS_ID` (ใส่ ID ของ Spreadsheet แต่ละไฟล์ตามชื่อ)
3. กด Save

## 4. การสร้าง Admin ครั้งแรก
**ขั้นตอน:**
1. ในไฟล์ `backend/Setup.gs` เลือกฟังก์ชัน `createInitialAdmin`
2. กด Run
3. ตรวจสอบใน Logs ว่าขึ้น "Admin user created successfully"
4. บัญชีเริ่มต้นคือ:
   - **Username:** `admin`
   - **Password:** `admin1234`

## 5. การ Deploy Web App (Backend & Frontend)
**ขั้นตอน:**
1. นำไฟล์ **ทั้งหมด** ในโฟลเดอร์ `backend` และ `frontend` ของโปรเจกต์ ไปใส่ใน Google Apps Script Editor
   - ไฟล์ `.gs` (Backend) ให้สร้างเป็น Script file
   - ไฟล์ `.html` และ `.js` (Frontend) ให้สร้างเป็น HTML file
2. กดปุ่ม **Deploy** (มุมขวาบน) -> **New deployment**
3. **Select type:** Web app
4. **Configuration:**
   - **Description:** Version 1.0.0
   - **Execute as:** Me (อีเมลของคุณ)
   - **Who has access:** Anyone within [Your Domain] (หรือ Anyone with Google Account ตามนโยบาย)
5. กด **Deploy**
6. คัดลอก **Web App URL** ที่ได้ (ลงท้ายด้วย `/exec`)

## 6. การตั้งค่า Frontend Config
**ขั้นตอน:**
1. เปิดไฟล์ `frontend/config.js` ใน Script Editor (หรือในเครื่องก่อนอัปโหลด)
2. แก้ไขค่า `API_BASE_URL` ให้เป็น URL ที่ได้จากข้อ 5
   ```javascript
   const CONFIG = {
     API_BASE_URL: 'https://script.google.com/macros/s/AKfycbx.../exec',
     ...
   };
   ```
3. กด Save
4. ทำการ Deploy อีกครั้ง (**Manage deployments** -> **Edit** -> **New version** -> **Deploy**) เพื่อให้ค่า Config ใหม่มีผล

## 7. เริ่มใช้งาน
1. เข้าไปที่ Web App URL ผ่าน Browser
2. ล็อคอินด้วย `admin` / `admin1234`
3. ระบบจะบังคับให้เปลี่ยนรหัสผ่านทันทีเมื่อเข้าใช้งานครั้งแรก
4. เข้าสู่หน้า Dashboard และเริ่มตั้งค่าอื่นๆ เช่น ข้อมูลรถ หรือ พนักงานขับรถ

---
**หมายเหตุ:** หากมีการแก้ไขโค้ดใดๆ ต้องทำการ Deploy เป็น **New version** เสมอ เพื่อให้ผู้ใช้งานเห็นหน้าเว็บที่อัปเดตล่าสุด
