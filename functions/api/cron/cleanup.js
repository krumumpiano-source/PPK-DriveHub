// Housekeeping & Data Retention Cron endpoint
// GET/POST /api/cron/cleanup
// Authenticated via X-Cron-Token header or Admin session

import { success, error, now } from '../../_helpers.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST' && request.method !== 'GET') {
    return error('Method not allowed', 405);
  }

  const cronToken = request.headers.get('X-Cron-Token');
  const isAdmin = env.user && (env.user.role === 'admin' || env.user.role === 'super_admin');

  if (!isAdmin && (!env.SYNC_CRON_TOKEN || cronToken !== env.SYNC_CRON_TOKEN)) {
    return error('Unauthorized cron execution', 401);
  }

  try {
    const results = await env.DB.batch([
      // 1. Clean up sessions expired over 7 days ago
      env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now', '-7 days')"),
      // 2. Clean up rate limits that have expired over 1 day ago
      env.DB.prepare("DELETE FROM rate_limits WHERE blocked_until < datetime('now', '-1 day')"),
      // 3. Clean up read notifications older than 60 days
      env.DB.prepare("DELETE FROM notifications WHERE read = 1 AND created_at < datetime('now', '-60 days')")
    ]);

    return success({
      message: 'Housekeeping cleanup completed successfully',
      timestamp: now(),
      sessions_cleaned: results[0]?.meta?.changes || 0,
      rate_limits_cleaned: results[1]?.meta?.changes || 0,
      notifications_cleaned: results[2]?.meta?.changes || 0
    });
  } catch (e) {
    return error('Cleanup failed: ' + e.message, 500);
  }
}
