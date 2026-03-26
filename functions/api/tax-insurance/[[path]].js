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
    try { requirePermission(user, 'tax', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const days = parseInt(url.searchParams.get('days') || '30');
    const cutoff = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    const rows = await dbAll(env.DB,
      `SELECT c.id, c.license_plate, c.brand, c.registration_expiry,
              CASE WHEN c.registration_expiry <= ? THEN 1 ELSE 0 END as tax_expiring
       FROM cars c WHERE c.status = 'active'
       AND c.registration_expiry <= ?
       ORDER BY c.registration_expiry ASC`,
      [cutoff, cutoff]
    );
    return success(rows);
  }

  if (path === '/api/tax-insurance/tax' && method === 'GET') {
    try { requirePermission(user, 'tax', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const where = carId ? 'WHERE tr.car_id = ?' : '';
    const rows = await dbAll(env.DB,
      `SELECT tr.*, c.license_plate, c.brand FROM tax_records tr
       LEFT JOIN cars c ON tr.car_id = c.id
       ${where} ORDER BY tr.expiry_date DESC`,
      carId ? [carId] : []
    );
    return success(rows);
  }

  if (path === '/api/tax-insurance/tax' && method === 'POST') {
    try { requirePermission(user, 'tax', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    let receiptUrl = '';
    if (body.doc_base64 && body.doc_mime) {
      receiptUrl = await uploadToR2(env, body.doc_base64, `tax_doc_${id}.jpg`, 'TAX', body.doc_mime);
    }
    await dbRun(env.DB,
      `INSERT INTO tax_records (id, car_id, tax_type, amount, paid_date, expiry_date,
        receipt_image, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.tax_type || 'annual_tax', body.amount || 0,
       body.paid_date || null, body.expiry_date || null,
       receiptUrl || body.receipt_image || '', body.notes || '', user.id, ts]
    );
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
    const fields = ['tax_type', 'amount', 'paid_date', 'expiry_date', 'notes'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.doc_base64 && body.doc_mime) {
      const receiptUrl = await uploadToR2(env, body.doc_base64, `tax_doc_${id}.jpg`, 'TAX', body.doc_mime);
      updates.push('receipt_image = ?'); params.push(receiptUrl);
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(id);
    await dbRun(env.DB, `UPDATE tax_records SET ${updates.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลภาษีรถเรียบร้อย' });
  }

  if (path === '/api/tax-insurance/insurance' && method === 'GET') {
    try { requirePermission(user, 'insurance', 'view'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const carId = url.searchParams.get('car_id');
    const where = carId ? 'WHERE ir.car_id = ?' : '';
    const rows = await dbAll(env.DB,
      `SELECT ir.*, c.license_plate, c.brand FROM insurance_records ir
       LEFT JOIN cars c ON ir.car_id = c.id
       ${where} ORDER BY ir.expiry_date DESC`,
      carId ? [carId] : []
    );
    return success(rows);
  }

  if (path === '/api/tax-insurance/insurance' && method === 'POST') {
    try { requirePermission(user, 'insurance', 'create'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const body = await parseBody(request);
    if (!body?.car_id) return error('กรุณาระบุยานพาหนะ');
    const id = generateUUID();
    const ts = now();
    let receiptUrl = '';
    if (body.doc_base64 && body.doc_mime) {
      receiptUrl = await uploadToR2(env, body.doc_base64, `insurance_doc_${id}.jpg`, 'INSURANCE', body.doc_mime);
    }
    await dbRun(env.DB,
      `INSERT INTO insurance_records (id, car_id, insurance_type, insurance_company, policy_number,
        amount, paid_date, expiry_date, coverage_details, receipt_image, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.car_id, body.insurance_type || 'compulsory', body.insurance_company || '',
       body.policy_number || '', body.amount || 0, body.paid_date || null,
       body.expiry_date || null, body.coverage_details || '', receiptUrl || body.receipt_image || '',
       body.notes || '', user.id, ts]
    );
    await writeAuditLog(env.DB, user.id, user.displayName, 'create_insurance', 'insurance', id, null);
    return success({ id, message: 'บันทึกข้อมูลประกันภัยเรียบร้อย' }, 201);
  }

  if (path.match(/\/api\/tax-insurance\/insurance\/[^/]+/) && method === 'PUT') {
    try { requirePermission(user, 'insurance', 'edit'); } catch { return error('ไม่มีสิทธิ์', 403); }
    const id = path.split('/')[4];
    const body = await parseBody(request);
    const fields = ['insurance_type', 'insurance_company', 'policy_number', 'amount',
      'paid_date', 'expiry_date', 'coverage_details', 'notes'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
    }
    if (body.doc_base64 && body.doc_mime) {
      const receiptUrl = await uploadToR2(env, body.doc_base64, `insurance_doc_${id}.jpg`, 'INSURANCE', body.doc_mime);
      updates.push('receipt_image = ?'); params.push(receiptUrl);
    }
    if (!updates.length) return error('ไม่มีข้อมูลที่จะอัปเดต');
    params.push(id);
    await dbRun(env.DB, `UPDATE insurance_records SET ${updates.join(', ')} WHERE id = ?`, params);
    return success({ message: 'อัปเดตข้อมูลประกันภัยเรียบร้อย' });
  }

  return error('Not Found', 404);
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}