// PPK DriveHub - Main API Router (Cloudflare Pages Functions catch-all)
// All frontend API calls hit POST /api with {action, ...data} body
import { ok, fail, corsHeaders, uuid, nowThai, sanitize, hashPassword, verifyPassword,
  validatePasswordPolicy, signJWT, verifyJWT, writeAudit } from '../_helpers.js';
import { withAuth, requireAdmin, requirePermission, handleOptions, PUBLIC_ACTIONS } from '../_middleware.js';
import { handleAuth } from './_auth.js';
import { handleUsers } from './_users.js';
import { handleVehicles } from './_vehicles.js';
import { handleDrivers } from './_drivers.js';
import { handleQueue } from './_queue.js';
import { handleFuel } from './_fuel.js';
import { handleRepair } from './_repair.js';
import { handleCheck } from './_check.js';
import { handleUsage } from './_usage.js';
import { handleAdmin } from './_admin.js';
import { handleReports } from './_reports.js';

// ── Action → Handler routing map ─────────────────────────────────────────────
const AUTH_ACTIONS = new Set([
  'setup','login','register','registerUser','changePassword','forgotPassword',
  'resetPasswordConfirm','getCurrentUserInfo','getMyProfile','acceptPDPAPolicy',
  'checkPDPAAccepted','getPDPALog',
]);

const USER_ACTIONS = new Set([
  'getAllUsers','getUserById','updateMyProfile','uploadUserProfileImage',
  'updateUser','deactivateUser','resetUserPassword','getUserRequests',
  'approveUserRequest','rejectUserRequest','getPermissionDefinitions',
]);

const VEHICLE_ACTIONS = new Set([
  'createVehicle','getVehicles','getVehicleById','updateVehicle','deactivateVehicle',
  'uploadVehicleImage','uploadVehicleRegistrationBookImage',
  'lockVehicleForRepair','unlockVehicleFromRepair','isCarScheduledForRepair',
  'searchVehiclesByLicensePlate','calculateVehicleHealthScore',
  'getAllVehiclesHealthScores','calculateVehicleCostPerKm',
  'getVehicleCostAnalysis','rankVehiclesByCostEfficiency',
]);

const DRIVER_ACTIONS = new Set([
  'createDriver','getDrivers','getDriverById','updateDriver','deactivateDriver',
  'searchDriversByName','uploadDriverProfileImage','uploadDriverIdCardImage',
  'markDriverFatigue','clearDriverFatigue','checkDriverFatigueFlag',
  'checkDriverFatigueStatus','getDriverFatigueWarning',
  'reportSelfReportedFatigue','getSelfReportedFatigueReports','acknowledgeSelfReportedFatigue',
  'getDriverQueueHistory','getDriverDisciplineScore','getAllDriversWorkloadScores',
]);

const QUEUE_ACTIONS = new Set([
  'createQueue','createManualQueue','getQueues','getQueueById','updateQueue',
  'cancelQueue','freezeQueue','unfreezeQueue',
  'getAvailableVehiclesForQueue','getAvailableDriversForQueue',
  'getQueuePlan','getQueueTimeline','getQueueCreationWarnings',
  'getVehicleQueueHistory','getOrganizationQueueHistory',
  'getSmartQueueRecommendations','getFairnessRecommendations',
  'checkRotationPolicy','checkRecoveryDayStatus','checkDriverDistanceYesterday',
  'getRecoveryDayRecommendations','checkAndFreezeQueues',
  'createEmergencyOverride','getEmergencyOverrides','getEmergencyOverrideReport',
  'getQueueRules','createQueueRule','updateQueueRule','deleteQueueRule','getDriversForQueue',
  'searchDestinations','searchRequestedBy','runAutoRecoveryPendingReturns',
]);

const FUEL_ACTIONS = new Set([
  'getFuelTypes','createFuelLog','getFuelLogs','getFuelLogById','updateFuelLog',
  'createFuelRequest','getFuelRequests','approveFuelRequest','rejectFuelRequest',
  'generateMonthlyFuelReport','generateAnnualFuelReport','compareFuelUsageWithBudget',
  'detectFrequentFillingAnomalies','getCarFuelConsumption','getFuelConsumptionAnalysis',
]);

const REPAIR_ACTIONS = new Set([
  'createRepairLog','getRepairLogs','getRepairLogById','updateRepairLog','completeRepair',
  'createScheduledRepair','getScheduledRepairs','getScheduledRepairById',
  'updateScheduledRepair','cancelScheduledRepair','convertScheduledRepairToRepair',
  'getRepairTypes','getRepairSummaryByVehicle','getPendingRepairs',
]);

const CHECK_ACTIONS = new Set([
  'createDailyCheck','createCheckLog','getCheckLogs','getCheckLogById',
  'getInspectionAlerts','acknowledgeInspectionAlert',
  'getVehicleCheckSummary','getCheckItemDefinitions',
]);

