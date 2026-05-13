// Refactored: ฟังก์ชัน sync หลัก ใช้ร่วมกันทั้ง public cron + admin manual
// ตั้ง env vars:
//   GOOGLE_SERVICE_ACCOUNT_JSON  = JSON string ของ service account
//   GFORM_SHEET_MAP              = JSON: { "<license_plate>": "<spreadsheet_id>", ... }

import { dbFirst, dbRun, generateUUID, now } from '../_helpers.js';
import { getGoogleAccessToken, readSheet } from './google-auth.js';

const COL = { TS: 0, DRIVER: 1, STATUS: 2, DATE: 3, REQUESTER: 4, DEST: 5, MILEAGE: 6 };
const RANGE = 'A2:H';

function normalizeName(s) {
  if (!s) return '';
  return String(s).trim().replace(/\s+/g, ' ');
}

function parseMileage(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v).replace(/[,\s]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseFormDate(dateStr, timeStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  let datePart = s, timePart = '';
  const commaIdx = s.indexOf(',');
  if (commaIdx >= 0) {
    datePart = s.slice(0, commaIdx).trim();
    timePart = s.slice(commaIdx + 1).trim();
  } else if (timeStr) {
    timePart = String(timeStr).trim();
  }
  const m = datePart.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  d = parseInt(d, 10); mo = parseInt(mo, 10); y = parseInt(y, 10);
  if (y < 100) y += 2000;
  if (y > 2400) y -= 543;
  let hh = 0, mm = 0, ss = 0;
  const tm = timePart.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (tm) { hh = parseInt(tm[1], 10); mm = parseInt(tm[2], 10); ss = tm[3] ? parseInt(tm[3], 10) : 0; }
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(mo)}-${pad(d)}T${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

function statusToRecordType(status) {
  const s = normalizeName(status);
  if (!s) return null;
  if (s.includes('ก่อน') || s.includes('ออก')) return 'departure';
  if (s.includes('กลับ')) return 'return';
  return null;
}

async function findDriverByName(db, rawName) {
  const name = normalizeName(rawName);
  if (!name) return null;
  let row = await dbFirst(db,
    `SELECT id FROM drivers
     WHERE deactivated_at IS NULL
       AND (name = ? OR (COALESCE(title,'') || ' ' || COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) = ?
         OR (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) = ?)
     LIMIT 1`,
    [name, name, name]
  );
  if (row) return row.id;
  const stripped = name.replace(/^(นาย|นาง|นางสาว|น\.ส\.|ดร\.|ครู)\s*/, '').trim();
  if (stripped !== name) {
    row = await dbFirst(db,
      `SELECT id FROM drivers
       WHERE deactivated_at IS NULL
         AND (name LIKE ? OR (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) = ?)
       LIMIT 1`,
      [`%${stripped}%`, stripped]
    );
    if (row) return row.id;
  }
  row = await dbFirst(db,
    `SELECT id FROM drivers WHERE deactivated_at IS NULL AND name LIKE ? LIMIT 1`,
    [`%${name}%`]
  );
  return row?.id || null;
}

async function syncOneSheet(db, accessToken, licensePlate, spreadsheetId, report) {
  const car = await dbFirst(db,
    `SELECT id FROM cars WHERE license_plate = ? OR registration_number = ?
     OR REPLACE(license_plate,' ','') = REPLACE(?,' ','')
     LIMIT 1`,
    [licensePlate, licensePlate, licensePlate]
  );
  if (!car) {
    report.error = `ไม่พบรถทะเบียน "${licensePlate}" ในระบบ`;
    return;
  }
  const carId = car.id;

  let rows;
  try {
    rows = await readSheet(accessToken, spreadsheetId, RANGE);
  } catch (e) {
    report.error = e.message;
    return;
  }
  report.fetched = rows.length;

  for (const r of rows) {
    if (!r || r.length === 0) continue;
    const tsRaw = r[COL.TS];
    if (!tsRaw) continue;
    const formTimestamp = String(tsRaw).trim();
    const recordType = statusToRecordType(r[COL.STATUS]);
    if (!recordType) { report.skipped++; continue; }

    const existing = await dbFirst(db,
      `SELECT id FROM usage_records
       WHERE record_source = 'google_form' AND car_id = ? AND record_type = ? AND form_timestamp = ?
       LIMIT 1`,
      [carId, recordType, formTimestamp]
    );
    if (existing) { report.skipped++; continue; }

    const datetime = parseFormDate(r[COL.DATE], tsRaw) || parseFormDate(tsRaw, '');
    const mileage = parseMileage(r[COL.MILEAGE]);
    const driverId = await findDriverByName(db, r[COL.DRIVER]);
    const requester = normalizeName(r[COL.REQUESTER]);
    const destination = normalizeName(r[COL.DEST]);
    const driverName = normalizeName(r[COL.DRIVER]);

    try {
      const id = generateUUID();
      const ts = now();
      await dbRun(db,
        `INSERT INTO usage_records
          (id, car_id, driver_id, record_type, datetime, mileage, location, notes, queue_id,
           data_quality, requester_name, record_source, purpose, destination, driver_name_manual,
           form_timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL,
                 'normal', ?, 'google_form', NULL, ?, ?,
                 ?, ?)`,
        [id, carId, driverId, recordType,
         datetime || ts, mileage, destination || '', '',
         requester || null, destination || null, driverName || null,
         formTimestamp, ts]
      );

      if (mileage) {
        await dbRun(db,
          `UPDATE cars SET current_mileage = ?, updated_at = ?
           WHERE id = ? AND (current_mileage IS NULL OR current_mileage < ?)`,
          [mileage, ts, carId, mileage]
        );
      }
      report.inserted++;
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        report.skipped++;
      } else {
        report.failed++;
        if (!report.errors) report.errors = [];
        if (report.errors.length < 5) report.errors.push(e.message);
      }
    }
  }
}

// ฟังก์ชันหลัก — เรียกจาก public endpoint หรือ admin endpoint ก็ได้
export async function runGoogleFormSync(env, triggerSource, triggeredBy) {
  const saJson = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const sheetMapStr = env.GFORM_SHEET_MAP;
  if (!saJson) throw new Error('ยังไม่ได้ตั้ง env GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!sheetMapStr) throw new Error('ยังไม่ได้ตั้ง env GFORM_SHEET_MAP');

  let sheetMap;
  try { sheetMap = JSON.parse(sheetMapStr); }
  catch (e) { throw new Error('GFORM_SHEET_MAP ไม่ใช่ JSON ที่ถูกต้อง: ' + e.message); }

  const logId = generateUUID();
  const startedAt = now();
  await dbRun(env.DB,
    `INSERT INTO gform_sync_log (id, started_at, status, trigger_source, triggered_by)
     VALUES (?, ?, 'running', ?, ?)`,
    [logId, startedAt, triggerSource, triggeredBy || null]
  );

  const summary = { sheets_processed: 0, rows_fetched: 0, rows_inserted: 0,
                    rows_skipped: 0, rows_failed: 0, details: {} };
  try {
    const tokenResp = await getGoogleAccessToken(saJson, 'https://www.googleapis.com/auth/spreadsheets.readonly');
    const accessToken = tokenResp.access_token;

    for (const [licensePlate, spreadsheetId] of Object.entries(sheetMap)) {
      const report = { fetched: 0, inserted: 0, skipped: 0, failed: 0 };
      try { await syncOneSheet(env.DB, accessToken, licensePlate, spreadsheetId, report); }
      catch (e) { report.error = e.message; }
      summary.sheets_processed++;
      summary.rows_fetched += report.fetched;
      summary.rows_inserted += report.inserted;
      summary.rows_skipped += report.skipped;
      summary.rows_failed += report.failed;
      summary.details[licensePlate] = report;
    }
    const status = summary.rows_failed > 0 ? 'partial' : 'success';
    await dbRun(env.DB,
      `UPDATE gform_sync_log
       SET finished_at = ?, status = ?,
           sheets_processed = ?, rows_fetched = ?,
           rows_inserted = ?, rows_skipped = ?, rows_failed = ?,
           details = ?
       WHERE id = ?`,
      [now(), status, summary.sheets_processed, summary.rows_fetched,
       summary.rows_inserted, summary.rows_skipped, summary.rows_failed,
       JSON.stringify(summary.details), logId]
    );
    return { logId, status, ...summary };
  } catch (e) {
    await dbRun(env.DB,
      `UPDATE gform_sync_log SET finished_at = ?, status = 'error', error_message = ? WHERE id = ?`,
      [now(), e.message, logId]
    );
    throw e;
  }
}
