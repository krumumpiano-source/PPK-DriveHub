// PPK DriveHub — Backup API
// GET  /api/backup         — list backups
// POST /api/backup         — create backup (snapshot all tables to JSON → R2)
// GET  /api/backup/:id     — get backup detail
// POST /api/backup/:id/restore  (admin only)

import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requireAdmin, writeAuditLog
} from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);
  try { requireAdmin(user); } catch { return error('ต้องเป็น Admin', 403); }

  // GET /api/backup
  if (path === '/api/backup' && method === 'GET') {
    const backups = await dbAll(env.DB, 'SELECT * FROM backups ORDER BY created_at DESC LIMIT 50');
    return success(backups);
  }

  // POST /api/backup
  if (path === '/api/backup' && method === 'POST') {
    const body = await parseBody(request);
    const tables = [
      'users', 'cars', 'drivers', 'queue', 'usage_records',
      'fuel_log', 'repair_log', 'tax_records', 'insurance_records',
      'check_log', 'vehicle_maintenance', 'leaves', 'maintenance_settings'
    ];
    const snapshot = {};
    for (const t of tables) {
      try {
        snapshot[t] = await dbAll(env.DB, `SELECT * FROM ${t}`);
      } catch { snapshot[t] = []; }
    }
    const json = JSON.stringify(snapshot, null, 2);
    const bytes = new TextEncoder().encode(json);
    const id = generateUUID();
    const ts = now();
    const filename = `backup_${ts.replace(/[:.]/g, '-')}_${id.slice(0,8)}.json`;

    // Upload to R2
    let r2Key = '';
    try {
      r2Key = `BACKUPS/${filename}`;
      await env.STORAGE.put(r2Key, bytes, { httpMetadata: { contentType: 'application/json' } });
    } catch (e) {
      return error(`ไม่สามารถบันทึกไฟล์ backup ได้: ${e.message}`);
    }

    const recordCount = Object.values(snapshot).reduce((s, v) => s + v.length, 0);

    await dbRun(env.DB,
      `INSERT INTO backups (id, filename, r2_key, file_size, record_count, description, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, filename, r2Key, bytes.length, recordCount, body?.description || 'Manual backup', user.id, ts]
    );

    await writeAuditLog(env.DB, user.id, user.displayName, 'create_backup', 'backup', id, { filename });
    return success({ id, filename, record_count: recordCount, message: 'สร้าง Backup เรียบร้อย' }, 201);
  }

  // GET /api/backup/:id
  if (path.match(/^\/api\/backup\/[^/]+$/) && method === 'GET') {
    const id = path.split('/')[3];
    const backup = await dbFirst(env.DB, 'SELECT * FROM backups WHERE id = ?', [id]);
    return backup ? success(backup) : error('ไม่พบ Backup', 404);
  }

  // POST /api/backup/:id/restore — restores data from backup (destructive!)
  if (path.match(/\/api\/backup\/[^/]+\/restore/) && method === 'POST') {
    const id = path.split('/')[3];
    const backup = await dbFirst(env.DB, 'SELECT * FROM backups WHERE id = ?', [id]);
    if (!backup) return error('ไม่พบ Backup', 404);

    // Fetch from R2
    let snapshot;
    try {
      const obj = await env.STORAGE.get(backup.r2_key);
      if (!obj) return error('ไม่พบไฟล์ Backup ใน Storage');
      const text = await obj.text();
      snapshot = JSON.parse(text);
    } catch (e) {
      return error(`ไม่สามารถอ่านไฟล์ Backup ได้: ${e.message}`);
    }

    // Restore each table (clear + re-insert)
    // WARNING: This is destructive. Only restore non-auth tables for safety.
    const restorableTables = ['cars', 'drivers', 'queue', 'usage_records', 'fuel_log',
      'repair_log', 'tax_records', 'insurance_records', 'check_log', 'vehicle_maintenance', 'leaves'];

    for (const table of restorableTables) {
      if (!snapshot[table]) continue;
      await dbRun(env.DB, `DELETE FROM ${table}`);
      for (const row of snapshot[table]) {
        const cols = Object.keys(row).join(', ');
        const placeholders = Object.keys(row).map(() => '?').join(', ');
        await dbRun(env.DB, `INSERT OR IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`, Object.values(row));
      }
    }

    await writeAuditLog(env.DB, user.id, user.displayName, 'restore_backup', 'backup', id, { filename: backup.filename });
    return success({ message: 'กู้คืนข้อมูลเรียบร้อย' });
  }

  return error('Not Found', 404);
}
