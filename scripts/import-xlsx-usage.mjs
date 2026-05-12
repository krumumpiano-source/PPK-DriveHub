/**
 * import-xlsx-usage.mjs
 * นำเข้าข้อมูลจาก "สมุดบันทึกการใช้รถราชการ" (xlsx แบบใหม่)
 * แต่ละแถว = 1 trip ครบ (ออก+กลับ)
 *
 * Columns:
 *   A: ลำดับ
 *   B: วันที่เดินทาง       เช่น "2/5/2025"
 *   C: เวลาออกเดินทาง     เช่น "13:30"
 *   D: เวลากลับ           เช่น "14:42"
 *   E: ผู้ขอใช้รถ
 *   F: สถานที่ไป / วัตถุประสงค์
 *   G: เลขไมล์ก่อนออก
 *   H: เลขไมล์เมื่อกลับ
 *   I: ระยะทาง (กม.)
 *   J: พนักงานขับรถ
 *   K: หมายเหตุ
 *
 * แถวที่มี "*** ไม่มีข้อมูล ***" → ข้าม (เป็น marker ว่ามีช่วงไมล์หาย)
 *
 * Output: migrations/import-usage-historical.sql
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, basename, join } from 'path';
import { createHash } from 'crypto';
import * as XLSX from 'xlsx';

const SRC_DIR = resolve(process.argv[2] || 'D:/AI CURSER/บันทึกการใช้รถ');
const OUTPUT_SQL = resolve('migrations/import-usage-historical.sql');

// ── Mappings (เหมือน import-csv-usage.mjs) ──
const CAR_MAP = {
  '40-0062': 'd1def56d-493a-47d6-a164-8d99c7ab44bd',
  '40-0158': '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  'กจ 5192': '97d66518-d511-4ae2-abcb-54a491b5f13c',
  'นข 1977': 'b43ad8e2-04d0-40e0-90ab-d598bf44282d',
  'นข 2455': 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  'นข 358':  'b7ee9471-dda3-45a5-94b0-605980a5214b',
  'นข 3816': 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
};

const DRIVER_MAP = {
  'นายณัฐวุฒิ ใหญ่วงค์':   'b494cfd8-7cd6-4801-8e1f-db14de8866c7',
  'นายสมชาย พรมศร':       '0ac38057-2288-4cf8-a2a0-3303cb21be15',
  'นายชารี ศรีพรม':        '91e0301c-4cd3-4cf5-ba0d-6c69788f9d5a',
  'นายสุรเชษฐ์ บุริวงศ์':   '29954b0c-8089-4560-adad-f9d724fba7e4',
  'นายสงกรานต์ แก้วสา':    'de9eaca9-b58e-4ad9-89ef-fd6f7b3c3d6c',
  'นายเปรมฤทธิ์ อินแต่ง':  'c8f2c74e-bcab-47d2-9ea6-c6582faee618',
  'นายกันต์กวี ชัยทะ':     'b4442829-6e5b-4275-bd46-f112c1d19b75',
  'นายสหรัฐ พลับพลา':      '6a6ff713-82d1-4bb7-9e83-233f8c866d63',
  'นายมานพ โลหะกิจ':       'd4db9fee-d77e-4ea6-b979-0a180c865e62',
  'นายสุมงคล จ่อยพิรัตน์': 'legacy-sumongkol-jorpirat',
  'นายพงศธร โพธิแก้ว':     'legacy-pongsathorn-photikaew',
};

const UNKNOWN_DRIVER_NAMES = new Set();

// ── Helpers ──
function normalizeDriverName(raw) {
  if (!raw) return '';
  let n = String(raw).replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (n && !n.match(/^(นาย|นาง|น\.ส\.|นางสาว|ว่าที่|ดร\.|รอง)/)) n = 'นาย' + n;
  n = n.replace(/\s+/g, ' ');
  return n;
}

function lookupDriver(name) {
  if (!name) return null;
  if (DRIVER_MAP[name]) return DRIVER_MAP[name];
  // ลองหาแบบ fuzzy: ตัด space ทั้งหมดแล้วเทียบ
  const compact = name.replace(/\s+/g, '');
  for (const [k, v] of Object.entries(DRIVER_MAP)) {
    if (k.replace(/\s+/g, '') === compact) return v;
  }
  return null;
}

function md5(s) { return createHash('md5').update(s).digest('hex'); }
function hashToUuid(s) {
  const h = md5(s);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

function sqlStr(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlInt(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = parseInt(String(v).replace(/,/g, ''), 10);
  return Number.isFinite(n) ? String(n) : 'NULL';
}

// "2/5/2025" → "2025-05-02"
function parseDate(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

// "13:30" หรือ "13:30:45" → "13:30:00"
function parseTime(s) {
  if (s === null || s === undefined || s === '') return null;
  // xlsx อาจให้เป็น decimal (เช่น 0.5625 = 13:30) — แต่ sheet_to_json แบบ raw:false จะเป็น string
  const str = String(s).trim();
  const m = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (m) {
    return `${m[1].padStart(2,'0')}:${m[2].padStart(2,'0')}:${(m[3]||'00').padStart(2,'0')}`;
  }
  return null;
}

// Plate จากชื่อไฟล์: "บันทึกการใช้รถ_นข_358.xlsx" → "นข 358"
function extractPlate(filename) {
  const base = basename(filename).replace(/\.xlsx$/i, '');
  const m = base.match(/^บันทึกการใช้รถ[_\s](.+)$/);
  if (!m) return null;
  return m[1].replace(/_/g, ' ').trim();
}

// ── Process one file ──
function processFile(path, stats) {
  const filename = basename(path);
  const plate = extractPlate(filename);
  if (!plate) { console.warn(`⚠ Skip (no plate): ${filename}`); return; }
  const carId = CAR_MAP[plate];
  if (!carId) { console.warn(`⚠ Skip (unknown plate "${plate}"): ${filename}`); return; }

  const wb = XLSX.read(readFileSync(path), { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // อ่านเป็น array of arrays, raw=false ให้แปลง date/number เป็น string ตามที่แสดง
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

  console.log(`\n📄 ${filename}  → ${plate}`);

  let trips = 0, gaps = 0, skipped = 0, unknownDrv = 0;

  // หา header row (มี "ลำดับ" ใน column A)
  let dataStart = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    if (rows[i][0] && String(rows[i][0]).includes('ลำดับ')) { dataStart = i + 1; break; }
  }
  if (dataStart < 0) { console.warn(`   ⚠ ไม่พบ header row`); return; }

  // Pre-pass: หา datetime ของ trip ถัดไปสำหรับแต่ละ gap row
  // เพื่อใช้กำหนด datetime ของ csv_gap records
  const nextTripStart = new Array(rows.length).fill(null); // { date, time }
  {
    let lastSeen = null;
    for (let i = rows.length - 1; i >= dataStart; i--) {
      const r = rows[i];
      if (!r) continue;
      const seq = String(r[0]||'').trim();
      if (!seq) continue;
      const dr = String(r[1]||'').trim();
      const ts = parseTime(r[2]);
      const d  = parseDate(dr);
      if (d && ts) lastSeen = { date: d, time: ts };
      nextTripStart[i] = lastSeen;
    }
  }

  // ติดตามจุดสิ้นสุดของ trip ก่อนหน้า (เอาไว้ตั้ง datetime ของ csv_gap)
  let prevReturn = null; // { date, time }

  for (let i = dataStart; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r.length) continue;
    const seq = String(r[0]||'').trim();
    if (!seq) continue;

    const dateRaw = String(r[1]||'').trim();
    const remarksFull = String(r[10]||'').trim();
    if (!dateRaw || dateRaw.includes('ไม่มีข้อมูล')) {
      // GAP ROW: "*** ไม่มีข้อมูล ***" → ใช้รถโดยไม่บันทึก
      // ดึงไมล์จาก col G/H ก่อน, ถ้าไม่มี parse จาก remarks
      let fromKm = sqlInt(r[6]);
      let toKm   = sqlInt(r[7]);
      const m = remarksFull.match(/จาก\s*(\d[\d,]*)\s*ถึง\s*(\d[\d,]*)/);
      if (m) {
        if (fromKm === 'NULL') fromKm = sqlInt(m[1]);
        if (toKm === 'NULL')   toKm   = sqlInt(m[2]);
      }
      // fallback: distance
      const distRaw = sqlInt(r[8]);
      if (toKm === 'NULL' && fromKm !== 'NULL' && distRaw !== 'NULL') {
        toKm = String(parseInt(fromKm,10) + parseInt(distRaw,10));
      }
      // กำหนด datetime: ใช้ prevReturn+1m เป็น departure, nextTripStart-1m เป็น return
      const next = nextTripStart[i];
      const depDT = prevReturn
        ? `${prevReturn.date}T${prevReturn.time}`
        : (next ? `${next.date}T${next.time}` : null);
      const retDT = next
        ? `${next.date}T${next.time}`
        : (prevReturn ? `${prevReturn.date}T${prevReturn.time}` : null);
      if (!depDT || !retDT || fromKm === 'NULL' || toKm === 'NULL') { gaps++; continue; }

      const distance = (parseInt(toKm,10) - parseInt(fromKm,10)) || (distRaw !== 'NULL' ? parseInt(distRaw,10) : 0);
      const gapNote = remarksFull || `ไม่มีการบันทึก: นำรถใช้งาน ${distance} กม. โดยไม่มีบันทึก`;

      const depKey = `usage_record|${carId}|GAP|${depDT}|${fromKm}|departure`;
      const retKey = `usage_record|${carId}|GAP|${retDT}|${toKm}|return`;
      const depId = hashToUuid(depKey);
      const retId = hashToUuid(retKey);

      stats.usageSql.push(
        `INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,location,notes,queue_id,is_historical,data_quality,auto_notes,record_source,created_at) VALUES (` +
        `${sqlStr(depId)},${sqlStr(carId)},NULL,'departure',${sqlStr(depDT)},${fromKm},NULL,${sqlStr(gapNote)},NULL,1,'no_record',${sqlStr(gapNote)},'csv_gap',${sqlStr(depDT)});`
      );
      stats.usageSql.push(
        `INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,location,notes,queue_id,is_historical,data_quality,auto_notes,record_source,created_at) VALUES (` +
        `${sqlStr(retId)},${sqlStr(carId)},NULL,'return',${sqlStr(retDT)},${toKm},NULL,${sqlStr(gapNote)},NULL,1,'no_record',${sqlStr(gapNote)},'csv_gap',${sqlStr(retDT)});`
      );
      gaps++;
      continue;
    }

    const date = parseDate(dateRaw);
    if (!date) { skipped++; continue; }

    const timeStart = parseTime(r[2]);
    const timeEnd   = parseTime(r[3]);
    if (!timeStart) { skipped++; continue; }

    const requester = String(r[4]||'').trim();
    const destination = String(r[5]||'').trim();
    const mileageStart = r[6];
    const mileageEnd   = r[7];
    const distance     = r[8];
    const driverRaw = String(r[9]||'').trim();
    const remarks = String(r[10]||'').trim();

    const driverName = normalizeDriverName(driverRaw);
    const driverId = lookupDriver(driverName);
    if (!driverId) {
      if (driverName) UNKNOWN_DRIVER_NAMES.add(driverName);
      unknownDrv++;
    }

    const startISO = `${date}T${timeStart}`;
    const endISO   = timeEnd ? `${date}T${timeEnd}` : startISO;
    const mission  = destination || '(ไม่ระบุ)';

    // --- queue (เฉพาะกรณี driver ลงทะเบียนแล้ว) ---
    let queueId = null;
    if (driverId) {
      const queueKey = `usage-xlsx|${carId}|${driverId}|${startISO}`;
      queueId = hashToUuid(queueKey);
      const noteParts = ['นำเข้าจากสมุดบันทึก (xlsx)'];
      if (remarks) noteParts.push(remarks);
      stats.queueSql.push(
        `INSERT OR IGNORE INTO queue (id,date,time_start,time_end,car_id,driver_id,requester_id,requested_by,mission,destination,passengers,status,notes,created_by,created_at,updated_at) VALUES (` +
        `${sqlStr(queueId)},${sqlStr(date)},${sqlStr(timeStart)},${sqlStr(timeEnd||timeStart)},` +
        `${sqlStr(carId)},${sqlStr(driverId)},NULL,${sqlStr(requester)},` +
        `${sqlStr(mission)},${sqlStr(destination)},1,'completed',` +
        `${sqlStr(noteParts.join(' | '))},'legacy-import',${sqlStr(startISO)},${sqlStr(endISO)});`
      );
    }

    // --- usage_records: departure + return ---
    const baseNotes = [];
    if (requester) baseNotes.push(`ผู้ขอใช้: ${requester}`);
    if (!driverId && driverName) baseNotes.push(`คนขับ: ${driverName}`);
    if (remarks) baseNotes.push(`หมายเหตุ: ${remarks}`);
    baseNotes.push('legacy-import (xlsx)');

    const depKey = `usage_record|${carId}|${driverName}|${startISO}|departure`;
    const depId  = hashToUuid(depKey);
    stats.usageSql.push(
      `INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,location,notes,queue_id,created_at) VALUES (` +
      `${sqlStr(depId)},${sqlStr(carId)},${driverId?sqlStr(driverId):'NULL'},'departure',` +
      `${sqlStr(startISO)},${sqlInt(mileageStart)},${sqlStr(destination)},${sqlStr(baseNotes.join(' | '))},` +
      `${queueId?sqlStr(queueId):'NULL'},${sqlStr(startISO)});`
    );

    if (timeEnd && (mileageEnd !== null && mileageEnd !== undefined && mileageEnd !== '')) {
      const retKey = `usage_record|${carId}|${driverName}|${endISO}|return`;
      const retId  = hashToUuid(retKey);
      stats.usageSql.push(
        `INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,location,notes,queue_id,created_at) VALUES (` +
        `${sqlStr(retId)},${sqlStr(carId)},${driverId?sqlStr(driverId):'NULL'},'return',` +
        `${sqlStr(endISO)},${sqlInt(mileageEnd)},${sqlStr(destination)},${sqlStr(baseNotes.join(' | '))},` +
        `${queueId?sqlStr(queueId):'NULL'},${sqlStr(endISO)});`
      );
      prevReturn = { date, time: timeEnd };
    } else {
      prevReturn = { date, time: timeStart };
    }
    trips++;
  }

  console.log(`   trips=${trips} gaps=${gaps} skipped=${skipped} unknownDriver=${unknownDrv}`);
}

// ── Main ──
function main() {
  if (!existsSync(SRC_DIR)) { console.error(`❌ Not found: ${SRC_DIR}`); process.exit(1); }
  const files = readdirSync(SRC_DIR).filter(f => f.toLowerCase().endsWith('.xlsx')).map(f => join(SRC_DIR, f));

  const stats = { queueSql: [], usageSql: [] };
  for (const f of files) processFile(f, stats);

  if (UNKNOWN_DRIVER_NAMES.size > 0) {
    console.log(`\n⚠ คนขับที่ไม่ได้อยู่ใน DRIVER_MAP (${UNKNOWN_DRIVER_NAMES.size} คน):`);
    for (const n of UNKNOWN_DRIVER_NAMES) console.log(`   • ${n}`);
    console.log(`   → จะเก็บชื่อใน notes ของ usage_records (driver_id=NULL, ไม่สร้าง queue)`);
  }

  const sql = [
    '-- ============================================================',
    '-- Import Historical Usage Records from XLSX (สมุดบันทึก)',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Source files: ${files.length}`,
    `-- queue rows:         ${stats.queueSql.length}`,
    `-- usage_records rows: ${stats.usageSql.length}`,
    '-- Idempotent: INSERT OR IGNORE with stable hash IDs',
    '-- ============================================================',
    '',
    '-- Queue',
    ...stats.queueSql,
    '',
    '-- Usage records',
    ...stats.usageSql,
    '',
  ].join('\n');

  if (!existsSync(resolve('migrations'))) mkdirSync(resolve('migrations'));
  writeFileSync(OUTPUT_SQL, sql, 'utf8');

  console.log(`\n✅ Wrote ${OUTPUT_SQL}`);
  console.log(`   queue:         ${stats.queueSql.length} rows`);
  console.log(`   usage_records: ${stats.usageSql.length} rows`);
}

main();
