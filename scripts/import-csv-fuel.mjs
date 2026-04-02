/**
 * import-csv-fuel.mjs
 * อ่านไฟล์ CSV จาก Google Forms → สร้าง SQL INSERT สำหรับ fuel_log
 * เฉพาะรายการที่ยังไม่มีในระบบ
 *
 * Usage: node scripts/import-csv-fuel.mjs <path-to-csv>
 * Output: migrations/import-fuel-historical.sql
 */
import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const csvPath = process.argv[2];
if (!csvPath) { console.error('Usage: node scripts/import-csv-fuel.mjs <csv-path>'); process.exit(1); }

// ── Mappings from production DB ──
const CAR_MAP = {
  '40-0062':  'd1def56d-493a-47d6-a164-8d99c7ab44bd',
  '40-0158':  '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  'กจ 5192':  '97d66518-d511-4ae2-abcb-54a491b5f13c',
  'นข 1977':  'b43ad8e2-04d0-40e0-90ab-d598bf44282d',
  'นข 2455':  'd5685d4b-914f-4140-8de6-6050a514ae9b',
  'นข 358':   'b7ee9471-dda3-45a5-94b0-605980a5214b',
  'นข 3816':  'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
};

const DRIVER_MAP = {
  'นายณัฐวุฒิ ใหญ่วงค์':   'b494cfd8-7cd6-4801-8e1f-db14de8866c7',
  'นายสมชาย พรมศร':       '0ac38057-2288-4cf8-a2a0-3303cb21be15',
  'นายชารี ศรีพรม':        '91e0301c-4cd3-4cf5-ba0d-6c69788f9d5a',
  'นายสุรเชษฐ์  บุริวงศ์':  '29954b0c-8089-4560-adad-f9d724fba7e4',
  'นายสุรเชษฐ์ บุริวงศ์':   '29954b0c-8089-4560-adad-f9d724fba7e4',
};

const EXPENSE_MAP = {
  'เบิกน้ำมันปกติด้วยใบสั่งจ่ายน้ำมัน': 'procurement',
  'เติมน้ำมันระหว่างทางด้วยงบจากการเบิกไปราชการ': 'official_travel',
};

const PURPOSE_MAP = {
  'ภารกิจโดยสารของโรงเรียน': 'school_passenger',
};

