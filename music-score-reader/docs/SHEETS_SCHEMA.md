# Google Sheets Schema
โครงสร้างข้อมูลสำหรับโปรแกรมอ่านโน้ตเพลงเพื่อการศึกษา

## Sheet: Users
ตารางผู้ใช้

| Column | Type | Description |
|--------|------|-------------|
| user_id | String (UUID) | รหัสผู้ใช้ (Primary Key) |
| email | String | อีเมล |
| password | String | รหัสผ่าน (ควร hash) |
| role | String | admin \| user |
| created_at | DateTime | วันที่สร้าง |

**ตัวอย่างข้อมูล:**
```
user_id: 550e8400-e29b-41d4-a716-446655440000
email: admin@yourdomain.com
password: [hashed password]
role: admin
created_at: 2025-02-04T10:00:00Z
```

## Sheet: Scores
ตารางโน้ตเพลง

| Column | Type | Description |
|--------|------|-------------|
| score_id | String (UUID) | รหัสโน้ต (Primary Key) |
| title | String | ชื่อโน้ต |
| score_type | String | admin_public \| private_custom |
| visibility | String | public \| restricted \| hidden |
| owner_id | String (UUID) | รหัสเจ้าของ (Foreign Key -> Users) |
| file_id | String | Google Drive File ID |
| created_at | DateTime | วันที่สร้าง |

**score_type:**
- `admin_public`: โน้ตสาธารณะ (ปลอดภัย)
- `private_custom`: โน้ตส่วนบุคคล (เพลงฮิต)

**visibility:**
- `public`: ทุกคนดูได้
- `restricted`: เฉพาะผู้มี license
- `hidden`: ซ่อน (สำหรับ takedown)

**ตัวอย่างข้อมูล:**
```
score_id: 660e8400-e29b-41d4-a716-446655440001
title: เพลงสาธารณะตัวอย่าง
score_type: admin_public
visibility: public
owner_id: 550e8400-e29b-41d4-a716-446655440000
file_id: 1a2b3c4d5e6f7g8h9i0j
created_at: 2025-02-04T10:00:00Z
```

## Sheet: Licenses
ตารางสิทธิ์การเข้าถึง

| Column | Type | Description |
|--------|------|-------------|
| license_id | String (UUID) | รหัส license (Primary Key) |
| score_id | String (UUID) | รหัสโน้ต (Foreign Key -> Scores) |
| user_id | String (UUID) | รหัสผู้ใช้ (Foreign Key -> Users) |
| granted_at | DateTime | วันที่ให้สิทธิ์ |

**ตัวอย่างข้อมูล:**
```
license_id: 770e8400-e29b-41d4-a716-446655440002
score_id: 660e8400-e29b-41d4-a716-446655440001
user_id: 880e8400-e29b-41d4-a716-446655440003
granted_at: 2025-02-04T11:00:00Z
```

## Sheet: AccessLogs
ตารางบันทึกการเข้าถึง (เฉพาะ restricted scores)

| Column | Type | Description |
|--------|------|-------------|
| timestamp | DateTime | เวลาที่เข้าถึง |
| user_id | String (UUID) | รหัสผู้ใช้ |
| score_id | String (UUID) | รหัสโน้ต |
| ip_address | String | IP Address (optional) |

## Sheet: TakedownReports
ตารางรายงานละเมิดลิขสิทธิ์

| Column | Type | Description |
|--------|------|-------------|
| report_id | String (UUID) | รหัสรายงาน |
| score_id | String (UUID) | รหัสโน้ตที่ถูกรายงาน |
| reporter_email | String | อีเมลผู้รายงาน |
| reason | String | เหตุผล |
| evidence | String | หลักฐาน |
| status | String | pending \| reviewed \| resolved |
| created_at | DateTime | วันที่รายงาน |

## Sheet: TakedownLogs
ตารางบันทึกการดำเนินการ takedown

| Column | Type | Description |
|--------|------|-------------|
| timestamp | DateTime | เวลาที่ดำเนินการ |
| score_id | String (UUID) | รหัสโน้ต |
| action | String | hidden \| deleted \| restored |
| notes | String | หมายเหตุ |

## การตั้งค่า Google Sheets

1. สร้าง Google Spreadsheet ใหม่
2. สร้าง Sheets ตามชื่อข้างต้น
3. เพิ่ม Headers (แถวแรก) ตาม Schema
4. คัดลอก Sheet ID จาก URL
5. ตั้งค่า CONFIG.SHEET_ID ใน Code.gs

## หมายเหตุความปลอดภัย

- **Password**: ควร hash ก่อนเก็บในฐานข้อมูล (ใช้ Utilities.computeDigest หรือ library อื่น)
- **File ID**: เก็บเฉพาะ File ID ไม่เก็บ direct share link
- **Access Logs**: บันทึกเฉพาะ restricted scores เพื่อ audit trail
- **Takedown**: มีระบบ log การดำเนินการทั้งหมด
