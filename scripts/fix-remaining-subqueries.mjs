import { readFileSync, writeFileSync } from 'fs';

const fixes = {
  "ณัฐวุฒิ ใหญ่วงค์": "b494cfd8-7cd6-4801-8e1f-db14de8866c7",
  "กฤศ วงค์เรือง": null,
  "สุมงคล จ่อยพิรัตน์": null,
  "พงศธร โพธิแก้ว": null,
};

for (const file of ['seed-historical-usage.sql', 'seed-historical-fuel.sql']) {
  const path = `d:/AI CURSER/ppk-drivehub/migrations/${file}`;
  let content = readFileSync(path, 'utf8');
  
  for (const [name, id] of Object.entries(fixes)) {
    const subq = "(SELECT id FROM drivers WHERE name LIKE '%" + name + "%' LIMIT 1)";
    const replacement = id ? "'" + id + "'" : "NULL";
    content = content.replaceAll(subq, replacement);
  }

  writeFileSync(path, content, 'utf8');
  const remaining = (content.match(/SELECT id FROM/g) || []).length;
  console.log(`${file}: ${remaining} subqueries remaining`);
}
