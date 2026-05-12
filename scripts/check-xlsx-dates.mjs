import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import * as XLSX from 'xlsx';

const SRC = resolve('D:/AI CURSER/บันทึกการใช้รถ');
const files = readdirSync(SRC).filter(f => f.toLowerCase().endsWith('.xlsx'));
for (const f of files) {
  const wb = XLSX.read(readFileSync(join(SRC, f)));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  // หา last non-empty row
  let last = null, count = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i] && String(rows[i][0]||'').trim()) { last = rows[i]; break; }
  }
  for (const r of rows) if (r && String(r[0]||'').trim() && String(r[0]).match(/^\d+$/)) count++;
  console.log(`${f} → rows=${count}, lastDate=${last?.[1]}`);
}
