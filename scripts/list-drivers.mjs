import { execSync } from 'child_process';
const out = execSync(
  'npx wrangler d1 execute ppk-drivehub-db --command "SELECT id,name FROM drivers ORDER BY name" --remote --json 2>&1',
  { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, shell: true }
);
const start = out.indexOf('[');
const end = out.lastIndexOf(']');
const j = JSON.parse(out.slice(start, end + 1));
j[0].results.forEach(r => console.log(r.id + ' | ' + r.name));
