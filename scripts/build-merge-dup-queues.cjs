// Build a safe merge SQL for duplicate backfill queues.
// Reads the backup JSON files (exported from remote D1) and, for each
// (car_id, date, time_start) group that has >1 queue, decides:
//   - CLEAN  : union of records has <=1 departure AND <=1 return
//              -> relink all records to a single keeper queue, delete the others
//   - AMBIG  : union has >1 departure or >1 return (duplicate scans)
//              -> DO NOT touch, list for manual review
// NEVER deletes a usage_record. Only deletes empty/duplicate queue containers.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const qBackup = JSON.parse(fs.readFileSync(path.join(root, 'backups', 'dup-queues-backup-20260512.json'), 'utf8'));
const uBackup = JSON.parse(fs.readFileSync(path.join(root, 'backups', 'dup-usage-backup-20260512.json'), 'utf8'));

const pick = (b) => Array.isArray(b) ? b[0].results : b.results;
const queues = pick(qBackup);   // { id, date, time_start, ... car_id }
const records = pick(uBackup);  // { id, queue_id, record_type, ... }

// index records by queue_id
const recsByQueue = {};
for (const r of records) {
  (recsByQueue[r.queue_id] = recsByQueue[r.queue_id] || []).push(r);
}

// group queues by car_id|date|time_start
const groups = {};
for (const q of queues) {
  const key = `${q.car_id}|${q.date}|${q.time_start}`;
  (groups[key] = groups[key] || []).push(q);
}

const sqlLines = [];
const ambiguous = [];
let cleanGroups = 0, relinks = 0, deletes = 0;

for (const [key, qs] of Object.entries(groups)) {
  if (qs.length < 2) continue; // not a duplicate group

  // collect all records across the group
  const groupRecs = [];
  for (const q of qs) for (const r of (recsByQueue[q.id] || [])) groupRecs.push(r);
  const deps = groupRecs.filter(r => r.record_type === 'departure');
  const rets = groupRecs.filter(r => r.record_type === 'return');

  if (deps.length > 1 || rets.length > 1) {
    ambiguous.push({ key, queues: qs.map(q => q.id), deps: deps.length, rets: rets.length });
    continue;
  }

  // CLEAN: pick keeper = queue holding a departure, else holding a return, else first
  const holds = (q, type) => (recsByQueue[q.id] || []).some(r => r.record_type === type);
  let keeper = qs.find(q => holds(q, 'departure'))
            || qs.find(q => holds(q, 'return'))
            || qs[0];
  const losers = qs.filter(q => q.id !== keeper.id);

  cleanGroups++;
  sqlLines.push(`-- group ${key}  keeper=${keeper.id}`);
  // relink every record not already on keeper
  for (const r of groupRecs) {
    if (r.queue_id !== keeper.id) {
      sqlLines.push(`UPDATE usage_records SET queue_id='${keeper.id}' WHERE id='${r.id}';`);
      relinks++;
    }
  }
  for (const l of losers) {
    sqlLines.push(`DELETE FROM queue WHERE id='${l.id}';`);
    deletes++;
  }
  sqlLines.push('');
}

const header = `-- Migration 030: merge duplicate backfill queues (auto-generated)
-- Generated ${new Date().toISOString()}
-- Clean groups merged: ${cleanGroups} | relinks: ${relinks} | queue deletes: ${deletes}
-- NO usage_records are deleted. Only redundant queue rows are removed.
`;

fs.writeFileSync(path.join(root, 'migrations', '030-merge-duplicate-backfill-queues.sql'),
  header + '\n' + sqlLines.join('\n'), 'utf8');

console.log(header);
console.log('AMBIGUOUS groups (NOT merged, manual review):');
for (const a of ambiguous) console.log('  ', a.key, `deps=${a.deps} rets=${a.rets}`, a.queues.join(','));
console.log('\nWrote migrations/030-merge-duplicate-backfill-queues.sql');
