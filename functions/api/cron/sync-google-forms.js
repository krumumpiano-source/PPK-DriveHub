// Public cron endpoint — ใช้ X-Cron-Token แทน session
// POST /api/cron/sync-google-forms

import { success, error } from '../../_helpers.js';
import { runGoogleFormSync } from '../../_lib/gform-sync.js';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST' && request.method !== 'GET') {
    return error('Method not allowed', 405);
  }

  const cronToken = request.headers.get('X-Cron-Token');
  if (!env.SYNC_CRON_TOKEN || !cronToken || cronToken !== env.SYNC_CRON_TOKEN) {
    return error('Invalid cron token', 401);
  }

  try {
    const result = await runGoogleFormSync(env, 'cron', null);
    return success(result);
  } catch (e) {
    return error('Sync failed: ' + e.message, 500);
  }
}
