import { readFileSync, writeFileSync } from 'fs';

const path = 'd:/AI CURSER/ppk-drivehub/migrations/seed-historical-fuel.sql';
let content = readFileSync(path, 'utf8');

content = content.replaceAll(
  "(SELECT id FROM drivers WHERE name LIKE '%ผู้เบิกน้ำมันไม่บันทึกชื่อผู้เบิก%' LIMIT 1)",
  "NULL"
);

writeFileSync(path, content, 'utf8');
const remaining = (content.match(/SELECT id FROM/g) || []).length;
console.log('Remaining subqueries:', remaining);
