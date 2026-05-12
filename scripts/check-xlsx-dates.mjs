import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import * as XLSX from 'xlsx';

const SRC = resolve('D:/AI CURSER/บันทึกการใช้รถ');
const files = readdirSync(SRC).filter(f => f.toLowerCase().endsWith('.xlsx'));
for (const f of files) {
  const wb = XLSX.read(readFileSync(join(SRC, f)));
  console.log(`\n=== ${f} === sheets=${wb.SheetNames.length}`);
  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    let last = null, count = 0, first = null;
    for (const r of rows) {
      if (r && String(r[0]||'').match(/^\d+$/)) {
        count++;
        if (!first) first = r[1];
        last = r[1];
      }
    }
    console.log(`  sheet="${sn}" rows=${count} first=${first} last=${last}`);
  }
}
