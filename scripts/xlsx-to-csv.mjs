/**
 * xlsx-to-csv.mjs
 * แปลงไฟล์ .xlsx (Google Forms export) → .csv UTF-8 BOM
 * ใช้ sheet แรกของแต่ละไฟล์
 *
 * Usage:
 *   node scripts/xlsx-to-csv.mjs <srcDir> <dstDir>
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { resolve, join, basename, extname } from 'path';
import * as XLSX from 'xlsx';

const srcDir = resolve(process.argv[2] || 'D:/AI CURSER/บันทึกการใช้รถ');
const dstDir = resolve(process.argv[3] || 'import/usage-legacy');

if (!existsSync(srcDir)) { console.error(`❌ Source not found: ${srcDir}`); process.exit(1); }
if (!existsSync(dstDir)) mkdirSync(dstDir, { recursive: true });

// Map ชื่อไฟล์ xlsx → ชื่อ CSV รูปแบบเดียวกับเดิม
//   "บันทึกการใช้รถ_นข_358.xlsx" → "บันทึกการใช้รถ นข 358 (การตอบกลับ) - บันทึกหลัก.csv"
function targetName(xlsxName) {
  const base = basename(xlsxName, extname(xlsxName));
  // strip prefix "บันทึกการใช้รถ_" then replace remaining _ with space
  const m = base.match(/^บันทึกการใช้รถ[_ ]?(.+)$/);
  if (!m) return base + '.csv';
  const plate = m[1].replace(/_/g, ' ').trim();
  return `บันทึกการใช้รถ ${plate} (การตอบกลับ) - บันทึกหลัก.csv`;
}

// ลบ CSV เก่าทั้งหมดใน dstDir ก่อน (เพื่อไม่ให้ import ซ้ำกับข้อมูลเก่า)
const oldCsvs = readdirSync(dstDir).filter(f => f.toLowerCase().endsWith('.csv'));
for (const f of oldCsvs) { unlinkSync(join(dstDir, f)); }
console.log(`🗑  ลบ CSV เก่า ${oldCsvs.length} ไฟล์`);

const xlsxFiles = readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.xlsx'));
console.log(`📦 พบ ${xlsxFiles.length} ไฟล์ xlsx`);

let totalRows = 0;
for (const f of xlsxFiles) {
  const srcPath = join(srcDir, f);
  const wb = XLSX.read(readFileSync(srcPath), { type: 'buffer' });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  // sheet_to_csv → strings preserved, dates as raw text (ตามที่ Google Form export)
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',', RS: '\n', strip: false, blankrows: false });
  const dstName = targetName(f);
  const dstPath = join(dstDir, dstName);
  // เขียน UTF-8 BOM
  writeFileSync(dstPath, '\uFEFF' + csv, 'utf8');
  const lines = csv.split(/\n/).filter(Boolean).length;
  totalRows += Math.max(0, lines - 1);
  console.log(`  ✓ ${f} → ${dstName}  (${lines - 1} rows)`);
}

console.log(`\n✅ แปลงเสร็จ — รวม ${totalRows} rows`);
