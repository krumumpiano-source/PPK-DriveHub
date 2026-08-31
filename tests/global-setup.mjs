// Global setup: reset local D1 database before tests
// Strategy: Apply schema.sql to ensure all columns/tables exist, then clear data.
// This prevents schema drift when migrations add new columns.
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';

// Clean up bootstrap flag from previous run
const BOOTSTRAP_FLAG = 'test-results/.bootstrap-done';
try { if (existsSync(BOOTSTRAP_FLAG)) unlinkSync(BOOTSTRAP_FLAG); } catch {}

const TABLES = [
  'trip_evaluations',
  'fuel_invoice_items', 'fuel_station_invoices', 'fuel_requests', 'fuel_log',
  'inspection_alerts', 'check_log', 'vehicle_maintenance', 'maintenance_settings',
  'scheduled_repairs', 'repair_log',
  'insurance_records', 'tax_records',
  'vehicle_requests',
  'usage_records', 'queue', 'queue_rules',
  'leaves', 'self_reported_fatigue', 'driver_warnings', 'drivers',
  'cars',
  'notifications', 'audit_log', 'pdpa_log', 'backups', 'system_settings',
  'password_history', 'reset_password_requests', 'sessions', 'user_requests', 'users',
  'rate_limits',
];

export default async function globalSetup() {
  console.log('[global-setup] Applying schema to local D1 database...');

  // Step 1: Apply schema.sql to ensure all tables + columns exist (CREATE TABLE IF NOT EXISTS)
  try {
    execSync(
      `npx wrangler d1 execute ppk-drivehub-db --local --file "migrations/schema.sql"`,
      { cwd: process.cwd(), stdio: 'pipe', timeout: 60000 }
    );
    console.log('[global-setup] Schema applied.');
  } catch (e) {
    console.warn('[global-setup] Schema apply warning (may be OK if tables exist):', e.stderr?.toString().slice(0, 200));
  }

  // Step 2: Apply incremental migrations that add columns not in original schema
  const extraMigrations = [
    'migrations/005-system-overhaul.sql',
    'migrations/006-repair-detail-fields.sql',
    'migrations/016-usage-manual-driver-purpose.sql',
    'migrations/017-check-log-image.sql',
    'migrations/018-expand-user-roles.sql',
    'migrations/019-user-requests-fields.sql',
    'migrations/020-incident-time-notes.sql',
    'migrations/021-add-updated-by-tracking.sql',
    'migrations/022-add-updated-by-to-cars.sql',
    'migrations/023-audit-authorization-fields.sql',
    'migrations/031-usage-mileage-correction-tracking.sql',
    'migrations/033-google-form-sync.sql',
    'migrations/034-passengers-and-fuel-budget.sql',
    'migrations/035-odometer-image.sql',
    'migrations/036-vehicle-requests-tracking.sql',
    'migrations/037-gform-sync-upsert.sql',
    'migrations/038-map-estimation.sql',
    'migrations/039-multi-stop-compliance.sql',
    'migrations/040-add-return-date.sql',
    'migrations/041-vehicle-request-no.sql',
    'migrations/042-add-line-user-id.sql',
    'migrations/043-add-usage-gps.sql',
    'migrations/044-add-signature.sql',
    'migrations/044-repair-gps.sql',
    'migrations/045-driver-evaluations-and-warnings.sql',
    'migrations/046-optimize-evaluations-indexes.sql',
    'migrations/047-survey-tracking.sql',
    'migrations/048-optimize-usage-queue-id.sql',
    'migrations/054-fix-queue-driver-nullable-repair-invoice.sql',
  ];

  for (const mig of extraMigrations) {
    try {
      execSync(
        `npx wrangler d1 execute ppk-drivehub-db --local --file "${mig}"`,
        { cwd: process.cwd(), stdio: 'pipe', timeout: 30000 }
      );
    } catch { /* column may already exist — ignore */ }
  }
  console.log('[global-setup] Extra migrations applied.');

  // Step 3: Clear all data
  console.log('[global-setup] Clearing all data...');
  for (const t of TABLES) {
    try {
      execSync(
        `npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM ${t};"`,
        { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 }
      );
    } catch { /* table may not exist */ }
  }
  console.log('[global-setup] Database reset complete.');
}

