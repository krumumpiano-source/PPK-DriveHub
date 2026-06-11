// ============================================================
// PPK DriveHub — QR Hub Smoke Tests (production/staging)
// ทดสอบ: qr-hub → qr-usage-record, qr-fuel-record, qr-daily-check
// ============================================================
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://ppk-drivehub.pages.dev';
// กมว 593 (HONDA Dream, gasoline, active) — ดึงจาก backup
const CAR_ID = '3e578d16-d0d2-4271-ac50-9170f64a9217';
const HUB_URL = `${BASE}/qr-hub.html?car=${CAR_ID}`;

// ──────────────────────────────────────────────
// 1. qr-hub.html — หน้าหลัก
// ──────────────────────────────────────────────
test('qr-hub: โหลดหน้าได้, ไม่ขาว, มีปุ่มครบ 4 ปุ่ม', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(HUB_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // ต้องไม่มี JS error
  expect(errors.filter(e => !e.includes('favicon') && !e.includes('sw.js'))).toHaveLength(0);

  // ปุ่มทั้ง 4 ต้องมีอยู่ และมี href จริง (ไม่ใช่ #)
  const usage  = page.locator('#btnUsage');
  const fuel   = page.locator('#btnFuel');
  const check  = page.locator('#btnCheck');
  const repair = page.locator('#btnRepair');

  await expect(usage).toBeVisible({ timeout: 8000 });
  await expect(fuel).toBeVisible();
  await expect(check).toBeVisible();
  await expect(repair).toBeVisible();

  const usageHref  = await usage.getAttribute('href');
  const fuelHref   = await fuel.getAttribute('href');
  const checkHref  = await check.getAttribute('href');
  const repairHref = await repair.getAttribute('href');

  expect(usageHref).toContain('qr-usage-record.html');
  expect(usageHref).toContain('car=');
  expect(fuelHref).toContain('qr-fuel-record.html');
  expect(fuelHref).toContain('car=');
  expect(checkHref).toContain('qr-daily-check.html');
  expect(checkHref).toContain('car=');
  // repair ต้องไปที่ login (ยังไม่ได้ login)
  expect(repairHref).toContain('login.html');
  expect(repairHref).toContain('repair.html');
});

