# การตั้งค่าความลับ (Script Properties) ก่อน Deploy

**โปรเจกต์:** PPK DriveHub  
**ตามรายงาน:** Security & PDPA Report, QA Acceptance Report

---

## เหตุผล

ความลับ (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) **ไม่เก็บใน Config.gs** แล้ว เพื่อไม่ให้รั่วไหลเมื่อ commit ลง repo หรือแชร์โค้ด  
ระบบจะอ่านค่าจาก **Script Properties** ของโปรเจกต์ GAS แทน

---

## ขั้นตอนตั้งค่าใน Google Apps Script

1. เปิดโปรเจกต์ใน [Google Apps Script](https://script.google.com)
2. ไปที่ **Project Settings** (ไอคอนฟันเฟือง) → **Script Properties**
3. คลิก **Add script property** แล้วเพิ่ม:

| Property | ค่า | หมายเหตุ |
|----------|-----|----------|
| `TELEGRAM_BOT_TOKEN` | โทเค็นจาก BotFather | ใช้ส่งการแจ้งเตือนผ่าน Telegram |
| `TELEGRAM_CHAT_ID` | รหัสห้องแชท/กลุ่ม | รับข้อความแจ้งเตือน |

4. บันทึก (Save)

---

## การทำงานของระบบ

- เมื่อสคริปต์รัน ฟังก์ชัน `loadConfigSecrets()` ใน Config.gs จะโหลดค่าจาก Script Properties มาใส่ใน `CONFIG.TELEGRAM_BOT_TOKEN` และ `CONFIG.TELEGRAM_CHAT_ID`
- ถ้า**ไม่ตั้งค่า** Script Properties ฟีเจอร์ Telegram (การแจ้งเตือนผ่าน Telegram) จะไม่ทำงาน ส่วนอื่นของระบบทำงานได้ตามปกติ

---

## หมายเหตุ

- **ห้าม** commit ค่า TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID จริงลงใน Config.gs หรือ repo
- เอกสารนี้ใช้สำหรับผู้ deploy เท่านั้น ไม่ควรเผยแพร่ค่าจริง
