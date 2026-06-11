#!/usr/bin/env node
// scripts/generate-report.mjs
// รายงานงานยานพาหนะ ปีการศึกษา 2568 — โรงเรียนพะเยาพิทยาคม
// จัดทำโดย นายพงศธร โพธิแก้ว รองหัวหน้างานยานพาหนะ

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, PageBreak,
  UnderlineType
} from 'docx';

// ─── Config ──────────────────────────────────────────────────────────────────
const OUTPUT_DIR  = 'D:\\รายงานยานพาหนะ 2568';
const OUTPUT_FILE = `${OUTPUT_DIR}\\รายงานงานยานพาหนะ-2568.docx`;
const DB          = 'ppk-drivehub-db';
const YS          = '2025-05-01';
const YE          = '2026-04-30';
const YE_DT       = '2026-04-30T23:59:59';
const YEAR_MONTHS = [
  '2025-05','2025-06','2025-07','2025-08','2025-09','2025-10',
  '2025-11','2025-12','2026-01','2026-02','2026-03','2026-04'
];

// ─── Persons ─────────────────────────────────────────────────────────────────
const P = {
  author:   { name: 'นายพงศธร โพธิแก้ว',               pos: 'รองหัวหน้างานยานพาหนะ' },
  chief:    { name: 'นางจีรพา กันทา',                   pos: 'หัวหน้างานยานพาหนะ' },
  deputy:   { name: 'นายยศ กันทายวง',                   pos: 'รองผู้อำนวยการกลุ่มบริหารงานบุคคล' },
  director: { name: 'ว่าที่ร้อยตรีญาณบดินทร์ อินเตชะ',  pos: 'ผู้อำนวยการโรงเรียนพะเยาพิทยาคม' },
};
const SCHOOL = 'โรงเรียนพะเยาพิทยาคม';
const ORG    = 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพะเยา';

// ─── Lookup tables ───────────────────────────────────────────────────────────
const FUEL_TYPE_TH   = { gasohol91:'แก๊สโซฮอล์ 91', gasohol95:'แก๊สโซฮอล์ 95', diesel:'ดีเซล B7', e20:'E20', fuelSave:'FuelSave', other:'อื่นๆ' };
const VEH_TYPE_TH    = { van:'รถตู้', sedan:'รถยนต์นั่ง', pickup:'รถกระบะ', bus:'รถโดยสาร', motorcycle:'รถจักรยานยนต์' };
const CAR_STATUS_TH  = { active:'ใช้งานได้', inactive:'ไม่ได้ใช้งาน', maintenance:'อยู่ระหว่างซ่อม' };
const DRV_STATUS_TH  = { active:'ปฏิบัติงาน', inactive:'ไม่ปฏิบัติงาน', on_leave:'ลาพัก' };
const SVC_TYPE_TH    = { repair:'ซ่อมทั่วไป', scheduled_service:'บำรุงรักษาตามระยะ', accident:'อุบัติเหตุ', insurance:'เคลมประกัน' };
const PURPOSE_TH     = { school_passenger:'รับ-ส่งนักเรียน', official_document:'เดินทางราชการ', other:'อื่นๆ' };

