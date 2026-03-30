// Historical Data Import Script — PPK DriveHub
// Parses usage CSVs + fuel CSV from Google Forms → generates SQL seed files
// Usage: node scripts/gen-historical-sql.mjs

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DOWNLOADS = 'C:\\Users\\krumu\\Downloads';

// ============================================================
// CSV FILES TO IMPORT
// ============================================================
const USAGE_FILES = [
  // สำเนา = older data (May–Sep 2025)
  { file: 'สำเนาของ บันทึกการใช้รถ กจ 5192 (การตอบกลับ) - บันทึกหลัก.csv', plate: 'กจ 5192' },
  { file: 'สำเนาของ บันทึกการใช้รถ นข 2455 (การตอบกลับ) - บันทึกหลัก.csv', plate: 'นข 2455' },
  { file: 'สำเนาของ บันทึกการใช้รถ นข 1977 (การตอบกลับ) - บันทึกหลัก.csv', plate: 'นข 1977' },
  { file: 'สำเนาของ บันทึกการใช้รถ นข 358 (การตอบกลับ) - บันทึกหลัก.csv', plate: 'นข 358' },
  { file: 'สำเนาของ บันทึกการใช้รถ 40-0062 (การตอบกลับ) - บันทึกหลัก.csv', plate: '40-0062' },
  { file: 'สำเนาของ บันทึกการใช้รถ 40-0158 (การตอบกลับ) - บันทึกหลัก.csv', plate: '40-0158' },
  // Original = newer data (Oct 2025+)
  { file: 'บันทึกการใช้รถ กจ 5192 (การตอบกลับ) - บันทึกหลัก.csv', plate: 'กจ 5192' },
  { file: 'บันทึกการใช้รถ นข 2455 (การตอบกลับ) - บันทึกหลัก.csv', plate: 'นข 2455' },
  { file: 'บันทึกการใช้รถ นข 1977 (การตอบกลับ) - บันทึกหลัก.csv', plate: 'นข 1977' },
  { file: 'บันทึกการใช้รถ นข 358 (การตอบกลับ) - บันทึกหลัก.csv', plate: 'นข 358' },
  { file: 'บันทึกการใช้รถ นข 3816 (การตอบกลับ) - บันทึกหลัก.csv', plate: 'นข 3816' },
  { file: 'บันทึกการใช้รถ 40-0062 (การตอบกลับ) - บันทึกหลัก.csv', plate: '40-0062' },
  { file: 'บันทึกการใช้รถ 40-0158 (การตอบกลับ) - บันทึกหลัก.csv', plate: '40-0158' },
];

const FUEL_FILE = 'แบบบันทึกการเติมน้ำมัน (การตอบกลับ) - บันทึกน้ำมัน.csv';

// ============================================================
// CSV PARSER (handles quoted fields with commas)
// ============================================================
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch; // preserve quotes for field parser
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      // skip
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  return lines.map(line => {
    const fields = [];
    let field = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { field += '"'; i++; }
        else { q = !q; }
      } else if (ch === ',' && !q) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  });
}

// ============================================================
// DATE PARSER: "D/M/YYYY, H:MM:SS" → "YYYY-MM-DD HH:MM:SS"
// ============================================================
function parseThaiDate(str) {
  if (!str || str === '-' || str === '') return null;

  // Handle "ลืมบันทึก..." — these are late returns, use timestamp instead
  if (str.includes('ลืมบันทึก')) return null;

  const m = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s*(\d{1,2}):(\d{2}):?(\d{2})?)?/);
  if (!m) return null;

  const day = m[1].padStart(2, '0');
  const month = m[2].padStart(2, '0');
  const year = parseInt(m[3]);
  // Convert Buddhist Era to CE if year > 2500
  const ceYear = year > 2500 ? year - 543 : year;
  const hour = (m[4] || '0').padStart(2, '0');
  const min = (m[5] || '00').padStart(2, '0');
  const sec = (m[6] || '00').padStart(2, '0');

  return `${ceYear}-${month}-${day} ${hour}:${min}:${sec}`;
}

// ============================================================
// DRIVER NAME CLEANER: remove suffixes like "(สำรอง1)", "(เฉพาะกิจ พัสดุ)"
// ============================================================
function cleanDriverName(name) {
  if (!name || name === '-') return null;
  // Remove prefix นาย/นาง/น.ส.
  let clean = name.replace(/^(นาย|นาง|น\.ส\.|นางสาว)\s*/g, '').trim();
  // Remove suffix in parentheses
  clean = clean.replace(/\s*\(.*?\)\s*/g, '').trim();
  // Remove double spaces
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean || null;
}

