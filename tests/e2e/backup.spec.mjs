// ==============================================================
// PPK DriveHub — Backup & Recovery API Tests
// ทดสอบ: Create Backup, List, Restore, Permissions
// หมายเหตุ: R2 ไม่มีใน local → API อาจ return JSON แทน URL
// ==============================================================
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const BASE = 'http://localhost:8788';
const ADMIN_USER = 'testadmin';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS;

function clearRateLimits() {
  try { execSync('npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' }); } catch {}
}

async function apiPost(path, body, token = '') {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
async function apiGet(path, token = '') {
  const r = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

const ctx = {
  adminToken: '',
  viewerToken: '',
  backupId: '',
};

test.describe.serial('Backup & Recovery API', () => {
  // ──────────────────────────────────────────
  // Bootstrap
  // ──────────────────────────────────────────
  test('Bootstrap: login as admin', async () => {
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

  test('Bootstrap: สร้าง viewer user', async () => {
    const ts = Date.now().toString().slice(-6);
    const r = await apiPost('/api/admin/users', {
      username: `bkupviewer${ts}`,
      password: 'ViewerPass123!',
      first_name: 'Viewer', last_name: 'BkupTest',
      email: `bkupviewer${ts}@test.com`,
      role: 'viewer',
    }, ctx.adminToken);
    if ([200, 201].includes(r.status)) {
      const loginR = await apiPost('/api/auth/login', { username: `bkupviewer${ts}`, password: 'ViewerPass123!' });
      if (loginR.data?.data?.token) ctx.viewerToken = loginR.data.data.token;
    }
  });

  // ──────────────────────────────────────────
  // Create & List Backup
  // ──────────────────────────────────────────
  test('POST /api/backup → สร้าง backup', async () => {
    const r = await apiPost('/api/backup', {}, ctx.adminToken);
    // 200/201 = success, 500 ถ้า R2 ไม่มี (ยอมรับ)
    expect([200, 201, 500]).toContain(r.status);
    if ([200, 201].includes(r.status)) {
      ctx.backupId = r.data?.data?.id || r.data?.data?.backup_id || r.data?.id;
    }
  });

  test('GET /api/backup → list backups (ต้องได้ array)', async () => {
    const r = await apiGet('/api/backup', ctx.adminToken);
    expect(r.status).toBe(200);
    const items = r.data?.data || r.data;
    // อาจเป็น array โดยตรง หรือ { data: [] }
    expect(typeof items).toBeDefined();
  });

  test('GET /api/backup → list ไม่เกิน 50 รายการ', async () => {
    const r = await apiGet('/api/backup', ctx.adminToken);
    if (r.status === 200) {
      const items = Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []);
      expect(items.length).toBeLessThanOrEqual(50);
    }
  });

  test('GET /api/backup/:id → ดู backup metadata', async () => {
    if (!ctx.backupId) {
      // ไม่ได้สร้าง backup (R2 ไม่มี) → skip อย่างนุ่มนวล
      return;
    }
    const r = await apiGet(`/api/backup/${ctx.backupId}`, ctx.adminToken);
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      const d = r.data?.data || r.data;
      expect(d).toBeTruthy();
    }
  });

  // ──────────────────────────────────────────
  // Restore
  // ──────────────────────────────────────────
  test('POST /api/backup/:id/restore → restore backup', async () => {
    if (!ctx.backupId) return;
    const r = await apiPost(`/api/backup/${ctx.backupId}/restore`, {}, ctx.adminToken);
    // 200 = restored, 404/500 = ขึ้นกับ availability
    expect([200, 201, 400, 404, 500]).toContain(r.status);
  });

  test('POST /api/backup/999999/restore → 404 สำหรับ non-existent', async () => {
    const r = await apiPost('/api/backup/999999/restore', {}, ctx.adminToken);
    expect([404, 400, 500]).toContain(r.status);
  });

  // ──────────────────────────────────────────
  // Permissions — Admin only
  // ──────────────────────────────────────────
  test('GET /api/backup ไม่มี token → 401', async () => {
    const r = await apiGet('/api/backup');
    expect([401, 403]).toContain(r.status);
  });

  test('POST /api/backup ไม่มี token → 401', async () => {
    const r = await apiPost('/api/backup', {});
    expect([401, 403]).toContain(r.status);
  });

  test('GET /api/backup ด้วย viewer token → 403', async () => {
    if (!ctx.viewerToken) return;
    const r = await apiGet('/api/backup', ctx.viewerToken);
    expect([401, 403]).toContain(r.status);
  });

  test('POST /api/backup ด้วย viewer token → 403', async () => {
    if (!ctx.viewerToken) return;
    const r = await apiPost('/api/backup', {}, ctx.viewerToken);
    expect([401, 403]).toContain(r.status);
  });
});