const USAGE_ACTIONS = new Set([
  'createUsageRecord','scanQRForUsageRecord','getUsageRecords','getUsageRecordById',
  'runAutoRecoveryPendingReturns','getCarCurrentStatus','getDriverUsageSummary','submitQRUsage',
]);

const ADMIN_ACTIONS = new Set([
  'getSystemSettings','getSystemSetting','getSettingByKey','updateSystemSetting','getDefaultSettings',
  'getAdminSettings','updateAdminSetting','resetAdminSettingsToDefault',
  'getMaintenanceSettings','updateMaintenanceSettings','setMaintenanceSetting',
  'getNextMaintenanceForCar','getVehicleMaintenanceLast','recordVehicleMaintenance','setVehicleMaintenanceLast',
  'createLeave','getLeaves','getDriverLeaves','updateLeave','cancelLeave','approveLeave',
  'rejectLeave','isDriverOnLeave','createDriverLeave','deleteDriverLeave',
  'getNotifications','markNotificationRead','markAllNotificationsRead','createNotification','getUnreadCount',
  'getAuditLogs',
  'createTaxRecord','getTaxRecords','updateTaxRecord','getExpiringTaxRecords',
  'createInsuranceRecord','getInsuranceRecords','updateInsuranceRecord','getExpiringInsuranceRecords',
  'dailyBackup','createSystemSnapshot','getSystemSnapshots','restoreBackup',
  'viewPDPALog','getPDPAStats','_cronDailyJob',
]);

const REPORT_ACTIONS = new Set([
  'getDashboardStatsToday','getAdminDashboardStats','getPublicLandingStats','getExecutiveDashboard',
  'getQueueReport','getFuelReport','getRepairReport','getVehicleUsageReport',
  'getComprehensiveReport','getAllKPIs','getKPIThreshold',
  'calculateVehicleAvailability','analyzeVehicleUsagePatterns','getSystemSnapshot',
]);

// ── CRON handler ─────────────────────────────────────────────────────────────
export async function onRequestGet(context) {
  // Simple ping
  return new Response(JSON.stringify({ status: 'ok', message: 'PPK DriveHub API', version: '2.0' }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

// ── CORS Preflight ────────────────────────────────────────────────────────────
export async function onRequestOptions() {
  return handleOptions();
}

// ── Scheduled Cron ────────────────────────────────────────────────────────────
export async function scheduled(event, env, ctx) {
  ctx.waitUntil(runDailyJob(env));
}

async function runDailyJob(env) {
  try {
    const fakeUser = { user_id: 'system', role: 'superadmin', permissions: {} };
    await handleAdmin({ action: '_cronDailyJob', body: {}, user: fakeUser, DB: env.DB });
  } catch (e) {
    console.error('Cron job error:', e);
  }
}

// ── Main POST Handler ─────────────────────────────────────────────────────────
export async function onRequest({ request, env }) {
  // CORS preflight
  if (request.method === 'OPTIONS') return handleOptions();

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 'INVALID_JSON', 400);
  }

  const action = body?.action;
  if (!action || typeof action !== 'string') {
    return fail('Missing or invalid action', 'MISSING_ACTION', 400);
  }

  // Sanitize action name (prevent injection)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(action)) {
    return fail('Invalid action name', 'INVALID_ACTION', 400);
  }

  // Auth — public actions skip JWT verification
  const { user, error } = await withAuth(request, env, action);
  if (error) return error;

  // Build context object
  const ctx = { action, body, user, env, DB: env.DB, request };

  try {
    // Route to appropriate handler
    if (AUTH_ACTIONS.has(action)) return await handleAuth(ctx);
    if (USER_ACTIONS.has(action)) return await handleUsers(ctx);
    if (VEHICLE_ACTIONS.has(action)) return await handleVehicles(ctx);
    if (DRIVER_ACTIONS.has(action)) return await handleDrivers(ctx);
    if (QUEUE_ACTIONS.has(action)) return await handleQueue(ctx);
    if (FUEL_ACTIONS.has(action)) return await handleFuel(ctx);
    if (REPAIR_ACTIONS.has(action)) return await handleRepair(ctx);
    if (CHECK_ACTIONS.has(action)) return await handleCheck(ctx);
    if (USAGE_ACTIONS.has(action)) return await handleUsage(ctx);
    if (ADMIN_ACTIONS.has(action)) return await handleAdmin(ctx);
    if (REPORT_ACTIONS.has(action)) return await handleReports(ctx);

    return fail(`Unknown action: ${action}`, 'UNKNOWN_ACTION', 400);
  } catch (e) {
    console.error(`Error handling action '${action}':`, e);
    return fail(`Server error: ${e.message}`, 'SERVER_ERROR', 500);
  }
}
