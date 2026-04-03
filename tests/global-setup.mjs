// Global setup: reset local D1 database before tests
import { execSync } from 'child_process';

const TABLES = [
  'fuel_invoice_items', 'fuel_station_invoices', 'fuel_requests', 'fuel_log',
  'inspection_alerts', 'check_log', 'vehicle_maintenance', 'maintenance_settings',
  'scheduled_repairs', 'repair_log',
  'insurance_records', 'tax_records',
  'usage_records', 'queue', 'queue_rules',
  'leaves', 'self_reported_fatigue', 'drivers',
  'cars',
  'notifications', 'audit_log', 'pdpa_log', 'backups', 'system_settings',
  'password_history', 'reset_password_requests', 'sessions', 'user_requests', 'users',
  'rate_limits',
];

export default async function globalSetup() {
  console.log('[global-setup] Resetting local D1 database...');
  const sql = TABLES.map(t => `DELETE FROM ${t};`).join(' ');
  try {
    execSync(
      `npx wrangler d1 execute ppk-drivehub-db --local --command "${sql}"`,
      { cwd: process.cwd(), stdio: 'pipe', timeout: 30000 }
    );
    console.log('[global-setup] Database reset complete.');
  } catch (e) {
    // Some tables may not exist — run individual deletes
    for (const t of TABLES) {
      try {
        execSync(
          `npx wrangler d1 execute ppk-drivehub-db --local --command "DELETE FROM ${t};"`,
          { cwd: process.cwd(), stdio: 'pipe', timeout: 10000 }
        );
      } catch { /* table may not exist */ }
    }
    console.log('[global-setup] Database reset complete (individual mode).');
  }
}