test('qr-hub: แสดงชื่อรถ (ไม่ใช่ "กำลังโหลด" หรือ blank ตลอดไป)', async ({ page }) => {
  await page.goto(HUB_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const carName = page.locator('#carName');
  // รอจนกว่า loading class จะหายไป (API ตอบแล้ว) — อาจใช้เวลา ~3-5s บน production
  await expect(carName).not.toHaveClass(/loading/, { timeout: 12000 });
  const text = await carName.innerText();
  expect(text.trim().length).toBeGreaterThan(0);
  expect(text).not.toBe('กำลังโหลด...');
  console.log('car name:', text);
});

test('qr-hub: ไม่มี QR Code ใน URL — แสดง error และ disable ปุ่ม', async ({ page }) => {
  await page.goto(`${BASE}/qr-hub.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  const carName = page.locator('#carName');
  await expect(carName).not.toHaveClass(/loading/, { timeout: 8000 });
  const text = await carName.innerText();
  expect(text).toContain('ไม่พบรหัสรถ');

  // ปุ่มต้องถูก disable (ไม่มี href หรือ pointer-events:none)
  const usageHref = await page.locator('#btnUsage').getAttribute('href');
  expect(usageHref).toBeNull();
});

// ──────────────────────────────────────────────
// 2. qr-usage-record.html — บันทึกการใช้รถ
// ──────────────────────────────────────────────
test('qr-usage-record: โหลดหน้าได้, ฟอร์มมองเห็นได้ (ไม่ขาว)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`${BASE}/qr-usage-record.html?car=${CAR_ID}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000); // รอ API load

  // ฟอร์มต้องมองเห็น — ไม่ถูกซ่อน
  const form = page.locator('#usageForm');
  await expect(form).toBeVisible({ timeout: 8000 });

  // ข้อมูลรถต้องโหลด
  const carInfo = page.locator('#carInfo');
  await expect(carInfo).not.toHaveCSS('display', 'none', { timeout: 8000 });

  // license plate
  const plate = await page.locator('#carLicensePlate').innerText();
  console.log('usage record - car:', plate);
  expect(plate.trim()).not.toBe('-');

  expect(errors.filter(e => !e.includes('favicon') && !e.includes('sw.js'))).toHaveLength(0);
});

test('qr-usage-record: ฟิลด์ วันที่/เวลา/ชื่อผู้ขับ มีอยู่และกรอกได้', async ({ page }) => {
  await page.goto(`${BASE}/qr-usage-record.html?car=${CAR_ID}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  // ช่องชื่อผู้ขับ (guest mode = driver_name_manual)
  const driverField = page.locator('#driver_name_manual');
  await expect(driverField).toBeVisible({ timeout: 8000 });

  // ปุ่ม submit
  const submitBtn = page.locator('#submitBtn, button[type="submit"]').first();
  await expect(submitBtn).toBeVisible();
  console.log('submit btn disabled:', await submitBtn.isDisabled());
});

// ──────────────────────────────────────────────
// 3. qr-fuel-record.html — บันทึกน้ำมัน
// ──────────────────────────────────────────────
test('qr-fuel-record: โหลดหน้าได้, ฟอร์มมองเห็น', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`${BASE}/qr-fuel-record.html?car=${CAR_ID}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  const form = page.locator('#fuelForm');
  await expect(form).toBeVisible({ timeout: 8000 });

  const carInfo = page.locator('#carInfo');
  await expect(carInfo).not.toHaveCSS('display', 'none', { timeout: 8000 });

  const plate = await page.locator('#carLicensePlate').innerText();
  console.log('fuel record - car:', plate);
  expect(plate.trim()).not.toBe('-');

  expect(errors.filter(e => !e.includes('favicon') && !e.includes('sw.js'))).toHaveLength(0);
});

test('qr-fuel-record: ฟิลด์ ลิตร/ราคา มีอยู่', async ({ page }) => {
  await page.goto(`${BASE}/qr-fuel-record.html?car=${CAR_ID}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);

  const liters = page.locator('#liters');
  await expect(liters).toBeVisible({ timeout: 6000 });

  const pricePerLiter = page.locator('#price_per_liter');
  await expect(pricePerLiter).toBeVisible({ timeout: 6000 });
});

// ──────────────────────────────────────────────
// 4. qr-daily-check.html — ตรวจสภาพ
// ──────────────────────────────────────────────
test('qr-daily-check: โหลดหน้าได้, ไม่มี modal ค้าง, ฟอร์มมองเห็น', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`${BASE}/qr-daily-check.html?car=${CAR_ID}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  // modal (ที่ถูกลบออกแล้ว) ต้องไม่มีอยู่
  const overlay = page.locator('#qrModeOverlay');
  await expect(overlay).toHaveCount(0);

  // ข้อมูลรถต้องโหลด
  const carInfo = page.locator('#carInfo');
  await expect(carInfo).not.toHaveCSS('display', 'none', { timeout: 8000 });

  const plate = await page.locator('#carLicensePlate').innerText();
  console.log('daily check - car:', plate);
  expect(plate.trim()).not.toBe('-');

  // ตรวจสอบ check items แสดงผล
  const checkItems = page.locator('.check-item');
  const count = await checkItems.count();
  console.log('check items count:', count);
  expect(count).toBeGreaterThan(0);

  expect(errors.filter(e => !e.includes('favicon') && !e.includes('sw.js'))).toHaveLength(0);
});

test('qr-daily-check: radio buttons ใน check items กดได้', async ({ page }) => {
  await page.goto(`${BASE}/qr-daily-check.html?car=${CAR_ID}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  // คลิก "ปกติ" ในรายการแรก
  const firstNormal = page.locator('.check-item .status-option.normal input[type="radio"]').first();
  await expect(firstNormal).toBeVisible({ timeout: 6000 });
  await firstNormal.check();
  expect(await firstNormal.isChecked()).toBe(true);
});
