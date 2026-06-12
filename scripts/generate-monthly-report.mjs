#!/usr/bin/env node
// scripts/generate-monthly-report.mjs
// รายงานงานยานพาหนะประจำเดือน โรงเรียนพะเยาพิทยาคม
// วิธีใช้: node scripts/generate-monthly-report.mjs [YYYY-MM]

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, PageBreak, UnderlineType
} from 'docx';

// ══ CLI arg ══════════════════════════════════════════════════════════════════
const YM_ARG = process.argv[2] || '2026-05';
const [YA, MA] = YM_ARG.split('-').map(Number);
if (!YA || !MA) { console.error('Usage: node generate-monthly-report.mjs YYYY-MM'); process.exit(1); }
const MS = `${YA}-${String(MA).padStart(2,'0')}-01`;
const ME = `${YA}-${String(MA).padStart(2,'0')}-${new Date(YA,MA,0).getDate()}`;

// ══ Config ═══════════════════════════════════════════════════════════════════
const OUTPUT_DIR = 'D:\\รายงานยานพาหนะ 2568';
const DB = 'ppk-drivehub-db';

// ══ Persons ══════════════════════════════════════════════════════════════════
const P = {
  author:     { name: 'นายพงศธร โพธิแก้ว',                   pos: 'รองหัวหน้างานยานพาหนะ' },
  purchasing: { name: 'นายสงกรานต์ แก้วสา',                  pos: 'หัวหน้างานพัสดุ' },
  chief:      { name: 'นางจีรพา กันทา',                       pos: 'หัวหน้างานยานพาหนะ' },
  director:   { name: 'ว่าที่ร้อยตรีญาณบดินทร์ อินเตชะ',     pos: 'ผู้อำนวยการโรงเรียนพะเยาพิทยาคม' },
};
const SCHOOL = 'โรงเรียนพะเยาพิทยาคม';
const ORG    = 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพะเยา';

// ══ Lookup ═══════════════════════════════════════════════════════════════════
const FUEL_TH = { gasohol91:'แก๊สโซฮอล์ 91', gasohol95:'แก๊สโซฮอล์ 95', diesel:'ดีเซล B7', e20:'E20', fuelSave:'FuelSave', other:'อื่นๆ' };
const VEH_TH  = { van:'รถตู้', sedan:'รถยนต์นั่งส่วนกลาง', pickup:'รถกระบะ', bus:'รถโดยสาร', motorcycle:'รถจักรยานยนต์' };
const SVC_TH  = { repair:'ซ่อมทั่วไป', scheduled_service:'บำรุงรักษาตามระยะ', accident:'อุบัติเหตุ', insurance:'เคลมประกันภัย' };