// ── Existing records from production (for dedup) ──
// Populated from query: SELECT date, license_plate, liters, amount
const EXISTING = new Set();
const existingData = `2025-03-18|นข 3816|49.89|2100
2025-03-20|กจ 5192|70.15|3500
2025-03-20|นข 358|51.01|1720
2025-03-24|นข 1977|15.64|780
2025-03-27|นข 3816|28.26|1410
2025-03-28|นข 1977|49.957|1750
2025-03-29|นข 1977|51.754|1770
2025-03-29|นข 1977|50.13|1740
2025-03-29|นข 1977|20.04|1000
2025-04-01|นข 2455|34.07|1700
2025-04-04|40-0158|60.13|3000
2025-04-05|นข 2455|41.29|2060
2025-04-05|นข 3816|38|1900
2025-04-09|กจ 5192|90.2|4500
2025-04-24|นข 1977|50.11|2500
2025-04-24|นข 3816|48.11|2400
2025-04-30|นข 1977|40.09|2000
2025-05-01|40-0062|70.9|2320
2025-05-02|นข 1977|54.12|2700
2025-05-03|นข 1977|20.05|1000
2025-05-05|นข 1977|48.11|2400
2025-05-13|นข 1977|34.07|1700
2025-05-13|นข 2455|56.12|2800
2025-05-19|กจ 5192|62.14|3100
2025-05-22|นข 1977|42.1|2100
2025-05-22|นข 1977|42.09|2100
2025-05-30|นข 2455|54.12|2700
2025-06-04|นข 1977|42.1|2100
2025-06-04|นข 2455|34.07|1700
2025-06-10|นข 1977|54.12|2700
2025-06-11|นข 2455|32.07|1600
2025-06-16|นข 1977|46.11|2300
2025-06-19|กจ 5192|22.05|1100
2025-06-25|นข 1977|44.1|2200
2025-06-26|นข 1977|44.1|2200
2025-06-27|40-0062|36.98|1210
2025-06-28|40-0158|54.12|2700
2025-07-01|นข 1977|36.08|1800
2025-07-01|40-0158|64.14|3200
2025-07-07|นข 2455|51.11|2550
2025-07-08|นข 3816|44.1|2200
2025-07-09|นข 2455|32.07|1600
2025-07-09|นข 2455|32.07|1600
2025-07-16|นข 3816|42.09|2100
2025-07-21|นข 2455|40.09|2000
2025-07-21|กจ 5192|10.13|3000
2025-07-24|40-0158|39.49|1970
2025-07-24|นข 2455|24.05|1200
2025-07-26|นข 2455|30.07|1500
2025-07-29|นข 3816|48.11|2400
2025-07-29|40-0158|56.12|2800
2025-07-30|นข 2455|34.88|1740
2025-07-31|40-0062|51.96|1700
2025-08-05|40-0158|82.42|3700
2025-08-08|นข 2455|48.11|2400
2025-08-08|นข 3816|44.55|2000
2025-08-09|นข 1977|49.01|2200
2025-08-12|นข 2455|15.6|700
2025-08-13|40-0158|73.51|3300
2025-08-13|40-0158|73.51|3300
2025-08-13|นข 1977|14.48|650
2025-08-18|40-0158|59.48|2670
2025-08-19|นข 2455|46.78|2100
2025-08-19|กจ 5192|51.24|2300
2025-08-20|นข 3816|44.55|2000
2025-08-22|40-0062|45.84|1500
2025-08-25|นข 1977|37.87|1700
2025-08-25|นข 3816|42.33|1900
2025-08-25|นข 2455|49.9|2240
2025-08-26|นข 1977|44.56|2000
2025-08-27|นข 358|57.47|2580
2025-08-28|นข 2455|37.21|1670
2025-08-28|กจ 5192|64.6|2900
2025-09-02|นข 1977|28.96|1300
2025-09-03|นข 3816|26.73|1200
2025-09-03|นข 3816|26.73|1200
2025-09-05|นข 1977|40.1|1800
2025-09-10|40-0062|51.92|1700
2025-09-10|นข 3816|31.19|1400
2025-09-11|นข 1977|44.56|2000
2025-09-11|40-0158|64.6|2900
2025-09-14|40-0158|15.59|700
2025-09-15|นข 3816|44.55|2000
2025-09-16|40-0158|60.15|2700
2025-09-16|นข 2455|57.03|2560.1
2025-09-18|กจ 5192|63.27|2840
2025-09-19|40-0062|65.71|2150
2025-09-24|นข 3816|55.69|2500
2025-09-24|นข 2455|41.66|1870
2025-09-25|นข 1977|24.5|1100
2025-09-27|นข 2455|35.64|1600
2025-09-29|นข 1977|47.45|2130
2025-09-30|กจ 5192|55.7|2500
2025-10-01|นข 3816|46.78|2100
2025-10-04|นข 2455|49.68|2230
2025-10-09|นข 2455|40.77|1830.2
2025-10-10|นข 3816|46.78|2100
2025-10-10|นข 1977|33.42|1500
2025-10-14|กจ 5192|57.92|2600
2025-10-18|กจ 5192|31.19|1400
2025-10-18|นข 1977|24.5|1100.3
2025-10-20|กจ 5192|49|2200
2025-10-20|นข 1977|24.5|1100
2025-10-22|กจ 5192|44.55|2000
2025-10-24|นข 1977|44.55|2000
2025-10-25|นข 2455|36.76|1650.2
2025-10-25|40-0158|86.88|3900
2025-10-25|กจ 5192|52.35|2350
2025-10-28|นข 1977|55.69|2500
2025-10-29|นข 3816|51.24|2300
2025-10-29|กจ 5192|55.69|2500
2025-10-30|นข 2455|56.58|2540
2025-10-31|40-0158|57.92|2600
2025-10-31|40-0158|57.92|2600
2025-10-31|นข 2455|53.47|2400
2025-11-04|นข 3816|33.42|1500
2025-11-04|นข 1977|35.64|1600
2025-11-06|นข 2455|55.69|2500
2025-11-11|นข 3816|31.19|1400
2025-11-11|นข 1977|26.73|1200.4
2025-11-13|นข 2455|40.1|1800
2025-11-17|นข 3816|40.01|2200
2025-11-20|นข 1977|57.92|2600
2025-11-20|กจ 5192|46.78|2100
2025-11-21|นข 3816|22.28|1000
2025-11-21|นข 2455|37.87|1700
2025-11-22|40-0158|55.69|2500
2025-11-22|นข 3816|40.1|1800
2025-11-24|นข 3816|31.19|1400
2025-11-24|กจ 5192|19.78|3130
2025-11-25|40-0158|49.01|2200
2025-11-27|นข 1977|42.33|1900
2025-11-27|นข 3816|64.15|1700
2025-11-28|นข 2455|22.28|1000
2025-12-01|นข 2455|28.96|1300
2025-12-02|กจ 5192|63.26|2840
2025-12-02|40-0062|48.55|1540
2025-12-05|40-0158|28.96|1300
2025-12-09|กจ 5192|55.69|2500
2025-12-11|นข 2455|35.64|1600
2025-12-13|นข 1977|53.46|2400
2025-12-14|40-0158|66.83|3000
2025-12-15|นข 2455|39.21|71760
2025-12-16|นข 3816|33.42|1500
2025-12-17|40-0062|53.59|1700
2025-12-18|40-0158|46.78|2100
2025-12-19|40-0158|62.37|2800
2025-12-19|นข 3816|17.82|800
2025-12-20|40-0062|72.82|2310
2025-12-20|นข 2455|37.87|1700
2025-12-20|นข 3816|44.55|2000
2025-12-21|นข 1977|31.19|1400
2025-12-23|นข 3816|49.01|2200
2025-12-26|นข 1977|26.74|1200
2025-12-26|กจ 5192|60.15|2700
2025-12-26|นข 3816|40.1|1800
2025-12-27|นข 2455|22.28|1000
2025-12-28|นข 1977|35.64|1600
2025-12-28|นข 3816|31.19|1400
2025-12-29|40-0062|48.05|1500
2025-12-29|นข 358|62.37|2800
2025-12-29|นข 1977|33.42|1500
2025-12-30|นข 3816|44.55|2000
2026-01-03|นข 2455|40.1|1800
2026-01-03|40-0158|71.29|3200
2026-01-05|กจ 5192|73.51|3300
2026-01-06|นข 1977|42.33|1900`;

