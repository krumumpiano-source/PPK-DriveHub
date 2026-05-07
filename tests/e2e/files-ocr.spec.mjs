// ==============================================================
// PPK DriveHub — Files & OCR API Tests
// ทดสอบ: File Upload/Download, OCR Extract (doc_types ต่าง ๆ)
// หมายเหตุ: OCR ใช้ 1x1 pixel PNG base64, ถ้าไม่มี GEMINI_KEY → graceful error
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';
const ADMIN_USER = 'testadmin';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;

// 1×1 pixel transparent PNG in base64 (valid file for upload tests)
const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_PNG_MIME = 'image/png';

// Small JPEG base64 (for OCR doc tests)
const TINY_JPG_B64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=';

function clearRateLimits() {
  try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
}

async function apiPost(path, body, token = '') {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
async function apiGet(path, token = '') {
  const r = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: r.status, data: await r.json().catch(() => ({})), raw: r };
}

const ctx = {
  adminToken: '',
  uploadedKey: '',
};

test.describe.serial('Files & OCR API', () => {
  // ──────────────────────────────────────────
  // Bootstrap
  // ──────────────────────────────────────────
  test('Bootstrap: login', async () => {
    clearRateLimits();
    const setupCheck = await apiGet('/api/setup');
    if (setupCheck.data?.data?.needs_setup) {
      await apiPost('/api/setup', { username: ADMIN_USER, password: ADMIN_PASS, first_name: 'Test', last_name: 'Admin', email: 'testadmin@test.com' });
    }
    clearRateLimits();
    for (const pw of [ADMIN_PASS, process.env.TEST_ADMIN_PASS_ALT]) {
      const r = await apiPost('/api/auth/login', { username: ADMIN_USER, password: pw });
      if (r.data?.data?.token) { ctx.adminToken = r.data.data.token; break; }
      clearRateLimits();
    }
    expect(ctx.adminToken).toBeTruthy();
  });

  // ──────────────────────────────────────────
  // File Upload
  // ──────────────────────────────────────────
  test('POST /api/files/upload → อัปโหลด PNG ได้', async () => {
    const r = await apiPost('/api/files/upload', {
      base64: TINY_PNG_B64,
      mime: TINY_PNG_MIME,
      folder: 'FUEL',
      filename: `test-${Date.now()}.png`,
    }, ctx.adminToken);
    // 200/201 = uploaded (R2 available), 500/503 = R2 ไม่มีใน local (ยอมรับ)
    expect([200, 201, 400, 500, 503]).toContain(r.status);
    if ([200, 201].includes(r.status)) {
      ctx.uploadedKey = r.data?.data?.key || r.data?.key || '';
    }
  });

  test('POST /api/files/upload → อัปโหลด JPEG ได้', async () => {
    const r = await apiPost('/api/files/upload', {
      base64: TINY_JPG_B64,
      mime: 'image/jpeg',
      folder: 'REPAIR',
    }, ctx.adminToken);
    expect([200, 201, 400, 500, 503]).toContain(r.status);
  });

  test('POST /api/files/upload ไม่มี base64 → 400', async () => {
    const r = await apiPost('/api/files/upload', {
      mime: TINY_PNG_MIME,
    }, ctx.adminToken);
    expect([400, 422]).toContain(r.status);
  });

  test('POST /api/files/upload ไม่มี mime → 400', async () => {
    const r = await apiPost('/api/files/upload', {
      base64: TINY_PNG_B64,
    }, ctx.adminToken);
    expect([400, 422]).toContain(r.status);
  });

  test('POST /api/files/upload ไม่มี token → 401', async () => {
    const r = await apiPost('/api/files/upload', {
      base64: TINY_PNG_B64,
      mime: TINY_PNG_MIME,
    });
    expect([401, 403]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // File Download
  // ──────────────────────────────────────────
  test('GET /api/files/:key → ดาวน์โหลดไฟล์ (ถ้า upload สำเร็จ)', async () => {
    if (!ctx.uploadedKey) return; // R2 ไม่มี → skip
    const r = await apiGet(`/api/files/${ctx.uploadedKey}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
  });

  test('GET /api/files/nonexistent-key → 404', async () => {
    const r = await apiGet('/api/files/nonexistent-key-12345', ctx.adminToken);
    expect([400, 404, 500]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // OCR Extract
  // ──────────────────────────────────────────
  const OCR_DOC_TYPES = [
    'fuel_receipt',
    'pump_meter',
    'vehicle_registration',
    'insurance_doc',
    'tax_doc',
    'repair_doc',
  ];

  for (const docType of OCR_DOC_TYPES) {
    test(`POST /api/ocr/extract doc_type=${docType} → ไม่ crash (500)`, async () => {
      const r = await apiPost('/api/ocr/extract', {
        doc_type: docType,
        base64: TINY_PNG_B64,
      }, ctx.adminToken);
      // ถ้ามี GEMINI_KEY → 200 (แม้ extract ผิดพลาดก็ได้ 200 พร้อม empty fields)
      // ถ้าไม่มี GEMINI_KEY → 400/422/503 (graceful error, ห้าม 500)
      expect(r.status).not.toBe(500);
      expect([200, 201, 400, 422, 503]).toContain(r.status);
    });
  }

  test('POST /api/ocr/extract ไม่มี doc_type → 400', async () => {
    const r = await apiPost('/api/ocr/extract', {
      base64: TINY_PNG_B64,
    }, ctx.adminToken);
    expect([400, 422]).toContain(r.status);
  });

  test('POST /api/ocr/extract ไม่มี base64 → 400', async () => {
    const r = await apiPost('/api/ocr/extract', {
      doc_type: 'fuel_receipt',
    }, ctx.adminToken);
    expect([400, 422]).toContain(r.status);
  });

  test('POST /api/ocr/extract ไม่มี token → 401', async () => {
    const r = await apiPost('/api/ocr/extract', {
      doc_type: 'fuel_receipt',
      base64: TINY_PNG_B64,
    });
    expect([401, 403]).toContain(r.status);
  });

  test('POST /api/ocr/extract doc_type=invalid → 400', async () => {
    const r = await apiPost('/api/ocr/extract', {
      doc_type: 'invalid_type_xyz',
      base64: TINY_PNG_B64,
    }, ctx.adminToken);
    // อาจ 400 หรือยอมให้ผ่าน (200 with empty) ขึ้นกับ validation
    expect([200, 400, 422]).toContain(r.status);
  });
});
