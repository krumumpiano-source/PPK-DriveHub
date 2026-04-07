#!/usr/bin/env node
// Parse existing driver name → title + first_name + last_name
// Run: node scripts/parse-driver-names.mjs

import { execSync } from 'child_process';

// Get all drivers with their names
const out = execSync(
  'npx wrangler d1 execute ppk-drivehub-db --command "SELECT id, name FROM drivers" --remote --json',
  { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
);

const parsed = JSON.parse(out);
const rows = parsed[0]?.results || [];

console.log(`Found ${rows.length} drivers to parse`);

for (const row of rows) {
  const name = (row.name || '').trim();
  let title = '', firstName = '', lastName = '';

  if (name.startsWith('นางสาว')) {
    title = 'นางสาว';
    const rest = name.slice(6).trim();
    const sp = rest.indexOf(' ');
    firstName = sp > 0 ? rest.slice(0, sp) : rest;
    lastName = sp > 0 ? rest.slice(sp + 1).trim() : '';
  } else if (name.startsWith('นาง')) {
    title = 'นาง';
    const rest = name.slice(3).trim();
    const sp = rest.indexOf(' ');
    firstName = sp > 0 ? rest.slice(0, sp) : rest;
    lastName = sp > 0 ? rest.slice(sp + 1).trim() : '';
  } else if (name.startsWith('นาย')) {
    title = 'นาย';
    const rest = name.slice(3).trim();
    const sp = rest.indexOf(' ');
    firstName = sp > 0 ? rest.slice(0, sp) : rest;
    lastName = sp > 0 ? rest.slice(sp + 1).trim() : '';
  } else {
    const sp = name.indexOf(' ');
    firstName = sp > 0 ? name.slice(0, sp) : name;
    lastName = sp > 0 ? name.slice(sp + 1).trim() : '';
  }

  console.log(`  ${name} → [${title}] [${firstName}] [${lastName}]`);

  const sql = `UPDATE drivers SET title='${title}', first_name='${firstName}', last_name='${lastName}' WHERE id='${row.id}'`;
  try {
    execSync(`npx wrangler d1 execute ppk-drivehub-db --command "${sql}" --remote`, { encoding: 'utf8' });
  } catch (e) {
    console.error(`  ERROR updating ${row.id}:`, e.message);
  }
}

console.log('Done!');
