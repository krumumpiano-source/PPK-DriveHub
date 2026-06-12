#!/usr/bin/env node
// scripts/generate-fuel-ledger.mjs
// บัญชีคุมน้ำมันเชื้อเพลิง ปีงบประมาณ พ.ศ. ๒๕๖๘
// โรงเรียนพะเยาพิทยาคม  สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพะเยา
// ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยรถราชการ พ.ศ. ๒๕๒๓ และที่แก้ไขเพิ่มเติม

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, PageBreak, UnderlineType
} from 'docx';

// ─── Config ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR  = 'D:\\รายงานยานพาหนะ 2568';
const OUTPUT_FILE = `${OUTPUT_DIR}\\บัญชีคุมน้ำมัน-ปีงบ2568-v2.docx`;
const DB          = 'ppk-drivehub-db';
const FY_START    = '2024-10-01';
const FY_END      = '2025-09-30';
const FY_MONTHS   = [
  '2024-10','2024-11','2024-12',
  '2025-01','2025-02','2025-03','2025-04','2025-05','2025-06',
  '2025-07','2025-08','2025-09'
];

// ─── Persons ──────────────────────────────────────────────────────────────────
const P = {
  author:     { name: 'นายพงศธร โพธิแก้ว',               pos: 'รองหัวหน้างานยานพาหนะ' },
  purchasing: { name: 'นายสงกรานต์ แก้วสา',               pos: 'หัวหน้างานพัสดุ' },
  chief:      { name: 'นางจีรพา กันทา',                   pos: 'หัวหน้างานยานพาหนะ' },
  deputy:     { name: 'นายยศ กันทายวง',                   pos: 'รองผู้อำนวยการกลุ่มบริหารงานบุคคล' },
  director:   { name: 'ว่าที่ร้อยตรีญาณบดินทร์ อินเตชะ',  pos: 'ผู้อำนวยการโรงเรียนพะเยาพิทยาคม' },
};
const SCHOOL = 'โรงเรียนพะเยาพิทยาคม';
const ZONE   = 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพะเยา';

// ─── Lookup ───────────────────────────────────────────────────────────────────
const FUEL_TYPE_TH = {
  gasohol91:'แก๊สโซฮอล์ 91', gasohol95:'แก๊สโซฮอล์ 95',
  diesel:'ดีเซล B7', e20:'E20', fuelSave:'FuelSave', other:'อื่นๆ'
};
const VEH_TYPE_TH = {
  van:'รถตู้', sedan:'รถยนต์นั่ง', pickup:'รถกระบะ',
  bus:'รถโดยสาร', motorcycle:'รถจักรยานยนต์'
};

