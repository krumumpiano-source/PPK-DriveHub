// OCR via Gemini Vision API
import { success, error, parseBody, requirePermission } from '../../_helpers.js';

const DOC_MODULE = { fuel_receipt: 'fuel', pump_meter: 'fuel', vehicle_registration: 'vehicles', insurance_doc: 'insurance', tax_doc: 'tax', repair_doc: 'repair' };

// Document type → Gemini prompt
const PROMPTS = {
  fuel_receipt: `วิเคราะห์ภาพใบเสร็จน้ำมัน และส่งคืนข้อมูลในรูปแบบ JSON ต่อไปนี้เท่านั้น ห้ามเพิ่มข้อความอื่น:
{
  "station_name": "ชื่อปั๊มน้ำมัน",
  "fuel_type": "ประเภทน้ำมัน (เช่น diesel, gasohol_95, e20)",
  "liters": 0.00,
  "price_per_litre": 0.00,
  "total_cost": 0.00,
  "date": "YYYY-MM-DD"
}`,

  pump_meter: `วิเคราะห์ภาพหัวจ่ายน้ำมัน (pump meter) และส่งคืนข้อมูลในรูปแบบ JSON ต่อไปนี้เท่านั้น:
{
  "pump_meter_number": "หมายเลขหัวจ่าย",
  "liters": 0.00,
  "total_amount": 0.00
}`,

  vehicle_registration: `วิเคราะห์ภาพเล่มทะเบียนรถ และส่งคืนข้อมูลในรูปแบบ JSON ต่อไปนี้เท่านั้น:
{
  "license_plate": "เลขทะเบียน",
  "brand": "ยี่ห้อรถ",
  "model": "รุ่นรถ",
  "color": "สีรถ",
  "year": 0,
  "engine_number": "เลขเครื่องยนต์",
  "chassis_number": "เลขตัวถัง",
  "registration_expiry": "YYYY-MM-DD"
}`,

  insurance_doc: `วิเคราะห์ภาพเอกสารประกันภัยรถยนต์ และส่งคืนข้อมูลในรูปแบบ JSON ต่อไปนี้เท่านั้น:
{
  "policy_number": "เลขกรมธรรม์",
  "company": "บริษัทประกัน",
  "insurance_type": "ประเภทประกัน (type1/type2/type3)",
  "coverage_amount": 0,
  "premium": 0,
  "start_date": "YYYY-MM-DD",
  "expiry_date": "YYYY-MM-DD",
  "license_plate": "เลขทะเบียนรถ"
}`,

  tax_doc: `วิเคราะห์ภาพใบภาษีรถยนต์ประจำปี และส่งคืนข้อมูลในรูปแบบ JSON ต่อไปนี้เท่านั้น:
{
  "license_plate": "เลขทะเบียน",
  "year": 0,
  "tax_amount": 0,
  "payment_date": "YYYY-MM-DD",
  "expiry_date": "YYYY-MM-DD"
}`,

  odometer_reading: `อ่านตัวเลขระยะทางบนมิเตอร์รถยนต์ ไม่ว่าดิจิตอลหรือตัวเลขหมุนกลไก ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น:
{
  "mileage": <ตัวเลขเต็ม ไม่มีจุลภาค เช่น 123456>,
  "confidence": "high" หรือ "medium" หรือ "low" หรือ "unreadable"
}`,

  repair_doc: `วิเคราะห์ภาพใบแจ้งหนี้/ใบเสร็จซ่อมรถ (เช่น ใบจากศูนย์ Toyota, อู่ทั่วไป) และส่งคืนข้อมูลในรูปแบบ JSON ต่อไปนี้เท่านั้น ห้ามเพิ่มข้อความอื่น:
{
  "invoice_number": "เลขที่เอกสาร/ใบแจ้งหนี้",
  "work_order_number": "เลขที่ใบสั่งซ่อม (ถ้ามี)",
  "shop_name": "ชื่ออู่หรือศูนย์บริการ",
  "service_type": "scheduled_maintenance หรือ repair (ถ้าเป็นเช็คระยะ/บำรุงรักษาตามระยะให้ใส่ scheduled_maintenance, ถ้าเป็นซ่อมทั่วไปให้ใส่ repair)",
  "description": "สรุปรายละเอียดการซ่อม/เช็คระยะทั้งหมดสั้นๆ",
  "date": "YYYY-MM-DD (วันที่เข้าซ่อม)",
  "date_completed": "YYYY-MM-DD (วันที่ซ่อมเสร็จ ถ้ามี)",
  "mileage_in": 0,
  "mileage_out": 0,
  "mechanic_name": "ชื่อพนักงานรับรถ/ช่าง (ถ้ามี)",
  "labour_cost": 0.00,
  "parts_cost": 0.00,
  "discount_amount": 0.00,
  "vat_amount": 0.00,
  "grand_total": 0.00,
  "items": [
    {
      "part_code": "รหัสอะไหล่",
      "description": "ชื่อรายการ",
      "brand_condition": "ยี่ห้อ/สภาพ (ถ้ามี)",
      "quantity": 1,
      "unit_price": 0.00,
      "discount_percent": 0,
      "net_amount": 0.00,
      "item_type": "part หรือ labour หรือ service"
    }
  ]
}
หมายเหตุ: ถ้ามีหลายหน้า ให้รวมข้อมูลทั้งหมดเป็น JSON เดียว. item_type ให้ใส่ "service" สำหรับรายการเช็คระยะฟรี, "part" สำหรับอะไหล่, "labour" สำหรับค่าแรง. ถ้ายอดเป็น "ฟรี" ให้ใส่ net_amount = 0`,
};

export async function onRequest(context) {
  try {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const user = env.user;

  if (!user) return error('Unauthorized', 401);
  if (path !== '/api/ocr/extract' || method !== 'POST') return error('Not Found', 404);

  const body = await parseBody(request);
  if (!body?.base64 || !body?.mime) return error('กรุณาส่ง base64 และ mime type');
  if (!body?.doc_type) return error('กรุณาระบุ doc_type');

  const prompt = PROMPTS[body.doc_type];
  if (!prompt) return error(`ไม่รองรับ doc_type: ${body.doc_type}. ใช้: ${Object.keys(PROMPTS).join(', ')}`);

  const docMod = DOC_MODULE[body.doc_type];
  if (docMod) { try { requirePermission(user, docMod, 'view'); } catch { return error('ไม่มีสิทธิ์', 403); } }
  const geminiKey = env.GEMINI_API_KEY;
  if (!geminiKey) return error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY', 500);

  // Call Gemini Vision API (gemini-1.5-flash — free tier)
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: body.mime,
            data: body.base64
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
    }
  };

  let geminiResp;
  try {
    geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    return error(`ไม่สามารถเชื่อมต่อ Gemini API ได้: ${e.message}`, 502);
  }

  if (!geminiResp.ok) {
    const errText = await geminiResp.text();
    return error(`Gemini API error ${geminiResp.status}: ${errText}`, 502);
  }

  const geminiData = await geminiResp.json();
  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse JSON from response (strip markdown code blocks if present)
  let extracted = {};
  try {
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || rawText.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawText;
    extracted = JSON.parse(jsonStr.trim());
  } catch {
    // Return raw text if JSON parse fails
    return success({ raw_text: rawText, parsed: null, doc_type: body.doc_type });
  }

  return success({ extracted, doc_type: body.doc_type, raw_text: rawText });
  } catch (e) {
    console.error('API Error:', e);
    return error(e.message || 'Internal Server Error', 500);
  }
}