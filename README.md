# PPK DriveHub — ระบบจัดการยานพาหนะโรงเรียนพะเยาพิทยาคม 2569

**Stack:** Vite · Cloudflare Pages · Cloudflare Workers · Cloudflare D1 SQLite

**Production:** https://ppk-drivehub.pages.dev

---

## การพัฒนา

```bash
npm install
npm run dev      # dev server (port 5173)
npm run build    # build → dist/
npm run deploy   # build + deploy to Cloudflare Pages
```

## โครงสร้างโปรเจกต์

```
src/
  *.html                           ← หน้าเว็บ (Vite multi-page)
  js/
    auth.js, api.js, nav.js, utils.js   ← shared modules
    pages/*.js                          ← page logic per-page
  css/
    base.css, nav.css, forms.css
functions/
  _helpers.js, _middleware.js
  api/
    _auth.js, _users.js, _drivers.js, _queue.js
    _check.js, _admin.js, _reports.js
    [[path]].js                    ← main router
migrations/                        ← D1 SQL schema & seed
public/
  config.js                        ← runtime config (API URL)
  offline-mock.js
dist/                              ← build output (auto-generated, gitignored)
```

## คุณสมบัติ

- **ระบบ Admin คนแรก** — คนแรกที่สมัครได้สิทธิ์ Admin อัตโนมัติ
- **จัดการคิวรถ** — เปิด/ปิดคิว, อนุมัติ, ติดตามสถานะ
- **QR Code** — บันทึกการใช้งาน, ตรวจเช็ครถประจำวัน, บันทึกน้ำมัน
- **RBAC** — roles: `admin`, `vehicle`, `fuel`, `repair`, `viewer`
- **รายงาน** — สรุปการใช้งาน, ค่าน้ำมัน, ประวัติซ่อม

---

_พัฒนาโดย ครูพงศธร โพธิแก้ว งานยานพาหนะโรงเรียนพะเยาพิทยาคม_