// ─── Thai date helpers ────────────────────────────────────────────────────────
const TH_MONTHS    = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MONTHS_SH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function toDate(s) {
  if (!s) return null;
  const str = String(s).replace(' ','T');
  const d = new Date(str.length===10 ? str+'T00:00:00' : str);
  return isNaN(d.getTime()) ? null : d;
}
function thDate(s)    { const d=toDate(s); if(!d)return'-'; return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()+543}`; }
function thDateSh(s)  { const d=toDate(s); if(!d)return'-'; return `${String(d.getDate()).padStart(2,'0')} ${TH_MONTHS_SH[d.getMonth()]} ${String(d.getFullYear()+543).slice(-2)}`; }
function thMonthYear(ym) { const[y,m]=ym.split('-'); return `${TH_MONTHS[+m-1]} ${+y+543}`; }
function getYM(s)     { return s ? String(s).slice(0,7) : null; }
function nf(n,dec=0)  { if(n==null||n===''||isNaN(+n))return'-'; return (+n).toLocaleString('th-TH',{minimumFractionDigits:dec,maximumFractionDigits:dec}); }
function bf(n)        { return nf(n,2); }

// ─── DB query ─────────────────────────────────────────────────────────────────
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

// ─── Docx style constants ─────────────────────────────────────────────────────
const F   = 'TH Sarabun New';
const SB  = 32;  // 16pt body
const SH  = 36;  // 18pt heading
const ST  = 48;  // 24pt title
const SC  = 60;  // 30pt cover
const SS  = 28;  // 14pt sub
const CS  = 22;  // 11pt cell

const BC = {
  top:    {style:BorderStyle.SINGLE,size:6,color:'000000'},
  bottom: {style:BorderStyle.SINGLE,size:6,color:'000000'},
  left:   {style:BorderStyle.SINGLE,size:6,color:'000000'},
  right:  {style:BorderStyle.SINGLE,size:6,color:'000000'},
};
const BC_THICK = {
  top:    {style:BorderStyle.SINGLE,size:16,color:'000000'},
  bottom: {style:BorderStyle.SINGLE,size:16,color:'000000'},
  left:   {style:BorderStyle.SINGLE,size:16,color:'000000'},
  right:  {style:BorderStyle.SINGLE,size:16,color:'000000'},
};
const BC_NONE = {
  top:    {style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},
  left:   {style:BorderStyle.NONE},right: {style:BorderStyle.NONE},
};
const HS_HDR  = {type:ShadingType.CLEAR, fill:'1F3864'};  // dark navy header
const HS_MON  = {type:ShadingType.CLEAR, fill:'2F5496'};  // medium blue month bar
const HS_SUB  = {type:ShadingType.CLEAR, fill:'D9E1F2'};  // light blue subtotal
const HS_GTOT = {type:ShadingType.CLEAR, fill:'BDD7EE'};  // medium blue grand total
const HS_INFO = {type:ShadingType.CLEAR, fill:'F2F2F2'};  // light grey info label

const spN = {before:0,  after:0,  line:360,lineRule:'auto'};
const spS = {before:40, after:40, line:280,lineRule:'auto'};
const spH = {before:200,after:100,line:360,lineRule:'auto'};
const spC = {before:120,after:120,line:400,lineRule:'auto'};

// ─── Text/Para helpers ────────────────────────────────────────────────────────
function tr(text,opts={}) {
  return new TextRun({text:String(text??''),font:F,size:opts.size||SB,bold:!!opts.bold,
    underline:opts.underline?{type:UnderlineType.SINGLE}:undefined,color:opts.color||'000000'});
}
function trRed(text,opts={}) {
  return new TextRun({text:String(text??''),font:F,size:opts.size||SB,bold:true,color:'CC0000'});
}
function pp(children,opts={}) {
  const kids = typeof children==='string'
    ? [tr(children,{size:opts.size||SB,bold:opts.bold,color:opts.color})]
    : (Array.isArray(children)?children:[children]);
  return new Paragraph({alignment:opts.align||AlignmentType.LEFT,spacing:opts.sp||spN,indent:opts.indent||{},children:kids});
}
function ppc(t,o={}) { return pp(t,{...o,align:AlignmentType.CENTER}); }
function ppr(t,o={}) { return pp(t,{...o,align:AlignmentType.RIGHT}); }
function el(n=1) { return Array.from({length:n},()=>pp('',{sp:{...spN,line:280}})); }
function pb()    { return new Paragraph({children:[new PageBreak()],spacing:{before:0,after:0}}); }

// ─── Table cell helpers ───────────────────────────────────────────────────────
function hCell(text,w,opts={}) {
  return new TableCell({
    width:w?{size:w,type:WidthType.DXA}:undefined,borders:BC,shading:HS_HDR,verticalAlign:'center',
    children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:spS,
      children:[tr(text,{size:opts.size||CS,bold:true,color:'FFFFFF'})]})]
  });
}
function dCell(text,w,opts={}) {
  const child = opts.red
    ? trRed(String(text??'-'),{size:opts.size||CS})
    : tr(String(text??'-'),{size:opts.size||CS,bold:opts.bold,color:opts.color});
  return new TableCell({
    width:w?{size:w,type:WidthType.DXA}:undefined,borders:opts.borders||BC,
    verticalAlign:'center',columnSpan:opts.span,shading:opts.shade,
    children:[new Paragraph({alignment:opts.align||AlignmentType.LEFT,spacing:spS,children:[child]})]
  });
}
function dCellC(t,w,o={}) { return dCell(t,w,{...o,align:AlignmentType.CENTER}); }
function dCellR(t,w,o={}) { return dCell(t,w,{...o,align:AlignmentType.RIGHT}); }
function dCellRed(t,w,o={}) { return dCell(t,w,{...o,red:true,align:AlignmentType.CENTER}); }

// Span cell for subtotal/total rows
function spanCell(text,cols,shade,bold=true,align=AlignmentType.CENTER) {
  return new TableCell({
    columnSpan:cols,borders:BC,shading:shade,verticalAlign:'center',
    children:[new Paragraph({alignment:align,spacing:spS,
      children:[tr(text,{size:CS,bold})]})]
  });
}
function spanCellR(text,cols,shade) {
  return new TableCell({
    columnSpan:cols,borders:BC,shading:shade,verticalAlign:'center',
    children:[new Paragraph({alignment:AlignmentType.RIGHT,spacing:spS,
      children:[tr(text,{size:CS,bold:true})]})]
  });
}

// ─── Ledger table headers (13 cols) ───────────────────────────────────────────
// A4 Landscape usable: 16838 - 2*1440 = 13958 DXA
const LCOLS = [
  {text:'ที่',           w:380},
  {text:'วัน/เดือน/ปี', w:780},
  {text:'เลขที่ใบเสร็จ',w:1080},
  {text:'สถานีบริการน้ำมัน', w:1960},
  {text:'ชนิดน้ำมัน',   w:920},
  {text:'ปริมาณ\n(ลิตร)',w:720},
  {text:'ราคา/ลิตร\n(บาท)',w:720},
  {text:'จำนวนเงิน\n(บาท)',w:920},
  {text:'เลขมาตร\n(กม.)',w:840},
  {text:'อัตราสิ้น\nเปลือง\n(กม./ลิตร)',w:760},
  {text:'ผู้รับน้ำมัน\n/ ผู้เบิก',w:1300},
  {text:'ผู้อนุมัติ\n/ ผู้ตรวจ', w:1300},
  {text:'หมายเหตุ',     w:578},
];
// Total = 380+780+1080+1960+920+720+720+920+840+760+1300+1300+578 = 12258 DXA

// ─── Load data from D1 ────────────────────────────────────────────────────────
console.log('\n📊 กำลังดึงข้อมูลจาก Cloudflare D1...\n');

const cars = qDB(`SELECT id,license_plate,brand,model,year,color,fuel_type,seat_count,vehicle_type,current_mileage FROM cars ORDER BY vehicle_type,license_plate`);
console.log(`  ✓ รถราชการ: ${cars.length} คัน`);

const fuel = qDB(`SELECT f.id,f.date,f.time,f.car_id,c.license_plate,c.brand,c.model,c.vehicle_type,c.color,c.fuel_type AS car_fuel_type,COALESCE(d.first_name||' '||d.last_name,f.driver_name_manual,'-') AS driver_name,f.liters,f.price_per_liter,f.amount,f.fuel_type,f.gas_station_name,f.mileage_before,f.mileage_after,f.fuel_consumption_rate,f.document_number,f.receipt_number,f.anomaly_flag,f.notes,f.signed_supply_chief,f.expense_type FROM fuel_log f LEFT JOIN cars c ON c.id=f.car_id LEFT JOIN drivers d ON d.id=f.driver_id WHERE f.date>='${FY_START}' AND f.date<='${FY_END}' AND f.deleted_at IS NULL ORDER BY f.car_id,f.date,f.time`);
console.log(`  ✓ บันทึกน้ำมัน: ${fuel.length} รายการ`);

// Group by car plate
const fuelByCar = {};
let grandTotalLiters = 0, grandTotalAmount = 0, grandTotalCount = 0;
for (const f of fuel) {
  const plate = f.license_plate || String(f.car_id);
  if (!fuelByCar[plate]) fuelByCar[plate] = [];
  fuelByCar[plate].push(f);
  grandTotalLiters += (+f.liters||0);
  grandTotalAmount += (+f.amount||0);
  grandTotalCount++;
}

console.log(`\n🏗️  กำลังสร้างเอกสาร...\n`);

// ══════════════════════════════════════════════════════════════════════════════
// COVER PAGE  (Portrait A4)
// ══════════════════════════════════════════════════════════════════════════════
function buildCover() {
  return [
    ...el(3),
    ppc('❧', {sp:spC, size:56}),
    ...el(1),
    ppc('บัญชีคุมน้ำมันเชื้อเพลิง', {sp:spC, size:SC, bold:true}),
    ppc('งานยานพาหนะ', {sp:{...spC,before:40}, size:ST, bold:true}),
    ...el(1),
    ppc('─────────────────────────────', {sp:{before:0,after:0,line:280}, size:28}),
    ...el(1),
    ppc(SCHOOL, {sp:spC, size:44, bold:true}),
    ppc(ZONE, {sp:{...spC,before:60}, size:32}),
    ppc('กระทรวงศึกษาธิการ', {sp:{...spC,before:40}, size:32}),
    ...el(1),
    ppc('ปีงบประมาณ พ.ศ. ๒๕๖๘', {sp:spC, size:ST, bold:true}),
    ppc('(๑ ตุลาคม ๒๕๖๗ – ๓๐ กันยายน ๒๕๖๘)', {sp:{...spC,before:60}, size:SB}),
    ...el(2),
    ppc('─────────────────────────────', {sp:{before:0,after:0,line:280}, size:28}),
    ...el(1),
    ppc('จัดทำโดย', {sp:spC, size:SB}),
    ppc(P.author.name,   {sp:{...spC,before:60}, size:36, bold:true}),
    ppc(P.author.pos,    {sp:{...spC,before:40}, size:SB}),
    ppc(SCHOOL,          {sp:{...spC,before:40}, size:SB}),
    pb(),
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// PER-VEHICLE LEDGER  (Landscape A4)
// ══════════════════════════════════════════════════════════════════════════════
function buildVehicleLedger(car, fuelRecs) {
  const nodes = [];
  const plate      = car.license_plate;
  const brandModel = `${car.brand||''} ${car.model||''}`.trim() || '-';
  const vtype      = VEH_TYPE_TH[car.vehicle_type] || car.vehicle_type || '-';
  const color      = car.color || '-';
  const fuelDef    = FUEL_TYPE_TH[car.fuel_type] || car.fuel_type || '-';
  const yearTH     = car.year ? String(+car.year+543) : '-';
  const yearCE     = car.year ? String(car.year) : '-';

  // ── Header: form title ────────────────────────────────────────────────────
  nodes.push(ppc('บัญชีคุมน้ำมันเชื้อเพลิง',
    {sp:{before:0,after:40,line:360,lineRule:'auto'}, size:ST, bold:true}));
  nodes.push(ppc(`ปีงบประมาณ พ.ศ. ๒๕๖๘  (๑ ตุลาคม ๒๕๖๗ – ๓๐ กันยายน ๒๕๖๘)`,
    {sp:{before:0,after:60,line:360,lineRule:'auto'}, size:SB}));

  // ── Info box (4-column key-value) ─────────────────────────────────────────
  const infoData = [
    ['ส่วนราชการ',    SCHOOL,       'สังกัด',         ZONE],
    ['ทะเบียนรถ',    plate,        'ยี่ห้อ/รุ่น',    brandModel],
    ['ประเภทรถ',     vtype,        'สี',              color],
    ['ปีที่ผลิต (CE/BE)', `${yearCE} / ${yearTH}`, 'ชนิดน้ำมันที่ใช้', fuelDef],
    ['จำนวนรายการน้ำมัน (ปีงบ)', `${fuelRecs.length} รายการ`,
     'รวมค่าน้ำมัน (บาท)', bf(fuelRecs.reduce((s,f)=>s+(+f.amount||0),0))],
  ];
  const _infoRates = fuelRecs.filter(f=>f.fuel_consumption_rate).map(f=>+f.fuel_consumption_rate);
  const _avgKml    = _infoRates.length ? _infoRates.reduce((a,b)=>a+b,0)/_infoRates.length : null;
  infoData.push([
    'อัตราสิ้นเปลืองเฉลี่ย (กม./ลิตร)', _avgKml ? nf(_avgKml,2) : '-',
    'จำนวนครั้งที่มีค่าอัตราสิ้นเปลือง', `${_infoRates.length} / ${fuelRecs.length} รายการ`,
  ]);
  const wL = 1400, wV = 4200;  // label / value (×2 pairs = 11200 DXA, fits in landscape)
  const infoRows = infoData.map(([k1,v1,k2,v2]) => new TableRow({children:[
    new TableCell({width:{size:wL,type:WidthType.DXA},borders:BC,shading:HS_INFO,verticalAlign:'center',
      children:[pp(k1,{sp:spS,bold:true,size:SS,align:AlignmentType.RIGHT})]}),
    new TableCell({width:{size:wV,type:WidthType.DXA},borders:BC,verticalAlign:'center',
      children:[pp(v1,{sp:spS,size:SS})]}),
    new TableCell({width:{size:wL,type:WidthType.DXA},borders:BC,shading:HS_INFO,verticalAlign:'center',
      children:[pp(k2,{sp:spS,bold:true,size:SS,align:AlignmentType.RIGHT})]}),
    new TableCell({width:{size:wV,type:WidthType.DXA},borders:BC,verticalAlign:'center',
      children:[pp(v2,{sp:spS,size:SS})]}),
  ]}));
  nodes.push(new Table({
    width:{size:12200,type:WidthType.DXA},
    rows:infoRows,
  }));
  nodes.push(...el(1));

  // ── Ledger table ─────────────────────────────────────────────────────────
  const tableRows = [];
  let seq = 0;
  let carTotalLiters = 0, carTotalAmount = 0;

  // Group by month
  const byMonth = {};
  for (const f of fuelRecs) {
    const ym = getYM(f.date)||'unknown';
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(f);
  }

  for (const ym of FY_MONTHS) {
    const mRecs = byMonth[ym];
    if (!mRecs || mRecs.length === 0) continue;

    // Month separator row (dark navy, full-width span)
    tableRows.push(new TableRow({children:[
      new TableCell({
        columnSpan:13, borders:BC, shading:HS_MON,
        children:[ppc(`เดือน${thMonthYear(ym)}  (${mRecs.length} รายการ)`,
          {sp:spS, size:CS, bold:true, color:'FFFFFF'})]
      })
    ]}));

    let mLiters = 0, mAmount = 0;
    for (const f of mRecs) {
      seq++;
      const liters  = +f.liters || 0;
      const amount  = +f.amount || 0;
      mLiters += liters; mAmount += amount;
      carTotalLiters += liters; carTotalAmount += amount;

      const noMileage = !f.mileage_before && f.mileage_before !== 0;
      const fuelTh    = FUEL_TYPE_TH[f.fuel_type] || f.fuel_type || '-';
      const anomaly   = f.anomaly_flag==1 || f.anomaly_flag==='1';
      const docno     = f.document_number || f.receipt_number || '-';
      const approver  = f.signed_supply_chief || P.chief.name;
      const stationName = f.gas_station_name || 'ยู่ฮงไฮเวย์พะเยา';
      const note      = [anomaly ? '⚠️ ระวังตรวจสอบ' : '', f.notes || ''].filter(Boolean).join(' ') || '-';
      const kml       = f.fuel_consumption_rate ? nf(+f.fuel_consumption_rate, 2) : '-';

      tableRows.push(new TableRow({children:[
        dCellC(seq,                               LCOLS[0].w),
        dCellC(thDateSh(f.date),                  LCOLS[1].w),
        dCellC(docno,                             LCOLS[2].w),
        dCell(stationName,                        LCOLS[3].w),
        dCellC(fuelTh,                            LCOLS[4].w),
        dCellR(nf(liters,2),                      LCOLS[5].w),
        dCellR(f.price_per_liter ? nf(+f.price_per_liter,2) : '-', LCOLS[6].w),
        dCellR(bf(amount),                        LCOLS[7].w, {bold: amount >= 3000}),
        noMileage
          ? dCellRed('ไม่บันทึก',               LCOLS[8].w)
          : dCellR(nf(f.mileage_before),          LCOLS[8].w),
        dCellC(kml,                               LCOLS[9].w),
        dCell(f.driver_name||'-',                 LCOLS[10].w),
        dCell(approver,                           LCOLS[11].w),
        dCell(note,                               LCOLS[12].w),
      ]}));
    }

    // Monthly subtotal row (13 cols: 5 + 1 + 1 + 1 + 5 = 13)
    tableRows.push(new TableRow({children:[
      spanCell(`รวมเดือน${thMonthYear(ym)}`, 5, HS_SUB),
      new TableCell({borders:BC,shading:HS_SUB,
        children:[ppr(nf(mLiters,2),{sp:spS,bold:true,size:CS})]}),
      new TableCell({borders:BC,shading:HS_SUB,
        children:[pp('',{sp:spS})]}),
      new TableCell({borders:BC,shading:HS_SUB,
        children:[ppr(bf(mAmount),{sp:spS,bold:true,size:CS})]}),
      spanCell('', 5, HS_SUB, false),
    ]}));
  }

  // Grand total row (13 cols: 5 + 1 + 1 + 1 + 3 + 2 = 13)
  const ratesArr = fuelRecs.filter(f=>f.fuel_consumption_rate).map(f=>+f.fuel_consumption_rate);
  const avgKml   = ratesArr.length ? ratesArr.reduce((a,b)=>a+b,0)/ratesArr.length : null;

  tableRows.push(new TableRow({children:[
    new TableCell({
      columnSpan:5, borders:BC_THICK, shading:HS_GTOT,
      children:[ppc(`รวมทั้งสิ้น ปีงบประมาณ พ.ศ. ๒๕๖๘`,{sp:spS,bold:true,size:CS})]
    }),
    new TableCell({borders:BC_THICK,shading:HS_GTOT,
      children:[ppr(nf(carTotalLiters,2),{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC_THICK,shading:HS_GTOT,
      children:[pp('',{sp:spS})]}),
    new TableCell({borders:BC_THICK,shading:HS_GTOT,
      children:[ppr(bf(carTotalAmount),{sp:spS,bold:true,size:CS})]}),
    new TableCell({
      columnSpan:3, borders:BC_THICK, shading:HS_GTOT,
      children:[ppc(`อัตราสิ้นเปลืองเฉลี่ย: ${avgKml ? nf(avgKml,2) : '-'} กม./ลิตร`,{sp:spS,bold:true,size:CS})]
    }),
    new TableCell({
      columnSpan:2, borders:BC_THICK, shading:HS_GTOT,
      children:[ppc(`รวม ${fuelRecs.length} รายการ`,{sp:spS,bold:true,size:CS})]
    }),
  ]}));

  nodes.push(new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    rows:[
      new TableRow({tableHeader:true, children:LCOLS.map(h=>hCell(h.text,h.w))}),
      ...tableRows,
    ]
  }));

  // Source / remark
  const now = thDate(new Date().toISOString().slice(0,10));
  nodes.push(pp([
    tr(`ที่มา: ระบบบริหารงานยานพาหนะ PPK-DriveHub, ${SCHOOL} ณ วันที่ ${now}  `,{size:22,color:'555555'}),
    trRed('ข้อความสีแดง',{size:22}),
    tr(' = ไม่มีการบันทึกเลขมาตรวัดระยะทาง ณ เวลาเติมน้ำมัน',{size:22,color:'555555'}),
  ],{sp:{before:40,after:80,line:280,lineRule:'auto'}}));

  nodes.push(...el(1));

  // ── Certification & Signature ─────────────────────────────────────────────
  nodes.push(ppc(
    [tr('ขอรับรองว่าบัญชีคุมน้ำมันเชื้อเพลิง รถทะเบียน ',{size:SB,bold:true}),
     tr(plate,{size:SB,bold:true,underline:true}),
     tr('  ปีงบประมาณ พ.ศ. ๒๕๖๘  มีรายละเอียดครบถ้วน ถูกต้องตามความเป็นจริงทุกประการ',{size:SB,bold:true})],
    {sp:{before:80,after:40,line:360,lineRule:'auto'}}
  ));
  nodes.push(...el(1));

  const sigV = (role,name,pos) => [
    ppc('ลงชื่อ .............................................',{sp:{before:100,after:0,line:360,lineRule:'auto'},size:SB}),
    ppc(`(${name})`,{sp:{before:20,after:0,line:360,lineRule:'auto'},size:SB}),
    ppc(role,{sp:{before:10,after:0,line:360,lineRule:'auto'},size:SB,bold:true}),
    ppc(pos, {sp:{before:10,after:0,line:360,lineRule:'auto'},size:SB}),
    ppc('วันที่ ......... เดือน ....................... พ.ศ. ..........',{sp:{before:40,after:80,line:360,lineRule:'auto'},size:SB}),
  ];

  nodes.push(
    pp([tr('ขอรับรองว่าข้อมูลในบัญชีคุมน้ำมันได้มาจากระบบ PPK-DriveHub ซึ่งบันทึกโดยพนักงานขับรถ ผู้จัดทำรายงานเป็นเพียงผู้รวบรวมและสรุปข้อมูลเท่านั้น',{size:SB,color:'555555'})],
      {sp:{before:80,after:40,line:360,lineRule:'auto'},align:AlignmentType.CENTER}),
  );
  nodes.push(...sigV('ผู้จัดทำรายงาน',             P.author.name,     P.author.pos));
  nodes.push(...sigV('ผู้ตรวจสอบใบเสร็จรับเงิน', P.purchasing.name, P.purchasing.pos));
  nodes.push(...sigV('หัวหน้างานยานพาหนะ',        P.chief.name,      P.chief.pos));
  nodes.push(...sigV('ผู้อนุมัติ',               P.director.name,   P.director.pos));

  nodes.push(pb());
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY PAGE  (Landscape A4)
// ══════════════════════════════════════════════════════════════════════════════
function buildSummary() {
  const nodes = [];

  nodes.push(ppc('สรุปการเบิกจ่ายน้ำมันเชื้อเพลิง',
    {sp:{before:0,after:40,line:360,lineRule:'auto'}, size:SH, bold:true}));
  nodes.push(ppc('ปีงบประมาณ พ.ศ. ๒๕๖๘  (๑ ตุลาคม ๒๕๖๗ – ๓๐ กันยายน ๒๕๖๘)',
    {sp:{before:0,after:20,line:360,lineRule:'auto'}, size:SB}));
  nodes.push(ppc(SCHOOL,
    {sp:{before:0,after:100,line:360,lineRule:'auto'}, size:SB, bold:true}));

  // ─ Table 1: By vehicle ────────────────────────────────────────────────────
  nodes.push(pp('ตารางที่ ๑  สรุปการเบิกจ่ายน้ำมันเชื้อเพลิงรายคัน',
    {sp:{before:80,after:60,line:360,lineRule:'auto'}, size:SB, bold:true}));

  const sumH = [
    {text:'ลำดับ',                  w:380},
    {text:'ทะเบียนรถ',             w:760},
    {text:'ยี่ห้อ/รุ่น',           w:1400},
    {text:'ประเภท',                 w:900},
    {text:'ชนิดน้ำมัน\nที่ใช้',   w:920},
    {text:'จำนวน\nครั้ง',          w:600},
    {text:'ปริมาณรวม\n(ลิตร)',     w:880},
    {text:'จำนวนเงินรวม\n(บาท)',   w:1000},
    {text:'อัตราเฉลี่ย\n(กม./ลิตร)',w:900},
    {text:'เลขมาตร\nปัจจุบัน',    w:860},
    {text:'หมายเหตุ',               w:658},
  ];  // Total ~9258 DXA (fits landscape usable 13958)

  let sumL=0, sumA=0, sumC=0;
  const sumRows = cars.map((c,i) => {
    const recs  = fuelByCar[c.license_plate] || [];
    const totL  = recs.reduce((s,f)=>s+(+f.liters||0),0);
    const totA  = recs.reduce((s,f)=>s+(+f.amount||0),0);
    const rates = recs.filter(f=>f.fuel_consumption_rate).map(f=>+f.fuel_consumption_rate);
    const avgR  = rates.length ? rates.reduce((a,b)=>a+b,0)/rates.length : null;
    sumL+=totL; sumA+=totA; sumC+=recs.length;
    const noData = recs.length===0;
    return [
      dCellC(i+1,              sumH[0].w),
      dCellC(c.license_plate,  sumH[1].w, {bold:!noData}),
      dCell(`${c.brand||''} ${c.model||''}`.trim()||'-', sumH[2].w),
      dCellC(VEH_TYPE_TH[c.vehicle_type]||'-', sumH[3].w),
      dCellC(FUEL_TYPE_TH[c.fuel_type]||'-',   sumH[4].w),
      dCellR(nf(recs.length),  sumH[5].w, {bold:!noData}),
      dCellR(totL>0?nf(totL,2):'-', sumH[6].w, {bold:totL>0}),
      dCellR(totA>0?bf(totA):'-',   sumH[7].w, {bold:totA>0}),
      dCellC(avgR?nf(avgR,2):(noData?'ไม่มีข้อมูล':'-'), sumH[8].w),
      dCellR(c.current_mileage?nf(c.current_mileage):'-', sumH[9].w),
      dCell(noData?'ไม่มีการเบิกจ่าย':'-', sumH[10].w),
    ];
  });
  // Total row (11 cols: 5+1+1+1+3=11)
  sumRows.push([
    spanCell('รวมทั้งหมด', 5, HS_GTOT),
    new TableCell({borders:BC,shading:HS_GTOT,children:[ppr(nf(sumC),{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC,shading:HS_GTOT,children:[ppr(nf(sumL,2),{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC,shading:HS_GTOT,children:[ppr(bf(sumA),{sp:spS,bold:true,size:SB})]}),
    spanCell('-', 3, HS_GTOT, false),
  ]);

  nodes.push(new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    rows:[
      new TableRow({tableHeader:true, children:sumH.map(h=>hCell(h.text,h.w,{size:SB}))}),
      ...sumRows.map(r=>new TableRow({children:r})),
    ]
  }));
  nodes.push(pp([
    tr(`ที่มา: ระบบ PPK-DriveHub, ${SCHOOL} ณ วันที่ ${thDate(new Date().toISOString().slice(0,10))}`,
      {size:22,color:'555555'})
  ],{sp:{before:40,after:100,line:280,lineRule:'auto'}}));

  // ─ Table 2: By month ──────────────────────────────────────────────────────
  nodes.push(pp('ตารางที่ ๒  สรุปการเบิกจ่ายน้ำมันเชื้อเพลิงรายเดือน',
    {sp:{before:80,after:60,line:360,lineRule:'auto'}, size:SB, bold:true}));

  const monH = [
    {text:'ลำดับ',                   w:500},
    {text:'เดือน',                   w:1600},
    {text:'จำนวนครั้ง',             w:800},
    {text:'ปริมาณน้ำมัน\n(ลิตร)',   w:1000},
    {text:'จำนวนเงิน\n(บาท)',       w:1100},
    {text:'ราคาเฉลี่ย\n(บาท/ลิตร)',w:1000},
    {text:'จำนวนคัน\nที่เติม',       w:800},
    {text:'หมายเหตุ',                w:900},
  ];
  let monSumL=0, monSumA=0, monSumC=0;
  const monRows = FY_MONTHS.map((ym,i) => {
    const mRecs = fuel.filter(f=>getYM(f.date)===ym);
    const mL    = mRecs.reduce((s,f)=>s+(+f.liters||0),0);
    const mA    = mRecs.reduce((s,f)=>s+(+f.amount||0),0);
    const mCars = new Set(mRecs.map(f=>f.license_plate)).size;
    const avgPL = mL>0 ? mA/mL : null;
    monSumL+=mL; monSumA+=mA; monSumC+=mRecs.length;
    return [
      dCellC(i+1, monH[0].w),
      dCell(thMonthYear(ym), monH[1].w),
      dCellR(nf(mRecs.length)||'0', monH[2].w),
      dCellR(mL>0?nf(mL,2):'-',     monH[3].w),
      dCellR(mA>0?bf(mA):'-',       monH[4].w),
      dCellC(avgPL?nf(avgPL,2):'-', monH[5].w),
      dCellC(mCars>0?nf(mCars):'-', monH[6].w),
      dCell(mRecs.length===0?'ไม่มีข้อมูล':'-', monH[7].w),
    ];
  });
  // Total row (8 cols: 2+1+1+1+1+1+1=8)
  monRows.push([
    spanCell('รวมทั้งปีงบประมาณ', 2, HS_GTOT),
    new TableCell({borders:BC,shading:HS_GTOT,children:[ppr(nf(monSumC),{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC,shading:HS_GTOT,children:[ppr(nf(monSumL,2),{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC,shading:HS_GTOT,children:[ppr(bf(monSumA),{sp:spS,bold:true,size:SB})]}),
    new TableCell({borders:BC,shading:HS_GTOT,children:[ppc(monSumL>0?nf(monSumA/monSumL,2):'-',{sp:spS,size:SB,bold:true})]}),
    spanCell('-', 2, HS_GTOT, false),
  ]);

  nodes.push(new Table({
    width:{size:70,type:WidthType.PERCENTAGE},
    rows:[
      new TableRow({tableHeader:true, children:monH.map(h=>hCell(h.text,h.w,{size:SB}))}),
      ...monRows.map(r=>new TableRow({children:r})),
    ]
  }));
  nodes.push(pp([
    tr(`ที่มา: ระบบ PPK-DriveHub, ${SCHOOL} ณ วันที่ ${thDate(new Date().toISOString().slice(0,10))}`,
      {size:22,color:'555555'})
  ],{sp:{before:40,after:100,line:280,lineRule:'auto'}}));

  nodes.push(...el(2));

  // ─ Final Signature (4 ระดับ) ───────────────────────────────────────────────
  const sigV2 = (role,name,pos) => [
    ppc('ลงชื่อ .............................................',{sp:{before:100,after:0,line:360,lineRule:'auto'},size:SB}),
    ppc(`(${name})`,{sp:{before:20,after:0,line:360,lineRule:'auto'},size:SB}),
    ppc(role,{sp:{before:10,after:0,line:360,lineRule:'auto'},size:SB,bold:true}),
    ppc(pos, {sp:{before:10,after:0,line:360,lineRule:'auto'},size:SB}),
    ppc('วันที่ ......... เดือน ....................... พ.ศ. ..........',{sp:{before:40,after:80,line:360,lineRule:'auto'},size:SB}),
  ];
  nodes.push(
    pp([tr('ขอรับรองว่าข้อมูลในบัญชีคุมน้ำมันได้มาจากระบบ PPK-DriveHub ซึ่งบันทึกโดยพนักงานขับรถ ผู้จัดทำรายงานเป็นเพียงผู้รวบรวมและสรุปข้อมูลเท่านั้น',{size:SB,color:'555555'})],
      {sp:{before:80,after:40,line:360,lineRule:'auto'},align:AlignmentType.CENTER}),
  );
  nodes.push(...sigV2('ผู้จัดทำรายงาน',             P.author.name,     P.author.pos));
  nodes.push(...sigV2('ผู้ตรวจสอบใบเสร็จรับเงิน', P.purchasing.name, P.purchasing.pos));
  nodes.push(...sigV2('หัวหน้างานยานพาหนะ',        P.chief.name,      P.chief.pos));
  nodes.push(...sigV2('ผู้อนุมัติ',               P.director.name,   P.director.pos));

  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT  (2 sections: portrait cover + landscape content)
// ══════════════════════════════════════════════════════════════════════════════
console.log('  📄 ปกหน้า (Portrait)...');
const coverNodes = buildCover();

console.log('  📄 บัญชีรายคัน (Landscape)...');
const ledgerNodes = [];
let carCount = 0;
for (const car of cars) {
  const recs = fuelByCar[car.license_plate];
  if (!recs || recs.length === 0) {
    console.log(`    ⚪ ${car.license_plate} — ไม่มีข้อมูลน้ำมัน`);
    continue;
  }
  carCount++;
  console.log(`    ✓ ${car.license_plate} — ${recs.length} รายการ`);
  ledgerNodes.push(...buildVehicleLedger(car, recs));
}

console.log('  📄 สรุปรวม (Landscape)...');
const summaryNodes = buildSummary();

const doc = new Document({
  styles: { default: { document: { run:{font:F,size:SB}, paragraph:{spacing:spN} } } },
  sections: [
    // Section 1: Cover (Portrait A4)
    {
      properties: {
        page: {
          size:   { width:11906, height:16838 },
          margin: { top:1440, bottom:1440, left:1701, right:1440 },
        },
      },
      children: coverNodes,
    },
    // Section 2: Ledger + Summary (Landscape A4)
    {
      properties: {
        page: {
          size:   { width:16838, height:11906 },
          margin: { top:1134, bottom:1134, left:1440, right:1440 },
        },
      },
      children: [...ledgerNodes, ...summaryNodes],
    },
  ],
});

try { mkdirSync(OUTPUT_DIR, { recursive: true }); } catch(e) {}
const buffer  = await Packer.toBuffer(doc);
writeFileSync(OUTPUT_FILE, buffer);
const sizeMB  = (buffer.length/1024/1024).toFixed(2);

console.log(`\n✅ สร้างเอกสารสำเร็จ!`);
console.log(`📁 ${OUTPUT_FILE}  (${sizeMB} MB)`);
console.log(`\n📋 สรุปข้อมูล:`);
console.log(`   - รถที่มีข้อมูลน้ำมัน: ${carCount} คัน`);
console.log(`   - รายการทั้งหมด: ${grandTotalCount} รายการ`);
console.log(`   - ปริมาณน้ำมันรวม: ${nf(grandTotalLiters,2)} ลิตร`);
console.log(`   - ค่าน้ำมันรวม: ${bf(grandTotalAmount)} บาท`);
console.log(`\n🔍 กรุณาเปิดด้วย Microsoft Word (ต้องมีฟ้อนต์ TH Sarabun New)`);
