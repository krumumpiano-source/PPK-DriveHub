/**
 * Verify usage import:
 *   - count baseline (before import)
 *   - apply SQL to remote
 *   - count after
 *   - print sample rows
 *
 * Usage:
 *   node scripts/verify-usage-import.mjs count    # show counts only
 *   node scripts/verify-usage-import.mjs apply    # apply SQL then count
 *   node scripts/verify-usage-import.mjs sample   # show 5 sample queue + usage rows
 */
import { execSync } from 'child_process';

const cmd = process.argv[2] || 'count';

function runWrangler(sqlOrFile, isFile = false) {
  const arg = isFile ? `--file=${sqlOrFile}` : `--command "${sqlOrFile}"`;
  const out = execSync(
    `npx wrangler d1 execute ppk-drivehub-db ${arg} --remote --json 2>&1`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, shell: 'cmd.exe' }
  );
  const start = out.indexOf('[');
  const end = out.lastIndexOf(']');
  if (start < 0) { console.error('No JSON in output:', out); throw new Error('parse'); }
  return JSON.parse(out.slice(start, end + 1));
}

function counts(label) {
  const r = runWrangler(
    "SELECT (SELECT COUNT(*) FROM cars) AS cars, (SELECT COUNT(*) FROM drivers) AS drivers, (SELECT COUNT(*) FROM queue) AS queue, (SELECT COUNT(*) FROM usage_records) AS usage_records;"
  );
  const row = r[0].results[0];
  console.log(`\n=== ${label} ===`);
  console.log(`  cars:          ${row.cars}`);
  console.log(`  drivers:       ${row.drivers}`);
  console.log(`  queue:         ${row.queue}`);
  console.log(`  usage_records: ${row.usage_records}`);
  return row;
}

if (cmd === 'count') {
  counts('Current Counts (production)');
} else if (cmd === 'apply') {
  const before = counts('BEFORE');
  console.log('\nApplying migrations/import-usage-historical.sql to REMOTE …');
  execSync('npx wrangler d1 execute ppk-drivehub-db --file=migrations/import-usage-historical.sql --remote', {
    stdio: 'inherit', shell: 'cmd.exe'
  });
  const after = counts('AFTER');
  console.log('\n=== Delta ===');
  console.log(`  drivers:       +${after.drivers - before.drivers}`);
  console.log(`  queue:         +${after.queue - before.queue}`);
  console.log(`  usage_records: +${after.usage_records - before.usage_records}`);
} else if (cmd === 'sample') {
  const q = runWrangler(
    "SELECT q.date,q.time_start,q.time_end,c.license_plate,d.name AS driver,q.requested_by,q.mission,q.status FROM queue q LEFT JOIN cars c ON c.id=q.car_id LEFT JOIN drivers d ON d.id=q.driver_id WHERE q.created_by='legacy-import' ORDER BY q.date DESC LIMIT 5;"
  );
  console.log('\n--- Latest 5 imported queue rows ---');
  console.table(q[0].results);

  const u = runWrangler(
    "SELECT u.datetime,u.record_type,c.license_plate,d.name AS driver,u.mileage,u.location FROM usage_records u LEFT JOIN cars c ON c.id=u.car_id LEFT JOIN drivers d ON d.id=u.driver_id WHERE u.notes LIKE '%legacy-import%' ORDER BY u.datetime DESC LIMIT 8;"
  );
  console.log('\n--- Latest 8 imported usage_records ---');
  console.table(u[0].results);
} else {
  console.error('Unknown command:', cmd);
  process.exit(1);
}
