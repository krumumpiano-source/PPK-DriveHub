// PPK DriveHub — Backup API
// GET  /api/backup         — list backups
// POST /api/backup         — create backup (snapshot all tables → R2 or direct download)
// GET  /api/backup/:id     — get backup detail
// POST /api/backup/:id/restore — restore from R2 backup (admin only)
// POST /api/backup/restore-upload — restore from uploaded JSON (admin only, no R2 needed)

import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requireAdmin, writeAuditLog
} from '../../_helpers.js';

const BACKUP_TABLES = [
  'users', 'cars', 'drivers', 'queue', 'usage_records',
  'fuel_log', 'repair_log', 'tax_records', 'insurance_records',
  'check_log', 'vehicle_maintenance', 'leaves', 'maintenance_settings'
];

const RESTORABLE_TABLES = [
  'cars', 'drivers', 'queue', 'usage_records', 'fuel_log',
  'repair_log', 'tax_records', 'insurance_records', 'check_log',
  'vehicle_maintenance', 'leaves'
];

async function createSnapshot(db) {
  const snapshot = {};
  for (const t of BACKUP_TABLES) {
    try { snapshot[t] = await dbAll(db, `SELECT * FROM ${t}`); }
    catch { snapshot[t] = []; }
  }
  return snapshot;
}

async function restoreSnapshot(db, snapshot) {
  const SAFE_COL = /^[a-z_][a-z0-9_]*$/;
  for (const table of RESTORABLE_TABLES) {
    if (!snapshot[table] || !snapshot[table].length) continue;
    await dbRun(db, `DELETE FROM ${table}`);
    for (const row of snapshot[table]) {
      const keys = Object.keys(row);
      if (keys.some(k => !SAFE_COL.test(k))) throw new Error(`Invalid column name in table ${table}`);
      const cols = keys.join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      await dbRun(db, `INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`, Object.values(row));
    }
  }
}

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);
  try { requireAdmin(user); } catch { return error('ต้องเป็น Admin', 403); }

  // GET /api/backup — list backups
  if (path === '/api/backup' && method === 'GET') {
    const backups = await dbAll(env.DB, 'SELECT * FROM backups ORDER BY created_at DESC LIMIT 50');
    return success(backups);
  }

  // POST /api/backup — create backup
  if (path === '/api/backup' && method === 'POST') {
    const body = await parseBody(request);
    const snapshot = await createSnapshot(env.DB);
    const json = JSON.stringify(snapshot, null, 2);
    const bytes = new TextEncoder().encode(json);
    const id = generateUUID();
    const ts = now();
    const filename = `backup_${ts.replace(/[:.]/g, '-')}_${id.slice(0, 8)}.json`;
    const recordCount = Object.values(snapshot).reduce((s, v) => s + v.length, 0);

    // Try R2 first, fall back to direct download
    let r2Key = '';
    let storedInR2 = false;
    if (env.STORAGE) {
      try {
        r2Key = `BACKUPS/${filename}`;
        await env.STORAGE.put(r2Key, bytes, { httpMetadata: { contentType: 'application/json' } });
        storedInR2 = true;
      } catch { /* R2 failed, fall back */ }
    }

    // Record metadata in D1
    await dbRun(env.DB,
      `INSERT INTO backups (id, name, module, row_count, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, filename, storedInR2 ? 'r2' : 'download', recordCount, user.id, ts]
    );

    await writeAuditLog(env.DB, user.id, user.displayName, 'create_backup', 'backup', id, { filename });

    // If R2 not available, return JSON directly for browser download
    if (!storedInR2) {
      return new Response(json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Backup-Id': id,
          'X-Backup-Records': String(recordCount)
        }
      });
    }

    return success({ id, filename, record_count: recordCount, message: 'สร้าง Backup เรียบร้อย' }, 201);
  }

  // POST /api/backup/restore-upload — restore from uploaded JSON (no R2 needed)
  if (path === '/api/backup/restore-upload' && method === 'POST') {
    const body = await parseBody(request);
    if (!body || typeof body !== 'object') return error('กรุณาอัปโหลดไฟล์ backup JSON');

    // body should be the snapshot object directly
    const snapshot = body;
    const hasValidTable = RESTORABLE_TABLES.some(t => Array.isArray(snapshot[t]) && snapshot[t].length > 0);
    if (!hasValidTable) return error('ไฟล์ backup ไม่ถูกต้อง ไม่พบข้อมูลที่สามารถกู้คืนได้');

    await restoreSnapshot(env.DB, snapshot);
    await writeAuditLog(env.DB, user.id, user.displayName, 'restore_backup_upload', 'backup', null, { tables: RESTORABLE_TABLES.filter(t => snapshot[t]?.length) });
    return success({ message: 'กู้คืนข้อมูลจากไฟล์เรียบร้อย' });
  }

  // GET /api/backup/:id — get backup detail
  if (path.match(/^\/api\/backup\/[^/]+$/) && method === 'GET') {
    const id = path.split('/')[3];
    const backup = await dbFirst(env.DB, 'SELECT * FROM backups WHERE id = ?', [id]);
    return backup ? success(backup) : error('ไม่พบ Backup', 404);
  }

  // POST /api/backup/:id/restore — restores data from R2 backup (destructive!)
  if (path.match(/\/api\/backup\/[^/]+\/restore/) && method === 'POST') {
    if (!env.STORAGE) return error('R2 Storage ไม่พร้อมใช้งาน กรุณาใช้ "กู้คืนจากไฟล์" แทน');

    const id = path.split('/')[3];
    const backup = await dbFirst(env.DB, 'SELECT * FROM backups WHERE id = ?', [id]);
    if (!backup) return error('ไม่พบ Backup', 404);

    let snapshot;
    try {
      const obj = await env.STORAGE.get(`BACKUPS/${backup.name}`);
      if (!obj) return error('ไม่พบไฟล์ Backup ใน Storage');
      const text = await obj.text();
      snapshot = JSON.parse(text);
    } catch (e) {
      return error(`ไม่สามารถอ่านไฟล์ Backup ได้: ${e.message}`);
    }

    await restoreSnapshot(env.DB, snapshot);
    await writeAuditLog(env.DB, user.id, user.displayName, 'restore_backup', 'backup', id, { filename: backup.name });
    return success({ message: 'กู้คืนข้อมูลเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}
