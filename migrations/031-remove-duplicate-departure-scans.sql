-- Migration 031: remove duplicate departure scans (3 ambiguous groups)
-- Backups: backups/dup-usage-backup-20260512.json (all deleted rows preserved there)
-- Kept records retain full trip info; only redundant duplicate scans removed.

-- Group 97d66518 2025-12-12 13:06 : two identical departures (mi 235714). Keep 1054d84a, drop dca04444.
DELETE FROM usage_records WHERE id='06176c60-1761-4293-a462-50157dc0f5fd';
DELETE FROM queue WHERE id='dca04444-90d2-48e3-903a-edb05ed94f3c';

-- Group b43ad8e2 2025-10-29 12:00 : dup departure mi 418182 is below current odometer 418183 (wrong). Keep 1cb33f27 (418183), drop bbfdae45 (418182).
DELETE FROM usage_records WHERE id='eed35e71-b0ad-43ce-a0c2-4e838ba79466';
DELETE FROM queue WHERE id='bbfdae45-fa25-4d32-95bb-a62f47176dfc';

-- Group d1def56d 2025-12-02 07:20 : duplicate departure (mi 300379). Keep 8144d06c (has dep+ret), drop 16d7e3e7.
DELETE FROM usage_records WHERE id='b19cb11c-8010-4741-80e5-cc0c939d5e2f';
DELETE FROM queue WHERE id='16d7e3e7-31d9-41f1-bc13-e3b8afd32e9c';
