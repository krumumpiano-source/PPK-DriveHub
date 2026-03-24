// OCR via Gemini Vision API
import { success, error, parseBody } from '../../_helpers.js';

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

  repair_doc: `วิเคราะห์ภาพเอกสารซ่อมรถหรือใบเสร็จอู่ และส่งคืนข้อมูลในรูปแบบ JSON ต่อไปนี้เท่านั้น:
{
  "shop_name": "ชื่ออู่หรือศูนย์บริการ",
  "repair_type": "ประเภทการซ่อม",
  "description": "รายละเอียดการซ่อม",
  "actual_cost": 0,
  "date": "YYYY-MM-DD"
}`,
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