/**
 * PPK DriveHub - Google Apps Script Email Webhook
 * 
 * วิธีติดตั้ง (ฟรี 100% ผ่าน Google Workspace / Gmail โรงเรียน):
 * 1. ไปที่ https://script.google.com ด้วยอีเมลของโรงเรียน หรืออีเมลแอดมิน
 * 2. กด "โครงการใหม่" (New Project)
 * 3. ลบโค้ดเดิมออกทั้งหมด แล้ววางโค้ดชุดนี้ลงไป
 * 4. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 5. เลือกประเภท: "เว็บแอปพลิเคชัน" (Web app)
 *    - คำอธิบาย: PPK DriveHub Email Service
 *    - ดำเนินการในฐานะ: ตัวฉัน (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)  <-- สำคัญมาก! เพื่อให้ระบบ Cloudflare ส่งข้อมูลเข้ามาได้
 * 6. กด "ทำให้ใช้งานได้" (Deploy) แล้วอนุญาตสิทธิ์ (Authorize access)
 * 7. คัดลอก URL ของเว็บแอปพลิเคชัน (ขึ้นต้นด้วย https://script.google.com/macros/s/.../exec)
 * 8. นำ URL ไปตั้งเป็น Environment Variable ใน Cloudflare Pages:
 *    - ชื่อตัวแปร: EMAIL_WEBHOOK_URL
 *    - ค่า: <URL ที่คัดลอกมา>
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No payload provided' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var to = data.to;
    var subject = data.subject || '[PPK DriveHub] แจ้งเตือนระบบ';
    var text = data.text || data.body || '';
    var html = data.html || text;

    if (!to) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Missing "to" email address' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: text,
      htmlBody: html,
      name: 'PPK DriveHub - งานยานพาหนะโรงเรียนพะเยาพิทยาคม'
    });

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Email sent successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', service: 'PPK DriveHub Email Webhook' }))
    .setMimeType(ContentService.MimeType.JSON);
}