// ─── Thai date helpers ───────────────────────────────────────────────────────
const TH_MONTHS    = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MONTHS_SH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function toDate(s) {
  if (!s) return null;
  const str = String(s).replace(' ','T');
  const d = new Date(str.length === 10 ? str + 'T00:00:00' : str);
  return isNaN(d.getTime()) ? null : d;
}
function thDate(s) {
  const d = toDate(s); if (!d) return '-';
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()+543}`;
}
function thDateSh(s) {
  const d = toDate(s); if (!d) return '-';
  return `${String(d.getDate()).padStart(2,'0')} ${TH_MONTHS_SH[d.getMonth()]} ${String(d.getFullYear()+543).slice(-2)}`;
}
function thMonthYear(ym) {
  const [y,m] = ym.split('-');
  return `${TH_MONTHS[+m-1]} ${+y+543}`;
}
function getYM(s) { return s ? String(s).slice(0,7) : null; }
function nf(n, dec=0) {
  if (n==null || n==='' || isNaN(+n)) return '-';
  return (+n).toLocaleString('th-TH',{minimumFractionDigits:dec,maximumFractionDigits:dec});
}
function bf(n) { return nf(n,2); }

// ─── DB query ────────────────────────────────────────────────────────────────
function qDB(sql) {
  try {
    const escaped = sql.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const out = execSync(
      `npx wrangler d1 execute ${DB} --remote --json --command "${escaped}"`,
      { encoding:'utf8', maxBuffer:150*1024*1024, stdio:['pipe','pipe','pipe'] }
    );
    const idx = out.indexOf('[');
    if (idx < 0) return [];
    return JSON.parse(out.slice(idx))[0]?.results ?? [];
  } catch(e) {
    console.error('❌ Query error:', e.message.slice(0,200));
    return [];
  }
}

// ─── Docx style helpers ──────────────────────────────────────────────────────
const F  = 'TH Sarabun New';
const SB = 32;   // 16pt body
const SH = 36;   // 18pt heading
const ST = 48;   // 24pt title
const SC = 60;   // 30pt cover

const BC = {
  top:    { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  left:   { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  right:  { style: BorderStyle.SINGLE, size: 6, color: '000000' },
};
const HS = { type: ShadingType.CLEAR, fill: 'BFBFBF' };
const HS2 = { type: ShadingType.CLEAR, fill: 'E0E0E0' };

const spNormal = { before:0, after:0, line:360, lineRule:'auto' };
const spSmall  = { before:40, after:40, line:300, lineRule:'auto' };
const spHead   = { before:200, after:100, line:360, lineRule:'auto' };
const spCover  = { before:120, after:120, line:400, lineRule:'auto' };
const spSig    = { before:240, after:0,   line:360, lineRule:'auto' };

function tr(text, opts={}) {
  return new TextRun({ text:String(text??''), font:F, size:opts.size||SB, bold:!!opts.bold, underline:opts.underline?{type:UnderlineType.SINGLE}:undefined, color:opts.color||'000000' });
}

function pp(children, opts={}) {
  const kids = typeof children === 'string' ? [tr(children,opts)] : (Array.isArray(children)?children:[children]);
  return new Paragraph({ alignment:opts.align||AlignmentType.LEFT, spacing:opts.sp||spNormal, indent:opts.indent||{}, children:kids });
}
function ppc(text,opts={}) { return pp(text,{...opts,align:AlignmentType.CENTER}); }
function ppr(text,opts={}) { return pp(text,{...opts,align:AlignmentType.RIGHT}); }
function ppbold(text,opts={}) { return pp(text,{...opts,bold:true}); }

function el(n=1) { return Array.from({length:n},()=>pp('',{sp:{...spNormal,line:280}})); }
function pb()    { return new Paragraph({ children:[new PageBreak()], spacing:{before:0,after:0} }); }

function hCell(text, w, opts={}) {
  return new TableCell({
    width:w?{size:w,type:WidthType.DXA}:undefined, borders:BC, shading:HS, verticalAlign:'center',
    children:[new Paragraph({ alignment:AlignmentType.CENTER, spacing:spSmall,
      children:[tr(text,{size:opts.size||SB,bold:true})] })]
  });
}
function dCell(text, w, opts={}) {
  return new TableCell({
    width:w?{size:w,type:WidthType.DXA}:undefined, borders:BC, verticalAlign:'center', columnSpan:opts.span,
    children:[new Paragraph({ alignment:opts.align||AlignmentType.LEFT, spacing:spSmall,
      children:[tr(String(text??'-'),{size:opts.size||SB,bold:opts.bold})] })]
  });
}
function dCellC(t,w,o={}) { return dCell(t,w,{...o,align:AlignmentType.CENTER}); }
function dCellR(t,w,o={}) { return dCell(t,w,{...o,align:AlignmentType.RIGHT}); }

function makeTable(headers, rows) {
  // headers: [{text,w,size?}], rows: TableCell[][]
  return new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    rows:[
      new TableRow({ tableHeader:true, children:headers.map(h=>hCell(h.text,h.w,h)) }),
      ...rows.map(r=>new TableRow({children:r}))
    ]
  });
}

// ─── Source line ─────────────────────────────────────────────────────────────
function sourceNote(extra='') {
  const now = thDate(new Date().toISOString().slice(0,10));
  return pp([tr(`ที่มา: ระบบบริหารงานยานพาหนะ PPK-DriveHub, ${SCHOOL} ณ วันที่ ${now}${extra?` | ${extra}`:''}`,
    {size:26,color:'555555'})], {sp:{before:60,after:60,line:280,lineRule:'auto'}});
}

// ─── Load all data ───────────────────────────────────────────────────────────
console.log('\n📊 กำลังดึงข้อมูลจากฐานข้อมูล Cloudflare D1...\n');

const cars = qDB(`SELECT id,license_plate,brand,model,year,color,fuel_type,seat_count,vehicle_type,vehicle_category,status,registration_expiry,current_mileage FROM cars ORDER BY vehicle_type,license_plate`);
console.log(`  ✓ ข้อมูลรถ: ${cars.length} คัน`);

const drivers = qDB(`SELECT id,title,first_name,last_name,license_number,license_expiry,phone,status,discipline_score,fatigue_flag,position,assignment_type FROM drivers ORDER BY status,first_name`);
console.log(`  ✓ พนักงานขับรถ: ${drivers.length} คน`);

const queue = qDB(`SELECT q.id,q.date,q.time_start,q.time_end,q.car_id,c.license_plate,q.driver_id,COALESCE(d.first_name||' '||d.last_name,'') AS driver_name,q.requested_by,q.mission,q.destination,q.passengers,q.status,q.notes FROM queue q LEFT JOIN cars c ON c.id=q.car_id LEFT JOIN drivers d ON d.id=q.driver_id WHERE q.date>='${YS}' AND q.date<='${YE}' AND q.status!='cancelled' ORDER BY q.date,q.time_start`);
console.log(`  ✓ รายการใช้รถ: ${queue.length} รายการ`);

const usage = qDB(`SELECT u.id,u.car_id,c.license_plate,u.record_type,u.datetime,u.mileage,u.destination,u.purpose,u.passengers,u.requester_name,u.queue_id,u.data_quality,COALESCE(d.first_name||' '||d.last_name,u.driver_name_manual) AS driver_name FROM usage_records u LEFT JOIN cars c ON c.id=u.car_id LEFT JOIN drivers d ON d.id=u.driver_id WHERE u.datetime>='${YS}T00:00:00' AND u.datetime<='${YE_DT}' ORDER BY u.datetime`);
console.log(`  ✓ บันทึกการใช้รถ: ${usage.length} รายการ`);

const fuel = qDB(`SELECT f.id,f.date,f.time,f.car_id,c.license_plate,COALESCE(d.first_name||' '||d.last_name,f.driver_name_manual) AS driver_name,f.liters,f.price_per_liter,f.amount,f.fuel_type,f.gas_station_name,f.mileage_before,f.fuel_consumption_rate,f.document_number,f.expense_type,f.purpose,f.anomaly_flag,f.notes FROM fuel_log f LEFT JOIN cars c ON c.id=f.car_id LEFT JOIN drivers d ON d.id=f.driver_id WHERE f.date>='${YS}' AND f.date<='${YE}' AND f.deleted_at IS NULL ORDER BY f.date,f.time`);
console.log(`  ✓ บันทึกน้ำมัน: ${fuel.length} รายการ`);

const repair = qDB(`SELECT r.id,r.car_id,c.license_plate,r.date_reported,r.date_started,r.date_completed,r.status,r.service_type,r.garage_name,r.mechanic_name,r.issue_description,r.labour_cost,r.parts_cost,r.grand_total,r.invoice_number,r.work_order_number,r.insurance_company,r.claim_number,r.mileage_at_repair FROM repair_log r LEFT JOIN cars c ON c.id=r.car_id WHERE (r.date_reported>='${YS}' OR r.date_completed>='${YS}') AND (r.date_reported<='${YE}' OR r.date_completed IS NULL) AND r.status NOT IN ('cancelled') ORDER BY COALESCE(r.date_completed,r.date_reported)`);
console.log(`  ✓ การซ่อมบำรุง: ${repair.length} รายการ`);

console.log('\n🏗️  กำลังสร้างรายงาน...\n');

// ─── Data Processing ─────────────────────────────────────────────────────────

// Map cars by id
const carMap = Object.fromEntries(cars.map(c=>[c.id,c]));

// Queue stats per car
const queueByCar = {};
const queueByDriver = {};
const queueByMonth = {};
for (const qr of queue) {
  const plate = qr.license_plate || qr.car_id;
  if (!queueByCar[plate]) queueByCar[plate] = { trips:0, passengers:0, missions:{}, destinations:{} };
  queueByCar[plate].trips++;
  queueByCar[plate].passengers += (qr.passengers||0);
  if (qr.mission) { queueByCar[plate].missions[qr.mission] = (queueByCar[plate].missions[qr.mission]||0)+1; }
  if (qr.destination) { queueByCar[plate].destinations[qr.destination] = (queueByCar[plate].destinations[qr.destination]||0)+1; }

  const dname = qr.driver_name || qr.driver_id;
  if (dname) {
    if (!queueByDriver[dname]) queueByDriver[dname] = { trips:0, passengers:0 };
    queueByDriver[dname].trips++;
    queueByDriver[dname].passengers += (qr.passengers||0);
  }

  const ym = getYM(qr.date);
  if (ym) {
    if (!queueByMonth[ym]) queueByMonth[ym] = { trips:0, passengers:0 };
    queueByMonth[ym].trips++;
    queueByMonth[ym].passengers += (qr.passengers||0);
  }
}

// Usage: pair departure/return by queue_id
const usageByQueue = {};
for (const u of usage) {
  const qid = u.queue_id;
  if (!qid) continue;
  if (!usageByQueue[qid]) usageByQueue[qid] = { plate:u.license_plate, carId:u.car_id, driverName:u.driver_name };
  if (u.record_type==='departure') usageByQueue[qid].depart = u;
  if (u.record_type==='return')    usageByQueue[qid].ret    = u;
}
// Distance per car
const distByCar = {};
let totalDistAll = 0;
for (const [,trip] of Object.entries(usageByQueue)) {
  if (trip.depart?.mileage && trip.ret?.mileage) {
    const dist = trip.ret.mileage - trip.depart.mileage;
    if (dist > 0 && dist < 2000) { // sanity check
      const plate = trip.plate || 'unknown';
      distByCar[plate] = (distByCar[plate]||0) + dist;
      totalDistAll += dist;
    }
  }
}

// Fuel stats
const fuelByMonth = {};
const fuelByCar   = {};
const fuelAnomalies = fuel.filter(f=>f.anomaly_flag==1||f.anomaly_flag==='1');
let totalFuelLiters = 0, totalFuelAmount = 0;
for (const f of fuel) {
  const ym = getYM(f.date);
  if (ym) {
    if (!fuelByMonth[ym]) fuelByMonth[ym] = { count:0, liters:0, amount:0 };
    fuelByMonth[ym].count++;
    fuelByMonth[ym].liters  += (+f.liters||0);
    fuelByMonth[ym].amount  += (+f.amount||0);
  }
  const plate = f.license_plate||f.car_id;
  if (!fuelByCar[plate]) fuelByCar[plate] = { count:0, liters:0, amount:0, rates:[] };
  fuelByCar[plate].count++;
  fuelByCar[plate].liters  += (+f.liters||0);
  fuelByCar[plate].amount  += (+f.amount||0);
  if (f.fuel_consumption_rate && +f.fuel_consumption_rate > 0) fuelByCar[plate].rates.push(+f.fuel_consumption_rate);
  totalFuelLiters += (+f.liters||0);
  totalFuelAmount += (+f.amount||0);
}
// avg consumption rate per car
for (const [,v] of Object.entries(fuelByCar)) {
  v.avgRate = v.rates.length ? v.rates.reduce((a,b)=>a+b,0)/v.rates.length : null;
}

// Repair stats
const repairByCar = {};
let totalRepairCost = 0, totalBudgetCost = 0, totalInsuranceCost = 0;
for (const r of repair) {
  const plate = r.license_plate||r.car_id;
  if (!repairByCar[plate]) repairByCar[plate] = { count:0, cost:0, types:{} };
  repairByCar[plate].count++;
  repairByCar[plate].cost += (+r.grand_total||0);
  repairByCar[plate].types[r.service_type] = (repairByCar[plate].types[r.service_type]||0)+1;
  totalRepairCost += (+r.grand_total||0);
  if (r.service_type==='insurance') totalInsuranceCost += (+r.grand_total||0);
  else totalBudgetCost += (+r.grand_total||0);
}

// Avg repair cost per car
const avgRepairCost = Object.keys(repairByCar).length ? totalRepairCost / Object.keys(repairByCar).length : 0;

// Problems from data
const lowDisciplineDrivers = drivers.filter(d=>d.discipline_score!=null && +d.discipline_score < 80);
const expiredLicense       = drivers.filter(d=>d.license_expiry && d.license_expiry < YE && d.status==='active');
const highRepairCars       = repair.reduce((acc,r)=>{ const k=r.license_plate; acc[k]=(acc[k]||0)+(+r.grand_total||0); return acc; },{});
const topRepairCar         = Object.entries(highRepairCars).sort((a,b)=>b[1]-a[1])[0];

// ─── Section builders ────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// COVER PAGE
// ══════════════════════════════════════════════════════════════════════════════
function buildCover() {
  return [
    ...el(2),
    ppc('❧', {sp:spCover, size:56}),
    ...el(1),
    ppc('รายงานผลการปฏิบัติงาน', {sp:spCover, size:SC, bold:true}),
    ppc('งานยานพาหนะ', {sp:spCover, size:SC, bold:true}),
    ...el(1),
    ppc('─────────────────────────────', {sp:{before:0,after:0,line:280,lineRule:'auto'}, size:28}),
    ...el(1),
    ppc(SCHOOL, {sp:spCover, size:44, bold:true}),
    ppc(ORG, {sp:{...spCover,before:60}, size:32}),
    ppc('กระทรวงศึกษาธิการ', {sp:{...spCover,before:40}, size:32}),
    ...el(1),
    ppc('ปีการศึกษา ๒๕๖๘', {sp:spCover, size:ST, bold:true}),
    ppc('(๑ พฤษภาคม ๒๕๖๘ – ๓๐ เมษายน ๒๕๖๙)', {sp:{...spCover,before:60}, size:SB}),
    ...el(2),
    ppc('─────────────────────────────', {sp:{before:0,after:0,line:280,lineRule:'auto'}, size:28}),
    ...el(1),
    ppc('จัดทำโดย', {sp:spCover, size:SB}),
    ppc(P.author.name, {sp:{...spCover,before:60}, size:36, bold:true}),
    ppc(P.author.pos, {sp:{...spCover,before:40}, size:SB}),
    ppc(SCHOOL, {sp:{...spCover,before:40}, size:SB}),
    pb(),
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// คำนำ
// ══════════════════════════════════════════════════════════════════════════════
function buildKhamnam() {
  const indented = { left:720 };
  return [
    ppc('คำนำ', {sp:{before:0,after:240,line:360,lineRule:'auto'}, size:SH, bold:true}),
    pp('          รายงานฉบับนี้จัดทำขึ้นเพื่อสรุปผลการดำเนินงานของงานยานพาหนะ โรงเรียนพะเยาพิทยาคม ในรอบปีการศึกษา ๒๕๖๘ (๑ พฤษภาคม พ.ศ. ๒๕๖๘ – ๓๐ เมษายน พ.ศ. ๒๕๖๙) โดยมีวัตถุประสงค์เพื่อรายงานผลการใช้ยานพาหนะ การเบิกจ่ายน้ำมันเชื้อเพลิง การซ่อมบำรุงรักษา และการปฏิบัติงานของพนักงานขับรถ ให้เป็นไปตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยรถราชการ พ.ศ. ๒๕๒๓ และที่แก้ไขเพิ่มเติม ตลอดจนระเบียบกระทรวงการคลังว่าด้วยค่าใช้จ่ายในการเดินทางไปราชการ และระเบียบที่เกี่ยวข้อง',
      {sp:{before:0,after:200,line:360,lineRule:'auto'}}),
    pp('          ข้อมูลที่ปรากฏในรายงานฉบับนี้ได้รับการบันทึกและรวบรวมผ่านระบบบริหารงานยานพาหนะ PPK-DriveHub ซึ่งผู้ปฏิบัติงานได้บันทึกข้อมูลการใช้รถตามแบบบันทึกการใช้รถราชการ (แบบ ๔) การเบิกจ่ายน้ำมันเชื้อเพลิงพร้อมใบเสร็จรับเงินและภาพถ่าย และการแจ้งซ่อมบำรุงยานพาหนะอย่างครบถ้วนและต่อเนื่องตลอดปีการศึกษา ข้อมูลสถิติทั้งหมดได้รับการตรวจสอบความถูกต้องก่อนนำเสนอ',
      {sp:{before:0,after:200,line:360,lineRule:'auto'}}),
    pp('          ผู้จัดทำหวังเป็นอย่างยิ่งว่ารายงานฉบับนี้จะเป็นประโยชน์ต่อการบริหารจัดการงานยานพาหนะให้มีประสิทธิภาพยิ่งขึ้น รวมทั้งเป็นแนวทางในการวางแผนงบประมาณและการพัฒนาคุณภาพการบริการด้านยานพาหนะของ'+SCHOOL+'ในปีการศึกษาต่อไป',
      {sp:{before:0,after:400,line:360,lineRule:'auto'}}),
    ...el(2),
    ppr(`${SCHOOL}`, {size:SB}),
    ppr(`${thDate(YE)}`, {size:SB, sp:{before:60,after:0,line:360,lineRule:'auto'}}),
    ...el(2),
    ppr(`(ลงชื่อ) ................................................`, {size:SB, sp:{before:120,after:0,line:360,lineRule:'auto'}}),
    ppr(`(${P.author.name})`, {size:SB, sp:{before:40,after:0,line:360,lineRule:'auto'}}),
    ppr(P.author.pos, {size:SB, sp:{before:20,after:0,line:360,lineRule:'auto'}}),
    ppr(`ผู้จัดทำรายงาน`, {size:SB, sp:{before:20,after:0,line:360,lineRule:'auto'}}),
    pb(),
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// สารบัญ
// ══════════════════════════════════════════════════════════════════════════════
function buildTOC() {
  const tocItems = [
    ['คำนำ', 'ก'],
    ['สารบัญ', 'ข'],
    ['สารบัญตาราง', 'ค'],
    ['บทที่ ๑  ข้อมูลพื้นฐาน', '1'],
    ['    ๑.๑  ข้อมูลรถยนต์ราชการ', '1'],
    ['    ๑.๒  สถานะภาษีและประกันภัยรายคัน', '3'],
    ['    ๑.๓  ข้อมูลพนักงานขับรถ', '4'],
    ['บทที่ ๒  รายงานการใช้รถราชการ', '5'],
    ['    ๒.๑  สรุปการใช้รถรายคัน', '5'],
    ['    ๒.๒  สถิติการใช้รถรายเดือน', '7'],
    ['    ๒.๓  บันทึกการใช้รถตามแบบ ๔ (สรุป)', '8'],
    ['บทที่ ๓  รายงานการปฏิบัติงานพนักงานขับรถ', '10'],
    ['บทที่ ๔  รายงานการเบิกจ่ายน้ำมันเชื้อเพลิง', '12'],
    ['    ๔.๑  สรุปการเบิกจ่ายน้ำมันรายเดือน', '12'],
    ['    ๔.๒  สรุปการเบิกจ่ายน้ำมันรายคัน', '14'],
    ['    ๔.๓  รายการที่มีความผิดปกติ (Anomaly)', '16'],
    ['บทที่ ๕  รายงานการซ่อมบำรุงยานพาหนะ', '17'],
    ['    ๕.๑  รายการซ่อมบำรุงทั้งหมด', '17'],
    ['    ๕.๒  สรุปค่าใช้จ่ายรายคัน', '19'],
    ['    ๕.๓  การแยกแหล่งที่มาของค่าใช้จ่าย', '20'],
    ['บทที่ ๖  สรุปภาพรวมและสถิติประจำปีการศึกษา', '21'],
    ['บทที่ ๗  ปัญหาและอุปสรรคที่พบ', '23'],
    ['บทที่ ๘  ข้อเสนอแนะเพื่อการพัฒนา', '24'],
    ['หน้าลงนามรับรอง', '26'],
    ['ภาคผนวก: กฎระเบียบที่เกี่ยวข้อง', '27'],
  ];
  const rows = tocItems.map(([title,page])=>[
    new TableCell({
      borders:{ top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE} },
      children:[pp(title,{sp:{before:20,after:20,line:340,lineRule:'auto'}})]
    }),
    new TableCell({
      width:{size:600,type:WidthType.DXA},
      borders:{ top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE} },
      children:[ppr(page,{sp:{before:20,after:20,line:340,lineRule:'auto'}})]
    }),
  ]);
  return [
    ppc('สารบัญ',{sp:{before:0,after:240,line:360,lineRule:'auto'},size:SH,bold:true}),
    new Table({ width:{size:100,type:WidthType.PERCENTAGE}, rows:rows.map(r=>new TableRow({children:r})) }),
    pb(),
    // สารบัญตาราง
    ppc('สารบัญตาราง',{sp:{before:0,after:240,line:360,lineRule:'auto'},size:SH,bold:true}),
    pp('ตารางที่ ๑-๑    รายการรถราชการทั้งหมด',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๑-๒    สถานะภาษีและประกันภัยรายคัน',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๑-๓    รายชื่อพนักงานขับรถ',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๒-๑    สรุปการใช้รถรายคัน',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๒-๒    สถิติการใช้รถรายเดือน',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๓-๑    สรุปการปฏิบัติงานพนักงานขับรถ',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๔-๑    สรุปการเบิกจ่ายน้ำมันรายเดือน',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๔-๒    สรุปการเบิกจ่ายน้ำมันรายคัน',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๔-๓    รายการน้ำมันที่มีความผิดปกติ',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๕-๑    รายการซ่อมบำรุงยานพาหนะ',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๕-๒    สรุปค่าซ่อมบำรุงรายคัน',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pp('ตารางที่ ๖-๑    ตัวชี้วัดสำคัญประจำปีการศึกษา ๒๕๖๘',{sp:{before:20,after:20,line:340,lineRule:'auto'}}),
    pb(),
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// บทที่ 1 — ข้อมูลพื้นฐาน
// ══════════════════════════════════════════════════════════════════════════════
function buildChapter1() {
  const nodes = [];
  nodes.push(ppc('บทที่ ๑',{sp:spHead,size:SH,bold:true}));
  nodes.push(ppc('ข้อมูลพื้นฐาน',{sp:{...spHead,before:60},size:SH,bold:true}));
  nodes.push(...el(1));

  // 1.1 รายการรถ
  nodes.push(ppbold('๑.๑  ข้อมูลรถยนต์ราชการ',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(pp(`          ${SCHOOL} มีรถราชการอยู่ในความดูแลรวมทั้งสิ้น ${cars.length} คัน จำแนกตามประเภทการใช้งาน ดังตารางที่ ๑-๑`,
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๑-๑  รายการรถราชการทั้งหมด',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const carHeaders = [
    {text:'ลำดับ',w:400},{text:'ทะเบียนรถ',w:900},{text:'ยี่ห้อ/รุ่น',w:1200},{text:'ปีรถ',w:600},
    {text:'สี',w:700},{text:'ประเภทน้ำมัน',w:900},{text:'ที่นั่ง',w:600},{text:'ประเภทรถ',w:900},
    {text:'สถานะ',w:800},{text:'เลขไมล์ล่าสุด',w:1000},{text:'วันหมดอายุทะเบียน',w:1100},
  ];
  const carRows = cars.map((c,i)=>[
    dCellC(i+1,400),
    dCellC(c.license_plate||'-',900),
    dCell(`${c.brand||''} ${c.model||''}`.trim()||'-',1200),
    dCellC(c.year?String(+c.year+543):'-',600),
    dCellC(c.color||'-',700),
    dCellC(FUEL_TYPE_TH[c.fuel_type]||c.fuel_type||'-',900),
    dCellC(c.seat_count||'-',600),
    dCellC(VEH_TYPE_TH[c.vehicle_type]||c.vehicle_type||'-',900),
    dCellC(CAR_STATUS_TH[c.status]||c.status||'-',800),
    dCellR(nf(c.current_mileage),1000),
    dCellC(thDate(c.registration_expiry),1100),
  ]);
  nodes.push(makeTable(carHeaders, carRows));
  nodes.push(sourceNote());
  nodes.push(...el(1));

  // 1.2 ภาษี/ประกัน
  nodes.push(ppbold('๑.๒  สถานะภาษีและประกันภัยรายคัน',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(pp('          ข้อมูลวันหมดอายุภาษีรถยนต์และวันหมดอายุประกันภัยรายคัน ตามที่ปรากฏในระบบ ดังตารางที่ ๑-๒ (หมายเหตุ: ระบบฐานข้อมูลยังไม่ได้บันทึกข้อมูลกรมธรรม์ประกันภัยและภาษีรถยนต์แยกต่างหาก – ขอให้ใช้ข้อมูลเอกสารต้นฉบับเพื่อยืนยัน)',
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๑-๒  สถานะภาษีและประกันภัยรายคัน',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const taxHeaders = [{text:'ลำดับ',w:400},{text:'ทะเบียนรถ',w:900},{text:'ยี่ห้อ/รุ่น',w:1400},{text:'ประเภทรถ',w:900},{text:'วันหมดอายุภาษีรถยนต์',w:1300},{text:'สถานะ',w:900},{text:'หมายเหตุ',w:1700}];
  const today = YE;
  const taxRows = cars.map((c,i)=>{
    const expired = c.registration_expiry && c.registration_expiry < today;
    const status  = !c.registration_expiry ? 'ไม่มีข้อมูล' : expired ? 'หมดอายุแล้ว' : 'ยังไม่หมดอายุ';
    return [
      dCellC(i+1,400),
      dCellC(c.license_plate||'-',900),
      dCell(`${c.brand||''} ${c.model||''}`.trim()||'-',1400),
      dCellC(VEH_TYPE_TH[c.vehicle_type]||c.vehicle_type||'-',900),
      dCellC(thDate(c.registration_expiry),1300),
      dCellC(status,900,{color:expired?'CC0000':'000000'}),
      dCell(expired?'จำเป็นต้องต่อภาษีทะเบียนโดยด่วน':'ดำเนินการปกติ',1700),
    ];
  });
  nodes.push(makeTable(taxHeaders, taxRows));
  nodes.push(sourceNote('ข้อมูลประกันภัยยังไม่ได้บันทึกในระบบ – ควรบันทึกเพิ่มเติม'));
  nodes.push(...el(1));

  // 1.3 พนักงานขับรถ
  nodes.push(ppbold('๑.๓  ข้อมูลพนักงานขับรถ',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(pp(`          ${SCHOOL} มีพนักงานขับรถทั้งสิ้น ${drivers.length} คน จำแนกตามสถานะการปฏิบัติงาน ดังตารางที่ ๑-๓`,
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๑-๓  รายชื่อพนักงานขับรถ',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const drvHeaders = [
    {text:'ลำดับ',w:400},{text:'ชื่อ-นามสกุล',w:1600},{text:'ตำแหน่ง',w:1200},
    {text:'เลขที่ใบขับขี่',w:1200},{text:'วันหมดอายุ',w:900},
    {text:'สถานะ',w:800},{text:'คะแนนวินัย',w:800},{text:'หมายเหตุ',w:1300},
  ];
  const drvRows = drivers.map((d,i)=>{
    const fullName = `${d.title||''}${d.first_name||''} ${d.last_name||''}`.trim();
    const licExpired = d.license_expiry && d.license_expiry < today;
    const score = d.discipline_score!=null ? +d.discipline_score : null;
    const note = licExpired ? 'ใบขับขี่หมดอายุ' : d.fatigue_flag ? 'มีประวัติอ่อนล้า' : '';
    return [
      dCellC(i+1,400),
      dCell(fullName||'-',1600),
      dCell(d.position||d.assignment_type||'-',1200),
      dCellC(d.license_number||'-',1200),
      dCellC(thDate(d.license_expiry),900),
      dCellC(DRV_STATUS_TH[d.status]||d.status||'-',800),
      dCellC(score!=null?nf(score):'-',800),
      dCell(note,1300),
    ];
  });
  nodes.push(makeTable(drvHeaders, drvRows));
  nodes.push(sourceNote());
  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// บทที่ 2 — รายงานการใช้รถ
// ══════════════════════════════════════════════════════════════════════════════
function buildChapter2() {
  const nodes = [];
  nodes.push(ppc('บทที่ ๒',{sp:spHead,size:SH,bold:true}));
  nodes.push(ppc('รายงานการใช้รถราชการ',{sp:{...spHead,before:60},size:SH,bold:true}));
  nodes.push(...el(1));

  const totalTrips = queue.length;
  const totalPax   = queue.reduce((s,q)=>s+(+q.passengers||0),0);
  nodes.push(pp(`          ในปีการศึกษา ๒๕๖๘ (๑ พฤษภาคม ๒๕๖๘ – ๓๐ เมษายน ๒๕๖๙) งานยานพาหนะได้ให้บริการยานพาหนะแก่บุคลากรและนักเรียน${SCHOOL} รวมทั้งสิ้น ${nf(totalTrips)} เที่ยว รวมผู้โดยสาร ${nf(totalPax)} คน-ครั้ง โดยมีรายละเอียดการใช้รถรายคัน รายเดือน และบันทึกการใช้รถตามแบบ ๔ ดังต่อไปนี้`,
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));

  // 2.1 สรุปรายคัน
  nodes.push(ppbold('๒.๑  สรุปการใช้รถรายคัน',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๒-๑  สรุปการใช้รถรายคัน',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const carSumHeaders = [
    {text:'ลำดับ',w:400},{text:'ทะเบียนรถ',w:800},{text:'ยี่ห้อ/รุ่น',w:1200},
    {text:'จำนวนเที่ยว',w:800},{text:'จำนวนผู้โดยสาร (คน-ครั้ง)',w:1000},
    {text:'ระยะทางรวม (กม.)',w:1000},{text:'ภารกิจหลัก',w:1800},{text:'ปลายทางที่ไปบ่อยสุด',w:1600},
  ];
  const carSumRows = cars.map((c,i)=>{
    const plate = c.license_plate;
    const stat  = queueByCar[plate] || { trips:0, passengers:0, missions:{}, destinations:{} };
    const topM  = Object.entries(stat.missions).sort((a,b)=>b[1]-a[1])[0];
    const topD  = Object.entries(stat.destinations).sort((a,b)=>b[1]-a[1])[0];
    const dist  = distByCar[plate];
    return [
      dCellC(i+1,400),
      dCellC(plate,800),
      dCell(`${c.brand||''} ${c.model||''}`.trim()||'-',1200),
      dCellR(nf(stat.trips),800),
      dCellR(nf(stat.passengers),1000),
      dCellR(dist?nf(dist):'-',1000),
      dCell(topM?`${topM[0]} (${topM[1]} ครั้ง)`:'-',1800),
      dCell(topD?`${topD[0]} (${topD[1]} ครั้ง)`:'-',1600),
    ];
  });
  nodes.push(makeTable(carSumHeaders, carSumRows));
  nodes.push(sourceNote());
  nodes.push(...el(1));

  // 2.2 รายเดือน
  nodes.push(ppbold('๒.๒  สถิติการใช้รถรายเดือน',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๒-๒  สถิติการใช้รถรายเดือน',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const monHeaders = [{text:'ลำดับ',w:400},{text:'เดือน',w:1400},{text:'จำนวนเที่ยว',w:900},{text:'จำนวนผู้โดยสาร (คน-ครั้ง)',w:1200},{text:'หมายเหตุ',w:2000}];
  let totalMonTrips=0, totalMonPax=0;
  const monRows = YEAR_MONTHS.map((ym,i)=>{
    const s = queueByMonth[ym]||{trips:0,passengers:0};
    totalMonTrips+=s.trips; totalMonPax+=s.passengers;
    return [
      dCellC(i+1,400),
      dCell(thMonthYear(ym),1400),
      dCellR(nf(s.trips),900),
      dCellR(nf(s.passengers),1200),
      dCell(s.trips===0?'ไม่มีข้อมูล / ปิดภาคเรียน':'',2000),
    ];
  });
  monRows.push([
    dCell('รวม',400,{bold:true,align:AlignmentType.CENTER,span:2}),
    new TableCell({width:{size:400,type:WidthType.DXA},borders:BC,children:[pp('')]}),
    dCellR(nf(totalMonTrips),900,{bold:true}),
    dCellR(nf(totalMonPax),1200,{bold:true}),
    dCell('-',2000),
  ]);
  nodes.push(makeTable(monHeaders, monRows));
  nodes.push(sourceNote());
  nodes.push(...el(1));

  // 2.3 บันทึกแบบ 4 (20 รายการล่าสุด)
  nodes.push(ppbold('๒.๓  บันทึกการใช้รถตามแบบ ๔ (ตัวอย่าง ๒๐ รายการล่าสุด)',{sp:{before:120,after:60,line:360,lineRule:'auto'}}));
  nodes.push(pp('          ข้อมูลบันทึกการใช้รถทุกรายการถูกบันทึกตามรูปแบบสมุดบันทึกการใช้รถราชการ (แบบ ๔) โดยมีข้อมูลครบถ้วน ได้แก่ วันที่, เวลาออก-กลับ, เลขไมล์ออก-กลับ, ผู้ขับ, ปลายทาง, วัตถุประสงค์ และจำนวนผู้โดยสาร ตัวอย่างรายการล่าสุด ๒๐ รายการ ดังตารางด้านล่าง',
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));

  // Get last 20 queue items
  const last20 = [...queue].slice(-20);
  const b4Headers = [
    {text:'ลำดับ',w:380,size:26},{text:'วันที่',w:700,size:26},{text:'ทะเบียน',w:700,size:26},
    {text:'เวลาออก',w:600,size:26},{text:'เวลากลับ',w:600,size:26},
    {text:'ผู้ขับ',w:1000,size:26},{text:'ผู้ขอ',w:900,size:26},
    {text:'ปลายทาง',w:1100,size:26},{text:'ภารกิจ',w:1100,size:26},
    {text:'ผู้โดยสาร',w:600,size:26},
  ];
  const b4Rows = last20.map((qr,i)=>[
    dCellC(i+1,380,{size:26}),
    dCellC(thDateSh(qr.date),700,{size:26}),
    dCellC(qr.license_plate||'-',700,{size:26}),
    dCellC(qr.time_start?qr.time_start.slice(0,5):'-',600,{size:26}),
    dCellC(qr.time_end?qr.time_end.slice(0,5):'-',600,{size:26}),
    dCell(qr.driver_name||'-',1000,{size:26}),
    dCell(qr.requested_by||'-',900,{size:26}),
    dCell(qr.destination||'-',1100,{size:26}),
    dCell(qr.mission||'-',1100,{size:26}),
    dCellC(qr.passengers||1,600,{size:26}),
  ]);
  nodes.push(makeTable(b4Headers, b4Rows));
  nodes.push(pp([tr('หมายเหตุ: ',{bold:true,size:26}),tr(`ข้อมูลบันทึกการใช้รถครบทั้ง ${nf(totalTrips)} รายการ ปรากฏในระบบ PPK-DriveHub สามารถพิมพ์รายงานรายละเอียดแยกต่างหากได้`,{size:26})],
    {sp:{before:60,after:0,line:300,lineRule:'auto'}}));
  nodes.push(sourceNote());
  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// บทที่ 3 — การปฏิบัติงานพนักงานขับรถ
// ══════════════════════════════════════════════════════════════════════════════
function buildChapter3() {
  const nodes = [];
  nodes.push(ppc('บทที่ ๓',{sp:spHead,size:SH,bold:true}));
  nodes.push(ppc('รายงานการปฏิบัติงานพนักงานขับรถ',{sp:{...spHead,before:60},size:SH,bold:true}));
  nodes.push(...el(1));

  const activeDrivers = drivers.filter(d=>d.status==='active');
  nodes.push(pp(`          พนักงานขับรถที่ปฏิบัติงานในปีการศึกษา ๒๕๖๘ มีทั้งสิ้น ${activeDrivers.length} คน จากทั้งหมด ${drivers.length} คน โดยมีผลการปฏิบัติงานรายบุคคล ดังตารางที่ ๓-๑`,
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๓-๑  สรุปการปฏิบัติงานพนักงานขับรถ ปีการศึกษา ๒๕๖๘',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const d3Headers = [
    {text:'ลำดับ',w:400},{text:'ชื่อ-นามสกุล',w:1400},{text:'ตำแหน่ง',w:1100},
    {text:'จำนวนเที่ยว',w:700},{text:'จำนวนผู้โดยสาร',w:800},{text:'คะแนนวินัย',w:800},
    {text:'สถานะ',w:700},{text:'Flag อ่อนล้า',w:800},{text:'หมายเหตุ',w:1500},
  ];
  const d3Rows = drivers.map((d,i)=>{
    const fullName = `${d.title||''}${d.first_name||''} ${d.last_name||''}`.trim();
    const stat = queueByDriver[`${d.first_name||''} ${d.last_name||''}`] ||
                 queueByDriver[fullName] || {trips:0,passengers:0};
    const score = d.discipline_score!=null ? +d.discipline_score : null;
    const licExpired = d.license_expiry && d.license_expiry < YE;
    const notes = [];
    if (licExpired) notes.push('ใบขับขี่หมดอายุ');
    if (score!=null && score<80) notes.push(`คะแนนวินัยต่ำ (${nf(score)})`);
    if (d.fatigue_flag) notes.push('มีประวัติอ่อนล้า');
    return [
      dCellC(i+1,400),
      dCell(fullName||'-',1400),
      dCell(d.position||d.assignment_type||'-',1100),
      dCellR(nf(stat.trips),700),
      dCellR(nf(stat.passengers),800),
      dCellC(score!=null?nf(score):'-',800),
      dCellC(DRV_STATUS_TH[d.status]||d.status||'-',700),
      dCellC(d.fatigue_flag?'มี':'ไม่มี',800),
      dCell(notes.join(', ')||'-',1500),
    ];
  });
  nodes.push(makeTable(d3Headers, d3Rows));
  nodes.push(sourceNote());
  nodes.push(...el(1));

  // สรุปย่อย
  nodes.push(ppbold('สรุปผลการปฏิบัติงาน',{sp:{before:120,after:60,line:360,lineRule:'auto'}}));
  const totalDrvTrips = Object.values(queueByDriver).reduce((s,v)=>s+v.trips,0);
  nodes.push(pp(`     ๑.  จำนวนพนักงานขับรถที่ปฏิบัติงาน: ${activeDrivers.length} คน จากทั้งหมด ${drivers.length} คน`,{sp:{before:0,after:0,line:360,lineRule:'auto'}}));
  nodes.push(pp(`     ๒.  คะแนนวินัยต่ำกว่า ๘๐ คะแนน: ${lowDisciplineDrivers.length} คน`,{sp:{before:0,after:0,line:360,lineRule:'auto'}}));
  nodes.push(pp(`     ๓.  ใบอนุญาตขับรถหมดอายุ: ${expiredLicense.length} คน`,{sp:{before:0,after:0,line:360,lineRule:'auto'}}));
  nodes.push(pp(`     ๔.  มีประวัติอ่อนล้า (Fatigue Flag): ${drivers.filter(d=>d.fatigue_flag).length} คน`,{sp:{before:0,after:0,line:360,lineRule:'auto'}}));
  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// บทที่ 4 — น้ำมันเชื้อเพลิง
// ══════════════════════════════════════════════════════════════════════════════
function buildChapter4() {
  const nodes = [];
  nodes.push(ppc('บทที่ ๔',{sp:spHead,size:SH,bold:true}));
  nodes.push(ppc('รายงานการเบิกจ่ายน้ำมันเชื้อเพลิง',{sp:{...spHead,before:60},size:SH,bold:true}));
  nodes.push(...el(1));

  nodes.push(pp(`          ในปีการศึกษา ๒๕๖๘ งานยานพาหนะได้บันทึกการเบิกจ่ายน้ำมันเชื้อเพลิงรวมทั้งสิ้น ${nf(fuel.length)} รายการ รวมปริมาณน้ำมัน ${nf(totalFuelLiters,2)} ลิตร รวมค่าใช้จ่าย ${bf(totalFuelAmount)} บาท โดยการเบิกจ่ายทุกรายการมีการแนบใบเสร็จรับเงินเป็นหลักฐานตามระเบียบกระทรวงการคลัง`,
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));

  // 4.1 รายเดือน
  nodes.push(ppbold('๔.๑  สรุปการเบิกจ่ายน้ำมันรายเดือน',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๔-๑  สรุปการเบิกจ่ายน้ำมันเชื้อเพลิงรายเดือน ปีการศึกษา ๒๕๖๘',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const f1Headers = [{text:'ลำดับ',w:400},{text:'เดือน',w:1200},{text:'จำนวนครั้ง',w:700},{text:'ปริมาณรวม (ลิตร)',w:900},{text:'ค่าใช้จ่ายรวม (บาท)',w:1000},{text:'เฉลี่ย บาท/ลิตร',w:900},{text:'หมายเหตุ',w:1600}];
  let sumF1L=0, sumF1A=0, sumF1C=0;
  const f1Rows = YEAR_MONTHS.map((ym,i)=>{
    const s = fuelByMonth[ym]||{count:0,liters:0,amount:0};
    sumF1C+=s.count; sumF1L+=s.liters; sumF1A+=s.amount;
    const avg = s.liters>0 ? s.amount/s.liters : null;
    return [
      dCellC(i+1,400),
      dCell(thMonthYear(ym),1200),
      dCellR(nf(s.count),700),
      dCellR(nf(s.liters,2),900),
      dCellR(bf(s.amount),1000),
      dCellR(avg?nf(avg,2):'-',900),
      dCell(s.count===0?'ไม่มีข้อมูล':'',1600),
    ];
  });
  f1Rows.push([
    new TableCell({width:{size:400,type:WidthType.DXA},borders:BC,shading:HS2,children:[ppc('รวม',{sp:spSmall,bold:true})]}),
    new TableCell({width:{size:1200,type:WidthType.DXA},borders:BC,shading:HS2,children:[pp('',{sp:spSmall})]}),
    new TableCell({width:{size:700,type:WidthType.DXA},borders:BC,shading:HS2,children:[ppr(nf(sumF1C),{sp:spSmall,bold:true})]}),
    new TableCell({width:{size:900,type:WidthType.DXA},borders:BC,shading:HS2,children:[ppr(nf(sumF1L,2),{sp:spSmall,bold:true})]}),
    new TableCell({width:{size:1000,type:WidthType.DXA},borders:BC,shading:HS2,children:[ppr(bf(sumF1A),{sp:spSmall,bold:true})]}),
    new TableCell({width:{size:900,type:WidthType.DXA},borders:BC,shading:HS2,children:[ppr(sumF1L>0?nf(sumF1A/sumF1L,2):'-',{sp:spSmall})]}),
    new TableCell({width:{size:1600,type:WidthType.DXA},borders:BC,shading:HS2,children:[pp('',{sp:spSmall})]}),
  ]);
  nodes.push(makeTable(f1Headers, f1Rows));
  nodes.push(sourceNote());
  nodes.push(...el(1));

  // 4.2 รายคัน
  nodes.push(ppbold('๔.๒  สรุปการเบิกจ่ายน้ำมันรายคัน และอัตราสิ้นเปลือง',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(pp('          อัตราการสิ้นเปลืองน้ำมันเฉลี่ย (กม./ลิตร) คำนวณจากข้อมูลที่บันทึกในระบบ โดยเกณฑ์มาตรฐานสำหรับรถตู้ราชการกำหนดไว้ที่ไม่ต่ำกว่า ๘ กม./ลิตร',
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๔-๒  สรุปการเบิกจ่ายน้ำมันรายคัน',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const f2Headers = [{text:'ลำดับ',w:400},{text:'ทะเบียนรถ',w:800},{text:'ยี่ห้อ/รุ่น',w:1200},{text:'จำนวนครั้ง',w:700},{text:'ลิตรรวม',w:800},{text:'ค่าใช้จ่ายรวม (บาท)',w:1000},{text:'อัตราสิ้นเปลือง (กม./ลิตร)',w:1000},{text:'เทียบเกณฑ์',w:800},{text:'หมายเหตุ',w:1200}];
  const f2Rows = cars.map((c,i)=>{
    const s = fuelByCar[c.license_plate]||{count:0,liters:0,amount:0,avgRate:null};
    const belowStd = s.avgRate!=null && s.avgRate < 8;
    const std = s.avgRate!=null ? (belowStd?'ต่ำกว่าเกณฑ์':'ผ่านเกณฑ์') : '-';
    return [
      dCellC(i+1,400),
      dCellC(c.license_plate,800),
      dCell(`${c.brand||''} ${c.model||''}`.trim()||'-',1200),
      dCellR(nf(s.count),700),
      dCellR(nf(s.liters,2),800),
      dCellR(bf(s.amount),1000),
      dCellC(s.avgRate?nf(s.avgRate,2):'-',1000),
      dCellC(std,800,{color:belowStd?'CC0000':'000000'}),
      dCell(belowStd?'ควรตรวจสอบสภาพรถ':'',1200),
    ];
  });
  nodes.push(makeTable(f2Headers, f2Rows));
  nodes.push(sourceNote('เกณฑ์มาตรฐาน: รถตู้ราชการ ≥ ๘ กม./ลิตร'));
  nodes.push(...el(1));

  // 4.3 Anomaly
  nodes.push(ppbold('๔.๓  รายการเบิกจ่ายน้ำมันที่มีความผิดปกติ (Anomaly)',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  if (fuelAnomalies.length === 0) {
    nodes.push(pp('          ไม่พบรายการเบิกจ่ายน้ำมันที่มีความผิดปกติในปีการศึกษา ๒๕๖๘',{sp:{before:0,after:100,line:360,lineRule:'auto'}}));
  } else {
    nodes.push(pp(`          พบรายการที่ระบบตรวจพบความผิดปกติ ${fuelAnomalies.length} รายการ ดังตารางที่ ๔-๓`,{sp:{before:0,after:100,line:360,lineRule:'auto'}}));
    nodes.push(ppc('ตารางที่ ๔-๓  รายการเบิกจ่ายน้ำมันที่มีความผิดปกติ',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));
    const f3Headers = [{text:'ลำดับ',w:400},{text:'วันที่',w:700},{text:'เลขที่เอกสาร',w:1000},{text:'ทะเบียน',w:800},{text:'ผู้เบิก',w:1000},{text:'ลิตร',w:600},{text:'จำนวนเงิน',w:900},{text:'หมายเหตุ',w:2300}];
    const f3Rows = fuelAnomalies.map((f,i)=>[
      dCellC(i+1,400),
      dCellC(thDateSh(f.date),700),
      dCellC(f.document_number||'-',1000),
      dCellC(f.license_plate||'-',800),
      dCell(f.driver_name||'-',1000),
      dCellR(nf(f.liters,2),600),
      dCellR(bf(f.amount),900),
      dCell(f.notes||'ตรวจพบความผิดปกติโดยระบบ – ต้องตรวจสอบเพิ่มเติม',2300),
    ]);
    nodes.push(makeTable(f3Headers, f3Rows));
    nodes.push(sourceNote());
  }
  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// บทที่ 5 — การซ่อมบำรุง
// ══════════════════════════════════════════════════════════════════════════════
function buildChapter5() {
  const nodes = [];
  nodes.push(ppc('บทที่ ๕',{sp:spHead,size:SH,bold:true}));
  nodes.push(ppc('รายงานการซ่อมบำรุงยานพาหนะ',{sp:{...spHead,before:60},size:SH,bold:true}));
  nodes.push(...el(1));

  nodes.push(pp(`          ในปีการศึกษา ๒๕๖๘ งานยานพาหนะได้ดำเนินการซ่อมบำรุงยานพาหนะรวมทั้งสิ้น ${repair.length} ครั้ง รวมค่าใช้จ่าย ${bf(totalRepairCost)} บาท แบ่งเป็นค่าใช้จ่ายจากงบประมาณโรงเรียน ${bf(totalBudgetCost)} บาท และค่าใช้จ่ายที่เบิกจากประกันภัย ${bf(totalInsuranceCost)} บาท`,
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));

  // 5.1 รายการซ่อมทั้งหมด
  nodes.push(ppbold('๕.๑  รายการซ่อมบำรุงทั้งหมด',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๕-๑  รายการซ่อมบำรุงยานพาหนะ ปีการศึกษา ๒๕๖๘',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const r1Headers = [
    {text:'ลำดับ',w:380,size:26},{text:'วันที่รับ',w:640,size:26},{text:'วันที่เสร็จ',w:640,size:26},
    {text:'ทะเบียน',w:680,size:26},{text:'ประเภทงาน',w:840,size:26},{text:'อาการ/รายละเอียด',w:1800,size:26},
    {text:'อู่ซ่อม',w:1000,size:26},{text:'ค่าแรง',w:700,size:26},{text:'ค่าอะไหล่',w:700,size:26},
    {text:'รวม (บาท)',w:800,size:26},{text:'แหล่งเงิน',w:800,size:26},{text:'เลขที่ Invoice',w:900,size:26},
  ];
  const r1Rows = repair.map((r,i)=>{
    const isIns = r.service_type==='insurance';
    return [
      dCellC(i+1,380,{size:26}),
      dCellC(thDateSh(r.date_reported),640,{size:26}),
      dCellC(thDateSh(r.date_completed),640,{size:26}),
      dCellC(r.license_plate||'-',680,{size:26}),
      dCellC(SVC_TYPE_TH[r.service_type]||r.service_type||'-',840,{size:26}),
      dCell((r.issue_description||'-').slice(0,60),1800,{size:26}),
      dCell(r.garage_name||'-',1000,{size:26}),
      dCellR(bf(r.labour_cost),700,{size:26}),
      dCellR(bf(r.parts_cost),700,{size:26}),
      dCellR(bf(r.grand_total),800,{size:26,bold:true}),
      dCellC(isIns?`ประกัน\n(${r.insurance_company||''})`:' งบประมาณ',800,{size:26}),
      dCellC(r.invoice_number||r.work_order_number||'-',900,{size:26}),
    ];
  });
  nodes.push(makeTable(r1Headers, r1Rows));
  nodes.push(sourceNote());
  nodes.push(...el(1));

  // 5.2 สรุปรายคัน
  nodes.push(ppbold('๕.๒  สรุปค่าใช้จ่ายการซ่อมบำรุงรายคัน',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๕-๒  สรุปค่าซ่อมบำรุงรายคัน',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const r2Headers = [{text:'ลำดับ',w:400},{text:'ทะเบียนรถ',w:800},{text:'ยี่ห้อ/รุ่น',w:1200},{text:'จำนวนครั้ง',w:700},{text:'ค่าใช้จ่ายรวม (บาท)',w:1000},{text:'เปรียบเทียบค่าเฉลี่ย',w:1000},{text:'ประเภทงานหลัก',w:1600}];
  const r2Rows = [...cars].sort((a,b)=>(repairByCar[b.license_plate]?.cost||0)-(repairByCar[a.license_plate]?.cost||0)).map((c,i)=>{
    const s = repairByCar[c.license_plate]||{count:0,cost:0,types:{}};
    const ratio = avgRepairCost>0 ? s.cost/avgRepairCost : 0;
    const topType = Object.entries(s.types).sort((a,b)=>b[1]-a[1])[0];
    return [
      dCellC(i+1,400),
      dCellC(c.license_plate,800),
      dCell(`${c.brand||''} ${c.model||''}`.trim()||'-',1200),
      dCellR(nf(s.count),700),
      dCellR(bf(s.cost),1000,{bold:true}),
      dCellC(s.cost>0?`${nf(ratio,1)} เท่าของค่าเฉลี่ย`:'-',1000,{color:ratio>2?'CC0000':'000000'}),
      dCell(topType?SVC_TYPE_TH[topType[0]]||topType[0]:'-',1600),
    ];
  });
  nodes.push(makeTable(r2Headers, r2Rows));
  nodes.push(sourceNote(`ค่าเฉลี่ยซ่อมบำรุงต่อคันที่มีประวัติซ่อม = ${bf(avgRepairCost)} บาท`));
  nodes.push(...el(1));

  // 5.3 แหล่งเงิน
  nodes.push(ppbold('๕.๓  การจำแนกแหล่งที่มาของค่าใช้จ่ายการซ่อมบำรุง',{sp:{before:120,after:80,line:360,lineRule:'auto'}}));
  nodes.push(pp('          ค่าใช้จ่ายการซ่อมบำรุงยานพาหนะสามารถจำแนกตามแหล่งที่มาได้ ดังนี้',
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));

  const srcHeaders = [{text:'แหล่งที่มา',w:2000},{text:'จำนวนรายการ',w:900},{text:'ค่าใช้จ่ายรวม (บาท)',w:1200},{text:'ร้อยละ',w:700},{text:'หมายเหตุ',w:2900}];
  const budCount = repair.filter(r=>r.service_type!=='insurance').length;
  const insCount = repair.filter(r=>r.service_type==='insurance').length;
  const srcRows = [
    [dCell('งบประมาณโรงเรียน',2000),dCellR(nf(budCount),900),dCellR(bf(totalBudgetCost),1200),dCellR(totalRepairCost>0?nf(totalBudgetCost/totalRepairCost*100,1):'0',700),dCell('ค่าซ่อม ค่าบำรุงรักษาตามระยะ',2900)],
    [dCell('เบิกจากประกันภัย',2000),dCellR(nf(insCount),900),dCellR(bf(totalInsuranceCost),1200),dCellR(totalRepairCost>0?nf(totalInsuranceCost/totalRepairCost*100,1):'0',700),dCell('กรณีรถได้รับความเสียหายจากอุบัติเหตุ',2900)],
    [
      new TableCell({width:{size:2000,type:WidthType.DXA},borders:BC,shading:HS2,children:[pp('รวมทั้งสิ้น',{sp:spSmall,bold:true})]}),
      new TableCell({width:{size:900,type:WidthType.DXA},borders:BC,shading:HS2,children:[ppr(nf(repair.length),{sp:spSmall,bold:true})]}),
      new TableCell({width:{size:1200,type:WidthType.DXA},borders:BC,shading:HS2,children:[ppr(bf(totalRepairCost),{sp:spSmall,bold:true})]}),
      new TableCell({width:{size:700,type:WidthType.DXA},borders:BC,shading:HS2,children:[ppr('100.0',{sp:spSmall})]}),
      new TableCell({width:{size:2900,type:WidthType.DXA},borders:BC,shading:HS2,children:[pp('',{sp:spSmall})]}),
    ],
  ];
  nodes.push(makeTable(srcHeaders, srcRows));
  nodes.push(sourceNote());
  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// บทที่ 6 — สรุปภาพรวมและสถิติ
// ══════════════════════════════════════════════════════════════════════════════
function buildChapter6() {
  const nodes = [];
  nodes.push(ppc('บทที่ ๖',{sp:spHead,size:SH,bold:true}));
  nodes.push(ppc('สรุปภาพรวมและสถิติประจำปีการศึกษา ๒๕๖๘',{sp:{...spHead,before:60},size:SH,bold:true}));
  nodes.push(...el(1));

  nodes.push(pp('          ตารางที่ ๖-๑ แสดงตัวชี้วัดสำคัญของงานยานพาหนะ โรงเรียนพะเยาพิทยาคม ในปีการศึกษา ๒๕๖๘ ซึ่งสะท้อนประสิทธิภาพการบริหารจัดการยานพาหนะในภาพรวม',
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));
  nodes.push(ppc('ตารางที่ ๖-๑  ตัวชี้วัดสำคัญประจำปีการศึกษา ๒๕๖๘',{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB,bold:true}));

  const avgFuelPerKm = totalDistAll>0 ? totalFuelAmount/totalDistAll : null;
  const avgFuelPerCar = cars.length>0 ? totalFuelAmount/cars.length : null;
  const topFuelCar = Object.entries(fuelByCar).sort((a,b)=>b[1].amount-a[1].amount)[0];
  const topDistCar = Object.entries(distByCar).sort((a,b)=>b[1]-a[1])[0];

  const kpis = [
    ['ด้านยานพาหนะ','จำนวนรถราชการในความดูแล',`${cars.length} คัน`,''],
    ['','รถที่อยู่ในสภาพพร้อมใช้งาน',`${cars.filter(c=>c.status==='active').length} คัน`,''],
    ['','จำนวนพนักงานขับรถ',`${drivers.length} คน (ปฏิบัติงาน ${drivers.filter(d=>d.status==='active').length} คน)`,''],
    ['ด้านการใช้รถ','จำนวนเที่ยวการใช้รถทั้งหมด',`${nf(queue.length)} เที่ยว`,'ตลอดปีการศึกษา'],
    ['','จำนวนผู้โดยสารรวม',`${nf(queue.reduce((s,q)=>s+(+q.passengers||0),0))} คน-ครั้ง`,''],
    ['','ระยะทางรวม (คำนวณได้)',totalDistAll?`${nf(totalDistAll)} กม.`:'ไม่สามารถคำนวณได้ครบทุกรายการ',''],
    ['','รถที่มีจำนวนเที่ยวสูงสุด',topDistCar?`${topDistCar[0]} (${nf(topDistCar[1])} กม.)`:'-',''],
    ['ด้านน้ำมันเชื้อเพลิง','ปริมาณน้ำมันที่ใช้ทั้งหมด',`${nf(totalFuelLiters,2)} ลิตร`,''],
    ['','ค่าน้ำมันรวมทั้งปี',`${bf(totalFuelAmount)} บาท`,''],
    ['','ค่าน้ำมันเฉลี่ยต่อคันต่อปี',avgFuelPerCar?`${bf(avgFuelPerCar)} บาท`:'-',''],
    ['','ค่าน้ำมันเฉลี่ยต่อกิโลเมตร',avgFuelPerKm?`${nf(avgFuelPerKm,2)} บาท/กม.`:'-',''],
    ['','รถที่ใช้น้ำมันมากสุด',topFuelCar?`${topFuelCar[0]} (${bf(topFuelCar[1].amount)} บาท)`:'-',''],
    ['','รายการน้ำมันผิดปกติ (Anomaly)',`${fuelAnomalies.length} รายการ`,'ต้องตรวจสอบ'],
    ['ด้านซ่อมบำรุง','จำนวนครั้งการซ่อมบำรุงทั้งหมด',`${repair.length} ครั้ง`,''],
    ['','ค่าซ่อมบำรุงรวมทั้งปี',`${bf(totalRepairCost)} บาท`,''],
    ['','ค่าซ่อมจากงบประมาณโรงเรียน',`${bf(totalBudgetCost)} บาท`,''],
    ['','ค่าซ่อมจากประกันภัย',`${bf(totalInsuranceCost)} บาท`,''],
    ['','ค่าซ่อมบำรุงเฉลี่ยต่อคัน (เฉพาะคันที่ซ่อม)',`${bf(avgRepairCost)} บาท`,''],
    ['','รถที่มีค่าซ่อมสูงสุด',topRepairCar?`${topRepairCar[0]} (${bf(topRepairCar[1])} บาท)`:'-',topRepairCar&&avgRepairCost>0?`${nf(topRepairCar[1]/avgRepairCost,1)} เท่าของค่าเฉลี่ย`:''],
  ];

  const k6Headers = [{text:'ด้าน',w:1200},{text:'ตัวชี้วัด',w:2400},{text:'ค่าที่ได้',w:1800},{text:'หมายเหตุ',w:2300}];
  const k6Rows = kpis.map(([area,label,value,note])=>[
    dCell(area,1200,{bold:area!==''}),
    dCell(label,2400),
    dCellC(value,1800,{bold:true}),
    dCell(note,2300),
  ]);
  nodes.push(makeTable(k6Headers, k6Rows));
  nodes.push(sourceNote());
  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// บทที่ 7 — ปัญหาและอุปสรรค
// ══════════════════════════════════════════════════════════════════════════════
function buildChapter7() {
  const nodes = [];
  nodes.push(ppc('บทที่ ๗',{sp:spHead,size:SH,bold:true}));
  nodes.push(ppc('ปัญหาและอุปสรรคที่พบในปีการศึกษา ๒๕๖๘',{sp:{...spHead,before:60},size:SH,bold:true}));
  nodes.push(...el(1));

  nodes.push(pp('          จากการดำเนินงานด้านยานพาหนะตลอดปีการศึกษา ๒๕๖๘ พบปัญหาและอุปสรรคที่ควรรายงานเพื่อความโปร่งใสและเพื่อประโยชน์ในการวางแผนปรับปรุง ดังนี้',
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));

  const problems = [];
  let idx = 1;

  // License expiry
  if (expiredLicense.length > 0) {
    const names = expiredLicense.map(d=>`${d.first_name||''} ${d.last_name||''}`.trim()).join(', ');
    problems.push([idx++,'ใบอนุญาตขับรถหมดอายุ',`พบพนักงานขับรถ ${expiredLicense.length} คน ที่ใบอนุญาตขับขี่รถหมดอายุแล้ว ได้แก่ ${names} ซึ่งอาจส่งผลต่อความถูกต้องตามกฎหมายในการนำรถออกปฏิบัติหน้าที่`,'เร่งด่วน']);
  }

  // Low discipline
  if (lowDisciplineDrivers.length > 0) {
    problems.push([idx++,'คะแนนวินัยต่ำกว่าเกณฑ์',`พบพนักงานขับรถ ${lowDisciplineDrivers.length} คน มีคะแนนวินัยต่ำกว่า ๘๐ คะแนน ซึ่งสะท้อนถึงการปฏิบัติตนไม่ครบตามมาตรฐานที่กำหนด`,'สำคัญ']);
  }

  // Fatigue
  const fatigueDrvs = drivers.filter(d=>d.fatigue_flag);
  if (fatigueDrvs.length > 0) {
    problems.push([idx++,'พนักงานขับรถมีประวัติอ่อนล้า',`มีพนักงานขับรถ ${fatigueDrvs.length} คน ที่ระบบบันทึกว่ามีประวัติอ่อนล้าระหว่างปฏิบัติงาน ซึ่งเป็นความเสี่ยงด้านความปลอดภัยในการขับขี่`,'สำคัญ']);
  }

  // High repair car
  if (topRepairCar && avgRepairCost > 0 && topRepairCar[1] > avgRepairCost*2) {
    problems.push([idx++,'รถที่มีค่าซ่อมบำรุงสูงผิดปกติ',`รถทะเบียน ${topRepairCar[0]} มีค่าซ่อมบำรุงรวม ${bf(topRepairCar[1])} บาท ซึ่งสูงกว่าค่าเฉลี่ย ${nf(topRepairCar[1]/avgRepairCost,1)} เท่า สะท้อนถึงสภาพรถที่อาจเสื่อมสภาพหรือมีปัญหาเรื้อรัง`,'ปานกลาง']);
  }

  // Anomaly fuel
  if (fuelAnomalies.length > 0) {
    problems.push([idx++,'รายการเบิกจ่ายน้ำมันผิดปกติ',`ระบบตรวจพบรายการเบิกจ่ายน้ำมันที่มีความผิดปกติ ${fuelAnomalies.length} รายการ ซึ่งต้องได้รับการตรวจสอบและชี้แจงเพื่อความถูกต้องของข้อมูลทางการเงิน`,'ปานกลาง']);
  }

  // Insurance/tax not in system
  problems.push([idx++,'ข้อมูลภาษีรถและประกันภัยยังไม่ได้บันทึกในระบบ','ฐานข้อมูลของงานยานพาหนะยังไม่มีการบันทึกข้อมูลกรมธรรม์ประกันภัยและใบเสียภาษีรถแยกรายคัน ทำให้ไม่สามารถติดตามวันหมดอายุได้โดยอัตโนมัติ','ปานกลาง']);

  // Approver not stored
  problems.push([idx++,'ไม่มีการบันทึกชื่อผู้อนุมัติการเบิกจ่ายน้ำมันในฐานข้อมูล','แม้ระบบจะมีช่องกรอกชื่อผู้อนุมัติ (หัวหน้าพัสดุ) ในแบบฟอร์ม แต่ข้อมูลดังกล่าวไม่ได้ถูกบันทึกเก็บไว้ในฐานข้อมูล ทำให้ขาด Audit Trail ที่สมบูรณ์','ปานกลาง']);

  if (problems.length === 0) {
    nodes.push(pp('          ไม่พบปัญหาและอุปสรรคที่มีนัยสำคัญในปีการศึกษา ๒๕๖๘',{sp:{before:0,after:100,line:360,lineRule:'auto'}}));
  } else {
    const p7Headers = [{text:'ลำดับ',w:400},{text:'ปัญหา',w:1600},{text:'รายละเอียด',w:3800},{text:'ระดับความสำคัญ',w:900}];
    const p7Rows = problems.map(([i,title,detail,level])=>[
      dCellC(i,400),
      dCell(title,1600,{bold:true}),
      dCell(detail,3800),
      dCellC(level,900,{color:level==='เร่งด่วน'?'CC0000':level==='สำคัญ'?'CC6600':'000000',bold:level==='เร่งด่วน'}),
    ]);
    nodes.push(makeTable(p7Headers, p7Rows));
    nodes.push(sourceNote());
  }
  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// บทที่ 8 — ข้อเสนอแนะ
// ══════════════════════════════════════════════════════════════════════════════
function buildChapter8() {
  const nodes = [];
  nodes.push(ppc('บทที่ ๘',{sp:spHead,size:SH,bold:true}));
  nodes.push(ppc('ข้อเสนอแนะเพื่อการพัฒนา',{sp:{...spHead,before:60},size:SH,bold:true}));
  nodes.push(...el(1));

  nodes.push(pp('          จากผลการดำเนินงานและปัญหาที่พบในปีการศึกษา ๒๕๖๘ ผู้จัดทำมีข้อเสนอแนะดังต่อไปนี้',
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));

  const recs = [];
  let ri = 1;

  recs.push([ri++,'ด้านบุคลากร','จัดให้มีการตรวจสอบและต่ออายุใบอนุญาตขับขี่รถยนต์ของพนักงานขับรถทุกคนอย่างสม่ำเสมอ โดยกำหนดแผนการดำเนินการล่วงหน้าอย่างน้อย ๓ เดือน ก่อนวันหมดอายุ และให้รายงานต่อหัวหน้างานยานพาหนะเพื่อดำเนินการโดยทันที','ลด Risk ด้านกฎหมาย']);
  recs.push([ri++,'ด้านบุคลากร','จัดโครงการพัฒนาและเสริมสร้างวินัยแก่พนักงานขับรถที่มีคะแนนวินัยต่ำกว่าเกณฑ์ โดยกำหนดเป้าหมายคะแนนวินัยไม่ต่ำกว่า ๘๕ คะแนน และประเมินผลทุกภาคเรียน','เพิ่มประสิทธิภาพ']);
  recs.push([ri++,'ด้านยานพาหนะ',topRepairCar?`รถทะเบียน ${topRepairCar[0]} มีค่าซ่อมบำรุง ${bf(topRepairCar[1])} บาท คิดเป็น ${nf(topRepairCar[1]/avgRepairCost,1)} เท่าของค่าเฉลี่ย ควรพิจารณาทบทวนความคุ้มค่าในการใช้งานต่อ และจัดทำแผนการบำรุงรักษาเชิงป้องกัน (Preventive Maintenance) เพื่อลดค่าใช้จ่ายซ่อมฉุกเฉิน`:'ควรจัดทำแผนการบำรุงรักษาเชิงป้องกัน (Preventive Maintenance) สำหรับรถทุกคัน ตามระยะทางและเวลาที่กำหนด เพื่อลดการซ่อมแบบฉุกเฉินที่มีต้นทุนสูง','ลดต้นทุน']);
  recs.push([ri++,'ด้านฐานข้อมูล','เพิ่มฟีเจอร์การบันทึกข้อมูลภาษีรถยนต์และกรมธรรม์ประกันภัยแยกรายคันในระบบ PPK-DriveHub เพื่อให้สามารถติดตามวันหมดอายุได้อัตโนมัติและลดความเสี่ยงจากการใช้รถที่ภาษีหรือประกันหมดอายุ','เพิ่มความครบถ้วน']);
  recs.push([ri++,'ด้านฐานข้อมูล','แก้ไขระบบให้บันทึกชื่อผู้อนุมัติการเบิกจ่ายน้ำมัน (หัวหน้าพัสดุหรือผู้มอบอำนาจ) ลงในฐานข้อมูลถาวร เพื่อให้สามารถตรวจสอบ Audit Trail ได้ครบถ้วนตามระเบียบกระทรวงการคลัง','ด้านความโปร่งใส']);
  if (fuelAnomalies.length > 0) {
    recs.push([ri++,'ด้านน้ำมันเชื้อเพลิง',`กำหนดให้มีการตรวจสอบรายการน้ำมันที่ระบบแจ้งเตือนความผิดปกติ (Anomaly) จำนวน ${fuelAnomalies.length} รายการ โดยพนักงานผู้รับผิดชอบต้องชี้แจงเหตุผลและบันทึกผลการตรวจสอบในระบบภายใน ๓๐ วัน`,'ความโปร่งใส']);
  }
  recs.push([ri++,'ด้านการรายงาน','กำหนดให้จัดทำรายงานสรุปการปฏิบัติงานด้านยานพาหนะทุกภาคเรียน (ภาคเรียนละ ๑ ครั้ง) แทนการรายงานประจำปีเพียงครั้งเดียว เพื่อให้ผู้บริหารได้รับทราบสถานการณ์และสามารถตัดสินใจเชิงนโยบายได้ทันเวลา','เพิ่มประสิทธิผล']);

  const r8Headers = [{text:'ลำดับ',w:400},{text:'ด้าน',w:1100},{text:'ข้อเสนอแนะ',w:4000},{text:'เป้าหมาย',w:1200}];
  const r8Rows = recs.map(([i,area,detail,goal])=>[
    dCellC(i,400),
    dCell(area,1100,{bold:true}),
    dCell(detail,4000),
    dCellC(goal,1200),
  ]);
  nodes.push(makeTable(r8Headers, r8Rows));
  nodes.push(sourceNote());
  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// หน้าลงนาม
// ══════════════════════════════════════════════════════════════════════════════
function buildSignaturePage() {
  const nodes = [];
  nodes.push(...el(2));
  nodes.push(ppc('หน้าลงนามรับรอง',{sp:{before:0,after:60,line:360,lineRule:'auto'},size:SH,bold:true}));
  nodes.push(ppc('รายงานผลการปฏิบัติงานงานยานพาหนะ ปีการศึกษา ๒๕๖๘',{sp:{before:0,after:60,line:360,lineRule:'auto'},size:SB}));
  nodes.push(ppc(SCHOOL,{sp:{before:0,after:240,line:360,lineRule:'auto'},size:SB}));

  function sigBlock(label, name, pos1, pos2, pos3) {
    return [
      ppc(label,{sp:spSig,size:SB,bold:true}),
      ppc('(ลงชื่อ) ...................................................................',{sp:{before:120,after:0,line:360,lineRule:'auto'},size:SB}),
      ppc(`(${name})`,{sp:{before:40,after:0,line:360,lineRule:'auto'},size:SB}),
      ppc(pos1,{sp:{before:20,after:0,line:360,lineRule:'auto'},size:SB}),
      pos2?ppc(pos2,{sp:{before:20,after:0,line:360,lineRule:'auto'},size:SB}):null,
      pos3?ppc(pos3,{sp:{before:20,after:120,line:360,lineRule:'auto'},size:SB}):null,
    ].filter(Boolean);
  }

  nodes.push(...sigBlock('ผู้จัดทำรายงาน', P.author.name, P.author.pos, SCHOOL, `วันที่ .......... เดือน ........................ พ.ศ. ..........`));
  nodes.push(...el(1));
  nodes.push(...sigBlock('หัวหน้างานยานพาหนะ', P.chief.name, P.chief.pos, SCHOOL, `วันที่ .......... เดือน ........................ พ.ศ. ..........`));
  nodes.push(...el(1));
  nodes.push(...sigBlock('รองผู้อำนวยการ', P.deputy.name, P.deputy.pos, SCHOOL, `วันที่ .......... เดือน ........................ พ.ศ. ..........`));
  nodes.push(...el(1));
  nodes.push(...sigBlock('ผู้อำนวยการโรงเรียน', P.director.name, P.director.pos, SCHOOL, `วันที่ .......... เดือน ........................ พ.ศ. ..........`));
  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// ภาคผนวก
// ══════════════════════════════════════════════════════════════════════════════
function buildAppendix() {
  const nodes = [];
  nodes.push(ppc('ภาคผนวก',{sp:spHead,size:SH,bold:true}));
  nodes.push(ppc('กฎระเบียบที่เกี่ยวข้องกับการบริหารจัดการงานยานพาหนะ',{sp:{...spHead,before:60},size:SH,bold:true}));
  nodes.push(...el(1));

  const refs = [
    ['๑','ระเบียบสำนักนายกรัฐมนตรีว่าด้วยรถราชการ พ.ศ. ๒๕๒๓ และที่แก้ไขเพิ่มเติม','กำหนดหลักเกณฑ์การใช้ การดูแลรักษา และการบริหารรถราชการ ได้แก่ การบันทึกการใช้รถ การเบิกจ่ายน้ำมัน การซ่อมบำรุง และการควบคุมทะเบียน'],
    ['๒','ระเบียบกระทรวงการคลังว่าด้วยค่าใช้จ่ายในการเดินทางไปราชการ พ.ศ. ๒๕๕๐ และที่แก้ไขเพิ่มเติม','กำหนดอัตราค่าน้ำมันเชื้อเพลิง วิธีการเบิกจ่าย และเอกสารหลักฐานที่ต้องใช้ประกอบการเบิกจ่าย'],
    ['๓','ระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. ๒๕๖๐','กำหนดขั้นตอนการจัดซื้อน้ำมันเชื้อเพลิง การจ้างซ่อมยานพาหนะ และการจัดเก็บเอกสารหลักฐาน'],
    ['๔','ระเบียบสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐานว่าด้วยการบริหารจัดการยานพาหนะของสถานศึกษา (ฉบับที่ใช้บังคับในปัจจุบัน)','แนวปฏิบัติเฉพาะสำหรับสถานศึกษาในสังกัด สพฐ.'],
    ['๕','แบบบันทึกการใช้รถราชการ (แบบ ๔)','แบบฟอร์มมาตรฐานสำหรับบันทึกการใช้รถราชการแต่ละเที่ยว ประกอบด้วย วันที่ เวลาออก-กลับ ทะเบียนรถ ผู้ขับ ปลายทาง วัตถุประสงค์ จำนวนผู้โดยสาร และเลขไมล์'],
    ['๖','แบบทะเบียนควบคุมการจัดซื้อน้ำมันเชื้อเพลิง (บัญชีควบคุมน้ำมัน)','แบบฟอร์มมาตรฐานสำหรับบันทึกการจัดซื้อน้ำมันเชื้อเพลิง ประกอบด้วย ยอดยกมา ยอดรับ ยอดจ่าย และยอดคงเหลือ'],
  ];

  const aHeaders = [{text:'ลำดับ',w:400},{text:'ชื่อกฎหมาย/ระเบียบ',w:2800},{text:'สาระสำคัญที่เกี่ยวข้อง',w:4500}];
  const aRows = refs.map(([i,name,desc])=>[
    dCellC(i,400,{bold:true}),
    dCell(name,2800,{bold:true}),
    dCell(desc,4500),
  ]);
  nodes.push(makeTable(aHeaders, aRows));
  nodes.push(...el(2));
  nodes.push(pp('หมายเหตุ: ผู้รับผิดชอบควรศึกษาและปฏิบัติตามกฎระเบียบที่เกี่ยวข้องอย่างเคร่งครัด หากมีข้อสงสัยหรือกรณีที่ไม่มีระเบียบกำหนดไว้ ให้ขอคำปรึกษาจากฝ่ายบริหารหรือหน่วยงานที่เกี่ยวข้อง',
    {sp:{before:0,after:0,line:360,lineRule:'auto'},size:28}));
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT
// ══════════════════════════════════════════════════════════════════════════════
console.log('  📄 สร้างปกหน้าและคำนำ...');
const coverNodes  = buildCover();
const khamnamNodes = buildKhamnam();

console.log('  📄 สร้างสารบัญ...');
const tocNodes    = buildTOC();

console.log('  📄 บทที่ ๑ ข้อมูลพื้นฐาน...');
const ch1Nodes    = buildChapter1();

console.log('  📄 บทที่ ๒ การใช้รถ...');
const ch2Nodes    = buildChapter2();

console.log('  📄 บทที่ ๓ พนักงานขับรถ...');
const ch3Nodes    = buildChapter3();

console.log('  📄 บทที่ ๔ น้ำมันเชื้อเพลิง...');
const ch4Nodes    = buildChapter4();

console.log('  📄 บทที่ ๕ ซ่อมบำรุง...');
const ch5Nodes    = buildChapter5();

console.log('  📄 บทที่ ๖ สรุปสถิติ...');
const ch6Nodes    = buildChapter6();

console.log('  📄 บทที่ ๗ ปัญหาและอุปสรรค...');
const ch7Nodes    = buildChapter7();

console.log('  📄 บทที่ ๘ ข้อเสนอแนะ...');
const ch8Nodes    = buildChapter8();

console.log('  📄 หน้าลงนาม + ภาคผนวก...');
const sigNodes    = buildSignaturePage();
const appNodes    = buildAppendix();

const allChildren = [
  ...coverNodes, ...khamnamNodes, ...tocNodes,
  ...ch1Nodes, ...ch2Nodes, ...ch3Nodes,
  ...ch4Nodes, ...ch5Nodes, ...ch6Nodes,
  ...ch7Nodes, ...ch8Nodes,
  ...sigNodes, ...appNodes,
];

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: F, size: SB },
        paragraph: { spacing: spNormal },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },     // A4
        margin: { top: 1440, bottom: 1440, left: 1701, right: 1440 }, // 2.54cm / 3cm
      },
    },
    children: allChildren,
  }],
});

// ─── Write file ──────────────────────────────────────────────────────────────
console.log('\n💾 กำลังบันทึกไฟล์...\n');
try { mkdirSync(OUTPUT_DIR, { recursive: true }); } catch(e) {}

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT_FILE, buffer);

const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
console.log(`✅ สร้างรายงานสำเร็จ!`);
console.log(`📁 ไฟล์: ${OUTPUT_FILE}`);
console.log(`📊 ขนาดไฟล์: ${sizeMB} MB`);
console.log(`\n📋 สรุปเนื้อหา:`);
console.log(`   - รถราชการ: ${cars.length} คัน`);
console.log(`   - พนักงานขับรถ: ${drivers.length} คน`);
console.log(`   - รายการใช้รถ: ${nf(queue.length)} เที่ยว`);
console.log(`   - บันทึกน้ำมัน: ${nf(fuel.length)} รายการ (${nf(totalFuelLiters,2)} ลิตร / ${bf(totalFuelAmount)} บาท)`);
console.log(`   - การซ่อมบำรุง: ${repair.length} ครั้ง (${bf(totalRepairCost)} บาท)`);
console.log(`\n🔍 กรุณาเปิดไฟล์ด้วย Microsoft Word เพื่อตรวจสอบ`);
console.log(`   (ต้องมีฟ้อนต์ TH Sarabun New ติดตั้งในเครื่อง)`);
