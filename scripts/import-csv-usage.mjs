/**
 * import-csv-usage.mjs
 * อ่าน CSV จาก Google Forms (บันทึกการใช้รถ) → สร้าง SQL INSERT สำหรับ queue + usage_records
 *
 * Usage:
 *   node scripts/import-csv-usage.mjs              # อ่านทุกไฟล์ใน import/usage-legacy/
 *   node scripts/import-csv-usage.mjs <csv-path>   # อ่านไฟล์เดียว
 *
 * Output: migrations/import-usage-historical.sql
 *
 * Strategy:
 *   - extract license_plate จากชื่อไฟล์
 *   - จับคู่ departure ↔ return ตามลำดับ (per driver, FIFO)
 *   - generate stable IDs (md5) เพื่อให้ idempotent (re-run ไม่ duplicate)
 *   - queue.status = 'completed' (มีคู่), 'cancelled' (departure เดี่ยว)
 *   - "ลืมบันทึกกลับมาจากเดินทาง" → ใช้ ประทับเวลา เป็น datetime + เพิ่ม notes
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, basename, join } from 'path';
import { createHash } from 'crypto';

// ── Config ──
const IMPORT_DIR = resolve('import/usage-legacy');
const OUTPUT_SQL = resolve('migrations/import-usage-historical.sql');

// ── Mappings (ดึงจาก import-csv-fuel.mjs + driver query) ──
const CAR_MAP = {
  '40-0062': 'd1def56d-493a-47d6-a164-8d99c7ab44bd',
  '40-0158': '4cbb75bb-40f0-4eb2-a8c7-be2bcf2db4c3',
  'กจ 5192': '97d66518-d511-4ae2-abcb-54a491b5f13c',
  'นข 1977': 'b43ad8e2-04d0-40e0-90ab-d598bf44282d',
  'นข 2455': 'd5685d4b-914f-4140-8de6-6050a514ae9b',
  'นข 358':  'b7ee9471-dda3-45a5-94b0-605980a5214b',
  'นข 3816': 'df5fd5a5-287e-4e10-a8d0-f6818daa6522',
};

// driver name (จาก CSV) → driver_id (ในระบบ)
// ชื่อใน CSV อาจมี suffix "(เฉพาะกิจ พัสดุ)" หรือ "(สำรอง4)" — strip ก่อนเทียบ
const DRIVER_MAP = {
  'นายณัฐวุฒิ ใหญ่วงค์':   'b494cfd8-7cd6-4801-8e1f-db14de8866c7',
  'นายสมชาย พรมศร':       '0ac38057-2288-4cf8-a2a0-3303cb21be15',
  'นายชารี ศรีพรม':        '91e0301c-4cd3-4cf5-ba0d-6c69788f9d5a',
  'นายสุรเชษฐ์ บุริวงศ์':   '29954b0c-8089-4560-adad-f9d724fba7e4',
  'นายสงกรานต์ แก้วสา':    'de9eaca9-b58e-4ad9-89ef-fd6f7b3c3d6c',
  'นายเปรมฤทธิ์ อินแต่ง':  'c8f2c74e-bcab-47d2-9ea6-c6582faee618',
};

// คนที่สแกน QR แต่ไม่ใช่ driver ที่ลงทะเบียนในระบบ → เก็บชื่อใน notes เท่านั้น ไม่สร้าง driver record
const UNKNOWN_DRIVER_NAMES = new Set(); // track เพื่อ report สรุป

// คืน driver_id ถ้ามีใน DRIVER_MAP หรือ null ถ้าไม่มี (ให้ caller ตัดสินใจ)
function lookupDriver(name) {
  return DRIVER_MAP[name] || null;
}

// ── Helpers ──
function normalizeDriverName(raw) {
  if (!raw) return '';
  // strip " (เฉพาะกิจ พัสดุ)", "(สำรอง4)" เป็นต้น
  let n = String(raw).replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  // เติม "นาย" ให้ชื่อที่ขาดคำนำหน้า (เช่น "กฤศ วงค์เรือง" → "นายกฤศ วงค์เรือง")
  if (n && !n.match(/^(นาย|นาง|น\.ส\.|นางสาว|ว่าที่|ดร\.|รอง)/)) n = 'นาย' + n;
  // collapse multiple spaces
  n = n.replace(/\s+/g, ' ');
  return n;
}

function md5(s) {
  return createHash('md5').update(s).digest('hex');
}

// uuid-style จาก hash (32 hex → 8-4-4-4-12)
function hashToUuid(s) {
  const h = md5(s);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

// CSV parser แบบง่าย (รองรับ quoted fields ที่มี comma)
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i+1] === '"') { cur += '"'; i++; }
        else inQuote = false;
      } else cur += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}

// "15/5/2025, 8:21:03" → { date: '2025-05-15', time: '08:21:03', iso: '2025-05-15T08:21:03' }
function parseThaiDateTime(s) {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (!m) return null;
  const [, d, mo, y, h='0', mi='0', se='0'] = m;
  const date = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  const time = `${h.padStart(2,'0')}:${mi.padStart(2,'0')}:${se.padStart(2,'0')}`;
  return { date, time, iso: `${date}T${time}` };
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

// ── Extract license plate จากชื่อไฟล์ ──
// e.g. "สำเนาของ บันทึกการใช้รถ นข 358 (การตอบกลับ) - บันทึกหลัก.csv"
function extractPlate(filename) {
  const m = filename.match(/บันทึกการใช้รถ\s+(.+?)\s+\(การตอบกลับ\)/);
  if (!m) return null;
  return m[1].trim();
}

// ── Process one CSV file ──
function processFile(path, stats) {
  const filename = basename(path);
  const plate = extractPlate(filename);
  if (!plate) { console.warn(`⚠ Skip (no plate): ${filename}`); return; }
  const carId = CAR_MAP[plate];
  if (!carId) { console.warn(`⚠ Skip (unknown plate "${plate}"): ${filename}`); return; }

  console.log(`\n📄 ${filename}`);
  console.log(`   plate: ${plate} → ${carId.slice(0,8)}…`);

  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(text);
  if (rows.length < 2) return;

  const header = rows[0];
  const dataRows = rows.slice(1);

  // Pending departure per driver (FIFO queue)
  const pending = new Map(); // driverId → array of { departure, rowIdx }
  let trips = 0, orphans = 0, skipped = 0, forgot = 0;

  for (let idx = 0; idx < dataRows.length; idx++) {
    const r = dataRows[idx];
    if (!r || r.length < 7) continue;
    const [timestamp, driverRaw, status, dateRaw, requester, location, mileageRaw] = r;

    if (status === 'ไม่มีการบันทึกข้อมูล' || !status) { skipped++; continue; }

    const driverName = normalizeDriverName(driverRaw);
    const driverId = lookupDriver(driverName);
    if (!driverId) UNKNOWN_DRIVER_NAMES.add(driverName);

    // datetime: prefer วันที่ (column D); ถ้าเป็น "ลืมบันทึกฯ" → ใช้ ประทับเวลา (column A)
    let dt = parseThaiDateTime(dateRaw);
    let isForgotten = false;
    if (!dt) {
      dt = parseThaiDateTime(timestamp);
      isForgotten = true;
      forgot++;
    }
    if (!dt) { skipped++; continue; }

    const mileage = sqlInt(mileageRaw);
    const row = {
      idx, dt, requester: (requester||'').trim(), location: (location||'').trim(),
      mileage, isForgotten, timestamp, driverName,
    };

    if (status === 'ก่อนออกเดินทาง') {
      if (!pending.has(driverName)) pending.set(driverName, []);
      pending.get(driverName).push(row);
    } else if (status === 'กลับมาจากเดินทาง') {
      const arr = pending.get(driverName) || [];
      const dep = arr.shift();
      if (!dep) {
        // orphan return → emit single record only (no queue)
        emitOrphanReturn({ plate, carId, driverId, driverName, ret: row, stats });
        orphans++;
      } else {
        emitTrip({ plate, carId, driverId, driverName, dep, ret: row, stats });
        trips++;
      }
    }
  }

  // Remaining pending = orphan departures
  for (const [depDriverName, arr] of pending) {
    const depDriverId = lookupDriver(depDriverName);
    for (const dep of arr) {
      emitOrphanDeparture({ plate, carId, driverId: depDriverId, driverName: depDriverName, dep, stats });
      orphans++;
    }
  }

  console.log(`   trips=${trips} orphans=${orphans} forgotten=${forgot} skipped=${skipped}`);
}

// ── Emit SQL ──
function emitTrip({ plate, carId, driverId, driverName, dep, ret, stats }) {
  const mission = ret.location || dep.location || '(ไม่ระบุ)';
  const requester = ret.requester || dep.requester || '';
  const noteParts = [];
  if (dep.isForgotten) noteParts.push('ผู้ใช้ลืมบันทึก ก่อนออกเดินทาง (ใช้เวลาจากประทับเวลา)');
  if (ret.isForgotten) noteParts.push('ผู้ใช้ลืมบันทึก กลับมาจากเดินทาง (ใช้เวลาจากประทับเวลา)');
  noteParts.push('นำเข้าจากระบบเก่า (Google Form)');
  const noteStr = noteParts.join(' | ');

  let queueId = null;
  if (driverId) {
    // queue ต้องการ driver_id NOT NULL → สร้างได้เฉพาะ driver ที่ลงทะเบียนแล้ว
    const queueKey = `usage|${carId}|${driverId}|${dep.dt.iso}|${ret.dt.iso}`;
    queueId = hashToUuid(queueKey);
    stats.queueSql.push(
      `INSERT OR IGNORE INTO queue (id,date,time_start,time_end,car_id,driver_id,requester_id,requested_by,mission,destination,passengers,status,notes,created_by,created_at,updated_at) VALUES (` +
      `${sqlStr(queueId)},${sqlStr(dep.dt.date)},${sqlStr(dep.dt.time)},${sqlStr(ret.dt.time)},` +
      `${sqlStr(carId)},${sqlStr(driverId)},NULL,${sqlStr(requester)},` +
      `${sqlStr(mission)},${sqlStr(ret.location||dep.location||'')},1,'completed',` +
      `${sqlStr(noteStr)},'legacy-import',${sqlStr(dep.dt.iso)},${sqlStr(ret.dt.iso)});`
    );
  }
  // ถ้า driverId = null → ไม่สร้าง queue (driver ไม่ได้ลงทะเบียน เป็นแค่คนสแกน QR)
  // ยังสร้าง usage_records ได้ โดย driver_id = NULL + ชื่อในลง notes

  emitUsageRecord({ carId, driverId, driverName, queueId, type: 'departure', dt: dep.dt,
    mileage: dep.mileage, location: dep.location, requester: dep.requester,
    isForgotten: dep.isForgotten, stats });
  emitUsageRecord({ carId, driverId, driverName, queueId, type: 'return', dt: ret.dt,
    mileage: ret.mileage, location: ret.location, requester: ret.requester,
    isForgotten: ret.isForgotten, stats });
}

function emitOrphanDeparture({ plate, carId, driverId, driverName, dep, stats }) {
  let queueId = null;
  if (driverId) {
    const queueKey = `usage|${carId}|${driverId}|${dep.dt.iso}|orphan-dep`;
    queueId = hashToUuid(queueKey);
    const notes = ['นำเข้าจากระบบเก่า (Google Form)', 'ไม่มีบันทึกกลับมาจากเดินทาง'];
    if (dep.isForgotten) notes.push('ใช้เวลาจากประทับเวลา');
    stats.queueSql.push(
      `INSERT OR IGNORE INTO queue (id,date,time_start,time_end,car_id,driver_id,requester_id,requested_by,mission,destination,passengers,status,notes,created_by,created_at,updated_at) VALUES (` +
      `${sqlStr(queueId)},${sqlStr(dep.dt.date)},${sqlStr(dep.dt.time)},${sqlStr(dep.dt.time)},` +
      `${sqlStr(carId)},${sqlStr(driverId)},NULL,${sqlStr(dep.requester)},` +
      `${sqlStr(dep.location||'(ไม่ระบุ)')},${sqlStr(dep.location||'')},1,'cancelled',` +
      `${sqlStr(notes.join(' | '))},'legacy-import',${sqlStr(dep.dt.iso)},${sqlStr(dep.dt.iso)});`
    );
  }
  emitUsageRecord({ carId, driverId, driverName, queueId, type: 'departure', dt: dep.dt,
    mileage: dep.mileage, location: dep.location, requester: dep.requester,
    isForgotten: dep.isForgotten, stats });
}

function emitOrphanReturn({ plate, carId, driverId, driverName, ret, stats }) {
  emitUsageRecord({ carId, driverId, driverName, queueId: null, type: 'return', dt: ret.dt,
    mileage: ret.mileage, location: ret.location, requester: ret.requester,
    isForgotten: ret.isForgotten, stats,
    extraNote: 'orphan return (ไม่มีคู่ departure)' });
}

function emitUsageRecord({ carId, driverId, driverName, queueId, type, dt, mileage, location, requester, isForgotten, stats, extraNote }) {
  const idKey = `usage_record|${carId}|${driverName||''}|${dt.iso}|${type}`;
  const id = hashToUuid(idKey);
  const noteParts = [];
  if (requester) noteParts.push(`ผู้ขอใช้: ${requester}`);
  if (!driverId && driverName) noteParts.push(`คนขับ: ${driverName}`);
  if (isForgotten) noteParts.push('(ผู้ใช้ลืมบันทึก – ใช้เวลาจากประทับเวลา)');
  if (extraNote) noteParts.push(extraNote);
  noteParts.push('legacy-import');
  stats.usageSql.push(
    `INSERT OR IGNORE INTO usage_records (id,car_id,driver_id,record_type,datetime,mileage,location,notes,queue_id,created_at) VALUES (` +
    `${sqlStr(id)},${sqlStr(carId)},${driverId ? sqlStr(driverId) : 'NULL'},${sqlStr(type)},` +
    `${sqlStr(dt.iso)},${mileage},${sqlStr(location)},${sqlStr(noteParts.join(' | '))},` +
    `${queueId ? sqlStr(queueId) : 'NULL'},${sqlStr(dt.iso)});`
  );
}

// ── Main ──
function main() {
  const arg = process.argv[2];
  let files = [];
  if (arg) files = [resolve(arg)];
  else {
    if (!existsSync(IMPORT_DIR)) { console.error(`❌ Not found: ${IMPORT_DIR}`); process.exit(1); }
    files = readdirSync(IMPORT_DIR).filter(f => f.endsWith('.csv')).map(f => join(IMPORT_DIR, f));
  }

  const stats = { queueSql: [], usageSql: [] };
  for (const f of files) processFile(f, stats);

  // Summary of unregistered scanners
  if (UNKNOWN_DRIVER_NAMES.size > 0) {
    console.log(`\n⚠ คนสแกน QR ที่ไม่ได้ลงทะเบียนเป็น driver (${UNKNOWN_DRIVER_NAMES.size} คน):`);
    for (const n of UNKNOWN_DRIVER_NAMES) console.log(`   • ${n}`);
    console.log(`   → ไม่สร้าง driver record, เก็บชื่อใน notes ของ usage_records แทน`);
    console.log(`   → ไม่สร้าง queue สำหรับ trip เหล่านี้ (queue ต้องการ driver_id NOT NULL)`);
  }

  const sql = [
    '-- ============================================================',
    '-- Import Historical Usage Records from Google Form CSVs',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Source files: ${files.length}`,
    `-- queue rows:         ${stats.queueSql.length}  (trips ที่มี driver ลงทะเบียน)`,
    `-- usage_records rows: ${stats.usageSql.length}  (ครบทุก trip รวม unregistered)`,
    '-- Idempotent: uses INSERT OR IGNORE with stable hash IDs',
    '-- NOTE: No BEGIN/COMMIT — D1 remote import handles transactions internally',
    '-- ============================================================',
    '',
    '-- Queue (trips with registered drivers only)',
    ...stats.queueSql,
    '',
    '-- Usage records (all trips including unregistered scanners)',
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