for (const line of existingData.split('\n')) {
  const [d, plate, lit, amt] = line.split('|');
  EXISTING.add(`${d}|${plate}|${lit}|${amt}`);
}

// ── Parse CSV ──
const raw = readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').filter(l => l.trim());
const rows = [];
for (let i = 1; i < lines.length; i++) {
  // CSV may have quoted fields with commas inside
  const parts = parseCSVLine(lines[i]);
  if (parts.length < 12) continue;
  rows.push({
    timestamp: parts[0],
    email: parts[1],
    expenseLabel: parts[2],
    purposeLabel: parts[3],
    fillDate: parts[4],
    plate: parts[5].trim(),
    fuelTypeName: parts[6],
    liters: parts[7],
    pricePerLiter: parts[8],
    totalCost: parts[9],
    mileage: parts[10],
    driverName: parts[11].trim(),
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

/** Convert DD/MM/YYYY → YYYY-MM-DD */
function toISO(dateStr) {
  const [d, m, y] = dateStr.trim().split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Generate document number: FUL-{พ.ศ.}-{MM}-{NNN} */
const docCounter = {};
function nextDocNum(isoDate) {
  const [y, m] = isoDate.split('-');
  const buddhistYear = parseInt(y) + 543;
  const key = `${buddhistYear}-${m}`;
  docCounter[key] = (docCounter[key] || 0) + 1;
  return `FUL-${buddhistYear}-${m}-${String(docCounter[key]).padStart(3, '0')}`;
}

/** Map fuel type name from CSV to a clean ID */
function mapFuelType(name) {
  const n = name.trim().toLowerCase();
  if (n.includes('แก๊สโซฮอล์ 95') || n.includes('แก๊สโซฮอล์95'))
    return 'แก๊สโซฮอล์ 95';
  if (n.includes('แก๊สโซฮอล์ 91'))
    return 'แก๊สโซฮอล์ 91';
  if (n.includes('ฟิวเชฟ') || n.includes('ฟิวเซฟ') || n.includes('ฟิวเซฟ'))
    return name.trim();
  if (n.includes('ดีเซล'))
    return name.trim();
  return name.trim();
}

function parseMileage(val) {
  if (!val) return null;
  const v = val.trim();
  if (v === '' || v === '-') return null;
  const num = parseFloat(v);
  if (isNaN(num)) return null; // text like "ผู้เบิกน้ำมันไม่บันทึกเลขไมล์"
  return Math.round(num);
}

function parseNum(val) {
  if (!val) return null;
  const v = val.trim();
  if (v === '' || v === '-') return null;
  const num = parseFloat(v);
  return isNaN(num) ? null : num;
}

function esc(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

// ── Process & Generate SQL ──
const inserts = [];
let skipped = 0;
let added = 0;
const warnings = [];

for (const row of rows) {
  const isoDate = toISO(row.fillDate);
  const liters = parseNum(row.liters);
  const amount = parseNum(row.totalCost);

  if (!liters || !amount) {
    warnings.push(`SKIP: no liters/amount — ${row.fillDate} ${row.plate}`);
    skipped++;
    continue;
  }

  // Dedup check
  const key = `${isoDate}|${row.plate}|${liters}|${amount}`;
  if (EXISTING.has(key)) {
    skipped++;
    continue;
  }
  // Mark as seen to avoid CSV-internal duplicates
  EXISTING.add(key);

  const carId = CAR_MAP[row.plate];
  if (!carId) {
    warnings.push(`WARN: unknown plate "${row.plate}" — ${row.fillDate}`);
    skipped++;
    continue;
  }

  // Driver lookup — handle "ผู้เบิกน้ำมันไม่บันทึกชื่อผู้เบิก" etc.
  let driverId = null;
  let driverManual = row.driverName;
  for (const [name, id] of Object.entries(DRIVER_MAP)) {
    if (row.driverName.includes(name.replace(/\s+/g, '').substring(0, 6)) ||
        name.includes(row.driverName.substring(0, 8))) {
      // More robust: check key parts of the name
    }
  }
  // Simpler matching
  if (row.driverName.includes('ณัฐวุฒิ')) driverId = DRIVER_MAP['นายณัฐวุฒิ ใหญ่วงค์'];
  else if (row.driverName.includes('สมชาย')) driverId = DRIVER_MAP['นายสมชาย พรมศร'];
  else if (row.driverName.includes('ชารี')) driverId = DRIVER_MAP['นายชารี ศรีพรม'];
  else if (row.driverName.includes('สุรเชษฐ์')) driverId = DRIVER_MAP['นายสุรเชษฐ์  บุริวงศ์'];

  const pricePerLiter = parseNum(row.pricePerLiter);
  const mileageAfter = parseMileage(row.mileage);
  const expenseType = EXPENSE_MAP[row.expenseLabel] || 'procurement';
  const purpose = PURPOSE_MAP[row.purposeLabel] || 'school_passenger';
  const fuelType = mapFuelType(row.fuelTypeName);
  const docNum = nextDocNum(isoDate);
  const id = randomUUID();

  // Parse timestamp for created_at
  let createdAt = isoDate + 'T00:00:00.000Z';
  if (row.timestamp) {
    // Format: "18/3/2025, 17:46:00" or "18/3/2025, 17:46:00"
    const tsParts = row.timestamp.trim().split(',');
    if (tsParts.length >= 2) {
      const tsDate = toISO(tsParts[0].trim());
      const tsTime = tsParts[1].trim();
      createdAt = `${tsDate}T${tsTime}.000Z`;
    }
  }

  const sql = `INSERT INTO fuel_log (id, date, car_id, driver_id, liters, price_per_liter, amount, fuel_type, expense_type, purpose, driver_name_manual, document_number, mileage_after, created_at, created_by, notes) VALUES (${esc(id)}, ${esc(isoDate)}, ${esc(carId)}, ${driverId ? esc(driverId) : 'NULL'}, ${liters}, ${pricePerLiter !== null ? pricePerLiter : 'NULL'}, ${amount}, ${esc(fuelType)}, ${esc(expenseType)}, ${esc(purpose)}, ${esc(driverManual)}, ${esc(docNum)}, ${mileageAfter !== null ? mileageAfter : 'NULL'}, ${esc(createdAt)}, 'csv-import', 'นำเข้าจาก Google Forms CSV');`;

  inserts.push(sql);
  added++;
}

// ── Write output ──
const header = `-- Import fuel records from Google Forms CSV
-- Generated: ${new Date().toISOString()}
-- New records: ${added}, Skipped (duplicates/errors): ${skipped}
-- Warnings: ${warnings.length}
${warnings.map(w => '-- ' + w).join('\n')}

`;

const output = header + inserts.join('\n') + '\n';
const outPath = 'migrations/import-fuel-historical.sql';
writeFileSync(outPath, output, 'utf-8');

console.log(`✅ Generated ${outPath}`);
console.log(`   New records: ${added}`);
console.log(`   Skipped: ${skipped}`);
if (warnings.length) {
  console.log(`   Warnings:`);
  warnings.forEach(w => console.log(`   - ${w}`));
}
