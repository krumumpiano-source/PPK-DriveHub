// Tax + insurance tracking
// Tax & insurance record tracking
import {
  dbAll, dbFirst, dbRun, generateUUID, now, success, error,
  parseBody, requirePermission, extractParam, writeAuditLog, uploadToR2
} from '../../_helpers.js';

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);

  if (path === '/api/tax-insurance/expiring' && method === 'GET') {
    const days = parseInt(url.searchParams.get('days') || '30');
    const cutoff = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    const rows = await dbAll(env.DB,
      `SELECT c.id, c.car_id, c.brand, c.license_plate,
              c.registration_expiry, c.insurance_expiry,
              CASE WHEN c.registration_expiry <= ? THEN 1 ELSE 0 END as tax_expiring,
              CASE WHEN c.insurance_expiry <= ? THEN 1 ELSE 0 END as insurance_expiring
       FROM cars c WHERE c.active = 1
       AND (c.registration_expiry <= ? OR c.insurance_expiry <= ?)
       ORDER BY c.registration_expiry ASC`,
      [cutoff, cutoff, cutoff, cutoff]
    );
    return success(rows);
  }


  if (path === '/api/tax-insurance/tax' && method === 'GET') {
    const carId = url.searchParams.get('car_id');
    const where = carId ? 'WHERE car_id = ?' : '';
    const rows = await dbAll(env.DB,
      `SELECT tr.*, c.car_id as car_code, c.brand, c.license_plate FROM tax_records tr
       LEFT JOIN cars c ON tr.car_id = c.id
       ${where} ORDER BY tr.year DESC`,
      carId ? [carId] : []
    );
    return success(rows);
  }

  if (path === '/api/tax-insurance/tax' && method === 'POST') {
    try { requirePermission(user, 'tax', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.year) return error('กรุณาระบุยานพาหนะและปี');
    const id = generateUUID();
    const ts = now();
    let docUrl = '';
    if (body.doc_base64 && body.doc_mime) {
      docUrl = await uploadToR2(env, body.doc_base64, `tax_doc_${id}.jpg`, 'TAX', body.doc_mime);
    }
    await dbRun(env.DB,
      `INSERT INTO tax_records (id, car_id, year, expiry_date, tax_amount, payment_date,
        payment_ref, doc_url, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.year, body.expiry_date || null, body.tax_amount || 0,
       body.payment_date || null, body.payment_ref || '', docUrl, body.notes || '', user.id, ts, ts]
    );
    // Update car registration_expiry
    if (body.expiry_date) {
      await dbRun(env.DB, 'UPDATE cars SET registration_expiry = ?, updated_at = ? WHERE id = ?',
        [body.expiry_date, ts, body.car_id]);
    }
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_tax', 'tax', id, null);
    return success({ id, message: 'บันทึกข้อมูลภาษีรถเรียบร้อย' }, 201);
  }

  if (path.match(/\/api\/tax-insurance\/tax\/[^/]+/) && method === 'PUT') {
    try { requirePermission(user, 'tax', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    const fields = ['year', 'expiry_date', 'tax_amount', 'payment_date', 'payment_ref', 'notes'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.doc_base64 && body.doc_mime) {
      const docUrl = await uploadToR2(env, body.doc_base64, `tax_doc_${id}.jpg`, 'TAX', body.doc_mime);
      updates.push('doc_url = ?'); params.push(docUrl);
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?'); params.push(now(), id);
    await dbRun(env.DB, `UPDATE tax_records SET ${updates.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลภาษีรถเรียบร้อย' });
  }


  if (path === '/api/tax-insurance/insurance' && method === 'GET') {
    const carId = url.searchParams.get('car_id');
    const where = carId ? 'WHERE car_id = ?' : '';
    const rows = await dbAll(env.DB,
      `SELECT ir.*, c.car_id as car_code, c.brand, c.license_plate FROM insurance_records ir
       LEFT JOIN cars c ON ir.car_id = c.id
       ${where} ORDER BY ir.expiry_date DESC`,
      carId ? [carId] : []
    );
    return success(rows);
  }

  if (path === '/api/tax-insurance/insurance' && method === 'POST') {
    try { requirePermission(user, 'insurance', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id || !body?.policy_number) return error('กรุณาระบุยานพาหนะและเลขกรมธรรม์');
    const id = generateUUID();
    const ts = now();
    let docUrl = '';
    if (body.doc_base64 && body.doc_mime) {
      docUrl = await uploadToR2(env, body.doc_base64, `insurance_doc_${id}.jpg`, 'INSURANCE', body.doc_mime);
    }
    await dbRun(env.DB,
      `INSERT INTO insurance_records (id, car_id, policy_number, insurance_type, company,
        coverage_amount, premium, start_date, expiry_date, doc_url, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.policy_number, body.insurance_type || 'type1', body.company || '',
       body.coverage_amount || 0, body.premium || 0, body.start_date || null, body.expiry_date || null,
       docUrl, body.notes || '', user.id, ts, ts]
    );
    // Update car insurance_expiry
    if (body.expiry_date) {
      await dbRun(env.DB, 'UPDATE cars SET insurance_expiry = ?, updated_at = ? WHERE id = ?',
        [body.expiry_date, ts, body.car_id]);
    }
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_insurance', 'insurance', id, null);
    return success({ id, message: 'บันทึกข้อมูลประกันภัยเรียบร้อย' }, 201);
  }

  if (path.match(/\/api\/tax-insurance\/insurance\/[^/]+/) && method === 'PUT') {
    try { requirePermission(user, 'insurance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    const fields = ['policy_number', 'insurance_type', 'company', 'coverage_amount', 'premium',
      'start_date', 'expiry_date', 'notes'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.doc_base64 && body.doc_mime) {
      const docUrl = await uploadToR2(env, body.doc_base64, `insurance_doc_${id}.jpg`, 'INSURANCE', body.doc_mime);
      updates.push('doc_url = ?'); params.push(docUrl);
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    updates.push('updated_at = ?'); params.push(now(), id);
    await dbRun(env.DB, `UPDATE insurance_records SET ${updates.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลประกันภัยเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}