// ============================================================
// ESCAPE SQL STRING
// ============================================================
function esc(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ============================================================
// PROCESS USAGE FILES
// ============================================================
function processUsageFiles() {
  const stmts = [];
  const seen = new Set(); // dedup by (plate, datetime, record_type)

  stmts.push('-- Historical Usage Records Import');
  stmts.push('-- Generated: ' + new Date().toISOString());
  stmts.push('');

  for (const { file, plate } of USAGE_FILES) {
    const filePath = join(DOWNLOADS, file);
    let text;
    try {
      text = readFileSync(filePath, 'utf-8');
    } catch (e) {
      console.warn(`SKIP: ${file} — ${e.message}`);
      continue;
    }

    const rows = parseCSV(text);
    const header = rows[0]; // ประทับเวลา,พนักงานขับรถ,สถานะ,วันที่,ผู้ขอใช้รถ,สถานที่ไป,เลขไมล์รถ,ระยะทางรวม
    console.log(`Processing: ${plate} — ${rows.length - 1} rows`);
    stmts.push(`-- Vehicle: ${plate} (${file})`);

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length < 3) continue;

      const [timestamp, driverRaw, status, dateStr, requester, location, mileageStr, distStr] = r;

      // GAP RECORD
      if (status === 'ไม่มีการบันทึกข้อมูล') {
        const gapKm = parseInt(distStr) || 0;
        if (gapKm <= 0) continue;
        const id = uuid();
        // Use previous record's date if available, or skip
        let gapDate = null;
        for (let j = i - 1; j >= 1; j--) {
          gapDate = parseThaiDate(rows[j][3]) || parseThaiDate(rows[j][0]);
          if (gapDate) break;
        }
        if (!gapDate) gapDate = '2025-01-01 00:00:00'; // fallback

        stmts.push(
          `INSERT OR IGNORE INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, data_quality, auto_notes, is_historical, created_at)` +
          ` VALUES (${esc(id)}, (SELECT id FROM cars WHERE license_plate = ${esc(plate)}), NULL, 'departure', ${esc(gapDate)}, NULL, '', '', 'gap_record', ${esc('ช่องว่างข้อมูล ' + gapKm + ' กม.')}, 1, ${esc(new Date().toISOString())});`
        );
        continue;
      }

      // NORMAL RECORDS (departure / return)
      const driver = cleanDriverName(driverRaw);
      const dt = parseThaiDate(dateStr) || parseThaiDate(timestamp);
      if (!dt) continue;

      let recordType;
      let dataQuality = 'normal';

      if (status === 'ก่อนออกเดินทาง') {
        recordType = 'departure';
      } else if (status === 'กลับมาจากเดินทาง') {
        recordType = 'return';
      } else {
        continue; // Unknown status
      }

      // Late return detection: dateStr contains "ลืมบันทึก"
      if (dateStr && dateStr.includes('ลืมบันทึก')) {
        dataQuality = 'late_return';
      }

      // Dedup
      const dedupKey = `${plate}|${dt}|${recordType}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const mileage = parseInt(mileageStr);
      const mileageVal = isNaN(mileage) ? 'NULL' : mileage;
      const id = uuid();
      const reqName = requester && requester !== '-' ? requester : null;
      const loc = location && location !== '-' ? location : '';

      const driverSql = driver
        ? `(SELECT id FROM drivers WHERE name LIKE ${esc('%' + driver + '%')} LIMIT 1)`
        : 'NULL';

      stmts.push(
        `INSERT OR IGNORE INTO usage_records (id, car_id, driver_id, record_type, datetime, mileage, location, notes, data_quality, requester_name, is_historical, created_at)` +
        ` VALUES (${esc(id)}, (SELECT id FROM cars WHERE license_plate = ${esc(plate)}), ${driverSql}, ${esc(recordType)}, ${esc(dt)}, ${mileageVal}, ${esc(loc)}, '', ${esc(dataQuality)}, ${esc(reqName)}, 1, ${esc(new Date().toISOString())});`
      );
    }

    stmts.push('');
  }

  // Detect departure_only: departures without a matching return
  stmts.push('-- Post-import: mark departure_only records');
  stmts.push(`UPDATE usage_records SET data_quality = 'departure_only' WHERE is_historical = 1 AND record_type = 'departure' AND data_quality = 'normal' AND id NOT IN (SELECT ur1.id FROM usage_records ur1 INNER JOIN usage_records ur2 ON ur1.car_id = ur2.car_id AND ur2.record_type = 'return' AND ur2.datetime > ur1.datetime AND ur2.datetime <= datetime(ur1.datetime, '+24 hours') WHERE ur1.is_historical = 1 AND ur1.record_type = 'departure' AND ur1.data_quality = 'normal');`);
  stmts.push('');

  return stmts.join('\n');
}

// ============================================================
// PROCESS FUEL FILE
// ============================================================
function processFuelFile() {
  const stmts = [];
  const filePath = join(DOWNLOADS, FUEL_FILE);
  let text;
  try {
    text = readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.warn(`SKIP fuel: ${e.message}`);
    return '';
  }

  const rows = parseCSV(text);
  console.log(`Processing fuel: ${rows.length - 1} rows`);

  stmts.push('-- Historical Fuel Log Import');
  stmts.push('-- Generated: ' + new Date().toISOString());
  stmts.push('');

  // Header: ประทับเวลา, อีเมล, ประเภทของการเบิกน้ำมัน, วัตถุประสงค์, วันที่เติม,
  //          หมายเลขรถ, ประเภทน้ำมัน, จำนวนลิตร, ราคาต่อลิตร, ราคาทั้งหมด,
  //          เลขไมล์, ผู้นำรถไปเติม, แนบรูปใบเสร็จ, สถานะ

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 10) continue;

    const [timestamp, , expenseTypeRaw, purpose, dateStr, plateRaw, fuelTypeRaw,
           litersStr, pricePerLiterStr, totalAmountStr, mileageStr, driverName] = r;

    const plate = plateRaw?.trim();
    if (!plate) continue;

    const dt = parseThaiDate(dateStr) || parseThaiDate(timestamp);
    if (!dt) continue;
    const dateOnly = dt.substring(0, 10);

    // Parse numeric values
    let liters = parseFloat(litersStr);
    let ppl = parseFloat(pricePerLiterStr);
    let total = parseFloat(totalAmountStr);

    if (isNaN(liters) || liters <= 0) continue; // Skip if no liters

    // Calculate missing price
    if (isNaN(ppl) && !isNaN(total) && liters > 0) {
      ppl = Math.round((total / liters) * 100) / 100;
    }
    if (isNaN(total) && !isNaN(ppl)) {
      total = Math.round(liters * ppl * 100) / 100;
    }

    // Mileage
    const mileageClean = mileageStr?.replace(/[,\s]/g, '');
    const mileage = parseInt(mileageClean);
    const mileageVal = isNaN(mileage) ? 'NULL' : mileage;

    // Expense type
    const expenseType = expenseTypeRaw?.includes('เบิกน้ำมันปกติ') ? 'procurement' : 'official_travel';

    // Normalize fuel type
    let fuelType = 'diesel';
    if (fuelTypeRaw) {
      const ft = fuelTypeRaw.toLowerCase();
      if (ft.includes('แก๊สโซฮอล์') || ft.includes('gasohol') || ft.includes('เบนซิน')) {
        fuelType = ft.includes('95') ? 'gasohol_95' : ft.includes('91') ? 'gasohol_91' : 'gasohol_95';
      } else {
        fuelType = 'diesel';
      }
    }

    // Driver
    const driver = cleanDriverName(driverName);
    const driverSql = driver
      ? `(SELECT id FROM drivers WHERE name LIKE ${esc('%' + driver + '%')} LIMIT 1)`
      : 'NULL';

    const id = uuid();
    stmts.push(
      `INSERT OR IGNORE INTO fuel_log (id, date, car_id, driver_id, mileage_before, liters, price_per_liter, amount, fuel_type, expense_type, notes, created_at)` +
      ` VALUES (${esc(id)}, ${esc(dateOnly)}, (SELECT id FROM cars WHERE license_plate = ${esc(plate)}), ${driverSql}, ${mileageVal}, ${liters}, ${isNaN(ppl) ? 'NULL' : ppl}, ${isNaN(total) ? 'NULL' : total}, ${esc(fuelType)}, ${esc(expenseType)}, ${esc('Import: ' + (purpose || ''))}, ${esc(new Date().toISOString())});`
    );
  }

  stmts.push('');
  return stmts.join('\n');
}

// ============================================================
// MAIN
// ============================================================
const outputDir = join(process.cwd(), 'migrations');

console.log('=== Generating Historical Usage SQL ===');
const usageSql = processUsageFiles();
writeFileSync(join(outputDir, 'seed-historical-usage.sql'), usageSql, 'utf-8');
console.log(`Wrote: migrations/seed-historical-usage.sql`);

console.log('\n=== Generating Historical Fuel SQL ===');
const fuelSql = processFuelFile();
writeFileSync(join(outputDir, 'seed-historical-fuel.sql'), fuelSql, 'utf-8');
console.log(`Wrote: migrations/seed-historical-fuel.sql`);

console.log('\nDone! Run these with:');
console.log('  npx wrangler d1 execute ppk-drivehub --file=migrations/seed-historical-usage.sql');
console.log('  npx wrangler d1 execute ppk-drivehub --file=migrations/seed-historical-fuel.sql');