// ══ Thai date helpers ════════════════════════════════════════════════════════
const TH_MONTHS    = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MONTHS_SH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function toDate(s) {
  if (!s) return null;
  const str = String(s).replace(' ','T');
  const d = new Date(str.length===10 ? str+'T00:00:00' : str);
  return isNaN(d.getTime()) ? null : d;
}
function thDate(s)   { const d=toDate(s); if(!d) return '-'; return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()+543}`; }
function thDateSh(s) { const d=toDate(s); if(!d) return '-'; return `${String(d.getDate()).padStart(2,'0')} ${TH_MONTHS_SH[d.getMonth()]} ${String(d.getFullYear()+543).slice(-2)}`; }
function nf(n,dec=0) { if(n==null||n===''||isNaN(+n)) return '-'; return (+n).toLocaleString('th-TH',{minimumFractionDigits:dec,maximumFractionDigits:dec}); }
function bf(n) { return nf(n,2); }
function diffHours(a,b) {
  const da=toDate(a), db=toDate(b);
  if(!da||!db) return null;
  const h=(db-da)/3600000;
  return (h>0&&h<24) ? h : null;
}

const MONTH_TH    = TH_MONTHS[MA-1];
const YEAR_TH     = YA+543;
const MONTH_LABEL = `${MONTH_TH} พ.ศ. ${YEAR_TH}`;

// ══ DB query ═════════════════════════════════════════════════════════════════
function qDB(sql) {
  try {
    const escaped = sql.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const out = execSync(
      `npx wrangler d1 execute ${DB} --remote --json --command "${escaped}"`,
      { encoding:'utf8', maxBuffer:150*1024*1024, stdio:['pipe','pipe','pipe'] }
    );
    const idx = out.indexOf('[');
    if(idx<0) return [];
    return JSON.parse(out.slice(idx))[0]?.results ?? [];
  } catch(e) {
    console.error('✗ DB error:', e.message.slice(0,200));
    return [];
  }
}

// ══ Page size constants ═══════════════════════════════════════════════════════
const PAGE_P = { size:{width:11906,height:16838}, margin:{top:1440,bottom:1440,left:1701,right:1440} };
const PAGE_L = { size:{width:16838,height:11906}, margin:{top:1080,bottom:1080,left:1080,right:1080} };

// ══ Docx styles ══════════════════════════════════════════════════════════════
const F  = 'TH Sarabun New';
const SB = 32, SH = 36, ST = 48, SC = 60, CS = 24, SS = 28;

const BC = {
  top:   {style:BorderStyle.SINGLE,size:6,color:'000000'},
  bottom:{style:BorderStyle.SINGLE,size:6,color:'000000'},
  left:  {style:BorderStyle.SINGLE,size:6,color:'000000'},
  right: {style:BorderStyle.SINGLE,size:6,color:'000000'},
};
const BC_THICK = {
  top:   {style:BorderStyle.SINGLE,size:16,color:'000000'},
  bottom:{style:BorderStyle.SINGLE,size:16,color:'000000'},
  left:  {style:BorderStyle.SINGLE,size:16,color:'000000'},
  right: {style:BorderStyle.SINGLE,size:16,color:'000000'},
};
const BC_NONE = {
  top:{style:BorderStyle.NONE}, bottom:{style:BorderStyle.NONE},
  left:{style:BorderStyle.NONE}, right:{style:BorderStyle.NONE},
};

const HS_HDR  = {type:ShadingType.CLEAR,fill:'1F3864'};
const HS_SUB  = {type:ShadingType.CLEAR,fill:'D9E1F2'};
const HS_GTOT = {type:ShadingType.CLEAR,fill:'BDD7EE'};
const HS_INFO = {type:ShadingType.CLEAR,fill:'F2F2F2'};

const spN={before:0,after:0,line:360,lineRule:'auto'};
const spS={before:40,after:40,line:280,lineRule:'auto'};
const spH={before:200,after:100,line:360,lineRule:'auto'};
const spC={before:120,after:120,line:400,lineRule:'auto'};

function tr(t,o={}) {
  return new TextRun({text:String(t??''),font:F,size:o.size||SB,bold:!!o.bold,
    underline:o.underline?{type:UnderlineType.SINGLE}:undefined,color:o.color||'000000'});
}
function trRed(t,o={}) { return new TextRun({text:String(t??''),font:F,size:o.size||SB,bold:true,color:'CC0000'}); }
function pp(c,o={}) {
  const kids = typeof c==='string'
    ? [tr(c,{size:o.size||SB,bold:o.bold,color:o.color})]
    : (Array.isArray(c) ? c : [c]);
  return new Paragraph({alignment:o.align||AlignmentType.LEFT,spacing:o.sp||spN,indent:o.indent||{},children:kids});
}
function ppc(t,o={}) { return pp(t,{...o,align:AlignmentType.CENTER}); }
function ppr(t,o={}) { return pp(t,{...o,align:AlignmentType.RIGHT}); }
function ppbold(t,o={}) { return pp(t,{...o,bold:true}); }
function el(n=1) { return Array.from({length:n},()=>pp('',{sp:{...spN,line:280}})); }
function pb() { return new Paragraph({children:[new PageBreak()],spacing:{before:0,after:0}}); }

function hCell(t,w,o={}) {
  return new TableCell({width:w?{size:w,type:WidthType.DXA}:undefined,borders:BC,shading:HS_HDR,
    verticalAlign:'center',rowSpan:o.rowSpan||1,columnSpan:o.colSpan||1,
    children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:spS,
      children:[tr(t,{size:o.size||CS,bold:true,color:'FFFFFF'})]})]});
}
function dCell(t,w,o={}) {
  const child = o.red
    ? trRed(String(t??'-'),{size:o.size||CS})
    : tr(String(t??'-'),{size:o.size||CS,bold:o.bold,color:o.color});
  return new TableCell({width:w?{size:w,type:WidthType.DXA}:undefined,borders:o.borders||BC,
    verticalAlign:'center',columnSpan:o.span,shading:o.shade,
    children:[new Paragraph({alignment:o.align||AlignmentType.LEFT,spacing:spS,children:[child]})]});
}
function dCellC(t,w,o={}) { return dCell(t,w,{...o,align:AlignmentType.CENTER}); }
function dCellR(t,w,o={}) { return dCell(t,w,{...o,align:AlignmentType.RIGHT}); }
function dCellRed(t,w,o={}) { return dCell(t,w,{...o,red:true,align:AlignmentType.CENTER}); }

function makeTable(headers,rows) {
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[
    new TableRow({tableHeader:true,children:headers.map(h=>hCell(h.text,h.w,h))}),
    ...rows.map(r=>new TableRow({children:r})),
  ]});
}

function sourceNote(extra='') {
  const now = thDate(new Date().toISOString().slice(0,10));
  return pp([tr(`ที่มา: ระบบบริหารงานยานพาหนะ PPK-DriveHub, ${SCHOOL} ณ วันที่ ${now}${extra?` | ${extra}`:''}`,{size:22,color:'555555'})],
    {sp:{before:40,after:60,line:280,lineRule:'auto'}});
}

// ══ Signature block — เรียงลงมาเป็นลำดับ (ไม่ใช้ตาราง) ════════════════════
function oneSigBlock(role, name, pos) {
  const sp0 = {before:0,after:0,line:360,lineRule:'auto'};
  return [
    pp([tr('ลงชื่อ .............................................',{size:SB})],{sp:{before:100,after:0,line:360,lineRule:'auto'},align:AlignmentType.CENTER}),
    ppc(`(${name})`,{sp:{...sp0,before:20},size:SB}),
    ppc(role,{sp:{...sp0,before:10},size:SB,bold:true}),
    ppc(pos,{sp:{...sp0,before:10},size:SB}),
    ppc(`วันที่ ......... เดือน ....................... พ.ศ. ..........`,{sp:{before:40,after:80,line:360,lineRule:'auto'},size:SB}),
  ];
}
function sigBlock4() {
  return [
    pp([tr('ขอรับรองว่าข้อมูลในรายงานฉบับนี้ได้รวบรวมจากระบบบริหารงานยานพาหนะ PPK-DriveHub',{size:SB,color:'555555'})],
      {sp:{before:80,after:0,line:360,lineRule:'auto'},align:AlignmentType.CENTER}),
    pp([tr('ซึ่งบันทึกโดยพนักงานขับรถ ผู้จัดทำรายงานเป็นเพียงผู้รวบรวมและสรุปข้อมูลเท่านั้น',{size:SB,color:'555555'})],
      {sp:{before:0,after:60,line:360,lineRule:'auto'},align:AlignmentType.CENTER}),
    ...oneSigBlock('ผู้จัดทำรายงาน',      P.author.name,     P.author.pos),
    ...oneSigBlock('ผู้ตรวจสอบใบเสร็จรับเงิน', P.purchasing.name, P.purchasing.pos),
    ...oneSigBlock('หัวหน้างานยานพาหนะ',  P.chief.name,      P.chief.pos),
    ...oneSigBlock('ผู้อนุมัติ',           P.director.name,   P.director.pos),
  ];
}

// ══ Load Data ════════════════════════════════════════════════════════════════
console.log(`\n📊 กำลังดึงข้อมูลเดือน ${MONTH_LABEL}...\n`);

const cars = qDB(`SELECT id,license_plate,brand,model,year,color,fuel_type,seat_count,vehicle_type,current_mileage FROM cars ORDER BY vehicle_type,license_plate`);
console.log(`  ✓ รถ: ${cars.length} คัน`);

const drivers = qDB(`SELECT id,title,first_name,last_name,license_number,license_expiry,phone,status,discipline_score,fatigue_flag,position,driver_type FROM drivers ORDER BY driver_type,status,first_name`);
console.log(`  ✓ พนักงานขับรถ: ${drivers.length} คน`);

const queue = qDB(`SELECT q.id,q.date,q.time_start,q.time_end,q.car_id,c.license_plate,c.brand,c.model,q.driver_id,COALESCE(d.first_name||' '||d.last_name,'') AS driver_name,q.requested_by,q.mission,q.destination,q.passengers,q.status,q.notes,q.travel_order_number,q.signed_vehicle_chief,q.signed_director,dep.datetime AS actual_departure,dep.mileage AS mileage_start,ret.datetime AS actual_return,ret.mileage AS mileage_end FROM queue q LEFT JOIN cars c ON c.id=q.car_id LEFT JOIN drivers d ON d.id=q.driver_id LEFT JOIN usage_records dep ON dep.queue_id=q.id AND dep.record_type='departure' LEFT JOIN usage_records ret ON ret.queue_id=q.id AND ret.record_type='return' WHERE q.date>='${MS}' AND q.date<='${ME}' AND q.status!='cancelled' ORDER BY q.date,q.time_start`);
console.log(`  ✓ รายการใช้รถ: ${queue.length} เที่ยว`);

const fuel = qDB(`SELECT f.id,f.date,f.time,f.car_id,c.license_plate,c.brand,c.model,c.vehicle_type,COALESCE(d.first_name||' '||d.last_name,f.driver_name_manual,'-') AS driver_name,f.liters,f.price_per_liter,f.amount,f.fuel_type,f.gas_station_name,f.mileage_before,f.mileage_after,f.fuel_consumption_rate,f.document_number,f.receipt_number,f.anomaly_flag,f.notes,f.signed_supply_chief,f.expense_type FROM fuel_log f LEFT JOIN cars c ON c.id=f.car_id LEFT JOIN drivers d ON d.id=f.driver_id WHERE f.date>='${MS}' AND f.date<='${ME}' AND f.deleted_at IS NULL ORDER BY f.car_id,f.date,f.time`);
console.log(`  ✓ น้ำมัน: ${fuel.length} รายการ`);

const repair = qDB(`SELECT r.id,r.car_id,c.license_plate,r.date_reported,r.date_started,r.date_completed,r.status,r.service_type,r.garage_name,r.issue_description,r.labour_cost,r.parts_cost,r.grand_total,r.invoice_number,r.mileage_at_repair FROM repair_log r LEFT JOIN cars c ON c.id=r.car_id WHERE (r.date_reported>='${MS}' OR r.date_started>='${MS}' OR r.date_completed>='${MS}') AND (r.date_reported<='${ME}' OR r.date_started<='${ME}' OR r.date_completed<='${ME}') AND r.status NOT IN ('cancelled') ORDER BY COALESCE(r.date_completed,r.date_reported)`);
console.log(`  ✓ ซ่อมบำรุง: ${repair.length} รายการ`);

// ดึงรายการ usage_records ที่ไม่มี queue (บันทึกโดยตรงหรือไม่มีใบขอ)
const unboundUsage = qDB(`SELECT ur.id,ur.car_id,c.license_plate,c.brand,c.model,ur.record_type,ur.datetime,ur.mileage,COALESCE(d.first_name||' '||d.last_name,ur.driver_name_manual,'-') AS driver_name,ur.notes FROM usage_records ur LEFT JOIN cars c ON c.id=ur.car_id LEFT JOIN drivers d ON d.id=ur.driver_id WHERE ur.queue_id IS NULL AND ur.datetime>='${MS}' AND ur.datetime<='${ME} 23:59:59' ORDER BY ur.car_id,ur.datetime`);
console.log(`  ✓ รายการใช้รถไม่มีใบขอ: ${unboundUsage.length} รายการ`);

console.log('\n🏗️  กำลังสร้างรายงาน...\n');

// ══ Pre-process ══════════════════════════════════════════════════════════════
const totalPax     = queue.reduce((s,q)=>s+(+q.passengers||0),0);
const totalFuelL   = fuel.reduce((s,f)=>s+(+f.liters||0),0);
const totalFuelA   = fuel.reduce((s,f)=>s+(+f.amount||0),0);
const totalRepairA = repair.reduce((s,r)=>s+(+r.grand_total||0),0);

const qByCar = {}, qByDriver = {};
for (const q of queue) {
  const plate = q.license_plate || q.car_id;
  if(!qByCar[plate]) qByCar[plate]={trips:0,pax:0,dist:0,missedDep:0,missedRet:0,hours:0};
  qByCar[plate].trips++;
  qByCar[plate].pax += (+q.passengers||0);
  const ms=q.mileage_start, me=q.mileage_end;
  if(ms&&me&&me>ms&&me-ms<2000) qByCar[plate].dist += me-ms;
  if(!q.actual_departure) qByCar[plate].missedDep++;
  if(!q.actual_return)    qByCar[plate].missedRet++;
  const hrs = diffHours(q.actual_departure,q.actual_return);
  if(hrs) qByCar[plate].hours += hrs;
  const dn = q.driver_name || q.driver_id;
  if(dn) {
    if(!qByDriver[dn]) qByDriver[dn]={trips:0,pax:0,dist:0,hours:0,missed:0};
    qByDriver[dn].trips++;
    qByDriver[dn].pax += (+q.passengers||0);
    if(ms&&me&&me>ms&&me-ms<2000) qByDriver[dn].dist += me-ms;
    if(hrs) qByDriver[dn].hours += hrs;
    if(!q.actual_departure||!q.actual_return) qByDriver[dn].missed++;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — ปกหน้า + สรุปภาพรวม (แนวตั้ง Portrait)
// ════════════════════════════════════════════════════════════════════════════
const sec1 = [];

// ── ปกหน้า ──────────────────────────────────────────────────────────────────
sec1.push(
  ...el(2),
  ppc('❧',{sp:spC,size:56}),
  ...el(1),
  ppc('รายงานงานยานพาหนะ',{sp:spC,size:SC,bold:true}),
  ppc('ประจำเดือน',{sp:{...spC,before:40},size:ST}),
  ppc(MONTH_LABEL,{sp:spC,size:ST,bold:true}),
  ...el(1),
  ppc('══════════════════════════════════════════════',{sp:{before:0,after:0,line:280},size:28}),
  ...el(1),
  ppc(SCHOOL,{sp:spC,size:44,bold:true}),
  ppc(ORG,{sp:{...spC,before:60},size:32}),
  ppc('กระทรวงศึกษาธิการ',{sp:{...spC,before:40},size:32}),
  ...el(2),
  ppc('══════════════════════════════════════════════',{sp:{before:0,after:0,line:280},size:28}),
  ...el(1),
  ppc('จัดทำโดย',{sp:spC,size:SB}),
  ppc(P.author.name,{sp:{...spC,before:60},size:36,bold:true}),
  ppc(P.author.pos, {sp:{...spC,before:40},size:SB}),
  ppc(SCHOOL,       {sp:{...spC,before:40},size:SB}),
  pb()
);

// ── สรุปภาพรวมประจำเดือน ─────────────────────────────────────────────────────
sec1.push(
  ppc('สรุปภาพรวมงานยานพาหนะ',{sp:spH,size:SH,bold:true}),
  ppc(`ประจำเดือน${MONTH_LABEL}`,{sp:{before:0,after:100,line:360,lineRule:'auto'},size:SB}),
);

const ovH = [{text:'รายการ',w:3200},{text:'จำนวน',w:1400},{text:'หน่วย',w:800},{text:'หมายเหตุ',w:4000}];
sec1.push(makeTable(ovH,[
  [dCell('รายการใช้รถทั้งสิ้น',ovH[0].w,{bold:true}),dCellR(nf(queue.length),ovH[1].w,{bold:true}),dCellC('เที่ยว',ovH[2].w),dCell('-',ovH[3].w)],
  [dCell('จำนวนผู้โดยสารรวม',ovH[0].w),dCellR(nf(totalPax),ovH[1].w),dCellC('คน-ครั้ง',ovH[2].w),dCell('-',ovH[3].w)],
  [dCell('รายการที่ลืมบันทึกเวลาออก',ovH[0].w,{color:'CC0000',bold:true}),
   dCellR(nf(queue.filter(q=>!q.actual_departure).length),ovH[1].w,{color:'CC0000',bold:true}),
   dCellC('ครั้ง',ovH[2].w),dCellRed('ต้องแก้ไข',ovH[3].w)],
  [dCell('รายการที่ลืมบันทึกเวลากลับ',ovH[0].w,{color:'CC0000',bold:true}),
   dCellR(nf(queue.filter(q=>!q.actual_return).length),ovH[1].w,{color:'CC0000',bold:true}),
   dCellC('ครั้ง',ovH[2].w),dCellRed('ต้องแก้ไข',ovH[3].w)],
  [dCell('บันทึกน้ำมันเชื้อเพลิง',ovH[0].w,{bold:true}),dCellR(nf(fuel.length),ovH[1].w,{bold:true}),dCellC('รายการ',ovH[2].w),dCell(`${nf(totalFuelL,2)} ลิตร`,ovH[3].w)],
  [dCell('ค่าน้ำมันรวม',ovH[0].w),dCellR(bf(totalFuelA),ovH[1].w,{bold:true}),dCellC('บาท',ovH[2].w),dCell('-',ovH[3].w)],
  [dCell('การซ่อมบำรุง',ovH[0].w,{bold:true}),dCellR(nf(repair.length),ovH[1].w,{bold:true}),dCellC('รายการ',ovH[2].w),
   dCell(repair.length?`${bf(totalRepairA)} บาท`:'ไม่มีการซ่อมบำรุง',ovH[3].w)],
  [dCell('พนักงานขับรถที่ปฏิบัติงาน',ovH[0].w),dCellR(nf(Object.keys(qByDriver).length),ovH[1].w),dCellC('คน',ovH[2].w),
   dCell(`จากทั้งหมด ${drivers.length} คน`,ovH[3].w)],
]));
sec1.push(sourceNote());

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — บันทึกการใช้รถรายคัน (แนวนอน Landscape)
// ════════════════════════════════════════════════════════════════════════════
const sec2 = [];

sec2.push(
  ppc('บันทึกการใช้รถราชการรายคัน',{sp:spH,size:SH,bold:true}),
  ppc(`ประจำเดือน${MONTH_LABEL}`,{sp:{before:0,after:40,line:360,lineRule:'auto'},size:SB}),
  pp([tr('หมายเหตุ: ',{bold:true,size:SB}),trRed('ข้อความสีแดง',{size:SB}),tr(' = พนักงานขับรถไม่บันทึก / เลขไมล์คำนวณอัตโนมัติ',{size:SB})],
    {sp:{before:0,after:20,line:360,lineRule:'auto'}}),
  pp([tr('⚠ ข้อมูลบันทึกการใช้รถได้มาจากระบบ PPK-DriveHub ซึ่งบันทึกโดยพนักงานขับรถ ผู้จัดทำรายงานเป็นเพียงผู้รวบรวมข้อมูลสรุปเท่านั้น',{size:22,color:'555555'})],
    {sp:{before:0,after:80,line:360,lineRule:'auto'}}),
);

// สรุปรายคัน
const sumCarH = [
  {text:'ลำดับ',w:380},{text:'ทะเบียนรถ',w:760},{text:'ยี่ห้อ/รุ่น',w:1100},
  {text:'จำนวนเที่ยว',w:760},{text:'ระยะทาง\n(กม.)',w:860},{text:'ชั่วโมงขับ',w:760},
  {text:'ลืมบันทึก\n(ออก/กลับ)',w:860},{text:'หมายเหตุ',w:2500},
];
const sumCarRows = cars.map((c,i)=>{
  const s = qByCar[c.license_plate]||{trips:0,pax:0,dist:0,hours:0,missedDep:0,missedRet:0};
  const hasMiss = s.missedDep>0||s.missedRet>0;
  return [
    dCellC(i+1,sumCarH[0].w),
    dCellC(c.license_plate,sumCarH[1].w,{bold:s.trips>0}),
    dCell(`${c.brand||''} ${c.model||''}`.trim()||'-',sumCarH[2].w),
    dCellR(nf(s.trips),sumCarH[3].w,{bold:s.trips>0}),
    dCellR(s.dist>0?nf(s.dist):'-',sumCarH[4].w),
    dCellC(s.hours>0?nf(s.hours,1)+' ชม.':'-',sumCarH[5].w),
    hasMiss ? dCellRed(`${s.missedDep}/${s.missedRet}`,sumCarH[6].w) : dCellC('0/0',sumCarH[6].w,{color:'006600'}),
    dCell(s.trips===0?'ไม่มีการใช้งาน':'-',sumCarH[7].w),
  ];
});
sec2.push(ppbold('สรุปการใช้รถราชการรายคัน',{sp:{before:80,after:60,line:360,lineRule:'auto'}}));
sec2.push(makeTable(sumCarH,sumCarRows));
sec2.push(sourceNote());
sec2.push(...el(1));

// แบบ ๔ รายละเอียดรายคัน — ไม่มีคอลัมน์ ผู้โดยสาร / เลขที่คำสั่ง / ผู้อนุมัติ
sec2.push(ppbold('รายละเอียดบันทึกการใช้รถราชการ (แบบ ๔) แยกรายคัน',{sp:{before:80,after:60,line:360,lineRule:'auto'}}));

const b4H = [
  {text:'ที่',w:280,size:CS},{text:'วันที่',w:560,size:CS},{text:'เวลาออก\n(แผน)',w:500,size:CS},
  {text:'เวลากลับ\n(แผน)',w:500,size:CS},{text:'เวลาออก\n(จริง)',w:560,size:CS},
  {text:'เวลากลับ\n(จริง)',w:560,size:CS},{text:'มิเตอร์ออก\n(กม.)',w:680,size:CS},
  {text:'มิเตอร์กลับ\n(กม.)',w:680,size:CS},{text:'ระยะ\n(กม.)',w:500,size:CS},
  {text:'ผู้ขับรถ',w:1000,size:CS},{text:'ผู้ขอใช้รถ',w:900,size:CS},
  {text:'ปลายทาง / วัตถุประสงค์',w:1800,size:CS},{text:'หมายเหตุ',w:1500,size:CS},
];

// ฟังก์ชันคำนวณเลขไมล์อัตโนมัติจากรายการใกล้เคียง
function estimateMileage(carId, refDate, type, allQueue) {
  const sorted = allQueue
    .filter(q => q.car_id===carId && (type==='start' ? q.mileage_start : q.mileage_end))
    .sort((a,b) => (a.date||'').localeCompare(b.date||''));
  if(sorted.length===0) return null;
  return type==='start'
    ? sorted.find(q=>q.date>=refDate)?.mileage_start || sorted[sorted.length-1]?.mileage_start
    : sorted.slice().reverse().find(q=>q.date<=refDate)?.mileage_end || sorted[0]?.mileage_end;
}

for (const car of cars) {
  const carTrips = queue.filter(q=>q.license_plate===car.license_plate);
  // เพิ่มรายการ unbound ของรถคันนี้
  const carUnbound = unboundUsage.filter(u=>u.license_plate===car.license_plate);
  if(carTrips.length===0 && carUnbound.length===0) continue;

  const s = qByCar[car.license_plate]||{trips:0,dist:0,hours:0,missedDep:0,missedRet:0};
  sec2.push(ppbold(
    `ทะเบียน ${car.license_plate}  ${car.brand||''} ${car.model||''}  (${nf(carTrips.length)} เที่ยว  ระยะทาง ${s.dist>0?nf(s.dist):'-'} กม.)`,
    {sp:{before:160,after:60,line:360,lineRule:'auto'}}
  ));
  let seq=0;
  const rows = carTrips.map(q=>{
    seq++;
    const ms=q.mileage_start, me=q.mileage_end;
    const dist = (ms&&me&&me>ms) ? me-ms : null;
    const missDep=!q.actual_departure, missRet=!q.actual_return;
    const missMsRaw = !ms, missMeRaw = !me;
    // เลขไมล์อัตโนมัติถ้าไม่มีข้อมูล
    const autoMs = missMsRaw ? estimateMileage(q.car_id, q.date, 'start', queue) : null;
    const autoMe = missMeRaw ? estimateMileage(q.car_id, q.date, 'end', queue) : null;
    const distEst = (autoMs||ms) && (autoMe||me) && (autoMe||me)>(autoMs||ms) ? (autoMe||me)-(autoMs||ms) : dist;
    const noteArr = [
      missDep ? 'พนักงานขับรถไม่บันทึกก่อนออกเดินทาง' : '',
      missRet ? 'พนักงานขับรถไม่บันทึกหลังกลับมาจากเดินทาง' : '',
      q.notes||'',
    ].filter(Boolean);
    return [
      dCellC(seq,b4H[0].w,{size:CS}),
      dCellC(thDateSh(q.date),b4H[1].w,{size:CS}),
      dCellC(q.time_start?q.time_start.slice(0,5):'-',b4H[2].w,{size:CS}),
      dCellC(q.time_end?q.time_end.slice(0,5):'-',b4H[3].w,{size:CS}),
      missDep ? dCellRed('ไม่บันทึก',b4H[4].w,{size:CS}) : dCellC(String(q.actual_departure).slice(11,16),b4H[4].w,{size:CS}),
      missRet ? dCellRed('ไม่บันทึก',b4H[5].w,{size:CS}) : dCellC(String(q.actual_return).slice(11,16),b4H[5].w,{size:CS}),
      missMsRaw
        ? new TableCell({width:{size:b4H[6].w,type:WidthType.DXA},borders:BC,children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:spS,children:[trRed(autoMs?nf(autoMs):'ไม่บันทึก',{size:CS})]})]})
        : dCellR(nf(ms),b4H[6].w,{size:CS}),
      missMeRaw
        ? new TableCell({width:{size:b4H[7].w,type:WidthType.DXA},borders:BC,children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:spS,children:[trRed(autoMe?nf(autoMe):'ไม่บันทึก',{size:CS})]})]})
        : dCellR(nf(me),b4H[7].w,{size:CS}),
      (missMsRaw||missMeRaw) && distEst
        ? new TableCell({width:{size:b4H[8].w,type:WidthType.DXA},borders:BC,children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:spS,children:[trRed(nf(distEst),{size:CS})]})]})
        : dCellR(dist?nf(dist):'-',b4H[8].w,{size:CS,bold:!!dist}),
      dCell(q.driver_name||'-',b4H[9].w,{size:CS}),
      dCell(q.requested_by||'-',b4H[10].w,{size:CS}),
      dCell(`${q.destination||'-'}${q.mission?' / '+q.mission:''}`,b4H[11].w,{size:CS}),
      dCell(noteArr.join(' | ')||'-',b4H[12].w,{size:CS,color:noteArr.some(n=>n.includes('ไม่บันทึก'))?'CC0000':'000000'}),
    ];
  });

  // เพิ่มรายการที่มีการใช้รถโดยไม่บันทึกใบขอ (unbound usage_records)
  if(carUnbound.length>0) {
    // จัดกลุ่ม unbound เป็นคู่ departure/return
    const depRecs = carUnbound.filter(u=>u.record_type==='departure');
    const retRecs = carUnbound.filter(u=>u.record_type==='return');
    const usedDates = new Set();
    for(const dep of depRecs) {
      const dateKey = dep.datetime?.slice(0,10)||'';
      if(usedDates.has(dateKey)) continue;
      usedDates.add(dateKey);
      seq++;
      const ret = retRecs.find(r=>r.datetime?.slice(0,10)===dateKey);
      const ms2 = dep.mileage, me2 = ret?.mileage;
      const dist2 = (ms2&&me2&&me2>ms2) ? me2-ms2 : null;
      rows.push([
        dCellC(seq,b4H[0].w,{size:CS,red:true}),
        dCellC(thDateSh(dateKey),b4H[1].w,{size:CS,red:true}),
        dCellC('-',b4H[2].w,{size:CS}),
        dCellC('-',b4H[3].w,{size:CS}),
        new TableCell({width:{size:b4H[4].w,type:WidthType.DXA},borders:BC,children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:spS,children:[trRed(dep.datetime?.slice(11,16)||'-',{size:CS})]})]}),
        ret
          ? new TableCell({width:{size:b4H[5].w,type:WidthType.DXA},borders:BC,children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:spS,children:[trRed(ret.datetime?.slice(11,16)||'-',{size:CS})]})]})
          : dCellRed('ไม่บันทึก',b4H[5].w,{size:CS}),
        ms2
          ? new TableCell({width:{size:b4H[6].w,type:WidthType.DXA},borders:BC,children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:spS,children:[trRed(nf(ms2),{size:CS})]})]})
          : dCellRed('ไม่บันทึก',b4H[6].w,{size:CS}),
        me2
          ? new TableCell({width:{size:b4H[7].w,type:WidthType.DXA},borders:BC,children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:spS,children:[trRed(nf(me2),{size:CS})]})]})
          : dCellRed('ไม่บันทึก',b4H[7].w,{size:CS}),
        dist2
          ? new TableCell({width:{size:b4H[8].w,type:WidthType.DXA},borders:BC,children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:spS,children:[trRed(nf(dist2),{size:CS})]})],})
          : dCellRed('-',b4H[8].w,{size:CS}),
        dCell(dep.driver_name||'-',b4H[9].w,{size:CS}),
        dCellRed('(ไม่มีใบขอใช้รถ)',b4H[10].w,{size:CS}),
        dCell(dep.notes||ret?.notes||'-',b4H[11].w,{size:CS}),
        new TableCell({width:{size:b4H[12].w,type:WidthType.DXA},borders:BC,children:[new Paragraph({alignment:AlignmentType.LEFT,spacing:spS,children:[trRed('มีการใช้รถโดยไม่บันทึกใบขอใช้รถ',{size:CS})]})]}),
      ]);
    }
  }

  sec2.push(makeTable(b4H,rows));
  sec2.push(sourceNote());
  sec2.push(...el(1));
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — พนักงานขับรถ (แนวตั้ง Portrait)
// ════════════════════════════════════════════════════════════════════════════
const sec3 = [];

const DRIVER_TYPE_LABEL = { main:'พนักงานขับรถหลัก', special:'พนักงานขับรถเฉพาะกิจ', reserve:'พนักงานขับรถสำรอง', other:'อื่นๆ' };
const DRIVER_TYPE_ORDER = ['main','special','reserve','other'];

sec3.push(
  ppc('รายงานการปฏิบัติงานพนักงานขับรถ',{sp:spH,size:SH,bold:true}),
  ppc(`ประจำเดือน${MONTH_LABEL}`,{sp:{before:0,after:60,line:360,lineRule:'auto'},size:SB}),
);

const drvH = [
  {text:'ลำดับ',w:400},{text:'ชื่อ-นามสกุล',w:1800},
  {text:'จำนวนรอบ\n(เที่ยว)',w:800},{text:'ระยะทาง\n(กม.)',w:800},
  {text:'ชั่วโมงขับรวม',w:900},{text:'ลืมบันทึก\n(ครั้ง)',w:800},
];

// แยกตามประเภทพนักงาน
for (const dType of DRIVER_TYPE_ORDER) {
  const typeDrivers = drivers.filter(d=>d.status==='active' && (d.driver_type===dType || (!d.driver_type && dType==='other')));
  if(typeDrivers.length===0) continue;
  const typeLabel = DRIVER_TYPE_LABEL[dType]||dType;
  sec3.push(ppbold(`─ ${typeLabel} ─`, {sp:{before:120,after:40,line:360,lineRule:'auto'}, color:'1F3864'}));

  const drvRows = typeDrivers.map((d,i)=>{
    const dn = `${d.first_name} ${d.last_name}`;
    const st = qByDriver[dn]||{trips:0,dist:0,hours:0,missed:0};
    return [
      dCellC(i+1,drvH[0].w),
      dCell(`${d.title||''}${dn}`,drvH[1].w,{bold:st.trips>0}),
      dCellR(nf(st.trips),drvH[2].w,{bold:st.trips>0}),
      dCellR(st.dist>0?nf(st.dist):'-',drvH[3].w),
      dCellC(st.hours>0?nf(st.hours,1)+' ชม.':'-',drvH[4].w),
      st.missed>0 ? dCellRed(nf(st.missed),drvH[5].w) : dCellC('0',drvH[5].w,{color:'006600'}),
    ];
  });

  // บรรทัดสรุปรวมของประเภทนี้
  const typeTotal = typeDrivers.reduce((acc,d)=>{
    const dn = `${d.first_name} ${d.last_name}`;
    const st = qByDriver[dn]||{trips:0,dist:0,hours:0,missed:0};
    acc.trips+=st.trips; acc.dist+=st.dist; acc.hours+=st.hours; acc.missed+=st.missed;
    return acc;
  },{trips:0,dist:0,hours:0,missed:0});
  drvRows.push([
    new TableCell({columnSpan:2,borders:BC_THICK,shading:HS_SUB,children:[ppc(`รวม${typeLabel} (${typeDrivers.length} คน)`,{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC_THICK,shading:HS_SUB,children:[ppr(nf(typeTotal.trips),{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC_THICK,shading:HS_SUB,children:[ppr(typeTotal.dist>0?nf(typeTotal.dist):'-',{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC_THICK,shading:HS_SUB,children:[ppc(typeTotal.hours>0?nf(typeTotal.hours,1)+' ชม.':'-',{sp:spS,bold:true,size:CS})]}),
    typeTotal.missed>0
      ? new TableCell({borders:BC_THICK,shading:HS_SUB,children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:spS,children:[trRed(nf(typeTotal.missed),{size:CS})]})]}
      )
      : new TableCell({borders:BC_THICK,shading:HS_SUB,children:[ppc('0',{sp:spS,size:CS,color:'006600'})]}
      ),
  ]);

  sec3.push(makeTable(drvH,drvRows));
  sec3.push(...el(1));
}

sec3.push(sourceNote());

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — บัญชีคุมน้ำมันเชื้อเพลิง (แนวนอน Landscape)
// ════════════════════════════════════════════════════════════════════════════
const sec4 = [];

sec4.push(
  ppc('บัญชีคุมน้ำมันเชื้อเพลิง',{sp:spH,size:SH,bold:true}),
  ppc(`ประจำเดือน${MONTH_LABEL}`,{sp:{before:0,after:20,line:360,lineRule:'auto'},size:SB}),
  ppc(`ส่วนราชการ ${SCHOOL}  สังกัด ${ORG}`,{sp:{before:0,after:20,line:360,lineRule:'auto'},size:SB}),
  pp([tr('หมายเหตุ: ',{bold:true,size:SB}),trRed('ข้อความสีแดง',{size:SB}),tr(' = ไม่บันทึกเลขมาตรวัดระยะ',{size:SB})],
    {sp:{before:0,after:80,line:360,lineRule:'auto'}}),
);

// Landscape usable width ≈ 16838 - 2×1080 = 14678 DXA
const fuelH = [
  {text:'ที่',w:280,size:CS},{text:'วันที่',w:600,size:CS},{text:'เวลา',w:440,size:CS},
  {text:'ทะเบียนรถ',w:640,size:CS},{text:'เลขที่ใบเสร็จ',w:860,size:CS},{text:'ชนิดน้ำมัน',w:760,size:CS},
  {text:'ปริมาณ\n(ลิตร)',w:480,size:CS},{text:'ราคา/ลิตร\n(บาท)',w:560,size:CS},
  {text:'จำนวนเงิน\n(บาท)',w:760,size:CS},{text:'วงเงินสะสม\n(บาท)',w:860,size:CS},
  {text:'เลขมาตร\n(กม.)',w:800,size:CS},{text:'กม./ลิตร',w:520,size:CS},
  {text:'ผู้เบิก/ผู้ขับ',w:940,size:CS},{text:'สถานีบริการ',w:1080,size:CS},{text:'หมายเหตุ',w:640,size:CS},
];

const fuelByCar = {};
for (const f of fuel) {
  const plate = f.license_plate || f.car_id;
  if(!fuelByCar[plate]) fuelByCar[plate]=[];
  fuelByCar[plate].push(f);
}

for (const car of cars) {
  const recs = fuelByCar[car.license_plate];
  if(!recs||recs.length===0) continue;
  const carL  = recs.reduce((s,f)=>s+(+f.liters||0),0);
  const carA  = recs.reduce((s,f)=>s+(+f.amount||0),0);
  const rates = recs.filter(f=>f.fuel_consumption_rate).map(f=>+f.fuel_consumption_rate);
  const avgR  = rates.length ? rates.reduce((a,b)=>a+b,0)/rates.length : null;

  sec4.push(ppbold(
    `ทะเบียน ${car.license_plate}  ${car.brand||''} ${car.model||''}  (${recs.length} รายการ  ${nf(carL,2)} ลิตร  ${bf(carA)} บาท  อัตราเฉลี่ย ${avgR?nf(avgR,2):'-'} กม./ลิตร)`,
    {sp:{before:140,after:60,line:360,lineRule:'auto'}}
  ));

  let running=0, seq=0;
  const fRows = recs.map(f=>{
    seq++;
    running += (+f.amount||0);
    const noMil   = !f.mileage_before && f.mileage_before!==0;
    const fuelTh  = FUEL_TH[f.fuel_type]||f.fuel_type||'-';
    const stationName = f.gas_station_name || 'ยู่ฮงไฮเวย์พะเยา';
    return [
      dCellC(seq,fuelH[0].w,{size:CS}),
      dCellC(thDateSh(f.date),fuelH[1].w,{size:CS}),
      dCellC(f.time?f.time.slice(0,5):'-',fuelH[2].w,{size:CS}),
      dCellC(f.license_plate||'-',fuelH[3].w,{size:CS}),
      dCellC(f.document_number||f.receipt_number||'-',fuelH[4].w,{size:CS}),
      dCellC(fuelTh,fuelH[5].w,{size:CS}),
      dCellR(nf(+f.liters,2),fuelH[6].w,{size:CS}),
      dCellR(f.price_per_liter?nf(+f.price_per_liter,2):'-',fuelH[7].w,{size:CS}),
      dCellR(bf(f.amount),fuelH[8].w,{size:CS}),
      dCellR(bf(running),fuelH[9].w,{size:CS,bold:true}),
      noMil ? dCellRed('ไม่บันทึก',fuelH[10].w,{size:CS}) : dCellR(nf(f.mileage_before),fuelH[10].w,{size:CS}),
      dCellC(f.fuel_consumption_rate?nf(+f.fuel_consumption_rate,2):'-',fuelH[11].w,{size:CS}),
      dCell(f.driver_name||'-',fuelH[12].w,{size:CS}),
      dCell(stationName,fuelH[13].w,{size:CS}),
      dCell(f.notes||'-',fuelH[14].w,{size:CS}),
    ];
  });
  fRows.push([
    new TableCell({columnSpan:6,borders:BC,shading:HS_SUB,children:[ppc(`รวม ${car.license_plate}  อัตราสิ้นเปลือง: ${avgR?nf(avgR,2):'-'} กม./ลิตร`,{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC,shading:HS_SUB,children:[ppr(nf(carL,2),{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC,shading:HS_SUB,children:[pp('',{sp:spS})]}),
    new TableCell({borders:BC,shading:HS_SUB,children:[ppr(bf(carA),{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC,shading:HS_SUB,children:[ppr(bf(carA),{sp:spS,bold:true,size:CS})]}),
    new TableCell({columnSpan:5,borders:BC,shading:HS_SUB,children:[pp('',{sp:spS})]}),
  ]);
  sec4.push(makeTable(fuelH,fRows));
  sec4.push(sourceNote());
  sec4.push(...el(1));
}

// grand total fuel
sec4.push(new Table({
  width:{size:100,type:WidthType.PERCENTAGE},
  rows:[new TableRow({children:[
    new TableCell({columnSpan:6,borders:BC_THICK,shading:HS_GTOT,children:[ppc(`รวมทั้งสิ้นเดือน${MONTH_LABEL}  (${fuel.length} รายการ)`,{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC_THICK,shading:HS_GTOT,children:[ppr(nf(totalFuelL,2),{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC_THICK,shading:HS_GTOT,children:[pp('',{sp:spS})]}),
    new TableCell({borders:BC_THICK,shading:HS_GTOT,children:[ppr(bf(totalFuelA),{sp:spS,bold:true,size:SB})]}),
    new TableCell({columnSpan:6,borders:BC_THICK,shading:HS_GTOT,children:[pp('',{sp:spS})]}),
  ]})]
}));
sec4.push(pp([
  tr(`ที่มา: ระบบ PPK-DriveHub, ${SCHOOL} ณ วันที่ ${thDate(new Date().toISOString().slice(0,10))}  `,{size:22,color:'555555'}),
  trRed('สีแดง',{size:22}),tr(' = ไม่บันทึกเลขมาตร',{size:22,color:'555555'}),
],{sp:{before:40,after:80,line:280,lineRule:'auto'}}));
sec4.push(...el(1));
sec4.push(...sigBlock4());

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — ทะเบียนควบคุมการจัดซื้อน้ำมัน (แนวนอน Landscape)
// ════════════════════════════════════════════════════════════════════════════
const sec5 = [];

sec5.push(
  ppc('ทะเบียนควบคุมการจัดซื้อน้ำมันเชื้อเพลิง',{sp:spH,size:SH,bold:true}),
  pp([tr('ส่วนราชการ  ',{size:SB,bold:true}),tr(SCHOOL,{size:SB}),tr('    สังกัด  ',{size:SB,bold:true}),tr(ORG,{size:SB})],
    {sp:{before:0,after:10,line:360,lineRule:'auto'}}),
  pp([tr('รายงานขอซื้อที่หัวหน้าหน่วยงานของรัฐให้ความเห็นชอบ  เลขที่  ',{size:SB}),
      tr('……………………………………',{size:SB})],
    {sp:{before:0,after:10,line:360,lineRule:'auto'},align:AlignmentType.RIGHT}),
  pp([tr('วงเงินที่หัวหน้าหน่วยงานของรัฐให้ความเห็นชอบ  ',{size:SB}),
      tr('……………………………  บาท',{size:SB})],
    {sp:{before:0,after:80,line:360,lineRule:'auto'},align:AlignmentType.RIGHT}),
);

const regH = [
  {text:'วัน/เดือน/ปี',w:700,size:CS},
  {text:'*ใบสั่งซื้อ/\nใบเสร็จรับเงิน/\nใบกำกับภาษี',w:1020,size:CS},
  {text:'ประเภทครุภัณฑ์หรือสิ่งของที่จัดซื้อน้ำมัน\nและหมายเลขทะเบียนหรือรหัสครุภัณฑ์',w:2500,size:CS},
  {text:'ผู้จัดซื้อน้ำมัน',w:1060,size:CS},
  {text:'ปริมาณ\n(ลิตร)',w:660,size:CS},
  {text:'วงเงิน\n(บาท)',w:800,size:CS},{text:'วงเงินสะสม\n(บาท)',w:900,size:CS},
  {text:'ลายมือชื่อ\nผู้บันทึกรายการ',w:1080,size:CS},{text:'หมายเหตุ',w:700,size:CS},
];

let regRunning=0;
const regRows = fuel.map((f,i)=>{
  regRunning += (+f.amount||0);
  const vtypeTh  = VEH_TH[f.vehicle_type]||'รถราชการ';
  const assetDesc = `${vtypeTh} ${f.brand||''} ${f.model||''}`.trim()+` ทะเบียน ${f.license_plate||'-'}`;
  return [
    dCellC(thDateSh(f.date),regH[0].w,{size:CS}),
    dCellC(f.document_number||f.receipt_number||'-',regH[1].w,{size:CS}),
    dCell(assetDesc,regH[2].w,{size:CS}),
    dCell(f.driver_name||'-',regH[3].w,{size:CS}),
    dCellR(nf(+f.liters,2),regH[4].w,{size:CS}),
    dCellR(bf(f.amount),regH[5].w,{size:CS}),
    dCellR(bf(regRunning),regH[6].w,{size:CS,bold:true}),
    dCellC('',regH[7].w,{size:CS}),
    dCell(f.notes||'-',regH[8].w,{size:CS}),
  ];
});
regRows.push([
  new TableCell({columnSpan:4,borders:BC_THICK,shading:HS_GTOT,children:[ppc(`รวมทั้งสิ้น ${fuel.length} รายการ`,{sp:spS,bold:true,size:CS})]}),
  new TableCell({borders:BC_THICK,shading:HS_GTOT,children:[ppr(nf(totalFuelL,2),{sp:spS,bold:true,size:CS})]}),
  new TableCell({borders:BC_THICK,shading:HS_GTOT,children:[ppr(bf(totalFuelA),{sp:spS,bold:true,size:CS})]}),
  new TableCell({borders:BC_THICK,shading:HS_GTOT,children:[ppr(bf(regRunning),{sp:spS,bold:true,size:CS})]}),
  new TableCell({columnSpan:2,borders:BC_THICK,shading:HS_GTOT,children:[pp('',{sp:spS})]}),
]);
sec5.push(makeTable(regH,regRows));
sec5.push(sourceNote());
sec5.push(...el(1));
sec5.push(...sigBlock4());

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6 — ซ่อมบำรุง + ลงนาม (แนวตั้ง Portrait)
// ════════════════════════════════════════════════════════════════════════════
const sec6 = [];

sec6.push(
  ppc('รายงานการซ่อมบำรุงยานพาหนะ',{sp:spH,size:SH,bold:true}),
  ppc(`ประจำเดือน${MONTH_LABEL}`,{sp:{before:0,after:80,line:360,lineRule:'auto'},size:SB}),
);

if(repair.length===0){
  sec6.push(pp(`          ในเดือน${MONTH_LABEL} ไม่มีรายการซ่อมบำรุงยานพาหนะ`,
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));
} else {
  sec6.push(pp(`          ในเดือน${MONTH_LABEL} มีรายการซ่อมบำรุงยานพาหนะ ${repair.length} รายการ รวมค่าใช้จ่ายทั้งสิ้น ${bf(totalRepairA)} บาท`,
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}));
  const repH = [
    {text:'ที่',w:380},{text:'ทะเบียน',w:760},{text:'ประเภทงาน',w:1000},
    {text:'อาการ/ปัญหา',w:2500},{text:'อู่/ร้าน',w:1400},
    {text:'วันที่แจ้ง',w:760},{text:'วันที่เสร็จ',w:760},
    {text:'เลขมิล',w:760},{text:'ค่าแรง (บาท)',w:900},{text:'ค่าอะไหล่ (บาท)',w:900},{text:'รวม (บาท)',w:900},
  ];
  const repRows = repair.map((r,i)=>[
    dCellC(i+1,repH[0].w),
    dCellC(r.license_plate||'-',repH[1].w),
    dCellC(SVC_TH[r.service_type]||r.service_type||'-',repH[2].w),
    dCell(r.issue_description||'-',repH[3].w),
    dCell(r.garage_name||'-',repH[4].w),
    dCellC(thDateSh(r.date_reported),repH[5].w),
    dCellC(r.date_completed?thDateSh(r.date_completed):'ยังไม่เสร็จ',repH[6].w,{color:r.date_completed?'000000':'CC0000'}),
    dCellR(r.mileage_at_repair?nf(r.mileage_at_repair):'-',repH[7].w),
    dCellR(r.labour_cost?bf(r.labour_cost):'-',repH[8].w),
    dCellR(r.parts_cost?bf(r.parts_cost):'-',repH[9].w),
    dCellR(r.grand_total?bf(r.grand_total):'-',repH[10].w,{bold:true}),
  ]);
  repRows.push([
    new TableCell({columnSpan:8,borders:BC_THICK,shading:HS_GTOT,children:[ppc('รวมค่าซ่อมบำรุงทั้งสิ้น',{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC_THICK,shading:HS_GTOT,children:[ppr(bf(repair.reduce((s,r)=>s+(+r.labour_cost||0),0)),{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC_THICK,shading:HS_GTOT,children:[ppr(bf(repair.reduce((s,r)=>s+(+r.parts_cost||0),0)),{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC_THICK,shading:HS_GTOT,children:[ppr(bf(totalRepairA),{sp:spS,bold:true,size:SB})]}),
  ]);
  sec6.push(makeTable(repH,repRows));
  sec6.push(sourceNote());
}
sec6.push(...el(2));
sec6.push(...sigBlock4());

// ══ Assemble & Save ══════════════════════════════════════════════════════════
const OUTPUT_FILE = `${OUTPUT_DIR}\\รายงานประจำเดือน-${YM_ARG}.docx`;
try { mkdirSync(OUTPUT_DIR,{recursive:true}); } catch(e) {}

const doc = new Document({
  styles:{default:{document:{run:{font:F,size:SB},paragraph:{spacing:spN}}}},
  sections:[
    { properties:{page:PAGE_P}, children:sec1 },  // Portrait: ปก + สรุป
    { properties:{page:PAGE_L}, children:sec2 },  // Landscape: บันทึกการใช้รถ
    { properties:{page:PAGE_P}, children:sec3 },  // Portrait: พนักงานขับรถ
    { properties:{page:PAGE_L}, children:sec4 },  // Landscape: บัญชีคุมน้ำมัน
    { properties:{page:PAGE_L}, children:sec5 },  // Landscape: ทะเบียนจัดซื้อน้ำมัน
    { properties:{page:PAGE_P}, children:sec6 },  // Portrait: ซ่อมบำรุง
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT_FILE, buffer);
const sizeMB = (buffer.length/1024/1024).toFixed(2);

console.log(`\n✅ สร้างสำเร็จ!`);
console.log(`📁 ${OUTPUT_FILE}  (${sizeMB} MB)`);
console.log(`\n📋 สรุปเดือน${MONTH_LABEL}:`);
console.log(`   - ใช้รถ: ${nf(queue.length)} เที่ยว | ผู้โดยสาร: ${nf(totalPax)} คน-ครั้ง`);
console.log(`   - น้ำมัน: ${fuel.length} รายการ | ${nf(totalFuelL,2)} ลิตร | ${bf(totalFuelA)} บาท`);
console.log(`   - ซ่อมบำรุง: ${repair.length} รายการ${repair.length?` | ${bf(totalRepairA)} บาท`:''}`);
console.log(`   - พนักงานขับรถปฏิบัติงาน: ${Object.keys(qByDriver).length} คน`);
