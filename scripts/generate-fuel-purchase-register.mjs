#!/usr/bin/env node
// scripts/generate-fuel-purchase-register.mjs
// ทะเบียนควบคุมการจัดซื้อน้ำมันเชื้อเพลิง ประจำปีงบประมาณ พ.ศ. ๒๕๖๘
// โรงเรียนพะเยาพิทยาคม
// รูปแบบตามระเบียบกรมบัญชีกลาง ว่าด้วยการจัดซื้อน้ำมันเชื้อเพลิงฯ

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, PageBreak, UnderlineType
} from 'docx';

// ─── Config ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR  = 'D:\\รายงานยานพาหนะ 2568';
const OUTPUT_FILE = `${OUTPUT_DIR}\\ทะเบียนควบคุมจัดซื้อน้ำมัน-ปีงบ2568.docx`;
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
  purchasing: { name: 'นายสงกรานต์ แก้วสา',              pos: 'หัวหน้างานพัสดุ' },
  chief:      { name: 'นางจีรพา กันทา',                   pos: 'หัวหน้างานยานพาหนะ' },
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
  van:'รถตู้', sedan:'รถยนต์นั่งส่วนกลาง', pickup:'รถกระบะ',
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
function thDateFull(s){ const d=toDate(s); if(!d)return'-'; return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} พ.ศ. ${d.getFullYear()+543}`; }
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
const SB  = 32;   // 16pt body
const SH  = 36;   // 18pt heading
const ST  = 40;   // 20pt title
const SS  = 28;   // 14pt sub
const CS  = 24;   // 12pt cell

// A4 Portrait usable width: 11906 - 2*1080 (margin left=1701,right=1440) = ~9026 DXA
// Using narrower margins to fit table
// left=900, right=900 → usable = 11906-1800 = 10106 DXA

const BC = {
  top:    {style:BorderStyle.SINGLE,size:8,color:'000000'},
  bottom: {style:BorderStyle.SINGLE,size:8,color:'000000'},
  left:   {style:BorderStyle.SINGLE,size:8,color:'000000'},
  right:  {style:BorderStyle.SINGLE,size:8,color:'000000'},
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
const HS_HDR  = {type:ShadingType.CLEAR, fill:'1F3864'};  // dark navy
const HS_SUB  = {type:ShadingType.CLEAR, fill:'D9E1F2'};  // light blue subtotal
const HS_GTOT = {type:ShadingType.CLEAR, fill:'BDD7EE'};  // medium blue grand total

const spN = {before:0,  after:0,  line:360,lineRule:'auto'};
const spS = {before:40, after:40, line:280,lineRule:'auto'};
const spT = {before:80, after:80, line:360,lineRule:'auto'};

// ─── Text/Para helpers ────────────────────────────────────────────────────────
function tr(text,opts={}) {
  return new TextRun({text:String(text??''),font:F,size:opts.size||SB,bold:!!opts.bold,
    underline:opts.underline?{type:UnderlineType.SINGLE}:undefined,color:opts.color||'000000'});
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
// Header cell (dark navy + white bold text)
function hCell(text,w,opts={}) {
  return new TableCell({
    width:w?{size:w,type:WidthType.DXA}:undefined,
    borders:BC, shading:HS_HDR, verticalAlign:'center',
    rowSpan:opts.rowSpan||1, columnSpan:opts.colSpan||1,
    children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:spS,
      children:[tr(text,{size:opts.size||CS,bold:true,color:'FFFFFF'})]})]
  });
}
// Data cell
function dCell(text,w,opts={}) {
  return new TableCell({
    width:w?{size:w,type:WidthType.DXA}:undefined,
    borders:opts.borders||BC, verticalAlign:'center',
    columnSpan:opts.span, shading:opts.shade,
    children:[new Paragraph({
      alignment:opts.align||AlignmentType.LEFT, spacing:spS,
      children:[tr(String(text??'-'),{size:opts.size||CS,bold:opts.bold,color:opts.color||'000000'})]
    })]
  });
}
function dCellC(t,w,o={}) { return dCell(t,w,{...o,align:AlignmentType.CENTER}); }
function dCellR(t,w,o={}) { return dCell(t,w,{...o,align:AlignmentType.RIGHT}); }

// Empty cell (for blank lines in the table)
function emptyRow(colCount) {
  return new TableRow({height:{value:400,rule:'exact'}, children:
    Array.from({length:colCount},(_,i)=>new TableCell({
      borders:BC, children:[pp('',{sp:spS})]
    }))
  });
}

// ─── Column widths (A4 Portrait, usable 10106 DXA) ──────────────────────────
// 10 leaf columns, 2-row merged header
// Cols: วัน | ใบ | ครุภัณฑ์ | ผู้จัดซื้อ | ปริมาณ | วงเงิน | วงเงินสะสม | ลายมือชื่อ | หมายเหตุ
const C = [
  {w: 740, t:'วัน/เดือน/ปี'},
  {w:1140, t:'*ใบสั่งซื้อ / ใบเสร็จรับเงิน / ใบกำกับภาษี อย่างใดอย่างหนึ่ง'},
  {w:2600, t:'ประเภทของครุภัณฑ์ หรือสิ่งอื่นใดซึ่งใช้น้ำมันเชื้อเพลิง และหมายเลขทะเบียนหรือรหัสครุภัณฑ์'},
  {w:1140, t:'ผู้จัดซื้อน้ำมันเชื้อเพลิง'},
  // sub-cols under "รายละเอียดการจัดซื้อน้ำมันเชื้อเพลิง"
  {w: 760, t:'ปริมาณ\n(ลิตร)'},
  {w: 900, t:'วงเงิน\n(บาท)'},
  {w: 940, t:'วงเงิน\nสะสม\n(บาท)'},
  // end sub
  {w:1106, t:'ลายมือชื่อ\nผู้บันทึกรายการ'},
  {w: 780, t:'หมายเหตุ'},
];
// Total = 740+1140+2600+1140+760+900+940+1106+780 = 10106 ✓

// ─── Build 2-row merged header ────────────────────────────────────────────────
function buildTableHeader() {
  // Row 1: cols 0-3 rowspan=2, "รายละเอียด..." colspan=3, cols 7-8 rowspan=2
  const row1 = new TableRow({tableHeader:true, children:[
    hCell(C[0].t, C[0].w, {rowSpan:2, size:CS}),
    hCell(C[1].t, C[1].w, {rowSpan:2, size:CS}),
    hCell(C[2].t, C[2].w, {rowSpan:2, size:CS}),
    hCell(C[3].t, C[3].w, {rowSpan:2, size:CS}),
    hCell('รายละเอียดการจัดซื้อน้ำมันเชื้อเพลิง', C[4].w+C[5].w+C[6].w, {colSpan:3, size:CS}),
    hCell(C[7].t, C[7].w, {rowSpan:2, size:CS}),
    hCell(C[8].t, C[8].w, {rowSpan:2, size:CS}),
  ]});
  // Row 2: only 3 sub-header cells (cols 4-6, no ประเภท)
  const row2 = new TableRow({tableHeader:true, children:[
    hCell(C[4].t, C[4].w, {size:CS}),
    hCell(C[5].t, C[5].w, {size:CS}),
    hCell(C[6].t, C[6].w, {size:CS}),
  ]});
  return [row1, row2];
}

// ─── Load data ────────────────────────────────────────────────────────────────
console.log('\n📊 กำลังดึงข้อมูลจาก Cloudflare D1...\n');

const fuel = qDB(`SELECT f.id,f.date,f.time,f.car_id,c.license_plate,c.brand,c.model,c.vehicle_type,COALESCE(d.first_name||' '||d.last_name,f.driver_name_manual,'-') AS driver_name,f.liters,f.price_per_liter,f.amount,f.fuel_type,f.gas_station_name,f.mileage_before,f.document_number,f.receipt_number,f.anomaly_flag,f.notes,f.expense_type FROM fuel_log f LEFT JOIN cars c ON c.id=f.car_id LEFT JOIN drivers d ON d.id=f.driver_id WHERE f.date>='${FY_START}' AND f.date<='${FY_END}' AND f.deleted_at IS NULL ORDER BY f.date,f.time`);
console.log(`  ✓ บันทึกน้ำมัน: ${fuel.length} รายการ`);

// Pre-compute grand running total (across all months, sequential)
let grandRunning = 0;

// Group by month
const byMonth = {};
for (const f of fuel) {
  const ym = getYM(f.date)||'unknown';
  if (!byMonth[ym]) byMonth[ym] = [];
  byMonth[ym].push(f);
}

console.log('\n🏗️  กำลังสร้างเอกสาร...\n');

// ══════════════════════════════════════════════════════════════════════════════
// BUILD PAGES — one per month with data
// ══════════════════════════════════════════════════════════════════════════════
const portraitNodes = [];   // ปก + สรุปรายเดือน (Portrait)
const landscapeNodes = [];  // รายละเอียดรายเดือน + ลายเซ็น (Landscape)
const allNodes = portraitNodes;  // alias เพื่อให้ code เดิมใช้ได้

// ─── Cover page ───────────────────────────────────────────────────────────────
allNodes.push(
  ...el(3),
  ppc('ทะเบียนควบคุมการจัดซื้อน้ำมันเชื้อเพลิง', {sp:{before:0,after:60,line:400,lineRule:'auto'}, size:ST*2, bold:true}),
  ppc('งานยานพาหนะ', {sp:{before:0,after:60,line:360,lineRule:'auto'}, size:48, bold:true}),
  ...el(1),
  ppc('─────────────────────────────', {sp:{before:0,after:0,line:280}, size:28}),
  ...el(1),
  ppc(SCHOOL, {sp:{before:120,after:120,line:400,lineRule:'auto'}, size:44, bold:true}),
  ppc(ZONE,   {sp:{before:60, after:60, line:360,lineRule:'auto'}, size:32}),
  ppc('กระทรวงศึกษาธิการ', {sp:{before:40,after:40,line:360,lineRule:'auto'}, size:32}),
  ...el(1),
  ppc('ปีงบประมาณ พ.ศ. ๒๕๖๘', {sp:{before:120,after:120,line:400,lineRule:'auto'}, size:ST, bold:true}),
  ppc('(๑ ตุลาคม ๒๕๖๗ – ๓๐ กันยายน ๒๕๖๘)', {sp:{before:60,after:60,line:360,lineRule:'auto'}, size:SB}),
  ...el(2),
  ppc('─────────────────────────────', {sp:{before:0,after:0,line:280}, size:28}),
  ...el(1),
  ppc('จัดทำโดย', {sp:{before:120,after:120,line:360,lineRule:'auto'}, size:SB}),
  ppc(P.author.name, {sp:{before:60,after:40,line:360,lineRule:'auto'}, size:36, bold:true}),
  ppc(P.author.pos,  {sp:{before:40,after:40,line:360,lineRule:'auto'}, size:SB}),
  ppc(SCHOOL,        {sp:{before:40,after:40,line:360,lineRule:'auto'}, size:SB}),
  pb(),
);

// ─── Summary page (before monthly detail) ─────────────────────────────────────
let sumTotalL=0, sumTotalA=0, sumTotalC=0;
const sumMonthData = FY_MONTHS.map(ym => {
  const recs = byMonth[ym]||[];
  const mL   = recs.reduce((s,f)=>s+(+f.liters||0),0);
  const mA   = recs.reduce((s,f)=>s+(+f.amount||0),0);
  sumTotalL+=mL; sumTotalA+=mA; sumTotalC+=recs.length;
  return {ym, recs, mL, mA};
});

allNodes.push(
  ppc('สรุปการจัดซื้อน้ำมันเชื้อเพลิง ปีงบประมาณ พ.ศ. ๒๕๖๘',
    {sp:{before:0,after:40,line:360,lineRule:'auto'}, size:SH, bold:true}),
  ppc(SCHOOL, {sp:{before:0,after:20,line:360,lineRule:'auto'}, size:SB, bold:true}),
  ppc('(ประจำปีงบประมาณ ๑ ตุลาคม ๒๕๖๗ – ๓๐ กันยายน ๒๕๖๘)',
    {sp:{before:0,after:100,line:360,lineRule:'auto'}, size:SB}),
);

const sumH = [{w:500,t:'ลำดับ'},{w:1400,t:'เดือน'},{w:800,t:'จำนวน\nรายการ'},{w:1200,t:'ปริมาณน้ำมัน\n(ลิตร)'},{w:1400,t:'วงเงินที่ใช้จ่าย\n(บาท)'},{w:1300,t:'คิดเป็นร้อยละ\nของงบประมาณ'},{w:2506,t:'หมายเหตุ'}];
const sumTotalColW = sumH.reduce((s,h)=>s+h.w,0);

const sumTableRows = [
  new TableRow({tableHeader:true, children:sumH.map(h=>hCell(h.t,h.w,{size:CS}))}),
  ...sumMonthData.map(({ym,recs,mL,mA},i)=>new TableRow({children:[
    dCellC(i+1,               sumH[0].w),
    dCell(thMonthYear(ym),    sumH[1].w),
    dCellR(nf(recs.length)||'0', sumH[2].w),
    dCellR(mL>0?nf(mL,2):'-',sumH[3].w),
    dCellR(mA>0?bf(mA):'-',  sumH[4].w, {bold:mA>0}),
    dCellC(sumTotalA>0 ? nf(mA/sumTotalA*100,1)+'%' : '-', sumH[5].w),
    dCell(recs.length===0?'ไม่มีการจัดซื้อ':'-', sumH[6].w),
  ]})),
  new TableRow({children:[
    new TableCell({columnSpan:2,borders:BC,shading:HS_GTOT,
      children:[ppc('รวมทั้งปีงบประมาณ',{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC,shading:HS_GTOT,
      children:[ppr(nf(sumTotalC),{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC,shading:HS_GTOT,
      children:[ppr(nf(sumTotalL,2),{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC,shading:HS_GTOT,
      children:[ppr(bf(sumTotalA),{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC,shading:HS_GTOT,
      children:[ppc('100%',{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC,shading:HS_GTOT,
      children:[pp('',{sp:spS})]}),
  ]}),
];

allNodes.push(new Table({width:{size:sumTotalColW,type:WidthType.DXA}, rows:sumTableRows}));
allNodes.push(pp(
  [tr(`ที่มา: ระบบ PPK-DriveHub, ${SCHOOL} ณ วันที่ ${thDate(new Date().toISOString().slice(0,10))}`, {size:22,color:'555555'})],
  {sp:{before:40,after:60,line:280,lineRule:'auto'}}
));
allNodes.push(pb());

// ─── Monthly pages (Landscape) ───────────────────────────────────────────────
for (const {ym, recs, mL, mA} of sumMonthData) {
  if (recs.length === 0) {
    console.log(`  ⚪ ${thMonthYear(ym)} — ไม่มีข้อมูล (ข้ามหน้า)`);
    continue;
  }
  console.log(`  ✓ ${thMonthYear(ym)} — ${recs.length} รายการ  ${bf(mA)} บาท`);
  // เปลี่ยนมาใช้ landscapeNodes แทน
  const pageNodes = landscapeNodes;
  const [y,m] = ym.split('-');
  const thMon = TH_MONTHS[+m-1];
  const thYr  = +y+543;

  // ── Page header ─────────────────────────────────────────────────────────
  pageNodes.push(
    ppc('ทะเบียนควบคุมการจัดซื้อน้ำมันเชื้อเพลิง',
      {sp:{before:0,after:20,line:360,lineRule:'auto'}, size:ST, bold:true}),
    pp([tr('ส่วนราชการ  ',{size:SB,bold:true}),
        tr(SCHOOL,{size:SB}),
        tr('    สังกัด  ',{size:SB,bold:true}),
        tr(ZONE,{size:SB})],
      {sp:{before:0,after:10,line:360,lineRule:'auto'}, align:AlignmentType.LEFT}),
    pp([tr('รายงานขอซื้อที่หัวหน้าหน่วยงานของรัฐให้ความเห็นชอบ  เลขที่  ',{size:SB}),
        tr('……………………………………',{size:SB})],
      {sp:{before:0,after:10,line:360,lineRule:'auto'}, align:AlignmentType.RIGHT}),
    pp([tr('วงเงินที่หัวหน้าหน่วยงานของรัฐให้ความเห็นชอบ  ',{size:SB}),
        tr('……………………………  บาท    (ประจำเดือน  ',{size:SB}),
        tr(`${thMon} พ.ศ. ${thYr}`,{size:SB,bold:true}),
        tr(')',{size:SB})],
      {sp:{before:0,after:60,line:360,lineRule:'auto'}, align:AlignmentType.RIGHT}),
  );

  // ── Data table ──────────────────────────────────────────────────────────
  let monthRunning = 0;
  const dataRows = recs.map((f,i) => {
    const liters = +f.liters||0;
    const amount = +f.amount||0;
    monthRunning  += amount;
    grandRunning  += amount;

    const docno    = f.document_number || f.receipt_number || '–';
    const vtypeTh  = VEH_TYPE_TH[f.vehicle_type] || f.vehicle_type || 'รถราชการ';
    const plate    = f.license_plate || '-';
    const brand    = `${f.brand||''} ${f.model||''}`.trim() || '-';
    // col 3: ประเภทครุภัณฑ์ + ทะเบียน
    const assetDesc = `${vtypeTh} ${brand}\nทะเบียน ${plate}`;
    const noteText = f.notes||'-';

    return new TableRow({children:[
      dCellC(thDateSh(f.date),     C[0].w, {size:CS}),
      dCellC(docno,                C[1].w, {size:CS}),
      dCell(assetDesc,             C[2].w, {size:CS}),
      dCell(f.driver_name||'-',    C[3].w, {size:CS}),
      dCellR(nf(liters,2),         C[4].w, {size:CS}),
      dCellR(bf(amount),           C[5].w, {size:CS}),
      dCellR(bf(monthRunning),     C[6].w, {size:CS, bold:true}),
      dCellC('',                   C[7].w, {size:CS}),  // ลายมือชื่อ — เว้นว่าง
      dCell(noteText,              C[8].w, {size:CS}),
    ]});
  });

  // Monthly total row
  dataRows.push(new TableRow({children:[
    new TableCell({columnSpan:4, borders:BC, shading:HS_SUB,
      children:[ppc(`รวมเดือน${thMon} ${thYr}  (${recs.length} รายการ)`, {sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC, shading:HS_SUB,
      children:[ppr(nf(mL,2),{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC, shading:HS_SUB,
      children:[ppr(bf(mA),{sp:spS,bold:true,size:CS})]}),
    new TableCell({borders:BC, shading:HS_SUB,
      children:[ppr(bf(monthRunning),{sp:spS,bold:true,size:CS})]}),
    new TableCell({columnSpan:2, borders:BC, shading:HS_SUB,
      children:[pp('',{sp:spS})]}),
  ]}));

  pageNodes.push(new Table({
    width:{size:100,type:WidthType.PERCENTAGE},
    rows:[...buildTableHeader(), ...dataRows],
  }));

  // Source note
  pageNodes.push(pp(
    [tr(`ที่มา: ระบบ PPK-DriveHub, ${SCHOOL} ณ วันที่ ${thDate(new Date().toISOString().slice(0,10))}  `, {size:22,color:'555555'}),
     new TextRun({text:'ช่องลายมือชื่อ — กรอกด้วยลายมือหลังพิมพ์',font:F,size:22,color:'AA0000',bold:true})],
    {sp:{before:40,after:60,line:280,lineRule:'auto'}}
  ));

  // ── Signature section ───────────────────────────────────────────────────────
  pageNodes.push(...el(1));

  // Certification sentence
  pageNodes.push(ppc(
    [tr('ขอรับรองว่าทะเบียนควบคุมการจัดซื้อน้ำมันเชื้อเพลิง ประจำเดือน ',{size:SB,bold:true}),
     tr(`${thMon} พ.ศ. ${thYr}`,{size:SB,bold:true,underline:true}),
     tr('  มีรายละเอียดครบถ้วน ถูกต้องตามความเป็นจริงทุกประการ',{size:SB,bold:true})],
    {sp:{before:40,after:40,line:360,lineRule:'auto'}}
  ));
  pageNodes.push(...el(1));

  const sigMV = (role,name,pos) => [
    ppc('ลงชื่อ .............................................',{sp:{before:100,after:0,line:360,lineRule:'auto'},size:SB}),
    ppc(`(${name})`,{sp:{before:20,after:0,line:360,lineRule:'auto'},size:SB}),
    ppc(role,{sp:{before:10,after:0,line:360,lineRule:'auto'},size:SB,bold:true}),
    ppc(pos, {sp:{before:10,after:0,line:360,lineRule:'auto'},size:SB}),
    ppc(`วันที่ ......... เดือน ....................... พ.ศ. ..........`,{sp:{before:40,after:80,line:360,lineRule:'auto'},size:SB}),
  ];
  pageNodes.push(
    pp([tr('ข้อมูลได้มาจากระบบ PPK-DriveHub ซึ่งบันทึกโดยพนักงานขับรถ ผู้จัดทำเป็นเพียงผู้รวบรวมข้อมูลสรุปเท่านั้น',{size:22,color:'555555'})],
      {sp:{before:40,after:20,line:360,lineRule:'auto'},align:AlignmentType.CENTER})
  );
  pageNodes.push(...sigMV('ผู้จัดทำ / ผู้บันทึกรายการ', P.author.name,     P.author.pos));
  pageNodes.push(...sigMV('ผู้ตรวจสอบใบเสร็จรับเงิน',   P.purchasing.name, P.purchasing.pos));
  pageNodes.push(...sigMV('หัวหน้างานยานพาหนะ',          P.chief.name,      P.chief.pos));
  pageNodes.push(...sigMV('ผู้อนุมัติ',                  P.director.name,   P.director.pos));

  pageNodes.push(pb());
}

// ─── Back cover / grand total seal ────────────────────────────────────────────

landscapeNodes.push(
  ppc('สรุปยอดรวมทั้งปีงบประมาณ พ.ศ. ๒๕๖๘',
    {sp:{before:0,after:40,line:360,lineRule:'auto'}, size:SH, bold:true}),
  ppc(SCHOOL, {sp:{before:0,after:100,line:360,lineRule:'auto'}, size:SB}),
  pp([tr('รวมรายการทั้งหมด: ',{size:SB,bold:true}), tr(`${nf(sumTotalC)} รายการ`, {size:SB})],
    {sp:{before:0,after:0,line:360,lineRule:'auto'}}),
  pp([tr('รวมปริมาณน้ำมัน: ',{size:SB,bold:true}), tr(`${nf(sumTotalL,2)} ลิตร`, {size:SB})],
    {sp:{before:0,after:0,line:360,lineRule:'auto'}}),
  pp([tr('รวมวงเงินทั้งสิ้น: ',{size:SB,bold:true}), tr(`${bf(sumTotalA)} บาท  (${nf(sumTotalA,2)} บาทถ้วน)`, {size:SB, bold:true})],
    {sp:{before:0,after:100,line:360,lineRule:'auto'}}),
  ...el(2),
);

const sigSealV = (role,name,pos) => [
  ppc('ลงชื่อ .............................................',{sp:{before:100,after:0,line:360,lineRule:'auto'},size:SB}),
  ppc(`(${name})`,{sp:{before:20,after:0,line:360,lineRule:'auto'},size:SB}),
  ppc(role,{sp:{before:10,after:0,line:360,lineRule:'auto'},size:SB,bold:true}),
  ppc(pos, {sp:{before:10,after:0,line:360,lineRule:'auto'},size:SB}),
  ppc('วันที่ ......... เดือน ....................... พ.ศ. ..........',{sp:{before:40,after:80,line:360,lineRule:'auto'},size:SB}),
];
landscapeNodes.push(
  pp([tr('ขอรับรองว่าข้อมูลในทะเบียนควบคุมการจัดซื้อน้ำมันได้มาจากระบบ PPK-DriveHub ซึ่งบันทึกโดยพนักงานขับรถ ผู้จัดทำรายงานเป็นเพียงผู้รวบรวมและสรุปข้อมูลเท่านั้น',{size:22,color:'555555'})],
    {sp:{before:40,after:20,line:360,lineRule:'auto'},align:AlignmentType.CENTER})
);
landscapeNodes.push(
  ...sigSealV('ผู้จัดทำ / ผู้บันทึกรายการ',  P.author.name,     P.author.pos),
  ...sigSealV('ผู้ตรวจสอบใบเสร็จรับเงิน',   P.purchasing.name, P.purchasing.pos),
  ...sigSealV('หัวหน้างานยานพาหนะ',          P.chief.name,      P.chief.pos),
  ...sigSealV('ผู้อนุมัติ',                   P.director.name,   P.director.pos),
);

// ══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT
// ══════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  styles: { default: { document: { run:{font:F,size:SB}, paragraph:{spacing:spN} } } },
  sections: [
    {
      properties: {
        page: {
          size:   { width:11906, height:16838 },   // A4 Portrait
          margin: { top:1080, bottom:1080, left:900, right:900 },
        },
      },
      children: portraitNodes,
    },
    {
      properties: {
        page: {
          size:   { width:16838, height:11906 },   // A4 Landscape
          margin: { top:1080, bottom:1080, left:1080, right:1080 },
        },
      },
      children: landscapeNodes,
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
console.log(`   - รายการทั้งหมด: ${nf(sumTotalC)} รายการ`);
console.log(`   - ปริมาณน้ำมัน: ${nf(sumTotalL,2)} ลิตร`);
console.log(`   - วงเงินทั้งสิ้น: ${bf(sumTotalA)} บาท`);
console.log(`\n🔍 กรุณาเปิดด้วย Microsoft Word (ต้องมีฟ้อนต์ TH Sarabun New)`);
